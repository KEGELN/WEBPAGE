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
  wertung?: string;
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

interface SpielplanEntry {
  spieltag: string;
  game_id: string;
  game_nr: string;
  date_time: string;
  team_home: string;
  team_away: string;
  result: string;
  points_home: string;
  points_away: string;
}

interface SpieltagEntry {
  id: string;
  nr: string;
  label: string;
  status: string;
}

type SportwinnerCell = string | number | null | undefined;
type SportwinnerRow = SportwinnerCell[];
type SportwinnerTable = SportwinnerRow[];
type SpielInfoRow = string[];
interface SpielberichtRequest {
  gameId: string;
}

class ApiService {
  private static instance: ApiService;
  private static readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly inFlightRequests = new Map<string, Promise<unknown>>();

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async makeRequest(command: string, params: Record<string, string | number | undefined>): Promise<unknown> {
    // Make request to the server-side API route
    const formData = new URLSearchParams({
      command: command,
      ...params
    });
    const requestKey = `${command}:${formData.toString()}`;
    const existing = this.inFlightRequests.get(requestKey);
    if (existing) {
      return existing;
    }

    const requestPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ApiService.REQUEST_TIMEOUT_MS);
        const response = await fetch('/api/sportwinner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          // Some seasons/leagues return intermittent 500 from upstream.
          // Keep the UI functional and let callers continue with partial data.
          console.warn(`Sportwinner request failed for ${command} with status ${response.status}`);
          return [];
        }

