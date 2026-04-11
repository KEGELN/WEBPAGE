import process from 'node:process';
import { Pool } from 'pg';
import { fetchBerlinLeagueData } from '../../lib/temporary-berlin/scraper.js';

// Mapping from Kleeblatt internal keys to database IDs
const LEAGUE_MAPPING = {
  'berlinliga': 'berlinliga-local',
  'vereinsliga': 'vereinsliga-local'
};

async function syncLeagues(client, data) {
  const leagueId = LEAGUE_MAPPING[data.league];
  console.log(`Syncing league: ${leagueId} (${data.title})`);

  await client.query(
    `INSERT INTO leagues (season_id, league_id, district_id, name, fetched_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (season_id, league_id) DO UPDATE SET name = EXCLUDED.name, fetched_at = EXCLUDED.fetched_at`,
    ['11', leagueId, 'local-district', data.title, data.fetchedAt]
  );
}

async function syncStandings(client, data) {
  const leagueId = LEAGUE_MAPPING[data.league];
  console.log(`Syncing standings for ${leagueId}`);

  // Clear existing standings for this league/season/matchday 100
  await client.query(
    'DELETE FROM standings_snapshots WHERE season_id = $1 AND league_id = $2 AND sort_key = $3',
    ['11', leagueId, 'tabelle']
  );

  for (let i = 0; i < data.standings.length; i++) {
    const row = data.standings[i];
    // Sportwinner Tabelle Row format:
    // [team_id, position, team_name, unknown, games, wins, draws, mp_plus, mp_minus, unknown, sp_plus, sp_minus, unknown, points]
    const rawRow = [
      row.team,
      row.place,
      row.team,
      '',
      row.games,
      '', '', // wins, draws
      row.mp.split('-')[0], row.mp.split('-')[1],
      '',
      row.sp.split('-')[0], row.sp.split('-')[1],
      '',
      row.points
    ];

    await client.query(
      `INSERT INTO standings_snapshots (season_id, league_id, spieltag_nr, sort_key, row_index, team_name, position, raw_row_json, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['11', leagueId, '100', 'tabelle', i, row.team, row.place, JSON.stringify(rawRow), data.fetchedAt]
    );
  }
}

async function syncGames(client, data) {
  const leagueId = LEAGUE_MAPPING[data.league];
  console.log(`Syncing games for ${leagueId}`);

  for (const day of data.matchdays) {
    const matchdayNrMatch = day.title.match(/(\d+)/);
    const matchdayNr = matchdayNrMatch ? matchdayNrMatch[1] : '0';

    for (const game of day.games) {
      const gameId = `${leagueId}-${game.spielNumber || Math.random().toString(36).slice(2, 10)}`;
      const [home, away] = game.pairing.split(' - ').map(s => s.trim());
      
      // Try to parse date/time: "Sa. 14.09.2024 13:00"
      const dateTimeMatch = game.time.match(/(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})/);
      const date = dateTimeMatch ? dateTimeMatch[1] : null;
      const time = dateTimeMatch ? dateTimeMatch[2] : null;

      // Extract points from result: "6 : 2 (3120 : 3010)"
      const pointsMatch = game.result.match(/(\d+)\s*:\s*(\d+)/);
      const pointsHome = pointsMatch ? pointsMatch[1] : '';
      const pointsAway = pointsMatch ? pointsMatch[2] : '';

      await client.query(
        `INSERT INTO games (game_id, season_id, league_id, district_id, matchday_nr, matchday_label, game_nr, game_date, game_time, team_home, team_away, result, points_home, points_away, status, source, updated_at, normalized_home, normalized_away)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (game_id) DO UPDATE SET 
           result = EXCLUDED.result, points_home = EXCLUDED.points_home, points_away = EXCLUDED.points_away,
           status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
        [
          gameId, '11', leagueId, 'local-district', matchdayNr, day.title, game.spielNumber,
          date, time, home || 'Heim', away || 'Gast', game.result, pointsHome, pointsAway,
          game.result ? 'Gespielt' : 'Geplant', 'kleeblatt', data.fetchedAt,
          (home || '').toLowerCase(), (away || '').toLowerCase()
        ]
      );
    }
  }
}

async function syncSchnitt(client, data) {
  const leagueId = LEAGUE_MAPPING[data.league];
  if (!data.pdfReports || data.pdfReports.length === 0) return;

  // Use the newest report for "current" schnitt (matchday 100)
  const report = data.pdfReports[0];
  console.log(`Syncing schnitt from report: ${report.title}`);

  await client.query(
    'DELETE FROM standings_snapshots WHERE season_id = $1 AND league_id = $2 AND sort_key = $3',
    ['11', leagueId, 'schnitt']
  );

  for (let i = 0; i < report.players.length; i++) {
    const p = report.players[i];
    // Sportwinner Schnitt Row format:
    // [rank, name, club, category, home_games, away_games, total_games, home_avg, away_avg, total_avg, home_mp, away_mp, total_mp, best]
    const rawRow = [
      p.place,
      p.name,
      p.team,
      'Männer',
      0, 0, p.games,
      '0', '0', p.avgKegel,
      0, 0, p.mp,
      0
    ];

    await client.query(
      `INSERT INTO standings_snapshots (season_id, league_id, spieltag_nr, sort_key, row_index, team_name, position, raw_row_json, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['11', leagueId, '100', 'schnitt', i, p.name, String(p.place), JSON.stringify(rawRow), data.fetchedAt]
    );
  }
}

async function main() {
  const connectionString = process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not configured');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const client = await pool.connect();

  try {
    const leagues = ['berlinliga', 'vereinsliga'];
    for (const lKey of leagues) {
      console.log(`\n--- Processing ${lKey} ---`);
      const data = await fetchBerlinLeagueData(lKey);
      
      await syncLeagues(client, data);
      await syncStandings(client, data);
      await syncGames(client, data);
      await syncSchnitt(client, data);
    }
    console.log('\nSync completed successfully!');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
