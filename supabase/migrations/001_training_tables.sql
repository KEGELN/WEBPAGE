-- Training data tables for Kegeln App
-- These store players, training sessions, trainers, and club data

-- Training Players
CREATE TABLE IF NOT EXISTS training_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mirror_player_name TEXT,
  trainer_email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  username TEXT NOT NULL,
  temp_password TEXT NOT NULL,
  password_reset_required BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_training_players_trainer ON training_players(trainer_email);
CREATE INDEX IF NOT EXISTS idx_training_players_username ON training_players(username);

-- Trainers
CREATE TABLE IF NOT EXISTS trainers (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trainer'
);

-- Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT,
  trainer_email TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  recorder_id TEXT,
  recorder_name TEXT,
  throws_json JSONB NOT NULL DEFAULT '[]',
  lanes_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_player ON training_sessions(player_id, timestamp DESC);

-- Trainer Messages
CREATE TABLE IF NOT EXISTS trainer_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  trainer_email TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trainer_messages_player ON trainer_messages(player_id, created_at DESC);

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_trainer_email TEXT NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  allowed_player_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clubs_invite_token ON clubs(invite_token);

-- Club Members
CREATE TABLE IF NOT EXISTS club_members (
  club_id TEXT NOT NULL,
  member_type TEXT NOT NULL,
  member_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (club_id, member_type, member_id)
);

-- Club Messages
CREATE TABLE IF NOT EXISTS club_messages (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club ON club_messages(club_id, created_at);

-- Club Polls
CREATE TABLE IF NOT EXISTS club_polls (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  votes JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_club_polls_club ON club_polls(club_id, game_id);

-- RLS Policies
ALTER TABLE training_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_polls ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (app data is not sensitive)
CREATE POLICY "Allow public read" ON training_players FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON trainers FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON training_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON trainer_messages FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON clubs FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON club_members FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON club_messages FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON club_polls FOR SELECT USING (true);

-- Service role can write (for sync script)
CREATE POLICY "Service write" ON training_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON trainers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON training_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON trainer_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON clubs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON club_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON club_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write" ON club_polls FOR INSERT WITH CHECK (true);
