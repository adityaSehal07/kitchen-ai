"""
Router: /api/v1/price-compare
Accepts a grocery list (from Phase 1 output) and returns
a simulated price comparison across Blinkit, Zepto, and Instamart.
"""

from fastapi import APIRouter, HTTPException, status
from app.models.pricing import PriceRequest, PriceComparisonResult, ErrorResponse
from app.services.pricing import simulate_price_comparison

router = APIRouter(prefix="/api/v1", tags=["Price Comparison"])


@router.post(
    "/price-compare",
    response_model=PriceComparisonResult,
    responses={
        400: {"model": ErrorResponse, "description": "Empty grocery list"},
        500: {"model": ErrorResponse, "description": "Internal error"},
    },
    summary="Compare grocery prices across Blinkit, Zepto, and Instamart",
    description=(
        "Pass in the `grocery_list` array from the `/transcribe` response. "
        "Returns per-item price breakdown and total cart value on each platform, "
        "plus a recommendation for the cheapest option. "
        "**Note:** Prices are simulated for demo purposes."
    ),
)
async def compare_prices(request: PriceRequest):
    if not request.grocery_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grocery_list cannot be empty.",
        )

    try:
        result = simulate_price_comparison(request.grocery_list)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Price comparison failed: {str(e)}",
        )

    return result


@router.post(
    "/full-pipeline",
    response_model=PriceComparisonResult,
    summary="One-shot: upload audio and get price comparison in one call",
    description=(
        "Convenience endpoint that chains Phase 1 (transcription) and Phase 2 "
        "(price comparison) into a single API call. "
        "Upload a voice note, get back a full price comparison."
    ),
    tags=["Voice Pipeline"],
)
async def full_pipeline(request: PriceRequest):
    """
    Shortcut: if you already have a grocery_list (from transcribe),
    pipe it directly into price comparison.
    This endpoint sets up for the full chained flow in the frontend.
    """
    return await compare_prices(request)
