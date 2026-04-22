import { NextRequest } from 'next/server';
import { apiHandler } from '@/server';

type RawRow = Array<string | number | null | undefined>;

type ParsedGame = {
  gameId: string;
  spieltag: string;
  dateTime: string;
  teamHome: string;
  teamAway: string;
  result: string;
  leagueId: string;
  leagueName: string;
};

type TeamPlayerLine = {
  name: string;
  kegel: number;
  volle: number;
  abraeumen: number;
  fehl: number;
};

type DuelLine = {
  homePlayer: string;
  awayPlayer: string;
  homeKegel: number;
  awayKegel: number;
  homeSp: number;
  awaySp: number;
  homeMp: number;
  awayMp: number;
};


function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseScore(result: string): { home: number; away: number } | null {
  const match = String(result || '').match(/(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return {
    home: parseNumber(match[1]),
    away: parseNumber(match[2]),
  };
}

function isUnplayedResult(result: string): boolean {
  const normalized = String(result || '').trim();
  if (!normalized) return true;
  if (normalized.includes('--')) return true;
  return parseScore(normalized) === null;
}


function sanitizeReportText(value: string): string {
  return String(value || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/\r/g, '')
    .trim();
}

function parseWertung0Rows(rows: RawRow[]) {
  const homePlayers: TeamPlayerLine[] = [];
  const awayPlayers: TeamPlayerLine[] = [];
  let homeTotals = { kegel: 0, volle: 0, abraeumen: 0, fehl: 0 };
  let awayTotals = { kegel: 0, volle: 0, abraeumen: 0, fehl: 0 };

  for (const row of rows) {
    const leftName = String(row?.[1] ?? '').trim();
    const rightName = String(row?.[10] ?? '').trim();
    const isTotalsLike = leftName === '' && rightName === '';
    if (isTotalsLike) continue;

    if (leftName) {
      const line = {
        name: leftName,
        volle: parseNumber(row?.[2]),
        abraeumen: parseNumber(row?.[3]),
        fehl: parseNumber(row?.[4]),
        kegel: parseNumber(row?.[5]),
      };
      homePlayers.push(line);
      homeTotals = {
        kegel: homeTotals.kegel + line.kegel,
        volle: homeTotals.volle + line.volle,
        abraeumen: homeTotals.abraeumen + line.abraeumen,
        fehl: homeTotals.fehl + line.fehl,
      };
    }

    if (rightName) {
      const line = {
        name: rightName,
        volle: parseNumber(row?.[9]),
        abraeumen: parseNumber(row?.[8]),
        fehl: parseNumber(row?.[7]),
        kegel: parseNumber(row?.[6]),
      };
      awayPlayers.push(line);
      awayTotals = {
        kegel: awayTotals.kegel + line.kegel,
        volle: awayTotals.volle + line.volle,
        abraeumen: awayTotals.abraeumen + line.abraeumen,
        fehl: awayTotals.fehl + line.fehl,
      };
    }
  }

  return { homePlayers, awayPlayers, homeTotals, awayTotals };
}

function parseWertung1Rows(rows: RawRow[]) {
  const duels: DuelLine[] = [];
  let teamTotals: DuelLine | null = null;

  for (const row of rows) {
    const isTotalsRow = String(row?.[0] ?? '').trim() === '' && String(row?.[15] ?? '').trim() === '' && row?.[5] && row?.[10];
    if (isTotalsRow) {
      teamTotals = {
        homePlayer: 'Gesamt',
        awayPlayer: 'Gesamt',
        homeKegel: parseNumber(row?.[5]),
        awayKegel: parseNumber(row?.[10]),
        homeSp: parseNumber(row?.[6]),
        awaySp: parseNumber(row?.[9]),
        homeMp: parseNumber(row?.[7]),
        awayMp: parseNumber(row?.[8]),
      };
      continue;
    }

    const homePlayer = String(row?.[0] ?? '').trim();
    const awayPlayer = String(row?.[15] ?? '').trim();
    if (!homePlayer || !awayPlayer) continue;
    duels.push({
      homePlayer,
      awayPlayer,
      homeKegel: parseNumber(row?.[5]),
      awayKegel: parseNumber(row?.[10]),
      homeSp: parseNumber(row?.[6]),
      awaySp: parseNumber(row?.[9]),
      homeMp: parseNumber(row?.[7]),
      awayMp: parseNumber(row?.[8]),
    });
  }

  return { duels, teamTotals };
}

function parseTablePosition(tableRows: RawRow[], teamName: string) {
  const normalizedNeedle = normalizeText(teamName);
  const index = tableRows.findIndex((row) => normalizeText(String(row?.[2] ?? '')).includes(normalizedNeedle));
  if (index < 0) return null;
  const row = tableRows[index];
  return {
    rank: parseNumber(row?.[1]),
    teamName: String(row?.[2] ?? ''),
    games: parseNumber(row?.[5]),
    wins: parseNumber(row?.[6]),
    losses: parseNumber(row?.[7]),
    points: String(row?.[13] ?? ''),
  };
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
    .filter((item) => item.seasonId)
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
      if (found) {
        return { seasonId: season.seasonId, game: found };
      }
    }
  }

  return null;
}

