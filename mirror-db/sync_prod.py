from __future__ import annotations

import json
import shutil
from pathlib import Path

from common import utc_now
from config import PROD_SNAPSHOT_DIR, SPORTWINNER_DB_PATH, TRAINING_DB_PATH, ensure_directories


def copy_db(source: Path, target_dir: Path) -> str:
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / source.name
    shutil.copy2(source, destination)
    return str(destination)


def main() -> None:
    ensure_directories()
    manifest = {
        "generated_at": utc_now(),
        "databases": {
            "sportwinner": copy_db(SPORTWINNER_DB_PATH, PROD_SNAPSHOT_DIR),
            "training": copy_db(TRAINING_DB_PATH, PROD_SNAPSHOT_DIR),
        },
    }
    (PROD_SNAPSHOT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
