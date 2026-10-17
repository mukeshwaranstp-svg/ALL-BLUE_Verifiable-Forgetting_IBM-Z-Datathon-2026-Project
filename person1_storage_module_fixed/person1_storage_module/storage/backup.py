"""SQLite backup, isolated restore, and tombstone reconciliation."""
from __future__ import annotations
import os
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
from typing import Any
from storage.database import connection, connect, db_path, initialize_database, list_tombstones

DEFAULT_BACKUP_DIR = Path(os.getenv("VF_BACKUP_DIR", "backups"))

def backup_dir() -> Path:
    return Path(os.getenv("VF_BACKUP_DIR", str(DEFAULT_BACKUP_DIR)))

def create_backup(source_path: str | Path | None = None,
                  destination: str | Path | None = None) -> dict[str, Any]:
    source = Path(source_path) if source_path else db_path()
    if not source.exists():
        initialize_database(source)
    dest = Path(destination) if destination else backup_dir() / f"backup_{__import__('time').time_ns()}.sqlite3"
    dest.parent.mkdir(parents=True, exist_ok=True)
    # SQLite's backup API provides a consistent snapshot, including committed data.
    with closing(sqlite3.connect(str(source))) as src, closing(sqlite3.connect(str(dest))) as dst:
        src.backup(dst)
    return {"path": str(dest), "exists": dest.exists(), "size_bytes": dest.stat().st_size}

def restore_backup_isolated(backup_path: str | Path,
                             destination: str | Path | None = None) -> dict[str, Any]:
    """Restore to a separate database; never overwrite the backup file."""
    backup = Path(backup_path)
    if not backup.is_file():
        raise FileNotFoundError(f"Backup not found: {backup}")
    if destination is None:
        fd, name = tempfile.mkstemp(prefix="vf_restore_", suffix=".sqlite3")
        os.close(fd)
        dest = Path(name)
    else:
        dest = Path(destination)
        dest.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(str(backup))) as src, closing(sqlite3.connect(str(dest))) as dst:
        src.backup(dst)
    return {"backup_path": str(backup), "restored_path": str(dest),
            "restored_exists": dest.exists(), "isolated_destination": str(backup.resolve()) != str(dest.resolve())}

def reconcile_tombstones(restored_path: str | Path,
                         tombstones: list[dict[str, Any]]) -> dict[str, Any]:
    """Apply current deletion tombstones to an isolated restored copy."""
    with connection(restored_path) as conn:
        # Older backups may not have the tombstone table, so create it safely.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS deletion_tombstones (
                customer_id TEXT PRIMARY KEY,
                deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
                reason TEXT NOT NULL DEFAULT 'customer_deletion_request'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            )
        """)
        applied = []
        for item in tombstones:
            cid = item["customer_id"]
            conn.execute("DELETE FROM customers WHERE customer_id = ?", (cid,))
            conn.execute(
                """INSERT INTO deletion_tombstones(customer_id, deleted_at, reason)
                   VALUES (?, ?, ?)
                   ON CONFLICT(customer_id) DO UPDATE SET
                     deleted_at=excluded.deleted_at, reason=excluded.reason""",
                (cid, item.get("deleted_at", ""), item.get("reason", "customer_deletion_request")),
            )
            applied.append(cid)
        remaining = []
        for cid in applied:
            if conn.execute("SELECT 1 FROM customers WHERE customer_id = ?", (cid,)).fetchone():
                remaining.append(cid)
    return {"tombstones_applied": applied, "deleted_ids_still_present": remaining,
            "reconciliation_passed": len(remaining) == 0}
