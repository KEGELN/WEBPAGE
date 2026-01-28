import { NextRequest } from 'next/server';
import APIHandler from '@/server/api-handler';

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

    // Use the API handler to process the command
    let result: any[];

    switch(command) {
      case 'GetSaisonArray':
        const seasons = await apiHandler.getSeasons();
        result = seasons.map(season => [
          season.season_id,
          season.yearof_season,
          season.status
        ]);
        break;

      case 'GetKlub':
        const query = params.get('name_klub') || '';
        const clubs = await apiHandler.searchClubs(query);
        result = clubs.map(club => [
          club.id,
          club.nr_club,
          club.name_klub
        ]);
        break;

      case 'GetBezirkArray':
        const districts = await apiHandler.getDistricts();
        result = districts.map(district => [
          district.bezirk_id,
          district.name_des_bezirks
        ]);
        break;

      case 'GetLigaArray':
        const leagues = await apiHandler.getLeagues();
        result = leagues.map(league => [
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
        break;

      case 'GetSchnitt':
        const schnittSeasonId = params.get('id_saison') || undefined;
        const schnittLeagueId = params.get('id_liga') || undefined;
        const schnittClubId = params.get('id_klub') || undefined;
        const spieltagNrParam = params.get('nr_spieltag');
        const spieltagNr = spieltagNrParam ? parseInt(spieltagNrParam) : 100;
        const sortParam = params.get('sort');
        const sort = sortParam ? parseInt(sortParam) : 1; // Use 1 as default to match curl command
        const anzahlParam = params.get('anzahl');
        const anzahl = anzahlParam ? parseInt(anzahlParam) : 1; // Use 1 as default to match curl command
        result = await apiHandler.getSchnitt(schnittSeasonId, schnittLeagueId, schnittClubId, spieltagNr, sort, anzahl);
        break;

      case 'GetSpiel':
        result = await apiHandler.getGames();
        break;

      case 'GetTabelle':
        result = await apiHandler.getStandings();
        break;

      case 'GetSpieltagArray':
        const spieltagLeagueId = params.get('id_liga') || undefined;
        const spieltagSeasonId = params.get('id_saison') || undefined;
        result = await apiHandler.getSpieltage(spieltagLeagueId, spieltagSeasonId);
        break;

      default:
        // For other commands, try the generic handler
        result = await apiHandler.handleCommand(command, Object.fromEntries(params));
    }

    return Response.json(result);
  } catch (error: any) {
    console.error('Error processing API request:', error.message);
    // Return error that can trigger a popup on the frontend
    return Response.json({ error: error.message }, { status: 500 });
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
  console.log(`API call intercepted for command: ${command}`, Object.fromEntries(searchParams));

  try {
    // Use the API handler to process the command
    let result: any[];

    switch(command) {
      case 'GetSaisonArray':
        const seasons = await apiHandler.getSeasons();
        result = seasons.map(season => [
          season.season_id,
          season.yearof_season,
          season.status
        ]);
        break;

      case 'GetKlub':
        const query = searchParams.get('name_klub') || '';
        const clubs = await apiHandler.searchClubs(query);
        result = clubs.map(club => [
          club.id,
          club.nr_club,
          club.name_klub
        ]);
        break;

      case 'GetBezirkArray':
        const districts = await apiHandler.getDistricts();
        result = districts.map(district => [
          district.bezirk_id,
          district.name_des_bezirks
        ]);
        break;

      case 'GetLigaArray':
        const leagues = await apiHandler.getLeagues();
        result = leagues.map(league => [
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
        break;

      case 'GetSchnitt':
        const schnittSeasonId = searchParams.get('id_saison') || undefined;
        const schnittLeagueId = searchParams.get('id_liga') || undefined;
        const schnittClubId = searchParams.get('id_klub') || undefined;
        const spieltagNrParam = searchParams.get('nr_spieltag');
        const spieltagNr = spieltagNrParam ? parseInt(spieltagNrParam) : 100;
        const sortParam = searchParams.get('sort');
        const sort = sortParam ? parseInt(sortParam) : 1; // Use 1 as default to match curl command
        const anzahlParam = searchParams.get('anzahl');
        const anzahl = anzahlParam ? parseInt(anzahlParam) : 1; // Use 1 as default to match curl command
        result = await apiHandler.getSchnitt(schnittSeasonId, schnittLeagueId, schnittClubId, spieltagNr, sort, anzahl);
        break;

      case 'GetSpiel':
        result = await apiHandler.getGames();
        break;

      case 'GetTabelle':
        result = await apiHandler.getStandings();
        break;

      case 'GetSpieltagArray':
        const spieltagLeagueId = searchParams.get('id_liga') || undefined;
        const spieltagSeasonId = searchParams.get('id_saison') || undefined;
        result = await apiHandler.getSpieltage(spieltagLeagueId, spieltagSeasonId);
        break;

      default:
        // For other commands, try the generic handler
        result = await apiHandler.handleCommand(command, Object.fromEntries(searchParams));
    }

    return Response.json(result);
  } catch (error: any) {
    console.error('Error processing API request:', error.message);
    // Return error that can trigger a popup on the frontend
    return Response.json({ error: error.message }, { status: 500 });
  }
}