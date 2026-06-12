"""
Phase 2 smoke test — price comparison engine.
Run: python test_phase2.py
"""

import os
os.environ["AI_MODE"] = "mock"

from app.models.grocery import GroceryItem
from app.services.pricing import simulate_price_comparison

MOCK_GROCERY_LIST = [
    GroceryItem(item="potato", quantity="2 kg"),
    GroceryItem(item="onion", quantity="1 kg"),
    GroceryItem(item="tomato", quantity="500 g"),
    GroceryItem(item="milk", quantity="1 litre"),
    GroceryItem(item="eggs", quantity="1 dozen"),
    GroceryItem(item="mustard oil", quantity="1 bottle"),
    GroceryItem(item="coriander leaves", quantity="1 bunch"),
    GroceryItem(item="sugar", quantity="500 g"),
    GroceryItem(item="ginger", quantity="1 small piece"),
    GroceryItem(item="garlic", quantity="1 whole head"),
]


def run_test():
    print("=" * 70)
    print("PHASE 2 SMOKE TEST — Price Comparison Engine")
    print("=" * 70)

    result = simulate_price_comparison(MOCK_GROCERY_LIST)

    print(f"\n{'ITEM':<30} {'BLINKIT':>10} {'ZEPTO':>10} {'INSTAMART':>12} {'CHEAPEST':>12}")
    print("-" * 78)

    for row in result.comparison:
        marker = lambda p: "✅" if p == row.cheapest else "  "
        print(
            f"{row.item:<30} "
            f"{marker('blinkit')} ₹{row.blinkit:>6.2f}  "
            f"{marker('zepto')} ₹{row.zepto:>6.2f}  "
            f"{marker('instamart')} ₹{row.instamart:>6.2f}  "
            f"  → {row.cheapest}"
        )

    print("-" * 78)
    print(
        f"{'CART TOTAL':<30} "
        f"   ₹{result.cart_totals.blinkit:>6.2f}     "
        f"₹{result.cart_totals.zepto:>6.2f}     "
        f"₹{result.cart_totals.instamart:>6.2f}"
    )

    print(f"\n🏆  Recommended: {result.recommended_platform.upper()}")
    print(f"💰  You save: ₹{result.total_savings:.2f} vs most expensive option")
    print(f"\n⚠️   {result.note}")

    print("\n" + "=" * 70)
    print("✅  Phase 2 tests passed!")
    print("=" * 70)


if __name__ == "__main__":
    run_test()
