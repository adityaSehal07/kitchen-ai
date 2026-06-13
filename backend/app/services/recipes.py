"""
Recipe Suggestion Service with veg/non-veg filter.
"""

import os
import httpx
from typing import List, Optional
from app.services.inventory import get_all_items
from app.services.recipe_db import RECIPE_DB
from app.models.recipes import RecipeSuggestion, YouTubeVideo, RecipeResponse

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

MOCK_VIDEOS = {
    "Aloo Dum":          ("JfkBP-eiMlA", "Aloo Dum Recipe - Spicy Bengali Style",    "Bong Eats"),
    "Dal Tadka":         ("0tdIe73ky-0", "Restaurant Style Dal Tadka",               "Kabita's Kitchen"),
    "Egg Curry":         ("4aZr5hZXP_s", "Easy Egg Curry Recipe",                    "Sanjeev Kapoor"),
    "Egg Bhurji":        ("pFRHmhUQFnc", "Anda Bhurji - Street Style",              "Tasty Indian"),
    "Masala Omelette":   ("k99bGdX9NO4", "Perfect Masala Omelette",                  "Vahchef"),
    "Aloo Paratha":      ("YbDMXHnHQCA", "Crispy Aloo Paratha Recipe",              "Nisha Madhulika"),
    "Vegetable Biryani": ("8L5lzHOtUGo", "Veg Biryani - Dum Style",                "Hyderabadi Ruchulu"),
    "Chana Masala":      ("C3GWMNjtJ5E", "Dhaba Style Chana Masala",               "Cook with Parul"),
    "Aloo Gobhi":        ("8L5lzHOtUGo", "Aloo Gobhi Dry Sabzi",                   "Rajshri Food"),
    "Palak Paneer":      ("4aZr5hZXP_s", "Palak Paneer - Restaurant Style",        "Sanjeev Kapoor"),
    "Egg Fried Rice":    ("pFRHmhUQFnc", "Indo-Chinese Egg Fried Rice",            "Bong Eats"),
    "French Toast":      ("k99bGdX9NO4", "Classic French Toast Recipe",             "Tasty"),
    "Banana Smoothie":   ("C3GWMNjtJ5E", "Thick Banana Milkshake",                 "Hebbar's Kitchen"),
    "Poha":              ("YbDMXHnHQCA", "Kanda Batata Poha - Maharashtrian Style", "Madhura Recipe"),
    "Masoor Dal":        ("0tdIe73ky-0", "Simple Masoor Dal Tadka",                "Kabita's Kitchen"),
}


def _mock_video(recipe_name: str) -> YouTubeVideo:
    if recipe_name in MOCK_VIDEOS:
        vid_id, title, channel = MOCK_VIDEOS[recipe_name]
    else:
        slug = recipe_name.lower().replace(" ", "_")
        vid_id = f"0tdIe73ky-0"
        title = f"How to make {recipe_name}"
        channel = "Indian Cooking"
    return YouTubeVideo(
        title=title, video_id=vid_id,
        url=f"https://www.youtube.com/watch?v={vid_id}",
        thumbnail=f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
        channel=channel,
    )


async def _fetch_youtube_video(recipe_name: str, cuisine: str) -> Optional[YouTubeVideo]:
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return _mock_video(recipe_name)
    query = f"{recipe_name} {cuisine} recipe cooking"
    params = {"part":"snippet","q":query,"type":"video","maxResults":1,"relevanceLanguage":"en","key":api_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(YOUTUBE_SEARCH_URL, params=params)
            response.raise_for_status()
            data = response.json()
        items = data.get("items", [])
        if not items:
            return _mock_video(recipe_name)
        item = items[0]
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        return YouTubeVideo(
            title=snippet["title"], video_id=video_id,
            url=f"https://www.youtube.com/watch?v={video_id}",
            thumbnail=snippet["thumbnails"]["high"]["url"],
            channel=snippet["channelTitle"],
        )
    except Exception:
        return _mock_video(recipe_name)


def _match_score(inventory_items, recipe_ingredients):
    inventory_lower = [i.lower() for i in inventory_items]
    matching, missing = [], []
    for ingredient in recipe_ingredients:
        ing_lower = ingredient.lower()
        found = any(ing_lower in inv or inv in ing_lower for inv in inventory_lower)
        (matching if found else missing).append(ingredient)
    total = len(recipe_ingredients)
    score = int((len(matching) / total) * 100) if total > 0 else 0
    return score, matching, missing


async def get_recipe_suggestions(
    cuisine_filter: Optional[str] = None,
    max_recipes: int = 5,
    veg_only: Optional[bool] = None,
) -> RecipeResponse:
    inventory = get_all_items()
    inventory_names = [item.item for item in inventory]

    recipes_to_check = RECIPE_DB
    if cuisine_filter:
        recipes_to_check = [r for r in recipes_to_check if r["cuisine"].lower() == cuisine_filter.lower()]
    if veg_only is True:
        recipes_to_check = [r for r in recipes_to_check if r.get("veg", True)]
    elif veg_only is False:
        recipes_to_check = [r for r in recipes_to_check if not r.get("veg", True)]

    scored = []
    for recipe in recipes_to_check:
        score, matching, missing = _match_score(inventory_names, recipe["ingredients"])
        scored.append((score, recipe, matching, missing))

    # Sort by match score desc, then by number of matching ingredients desc
    scored.sort(key=lambda x: (x[0], len(x[2])), reverse=True)
    # Only show recipes where at least 1 ingredient matches from inventory
    if inventory_names:
        scored_with_match = [s for s in scored if s[0] > 0]
        top = (scored_with_match if scored_with_match else scored)[:max_recipes]
    else:
        top = scored[:max_recipes]

    suggestions = []
    for score, recipe, matching, missing in top:
        video = await _fetch_youtube_video(recipe["name"], recipe["cuisine"])
        suggestions.append(RecipeSuggestion(
            name=recipe["name"], cuisine=recipe["cuisine"],
            matching_ingredients=matching, missing_ingredients=missing,
            match_score=score, youtube_video=video,
        ))

    youtube_mode = "live" if os.getenv("YOUTUBE_API_KEY") else "mock"
    return RecipeResponse(
        inventory_used=inventory_names, recipes=suggestions,
        total_found=len(suggestions), youtube_mode=youtube_mode,
    )
