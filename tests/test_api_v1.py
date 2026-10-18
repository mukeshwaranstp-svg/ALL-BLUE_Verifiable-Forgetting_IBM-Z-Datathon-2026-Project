"""
Unit and integration tests for Google AI Studio API v1 endpoints in backend/main.py.
Verifies contracts with React + TypeScript frontend.
"""

from fastapi.testclient import TestClient
import pytest

from backend.main import app
from backend.database import init_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_database(reseed=True)


def test_v1_health_and_root_health():
    """Verify both /health and /api/v1/health return expected status and bulk flag."""
    for path in ["/health", "/api/v1/health"]:
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["bulkSubmissionSupported"] is True
        assert "enclaveTarget" in data


def test_v1_customers():
    """Verify /api/v1/customers returns list of Customer objects with expected fields."""
    res = client.get("/api/v1/customers")
    assert res.status_code == 200
    customers = res.json()
    assert isinstance(customers, list)
    assert len(customers) >= 10

    c0420 = next((c for c in customers if c["id"] == "C0420"), None)
    assert c0420 is not None
    assert "email" in c0420
    assert "accountType" in c0420
    assert "dataLocations" in c0420
    assert c0420["eligibleForUnlearning"] is True


def test_v1_dashboard_summary():
    """Verify /api/v1/dashboard/summary returns aggregated counts."""
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "inProgress" in data
    assert "confirmed" in data
    assert "failed" in data


def test_v1_single_deletion_and_retrieval():
    """Verify POST /api/v1/deletions and GET /api/v1/deletions/:id."""
    res = client.post("/api/v1/deletions", json={"customerId": "C0420"})
    assert res.status_code == 200
    data = res.json()
    req_id = data["id"]
    assert data["customerId"] == "C0420"
    assert data["status"] == "CONFIRMED"
    assert data["databasePurgeStatus"] == "PURGED"
    assert len(data["stages"]) == 8

    # Retrieve single
    get_res = client.get(f"/api/v1/deletions/{req_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == req_id


def test_v1_bulk_deletion():
    """Verify POST /api/v1/deletions/bulk."""
    res = client.post("/api/v1/deletions/bulk", json={"customerIds": ["C0420", "C0104", "CUST-44109"]})
    assert res.status_code == 200
    data = res.json()
    assert len(data["accepted"]) >= 2
    assert any(r["customerId"] == "C0420" for r in data["accepted"])
    # CUST-44109 is on legal hold
    assert any(rej["customerId"] == "CUST-44109" for rej in data["rejected"])


def test_v1_verify_and_evidence():
    """Verify POST /api/v1/deletions/:id/verify and GET /api/v1/deletions/:id/evidence."""
    create_res = client.post("/api/v1/deletions", json={"customerId": "C0420"})
    req_id = create_res.json()["id"]

    for path in [f"/api/v1/deletions/{req_id}/verify", f"/api/v1/deletions/{req_id}/evidence"]:
        method = client.post if "verify" in path else client.get
        res = method(path)
        assert res.status_code == 200
        ev = res.json()
        assert ev["requestId"] == req_id
        assert ev["storage"]["activeDbPurged"] == "CONFIRMED"
        assert ev["ml"]["exclusionOperationStatus"] == "CONFIRMED"
        assert len(ev["timeline"]) >= 8


def test_v1_models_and_experiments():
    """Verify /api/v1/models and /api/v1/experiments."""
    models_res = client.get("/api/v1/models")
    assert models_res.status_code == 200
    models = models_res.json()
    assert len(models) >= 2
    mlp = next((m for m in models if m["isNeuralNetwork"]), None)
    assert mlp is not None
    assert mlp["layerSizes"] == [4, 8, 4, 1]

    exp_res = client.get("/api/v1/experiments")
    assert exp_res.status_code == 200
    exps = exp_res.json()
    assert len(exps) >= 1


def test_v1_receipts():
    """Verify /api/v1/receipts and /api/v1/receipts/:id."""
    # Create request to generate receipt
    create_res = client.post("/api/v1/deletions", json={"customerId": "C0420"})
    req_id = create_res.json()["id"]

    list_res = client.get("/api/v1/receipts")
    assert list_res.status_code == 200
    receipts = list_res.json()
    assert len(receipts) >= 1
    rcpt_id = receipts[0]["receiptId"]

    single_res = client.get(f"/api/v1/receipts/{rcpt_id}")
    assert single_res.status_code == 200
    assert single_res.json()["receiptId"] == rcpt_id
