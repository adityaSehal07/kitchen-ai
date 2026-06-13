"""
Kitchen Router
Manages kitchen codes for connecting maids to sisters.
"""

import os
import json
import random
import string
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_connection

router = APIRouter(prefix="/api/v1/kitchen", tags=["Kitchen"])


def init_kitchen_tables():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kitchens (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            code        TEXT UNIQUE NOT NULL,
            name        TEXT NOT NULL DEFAULT 'My Kitchen',
            created_at  TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kitchen_orders (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            kitchen_code TEXT NOT NULL,
            grocery_list TEXT NOT NULL,
            status       TEXT DEFAULT 'pending',
            created_at   TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kitchen_recipes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            kitchen_code TEXT NOT NULL,
            recipe_name  TEXT NOT NULL,
            youtube_url  TEXT,
            youtube_title TEXT,
            channel      TEXT,
            assigned_at  TEXT NOT NULL,
            status       TEXT DEFAULT 'assigned'
        )
    """)
    conn.commit()
    conn.close()


def generate_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class KitchenCreate(BaseModel):
    name: Optional[str] = "My Kitchen"


class RecipeAssign(BaseModel):
    recipe_name: str
    youtube_url: Optional[str] = None
    youtube_title: Optional[str] = None
    channel: Optional[str] = None


@router.post("/create")
async def create_kitchen(request: KitchenCreate):
    """Sister creates a new kitchen and gets a unique code."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    # Generate unique code
    code = generate_code()
    while True:
        cursor.execute("SELECT id FROM kitchens WHERE code = ?", (code,))
        if not cursor.fetchone():
            break
        code = generate_code()

    cursor.execute(
        "INSERT INTO kitchens (code, name, created_at) VALUES (?, ?, ?)",
        (code, request.name, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    conn.commit()
    conn.close()

    return {"code": code, "name": request.name}


@router.get("/verify/{code}")
async def verify_kitchen(code: str):
    """Check if a kitchen code exists."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM kitchens WHERE code = ?", (code.upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Kitchen code not found")

    return {"valid": True, "code": row["code"], "name": row["name"]}


@router.post("/{code}/order")
async def save_kitchen_order(code: str, request: dict):
    """Maid saves a grocery order to the kitchen."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    # Verify kitchen exists
    cursor.execute("SELECT id FROM kitchens WHERE code = ?", (code.upper(),))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Kitchen code not found")

    cursor.execute(
        "INSERT INTO kitchen_orders (kitchen_code, grocery_list, status, created_at) VALUES (?, ?, 'pending', ?)",
        (code.upper(), json.dumps(request.get("grocery_list", [])),
         datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    order_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"success": True, "order_id": order_id}


@router.get("/{code}/orders")
async def get_kitchen_orders(code: str):
    """Sister gets all pending orders for her kitchen."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM kitchen_orders
        WHERE kitchen_code = ? AND status = 'pending'
        ORDER BY created_at DESC LIMIT 5
    """, (code.upper(),))
    rows = cursor.fetchall()
    conn.close()

    orders = []
    for row in rows:
        orders.append({
            "id": row["id"],
            "grocery_list": json.loads(row["grocery_list"]),
            "created_at": row["created_at"],
            "status": row["status"],
        })

    return {"orders": orders}


@router.post("/{code}/confirm-order/{order_id}")
async def confirm_order(code: str, order_id: int):
    """Sister confirms order → adds to inventory."""
    from app.services.inventory import add_item
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM kitchen_orders WHERE id = ? AND kitchen_code = ?",
                   (order_id, code.upper()))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")

    grocery_list = json.loads(row["grocery_list"])
    for item in grocery_list:
        add_item(item["item"], item["quantity"])

    cursor.execute("UPDATE kitchen_orders SET status = 'confirmed' WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()

    return {"success": True, "items_added": len(grocery_list)}


@router.post("/{code}/assign-recipe")
async def assign_recipe(code: str, request: RecipeAssign):
    """Sister assigns a recipe to the cook."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear previous assigned recipe
    cursor.execute(
        "UPDATE kitchen_recipes SET status = 'done' WHERE kitchen_code = ? AND status = 'assigned'",
        (code.upper(),)
    )

    cursor.execute("""
        INSERT INTO kitchen_recipes (kitchen_code, recipe_name, youtube_url, youtube_title, channel, assigned_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'assigned')
    """, (code.upper(), request.recipe_name, request.youtube_url,
          request.youtube_title, request.channel,
          datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    conn.commit()
    conn.close()

    return {"success": True, "recipe": request.recipe_name}


@router.get("/{code}/assigned-recipe")
async def get_assigned_recipe(code: str):
    """Cook checks what recipe is assigned to them."""
    init_kitchen_tables()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM kitchen_recipes
        WHERE kitchen_code = ? AND status = 'assigned'
        ORDER BY assigned_at DESC LIMIT 1
    """, (code.upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"recipe": None}

    return {
        "recipe": {
            "name": row["recipe_name"],
            "youtube_url": row["youtube_url"],
            "youtube_title": row["youtube_title"],
            "channel": row["channel"],
            "assigned_at": row["assigned_at"],
        }
    }
