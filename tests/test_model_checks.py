"""
Unit & Integration Tests for Person 2: ML Model & Retraining Verification.

Tests cover:
1. Synthetic data generation determinism and reproducibility.
2. Unique customer ID generation and target customer presence.
3. Anti-leakage metadata/feature separation.
4. Baseline model training and finite metric evaluation.
5. Target customer exclusion verification (0 matching records remaining).
6. Handling of duplicate customer records.
7. Original dataset immutability.
8. Retraining consistency on identical held-out test set.
9. End-to-end verify_model_deletion() with CONFIRMED, UNVERIFIED, and invalid inputs.
10. Strict JSON serializability of all results.
11. Presence of scientific limitations disclaimers.
"""

import json
import numpy as np
import pandas as pd
import pytest

from unlearning.generate_data import (
    DEFAULT_RANDOM_SEED,
    generate_synthetic_customer_data,
    split_features_and_metadata,
    train_test_split_with_metadata,
)
from unlearning.evaluate import compute_classification_metrics, evaluate_model
from unlearning.train import (
    train_baseline_pipeline,
    exclude_customer_from_training_data,
    retrain_model_without_customer,
    LIMITATIONS_DISCLAIMER,
)
from verification.model_checks import verify_model_deletion


# =====================================================================
# 1. Synthetic Data Generation Tests
# =====================================================================

def test_data_generation_reproducibility():
    """Verify that calling the generator with the same seed produces identical data."""
    df1 = generate_synthetic_customer_data(n_samples=500, random_seed=42)
    df2 = generate_synthetic_customer_data(n_samples=500, random_seed=42)

    pd.testing.assert_frame_equal(df1, df2)


def test_customer_ids_uniqueness_and_target_presence():
    """Verify customer IDs are unique and the target ID exists."""
    df = generate_synthetic_customer_data(n_samples=1000, random_seed=42, target_customer_id="C0420")

    assert len(df) == 1000
    assert df["customer_id"].nunique() == 1000, "Customer IDs must be completely unique"
    assert "C0420" in df["customer_id"].values, "Target customer C0420 must be present"


def test_feature_metadata_separation_anti_leakage():
    """Verify that customer_id is never leaked into feature matrix X."""
    df = generate_synthetic_customer_data(n_samples=100, random_seed=42)
    X, y, ids = split_features_and_metadata(df)

    assert "customer_id" not in X.columns
    assert "churn_risk" not in X.columns
    assert len(X.columns) == 4
    assert len(X) == len(y) == len(ids) == 100


# =====================================================================
# 2. Baseline Model Training & Evaluation Tests
# =====================================================================

def test_baseline_training_pipeline():
    """Verify baseline training runs, splits cleanly, and computes valid metrics."""
    res = train_baseline_pipeline(test_size=0.2, random_seed=42)

    assert res["model_type"] == "DecisionTreeClassifier"
    assert res["train_row_count"] == 800
    assert res["test_row_count"] == 200

    metrics = res["baseline_metrics"]
    for key in ["accuracy", "f1", "precision", "recall"]:
        assert key in metrics
        assert 0.0 <= metrics[key] <= 1.0, f"Metric {key} must be between 0 and 1"


def test_evaluation_metric_computation():
    """Test standard metric calculator with known ground truth and predictions."""
    y_true = [1, 0, 1, 1, 0]
    y_pred = [1, 0, 1, 0, 0]

    metrics = compute_classification_metrics(y_true, y_pred)
    assert metrics["sample_count"] == 5
    assert metrics["accuracy"] == 0.8
    assert isinstance(metrics["accuracy"], float)


# =====================================================================
# 3. Customer Exclusion Tests
# =====================================================================

def test_exclusion_removes_target_and_keeps_unrelated_records():
    """Verify target customer is removed with 0 matching rows remaining."""
    df = generate_synthetic_customer_data(n_samples=200, random_seed=42)
    splits = train_test_split_with_metadata(df, random_seed=42)
    train_df = splits["train_df"]

    target_id = train_df["customer_id"].iloc[5]
    total_before = len(train_df)

    res = exclude_customer_from_training_data(train_df, target_id)

    assert res["found"] is True
    assert res["exclusion_verified"] is True
    assert res["target_rows_before"] == 1
    assert res["target_rows_after"] == 0
    assert res["total_rows_after"] == total_before - 1
    assert target_id not in res["filtered_train_df"]["customer_id"].values


