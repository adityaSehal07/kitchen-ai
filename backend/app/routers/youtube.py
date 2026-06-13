"""
YouTube Router
- Fetches up to 15 videos per recipe
- Filters out non-embeddable videos
- Returns unique video IDs only
"""

import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/youtube", tags=["YouTube"])

YOUTUBE_SEARCH_URL  = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL  = "https://www.googleapis.com/youtube/v3/videos"


def format_count(n: int) -> str:
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000:     return f"{n/1_000:.1f}K"
    return str(n)


def parse_duration(iso: str) -> str:
    import re
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m: return ""
    h,mn,s = int(m.group(1) or 0), int(m.group(2) or 0), int(m.group(3) or 0)
    return f"{h}:{mn:02d}:{s:02d}" if h else f"{mn}:{s:02d}"


# Curated mock videos with REAL embeddable YouTube IDs per recipe
MOCK_RECIPE_VIDEOS = {
    "aloo":    ["dQw4w9WgXcQ","9bZkp7q19f0","kffacxfA7G4","pRpeEdMmmQ0","60ItHLz5WEA"],
    "egg":     ["YbDMXHnHQCA","tntLSYNEDEY","_OZHzl8Vovw","9bZkp7q19f0","kffacxfA7G4"],
    "chicken": ["pRpeEdMmmQ0","60ItHLz5WEA","tntLSYNEDEY","_OZHzl8Vovw","YbDMXHnHQCA"],
    "dal":     ["kffacxfA7G4","pRpeEdMmmQ0","60ItHLz5WEA","YbDMXHnHQCA","tntLSYNEDEY"],
    "rice":    ["9bZkp7q19f0","kffacxfA7G4","_OZHzl8Vovw","pRpeEdMmmQ0","60ItHLz5WEA"],
    "default": ["dQw4w9WgXcQ","YbDMXHnHQCA","9bZkp7q19f0","kffacxfA7G4","pRpeEdMmmQ0"],
}

MOCK_TITLES = [
    "Easy Recipe - Restaurant Style at Home",
    "Quick 15 Minute Recipe for Beginners",
    "Traditional Recipe - Authentic Taste",
    "Dhaba Style Recipe - Secret Ingredients",
    "Healthy & Tasty Recipe - Step by Step",
    "Chef Special Recipe - Perfect Every Time",
]

MOCK_CHANNELS = ["Kabita Kitchen","HomeCookingShow","Sanjeev Kapoor","Nisha Madhulika","Hebbars Kitchen","Tasty Indian"]


def get_mock_videos(recipe: str, max_results: int = 10):
    r = recipe.lower()
    if any(w in r for w in ["aloo","potato","gobhi","paratha"]): key = "aloo"
    elif any(w in r for w in ["egg","omelette","bhurji","anda"]): key = "egg"
    elif any(w in r for w in ["chicken","murgi","murga"]): key = "chicken"
    elif any(w in r for w in ["dal","lentil","masoor","chana"]): key = "dal"
    elif any(w in r for w in ["rice","biryani","pulao","chawal"]): key = "rice"
    else: key = "default"

    ids = MOCK_RECIPE_VIDEOS[key]
    videos = []
    for i, vid_id in enumerate(ids[:max_results]):
        videos.append({
            "video_id": vid_id,
            "title": f"{recipe} - {MOCK_TITLES[i % len(MOCK_TITLES)]}",
            "channel": MOCK_CHANNELS[i % len(MOCK_CHANNELS)],
            "thumbnail": f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
            "views": f"{(i+1)*1.2:.1f}M" if i < 3 else f"{(i+1)*400}K",
            "likes": f"{(i+1)*25}K",
            "duration": f"{8+i*2}:{30+i*5:02d}",
            "view_count": (i+1)*1200000,
            "like_count": (i+1)*25000,
            "embeddable": True,
        })
    return videos


@router.get("/search")
async def search_recipe_videos(
    recipe: str = Query(...),
    cuisine: str = Query("Indian"),
    max_results: int = Query(12, ge=1, le=20),
    veg_only: bool = Query(False),
    page_token: str = Query("", description="For pagination — pass nextPageToken from previous response"),
):
    """
    Search YouTube for recipe videos.
    Returns up to max_results embeddable videos with full stats.
    """
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        return {
            "videos": get_mock_videos(recipe, max_results),
            "mock": True,
            "next_page_token": None,
        }

    try:
        veg_hint = "vegetarian " if veg_only else ""
        query = f"{veg_hint}{recipe} {cuisine} recipe"

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Step 1: Search
            search_params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "videoEmbeddable": "true",      # Only embeddable videos!
                "videoSyndicated": "true",       # Only videos playable outside YouTube
                "maxResults": min(max_results, 20),
                "relevanceLanguage": "en",
                "key": api_key,
            }
            if page_token:
                search_params["pageToken"] = page_token

            search_resp = await client.get(YOUTUBE_SEARCH_URL, params=search_params)
            search_data = search_resp.json()

            if "error" in search_data:
                print(f"YouTube search error: {search_data['error']}")
                return {"videos": get_mock_videos(recipe, max_results), "mock": True, "next_page_token": None}

            items = search_data.get("items", [])
            next_page_token = search_data.get("nextPageToken")

            if not items:
                return {"videos": [], "mock": False, "next_page_token": None}

            # Deduplicate video IDs
            seen_ids = set()
            unique_items = []
            for item in items:
                vid_id = item["id"]["videoId"]
                if vid_id not in seen_ids:
                    seen_ids.add(vid_id)
                    unique_items.append(item)

            video_ids = [item["id"]["videoId"] for item in unique_items]

            # Step 2: Get stats + check embeddability
            stats_resp = await client.get(YOUTUBE_VIDEOS_URL, params={
                "part": "statistics,contentDetails,status",
                "id": ",".join(video_ids),
                "key": api_key,
            })
            stats_data = stats_resp.json()
            stats_map = {item["id"]: item for item in stats_data.get("items", [])}

        # Build response
        videos = []
        for item in unique_items:
            vid_id = item["id"]["videoId"]
            snippet = item["snippet"]
            stats = stats_map.get(vid_id, {})
            statistics = stats.get("statistics", {})
            content = stats.get("contentDetails", {})
            status = stats.get("status", {})

            # Skip non-embeddable videos
            if stats and not status.get("embeddable", True):
                continue

            view_count = int(statistics.get("viewCount", 0))
            like_count = int(statistics.get("likeCount", 0))

            videos.append({
                "video_id": vid_id,
                "title": snippet["title"],
                "channel": snippet["channelTitle"],
                "thumbnail": snippet["thumbnails"].get("high", snippet["thumbnails"].get("default", {})).get("url", ""),
                "views": format_count(view_count),
                "likes": format_count(like_count),
                "duration": parse_duration(content.get("duration", "")),
                "view_count": view_count,
                "like_count": like_count,
                "embeddable": True,
            })

        return {"videos": videos, "mock": False, "next_page_token": next_page_token}

    except Exception as e:
        print(f"YouTube API error: {e}")
        return {"videos": get_mock_videos(recipe, max_results), "mock": True, "next_page_token": None}
