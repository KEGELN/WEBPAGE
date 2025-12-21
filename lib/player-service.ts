// lib/player-service.ts
import ApiService from './api-service';
import { PlayerHandler } from '@/server';

interface Player {
  id: string;
  name: string;
  club?: string;
  league?: string;
  category?: string;
  games?: number;
  wins?: number;
  losses?: number;
  total?: number;
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
  private playerHandler: PlayerHandler;

  constructor() {
    this.apiService = ApiService.getInstance();
    this.playerHandler = new PlayerHandler();
  }

  async getPlayerSchnitliste(seasonId?: string, leagueId?: string): Promise<Player[]> {
    try {
      // Use the player handler to get data
      const players = await this.playerHandler.getPlayerSchnitliste(seasonId, leagueId);

      // Add additional properties for the table view if not already present
      return players.map((player, index) => ({
        ...player,
        id: player.id || (index + 1).toString(),
        category: player.category || 'Männer',
        games: player.games || 4,
        wins: player.wins || 4,
        losses: player.losses || 8,
        total: player.total || 589,
        average: player.average || '600,25',
        schnitt: player.schnitt || '594,63'
      }));
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
    try {
      // Use the player handler to get data
      return await this.playerHandler.getPlayerStats(playerId);
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