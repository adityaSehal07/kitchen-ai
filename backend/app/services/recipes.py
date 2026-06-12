"""
Recipe Suggestion Service
1. Reads current inventory from the database
2. Matches inventory items against recipe ingredients
3. Ranks recipes by match score (% of ingredients you already have)
4. Fetches a YouTube cooking video for each top recipe

YouTube modes (controlled by YOUTUBE_API_KEY in .env):
  - Not set → mock mode (returns realistic fake video data, no API call)
  - Set     → live mode (real YouTube Data API v3 search)
"""

import os
import httpx
from typing import List, Optional
from app.services.inventory import get_all_items
from app.services.recipe_db import RECIPE_DB
from app.models.recipes import RecipeSuggestion, YouTubeVideo, RecipeResponse

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Mock YouTube videos — realistic placeholders per recipe name
MOCK_VIDEOS = {
    "Aloo Dum":             ("aloo_dum_mock",   "Aloo Dum Recipe - Spicy Bengali Style",         "HomeCookingShow"),
    "Dal Tadka":            ("dal_tadka_mock",  "Restaurant Style Dal Tadka",                    "Kabita's Kitchen"),
    "Egg Curry":            ("egg_curry_mock",  "Easy Egg Curry Recipe",                         "Sanjeev Kapoor"),
    "Egg Bhurji":           ("egg_bhurji_mock", "Anda Bhurji - Street Style",                    "Tasty Indian"),
    "Masala Omelette":      ("omelette_mock",   "Perfect Masala Omelette",                       "Vahchef"),
    "Aloo Paratha":         ("paratha_mock",    "Crispy Aloo Paratha Recipe",                    "Nisha Madhulika"),
    "Vegetable Biryani":    ("biryani_mock",    "Veg Biryani - Dum Style",                       "Hyderabadi Ruchulu"),
    "Chana Masala":         ("chana_mock",      "Dhaba Style Chana Masala",                      "Cook with Parul"),
    "Aloo Gobhi":           ("gobhi_mock",      "Aloo Gobhi Dry Sabzi",                          "Rajshri Food"),
    "Palak Paneer":         ("palak_mock",      "Palak Paneer - Restaurant Style",               "Sanjeev Kapoor"),
    "Egg Fried Rice":       ("fried_rice_mock", "Indo-Chinese Egg Fried Rice",                   "Bong Eats"),
    "French Toast":         ("toast_mock",      "Classic French Toast Recipe",                   "Tasty"),
    "Banana Smoothie":      ("smoothie_mock",   "Thick Banana Milkshake",                        "Hebbar's Kitchen"),
    "Poha":                 ("poha_mock",       "Kanda Batata Poha - Maharashtrian Style",       "Madhura Recipe"),
    "Masoor Dal":           ("masoor_mock",     "Simple Masoor Dal Tadka",                       "Kabita's Kitchen"),
    "Pasta Aglio e Olio":   ("pasta_mock",      "Pasta Aglio e Olio in 15 Minutes",              "Joshua Weissman"),
    "Aloo Posto":           ("posto_mock",      "Aloo Posto - Bengali Style",                    "Bong Eats"),
    "Begun Bhaja":          ("bhaja_mock",      "Crispy Begun Bhaja Recipe",                     "Bong Eats"),
}


def _mock_video(recipe_name: str) -> YouTubeVideo:
    """Returns a mock YouTube video for a given recipe name."""
    if recipe_name in MOCK_VIDEOS:
        vid_id, title, channel = MOCK_VIDEOS[recipe_name]
    else:
        # Generic fallback
        slug = recipe_name.lower().replace(" ", "_")
        vid_id, title, channel = f"{slug}_mock", f"How to make {recipe_name}", "Indian Cooking"

    return YouTubeVideo(
        title=title,
        video_id=vid_id,
        url=f"https://www.youtube.com/watch?v={vid_id}",
        thumbnail=f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
        channel=channel,
    )


async def _fetch_youtube_video(recipe_name: str, cuisine: str) -> Optional[YouTubeVideo]:
    """Calls YouTube Data API v3 to find a cooking video for a recipe."""
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        return _mock_video(recipe_name)

    query = f"{recipe_name} {cuisine} recipe cooking"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 1,
        "relevanceLanguage": "en",
        "key": api_key,
    }

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
            title=snippet["title"],
            video_id=video_id,
            url=f"https://www.youtube.com/watch?v={video_id}",
            thumbnail=snippet["thumbnails"]["high"]["url"],
            channel=snippet["channelTitle"],
        )

    except Exception:
        # Fall back to mock if API call fails
        return _mock_video(recipe_name)


def _match_score(inventory_items: List[str], recipe_ingredients: List[str]) -> tuple[int, List[str], List[str]]:
    """
    Compares inventory against recipe ingredients.
    Returns (score_percent, matching_list, missing_list).
    Uses fuzzy substring matching so "mustard oil" matches "oil".
    """
    inventory_lower = [i.lower() for i in inventory_items]
    matching = []
    missing = []

    for ingredient in recipe_ingredients:
        ing_lower = ingredient.lower()
        found = any(
            ing_lower in inv or inv in ing_lower
            for inv in inventory_lower
        )
        if found:
            matching.append(ingredient)
        else:
            missing.append(ingredient)

    total = len(recipe_ingredients)
    score = int((len(matching) / total) * 100) if total > 0 else 0
    return score, matching, missing


async def get_recipe_suggestions(
    cuisine_filter: Optional[str] = None,
    max_recipes: int = 5,
) -> RecipeResponse:
    """
    Main function: reads inventory, matches recipes, fetches YouTube videos.
    Returns a ranked list of recipe suggestions.
    """
    # Get current inventory
    inventory = get_all_items()
    inventory_names = [item.item for item in inventory]

    # Filter recipe DB by cuisine if requested
    recipes_to_check = RECIPE_DB
    if cuisine_filter:
        recipes_to_check = [
            r for r in RECIPE_DB
            if r["cuisine"].lower() == cuisine_filter.lower()
        ]

    # Score all recipes
    scored = []
    for recipe in recipes_to_check:
        score, matching, missing = _match_score(inventory_names, recipe["ingredients"])
        scored.append((score, recipe, matching, missing))

    # Sort by score descending, take top N
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:max_recipes]

    # Fetch YouTube videos for top recipes
    suggestions = []
    for score, recipe, matching, missing in top:
        video = await _fetch_youtube_video(recipe["name"], recipe["cuisine"])
        suggestions.append(RecipeSuggestion(
            name=recipe["name"],
            cuisine=recipe["cuisine"],
            matching_ingredients=matching,
            missing_ingredients=missing,
            match_score=score,
            youtube_video=video,
        ))

    youtube_mode = "live" if os.getenv("YOUTUBE_API_KEY") else "mock"

    return RecipeResponse(
        inventory_used=inventory_names,
        recipes=suggestions,
        total_found=len(suggestions),
        youtube_mode=youtube_mode,
    )
