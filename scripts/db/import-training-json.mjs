import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Pool } from 'pg';

function readTrainingJson() {
  const filePath = process.env.TRAINING_JSON_PATH || path.join(process.cwd(), 'data', 'training_db.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizePlayer(player) {
  return {
    id: String(player.id),
    name: String(player.name),
    mirrorPlayerName: player.mirrorPlayerName ? String(player.mirrorPlayerName) : null,
    trainerEmail: String(player.trainerEmail),
    createdAt: String(player.createdAt),
    username: String(player.username),
    tempPassword: String(player.tempPassword),
    passwordResetRequired: Boolean(player.passwordResetRequired),
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const db = readTrainingJson();
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM trainer_messages');
    await client.query('DELETE FROM training_sessions');
    await client.query('DELETE FROM training_players');
    await client.query('DELETE FROM trainers');

    for (const trainer of db.trainers ?? []) {
      await client.query(
        `
        INSERT INTO trainers (email, name, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
        `,
        [String(trainer.email), String(trainer.name), String(trainer.role ?? 'trainer')]
      );
    }

    for (const player of (db.players ?? []).map(normalizePlayer)) {
      await client.query(
        `
        INSERT INTO training_players (
          id, name, mirror_player_name, trainer_email, created_at, username, temp_password, password_reset_required
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          player.id,
          player.name,
          player.mirrorPlayerName,
          player.trainerEmail,
          player.createdAt,
          player.username,
          player.tempPassword,
          player.passwordResetRequired,
        ]
      );
    }

    for (const session of db.sessions ?? []) {
      await client.query(
        `
        INSERT INTO training_sessions (
          id, player_id, player_name, trainer_email, timestamp, type, recorder_id, recorder_name, throws_json, lanes_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
        `,
        [
          String(session.id),
          String(session.playerId),
          session.playerName ? String(session.playerName) : null,
          String(session.trainerEmail),
          String(session.timestamp),
          String(session.type),
          session.recorderId ? String(session.recorderId) : null,
          session.recorderName ? String(session.recorderName) : null,
          JSON.stringify(session.throws ?? []),
          JSON.stringify(session.lanes ?? null),
        ]
      );
    }

    for (const message of db.trainerMessages ?? []) {
      await client.query(
        `
        INSERT INTO trainer_messages (id, player_id, trainer_email, text, created_at)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          String(message.id),
          String(message.playerId),
          String(message.trainerEmail),
          String(message.text),
          String(message.createdAt),
        ]
      );
    }

    await client.query('COMMIT');
    console.log(
      `Imported training data: ${(db.trainers ?? []).length} trainers, ${(db.players ?? []).length} players, ${(db.sessions ?? []).length} sessions, ${(db.trainerMessages ?? []).length} messages.`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
