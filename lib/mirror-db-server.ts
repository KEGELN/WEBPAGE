import { execFileSync } from 'child_process';
import path from 'path';

type MirrorSearchResult = {
  player_name?: string;
  club_name?: string;
  game_count?: number;
  last_game_date?: string;
};

export interface MirrorPlayerHistoryEntry {
  gameId: string;
  date: string | null;
  time: string | null;
  league: string | null;
  spieltag: string | null;
  club: string | null;
  opponentClub: string | null;
  result: string | null;
  teamResult: string | null;
  holz: string | null;
  sp: string | null;
  mp: string | null;
  side: 'home' | 'away';
}

export interface MirrorPlayerProfile {
  found: boolean;
  playerName: string;
  clubs?: string[];
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  averageScore?: number;
  ranking?: number | null;
  history?: MirrorPlayerHistoryEntry[];
}

export interface MirrorClubHistoryEntry {
  gameId: string;
  date: string | null;
  time: string | null;
  league: string | null;
  spieltag: string | null;
  opponentClub: string | null;
  result: string | null;
  teamResult: string | null;
  side: 'home' | 'away';
}

export interface MirrorClubProfile {
  found: boolean;
  clubName: string;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  history?: MirrorClubHistoryEntry[];
}

function runMirrorQuery(args: string[]): unknown {
  const scriptPath = path.join(process.cwd(), 'mirror-db', 'query_db.py');
  const output = execFileSync('python3', [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  if (!output) {
    return [];
  }

  return JSON.parse(output) as unknown;
}

export function searchMirror(query: string) {
  const players = runMirrorQuery(['search-players', query, '--limit', '12']) as MirrorSearchResult[];
  const clubs = runMirrorQuery(['search-clubs', query, '--limit', '12']) as MirrorSearchResult[];

  return {
    players: players.map((row) => ({
      name: row.player_name ?? '',
      club: row.club_name ?? '',
      gameCount: Number(row.game_count ?? 0),
      lastGameDate: row.last_game_date ?? '',
    })),
    clubs: clubs.map((row) => ({
      name: row.club_name ?? '',
      gameCount: Number(row.game_count ?? 0),
      lastGameDate: row.last_game_date ?? '',
    })),
  };
}

export function getMirrorPlayerProfile(name: string): MirrorPlayerProfile {
  return runMirrorQuery(['player-profile', name, '--limit', '12']) as MirrorPlayerProfile;
}

export function getMirrorClubProfile(name: string): MirrorClubProfile {
  return runMirrorQuery(['club-profile', name, '--limit', '20']) as MirrorClubProfile;
}

export function getMirrorGameDetail(gameId: string) {
  const payload = runMirrorQuery(['game-detail', gameId]) as {
    header: Record<string, unknown> | null;
    rows: Array<Array<string | number | null>>;
  };

  return {
    header: payload.header,
    rows: payload.rows || [],
  };
}
