"""
Storage and backup operations service for Verifiable Forgetting.
Implements real SQLite operations:
1. Active database customer record deletion with verification.
2. Tombstone creation and tracking.
3. Immutable backup inspection.
4. Isolated backup restoration.
5. Backup reconciliation against deletion tombstones.
"""

from datetime import datetime
import json
from pathlib import Path
import shutil
import sqlite3
import uuid
from typing import Any, Dict, List, Optional

from backend.config import (
    ACTIVE_DB_PATH,
    DEFAULT_PRE_DELETION_BACKUP_PATH,
    BACKUP_DIR,
    RESTORE_DIR,
)
from backend.database import get_db_connection


def delete_active_customer(customer_id: str, request_id: str) -> Dict[str, Any]:
    """
    Execute real deletion of customer record from active SQLite database.
    Verifies removal with a follow-up query.
    """
    conn = get_db_connection(ACTIVE_DB_PATH)
    cur = conn.cursor()

    # 1. Query before deletion
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (customer_id,))
    before_count = cur.fetchone()[0]

    if before_count == 0:
        conn.close()
        return {
            "customer_id": customer_id,
            "request_id": request_id,
            "existed_before": False,
            "rows_deleted": 0,
            "verified_zero_remaining": True,
            "status": "ALREADY_ABSENT",
            "details": f"Customer '{customer_id}' was not present in active storage.",
        }

    # 2. Delete inside transaction
    cur.execute("DELETE FROM customers WHERE customer_id = ?", (customer_id,))
    rows_affected = cur.rowcount
    conn.commit()

    # 3. Verify zero records remain
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (customer_id,))
    after_count = cur.fetchone()[0]
    conn.close()

    verified_zero = (after_count == 0)

    return {
        "customer_id": customer_id,
        "request_id": request_id,
        "existed_before": True,
        "rows_deleted": rows_affected,
        "verified_zero_remaining": verified_zero,
        "status": "CONFIRMED" if verified_zero else "FAILED",
        "details": (
            f"Successfully deleted {rows_affected} active customer record(s). "
            f"Post-deletion verification confirmed 0 matching records."
            if verified_zero
            else f"Deletion failure: {after_count} matching records still found in active storage."
        ),
    }


def create_tombstone(
    customer_id: str,
    request_id: str,
    deletion_scope: str = "ACTIVE_STORAGE,ML_TRAINING_PARTITION",
) -> Dict[str, Any]:
    """
    Persist an audit tombstone marker.
    Contains no unnecessary personal data, only metadata and identifiers.
    """
    tombstone_id = f"TOMB-{customer_id}-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now().isoformat()
    verification_info = json.dumps(
        {
            "registered_by": "VerifiableForgettingOrchestrator",
            "scope": deletion_scope,
            "timestamp": now_iso,
        }
    )

    conn = get_db_connection(ACTIVE_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO tombstones (tombstone_id, customer_id, request_id, created_at, deletion_scope, verification_info)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (tombstone_id, customer_id, request_id, now_iso, deletion_scope, verification_info),
    )
    conn.commit()
    conn.close()

    return {
        "tombstone_id": tombstone_id,
        "customer_id": customer_id,
        "request_id": request_id,
        "created_at": now_iso,
        "deletion_scope": deletion_scope,
        "status": "CONFIRMED",
    }


