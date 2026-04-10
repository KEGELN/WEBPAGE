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
  let body: Record<string, string | undefined> = {};
  
  try {
    body = await parseBody(request);
  } catch (parseError) {
    console.error('Failed to parse body:', parseError);
    return NextResponse.json({ error: 'Failed to parse request body', details: String(parseError) }, { status: 400 });
  }
  
  const { action, email, playerId, username, tempPassword, supabaseUserId, name } = body;
  
  console.log('Training auth request:', { action, email, supabaseUserId, name });
  
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
      console.log('Saving trainer:', trainer, 'supabaseUserId:', supabaseUserId);
      await getTrainingStore().saveTrainerWithSupabaseId(trainer, supabaseUserId);
      return NextResponse.json(trainer);
    }
    
    if (action === 'get-trainer') {
      if (!supabaseUserId && !email) {
        return NextResponse.json({ error: 'supabaseUserId or email required' }, { status: 400 });
      }
      const trainer = await getTrainingStore().findTrainerBySupabaseId(supabaseUserId || '', email || '');
      if (trainer) return NextResponse.json(trainer);
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

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
  } catch (error) {
    console.error('Training auth error:', error);
    return NextResponse.json({ error: 'Invalid request', details: String(error) }, { status: 400 });
  }
}
