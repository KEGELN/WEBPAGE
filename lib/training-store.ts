import type { Player, Trainer, TrainerMessage, TrainingSession } from '@/lib/db';
import { getTrainingPool, hasTrainingDatabase } from '@/lib/postgres';
import { serverDb } from '@/lib/server-db';
import { getSupabaseServiceRoleClient } from '@/lib/supabase';

type DbRow = Record<string, string | number | boolean | null | object>;

type TrainingStore = {
  getPlayers(): Promise<Player[]>;
  savePlayer(player: Player): Promise<Player>;
  updatePlayer(player: Player): Promise<Player | null>;
  deletePlayer(id: string): Promise<void>;
  getSessions(): Promise<TrainingSession[]>;
  saveSession(session: TrainingSession): Promise<TrainingSession>;
  getTrainerMessages(): Promise<TrainerMessage[]>;
  saveTrainerMessage(message: Omit<TrainerMessage, 'id' | 'createdAt'>): Promise<TrainerMessage>;
  saveTrainer(trainer: Trainer): Promise<Trainer>;
  saveTrainerWithSupabaseId(trainer: Trainer, supabaseUserId: string): Promise<Trainer>;
  findTrainerBySupabaseId(supabaseUserId: string, email: string): Promise<Trainer | null>;
  findPlayerByCredentials(username: string, tempPassword: string): Promise<Player | null>;
  resetPlayerPassword(playerId: string): Promise<Player | null>;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapPlayer(row: DbRow): Player {
  return {
    id: String(row.id),
    name: String(row.name),
    mirrorPlayerName: row.mirror_player_name ? String(row.mirror_player_name) : undefined,
    trainerEmail: String(row.trainer_email),
    createdAt: String(row.created_at),
    username: String(row.username),
    tempPassword: String(row.temp_password),
    passwordResetRequired: Boolean(row.password_reset_required),
  };
}

function mapSession(row: DbRow): TrainingSession {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName: row.player_name ? String(row.player_name) : undefined,
    trainerEmail: String(row.trainer_email),
    timestamp: String(row.timestamp),
    type: String(row.type) as TrainingSession['type'],
    recorderId: row.recorder_id ? String(row.recorder_id) : undefined,
    recorderName: row.recorder_name ? String(row.recorder_name) : undefined,
    throws: Array.isArray(row.throws_json) ? (row.throws_json as TrainingSession['throws']) : [],
    lanes: row.lanes_json && typeof row.lanes_json === 'object' ? (row.lanes_json as TrainingSession['lanes']) : undefined,
  };
}

function mapMessage(row: DbRow): TrainerMessage {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    trainerEmail: String(row.trainer_email),
    text: String(row.text),
    createdAt: String(row.created_at),
  };
}

function localTrainingStore(): TrainingStore {
  return {
    getPlayers: async () => serverDb.getPlayers(),
    savePlayer: async (player) => serverDb.savePlayer(player),
    updatePlayer: async (player) => serverDb.updatePlayer(player),
    deletePlayer: async (id) => serverDb.deletePlayer(id),
    getSessions: async () => serverDb.getSessions(),
    saveSession: async (session) => serverDb.saveSession(session),
    getTrainerMessages: async () => serverDb.getTrainerMessages(),
    saveTrainerMessage: async (message) => serverDb.saveTrainerMessage(message),
    saveTrainer: async (trainer) => serverDb.saveTrainer(trainer),
    saveTrainerWithSupabaseId: async (trainer, supabaseUserId) => {
      const saved = await serverDb.saveTrainer(trainer);
      return saved;
    },
    findTrainerBySupabaseId: async (supabaseUserId, email) => {
      const trainers = serverDb.getTrainers ? serverDb.getTrainers() : [];
      return trainers.find((t: Trainer) => t.email.toLowerCase() === email.toLowerCase()) || null;
    },
    findPlayerByCredentials: async (username, tempPassword) => serverDb.findPlayerByCredentials(username, tempPassword),
    resetPlayerPassword: async (playerId) => serverDb.resetPlayerPassword(playerId),
  };
}

