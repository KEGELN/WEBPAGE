import { NextRequest, NextResponse } from 'next/server';
import { getMirrorStore } from '@/lib/mirror-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerKey = searchParams.get('id')?.trim();

  if (!playerKey) {
    return NextResponse.json({ error: 'Missing player ID' }, { status: 400 });
  }

  try {
    const profile = await getMirrorStore().playerProfile(playerKey);
    if (!profile.found) {
      return NextResponse.json(profile, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Mirror player lookup failed', error);
    return NextResponse.json({ error: 'Mirror player lookup failed' }, { status: 500 });
  }
}
