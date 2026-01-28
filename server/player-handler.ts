// server/player-handler.ts
import APIHandler from './api-handler';

export interface Player {
  id: string;
  name: string;
  club?: string;
  category?: string;
  games?: number;
  wins?: number;
  losses?: number;
  total?: number;
  average?: string;
  schnitt?: string;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageScore?: number;
}

export class PlayerHandler {
    private apiHandler: APIHandler;

  constructor() {
    this.apiHandler = new APIHandler();
  }

  async getPlayerSchnitliste(seasonId?: string, leagueId?: string): Promise<Player[]> {
    try {
      // Use the API handler to get full player stats with season and league filters
      return await this.apiHandler.getFullPlayerStats(seasonId, leagueId);
    } catch (error) {
      console.error('Error fetching player list:', error);
      // Return mock data in case of error
      return [
        { id: '1', name: 'Böse, Stefan', club: 'BSV GW Friedrichshain', category: 'Männer', games: 4, wins: 4, losses: 8, total: 589, average: '600,25', schnitt: '594,63' },
        { id: '2', name: 'Wiesner, Rico', club: 'SV Frieden Beyern', category: 'Männer', games: 4, wins: 3, losses: 7, total: 629, average: '591,67', schnitt: '613' },
        { id: '3', name: 'Ziesche, Klaus', club: 'ESV Lok Elsterwerda', category: 'Sen B m', games: 1, wins: 1, losses: 2, total: 562, average: '587', schnitt: '574,5' },
        { id: '4', name: 'Potratz, Clemens', club: 'BSV GW Friedrichshain', category: 'Männer', games: 3, wins: 2, losses: 6, total: 542, average: '578,33', schnitt: '560,17' },
      ];
    }
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    console.log(
      'API call intercepted for getPlayerStats with playerId:',
      playerId
    );

    // Placeholder until real endpoint exists
    return {
      playerId,
      playerName: `Player ${playerId}`,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      averageScore: 0
    };
  }
}
