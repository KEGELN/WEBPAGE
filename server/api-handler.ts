// server/api-handler.ts
import { getMirrorPool } from '@/lib/postgres';

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

interface Player {
  rank: number;
  name: string;
  club: string;
  category: string;

  gamesTotal: number;
  avgTotal: number;
  mpTotal: number;

  gamesHome: number;
  avgHome: number;
  mpHome: number;

  gamesAway: number;
  avgAway: number;
  mpAway: number;

  bestGame: number;
}

type ApiRow = (string | number | null | undefined)[];

const LOCAL_LEAGUES = [
  { id: 'berlinliga-local', name: 'Berlin-Liga (Kleeblatt)', art: '2' },
  { id: 'vereinsliga-local', name: 'Vereinsliga (Kleeblatt)', art: '2' },
];

function parseGermanNumber(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return Number(String(val).replace(",", "."));
}

class APIHandler {
  private readonly SPORTWINNER_API_URL =
    process.env.SPORTWINNER_API_URL ||
    "https://skvb.sportwinner.de/php/skvb/service.php";

  private readonly SPORTWINNER_REFERER =
    process.env.SPORTWINNER_REFERER || "https://skvb.sportwinner.de/";
  private readonly SPORTWINNER_TIMEOUT_MS = Number(process.env.SPORTWINNER_TIMEOUT_MS || 4500);

  private getFallbackData(command: string): ApiRow[] | null {
    if (command === "GetSaisonArray") {
      const year = new Date().getFullYear();
      // Keep UI responsive even when upstream is unreachable.
      return [["11", String(year), "1"]];
    }
    return null;
  }

  private isTimeoutLikeError(error: unknown): boolean {
    const e = error as { name?: string; code?: string; cause?: { code?: string } };
    return (
      e?.name === "AbortError" ||
      e?.code === "UND_ERR_CONNECT_TIMEOUT" ||
      e?.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
    );
  }

  /* ---------------- SEASONS ---------------- */

  async getSeasons(): Promise<Season[]> {
    const res = await this.handleCommand("GetSaisonArray", {});
    return res.map(r => ({
      season_id: String(r[0]),
      yearof_season: Number(r[1]),
      status: Number(r[2])
    }));
  }

  async getCurrentSeason(): Promise<Season> {
    const seasons = await this.getSeasons();
    return seasons[0];
  }

  /* ---------------- CLUBS ---------------- */

  async searchClubs(query: string, seasonId: string = "11"): Promise<Club[]> {
    const params: Record<string, string | number> = { id_saison: seasonId };
    if (/^\d+$/.test(query)) {
      params.nr_klub = query;
    } else {
      params.name_klub = query;
    }

    const res = await this.handleCommand("GetKlub", params);
    if (!Array.isArray(res)) return [];

    return res.map(r => ({
      id: String(r[0]),
      nr_club: String(r[1]),
      name_klub: String(r[2])
    }));
  }

  /* ---------------- DISTRICTS ---------------- */

  async getDistricts(seasonId: string = "11"): Promise<District[]> {
    const res = await this.handleCommand("GetBezirkArray", { id_saison: seasonId });
    const externalDistricts = res.map(r => ({
      bezirk_id: String(r[0]),
      name_des_bezirks: String(r[1])
    }));

    return [
      ...externalDistricts,
      { bezirk_id: 'local-district', name_des_bezirks: 'Lokale Ligen (Kleeblatt)' }
    ];
  }

  /* ---------------- LEAGUES ---------------- */

  async getLeagues(
    seasonId: string = "11",
    districtId: string = "0",
    favorit: string = "",
    art: string = "2"
  ): Promise<League[]> {
    if (districtId === 'local-district') {
      return LOCAL_LEAGUES.map(l => ({
        liga_id: l.id,
        name_der_liga: l.name,
      }));
    }

    const res = await this.handleCommand("GetLigaArray", {
      id_saison: seasonId,
      id_bezirk: districtId,
      favorit,
      art
    });

    const externalLeagues = res.map(r => ({
      liga_id: String(r[0]),
      name_der_liga: String(r[2]),
      kontakt_name: r[4] ? String(r[4]) : undefined,
      kontakt_tel1: r[5] ? String(r[5]) : undefined,
      kontakt_tel2: r[6] ? String(r[6]) : undefined,
      kontakt_email1: r[7] ? String(r[7]) : undefined,
      kontakt_email2: r[8] ? String(r[8]) : undefined
    }));

    // Append local leagues if district matches "All" (0) or defaults
    if (!districtId || districtId === "0") {
      const localLeagues = LOCAL_LEAGUES.map(l => ({
        liga_id: l.id,
        name_der_liga: l.name,
      }));
      return [...externalLeagues, ...localLeagues];
    }

    return externalLeagues;
  }

