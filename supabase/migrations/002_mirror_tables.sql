-- Sportwinner Mirror data tables
-- These store pre-fetched competition data from Sportwinner API

-- Player Search Index (denormalized for fast search)
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
);

CREATE INDEX IF NOT EXISTS idx_player_search_normalized_name ON player_search_index(normalized_name varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_player_search_name ON player_search_index(player_name);

-- Club Search Index
CREATE TABLE IF NOT EXISTS club_search_index (
  club_key TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  club_number TEXT,
  season_id TEXT,
  game_count INTEGER NOT NULL DEFAULT 0,
  last_game_date TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_search_normalized_name ON club_search_index(normalized_name varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_club_search_name ON club_search_index(club_name);

-- Games (main game table)
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
);

CREATE INDEX IF NOT EXISTS idx_games_lookup ON games(season_id, league_id, game_date DESC);
CREATE INDEX IF NOT EXISTS idx_games_clubs ON games(normalized_home, normalized_away);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date DESC, game_time DESC);

-- Game Player Rows (detailed result rows)
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
);

CREATE INDEX IF NOT EXISTS idx_game_player_rows_game ON game_player_rows(game_id, row_index);
CREATE INDEX IF NOT EXISTS idx_game_player_rows_player_home ON game_player_rows(player_home);
CREATE INDEX IF NOT EXISTS idx_game_player_rows_player_away ON game_player_rows(player_away);

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
  season_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  status INTEGER NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  fetched_at TEXT NOT NULL
);

-- Districts
CREATE TABLE IF NOT EXISTS districts (
  season_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (season_id, district_id)
);

-- Leagues
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
);

-- League Matchdays
CREATE TABLE IF NOT EXISTS league_matchdays (
  season_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  matchday_id TEXT NOT NULL,
  matchday_nr TEXT,
  label TEXT,
  status TEXT,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (season_id, league_id, matchday_id)
);

-- Clubs (master club list)
CREATE TABLE IF NOT EXISTS clubs_mirror (
  club_key TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  club_number TEXT,
  source TEXT NOT NULL,
  season_id TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clubs_mirror_name ON clubs_mirror(normalized_name);

-- Standings Snapshots
CREATE TABLE IF NOT EXISTS standings_snapshots (
  id SERIAL PRIMARY KEY,
  season_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  spieltag_nr TEXT NOT NULL,
  sort_key TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  team_id TEXT,
  position TEXT,
  team_name TEXT,
  raw_row_json JSONB NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_standings_lookup ON standings_snapshots(season_id, league_id, spieltag_nr);

-- RLS Policies (public read for all - competition data)
ALTER TABLE player_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_player_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matchdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read" ON player_search_index FOR SELECT USING (true);
CREATE POLICY "Public read" ON club_search_index FOR SELECT USING (true);
CREATE POLICY "Public read" ON games FOR SELECT USING (true);
CREATE POLICY "Public read" ON game_player_rows FOR SELECT USING (true);
CREATE POLICY "Public read" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read" ON districts FOR SELECT USING (true);
CREATE POLICY "Public read" ON leagues FOR SELECT USING (true);
CREATE POLICY "Public read" ON league_matchdays FOR SELECT USING (true);
CREATE POLICY "Public read" ON clubs_mirror FOR SELECT USING (true);
CREATE POLICY "Public read" ON standings_snapshots FOR SELECT USING (true);
