#!/usr/bin/env python3
"""
Export SportWinner season data to CSV for all leagues.

Usage examples:
  python scripts/export_season_dataset.py --season-id 11
  python scripts/export_season_dataset.py --season-id 11 --header-set game_only --output data/season11_games.csv
  python scripts/export_season_dataset.py --season-id 11 --header-set xgboost_enriched

Header presets:
  - raw_all: one row per API row (GetSpiel, GetTabelle, GetSchnitt, GetSpieltagArray)
             includes mapped columns + raw_00..raw_39 for maximum recoverability.
  - game_only: one row per game with core match fields.
  - xgboost_enriched: one row per game with core match fields + standings/schnitt joins.
  - player_vs_player: one row per player-vs-opponent duel perspective from GetSpielerInfo.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Global API path so you can switch to another compatible source quickly.
API_BASE_URL = os.getenv("SPORT_API_BASE_URL", "https://skvb.sportwinner.de/php/skvb/service.php")
API_REFERER = os.getenv("SPORT_API_REFERER", "https://skvb.sportwinner.de/")
API_TIMEOUT_SECONDS = int(os.getenv("SPORT_API_TIMEOUT", "30"))


LEAGUE_COLS = [
    "liga_id",
    "league_art_flag",
    "league_name",
    "league_unknown_3",
    "league_contact_name",
    "league_contact_tel1",
    "league_contact_tel2",
    "league_contact_email1",
    "league_contact_email2",
]

SPIELTAG_COLS = ["spieltag_id", "spieltag_nr", "spieltag_label", "spieltag_status"]

GAME_COLS = [
    "game_id",
    "match_date",
    "match_time",
    "home_team",
    "home_points_raw",
    "home_aux_raw",
    "away_team",
    "away_points_raw",
    "away_aux_raw",
    "match_status",
    "match_note_1",
    "match_note_2",
    "competition_label",
    "match_note_3",
]

SPIELPLAN_COLS = [
    "spieltag_nr",
    "game_id",
    "game_nr",
    "date_time",
    "team_home",
    "team_away",
    "result",
    "points_home",
    "points_away",
]

# Indices >= 19 are often empty in samples; keep as unknown columns + raws.
TABELLE_COLS = [
    "team_id",
    "table_position",
    "team_name",
    "table_unknown_3",
    "games_played",
    "wins",
    "losses",
    "table_points",
    "table_col_08",
    "table_col_09",
    "table_col_10",
    "table_col_11",
    "table_col_12",
    "table_col_13",
    "table_col_14",
    "table_col_15",
    "table_col_16",
    "table_col_17",
    "table_col_18",
]

# Two different index layouts are used in project code; keep both interpretations.
SCHNITT_COLS = [
    "schnitt_rank",
    "player_name",
    "player_club",
    "player_category",
    "s_games_layout_a",
    "s_avg_layout_a",
    "s_mp_layout_a",
    "s_games_home_layout_a",
    "s_avg_home_layout_a",
    "s_mp_home_layout_a",
    "s_games_away_layout_a",
    "s_avg_away_layout_a",
    "s_mp_away_layout_a",
    "s_best_game_layout_a",
]

RAW_COL_COUNT = 40


@dataclass
class LeagueInfo:
    liga_id: str
    league_name: str
    district_id: str
    row: list[Any]


class SportwinnerClient:
    def __init__(self, base_url: str = API_BASE_URL, referer: str = API_REFERER, timeout: int = API_TIMEOUT_SECONDS):
        self.base_url = base_url
        self.referer = referer
        self.timeout = timeout

    def call(self, command: str, **params: Any) -> list[list[Any]]:
        payload = {"command": command}
        for k, v in params.items():
            if v is None or v == "":
                continue
            payload[k] = str(v)

        body = urlencode(payload).encode("utf-8")
        req = Request(
            self.base_url,
            data=body,
            method="POST",
            headers={
                "Referer": self.referer,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "season-dataset-exporter/1.0",
            },
        )

        try:
            with urlopen(req, timeout=self.timeout) as res:
                data = json.loads(res.read().decode("utf-8", errors="replace"))
                if isinstance(data, list):
                    return data
                return []
        except HTTPError as exc:
            print(f"[warn] HTTP {exc.code} for {command} params={payload}", file=sys.stderr)
            return []
        except URLError as exc:
            print(f"[warn] URL error for {command}: {exc}", file=sys.stderr)
            return []
        except json.JSONDecodeError as exc:
            print(f"[warn] JSON decode error for {command}: {exc}", file=sys.stderr)
            return []


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_float_maybe(value: Any) -> float | None:
    text = normalize_text(value)
    if not text:
        return None
    text = text.replace(".", "").replace(",", ".") if re.search(r"\d+[,\.]\d+", text) else text
    try:
        return float(text)
    except ValueError:
        return None


def parse_int_maybe(value: Any) -> int | None:
    text = normalize_text(value)
    if not text:
        return None
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    f = parse_float_maybe(text)
    if f is None:
        return None
    if int(f) == f:
        return int(f)
    return None


def parse_date_ddmmyyyy(value: Any) -> str:
    text = normalize_text(value)
    if not text:
        return ""
    try:
        return datetime.strptime(text, "%d.%m.%Y").date().isoformat()
    except ValueError:
        return text


def split_date_time(value: Any) -> tuple[str, str]:
    text = normalize_text(value)
    if not text:
        return "", ""
    m = re.match(r"^(\d{1,2}\.\d{1,2}\.\d{4})(?:\s+(\d{1,2}:\d{2}))?$", text)
    if m:
        return m.group(1) or "", m.group(2) or ""
    return text, ""


def row_to_dict(row: list[Any], cols: list[str], prefix_raw: str = "raw_") -> dict[str, Any]:
    out: dict[str, Any] = {}
    for i, name in enumerate(cols):
        out[name] = row[i] if i < len(row) else ""
    for i in range(RAW_COL_COUNT):
        out[f"{prefix_raw}{i:02d}"] = row[i] if i < len(row) else ""
    out["raw_len"] = len(row)
    return out


def fetch_leagues_for_season(client: SportwinnerClient, season_id: str, league_art: str = "1") -> list[LeagueInfo]:
    districts = client.call("GetBezirkArray", id_saison=season_id)

    district_ids = ["0"]
    district_ids.extend([normalize_text(d[0]) for d in districts if d and normalize_text(d[0])])
    district_ids = list(dict.fromkeys(district_ids))

    leagues_by_id: dict[str, LeagueInfo] = {}
    for district_id in district_ids:
        rows = client.call(
            "GetLigaArray",
            id_saison=season_id,
            id_bezirk=district_id,
            favorit="",
            art=league_art,
        )
        for row in rows:
            liga_id = normalize_text(row[0] if len(row) > 0 else "")
            if not liga_id:
                continue
            leagues_by_id[liga_id] = LeagueInfo(
                liga_id=liga_id,
                league_name=normalize_text(row[2] if len(row) > 2 else ""),
                district_id=district_id,
                row=row,
            )

    return sorted(leagues_by_id.values(), key=lambda x: int(x.liga_id) if x.liga_id.isdigit() else x.liga_id)


def merge_games_from_spielplan(
    spielplan_rows: list[list[Any]],
    getspiel_rows: list[list[Any]],
) -> list[list[Any]]:
    """
    Build GAME_COLS-like rows, driven by GetSpielplan (all scheduled games).
    Enrich with GetSpiel row if same game_id exists.
    """
    getspiel_by_id: dict[str, list[Any]] = {}
    for row in getspiel_rows:
        gid = normalize_text(row[0] if len(row) > 0 else "")
        if gid and gid not in getspiel_by_id:
            getspiel_by_id[gid] = row

    merged: list[list[Any]] = []
    seen_ids: set[str] = set()

    for sp in spielplan_rows:
        spd = row_to_dict(sp, SPIELPLAN_COLS, prefix_raw="spielplan_raw_")
        gid = normalize_text(spd.get("game_id"))
        if not gid or gid in seen_ids:
            continue
        seen_ids.add(gid)

        date_from_plan, time_from_plan = split_date_time(spd.get("date_time"))
        g = getspiel_by_id.get(gid)

        # Create GAME_COLS row
        game_row = [""] * len(GAME_COLS)
        game_row[0] = gid
        game_row[1] = normalize_text(g[1] if g and len(g) > 1 else date_from_plan)
        game_row[2] = normalize_text(g[2] if g and len(g) > 2 else time_from_plan)
        game_row[3] = normalize_text(g[3] if g and len(g) > 3 else spd.get("team_home"))
        game_row[4] = normalize_text(g[4] if g and len(g) > 4 else spd.get("points_home"))
        game_row[5] = normalize_text(g[5] if g and len(g) > 5 else "")
        game_row[6] = normalize_text(g[6] if g and len(g) > 6 else spd.get("team_away"))
        game_row[7] = normalize_text(g[7] if g and len(g) > 7 else spd.get("points_away"))
        game_row[8] = normalize_text(g[8] if g and len(g) > 8 else "")
        game_row[9] = normalize_text(g[9] if g and len(g) > 9 else "")
        game_row[10] = normalize_text(g[10] if g and len(g) > 10 else spd.get("result"))
        game_row[11] = normalize_text(g[11] if g and len(g) > 11 else spd.get("spieltag_nr"))
        game_row[12] = normalize_text(g[12] if g and len(g) > 12 else "")
        game_row[13] = normalize_text(g[13] if g and len(g) > 13 else "")
        merged.append(game_row)

    # Add any leftover GetSpiel rows not present in GetSpielplan
    for g in getspiel_rows:
        gid = normalize_text(g[0] if len(g) > 0 else "")
        if gid and gid not in seen_ids:
            merged.append(g)
            seen_ids.add(gid)

    return merged


def build_lookup_standings(rows: list[list[Any]]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        d = row_to_dict(row, TABELLE_COLS, prefix_raw="table_raw_")
        team = normalize_text(d.get("team_name"))
        if not team:
            continue
        out[team] = {
            "table_position": parse_int_maybe(d.get("table_position")),
            "table_points": parse_float_maybe(d.get("table_points")),
            "wins": parse_int_maybe(d.get("wins")),
            "losses": parse_int_maybe(d.get("losses")),
            "games_played": parse_int_maybe(d.get("games_played")),
        }
    return out


def build_lookup_schnitt(rows: list[list[Any]]) -> dict[str, dict[str, Any]]:
    club_sum = defaultdict(lambda: {"n": 0, "avg_total_sum": 0.0, "best_game_max": None})

    for row in rows:
        d = row_to_dict(row, SCHNITT_COLS, prefix_raw="schnitt_raw_")
        club = normalize_text(d.get("player_club"))
        if not club:
            continue

        # Layout A mapping (from server/api-handler.ts)
        avg_a = parse_float_maybe(d.get("s_avg_layout_a"))
        best_a = parse_float_maybe(d.get("s_best_game_layout_a"))

        # Layout B mapping (from lib/api-service.ts older mapping)
        avg_b = parse_float_maybe(row[9] if len(row) > 9 else "")
        best_b = parse_float_maybe(row[13] if len(row) > 13 else "")

        avg = avg_a if avg_a is not None else avg_b
        best = best_a if best_a is not None else best_b

        if avg is not None:
            club_sum[club]["avg_total_sum"] += avg
            club_sum[club]["n"] += 1

        if best is not None:
            current = club_sum[club]["best_game_max"]
            if current is None or best > current:
                club_sum[club]["best_game_max"] = best

    out: dict[str, dict[str, Any]] = {}
    for club, agg in club_sum.items():
        n = int(agg["n"])
        out[club] = {
            "club_player_rows": n,
            "club_avg_player_avg_total": (agg["avg_total_sum"] / n) if n > 0 else None,
            "club_best_game_max": agg["best_game_max"],
        }
    return out


def build_rows_raw_all(
    season_id: str,
    league: LeagueInfo,
    matchdays: list[list[Any]],
    games: list[list[Any]],
    standings: list[list[Any]],
    schnitt: list[list[Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    league_meta = row_to_dict(league.row, LEAGUE_COLS, prefix_raw="league_raw_")
    common = {
        "season_id": season_id,
        "league_id": league.liga_id,
        "league_name": league.league_name,
        "district_id": league.district_id,
        **league_meta,
    }

    for i, r in enumerate(matchdays):
        rows.append({
            **common,
            "source": "spieltag",
            "source_row_idx": i,
            **row_to_dict(r, SPIELTAG_COLS),
        })

    for i, r in enumerate(games):
        rows.append({
            **common,
            "source": "spiel",
            "source_row_idx": i,
            **row_to_dict(r, GAME_COLS),
        })

    for i, r in enumerate(standings):
        rows.append({
            **common,
            "source": "tabelle",
            "source_row_idx": i,
            **row_to_dict(r, TABELLE_COLS),
        })

    for i, r in enumerate(schnitt):
        rows.append({
            **common,
            "source": "schnitt",
            "source_row_idx": i,
            **row_to_dict(r, SCHNITT_COLS),
        })

    return rows


def build_rows_game_only(
    season_id: str,
    league: LeagueInfo,
    games: list[list[Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for i, game in enumerate(games):
        g = row_to_dict(game, GAME_COLS, prefix_raw="game_raw_")
        rows.append({
            "season_id": season_id,
            "league_id": league.liga_id,
            "league_name": league.league_name,
            "district_id": league.district_id,
            "game_row_idx": i,
            "game_id": normalize_text(g.get("game_id")),
            "match_date": normalize_text(g.get("match_date")),
            "match_date_iso": parse_date_ddmmyyyy(g.get("match_date")),
            "match_time": normalize_text(g.get("match_time")),
            "home_team": normalize_text(g.get("home_team")),
            "away_team": normalize_text(g.get("away_team")),
            "home_points_raw": normalize_text(g.get("home_points_raw")),
            "away_points_raw": normalize_text(g.get("away_points_raw")),
            "home_points": parse_float_maybe(g.get("home_points_raw")),
            "away_points": parse_float_maybe(g.get("away_points_raw")),
            "point_diff": (
                (parse_float_maybe(g.get("home_points_raw")) or 0.0)
                - (parse_float_maybe(g.get("away_points_raw")) or 0.0)
            )
            if parse_float_maybe(g.get("home_points_raw")) is not None and parse_float_maybe(g.get("away_points_raw")) is not None
            else None,
            "match_status": normalize_text(g.get("match_status")),
            "competition_label": normalize_text(g.get("competition_label")),
        })

    return rows


def build_rows_xgboost_enriched(
    season_id: str,
    league: LeagueInfo,
    games: list[list[Any]],
    standings: list[list[Any]],
    schnitt: list[list[Any]],
) -> list[dict[str, Any]]:
    table = build_lookup_standings(standings)
    schnitt_lookup = build_lookup_schnitt(schnitt)

    rows: list[dict[str, Any]] = []
    for base in build_rows_game_only(season_id, league, games):
        home = base["home_team"]
        away = base["away_team"]

        home_table = table.get(home, {})
        away_table = table.get(away, {})

        home_s = schnitt_lookup.get(home, {})
        away_s = schnitt_lookup.get(away, {})

        row = {
            **base,
            "home_table_position": home_table.get("table_position"),
            "away_table_position": away_table.get("table_position"),
            "home_table_points": home_table.get("table_points"),
            "away_table_points": away_table.get("table_points"),
            "home_games_played": home_table.get("games_played"),
            "away_games_played": away_table.get("games_played"),
            "home_wins": home_table.get("wins"),
            "away_wins": away_table.get("wins"),
            "home_losses": home_table.get("losses"),
            "away_losses": away_table.get("losses"),
            "home_table_rank_advantage": (
                away_table.get("table_position") - home_table.get("table_position")
                if isinstance(home_table.get("table_position"), int)
                and isinstance(away_table.get("table_position"), int)
                else None
            ),
            "home_club_player_rows": home_s.get("club_player_rows"),
            "away_club_player_rows": away_s.get("club_player_rows"),
            "home_club_avg_player_avg_total": home_s.get("club_avg_player_avg_total"),
            "away_club_avg_player_avg_total": away_s.get("club_avg_player_avg_total"),
            "home_club_best_game_max": home_s.get("club_best_game_max"),
            "away_club_best_game_max": away_s.get("club_best_game_max"),
            "club_avg_total_diff": (
                (home_s.get("club_avg_player_avg_total") or 0.0) - (away_s.get("club_avg_player_avg_total") or 0.0)
                if home_s.get("club_avg_player_avg_total") is not None and away_s.get("club_avg_player_avg_total") is not None
                else None
            ),
            "home_win_label": 1 if (base.get("point_diff") is not None and base.get("point_diff") > 0) else 0,
        }
        rows.append(row)

    return rows


def is_spielerinfo_totals_or_note(row: list[Any]) -> bool:
    if not isinstance(row, list):
        return True
    # Totals row pattern used in UI code
    if (
        len(row) > 15
        and normalize_text(row[0]) == ""
        and normalize_text(row[15]) == ""
        and normalize_text(row[5]) != ""
        and normalize_text(row[10]) != ""
    ):
        return True
    # Note rows or malformed rows
    if len(row) > 16:
        return True
    if normalize_text(row[0]) and all(normalize_text(v) == "" for v in row[1:]):
        return True
    return False


def build_rows_player_vs_player(
    season_id: str,
    league: LeagueInfo,
    game: list[Any],
    spieler_rows: list[list[Any]],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    g = row_to_dict(game, GAME_COLS, prefix_raw="game_raw_")

    game_id = normalize_text(g.get("game_id"))
    match_date = normalize_text(g.get("match_date"))
    match_time = normalize_text(g.get("match_time"))
    home_team = normalize_text(g.get("home_team"))
    away_team = normalize_text(g.get("away_team"))
    match_status = normalize_text(g.get("match_status"))
    competition_label = normalize_text(g.get("competition_label"))

    duel_idx = 0
    for row in spieler_rows:
        if is_spielerinfo_totals_or_note(row):
            continue

        left_name = normalize_text(row[0] if len(row) > 0 else "")
        right_name = normalize_text(row[15] if len(row) > 15 else "")

        # Keep only true duel rows
        if not left_name or not right_name:
            continue

        # UI mapping:
        # Left:  [1,2,3,4,kegel,sp,mp] = [1..7]
        # Right: [1,2,3,4,kegel,sp,mp] = [14,13,12,11,10,9,8]
        left_sets = [
            parse_float_maybe(row[1] if len(row) > 1 else ""),
            parse_float_maybe(row[2] if len(row) > 2 else ""),
            parse_float_maybe(row[3] if len(row) > 3 else ""),
            parse_float_maybe(row[4] if len(row) > 4 else ""),
        ]
        right_sets = [
            parse_float_maybe(row[14] if len(row) > 14 else ""),
            parse_float_maybe(row[13] if len(row) > 13 else ""),
            parse_float_maybe(row[12] if len(row) > 12 else ""),
            parse_float_maybe(row[11] if len(row) > 11 else ""),
        ]

        left_kegel = parse_float_maybe(row[5] if len(row) > 5 else "")
        left_sp = parse_float_maybe(row[6] if len(row) > 6 else "")
        left_mp = parse_float_maybe(row[7] if len(row) > 7 else "")

        right_mp = parse_float_maybe(row[8] if len(row) > 8 else "")
        right_sp = parse_float_maybe(row[9] if len(row) > 9 else "")
        right_kegel = parse_float_maybe(row[10] if len(row) > 10 else "")

        common = {
            "season_id": season_id,
            "league_id": league.liga_id,
            "league_name": league.league_name,
            "district_id": league.district_id,
            "game_id": game_id,
            "match_date": match_date,
            "match_date_iso": parse_date_ddmmyyyy(match_date),
            "match_time": match_time,
            "match_status": match_status,
            "competition_label": competition_label,
            "home_team": home_team,
            "away_team": away_team,
            "duel_row_idx": duel_idx,
        }

        # Left perspective row
        out.append(
            {
                **common,
                "player_name": left_name,
                "opponent_name": right_name,
                "player_team": home_team,
                "opponent_team": away_team,
                "player_is_home": 1,
                "opponent_is_home": 0,
                "player_set_1": left_sets[0],
                "player_set_2": left_sets[1],
                "player_set_3": left_sets[2],
                "player_set_4": left_sets[3],
                "opponent_set_1": right_sets[0],
                "opponent_set_2": right_sets[1],
                "opponent_set_3": right_sets[2],
                "opponent_set_4": right_sets[3],
                "player_kegel": left_kegel,
                "opponent_kegel": right_kegel,
                "player_sp": left_sp,
                "opponent_sp": right_sp,
                "player_mp": left_mp,
                "opponent_mp": right_mp,
                "kegel_diff": (left_kegel - right_kegel) if left_kegel is not None and right_kegel is not None else None,
                "sp_diff": (left_sp - right_sp) if left_sp is not None and right_sp is not None else None,
                "mp_diff": (left_mp - right_mp) if left_mp is not None and right_mp is not None else None,
                "player_mp_win_label": 1 if left_mp is not None and right_mp is not None and left_mp > right_mp else 0,
            }
        )

        # Right perspective row
        out.append(
            {
                **common,
                "player_name": right_name,
                "opponent_name": left_name,
                "player_team": away_team,
                "opponent_team": home_team,
                "player_is_home": 0,
                "opponent_is_home": 1,
                "player_set_1": right_sets[0],
                "player_set_2": right_sets[1],
                "player_set_3": right_sets[2],
                "player_set_4": right_sets[3],
                "opponent_set_1": left_sets[0],
                "opponent_set_2": left_sets[1],
                "opponent_set_3": left_sets[2],
                "opponent_set_4": left_sets[3],
                "player_kegel": right_kegel,
                "opponent_kegel": left_kegel,
                "player_sp": right_sp,
                "opponent_sp": left_sp,
                "player_mp": right_mp,
                "opponent_mp": left_mp,
                "kegel_diff": (right_kegel - left_kegel) if left_kegel is not None and right_kegel is not None else None,
                "sp_diff": (right_sp - left_sp) if left_sp is not None and right_sp is not None else None,
                "mp_diff": (right_mp - left_mp) if left_mp is not None and right_mp is not None else None,
                "player_mp_win_label": 1 if left_mp is not None and right_mp is not None and right_mp > left_mp else 0,
            }
        )

        duel_idx += 1

    return out


def collect_rows(client: SportwinnerClient, season_id: str, header_set: str, league_art: str) -> list[dict[str, Any]]:
    leagues = fetch_leagues_for_season(client, season_id, league_art=league_art)
    if not leagues:
        print("[warn] no leagues returned for this season", file=sys.stderr)
        return []

    all_rows: list[dict[str, Any]] = []

    for idx, league in enumerate(leagues, start=1):
        print(f"[info] league {idx}/{len(leagues)}: {league.liga_id} {league.league_name}", file=sys.stderr)

        matchdays = client.call("GetSpieltagArray", id_saison=season_id, id_liga=league.liga_id)
        getspiel_games = client.call(
            "GetSpiel",
            id_saison=season_id,
            id_klub=0,
            id_bezirk=0,
            id_liga=league.liga_id,
            id_spieltag=0,
            favorit="",
            art_bezirk=2,
            art_liga=0,
            art_spieltag=0,
        )
        spielplan_games = client.call("GetSpielplan", id_saison=season_id, id_liga=league.liga_id)
        games = merge_games_from_spielplan(spielplan_games, getspiel_games) if spielplan_games else getspiel_games
        standings = client.call("GetTabelle", id_saison=season_id, id_liga=league.liga_id, nr_spieltag=100, sort=0)
        schnitt = client.call(
            "GetSchnitt",
            id_saison=season_id,
            id_liga=league.liga_id,
            id_klub=0,
            nr_spieltag=100,
            sort=0,
            anzahl=1,
        )

        if header_set == "raw_all":
            rows = build_rows_raw_all(season_id, league, matchdays, games, standings, schnitt)
        elif header_set == "game_only":
            rows = build_rows_game_only(season_id, league, games)
        elif header_set == "xgboost_enriched":
            rows = build_rows_xgboost_enriched(season_id, league, games, standings, schnitt)
        elif header_set == "player_vs_player":
            rows = []
            for game in games:
                game_id = normalize_text(game[0] if len(game) > 0 else "")
                if not game_id:
                    continue
                spieler_rows = client.call(
                    "GetSpielerInfo",
                    id_saison=season_id,
                    id_spiel=game_id,
                    wertung=1,
                )
                rows.extend(build_rows_player_vs_player(season_id, league, game, spieler_rows))
        else:
            raise ValueError(f"Unsupported header set: {header_set}")

        all_rows.extend(rows)

    return all_rows


def write_csv(output_path: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            f.write("\n")
        return

    headers: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for key in row.keys():
            if key not in seen:
                seen.add(key)
                headers.append(key)

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def print_header_options() -> None:
    options = {
        "raw_all": [
            "season_id",
            "league_id",
            "league_name",
            "district_id",
            "source",
            "source_row_idx",
            "mapped fields for each source",
            "raw_00..raw_39",
        ],
        "game_only": [
            "season_id",
            "league_id",
            "league_name",
            "game_id",
            "match_date",
            "match_time",
            "home_team",
            "away_team",
            "home_points",
            "away_points",
            "point_diff",
            "match_status",
            "competition_label",
        ],
        "xgboost_enriched": [
            "game_only fields",
            "home_table_position",
            "away_table_position",
            "home_table_points",
            "away_table_points",
            "home_games_played",
            "away_games_played",
            "home_wins",
            "away_wins",
            "home_losses",
            "away_losses",
            "home_table_rank_advantage",
            "home_club_avg_player_avg_total",
            "away_club_avg_player_avg_total",
            "home_club_best_game_max",
            "away_club_best_game_max",
            "club_avg_total_diff",
            "home_win_label",
        ],
        "player_vs_player": [
            "season_id",
            "league_id",
            "league_name",
            "district_id",
            "game_id",
            "match_date",
            "match_time",
            "home_team",
            "away_team",
            "duel_row_idx",
            "player_name",
            "opponent_name",
            "player_team",
            "opponent_team",
            "player_is_home",
            "player_set_1..player_set_4",
            "opponent_set_1..opponent_set_4",
            "player_kegel",
            "opponent_kegel",
            "player_sp",
            "opponent_sp",
            "player_mp",
            "opponent_mp",
            "kegel_diff",
            "sp_diff",
            "mp_diff",
            "player_mp_win_label",
        ],
    }

    print("Header set options:")
    for key, cols in options.items():
        print(f"- {key}")
        for c in cols:
            print(f"  - {c}")


def build_default_output(season_id: str, header_set: str) -> str:
    return f"data/season_{season_id}_{header_set}.csv"


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a full season dataset from SportWinner-like API")
    parser.add_argument("--season-id", required=True, help="Season ID (id_saison), e.g. 11")
    parser.add_argument(
        "--header-set",
        default="player_vs_player",
        choices=["raw_all", "game_only", "xgboost_enriched", "player_vs_player"],
        help="CSV header preset",
    )
    parser.add_argument("--league-art", default="1", help="GetLigaArray art parameter (default: 1)")
    parser.add_argument("--output", default=None, help="Output CSV path")
    parser.add_argument("--list-header-sets", action="store_true", help="Print available header presets and exit")

    args = parser.parse_args()

    if args.list_header_sets:
        print_header_options()
        return 0

    out_path = args.output or build_default_output(args.season_id, args.header_set)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    client = SportwinnerClient()
    print(f"[info] using API_BASE_URL={client.base_url}", file=sys.stderr)

    rows = collect_rows(client, args.season_id, args.header_set, args.league_art)
    write_csv(out_path, rows)

    print(f"[done] wrote {len(rows)} rows to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
