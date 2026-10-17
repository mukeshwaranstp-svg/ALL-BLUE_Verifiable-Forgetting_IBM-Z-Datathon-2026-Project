# Person 1 — Database and Backup module

## Files owned
- `storage/database.py`
- `storage/backup.py`
- `verification/storage_checks.py`
- `tests/test_storage_module.py`

## Public integration function (Person 4)
```python
from verification.storage_checks import verify_storage_deletion
result = verify_storage_deletion("cust-001")
```
Returns a JSON-serializable dictionary with `customer_id`, overall `status`, separate `database` and `backups` checks, evidence, errors, and limitations.

## Environment configuration
- `VF_DB_PATH`: live SQLite file (default `data/customers.sqlite3`)
- `VF_BACKUP_DIR`: folder scanned for `*.sqlite3` backups (default `backups/`)

## Quick start
```python
from storage.database import initialize_database, create_customer, delete_customer
from storage.backup import create_backup
initialize_database()
create_customer("cust-001", "Synthetic One", "one@example.test")
create_backup()                  # create a snapshot before deletion to test recovery
delete_customer("cust-001")
```

Run tests from the project root:
```bash
python -m unittest discover -s tests -v
```

## Important honest-status behavior
- A raw backup that still contains the customer is reported as retained.
- Reconciliation applies current tombstones to an isolated restore; it does not modify original backup bytes.
- `raw_backup_copies_erased` is always false because this module does not erase original backups.
- `no_backups_found` means no backup files were available to inspect, not that backups are clean.
- The module only checks the configured local database and matching SQLite backup files. It cannot prove deletion from unknown copies or external systems.

## Assumptions to confirm against PROJECT_SPEC.md
- SQLite backups use `.sqlite3` extension.
- Customer primary key column is `customer_id`.
- Synthetic records have `customer_id`, `name`, and `email`.
- Person 4 consumes the returned dictionary as JSON; this module does not print or serialize it itself.
