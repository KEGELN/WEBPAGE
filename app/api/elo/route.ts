import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

type EloRow = {
  timestamp: number;
  date: string;
  elo: number;
  avgKegel: number;
  winRate: number;
  result: number;
  opponent: string;
  team: string;
  isHome: boolean;
  leagueName: string;
};

type PlayerSummary = {
  playerName: string;
  currentElo: number;
  peakElo: number;
  minElo: number;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKegel: number;
  history: EloRow[];
};

// Module-level cache — parsed once per server process lifetime
let cachedIndex: Map<string, EloRow[]> | null = null;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildIndex(): Map<string, EloRow[]> {
  const csvPath = path.join(process.cwd(), 'refs', '1finalDataset.csv');
  if (!fs.existsSync(csvPath)) return new Map();

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return new Map();

  const header = lines[0].split(',');
  const col = (name: string) => header.indexOf(name);

  const C = {
    name:       col('player_name'),
    ts:         col('match_timestamp'),
    elo:        col('player_elo_pre'),
    avgKegel:   col('player_avg_kegel_pre'),
    winRate:    col('player_winrate_pre'),
    result:     col('RESULT'),
    opponent:   col('opponent_name'),
    team:       col('player_team'),
    isHome:     col('player_is_home'),
    league:     col('league_name'),
  };

  const index = new Map<string, EloRow[]>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (names are quoted)
    const parts: string[] = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { parts.push(current); current = ''; continue; }
      current += ch;
    }
    parts.push(current);

    const name = parts[C.name]?.trim() ?? '';
    if (!name) continue;

    const ts = parseInt(parts[C.ts] ?? '0', 10);
    const row: EloRow = {
      timestamp:  ts,
      date:       new Date(ts * 1000).toISOString().slice(0, 10),
      elo:        parseFloat(parts[C.elo] ?? '1500'),
      avgKegel:   parseFloat(parts[C.avgKegel] ?? '0'),
      winRate:    parseFloat(parts[C.winRate] ?? '0'),
      result:     parseFloat(parts[C.result] ?? '0'),
      opponent:   parts[C.opponent]?.trim() ?? '',
      team:       parts[C.team]?.trim() ?? '',
      isHome:     parts[C.isHome]?.trim() === '1',
      leagueName: parts[C.league]?.trim() ?? '',
    };

    const key = normalizeName(name);
    const existing = index.get(key);
    if (existing) {
      existing.push(row);
    } else {
      index.set(key, [row]);
    }
  }

  // Sort each player's history chronologically
  for (const rows of index.values()) {
    rows.sort((a, b) => a.timestamp - b.timestamp);
  }

  return index;
}

function getIndex(): Map<string, EloRow[]> {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

function fuzzyFind(index: Map<string, EloRow[]>, query: string): [string, EloRow[]] | null {
  const q = normalizeName(query);

  // Exact match
  if (index.has(q)) return [q, index.get(q)!];

  // Partial match (handle "Firstname Lastname" vs "Lastname, Firstname")
  const reversed = q.includes(',')
    ? q.split(',').map((s) => s.trim()).reverse().join(' ')
    : q.split(' ').reverse().join(', ');

  if (index.has(reversed)) return [reversed, index.get(reversed)!];

  // Substring match
  for (const [key, rows] of index) {
    if (key.includes(q) || q.includes(key)) return [key, rows];
  }

  return null;
}

export async function GET(request: NextRequest) {
  const name = new URL(request.url).searchParams.get('name') ?? '';
  if (!name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const index = getIndex();
  const found = fuzzyFind(index, name.trim());
  if (!found) {
    return NextResponse.json({ error: 'Player not found in ELO dataset' }, { status: 404 });
  }

  const [, rows] = found;
  const elos = rows.map((r) => r.elo);
  const wins = rows.filter((r) => r.result >= 1).length;
  const kegelVals = rows.map((r) => r.avgKegel).filter((v) => v > 0);

  const summary: PlayerSummary = {
    playerName: name.trim(),
    currentElo: elos[elos.length - 1] ?? 1500,
    peakElo: Math.max(...elos),
    minElo: Math.min(...elos),
    totalGames: rows.length,
    wins,
    losses: rows.length - wins,
    winRate: rows.length ? wins / rows.length : 0,
    avgKegel: kegelVals.length ? kegelVals[kegelVals.length - 1] : 0,
    history: rows,
  };

  return NextResponse.json(summary);
}
