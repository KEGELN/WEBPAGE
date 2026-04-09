from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

from common import json_hash, utc_now


class TrainingImporter:
    def __init__(self, conn: sqlite3.Connection, json_path: Path) -> None:
        self.conn = conn
        self.json_path = json_path

    def import_from_json(self, force: bool = False) -> dict[str, int]:
        if not self.json_path.exists():
            raise FileNotFoundError(f"Training JSON not found: {self.json_path}")

        payload = json.loads(self.json_path.read_text(encoding="utf-8"))
        payload_digest = json_hash(payload)
        row = self.conn.execute(
            "SELECT payload_hash FROM imports WHERE source = ?",
            ("training_db.json",),
        ).fetchone()

        if row and row["payload_hash"] == payload_digest and not force:
            logging.info("training import skipped; payload unchanged")
            return {"players": 0, "sessions": 0, "throws": 0, "messages": 0}

        logging.info("importing training data from %s", self.json_path)
        now = utc_now()
        self.conn.execute("DELETE FROM trainer_messages")
        self.conn.execute("DELETE FROM training_throws")
        self.conn.execute("DELETE FROM training_sessions")
        self.conn.execute("DELETE FROM trainers")
        self.conn.execute("DELETE FROM players")

        players = payload.get("players", [])
        trainers = payload.get("trainers", [])
        sessions = payload.get("sessions", [])
        messages = payload.get("trainerMessages", [])

        player_map = {player["id"]: dict(player) for player in players}
        for session in sessions:
            player_id = session["playerId"]
            if player_id not in player_map:
                player_map[player_id] = {
                    "id": player_id,
                    "name": session.get("playerName") or session.get("recorderName") or player_id,
                    "trainerEmail": session["trainerEmail"],
                    "createdAt": session["timestamp"],
                    "username": None,
                    "tempPassword": None,
                    "passwordResetRequired": False,
                }
        for message in messages:
            player_id = message["playerId"]
            if player_id not in player_map:
                player_map[player_id] = {
                    "id": player_id,
                    "name": player_id,
                    "trainerEmail": message["trainerEmail"],
                    "createdAt": message["createdAt"],
                    "username": None,
                    "tempPassword": None,
                    "passwordResetRequired": False,
                }
        normalized_players = list(player_map.values())

        self.conn.executemany(
            """
            INSERT INTO players (
              id, name, trainer_email, created_at, username, temp_password, password_reset_required
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    player["id"],
                    player["name"],
                    player["trainerEmail"],
                    player["createdAt"],
                    player.get("username"),
                    player.get("tempPassword"),
                    1 if player.get("passwordResetRequired", True) else 0,
                )
                for player in normalized_players
            ],
        )

        self.conn.executemany(
            "INSERT INTO trainers (email, name, role) VALUES (?, ?, ?)",
            [(trainer["email"], trainer["name"], trainer.get("role", "trainer")) for trainer in trainers],
        )

        self.conn.executemany(
            """
            INSERT INTO training_sessions (
              id, player_id, player_name, trainer_email, timestamp, type, recorder_id, recorder_name, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'training_db.json')
            """,
            [
                (
                    session["id"],
                    session["playerId"],
                    session.get("playerName"),
                    session["trainerEmail"],
                    session["timestamp"],
                    session.get("type", "standard"),
                    session.get("recorderId"),
                    session.get("recorderName"),
                )
                for session in sessions
            ],
        )

        throw_rows: list[tuple[Any, ...]] = []
        for session in sessions:
            default_throws = session.get("throws") or []
            for idx, throw in enumerate(default_throws, start=1):
                pins = throw.get("pins", [])
                throw_rows.append(
                    (
                        session["id"],
                        0,
                        idx,
                        throw.get("id"),
                        json.dumps(pins, ensure_ascii=False),
                        len(pins),
                        throw.get("timestamp") or session["timestamp"],
                    )
                )

            for lane_no, lane_throws in (session.get("lanes") or {}).items():
                for idx, throw in enumerate(lane_throws or [], start=1):
                    pins = throw.get("pins", [])
                    throw_rows.append(
                        (
                            session["id"],
                            int(lane_no),
                            idx,
                            throw.get("id"),
                            json.dumps(pins, ensure_ascii=False),
                            len(pins),
                            throw.get("timestamp") or session["timestamp"],
                        )
                    )

        self.conn.executemany(
            """
            INSERT INTO training_throws (
              session_id, lane_no, throw_index, throw_id, pins_json, holz, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            throw_rows,
        )

        self.conn.executemany(
            """
            INSERT INTO trainer_messages (id, player_id, trainer_email, text, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    message["id"],
                    message["playerId"],
                    message["trainerEmail"],
                    message["text"],
                    message["createdAt"],
                )
                for message in messages
            ],
        )

        self.conn.execute(
            """
            INSERT INTO imports (source, payload_hash, imported_at, row_count)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(source) DO UPDATE SET
              payload_hash = excluded.payload_hash,
              imported_at = excluded.imported_at,
              row_count = excluded.row_count
            """,
            ("training_db.json", payload_digest, now, len(normalized_players) + len(sessions) + len(throw_rows)),
        )
        self.conn.commit()

        logging.info(
            "training import complete: %s players, %s sessions, %s throws, %s messages",
            len(normalized_players),
            len(sessions),
            len(throw_rows),
            len(messages),
        )
        return {
            "players": len(normalized_players),
            "sessions": len(sessions),
            "throws": len(throw_rows),
            "messages": len(messages),
        }
