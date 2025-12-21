// lib/api-service.ts

interface Season {
  season_id: string;
  yearof_season: number;
  status: number;
}

interface Club {
  id?: string;
  nr_club: string;
  name_klub: string;
}

interface District {
  bezirk_id: string;
  name_des_bezirks: string;
}

interface League {
  liga_id: string;
  name_der_liga: string;
  kontakt_name?: string;
  kontakt_tel1?: string;
  kontakt_tel2?: string;
  kontakt_email1?: string;
  kontakt_email2?: string;
}

interface Game {
  game_id: string;
  spiel_datum: string;
  spiel_uhrzeit: string;
  team1_name: string;
  team2_name: string;
  status: string;
  additional_info: string;
}

interface Standings {
  team_id: string;
  position: number;
  team_name: string;
  spiele: number;
  siege: number;
  niederlagen: number;
  punkte: number;
}

class ApiService {
  private static instance: ApiService;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async makeRequest(command: string, params: Record<string, any>): Promise<any> {
    // Make request to the server-side API route
    const formData = new URLSearchParams({
      command: command,
      ...params
    });

    try {
      const response = await fetch('/api/sportwinner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error making request for command ${command}:`, error);
      // Return empty data as fallback
      return [];
    }
  }

  async getCurrentSeason(): Promise<Season[]> {
    const response = await this.makeRequest('GetSaisonArray', {});

    // Format the response to match the expected interface
    if (Array.isArray(response)) {
      return response.map(item => ({
        season_id: item[0],
        yearof_season: parseInt(item[1]),
        status: parseInt(item[2])
      }));
    }

    return [];
  }

  async searchClubs(query: string, seasonId?: string): Promise<Club[]> {
    // If no season ID is provided, try to get the current season
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = await this.makeRequest('GetKlub', {
      id_saison,
      name_klub: query
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        id: item[0], // This might be the club ID based on api.org
        nr_club: item[1],
        name_klub: item[2],
      }));
    }

    return [];
  }

  async getDistricts(seasonId?: string): Promise<District[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = await this.makeRequest('GetBezirkArray', {
      id_saison
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        bezirk_id: item[0],
        name_des_bezirks: item[1],
      }));
    }

    return [];
  }

  async getLeagues(seasonId?: string, districtId?: string): Promise<League[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_bezirk = districtId || '0'; // default to '0' if not specified

    const response = await this.makeRequest('GetLigaArray', {
      id_saison,
      id_bezirk,
      art: 1
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        liga_id: item[0],
        name_der_liga: item[2],
        kontakt_name: item[4],
        kontakt_tel1: item[5],
        kontakt_tel2: item[6],
        kontakt_email1: item[7],
        kontakt_email2: item[8],
      }));
    }

    return [];
  }

  async getGames(seasonId?: string, leagueId?: string, districtId?: string): Promise<Game[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_liga = leagueId;
    const id_bezirk = districtId || '0';

    const response = await this.makeRequest('GetSpiel', {
      id_saison,
      id_klub: 0,
      id_bezirk,
      id_liga,
      id_spieltag: 0,
      art_bezirk: 2,
      art_liga: 0,
      art_spieltag: 0
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        game_id: item[0],
        spiel_datum: item[1],
        spiel_uhrzeit: item[2],
        team1_name: item[3],
        team2_name: item[6],
        status: item[9],
        additional_info: item[13],
      }));
    }

    return [];
  }

  async getStandings(leagueId: string, seasonId?: string): Promise<Standings[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = await this.makeRequest('GetTabelle', {
      id_saison,
      id_liga: leagueId,
      nr_spieltag: 100,
      sort: 0
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        team_id: item[0],
        position: parseInt(item[1]),
        team_name: item[2],
        spiele: parseInt(item[5]),
        siege: parseInt(item[6]),
        niederlagen: parseInt(item[7]),
        punkte: parseFloat(item[13]),
      }));
    }

    return [];
  }

  async getSchnitt(seasonId?: string, leagueId?: string, clubId?: string, spieltagNr: number = 100, sort: number = 0, anzahl: number = 20): Promise<any[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_klub = clubId || '0';
    const id_liga = leagueId || '0';

    const response = await this.makeRequest('GetSchnitt', {
      id_saison,
      id_klub,
      id_liga,
      nr_spieltag: spieltagNr,
      sort,
      anzahl
    });

    if (Array.isArray(response)) {
      // The exact structure depends on the API response
      // For now, return the raw response and we can format it later
      return response;
    }

    return [];
  }

  async searchPlayers(query: string): Promise<any[]> {
    // Make request to the server-side API route
    const formData = new URLSearchParams({
      command: 'SearchPlayers', // Using a custom command for player search
      query: query
    });

    try {
      const response = await fetch('/api/sportwinner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // For now, return example data directly since we don't have a specific route for player search
      const allPlayers = [
        { id: "1", name: "Böse, Stefan", club: "BSV GW Friedrichshain", type: "Player" },
        { id: "2", name: "Wiesner, Rico", club: "SV Frieden Beyern", type: "Player" },
        { id: "3", name: "Ziesche, Klaus", club: "ESV Lok Elsterwerda", type: "Player" },
        { id: "4", name: "Müller, Hans", club: "Kegelklub Berlin", type: "Player" },
        { id: "5", name: "Schmidt, Anna", club: "Kegelverein Hamburg", type: "Player" },
        { id: "6", name: "Becker, Thomas", club: "Kegelgemeinschaft München", type: "Player" },
        { id: "7", name: "Koch, Maria", club: "Kegelclub Köln", type: "Player" },
        { id: "8", name: "Richter, Peter", club: "Kegelverein Dresden", type: "Player" }
      ];

      if (query) {
        return allPlayers.filter(player =>
          player.name.toLowerCase().includes(query.toLowerCase()) ||
          player.club.toLowerCase().includes(query.toLowerCase())
        );
      }

      return allPlayers;
    } catch (error) {
      console.error('Error making player search request:', error);
      // Return empty data as fallback
      return [];
    }
  }

  async getCurrentSeason(): Promise<Season[]> {
    const response = await this.makeRequest('GetSaisonArray', {});

    // Format the response to match the expected interface
    if (Array.isArray(response)) {
      return response.map(item => ({
        season_id: item[0],
        yearof_season: parseInt(item[1]),
        status: parseInt(item[2])
      }));
    }

    return [];
  }

  async getLeagues(seasonId?: string, districtId?: string): Promise<League[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_bezirk = districtId || '0'; // default to '0' if not specified

    const response = await this.makeRequest('GetLigaArray', {
      id_saison,
      id_bezirk,
      art: 1
    });

    if (Array.isArray(response)) {
      return response.map(item => ({
        liga_id: item[0],
        name_der_liga: item[2],
        kontakt_name: item[4],
        kontakt_tel1: item[5],
        kontakt_tel2: item[6],
        kontakt_email1: item[7],
        kontakt_email2: item[8],
      }));
    }

    return [];
  }
}

export default ApiService;