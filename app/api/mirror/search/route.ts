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
    
    // Supplement with local search
    try {
      const apiHandler = (await import('@/server')).apiHandler;
      const localClubs = await apiHandler.searchClubs(q);
      const existingClubNames = new Set(results.clubs.map(c => c.name.toLowerCase()));
      
      for (const club of localClubs) {
        if (!existingClubNames.has(club.name_klub.toLowerCase())) {
          results.clubs.push({
            id: Buffer.from(club.name_klub).toString('base64url'),
            name: club.name_klub,
            gameCount: 0,
            lastGameDate: ''
          });
        }
      }
    } catch (e) {
      console.warn("Could not supplement search with local clubs:", e);
    }

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
