# IBM Z Datathon 2026 — Verifiable Forgetting
## Full-Stack Machine Learning Unlearning, Storage Deletion & Audit Architecture

**Verifiable Forgetting** demonstrates how an enterprise banking system handles a customer's Right-to-be-Forgotten / deletion request across:
1. **Active Storage**: Physical relational database row purging (`customers` table).
2. **Cryptographic Tombstones**: Anti-resurrection markers stored in SQLite.
3. **Immutable Backups**: Compliance with WORM (Write-Once-Read-Many) policies where historical tapes retain data, but access keys are revoked via tombstones.
4. **Isolated Restore & Reconciliation**: Restoring backups into sandboxed test environments to verify tombstones prevent data resurrection.
5. **Machine Learning Training Data Exclusion**: Scrubbing the training corpus from 800 to 799 rows (0 target customer records).
6. **Fresh Neural Network Retraining**: Re-initializing and training an `MLPClassifier` neural network (4 -> 8 -> 4 -> 1) from scratch without target records.
7. **Model Evaluation & Parameter Tracking**: Measuring $||\Delta W||_2$ weight divergence and accuracy preservation on identical holdout test splits ($N=200$).
8. **Multi-Target Verification Engine & Evidence Store**: Independent verification checks across database, backup, and model targets.
9. **Official Cryptographic Receipts**: SHA-256 verifiable audit certificates.
10. **Executive 5-Second Verdict**: Non-technical 4-card summary, plain English explanations, and before/after comparisons.

---

## 1. Quick Start

### Prerequisites
- **Python 3.10+** (tested on Python 3.11.7)
- **Node.js 18+** & npm
- Windows / macOS / Linux

### Backend Setup (FastAPI)
```powershell
# 1. Install Python dependencies
python -m pip install -r requirements.txt

# 2. Start the FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Health: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Frontend Setup (React 19 + TypeScript + Vite)
```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the Vite dev server
npm run dev
```
- Frontend Dashboard: [http://localhost:3000](http://localhost:3000)

### Run Tests
```powershell
# Backend pytest suite (52 tests)
python -m pytest tests/ -v

# Full end-to-end integration test (Vite proxy -> FastAPI backend)
python test_integration_e2e.py

# Frontend typecheck & production build
cd frontend
npx tsc --noEmit
npm run build
```

---

## 2. Architecture & Data Flow

```text
React 19 + TypeScript Frontend (Port 3000)
    │
    │ Vite Proxy (/api/v1/*, /health)
    ▼
FastAPI Unlearning Backend (Port 8000)
    │
    ▼
Central Orchestrator (12 Synchronous Stages)
    ├── 1. Request Registered ───────────► SQLite Request Record
    ├── 2. Active Storage Purge ─────────► SQL DELETE (0 rows remain)
    ├── 3. Tombstone Persistence ────────► Tombstone Leaf Hash Recorded
    ├── 4. Backup Inspection ────────────► Scans Backup (honest RETAINED status)
    ├── 5. Isolated Restore ─────────────► Sandbox DB: data/isolated_restores/
    ├── 6. Backup Reconciliation ────────► Tombstone applied to sandbox copy
    ├── 7. ML Data Exclusion ────────────► Filters customer out of 800-row train set
    ├── 8. Neural Network Retraining ────► MLPClassifier (4->8->4->1) trained from scratch
    ├── 9. Model Evaluation ─────────────► Holdout test set (N=200), measures ||ΔW||₂
    ├── 10. Multi-Target Verification ───► Verifies Storage, Backup, and ML
    ├── 11. Evidence Finalization ───────► Persists audit artifacts with SHA-256
    └── 12. Receipt Minting ─────────────► Signed JSON audit receipt
```

---

## 3. Executive 5-Second Verdict & Before/After View

Designed so non-technical stakeholders, compliance officers, and auditors understand the result within **five seconds**:

1. **Four Top Cards**:
   - **Customer Data**: `Removed` (0 matching records in live storage)
   - **AI Model**: `Retrained` (fresh model trained from scratch without customer data)
   - **Backups**: `Retained` (physical WORM archive preserved; access blocked via tombstone)
   - **Evidence**: `Verification passed` / `Available` (cryptographic audit receipt minted)

2. **Everyday English Summary**:
   > *"The active customer record was permanently removed from live database tables. A replacement neural network model was trained from scratch on a clean dataset with zero records from this customer. Historical backup copies remain retained in the immutable archive per statutory retention rules, with access blocked via cryptographic tombstones."*

3. **Before & After Comparative Metrics**:
   - **Customer records**: 1 active record $\rightarrow$ 0 matching records (100% purged).
   - **AI training set**: 800 customer rows $\rightarrow$ 799 clean rows (0 target records).
   - **Model utility**: Baseline accuracy 85.0% $\rightarrow$ Retrained accuracy 85.0% ($||\Delta W||_2 = 0.0842$).

4. **Simple Evidence Checklist**:
   5 items with one-sentence summaries and expandable technical details (hashes, SQL queries, paths).

---

## 4. API Endpoints

### V1 API (CamelCase, powering the React Dashboard)
- `GET /api/v1/health` — System status, version, enclave target
- `GET /api/v1/dashboard/summary` — Total, in-progress, confirmed, and failed counts
- `GET /api/v1/customers` — 1,000+ synthetic banking customers
- `POST /api/v1/deletions` — Submit individual customer deletion request
- `POST /api/v1/deletions/bulk` — Submit batch deletion requests
- `GET /api/v1/deletions` — List all deletion requests
- `GET /api/v1/deletions/{id}` — Request details with stage progress
- `GET /api/v1/deletions/{id}/stages` — 12-stage execution timeline
- `GET /api/v1/deletions/{id}/progress` — Polling progress percentage
- `GET /api/v1/deletions/{id}/evidence` — Multi-target verification evidence
- `GET /api/v1/deletions/{id}/storage-evidence` — Active storage & backup reconciliation details
- `GET /api/v1/deletions/{id}/model-evidence` — Baseline vs. retrained model comparison & loss curves
- `POST /api/v1/deletions/{id}/verify` — On-demand verification execution
- `POST /api/v1/deletions/{id}/retry` — Retry failed pipeline stages
- `GET /api/v1/models` — Registered models (MLP Classifier, Random Forest)
- `GET /api/v1/models/baseline` — Baseline neural network architecture & loss curve
- `GET /api/v1/experiments` — Retraining experiment registry
- `GET /api/v1/evidence` — Cryptographic proof records
- `GET /api/v1/receipts` — Minted audit receipts
- `GET /api/v1/receipts/{id}` — Single audit certificate JSON

---

## 5. Scientific Honesty & Regulatory Boundary

1. **Active Database Purge**: Verified by physically executing `DELETE` on transactional tables and running immediate confirmation queries proving 0 matching rows.
2. **Immutable WORM Backups**: Verified that customer data existed in pre-deletion backups. Backups are reported as **`RETAINED`** because enterprise backup media cannot be overwritten. Tombstones prevent data restoration.
3. **Isolated Sandbox Restore**: Demonstrates disaster recovery where restored data is dynamically filtered against tombstones without touching production.
4. **Machine Learning Retraining**: A fresh neural network is trained from scratch on the clean dataset. Parameter shifts ($\Delta W$) and loss curves are extracted directly from scikit-learn models. Retraining proves training-data exclusion; it does not claim in-place mathematical unlearning on immutable historical backups.