function supabaseTrainingStore(): TrainingStore {
  const client = getSupabaseServiceRoleClient();
  if (!client) return localTrainingStore();

  return {
    getPlayers: async () => {
      const { data, error } = await client.from('training_players').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPlayer);
    },
    savePlayer: async (player) => {
      const { data, error } = await client.from('training_players').insert({
        id: player.id,
        name: player.name,
        mirror_player_name: player.mirrorPlayerName ?? null,
        trainer_email: player.trainerEmail,
        created_at: player.createdAt,
        username: player.username,
        temp_password: player.tempPassword,
        password_reset_required: player.passwordResetRequired,
      }).select().single();
      if (error) throw error;
      return mapPlayer(data);
    },
    updatePlayer: async (player) => {
      const { data, error } = await client.from('training_players').update({
        name: player.name,
        mirror_player_name: player.mirrorPlayerName ?? null,
        trainer_email: player.trainerEmail,
        username: player.username,
        temp_password: player.tempPassword,
        password_reset_required: player.passwordResetRequired,
      }).eq('id', player.id).select().single();
      if (error) return null;
      return mapPlayer(data);
    },
    deletePlayer: async (id) => {
      await client.from('training_players').delete().eq('id', id);
    },
    getSessions: async () => {
      const { data, error } = await client.from('training_sessions').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSession);
    },
    saveSession: async (session) => {
      const { data, error } = await client.from('training_sessions').insert({
        id: session.id,
        player_id: session.playerId,
        player_name: session.playerName ?? null,
        trainer_email: session.trainerEmail,
        timestamp: session.timestamp,
        type: session.type,
        recorder_id: session.recorderId ?? null,
        recorder_name: session.recorderName ?? null,
        throws_json: session.throws ?? [],
        lanes_json: session.lanes ?? null,
      }).select().single();
      if (error) throw error;
      return mapSession(data);
    },
    getTrainerMessages: async () => {
      const { data, error } = await client.from('trainer_messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapMessage);
    },
    saveTrainerMessage: async (message) => {
      const id = createId('msg');
      const { data, error } = await client.from('trainer_messages').insert({
        id,
        player_id: message.playerId,
        trainer_email: message.trainerEmail,
        text: message.text,
      }).select().single();
      if (error) throw error;
      return mapMessage(data);
    },
    saveTrainer: async (trainer) => {
      const { data, error } = await client.from('trainers').upsert({
        email: trainer.email,
        name: trainer.name,
        role: trainer.role,
      }, { onConflict: 'email' }).select().single();
      if (error) throw error;
      return { email: String(data.email), name: String(data.name), role: 'trainer' };
    },
    saveTrainerWithSupabaseId: async (trainer, supabaseUserId) => {
      const { data, error } = await client.from('trainers').upsert({
        email: trainer.email,
        name: trainer.name,
        role: trainer.role,
        supabase_user_id: supabaseUserId,
      }, { onConflict: 'email' }).select().single();
      if (error) throw error;
      return { email: String(data.email), name: String(data.name), role: 'trainer' };
    },
    findTrainerBySupabaseId: async (supabaseUserId, email) => {
      const { data, error } = await client.from('trainers')
        .select('*')
        .or(`supabase_user_id.eq.${supabaseUserId},email.ilike.${email}`)
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return { email: String(data.email), name: String(data.name), role: 'trainer' };
    },
    findPlayerByCredentials: async (username, tempPassword) => {
      const { data, error } = await client.from('training_players')
        .select('*')
        .ilike('username', username.trim())
        .eq('temp_password', tempPassword.trim().toUpperCase())
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return mapPlayer(data);
    },
    resetPlayerPassword: async (playerId) => {
      const nextPassword = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await client.from('training_players')
        .update({ temp_password: nextPassword, password_reset_required: true })
        .eq('id', playerId)
        .select()
        .single();
      if (error) return null;
      return mapPlayer(data);
    },
  };
}

