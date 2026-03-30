// server/api-handler.ts
import { unstable_cache } from 'next/cache';

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

function parseGermanNumber(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return Number(val.replace(",", "."));
}

class APIHandler {
  private static readonly inFlightByCacheKey = new Map<string, Promise<any[][]>>();
  private static readonly lastGoodByCacheKey = new Map<string, { data: any[][]; at: number }>();
  private static readonly commandCooldownUntil = new Map<string, number>();
  private static readonly COMMAND_COOLDOWN_MS = 60_000;

  private readonly SPORTWINNER_API_URL =
    process.env.SPORTWINNER_API_URL ||
    "https://skvb.sportwinner.de/php/skvb/service.php";

  private readonly SPORTWINNER_REFERER =
    process.env.SPORTWINNER_REFERER || "https://skvb.sportwinner.de/";
  private readonly SPORTWINNER_TIMEOUT_MS = Number(process.env.SPORTWINNER_TIMEOUT_MS || 4500);

  private getFallbackData(command: string): any[][] | null {
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
    const params: any = { id_saison: seasonId };
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
    return res.map(r => ({
      bezirk_id: String(r[0]),
      name_des_bezirks: String(r[1])
    }));
  }

  /* ---------------- LEAGUES ---------------- */

  async getLeagues(
    seasonId: string = "11",
    districtId: string = "0",
    favorit: string = "",
    art: string = "2"
  ): Promise<League[]> {
    const res = await this.handleCommand("GetLigaArray", {
      id_saison: seasonId,
      id_bezirk: districtId,
      favorit,
      art
    });

    return res.map(r => ({
      liga_id: String(r[0]),
      name_der_liga: String(r[2]),
      kontakt_name: r[4] || undefined,
      kontakt_tel1: r[5] || undefined,
      kontakt_tel2: r[6] || undefined,
      kontakt_email1: r[7] || undefined,
      kontakt_email2: r[8] || undefined
    }));
  }

  /* ---------------- SCHNITT RAW ---------------- */

  async getSchnitt(
    seasonId?: string,
    leagueId?: string,
    clubId?: string,
    spieltagNr: number = 100,
    sort: number = 1,
    anzahl: number = 1
  ): Promise<any[][]> {
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
          avgTotal: parseGermanNumber(row[5]),
          mpTotal: Number(row[6] ?? 0),

          gamesHome: Number(row[7]),
          avgHome: parseGermanNumber(row[8]),
          mpHome: Number(row[9] ?? 0),

          gamesAway: Number(row[10]),
          avgAway: parseGermanNumber(row[11]),
          mpAway: Number(row[12] ?? 0),

          bestGame: Number(row[13])
        };
      })
      .filter(Boolean) as Player[];
  }

  /* ---------------- STANDINGS ---------------- */

  async getStandings(seasonId?: string, leagueId?: string, matchdayNr: number = 100) {
    return this.handleCommand("GetTabelle", {
      id_saison: seasonId,
      id_liga: leagueId,
      nr_spieltag: matchdayNr,
      sort: "gesamt"
    });
  }

  /* ---------------- SPIELTAGE ---------------- */

  async getSpieltage(leagueId?: string, seasonId?: string) {
    return this.handleCommand("GetSpieltagArray", {
      id_saison: seasonId || "11",
      id_liga: leagueId || "0"
    });
  }

  /* ---------------- GAMES ---------------- */

  async getGames(params: Record<string, any>) {
    return this.handleCommand("GetSpiel", params);
  }

  /* ---------------- GENERIC COMMAND HANDLER ---------------- */

  async handleCommand(command: string, params: Record<string, any>): Promise<any[][]> {
    const fetchFromApi = async (cmd: string, p: Record<string, any>) => {
      console.log(`Executing external API call for ${cmd}`); // Log to verify cache miss
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

        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (error) {
        if (this.isTimeoutLikeError(error)) {
          APIHandler.commandCooldownUntil.set(cmd, Date.now() + APIHandler.COMMAND_COOLDOWN_MS);
        }
        console.warn(`Sportwinner fetch failed for ${cmd}:`, error);
        return [];
      }
    };

    // Create a cache key based on the command and params
    // We sort keys to ensure purely order-independent caching for the same params
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

    const cacheKey = `sportwinner-${command}-${JSON.stringify(sortedParams)}`;
    const now = Date.now();
    const cooldownUntil = APIHandler.commandCooldownUntil.get(command) || 0;

    if (cooldownUntil > now) {
      const stale = APIHandler.lastGoodByCacheKey.get(cacheKey)?.data;
      if (stale) return stale;
      const fallback = this.getFallbackData(command);
      if (fallback) return fallback;
      return [];
    }

    const inFlight = APIHandler.inFlightByCacheKey.get(cacheKey);
    if (inFlight) return inFlight;

    // Use unstable_cache to cache the result
    // Revalidating every 3600 seconds (1 hour) as requested
    const getCachedResult = unstable_cache(
      async () => fetchFromApi(command, params),
      [command, JSON.stringify(sortedParams)], // Key parts
      { revalidate: 3600, tags: ['sportwinner'] }
    );

    const promise = (async () => {
      try {
        const result = (await getCachedResult()) as any[][];
        if (Array.isArray(result)) {
          APIHandler.lastGoodByCacheKey.set(cacheKey, { data: result, at: Date.now() });
        }
        if (Array.isArray(result) && result.length > 0) {
          APIHandler.commandCooldownUntil.delete(command);
        }
        return Array.isArray(result) ? result : [];
      } catch (error) {
        if (this.isTimeoutLikeError(error)) {
          APIHandler.commandCooldownUntil.set(command, Date.now() + APIHandler.COMMAND_COOLDOWN_MS);
        }
        const stale = APIHandler.lastGoodByCacheKey.get(cacheKey)?.data;
        if (stale) return stale;
        const fallback = this.getFallbackData(command);
        if (fallback) return fallback;
        return [];
      } finally {
        APIHandler.inFlightByCacheKey.delete(cacheKey);
      }
    })();

    APIHandler.inFlightByCacheKey.set(cacheKey, promise);
    return promise;
  }
}

export default APIHandler;
