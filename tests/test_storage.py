"""
Unit tests for storage and backup service in backend/storage_service.py.
Verifies active database deletion, tombstones, backup inspection,
isolated restore, and reconciliation.
"""

from pathlib import Path
import pytest

from backend.config import ACTIVE_DB_PATH, DEFAULT_PRE_DELETION_BACKUP_PATH
from backend.database import init_database, get_db_connection
from backend.storage_service import (
    delete_active_customer,
    create_tombstone,
    inspect_backup,
    restore_isolated_backup,
    reconcile_restored_backup,
    get_available_backups,
)


@pytest.fixture(autouse=True)
def setup_db():
    """Ensure database is reseeded with fresh records before each test."""
    init_database(reseed=True)


def test_delete_active_customer_real_removal():
    """Verify delete_active_customer removes record and verifies zero remaining."""
    target_id = "C0104"

    # Confirm present before
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (target_id,))
    count_before = cur.fetchone()[0]
    conn.close()
    assert count_before == 1

    # Execute deletion
    result = delete_active_customer(customer_id=target_id, request_id="REQ-TEST-01")
    assert result["verified_zero_remaining"] is True
    assert result["rows_deleted"] == 1
    assert result["status"] == "CONFIRMED"

    # Confirm absent after
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM customers WHERE customer_id = ?", (target_id,))
    count_after = cur.fetchone()[0]
    conn.close()
    assert count_after == 0


def test_delete_active_customer_idempotency_already_absent():
    """Verify deleting a non-existent customer returns safe status without error."""
    result = delete_active_customer(customer_id="NON_EXISTENT_ID", request_id="REQ-TEST-02")
    assert result["existed_before"] is False
    assert result["rows_deleted"] == 0
    assert result["verified_zero_remaining"] is True
    assert result["status"] == "ALREADY_ABSENT"


def test_create_tombstone():
    """Verify create_tombstone inserts a tombstone marker into SQLite."""
    tomb = create_tombstone(customer_id="C0420", request_id="REQ-TEST-03")
    assert tomb["customer_id"] == "C0420"
    assert tomb["tombstone_id"].startswith("TOMB-C0420-")
    assert tomb["status"] == "CONFIRMED"

    # Check persistence in database
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM tombstones WHERE tombstone_id = ?", (tomb["tombstone_id"],))
    row = cur.fetchone()
    conn.close()
    assert row is not None
    assert row["customer_id"] == "C0420"


def test_inspect_backup_presence_and_retention():
    """Verify backup inspection finds target customer in pre-deletion backup without altering it."""
    res = inspect_backup(customer_id="C0420")
    assert res["present_in_backup"] is True
    assert res["count"] >= 1
    assert res["status"] == "RETAINED"
    assert "Original immutable backup artifact is retained" in res["details"]


def test_inspect_backup_missing_file():
    """Verify inspect_backup handles missing backup file cleanly."""
    res = inspect_backup(customer_id="C0420", backup_path=Path("non_existent_backup.db"))
    assert res["status"] == "UNVERIFIED"
    assert res["present_in_backup"] is False


def test_restore_isolated_backup_sandbox_separation():
    """Verify isolated restore creates a test copy without touching active storage."""
    req_id = "REQ-RESTORE-TEST-01"
    restore_res = restore_isolated_backup(request_id=req_id)
    assert restore_res["status"] == "CONFIRMED"
    assert restore_res["is_isolated"] is True
    assert Path(restore_res["restore_path"]).exists()
    assert Path(restore_res["restore_path"]).resolve() != ACTIVE_DB_PATH.resolve()
    assert restore_res["total_restored_records"] >= 800


def test_reconcile_restored_backup_excludes_target():
    """Verify backup reconciliation excludes target customer from test copy while original remains."""
    req_id = "REQ-RECONCILE-TEST-01"
    target_id = "C0420"

    # 1. Restore isolated backup
    restore_res = restore_isolated_backup(request_id=req_id)
    assert restore_res["status"] == "CONFIRMED"

    # 2. Reconcile
    rec_res = reconcile_restored_backup(request_id=req_id, customer_id=target_id)
    assert rec_res["status"] == "CONFIRMED"
    assert rec_res["reconciliation_verified"] is True
    assert rec_res["records_after_reconciliation"] == 0

    # 3. Confirm original backup was NOT modified
    inspect_orig = inspect_backup(customer_id=target_id)
    assert inspect_orig["present_in_backup"] is True


def test_get_available_backups():
    """Verify get_available_backups scans directory and returns metadata."""
    backups = get_available_backups()
    assert len(backups) >= 1
    assert any(b["is_pre_deletion"] for b in backups)
    assert backups[0]["size_bytes"] > 0
