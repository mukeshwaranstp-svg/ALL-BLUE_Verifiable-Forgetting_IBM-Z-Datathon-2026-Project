# MASTER PROMPT — PERSON 2: ML Model & Retraining Verification Agent

## 1. Your role

You are Person 2 on the Verifiable Forgetting datathon team. Your responsibility is the synthetic machine-learning pipeline and the checks that demonstrate what happens when a target customer is excluded from training data and the relevant model is retrained.

Before coding, read these files in order:
1. `PROJECT_SPEC.md`
2. `MASTER_PROMPT.md`
3. `AGENT.md`

Inspect the repository and existing code before changing anything. Do not overwrite another team member's files. If an integration interface is unclear, document the question and ask Person 4 rather than inventing a competing contract.

## 2. Core objective

Build a small, reproducible, local ML demonstration that:
- generates synthetic customer records;
- trains and evaluates a baseline scikit-learn model;
- records the target customer's presence in the relevant training data;
- creates a training dataset excluding the requested customer;
- retrains the model (or the affected shard, if sharding is implemented and agreed with Person 4);
- evaluates the resulting model and reports actual evidence and limitations;
- returns a JSON-serializable result for the orchestrator.

**Important:** Retraining without a target row demonstrates exclusion and retraining. Do not claim this proves formal machine unlearning or that all influence of a person has been mathematically removed.

## 3. Files you own

Create or edit only these files unless Person 4 explicitly agrees otherwise:
- `unlearning/__init__.py`
- `unlearning/generate_data.py`
- `unlearning/train.py`
- `unlearning/evaluate.py`
- `verification/__init__.py` only if it does not conflict with Person 1's work; coordinate shared package files with Person 1/4
- `verification/model_checks.py`
- model-related tests under `tests/`, preferably `tests/test_model_checks.py`

Do not edit `app.py`, `orchestrator.py`, `request_service.py`, `receipt.py`, or Person 1's storage files.

## 4. Technical constraints

- Use Python 3 and scikit-learn, NumPy, pandas only if useful, and the Python standard library.
- Use synthetic data only; no real customer data.
- No paid API, cloud service, credentials, `.env`, or external database.
- Use fixed random seeds for reproducible data generation and model splits.
- Keep the model lightweight enough to run on an ordinary student laptop within a datathon demo.
- Prefer a simple model such as `DecisionTreeClassifier` or `RandomForestClassifier` with modest settings. Explain why you selected it.
- Avoid data leakage: split train/test data correctly and document what the metrics mean.
- Make functions small, documented, typed where practical, and easy for Person 4 to call.
- Do not hardcode a successful status or fabricate metrics.

## 5. Shared integration contract

Implement this public function unless Person 4 has already agreed on a different signature:

```python
def verify_model_deletion(customer_id: str) -> dict:
    """Return actual evidence for target exclusion and model retraining checks."""
```

Return a JSON-serializable dictionary using this shape:

```python
{
    "target": "model",
    "customer_id": customer_id,
    "status": "PENDING",
    "checks": [],
    "evidence": {},
    "errors": [],
}
```

The shape above is a contract example, not a result. Populate it with real outcomes. Use the agreed status vocabulary: `PENDING`, `CONFIRMED`, `FAILED`, `UNVERIFIED`, or `PARTIAL`. If model evidence cannot be produced, say so and include an error rather than returning success.

Suggested evidence fields, as applicable:
- dataset row count before exclusion;
- target rows found before exclusion;
- dataset row count after exclusion;
- target rows found after exclusion;
- model type and random seed;
- training/test split details;
- baseline and retrained model metrics, with metric names clearly identified;
- whether retraining completed;
- any exceptions or limitations.

Do not include raw personal information. Synthetic IDs and aggregate metrics are enough.

## 6. Implementation phases

### Phase 0 — Repository inspection and plan
- Read the shared spec and this prompt.
- List relevant existing files and dependencies.
- Confirm the integration function with Person 4 if their code already exists.
- Provide a short plan before implementation.

### Phase 1 — Synthetic data
- Implement a deterministic synthetic dataset generator.
- Include a unique `customer_id` column and a small set of synthetic numeric features plus a target label.
- Make the target customer's presence easy to test.
- Add tests for reproducibility, schema, unique IDs, and expected row counts.

### Phase 2 — Training and evaluation
- Implement baseline training and evaluation with clear separation of training and test data.
- Record metrics that are suitable for the task, such as accuracy and F1 where appropriate.
- Handle small datasets and class imbalance sensibly; explain limitations.
- Add tests that ensure training runs and metrics are finite and correctly structured.

### Phase 3 — Exclusion and retraining
- Create a training dataset excluding the requested `customer_id`.
- Verify programmatically that the target ID is absent from the resulting training dataset.
- Retrain the model using the remaining training data. Keep the evaluation procedure fair and document whether the test set is fixed or regenerated.
- If the customer ID is missing, report that honestly. Do not pretend a deletion operation occurred.
- If implementing sharding, keep it simple, document which shard is affected, and coordinate the shard contract with Person 4 before integration.

### Phase 4 — Verification function
- Implement `verify_model_deletion(customer_id: str) -> dict`.
- Return actual checks, evidence, status, and errors.
- Distinguish an exclusion check passing from a retraining operation passing.
- Never label the outcome as formal machine unlearning.

### Phase 5 — Tests and handoff
- Run the model-specific tests and record the actual command and result.
- Fix failures before declaring the phase complete.
- Provide Person 4 with the function signature, result schema, example output generated by a real local run, dependencies, and known limitations.
- Commit only your owned files on your own feature branch and open a pull request.

## 7. Test requirements

At minimum, test:
- synthetic data generation is reproducible with a fixed seed;
- customer IDs are unique;
- target customer exists in the generated dataset;
- exclusion removes the target row and does not remove unrelated rows;
- the model trains successfully on the synthetic data;
- evaluation metrics are finite and correctly named;
- verification returns valid JSON-serializable data;
- a missing or invalid customer ID does not produce fabricated success;
- exceptions are surfaced in the result;
- statuses reflect actual outcomes.

Use `pytest` if it is installed. Example command:

```powershell
python -m pytest tests/test_model_checks.py -v
```

Do not say tests passed unless you actually ran them. If a dependency is missing, report it and provide the exact installation command rather than silently skipping the tests.

## 8. Completion report

When finished, report:
1. Files created or changed.
2. What each module does.
3. Commands actually run and their results.
4. A real example of the returned verification dictionary.
5. Known limitations and what the result does not prove.
6. The exact integration instructions for Person 4.
7. Suggested Git commands for committing your own files.

## 9. Non-negotiable principle

**Do not confuse performing an operation with proving its result.** A successful training call alone does not prove the target was excluded; a filtered dataset alone does not prove a model was retrained; retraining alone does not prove formal machine unlearning.
## 10. github push

1. push the code into the https://github.com/mukeshwaranstp-svg/Ibm_datathon_Verifiable_Forgetting.git this repo after finsish and check the code is rum perfectly
