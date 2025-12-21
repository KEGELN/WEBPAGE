// API service for interacting with the sportwinner.de API through Next.js proxy

interface ClubResult {
  id: string;
  nr_club: string;
  name_klub: string;
}

interface PlayerResult {
  id: string;
  name: string;
  club_id: string;
  // Add other player fields as they become available in the API
}

interface Season {
  season_id: string;
  yearof_season: number;
  status: number;
}

/**
 * Fetches all available seasons
 */
export async function getSeasons(): Promise<Season[]> {
  try {
    const response = await fetch('/api/sportwinner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'command=GetSaisonArray'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch seasons: ${response.status}`);
    }

    const data = await response.json();

    // The API returns results in a nested array format
    // Transform to proper objects based on API spec: [season_id, yearof_season, status]
    return data.map((item: any[]) => ({
      season_id: item[0],
      yearof_season: parseInt(item[1]),
      status: parseInt(item[2])
    }));
  } catch (error) {
    console.error('Error fetching seasons:', error);
    // Return example data as fallback
    return [
      { season_id: "11", yearof_season: 2025, status: 0 },
      { season_id: "10", yearof_season: 2024, status: 1 },
      { season_id: "9", yearof_season: 2023, status: 1 }
    ];
  }
}

/**
 * Gets the current active season
 */
export async function getCurrentSeason(): Promise<Season> {
  const seasons = await getSeasons();
  // Usually the first one is the current season
  return seasons.length > 0 ? seasons[0] : { season_id: "11", yearof_season: 2025, status: 0 };
}

/**
 * Searches for clubs by name using the GetKlub API command
 * @param query The search query for club name
 */
export async function searchClubs(query: string): Promise<ClubResult[]> {
  try {
    const currentSeason = await getCurrentSeason();

    const formData = new URLSearchParams({
      command: 'GetKlub',
      id_saison: currentSeason.season_id,
      nr_klub: '',  // Empty as per API spec
      name_klub: query,
    });

    const response = await fetch('/api/sportwinner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      throw new Error(`Failed to search clubs: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    // The API returns results in format [ [id, nr_club, name_klub], ... ]
    return data.map((item: any[]) => ({
      id: item[0],
      nr_club: item[1],
      name_klub: item[2]
    }));
  } catch (error) {
    console.error('Error searching clubs:', error);
    // Return example data as fallback
    return [
      { id: "1", nr_club: "001", name_klub: "BSV GW Friedrichshain" },
      { id: "2", nr_club: "002", name_klub: "SV Frieden Beyern" },
      { id: "3", nr_club: "003", name_klub: "ESV Lok Elsterwerda" },
      { id: "4", nr_club: "004", name_klub: "Kegelklub Berlin" },
      { id: "5", nr_club: "005", name_klub: "Kegelverein Hamburg" }
    ];
  }
}

/**
 * Placeholder function for searching players
 * Currently returns empty results since the API doesn't have a player search function
 */
export async function searchPlayers(query: string): Promise<PlayerResult[]> {
  // The API does not currently support player search in the documentation
  // Return empty array as placeholder for future implementation
  console.warn('Player search not implemented in the API yet');
  return [];
}