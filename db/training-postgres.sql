CREATE TABLE IF NOT EXISTS trainers (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trainer'
);

CREATE TABLE IF NOT EXISTS training_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mirror_player_name TEXT,
  trainer_email TEXT NOT NULL REFERENCES trainers(email) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  username TEXT NOT NULL UNIQUE,
  temp_password TEXT NOT NULL,
  password_reset_required BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_training_players_trainer_email ON training_players(trainer_email);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES training_players(id) ON DELETE CASCADE,
  player_name TEXT,
  trainer_email TEXT NOT NULL REFERENCES trainers(email) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  recorder_id TEXT,
  recorder_name TEXT,
  throws_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  lanes_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_player_id ON training_sessions(player_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS trainer_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES training_players(id) ON DELETE CASCADE,
  trainer_email TEXT NOT NULL REFERENCES trainers(email) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_messages_player_id ON trainer_messages(player_id, created_at DESC);
