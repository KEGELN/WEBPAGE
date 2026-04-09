import { NextRequest, NextResponse } from 'next/server';
import type { Trainer } from '@/lib/db';
import { getTrainingStore } from '@/lib/training-store';

async function parseBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, string | undefined>;
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }

  try {
    return (await request.json()) as Record<string, string | undefined>;
  } catch {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const { action, email, playerId, username, tempPassword } = body as {
      action?: string;
      email?: string;
      playerId?: string;
      username?: string;
      tempPassword?: string;
    };
    
    if (action === 'trainer-login') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      const trainer: Trainer = { email: email.toLowerCase(), name: email.split('@')[0], role: 'trainer' };
      await getTrainingStore().saveTrainer(trainer);
      return NextResponse.json(trainer);
    }
    
    if (action === 'player-login') {
      if (!username || !tempPassword) {
        return NextResponse.json({ error: 'Username and temp password required' }, { status: 400 });
      }
      const player = await getTrainingStore().findPlayerByCredentials(username, tempPassword);
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (action === 'reset-player-password') {
      if (!playerId) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
      const player = await getTrainingStore().resetPlayerPassword(playerId.toUpperCase());
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