        return await response.json();
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') {
          console.warn(`Sportwinner request timed out for ${command}`);
          return [];
        }
        console.warn(`Error making request for command ${command}:`, error);
        return [];
      } finally {
        this.inFlightRequests.delete(requestKey);
      }
    })();

    this.inFlightRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  private asTable(value: unknown): SportwinnerTable {
    return Array.isArray(value) ? value.filter((row): row is SportwinnerRow => Array.isArray(row)) : [];
  }

  async getCurrentSeason(): Promise<Season[]> {
    const response = this.asTable(await this.makeRequest('GetSaisonArray', {}));

    // Format the response to match the expected interface
    return response.map(item => ({
      season_id: String(item[0] ?? ''),
      yearof_season: parseInt(String(item[1] ?? '0'), 10),
      status: parseInt(String(item[2] ?? '0'), 10)
    }));
  }

  async searchClubs(query: string, seasonId?: string): Promise<Club[]> {
    // If no season ID is provided, try to get the current season
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = this.asTable(await this.makeRequest('GetKlub', {
      id_saison,
      name_klub: query
    }));

    return response.map(item => ({
      id: String(item[0] ?? ''), // This might be the club ID based on api.org
      nr_club: String(item[1] ?? ''),
      name_klub: String(item[2] ?? ''),
    }));
  }

  async getDistricts(seasonId?: string): Promise<District[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = this.asTable(await this.makeRequest('GetBezirkArray', {
      id_saison
    }));

    return response.map(item => ({
      bezirk_id: String(item[0] ?? ''),
      name_des_bezirks: String(item[1] ?? ''),
    }));
  }

  async getLeagues(
    seasonId?: string,
    districtId?: string,
    art?: number | string,
    favorit: string = ''
  ): Promise<League[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_bezirk = districtId || '0'; // default to '0' if not specified

    const artsToFetch = art === undefined ? [2, 1] : [art];
    const responses = await Promise.all(
      artsToFetch.map((currentArt) =>
        this.makeRequest('GetLigaArray', {
          id_saison,
          id_bezirk,
          favorit,
          art: currentArt
        })
      )
    );

    const leagues = responses.flatMap((response) =>
      this.asTable(response).map((item) => ({
        liga_id: String(item[0] ?? ''),
        wertung: String(item[1] ?? ''),
        name_der_liga: String(item[2] ?? ''),
        kontakt_name: String(item[4] ?? ''),
        kontakt_tel1: String(item[5] ?? ''),
        kontakt_tel2: String(item[6] ?? ''),
        kontakt_email1: String(item[7] ?? ''),
        kontakt_email2: String(item[8] ?? ''),
      }))
    );

    const deduped = new Map<string, League>();
    leagues.forEach((league) => {
      if (league.liga_id) {
        deduped.set(league.liga_id, league);
      }
    });

    return Array.from(deduped.values());
  }

  async getGames(seasonId?: string, leagueId?: string, districtId?: string): Promise<Game[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;
    const id_liga = leagueId;
    const id_bezirk = districtId || '0';

    const response = this.asTable(await this.makeRequest('GetSpiel', {
      id_saison,
      id_klub: 0,
      id_bezirk,
      id_liga,
      id_spieltag: 0,
      art_bezirk: 2,
      art_liga: 0,
      art_spieltag: 0
    }));

    return response.map(item => ({
      game_id: String(item[0] ?? ''),
      spiel_datum: String(item[1] ?? ''),
      spiel_uhrzeit: String(item[2] ?? ''),
      team1_name: String(item[3] ?? ''),
      team2_name: String(item[6] ?? ''),
      status: String(item[9] ?? ''),
      additional_info: String(item[10] ?? item[13] ?? ''),
    }));
  }

  async getStandings(leagueId: string, seasonId?: string): Promise<Standings[]> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = this.asTable(await this.makeRequest('GetTabelle', {
      id_saison,
      id_liga: leagueId,
      nr_spieltag: 100,
      sort: 0
    }));

    return response.map(item => ({
      team_id: String(item[0] ?? ''),
      position: parseInt(String(item[1] ?? '0'), 10),
      team_name: String(item[2] ?? ''),
      spiele: parseInt(String(item[5] ?? '0'), 10),
      siege: parseInt(String(item[6] ?? '0'), 10),
      niederlagen: parseInt(String(item[7] ?? '0'), 10),
      punkte: parseFloat(String(item[13] ?? '0')),
    }));
  }

  async getStandingsRaw(leagueId: string, seasonId?: string, spieltagNr: number = 100, sort: number = 0): Promise<SportwinnerTable> {
    const id_saison = seasonId || (await this.getCurrentSeason())[0]?.season_id;

    const response = await this.makeRequest('GetTabelle', {
      id_saison,
      id_liga: leagueId,
      nr_spieltag: spieltagNr,
      sort
    });

    return this.asTable(response);
  }

  async getSpielplan(seasonId: string, leagueId: string): Promise<SpielplanEntry[]> {
    const response = this.asTable(await this.makeRequest('GetSpielplan', {
      id_saison: seasonId,
      id_liga: leagueId,
    }));

    return response.map((item) => ({
      spieltag: String(item[0] ?? ''),
      game_id: String(item[1] ?? ''),
      game_nr: String(item[2] ?? ''),
      date_time: String(item[3] ?? ''),
      team_home: String(item[4] ?? ''),
      team_away: String(item[5] ?? ''),
      result: String(item[6] ?? ''),
      points_home: String(item[7] ?? ''),
      points_away: String(item[8] ?? ''),
    }));
  }

  async getSpieltage(seasonId: string, leagueId: string): Promise<SpieltagEntry[]> {
    const response = this.asTable(await this.makeRequest('GetSpieltagArray', {
      id_saison: seasonId,
      id_liga: leagueId,
    }));

    return response.map((item) => ({
      id: String(item[0] ?? ''),
      nr: String(item[1] ?? ''),
      label: String(item[2] ?? ''),
      status: String(item[3] ?? ''),
    }));
  }

  async getSpielerInfo(seasonId: string, gameId: string, wertung: number = 1): Promise<SpielInfoRow[]> {
    const response = this.asTable(await this.makeRequest('GetSpielerInfo', {
      id_saison: seasonId,
      id_spiel: gameId,
      wertung
    }));

    return response.map((row) => row.map((cell) => String(cell ?? '')));
  }

  async getGamesBySpieltag(seasonId: string, leagueId: string, spieltagId: string): Promise<SportwinnerTable> {
    const response = await this.makeRequest('GetSpiel', {
      id_saison: seasonId,
      id_klub: 0,
      id_bezirk: 0,
      id_liga: leagueId,
      id_spieltag: spieltagId,
      favorit: '',
      art_bezirk: 1,
      art_liga: 0,
      art_spieltag: 2,
    });

    return this.asTable(response);
  }

  async getSchnitt(seasonId?: string, leagueId?: string, clubId?: string, spieltagNr: number = 100, sort: number = 1, anzahl: number = 1): Promise<SportwinnerTable> {
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

    return this.asTable(response);
  }

  async getFullPlayerStats(seasonId?: string, leagueId?: string, spieltagNr: number = 100): Promise<Array<Record<string, string | number>>> {
    try {
      // Get the schnitt data from the API
      const schnittData = await this.getSchnitt(seasonId, leagueId, undefined, spieltagNr, 0, 1); // Increased from 1 to 20 to get more player results never to it again api Only works with one as parametre  

        return schnittData.map((row) => ({
            rank: Number(row[0] || 0),       // Rank
            id: String(row[1] + '_' + row[0] || Math.random().toString()), // Unique ID combining name and rank
            name: String(row[1] || ''),      // Player
            club: String(row[2] || ''),      // Club
            category: String(row[3] || ''),  // Category

            // Games
            gamesHome: Number(row[4] || 0),
            gamesAway: Number(row[5] || 0),
            gamesTotal: Number(row[6] || 0),

            // Averages
            avgHome: String(row[7] || '0'),
            avgAway:  String(row[8] || '0'),
            avgTotal: String(row[9] || '0'),

            // Match Points
            mpHome: Number(row[10] || 0),
            mpAway: Number(row[11] || 0),
            mpTotal: Number(row[12] || 0),

            bestGame: Number(row[13] || 0)
        }));


    } catch (error) {
        console.error('Error fetching full player stats:', error);
      // Return mock data in case of error
      return [];
    }
  }

  async searchPlayers(query: string): Promise<Array<{ id: string; name: string; club: string; type: string }>> {
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

  async generateAdminSpielbericht(payload: SpielberichtRequest): Promise<Record<string, unknown>> {
    const response = await fetch('/api/admin/spielbericht', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(String(data?.error || 'Spielbericht konnte nicht erzeugt werden.'));
    }
    return data;
  }
}

export default ApiService;
