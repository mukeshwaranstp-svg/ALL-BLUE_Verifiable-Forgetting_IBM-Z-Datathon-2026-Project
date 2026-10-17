
"""SQLite storage for the Verifiable Forgetting demo.

All customer records must be synthetic.
Customer records and deletion tombstones are stored separately.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(os.getenv("VF_DB_PATH", "data/customers.sqlite3"))


def db_path() -> Path:
    """Return the configured path for the live customer database."""
    return Path(os.getenv("VF_DB_PATH", str(DEFAULT_DB_PATH)))


def control_db_path(live_path: str | Path | None = None) -> Path:
    """Return the separate database path used to store deletion tombstones."""
    configured = os.getenv("VF_CONTROL_DB_PATH")
    if configured:
        return Path(configured)

    live = Path(live_path) if live_path is not None else db_path()
    return live.parent / "control.sqlite3"


def connect(path: str | Path | None = None) -> sqlite3.Connection:
    """Open a SQLite connection and create its parent directory if needed."""
    target = Path(path) if path is not None else db_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connection(path: str | Path | None = None):
    """Commit or roll back a transaction, then always close the connection."""
    conn = connect(path)
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def initialize_database(path: str | Path | None = None) -> None:
    """Create the live customer table."""
    with connection(path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL
                    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
        """)


def initialize_control_database(
    path: str | Path | None = None,
    live_path: str | Path | None = None,
) -> None:
    """Create the separate control database containing deletion tombstones."""
    target = Path(path) if path is not None else control_db_path(live_path)

    with connection(target) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS deletion_tombstones (
                customer_id TEXT PRIMARY KEY,
                deleted_at TEXT NOT NULL
                    DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
                reason TEXT NOT NULL DEFAULT 'customer_deletion_request'
            )
        """)


def create_customer(
    customer_id: str,
    name: str,
    email: str,
    path: str | Path | None = None,
) -> dict[str, Any]:
    """Insert a synthetic customer unless its ID has already been tombstoned."""
    if not all(
        isinstance(value, str) and value.strip()
        for value in (customer_id, name, email)
    ):
        raise ValueError("customer_id, name, and email must be non-empty strings")

    initialize_database(path)
    initialize_control_database(live_path=path)

    with connection(control_db_path(path)) as conn:
        tombstone = conn.execute(
            "SELECT 1 FROM deletion_tombstones WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()

    if tombstone:
        raise ValueError(
            "This customer ID has a deletion tombstone and cannot be reused"
        )

    with connection(path) as conn:
        conn.execute(
            """INSERT INTO customers (customer_id, name, email)
               VALUES (?, ?, ?)""",
            (customer_id, name, email),
        )
        row = conn.execute(
            """SELECT customer_id, name, email, created_at
               FROM customers WHERE customer_id = ?""",
            (customer_id,),
        ).fetchone()

    return dict(row)


def get_customer(
    customer_id: str,
    path: str | Path | None = None,
) -> dict[str, Any] | None:
    """Return a customer record, or None if it does not exist."""
    initialize_database(path)

    with connection(path) as conn:
        row = conn.execute(
            """SELECT customer_id, name, email, created_at
               FROM customers WHERE customer_id = ?""",
            (customer_id,),
        ).fetchone()

    return dict(row) if row else None


def delete_customer(
    customer_id: str,
    path: str | Path | None = None,
) -> dict[str, Any]:
    """Record the deletion tombstone separately, then delete the live row."""
    if not isinstance(customer_id, str) or not customer_id.strip():
        raise ValueError("customer_id must be a non-empty string")

    initialize_database(path)
    initialize_control_database(live_path=path)

    # Check the live database before changing either database.
    with connection(path) as conn:
        existed = conn.execute(
            "SELECT 1 FROM customers WHERE customer_id = ?",
            (customer_id,),
        ).fetchone() is not None

    # Save the deletion marker in the separate control database first.
    with connection(control_db_path(path)) as conn:
        conn.execute(
            """INSERT INTO deletion_tombstones (customer_id, reason)
               VALUES (?, 'customer_deletion_request')
               ON CONFLICT(customer_id) DO UPDATE SET
                   deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
                   reason = 'customer_deletion_request'""",
            (customer_id,),
        )
        tombstone_row = conn.execute(
            """SELECT customer_id, deleted_at, reason
               FROM deletion_tombstones WHERE customer_id = ?""",
            (customer_id,),
        ).fetchone()

    # Delete the live customer record in its own database.
    with connection(path) as conn:
        conn.execute(
            "DELETE FROM customers WHERE customer_id = ?",
            (customer_id,),
        )
        remaining = conn.execute(
            "SELECT 1 FROM customers WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()

    return {
        "customer_id": customer_id,
        "record_existed_before_delete": existed,
        "record_absent_after_delete": remaining is None,
        "tombstone": dict(tombstone_row) if tombstone_row else None,
        "control_database_path": str(control_db_path(path)),
    }


def list_tombstones(
    live_path: str | Path | None = None,
) -> list[dict[str, Any]]:
    """Read deletion markers from the separate control database."""
    initialize_control_database(live_path=live_path)

    with connection(control_db_path(live_path)) as conn:
        rows = conn.execute(
            """SELECT customer_id, deleted_at, reason
               FROM deletion_tombstones ORDER BY deleted_at"""
        ).fetchall()

    return [dict(row) for row in rows]