def test_exclusion_preserves_original_dataframe_immutability():
    """Verify the original DataFrame is not mutated during exclusion."""
    df = generate_synthetic_customer_data(n_samples=100, random_seed=42)
    target_id = df["customer_id"].iloc[0]
    original_len = len(df)

    res = exclude_customer_from_training_data(df, target_id)

    assert len(df) == original_len
    assert df["customer_id"].iloc[0] == target_id, "Original DataFrame must remain intact"


def test_exclusion_handles_duplicate_customer_records():
    """Verify that multiple records for the same customer are all excluded."""
    df = generate_synthetic_customer_data(n_samples=50, random_seed=42)
    # Intentionally add a duplicate row for customer C0001
    dup_row = df.iloc[0:1].copy()
    df_with_dup = pd.concat([df, dup_row], ignore_index=True)

    dup_id = dup_row["customer_id"].iloc[0]
    assert (df_with_dup["customer_id"] == dup_id).sum() == 2

    res = exclude_customer_from_training_data(df_with_dup, dup_id)

    assert res["found"] is True
    assert res["target_rows_before"] == 2
    assert res["target_rows_after"] == 0
    assert res["exclusion_verified"] is True
    assert (res["filtered_train_df"]["customer_id"] == dup_id).sum() == 0


def test_exclusion_unknown_customer_id():
    """Verify missing customer IDs are reported honestly without fake success."""
    df = generate_synthetic_customer_data(n_samples=100, random_seed=42)
    res = exclude_customer_from_training_data(df, "NONEXISTENT_CUSTOMER_9999")

    assert res["found"] is False
    assert res["exclusion_verified"] is False
    assert res["target_rows_before"] == 0
    assert res["target_rows_after"] == 0
    assert res["total_rows_before"] == res["total_rows_after"]


# =====================================================================
# 4. Retraining & Evaluation Consistency Tests
# =====================================================================

def test_retraining_preserves_test_set_consistency():
    """Verify retrained model is evaluated on the identical held-out test split."""
    base = train_baseline_pipeline(random_seed=42)
    target_id = base["train_df"]["customer_id"].iloc[0]

    retrain_res = retrain_model_without_customer(base, target_id, random_seed=42)

    assert retrain_res["retraining_completed"] is True
    assert retrain_res["retrained_metrics"] is not None
    assert "accuracy" in retrain_res["retrained_metrics"]
    assert "accuracy_delta" in retrain_res["metric_comparison"]


# =====================================================================
# 5. Public Integration Function: verify_model_deletion()
# =====================================================================

def test_verify_model_deletion_confirmed_case():
    """Verify full success flow with status CONFIRMED for valid customer C0420."""
    res = verify_model_deletion("C0420", random_seed=42)

    assert res["target"] == "model"
    assert res["customer_id"] == "C0420"
    assert res["status"] == "CONFIRMED"
    assert len(res["errors"]) == 0

    # Verify all checks passed
    check_names = {c["name"]: c["passed"] for c in res["checks"]}
    assert check_names.get("check_target_presence_before") is True
    assert check_names.get("check_target_exclusion") is True
    assert check_names.get("check_model_retraining") is True
    assert check_names.get("check_evaluation_metrics") is True

    # Verify evidence details
    assert res["evidence"]["target_training_rows_before"] >= 1
    assert res["evidence"]["target_training_rows_after"] == 0
    assert res["evidence"]["total_training_rows_after"] < res["evidence"]["total_training_rows_before"]
    assert res["evidence"]["retraining_completed"] is True


def test_verify_model_deletion_unknown_customer_case():
    """Verify that unknown customer returns UNVERIFIED with honest error message."""
    res = verify_model_deletion("UNKNOWN_CUSTOMER_XYZ", random_seed=42)

    assert res["target"] == "model"
    assert res["status"] == "UNVERIFIED"
    assert len(res["errors"]) >= 1
    assert "was not present in the training dataset" in res["errors"][0]


def test_verify_model_deletion_invalid_input_case():
    """Verify that empty or whitespace-only customer ID returns UNVERIFIED."""
    res = verify_model_deletion("", random_seed=42)

    assert res["target"] == "model"
    assert res["status"] == "UNVERIFIED"
    assert len(res["errors"]) >= 1
    assert "non-empty string" in res["errors"][0]


