CREATE TABLE IF NOT EXISTS raw_payloads (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  command TEXT NOT NULL,
  season_id TEXT,
  district_id TEXT,
  league_id TEXT,
  game_id TEXT,
  params_json JSONB NOT NULL,
  payload_json JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  current_season_only BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_raw_payloads_lookup
  ON raw_payloads(command, season_id, league_id, game_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS seasons (
  season_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  status INTEGER NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  fetched_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS districts (
  season_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (season_id, district_id)
);

CREATE TABLE IF NOT EXISTS league_matchdays (
  season_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  matchday_id TEXT NOT NULL,
  matchday_nr TEXT,
  label TEXT,
  status TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (season_id, league_id, matchday_id)
);

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
  fetched_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (season_id, league_id)
);

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
  game_date DATE,
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
  detail_fetched_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_lookup ON games(season_id, league_id, game_date, game_time);

CREATE TABLE IF NOT EXISTS game_results (
  game_id TEXT PRIMARY KEY REFERENCES games(game_id) ON DELETE CASCADE,
  season_id TEXT NOT NULL,
  league_id TEXT,
  league_name TEXT,
  spieltag TEXT,
  date_time TEXT,
  team_home TEXT NOT NULL,
  team_away TEXT NOT NULL,
  result TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  raw_table_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS standings_snapshots (
  id BIGSERIAL PRIMARY KEY,
  season_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  spieltag_nr TEXT NOT NULL,
  sort_key TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  team_id TEXT,
  position TEXT,
  team_name TEXT,
  raw_row_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_standings_lookup
  ON standings_snapshots(season_id, league_id, spieltag_nr, sort_key, row_index);

CREATE TABLE IF NOT EXISTS game_player_rows (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_row_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_player_rows_lookup ON game_player_rows(game_id, row_index);

CREATE TABLE IF NOT EXISTS game_player_sets (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  side TEXT NOT NULL,
  player_name TEXT NOT NULL,
  lane_no INTEGER NOT NULL,
  pins TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_player_sets_lookup
  ON game_player_sets(game_id, player_name, side, lane_no);

CREATE TABLE IF NOT EXISTS clubs (
  club_key TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  club_number TEXT,
  source TEXT NOT NULL,
  season_id TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clubs_normalized_name ON clubs(normalized_name);

CREATE TABLE IF NOT EXISTS player_search_index (
  player_key TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  club_name TEXT,
  season_id TEXT,
  league_id TEXT,
  game_count INTEGER NOT NULL DEFAULT 0,
  last_game_date DATE,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_player_search_normalized_name ON player_search_index(normalized_name);

CREATE TABLE IF NOT EXISTS club_search_index (
  club_key TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  club_number TEXT,
  season_id TEXT,
  game_count INTEGER NOT NULL DEFAULT 0,
  last_game_date DATE,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_search_normalized_name ON club_search_index(normalized_name);