  /* ---------------- SCHNITT RAW ---------------- */

  async getSchnitt(
    seasonId?: string,
    leagueId?: string,
    clubId?: string,
    spieltagNr: number = 100,
    sort: number = 1,
    anzahl: number = 1
  ): Promise<ApiRow[]> {
    if (leagueId?.endsWith('-local')) {
      return this.getLocalSchnitt(seasonId, leagueId, spieltagNr);
    }

    const res = await this.handleCommand("GetSchnitt", {
      id_saison: seasonId || "11",
      id_liga: leagueId || "3874",
      id_klub: clubId || "0",
      nr_spieltag: spieltagNr,
      sort,
      anzahl
    });

    return res.sort((a, b) => Number(a[0]) - Number(b[0]));
  }

  /* ---------------- FIXED PLAYER STATS ---------------- */

  async getFullPlayerStats(
    seasonId?: string,
    leagueId?: string,
    spieltagNr: number = 100
  ): Promise<Player[]> {
    const data = await this.getSchnitt(seasonId, leagueId, undefined, spieltagNr, 0, 100);

    return data
      .map(row => {
        if (!row || row.length < 14) return null;

        return {
          rank: Number(row[0]),
          name: String(row[1]),
          club: String(row[2]),
          category: String(row[3]),

          gamesTotal: Number(row[4]),
          avgTotal: parseGermanNumber(row[5] as string),
          mpTotal: Number(row[6] ?? 0),

          gamesHome: Number(row[7]),
          avgHome: parseGermanNumber(row[8] as string),
          mpHome: Number(row[9] ?? 0),

          gamesAway: Number(row[10]),
          avgAway: parseGermanNumber(row[11] as string),
          mpAway: Number(row[12] ?? 0),

          bestGame: Number(row[13])
        };
      })
      .filter(Boolean) as Player[];
  }

  /* ---------------- STANDINGS ---------------- */

  async getStandings(seasonId?: string, leagueId?: string, matchdayNr: number = 100) {
    if (leagueId?.endsWith('-local')) {
      return this.getLocalStandings(seasonId, leagueId, matchdayNr);
    }
    return this.handleCommand("GetTabelle", {
      id_saison: seasonId,
      id_liga: leagueId,
      nr_spieltag: matchdayNr,
      sort: "gesamt"
    });
  }

  /* ---------------- SPIELTAGE ---------------- */

  async getSpieltage(leagueId?: string, seasonId?: string) {
    if (leagueId?.endsWith('-local')) {
      return [
        ['1', '1', '1. Spieltag', '0'],
        ['2', '2', '2. Spieltag', '0'],
        ['3', '3', '3. Spieltag', '0'],
        ['4', '4', '4. Spieltag', '0'],
        ['5', '5', '5. Spieltag', '0'],
        ['6', '6', '6. Spieltag', '0'],
        ['7', '7', '7. Spieltag', '0'],
        ['8', '8', '8. Spieltag', '0'],
        ['9', '9', '9. Spieltag', '0'],
        ['10', '10', '10. Spieltag', '0'],
      ];
    }
    return this.handleCommand("GetSpieltagArray", {
      id_saison: seasonId || "11",
      id_liga: leagueId || "0"
    });
  }

  /* ---------------- GAMES ---------------- */

  async getGames(params: Record<string, string | number | boolean | undefined>) {
    const leagueId = params.id_liga as string | undefined;
    if (leagueId?.endsWith('-local')) {
      return this.getLocalGames(params.id_saison as string, leagueId);
    }
    return this.handleCommand("GetSpiel", params);
  }