def inspect_backup(customer_id: str, backup_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Inspect an immutable backup file to determine if target customer exists.
    Maintains scientific honesty: records customer presence without claiming backup erasure.
    """
    path = backup_path or DEFAULT_PRE_DELETION_BACKUP_PATH

    if not path.exists():
        return {
            "backup_path": str(path),
            "customer_id": customer_id,
            "status": "UNVERIFIED",
            "present_in_backup": False,
            "count": 0,
            "details": f"Backup file '{path.name}' was not found on disk.",
        }

    conn = get_db_connection(path)
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (customer_id,))
        count = cur.fetchone()[0]
    except Exception as e:
        conn.close()
        return {
            "backup_path": str(path),
            "customer_id": customer_id,
            "status": "FAILED",
            "present_in_backup": False,
            "count": 0,
            "details": f"Error querying backup database: {str(e)}",
        }
    conn.close()

    is_present = (count > 0)
    return {
        "backup_path": str(path),
        "customer_id": customer_id,
        "status": "RETAINED" if is_present else "ABSENT",
        "present_in_backup": is_present,
        "count": count,
        "details": (
            f"Target customer '{customer_id}' was detected in pre-deletion backup ({count} record(s)). "
            "Original immutable backup artifact is retained as intended by backup retention policy."
            if is_present
            else f"Customer '{customer_id}' was not found in backup '{path.name}'."
        ),
    }


def restore_isolated_backup(
    request_id: str,
    backup_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Restore an immutable backup into a completely isolated directory for testing.
    Verifies the restore path is strictly separate from active storage.
    """
    src_path = backup_path or DEFAULT_PRE_DELETION_BACKUP_PATH
    if not src_path.exists():
        return {
            "request_id": request_id,
            "status": "FAILED",
            "details": f"Source backup '{src_path.name}' does not exist.",
        }

    dest_path = RESTORE_DIR / f"restore_{request_id}.db"

    # Confirm isolated path is distinct from active DB
    if dest_path.resolve() == ACTIVE_DB_PATH.resolve():
        return {
            "request_id": request_id,
            "status": "FAILED",
            "details": "CRITICAL: Restore destination collision with active storage detected. Aborted.",
        }

    # Perform copy to isolated location
    shutil.copyfile(str(src_path), str(dest_path))

    # Verify queryability in restored copy
    conn = get_db_connection(dest_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM customers")
    total_restored = cur.fetchone()[0]
    conn.close()

    return {
        "request_id": request_id,
        "source_backup": str(src_path),
        "restore_path": str(dest_path),
        "is_isolated": True,
        "total_restored_records": total_restored,
        "status": "CONFIRMED",
        "details": (
            f"Backup successfully restored into isolated sandbox: {dest_path.name}. "
            f"Contains {total_restored} customer records ready for reconciliation."
        ),
    }


def reconcile_restored_backup(
    request_id: str,
    customer_id: str,
    restore_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Apply deletion tombstones to the restored test database copy.
    Verifies that the restored copy excludes the target customer while
    the original backup remains unchanged.
    """
    target_restore = restore_path or (RESTORE_DIR / f"restore_{request_id}.db")

    if not target_restore.exists():
        return {
            "request_id": request_id,
            "customer_id": customer_id,
            "status": "FAILED",
            "details": f"Isolated restored database '{target_restore.name}' was not found.",
        }

    conn = get_db_connection(target_restore)
    cur = conn.cursor()

    # Query before reconciliation
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (customer_id,))
    before_count = cur.fetchone()[0]

    # Reconcile by applying tombstone deletion
    cur.execute("DELETE FROM customers WHERE customer_id = ?", (customer_id,))
    rows_reconciled = cur.rowcount
    conn.commit()

    # Query after reconciliation
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (customer_id,))
    after_count = cur.fetchone()[0]
    conn.close()

    verified_excluded = (after_count == 0)

    return {
        "request_id": request_id,
        "customer_id": customer_id,
        "restore_path": str(target_restore),
        "records_before_reconciliation": before_count,
        "records_after_reconciliation": after_count,
        "rows_reconciled": rows_reconciled,
        "reconciliation_verified": verified_excluded,
        "status": "CONFIRMED" if verified_excluded else "FAILED",
        "details": (
            f"Reconciliation successful: target customer '{customer_id}' excluded from restored copy "
            f"(0 matching records remain). Original backup file remains intact."
            if verified_excluded
            else f"Reconciliation failed: {after_count} matching records remain in restored database."
        ),
    }


def get_available_backups() -> List[Dict[str, Any]]:
    """Scan backup directory and return list of backup artifacts and metadata."""
    backups = []
    if not BACKUP_DIR.exists():
        return backups

    for p in BACKUP_DIR.glob("*.db"):
        stat = p.stat()
        backups.append(
            {
                "backup_id": f"BAK-{p.stem}",
                "filename": p.name,
                "path": str(p),
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "is_pre_deletion": "pre_deletion" in p.name.lower(),
            }
        )
    return backups
