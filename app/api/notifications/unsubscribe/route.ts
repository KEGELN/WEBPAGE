import { NextRequest } from 'next/server';
import { unsubscribePush } from '@/lib/notification';

type UnsubscribeBody = {
  season?: string;
  league?: string;
  team?: string;
  endpoint?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UnsubscribeBody;
    const season = String(body.season || '').trim();
    const league = String(body.league || '').trim();
    const team = String(body.team || '').trim();
    const endpoint = String(body.endpoint || '').trim();

    if (!season || !league || !team || !endpoint) {
      return Response.json({ error: 'season, league, team and endpoint are required' }, { status: 400 });
    }

    const removed = await unsubscribePush({ season, league, team }, endpoint);
    return Response.json({ ok: true, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

