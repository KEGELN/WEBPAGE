import {
  getMirrorClubProfile as getLocalMirrorClubProfile,
  getMirrorGameDetail as getLocalMirrorGameDetail,
  getMirrorPlayerProfile as getLocalMirrorPlayerProfile,
  searchMirror as searchLocalMirror,
  type MirrorClubProfile,
  type MirrorPlayerProfile,
} from '@/lib/mirror-db-server';

type MirrorSearch = ReturnType<typeof searchLocalMirror>;

function decodePlayerKey(key: string): string {
  // If the key is hex encoded (from python script) or base64url encoded
  if (/^[0-9a-f]+$/i.test(key)) {
    return Buffer.from(key, 'hex').toString('utf-8');
  }
  return Buffer.from(key, 'base64url').toString('utf-8');
}

function localMirrorStore() {
  return {
    search: (query: string) => searchLocalMirror(query),
    playerProfile: (playerKey: string) => getLocalMirrorPlayerProfile(decodePlayerKey(playerKey)),
    clubProfile: (name: string) => getLocalMirrorClubProfile(name),
    gameDetail: (gameId: string) => getLocalMirrorGameDetail(gameId),
  };
}

function parseResultScore(result: string | null) {
  const match = String(result || '').match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sggiacazfxtntyeywmpd.supabase.co';
}

function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

