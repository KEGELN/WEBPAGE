import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainerEmail = searchParams.get('trainerEmail');
  
  let players = serverDb.getPlayers();
  if (trainerEmail) {
    players = players.filter((p: any) => p.trainerEmail === trainerEmail);
  }
  
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  try {
    const player = await request.json();
    if (!player.id || !player.name || !player.trainerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const saved = serverDb.savePlayer(player);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  
  serverDb.deletePlayer(id);
  return NextResponse.json({ ok: true });
}
