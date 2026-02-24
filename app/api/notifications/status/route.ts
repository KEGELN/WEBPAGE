import { NextRequest } from 'next/server';
import { getSubscriptionStatus } from '@/lib/notification';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = String(searchParams.get('season') || '').trim();
    const league = String(searchParams.get('league') || '').trim();
    const team = String(searchParams.get('team') || '').trim();
    const endpoint = String(searchParams.get('endpoint') || '').trim();

    if (!season || !league || !team || !endpoint) {
      return Response.json({ error: 'season, league, team and endpoint are required' }, { status: 400 });
    }

    const status = await getSubscriptionStatus({ season, league, team }, endpoint);
    return Response.json({ ok: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

