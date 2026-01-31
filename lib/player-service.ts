// lib/player-service.ts
import ApiService from './api-service';

interface Player {
  rank: number;
  id: string;
  name: string;
  club?: string;
  league?: string;
  category?: string;
  gamesTotal?: number;
  avgTotal?: string;
  mpTotal?: number;
  gamesHome?: number;
  avgHome?: string;
  mpHome?: number;
  gamesAway?: number;
  avgAway?: string;
  mpAway?: number;
  bestGame?: number;
  average?: string;
  schnitt?: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageScore?: number;
  ranking?: number;
}

class PlayerService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async getPlayerSchnitliste(seasonId?: string, leagueId?: string): Promise<Player[]> {
    try {
      // Use the API service to get full player stats with season and league filters
      const rawPlayerData = await this.apiService.getFullPlayerStats(seasonId, leagueId);

      // Return the raw data directly since the component expects the detailed stats format
      return rawPlayerData as Player[];
    } catch (error) {
      console.error('Error fetching player list:', error);
      throw error; // Re-throw the error instead of returning mock data
    }
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    try {
      // Placeholder implementation - in a real scenario, you might need a specific API call
      // for individual player stats
      console.log('Fetching player stats for playerId:', playerId);
      return {
        playerId,
        playerName: `Player ${playerId}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        averageScore: 0,
        ranking: parseInt(playerId) || 0
      };
    } catch (error) {
      console.error('Error fetching player stats:', error);
      // Return default player stats in case of error
      return {
        playerId,
        playerName: `Player ${playerId}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        averageScore: 0,
        ranking: parseInt(playerId) || 0
      };
    }
  }
}

export default PlayerService;