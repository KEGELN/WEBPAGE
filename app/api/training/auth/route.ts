import { NextRequest, NextResponse } from 'next/server';
import type { Trainer } from '@/lib/db';
import { getTrainingStore } from '@/lib/training-store';

export async function POST(request: NextRequest) {
  let body: Record<string, string | undefined> = {};
  
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
  }
  
  const { action, email, playerId, username, tempPassword, supabaseUserId, name } = body;
  const store = getTrainingStore();
  
  try {
    if (action === 'create-trainer') {
      if (!email || !supabaseUserId) {
        return NextResponse.json({ error: 'Email and supabaseUserId required' }, { status: 400 });
      }
      const trainer: Trainer = {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        role: 'trainer',
      };
      const saved = await store.saveTrainerWithSupabaseId(trainer, supabaseUserId);
      return NextResponse.json(saved);
    }
    
    if (action === 'get-trainer') {
      if (!supabaseUserId && !email) {
        return NextResponse.json({ error: 'supabaseUserId or email required' }, { status: 400 });
      }
      const trainer = await store.findTrainerBySupabaseId(supabaseUserId || '', email || '');
      if (trainer) return NextResponse.json(trainer);
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    if (action === 'trainer-login') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      const trainer: Trainer = { email: email.toLowerCase(), name: email.split('@')[0], role: 'trainer' };
      const saved = await store.saveTrainer(trainer);
      return NextResponse.json(saved);
    }
    
    if (action === 'player-login') {
      if (!username || !tempPassword) {
        return NextResponse.json({ error: 'Username and temp password required' }, { status: 400 });
      }
      const player = await store.findPlayerByCredentials(username, tempPassword);
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (action === 'reset-player-password') {
      if (!playerId) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
      const player = await store.resetPlayerPassword(playerId.toUpperCase());
      if (player) return NextResponse.json(player);
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Training auth error:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
