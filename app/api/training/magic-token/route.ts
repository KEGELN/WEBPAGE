import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { playerId } = await request.json() as { playerId?: string };
    if (!playerId?.trim()) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }
    const token = serverDb.createMagicToken(playerId.trim());
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }
  const player = serverDb.redeemMagicToken(token);
  if (!player) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
  }
  return NextResponse.json(player);
}
