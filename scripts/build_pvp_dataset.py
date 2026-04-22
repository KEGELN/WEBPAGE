#!/usr/bin/env python3
import csv
import json
import urllib.request
import urllib.parse

BASE_URL = "https://skvb.sportwinner.de/php/skvb/service.php"
HEADERS = {
    "Referer": "https://skvb.sportwinner.de/",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
}


def _post(payload: dict, timeout: int = 30):
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(BASE_URL, data=data, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status >= 400:
            raise urllib.error.HTTPError(BASE_URL, resp.status, "HTTP Error", {}, None)
        return json.loads(resp.read().decode())


def getSaisonArray():
    return _post({"command": "GetSaisonArray"})


def getLeagues(season_id, district_id="0", art="1", favorit=""):
    return _post(
        {
            "command": "GetLigaArray",
            "id_saison": str(season_id),
            "id_bezirk": str(district_id),
            "favorit": favorit,
            "art": str(art),
        }
    )


def getSpielplan(season_id, liga_id):
    return _post(
        {
            "command": "GetSpielplan",
            "id_saison": str(season_id),
            "id_liga": str(liga_id),
        }
    )


def getSpiel(season_id, spiel_id, wertung="1"):
    return _post(
        {
            "command": "GetSpielerInfo",
            "id_saison": str(season_id),
            "id_spiel": str(spiel_id),
            "wertung": str(wertung),
        }
    )


def buildPlayerVsPlayerDataset(season_id=None, district_id="0", art="1", favorit="", wertung="1"):
    if season_id is not None:
        seasons = [(season_id,)]
    else:
        print("No season_id provided, fetching seasons...")
        seasons = getSaisonArray()
        if not seasons:
            print("No seasons found. Returning empty dataset.")
            return []

    dataset = []
    seen_entries = set()

    for season in seasons:
        season_current = season[0]
        print(f"Processing season_id: {season_current}")

        print(
            f"Fetching leagues for season_id={season_current}, district_id={district_id}, art={art}, favorit={favorit}..."
        )
        leagues = getLeagues(season_current, district_id=district_id, art=art, favorit=favorit)
        print(f"Found {len(leagues)} leagues.")

        for league in leagues:
            liga_id = league[0]
            league_name = league[2] if len(league) > 2 else ""
            print(f"Processing league: {liga_id} - {league_name}")

            spielplan_rows = getSpielplan(season_current, liga_id)
            print(f"  Found {len(spielplan_rows)} games in league {liga_id}")

            for game in spielplan_rows:
                if not isinstance(game, list) or len(game) < 6:
                    print(f"  Skipping invalid game data: {game}")
                    continue

                spieltag_label = game[0]
                game_id = game[1]
                game_nr = game[2] if len(game) > 2 else ""
                date_time = game[3] if len(game) > 3 else ""
                home_team = game[4] if len(game) > 4 else ""
                away_team = game[5] if len(game) > 5 else ""
                score = game[6] if len(game) > 6 else ""
                home_points = game[7] if len(game) > 7 else ""
                away_points = game[8] if len(game) > 8 else ""

                print(f"    Processing game {game_id}: {home_team} vs {away_team} on {date_time}, score: {score}")
                spieler_rows = getSpiel(season_current, game_id, wertung=wertung)
                print(f"      Found {len(spieler_rows)} player rows in game {game_id}")

                duel_idx = 0
                for row in spieler_rows:
                    if not isinstance(row, list) or len(row) < 16:
                        print(f"      Skipping invalid player row: {row}")
                        continue

                    left_name = str(row[0]).strip()
                    right_name = str(row[15]).strip()
                    if not left_name or not right_name:
                        print(
                            f"      Skipping player row with missing names: left='{left_name}', right='{right_name}'"
                        )
                        continue

                    left_entry_key = (
                        season_current,
                        liga_id,
                        spieltag_label,
                        game_id,
                        game_nr,
                        date_time,
                        home_team,
                        away_team,
                        score,
                        home_points,
                        away_points,
                        duel_idx,
                        left_name,
                        right_name,
                        home_team,
                        away_team,
                        1,
                        row[1],
                        row[2],
                        row[3],
                        row[4],
                        row[5],
                        row[6],
                        row[7],
                        row[14],
                        row[13],
                        row[12],
                        row[11],
                        row[10],
                        row[9],
                        row[8],
                    )

                    right_entry_key = (
                        season_current,
                        liga_id,
                        spieltag_label,
                        game_id,
                        game_nr,
                        date_time,
                        home_team,
                        away_team,
                        score,
                        home_points,
                        away_points,
                        duel_idx,
                        right_name,
                        left_name,
                        away_team,
                        home_team,
                        0,
                        row[14],
                        row[13],
                        row[12],
                        row[11],
                        row[10],
                        row[9],
                        row[8],
                        row[1],
                        row[2],
                        row[3],
                        row[4],
                        row[5],
                        row[6],
                        row[7],
                    )

                    if left_entry_key not in seen_entries:
                        print(f"      Adding duel index {duel_idx}: {left_name} (home) vs {right_name} (away)")
                        dataset.append(
                            {
                                "season_id": str(season_current),
                                "league_id": str(liga_id),
                                "league_name": league_name,
                                "spieltag_label": spieltag_label,
                                "game_id": str(game_id),
                                "game_nr": str(game_nr),
                                "date_time": date_time,
                                "home_team": home_team,
                                "away_team": away_team,
                                "score": score,
                                "home_points": home_points,
                                "away_points": away_points,
                                "duel_row_idx": duel_idx,
                                "player_name": left_name,
                                "opponent_name": right_name,
                                "player_team": home_team,
                                "opponent_team": away_team,
                                "player_is_home": 1,
                                "player_set_1": row[1],
                                "player_set_2": row[2],
                                "player_set_3": row[3],
                                "player_set_4": row[4],
                                "player_kegel": row[5],
                                "player_sp": row[6],
                                "player_mp": row[7],
                                "opponent_set_1": row[14],
                                "opponent_set_2": row[13],
                                "opponent_set_3": row[12],
                                "opponent_set_4": row[11],
                                "opponent_kegel": row[10],
                                "opponent_sp": row[9],
                                "opponent_mp": row[8],
                            }
                        )
                        seen_entries.add(left_entry_key)

                    if right_entry_key not in seen_entries:
                        dataset.append(
                            {
                                "season_id": str(season_current),
                                "league_id": str(liga_id),
                                "league_name": league_name,
                                "spieltag_label": spieltag_label,
                                "game_id": str(game_id),
                                "game_nr": str(game_nr),
                                "date_time": date_time,
                                "home_team": home_team,
                                "away_team": away_team,
                                "score": score,
                                "home_points": home_points,
                                "away_points": away_points,
                                "duel_row_idx": duel_idx,
                                "player_name": right_name,
                                "opponent_name": left_name,
                                "player_team": away_team,
                                "opponent_team": home_team,
                                "player_is_home": 0,
                                "player_set_1": row[14],
                                "player_set_2": row[13],
                                "player_set_3": row[12],
                                "player_set_4": row[11],
                                "player_kegel": row[10],
                                "player_sp": row[9],
                                "player_mp": row[8],
                                "opponent_set_1": row[1],
                                "opponent_set_2": row[2],
                                "opponent_set_3": row[3],
                                "opponent_set_4": row[4],
                                "opponent_kegel": row[5],
                                "opponent_sp": row[6],
                                "opponent_mp": row[7],
                            }
                        )
                        seen_entries.add(right_entry_key)

                    duel_idx += 1

    print(f"Finished building dataset with {len(dataset)} entries in total.")
    return dataset


def save_dataset_to_csv(dataset, filename="./data/bskv_pvp_dataset.csv"):
    if not dataset:
        print("Dataset is empty, nothing to save.")
        return

    keys = dataset[0].keys()
    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=keys)
        writer.writeheader()
        for row in dataset:
            writer.writerow(row)
    print(f"Dataset saved to {filename}")


if __name__ == "__main__":
    rows = buildPlayerVsPlayerDataset()
    print("rows:", len(rows))
    print(rows[:2])
    save_dataset_to_csv(rows)
