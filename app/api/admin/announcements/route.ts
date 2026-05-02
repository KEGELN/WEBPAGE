import { NextRequest, NextResponse } from 'next/server';
import { serverDb, type Announcement } from '@/lib/server-db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(serverDb.getAnnouncements());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Announcement>;
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }
    const validTypes = ['info', 'result', 'event', 'training'] as const;
    const type = validTypes.includes(body.type as typeof validTypes[number]) ? (body.type as typeof validTypes[number]) : 'info';
    const a = serverDb.createAnnouncement({
      title: body.title,
      body: body.body,
      type,
      pinned: body.pinned ?? false,
      gameId: body.gameId,
      tags: Array.isArray(body.tags) ? body.tags : [],
    });
    return NextResponse.json(a);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Announcement> & { id?: string };
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const updated = serverDb.updateAnnouncement(body.id, {
      title: body.title,
      body: body.body,
      type: body.type,
      pinned: body.pinned,
      tags: body.tags,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  serverDb.deleteAnnouncement(id);
  return NextResponse.json({ ok: true });
}
