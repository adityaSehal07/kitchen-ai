"""
Inventory Service
All CRUD operations for the kitchen inventory.
"""

from datetime import datetime
from typing import List, Optional
from app.database import get_connection
from app.models.inventory import InventoryItem


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def add_item(item: str, quantity: str, category: Optional[str] = None) -> InventoryItem:
    """
    Adds an item to inventory.
    If item already exists, updates its quantity and timestamp instead.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now = _now()

    # Upsert: insert if new, update quantity if already exists
    cursor.execute("""
        INSERT INTO inventory (item, quantity, category, added_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(item) DO UPDATE SET
            quantity   = excluded.quantity,
            category   = COALESCE(excluded.category, inventory.category),
            updated_at = excluded.updated_at
    """, (item.lower().strip(), quantity, category, now, now))

    conn.commit()

    # Fetch the upserted row
    cursor.execute("SELECT * FROM inventory WHERE item = ? COLLATE NOCASE", (item,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_model(row)


def add_items_bulk(items: list) -> List[InventoryItem]:
    """Adds multiple items at once. Returns the full updated list."""
    return [add_item(i.item, i.quantity, i.category) for i in items]


def get_all_items() -> List[InventoryItem]:
    """Returns all items currently in the inventory, sorted alphabetically."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory ORDER BY item ASC")
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_model(r) for r in rows]


def get_item(item_name: str) -> Optional[InventoryItem]:
    """Returns a single inventory item by name, or None if not found."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory WHERE item = ? COLLATE NOCASE", (item_name,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_model(row) if row else None


def remove_item(item_name: str) -> bool:
    """
    Fully removes an item from inventory.
    Returns True if deleted, False if item wasn't found.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inventory WHERE item = ? COLLATE NOCASE", (item_name,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def clear_all_items() -> int:
    """Removes all items from inventory. Returns count of deleted items."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM inventory")
    count = cursor.fetchone()[0]
    cursor.execute("DELETE FROM inventory")
    conn.commit()
    conn.close()
    return count


def _row_to_model(row) -> InventoryItem:
    """Converts a sqlite3.Row to an InventoryItem Pydantic model."""
    return InventoryItem(
        id=row["id"],
        item=row["item"],
        quantity=row["quantity"],
        category=row["category"],
        added_at=row["added_at"],
        updated_at=row["updated_at"],
    )