async function supabaseQuery(table: string, params: Record<string, string> = {}) {
  const url = new URL(`${getSupabaseUrl()}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'apikey': getSupabaseKey(),
      'Authorization': `Bearer ${getSupabaseKey()}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${text}`);
  }

  return response.json();
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function supabaseMirrorStore() {
  return {
    search: async (query: string): Promise<MirrorSearch> => {
      const normalized = query.toLowerCase().replace(/[^a-z0-9äöüß]/gi, '').replace(/\s+/g, '');
      
      const playersData = await supabaseQuery('player_search_index', {
        'normalized_name': `ilike.*${normalized}*`,
        'select': 'player_key,player_name,club_name,game_count,last_game_date',
        'order': 'game_count.desc,last_game_date.desc',
        'limit': '12',
      });

      const clubsData = await supabaseQuery('club_search_index', {
        'normalized_name': `ilike.*${normalized}*`,
        'select': 'club_name,game_count,last_game_date',
        'order': 'game_count.desc,last_game_date.desc',
        'limit': '12',
      });

      return {
        players: (playersData || []).map((row: Record<string, unknown>) => ({
          id: String(row.player_key || ''),
          rawId: String(row.player_key || ''),
          name: String(row.player_name || ''),
          club: String(row.club_name ?? ''),
          gameCount: Number(row.game_count ?? 0),
          lastGameDate: row.last_game_date ? String(row.last_game_date) : '',
        })),
        clubs: (clubsData || []).map((row: Record<string, unknown>) => ({
          name: String(row.club_name || ''),
          gameCount: Number(row.game_count ?? 0),
          lastGameDate: row.last_game_date ? String(row.last_game_date) : '',
        })),
      };
    },
    playerProfile: async (playerKey: string): Promise<MirrorPlayerProfile> => {
      let decodedKey = '';
      if (/^[0-9a-f]+$/i.test(playerKey)) {
        decodedKey = Buffer.from(playerKey, 'hex').toString('utf-8');
      } else {
        decodedKey = Buffer.from(playerKey, 'base64url').toString('utf-8');
      }
      
      const playerData = await supabaseQuery('player_search_index', {
        'player_key': `eq.${decodedKey}`,
        'select': 'player_name,club_name',
        'limit': '1',
      });

      if (!playerData || playerData.length === 0) {
        return { found: false, playerName: decodedKey };
      }

      const playerName = String(playerData[0].player_name);
      const firstName = playerName.split(',')[0].trim();

      const rowsData = await supabaseQuery('game_player_rows', {
        'or': `(player_home.like.*${firstName}*),(player_away.like.*${firstName}*)`,
        'select': 'game_id,player_home,total_home,sp_home,mp_home,player_away,total_away,sp_away,mp_away',
        'order': 'game_id.desc',
        'limit': '500',
      });

      const filteredRows = (rowsData || []).filter((r: Record<string, unknown>) => {
        const home = String(r.player_home ?? '');
        const away = String(r.player_away ?? '');
        return home === playerName || away === playerName;
      });

      if (filteredRows.length === 0) {
        return { found: true, playerName, clubs: [], gamesPlayed: 0, wins: 0, losses: 0, draws: 0, averageScore: 0, ranking: null, history: [] };
      }

      const uniqueGameIds = [...new Set(filteredRows.map((r: Record<string, unknown>) => r.game_id as string))];
      
      const gamesData = await Promise.all(
        uniqueGameIds.slice(0, 100).map((gameId) => 
          supabaseQuery('games', {
            'game_id': `eq.${gameId}`,
            'select': 'game_id,game_date,game_time,team_home,team_away,result,league_context,matchday_label',
            'limit': '1',
          })
        )
      );

      const gamesMap = new Map<string, Record<string, unknown>>();
      gamesData.flat().forEach((g: Record<string, unknown>) => gamesMap.set(g.game_id as string, g));

      const uniqueGames = new Set<string>();
      const clubs = new Set<string>();
      const gameOutcomes = new Map<string, { scoreFor: number; scoreAgainst: number }>();
      const history: NonNullable<MirrorPlayerProfile['history']> = [];
      let totalHolz = 0;
      let countedRows = 0;

      for (const row of filteredRows as Array<Record<string, unknown>>) {
        const game = gamesMap.get(row.game_id as string);
        if (!game) continue;

        const homeRaw = String(row.player_home ?? '');
        const awayRaw = String(row.player_away ?? '');
        const isHome = homeRaw === playerName;
        const playerTotal = isHome ? String(row.total_home ?? '') : String(row.total_away ?? '');
        const playerSp = isHome ? String(row.sp_home ?? '') : String(row.sp_away ?? '');
        const playerMp = isHome ? String(row.mp_home ?? '') : String(row.mp_away ?? '');
        const teamName = isHome ? String(game.team_home) : String(game.team_away);
        const opponentClub = isHome ? String(game.team_away) : String(game.team_home);
        const score = parseResultScore(game.result ? String(game.result) : null);
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
        if (history.length < 50) {
          const scoreFor = score ? (isHome ? score.home : score.away) : null;
          const scoreAgainst = score ? (isHome ? score.away : score.home) : null;
          history.push({
            gameId,
            date: game.game_date ? String(game.game_date) : null,
            time: game.game_time ? String(game.game_time) : null,
            league: game.league_context ? String(game.league_context) : null,
            spieltag: game.matchday_label ? String(game.matchday_label) : null,
            club: teamName,
            opponentClub,
            result: game.result ? String(game.result) : null,
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
        playerName,
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
      const gamesData = await supabaseQuery('games', {
        'or': `(team_home.eq.${encodeURIComponent(name)}),(team_away.eq.${encodeURIComponent(name)})`,
        'select': 'game_id,game_date,game_time,team_home,team_away,result,league_context,matchday_label',
        'order': 'game_date.desc,game_time.desc',
        'limit': '20',
      });

      if (!gamesData || gamesData.length === 0) {
        return { found: false, clubName: name };
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      const history: NonNullable<MirrorClubProfile['history']> = [];

      for (const row of gamesData as Array<Record<string, unknown>>) {
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
        gamesPlayed: gamesData.length,
        wins,
        losses,
        draws,
        history,
      };
    },
    gameDetail: async (gameId: string) => {
      const headerData = await supabaseQuery('games', {
        'game_id': `eq.${gameId}`,
        'limit': '1',
      });

      const rowsData = await supabaseQuery('game_player_rows', {
        'game_id': `eq.${gameId}`,
        'select': 'raw_row_json',
        'order': 'row_index.asc',
      });

      return {
        header: headerData?.[0] ?? null,
        rows: (rowsData || []).map((row: Record<string, unknown>) => row.raw_row_json as Array<string | number | null>),
      };
    },
  };
}

export function getMirrorStore() {
  return hasSupabaseConfig() ? supabaseMirrorStore() : localMirrorStore();
}
