from pydantic import BaseModel, Field
from typing import List, Optional


class RecipeRequest(BaseModel):
    """Request to get recipe suggestions based on current inventory."""
    cuisine: Optional[str] = Field(
        None,
        description="Filter by cuisine type e.g. 'Indian', 'Chinese', 'Italian'",
        example="Indian"
    )
    max_recipes: Optional[int] = Field(
        5,
        description="Maximum number of recipes to suggest",
        example=5
    )


class YouTubeVideo(BaseModel):
    """A single YouTube video result."""
    title: str
    video_id: str
    url: str
    thumbnail: str
    channel: str


class RecipeSuggestion(BaseModel):
    """A single recipe suggestion with ingredients and YouTube video."""
    name: str = Field(..., description="Recipe name")
    cuisine: str = Field(..., description="Cuisine type")
    matching_ingredients: List[str] = Field(..., description="Ingredients you already have")
    missing_ingredients: List[str] = Field(..., description="Ingredients you still need to buy")
    match_score: int = Field(..., description="Percentage of ingredients you already have (0-100)")
    youtube_video: Optional[YouTubeVideo] = Field(None, description="Relevant YouTube cooking video")


class RecipeResponse(BaseModel):
    """Full response with recipe suggestions."""
    inventory_used: List[str] = Field(..., description="Items from your inventory used for matching")
    recipes: List[RecipeSuggestion]
    total_found: int
    youtube_mode: str = Field(..., description="'live' if real YouTube API, 'mock' if simulated")
