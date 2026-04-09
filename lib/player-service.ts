// lib/player-service.ts

import ApiService from './api-service';

export interface PlayerHistoryEntry {
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

interface PlayerStats {
  found: boolean;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageScore: number;
  ranking?: number | null;
  clubs?: string[];
  history?: PlayerHistoryEntry[];
}

export interface SchnittPlayerRow {
  rank?: number;
  id?: string;
  name?: string;
  club?: string;
  category?: string;
  gamesTotal?: number | string;
  avgTotal?: string;
  mpTotal?: number | string;
  gamesHome?: number | string;
  avgHome?: string;
  mpHome?: number | string;
  gamesAway?: number | string;
  avgAway?: string;
  mpAway?: number | string;
  bestGame?: number | string;
}

class PlayerService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async getPlayerSchnitliste(
    seasonId?: string,
    leagueId?: string,
    spieltagNr?: number
  ): Promise<SchnittPlayerRow[]> {
    try {
      const rows = await this.apiService.getFullPlayerStats(seasonId, leagueId, spieltagNr);
      return rows as SchnittPlayerRow[];
    } catch (error) {
      console.error('Error fetching player list:', error);
      throw error;
    }
  }

  async getPlayerStats(playerName: string): Promise<PlayerStats> {
    const res = await fetch(`/api/mirror/player?name=${encodeURIComponent(playerName)}`);
    const payload = (await res.json()) as PlayerStats;
    if (!res.ok && res.status !== 404) {
      throw new Error('Failed to fetch player profile');
    }
    return payload;
  }
}

export default PlayerService;
