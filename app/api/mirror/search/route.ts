import { NextRequest, NextResponse } from 'next/server';
import { getMirrorStore } from '@/lib/mirror-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ players: [], clubs: [] });
  }

  try {
    const results = await getMirrorStore().search(q);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Mirror search failed:', error);
    return NextResponse.json({ 
      error: 'Mirror search failed',
      players: [],
      clubs: []
    }, { status: 500 });
  }
}
