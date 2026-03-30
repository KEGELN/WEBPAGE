import { NextRequest, NextResponse } from 'next/server';
import APIHandler from '@/server/api-handler';

type RawRow = Array<string | number | null | undefined>;

interface ParsedGame {
  gameId: string;
  spieltag: string;
  dateTime: string;
  teamHome: string;
  teamAway: string;
  result: string;
  leagueId: string;
  leagueName: string;
}

const apiHandler = new APIHandler();

function parseNumber(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCompletedResult(result: string) {
  return /\d+\s*:\s*\d+/.test(String(result || ''));
}

async function findGameInLeague(seasonId: string, leagueId: string, gameId: string, leagueName = ''): Promise<ParsedGame | null> {
  const plan = (await apiHandler.handleCommand('GetSpielplan', {
    id_saison: seasonId,
    id_liga: leagueId,
  })) as RawRow[];

  const match = plan.find((row) => String(row?.[1] ?? '') === gameId);
  if (!match) return null;

  return {
    gameId: String(match[1] ?? ''),
    spieltag: String(match[0] ?? ''),
    dateTime: String(match[3] ?? ''),
    teamHome: String(match[4] ?? ''),
    teamAway: String(match[5] ?? ''),
    result: String(match[6] ?? ''),
    leagueId,
    leagueName,
  };
}

async function findGameAcrossSeasons(gameId: string): Promise<{ seasonId: string; game: ParsedGame } | null> {
  const seasons = (await apiHandler.handleCommand('GetSaisonArray', {})) as RawRow[];
  const sortedSeasons = seasons
    .map((row) => ({
      seasonId: String(row?.[0] ?? ''),
      year: parseNumber(row?.[1]),
    }))
    .filter((entry) => entry.seasonId)
    .sort((a, b) => b.year - a.year)
    .slice(0, 20);

  for (const season of sortedSeasons) {
    const [art1, art2] = (await Promise.all([
      apiHandler.handleCommand('GetLigaArray', { id_saison: season.seasonId, id_bezirk: '0', art: '1' }),
      apiHandler.handleCommand('GetLigaArray', { id_saison: season.seasonId, id_bezirk: '0', art: '2' }),
    ])) as [RawRow[], RawRow[]];

    const leagueMap = new Map<string, string>();
    [...art1, ...art2].forEach((row) => {
      const id = String(row?.[0] ?? '');
      const name = String(row?.[2] ?? '');
      if (id && !leagueMap.has(id)) leagueMap.set(id, name);
    });

    for (const [leagueId, leagueName] of leagueMap.entries()) {
      const found = await findGameInLeague(season.seasonId, leagueId, gameId, leagueName);
      if (found) return { seasonId: season.seasonId, game: found };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = String(searchParams.get('gameId') || '').trim();

  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    const found = await findGameAcrossSeasons(gameId);
    if (!found) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      gameId: found.game.gameId,
      seasonId: found.seasonId,
      leagueId: found.game.leagueId,
      leagueName: found.game.leagueName,
      spieltag: found.game.spieltag,
      dateTime: found.game.dateTime,
      teamHome: found.game.teamHome,
      teamAway: found.game.teamAway,
      result: found.game.result,
      isCompleted: isCompletedResult(found.game.result),
      detailRows: isCompletedResult(found.game.result)
        ? ((await apiHandler.handleCommand('GetSpielerInfo', {
            id_saison: found.seasonId,
            id_spiel: found.game.gameId,
            wertung: '1',
          })) as RawRow[])
        : [],
    });
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
