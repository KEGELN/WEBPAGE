from __future__ import annotations

import json
import logging
import sqlite3
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request

from common import german_date_to_iso, json_hash, normalize_text, parse_int, utc_now
from config import (
    DEFAULT_CURRENT_SEASON_ONLY,
    SPORTWINNER_API_URL,
    SPORTWINNER_REFERER,
    SPORTWINNER_SLEEP_SECONDS,
    SPORTWINNER_TIMEOUT_SECONDS,
    SPORTWINNER_USER_AGENT,
)


def first_non_empty(*values: str | None) -> str | None:
    for value in values:
        if value not in (None, ""):
            return value
    return None


@dataclass
class BuildOptions:
    full_refresh: bool = False
    current_season_only: bool = DEFAULT_CURRENT_SEASON_ONLY
    season_ids: list[str] | None = None
    force_details: bool = False


class SportwinnerClient:
    def __init__(self) -> None:
        self.base_url = SPORTWINNER_API_URL
        self.timeout = SPORTWINNER_TIMEOUT_SECONDS
        self.sleep_seconds = SPORTWINNER_SLEEP_SECONDS

    def request(self, command: str, **params: Any) -> list[list[Any]]:
        payload: dict[str, str] = {"command": command}
        for key, value in params.items():
            if value in (None, ""):
                continue
            payload[key] = str(value)
        body = parse.urlencode(payload).encode("utf-8")
        req = request.Request(
            self.base_url,
            data=body,
            headers={
                "Referer": SPORTWINNER_REFERER,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": SPORTWINNER_USER_AGENT,
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except error.URLError as exc:
            logging.warning("sportwinner request failed for %s: %s", command, exc)
            return []
        finally:
            if self.sleep_seconds:
                time.sleep(self.sleep_seconds)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logging.warning("sportwinner returned invalid json for %s", command)
            return []
        return data if isinstance(data, list) else []


class SportwinnerMirrorBuilder:
    def __init__(self, conn: sqlite3.Connection, client: SportwinnerClient | None = None) -> None:
        self.conn = conn
        self.client = client or SportwinnerClient()

    def run(self, options: BuildOptions) -> dict[str, int]:
        if options.full_refresh:
            self._clear_existing()

        seasons = self._fetch_seasons()
        if not seasons:
            logging.warning("no seasons returned from sportwinner")
            return {"seasons": 0, "leagues": 0, "games": 0, "details": 0}

        target_seasons = self._select_target_seasons(seasons, options)
        logging.info(
            "sportwinner sync targeting seasons: %s",
            ", ".join(season["season_id"] for season in target_seasons),
        )

        league_count = 0
        game_count = 0
        detail_count = 0

        for season in target_seasons:
            season_id = season["season_id"]
            logging.info("syncing season %s", season_id)
            districts = self._fetch_districts(season_id, options.current_season_only)
            league_rows = self._fetch_leagues(season_id, districts, options.current_season_only)
            league_count += len(league_rows)
            logging.info("season %s has %s mirrored leagues", season_id, len(league_rows))
            for league in league_rows:
                games, details = self._sync_league(
                    season_id=season_id,
                    league=league,
                    current_season_only=options.current_season_only,
                    force_details=options.force_details,
                )
                game_count += games
                detail_count += details

        self._refresh_search_indexes()
        self.conn.commit()
        return {
            "seasons": len(target_seasons),
            "leagues": league_count,
            "games": game_count,
            "details": detail_count,
        }

    def _clear_existing(self) -> None:
        logging.info("clearing existing sportwinner mirror tables")
        for table in [
            "player_search_index",
            "club_search_index",
            "game_player_sets",
            "game_player_rows",
            "standings_snapshots",
            "game_results",
            "games",
            "clubs",
            "league_matchdays",
            "leagues",
            "districts",
            "seasons",
            "raw_payloads",
        ]:
            self.conn.execute(f"DELETE FROM {table}")
        self.conn.commit()

    def _select_target_seasons(
        self,
        seasons: list[dict[str, Any]],
        options: BuildOptions,
    ) -> list[dict[str, Any]]:
        if options.season_ids:
            allowed = set(options.season_ids)
            return [season for season in seasons if season["season_id"] in allowed]
        if options.current_season_only and not options.full_refresh:
            return [self._current_season(seasons)]
        return seasons

    def _current_season(self, seasons: list[dict[str, Any]]) -> dict[str, Any]:
        for season in seasons:
            if str(season["status"]) == "0":
                return season
        return seasons[0]

    def _store_raw(
        self,
        command: str,
        payload: list[list[Any]],
        params: dict[str, Any],
        current_season_only: bool,
    ) -> str:
        now = utc_now()
        digest = json_hash(payload)
        self.conn.execute(
            """
            INSERT INTO raw_payloads (
              source, command, season_id, district_id, league_id, game_id,
              params_json, payload_json, payload_hash, fetched_at, current_season_only
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "sportwinner",
                command,
                params.get("id_saison"),
                params.get("id_bezirk"),
                params.get("id_liga"),
                params.get("id_spiel"),
                json.dumps(params, ensure_ascii=False, sort_keys=True),
                json.dumps(payload, ensure_ascii=False),
                digest,
                now,
                1 if current_season_only else 0,
            ),
        )
        return digest

    def _fetch_seasons(self) -> list[dict[str, Any]]:
        payload = self.client.request("GetSaisonArray")
        self._store_raw("GetSaisonArray", payload, {}, False)
        current = self._current_season(
            [
                {"season_id": str(row[0]), "year": int(row[1]), "status": int(row[2])}
                for row in payload
                if len(row) >= 3
            ]
        ) if payload else None
        now = utc_now()
        for row in payload:
            if len(row) < 3:
                continue
            season_id = str(row[0])
            year = int(row[1])
            status = int(row[2])
            self.conn.execute(
                """
                INSERT INTO seasons (season_id, year, status, is_current, fetched_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(season_id) DO UPDATE SET
                  year = excluded.year,
                  status = excluded.status,
                  is_current = excluded.is_current,
                  fetched_at = excluded.fetched_at
                """,
                (season_id, year, status, 1 if current and season_id == current["season_id"] else 0, now),
            )
        self.conn.commit()
        return [
            {"season_id": str(row[0]), "year": int(row[1]), "status": int(row[2])}
            for row in payload
            if len(row) >= 3
        ]

    def _fetch_districts(self, season_id: str, current_season_only: bool) -> list[dict[str, str]]:
        params = {"id_saison": season_id}
        payload = self.client.request("GetBezirkArray", **params)
        self._store_raw("GetBezirkArray", payload, params, current_season_only)
        now = utc_now()
        districts: list[dict[str, str]] = []
        for row in payload:
            if len(row) < 2:
                continue
            district = {"district_id": str(row[0]), "name": str(row[1])}
            districts.append(district)
            self.conn.execute(
                """
                INSERT INTO districts (season_id, district_id, name, fetched_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(season_id, district_id) DO UPDATE SET
                  name = excluded.name,
                  fetched_at = excluded.fetched_at
                """,
                (season_id, district["district_id"], district["name"], now),
            )
        self.conn.commit()
        return districts

    def _fetch_leagues(
        self,
        season_id: str,
        districts: list[dict[str, str]],
        current_season_only: bool,
    ) -> list[dict[str, str]]:
        seen: dict[str, dict[str, str]] = {}
        district_ids = ["0", *[district["district_id"] for district in districts]]
        now = utc_now()
        for district_id in district_ids:
            for art in ("1", "2"):
                params = {
                    "id_saison": season_id,
                    "id_bezirk": district_id,
                    "favorit": "",
                    "art": art,
                }
                payload = self.client.request("GetLigaArray", **params)
                self._store_raw("GetLigaArray", payload, params, current_season_only)
                for row in payload:
                    if len(row) < 3:
                        continue
                    league_id = str(row[0])
                    league = {
                        "season_id": season_id,
                        "league_id": league_id,
                        "district_id": None if district_id == "0" else district_id,
                        "art": art,
                        "wertung": str(row[1]) if len(row) > 1 else "",
                        "name": str(row[2]),
                        "kontakt_name": str(row[4]) if len(row) > 4 else "",
                        "kontakt_tel1": str(row[5]) if len(row) > 5 else "",
                        "kontakt_tel2": str(row[6]) if len(row) > 6 else "",
                        "kontakt_email1": str(row[7]) if len(row) > 7 else "",
                        "kontakt_email2": str(row[8]) if len(row) > 8 else "",
                    }
                    if league_id not in seen or (not seen[league_id].get("district_id") and league["district_id"]):
                        seen[league_id] = league
                    self.conn.execute(
                        """
                        INSERT INTO leagues (
                          season_id, league_id, district_id, art, wertung, name,
                          kontakt_name, kontakt_tel1, kontakt_tel2, kontakt_email1, kontakt_email2, fetched_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(season_id, league_id) DO UPDATE SET
                          district_id = COALESCE(excluded.district_id, leagues.district_id),
                          art = excluded.art,
                          wertung = excluded.wertung,
                          name = excluded.name,
                          kontakt_name = excluded.kontakt_name,
                          kontakt_tel1 = excluded.kontakt_tel1,
                          kontakt_tel2 = excluded.kontakt_tel2,
                          kontakt_email1 = excluded.kontakt_email1,
                          kontakt_email2 = excluded.kontakt_email2,
                          fetched_at = excluded.fetched_at
                        """,
                        (
                            season_id,
                            league_id,
                            league["district_id"],
                            art,
                            league["wertung"],
                            league["name"],
                            league["kontakt_name"],
                            league["kontakt_tel1"],
                            league["kontakt_tel2"],
                            league["kontakt_email1"],
                            league["kontakt_email2"],
                            now,
                        ),
                    )
        self.conn.commit()
        return list(seen.values())

    def _sync_league(
        self,
        season_id: str,
        league: dict[str, str],
        current_season_only: bool,
        force_details: bool,
    ) -> tuple[int, int]:
        league_id = league["league_id"]
        logging.info("syncing league %s (%s)", league_id, league["name"])
        params = {"id_saison": season_id, "id_liga": league_id}
        matchday_rows = self.client.request("GetSpieltagArray", **params)
        self._store_raw("GetSpieltagArray", matchday_rows, params, current_season_only)
        now = utc_now()
        for row in matchday_rows:
            if len(row) < 4:
                continue
            self.conn.execute(
                """
                INSERT INTO league_matchdays (
                  season_id, league_id, matchday_id, matchday_nr, label, status, fetched_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(season_id, league_id, matchday_id) DO UPDATE SET
                  matchday_nr = excluded.matchday_nr,
                  label = excluded.label,
                  status = excluded.status,
                  fetched_at = excluded.fetched_at
                """,
                (season_id, league_id, str(row[0]), str(row[1]), str(row[2]), str(row[3]), now),
            )

        plan_rows = self.client.request("GetSpielplan", **params)
        self._store_raw("GetSpielplan", plan_rows, params, current_season_only)

        fallback_params = {
            "id_saison": season_id,
            "id_klub": "0",
            "id_bezirk": league.get("district_id") or "0",
            "id_liga": league_id,
            "id_spieltag": "0",
            "favorit": "",
            "art_bezirk": "2" if league.get("district_id") else "1",
            "art_liga": "0",
            "art_spieltag": "0",
        }
        fallback_rows = self.client.request("GetSpiel", **fallback_params)
        self._store_raw("GetSpiel", fallback_rows, fallback_params, current_season_only)

        standings_params = {"id_saison": season_id, "id_liga": league_id, "nr_spieltag": "100", "sort": "0"}
        standings_rows = self.client.request("GetTabelle", **standings_params)
        self._store_raw("GetTabelle", standings_rows, standings_params, current_season_only)
        self.conn.execute(
            "DELETE FROM standings_snapshots WHERE season_id = ? AND league_id = ? AND spieltag_nr = '100' AND sort_key = '0'",
            (season_id, league_id),
        )
        for idx, row in enumerate(standings_rows):
            self.conn.execute(
                """
                INSERT INTO standings_snapshots (
                  season_id, league_id, spieltag_nr, sort_key, row_index, team_id, position, team_name, raw_row_json, fetched_at
                ) VALUES (?, ?, '100', '0', ?, ?, ?, ?, ?, ?)
                """,
                (
                    season_id,
                    league_id,
                    idx,
                    str(row[0]) if len(row) > 0 else None,
                    str(row[1]) if len(row) > 1 else None,
                    str(row[2]) if len(row) > 2 else None,
                    json.dumps(row, ensure_ascii=False),
                    now,
                ),
            )
            if len(row) > 2:
                self._upsert_club(str(row[2]), season_id, None)

        games = self._merge_games(
            season_id=season_id,
            league=league,
            plan_rows=plan_rows,
            fallback_rows=fallback_rows,
        )
        detail_count = 0
        for game in games.values():
            self._upsert_game(game)
            if self._should_fetch_details(game, force_details):
                detail_count += 1 if self._sync_game_details(game, current_season_only) else 0

        self.conn.commit()
        logging.info(
            "league %s complete: %s games, %s detail refreshes",
            league_id,
            len(games),
            detail_count,
        )
        return len(games), detail_count

    def _merge_games(
        self,
        season_id: str,
        league: dict[str, str],
        plan_rows: list[list[Any]],
        fallback_rows: list[list[Any]],
    ) -> dict[str, dict[str, Any]]:
        games: dict[str, dict[str, Any]] = {}
        for row in plan_rows:
            if len(row) < 6:
                continue
            game_id = str(row[1])
            score_home = parse_int(row[7]) if len(row) > 7 else None
            score_away = parse_int(row[8]) if len(row) > 8 else None
            games[game_id] = {
                "game_id": game_id,
                "season_id": season_id,
                "league_id": league["league_id"],
                "district_id": league.get("district_id"),
                "wertung": league.get("wertung"),
                "matchday_label": str(row[0]),
                "matchday_nr": "".join(ch for ch in str(row[0]) if ch.isdigit()) or None,
                "game_nr": str(row[2]) if len(row) > 2 else None,
                "date_time_text": str(row[3]) if len(row) > 3 else "",
                "game_date": self._extract_iso_date(str(row[3])),
                "game_time": self._extract_time(str(row[3])),
                "team_home": str(row[4]),
                "team_away": str(row[5]),
                "result": str(row[6]) if len(row) > 6 else "",
                "points_home": str(row[7]) if len(row) > 7 else "",
                "points_away": str(row[8]) if len(row) > 8 else "",
                "score_home": score_home,
                "score_away": score_away,
                "status": "beendet" if str(row[6]).strip() else "offen",
                "status_detail": "",
                "league_context": league["name"],
                "source": "GetSpielplan",
                "updated_at": utc_now(),
            }
        for row in fallback_rows:
            if len(row) < 10:
                continue
            game_id = str(row[0])
            game = games.setdefault(
                game_id,
                {
                    "game_id": game_id,
                    "season_id": season_id,
                    "league_id": league["league_id"],
                    "district_id": league.get("district_id"),
                    "wertung": league.get("wertung"),
                    "matchday_label": None,
                    "matchday_nr": None,
                    "game_nr": None,
                    "date_time_text": "",
                    "game_date": german_date_to_iso(str(row[1])),
                    "game_time": str(row[2]),
                    "team_home": str(row[3]),
                    "team_away": str(row[6]),
                    "result": "",
                    "points_home": str(row[4]),
                    "points_away": str(row[7]),
                    "score_home": parse_int(row[4]),
                    "score_away": parse_int(row[7]),
                    "status": str(row[9]),
                    "status_detail": str(row[10]) if len(row) > 10 else "",
                    "league_context": str(row[12]) if len(row) > 12 else league["name"],
                    "source": "GetSpiel",
                    "updated_at": utc_now(),
                },
            )
            game["game_date"] = first_non_empty(game.get("game_date"), german_date_to_iso(str(row[1])))
            game["game_time"] = first_non_empty(game.get("game_time"), str(row[2]))
            game["date_time_text"] = first_non_empty(game.get("date_time_text"), f"{row[1]} {row[2]}".strip())
            game["team_home"] = first_non_empty(game.get("team_home"), str(row[3]))
            game["team_away"] = first_non_empty(game.get("team_away"), str(row[6]))
            game["status"] = first_non_empty(str(row[9]), game.get("status")) or ""
            game["status_detail"] = first_non_empty(str(row[10]) if len(row) > 10 else "", game.get("status_detail")) or ""
            if not game.get("matchday_label") and len(row) > 12:
                game["matchday_label"] = str(row[12]).split("/")[-1].strip()
                game["matchday_nr"] = "".join(ch for ch in game["matchday_label"] if ch.isdigit()) or None
            if len(row) > 4 and not game.get("score_home"):
                game["score_home"] = parse_int(row[4])
                game["points_home"] = str(row[4])
            if len(row) > 7 and not game.get("score_away"):
                game["score_away"] = parse_int(row[7])
                game["points_away"] = str(row[7])

        for game in games.values():
            game["normalized_home"] = normalize_text(game["team_home"])
            game["normalized_away"] = normalize_text(game["team_away"])
            self._upsert_club(game["team_home"], season_id, None)
            self._upsert_club(game["team_away"], season_id, None)
        return games

    def _extract_iso_date(self, value: str) -> str | None:
        for part in value.split():
            iso = german_date_to_iso(part)
            if iso:
                return iso
        return None

    def _extract_time(self, value: str) -> str | None:
        for part in value.split():
            if ":" in part:
                return part
        return None

    def _upsert_club(self, club_name: str, season_id: str | None, club_number: str | None) -> None:
        if not club_name or club_name == "-":
            return
        now = utc_now()
        club_key = normalize_text(club_name)
        self.conn.execute(
            """
            INSERT INTO clubs (club_key, club_name, normalized_name, club_number, source, season_id, first_seen_at, last_seen_at)
            VALUES (?, ?, ?, ?, 'sportwinner', ?, ?, ?)
            ON CONFLICT(club_key) DO UPDATE SET
              club_name = excluded.club_name,
              club_number = COALESCE(excluded.club_number, clubs.club_number),
              season_id = COALESCE(excluded.season_id, clubs.season_id),
              last_seen_at = excluded.last_seen_at
            """,
            (club_key, club_name, club_key, club_number, season_id, now, now),
        )

    def _upsert_game(self, game: dict[str, Any]) -> None:
        self.conn.execute(
            """
            INSERT INTO games (
              game_id, season_id, league_id, district_id, wertung, matchday_id, matchday_nr, matchday_label,
              game_nr, game_date, game_time, date_time_text, team_home, team_away, normalized_home, normalized_away,
              result, points_home, points_away, score_home, score_away, status, status_detail, league_context, source, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_id) DO UPDATE SET
              season_id = excluded.season_id,
              league_id = excluded.league_id,
              district_id = excluded.district_id,
              wertung = excluded.wertung,
              matchday_id = COALESCE(excluded.matchday_id, games.matchday_id),
              matchday_nr = COALESCE(excluded.matchday_nr, games.matchday_nr),
              matchday_label = COALESCE(excluded.matchday_label, games.matchday_label),
              game_nr = COALESCE(excluded.game_nr, games.game_nr),
              game_date = COALESCE(excluded.game_date, games.game_date),
              game_time = COALESCE(excluded.game_time, games.game_time),
              date_time_text = COALESCE(excluded.date_time_text, games.date_time_text),
              team_home = excluded.team_home,
              team_away = excluded.team_away,
              normalized_home = excluded.normalized_home,
              normalized_away = excluded.normalized_away,
              result = COALESCE(excluded.result, games.result),
              points_home = COALESCE(excluded.points_home, games.points_home),
              points_away = COALESCE(excluded.points_away, games.points_away),
              score_home = COALESCE(excluded.score_home, games.score_home),
              score_away = COALESCE(excluded.score_away, games.score_away),
              status = COALESCE(excluded.status, games.status),
              status_detail = COALESCE(excluded.status_detail, games.status_detail),
              league_context = COALESCE(excluded.league_context, games.league_context),
              source = excluded.source,
              updated_at = excluded.updated_at
            """,
            (
                game["game_id"],
                game["season_id"],
                game["league_id"],
                game.get("district_id"),
                game.get("wertung"),
                game.get("matchday_id"),
                game.get("matchday_nr"),
                game.get("matchday_label"),
                game.get("game_nr"),
                game.get("game_date"),
                game.get("game_time"),
                game.get("date_time_text"),
                game["team_home"],
                game["team_away"],
                game["normalized_home"],
                game["normalized_away"],
                game.get("result"),
                game.get("points_home"),
                game.get("points_away"),
                game.get("score_home"),
                game.get("score_away"),
                game.get("status"),
                game.get("status_detail"),
                game.get("league_context"),
                game.get("source"),
                game.get("updated_at", utc_now()),
            ),
        )

    def _should_fetch_details(self, game: dict[str, Any], force_details: bool) -> bool:
        if force_details:
            return True
        status = (game.get("status") or "").lower()
        result = (game.get("result") or "").strip()
        if "beendet" in status:
            return True
        if result and ":" in result:
            return True
        return False

    def _sync_game_details(self, game: dict[str, Any], current_season_only: bool) -> bool:
        params = {
            "id_saison": game["season_id"],
            "id_spiel": game["game_id"],
            "wertung": game.get("wertung") or "1",
        }
        payload = self.client.request("GetSpielerInfo", **params)
        if not payload:
            return False
        digest = self._store_raw("GetSpielerInfo", payload, params, current_season_only)
        existing = self.conn.execute(
            "SELECT detail_payload_hash FROM games WHERE game_id = ?",
            (game["game_id"],),
        ).fetchone()
        if existing and existing["detail_payload_hash"] == digest:
            return False

        self.conn.execute("DELETE FROM game_player_sets WHERE game_id = ?", (game["game_id"],))
        self.conn.execute("DELETE FROM game_player_rows WHERE game_id = ?", (game["game_id"],))

        notes: list[str] = []
        for idx, row in enumerate(payload):
            if not isinstance(row, list):
                continue
            flags = self._row_flags(row)
            if flags["is_note_row"]:
                notes.append(" ".join(str(cell) for cell in row if cell not in (None, "")))
            self.conn.execute(
                """
                INSERT INTO game_player_rows (
                  game_id, row_index, player_home, lane1_home, lane2_home, lane3_home, lane4_home, total_home,
                  sp_home, mp_home, separator_value, mp_away, sp_away, total_away, lane4_away, lane3_away, lane2_away,
                  lane1_away, player_away, is_note_row, is_totals_row, raw_row_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    game["game_id"],
                    idx,
                    str(row[0]) if len(row) > 0 else None,
                    str(row[1]) if len(row) > 1 else None,
                    str(row[2]) if len(row) > 2 else None,
                    str(row[3]) if len(row) > 3 else None,
                    str(row[4]) if len(row) > 4 else None,
                    str(row[5]) if len(row) > 5 else None,
                    str(row[6]) if len(row) > 6 else None,
                    str(row[7]) if len(row) > 7 else None,
                    str(row[8]) if len(row) > 8 else None,
                    str(row[9]) if len(row) > 9 else None,
                    str(row[10]) if len(row) > 10 else None,
                    str(row[11]) if len(row) > 11 else None,
                    str(row[12]) if len(row) > 12 else None,
                    str(row[13]) if len(row) > 13 else None,
                    str(row[14]) if len(row) > 14 else None,
                    str(row[15]) if len(row) > 15 else None,
                    str(row[16]) if len(row) > 16 else None,
                    1 if flags["is_note_row"] else 0,
                    1 if flags["is_totals_row"] else 0,
                    json.dumps(row, ensure_ascii=False),
                    utc_now(),
                ),
            )
            self._insert_player_set_rows(game["game_id"], idx, row)

        is_completed = 1 if payload else 0
        self.conn.execute(
            """
            INSERT INTO game_results (
              game_id, season_id, league_id, league_name, spieltag, date_time, team_home, team_away, result,
              is_completed, notes, raw_table_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_id) DO UPDATE SET
              season_id = excluded.season_id,
              league_id = excluded.league_id,
              league_name = excluded.league_name,
              spieltag = excluded.spieltag,
              date_time = excluded.date_time,
              team_home = excluded.team_home,
              team_away = excluded.team_away,
              result = excluded.result,
              is_completed = excluded.is_completed,
              notes = excluded.notes,
              raw_table_json = excluded.raw_table_json,
              updated_at = excluded.updated_at
            """,
            (
                game["game_id"],
                game["season_id"],
                game["league_id"],
                game.get("league_context"),
                game.get("matchday_label"),
                game.get("date_time_text"),
                game["team_home"],
                game["team_away"],
                game.get("result"),
                is_completed,
                "\n".join(notes).strip() or None,
                json.dumps(payload, ensure_ascii=False),
                utc_now(),
            ),
        )
        self.conn.execute(
            """
            UPDATE games
            SET detail_payload_hash = ?, detail_fetched_at = ?, updated_at = ?
            WHERE game_id = ?
            """,
            (digest, utc_now(), utc_now(), game["game_id"]),
        )
        return True

    def _row_flags(self, row: list[Any]) -> dict[str, bool]:
        first_cell = str(row[0]) if row else ""
        is_note = first_cell.startswith("Hinweise")
        is_totals = first_cell.strip() == "-" and any(str(cell).strip() not in ("", "-") for cell in row[5:12])
        return {"is_note_row": is_note, "is_totals_row": is_totals}

    def _insert_player_set_rows(self, game_id: str, row_index: int, row: list[Any]) -> None:
        if len(row) < 17:
            return
        player_home = str(row[0]).strip()
        player_away = str(row[16]).strip()
        if player_home not in ("", "-", "Spieler", "Hinweise:"):
            for lane_no, cell_index in enumerate([1, 2, 3, 4], start=1):
                self.conn.execute(
                    """
                    INSERT INTO game_player_sets (game_id, row_index, side, player_name, lane_no, pins, created_at)
                    VALUES (?, ?, 'home', ?, ?, ?, ?)
                    """,
                    (game_id, row_index, player_home, lane_no, str(row[cell_index]), utc_now()),
                )
        if player_away not in ("", "-", "Spieler"):
            for lane_no, cell_index in zip([4, 3, 2, 1], [12, 13, 14, 15], strict=False):
                self.conn.execute(
                    """
                    INSERT INTO game_player_sets (game_id, row_index, side, player_name, lane_no, pins, created_at)
                    VALUES (?, ?, 'away', ?, ?, ?, ?)
                    """,
                    (game_id, row_index, player_away, lane_no, str(row[cell_index]), utc_now()),
                )

    def _refresh_search_indexes(self) -> None:
        now = utc_now()
        self.conn.execute("DELETE FROM player_search_index")
        self.conn.execute("DELETE FROM club_search_index")

        player_rows = self.conn.execute(
            """
            SELECT
              player_name,
              club_name,
              season_id,
              league_id,
              COUNT(*) AS game_count,
              MAX(game_date) AS last_game_date
            FROM (
              SELECT
                gpr.player_home AS player_name,
                g.team_home AS club_name,
                g.season_id AS season_id,
                g.league_id AS league_id,
                g.game_date AS game_date
              FROM game_player_rows gpr
              JOIN games g ON g.game_id = gpr.game_id
              WHERE gpr.player_home IS NOT NULL AND gpr.player_home NOT IN ('', '-', 'Spieler', 'Hinweise:')
              UNION ALL
              SELECT
                gpr.player_away AS player_name,
                g.team_away AS club_name,
                g.season_id AS season_id,
                g.league_id AS league_id,
                g.game_date AS game_date
              FROM game_player_rows gpr
              JOIN games g ON g.game_id = gpr.game_id
              WHERE gpr.player_away IS NOT NULL AND gpr.player_away NOT IN ('', '-', 'Spieler')
            )
            GROUP BY player_name, club_name, season_id, league_id
            """
        ).fetchall()

        for row in player_rows:
            player_key = f"{normalize_text(row['player_name'])}:{normalize_text(row['club_name'])}:{row['season_id']}:{row['league_id']}"
            self.conn.execute(
                """
                INSERT INTO player_search_index (
                  player_key, player_name, normalized_name, club_name, season_id, league_id, game_count, last_game_date, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    player_key,
                    row["player_name"],
                    normalize_text(row["player_name"]),
                    row["club_name"],
                    row["season_id"],
                    row["league_id"],
                    row["game_count"],
                    row["last_game_date"],
                    now,
                ),
            )

        club_rows = self.conn.execute(
            """
            SELECT club_name, MIN(season_id) AS season_id, COUNT(*) AS game_count, MAX(game_date) AS last_game_date
            FROM (
              SELECT team_home AS club_name, season_id, game_date FROM games
              UNION ALL
              SELECT team_away AS club_name, season_id, game_date FROM games
            )
            WHERE club_name IS NOT NULL AND club_name != ''
            GROUP BY club_name
            """
        ).fetchall()
        for row in club_rows:
            club_key = normalize_text(row["club_name"])
            self.conn.execute(
                """
                INSERT INTO club_search_index (
                  club_key, club_name, normalized_name, club_number, season_id, game_count, last_game_date, updated_at
                ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
                """,
                (
                    club_key,
                    row["club_name"],
                    club_key,
                    row["season_id"],
                    row["game_count"],
                    row["last_game_date"],
                    now,
                ),
            )
