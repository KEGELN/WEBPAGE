export const DEFAULT_LEAGUE_STORAGE_KEY = 'kegel:defaultLeagueId';
export const FAVORITE_TEAMS_KEY = 'kegel:favoriteTeams';
export const FAVORITE_LEAGUE_KEY = 'kegel:favoriteLeagueId';

export function readDefaultLeagueId(): string {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem(DEFAULT_LEAGUE_STORAGE_KEY) || '').trim();
}

export function writeDefaultLeagueId(leagueId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = String(leagueId || '').trim();
  if (!trimmed) {
    window.localStorage.removeItem(DEFAULT_LEAGUE_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(DEFAULT_LEAGUE_STORAGE_KEY, trimmed);
}

export function readFavoriteLeagueId(): string {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem(FAVORITE_LEAGUE_KEY) || '').trim();
}

export function writeFavoriteLeagueId(leagueId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITE_LEAGUE_KEY, leagueId);
  // Keep default league in sync
  writeDefaultLeagueId(leagueId);
}

export type FavoriteTeam = { clubId: string; clubName: string; leagueId?: string };

export function readFavoriteTeams(): FavoriteTeam[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAVORITE_TEAMS_KEY) || '[]') as FavoriteTeam[];
  } catch {
    return [];
  }
}

export function writeFavoriteTeams(teams: FavoriteTeam[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(teams));
}

export function toggleFavoriteTeam(team: FavoriteTeam): FavoriteTeam[] {
  const current = readFavoriteTeams();
  const exists = current.some((t) => t.clubId === team.clubId);
  const next = exists ? current.filter((t) => t.clubId !== team.clubId) : [...current, team];
  writeFavoriteTeams(next);
  return next;
}

export function isFavoriteTeam(clubId: string): boolean {
  return readFavoriteTeams().some((t) => t.clubId === clubId);
}
