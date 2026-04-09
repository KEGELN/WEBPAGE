import { NextRequest, NextResponse } from 'next/server';
import type { Player } from '@/lib/db';
import { getTrainingStore } from '@/lib/training-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainerEmail = searchParams.get('trainerEmail');

  let players = await getTrainingStore().getPlayers();
  if (trainerEmail) {
    players = players.filter((p: Player) => p.trainerEmail === trainerEmail);
  }

  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  try {
    const player = await request.json();
    if (!player.id || !player.name || !player.trainerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const saved = await getTrainingStore().savePlayer(player);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const player = (await request.json()) as Player;
    if (!player.id || !player.name || !player.trainerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const updated = await getTrainingStore().updatePlayer(player);
    if (!updated) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await getTrainingStore().deletePlayer(id);
  return NextResponse.json({ ok: true });
}
