# Verifiable Forgetting — Enterprise ML Unlearning & Deletion Pipeline

**IBM Z Datathon 2026 • Enterprise Architecture Showcase**

An enterprise-grade, verifiable machine unlearning and data purge web platform tailored for the **IBM z16 Telum II AI Accelerator and Crypto Express 8S HSM** specification. This platform enables continuous compliance with GDPR ("Right to be Forgotten"), CCPA, PIPEDA, and LGPD by proving that customer data is thoroughly purged from transactional databases, reconciled across immutable WORM backups, scrubbed from feature stores, unlearned from machine learning models via retraining, and certified with Zero-Knowledge proofs (ZKP) and HSM-signed receipts.

---

## 1. Core Capabilities & Architecture

### The Canonical 8-Stage Verifiable Unlearning Pipeline
Each customer deletion request transitions through an audited, 8-stage unlearning lifecycle:

1. **Stage 01 — Transactional Database Purge**: Deletion of relational rows across multi-tenant shards with foreign key cascade handling.
2. **Stage 02 — Merkle Tombstone State Update**: Insertion of a cryptographic leaf hash into the sparse Merkle tree accumulator to prevent resurrection.
3. **Stage 03 — Backup Reconciliation & Tape Revocation**: Inspection of physical immutable WORM (Write Once, Read Many) tape media, reconciling physical retention limitations via cryptographic encryption key revocation.
4. **Stage 04 — Ephemeral Sandbox Verification**: Execution of automated regression tests inside an isolated enclave environment.
5. **Stage 05 — Feature Store Scrub**: Cache invalidation and embedding purge across online and offline feature stores.
6. **Stage 06 — Model Retraining (Unlearning)**: Retraining ML models with the batch-excluded customer corpus using differential privacy (DP-SGD) on IBM Telum II AI accelerators.
7. **Stage 07 — Zero-Knowledge Verification Audit**: Generation and verification of Groth16 / BN254 zero-knowledge exclusion proofs and empirical Membership Inference Attack (MIA) resistance checks.
8. **Stage 08 — Immutable Receipt Issuance**: Minting and signing of verifiable JSON audit certificates using the IBM Crypto Express 8S HSM specification archetype.

---

## 2. Interactive Neural Network Visualization & Scientific Accuracy

The application includes an interactive HTML5 canvas neural-network visualizer available on both the **ML Models** page and as a compact monitor on the **Enclave Dashboard**:

- **Real Architecture Topology**: Inspects model metadata (`isNeuralNetwork`, `layerSizes`, `modelType`). If a model is a deep neural network (e.g. `Customer-Credit-Scorer-v4`), it visualizes interconnected nodes across layers with synaptic edge weights. If a model is an ensemble (e.g. `Fraud-Detection-Ensemble`), it visualizes tree estimators rather than fabricating a false neural topology.
- **Particle Flow Engine**: Canvas particle engine simulating synaptic information flow, respecting `prefers-reduced-motion` settings.
- **Interactive Inspection**: Hovering over any layer or node displays its dimension, activation function (e.g. ReLU, Softmax), role, and feature interpretation.
- **Structural Comparison**: Users can toggle between **Retrained Model**, **Baseline Model**, and **Layer Delta View** ($||\Delta W||_2$).
- **Scientific Honesty**: Explicit badges indicate illustrative topologies, live DP-SGD parameters ($\epsilon$, $\sigma$), loss curves, and MIA attack resistance deltas.

---

## 3. Multi-Customer Bulk Deletion Workflow

The **Deletion Requests** view provides complete multi-customer deletion orchestration:

- **Searchable Customer Directory**: Filter by search terms (name, ID, email) and regulatory jurisdiction (GDPR, CCPA, PIPEDA, LGPD).
- **Multi-Selection Controls**: Select individual records, **Select All**, **Deselect All**, and live selection count badges.
- **Pre-Submission Validation**: Automatically identifies customers subject to statutory legal holds (e.g., Anti-Money Laundering, active tax audits) or active in-flight deletion jobs, providing clear warnings.
- **Bulk Submission Modal**: Displays candidate IDs, estimated hardware cycle times, target unlearning cluster, and confirmation dialog. Double-click prevention ensures idempotent submissions.
- **Bulk Monitoring Matrix**: In the **Workflow Progress** view, track each customer's request independently across all 8 stages, with filter tabs for `CONFIRMED`, `PENDING`, `FAILED`, `UNVERIFIED`, and `RETAINED`.
- **Failure Recovery**: Interactive "Retry" action enables resubmitting failed pipeline stages directly from the UI.

---

## 4. FastAPI Backend Integration & API Contracts

The frontend integrates with a FastAPI backend via `src/services/apiClient.ts` and `src/services/unlearningOrchestrator.ts`.

### Configuration
Set the backend URL via environment variable:
```bash
VITE_API_BASE_URL="http://localhost:8000"
```
Or configure it dynamically in the web UI under **Settings → FastAPI Unlearning Backend Endpoint**.

