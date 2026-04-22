import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(serverDb.getTodos());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text?: string; priority?: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }
    const priority = (['low', 'medium', 'high'].includes(body.priority ?? '') ? body.priority : 'medium') as 'low' | 'medium' | 'high';
    const todo = serverDb.createTodo(body.text, priority);
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; text?: string; done?: boolean; priority?: string };
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const patch: Parameters<typeof serverDb.updateTodo>[1] = {};
    if (body.text !== undefined) patch.text = body.text;
    if (body.done !== undefined) patch.done = body.done;
    if (body.priority !== undefined && ['low', 'medium', 'high'].includes(body.priority)) {
      patch.priority = body.priority as 'low' | 'medium' | 'high';
    }
    const updated = serverDb.updateTodo(body.id, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  serverDb.deleteTodo(id);
  return NextResponse.json({ ok: true });
}
