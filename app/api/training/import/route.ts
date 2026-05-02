import { NextRequest, NextResponse } from 'next/server';
import type { TrainingSession } from '@/lib/db';
import { getTrainingStore } from '@/lib/training-store';

export const runtime = 'nodejs';

function isValidThrow(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const obj = t as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    Array.isArray(obj.pins) &&
    (obj.pins as unknown[]).every((p) => typeof p === 'number' && p >= 1 && p <= 9) &&
    typeof obj.timestamp === 'string'
  );
}

function isValidSession(s: unknown): s is TrainingSession {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.playerId !== 'string') return false;
  if (typeof obj.trainerEmail !== 'string') return false;
  if (typeof obj.timestamp !== 'string') return false;
  if (obj.type !== 'standard' && obj.type !== 'game_120') return false;
  if (!Array.isArray(obj.throws)) return false;
  if (!(obj.throws as unknown[]).every(isValidThrow)) return false;
  if (obj.type === 'game_120') {
    if (!obj.lanes || typeof obj.lanes !== 'object') return false;
    const lanes = obj.lanes as Record<string, unknown>;
    for (const key of ['1', '2', '3', '4']) {
      if (!Array.isArray(lanes[key])) return false;
      if (!(lanes[key] as unknown[]).every(isValidThrow)) return false;
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as unknown;

    // Accept either a single session or an array of sessions
    const sessions: unknown[] = Array.isArray(body) ? body : [body];

    const valid: TrainingSession[] = [];
    const errors: string[] = [];

    for (let i = 0; i < sessions.length; i++) {
      if (isValidSession(sessions[i])) {
        valid.push(sessions[i] as TrainingSession);
      } else {
        errors.push(`Session ${i + 1} hat ein ungültiges Format.`);
      }
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Sessions gefunden.', details: errors }, { status: 400 });
    }

    const store = getTrainingStore();
    const saved: TrainingSession[] = [];
    for (const session of valid) {
      const result = await store.saveSession(session);
      saved.push(result);
    }

    return NextResponse.json({
      imported: saved.length,
      skipped: errors.length,
      errors,
      sessions: saved.map((s) => ({ id: s.id, playerName: s.playerName, timestamp: s.timestamp })),
    });
  } catch (err) {
    console.error('[import POST]', err);
    return NextResponse.json({ error: 'Ungültiges JSON.' }, { status: 400 });
  }
}
