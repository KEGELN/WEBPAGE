import { NextRequest } from 'next/server';
import { pollAndDispatchLivePushes } from '@/lib/notification';

export async function GET(request: NextRequest) {
  try {
    const expected = process.env.NOTIFICATION_CRON_SECRET;
    if (expected) {
      const actual = request.headers.get('x-notification-secret') || '';
      const authorization = request.headers.get('authorization') || '';
      const bearer = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
      if (actual !== expected && bearer !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await pollAndDispatchLivePushes();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
