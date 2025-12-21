import { NextRequest } from 'next/server';
import { APIHandler } from '@/server';

// Create an instance of the API handler
const apiHandler = new APIHandler();

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
        const seasonId = params.get('id_saison') || undefined;
        const schnittData = await apiHandler.getSchnitt(seasonId);
        return Response.json(schnittData);

      case 'GetSpiel':
        const games = await apiHandler.getGames();
        return Response.json(games);

      case 'GetTabelle':
        const standings = await apiHandler.getStandings();
        return Response.json(standings);

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
        const seasonId = searchParams.get('id_saison') || undefined;
        const schnittData = await apiHandler.getSchnitt(seasonId);
        return Response.json(schnittData);

      case 'GetSpiel':
        const games = await apiHandler.getGames();
        return Response.json(games);

      case 'GetTabelle':
        const standings = await apiHandler.getStandings();
        return Response.json(standings);

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