
"""Evidence-based checks for the live SQLite database and backup snapshots."""
from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from storage.database import (
    db_path,
    control_db_path,
    initialize_control_database,
    list_tombstones,
)
from storage.backup import backup_dir, restore_backup_isolated, reconcile_tombstones


def _has_customer(path: str | Path, customer_id: str) -> bool:
    with closing(sqlite3.connect(str(path))) as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if "customers" not in tables:
            raise RuntimeError("Database has no customers table")

        columns = {
            row[1]
            for row in conn.execute("PRAGMA table_info(customers)").fetchall()
        }
        if "customer_id" not in columns:
            raise RuntimeError("customers table has no customer_id column")

        return conn.execute(
            "SELECT 1 FROM customers WHERE customer_id = ?",
            (customer_id,),
        ).fetchone() is not None


def verify_storage_deletion(customer_id: str) -> dict[str, Any]:
    """Check the live database and discovered backup snapshots."""
    result: dict[str, Any] = {
        "customer_id": customer_id,
        "status": "error",
        "database": {"status": "not_checked", "evidence": {}, "errors": []},
        "backups": {
            "status": "not_checked",
            "checked": [],
            "errors": [],
            "raw_backup_copies_erased": False,
        },
        "errors": [],
        "limitations": [
            "Only the configured live SQLite database and discovered backup files are inspected.",
            "Reconciliation changes an isolated restored copy, not the original backup.",
            "This does not prove erasure from external copies or other systems.",
        ],
    }

    if not isinstance(customer_id, str) or not customer_id.strip():
        result["errors"].append("customer_id must be a non-empty string")
        return result

    live = db_path()

    try:
        if not live.exists():
            raise FileNotFoundError(f"Live database not found: {live}")

        present = _has_customer(live, customer_id)

        # Read the tombstone from the separate control database.
        control = control_db_path(live)
        initialize_control_database(live_path=live)

        with closing(sqlite3.connect(str(control))) as conn:
            row = conn.execute(
                """SELECT customer_id, deleted_at, reason
                   FROM deletion_tombstones
                   WHERE customer_id = ?""",
                (customer_id,),
            ).fetchone()

        tombstone = (
            {
                "customer_id": row[0],
                "deleted_at": row[1],
                "reason": row[2],
            }
            if row
            else None
        )

        result["database"] = {
            "status": (
                "passed"
                if not present and tombstone
                else "failed"
                if present
                else "incomplete"
            ),
            "evidence": {
                "live_database_path": str(live),
                "customer_record_present": present,
                "control_database_path": str(control),
                "tombstone_present": tombstone is not None,
                "tombstone": tombstone,
            },
            "errors": [],
        }

        if present:
            result["database"]["errors"].append(
                "Customer record is still present in the live database"
            )
        if not tombstone:
            result["database"]["errors"].append(
                "No deletion tombstone found in the separate control database"
            )

    except Exception as exc:
        result["database"] = {
            "status": "error",
            "evidence": {"live_database_path": str(live)},
            "errors": [str(exc)],
        }
        result["errors"].append(f"database check: {exc}")

    try:
        directory = backup_dir()
        backup_files = (
            sorted(p for p in directory.glob("*.sqlite3") if p.is_file())
            if directory.exists()
            else []
        )
        current_tombstones = list_tombstones(live) if live.exists() else []
        checked = []

        for backup in backup_files:
            item: dict[str, Any] = {
                "backup_path": str(backup),
                "errors": [],
            }

            try:
                raw_present = _has_customer(backup, customer_id)
                item["raw_backup_customer_record_present"] = raw_present

                restore = restore_backup_isolated(backup)
                restored_path = restore["restored_path"]

                try:
                    reconciliation = reconcile_tombstones(
                        restored_path, current_tombstones
                    )
                    reconciled_present = _has_customer(
                        restored_path, customer_id
                    )
                    item["isolated_restore"] = {
                        **restore,
                        "customer_record_present_before_reconciliation": raw_present,
                        "customer_record_present_after_reconciliation": reconciled_present,
                        "reconciliation": reconciliation,
                    }
                finally:
                    try:
                        Path(restored_path).unlink(missing_ok=True)
                    except OSError as cleanup_exc:
                        item["errors"].append(
                            f"temporary restore cleanup: {cleanup_exc}"
                        )

            except Exception as exc:
                item["errors"].append(str(exc))

            checked.append(item)

        result["backups"]["checked"] = checked

        if any(item["errors"] for item in checked):
            backup_status = "error"
        elif not checked:
            backup_status = "no_backups_found"
        elif all(
            not item.get("raw_backup_customer_record_present", True)
            and not item.get("isolated_restore", {}).get(
                "customer_record_present_after_reconciliation", True
            )
            for item in checked
        ):
            backup_status = "passed"
        elif all(
            "isolated_restore" in item
            and not item["isolated_restore"][
                "customer_record_present_after_reconciliation"
            ]
            for item in checked
        ):
            backup_status = "retained_but_reconciled"
        else:
            backup_status = "failed"

        result["backups"]["status"] = backup_status

    except Exception as exc:
        result["backups"]["status"] = "error"
        result["backups"]["errors"].append(str(exc))
        result["errors"].append(f"backup check: {exc}")

    statuses = [
        result["database"]["status"],
        result["backups"]["status"],
    ]

    if "error" in statuses or result["errors"]:
        result["status"] = "error"
    elif (
        result["database"]["status"] == "passed"
        and result["backups"]["status"] == "passed"
    ):
        result["status"] = "passed"
    elif (
        result["database"]["status"] == "passed"
        and result["backups"]["status"]
        in ("retained_but_reconciled", "no_backups_found")
    ):
        result["status"] = "partial"
    else:
        result["status"] = "failed"

    return result
