import { NextRequest, NextResponse } from 'next/server';
import type { Trainer } from '@/lib/db';
import { serverDb } from '@/lib/server-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      serverDb.saveTrainer(trainer);
      return NextResponse.json(trainer);
    }
    
    if (action === 'player-login') {
      if (!username || !tempPassword) {
        return NextResponse.json({ error: 'Username and temp password required' }, { status: 400 });
      }
      const player = serverDb.findPlayerByCredentials(username, tempPassword);
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (action === 'reset-player-password') {
      if (!playerId) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
      const player = serverDb.resetPlayerPassword(playerId.toUpperCase());
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
