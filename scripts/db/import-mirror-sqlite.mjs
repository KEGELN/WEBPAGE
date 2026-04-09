import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { Pool } from 'pg';

function exportPayload() {
  const result = spawnSync('python3', ['mirror-db/export_postgres_payload.py', '--source', 'sportwinner'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to export sportwinner SQLite payload');
  }

  return JSON.parse(result.stdout);
}

async function insertJsonRows(client, table, columns, rows, jsonColumns = []) {
  for (const row of rows) {
    const values = columns.map((column) => {
      const value = row[column];
      return jsonColumns.includes(column) ? JSON.stringify(value ?? null) : value ?? null;
    });
    const placeholders = columns.map((_, index) => {
      const position = `$${index + 1}`;
      return jsonColumns.includes(columns[index]) ? `${position}::jsonb` : position;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
  }
}

async function main() {
  const connectionString = process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('MIRROR_DATABASE_URL or DATABASE_URL is not configured');
  }

  const payload = exportPayload();
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleteOrder = [
      'game_player_sets',
      'game_player_rows',
      'standings_snapshots',
      'game_results',
      'games',
      'clubs',
      'league_matchdays',
      'leagues',
      'districts',
      'seasons',
      'raw_payloads',
      'player_search_index',
      'club_search_index',
    ];
    for (const table of deleteOrder) {
      await client.query(`DELETE FROM ${table}`);
    }

    await insertJsonRows(client, 'raw_payloads',
      ['source', 'command', 'season_id', 'district_id', 'league_id', 'game_id', 'params_json', 'payload_json', 'payload_hash', 'fetched_at', 'current_season_only'],
      payload.raw_payloads ?? [],
      ['params_json', 'payload_json']
    );
    await insertJsonRows(client, 'seasons', ['season_id', 'year', 'status', 'is_current', 'fetched_at'], payload.seasons ?? []);
    await insertJsonRows(client, 'districts', ['season_id', 'district_id', 'name', 'fetched_at'], payload.districts ?? []);
    await insertJsonRows(client, 'leagues', ['season_id', 'league_id', 'district_id', 'art', 'wertung', 'name', 'kontakt_name', 'kontakt_tel1', 'kontakt_tel2', 'kontakt_email1', 'kontakt_email2', 'fetched_at'], payload.leagues ?? []);
    await insertJsonRows(client, 'league_matchdays', ['season_id', 'league_id', 'matchday_id', 'matchday_nr', 'label', 'status', 'fetched_at'], payload.league_matchdays ?? []);
    await insertJsonRows(client, 'clubs', ['club_key', 'club_name', 'normalized_name', 'club_number', 'source', 'season_id', 'first_seen_at', 'last_seen_at'], payload.clubs ?? []);
    await insertJsonRows(client, 'games', ['game_id', 'season_id', 'league_id', 'district_id', 'wertung', 'matchday_id', 'matchday_nr', 'matchday_label', 'game_nr', 'game_date', 'game_time', 'date_time_text', 'team_home', 'team_away', 'normalized_home', 'normalized_away', 'result', 'points_home', 'points_away', 'score_home', 'score_away', 'status', 'status_detail', 'league_context', 'source', 'detail_payload_hash', 'detail_fetched_at', 'updated_at'], payload.games ?? []);
    await insertJsonRows(client, 'game_results', ['game_id', 'season_id', 'league_id', 'league_name', 'spieltag', 'date_time', 'team_home', 'team_away', 'result', 'is_completed', 'notes', 'raw_table_json', 'updated_at'], payload.game_results ?? [], ['raw_table_json']);
    await insertJsonRows(client, 'standings_snapshots', ['season_id', 'league_id', 'spieltag_nr', 'sort_key', 'row_index', 'team_id', 'position', 'team_name', 'raw_row_json', 'fetched_at'], payload.standings_snapshots ?? [], ['raw_row_json']);
    await insertJsonRows(client, 'game_player_rows', ['game_id', 'row_index', 'raw_row_json'], payload.game_player_rows ?? [], ['raw_row_json']);
    await insertJsonRows(client, 'game_player_sets', ['game_id', 'row_index', 'side', 'player_name', 'lane_no', 'pins', 'created_at'], payload.game_player_sets ?? []);
    await insertJsonRows(client, 'player_search_index', ['player_key', 'player_name', 'normalized_name', 'club_name', 'season_id', 'league_id', 'game_count', 'last_game_date', 'updated_at'], payload.player_search_index ?? []);
    await insertJsonRows(client, 'club_search_index', ['club_key', 'club_name', 'normalized_name', 'club_number', 'season_id', 'game_count', 'last_game_date', 'updated_at'], payload.club_search_index ?? []);

    await client.query('COMMIT');
    console.log(
      `Imported mirror data: ${(payload.games ?? []).length} games, ${(payload.game_player_rows ?? []).length} result rows, ${(payload.player_search_index ?? []).length} player index rows.`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
