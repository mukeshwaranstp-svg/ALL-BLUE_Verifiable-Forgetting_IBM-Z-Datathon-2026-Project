"""
Database engine and table management for Verifiable Forgetting backend.
Provides local SQLite persistence for active storage, requests, stages,
tombstones, evidence, ML experiments, and final receipts.
"""

from datetime import datetime
import json
from pathlib import Path
import shutil
import sqlite3
from typing import Any, Dict, List, Optional

from backend.config import (
    ACTIVE_DB_PATH,
    DEFAULT_PRE_DELETION_BACKUP_PATH,
    DEFAULT_RANDOM_SEED,
    DEFAULT_DATASET_SIZE,
)
from unlearning.generate_data import generate_synthetic_customer_data


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Get a SQLite connection configured for dictionary-like row access."""
    path = db_path or ACTIVE_DB_PATH
    conn = sqlite3.connect(str(path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_database(db_path: Optional[Path] = None, reseed: bool = False) -> None:
    """
    Initialize SQLite tables and seed synthetic customer records.
    Also creates a pre-deletion backup snapshot if one does not exist.
    """
    path = db_path or ACTIVE_DB_PATH
    conn = get_db_connection(path)
    cur = conn.cursor()

    # 1. Customers Table (Active Storage)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS customers (
            customer_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            account_balance REAL NOT NULL,
            transaction_count INTEGER NOT NULL,
            credit_score INTEGER NOT NULL,
            churn_risk INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    # 2. Deletion Requests Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS deletion_requests (
            request_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            current_stage TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            error_summary TEXT,
            idempotency_key TEXT,
            batch_id TEXT
        )
        """
    )

    # 3. Workflow Stages Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS workflow_stages (
            stage_id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            stage_name TEXT NOT NULL,
            stage_order INTEGER NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            result_summary TEXT,
            error_details TEXT,
            FOREIGN KEY (request_id) REFERENCES deletion_requests (request_id)
        )
        """
    )

    # 4. Tombstones Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tombstones (
            tombstone_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            request_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            deletion_scope TEXT NOT NULL,
            verification_info TEXT,
            FOREIGN KEY (request_id) REFERENCES deletion_requests (request_id)
        )
        """
    )

    # 5. Evidence Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS evidence (
            evidence_id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            stage_or_check_name TEXT NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            details_json TEXT NOT NULL,
            artifact_ref TEXT,
            FOREIGN KEY (request_id) REFERENCES deletion_requests (request_id)
        )
        """
    )

    # 6. ML Experiments Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS ml_experiments (
            experiment_id TEXT PRIMARY KEY,
            request_id TEXT,
            customer_id TEXT NOT NULL,
            training_dataset_id TEXT,
            baseline_model_id TEXT,
            retrained_model_id TEXT,
            model_type TEXT NOT NULL,
            architecture_metadata TEXT,
            training_status TEXT NOT NULL,
            evaluation_metrics TEXT,
            artifact_paths TEXT,
            error_details TEXT
        )
        """
    )

    # 7. Receipts Table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS receipts (
            receipt_id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL UNIQUE,
            customer_id TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            overall_status TEXT NOT NULL,
            stage_outcomes_json TEXT NOT NULL,
            verification_outcomes_json TEXT NOT NULL,
            evidence_references_json TEXT NOT NULL,
            warnings_and_limitations TEXT NOT NULL,
            FOREIGN KEY (request_id) REFERENCES deletion_requests (request_id)
        )
        """
    )

    conn.commit()

    # Seed customers if empty or reseed requested
    cur.execute("SELECT COUNT(*) FROM customers")
    count = cur.fetchone()[0]

    if count == 0 or reseed:
        if reseed:
            cur.execute("DELETE FROM customers")
            conn.commit()

        df = generate_synthetic_customer_data(
            n_samples=DEFAULT_DATASET_SIZE,
            random_seed=DEFAULT_RANDOM_SEED,
            target_customer_id="C0420",
        )
        now_iso = datetime.now().isoformat()

        records = []
        for _, row in df.iterrows():
            cid = row["customer_id"]
            records.append(
                (
                    cid,
                    f"Customer {cid}",
                    int(row["age"]),
                    float(row["account_balance"]),
                    int(row["transaction_count"]),
                    int(row["credit_score"]),
                    int(row["churn_risk"]),
                    "ACTIVE",
                    now_iso,
                    now_iso,
                )
            )

        named_customers = [
            ("CUST-88319", "Elena Rostova", 34, 125000.0, 42, 780, 0),
            ("CUST-10492", "Marcus Vance", 48, 84500.0, 31, 690, 0),
            ("CUST-67204", "Sophia Chen", 29, 210000.0, 56, 810, 0),
            ("CUST-39182", "David O'Connor", 41, 14200.0, 18, 640, 1),
            ("CUST-52901", "Amira Al-Mansoor", 38, 98000.0, 35, 750, 0),
            ("CUST-77413", "Lucas Silva", 33, 42000.0, 22, 670, 0),
            ("CUST-91024", "Rachel Sterling", 52, 168000.0, 49, 790, 0),
            ("CUST-44109", "Hiroshi Tanaka", 59, 310000.0, 62, 820, 0),
            ("CUST-83921", "Frederik Lindqvist", 45, 67000.0, 27, 710, 0),
        ]
        for cid, cname, cage, cbal, ctxn, ccred, cchurn in named_customers:
            records.append(
                (
                    cid,
                    cname,
                    cage,
                    cbal,
                    ctxn,
                    ccred,
                    cchurn,
                    "ACTIVE",
                    now_iso,
                    now_iso,
                )
            )

        cur.executemany(
            """
            INSERT OR REPLACE INTO customers (
                customer_id, name, age, account_balance, transaction_count,
                credit_score, churn_risk, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            records,
        )
        conn.commit()

    conn.close()

    # Create pre-deletion backup snapshot if not already present or if reseeded
    if (not DEFAULT_PRE_DELETION_BACKUP_PATH.exists() or reseed) and path == ACTIVE_DB_PATH:
        shutil.copyfile(str(path), str(DEFAULT_PRE_DELETION_BACKUP_PATH))
