from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
LOG_DIR = ROOT_DIR / "logs"
SQL_DIR = ROOT_DIR / "sql"

SPORTWINNER_DB_PATH = Path(os.getenv("MIRROR_DB_SPORTWINNER_PATH", DATA_DIR / "sportwinner.db"))
TRAINING_DB_PATH = Path(os.getenv("MIRROR_DB_TRAINING_PATH", DATA_DIR / "training.db"))
TRAINING_JSON_PATH = Path(os.getenv("MIRROR_DB_TRAINING_JSON", PROJECT_ROOT / "data" / "training_db.json"))

SPORTWINNER_API_URL = os.getenv(
    "SPORTWINNER_API_URL",
    "https://skvb.sportwinner.de/php/skvb/service.php",
)
SPORTWINNER_REFERER = os.getenv("SPORTWINNER_REFERER", "https://skvb.sportwinner.de/")
SPORTWINNER_TIMEOUT_SECONDS = float(os.getenv("SPORTWINNER_TIMEOUT_SECONDS", "12"))
SPORTWINNER_SLEEP_SECONDS = float(os.getenv("SPORTWINNER_SLEEP_SECONDS", "0.25"))
SPORTWINNER_USER_AGENT = os.getenv(
    "SPORTWINNER_USER_AGENT",
    "KegelMirrorDB/1.0 (+https://github.com/KEGELN/WEBPAGE)",
)

DEFAULT_CURRENT_SEASON_ONLY = os.getenv("MIRROR_DB_CURRENT_SEASON_ONLY", "1") != "0"
DEFAULT_FULL_BOOTSTRAP = os.getenv("MIRROR_DB_FULL_BOOTSTRAP", "0") == "1"

PROD_SNAPSHOT_DIR = Path(os.getenv("MIRROR_DB_PROD_SNAPSHOT_DIR", ROOT_DIR / "artifacts"))

SCHEMA_VERSION = "1"


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    PROD_SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
