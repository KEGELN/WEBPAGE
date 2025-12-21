// server/api-handler.ts
interface Season {
  season_id: string;
  yearof_season: number;
  status: number;
}

interface Club {
  id: string;
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

// Example data for API responses
const EXAMPLE_DATA: Record<string, any[]> = {
  GetSaisonArray: [
    ["11", 2025, 0],
    ["10", 2024, 1],
    ["9", 2023, 1]
  ],
  GetKlub: [
    ["1", "001", "BSV GW Friedrichshain"],
    ["2", "002", "SV Frieden Beyern"],
    ["3", "003", "ESV Lok Elsterwerda"],
    ["4", "004", "Kegelklub Berlin"],
    ["5", "005", "Kegelverein Hamburg"]
  ],
  GetBezirkArray: [
    ["1", "Berlin"],
    ["2", "Brandenburg"],
    ["3", "Hamburg"],
    ["4", "Niedersachsen"]
  ],
  GetLigaArray: [
    ["1", "Liga 1", "Bezirksliga Berlin", "Max Mustermann", "030-1234567", "030-7654321", "max@example.com", "max2@example.com"],
    ["2", "Liga 2", "Landesliga Brandenburg", "Hans Meier", "030-9876543", "030-3456789", "hans@example.com", "hans2@example.com"],
    ["3", "Liga 3", "Verbandsliga Hamburg", "Peter Schmidt", "040-1234567", "040-7654321", "peter@example.com", "peter2@example.com"]
  ],
  GetSpiel: [
    ["1", "2025-01-15", "19:00", "BSV GW Friedrichshain", "SV Frieden Beyern", "BSV GW Friedrichshain", "SV Frieden Beyern", "2025-01-15", "19:00", "Completed", "Final", "Details", "More Details", "Result"]
  ],
  GetTabelle: [
    ["1", "1", "BSV GW Friedrichshain", "BSV GW Friedrichshain", "Details", "10", "8", "2", "Details", "Details", "Details", "Details", "24", "Details"],
    ["2", "2", "SV Frieden Beyern", "SV Frieden Beyern", "Details", "10", "7", "3", "Details", "Details", "Details", "Details", "21", "Details"]
  ],
  GetSchnitt: [
    [1,"Böse, Stefan","BSV GW Friedrichshain","Männer","4","4","8","589","600,25","594,63","3","4","7","654"],
    [2,"Wiesner, Rico","SV Frieden Beyern","Männer","4","3","7","629","591,67","613","4","1","5","659"],
    [3,"Ziesche, Klaus","ESV Lok Elsterwerda","Sen B m","1","1","2","562","587","574,5","0","0","0","587"],
    [4,"Müller, Hans","Kegelklub Berlin","Männer","3","3","6","542","578,33","560,17","2","2","4","598"],
    [5,"Schmidt, Anna","Kegelverein Hamburg","Frauen","2","2","4","486","521,5","503,75","1","2","3","547"]
  ]
};

class APIHandler {
  async getSeasons(): Promise<Season[]> {
    console.log('API call intercepted for getSeasons');
    
    // Example season data
    return [
      { season_id: "11", yearof_season: 2025, status: 0 },
      { season_id: "10", yearof_season: 2024, status: 1 },
      { season_id: "9", yearof_season: 2023, status: 1 }
    ];
  }

  async getCurrentSeason(): Promise<Season> {
    const seasons = await this.getSeasons();
    return seasons[0] || { season_id: "11", yearof_season: 2025, status: 0 };
  }

