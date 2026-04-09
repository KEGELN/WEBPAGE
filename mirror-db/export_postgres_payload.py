from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

from common import connect_sqlite
from config import SPORTWINNER_DB_PATH, TRAINING_DB_PATH


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key in row.keys():
      payload[key] = row[key]
    return payload


def fetch_all(conn: sqlite3.Connection, query: str) -> list[dict[str, Any]]:
    rows = conn.execute(query).fetchall()
    return [row_to_dict(row) for row in rows]


def export_sportwinner() -> dict[str, Any]:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        return {
            "raw_payloads": fetch_all(conn, "SELECT * FROM raw_payloads ORDER BY id"),
            "seasons": fetch_all(conn, "SELECT * FROM seasons ORDER BY season_id"),
            "districts": fetch_all(conn, "SELECT * FROM districts ORDER BY season_id, district_id"),
            "league_matchdays": fetch_all(conn, "SELECT * FROM league_matchdays ORDER BY season_id, league_id, matchday_id"),
            "leagues": fetch_all(conn, "SELECT * FROM leagues ORDER BY season_id, league_id"),
            "clubs": fetch_all(conn, "SELECT * FROM clubs ORDER BY club_name, season_id"),
            "games": fetch_all(conn, "SELECT * FROM games ORDER BY game_date, game_time, game_id"),
            "game_results": fetch_all(conn, "SELECT * FROM game_results ORDER BY game_id"),
            "standings_snapshots": fetch_all(conn, "SELECT * FROM standings_snapshots ORDER BY id"),
            "game_player_rows": fetch_all(conn, "SELECT * FROM game_player_rows ORDER BY game_id, row_index"),
            "game_player_sets": fetch_all(conn, "SELECT * FROM game_player_sets ORDER BY game_id, row_index, side, lane_no"),
            "player_search_index": fetch_all(conn, "SELECT * FROM player_search_index ORDER BY player_name"),
            "club_search_index": fetch_all(conn, "SELECT * FROM club_search_index ORDER BY club_name"),
        }
    finally:
        conn.close()


def build_training_sessions(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    sessions = fetch_all(conn, "SELECT * FROM training_sessions ORDER BY timestamp DESC")
    throws = fetch_all(conn, "SELECT * FROM training_throws ORDER BY session_id, lane_no, throw_index")
    throws_by_session: dict[str, list[dict[str, Any]]] = {}
    for throw in throws:
        throws_by_session.setdefault(str(throw["session_id"]), []).append(throw)

    exported: list[dict[str, Any]] = []
    for session in sessions:
        session_id = str(session["id"])
        lane_map: dict[int, list[dict[str, Any]]] = {}
        flat_throws: list[dict[str, Any]] = []
        for throw in throws_by_session.get(session_id, []):
            payload = {
                "id": throw["throw_id"],
                "pins": json.loads(str(throw["pins_json"])),
                "timestamp": throw["timestamp"],
            }
            lane_no = int(throw["lane_no"])
            flat_throws.append(payload)
            if lane_no > 1:
                lane_map.setdefault(lane_no, []).append(payload)

        exported.append(
            {
                "id": session["id"],
                "player_id": session["player_id"],
                "player_name": session["player_name"],
                "trainer_email": session["trainer_email"],
                "timestamp": session["timestamp"],
                "type": session["type"],
                "recorder_id": session["recorder_id"],
                "recorder_name": session["recorder_name"],
                "throws_json": flat_throws if session["type"] == "standard" else [],
                "lanes_json": lane_map or None,
            }
        )
    return exported


def export_training() -> dict[str, Any]:
    conn = connect_sqlite(TRAINING_DB_PATH)
    try:
        return {
            "trainers": fetch_all(conn, "SELECT * FROM trainers ORDER BY email"),
            "training_players": fetch_all(conn, "SELECT * FROM players ORDER BY created_at DESC"),
            "training_sessions": build_training_sessions(conn),
            "trainer_messages": fetch_all(conn, "SELECT * FROM trainer_messages ORDER BY created_at DESC"),
        }
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export SQLite mirror databases as JSON for Postgres import.")
    parser.add_argument("--source", choices=["sportwinner", "training"], required=True)
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = export_sportwinner() if args.source == "sportwinner" else export_training()
    if args.pretty:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
