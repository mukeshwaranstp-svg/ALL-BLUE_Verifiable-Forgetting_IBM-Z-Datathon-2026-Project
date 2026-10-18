# PROJECT SPECIFICATION — Verifiable Forgetting

## 1. Project purpose

Build a small, local-only demonstration of how a system can handle and verify a deletion request across multiple data targets. The demo uses synthetic customer records and separates storage deletion, backup safeguards, model retraining, and audit reporting.

The project addresses a practical question: when a user requests deletion, what can a system actually verify, and what evidence can it provide?

## 2. Scope and honest claims

This is a prototype for a datathon demonstration, not a production compliance system.

- Use synthetic data only. Do not use real customer or sensitive personal data.
- A query showing no matching row proves only that the tested query found no matching row in the specific database checked.
- A backup restoration test shows what happened in that test copy; it does not physically erase every backup copy.
- A tombstone/reconciliation safeguard can prevent an old record from being reintroduced into the tested active dataset. It does not prove every copy everywhere is erased.
- Model retraining without a target record is a demonstration of exclusion and retraining, not proof of formal machine unlearning.
- Do not claim to delete data from third-party services, external servers, or systems the prototype cannot access.
- Never hardcode success. Report the result of each check, including failures and unknowns.
- A hash chain may help reveal accidental or partial changes, but it is not proof against a privileged actor who can rewrite the entire log.

## 3. System overview

A user submits a deletion request for a synthetic `customer_id`. The system runs separate checks against each target and creates an audit receipt from the actual returned results.

```text
User / Streamlit dashboard
           |
           v
Request service / orchestrator (Person 4)
           |-----------------------------|
           v                             v
Storage & backup checks (Person 1)   Model retraining checks (Person 2)
           |                             |
           +-------------+---------------+
                         v
                Audit receipt (Person 4)
                         |
                         v
              Dashboard and evidence (Person 3)
```

## 4. Team responsibilities

### Person 1 — Database, Backup & Storage Verification
Owns the SQLite customer database, backup creation, isolated restore testing, tombstones, reconciliation, storage verification, and storage tests.

### Person 2 — Model & Retraining Verification
Owns synthetic ML data generation, model training/evaluation, retraining without the target record, and model verification. Must describe the result as a retraining/exclusion demonstration, not formal unlearning proof.

### Person 3 — Dashboard & Demo
Owns the Streamlit UI, deletion-request form, display of separate statuses, evidence presentation, and receipt download. The UI must display actual coordinator results rather than simulated success.

### Person 4 — Integration & Audit Receipt
Owns the orchestrator/request service, shared contracts, receipt assembly, integration tests, failure handling, and final integration. Person 4 coordinates interfaces and merges reviewed changes.

## 5. Shared request contract

```python
request = {
    "request_id": "REQ-001",
    "customer_id": "C0420",
    "targets": ["database", "backup", "model"],
}
```

This is an example request, not a claim that a request has been processed.

## 6. Shared result contract

Each target should return a JSON-serializable dictionary with actual results. For example:

```python
{
    "target": "database_backup",
    "customer_id": "C0420",
    "status": "PENDING",
    "checks": [],
    "evidence": {},
    "errors": [],
}
```

This is a schema example only. Do not return `CONFIRMED` unless the relevant checks really ran and passed.

Suggested status values: `PENDING`, `CONFIRMED`, `FAILED`, `UNVERIFIED`, `PARTIAL`, and `RETAINED` where relevant. Explain statuses consistently across modules.

## 7. End-to-end workflow

1. Initialize a local SQLite database with fake customer records.
2. Create a consistent backup before deletion.
3. Receive a request for a specific synthetic customer ID.
4. Delete the customer from the live database and verify the live query result.
5. Restore the pre-deletion backup to an isolated test location.
6. Check whether the target is present in the raw restored copy.
7. Record a tombstone in a separate control store and reconcile the restored data into a test active copy.
8. Verify whether the target remains in the reconciled active copy and report each result separately.
9. Person 2 independently evaluates model retraining without the target record.
10. Person 4 combines actual module results into an audit receipt.
11. Person 3 displays the request, per-target statuses, evidence, limitations, and downloadable receipt.

## 8. Suggested repository structure

```text
verifiable-forgetting/
├── PROJECT_SPEC.md
├── MASTER_PROMPT.md
├── AGENT.md
├── app.py
├── request_service.py
├── orchestrator.py
├── receipt.py
├── storage/
│   ├── __init__.py
│   ├── database.py
│   └── backup.py
├── unlearning/
│   ├── generate_data.py
│   ├── train.py
│   └── evaluate.py
├── verification/
│   ├── __init__.py
│   ├── storage_checks.py
│   └── model_checks.py
├── tests/
└── data/  # generated local files; normally excluded from Git
```

The exact layout can evolve if the team agrees, but shared public interfaces must remain stable or be updated together.

## 9. Collaboration rules

- Each member owns distinct files and works on a separate feature branch.
- Person 1 should avoid editing Person 2's model files, Person 3's UI, and Person 4's orchestration unless the team explicitly agrees.
- Agree on function signatures and result keys before integration.
- Commit small changes with meaningful messages, push the branch, and open a pull request.
- Person 4 reviews and merges changes; resolve conflicts deliberately and do not force-push shared branches.
- Keep generated databases, backups, model binaries, virtual environments, and secrets out of Git unless the team explicitly needs a small synthetic fixture.

## 10. Definition of done

- Storage operations work on synthetic records.
- Backup creation and isolated restoration are tested.
- Tombstone reconciliation is tested and does not alter the live database unexpectedly.
- Verification returns actual, JSON-serializable evidence and honest statuses.
- Tests include expected failures and unknown/repeated IDs.
- The dashboard and receipt use real module results.
- The final demo explains exactly what was and was not verified.

## 11. Suggested 24-hour sprint

- Hours 0–2: agree on interfaces, set up repository, create synthetic data.
- Hours 2–8: implement independent modules and unit tests.
- Hours 8–13: finish backup/reconciliation and model comparison tests.
- Hours 13–17: integrate module contracts and error handling.
- Hours 17–20: connect dashboard and receipt.
- Hours 20–22: run end-to-end tests and fix defects.
- Hours 22–24: rehearse the demo, prepare slides, and document limitations.

**Core principle: do not confuse performing an operation with proving its result.**
