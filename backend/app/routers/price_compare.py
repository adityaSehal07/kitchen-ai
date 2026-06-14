"""
Price comparison router using Firecrawl to scrape real prices
from Zepto, Blinkit, and Swiggy Instamart.
"""

import os
import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1/prices", tags=["Price Comparison"])

FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape"


class GroceryItem(BaseModel):
    item: str
    quantity: str


class PriceRequest(BaseModel):
    grocery_list: List[GroceryItem]


class ItemPrice(BaseModel):
    item: str
    quantity: str
    blinkit: Optional[str] = None
    blinkit_unit: Optional[str] = None
    zepto: Optional[str] = None
    zepto_unit: Optional[str] = None
    instamart: Optional[str] = None
    instamart_unit: Optional[str] = None
    cheapest: Optional[str] = None


class PriceResponse(BaseModel):
    items: List[ItemPrice]
    totals: dict
    cheapest_platform: str
    cart_urls: dict


async def scrape_price(client: httpx.AsyncClient, platform: str, item: str) -> dict:
    """Scrape price for an item from a platform using Firecrawl."""
    api_key = os.getenv("FIRECRAWL_API_KEY", "fc-143e94d27931491fb889442c18e0d14b")

    urls = {
        "blinkit": f"https://blinkit.com/s/?q={item.replace(' ', '+')}",
        "zepto": f"https://www.zeptonow.com/search?query={item.replace(' ', '+')}",
        "instamart": f"https://www.swiggy.com/instamart/search?query={item.replace(' ', '+')}",
    }

    try:
        resp = await client.post(
            FIRECRAWL_API,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "url": urls[platform],
                "formats": ["extract"],
                "extract": {
                    "prompt": f"Find the price of '{item}' from the search results. Return the first available product with its name, price in INR, and unit/weight. Return JSON with fields: product_name, price_inr (number only), unit (like '1kg', '500g', '1L'). If not found return null.",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "product_name": {"type": "string"},
                            "price_inr": {"type": "number"},
                            "unit": {"type": "string"}
                        }
                    }
                }
            },
            timeout=30.0
        )
        data = resp.json()
        if data.get("success") and data.get("data", {}).get("extract"):
            extract = data["data"]["extract"]
            if extract and extract.get("price_inr"):
                return {
                    "price": extract["price_inr"],
                    "unit": extract.get("unit", ""),
                    "product": extract.get("product_name", item),
                }
    except Exception as e:
        print(f"Firecrawl error for {platform}/{item}: {e}")

    return {"price": None, "unit": None, "product": item}


@router.post("/compare", response_model=PriceResponse)
async def compare_prices(request: PriceRequest):
    """Compare prices across Blinkit, Zepto, and Swiggy Instamart."""

    items_result = []
    totals = {"blinkit": 0, "zepto": 0, "instamart": 0}
    missing = {"blinkit": 0, "zepto": 0, "instamart": 0}

    async with httpx.AsyncClient() as client:
        for grocery in request.grocery_list:
            # Scrape all 3 platforms concurrently
            results = await asyncio.gather(
                scrape_price(client, "blinkit", grocery.item),
                scrape_price(client, "zepto", grocery.item),
                scrape_price(client, "instamart", grocery.item),
                return_exceptions=True
            )

            blinkit_data = results[0] if not isinstance(results[0], Exception) else {}
            zepto_data = results[1] if not isinstance(results[1], Exception) else {}
            instamart_data = results[2] if not isinstance(results[2], Exception) else {}

            # Find cheapest for this item
            prices = {}
            if blinkit_data.get("price"): prices["blinkit"] = blinkit_data["price"]
            if zepto_data.get("price"): prices["zepto"] = zepto_data["price"]
            if instamart_data.get("price"): prices["instamart"] = instamart_data["price"]

            cheapest = min(prices, key=prices.get) if prices else None

            # Add to totals
            for platform in ["blinkit", "zepto", "instamart"]:
                data = {"blinkit": blinkit_data, "zepto": zepto_data, "instamart": instamart_data}[platform]
                if data.get("price"):
                    totals[platform] += data["price"]
                else:
                    missing[platform] += 1

            items_result.append(ItemPrice(
                item=grocery.item,
                quantity=grocery.quantity,
                blinkit=f"₹{blinkit_data['price']}" if blinkit_data.get("price") else "N/A",
                blinkit_unit=blinkit_data.get("unit", ""),
                zepto=f"₹{zepto_data['price']}" if zepto_data.get("price") else "N/A",
                zepto_unit=zepto_data.get("unit", ""),
                instamart=f"₹{instamart_data['price']}" if instamart_data.get("price") else "N/A",
                instamart_unit=instamart_data.get("unit", ""),
                cheapest=cheapest,
            ))

    # Find overall cheapest platform
    valid_totals = {k: v for k, v in totals.items() if v > 0}
    cheapest_platform = min(valid_totals, key=valid_totals.get) if valid_totals else "zepto"

    # Build cart URLs with all items
    items_query = "+".join([g.item for g in request.grocery_list[:3]])
    cart_urls = {
        "blinkit": f"https://blinkit.com/s/?q={request.grocery_list[0].item if request.grocery_list else 'grocery'}",
        "zepto": f"https://www.zeptonow.com/search?query={request.grocery_list[0].item if request.grocery_list else 'grocery'}",
        "instamart": f"https://www.swiggy.com/instamart/search?query={request.grocery_list[0].item if request.grocery_list else 'grocery'}",
    }

    return PriceResponse(
        items=items_result,
        totals={k: round(v, 2) for k, v in totals.items()},
        cheapest_platform=cheapest_platform,
        cart_urls=cart_urls,
    )


@router.get("/health")
async def price_health():
    return {"status": "ok", "firecrawl": bool(os.getenv("FIRECRAWL_API_KEY", "fc-143e94d27931491fb889442c18e0d14b"))}
