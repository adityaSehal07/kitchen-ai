from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional
from app.models.recipes import RecipeResponse
from app.services.recipes import get_recipe_suggestions

router = APIRouter(prefix="/api/v1/recipes", tags=["Recipe Suggestions"])


@router.get("", response_model=RecipeResponse)
async def suggest_recipes(
    cuisine: Optional[str] = Query(None),
    max_recipes: int = Query(6, ge=1, le=20),
    veg_only: Optional[bool] = Query(None, description="True=veg only, False=non-veg only, None=all"),
):
    result = await get_recipe_suggestions(
        cuisine_filter=cuisine,
        max_recipes=max_recipes,
        veg_only=veg_only,
    )
    if not result.recipes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
            detail="No recipes found. Add items to your inventory first.")
    return result
