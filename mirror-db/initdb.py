from __future__ import annotations

import logging

from common import connect_sqlite, execute_script, load_sql, setup_logging, utc_now
from config import SCHEMA_VERSION, SPORTWINNER_DB_PATH, TRAINING_DB_PATH, SQL_DIR, ensure_directories


def init_db(path, schema_name: str) -> None:
    conn = connect_sqlite(path)
    try:
        execute_script(conn, load_sql(SQL_DIR / schema_name))
        conn.execute(
            """
            INSERT INTO meta (key, value) VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (SCHEMA_VERSION,),
        )
        conn.execute(
            """
            INSERT INTO meta (key, value) VALUES ('initialized_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (utc_now(),),
        )
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    setup_logging()
    ensure_directories()
    init_db(SPORTWINNER_DB_PATH, "sportwinner.sql")
    init_db(TRAINING_DB_PATH, "training.sql")
    logging.info("initialized sportwinner db at %s", SPORTWINNER_DB_PATH)
    logging.info("initialized training db at %s", TRAINING_DB_PATH)


if __name__ == "__main__":
    main()
