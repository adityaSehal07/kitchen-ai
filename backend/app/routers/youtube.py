"""
YouTube Router - fetches embeddable recipe videos with real API
"""
import os
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/youtube", tags=["YouTube"])
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def fmt(n):
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000: return f"{n/1_000:.1f}K"
    return str(n)


def parse_dur(iso):
    import re
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m: return ""
    h,mn,s = int(m.group(1) or 0), int(m.group(2) or 0), int(m.group(3) or 0)
    return f"{h}:{mn:02d}:{s:02d}" if h else f"{mn}:{s:02d}"


def real_mock(recipe, n=12):
    """Generate unique mock videos using recipe name as seed"""
    import hashlib
    videos = []
    channels = ["Kabita Kitchen","Hebbars Kitchen","Sanjeev Kapoor","Nisha Madhulika",
                "HomeCookingShow","Tasty Indian","Vahchef","Bong Eats","Cook with Parul","Rajshri Food"]
    titles = [
        f"{recipe} Recipe - Restaurant Style",
        f"Easy {recipe} at Home | Step by Step",
        f"Authentic {recipe} - Traditional Method",
        f"Dhaba Style {recipe} | Secret Recipe",
        f"Quick {recipe} in 15 Minutes",
        f"Healthy {recipe} | Low Oil Recipe",
        f"Best {recipe} Ever - Chef Special",
        f"{recipe} for Beginners - Simple Guide",
        f"Street Style {recipe} | Street Food",
        f"Perfect {recipe} Every Time - Pro Tips",
        f"{recipe} with Leftover Ingredients",
        f"5 Star {recipe} at Home",
    ]
    # Real popular cooking video IDs that are embeddable
    real_ids = [
        "YbDMXHnHQCA","0tdIe73ky-0","C3GWMNjtJ5E","4aZr5hZXP_s",
        "pFRHmhUQFnc","k99bGdX9NO4","8L5lzHOtUGo","tntLSYNEDEY",
        "JfkBP-eiMlA","_OZHzl8Vovw","60ItHLz5WEA","9bZkp7q19f0",
    ]
    seed = int(hashlib.md5(recipe.encode()).hexdigest()[:8], 16)
    for i in range(min(n, 12)):
        idx = (seed + i) % 12
        vid_id = real_ids[idx]
        views = (seed % 3 + i + 1) * 400000 + i * 150000
        likes = views // 20
        videos.append({
            "video_id": vid_id,
            "title": titles[i % len(titles)],
            "channel": channels[(seed+i) % len(channels)],
            "thumbnail": f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
            "views": fmt(views), "likes": fmt(likes),
            "duration": f"{8+i*2}:{(30+i*7)%60:02d}",
            "view_count": views, "like_count": likes, "embeddable": True,
        })
    return videos


@router.get("/search")
async def search_recipe_videos(
    recipe: str = Query(...),
    cuisine: str = Query("Indian"),
    max_results: int = Query(12, ge=1, le=20),
    veg_only: bool = Query(False),
):
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return {"videos": real_mock(recipe, max_results), "mock": True}

    try:
        veg = "vegetarian " if veg_only else ""
        query = f"{veg}{recipe} {cuisine} recipe cooking"

        async with httpx.AsyncClient(timeout=15.0) as client:
            sr = await client.get(YOUTUBE_SEARCH_URL, params={
                "part":"snippet","q":query,"type":"video",
                "videoEmbeddable":"true","videoSyndicated":"true",
                "maxResults":min(max_results,20),
                "relevanceLanguage":"en","key":api_key,
            })
            sd = sr.json()
            if "error" in sd:
                print(f"YT error: {sd['error']}")
                return {"videos": real_mock(recipe, max_results), "mock": True}

            items = sd.get("items",[])
            if not items:
                return {"videos": real_mock(recipe, max_results), "mock": True}

            seen = set()
            unique = []
            for item in items:
                vid = item["id"]["videoId"]
                if vid not in seen:
                    seen.add(vid)
                    unique.append(item)

            vids = [item["id"]["videoId"] for item in unique]
            stsr = await client.get(YOUTUBE_VIDEOS_URL, params={
                "part":"statistics,contentDetails,status",
                "id":",".join(vids),"key":api_key,
            })
            smap = {i["id"]:i for i in stsr.json().get("items",[])}

        videos = []
        for item in unique:
            vid = item["id"]["videoId"]
            snip = item["snippet"]
            stats = smap.get(vid,{})
            st = stats.get("statistics",{})
            cd = stats.get("contentDetails",{})
            status = stats.get("status",{})
            if stats and not status.get("embeddable", True):
                continue
            vc = int(st.get("viewCount",0))
            lc = int(st.get("likeCount",0))
            thumb = snip["thumbnails"].get("high", snip["thumbnails"].get("medium", snip["thumbnails"].get("default",{}))).get("url","")
            videos.append({
                "video_id": vid, "title": snip["title"],
                "channel": snip["channelTitle"], "thumbnail": thumb,
                "views": fmt(vc), "likes": fmt(lc),
                "duration": parse_dur(cd.get("duration","")),
                "view_count": vc, "like_count": lc, "embeddable": True,
            })

        return {"videos": videos or real_mock(recipe, max_results), "mock": not videos}

    except Exception as e:
        print(f"YouTube error: {e}")
        return {"videos": real_mock(recipe, max_results), "mock": True}
