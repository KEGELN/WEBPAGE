import { NextRequest, NextResponse } from 'next/server';
import type { TrainingSession } from '@/lib/db';
import { getTrainingStore } from '@/lib/training-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const trainerEmail = searchParams.get('trainerEmail');
  
  let sessions = await getTrainingStore().getSessions();
  if (playerId) {
    sessions = sessions.filter((s: TrainingSession) => s.playerId === playerId);
  }
  if (trainerEmail) {
    sessions = sessions.filter((s: TrainingSession) => s.trainerEmail === trainerEmail);
  }
  
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    if (!session.id || !session.playerId || !session.trainerEmail || !session.throws) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const saved = await getTrainingStore().saveSession(session);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
