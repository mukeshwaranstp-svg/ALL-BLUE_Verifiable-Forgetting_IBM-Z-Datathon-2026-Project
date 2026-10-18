"""
Model Training Module for Verifiable Forgetting.

This module provides functions for:
1. Training a baseline classifier on synthetic customer training data.
2. Evaluating model performance on held-out test data.
3. Managing model hyperparameters reproducibly.

Principles:
- Uses lightweight, reproducible scikit-learn models (DecisionTreeClassifier).
- Guarantees complete separation between training and test sets.
- Tracks customer IDs alongside data records without leaking them to the model.
"""

import hashlib
from typing import Any, Dict, Optional, Tuple
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from .generate_data import (
    DEFAULT_RANDOM_SEED,
    generate_synthetic_customer_data,
    split_features_and_metadata,
    train_test_split_with_metadata,
)
from .evaluate import evaluate_model


def get_classifier(model_type: str = "decision_tree", random_seed: int = DEFAULT_RANDOM_SEED) -> Any:
    """
    Instantiate a reproducible, lightweight classifier.

    Supported types:
    - 'decision_tree': DecisionTreeClassifier(max_depth=5, min_samples_split=5, random_state=random_seed)
    - 'neural_network': Multi-Layer Perceptron Pipeline with StandardScaler and
                        MLPClassifier(hidden_layer_sizes=(8, 4), max_iter=200, random_state=random_seed)
    """
    if model_type in ("decision_tree", "DecisionTreeClassifier"):
        return DecisionTreeClassifier(
            max_depth=5,
            min_samples_split=5,
            random_state=random_seed,
        )
    elif model_type in ("neural_network", "mlp", "MLPClassifier"):
        return Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "mlp",
                    MLPClassifier(
                        hidden_layer_sizes=(8, 4),
                        activation="relu",
                        solver="adam",
                        max_iter=200,
                        random_state=random_seed,
                    ),
                ),
            ]
        )
    raise ValueError(f"Unsupported model type: {model_type}. Expected 'decision_tree' or 'neural_network'.")


def extract_neural_network_internals(model: Any) -> Optional[Dict[str, Any]]:
    """
    Extract genuine neural network weights, biases, architecture, and loss curves.

    Parameters:
        model: Trained model or Pipeline.

    Returns:
        dict or None: Serialized dictionary of actual weights, biases, and loss history.
    """
    mlp = None
    if isinstance(model, MLPClassifier):
        mlp = model
    elif hasattr(model, "named_steps") and "mlp" in model.named_steps:
        mlp = model.named_steps["mlp"]

    if mlp is None or not hasattr(mlp, "coefs_"):
        return None

    weights = [w.tolist() for w in mlp.coefs_]
    biases = [b.tolist() for b in mlp.intercepts_]
    loss_curve = [round(float(l), 4) for l in getattr(mlp, "loss_curve_", [])]

    total_params = sum(w.size for w in mlp.coefs_) + sum(b.size for b in mlp.intercepts_)

    return {
        "architecture": "4 -> 8 -> 4 -> 1",
        "layer_shapes": [list(w.shape) for w in mlp.coefs_],
        "n_layers": len(mlp.coefs_) + 1,
        "n_iterations": int(getattr(mlp, "n_iter_", 0)),
        "loss_curve": loss_curve,
        "weights": weights,
        "biases": biases,
        "total_parameters": int(total_params),
    }


def compute_model_artifact_hash(model: Any) -> str:
    """
    Compute a deterministic cryptographic SHA-256 fingerprint of model weights or tree parameters.
    """
    hasher = hashlib.sha256()
    if hasattr(model, "tree_"):
        tree_bytes = model.tree_.feature.tobytes() + model.tree_.threshold.tobytes()
        hasher.update(tree_bytes)
    elif hasattr(model, "named_steps") and "mlp" in model.named_steps:
        mlp = model.named_steps["mlp"]
        for w in mlp.coefs_:
            hasher.update(w.tobytes())
        for b in mlp.intercepts_:
            hasher.update(b.tobytes())
    elif hasattr(model, "coefs_"):
        for w in model.coefs_:
            hasher.update(w.tobytes())
        for b in model.intercepts_:
            hasher.update(b.tobytes())
    else:
        hasher.update(str(model).encode("utf-8"))
    return hasher.hexdigest()[:16]




