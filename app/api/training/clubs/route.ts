import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainerEmail = searchParams.get('trainerEmail');
  const memberType = searchParams.get('memberType');
  const memberId = searchParams.get('memberId');
  const inviteToken = searchParams.get('inviteToken');

  let clubs = serverDb.getClubs();

  if (trainerEmail) {
    clubs = clubs.filter((club) => club.ownerTrainerEmail === trainerEmail);
  }

  if (memberType && memberId) {
    const memberships = serverDb
      .getClubMembers()
      .filter((member) => member.memberType === memberType && member.memberId === memberId);
    const clubIds = new Set(memberships.map((member) => member.clubId));
    clubs = clubs.filter((club) => clubIds.has(club.id));
  }

  if (inviteToken) {
    clubs = clubs.filter((club) => club.inviteToken === inviteToken);
  }

  return NextResponse.json(clubs);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as
      | { action?: 'create'; name?: string; ownerTrainerEmail?: string; ownerName?: string }
      | { action?: 'add-member'; clubId?: string; playerId?: string }
      | { action?: 'join'; inviteToken?: string; memberType?: 'trainer' | 'player' | 'guest'; memberId?: string; displayName?: string };

    if (body.action === 'create') {
      if (!body.name?.trim() || !body.ownerTrainerEmail || !body.ownerName?.trim()) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const created = serverDb.createClub({
        name: body.name.trim(),
        ownerTrainerEmail: body.ownerTrainerEmail,
        ownerName: body.ownerName.trim(),
      });
      return NextResponse.json(created);
    }

    if (body.action === 'join') {
      if (!body.inviteToken || !body.memberType || !body.memberId || !body.displayName?.trim()) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const joined = serverDb.joinClub({
        inviteToken: body.inviteToken,
        memberType: body.memberType,
        memberId: body.memberId,
        displayName: body.displayName.trim(),
      });

      if (joined === 'forbidden') {
        return NextResponse.json({ error: 'Deine Spieler-ID wurde vom Trainer noch nicht für diesen Club freigeschaltet.' }, { status: 403 });
      }

      if (!joined) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 });
      }

      return NextResponse.json(joined);
    }

    if (body.action === 'add-member') {
      if (!body.clubId || !body.playerId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const updated = serverDb.addClubAllowedPlayer(body.clubId, body.playerId.toUpperCase());
      if (!updated) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
