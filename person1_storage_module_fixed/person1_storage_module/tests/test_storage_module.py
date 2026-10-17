import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from storage.database import initialize_database, create_customer, delete_customer, get_customer
from storage.backup import create_backup
from verification.storage_checks import verify_storage_deletion

class StorageModuleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.db = self.root / "customers.sqlite3"
        self.backups = self.root / "backups"
        initialize_database(self.db)
        self.env = patch.dict(os.environ, {"VF_DB_PATH": str(self.db), "VF_BACKUP_DIR": str(self.backups)})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def test_create_delete_and_tombstone(self):
        create_customer("cust-001", "Synthetic One", "one@example.test", self.db)
        out = delete_customer("cust-001", self.db)
        self.assertTrue(out["record_absent_after_delete"])
        self.assertIsNone(get_customer("cust-001", self.db))
        self.assertIsNotNone(out["tombstone"])

    def test_backup_containing_record_is_reported_and_reconciled(self):
        create_customer("cust-002", "Synthetic Two", "two@example.test", self.db)
        create_backup(self.db, self.backups / "before_delete.sqlite3")
        delete_customer("cust-002", self.db)
        result = verify_storage_deletion("cust-002")
        json.dumps(result)  # Contract: JSON-serializable.
        self.assertEqual(result["database"]["status"], "passed")
        self.assertEqual(result["backups"]["status"], "retained_but_reconciled")
        backup_result = result["backups"]["checked"][0]
        self.assertTrue(backup_result["raw_backup_customer_record_present"])
        self.assertFalse(backup_result["isolated_restore"]["customer_record_present_after_reconciliation"])
        self.assertFalse(result["backups"]["raw_backup_copies_erased"])

    def test_backup_after_delete_has_no_customer(self):
        create_customer("cust-003", "Synthetic Three", "three@example.test", self.db)
        delete_customer("cust-003", self.db)
        create_backup(self.db, self.backups / "after_delete.sqlite3")
        result = verify_storage_deletion("cust-003")
        self.assertEqual(result["backups"]["status"], "passed")

    def test_live_record_still_present_is_failure(self):
        create_customer("cust-004", "Synthetic Four", "four@example.test", self.db)
        result = verify_storage_deletion("cust-004")
        self.assertEqual(result["database"]["status"], "failed")
        self.assertEqual(result["status"], "failed")

    def test_invalid_id_returns_serializable_error(self):
        result = verify_storage_deletion("")
        json.dumps(result)
        self.assertEqual(result["status"], "error")

if __name__ == "__main__":
    unittest.main()
