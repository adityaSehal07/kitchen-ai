"""
Router: /api/v1/inventory
Full CRUD for the kitchen inventory.

Endpoints:
  GET    /inventory          → list all items
  POST   /inventory/add      → add a single item
  POST   /inventory/add-bulk → add multiple items at once (post-purchase)
  DELETE /inventory/remove   → remove an item entirely
  DELETE /inventory/clear    → wipe the entire inventory
"""

from fastapi import APIRouter, HTTPException, status
from app.models.inventory import (
    InventoryItemAdd,
    BulkAddRequest,
    InventoryItemUse,
    InventoryItem,
    InventoryResponse,
    MessageResponse,
)
from app.services import inventory as inv_service

router = APIRouter(prefix="/api/v1/inventory", tags=["Kitchen Inventory"])


@router.get(
    "",
    response_model=InventoryResponse,
    summary="Get all items currently in the kitchen inventory",
)
async def get_inventory():
    items = inv_service.get_all_items()
    return InventoryResponse(items=items, total_items=len(items))


@router.post(
    "/add",
    response_model=InventoryItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add a single item to inventory (or update if it already exists)",
)
async def add_item(request: InventoryItemAdd):
    return inv_service.add_item(
        item=request.item,
        quantity=request.quantity,
        category=request.category,
    )


@router.post(
    "/add-bulk",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add multiple items at once — use this after a grocery purchase",
    description=(
        "Pass in the `grocery_list` from Phase 1 transcription output directly. "
        "All items will be added to the inventory in one call."
    ),
)
async def add_bulk(request: BulkAddRequest):
    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="items list cannot be empty.",
        )
    added = inv_service.add_items_bulk(request.items)
    return InventoryResponse(items=added, total_items=len(added))


@router.delete(
    "/remove",
    response_model=MessageResponse,
    summary="Remove an item from inventory (mark as fully used/finished)",
)
async def remove_item(request: InventoryItemUse):
    deleted = inv_service.remove_item(request.item)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{request.item}' not found in inventory.",
        )
    return MessageResponse(
        message=f"'{request.item}' has been removed from inventory.",
        item=request.item,
    )


@router.delete(
    "/clear",
    response_model=MessageResponse,
    summary="Clear the entire inventory (use with caution!)",
)
async def clear_inventory():
    count = inv_service.clear_all_items()
    return MessageResponse(message=f"Inventory cleared. {count} item(s) removed.")