def train_model(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    model_type: str = "decision_tree",
    random_seed: int = DEFAULT_RANDOM_SEED,
) -> Any:
    """
    Train a classifier on the provided feature matrix and target labels.

    Parameters:
        X_train (pd.DataFrame): Training feature matrix (no customer_id).
        y_train (pd.Series): Training labels.
        model_type (str): Type of model to instantiate.
        random_seed (int): Random seed for reproducibility.

    Returns:
        Trained model instance.
    """
    if len(X_train) == 0:
        raise ValueError("Cannot train model on empty training features")
    if len(X_train) != len(y_train):
        raise ValueError(
            f"Length mismatch: X_train has {len(X_train)} rows, y_train has {len(y_train)} rows"
        )

    model = get_classifier(model_type=model_type, random_seed=random_seed)
    model.fit(X_train, y_train)
    return model


def train_baseline_pipeline(
    df: Optional[pd.DataFrame] = None,
    test_size: float = 0.2,
    random_seed: int = DEFAULT_RANDOM_SEED,
    model_type: str = "decision_tree",
) -> Dict[str, Any]:
    """
    Execute the end-to-end baseline training pipeline.

    1. Generates synthetic data if not provided.
    2. Performs reproducible train/test split.
    3. Fits the baseline classifier (DecisionTree or Neural Network) on the training split.
    4. Evaluates the baseline classifier on the test split.

    Returns:
        dict: Complete baseline summary including model, metrics, and internals.
    """
    if df is None:
        df = generate_synthetic_customer_data(random_seed=random_seed)

    splits = train_test_split_with_metadata(
        df=df,
        test_size=test_size,
        random_seed=random_seed,
    )
    train_df = splits["train_df"]
    test_df = splits["test_df"]

    X_train, y_train, train_ids = split_features_and_metadata(train_df)
    X_test, y_test, test_ids = split_features_and_metadata(test_df)

    model = train_model(
        X_train=X_train,
        y_train=y_train,
        model_type=model_type,
        random_seed=random_seed,
    )
    baseline_metrics = evaluate_model(model=model, X_test=X_test, y_test=y_test)

    # Resolve standardized model type name
    if model_type in ("neural_network", "mlp", "MLPClassifier"):
        resolved_type = "MLPClassifier"
        nn_internals = extract_neural_network_internals(model)
    else:
        resolved_type = "DecisionTreeClassifier"
        nn_internals = None

    result = {
        "model": model,
        "model_type": resolved_type,
        "artifact_hash": compute_model_artifact_hash(model),
        "random_seed": int(random_seed),
        "train_df": train_df,
        "test_df": test_df,
        "train_row_count": int(len(train_df)),
        "test_row_count": int(len(test_df)),
        "baseline_metrics": baseline_metrics,
    }
    if nn_internals is not None:
        result["nn_internals"] = nn_internals

    return result



