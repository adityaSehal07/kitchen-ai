"""
Phase 4 smoke test — Recipe Suggestions + YouTube (mock).
Run: python test_phase4.py
"""

import asyncio
import os
from pathlib import Path

os.environ["AI_MODE"] = "mock"

# Use test DB
import app.database as db_module
db_module.DB_PATH = Path("test_kitchen_p4.db")

from app.database import init_db
from app.services.inventory import add_items_bulk, clear_all_items
from app.services.recipes import get_recipe_suggestions
from app.models.inventory import InventoryItemAdd

# Simulate a typical post-purchase inventory
SAMPLE_INVENTORY = [
    InventoryItemAdd(item="potato",          quantity="2 kg",    category="vegetable"),
    InventoryItemAdd(item="onion",           quantity="1 kg",    category="vegetable"),
    InventoryItemAdd(item="tomato",          quantity="500 g",   category="vegetable"),
    InventoryItemAdd(item="eggs",            quantity="1 dozen", category="dairy"),
    InventoryItemAdd(item="milk",            quantity="1 litre", category="dairy"),
    InventoryItemAdd(item="mustard oil",     quantity="1 bottle",category="oil"),
    InventoryItemAdd(item="coriander leaves",quantity="1 bunch", category="herb"),
    InventoryItemAdd(item="garlic",          quantity="1 head",  category="spice"),
    InventoryItemAdd(item="ginger",          quantity="1 piece", category="spice"),
    InventoryItemAdd(item="sugar",           quantity="500 g",   category="staple"),
]


async def run_tests():
    print("=" * 65)
    print("PHASE 4 SMOKE TEST — Recipe Suggestions + YouTube")
    print("=" * 65)

    # Setup
    init_db()
    clear_all_items()
    add_items_bulk(SAMPLE_INVENTORY)
    print(f"\n📦  Inventory loaded: {len(SAMPLE_INVENTORY)} items")

    # Test 1: All cuisines
    print("\n[TEST 1] Top 5 recipes across all cuisines")
    result = await get_recipe_suggestions(max_recipes=5)
    assert len(result.recipes) > 0

    print(f"\n  {'RECIPE':<25} {'CUISINE':<12} {'SCORE':>6}  {'MISSING'}")
    print("  " + "-" * 65)
    for r in result.recipes:
        missing = ", ".join(r.missing_ingredients) if r.missing_ingredients else "none ✅"
        print(f"  {r.name:<25} {r.cuisine:<12} {r.match_score:>5}%  {missing}")
        if r.youtube_video:
            print(f"  {'':25} 🎬 {r.youtube_video.title[:45]}")

    # Test 2: Filter by cuisine
    print("\n[TEST 2] Indian cuisine only")
    indian = await get_recipe_suggestions(cuisine_filter="Indian", max_recipes=3)
    assert all(r.cuisine == "Indian" for r in indian.recipes)
    print(f"  ✅  Found {len(indian.recipes)} Indian recipes")
    for r in indian.recipes:
        print(f"     • {r.name} ({r.match_score}% match)")

    # Test 3: YouTube mock
    print("\n[TEST 3] YouTube video links (mock mode)")
    for r in result.recipes[:3]:
        if r.youtube_video:
            print(f"  🎬 {r.name}: {r.youtube_video.url}")

    print(f"\n  YouTube mode: {result.youtube_mode}")

    # Cleanup
    clear_all_items()
    import os as _os
    try:
        _os.remove("test_kitchen_p4.db")
    except:
        pass

    print("\n" + "=" * 65)
    print("✅  All Phase 4 tests passed!")
    print("=" * 65)
    print("\n  Next: uvicorn app.main:app --reload")
    print("  Then: GET http://localhost:8000/api/v1/recipes")


if __name__ == "__main__":
    asyncio.run(run_tests())
