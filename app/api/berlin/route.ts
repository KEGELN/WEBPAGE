import { NextRequest } from 'next/server';
import { fetchBerlinLeagueData } from '@/lib/temporary-berlin/scraper';
import type { BerlinLeagueKey } from '@/lib/temporary-berlin/types';

const allowedLeagues: BerlinLeagueKey[] = ['berlinliga', 'vereinsliga'];

function parseLeague(input: string | null): BerlinLeagueKey {
  if (input && allowedLeagues.includes(input as BerlinLeagueKey)) {
    return input as BerlinLeagueKey;
  }
  return 'berlinliga';
}

export async function GET(request: NextRequest) {
  const league = parseLeague(new URL(request.url).searchParams.get('league'));

  try {
    const data = await fetchBerlinLeagueData(league);
    return Response.json(data);
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load Berlin league data:', error);
    return Response.json(
      {
        error: 'Failed to load Berlin league data.',
        details,
      },
      { status: 500 }
    );
  }
}
