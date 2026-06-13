"""
YouTube Router
Fetches multiple videos for a recipe with stats (views, likes, duration).
"""

import os
import httpx
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/v1/youtube", tags=["YouTube"])

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def format_count(n: int) -> str:
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)


def parse_duration(iso: str) -> str:
    """Convert PT4M30S → 4:30"""
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return ""
    h, m, s = match.group(1), match.group(2), match.group(3)
    h = int(h) if h else 0
    m = int(m) if m else 0
    s = int(s) if s else 0
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


# Mock videos for when no API key is set
MOCK_VIDEOS = {
    "default": [
        {"video_id": "dQw4w9WgXcQ", "title": "Easy Recipe - Step by Step Guide", "channel": "HomeCookingShow", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "views": "2.4M", "likes": "45K", "duration": "8:32", "view_count": 2400000, "like_count": 45000},
        {"video_id": "dQw4w9WgXcQ", "title": "Restaurant Style Recipe at Home", "channel": "Kabita Kitchen", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "views": "1.1M", "likes": "28K", "duration": "12:15", "view_count": 1100000, "like_count": 28000},
        {"video_id": "dQw4w9WgXcQ", "title": "Quick 15 Minute Recipe", "channel": "Tasty Indian", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "views": "856K", "likes": "19K", "duration": "6:45", "view_count": 856000, "like_count": 19000},
    ]
}


@router.get("/search")
async def search_recipe_videos(
    recipe: str = Query(..., description="Recipe name"),
    cuisine: str = Query("Indian", description="Cuisine type"),
    max_results: int = Query(6, ge=1, le=10),
):
    """Search YouTube for recipe videos with stats."""
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        # Return mock data
        return {"videos": MOCK_VIDEOS["default"], "mock": True}

    try:
        query = f"{recipe} {cuisine} recipe cooking"
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: Search for videos
            search_resp = await client.get(YOUTUBE_SEARCH_URL, params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "relevanceLanguage": "en",
                "videoCategoryId": "26",  # Howto & Style
                "key": api_key,
            })
            search_data = search_resp.json()

            if "error" in search_data:
                return {"videos": MOCK_VIDEOS["default"], "mock": True}

            items = search_data.get("items", [])
            if not items:
                return {"videos": [], "mock": False}

            video_ids = [item["id"]["videoId"] for item in items]

            # Step 2: Get stats for all videos in one call
            stats_resp = await client.get(YOUTUBE_VIDEOS_URL, params={
                "part": "statistics,contentDetails",
                "id": ",".join(video_ids),
                "key": api_key,
            })
            stats_data = stats_resp.json()
            stats_map = {
                item["id"]: item
                for item in stats_data.get("items", [])
            }

        # Combine search + stats
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
        return {"videos": MOCK_VIDEOS["default"], "mock": True}
