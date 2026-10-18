"""
Unit tests for FastAPI backend in backend/main.py.
"""

from fastapi.testclient import TestClient
import pytest
from backend.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify healthcheck endpoint returns status healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_get_dataset_overview_endpoint():
    """Verify dataset endpoint returns correct schema and row counts."""
    response = client.get("/api/dataset")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 1000
    assert data["train_records"] == 800
    assert data["test_records"] == 200
    assert "churn_risk" == data["target"]
    assert "C0420" in data["available_customers"]
    assert len(data["preview_rows"]) == 10


def test_get_baseline_model_endpoint():
    """Verify baseline model endpoint returns metrics and loss history."""
    response = client.get("/api/baseline?model_type=neural_network")
    assert response.status_code == 200
    data = response.json()
    assert data["model_type"] == "MLPClassifier"
    assert "metrics" in data
    assert 0.0 <= data["metrics"]["accuracy"] <= 1.0
    assert "neural_network" in data
    assert len(data["neural_network"]["loss_curve"]) > 10


def test_experiment_endpoint_confirmed():
    """Verify customer deletion experiment returns CONFIRMED for C0420."""
    payload = {
        "customer_id": "C0420",
        "model_type": "neural_network",
        "random_seed": 42,
    }
    response = client.post("/api/experiment/exclude-and-retrain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CONFIRMED"
    assert data["customer_id"] == "C0420"
    assert data["record_counts"]["target_rows_before"] >= 1
    assert data["record_counts"]["target_rows_after"] == 0
    assert len(data["checks"]) == 4
    assert "neural_network_internals" in data
    assert "layer_weight_deltas" in data["neural_network_internals"]


def test_experiment_endpoint_unknown_customer():
    """Verify customer deletion experiment returns UNVERIFIED for unknown ID."""
    payload = {
        "customer_id": "UNKNOWN_9999",
        "model_type": "neural_network",
        "random_seed": 42,
    }
    response = client.post("/api/experiment/exclude-and-retrain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UNVERIFIED"
    assert data["record_counts"]["target_rows_before"] == 0
    assert data["record_counts"]["target_rows_after"] == 0
    assert len(data["errors"]) >= 1