  /* ---------------- PRIVATE LOCAL HELPERS ---------------- */

  private async getLocalSchnitt(seasonId?: string, leagueId?: string, spieltagNr: number = 100): Promise<ApiRow[]> {
    try {
      const pool = getMirrorPool();
      const result = await pool.query(
        'SELECT raw_row_json FROM standings_snapshots WHERE season_id = $1 AND league_id = $2 AND spieltag_nr = $3 AND sort_key = $4 ORDER BY row_index ASC',
        [seasonId || '11', leagueId, String(spieltagNr), 'schnitt']
      );
      return result.rows.map(r => r.raw_row_json as ApiRow);
    } catch (error) {
      console.error('Local schnitt fetch failed:', error);
      return [];
    }
  }

  private async getLocalStandings(seasonId?: string, leagueId?: string, spieltagNr: number = 100): Promise<ApiRow[]> {
    try {
      const pool = getMirrorPool();
      const result = await pool.query(
        'SELECT raw_row_json FROM standings_snapshots WHERE season_id = $1 AND league_id = $2 AND spieltag_nr = $3 AND sort_key = $4 ORDER BY row_index ASC',
        [seasonId || '11', leagueId, String(spieltagNr), 'tabelle']
      );
      return result.rows.map(r => r.raw_row_json as ApiRow);
    } catch (error) {
      console.error('Local standings fetch failed:', error);
      return [];
    }
  }

  private async getLocalGames(seasonId?: string, leagueId?: string): Promise<ApiRow[]> {
    try {
      const pool = getMirrorPool();
      const result = await pool.query(
        'SELECT game_id, game_date, game_time, team_home, points_home, score_home, team_away, points_away, score_away, status, result, matchday_nr FROM games WHERE season_id = $1 AND league_id = $2 ORDER BY game_date ASC, game_time ASC',
        [seasonId || '11', leagueId]
      );
      // Map to Sportwinner format
      return result.rows.map(r => [
        r.game_id,
        r.game_date,
        r.game_time,
        r.team_home,
        r.points_home,
        '', // Placeholder for column 5
        r.team_away,
        r.points_away,
        '', // Placeholder for column 8
        r.status,
        r.result,
        r.matchday_nr
      ]);
    } catch (error) {
      console.error('Local games fetch failed:', error);
      return [];
    }
  }

  /* ---------------- GENERIC COMMAND HANDLER ---------------- */

  async handleCommand(command: string, params: Record<string, string | number | boolean | undefined>): Promise<ApiRow[]> {
    const fetchFromApi = async (cmd: string, p: Record<string, string | number | boolean | undefined>) => {
      console.log(`Executing external API call for ${cmd}`);
      const body = new URLSearchParams({ command: cmd });

      Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") body.append(k, String(v));
      });

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.SPORTWINNER_TIMEOUT_MS);
        const res = await fetch(this.SPORTWINNER_API_URL, {
          method: "POST",
          headers: {
            Referer: this.SPORTWINNER_REFERER,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
          },
          body: body.toString(),
          signal: controller.signal
        }).finally(() => clearTimeout(timeout));

        if (!res.ok) {
          console.warn(`Sportwinner upstream non-ok for ${cmd}: ${res.status}`);
          return [];
        }

        const text = await res.text();
        if (!text || text.trim() === "") {
          return [];
        }

        try {
          const json = JSON.parse(text);
          return Array.isArray(json) ? (json as ApiRow[]) : [];
        } catch (parseErr) {
          console.error(`Sportwinner JSON parse failed for ${cmd}. Body: ${text.slice(0, 100)}`);
          return [];
        }
      } catch (error) {
        console.warn(`Sportwinner fetch failed for ${cmd}:`, error);
        return [];
      }
    };

    try {
      const result = await fetchFromApi(command, params);
      if (Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      if (this.isTimeoutLikeError(error)) {
        console.warn(`Sportwinner timeout for ${command}:`, error);
      }
      const fallback = this.getFallbackData(command);
      if (fallback) return fallback;
      return [];
    }
  }
}

export default APIHandler;
