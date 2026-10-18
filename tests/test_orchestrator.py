"""
Unit tests for the central orchestrator in backend/orchestrator.py.
Verifies the 12-stage workflow coordination, idempotency, evidence persistence,
and receipt assembly.
"""

import pytest

from backend.database import init_database, get_db_connection
from backend.orchestrator import (
    create_and_run_deletion_request,
    WORKFLOW_STAGE_NAMES,
)


@pytest.fixture(autouse=True)
def setup_db():
    init_database(reseed=True)


def test_orchestrator_full_workflow_execution():
    """Verify orchestrator runs all 12 stages, records evidence, and produces a receipt."""
    target_id = "C0420"
    req = create_and_run_deletion_request(
        customer_id=target_id,
        model_type="neural_network",
        random_seed=42,
    )

    req_id = req["request_id"]
    assert req_id.startswith("REQ-C0420-")
    assert req["status"] == "CONFIRMED"

    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Verify 12 workflow stages
    cur.execute(
        "SELECT stage_name, status FROM workflow_stages WHERE request_id = ? ORDER BY stage_order ASC",
        (req_id,),
    )
    stages = cur.fetchall()
    assert len(stages) == len(WORKFLOW_STAGE_NAMES)
    for s in stages:
        assert s["status"] in ("CONFIRMED", "RETAINED", "SKIPPED")

    # 2. Verify evidence persistence
    cur.execute("SELECT COUNT(*) FROM evidence WHERE request_id = ?", (req_id,))
    ev_count = cur.fetchone()[0]
    assert ev_count >= 5

    # 3. Verify receipt generation
    cur.execute("SELECT * FROM receipts WHERE request_id = ?", (req_id,))
    rcpt = cur.fetchone()
    assert rcpt is not None
    assert rcpt["overall_status"] == "CONFIRMED"
    assert rcpt["customer_id"] == target_id
    assert "unlearning" in rcpt["warnings_and_limitations"].lower()

    conn.close()


def test_orchestrator_idempotency():
    """Verify duplicate submission with same idempotency key returns existing request."""
    idemp_key = "IDEMP-TEST-KEY-999"
    res1 = create_and_run_deletion_request(
        customer_id="C0050",
        idempotency_key=idemp_key,
    )
    res2 = create_and_run_deletion_request(
        customer_id="C0050",
        idempotency_key=idemp_key,
    )

    assert res1["request_id"] == res2["request_id"]


def test_orchestrator_batch_association():
    """Verify batch_id is preserved and distinct request IDs are generated."""
    batch_id = "BATCH-UNIT-TEST-01"
    res1 = create_and_run_deletion_request(
        customer_id="C0001",
        batch_id=batch_id,
    )
    res2 = create_and_run_deletion_request(
        customer_id="C0800",
        batch_id=batch_id,
    )

    assert res1["request_id"] != res2["request_id"]
    assert res1["batch_id"] == batch_id
    assert res2["batch_id"] == batch_id
