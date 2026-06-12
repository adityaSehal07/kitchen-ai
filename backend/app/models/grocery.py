from pydantic import BaseModel, Field
from typing import List, Optional


class GroceryItem(BaseModel):
    """A single extracted grocery item with name and quantity."""
    item: str = Field(..., description="English name of the ingredient/grocery item")
    quantity: str = Field(..., description="Amount needed, e.g. '2 kg', '500 g', '1 dozen'")


class TranscriptionResult(BaseModel):
    """Full response from the voice-to-JSON pipeline."""
    transcript: str = Field(..., description="Raw transcript of the audio (original language mix)")
    detected_language: Optional[str] = Field(None, description="Language(s) detected in the audio")
    grocery_list: List[GroceryItem] = Field(..., description="Structured list of grocery items extracted")
    item_count: int = Field(..., description="Total number of unique items found")


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str
    detail: Optional[str] = None
