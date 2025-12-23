import { NextRequest } from 'next/server';
import { APIHandler } from '@/server';

// Create an instance of the API handler
const apiHandler = new APIHandler();

// Define the API schema
const apiSchema = {
  openapi: "3.0.0",
  info: {
    title: "SportWinner Kegel API",
    description: "API for accessing SportWinner kegel data",
    version: "1.0.0"
  },
  paths: {
    "/api/sportwinner": {
      post: {
        summary: "Execute SportWinner command",
        parameters: [
          {
            name: "command",
            in: "query",
            required: true,
            type: "string",
            enum: ["GetSaisonArray", "GetKlub", "GetBezirkArray", "GetLigaArray", "GetSpiel", "GetTabelle", "GetSchnitt", "GetSpieltagArray"]
          }
        ],
        responses: {
          "200": {
            description: "Success response in SportWinner format"
          },
          "400": {
            description: "Bad request - missing command parameter"
          },
          "500": {
            description: "Internal server error"
          }
        }
      },
      get: {
        summary: "Execute SportWinner command (GET)",
        parameters: [
          {
            name: "command",
            in: "query",
            required: true,
            type: "string",
            enum: ["GetSaisonArray", "GetKlub", "GetBezirkArray", "GetLigaArray", "GetSpiel", "GetTabelle", "GetSchnitt", "GetSpieltagArray"]
          }
        ],
        responses: {
          "200": {
            description: "Success response in SportWinner format"
          },
          "400": {
            description: "Bad request - missing command parameter"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const command = params.get('command');

    if (!command) {
      return Response.json({ error: 'Command parameter is required' }, { status: 400 });
    }

    // Log the API call for debugging
    console.log(`API call intercepted for command: ${command}`, Object.fromEntries(params));

    // Handle specific commands with the API handler
    switch(command) {
      case 'GetSaisonArray':
        const seasons = await apiHandler.getSeasons();
        // Convert to the expected array format
        const seasonArray = seasons.map(season => [
          season.season_id,
          season.yearof_season,
          season.status
        ]);
        return Response.json(seasonArray);

      case 'GetKlub':
        const query = params.get('name_klub') || '';
        const clubs = await apiHandler.searchClubs(query);
        // Convert to the expected array format
        const clubArray = clubs.map(club => [
          club.id,
          club.nr_club,
          club.name_klub
        ]);
        return Response.json(clubArray);

      case 'GetBezirkArray':
        const districts = await apiHandler.getDistricts();
        // Convert to the expected array format
        const districtArray = districts.map(district => [
          district.bezirk_id,
          district.name_des_bezirks
        ]);
        return Response.json(districtArray);

      case 'GetLigaArray':
        const leagues = await apiHandler.getLeagues();
        // Convert to the expected array format
        const leagueArray = leagues.map(league => [
          league.liga_id,
          '', // Placeholder
          league.name_der_liga,
          '', // Placeholder
          league.kontakt_name || '',
          league.kontakt_tel1 || '',
          league.kontakt_tel2 || '',
          league.kontakt_email1 || '',
          league.kontakt_email2 || ''
        ]);
        return Response.json(leagueArray);

      case 'GetSchnitt':
        const schnittSeasonId = params.get('id_saison') || undefined;
        const schnittLeagueId = params.get('id_liga') || undefined;
        const schnittClubId = params.get('id_klub') || undefined;
        const spieltagNrParam = params.get('nr_spieltag');
        const spieltagNr = spieltagNrParam ? parseInt(spieltagNrParam) : 100;
        const sortParam = params.get('sort');
        const sort = sortParam ? parseInt(sortParam) : 0;
        const anzahlParam = params.get('anzahl');
        const anzahl = anzahlParam ? parseInt(anzahlParam) : 20;
        const schnittData = await apiHandler.getSchnitt(schnittSeasonId, schnittLeagueId, schnittClubId, spieltagNr, sort, anzahl);
        return Response.json(schnittData);

      case 'GetSpiel':
        const games = await apiHandler.getGames();
        return Response.json(games);

      case 'GetTabelle':
        const standings = await apiHandler.getStandings();
        return Response.json(standings);

      case 'GetSpieltagArray':
        const spieltagLeagueId = params.get('id_liga') || undefined;
        const spieltagSeasonId = params.get('id_saison') || undefined;
        const spieltage = await apiHandler.getSpieltage(spieltagLeagueId, spieltagSeasonId);
        return Response.json(spieltage);

      default:
        // For other commands, try the generic handler
        const genericData = await apiHandler.handleCommand(command, Object.fromEntries(params));
        return Response.json(genericData);
    }
  } catch (error) {
    console.error('Error processing API request:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const command = searchParams.get('command');
  const path = searchParams.get('path');

  // Handle schema request
  if (path === 'schema') {
    return Response.json(apiSchema);
  }

  if (!command) {
    return Response.json({ error: 'Command parameter is required' }, { status: 400 });
  }

  // Log the API call for debugging
  console.log(`API call intercepted for command: ${command}`);

  try {
    // Handle specific commands with the API handler
    switch(command) {
      case 'GetSaisonArray':
        const seasons = await apiHandler.getSeasons();
        // Convert to the expected array format
        const seasonArray = seasons.map(season => [
          season.season_id,
          season.yearof_season,
          season.status
        ]);
        return Response.json(seasonArray);

      case 'GetKlub':
        const query = searchParams.get('name_klub') || '';
        const clubs = await apiHandler.searchClubs(query);
        // Convert to the expected array format
        const clubArray = clubs.map(club => [
          club.id,
          club.nr_club,
          club.name_klub
        ]);
        return Response.json(clubArray);

      case 'GetBezirkArray':
        const districts = await apiHandler.getDistricts();
        // Convert to the expected array format
        const districtArray = districts.map(district => [
          district.bezirk_id,
          district.name_des_bezirks
        ]);
        return Response.json(districtArray);

      case 'GetLigaArray':
        const leagues = await apiHandler.getLeagues();
        // Convert to the expected array format
        const leagueArray = leagues.map(league => [
          league.liga_id,
          '', // Placeholder
          league.name_der_liga,
          '', // Placeholder
          league.kontakt_name || '',
          league.kontakt_tel1 || '',
          league.kontakt_tel2 || '',
          league.kontakt_email1 || '',
          league.kontakt_email2 || ''
        ]);
        return Response.json(leagueArray);

      case 'GetSchnitt':
        const schnittSeasonId = searchParams.get('id_saison') || undefined;
        const schnittLeagueId = searchParams.get('id_liga') || undefined;
        const schnittClubId = searchParams.get('id_klub') || undefined;
        const spieltagNrParam = searchParams.get('nr_spieltag');
        const spieltagNr = spieltagNrParam ? parseInt(spieltagNrParam) : 100;
        const sortParam = searchParams.get('sort');
        const sort = sortParam ? parseInt(sortParam) : 0;
        const anzahlParam = searchParams.get('anzahl');
        const anzahl = anzahlParam ? parseInt(anzahlParam) : 20;
        const schnittData = await apiHandler.getSchnitt(schnittSeasonId, schnittLeagueId, schnittClubId, spieltagNr, sort, anzahl);
        return Response.json(schnittData);

      case 'GetSpiel':
        const games = await apiHandler.getGames();
        return Response.json(games);

      case 'GetTabelle':
        const standings = await apiHandler.getStandings();
        return Response.json(standings);

      case 'GetSpieltagArray':
        const spieltagLeagueId = searchParams.get('id_liga') || undefined;
        const spieltagSeasonId = searchParams.get('id_saison') || undefined;
        const spieltage = await apiHandler.getSpieltage(spieltagLeagueId, spieltagSeasonId);
        return Response.json(spieltage);

      default:
        // For other commands, try the generic handler
        const genericData = await apiHandler.handleCommand(command, Object.fromEntries(searchParams));
        return Response.json(genericData);
    }
  } catch (error) {
    console.error('Error processing API request:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}