def exclude_customer_from_training_data(
    train_df: pd.DataFrame,
    customer_id: str,
    id_col: str = "customer_id",
) -> Dict[str, Any]:
    """
    Exclude all records belonging to a target customer from the training dataset.

    Parameters:
        train_df (pd.DataFrame): Original training DataFrame.
        customer_id (str): The customer ID to exclude.
        id_col (str): Column name for the customer ID metadata.

    Returns:
        Dict[str, Any]:
            - customer_id (str): target customer ID
            - found (bool): whether the customer was found in training data
            - total_rows_before (int): row count before exclusion
            - target_rows_before (int): matching records found before exclusion
            - total_rows_after (int): row count after exclusion
            - target_rows_after (int): matching records remaining after exclusion (must be 0)
            - filtered_train_df (pd.DataFrame): fresh DataFrame excluding target customer
            - exclusion_verified (bool): True if target was found and completely removed
            - message (str): descriptive status message
    """
    if id_col not in train_df.columns:
        raise ValueError(f"Column '{id_col}' not found in training DataFrame")

    if not isinstance(customer_id, str) or not customer_id.strip():
        raise ValueError(f"Invalid customer_id: '{customer_id}'. Expected non-empty string.")

    target_id = customer_id.strip()
    total_before = int(len(train_df))
    before_count = int((train_df[id_col] == target_id).sum())

    # Case 1: Target customer not in training data
    if before_count == 0:
        return {
            "customer_id": target_id,
            "found": False,
            "total_rows_before": total_before,
            "target_rows_before": 0,
            "total_rows_after": total_before,
            "target_rows_after": 0,
            "filtered_train_df": train_df.copy(),
            "exclusion_verified": False,
            "message": f"Customer ID '{target_id}' was not found in the training dataset.",
        }

    # Case 2: Target customer present -> filter out without mutating original
    filtered_train_df = (
        train_df[train_df[id_col] != target_id].copy().reset_index(drop=True)
    )

    total_after = int(len(filtered_train_df))
    after_count = int((filtered_train_df[id_col] == target_id).sum())

    # Strict programmatic verification:
    # 1. Zero matching records remain in the filtered set.
    # 2. Total rows decreased exactly by before_count.
    exclusion_verified = (after_count == 0) and (total_after == (total_before - before_count))

    return {
        "customer_id": target_id,
        "found": True,
        "total_rows_before": total_before,
        "target_rows_before": before_count,
        "total_rows_after": total_after,
        "target_rows_after": after_count,
        "filtered_train_df": filtered_train_df,
        "exclusion_verified": exclusion_verified,
        "message": (
            f"Successfully excluded {before_count} record(s) for customer ID '{target_id}'. "
            f"Training rows reduced from {total_before} to {total_after}."
        ),
    }


LIMITATIONS_DISCLAIMER: str = (
    "Exclusion of training records followed by retraining demonstrates data-level deletion "
    "and model replacement. It does not mathematically prove formal machine unlearning, "
    "nor does it certify legal compliance or guarantee erasure from past model logs."
)


