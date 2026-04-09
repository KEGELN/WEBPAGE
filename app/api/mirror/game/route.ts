import { NextRequest, NextResponse } from 'next/server';
import { getMirrorStore } from '@/lib/mirror-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId')?.trim();

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getMirrorStore().gameDetail(gameId));
  } catch (error) {
    console.error('Mirror game lookup failed', error);
    return NextResponse.json({ error: 'Mirror game lookup failed' }, { status: 500 });
  }
}
