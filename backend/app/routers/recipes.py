"""
Router: /api/v1/recipes
Returns recipe suggestions based on current kitchen inventory.
"""

from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional
from app.models.recipes import RecipeResponse
from app.services.recipes import get_recipe_suggestions

router = APIRouter(prefix="/api/v1/recipes", tags=["Recipe Suggestions"])


@router.get(
    "",
    response_model=RecipeResponse,
    summary="Get recipe suggestions based on your current kitchen inventory",
    description=(
        "Reads your kitchen inventory and suggests recipes you can make "
        "with what you already have. Each recipe includes a match score "
        "(% of ingredients you own) and a YouTube cooking video link. "
        "Add items to your inventory first via POST /inventory/add-bulk."
    ),
)
async def suggest_recipes(
    cuisine: Optional[str] = Query(
        None,
        description="Filter by cuisine: Indian, Bengali, Chinese, Italian, Continental",
        example="Indian",
    ),
    max_recipes: int = Query(
        5,
        ge=1,
        le=20,
        description="Number of recipes to return (1-20)",
    ),
):
    result = await get_recipe_suggestions(
        cuisine_filter=cuisine,
        max_recipes=max_recipes,
    )

    if not result.recipes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No recipes found. "
                "Add items to your inventory first via POST /api/v1/inventory/add-bulk, "
                "or try a different cuisine filter."
            ),
        )

    return result