def retrain_model_without_customer(
    baseline_result: Dict[str, Any],
    customer_id: str,
    random_seed: int = DEFAULT_RANDOM_SEED,
) -> Dict[str, Any]:
    """
    Exclude a target customer's records from training data and retrain a fresh model.

    Evaluates the newly trained model on the exact same held-out test split used
    for the baseline model to provide a fair, scientific comparison.

    Parameters:
        baseline_result (Dict[str, Any]): Result dictionary from train_baseline_pipeline().
        customer_id (str): Target customer identifier to exclude.
        random_seed (int): Seed for reproducibility.

    Returns:
        Dict[str, Any]: Retraining result report containing:
            - customer_id: str
            - exclusion: Dict[str, Any]
            - retrained_model: fitted model object or None
            - baseline_metrics: Dict[str, float]
            - retrained_metrics: Dict[str, float] or None
            - metric_comparison: Dict[str, float] (deltas) or None
            - retraining_completed: bool
            - limitations: str
            - errors: List[str]
    """
    errors = []

    # 1. Perform customer exclusion
    train_df = baseline_result.get("train_df")
    if train_df is None:
        errors.append("Invalid baseline_result: missing 'train_df'.")
        return {
            "customer_id": customer_id,
            "exclusion": None,
            "retrained_model": None,
            "baseline_metrics": baseline_result.get("baseline_metrics", {}),
            "retrained_metrics": None,
            "metric_comparison": None,
            "retraining_completed": False,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }

    try:
        exclusion = exclude_customer_from_training_data(
            train_df=train_df,
            customer_id=customer_id,
        )
    except Exception as exc:
        errors.append(f"Exclusion step failed: {str(exc)}")
        return {
            "customer_id": customer_id,
            "exclusion": None,
            "retrained_model": None,
            "baseline_metrics": baseline_result.get("baseline_metrics", {}),
            "retrained_metrics": None,
            "metric_comparison": None,
            "retraining_completed": False,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }

    # If customer was not found in training data, report honestly without fabricating retraining
    if not exclusion["found"]:
        errors.append(f"Customer '{customer_id}' was not in the training set; no retraining performed.")
        return {
            "customer_id": customer_id,
            "exclusion": exclusion,
            "retrained_model": None,
            "baseline_metrics": baseline_result.get("baseline_metrics", {}),
            "retrained_metrics": None,
            "metric_comparison": None,
            "retraining_completed": False,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }

    # 2. Retrain fresh model on filtered training data
    filtered_train_df = exclusion["filtered_train_df"]
    test_df = baseline_result.get("test_df")

    if test_df is None:
        errors.append("Invalid baseline_result: missing 'test_df'.")
        return {
            "customer_id": customer_id,
            "exclusion": exclusion,
            "retrained_model": None,
            "baseline_metrics": baseline_result.get("baseline_metrics", {}),
            "retrained_metrics": None,
            "metric_comparison": None,
            "retraining_completed": False,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }

    try:
        X_retrain, y_retrain, _ = split_features_and_metadata(filtered_train_df)
        X_test, y_test, _ = split_features_and_metadata(test_df)

        model_type = baseline_result.get("model_type", "decision_tree")
        retrained_model = train_model(
            X_train=X_retrain,
            y_train=y_retrain,
            model_type=model_type,
            random_seed=random_seed,
        )

        retrained_metrics = evaluate_model(
            model=retrained_model,
            X_test=X_test,
            y_test=y_test,
        )

        # Compute metric deltas (retrained - baseline)
        baseline_metrics = baseline_result.get("baseline_metrics", {})
        metric_comparison = {}
        for metric_name, base_val in baseline_metrics.items():
            if metric_name in retrained_metrics and isinstance(base_val, (int, float)):
                metric_comparison[f"{metric_name}_delta"] = round(
                    float(retrained_metrics[metric_name] - base_val), 4
                )

        # Neural network internals and weight shift tracking
        nn_internals = extract_neural_network_internals(retrained_model)
        weight_shifts = None
        if nn_internals is not None and "nn_internals" in baseline_result:
            base_weights = baseline_result["nn_internals"]["weights"]
            retrain_weights = nn_internals["weights"]
            layer_deltas = []
            for w_b, w_r in zip(base_weights, retrain_weights):
                delta_arr = (pd.DataFrame(w_r).values - pd.DataFrame(w_b).values)
                layer_deltas.append(delta_arr.tolist())
            weight_shifts = {
                "layer_weight_deltas": layer_deltas,
                "note": (
                    "Parameter values adjusted after retraining without target record. "
                    "Parameter differences demonstrate model update, but do not mathematically "
                    "certify complete removal of historical influence."
                ),
            }

        ret_dict = {
            "customer_id": customer_id,
            "exclusion": exclusion,
            "retrained_model": retrained_model,
            "artifact_hash": compute_model_artifact_hash(retrained_model),
            "baseline_metrics": baseline_metrics,
            "retrained_metrics": retrained_metrics,
            "metric_comparison": metric_comparison,
            "retraining_completed": True,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }
        if nn_internals is not None:
            ret_dict["retrained_nn_internals"] = nn_internals
        if weight_shifts is not None:
            ret_dict["weight_shifts"] = weight_shifts

        return ret_dict


    except Exception as exc:
        errors.append(f"Model retraining failed: {str(exc)}")
        return {
            "customer_id": customer_id,
            "exclusion": exclusion,
            "retrained_model": None,
            "baseline_metrics": baseline_result.get("baseline_metrics", {}),
            "retrained_metrics": None,
            "metric_comparison": None,
            "retraining_completed": False,
            "limitations": LIMITATIONS_DISCLAIMER,
            "errors": errors,
        }


