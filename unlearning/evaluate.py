"""
Evaluation Module for Verifiable Forgetting.

This module provides independent evaluation functions to compute classification metrics
from actual model predictions and ground-truth labels.

Key Principles:
1. Honest Reporting: Never fabricate or hardcode metric values.
2. JSON Safety: All returned numbers are converted to native Python types (int, float).
3. Separation of Concerns: Evaluation is isolated from model training.
"""

from typing import Any, Dict
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score


def compute_classification_metrics(y_true: Any, y_pred: Any) -> Dict[str, float]:
    """
    Compute standard binary classification metrics from ground truth and predictions.

    Parameters:
        y_true: Array-like true binary labels (0 or 1).
        y_pred: Array-like predicted binary labels (0 or 1).

    Returns:
        Dict[str, float]: Standard JSON-serializable dictionary with metrics:
            - accuracy
            - f1
            - precision
            - recall
            - sample_count
    """
    # Convert inputs to 1D numpy arrays
    y_true_arr = np.asarray(y_true).ravel()
    y_pred_arr = np.asarray(y_pred).ravel()

    if len(y_true_arr) == 0:
        raise ValueError("Cannot evaluate empty predictions or labels")
    if len(y_true_arr) != len(y_pred_arr):
        raise ValueError(
            f"Length mismatch: y_true has {len(y_true_arr)} samples, "
            f"y_pred has {len(y_pred_arr)} samples"
        )

    acc = accuracy_score(y_true_arr, y_pred_arr)
    f1 = f1_score(y_true_arr, y_pred_arr, zero_division=0)
    prec = precision_score(y_true_arr, y_pred_arr, zero_division=0)
    rec = recall_score(y_true_arr, y_pred_arr, zero_division=0)

    # Cast strictly to native Python float/int to guarantee JSON serializability
    return {
        "accuracy": round(float(acc), 4),
        "f1": round(float(f1), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "sample_count": int(len(y_true_arr)),
    }


def evaluate_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
    """
    Generate model predictions on test features and compute evaluation metrics.

    Parameters:
        model: Trained scikit-learn classifier with a .predict() method.
        X_test (pd.DataFrame): Test features (no customer_id column).
        y_test (pd.Series): Test ground-truth labels.

    Returns:
        Dict[str, float]: Dictionary containing computed metrics.
    """
    if not hasattr(model, "predict"):
        raise AttributeError("Provided model does not implement a 'predict' method")

    predictions = model.predict(X_test)
    return compute_classification_metrics(y_true=y_test, y_pred=predictions)
