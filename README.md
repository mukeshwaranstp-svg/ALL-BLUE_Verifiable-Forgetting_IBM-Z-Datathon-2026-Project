# IBM Z Datathon 2026 — Verifiable Forgetting
## Backend API, Orchestration, Storage, and ML Verification Engine

Verifiable Forgetting is a prototype demonstrating how an enterprise system handles a synthetic customer deletion request across active SQLite storage, immutable backups, ML training workflows, and audit receipts.

---

## 1. Quick Start

### Prerequisites
- Python 3.10+ (tested on Python 3.11.7)
- Windows / macOS / Linux

### Installation
```powershell
python -m pip install -r requirements.txt
```

### Start the FastAPI Backend
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Run the Test Suite
```powershell
python -m pytest tests/ -v
```

---

## 2. Architecture & Data Flow

```text
React + TypeScript Frontend
        │
        ▼
   FastAPI API
        │
        ▼
Central Orchestrator (12 Stages)
  ├── 1. Request Registered
  ├── 2. Active SQLite DB Deletion (verified 0 rows remain)
  ├── 3. Tombstone Persistence
  ├── 4. Backup Inspection (detects customer in immutable backup -> RETAINED)
  ├── 5. Isolated Restore (restores backup into separate sandbox)
  ├── 6. Backup Reconciliation (applies tombstone to test copy -> CONFIRMED)
  ├── 7. ML Training Data Exclusion (filters customer, 0 rows remain)
  ├── 8. Fresh Model Retraining (MLP 4->8->4->1 or DecisionTree)
  ├── 9. Model Evaluation (identical holdout test set N=200)
  ├── 10. Multi-Target Verification (Storage + Backups + ML)
  ├── 11. Evidence Finalization (persisted with SHA-256 hashes)
  └── 12. Final Audit Receipt Assembly (signed JSON receipt)
```

---

## 3. Complete API Endpoint Specification

| Method | Endpoint Path | Description | Request Schema | Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status | None | `{"status": "healthy"}` |
| `GET` | `/api/dashboard` | High-level system & deletion metrics | None | `DashboardSummaryResponse` |
| `GET` | `/api/customers` | Paginated customer list with search & filter | Query params | `CustomerListResponse` |
| `GET` | `/api/customers/{id}` | Single customer details | Path param | `CustomerResponse` |
| `POST` | `/api/requests` | Submit single customer deletion request | `DeletionRequestCreate` | `DeletionRequestResponse` |
| `POST` | `/api/requests/bulk` | Submit batch customer deletion requests | `BulkDeletionRequestCreate` | `BulkDeletionResponse` |
| `GET` | `/api/requests` | List deletion requests with filters | Query params | `List[DeletionRequestResponse]` |
| `GET` | `/api/requests/{id}` | Request details and status | Path param | `DeletionRequestResponse` |
| `GET` | `/api/requests/{id}/stages` | Full 12-stage execution history | Path param | `List[WorkflowStageResponse]` |
| `GET` | `/api/requests/{id}/progress` | Lightweight polling for progress % | Path param | `RequestProgressResponse` |
| `GET` | `/api/requests/{id}/storage-evidence` | Storage, backup, and reconciliation proof | Path param | `StorageEvidenceResponse` |
| `GET` | `/api/storage/backups` | Available backup snapshots & metadata | None | `List[BackupItemResponse]` |
| `GET` | `/api/models/baseline` | Baseline architecture, weights, loss curve | Query params | `ModelMetadataResponse` |
| `GET` | `/api/requests/{id}/model-evidence` | Before/after model comparison & deltas | Path param | `ModelComparisonResponse` |
| `GET` | `/api/requests/{id}/verification` | Verification checklist across all targets | Path param | `VerificationResponse` |
| `GET` | `/api/requests/{id}/evidence` | List raw structured evidence records | Path param | `List[EvidenceItemResponse]` |
| `GET` | `/api/requests/{id}/receipt` | Official signed JSON audit receipt | Path param | `AuditReceiptResponse` |
| `GET` | `/api/receipts` | List all persisted audit receipts | None | `List[AuditReceiptResponse]` |

---

## 4. Scientific Honesty & Verification Scope

1. **Active Storage Deletion**: Verified by deleting rows within a transaction and performing an immediate verification query confirming 0 matching rows.
2. **Immutable Backups**: Verified that the customer was present in the pre-deletion backup. The backup artifact is reported honestly as **`RETAINED`** because enterprise backup archives are immutable.
3. **Isolated Restore & Reconciliation**: A copy of the backup is restored into an isolated sandbox and reconciled against the tombstone marker, verifying exclusion in the test copy without touching production storage.
4. **ML Model Retraining**: A fresh model is trained from scratch on the filtered training partition. Parameter shifts ($\Delta W$) and loss curves are extracted directly from scikit-learn models. Retraining proves training-data exclusion and model replacement; it does not constitute formal mathematical unlearning or in-place erasure.
