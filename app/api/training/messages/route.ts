import { NextRequest, NextResponse } from 'next/server';
import { getTrainingStore } from '@/lib/training-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const trainerEmail = searchParams.get('trainerEmail');

  let messages = await getTrainingStore().getTrainerMessages();
  if (playerId) {
    messages = messages.filter((message) => message.playerId === playerId);
  }
  if (trainerEmail) {
    messages = messages.filter((message) => message.trainerEmail === trainerEmail);
  }

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      playerId?: string;
      trainerEmail?: string;
      text?: string;
    };

    if (!body.playerId || !body.trainerEmail || !body.text?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const saved = await getTrainingStore().saveTrainerMessage({
      playerId: body.playerId,
      trainerEmail: body.trainerEmail,
      text: body.text.trim(),
    });

    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
