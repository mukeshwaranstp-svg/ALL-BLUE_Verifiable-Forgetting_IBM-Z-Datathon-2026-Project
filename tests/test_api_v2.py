"""
Comprehensive endpoint integration tests for FastAPI backend in backend/main.py.
Verifies all capabilities required by the React frontend contract.
"""

from fastapi.testclient import TestClient
import pytest

from backend.main import app
from backend.database import init_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_database(reseed=True)


def test_dashboard_endpoint():
    """Verify GET /api/dashboard returns expected summary statistics."""
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["total_customers"] >= 800
    assert data["active_customers"] >= 800
    assert "total_requests" in data
    assert "backups_count" in data
    assert data["baseline_model_status"] == "TRAINED_ACTIVE"


def test_customers_list_and_pagination():
    """Verify GET /api/customers supports pagination and search."""
    res = client.get("/api/customers?page=1&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["page"] == 1
    assert data["limit"] == 10
    assert len(data["items"]) == 10
    assert data["total"] >= 1000

    # Test search filter
    search_res = client.get("/api/customers?search=C0420")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert any(c["customer_id"] == "C0420" for c in search_data["items"])


def test_get_single_customer():
    """Verify GET /api/customers/{id} returns customer details or 404."""
    res = client.get("/api/customers/C0420")
    assert res.status_code == 200
    data = res.json()
    assert data["customer_id"] == "C0420"
    assert "account_balance" in data

    # Missing customer 404
    missing_res = client.get("/api/customers/NON_EXISTENT_999")
    assert missing_res.status_code == 404


def test_create_deletion_request_and_stages():
    """Verify POST /api/requests triggers orchestrator, stages, and evidence."""
    payload = {
        "customer_id": "C0420",
        "model_type": "neural_network",
        "random_seed": 42,
    }
    res = client.post("/api/requests", json=payload)
    assert res.status_code == 201
    data = res.json()
    req_id = data["request_id"]
    assert req_id.startswith("REQ-C0420-")
    assert data["status"] == "CONFIRMED"

    # Verify stages endpoint
    stages_res = client.get(f"/api/requests/{req_id}/stages")
    assert stages_res.status_code == 200
    stages = stages_res.json()
    assert len(stages) == 12

    # Verify progress polling endpoint
    progress_res = client.get(f"/api/requests/{req_id}/progress")
    assert progress_res.status_code == 200
    prog = progress_res.json()
    assert prog["progress_percentage"] == 100.0
    assert prog["completed_stages_count"] == 12

    # Verify storage evidence endpoint
    storage_res = client.get(f"/api/requests/{req_id}/storage-evidence")
    assert storage_res.status_code == 200
    storage_data = storage_res.json()
    assert storage_data["active_storage_deleted"] is True
    assert storage_data["tombstone_created"] is True
    assert "backup_inspection" in storage_data

    # Verify model evidence endpoint
    model_res = client.get(f"/api/requests/{req_id}/model-evidence")
    assert model_res.status_code == 200
    model_data = model_res.json()
    assert "baseline_metrics" in model_data
    assert "retrained_metrics" in model_data
    assert "metric_deltas" in model_data

    # Verify verification checks endpoint
    verif_res = client.get(f"/api/requests/{req_id}/verification")
    assert verif_res.status_code == 200
    verif_data = verif_res.json()
    assert verif_data["overall_status"] == "CONFIRMED"
    assert len(verif_data["checks"]) >= 6

    # Verify raw evidence endpoint
    ev_res = client.get(f"/api/requests/{req_id}/evidence")
    assert ev_res.status_code == 200
    ev_list = ev_res.json()
    assert len(ev_list) >= 4

    # Verify receipt endpoint
    rcpt_res = client.get(f"/api/requests/{req_id}/receipt")
    assert rcpt_res.status_code == 200
    rcpt_data = rcpt_res.json()
    assert rcpt_data["overall_status"] == "CONFIRMED"
    assert len(rcpt_data["stage_outcomes"]) == 12


def test_bulk_deletion_endpoint():
    """Verify POST /api/requests/bulk accepts multiple IDs and deduplicates."""
    payload = {
        "customer_ids": ["C0104", "C0050", "C0104"],  # Contains duplicate C0104
        "model_type": "decision_tree",
        "random_seed": 42,
    }
    res = client.post("/api/requests/bulk", json=payload)
    assert res.status_code == 202
    data = res.json()
    assert data["total_requested"] == 3
    assert data["accepted_count"] == 2
    assert data["rejected_count"] == 1
    assert len(data["accepted_requests"]) == 2
    assert data["rejected_entries"][0]["customer_id"] == "C0104"


def test_list_backups_endpoint():
    """Verify GET /api/storage/backups returns available snapshot files."""
    res = client.get("/api/storage/backups")
    assert res.status_code == 200
    backups = res.json()
    assert len(backups) >= 1
    assert backups[0]["filename"].endswith(".db")


def test_list_receipts_endpoint():
    """Verify GET /api/receipts returns list of generated receipts."""
    # Create request first to generate receipt
    client.post("/api/requests", json={"customer_id": "C0001", "model_type": "decision_tree"})
    res = client.get("/api/receipts")
    assert res.status_code == 200
    receipts = res.json()
    assert len(receipts) >= 1
    assert "receipt_id" in receipts[0]