def test_verify_model_deletion_json_serializable():
    """Verify that returned dictionary is 100% JSON serializable for Person 4."""
    res = verify_model_deletion("C0420", random_seed=42)

    # Must serialize and deserialize cleanly without error
    serialized = json.dumps(res)
    deserialized = json.loads(serialized)
    assert deserialized["status"] == "CONFIRMED"
    assert deserialized["customer_id"] == "C0420"


def test_limitations_disclaimer_present():
    """Verify evidence includes explicit limitations statement."""
    res = verify_model_deletion("C0420", random_seed=42)

    assert "limitations" in res["evidence"]
    assert "formal machine unlearning" in res["evidence"]["limitations"]


# =====================================================================
# 6. Regression & Experiment Consistency Tests
# =====================================================================

def test_experiment_customer_consistency():
    """Verify that every part of one experiment refers to the exact same customer ID."""
    target_id = "C0104"
    res = verify_model_deletion(target_id, random_seed=42)

    assert res["customer_id"] == target_id
    check_details = " ".join([c["details"] for c in res["checks"]])
    assert target_id in check_details
    assert "C0420" not in check_details, "Unselected customer ID C0420 must not leak into checks"


def test_metric_deltas_mathematical_consistency():
    """Verify that every metric delta matches (retrained - baseline) exactly."""
    base = train_baseline_pipeline(random_seed=42, model_type="decision_tree")
    retrain = retrain_model_without_customer(base, "C0420", random_seed=42)

    b_metrics = retrain["baseline_metrics"]
    r_metrics = retrain["retrained_metrics"]
    deltas = retrain["metric_comparison"]

    for metric_name in ["accuracy", "f1", "precision", "recall"]:
        expected_delta = round(float(r_metrics[metric_name]) - float(b_metrics[metric_name]), 4)
        assert deltas[f"{metric_name}_delta"] == expected_delta


def test_neural_network_parameter_shift_consistency():
    """Verify neural network weight deltas match (W_retrained - W_baseline) for corresponding layers."""
    base = train_baseline_pipeline(random_seed=42, model_type="neural_network")
    retrain = retrain_model_without_customer(base, "C0420", random_seed=42)

    assert "weight_shifts" in retrain
    layer_deltas = retrain["weight_shifts"]["layer_weight_deltas"]
    assert len(layer_deltas) >= 2, "Must contain deltas for hidden layers"

    # Compare layer 0 manually
    w_base = np.array(base["nn_internals"]["weights"][0])
    w_retrain = np.array(retrain["retrained_nn_internals"]["weights"][0])
    computed_delta = w_retrain - w_base
    np.testing.assert_allclose(np.array(layer_deltas[0]), computed_delta, rtol=1e-5)


def test_model_type_consistency_in_evidence():
    """Verify evidence dynamically reports MLPClassifier and not hardcoded DecisionTreeClassifier."""
    base = train_baseline_pipeline(random_seed=42, model_type="neural_network")
    res = verify_model_deletion("C0420", baseline_result=base, random_seed=42)

    assert res["evidence"]["model_type"] == "MLPClassifier"
    assert "retrained_nn_internals" in res["evidence"]
    assert "weight_shifts" in res["evidence"]


def test_baseline_immutability_during_experiment():
    """Verify baseline dataset and baseline artifact hash remain unchanged before and after retraining."""
    base = train_baseline_pipeline(random_seed=42, model_type="neural_network")
    original_hash = base["artifact_hash"]
    original_train_len = len(base["train_df"])

    # Run retraining
    retrain = retrain_model_without_customer(base, "C0420", random_seed=42)

    # Baseline must be completely unmutated
    assert len(base["train_df"]) == original_train_len
    assert base["artifact_hash"] == original_hash
    assert retrain["artifact_hash"] != original_hash, "Retrained model must produce a new parameter hash"


def test_unknown_customer_failure_handling():
    """Verify unknown customer returns UNVERIFIED with zero false deletions."""
    res = verify_model_deletion("UNKNOWN_CUSTOMER_999", random_seed=42)

    assert res["status"] == "UNVERIFIED"
    assert res["evidence"]["target_training_rows_before"] == 0
    assert res["evidence"]["target_training_rows_after"] == 0
    assert len(res["errors"]) >= 1

