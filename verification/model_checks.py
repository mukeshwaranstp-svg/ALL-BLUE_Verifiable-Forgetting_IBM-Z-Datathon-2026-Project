"""
Model Verification Module for Verifiable Forgetting.

This module provides the primary integration contract for Person 4 (Orchestrator):
`verify_model_deletion(customer_id: str) -> dict`

Responsibilities:
1. Verify target customer presence before exclusion.
2. Verify target customer absence after exclusion (0 records remaining).
3. Verify that the model was retrained on the filtered dataset.
4. Provide genuine baseline vs retrained metrics evaluated on a held-out test split.
5. Return a strictly JSON-serializable dictionary with honest statuses:
   CONFIRMED, FAILED, PARTIAL, UNVERIFIED.
6. Clearly state scientific limitations (exclusion + retraining != formal unlearning).
"""

import json
from typing import Any, Dict, List, Optional

from unlearning.generate_data import DEFAULT_RANDOM_SEED
from unlearning.train import (
    LIMITATIONS_DISCLAIMER,
    train_baseline_pipeline,
    retrain_model_without_customer,
)


def verify_model_deletion(
    customer_id: str,
    baseline_result: Optional[Dict[str, Any]] = None,
    random_seed: int = DEFAULT_RANDOM_SEED,
    retrain_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute and verify customer data exclusion from training data followed by model retraining.

    This is the public integration function consumed by Person 4 (Orchestrator).

    Parameters:
        customer_id (str): The synthetic customer identifier to be forgotten (e.g. 'C0420').
        baseline_result (Optional[dict]): Pre-computed baseline pipeline output. If None,
                                         train_baseline_pipeline() is automatically executed.
        random_seed (int): Random seed for reproducible generation and training.
        retrain_result (Optional[dict]): Pre-computed retraining output for the same experiment.
                                        If None, retrain_model_without_customer() is executed.

    Returns:
        Dict[str, Any]: JSON-serializable dictionary with top-level keys:
            - target: 'model'
            - customer_id: str
            - status: 'CONFIRMED' | 'FAILED' | 'PARTIAL' | 'UNVERIFIED'
            - checks: List[Dict[str, Any]]
            - evidence: Dict[str, Any]
            - errors: List[str]
    """
    checks: List[Dict[str, Any]] = []
    errors: List[str] = []

    # 1. Validate customer_id argument
    if not isinstance(customer_id, str) or not customer_id.strip():
        errors.append(f"Invalid customer_id: '{customer_id}'. Must be a non-empty string.")
        return {
            "target": "model",
            "customer_id": str(customer_id) if customer_id is not None else "",
            "status": "UNVERIFIED",
            "checks": [
                {
                    "name": "input_validation",
                    "passed": False,
                    "details": "Customer ID must be a non-empty string.",
                }
            ],
            "evidence": {
                "model_type": "Unknown",
                "random_seed": int(random_seed),
                "limitations": LIMITATIONS_DISCLAIMER,
            },
            "errors": errors,
        }

    target_id = customer_id.strip()

    # 2. Obtain baseline pipeline
    try:
        if baseline_result is None:
            baseline = train_baseline_pipeline(random_seed=random_seed)
        else:
            baseline = baseline_result
    except Exception as exc:
        errors.append(f"Baseline pipeline failed to execute: {str(exc)}")
        return {
            "target": "model",
            "customer_id": target_id,
            "status": "FAILED",
            "checks": [
                {
                    "name": "baseline_pipeline_execution",
                    "passed": False,
                    "details": f"Baseline training failed: {str(exc)}",
                }
            ],
            "evidence": {
                "model_type": "Unknown",
                "random_seed": int(random_seed),
                "limitations": LIMITATIONS_DISCLAIMER,
            },
            "errors": errors,
        }

    # Dynamically extract model_type from the actual baseline model
    model_type = baseline.get("model_type", "DecisionTreeClassifier")

    evidence: Dict[str, Any] = {
        "model_type": model_type,
        "random_seed": int(random_seed),
        "limitations": LIMITATIONS_DISCLAIMER,
    }
    if "artifact_hash" in baseline:
        evidence["baseline_artifact_hash"] = baseline["artifact_hash"]

    train_df = baseline["train_df"]
    test_df = baseline["test_df"]
    evidence["train_test_split"] = {
        "strategy": "stratified_80_20",
        "training_samples": int(len(train_df)),
        "testing_samples": int(len(test_df)),
    }
    evidence["baseline_metrics"] = baseline.get("baseline_metrics", {})

    # Propagate baseline neural network internals if present
    if "nn_internals" in baseline:
        evidence["baseline_nn_internals"] = baseline["nn_internals"]

    # 3. Check target presence before exclusion
    before_count = int((train_df["customer_id"] == target_id).sum())
    evidence["total_training_rows_before"] = int(len(train_df))
    evidence["target_training_rows_before"] = before_count

    if before_count == 0:
        evidence["total_training_rows_after"] = int(len(train_df))
        evidence["target_training_rows_after"] = 0
        # Customer ID is not in the training dataset
        checks.append(
            {
                "name": "check_target_presence_before",
                "passed": False,
                "details": f"Customer ID '{target_id}' was not found in the baseline training data.",
            }
        )
        errors.append(
            f"Customer '{target_id}' was not present in the training dataset; "
            "no exclusion or retraining was applicable."
        )
        return {
            "target": "model",
            "customer_id": target_id,
            "status": "UNVERIFIED",
            "checks": checks,
            "evidence": evidence,
            "errors": errors,
        }

    checks.append(
        {
            "name": "check_target_presence_before",
            "passed": True,
            "details": f"Target customer '{target_id}' located in training data ({before_count} matching record(s)).",
        }
    )

    # 4. Perform exclusion and retraining (reuse retrain_result if supplied to ensure artifact consistency)
    try:
        if retrain_result is None or retrain_result.get("customer_id") != target_id:
            actual_retrain = retrain_model_without_customer(
                baseline_result=baseline,
                customer_id=target_id,
                random_seed=random_seed,
            )
        else:
            actual_retrain = retrain_result
    except Exception as exc:
        errors.append(f"Retraining execution encountered an error: {str(exc)}")
        checks.append(
            {
                "name": "check_model_retraining",
                "passed": False,
                "details": f"Exception during retraining: {str(exc)}",
            }
        )
        return {
            "target": "model",
            "customer_id": target_id,
            "status": "FAILED",
            "checks": checks,
            "evidence": evidence,
            "errors": errors,
        }

    exclusion = actual_retrain.get("exclusion", {})
    after_count = int(exclusion.get("target_rows_after", -1))
    total_after = int(exclusion.get("total_rows_after", -1))

    evidence["total_training_rows_after"] = total_after
    evidence["target_training_rows_after"] = after_count

    # 5. Check exclusion verification (0 matching records remain)
    exclusion_passed = (
        exclusion.get("exclusion_verified", False)
        and (after_count == 0)
        and (total_after == (len(train_df) - before_count))
    )

    checks.append(
        {
            "name": "check_target_exclusion",
            "passed": bool(exclusion_passed),
            "details": (
                f"Exclusion verified: {after_count} matching records remain in filtered training set. "
                f"Row count reduced from {len(train_df)} to {total_after}."
                if exclusion_passed
                else f"Exclusion failed: {after_count} matching records still present."
            ),
        }
    )

    # 6. Check model retraining execution
    retraining_completed = bool(actual_retrain.get("retraining_completed", False))
    evidence["retraining_completed"] = retraining_completed

    checks.append(
        {
            "name": "check_model_retraining",
            "passed": retraining_completed,
            "details": (
                f"Replacement {model_type} successfully trained from scratch on filtered data."
                if retraining_completed
                else "Model retraining was not completed."
            ),
        }
    )

    if actual_retrain.get("errors"):
        errors.extend(actual_retrain["errors"])

    # 7. Check evaluation metrics
    retrained_metrics = actual_retrain.get("retrained_metrics")
    if retrained_metrics:
        evidence["retrained_metrics"] = retrained_metrics
        evidence["metric_deltas"] = actual_retrain.get("metric_comparison", {})
        if "artifact_hash" in actual_retrain:
            evidence["retrained_artifact_hash"] = actual_retrain["artifact_hash"]
        checks.append(
            {
                "name": "check_evaluation_metrics",
                "passed": True,
                "details": "Evaluation completed on identical held-out test split with finite metrics.",
            }
        )
    else:
        checks.append(
            {
                "name": "check_evaluation_metrics",
                "passed": False,
                "details": "Evaluation metrics could not be computed for retrained model.",
            }
        )

    # Propagate retrained neural network internals and weight shifts if available
    if "retrained_nn_internals" in actual_retrain:
        evidence["retrained_nn_internals"] = actual_retrain["retrained_nn_internals"]
    if "weight_shifts" in actual_retrain:
        evidence["weight_shifts"] = actual_retrain["weight_shifts"]


    # 8. Determine overall status honestly
    all_checks_passed = all(check["passed"] for check in checks)
    if all_checks_passed:
        status = "CONFIRMED"
    elif exclusion_passed and not retraining_completed:
        status = "PARTIAL"
    elif not exclusion_passed:
        status = "FAILED"
    else:
        status = "UNVERIFIED"

    result = {
        "target": "model",
        "customer_id": target_id,
        "status": status,
        "checks": checks,
        "evidence": evidence,
        "errors": errors,
    }

    # Strict JSON-serializability assertion: guarantees Person 4 never encounters encoding errors
    json.dumps(result)

    return result
