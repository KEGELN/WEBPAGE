from __future__ import annotations

import argparse
import json
import re
from typing import Iterable

from common import connect_sqlite
from config import SPORTWINNER_DB_PATH, TRAINING_DB_PATH


def print_rows(rows: Iterable[dict]) -> None:
    print(json.dumps(list(rows), ensure_ascii=False))


def parse_result_score(result: str | None) -> tuple[int, int] | None:
    match = re.search(r"(\d+)\s*:\s*(\d+)", str(result or ""))
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def search_players(query: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT
              player_name,
              MAX(club_name) AS club_name,
              SUM(game_count) AS game_count,
              MAX(last_game_date) AS last_game_date
            FROM player_search_index
            WHERE normalized_name LIKE ?
            GROUP BY player_name
            ORDER BY game_count DESC, last_game_date DESC
            LIMIT ?
            """,
            (f"%{''.join(ch.lower() for ch in query if ch.isalnum())}%", limit),
        ).fetchall()
        print_rows([dict(row) for row in rows])
    finally:
        conn.close()


def search_clubs(query: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT
              club_name,
              SUM(game_count) AS game_count,
              MAX(last_game_date) AS last_game_date
            FROM club_search_index
            WHERE normalized_name LIKE ?
            GROUP BY club_name
            ORDER BY game_count DESC, last_game_date DESC
            LIMIT ?
            """,
            (f"%{''.join(ch.lower() for ch in query if ch.isalnum())}%", limit),
        ).fetchall()
        print_rows([dict(row) for row in rows])
    finally:
        conn.close()


def player_history(player_name: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT g.game_id, g.game_date, g.team_home, g.team_away, g.result, g.league_context, gr.notes
            FROM game_player_rows gpr
            JOIN games g ON g.game_id = gpr.game_id
            LEFT JOIN game_results gr ON gr.game_id = g.game_id
            WHERE gpr.player_home = ? OR gpr.player_away = ?
            ORDER BY g.game_date DESC, g.game_time DESC
            LIMIT ?
            """,
            (player_name, player_name, limit),
        ).fetchall()
        print_rows([dict(row) for row in rows])
    finally:
        conn.close()


def club_history(club_name: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT game_id, game_date, team_home, team_away, result, league_context, status
            FROM games
            WHERE team_home = ? OR team_away = ?
            ORDER BY game_date DESC, game_time DESC
            LIMIT ?
            """,
            (club_name, club_name, limit),
        ).fetchall()
        print_rows([dict(row) for row in rows])
    finally:
        conn.close()


def game_detail(game_id: str) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        header = conn.execute(
            """
            SELECT g.*, gr.notes
            FROM games g
            LEFT JOIN game_results gr ON gr.game_id = g.game_id
            WHERE g.game_id = ?
            """,
            (game_id,),
        ).fetchone()
        rows = conn.execute(
            """
            SELECT raw_row_json
            FROM game_player_rows
            WHERE game_id = ?
            ORDER BY row_index
            """,
            (game_id,),
        ).fetchall()
        print(
            json.dumps(
                {
                    "header": dict(header) if header else None,
                    "rows": [json.loads(str(row["raw_row_json"])) for row in rows],
                },
                ensure_ascii=False,
            )
        )
    finally:
        conn.close()