### Backend API Specification
The FastAPI backend should implement the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` or `/api/v1/health` | Service health status, version, and enclave target |
| `GET` | `/api/v1/customers` | List of customers, record counts, and legal hold status |
| `GET` | `/api/v1/dashboard/summary` | Aggregated KPI counts (total, queued, in progress, confirmed, failed) |
| `GET` | `/api/v1/deletions` | List deletion requests (supports `?status=...` query) |
| `GET` | `/api/v1/deletions/{id}` | Detailed 8-stage history, Merkle hashes, and failure diagnostics |
| `POST` | `/api/v1/deletions/{id}/verify` | Trigger or query comprehensive deletion verification (storage, backup, dataset, MIA unlearning) |
| `GET` | `/api/v1/deletions/{id}/evidence` | Retrieve structured storage & ML evidence checks and 6-stage model transition timeline |
| `POST` | `/api/v1/deletions` | Submit a single customer deletion: `{"customerId": "CUST-..."}` |
| `POST` | `/api/v1/deletions/bulk` | Submit bulk deletions: `{"customerIds": ["CUST-...", ...]}` |
| `POST` | `/api/v1/deletions/{id}/retry` | Retry a failed pipeline stage |
| `POST` | `/api/v1/pipeline/advance` | Step in-flight requests through pipeline phases |
| `GET` | `/api/v1/models` | ML model metadata, architecture, layer sizes, and weights |
| `GET` | `/api/v1/experiments` | Retraining experiment records with excluded sample IDs |
| `GET` | `/api/v1/evidence` | Zero-Knowledge proof records and Merkle roots |
| `GET` | `/api/v1/receipts` | Immutable HSM-signed receipts and downloadable certificates |
| `GET` | `/api/v1/receipts/{id}` | Single receipt audit record |

### Verification Status Definitions
- `CONFIRMED`: The specific check passed with cryptographically verified supporting evidence.
- `PENDING`: The check or operation is actively executing or queued in the enclave.
- `FAILED`: The operation or check failed validation.
- `UNVERIFIED`: Insufficient evidence is currently available to assert forgetting.
- `RETAINED`: Relevant customer data or ciphertext remains in a physical location (e.g. physical WORM tape backups reconciled via key revocation).

### Sandbox Testbed Fallback
When no backend is configured or during offline prototype evaluations, the app operates in **Datathon Testbed Sandbox Mode** using pre-configured synthetic fixtures (`src/services/developmentFixtures.ts`). A persistent telemetry bar at the top of the interface clearly indicates whether the app is connected to a live FastAPI server or operating in testbed mode. If a connected backend does not implement `/api/v1/deletions/{id}/verify`, the frontend truthfully reports the missing endpoint without fabricating synthetic success.

---

## 5. Development & Build

### Prerequisites
- Node.js >= 18
- npm or bun

### Commands
```bash
# Install dependencies
npm install

# Start local Vite development server (port 3000)
npm run dev

# Run TypeScript typecheck and ESLint
npm run lint

# Build for production
npm run build
```

---

## 6. Architecture & File Structure

```
├── .env.example                       # Environment template (VITE_API_BASE_URL)
├── index.html                         # Entry HTML with IBM Z styling and meta tags
├── metadata.json                      # AI Studio application metadata
├── package.json                       # Project dependencies
├── src/
│   ├── App.tsx                        # Master layout, navigation routing, and modal orchestrator
│   ├── index.css                      # Tailwind CSS v4 design tokens and typography
│   ├── main.tsx                       # React DOM entry point
│   ├── types/
│   │   └── index.ts                   # Core TypeScript domain models and stage definitions
│   ├── services/
│   │   ├── apiClient.ts               # Production FastAPI REST client
│   │   ├── unlearningOrchestrator.ts  # State management, backend bridge & fixture sandbox
│   │   ├── developmentFixtures.ts     # Realistic testbed data for Datathon demo
│   │   └── mockData.ts                # Initial seed records
│   ├── components/
│   │   ├── NeuralNetworkVisualizer.tsx# Interactive HTML5 canvas neural topology & particle engine
│   │   ├── BulkDeletionModal.tsx      # Multi-customer submission dialog & duplicate protection
│   │   ├── RequestDetailModal.tsx     # 8-stage timeline inspection & cryptographic hash copy
│   │   ├── ModelComparisonModal.tsx   # Baseline vs Retrained audit & MIA resistance metrics
│   │   ├── TopBar.tsx                 # Live UTC clock, enclave status & telemetry strip
│   │   ├── DesktopSidebar.tsx         # Responsive desktop navigation
│   │   ├── BottomNav.tsx              # Mobile bottom navigation bar
│   │   └── SideDrawer.tsx             # Responsive mobile drawer menu
│   └── views/
│       ├── DashboardView.tsx          # KPI statistics, quick trigger & compact visualizer
│       ├── DeletionRequestsView.tsx   # Searchable customer directory & bulk deletion queue
│       ├── WorkflowProgressView.tsx   # Canonical 8-stage stepper & bulk monitoring matrix
│       ├── MLModelsView.tsx           # Full neural network visualizer & retraining experiments
│       ├── VerificationEvidenceView.tsx# Zero-Knowledge proofs & Merkle tree state logs
│       ├── StorageBackupView.tsx      # Physical WORM tape reconciliation & sandbox status
│       ├── ReceiptsView.tsx           # Cryptographic audit certificates & JSON export
│       └── SettingsView.tsx           # FastAPI backend URL configuration & DP-SGD hyperparams
```

---

## 7. Compliance & Scientific Disclaimers

- **WORM Storage Reconciliation**: In regulatory systems with physical Write-Once-Read-Many (WORM) tape media, physical deletion is prohibited or physically impossible. The platform demonstrates cryptographic tombstoning where the decryption key for the specific customer partition is revoked and zeroized, mathematically rendering the backup unreadable.
- **Machine Unlearning Proofs**: Statistical differences in neural weights alone do not constitute mathematical unlearning. Full unlearning guarantees require either certified Differential Privacy ($\epsilon, \delta$-DP-SGD) bounds or empirical verification via Membership Inference Attack (MIA) resistance thresholds ($>99\%$).
