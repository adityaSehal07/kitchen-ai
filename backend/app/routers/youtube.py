"""
YouTube Router - fetches multiple videos for a recipe with stats.
"""

import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/youtube", tags=["YouTube"])

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def format_count(n: int) -> str:
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000: return f"{n/1_000:.1f}K"
    return str(n)


def parse_duration(iso: str) -> str:
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match: return ""
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    if h: return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


# Realistic mock videos with DIFFERENT video IDs per recipe type
MOCK_VIDEOS_BY_RECIPE = {
    "aloo": [
        {"video_id": "JfkBP-eiMlA", "title": "Aloo Dum - Spicy Bengali Style", "channel": "Bong Eats", "thumbnail": "https://img.youtube.com/vi/JfkBP-eiMlA/hqdefault.jpg", "views": "2.1M", "likes": "42K", "duration": "12:30", "view_count": 2100000, "like_count": 42000},
        {"video_id": "8L5lzHOtUGo", "title": "Aloo Gobi Recipe - Restaurant Style", "channel": "Kabita Kitchen", "thumbnail": "https://img.youtube.com/vi/8L5lzHOtUGo/hqdefault.jpg", "views": "1.4M", "likes": "28K", "duration": "9:15", "view_count": 1400000, "like_count": 28000},
        {"video_id": "YbDMXHnHQCA", "title": "Aloo Paratha - Crispy & Soft", "channel": "Nisha Madhulika", "thumbnail": "https://img.youtube.com/vi/YbDMXHnHQCA/hqdefault.jpg", "views": "3.2M", "likes": "65K", "duration": "15:20", "view_count": 3200000, "like_count": 65000},
    ],
    "egg": [
        {"video_id": "4aZr5hZXP_s", "title": "Egg Curry - Dhaba Style", "channel": "Sanjeev Kapoor", "thumbnail": "https://img.youtube.com/vi/4aZr5hZXP_s/hqdefault.jpg", "views": "1.8M", "likes": "35K", "duration": "10:45", "view_count": 1800000, "like_count": 35000},
        {"video_id": "pFRHmhUQFnc", "title": "Egg Bhurji - Street Style", "channel": "Vahchef", "thumbnail": "https://img.youtube.com/vi/pFRHmhUQFnc/hqdefault.jpg", "views": "956K", "likes": "19K", "duration": "7:22", "view_count": 956000, "like_count": 19000},
        {"video_id": "k99bGdX9NO4", "title": "Masala Omelette Perfect Recipe", "channel": "HomeCookingShow", "thumbnail": "https://img.youtube.com/vi/k99bGdX9NO4/hqdefault.jpg", "views": "678K", "likes": "14K", "duration": "6:10", "view_count": 678000, "like_count": 14000},
    ],
    "dal": [
        {"video_id": "0tdIe73ky-0", "title": "Dal Tadka Restaurant Style", "channel": "Kabita Kitchen", "thumbnail": "https://img.youtube.com/vi/0tdIe73ky-0/hqdefault.jpg", "views": "2.4M", "likes": "48K", "duration": "11:30", "view_count": 2400000, "like_count": 48000},
        {"video_id": "C3GWMNjtJ5E", "title": "Masoor Dal Simple Recipe", "channel": "Nisha Madhulika", "thumbnail": "https://img.youtube.com/vi/C3GWMNjtJ5E/hqdefault.jpg", "views": "1.1M", "likes": "22K", "duration": "8:45", "view_count": 1100000, "like_count": 22000},
    ],
    "default": [
        {"video_id": "0tdIe73ky-0", "title": "Easy Indian Recipe - Step by Step", "channel": "HomeCookingShow", "thumbnail": "https://img.youtube.com/vi/0tdIe73ky-0/hqdefault.jpg", "views": "2.4M", "likes": "45K", "duration": "8:32", "view_count": 2400000, "like_count": 45000},
        {"video_id": "C3GWMNjtJ5E", "title": "Restaurant Style Recipe at Home", "channel": "Kabita Kitchen", "thumbnail": "https://img.youtube.com/vi/C3GWMNjtJ5E/hqdefault.jpg", "views": "1.1M", "likes": "28K", "duration": "12:15", "view_count": 1100000, "like_count": 28000},
        {"video_id": "4aZr5hZXP_s", "title": "Quick 15 Minute Recipe", "channel": "Tasty Indian", "thumbnail": "https://img.youtube.com/vi/4aZr5hZXP_s/hqdefault.jpg", "views": "856K", "likes": "19K", "duration": "6:45", "view_count": 856000, "like_count": 19000},
    ]
}


def get_mock_videos(recipe: str):
    r = recipe.lower()
    if "aloo" in r or "potato" in r or "gobhi" in r or "paratha" in r:
        return MOCK_VIDEOS_BY_RECIPE["aloo"]
    if "egg" in r or "omelette" in r or "bhurji" in r:
        return MOCK_VIDEOS_BY_RECIPE["egg"]
    if "dal" in r or "lentil" in r or "masoor" in r:
        return MOCK_VIDEOS_BY_RECIPE["dal"]
    return MOCK_VIDEOS_BY_RECIPE["default"]


@router.get("/search")
async def search_recipe_videos(
    recipe: str = Query(...),
    cuisine: str = Query("Indian"),
    max_results: int = Query(6, ge=1, le=10),
    veg_only: bool = Query(False),
):
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        return {"videos": get_mock_videos(recipe), "mock": True}

    try:
        veg_hint = "vegetarian " if veg_only else ""
        query = f"{veg_hint}{recipe} {cuisine} recipe cooking"

        async with httpx.AsyncClient(timeout=10.0) as client:
            search_resp = await client.get(YOUTUBE_SEARCH_URL, params={
                "part": "snippet", "q": query, "type": "video",
                "maxResults": max_results, "relevanceLanguage": "en",
                "key": api_key,
            })
            search_data = search_resp.json()

            if "error" in search_data:
                return {"videos": get_mock_videos(recipe), "mock": True}

            items = search_data.get("items", [])
            if not items:
                return {"videos": [], "mock": False}

            video_ids = [item["id"]["videoId"] for item in items]

            stats_resp = await client.get(YOUTUBE_VIDEOS_URL, params={
                "part": "statistics,contentDetails",
                "id": ",".join(video_ids),
                "key": api_key,
            })
            stats_data = stats_resp.json()
            stats_map = {item["id"]: item for item in stats_data.get("items", [])}

        videos = []
        for item in items:
            vid_id = item["id"]["videoId"]
            snippet = item["snippet"]
            stats = stats_map.get(vid_id, {})
            statistics = stats.get("statistics", {})
            content = stats.get("contentDetails", {})
            view_count = int(statistics.get("viewCount", 0))
            like_count = int(statistics.get("likeCount", 0))

            videos.append({
                "video_id": vid_id,
                "title": snippet["title"],
                "channel": snippet["channelTitle"],
                "thumbnail": snippet["thumbnails"]["high"]["url"],
                "views": format_count(view_count),
                "likes": format_count(like_count),
                "duration": parse_duration(content.get("duration", "")),
                "view_count": view_count,
                "like_count": like_count,
            })

        return {"videos": videos, "mock": False}

    except Exception as e:
        print(f"YouTube API error: {e}")
        return {"videos": get_mock_videos(recipe), "mock": True}