function postgresTrainingStore(): TrainingStore {
  const pool = getTrainingPool();
  return {
    getPlayers: async () => {
      const result = await pool.query('SELECT * FROM training_players ORDER BY created_at DESC');
      return result.rows.map(mapPlayer);
    },
    savePlayer: async (player) => {
      const result = await pool.query(
        `
        INSERT INTO training_players (
          id, name, mirror_player_name, trainer_email, created_at, username, temp_password, password_reset_required
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          player.id,
          player.name,
          player.mirrorPlayerName ?? null,
          player.trainerEmail,
          player.createdAt,
          player.username,
          player.tempPassword,
          player.passwordResetRequired,
        ]
      );
      return mapPlayer(result.rows[0]);
    },
    updatePlayer: async (player) => {
      const result = await pool.query(
        `
        UPDATE training_players
        SET
          name = $2,
          mirror_player_name = $3,
          trainer_email = $4,
          created_at = $5,
          username = $6,
          temp_password = $7,
          password_reset_required = $8
        WHERE id = $1
        RETURNING *
        `,
        [
          player.id,
          player.name,
          player.mirrorPlayerName ?? null,
          player.trainerEmail,
          player.createdAt,
          player.username,
          player.tempPassword,
          player.passwordResetRequired,
        ]
      );
      return result.rows[0] ? mapPlayer(result.rows[0]) : null;
    },
    deletePlayer: async (id) => {
      await pool.query('DELETE FROM training_players WHERE id = $1', [id]);
    },
    getSessions: async () => {
      const result = await pool.query('SELECT * FROM training_sessions ORDER BY timestamp DESC');
      return result.rows.map(mapSession);
    },
    saveSession: async (session) => {
      const result = await pool.query(
        `
        INSERT INTO training_sessions (
          id, player_id, player_name, trainer_email, timestamp, type, recorder_id, recorder_name, throws_json, lanes_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)
        RETURNING *
        `,
        [
          session.id,
          session.playerId,
          session.playerName ?? null,
          session.trainerEmail,
          session.timestamp,
          session.type,
          session.recorderId ?? null,
          session.recorderName ?? null,
          JSON.stringify(session.throws ?? []),
          JSON.stringify(session.lanes ?? null),
        ]
      );
      return mapSession(result.rows[0]);
    },
    getTrainerMessages: async () => {
      const result = await pool.query('SELECT * FROM trainer_messages ORDER BY created_at DESC');
      return result.rows.map(mapMessage);
    },
    saveTrainerMessage: async (message) => {
      const id = createId('msg');
      const result = await pool.query(
        `
        INSERT INTO trainer_messages (id, player_id, trainer_email, text)
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [id, message.playerId, message.trainerEmail, message.text]
      );
      return mapMessage(result.rows[0]);
    },
    saveTrainer: async (trainer) => {
      const result = await pool.query(
        `
        INSERT INTO trainers (email, name, role)
        VALUES ($1,$2,$3)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
        RETURNING *
        `,
        [trainer.email, trainer.name, trainer.role]
      );
      return { email: String(result.rows[0].email), name: String(result.rows[0].name), role: 'trainer' };
    },
    saveTrainerWithSupabaseId: async (trainer, supabaseUserId) => {
      const result = await pool.query(
        `
        INSERT INTO trainers (email, name, role, supabase_user_id)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, supabase_user_id = EXCLUDED.supabase_user_id
        RETURNING *
        `,
        [trainer.email, trainer.name, trainer.role, supabaseUserId]
      );
      return { email: String(result.rows[0].email), name: String(result.rows[0].name), role: 'trainer' };
    },
    findTrainerBySupabaseId: async (supabaseUserId, email) => {
      const result = await pool.query(
        `
        SELECT * FROM trainers
        WHERE supabase_user_id = $1 OR lower(email) = lower($2)
        LIMIT 1
        `,
        [supabaseUserId, email]
      );
      if (result.rows[0]) {
        return { email: String(result.rows[0].email), name: String(result.rows[0].name), role: 'trainer' };
      }
      return null;
    },
    findPlayerByCredentials: async (username, tempPassword) => {
      const result = await pool.query(
        `
        SELECT * FROM training_players
        WHERE lower(username) = lower($1) AND temp_password = upper($2)
        LIMIT 1
        `,
        [username.trim(), tempPassword.trim()]
      );
      return result.rows[0] ? mapPlayer(result.rows[0]) : null;
    },
    resetPlayerPassword: async (playerId) => {
      const nextPassword = Math.random().toString(36).slice(2, 8).toUpperCase();
      const result = await pool.query(
        `
        UPDATE training_players
        SET temp_password = $2, password_reset_required = true
        WHERE id = $1
        RETURNING *
        `,
        [playerId, nextPassword]
      );
      return result.rows[0] ? mapPlayer(result.rows[0]) : null;
    },
  };
}

export function getTrainingStore(): TrainingStore {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return supabaseTrainingStore();
  }
  return hasTrainingDatabase() ? postgresTrainingStore() : localTrainingStore();
}
