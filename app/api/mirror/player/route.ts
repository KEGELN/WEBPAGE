import { NextRequest, NextResponse } from 'next/server';
import { getMirrorStore } from '@/lib/mirror-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const profile = await getMirrorStore().playerProfile(name);
    if (!profile.found) {
      return NextResponse.json(profile, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Mirror player lookup failed', error);
    return NextResponse.json({ error: 'Mirror player lookup failed' }, { status: 500 });
  }
}
