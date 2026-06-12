"""
Phase 3 smoke test — Kitchen Inventory system.
Run: python test_phase3.py
"""

import os
import sys

# Use a test database, not the real one
os.environ["AI_MODE"] = "mock"

# Temporarily override DB path to use a test file
import app.database as db_module
from pathlib import Path
db_module.DB_PATH = Path("test_kitchen.db")

from app.database import init_db
from app.services.inventory import add_item, add_items_bulk, get_all_items, remove_item, clear_all_items
from app.models.inventory import InventoryItemAdd

def run_tests():
    print("=" * 60)
    print("PHASE 3 SMOKE TEST — Kitchen Inventory")
    print("=" * 60)

    # Setup fresh test DB
    init_db()
    clear_all_items()

    # Test 1: Add single item
    print("\n[TEST 1] Add single item")
    item = add_item("potato", "2 kg", "vegetable")
    assert item.item == "potato"
    assert item.quantity == "2 kg"
    print(f"  ✅  Added: {item.item} — {item.quantity}")

    # Test 2: Add bulk items
    print("\n[TEST 2] Add bulk items")
    bulk = [
        InventoryItemAdd(item="onion", quantity="1 kg", category="vegetable"),
        InventoryItemAdd(item="milk", quantity="1 litre", category="dairy"),
        InventoryItemAdd(item="eggs", quantity="1 dozen", category="dairy"),
        InventoryItemAdd(item="mustard oil", quantity="1 bottle", category="oil"),
    ]
    added = add_items_bulk(bulk)
    assert len(added) == 4
    print(f"  ✅  Added {len(added)} items in bulk")

    # Test 3: Get all items
    print("\n[TEST 3] Get all inventory items")
    all_items = get_all_items()
    assert len(all_items) == 5
    print(f"  ✅  Inventory has {len(all_items)} items:")
    print(f"\n  {'ITEM':<20} {'QUANTITY':<15} {'CATEGORY'}")
    print("  " + "-" * 45)
    for i in all_items:
        print(f"  {i.item:<20} {i.quantity:<15} {i.category or '-'}")

    # Test 4: Upsert (update existing item)
    print("\n[TEST 4] Update existing item (upsert)")
    updated = add_item("potato", "3 kg", "vegetable")
    assert updated.quantity == "3 kg"
    print(f"  ✅  Updated potato: {updated.quantity}")

    # Test 5: Remove item
    print("\n[TEST 5] Remove an item")
    deleted = remove_item("eggs")
    assert deleted is True
    remaining = get_all_items()
    assert len(remaining) == 4
    print(f"  ✅  Removed eggs. Inventory now has {len(remaining)} items.")

    # Cleanup test DB
    clear_all_items()
    import os as _os
    try:
        _os.remove("test_kitchen.db")
    except:
        pass

    print("\n" + "=" * 60)
    print("✅  All Phase 3 tests passed!")
    print("=" * 60)
    print("\n  Next: uvicorn app.main:app --reload")
    print("  Then: http://localhost:8000/docs → Kitchen Inventory section")


if __name__ == "__main__":
    run_tests()
