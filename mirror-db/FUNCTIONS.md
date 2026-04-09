# mirror-db Function Reference

This file describes the main functions, classes, and scripts in the `mirror-db/` subsystem.

## Top-Level Scripts

### [initdb.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/initdb.py)

Initializes both SQLite databases and applies the schema SQL.

Main functions:
- `init_db(path, schema_name)`
  Opens one SQLite file, runs the schema script, and writes basic metadata like `schema_version`.
- `main()`
  Initializes both `sportwinner.db` and `training.db`.

Use:
```bash
python3 mirror-db/initdb.py
```

### [build_db.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/build_db.py)

Builds one or both databases.

Main functions:
- `parse_args()`
  Parses CLI flags such as `--source`, `--full-refresh`, `--all-seasons`, and `--force-details`.
- `build_training(force_import)`
  Ensures the training schema exists, then imports `data/training_db.json`.
- `build_sportwinner(args)`
  Ensures the Sportwinner schema exists, then runs the Sportwinner mirror build.
- `main()`
  Dispatches to training and/or Sportwinner builds.

Use:
```bash
python3 mirror-db/build_db.py --source all
python3 mirror-db/build_db.py --source sportwinner --force-details
```

### [query_db.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/query_db.py)

Provides local read/query helpers for searching and historic lookups.

Main functions:
- `search_players(query, limit)`
  Searches mirrored player names from `player_search_index`.
- `search_clubs(query, limit)`
  Searches mirrored clubs from `club_search_index`.
- `player_history(player_name, limit)`
  Shows historic games for a player.
- `club_history(club_name, limit)`
  Shows historic games for a club.
- `game_detail(game_id)`
  Returns one mirrored game plus detailed result rows.
- `training_summary(player_id)`
  Returns training sessions and holz totals for one player.
- `main()`
  CLI entrypoint for all query commands.

Use:
```bash
python3 mirror-db/query_db.py search-players "Noack"
python3 mirror-db/query_db.py game-detail 269214
```

### [sync_prod.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/sync_prod.py)

Copies the built SQLite files into an artifact directory for later upload/sync.

Main functions:
- `copy_db(source, target_dir)`
  Copies one database file into the snapshot directory.
- `main()`
  Copies both DBs and writes `manifest.json`.

## Shared Helpers

### [config.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/config.py)

Central configuration for paths and runtime settings.

Important values:
- `SPORTWINNER_DB_PATH`
- `TRAINING_DB_PATH`
- `TRAINING_JSON_PATH`
- `SPORTWINNER_API_URL`
- `SPORTWINNER_REFERER`
- `DEFAULT_CURRENT_SEASON_ONLY`
- `SCHEMA_VERSION`

Main function:
- `ensure_directories()`
  Creates required directories like `data/`, `logs/`, and `artifacts/`.

### [common.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/common.py)

Shared utility functions used across the subsystem.

Main functions:
- `setup_logging(verbose=False)`
  Configures logging level and format.
- `utc_now()`
  Returns the current UTC timestamp in ISO format.
- `normalize_text(value)`
  Creates a simple normalized key for names and search.
- `german_date_to_iso(value)`
  Converts `DD.MM.YYYY` into ISO date format.
- `json_hash(value)`
  Hashes JSON payloads for change detection.
- `load_sql(path)`
  Reads schema SQL from disk.
- `connect_sqlite(path)`
  Opens a SQLite connection with WAL and row factory enabled.
- `execute_script(conn, sql)`
  Runs a SQL schema or migration script.
- `parse_int(value)`
  Converts loose number strings into integers when possible.

## Data Sources

### [sources/training.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/sources/training.py)

Imports the app-owned training JSON into `training.db`.

Main class:
- `TrainingImporter`

Main method:
- `import_from_json(force=False)`
  Loads `training_db.json`, normalizes missing player records, replaces the relational training tables, and records the import hash.

Behavior:
- imports players, trainers, sessions, throws, and trainer messages
- auto-creates placeholder player rows for trainer self-training sessions when the JSON references a player ID that is not in `players`

### [sources/sportwinner.py](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/sources/sportwinner.py)

Fetches and normalizes Sportwinner API data into `sportwinner.db`.

Main classes:
- `BuildOptions`
  Runtime options for full refresh, season selection, and detail refresh.
- `SportwinnerClient`
  Low-level form-encoded Sportwinner requester.
- `SportwinnerMirrorBuilder`
  Main mirroring/orchestration class.

Important `SportwinnerClient` method:
- `request(command, **params)`
  Sends a Sportwinner-compatible POST request and returns the raw JSON table.

Important `SportwinnerMirrorBuilder` methods:
- `run(options)`
  Main entrypoint. Mirrors seasons, districts, leagues, matchdays, schedules, standings, games, details, and search indexes.
- `_fetch_seasons()`
  Loads `GetSaisonArray` and marks the current season.
- `_fetch_districts(season_id, current_season_only)`
  Loads `GetBezirkArray`.
- `_fetch_leagues(season_id, districts, current_season_only)`
  Loads `GetLigaArray` across `art=1` and `art=2`.
- `_sync_league(season_id, league, current_season_only, force_details)`
  Mirrors one league’s matchdays, schedule, fallback game list, standings, and completed-game details.
- `_merge_games(...)`
  Combines `GetSpielplan` and `GetSpiel` into normalized game records.
- `_sync_game_details(game, current_season_only)`
  Loads `GetSpielerInfo` and writes `game_results`, `game_player_rows`, and `game_player_sets`.
- `_refresh_search_indexes()`
  Rebuilds player and club search tables from mirrored results.

## SQL Schemas

### [sql/sportwinner.sql](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/sql/sportwinner.sql)

Defines the Sportwinner mirror tables:
- `raw_payloads`
- `seasons`
- `districts`
- `leagues`
- `league_matchdays`
- `clubs`
- `games`
- `game_results`
- `standings_snapshots`
- `game_player_rows`
- `game_player_sets`
- `player_search_index`
- `club_search_index`

### [sql/training.sql](/home/lemon/projects/KegelnWebpage/WEBPAGE/mirror-db/sql/training.sql)

Defines the training database tables:
- `imports`
- `players`
- `trainers`
- `training_sessions`
- `training_throws`
- `trainer_messages`

## Practical Flow

Typical lifecycle:
1. Run `initdb.py`
2. Run `build_db.py --source training`
3. Run `build_db.py --source sportwinner`
4. Query with `query_db.py`
5. Export snapshots with `sync_prod.py`
