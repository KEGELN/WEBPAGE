export const DEFAULT_LEAGUE_STORAGE_KEY = 'kegel:defaultLeagueId';

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
