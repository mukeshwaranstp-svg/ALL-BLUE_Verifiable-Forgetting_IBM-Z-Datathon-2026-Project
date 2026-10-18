"""
Unlearning Package for Verifiable Forgetting.
Contains modules for synthetic data generation, model training, and evaluation.
"""

from .generate_data import (
    DEFAULT_RANDOM_SEED,
    ID_COLUMN,
    TARGET_COLUMN,
    FEATURE_COLUMNS,
    generate_synthetic_customer_data,
    split_features_and_metadata,
    train_test_split_with_metadata,
)
from .evaluate import (
    compute_classification_metrics,
    evaluate_model,
)
from .train import (
    get_classifier,
    train_model,
    train_baseline_pipeline,
    exclude_customer_from_training_data,
    retrain_model_without_customer,
    extract_neural_network_internals,
    LIMITATIONS_DISCLAIMER,
)

__all__ = [
    "DEFAULT_RANDOM_SEED",
    "ID_COLUMN",
    "TARGET_COLUMN",
    "FEATURE_COLUMNS",
    "LIMITATIONS_DISCLAIMER",
    "generate_synthetic_customer_data",
    "split_features_and_metadata",
    "train_test_split_with_metadata",
    "compute_classification_metrics",
    "evaluate_model",
    "get_classifier",
    "train_model",
    "train_baseline_pipeline",
    "exclude_customer_from_training_data",
    "retrain_model_without_customer",
    "extract_neural_network_internals",
]
