import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';
import { getTrainingPool, hasTrainingDatabase } from '@/lib/postgres';

export const runtime = 'nodejs';

// Ensure magic_tokens table exists — runs once per cold start (CREATE IF NOT EXISTS is idempotent)
async function ensureTable() {
  const pool = getTrainingPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS magic_tokens (
      token TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    const { playerId } = await request.json() as { playerId?: string };
    if (!playerId?.trim()) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const id = playerId.trim();
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (hasTrainingDatabase()) {
      await ensureTable();
      const pool = getTrainingPool();
      // Rotate: remove existing tokens for this player first
      await pool.query('DELETE FROM magic_tokens WHERE player_id = $1', [id]);
      await pool.query(
        'INSERT INTO magic_tokens (token, player_id, expires_at) VALUES ($1, $2, $3)',
        [token, id, expiresAt.toISOString()]
      );
      return NextResponse.json({ token });
    } else {
      // Local dev fallback: JSON store
      const jsonToken = serverDb.createMagicToken(id);
      return NextResponse.json({ token: jsonToken });
    }
  } catch (err) {
    console.error('[magic-token POST]', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  try {
    if (hasTrainingDatabase()) {
      await ensureTable();
      const pool = getTrainingPool();

      // Clean up expired tokens opportunistically
      await pool.query('DELETE FROM magic_tokens WHERE expires_at < NOW()');

      const { rows } = await pool.query<{ player_id: string }>(
        'SELECT player_id FROM magic_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
      }

      const playerId = rows[0].player_id;

      // Fetch the player from training_players table
      const { rows: playerRows } = await pool.query<{
        id: string; name: string; username: string;
        temp_password: string; trainer_email: string;
        mirror_player_name: string | null;
        password_reset_required: boolean;
        created_at: string;
      }>(
        'SELECT * FROM training_players WHERE id = $1',
        [playerId]
      );

      if (playerRows.length === 0) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      const p = playerRows[0];
      return NextResponse.json({
        id: p.id,
        name: p.name,
        username: p.username,
        tempPassword: p.temp_password,
        trainerEmail: p.trainer_email,
        mirrorPlayerName: p.mirror_player_name ?? undefined,
        passwordResetRequired: p.password_reset_required,
        createdAt: p.created_at,
      });
    } else {
      // Local dev fallback
      const player = serverDb.redeemMagicToken(token);
      if (!player) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
      }
      return NextResponse.json(player);
    }
  } catch (err) {
    console.error('[magic-token GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
