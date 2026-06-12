"""
Database setup for Smart Kitchen Assistant.
Uses Python's built-in sqlite3 — no extra dependencies needed.
Database file: backend/kitchen.db (auto-created on first run)
"""

import sqlite3
import os
from pathlib import Path

# Database file lives in the backend/ directory
DB_PATH = Path(__file__).parent.parent.parent / "kitchen.db"


def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with row_factory so rows behave like dicts."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # Access columns by name: row["item"]
    return conn


def init_db():
    """
    Creates all tables if they don't exist.
    Called once at app startup.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            item        TEXT NOT NULL COLLATE NOCASE,
            quantity    TEXT NOT NULL,
            category    TEXT,
            added_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Unique index on item name (case-insensitive) — no duplicate entries
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_item
        ON inventory (item COLLATE NOCASE)
    """)

    conn.commit()
    conn.close()
    print(f"✅ Database ready at: {DB_PATH}")
