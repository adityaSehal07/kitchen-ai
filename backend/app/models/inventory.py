from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class InventoryItemAdd(BaseModel):
    """Request model to add one or more bought items to inventory."""
    item: str = Field(..., description="English name of the item", example="potato")
    quantity: str = Field(..., description="Amount, e.g. '2 kg', '1 dozen'", example="2 kg")
    category: Optional[str] = Field(None, description="Optional category e.g. 'vegetable', 'dairy'", example="vegetable")


class BulkAddRequest(BaseModel):
    """Add multiple items at once — use after a grocery purchase."""
    items: List[InventoryItemAdd]


class InventoryItemUse(BaseModel):
    """Request model to mark an item as used/consumed."""
    item: str = Field(..., description="Name of the item to mark as used", example="potato")
    quantity_used: Optional[str] = Field(None, description="How much was used. If omitted, removes item entirely.", example="500 g")


class InventoryItem(BaseModel):
    """A single item in the kitchen inventory (read model)."""
    id: int
    item: str
    quantity: str
    category: Optional[str]
    added_at: str
    updated_at: str

    class Config:
        from_attributes = True


class InventoryResponse(BaseModel):
    """Full inventory list response."""
    items: List[InventoryItem]
    total_items: int


class MessageResponse(BaseModel):
    """Simple success message response."""
    message: str
    item: Optional[str] = None
