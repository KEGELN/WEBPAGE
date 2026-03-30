import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/server-db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get('clubId');

  if (!clubId) {
    return NextResponse.json({ error: 'Missing clubId' }, { status: 400 });
  }

  const club = serverDb.getClubs().find((entry) => entry.id === clubId) ?? null;
  if (!club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }

  return NextResponse.json({
    club,
    members: serverDb.getClubMembers().filter((member) => member.clubId === clubId),
    messages: serverDb.getClubMessages().filter((message) => message.clubId === clubId),
    polls: serverDb.getClubPolls().filter((poll) => poll.clubId === clubId),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as
      | {
          action?: 'message';
          clubId?: string;
          authorType?: 'trainer' | 'player' | 'guest';
          authorId?: string;
          authorName?: string;
          text?: string;
        }
      | {
          action?: 'vote';
          pollId?: string;
          memberType?: 'trainer' | 'player' | 'guest';
          memberId?: string;
          displayName?: string;
          status?: 'yes' | 'no' | 'maybe';
        };

    if (body.action === 'message') {
      if (!body.clubId || !body.authorType || !body.authorId || !body.authorName?.trim() || !body.text?.trim()) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const saved = serverDb.saveClubMessage({
        clubId: body.clubId,
        authorType: body.authorType,
        authorId: body.authorId,
        authorName: body.authorName.trim(),
        text: body.text.trim(),
      });
      return NextResponse.json(saved);
    }

    if (body.action === 'vote') {
      if (!body.pollId || !body.memberType || !body.memberId || !body.displayName?.trim() || !body.status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const updated = serverDb.voteClubPoll({
        pollId: body.pollId,
        memberType: body.memberType,
        memberId: body.memberId,
        displayName: body.displayName.trim(),
        status: body.status,
      });

      if (!updated) {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
