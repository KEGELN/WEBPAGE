import { NextRequest, NextResponse } from 'next/server';
import { getMirrorStore } from '@/lib/mirror-store';
import { hasMirrorDatabase } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ players: [], clubs: [] });
  }

  console.log('Search request:', q);
  console.log('hasMirrorDatabase:', hasMirrorDatabase());
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

  try {
    const store = getMirrorStore();
    const results = await store.search(q);
    console.log('Search results:', JSON.stringify(results).slice(0, 200));
    return NextResponse.json(results);
  } catch (error) {
    console.error('Mirror search failed:', error);
    return NextResponse.json({ 
      error: String(error),
      players: [],
      clubs: []
    }, { status: 500 });
  }
}
