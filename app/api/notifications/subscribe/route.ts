import { NextRequest } from 'next/server';
import { subscribePush, type PushSubscriptionInput } from '@/lib/notification';

type SubscribeBody = {
  season?: string;
  league?: string;
  team?: string;
  subscription?: PushSubscriptionInput;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeBody;
    const season = String(body.season || '').trim();
    const league = String(body.league || '').trim();
    const team = String(body.team || '').trim();
    const subscription = body.subscription;

    if (!season || !league || !team || !subscription?.endpoint) {
      return Response.json({ error: 'season, league, team and subscription are required' }, { status: 400 });
    }

    const saved = await subscribePush({ season, league, team }, subscription);
    return Response.json({ ok: true, subscription: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