def club_profile(club_name: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        game_rows = conn.execute(
            """
            SELECT game_id, game_date, game_time, team_home, team_away, result, score_home, score_away, league_context, matchday_label
            FROM games
            WHERE team_home = ? OR team_away = ?
            ORDER BY game_date DESC, game_time DESC
            """,
            (club_name, club_name),
        ).fetchall()

        if not game_rows:
            print(json.dumps({"found": False, "clubName": club_name}, ensure_ascii=False))
            return

        wins = 0
        losses = 0
        draws = 0
        history: list[dict[str, object | None]] = []
        for row in game_rows:
            is_home = row["team_home"] == club_name
            score_for = row["score_home"] if is_home else row["score_away"]
            score_against = row["score_away"] if is_home else row["score_home"]
            if score_for is None or score_against is None:
                parsed_result = parse_result_score(row["result"])
                if parsed_result:
                    score_home, score_away = parsed_result
                    score_for = score_home if is_home else score_away
                    score_against = score_away if is_home else score_home
            if score_for is not None and score_against is not None:
                if int(score_for) > int(score_against):
                    wins += 1
                elif int(score_for) < int(score_against):
                    losses += 1
                else:
                    draws += 1
            if len(history) < limit:
                history.append(
                    {
                        "gameId": row["game_id"],
                        "date": row["game_date"],
                        "time": row["game_time"],
                        "league": row["league_context"],
                        "spieltag": row["matchday_label"],
                        "opponentClub": row["team_away"] if is_home else row["team_home"],
                        "result": row["result"],
                        "teamResult": None if score_for is None or score_against is None else f"{score_for}:{score_against}",
                        "side": "home" if is_home else "away",
                    }
                )

        print(
            json.dumps(
                {
                    "found": True,
                    "clubName": club_name,
                    "gamesPlayed": len(game_rows),
                    "wins": wins,
                    "losses": losses,
                    "draws": draws,
                    "history": history,
                },
                ensure_ascii=False,
            )
        )
    finally:
        conn.close()


def training_summary(player_id: str) -> None:
    conn = connect_sqlite(TRAINING_DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT ts.id, ts.timestamp, ts.type, COUNT(tt.throw_index) AS throws, SUM(tt.holz) AS holz
            FROM training_sessions ts
            LEFT JOIN training_throws tt ON tt.session_id = ts.id
            WHERE ts.player_id = ?
            GROUP BY ts.id, ts.timestamp, ts.type
            ORDER BY ts.timestamp DESC
            """,
            (player_id,),
        ).fetchall()
        print_rows([dict(row) for row in rows])
    finally:
        conn.close()


def player_profile(player_name: str, limit: int) -> None:
    conn = connect_sqlite(SPORTWINNER_DB_PATH)
    try:
        history_rows = conn.execute(
            """
            SELECT
              g.game_id,
              g.game_date,
              g.game_time,
              g.team_home,
              g.team_away,
              g.result,
              g.score_home,
              g.score_away,
              g.league_context,
              g.matchday_label,
              gpr.player_home,
              gpr.total_home,
              gpr.sp_home,
              gpr.mp_home,
              gpr.player_away,
              gpr.total_away,
              gpr.sp_away,
              gpr.mp_away
            FROM game_player_rows gpr
            JOIN games g ON g.game_id = gpr.game_id
            WHERE gpr.player_home = ? OR gpr.player_away = ?
            ORDER BY g.game_date DESC, g.game_time DESC, gpr.row_index ASC
            """,
            (player_name, player_name),
        ).fetchall()

        if not history_rows:
            print(json.dumps({"playerName": player_name, "found": False}, ensure_ascii=False))
            return

        unique_games: set[str] = set()
        game_outcomes: dict[str, tuple[int, int]] = {}
        wins = 0
        losses = 0
        draws = 0
        total_holz = 0
        counted_rows = 0
        clubs: set[str] = set()
        history: list[dict[str, object | None]] = []

        for row in history_rows:
            is_home = row["player_home"] == player_name
            team_name = row["team_home"] if is_home else row["team_away"]
            opponent_team = row["team_away"] if is_home else row["team_home"]
            player_total = row["total_home"] if is_home else row["total_away"]
            player_sp = row["sp_home"] if is_home else row["sp_away"]
            player_mp = row["mp_home"] if is_home else row["mp_away"]
            score_for = row["score_home"] if is_home else row["score_away"]
            score_against = row["score_away"] if is_home else row["score_home"]
            if score_for is None or score_against is None:
                parsed_result = parse_result_score(row["result"])
                if parsed_result:
                    score_home, score_away = parsed_result
                    score_for = score_home if is_home else score_away
                    score_against = score_away if is_home else score_home
            game_id = str(row["game_id"])
            unique_games.add(game_id)
            clubs.add(str(team_name))
            try:
                total_holz += int(str(player_total).replace(",", "."))
                counted_rows += 1
            except ValueError:
                pass
            if score_for is not None and score_against is not None:
                game_outcomes[game_id] = (int(score_for), int(score_against))

            if len(history) < limit:
                history.append(
                    {
                        "gameId": row["game_id"],
                        "date": row["game_date"],
                        "time": row["game_time"],
                        "league": row["league_context"],
                        "spieltag": row["matchday_label"],
                        "club": team_name,
                        "opponentClub": opponent_team,
                        "result": row["result"],
                        "teamResult": None
                        if score_for is None or score_against is None
                        else f"{score_for}:{score_against}",
                        "holz": player_total,
                        "sp": player_sp,
                        "mp": player_mp,
                        "side": "home" if is_home else "away",
                    }
                )

        for score_for, score_against in game_outcomes.values():
            if score_for > score_against:
                wins += 1
            elif score_for < score_against:
                losses += 1
            else:
                draws += 1

        ranking_row = conn.execute(
            """
            SELECT COUNT(*) + 1 AS ranking
            FROM player_search_index
            WHERE game_count > (
              SELECT MAX(game_count) FROM player_search_index WHERE player_name = ?
            )
            """,
            (player_name,),
        ).fetchone()

        print(
            json.dumps(
                {
                    "found": True,
                    "playerName": player_name,
                    "clubs": sorted(clubs),
                    "gamesPlayed": len(unique_games),
                    "wins": wins,
                    "losses": losses,
                    "draws": draws,
                    "averageScore": round(total_holz / counted_rows, 2) if counted_rows else 0,
                    "ranking": int(ranking_row["ranking"]) if ranking_row and ranking_row["ranking"] else None,
                    "history": history,
                },
                ensure_ascii=False,
            )
        )
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query local mirror databases.")
    sub = parser.add_subparsers(dest="command", required=True)

    s1 = sub.add_parser("search-players")
    s1.add_argument("query")
    s1.add_argument("--limit", type=int, default=20)

    s2 = sub.add_parser("search-clubs")
    s2.add_argument("query")
    s2.add_argument("--limit", type=int, default=20)

    s3 = sub.add_parser("player-history")
    s3.add_argument("player_name")
    s3.add_argument("--limit", type=int, default=20)

    s4 = sub.add_parser("club-history")
    s4.add_argument("club_name")
    s4.add_argument("--limit", type=int, default=20)

    s5 = sub.add_parser("game-detail")
    s5.add_argument("game_id")

    s6 = sub.add_parser("training-summary")
    s6.add_argument("player_id")

    s7 = sub.add_parser("player-profile")
    s7.add_argument("player_name")
    s7.add_argument("--limit", type=int, default=12)

    s8 = sub.add_parser("club-profile")
    s8.add_argument("club_name")
    s8.add_argument("--limit", type=int, default=20)

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "search-players":
        search_players(args.query, args.limit)
    elif args.command == "search-clubs":
        search_clubs(args.query, args.limit)
    elif args.command == "player-history":
        player_history(args.player_name, args.limit)
    elif args.command == "club-history":
        club_history(args.club_name, args.limit)
    elif args.command == "game-detail":
        game_detail(args.game_id)
    elif args.command == "training-summary":
        training_summary(args.player_id)
    elif args.command == "player-profile":
        player_profile(args.player_name, args.limit)
    elif args.command == "club-profile":
        club_profile(args.club_name, args.limit)


if __name__ == "__main__":
    main()
