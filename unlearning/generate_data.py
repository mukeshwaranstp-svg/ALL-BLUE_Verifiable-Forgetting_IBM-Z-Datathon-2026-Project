"""
Data Generation & Preparation Module for Verifiable Forgetting.

This module provides deterministic synthetic customer data generation
specifically designed for the IBM Z Datathon 2026 'Verifiable Forgetting' prototype.

Key Principles:
1. Privacy-Preserving: Uses 100% synthetic data; zero real or sensitive data.
2. Determinism: Controlled by fixed random seeds for perfect reproducibility.
3. Anti-Leakage: Separates customer_id metadata from numerical model features.
4. Immutability: Functions never mutate their inputs in-place.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

# Constants
DEFAULT_RANDOM_SEED: int = 42
TARGET_COLUMN: str = "churn_risk"
ID_COLUMN: str = "customer_id"
FEATURE_COLUMNS: List[str] = [
    "age",
    "account_balance",
    "transaction_count",
    "credit_score",
]


def generate_synthetic_customer_data(
    n_samples: int = 1000,
    random_seed: int = DEFAULT_RANDOM_SEED,
    target_customer_id: Optional[str] = "C0420",
) -> pd.DataFrame:
    """
    Generate a deterministic synthetic customer dataset.

    Parameters:
        n_samples (int): Total number of customer records to generate.
        random_seed (int): Seed for NumPy random generator to ensure reproducibility.
        target_customer_id (str, optional): A specific customer ID guaranteed to be present.

    Returns:
        pd.DataFrame: DataFrame containing customer_id, numeric features, and churn_risk label.
    """
    if n_samples <= 0:
        raise ValueError(f"n_samples must be positive, got {n_samples}")

    rng = np.random.default_rng(random_seed)

    # 1. Generate unique customer IDs (e.g. C0001, C0002, ..., C1000)
    customer_ids = [f"C{i:04d}" for i in range(1, n_samples + 1)]

    # Guarantee presence of target_customer_id if requested
    if target_customer_id and target_customer_id not in customer_ids:
        # Replace the last element to keep exactly n_samples
        customer_ids[-1] = target_customer_id

    # 2. Generate realistic synthetic numeric features
    ages = rng.integers(low=18, high=76, size=n_samples)
    account_balances = np.round(rng.uniform(low=500.0, high=120000.0, size=n_samples), 2)
    transaction_counts = rng.integers(low=1, high=101, size=n_samples)
    credit_scores = rng.integers(low=350, high=851, size=n_samples)

    # 3. Create a realistic relationship for churn_risk (target label: 0 or 1)
    # Customers with lower balances, fewer transactions, and lower credit scores
    # are statistically more likely to churn.
    norm_balance = (account_balances - 500.0) / (120000.0 - 500.0)
    norm_transactions = (transaction_counts - 1.0) / (100.0 - 1.0)
    norm_credit = (credit_scores - 350.0) / (850.0 - 350.0)

    # Retention score (higher score = more loyal, lower churn)
    loyalty_score = (
        0.35 * norm_balance
        + 0.40 * norm_transactions
        + 0.25 * norm_credit
        + rng.normal(loc=0.0, scale=0.10, size=n_samples)  # slight noise
    )

    # Binary label: 1 = high churn risk (loyalty score below median threshold), 0 = low risk
    threshold = np.median(loyalty_score)
    churn_risk = (loyalty_score < threshold).astype(int)

    df = pd.DataFrame(
        {
            ID_COLUMN: customer_ids,
            "age": ages,
            "account_balance": account_balances,
            "transaction_count": transaction_counts,
            "credit_score": credit_scores,
            TARGET_COLUMN: churn_risk,
        }
    )

    return df


def split_features_and_metadata(
    df: pd.DataFrame,
    target_col: str = TARGET_COLUMN,
    id_col: str = ID_COLUMN,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Safely separate customer_id metadata, feature matrix X, and target vector y.

    This prevents data leakage by ensuring the machine learning model never sees
    the customer_id column during training or inference.

    Parameters:
        df (pd.DataFrame): The full customer dataset.
        target_col (str): Name of the target column.
        id_col (str): Name of the customer ID metadata column.

    Returns:
        Tuple of (X, y, customer_ids):
            X: pd.DataFrame with numeric features only
            y: pd.Series with the target labels
            customer_ids: pd.Series with customer IDs
    """
    if id_col not in df.columns:
        raise ValueError(f"Missing ID column: '{id_col}' in dataset")
    if target_col not in df.columns:
        raise ValueError(f"Missing target column: '{target_col}' in dataset")

    # Metadata
    customer_ids = df[id_col].copy()

    # Target
    y = df[target_col].copy()

    # Features: strictly exclude id_col and target_col
    feature_cols = [c for c in df.columns if c not in (id_col, target_col)]
    X = df[feature_cols].copy()

    return X, y, customer_ids


def train_test_split_with_metadata(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_seed: int = DEFAULT_RANDOM_SEED,
    target_col: str = TARGET_COLUMN,
    id_col: str = ID_COLUMN,
) -> Dict[str, pd.DataFrame]:
    """
    Split the dataset into reproducible train and test sets while preserving
    metadata and target distributions.

    Parameters:
        df (pd.DataFrame): Full dataset.
        test_size (float): Proportion of dataset to include in test split (e.g. 0.2 = 20%).
        random_seed (int): Fixed seed for reproducible splitting.
        target_col (str): Name of the label column for stratification.
        id_col (str): Name of the ID metadata column.

    Returns:
        dict: {
            "train_df": pd.DataFrame,
            "test_df": pd.DataFrame,
            "train_ids": List[str],
            "test_ids": List[str]
        }
    """
    if not (0.0 < test_size < 1.0):
        raise ValueError(f"test_size must be between 0 and 1, got {test_size}")

    df_clean = df.copy()

    # Stratified split ensures equal proportion of churn_risk in both train and test
    train_df, test_df = train_test_split(
        df_clean,
        test_size=test_size,
        random_state=random_seed,
        stratify=df_clean[target_col],
    )

    # Reset indices for clean dataframe operations
    train_df = train_df.reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)

    return {
        "train_df": train_df,
        "test_df": test_df,
        "train_ids": train_df[id_col].tolist(),
        "test_ids": test_df[id_col].tolist(),
    }
