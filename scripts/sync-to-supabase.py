#!/usr/bin/env python3
"""
Sync local mirror-db SQLite databases to Supabase PostgreSQL.

Usage:
    python3 scripts/sync-to-supabase.py --init          # Create tables and sync all data
    python3 scripts/sync-to-supabase.py --training    # Sync only training data
    python3 scripts/sync-to-supabase.py --mirror      # Sync only mirror (Sportwinner) data
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "mirror-db"))
from common import connect_sqlite
from config import SPORTWINNER_DB_PATH, TRAINING_DB_PATH

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("psycopg2-binary required: pip install psycopg2-binary")
    sys.exit(1)


def get_supabase_pool():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    return psycopg2.connect(database_url)


def row_to_dict(row):
    result = {}
    for key in row.keys():
        result[key] = row[key]
    return result


def fetch_all(conn, query):
    rows = conn.execute(query).fetchall()
    return [row_to_dict(row) for row in rows]


def create_training_tables(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS training_players (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            mirror_player_name TEXT,
            trainer_email TEXT NOT NULL,
            created_at TEXT NOT NULL,
            username TEXT NOT NULL,
            temp_password TEXT NOT NULL,
            password_reset_required BOOLEAN NOT NULL DEFAULT true
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS trainers (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'trainer'
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS training_sessions (
            id TEXT PRIMARY KEY,
            player_id TEXT NOT NULL,
            player_name TEXT,
            trainer_email TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            recorder_id TEXT,
            recorder_name TEXT,
            throws_json JSONB NOT NULL DEFAULT '[]',
            lanes_json JSONB
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS trainer_messages (
            id TEXT PRIMARY KEY,
            player_id TEXT NOT NULL,
            trainer_email TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    print("Training tables created.")


def create_mirror_tables(cur):
    cur.execute("""
        CREATE TABLE IF NOT EXISTS player_search_index (
            player_key TEXT PRIMARY KEY,
            player_name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            club_name TEXT,
            season_id TEXT,
            league_id TEXT,
            game_count INTEGER NOT NULL DEFAULT 0,
            last_game_date TEXT,
            updated_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS club_search_index (
            club_key TEXT PRIMARY KEY,
            club_name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            club_number TEXT,
            season_id TEXT,
            game_count INTEGER NOT NULL DEFAULT 0,
            last_game_date TEXT,
            updated_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS games (
            game_id TEXT PRIMARY KEY,
            season_id TEXT NOT NULL,
            league_id TEXT,
            district_id TEXT,
            wertung TEXT,
            matchday_id TEXT,
            matchday_nr TEXT,
            matchday_label TEXT,
            game_nr TEXT,
            game_date TEXT,
            game_time TEXT,
            date_time_text TEXT,
            team_home TEXT NOT NULL,
            team_away TEXT NOT NULL,
            normalized_home TEXT NOT NULL,
            normalized_away TEXT NOT NULL,
            result TEXT,
            points_home TEXT,
            points_away TEXT,
            score_home INTEGER,
            score_away INTEGER,
            status TEXT,
            status_detail TEXT,
            league_context TEXT,
            source TEXT NOT NULL,
            detail_payload_hash TEXT,
            detail_fetched_at TEXT,
            updated_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS game_player_rows (
            id SERIAL PRIMARY KEY,
            game_id TEXT NOT NULL,
            row_index INTEGER NOT NULL,
            player_home TEXT,
            lane1_home TEXT,
            lane2_home TEXT,
            lane3_home TEXT,
            lane4_home TEXT,
            total_home TEXT,
            sp_home TEXT,
            mp_home TEXT,
            separator_value TEXT,
            mp_away TEXT,
            sp_away TEXT,
            total_away TEXT,
            lane4_away TEXT,
            lane3_away TEXT,
            lane2_away TEXT,
            lane1_away TEXT,
            player_away TEXT,
            is_note_row BOOLEAN NOT NULL DEFAULT false,
            is_totals_row BOOLEAN NOT NULL DEFAULT false,
            raw_row_json JSONB NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS seasons (
            season_id TEXT PRIMARY KEY,
            year INTEGER NOT NULL,
            status INTEGER NOT NULL,
            is_current BOOLEAN NOT NULL DEFAULT false,
            fetched_at TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS districts (
            season_id TEXT NOT NULL,
            district_id TEXT NOT NULL,
            name TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            PRIMARY KEY (season_id, district_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS leagues (
            season_id TEXT NOT NULL,
            league_id TEXT NOT NULL,
            district_id TEXT,
            art TEXT,
            wertung TEXT,
            name TEXT NOT NULL,
            kontakt_name TEXT,
            kontakt_tel1 TEXT,
            kontakt_tel2 TEXT,
            kontakt_email1 TEXT,
            kontakt_email2 TEXT,
            fetched_at TEXT NOT NULL,
            PRIMARY KEY (season_id, league_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS clubs_mirror (
            club_key TEXT PRIMARY KEY,
            club_name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            club_number TEXT,
            source TEXT NOT NULL,
            season_id TEXT,
            first_seen_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL
        )
    """)
    print("Mirror tables created.")


def sync_training_data(pg_conn):
    print("Syncing training data...")
    sqlite_conn = connect_sqlite(TRAINING_DB_PATH)

    try:
        cur = pg_conn.cursor()

        trainers = fetch_all(sqlite_conn, "SELECT * FROM trainers")
        if trainers:
            cur.execute("DELETE FROM trainers")
            execute_batch(
                cur,
                """
                INSERT INTO trainers (email, name, role) 
                VALUES (%(email)s, %(name)s, %(role)s)
            """,
                trainers,
            )
            print(f"  Synced {len(trainers)} trainers")

        players = fetch_all(sqlite_conn, "SELECT * FROM players")
        if players:
            cur.execute("DELETE FROM training_players")
            execute_batch(
                cur,
                """
                INSERT INTO training_players 
                (id, name, mirror_player_name, trainer_email, created_at, username, temp_password, password_reset_required)
                VALUES (%(id)s, %(name)s, %(trainer_email)s, %(trainer_email)s, %(created_at)s, 
                        COALESCE(%(username)s, %(id)s), COALESCE(%(temp_password)s, %(id)s), 
                        COALESCE(%(password_reset_required)s, 1)::boolean)
            """,
                players,
            )
            print(f"  Synced {len(players)} players")

        sessions = fetch_all(sqlite_conn, "SELECT * FROM training_sessions")
        if sessions:
            sessions_with_throws = []
            throws = fetch_all(
                sqlite_conn,
                "SELECT * FROM training_throws ORDER BY session_id, lane_no, throw_index",
            )
            throws_by_session = {}
            for throw in throws:
                throws_by_session.setdefault(str(throw["session_id"]), []).append(
                    {
                        "id": throw.get("throw_id"),
                        "pins": json.loads(str(throw["pins_json"]))
                        if throw["pins_json"]
                        else [],
                        "timestamp": throw.get("timestamp"),
                    }
                )

            for session in sessions:
                flat_throws = throws_by_session.get(str(session["id"]), [])
                lane_map = {}
                for throw in flat_throws:
                    pass

                lane_map = {}
                for throw in flat_throws:
                    pass

                sessions_with_throws.append(
                    {
                        "id": session["id"],
                        "player_id": session["player_id"],
                        "player_name": session.get("player_name"),
                        "trainer_email": session["trainer_email"],
                        "timestamp": session["timestamp"],
                        "type": session.get("type", "standard"),
                        "recorder_id": session.get("recorder_id"),
                        "recorder_name": session.get("recorder_name"),
                        "throws_json": json.dumps(flat_throws),
                        "lanes_json": json.dumps(lane_map) if lane_map else None,
                    }
                )

            cur.execute("DELETE FROM training_sessions")
            execute_batch(
                cur,
                """
                INSERT INTO training_sessions 
                (id, player_id, player_name, trainer_email, timestamp, type, recorder_id, recorder_name, throws_json, lanes_json)
                VALUES (%(id)s, %(player_id)s, %(player_name)s, %(trainer_email)s, %(timestamp)s, %(type)s,
                        %(recorder_id)s, %(recorder_name)s, %(throws_json)s::jsonb, %(lanes_json)s::jsonb)
            """,
                sessions_with_throws,
            )
            print(f"  Synced {len(sessions)} sessions with throws")

        messages = fetch_all(sqlite_conn, "SELECT * FROM trainer_messages")
        if messages:
            cur.execute("DELETE FROM trainer_messages")
            execute_batch(
                cur,
                """
                INSERT INTO trainer_messages (id, player_id, trainer_email, text, created_at)
                VALUES (%(id)s, %(player_id)s, %(trainer_email)s, %(text)s, %(created_at)s)
            """,
                messages,
            )
            print(f"  Synced {len(messages)} messages")

        pg_conn.commit()
        print("Training data sync complete!")

    finally:
        sqlite_conn.close()


def sync_mirror_data(pg_conn):
    print("Syncing mirror (Sportwinner) data...")
    sqlite_conn = connect_sqlite(SPORTWINNER_DB_PATH)

    try:
        cur = pg_conn.cursor()

        cur.execute("DELETE FROM player_search_index")
        players = fetch_all(sqlite_conn, "SELECT * FROM player_search_index")
        if players:
            execute_batch(
                cur,
                """
                INSERT INTO player_search_index 
                (player_key, player_name, normalized_name, club_name, season_id, league_id, game_count, last_game_date, updated_at)
                VALUES (%(player_key)s, %(player_name)s, %(normalized_name)s, %(club_name)s, %(season_id)s, %(league_id)s,
                        %(game_count)s, %(last_game_date)s, %(updated_at)s)
            """,
                players,
            )
            print(f"  Synced {len(players)} player search entries")

        cur.execute("DELETE FROM club_search_index")
        clubs = fetch_all(sqlite_conn, "SELECT * FROM club_search_index")
        if clubs:
            execute_batch(
                cur,
                """
                INSERT INTO club_search_index 
                (club_key, club_name, normalized_name, club_number, season_id, game_count, last_game_date, updated_at)
                VALUES (%(club_key)s, %(club_name)s, %(normalized_name)s, %(club_number)s, %(season_id)s,
                        %(game_count)s, %(last_game_date)s, %(updated_at)s)
            """,
                clubs,
            )
            print(f"  Synced {len(clubs)} club search entries")

        cur.execute("DELETE FROM games")
        games = fetch_all(sqlite_conn, "SELECT * FROM games")
        if games:
            execute_batch(
                cur,
                """
                INSERT INTO games 
                (game_id, season_id, league_id, district_id, wertung, matchday_id, matchday_nr, matchday_label,
                 game_nr, game_date, game_time, date_time_text, team_home, team_away, normalized_home, normalized_away,
                 result, points_home, points_away, score_home, score_away, status, status_detail, league_context,
                 source, detail_payload_hash, detail_fetched_at, updated_at)
                VALUES (%(game_id)s, %(season_id)s, %(league_id)s, %(district_id)s, %(wertung)s, %(matchday_id)s,
                        %(matchday_nr)s, %(matchday_label)s, %(game_nr)s, %(game_date)s, %(game_time)s, %(date_time_text)s,
                        %(team_home)s, %(team_away)s, %(normalized_home)s, %(normalized_away)s, %(result)s,
                        %(points_home)s, %(points_away)s, %(score_home)s, %(score_away)s, %(status)s, %(status_detail)s,
                        %(league_context)s, %(source)s, %(detail_payload_hash)s, %(detail_fetched_at)s, %(updated_at)s)
            """,
                games,
            )
            print(f"  Synced {len(games)} games")

        cur.execute("DELETE FROM game_player_rows")
        rows = fetch_all(
            sqlite_conn, "SELECT * FROM game_player_rows ORDER BY game_id, row_index"
        )
        if rows:
            rows_for_insert = []
            for row in rows:
                rows_for_insert.append(
                    {
                        "game_id": row["game_id"],
                        "row_index": row["row_index"],
                        "player_home": row.get("player_home"),
                        "lane1_home": row.get("lane1_home"),
                        "lane2_home": row.get("lane2_home"),
                        "lane3_home": row.get("lane3_home"),
                        "lane4_home": row.get("lane4_home"),
                        "total_home": row.get("total_home"),
                        "sp_home": row.get("sp_home"),
                        "mp_home": row.get("mp_home"),
                        "separator_value": row.get("separator_value"),
                        "mp_away": row.get("mp_away"),
                        "sp_away": row.get("sp_away"),
                        "total_away": row.get("total_away"),
                        "lane4_away": row.get("lane4_away"),
                        "lane3_away": row.get("lane3_away"),
                        "lane2_away": row.get("lane2_away"),
                        "lane1_away": row.get("lane1_away"),
                        "player_away": row.get("player_away"),
                        "is_note_row": bool(row.get("is_note_row", 0)),
                        "is_totals_row": bool(row.get("is_totals_row", 0)),
                        "raw_row_json": row.get("raw_row_json"),
                        "created_at": row.get("created_at"),
                    }
                )
            execute_batch(
                cur,
                """
                INSERT INTO game_player_rows 
                (game_id, row_index, player_home, lane1_home, lane2_home, lane3_home, lane4_home,
                 total_home, sp_home, mp_home, separator_value, mp_away, sp_away, total_away,
                 lane4_away, lane3_away, lane2_away, lane1_away, player_away,
                 is_note_row, is_totals_row, raw_row_json, created_at)
                VALUES (%(game_id)s, %(row_index)s, %(player_home)s, %(lane1_home)s, %(lane2_home)s,
                        %(lane3_home)s, %(lane4_home)s, %(total_home)s, %(sp_home)s, %(mp_home)s,
                        %(separator_value)s, %(mp_away)s, %(sp_away)s, %(total_away)s, %(lane4_away)s,
                        %(lane3_away)s, %(lane2_away)s, %(lane1_away)s, %(player_away)s,
                        %(is_note_row)s, %(is_totals_row)s, %(raw_row_json)s::jsonb, %(created_at)s)
            """,
                rows_for_insert,
            )
            print(f"  Synced {len(rows_for_insert)} game player rows")

        cur.execute("DELETE FROM seasons")
        seasons = fetch_all(sqlite_conn, "SELECT * FROM seasons")
        if seasons:
            execute_batch(
                cur,
                """
                INSERT INTO seasons (season_id, year, status, is_current, fetched_at)
                VALUES (%(season_id)s, %(year)s, %(status)s, %(is_current)s::boolean, %(fetched_at)s)
            """,
                seasons,
            )
            print(f"  Synced {len(seasons)} seasons")

        cur.execute("DELETE FROM districts")
        districts = fetch_all(sqlite_conn, "SELECT * FROM districts")
        if districts:
            execute_batch(
                cur,
                """
                INSERT INTO districts (season_id, district_id, name, fetched_at)
                VALUES (%(season_id)s, %(district_id)s, %(name)s, %(fetched_at)s)
            """,
                districts,
            )
            print(f"  Synced {len(districts)} districts")

        cur.execute("DELETE FROM leagues")
        leagues = fetch_all(sqlite_conn, "SELECT * FROM leagues")
        if leagues:
            execute_batch(
                cur,
                """
                INSERT INTO leagues 
                (season_id, league_id, district_id, art, wertung, name, kontakt_name, kontakt_tel1, kontakt_tel2,
                 kontakt_email1, kontakt_email2, fetched_at)
                VALUES (%(season_id)s, %(league_id)s, %(district_id)s, %(art)s, %(wertung)s, %(name)s,
                        %(kontakt_name)s, %(kontakt_tel1)s, %(kontakt_tel2)s, %(kontakt_email1)s, %(kontakt_email2)s, %(fetched_at)s)
            """,
                leagues,
            )
            print(f"  Synced {len(leagues)} leagues")

        pg_conn.commit()
        print("Mirror data sync complete!")

    finally:
        sqlite_conn.close()


def main():
    parser = argparse.ArgumentParser(description="Sync local mirror-db to Supabase")
    parser.add_argument(
        "--init", action="store_true", help="Create tables and sync all data"
    )
    parser.add_argument(
        "--training", action="store_true", help="Sync only training data"
    )
    parser.add_argument(
        "--mirror", action="store_true", help="Sync only mirror (Sportwinner) data"
    )
    args = parser.parse_args()

    if not any([args.init, args.training, args.mirror]):
        parser.print_help()
        return

    pg_conn = get_supabase_pool()

    try:
        if args.init:
            print("Creating tables...")
            with pg_conn.cursor() as cur:
                create_training_tables(cur)
                create_mirror_tables(cur)
                pg_conn.commit()

        if args.init or args.training:
            sync_training_data(pg_conn)

        if args.init or args.mirror:
            sync_mirror_data(pg_conn)

        print("Done!")

    finally:
        pg_conn.close()


if __name__ == "__main__":
    main()
