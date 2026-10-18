# Person 2: ML Model & Retraining Verification

This module provides the machine-learning component for the IBM Z Datathon 2026 project: **Verifiable Forgetting**.

---

## 1. Responsibilities & Ownership
Person 2 owns:
- `unlearning/__init__.py`
- `unlearning/generate_data.py`: Deterministic synthetic customer data generator with anti-leakage architecture.
- `unlearning/train.py`: Baseline Decision Tree training, target customer exclusion, and replacement model retraining.
- `unlearning/evaluate.py`: Multi-metric evaluation (Accuracy, F1, Precision, Recall) on held-out test data.
- `verification/model_checks.py`: Core integration function `verify_model_deletion(customer_id: str) -> dict`.
- `tests/test_model_checks.py`: Complete test suite with 15 passing tests.

---

## 2. Integration Contract for Person 4 (Orchestrator)

### Function Signature
```python
from verification.model_checks import verify_model_deletion

result = verify_model_deletion(customer_id="C0420")
```

### Return Dictionary Schema
```json
{
  "target": "model",
  "customer_id": "C0420",
  "status": "CONFIRMED",
  "checks": [
    {
      "name": "check_target_presence_before",
      "passed": true,
      "details": "Target customer 'C0420' located in training data (1 matching record(s))."
    },
    {
      "name": "check_target_exclusion",
      "passed": true,
      "details": "Exclusion verified: 0 matching records remain in filtered training set. Row count reduced from 800 to 799."
    },
    {
      "name": "check_model_retraining",
      "passed": true,
      "details": "Replacement DecisionTreeClassifier successfully trained from scratch on filtered data."
    },
    {
      "name": "check_evaluation_metrics",
      "passed": true,
      "details": "Evaluation completed on identical held-out test split with finite metrics."
    }
  ],
  "evidence": {
    "model_type": "DecisionTreeClassifier",
    "random_seed": 42,
    "limitations": "Exclusion of training records followed by retraining demonstrates data-level deletion and model replacement. It does not mathematically prove formal machine unlearning, nor does it certify legal compliance or guarantee erasure from past model logs.",
    "train_test_split": {
      "strategy": "stratified_80_20",
      "training_samples": 800,
      "testing_samples": 200
    },
    "baseline_metrics": {
      "accuracy": 0.79,
      "f1": 0.7835,
      "precision": 0.8085,
      "recall": 0.76,
      "sample_count": 200
    },
    "total_training_rows_before": 800,
    "target_training_rows_before": 1,
    "total_training_rows_after": 799,
    "target_training_rows_after": 0,
    "retraining_completed": true,
    "retrained_metrics": {
      "accuracy": 0.79,
      "f1": 0.7835,
      "precision": 0.8085,
      "recall": 0.76,
      "sample_count": 200
    },
    "metric_deltas": {
      "accuracy_delta": 0.0,
      "f1_delta": 0.0,
      "precision_delta": 0.0,
      "recall_delta": 0.0,
      "sample_count_delta": 0.0
    }
  },
  "errors": []
}
```

---

## 3. Scientific Limitations & Boundaries
- **Exclusion & Retraining Demonstration**: Demonstrates record exclusion from training data followed by model retraining.
- **Not Formal Machine Unlearning**: Does not claim formal mathematical unlearning or removal of influence from past historical logs/backups.
- **Privacy First**: Uses 100% synthetic data generated deterministically with fixed seeds.

---

## 4. Running the Tests

```powershell
python -m pytest tests/test_model_checks.py -v
```

All 15 tests pass covering:
- Reproducibility and unique synthetic IDs
- Anti-leakage metadata separation
- Exclusion check (0 rows remaining)
- Duplicate customer record handling
- Original data immutability
- Held-out test set consistency
- Unknown and invalid customer ID handling
- Strict JSON serializability
