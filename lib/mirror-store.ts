import { getMirrorPool, hasMirrorDatabase } from '@/lib/postgres';
import {
  getMirrorClubProfile as getLocalMirrorClubProfile,
  getMirrorGameDetail as getLocalMirrorGameDetail,
  getMirrorPlayerProfile as getLocalMirrorPlayerProfile,
  searchMirror as searchLocalMirror,
  type MirrorClubProfile,
  type MirrorPlayerProfile,
} from '@/lib/mirror-db-server';

type MirrorSearch = ReturnType<typeof searchLocalMirror>;

function localMirrorStore() {
  return {
    search: (query: string) => searchLocalMirror(query),
    playerProfile: (name: string) => getLocalMirrorPlayerProfile(name),
    clubProfile: (name: string) => getLocalMirrorClubProfile(name),
    gameDetail: (gameId: string) => getLocalMirrorGameDetail(gameId),
  };
}

function parseResultScore(result: string | null) {
  const match = String(result || '').match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function postgresMirrorStore() {
  const pool = getMirrorPool();
  return {
    search: async (query: string): Promise<MirrorSearch> => {
      const normalized = `%${query.toLowerCase().replace(/[^a-z0-9äöüß]/gi, '').replace(/\s+/g, '')}%`;
      const [playersResult, clubsResult] = await Promise.all([
        pool.query(
          `
          SELECT player_name, max(club_name) AS club_name, sum(game_count)::int AS game_count, max(last_game_date) AS last_game_date
          FROM player_search_index
          WHERE normalized_name LIKE $1
          GROUP BY player_name
          ORDER BY game_count DESC, last_game_date DESC
          LIMIT 12
          `,
          [normalized]
        ),
        pool.query(
          `
          SELECT club_name, sum(game_count)::int AS game_count, max(last_game_date) AS last_game_date
          FROM club_search_index
          WHERE normalized_name LIKE $1
          GROUP BY club_name
          ORDER BY game_count DESC, last_game_date DESC
          LIMIT 12
          `,
          [normalized]
        ),
      ]);

      return {
        players: playersResult.rows.map((row) => ({
          name: String(row.player_name),
          club: String(row.club_name ?? ''),
          gameCount: Number(row.game_count ?? 0),
          lastGameDate: row.last_game_date ? String(row.last_game_date) : '',
        })),
        clubs: clubsResult.rows.map((row) => ({
          name: String(row.club_name),
          gameCount: Number(row.game_count ?? 0),
          lastGameDate: row.last_game_date ? String(row.last_game_date) : '',
        })),
      };
    },
    playerProfile: async (name: string): Promise<MirrorPlayerProfile> => {
      const result = await pool.query(
        `
        SELECT
          g.game_id,
          g.game_date,
          g.game_time,
          g.team_home,
          g.team_away,
          g.result,
          g.score_home,
          g.score_away,
          g.league_context,
          g.matchday_label,
          gpr.raw_row_json
        FROM game_player_rows gpr
        JOIN games g ON g.game_id = gpr.game_id
        WHERE (gpr.raw_row_json->>0 = $1) OR (gpr.raw_row_json->>15 = $1)
        ORDER BY g.game_date DESC, g.game_time DESC, gpr.row_index ASC
        `,
        [name]
      );

      if (result.rows.length === 0) {
        return { found: false, playerName: name };
      }

      const uniqueGames = new Set<string>();
      const clubs = new Set<string>();
      const gameOutcomes = new Map<string, { scoreFor: number; scoreAgainst: number }>();
      const history: NonNullable<MirrorPlayerProfile['history']> = [];
      let totalHolz = 0;
      let countedRows = 0;

      for (const row of result.rows) {
        const raw = row.raw_row_json as unknown[];
        const isHome = String(raw[0] ?? '') === name;
        const playerTotal = String(isHome ? raw[5] ?? '' : raw[10] ?? '');
        const playerSp = String(isHome ? raw[6] ?? '' : raw[9] ?? '');
        const playerMp = String(isHome ? raw[7] ?? '' : raw[8] ?? '');
        const teamName = String(isHome ? row.team_home : row.team_away);
        const opponentClub = String(isHome ? row.team_away : row.team_home);
        const score = parseResultScore(row.result ? String(row.result) : null);
        const gameId = String(row.game_id);
        uniqueGames.add(gameId);
        clubs.add(teamName);
        const totalNumber = Number(playerTotal.replace(',', '.'));
        if (Number.isFinite(totalNumber)) {
          totalHolz += totalNumber;
          countedRows += 1;
        }
        if (score) {
          gameOutcomes.set(gameId, {
            scoreFor: isHome ? score.home : score.away,
            scoreAgainst: isHome ? score.away : score.home,
          });
        }
        if (history.length < 12) {
          const scoreFor = score ? (isHome ? score.home : score.away) : null;
          const scoreAgainst = score ? (isHome ? score.away : score.home) : null;
          history.push({
            gameId,
            date: row.game_date ? String(row.game_date) : null,
            time: row.game_time ? String(row.game_time) : null,
            league: row.league_context ? String(row.league_context) : null,
            spieltag: row.matchday_label ? String(row.matchday_label) : null,
            club: teamName,
            opponentClub,
            result: row.result ? String(row.result) : null,
            teamResult: scoreFor === null || scoreAgainst === null ? null : `${scoreFor}:${scoreAgainst}`,
            holz: playerTotal || null,
            sp: playerSp || null,
            mp: playerMp || null,
            side: isHome ? 'home' : 'away',
          });
        }
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      for (const outcome of gameOutcomes.values()) {
        if (outcome.scoreFor > outcome.scoreAgainst) wins += 1;
        else if (outcome.scoreFor < outcome.scoreAgainst) losses += 1;
        else draws += 1;
      }

      return {
        found: true,
        playerName: name,
        clubs: Array.from(clubs).sort(),
        gamesPlayed: uniqueGames.size,
        wins,
        losses,
        draws,
        averageScore: countedRows ? Number((totalHolz / countedRows).toFixed(2)) : 0,
        ranking: null,
        history,
      } as MirrorPlayerProfile;
    },
    clubProfile: async (name: string): Promise<MirrorClubProfile> => {
      const result = await pool.query(
        `
        SELECT game_id, game_date, game_time, team_home, team_away, result, league_context, matchday_label
        FROM games
        WHERE team_home = $1 OR team_away = $1
        ORDER BY game_date DESC, game_time DESC
        `,
        [name]
      );

      if (result.rows.length === 0) {
        return { found: false, clubName: name };
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      const history: NonNullable<MirrorClubProfile['history']> = [];

      for (const row of result.rows) {
        const isHome = String(row.team_home) === name;
        const score = parseResultScore(row.result ? String(row.result) : null);
        if (score) {
          const scoreFor = isHome ? score.home : score.away;
          const scoreAgainst = isHome ? score.away : score.home;
          if (scoreFor > scoreAgainst) wins += 1;
          else if (scoreFor < scoreAgainst) losses += 1;
          else draws += 1;
        }
        if (history.length < 20) {
          history.push({
            gameId: String(row.game_id),
            date: row.game_date ? String(row.game_date) : null,
            time: row.game_time ? String(row.game_time) : null,
            league: row.league_context ? String(row.league_context) : null,
            spieltag: row.matchday_label ? String(row.matchday_label) : null,
            opponentClub: String(isHome ? row.team_away : row.team_home),
            result: row.result ? String(row.result) : null,
            teamResult: score ? `${isHome ? score.home : score.away}:${isHome ? score.away : score.home}` : null,
            side: isHome ? 'home' : 'away',
          });
        }
      }

      return {
        found: true,
        clubName: name,
        gamesPlayed: result.rows.length,
        wins,
        losses,
        draws,
        history,
      };
    },
    gameDetail: async (gameId: string) => {
      const [headerResult, rowsResult] = await Promise.all([
        pool.query('SELECT * FROM games WHERE game_id = $1 LIMIT 1', [gameId]),
        pool.query('SELECT raw_row_json FROM game_player_rows WHERE game_id = $1 ORDER BY row_index', [gameId]),
      ]);
      return {
        header: headerResult.rows[0] ?? null,
        rows: rowsResult.rows.map((row) => row.raw_row_json as Array<string | number | null>),
      };
    },
  };
}

export function getMirrorStore() {
  return hasMirrorDatabase() ? postgresMirrorStore() : localMirrorStore();
}
