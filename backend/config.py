"""
Configuration settings for Verifiable Forgetting backend.
Defines paths, database locations, backup destinations, and defaults.
"""

from pathlib import Path

# Base project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Data storage directories
DATA_DIR = BASE_DIR / "data"
BACKUP_DIR = DATA_DIR / "backups"
RESTORE_DIR = DATA_DIR / "isolated_restores"
MODELS_DIR = DATA_DIR / "models"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
RESTORE_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Database paths
ACTIVE_DB_PATH = DATA_DIR / "active_storage.db"
DEFAULT_PRE_DELETION_BACKUP_PATH = BACKUP_DIR / "backup_pre_deletion.db"

# ML constants
DEFAULT_RANDOM_SEED = 42
DEFAULT_DATASET_SIZE = 1000
DEFAULT_TARGET_CUSTOMER = "C0420"
