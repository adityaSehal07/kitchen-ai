import random
from typing import List
from app.models.grocery import GroceryItem
from app.models.pricing import ItemPriceComparison, CartTotals, PriceComparisonResult

BASE_PRICES = {
    "potato":           40,  "onion":            35,
    "tomato":           30,  "garlic":           25,
    "ginger":           15,  "coriander leaves": 15,
    "milk":             58,  "eggs":             85,
    "mustard oil":     175,  "sugar":            42,
    "rice":             65,  "wheat flour":      45,
    "dal":              90,  "paneer":           90,
    "butter":           55,  "ghee":            150,
    "spinach":          20,  "carrot":           40,
    "capsicum":         40,  "turmeric":         30,
    "cumin":            35,  "garam masala":     45,
    "tea":              60,  "bread":            45,
    "banana":           40,  "apple":            80,
    "lemon":            25,  "curd":             45,
}

PLATFORM_BIAS = {"blinkit": 1.00, "zepto": 0.96, "instamart": 1.04}
PLATFORM_SEED  = {"blinkit": 100,  "zepto": 200,  "instamart": 300}


def _get_base_price(item: str) -> float:
    key = item.lower().strip()
    if key in BASE_PRICES:
        return float(BASE_PRICES[key])
    for k, v in BASE_PRICES.items():
        if k in key or key in k:
            return float(v)
    return 50.0


def _platform_price(item: str, base: float, platform: str) -> float:
    random.seed(hash(item + platform) % 10000 + PLATFORM_SEED[platform])
    variance = random.uniform(-0.08, 0.08)
    return round(base * PLATFORM_BIAS[platform] * (1 + variance), 2)


def simulate_price_comparison(grocery_list: List[GroceryItem]) -> PriceComparisonResult:
    comparison = []
    totals = {"blinkit": 0.0, "zepto": 0.0, "instamart": 0.0}

    for grocery in grocery_list:
        base = _get_base_price(grocery.item)
        label = f"{grocery.item} ({grocery.quantity})"
        prices = {p: _platform_price(grocery.item, base, p) for p in totals}

        cheapest = min(prices, key=prices.get)
        savings = round(max(prices.values()) - prices[cheapest], 2)

        comparison.append(ItemPriceComparison(
            item=label, cheapest=cheapest, savings=savings, **prices
        ))
        for p in totals:
            totals[p] += prices[p]

    totals = {k: round(v, 2) for k, v in totals.items()}
    recommended = min(totals, key=totals.get)
    total_savings = round(max(totals.values()) - totals[recommended], 2)

    return PriceComparisonResult(
        comparison=comparison,
        cart_totals=CartTotals(**totals),
        recommended_platform=recommended,
        total_savings=total_savings,
        note="Prices are simulated for demonstration. Please verify on the respective apps before ordering.",
    )