async function buildReportLocally(payload: {
  game: ParsedGame;
  ownTeam: string;
  opponentTeam: string;
  ownSide: 'home' | 'away';
  score: { home: number; away: number } | null;
  ownTable: ReturnType<typeof parseTablePosition>;
  gamesLeft: number;
  stats: ReturnType<typeof parseWertung0Rows>;
}): Promise<string> {
  const ownIsHome = payload.ownSide === 'home';
  const ownKegel = ownIsHome ? payload.stats.homeTotals.kegel : payload.stats.awayTotals.kegel;
  const oppKegel = ownIsHome ? payload.stats.awayTotals.kegel : payload.stats.homeTotals.kegel;
  const ownFehl = ownIsHome ? payload.stats.homeTotals.fehl : payload.stats.awayTotals.fehl;
  const oppFehl = ownIsHome ? payload.stats.awayTotals.fehl : payload.stats.homeTotals.fehl;
  const ownPlayers = ownIsHome ? payload.stats.homePlayers : payload.stats.awayPlayers;
  const topOwn = [...ownPlayers].sort((a, b) => b.kegel - a.kegel)[0];
  const resultLine = payload.score ? `${payload.score.home}:${payload.score.away}` : payload.game.result || '--:--';
  const tableLine = payload.ownTable
    ? `Aktuell steht ${payload.ownTable.teamName} auf Platz ${payload.ownTable.rank} mit ${payload.ownTable.points} Punkten.`
    : `${payload.ownTeam} konnte in der Tabelle nicht eindeutig zugeordnet werden.`;

  return [
    `${payload.ownSide === 'away' ? 'Auswärts' : 'Heim'} weiter im Fokus – ${payload.ownTeam} gegen ${payload.opponentTeam}`,
    '',
    `Bevor wir zum Spiel kommen: Dieser Bericht wurde automatisch aus den Spieldaten erzeugt.`,
    '',
    `Am ${payload.game.dateTime || 'unbekanntem Termin'} trat ${payload.ownTeam} ${payload.ownSide === 'away' ? 'auswärts' : 'zu Hause'} gegen ${payload.opponentTeam} an.`,
    `Das offizielle Ergebnis lautet ${resultLine}. In den zusammengefassten Kegeln ergibt sich ${ownKegel}:${oppKegel} aus den Spielerzeilen.`,
    '',
    `Auffällig war die Fehlerquote: ${payload.ownTeam} mit ${ownFehl} Fehlwürfen, ${payload.opponentTeam} mit ${oppFehl} Fehlwürfen.`,
    `Im Volle/Abräumen ergeben sich für ${payload.ownTeam} ${ownIsHome ? payload.stats.homeTotals.volle : payload.stats.awayTotals.volle}/${ownIsHome ? payload.stats.homeTotals.abraeumen : payload.stats.awayTotals.abraeumen}.`,
    '',
    topOwn
      ? `Bester Wert bei ${payload.ownTeam}: ${topOwn.name} mit ${topOwn.kegel} Kegeln (V/A/F: ${topOwn.volle}/${topOwn.abraeumen}/${topOwn.fehl}).`
      : `Keine Einzelspielerwerte für ${payload.ownTeam} gefunden.`,
    '',
    tableLine,
    `Restprogramm in der Liga: ${payload.gamesLeft} offene Spiele für ${payload.ownTeam}.`,
    '',
    '#Kegeln #Spielbericht #AutomatischGeneriert',
  ].join('\n');
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameId?: string;
    };

    const gameId = String(body?.gameId || '').trim();
    if (!gameId) {
      return Response.json({ error: 'gameId is required.' }, { status: 400 });
    }

    const foundGame = await findGameAcrossSeasons(gameId);
    if (!foundGame) {
      return Response.json(
        { error: `Spiel mit id_spiel=${gameId} konnte in den letzten Saisons nicht gefunden werden.` },
        { status: 404 }
      );
    }
    const seasonId = foundGame.seasonId;
    const game = foundGame.game;
    const leagueId = game.leagueId;
    const leagueName = game.leagueName;

    const [wertung1Rows, wertung0Rows, standingsRows, planRows] = (await Promise.all([
      apiHandler.handleCommand('GetSpielerInfo', { id_saison: seasonId, id_spiel: gameId, wertung: '1' }),
      apiHandler.handleCommand('GetSpielerInfo', { id_saison: seasonId, id_spiel: gameId, wertung: '0' }),
      apiHandler.handleCommand('GetTabelle', { id_saison: seasonId, id_liga: leagueId, nr_spieltag: '100', sort: '0' }),
      apiHandler.handleCommand('GetSpielplan', { id_saison: seasonId, id_liga: leagueId }),
    ])) as [RawRow[], RawRow[], RawRow[], RawRow[]];

    const stats = parseWertung0Rows(wertung0Rows);
    const matchFacts = parseWertung1Rows(wertung1Rows);
    const score = parseScore(game.result);
    const ownSide: 'home' | 'away' = score && score.away > score.home ? 'away' : 'home';
    const ownTeam = ownSide === 'home' ? game.teamHome : game.teamAway;
    const opponentTeam = ownSide === 'home' ? game.teamAway : game.teamHome;
    const ownTable = parseTablePosition(standingsRows, ownTeam);
    const gamesLeft = planRows.filter((row) => {
      const teamHome = String(row?.[4] ?? '');
      const teamAway = String(row?.[5] ?? '');
      const result = String(row?.[6] ?? '');
      const touchesOwnTeam = normalizeText(teamHome).includes(normalizeText(ownTeam)) || normalizeText(teamAway).includes(normalizeText(ownTeam));
      if (!touchesOwnTeam) return false;
      return isUnplayedResult(result);
    }).length;

    const payload = {
      game,
      ownTeam,
      opponentTeam,
      ownSide,
      score,
      ownTable,
      gamesLeft,
      stats,
      matchFacts,
      raw: {
        wertung1Rows,
        wertung0Rows,
        standingsRows,
      },
    };

    const reportText = sanitizeReportText(await buildReportLocally(payload));

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      provider: process.env.GROK_API_KEY || process.env.XAI_API_KEY ? 'grok' : 'local-fallback',
      report: reportText,
      context: {
        seasonId,
        leagueId,
        leagueName,
        game,
        ownTeam,
        opponentTeam,
        ownSide,
        ownTable,
        gamesLeft,
        stats,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
