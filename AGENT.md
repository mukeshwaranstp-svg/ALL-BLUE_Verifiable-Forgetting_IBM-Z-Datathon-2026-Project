# AGENT GUIDELINES — PERSON 2: ML Model & Retraining Verification

## Mission

Implement the ML portion of Verifiable Forgetting using synthetic data and lightweight local Python tools. Demonstrate and verify target-record exclusion from training data followed by model retraining. Do not overstate this as formal machine unlearning.

## Read first

Read `PROJECT_SPEC.md`, `MASTER_PROMPT.md`, and this `AGENT.md` before editing. Inspect the current repository and respect the other members' file ownership.

## Ownership

Person 2 owns:
- `unlearning/__init__.py`
- `unlearning/generate_data.py`
- `unlearning/train.py`
- `unlearning/evaluate.py`
- `verification/model_checks.py`
- `tests/test_model_checks.py` and other clearly model-specific tests

Coordinate shared `verification/__init__.py` changes with Person 1 and Person 4. Do not modify Person 1's storage files or Person 3/4's dashboard and orchestration files unless the team explicitly agrees.

## Environment and dependencies

- Python 3
- scikit-learn
- NumPy
- pandas only if needed
- pytest for tests

Keep the implementation local, free, and lightweight. Do not require cloud accounts, paid APIs, API keys, secrets, or a `.env` file. If dependencies are missing, explain how to install them and do not claim tests ran successfully.

Suggested installation command if needed:

```powershell
python -m pip install scikit-learn numpy pandas pytest
```

## Recommended design

### Synthetic data
Use deterministic generation with a fixed seed. Include:
- `customer_id` as a unique synthetic identifier (for example `C0101`, `C0420`);
- a few numeric synthetic features;
- a clearly named label column.

Do not use real or sensitive personal data. Make it easy to create a dataset with a known target customer.

### Training and evaluation
Use a lightweight scikit-learn classifier. Keep training and evaluation logic separate. Avoid data leakage and document the split strategy. Use fixed seeds where appropriate. Report metrics such as accuracy and F1 only when they are computed from actual predictions and labels.

### Exclusion and retraining
Filter the target `customer_id` out of the training dataset and verify that zero matching rows remain. Retrain the model with the filtered training data. Be explicit about which dataset is used for evaluation and whether the target can appear in that evaluation set. Do not silently change evaluation data to make the model look better.

### Verification result
The integration function should be:

```python
def verify_model_deletion(customer_id: str) -> dict:
    ...
```

Return a JSON-serializable dictionary with these top-level keys:
- `target`
- `customer_id`
- `status`
- `checks`
- `evidence`
- `errors`

Use actual observations. Suggested statuses: `PENDING`, `CONFIRMED`, `FAILED`, `UNVERIFIED`, `PARTIAL`. A successful exclusion check and successful retraining are separate checks; do not combine them into a fabricated overall success.

## What the prototype can and cannot claim

It can demonstrate that a synthetic target record was excluded from a specified training dataset and that a model was retrained on the remaining data.

It cannot, by itself, prove formal machine unlearning, erase the record from every model artifact or log, guarantee that model behavior no longer reflects any historical influence, or certify legal compliance. State these limitations in comments, results, and the handoff report.

## Test checklist

- [ ] Data generation is deterministic with a fixed seed.
- [ ] Synthetic customer IDs are unique.
- [ ] Expected columns and row counts are present.
- [ ] Target record is found before exclusion when expected.
- [ ] Target record is absent after exclusion.
- [ ] Unrelated records remain present.
- [ ] Model training completes on valid synthetic data.
- [ ] Metrics are computed and finite.
- [ ] Missing target ID and invalid input are handled honestly.
- [ ] Result dictionary is JSON-serializable.
- [ ] Status values reflect real results and errors are preserved.

Run model-specific tests, for example:

```powershell
python -m pytest tests/test_model_checks.py -v
```

If the repository has broader tests and the changes may affect integration, run those too and report the actual outcome.

## Working style

- Explain WHY before HOW when describing implementation choices.
- Work one phase at a time and test each phase before proceeding.
- Keep code readable and beginner-friendly.
- Do not add unnecessary architecture, external services, or heavy dependencies.
- Never overwrite other members' work or make unrelated edits.
- Never hardcode a passing status, fake evidence, or claim tests passed without running them.
- Ask Person 4 to confirm any unclear shared interface rather than inventing a new one.

## Handoff to Person 4

Provide the exact public function signature, result schema, dependencies, command used to run tests, a real locally generated example result, and limitations. Ensure all returned values can be serialized to JSON and that no model-specific data is presented as database deletion evidence.
