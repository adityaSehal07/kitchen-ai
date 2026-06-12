from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.grocery import GroceryItem


class PriceRequest(BaseModel):
    grocery_list: List[GroceryItem] = Field(
        ...,
        description="List of grocery items from Phase 1 transcription output",
    )

class ItemPriceComparison(BaseModel):
    item: str
    blinkit: float
    zepto: float
    instamart: float
    cheapest: str
    savings: float

class CartTotals(BaseModel):
    blinkit: float
    zepto: float
    instamart: float

class PriceComparisonResult(BaseModel):
    comparison: List[ItemPriceComparison]
    cart_totals: CartTotals
    recommended_platform: str
    total_savings: float
    currency: str = "INR"
    note: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None