PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imports (
  source TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  row_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trainer_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  username TEXT,
  temp_password TEXT,
  password_reset_required INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_players_trainer
  ON players(trainer_email, name);

CREATE TABLE IF NOT EXISTS trainers (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT,
  trainer_email TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  recorder_id TEXT,
  recorder_name TEXT,
  source TEXT NOT NULL DEFAULT 'training_db.json',
  FOREIGN KEY(player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_player
  ON training_sessions(player_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS training_throws (
  session_id TEXT NOT NULL,
  lane_no INTEGER NOT NULL,
  throw_index INTEGER NOT NULL,
  throw_id INTEGER,
  pins_json TEXT NOT NULL,
  holz INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  PRIMARY KEY (session_id, lane_no, throw_index),
  FOREIGN KEY(session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainer_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  trainer_email TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_messages_player
  ON trainer_messages(player_id, created_at DESC);
