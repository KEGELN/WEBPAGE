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

const DEFAULT_MEMORIAL_TEXT =
  'Wir gedenken an Jürgen Tippmann, der am 19.02.2026 von uns gegangen ist. Ruhe in Frieden.';

const DEFAULT_STYLE_SAMPLE = `
Auswärts weiterhin ungeschlagen – Bären bezwingen Tauer in hart umkämpftem Spiel

Bevor wir mit dem Spielbericht beginnen: Wir gedenken an Jürgen Tippmann, der am 19.2.26 von uns gegangen ist. Jürgen war mehr als 20 Jahre Mitglied beim KSC-RW-Berliner Bär und hat in seiner aktiven Zeit das Kegeln geliebt und gelebt.

Nun zum Spiel: Erzähle den Verlauf mit Startpaar, Mittelpaar und Schlusspaar, arbeite mit konkreten Zahlen aus den Daten und beschreibe Wendepunkte mit Emotion, aber ohne Fakten zu erfinden.

Abschluss: Tabellenlage, verbleibende Spiele, kurzer Ausblick und passende Hashtags.
`.trim();

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

function toPromptJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
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

async function generateWithGrok(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
  if (!apiKey) return null;

  const apiUrl = process.env.GROK_API_URL || process.env.XAI_API_URL || 'https://api.x.ai/v1/chat/completions';
  const model = process.env.GROK_MODEL || 'grok-3-mini';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Grok request failed (${response.status}): ${txt.slice(0, 400)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json?.choices?.[0]?.message?.content?.trim();
  return content || null;
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
      raw: {
        wertung1Rows,
        wertung0Rows,
        standingsRows,
      },
    };

    const systemPrompt = [
      'Du bist ein Redakteur für Kegel-Spielberichte.',
      'Schreibe auf Deutsch im emotionalen Vereinsstil mit klarer Dramaturgie.',
      'Format: Titel, Gedenkabsatz, Spielverlauf (Startpaar/Mittelpaar/Schlusspaar), Tabellenlage & Ausblick, Hashtags.',
      'Nutze konsequent konkrete Zahlen aus den gelieferten Daten (Ergebnis, Kegel, Volle, Abräumen, Fehlwürfe, Tabellenkontext, Restspiele).',
      'Keine erfundenen Fakten. Wenn etwas fehlt, klar als fehlend benennen.',
      'Halte dich eng am Stilbeispiel.',
    ].join(' ');

    const userPrompt = [
      `Erzeuge einen ausführlichen Spielbericht für ${payload.ownTeam}.`,
      `Gedenkabsatz (immer verwenden): ${DEFAULT_MEMORIAL_TEXT}`,
      `Stilbeispiel:\n${DEFAULT_STYLE_SAMPLE}`,
      `Daten:\n${toPromptJson(payload)}`,
      'Wichtig: Bitte auch einen kurzen Abschnitt "Tabellenlage & Ausblick" mit Platzierung und verbleibenden Spielen schreiben.',
    ]
      .filter(Boolean)
      .join('\n\n');

    let reportText: string;
    try {
      const aiText = await generateWithGrok(systemPrompt, userPrompt);
      reportText = aiText || (await buildReportLocally(payload));
    } catch (aiError) {
      console.warn('Grok generation failed, using local fallback:', aiError);
      reportText = await buildReportLocally(payload);
    }

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