  async searchClubs(query: string): Promise<Club[]> {
    console.log('API call intercepted for searchClubs with query:', query);
    
    // Example club data - filter based on query if needed
    const allClubs: Club[] = [
      { id: "1", nr_club: "001", name_klub: "BSV GW Friedrichshain" },
      { id: "2", nr_club: "002", name_klub: "SV Frieden Beyern" },
      { id: "3", nr_club: "003", name_klub: "ESV Lok Elsterwerda" },
      { id: "4", nr_club: "004", name_klub: "Kegelklub Berlin" },
      { id: "5", nr_club: "005", name_klub: "Kegelverein Hamburg" },
      { id: "6", nr_club: "006", name_klub: "Kegelgemeinschaft München" },
      { id: "7", nr_club: "007", name_klub: "Kegelclub Köln" },
      { id: "8", nr_club: "008", name_klub: "Kegelverein Dresden" }
    ];

    // Filter clubs based on the search query (case-insensitive)
    if (query) {
      return allClubs.filter(club => 
        club.name_klub.toLowerCase().includes(query.toLowerCase()) ||
        club.nr_club.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return allClubs;
  }

  async getDistricts(): Promise<District[]> {
    console.log('API call intercepted for getDistricts');
    
    // Example district data
    return [
      { bezirk_id: "1", name_des_bezirks: "Berlin" },
      { bezirk_id: "2", name_des_bezirks: "Brandenburg" },
      { bezirk_id: "3", name_des_bezirks: "Hamburg" },
      { bezirk_id: "4", name_des_bezirks: "Niedersachsen" }
    ];
  }

  async getLeagues(): Promise<League[]> {
    console.log('API call intercepted for getLeagues');
    
    // Example league data
    return [
      { 
        liga_id: "1", 
        name_der_liga: "Bezirksliga Berlin", 
        kontakt_name: "Max Mustermann",
        kontakt_tel1: "030-1234567",
        kontakt_tel2: "030-7654321",
        kontakt_email1: "max@example.com",
        kontakt_email2: "max2@example.com"
      },
      { 
        liga_id: "2", 
        name_der_liga: "Landesliga Brandenburg", 
        kontakt_name: "Hans Meier",
        kontakt_tel1: "030-9876543",
        kontakt_tel2: "030-3456789",
        kontakt_email1: "hans@example.com",
        kontakt_email2: "hans2@example.com"
      },
      { 
        liga_id: "3", 
        name_der_liga: "Verbandsliga Hamburg", 
        kontakt_name: "Peter Schmidt",
        kontakt_tel1: "040-1234567",
        kontakt_tel2: "040-7654321",
        kontakt_email1: "peter@example.com",
        kontakt_email2: "peter2@example.com"
      }
    ];
  }

  async getSchnitt(seasonId?: string, leagueId?: string, clubId?: string, spieltagNr: number = 100, sort: number = 0, anzahl: number = 20): Promise<any[]> {
    console.log('API call intercepted for getSchnitt with seasonId:', seasonId, 'leagueId:', leagueId);

    // Example schnitt data
    return [
      [1,"Böse, Stefan","BSV GW Friedrichshain","Männer","4","4","8","589","600,25","594,63","3","4","7","654"],
      [2,"Wiesner, Rico","SV Frieden Beyern","Männer","4","3","7","629","591,67","613","4","1","5","659"],
      [3,"Ziesche, Klaus","ESV Lok Elsterwerda","Sen B m","1","1","2","562","587","574,5","0","0","0","587"],
      [4,"Müller, Hans","Kegelklub Berlin","Männer","3","3","6","542","578,33","560,17","2","2","4","598"],
      [5,"Schmidt, Anna","Kegelverein Hamburg","Frauen","2","2","4","486","521,5","503,75","1","2","3","547"]
    ];
  }

  async getGames(): Promise<any[]> {
    console.log('API call intercepted for getGames');
    
    // Example game data
    return [
      ["1", "2025-01-15", "19:00", "BSV GW Friedrichshain", "SV Frieden Beyern", "BSV GW Friedrichshain", "SV Frieden Beyern", "2025-01-15", "19:00", "Completed", "Final", "Details", "More Details", "Result"]
    ];
  }

  async getStandings(): Promise<any[]> {
    console.log('API call intercepted for getStandings');
    
    // Example standings data
    return [
      ["1", "1", "BSV GW Friedrichshain", "BSV GW Friedrichshain", "Details", "10", "8", "2", "Details", "Details", "Details", "Details", "24", "Details"],
      ["2", "2", "SV Frieden Beyern", "SV Frieden Beyern", "Details", "10", "7", "3", "Details", "Details", "Details", "Details", "21", "Details"]
    ];
  }

  // Direct command handler for SportWinner API compatibility
  async handleCommand(command: string, params: Record<string, any>): Promise<any[]> {
    console.log(`API call intercepted for command: ${command}`, params);

    // Return example data based on command
    return EXAMPLE_DATA[command] || [];
  }

  async getSpieltage(leagueId: string, seasonId?: string): Promise<any[]> {
    console.log('API call intercepted for getSpieltage with leagueId:', leagueId, 'seasonId:', seasonId);

    // Example spieltage data
    return [
      ["98869", "1", "1. Spieltag", "1"],
      ["98870", "2", "2. Spieltag", "1"],
      ["98871", "3", "3. Spieltag", "1"],
      ["98872", "4", "4. Spieltag", "1"],
      ["98873", "5", "5. Spieltag", "1"]
    ];
  }

  async getFullPlayerStats(seasonId?: string, leagueId?: string, spieltagNr: number = 100): Promise<Player[]> {
    console.log('API call intercepted for getFullPlayerStats with seasonId:', seasonId, 'leagueId:', leagueId);

    // Example full player stats data in the format returned by GetSchnitt
    const schnittData = await this.getSchnitt(seasonId, leagueId, undefined, spieltagNr, 0, 100);

    return schnittData.map((row: any[]) => ({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      club: String(row[2] || ''),
      category: String(row[3] || ''),
      games: Number(row[4] || 0) + Number(row[5] || 0), // Home games + Away games
      wins: Number(row[5] || 0) + Number(row[9] || 0), // Home wins + Away wins
      losses: Number(row[6] || 0) + Number(row[10] || 0), // Home losses + Away losses
      total: Number(row[7] || 0),
      average: String(row[8] || ''),
      schnitt: String(row[9] || '')
    }));
  }
}

interface Player {
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

export default APIHandler;