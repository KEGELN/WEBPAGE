from __future__ import annotations

import argparse
import logging

from common import connect_sqlite, execute_script, load_sql, setup_logging
from config import SPORTWINNER_DB_PATH, TRAINING_DB_PATH, TRAINING_JSON_PATH, SQL_DIR, ensure_directories
from sources.sportwinner import BuildOptions, SportwinnerMirrorBuilder
from sources.training import TrainingImporter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build local mirror databases.")
    parser.add_argument("--source", choices=["sportwinner", "training", "all"], default="all")
    parser.add_argument("--full-refresh", action="store_true", help="Rebuild the selected database from scratch.")
    parser.add_argument(
        "--season-id",
        action="append",
        dest="season_ids",
        help="Explicit season id to import. Repeatable. If omitted, incremental mode uses only the current season.",
    )
    parser.add_argument("--all-seasons", action="store_true", help="Sync all seasons from Sportwinner.")
    parser.add_argument("--force-details", action="store_true", help="Refetch GetSpielerInfo for completed games.")
    parser.add_argument("--force-training-import", action="store_true", help="Force re-import of training_db.json.")
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def build_training(force_import: bool) -> None:
    conn = connect_sqlite(TRAINING_DB_PATH)
    try:
        execute_script(conn, load_sql(SQL_DIR / "training.sql"))
        importer = TrainingImporter(conn, TRAINING_JSON_PATH)
        stats = importer.import_from_json(force=force_import)
        logging.info("training build stats: %s", stats)
    finally:
        conn.close()


def build_sportwinner(args: argparse.Namespace) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        execute_script(conn, load_sql(SQL_DIR / "sportwinner.sql"))
        builder = SportwinnerMirrorBuilder(conn)
        stats = builder.run(
            BuildOptions(
                full_refresh=args.full_refresh,
                current_season_only=not args.all_seasons and not args.season_ids,
                season_ids=args.season_ids,
                force_details=args.force_details,
            )
        )
        logging.info("sportwinner build stats: %s", stats)
    finally:
        conn.close()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)
    ensure_directories()

    if args.source in ("training", "all"):
        build_training(force_import=args.force_training_import or args.full_refresh)
    if args.source in ("sportwinner", "all"):
        build_sportwinner(args)


if __name__ == "__main__":
    main()
