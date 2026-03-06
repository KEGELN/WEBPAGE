'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Season {
  season_id: string;
  yearof_season: number;
}

interface League {
  liga_id: string;
  name_der_liga: string;
}

interface ClubCandidate {
  name_klub: string;
}

interface SpielplanGame {
  spieltag: string;
  game_id: string;
  date_time: string;
  team_home: string;
  team_away: string;
  result: string;
}

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

interface HistoricGameRow {
  seasonId: string;
  seasonLabel: string;
  leagueId: string;
  leagueName: string;
  game: SpielplanGame;
  isHome: boolean;
}

interface PlayerSeasonAggregate {
  seasonId: string;
  seasonLabel: string;
  games: number;
  totalKegel: number;
  totalMp: number;
  totalSp: number;
  bestKegel: number;
  statGames: number;
  totalVolle: number;
  totalAbr: number;
  totalFehl: number;
}

interface PlayerGameStat {
  gameId: string;
  seasonId: string;
  seasonLabel: string;
  leagueName: string;
  dateTime: string;
  spieltag: string;
  opponent: string;
  isHome: boolean;
  result: string;
  kegel: number;
  mp: number;
  sp: number;
  volle: number;
  abraeumen: number;
  fehl: number;
}

interface PlayerAggregate {
  name: string;
  games: number;
  statGames: number;
  totalKegel: number;
  bestKegel: number;
  totalMp: number;
  totalSp: number;
  totalVolle: number;
  totalAbr: number;
  totalFehl: number;
  seasons: PlayerSeasonAggregate[];
  gameStats: PlayerGameStat[];
}

interface TeamAggregate {
  totalGames: number;
  completedGames: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  bestTeamScore: number;
  avgTeamScore: number;
  homeGames: number;
  awayGames: number;
  homeWins: number;
  awayWins: number;
  matchPointsFor: number;
  matchPointsAgainst: number;
  setPointsFor: number;
  setPointsAgainst: number;
}

interface SeasonAggregate {
  seasonId: string;
  seasonLabel: string;
  games: number;
  completedGames: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  avgTeamScore: number;
  bestTeamScore: number;
  matchPointsFor: number;
  matchPointsAgainst: number;
  setPointsFor: number;
  setPointsAgainst: number;
}

interface HistoricOverview {
  clubName: string;
  searchedClub: string;
  totalSeasons: number;
  totalLeaguesChecked: number;
  games: HistoricGameRow[];
  team: TeamAggregate;
  players: PlayerAggregate[];
  seasons: SeasonAggregate[];
}

function normalize(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function toSeasonNumber(label: string): number {
  const number = Number(String(label).replace(/[^\d]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function isTeamMatch(teamName: string, clubName: string, rawQuery: string): boolean {
  const team = normalize(teamName);
  const club = normalize(clubName);
  const query = normalize(rawQuery);
  if (!team) return false;
  if (club && team.includes(club)) return true;
  if (query && team.includes(query)) return true;
  return false;
}

function parseScore(result: string): { home: number; away: number } | null {
  const match = String(result || '').match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function parseNumericCell(value: GameDetailCell): number | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || raw === '–') return null;
  const asNumber = Number(raw.replace(',', '.'));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function parseDateToTime(value: string): number {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  const dotDate = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (dotDate) {
    const day = Number(dotDate[1]);
    const month = Number(dotDate[2]) - 1;
    const year = Number(dotDate[3].length === 2 ? `20${dotDate[3]}` : dotDate[3]);
    const parsed = new Date(year, month, day).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAverage(total: number, games: number): string {
  return (total / Math.max(games, 1)).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function getAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = getAverage(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function openReportWindow(title: string, body: string) {
  const win = window.open('', '_blank', 'width=980,height=900');
  if (!win) {
    window.alert('PDF-Export wurde blockiert. Bitte Popups fuer diese Seite erlauben.');
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
    <style>
      html,body{font-family:Arial,sans-serif;background:#fff7f8 !important;color:#3a171d !important;margin:0;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      *{color:#3a171d}
      .card{background:#fff;border:1px solid #f1d6da;border-radius:14px;padding:16px;margin-bottom:14px}
      h1,h2,h3{margin:0 0 10px 0;color:#7f1d1d}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #f1d6da;padding:6px;text-align:left}
      th{background:#ffe4e6}
      .meta{font-size:12px;color:#7a4a53}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .metric-box{border:1px solid #f1d6da;border-radius:12px;background:#fff1f3;padding:10px}
      .metric-label{font-size:12px;color:#7a4a53}
      .metric-value{font-size:22px;font-weight:700;color:#7f1d1d}
      .img-box{height:420px;border:1px dashed #d8a2ad;border-radius:12px;background:#fff1f3;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .img-box img{max-width:100%;max-height:100%;object-fit:cover}
      .pill{display:inline-block;padding:4px 8px;border:1px solid #f1d6da;border-radius:999px;margin-right:6px;margin-bottom:6px;font-size:12px}
      @media print{body{padding:10mm}}
    </style></head><body>${body}</body></html>`);
  win.document.close();
  const triggerPrint = () => {
    win.focus();
    win.print();
  };
  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 500);
  } else {
    win.addEventListener('load', () => setTimeout(triggerPrint, 250), { once: true });
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string
) {
  roundedRectPath(ctx, x, y, w, h, 16);
  ctx.fillStyle = '#fff1f3';
  ctx.fill();
  ctx.strokeStyle = '#f1d6da';
  ctx.stroke();
  ctx.fillStyle = '#7a4a53';
  ctx.font = '500 18px Arial';
  ctx.fillText(label, x + 16, y + 30);
  ctx.fillStyle = '#7f1d1d';
  ctx.font = '700 34px Arial';
  ctx.fillText(value, x + 16, y + 72);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}

function toCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const escaped = raw.replaceAll('"', '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.map(toCsvCell).join(';'), ...rows.map((row) => row.map(toCsvCell).join(';'))];
  const csv = `\ufeff${lines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function fetchGetSpielFallback(seasonId: string, leagueId: string): Promise<SpielplanGame[]> {
  const body = new URLSearchParams({
    command: 'GetSpiel',
    id_saison: seasonId,
    id_klub: '0',
    id_bezirk: '0',
    id_liga: leagueId,
    id_spieltag: '0',
    favorit: '',
    art_bezirk: '1',
    art_liga: '0',
    art_spieltag: '0',
  });

  try {
    const res = await fetch('/api/sportwinner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      if (!Array.isArray(row)) {
        return {
          spieltag: '',
          game_id: '',
          date_time: '',
          team_home: '',
          team_away: '',
          result: '',
        } as SpielplanGame;
      }
      const left = String(row?.[7] ?? '').trim();
      const right = String(row?.[8] ?? '').trim();
      const result = left !== '' && right !== '' ? `${left} : ${right}` : '';
      const date = String(row?.[1] ?? '').trim();
      const time = String(row?.[2] ?? '').trim();

      return {
        spieltag: String(row?.[11] ?? ''),
        game_id: String(row?.[0] ?? ''),
        date_time: [date, time].filter(Boolean).join(' ').trim(),
        team_home: String(row?.[3] ?? ''),
        team_away: String(row?.[6] ?? ''),
        result,
      } as SpielplanGame;
    });
  } catch (error) {
    console.warn('Fallback GetSpiel failed:', error);
    return [];
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  worker: (item: TInput) => Promise<TOutput>,
  concurrency = 6
): Promise<TOutput[]> {
  if (items.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results: TOutput[] = new Array(items.length);
  let current = 0;

  const runWorker = async () => {
    while (true) {
      const index = current;
      current += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  };

  await Promise.all(Array.from({ length: safeConcurrency }, () => runWorker()));
  return results;
}

async function retryAsync<T>(worker: () => Promise<T>, attempts = 3, delayMs = 220): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await worker();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

export default function ClubsPage() {
  const apiService = ApiService.getInstance();
  const MAX_SEASONS_TO_SCAN = 20;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<HistoricOverview | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [minGamesFilter, setMinGamesFilter] = useState(5);
  const [seasonFilter, setSeasonFilter] = useState('');
  const [playerImageUrl, setPlayerImageUrl] = useState('');
  const [playerImageDataUrl, setPlayerImageDataUrl] = useState('');
  const [seasonViewTab, setSeasonViewTab] = useState<'recap' | 'compare'>('recap');
  const [recapSeasonLabel, setRecapSeasonLabel] = useState('');
  const [historicVenueFilter, setHistoricVenueFilter] = useState<'all' | 'home' | 'away'>('all');
  const [historicSort, setHistoricSort] = useState<'newest' | 'oldest'>('newest');
  const [openHistoricGameKey, setOpenHistoricGameKey] = useState<string | null>(null);
  const [historicGameDetails, setHistoricGameDetails] = useState<Record<string, GameDetailRow[]>>({});
  const [historicDetailsLoading, setHistoricDetailsLoading] = useState<Record<string, boolean>>({});

  const runHistoricOverview = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Bitte gib einen Vereinsnamen ein.');
      return;
    }

    setLoading(true);
    setError(null);
    setOverview(null);
    setSelectedPlayerName(null);
    setOpenHistoricGameKey(null);
    setHistoricGameDetails({});
    setHistoricDetailsLoading({});

    try {
      let resolvedClubName = trimmed;
      try {
        const clubCandidates = (await apiService.searchClubs(trimmed)) as ClubCandidate[];
        if (clubCandidates[0]?.name_klub) {
          resolvedClubName = clubCandidates[0].name_klub;
        }
      } catch (clubSearchError) {
        console.warn('Club name resolution failed, falling back to raw query:', clubSearchError);
      }

      const seasons = (await apiService.getCurrentSeason()) as Season[];
      const uniqueSeasons = Array.from(
        new Map(
          seasons
            .filter((season) => String(season.season_id || '').trim() !== '')
            .map((season) => [String(season.season_id), season])
        ).values()
      );
      const seasonSorted = [...uniqueSeasons]
        .sort((a, b) => Number(b.yearof_season) - Number(a.yearof_season))
        .slice(0, MAX_SEASONS_TO_SCAN);

      const allGames: HistoricGameRow[] = [];
      let totalLeaguesChecked = 0;

      for (const season of seasonSorted) {
        const leagueMap = new Map<string, League>();
        const addLeagueList = (list: League[]) => {
          list.forEach((league) => {
            const id = String(league.liga_id || '').trim();
            if (!id) return;
            if (!leagueMap.has(id)) {
              leagueMap.set(id, league);
            }
          });
        };

        // Global league lists for season (both known art variants).
        const [globalArt2, globalArt1] = (await Promise.all([
          retryAsync(() => apiService.getLeagues(season.season_id, '0', 2), 3).catch(() => [] as League[]),
          retryAsync(() => apiService.getLeagues(season.season_id, '0', 1), 3).catch(() => [] as League[]),
        ])) as [League[], League[]];
        addLeagueList(globalArt2);
        addLeagueList(globalArt1);

        // District-specific leagues to ensure we do not miss older/hidden leagues.
        const districts = (await retryAsync(() => apiService.getDistricts(season.season_id), 3).catch(() => [] as { bezirk_id: string }[])) as {
          bezirk_id: string;
        }[];
        const districtLeagueLists = await mapWithConcurrency(
          districts,
          async (district) => {
            const districtId = String(district?.bezirk_id || '').trim();
            if (!districtId) return [] as League[];
            try {
              const [byDistrictArt2, byDistrictArt1] = (await Promise.all([
                retryAsync(() => apiService.getLeagues(season.season_id, districtId, 2), 2).catch(() => [] as League[]),
                retryAsync(() => apiService.getLeagues(season.season_id, districtId, 1), 2).catch(() => [] as League[]),
              ])) as [League[], League[]];
              return [...byDistrictArt2, ...byDistrictArt1];
            } catch {
              return [] as League[];
            }
          },
          3
        );
        districtLeagueLists.forEach((list) => addLeagueList(list));

        const leagues = Array.from(leagueMap.values());
        totalLeaguesChecked += leagues.length;

        const seasonPlans = await mapWithConcurrency(
          leagues,
          async (league) => {
            try {
              let plan = (await retryAsync(() => apiService.getSpielplan(season.season_id, league.liga_id), 3)) as SpielplanGame[];
              if (!plan || plan.length === 0) {
                plan = await retryAsync(() => fetchGetSpielFallback(season.season_id, league.liga_id), 3);
              }
              return { league, plan };
            } catch (planError) {
              console.warn(`Could not load spielplan for season ${season.season_id}, league ${league.liga_id}`, planError);
              return { league, plan: [] as SpielplanGame[] };
            }
          },
          3
        );

        seasonPlans.forEach(({ league, plan }) => {
          const matches = plan.filter((game) => {
            const homeMatch = isTeamMatch(game.team_home, resolvedClubName, trimmed);
            const awayMatch = isTeamMatch(game.team_away, resolvedClubName, trimmed);
            return homeMatch || awayMatch;
          });

          matches.forEach((game) => {
            allGames.push({
              seasonId: season.season_id,
              seasonLabel: String(season.yearof_season),
              leagueId: league.liga_id,
              leagueName: league.name_der_liga,
              isHome: isTeamMatch(game.team_home, resolvedClubName, trimmed),
              game,
            });
          });
        });
      }

      const detailRowsByGameId = new Map<string, GameDetailRow[]>();
      const seenGameKeys = new Set<string>();
      const playableGames = allGames.filter((entry) => {
        if (!entry.game.game_id || entry.game.game_id === '0') return false;
        if (!parseScore(entry.game.result)) return false;
        const key = `${entry.seasonId}:${entry.game.game_id}`;
        if (seenGameKeys.has(key)) return false;
        seenGameKeys.add(key);
        return true;
      });

      const detailPayloads = await mapWithConcurrency(
        playableGames,
        async (entry) => {
          try {
            return {
              gameKey: `${entry.seasonId}:${entry.game.game_id}`,
              rows: (await retryAsync(() => apiService.getSpielerInfo(entry.seasonId, entry.game.game_id, 1), 3)) as GameDetailRow[],
            };
          } catch (detailError) {
            console.warn(`Could not load detail rows for game ${entry.game.game_id}`, detailError);
            return { gameKey: `${entry.seasonId}:${entry.game.game_id}`, rows: [] as GameDetailRow[] };
          }
        },
        3
      );

      detailPayloads.forEach((payload) => {
        detailRowsByGameId.set(payload.gameKey, payload.rows);
      });
      const detailStatsByGameId = new Map<string, GameDetailRow[]>();
      const detailStatsPayloads = await mapWithConcurrency(
        playableGames,
        async (entry) => {
          try {
            return {
              gameKey: `${entry.seasonId}:${entry.game.game_id}`,
              rows: (await retryAsync(() => apiService.getSpielerInfo(entry.seasonId, entry.game.game_id, 0), 3)) as GameDetailRow[],
            };
          } catch (detailError) {
            console.warn(`Could not load stat rows for game ${entry.game.game_id}`, detailError);
            return { gameKey: `${entry.seasonId}:${entry.game.game_id}`, rows: [] as GameDetailRow[] };
          }
        },
        3
      );
      detailStatsPayloads.forEach((payload) => {
        detailStatsByGameId.set(payload.gameKey, payload.rows);
      });

      const seasonMap = new Map<string, SeasonAggregate>();
      const playerMap = new Map<
        string,
        {
          name: string;
          games: number;
          statGames: number;
          totalKegel: number;
          bestKegel: number;
          totalMp: number;
          totalSp: number;
          totalVolle: number;
          totalAbr: number;
          totalFehl: number;
          seasons: Map<string, PlayerSeasonAggregate>;
          gameStats: PlayerGameStat[];
          gameStatsIndex: Map<string, number>;
          statsSeenGames: Set<string>;
        }
      >();

      let completedGames = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let bestTeamScore = 0;
      let matchPointsFor = 0;
      let matchPointsAgainst = 0;
      let setPointsFor = 0;
      let setPointsAgainst = 0;
      let homeWins = 0;
      let awayWins = 0;

      allGames.forEach((entry) => {
        if (!seasonMap.has(entry.seasonId)) {
          seasonMap.set(entry.seasonId, {
            seasonId: entry.seasonId,
            seasonLabel: entry.seasonLabel,
            games: 0,
            completedGames: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            avgTeamScore: 0,
            bestTeamScore: 0,
            matchPointsFor: 0,
            matchPointsAgainst: 0,
            setPointsFor: 0,
            setPointsAgainst: 0,
          });
        }

        const seasonBucket = seasonMap.get(entry.seasonId)!;
        seasonBucket.games += 1;

        const score = parseScore(entry.game.result);
        if (score) {
          completedGames += 1;
          seasonBucket.completedGames += 1;

          const clubFor = entry.isHome ? score.home : score.away;
          const clubAgainst = entry.isHome ? score.away : score.home;

          pointsFor += clubFor;
          pointsAgainst += clubAgainst;
          seasonBucket.pointsFor += clubFor;
          seasonBucket.pointsAgainst += clubAgainst;

          bestTeamScore = Math.max(bestTeamScore, clubFor);
          seasonBucket.bestTeamScore = Math.max(seasonBucket.bestTeamScore, clubFor);

          if (clubFor > clubAgainst) {
            wins += 1;
            seasonBucket.wins += 1;
            if (entry.isHome) homeWins += 1;
            else awayWins += 1;
          } else if (clubFor < clubAgainst) {
            losses += 1;
            seasonBucket.losses += 1;
          } else {
            draws += 1;
            seasonBucket.draws += 1;
          }
        }

        const rows = detailRowsByGameId.get(`${entry.seasonId}:${entry.game.game_id}`) || [];
        rows.forEach((row) => {
          const isNoteRow = row.length > 16 || (row?.[0] && row.slice(1).every((value) => value === '' || value === undefined));
          if (isNoteRow) return;

          const isTotalsRow = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];
          if (isTotalsRow) {
            const spFor = parseNumericCell(entry.isHome ? row[6] : row[9]) ?? 0;
            const spAgainst = parseNumericCell(entry.isHome ? row[9] : row[6]) ?? 0;
            const mpFor = parseNumericCell(entry.isHome ? row[7] : row[8]) ?? 0;
            const mpAgainst = parseNumericCell(entry.isHome ? row[8] : row[7]) ?? 0;

            setPointsFor += spFor;
            setPointsAgainst += spAgainst;
            matchPointsFor += mpFor;
            matchPointsAgainst += mpAgainst;

            seasonBucket.setPointsFor += spFor;
            seasonBucket.setPointsAgainst += spAgainst;
            seasonBucket.matchPointsFor += mpFor;
            seasonBucket.matchPointsAgainst += mpAgainst;
            return;
          }

          const playerName = String((entry.isHome ? row[0] : row[15]) ?? '').trim();
          if (!playerName) return;

          const kegel = parseNumericCell(entry.isHome ? row[5] : row[10]) ?? 0;
          const mp = parseNumericCell(entry.isHome ? row[7] : row[8]) ?? 0;
          const sp = parseNumericCell(entry.isHome ? row[6] : row[9]) ?? 0;

          if (!playerMap.has(playerName)) {
            playerMap.set(playerName, {
              name: playerName,
              games: 0,
              statGames: 0,
              totalKegel: 0,
              bestKegel: 0,
              totalMp: 0,
              totalSp: 0,
              totalVolle: 0,
              totalAbr: 0,
              totalFehl: 0,
              seasons: new Map<string, PlayerSeasonAggregate>(),
              gameStats: [],
              gameStatsIndex: new Map<string, number>(),
              statsSeenGames: new Set<string>(),
            });
          }

          const playerBucket = playerMap.get(playerName)!;
          playerBucket.games += 1;
          playerBucket.totalKegel += kegel;
          playerBucket.bestKegel = Math.max(playerBucket.bestKegel, kegel);
          playerBucket.totalMp += mp;
          playerBucket.totalSp += sp;

          if (!playerBucket.seasons.has(entry.seasonId)) {
            playerBucket.seasons.set(entry.seasonId, {
              seasonId: entry.seasonId,
              seasonLabel: entry.seasonLabel,
              games: 0,
              totalKegel: 0,
              totalMp: 0,
              totalSp: 0,
              bestKegel: 0,
              statGames: 0,
              totalVolle: 0,
              totalAbr: 0,
              totalFehl: 0,
            });
          }

          const playerSeason = playerBucket.seasons.get(entry.seasonId)!;
          playerSeason.games += 1;
          playerSeason.totalKegel += kegel;
          playerSeason.totalMp += mp;
          playerSeason.totalSp += sp;
          playerSeason.bestKegel = Math.max(playerSeason.bestKegel, kegel);

          const gameKey = `${entry.seasonId}:${entry.game.game_id}`;
          const existingIndex = playerBucket.gameStatsIndex.get(gameKey);
          if (existingIndex === undefined) {
            const nextIndex = playerBucket.gameStats.length;
            playerBucket.gameStats.push({
              gameId: String(entry.game.game_id || ''),
              seasonId: entry.seasonId,
              seasonLabel: entry.seasonLabel,
              leagueName: entry.leagueName,
              dateTime: entry.game.date_time,
              spieltag: entry.game.spieltag,
              opponent: entry.isHome ? entry.game.team_away : entry.game.team_home,
              isHome: entry.isHome,
              result: entry.game.result,
              kegel,
              mp,
              sp,
              volle: 0,
              abraeumen: 0,
              fehl: 0,
            });
            playerBucket.gameStatsIndex.set(gameKey, nextIndex);
          } else {
            playerBucket.gameStats[existingIndex].kegel = kegel;
            playerBucket.gameStats[existingIndex].mp = mp;
            playerBucket.gameStats[existingIndex].sp = sp;
          }
        });

        const statRows = detailStatsByGameId.get(`${entry.seasonId}:${entry.game.game_id}`) || [];
        statRows.forEach((row) => {
          const isTotalsRow = row?.[1] === '' && row?.[10] === '';
          if (isTotalsRow) return;

          const playerName = String((entry.isHome ? row[1] : row[10]) ?? '').trim();
          if (!playerName) return;

          const volle = parseNumericCell(entry.isHome ? row[2] : row[9]) ?? 0;
          const abr = parseNumericCell(entry.isHome ? row[3] : row[8]) ?? 0;
          const fehl = parseNumericCell(entry.isHome ? row[4] : row[7]) ?? 0;

          if (!playerMap.has(playerName)) {
            playerMap.set(playerName, {
              name: playerName,
              games: 0,
              statGames: 0,
              totalKegel: 0,
              bestKegel: 0,
              totalMp: 0,
              totalSp: 0,
              totalVolle: 0,
              totalAbr: 0,
              totalFehl: 0,
              seasons: new Map<string, PlayerSeasonAggregate>(),
              gameStats: [],
              gameStatsIndex: new Map<string, number>(),
              statsSeenGames: new Set<string>(),
            });
          }

          const playerBucket = playerMap.get(playerName)!;
          if (!playerBucket.seasons.has(entry.seasonId)) {
            playerBucket.seasons.set(entry.seasonId, {
              seasonId: entry.seasonId,
              seasonLabel: entry.seasonLabel,
              games: 0,
              totalKegel: 0,
              totalMp: 0,
              totalSp: 0,
              bestKegel: 0,
              statGames: 0,
              totalVolle: 0,
              totalAbr: 0,
              totalFehl: 0,
            });
          }

          const seasonStats = playerBucket.seasons.get(entry.seasonId)!;
          const gameKey = `${entry.seasonId}:${entry.game.game_id}`;
          if (!playerBucket.statsSeenGames.has(gameKey)) {
            playerBucket.statsSeenGames.add(gameKey);
            playerBucket.statGames += 1;
            playerBucket.totalVolle += volle;
            playerBucket.totalAbr += abr;
            playerBucket.totalFehl += fehl;
            seasonStats.statGames += 1;
            seasonStats.totalVolle += volle;
            seasonStats.totalAbr += abr;
            seasonStats.totalFehl += fehl;
          }

          const statGameIndex = playerBucket.gameStatsIndex.get(gameKey);
          if (statGameIndex !== undefined) {
            playerBucket.gameStats[statGameIndex].volle = volle;
            playerBucket.gameStats[statGameIndex].abraeumen = abr;
            playerBucket.gameStats[statGameIndex].fehl = fehl;
          }
        });
      });

      const players: PlayerAggregate[] = Array.from(playerMap.values())
        .map((player) => ({
          name: player.name,
          games: player.games,
          statGames: player.statGames,
          totalKegel: player.totalKegel,
          bestKegel: player.bestKegel,
          totalMp: player.totalMp,
          totalSp: player.totalSp,
          totalVolle: player.totalVolle,
          totalAbr: player.totalAbr,
          totalFehl: player.totalFehl,
          seasons: Array.from(player.seasons.values()).sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel)),
          gameStats: [...player.gameStats].sort((a, b) => {
            const seasonDelta = toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel);
            if (seasonDelta !== 0) return seasonDelta;
            return parseDateToTime(b.dateTime) - parseDateToTime(a.dateTime);
          }),
        }))
        .sort((a, b) => {
          const avgA = a.games > 0 ? a.totalKegel / a.games : 0;
          const avgB = b.games > 0 ? b.totalKegel / b.games : 0;
          if (avgA !== avgB) return avgB - avgA;
          return b.bestKegel - a.bestKegel;
        });

      const seasonsAggregated = Array.from(seasonMap.values())
        .map((season) => ({
          ...season,
          avgTeamScore: season.completedGames > 0 ? season.pointsFor / season.completedGames : 0,
        }))
        .sort((a, b) => toSeasonNumber(a.seasonLabel) - toSeasonNumber(b.seasonLabel));

      const team: TeamAggregate = {
        totalGames: allGames.length,
        completedGames,
        wins,
        draws,
        losses,
        pointsFor,
        pointsAgainst,
        bestTeamScore,
        avgTeamScore: completedGames > 0 ? pointsFor / completedGames : 0,
        homeGames: allGames.filter((game) => game.isHome).length,
        awayGames: allGames.filter((game) => !game.isHome).length,
        homeWins,
        awayWins,
        matchPointsFor,
        matchPointsAgainst,
        setPointsFor,
        setPointsAgainst,
      };

      setOverview({
        clubName: resolvedClubName,
        searchedClub: trimmed,
        totalSeasons: seasonSorted.length,
        totalLeaguesChecked,
        games: allGames.sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel)),
        team,
        players,
        seasons: seasonsAggregated,
      });
    } catch (err) {
      console.error(err);
      setError('Historische Vereinsübersicht konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const topPlayers = useMemo(() => (overview ? overview.players.slice(0, 20) : []), [overview]);

  const selectedPlayer = useMemo(() => {
    if (!overview || !selectedPlayerName) return null;
    return overview.players.find((player) => player.name === selectedPlayerName) || null;
  }, [overview, selectedPlayerName]);

  const selectedPlayerPerformance = useMemo(() => {
    if (!selectedPlayer) return null;

    const homeGames = selectedPlayer.gameStats.filter((game) => game.isHome);
    const awayGames = selectedPlayer.gameStats.filter((game) => !game.isHome);
    const homeKegel = homeGames.map((game) => game.kegel);
    const awayKegel = awayGames.map((game) => game.kegel);
    const allKegel = selectedPlayer.gameStats.map((game) => game.kegel);
    const recentGames = selectedPlayer.gameStats.slice(0, 12).reverse();
    const recentFormGames = selectedPlayer.gameStats.slice(0, 5);
    const validVolle = selectedPlayer.gameStats.filter((game) => game.volle > 0);
    const validAbr = selectedPlayer.gameStats.filter((game) => game.abraeumen > 0);
    const validFehl = selectedPlayer.gameStats.filter((game) => game.fehl >= 0);

    const bestHomeGame = [...homeGames].sort((a, b) => b.kegel - a.kegel)[0] || null;
    const bestAwayGame = [...awayGames].sort((a, b) => b.kegel - a.kegel)[0] || null;

    return {
      homeGames,
      awayGames,
      homeAvg: getAverage(homeKegel),
      awayAvg: getAverage(awayKegel),
      homeBest: homeKegel.length > 0 ? Math.max(...homeKegel) : 0,
      awayBest: awayKegel.length > 0 ? Math.max(...awayKegel) : 0,
      homeWorst: homeKegel.length > 0 ? Math.min(...homeKegel) : 0,
      awayWorst: awayKegel.length > 0 ? Math.min(...awayKegel) : 0,
      homeMpAvg: getAverage(homeGames.map((game) => game.mp)),
      awayMpAvg: getAverage(awayGames.map((game) => game.mp)),
      volleAvg: getAverage(validVolle.map((game) => game.volle)),
      abrAvg: getAverage(validAbr.map((game) => game.abraeumen)),
      fehlAvg: getAverage(validFehl.map((game) => game.fehl)),
      homeVolleAvg: getAverage(homeGames.map((game) => game.volle)),
      awayVolleAvg: getAverage(awayGames.map((game) => game.volle)),
      overallStdDev: getStdDev(allKegel),
      recentFormAvg: getAverage(recentFormGames.map((game) => game.kegel)),
      recentGames,
      bestHomeGame,
      bestAwayGame,
      homeTopGames: [...homeGames].sort((a, b) => b.kegel - a.kegel).slice(0, 3),
      awayTopGames: [...awayGames].sort((a, b) => b.kegel - a.kegel).slice(0, 3),
    };
  }, [selectedPlayer]);

  const seasonOptions = useMemo(() => {
    if (!overview) return [] as string[];
    return [...new Set(overview.seasons.map((season) => season.seasonLabel))].sort((a, b) => toSeasonNumber(b) - toSeasonNumber(a));
  }, [overview]);

  useEffect(() => {
    if (!overview || overview.seasons.length === 0) return;
    if (!recapSeasonLabel) {
      const latest = [...overview.seasons].sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel))[0];
      if (latest) setRecapSeasonLabel(latest.seasonLabel);
    }
  }, [overview, recapSeasonLabel]);

  const filteredPlayers = useMemo(() => {
    if (!overview) return [] as PlayerAggregate[];
    return overview.players.filter((player) => {
      if (player.games < minGamesFilter) return false;
      if (!seasonFilter) return true;
      return player.seasons.some((season) => season.seasonLabel === seasonFilter);
    });
  }, [minGamesFilter, overview, seasonFilter]);

  const filteredSeasonAggregate = useMemo(() => {
    if (!overview || !seasonFilter) return null;
    return overview.seasons.find((season) => season.seasonLabel === seasonFilter) || null;
  }, [overview, seasonFilter]);

  const teamMetricsForActiveFilter = useMemo(() => {
    if (!overview) return null;
    if (!filteredSeasonAggregate) return overview.team;
    return {
      totalGames: filteredSeasonAggregate.games,
      completedGames: filteredSeasonAggregate.completedGames,
      wins: filteredSeasonAggregate.wins,
      draws: filteredSeasonAggregate.draws,
      losses: filteredSeasonAggregate.losses,
      pointsFor: filteredSeasonAggregate.pointsFor,
      pointsAgainst: filteredSeasonAggregate.pointsAgainst,
      bestTeamScore: filteredSeasonAggregate.bestTeamScore,
      avgTeamScore: filteredSeasonAggregate.avgTeamScore,
      homeGames: 0,
      awayGames: 0,
      homeWins: 0,
      awayWins: 0,
      matchPointsFor: filteredSeasonAggregate.matchPointsFor,
      matchPointsAgainst: filteredSeasonAggregate.matchPointsAgainst,
      setPointsFor: filteredSeasonAggregate.setPointsFor,
      setPointsAgainst: filteredSeasonAggregate.setPointsAgainst,
    };
  }, [filteredSeasonAggregate, overview]);

  const recapSeason = useMemo(() => {
    if (!overview || !recapSeasonLabel) return null;
    return overview.seasons.find((season) => season.seasonLabel === recapSeasonLabel) || null;
  }, [overview, recapSeasonLabel]);

  const comparisonPair = useMemo(() => {
    if (!overview || overview.seasons.length < 2) return null;
    const sorted = [...overview.seasons].sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel));
    return { current: sorted[0], previous: sorted[1] };
  }, [overview]);

  const topMpEfficiencyPlayers = useMemo(() => {
    return filteredPlayers
      .map((player) => ({
        ...player,
        mpPerGame: player.games > 0 ? player.totalMp / player.games : 0,
      }))
      .sort((a, b) => b.mpPerGame - a.mpPerGame)
      .slice(0, 8);
  }, [filteredPlayers]);

  const topPlayerStats = useMemo(() => {
    const top = topPlayers;
    if (top.length === 0) {
      return {
        bestAvg: 0,
        bestSingle: 0,
        bestTotalKegel: 0,
        bestMp: 0,
        bestSp: 0,
        bestVolle: 0,
        bestAbr: 0,
        bestFehl: Number.POSITIVE_INFINITY,
      };
    }
    const avgVolle = top.map((player) => (player.statGames > 0 ? player.totalVolle / player.statGames : 0));
    const avgAbr = top.map((player) => (player.statGames > 0 ? player.totalAbr / player.statGames : 0));
    const avgFehl = top
      .filter((player) => player.statGames > 0)
      .map((player) => player.totalFehl / player.statGames);
    return {
      bestAvg: Math.max(...top.map((player) => (player.games > 0 ? player.totalKegel / player.games : 0))),
      bestSingle: Math.max(...top.map((player) => player.bestKegel)),
      bestTotalKegel: Math.max(...top.map((player) => player.totalKegel)),
      bestMp: Math.max(...top.map((player) => player.totalMp)),
      bestSp: Math.max(...top.map((player) => player.totalSp)),
      bestVolle: Math.max(...avgVolle),
      bestAbr: Math.max(...avgAbr),
      bestFehl: avgFehl.length > 0 ? Math.min(...avgFehl) : Number.POSITIVE_INFINITY,
    };
  }, [topPlayers]);

  const exportTeamPdfReport = () => {
    if (!overview) return;
    const winRate = overview.team.completedGames > 0 ? (overview.team.wins / overview.team.completedGames) * 100 : 0;
    const drawRate = overview.team.completedGames > 0 ? (overview.team.draws / overview.team.completedGames) * 100 : 0;
    const lossRate = overview.team.completedGames > 0 ? (overview.team.losses / overview.team.completedGames) * 100 : 0;
    const homeWinRate = overview.team.homeGames > 0 ? (overview.team.homeWins / overview.team.homeGames) * 100 : 0;
    const awayWinRate = overview.team.awayGames > 0 ? (overview.team.awayWins / overview.team.awayGames) * 100 : 0;
    const mpDiff = overview.team.matchPointsFor - overview.team.matchPointsAgainst;
    const spDiff = overview.team.setPointsFor - overview.team.setPointsAgainst;
    const kegelDiff = overview.team.pointsFor - overview.team.pointsAgainst;

    const leagueCounts = new Map<string, number>();
    overview.games.forEach((entry) => {
      leagueCounts.set(entry.leagueName, (leagueCounts.get(entry.leagueName) || 0) + 1);
    });
    const leagueRows = Array.from(leagueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([leagueName, count]) => `<tr><td>${escapeHtml(leagueName)}</td><td>${count}</td></tr>`)
      .join('');

    const seasonRows = overview.seasons
      .slice()
      .sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel))
      .map(
        (season) =>
          `<tr><td>${escapeHtml(season.seasonLabel)}</td><td>${season.games}</td><td>${season.completedGames}</td><td>${season.wins}/${season.draws}/${season.losses}</td><td>${season.pointsFor}:${season.pointsAgainst}</td><td>${season.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</td><td>${season.bestTeamScore}</td><td>${season.matchPointsFor}:${season.matchPointsAgainst}</td><td>${season.setPointsFor}:${season.setPointsAgainst}</td></tr>`
      )
      .join('');

    const topPlayersHtml = overview.players
      .slice(0, 25)
      .map(
        (player) =>
          `<tr><td>${escapeHtml(player.name)}</td><td>${player.games}</td><td>${formatAverage(player.totalKegel, player.games)}</td><td>${player.bestKegel}</td><td>${player.totalKegel}</td><td>${player.totalMp}</td><td>${player.totalSp}</td></tr>`
      )
      .join('');

    const recentGamesRows = overview.games
      .slice(0, 30)
      .map(
        (entry) =>
          `<tr><td>${escapeHtml(entry.seasonLabel)}</td><td>${escapeHtml(entry.leagueName)}</td><td>${escapeHtml(entry.game.spieltag || '-')}</td><td>${escapeHtml(entry.game.date_time || '-')}</td><td>${escapeHtml(entry.game.team_home || '-')}</td><td>${escapeHtml(entry.game.team_away || '-')}</td><td>${escapeHtml(entry.game.result || '-')}</td></tr>`
      )
      .join('');

    const bestPlayersByBestGame = overview.players
      .slice()
      .sort((a, b) => b.bestKegel - a.bestKegel)
      .slice(0, 10)
      .map((player) => `<tr><td>${escapeHtml(player.name)}</td><td>${player.bestKegel}</td><td>${formatAverage(player.totalKegel, player.games)}</td></tr>`)
      .join('');

    openReportWindow(
      `${overview.clubName} Teamreport`,
      `
      <div class="card">
        <h1>Team-Report: ${escapeHtml(overview.clubName)}</h1>
        <div class="meta">Erstellt: ${new Date().toLocaleString('de-DE')}</div>
        <div class="metric-grid" style="margin-top:10px">
          <div class="metric-box"><div class="metric-label">Spiele</div><div class="metric-value">${overview.team.totalGames}</div></div>
          <div class="metric-box"><div class="metric-label">Abgeschlossen</div><div class="metric-value">${overview.team.completedGames}</div></div>
          <div class="metric-box"><div class="metric-label">Schnitt</div><div class="metric-value">${overview.team.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
          <div class="metric-box"><div class="metric-label">Bestes</div><div class="metric-value">${overview.team.bestTeamScore}</div></div>
          <div class="metric-box"><div class="metric-label">W / D / L</div><div class="metric-value">${overview.team.wins} / ${overview.team.draws} / ${overview.team.losses}</div></div>
          <div class="metric-box"><div class="metric-label">Kegel-Diff</div><div class="metric-value">${kegelDiff >= 0 ? '+' : ''}${kegelDiff}</div></div>
          <div class="metric-box"><div class="metric-label">MP-Diff</div><div class="metric-value">${mpDiff >= 0 ? '+' : ''}${mpDiff}</div></div>
          <div class="metric-box"><div class="metric-label">SP-Diff</div><div class="metric-value">${spDiff >= 0 ? '+' : ''}${spDiff}</div></div>
        </div>
      </div>
      <div class="card">
        <h2>Performance-Zusammenfassung</h2>
        <table>
          <thead><tr><th>Kennzahl</th><th>Wert</th><th>Zusatz</th></tr></thead>
          <tbody>
            <tr><td>Gesamt Winrate</td><td>${winRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}%</td><td>Draw ${drawRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}% | Loss ${lossRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}%</td></tr>
            <tr><td>Heim / Auswärts</td><td>${overview.team.homeGames} / ${overview.team.awayGames}</td><td>Heim-Winrate ${homeWinRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}% | Auswärts-Winrate ${awayWinRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}%</td></tr>
            <tr><td>Kegel</td><td>${overview.team.pointsFor} : ${overview.team.pointsAgainst}</td><td>Diff ${kegelDiff >= 0 ? '+' : ''}${kegelDiff}</td></tr>
            <tr><td>Matchpunkte</td><td>${overview.team.matchPointsFor} : ${overview.team.matchPointsAgainst}</td><td>Diff ${mpDiff >= 0 ? '+' : ''}${mpDiff}</td></tr>
            <tr><td>Satzpunkte</td><td>${overview.team.setPointsFor} : ${overview.team.setPointsAgainst}</td><td>Diff ${spDiff >= 0 ? '+' : ''}${spDiff}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Saisonanalyse</h2>
        <table><thead><tr><th>Saison</th><th>Spiele</th><th>Abgeschlossen</th><th>W/D/L</th><th>Kegel</th><th>Ø Team</th><th>Bestes</th><th>MP</th><th>SP</th></tr></thead><tbody>${seasonRows}</tbody></table>
      </div>
      <div class="card">
        <h2>Liga-Verteilung</h2>
        <table><thead><tr><th>Liga</th><th>Anzahl Spiele</th></tr></thead><tbody>${leagueRows}</tbody></table>
      </div>
      <div class="card">
        <h2>Top-Spieler (nach Schnitt)</h2>
        <table><thead><tr><th>Name</th><th>Spiele</th><th>Ø</th><th>Bestes</th><th>Total Kegel</th><th>MP</th><th>SP</th></tr></thead><tbody>${topPlayersHtml}</tbody></table>
      </div>
      <div class="card">
        <h2>Top-Bestwerte (Einzelergebnis)</h2>
        <table><thead><tr><th>Name</th><th>Bestes</th><th>Ø</th></tr></thead><tbody>${bestPlayersByBestGame}</tbody></table>
      </div>
      <div class="card">
        <h2>Letzte erkannte Spiele</h2>
        <table><thead><tr><th>Saison</th><th>Liga</th><th>Spieltag</th><th>Datum</th><th>Heim</th><th>Auswärts</th><th>Ergebnis</th></tr></thead><tbody>${recentGamesRows}</tbody></table>
      </div>
      `
    );
  };

  const exportTeamPngReport = () => {
    if (!overview) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff7f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7f1d1d';
    ctx.font = '700 52px Arial';
    ctx.fillText(`Team-Report: ${overview.clubName}`, 60, 80);
    ctx.fillStyle = '#7a4a53';
    ctx.font = '400 24px Arial';
    ctx.fillText(`Erstellt: ${new Date().toLocaleString('de-DE')}`, 60, 118);

    drawMetricBox(ctx, 60, 150, 400, 120, 'Spiele', String(overview.team.totalGames));
    drawMetricBox(ctx, 490, 150, 400, 120, 'Schnitt', overview.team.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 }));
    drawMetricBox(ctx, 920, 150, 400, 120, 'Bestes', String(overview.team.bestTeamScore));
    drawMetricBox(
      ctx,
      1350,
      150,
      390,
      120,
      'W / D / L',
      `${overview.team.wins} / ${overview.team.draws} / ${overview.team.losses}`
    );

    ctx.fillStyle = '#7f1d1d';
    ctx.font = '700 30px Arial';
    ctx.fillText('Saisondaten', 60, 330);

    const tableX = 60;
    const tableY = 360;
    const colWidths = [160, 120, 180, 220, 180, 180, 180];
    const headers = ['Saison', 'Spiele', 'W/D/L', 'Kegel', 'Ø Team', 'MP', 'SP'];
    const headerHeight = 42;
    const rowHeight = 36;

    let x = tableX;
    ctx.fillStyle = '#ffe4e6';
    ctx.fillRect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), headerHeight);
    ctx.fillStyle = '#3a171d';
    ctx.font = '700 18px Arial';
    headers.forEach((h, i) => {
      ctx.fillText(h, x + 8, tableY + 28);
      x += colWidths[i];
    });

    const rows = overview.seasons.slice().sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel)).slice(0, 16);
    rows.forEach((season, idx) => {
      const y = tableY + headerHeight + idx * rowHeight;
      ctx.fillStyle = idx % 2 === 0 ? '#fffafb' : '#fff';
      ctx.fillRect(tableX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight);
      ctx.fillStyle = '#3a171d';
      ctx.font = '500 16px Arial';
      const vals = [
        season.seasonLabel,
        String(season.games),
        `${season.wins}/${season.draws}/${season.losses}`,
        `${season.pointsFor}:${season.pointsAgainst}`,
        season.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
        `${season.matchPointsFor}:${season.matchPointsAgainst}`,
        `${season.setPointsFor}:${season.setPointsAgainst}`,
      ];
      let cx = tableX;
      vals.forEach((val, i) => {
        ctx.fillText(val, cx + 8, y + 24);
        cx += colWidths[i];
      });
    });

    downloadCanvas(canvas, `${overview.clubName.replace(/\s+/g, '-').toLowerCase()}-team-report.png`);
  };

  const exportSeasonsCsv = () => {
    if (!overview) return;
    const rows = overview.seasons
      .slice()
      .sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel))
      .map((season) => [
        season.seasonLabel,
        season.games,
        season.completedGames,
        season.wins,
        season.draws,
        season.losses,
        season.pointsFor,
        season.pointsAgainst,
        season.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
        season.bestTeamScore,
        season.matchPointsFor,
        season.matchPointsAgainst,
        season.setPointsFor,
        season.setPointsAgainst,
      ]);
    downloadCsv('saisondaten.csv', ['Saison', 'Spiele', 'Abgeschlossen', 'Siege', 'Remis', 'Niederlagen', 'Kegel For', 'Kegel Against', 'Schnitt', 'Bestes', 'MP For', 'MP Against', 'SP For', 'SP Against'], rows);
  };

  const exportPlayersCsv = () => {
    if (!overview) return;
    const rows = overview.players.map((player) => [
      player.name,
      player.games,
      formatAverage(player.totalKegel, player.games),
      player.statGames > 0 ? (player.totalVolle / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-',
      player.statGames > 0 ? (player.totalAbr / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-',
      player.statGames > 0 ? (player.totalFehl / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-',
      player.bestKegel,
      player.totalKegel,
      player.totalMp,
      player.totalSp,
    ]);
    downloadCsv('spieler.csv', ['Name', 'Spiele', 'Schnitt', 'Ø Volle', 'Ø Abr.', 'Ø Fehl', 'Bestes', 'Total Kegel', 'Total MP', 'Total SP'], rows);
  };

  const exportHistoricGamesCsv = () => {
    if (!overview) return;
    const rows = filteredHistoricGames.map((entry) => [
      entry.seasonLabel,
      entry.leagueName,
      entry.game.spieltag || '',
      entry.game.date_time || '',
      entry.isHome ? 'Heim' : 'Auswärts',
      entry.game.team_home || '',
      entry.game.team_away || '',
      entry.game.result || '',
      isLostGame(entry) ? 'Niederlage' : 'Kein Loss',
    ]);
    downloadCsv('historische_spiele.csv', ['Saison', 'Liga', 'Spieltag', 'Datum', 'Ort', 'Heim', 'Auswärts', 'Ergebnis', 'Status'], rows);
  };

  const exportSelectedPlayerGamesCsv = () => {
    if (!selectedPlayer) return;
    const rows = selectedPlayer.gameStats.map((game) => [
      game.seasonLabel,
      game.dateTime || '',
      game.leagueName || '',
      game.spieltag || '',
      game.isHome ? 'Heim' : 'Auswärts',
      game.opponent || '',
      game.kegel,
      game.volle,
      game.abraeumen,
      game.fehl,
      game.mp,
      game.sp,
      game.result || '',
    ]);
    downloadCsv(
      `${selectedPlayer.name.replace(/\s+/g, '_').toLowerCase()}_spiele.csv`,
      ['Saison', 'Datum', 'Liga', 'Spieltag', 'Ort', 'Gegner', 'Kegel', 'Volle', 'Abr.', 'Fehl', 'MP', 'SP', 'Ergebnis'],
      rows
    );
  };

  const exportPlayerPdfReport = () => {
    if (!selectedPlayer || !selectedPlayerPerformance) return;
    const seasonRows = selectedPlayer.seasons
      .map(
        (season) =>
          `<tr><td>${escapeHtml(season.seasonLabel)}</td><td>${season.games}</td><td>${formatAverage(season.totalKegel, season.games)}</td><td>${season.statGames > 0 ? (season.totalVolle / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}</td><td>${season.statGames > 0 ? (season.totalAbr / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}</td><td>${season.statGames > 0 ? (season.totalFehl / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}</td><td>${season.bestKegel}</td><td>${season.totalMp}</td><td>${season.totalSp}</td></tr>`
      )
      .join('');

    const recentGames = selectedPlayer.gameStats
      .slice(0, 30)
      .map(
        (game) =>
          `<tr><td>${escapeHtml(game.seasonLabel)}</td><td>${escapeHtml(game.dateTime || '-')}</td><td>${escapeHtml(game.leagueName || '-')}</td><td>${escapeHtml(game.opponent || '-')}</td><td>${game.isHome ? 'Heim' : 'Auswärts'}</td><td>${game.kegel}</td><td>${game.volle}</td><td>${game.abraeumen}</td><td>${game.fehl}</td><td>${game.mp}</td><td>${game.sp}</td><td>${escapeHtml(game.result || '-')}</td></tr>`
      )
      .join('');

    const homeTopRows = selectedPlayerPerformance.homeTopGames
      .map(
        (game) =>
          `<tr><td>${escapeHtml(game.seasonLabel)}</td><td>${escapeHtml(game.dateTime || '-')}</td><td>${escapeHtml(game.opponent || '-')}</td><td>${game.kegel}</td><td>${game.volle}</td><td>${game.abraeumen}</td><td>${game.fehl}</td><td>${game.mp}</td><td>${game.sp}</td></tr>`
      )
      .join('');

    const awayTopRows = selectedPlayerPerformance.awayTopGames
      .map(
        (game) =>
          `<tr><td>${escapeHtml(game.seasonLabel)}</td><td>${escapeHtml(game.dateTime || '-')}</td><td>${escapeHtml(game.opponent || '-')}</td><td>${game.kegel}</td><td>${game.volle}</td><td>${game.abraeumen}</td><td>${game.fehl}</td><td>${game.mp}</td><td>${game.sp}</td></tr>`
      )
      .join('');

    const imageSrc = playerImageDataUrl || playerImageUrl.trim();
    const imageHtml = imageSrc
      ? `<img src="${escapeHtml(imageSrc)}" alt="Player image" />`
      : `<span style="color:#7a4a53;font-size:14px">Bild hier einfügen (URL im Feld auf der Seite setzen)</span>`;

    openReportWindow(
      `${selectedPlayer.name} Spielerreport`,
      `
      <div class="card">
        <h1>Spieler-Report: ${escapeHtml(selectedPlayer.name)}</h1>
        <div class="meta">Erstellt: ${new Date().toLocaleString('de-DE')}</div>
      </div>
      <div class="card two-col">
        <div>
          <h2>Bild</h2>
          <div class="img-box">${imageHtml}</div>
        </div>
        <div>
          <h2>Details</h2>
          <div class="metric-grid">
            <div class="metric-box"><div class="metric-label">Spiele</div><div class="metric-value">${selectedPlayer.games}</div></div>
            <div class="metric-box"><div class="metric-label">Schnitt</div><div class="metric-value">${formatAverage(selectedPlayer.totalKegel, selectedPlayer.games)}</div></div>
            <div class="metric-box"><div class="metric-label">Bestes</div><div class="metric-value">${selectedPlayer.bestKegel}</div></div>
            <div class="metric-box"><div class="metric-label">MP / SP</div><div class="metric-value">${selectedPlayer.totalMp} / ${selectedPlayer.totalSp}</div></div>
            <div class="metric-box"><div class="metric-label">Heim-Ø</div><div class="metric-value">${selectedPlayerPerformance.homeAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
            <div class="metric-box"><div class="metric-label">Auswärts-Ø</div><div class="metric-value">${selectedPlayerPerformance.awayAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
            <div class="metric-box"><div class="metric-label">Ø Volle / Abr.</div><div class="metric-value">${selectedPlayerPerformance.volleAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${selectedPlayerPerformance.abrAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
            <div class="metric-box"><div class="metric-label">Ø Fehlwürfe</div><div class="metric-value">${selectedPlayerPerformance.fehlAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
            <div class="metric-box"><div class="metric-label">Form (5)</div><div class="metric-value">${selectedPlayerPerformance.recentFormAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
            <div class="metric-box"><div class="metric-label">Std.-Abw.</div><div class="metric-value">${selectedPlayerPerformance.overallStdDev.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div></div>
          </div>
        </div>
      </div>
      <div class="card">
        <h2>Saison-Aufschlüsselung</h2>
        <table><thead><tr><th>Saison</th><th>Spiele</th><th>Ø</th><th>Ø Volle</th><th>Ø Abr.</th><th>Ø Fehl</th><th>Bestes</th><th>MP</th><th>SP</th></tr></thead><tbody>${seasonRows}</tbody></table>
      </div>
      <div class="card">
        <h2>Letzte Spiele</h2>
        <table><thead><tr><th>Saison</th><th>Datum</th><th>Liga</th><th>Gegner</th><th>Ort</th><th>Kegel</th><th>Volle</th><th>Abr.</th><th>Fehl</th><th>MP</th><th>SP</th><th>Ergebnis</th></tr></thead><tbody>${recentGames}</tbody></table>
      </div>
      <div class="card">
        <h2>Top Heimleistungen</h2>
        <table><thead><tr><th>Saison</th><th>Datum</th><th>Gegner</th><th>Kegel</th><th>Volle</th><th>Abr.</th><th>Fehl</th><th>MP</th><th>SP</th></tr></thead><tbody>${homeTopRows || '<tr><td colspan="9">Keine Heimspiele</td></tr>'}</tbody></table>
      </div>
      <div class="card">
        <h2>Top Auswärtsleistungen</h2>
        <table><thead><tr><th>Saison</th><th>Datum</th><th>Gegner</th><th>Kegel</th><th>Volle</th><th>Abr.</th><th>Fehl</th><th>MP</th><th>SP</th></tr></thead><tbody>${awayTopRows || '<tr><td colspan="9">Keine Auswärtsspiele</td></tr>'}</tbody></table>
      </div>
      `
    );
  };

  const exportPlayerPngReport = async () => {
    if (!selectedPlayer || !selectedPlayerPerformance) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff7f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7f1d1d';
    ctx.font = '700 50px Arial';
    ctx.fillText(`Spieler-Report: ${selectedPlayer.name}`, 60, 84);
    ctx.fillStyle = '#7a4a53';
    ctx.font = '400 22px Arial';
    ctx.fillText(`Erstellt: ${new Date().toLocaleString('de-DE')}`, 60, 118);

    const imageX = 60;
    const imageY = 160;
    const imageW = 760;
    const imageH = 620;
    roundedRectPath(ctx, imageX, imageY, imageW, imageH, 18);
    ctx.fillStyle = '#fff1f3';
    ctx.fill();
    ctx.strokeStyle = '#f1d6da';
    ctx.stroke();

    const imageSrc = playerImageDataUrl || playerImageUrl.trim();
    if (imageSrc) {
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = imageSrc;
        });
        ctx.drawImage(img, imageX + 12, imageY + 12, imageW - 24, imageH - 24);
      } catch {
        ctx.fillStyle = '#7a4a53';
        ctx.font = '500 24px Arial';
        ctx.fillText('Bild konnte nicht geladen werden.', imageX + 24, imageY + 56);
      }
    } else {
      ctx.fillStyle = '#7a4a53';
      ctx.font = '500 24px Arial';
      ctx.fillText('Kein Bild gesetzt.', imageX + 24, imageY + 56);
    }

    const rightX = 860;
    drawMetricBox(ctx, rightX, 160, 400, 120, 'Spiele', String(selectedPlayer.games));
    drawMetricBox(ctx, rightX + 430, 160, 400, 120, 'Schnitt', formatAverage(selectedPlayer.totalKegel, selectedPlayer.games));
    drawMetricBox(ctx, rightX, 300, 400, 120, 'Bestes', String(selectedPlayer.bestKegel));
    drawMetricBox(ctx, rightX + 430, 300, 400, 120, 'MP / SP', `${selectedPlayer.totalMp} / ${selectedPlayer.totalSp}`);
    drawMetricBox(ctx, rightX, 440, 400, 120, 'Heim-Ø', selectedPlayerPerformance.homeAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 }));
    drawMetricBox(ctx, rightX + 430, 440, 400, 120, 'Auswärts-Ø', selectedPlayerPerformance.awayAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 }));
    drawMetricBox(ctx, rightX, 580, 400, 120, 'Form (5)', selectedPlayerPerformance.recentFormAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 }));
    drawMetricBox(ctx, rightX + 430, 580, 400, 120, 'Std.-Abw.', selectedPlayerPerformance.overallStdDev.toLocaleString('de-DE', { maximumFractionDigits: 2 }));

    ctx.fillStyle = '#7f1d1d';
    ctx.font = '700 28px Arial';
    ctx.fillText('Letzte Spiele', 60, 840);
    const games = selectedPlayer.gameStats.slice(0, 8);
    games.forEach((game, index) => {
      const y = 875 + index * 46;
      ctx.fillStyle = index % 2 === 0 ? '#fffafb' : '#fff';
      ctx.fillRect(60, y - 26, 1680, 40);
      ctx.fillStyle = '#3a171d';
      ctx.font = '500 17px Arial';
      ctx.fillText(`${game.seasonLabel} | ${game.dateTime || '-'} | ${game.leagueName || '-'}`, 70, y);
      ctx.fillText(`${game.isHome ? 'Heim' : 'Auswärts'} vs ${game.opponent || '-'} | Kegel ${game.kegel} | MP ${game.mp} | SP ${game.sp}`, 760, y);
    });

    downloadCanvas(canvas, `${selectedPlayer.name.replace(/\s+/g, '-').toLowerCase()}-player-report.png`);
  };

  const handlePlayerImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      window.alert('Bitte ein PNG, JPG oder WEBP Bild waehlen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPlayerImageDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const isLostGame = (entry: HistoricGameRow): boolean => {
    const score = parseScore(entry.game.result);
    if (!score) return false;
    const own = entry.isHome ? score.home : score.away;
    const opp = entry.isHome ? score.away : score.home;
    return own < opp;
  };

  const filteredHistoricGames = useMemo(() => {
    if (!overview) return [] as HistoricGameRow[];
    const filtered = overview.games.filter((entry) => {
      if (historicVenueFilter === 'home') return entry.isHome;
      if (historicVenueFilter === 'away') return !entry.isHome;
      return true;
    });
    return filtered.sort((a, b) => {
      const seasonDelta = toSeasonNumber(a.seasonLabel) - toSeasonNumber(b.seasonLabel);
      const dateDelta = parseDateToTime(a.game.date_time) - parseDateToTime(b.game.date_time);
      const cmp = seasonDelta !== 0 ? seasonDelta : dateDelta;
      return historicSort === 'newest' ? -cmp : cmp;
    });
  }, [historicSort, historicVenueFilter, overview]);

  const fetchHistoricGameDetails = async (entry: HistoricGameRow) => {
    const key = `${entry.seasonId}:${entry.game.game_id}`;
    if (historicGameDetails[key] || historicDetailsLoading[key] || !entry.game.game_id) return;
    setHistoricDetailsLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const rows = (await retryAsync(() => apiService.getSpielerInfo(entry.seasonId, entry.game.game_id, 1), 3)) as GameDetailRow[];
      setHistoricGameDetails((prev) => ({ ...prev, [key]: rows }));
    } catch (error) {
      console.warn('Failed to load historic game details', error);
    } finally {
      setHistoricDetailsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleHistoricGameDetails = async (entry: HistoricGameRow) => {
    const key = `${entry.seasonId}:${entry.game.game_id}`;
    const next = openHistoricGameKey === key ? null : key;
    setOpenHistoricGameKey(next);
    if (next) {
      await fetchHistoricGameDetails(entry);
    }
  };

  const renderHistoricGameDetailsTable = (rows: GameDetailRow[]) => {
    if (!rows || rows.length === 0) return <p className="text-sm text-muted-foreground">Keine Detaildaten vorhanden.</p>;
    return (
      <div className="overflow-x-auto rounded-lg border border-border bg-card/70">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/70">
            <tr>
              <th className="px-2 py-2 text-left">Spieler</th>
              <th className="px-2 py-2 text-center">1</th>
              <th className="px-2 py-2 text-center">2</th>
              <th className="px-2 py-2 text-center">3</th>
              <th className="px-2 py-2 text-center">4</th>
              <th className="px-2 py-2 text-center">Kegel</th>
              <th className="px-2 py-2 text-center">SP</th>
              <th className="px-2 py-2 text-center">MP</th>
              <th className="px-2 py-2 text-center">MP</th>
              <th className="px-2 py-2 text-center">SP</th>
              <th className="px-2 py-2 text-center">Kegel</th>
              <th className="px-2 py-2 text-center">4</th>
              <th className="px-2 py-2 text-center">3</th>
              <th className="px-2 py-2 text-center">2</th>
              <th className="px-2 py-2 text-center">1</th>
              <th className="px-2 py-2 text-left">Spieler</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isNoteRow = row.length > 16 || (row?.[0] && row.slice(1).every((value) => value === '' || value === undefined));
              const isTotalsRow = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];
              if (isNoteRow) {
                return (
                  <tr key={`note-${idx}`}>
                    <td colSpan={16} className="px-2 py-2 text-muted-foreground">
                      {String(row[0] ?? '')}
                    </td>
                  </tr>
                );
              }
              if (isTotalsRow) {
                return (
                  <tr key={`totals-${idx}`} className="border-t border-border bg-rose-100/50 font-semibold text-rose-900">
                    <td className="px-2 py-2 text-left">Gesamt</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">{String(row[5] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">{String(row[6] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">{String(row[7] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">{String(row[8] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">{String(row[9] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">{String(row[10] ?? '-')}</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-center">-</td>
                    <td className="px-2 py-2 text-left">Gesamt</td>
                  </tr>
                );
              }
              return (
                <tr key={`detail-${idx}`} className="border-t border-border">
                  {Array.from({ length: 16 }).map((_, col) => (
                    <td key={`c-${idx}-${col}`} className={`px-2 py-2 ${col === 0 || col === 15 ? 'text-left' : 'text-center'}`}>
                      {String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Vereins-Historie</h1>
          <p className="text-muted-foreground">
            Gib einen Vereinsnamen ein und lade historische Saisons, Ligen, Spiele, Teammetriken und Spielerleistungen.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Vereinsname (z. B. SV 1920 Tauer)"
              className="min-w-[22rem] flex-1 rounded-md border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={runHistoricOverview}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Historie laden
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner label="Historische Daten über Saisons und Ligen werden geladen..." className="py-8" />}

        {error && <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>}

        {!loading && overview && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">{overview.clubName}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportTeamPdfReport}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Team-PDF-Report
                  </button>
                  <button
                    type="button"
                    onClick={exportTeamPngReport}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Team-PNG-Report
                  </button>
                  <button
                    type="button"
                    onClick={exportSeasonsCsv}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    CSV: Saisondaten
                  </button>
                  <button
                    type="button"
                    onClick={exportPlayersCsv}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    CSV: Spieler
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Gesucht: {overview.searchedClub} | Geprüfte Saisons: {overview.totalSeasons} (max. letzte 20) | Geprüfte Ligen: {overview.totalLeaguesChecked}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Spiele</div>
                  <div className="text-lg font-semibold">{overview.team.totalGames}</div>
                  <div className="text-xs text-muted-foreground">Abgeschlossen: {overview.team.completedGames}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">W / D / L</div>
                  <div className="text-lg font-semibold">
                    {overview.team.wins} / {overview.team.draws} / {overview.team.losses}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Heimsiege: {overview.team.homeWins} | Auswärtssiege: {overview.team.awayWins}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Team-Kegel</div>
                  <div className="text-lg font-semibold">
                    {overview.team.pointsFor} : {overview.team.pointsAgainst}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Team-Holz/Kegel-Schnitt: {overview.team.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Bestes Team-Ergebnis</div>
                  <div className="text-lg font-semibold">{overview.team.bestTeamScore}</div>
                  <div className="text-xs text-muted-foreground">
                    MP: {overview.team.matchPointsFor} : {overview.team.matchPointsAgainst} | SP: {overview.team.setPointsFor} : {overview.team.setPointsAgainst}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">Saisonentwicklung und Kennzahlen</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSeasonViewTab('recap')}
                    className={`rounded-md border px-3 py-1.5 text-sm ${seasonViewTab === 'recap' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
                  >
                    Saison-Recap
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeasonViewTab('compare')}
                    className={`rounded-md border px-3 py-1.5 text-sm ${seasonViewTab === 'compare' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}
                  >
                    Saison-Vergleich
                  </button>
                </div>
              </div>

              {seasonViewTab === 'recap' && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col max-w-xs">
                    <label className="mb-1 text-xs text-muted-foreground" htmlFor="recapSeason">Saison</label>
                    <select
                      id="recapSeason"
                      value={recapSeasonLabel}
                      onChange={(event) => setRecapSeasonLabel(event.target.value)}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      {seasonOptions.map((season) => (
                        <option key={season} value={season}>
                          {season}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">Spiele</div>
                      <div className="text-lg font-semibold">{recapSeason?.games ?? '-'}</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">W / D / L</div>
                      <div className="text-lg font-semibold">
                        {recapSeason ? `${recapSeason.wins} / ${recapSeason.draws} / ${recapSeason.losses}` : '-'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">Ø Team-Holz/Kegel</div>
                      <div className="text-lg font-semibold">
                        {recapSeason ? recapSeason.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">MP / SP</div>
                      <div className="text-lg font-semibold">
                        {recapSeason ? `${recapSeason.matchPointsFor}:${recapSeason.matchPointsAgainst} / ${recapSeason.setPointsFor}:${recapSeason.setPointsAgainst}` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {seasonViewTab === 'compare' && (
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Vergleich</div>
                    <div className="text-lg font-semibold">
                      {comparisonPair ? `${comparisonPair.current.seasonLabel} vs ${comparisonPair.previous.seasonLabel}` : '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Δ Ø Team-Holz/Kegel</div>
                    <div className="text-lg font-semibold">
                      {comparisonPair
                        ? (comparisonPair.current.avgTeamScore - comparisonPair.previous.avgTeamScore).toLocaleString('de-DE', { maximumFractionDigits: 2 })
                        : '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Δ Winrate</div>
                    <div className="text-lg font-semibold">
                      {comparisonPair
                        ? `${(
                            (comparisonPair.current.wins / Math.max(comparisonPair.current.completedGames, 1) -
                              comparisonPair.previous.wins / Math.max(comparisonPair.previous.completedGames, 1)) *
                            100
                          ).toLocaleString('de-DE', { maximumFractionDigits: 2 })}%`
                        : '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Δ MP-Diff</div>
                    <div className="text-lg font-semibold">
                      {comparisonPair
                        ? String(
                            comparisonPair.current.matchPointsFor -
                              comparisonPair.current.matchPointsAgainst -
                              (comparisonPair.previous.matchPointsFor - comparisonPair.previous.matchPointsAgainst)
                          )
                        : '-'}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold text-foreground">Analyse-Tools</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Textbasierte Analyse statt Diagrammen: Filter setzen und Effizienz/Qualität direkt vergleichen.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs text-muted-foreground" htmlFor="minGamesFilter">Min. Spiele</label>
                  <input
                    id="minGamesFilter"
                    type="number"
                    min={1}
                    value={minGamesFilter}
                    onChange={(event) => setMinGamesFilter(Math.max(1, Number(event.target.value) || 1))}
                    className="w-36 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs text-muted-foreground" htmlFor="seasonFilter">Saisonfilter</label>
                  <select
                    id="seasonFilter"
                    value={seasonFilter}
                    onChange={(event) => setSeasonFilter(event.target.value)}
                    className="w-52 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Alle Saisons</option>
                    {seasonOptions.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Gefilterte Spieler</div>
                  <div className="text-lg font-semibold">{filteredPlayers.length}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Team Winrate {seasonFilter ? `(Saison ${seasonFilter})` : 'gesamt'}</div>
                  <div className="text-lg font-semibold">
                    {teamMetricsForActiveFilter && teamMetricsForActiveFilter.completedGames > 0
                      ? `${((teamMetricsForActiveFilter.wins / teamMetricsForActiveFilter.completedGames) * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })}%`
                      : '-'}
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Top MP/Effizienz</th>
                      <th className="px-3 py-2 text-center">Spiele</th>
                      <th className="px-3 py-2 text-center">MP/Spiel</th>
                      <th className="px-3 py-2 text-center">Schnitt</th>
                      <th className="px-3 py-2 text-center">Bestes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMpEfficiencyPlayers.map((player) => (
                      <tr key={`eff-${player.name}`} className="border-t border-border">
                        <td className="px-3 py-2">{player.name}</td>
                        <td className="px-3 py-2 text-center">{player.games}</td>
                        <td className="px-3 py-2 text-center">{player.mpPerGame.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-center">{formatAverage(player.totalKegel, player.games)}</td>
                        <td className="px-3 py-2 text-center">{player.bestKegel}</td>
                      </tr>
                    ))}
                    {topMpEfficiencyPlayers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">
                          Keine Spieler für die aktuellen Analysefilter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold text-foreground">Saisondaten-Tabelle</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Saison</th>
                      <th className="px-3 py-2 text-center">Spiele</th>
                      <th className="px-3 py-2 text-center">W/D/L</th>
                      <th className="px-3 py-2 text-center">Kegel (For:Against)</th>
                      <th className="px-3 py-2 text-center">Ø Team-Holz/Kegel</th>
                      <th className="px-3 py-2 text-center">Bestes</th>
                      <th className="px-3 py-2 text-center">MP (For:Against)</th>
                      <th className="px-3 py-2 text-center">SP (For:Against)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.seasons
                      .slice()
                      .sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel))
                      .map((season) => (
                        <tr key={season.seasonId} className="border-t border-border">
                          <td className="px-3 py-2">{season.seasonLabel}</td>
                          <td className="px-3 py-2 text-center">{season.games}</td>
                          <td className="px-3 py-2 text-center">
                            {season.wins}/{season.draws}/{season.losses}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {season.pointsFor}:{season.pointsAgainst}
                          </td>
                          <td className="px-3 py-2 text-center">{season.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center">{season.bestTeamScore}</td>
                          <td className="px-3 py-2 text-center">
                            {season.matchPointsFor}:{season.matchPointsAgainst}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {season.setPointsFor}:{season.setPointsAgainst}
                          </td>
                        </tr>
                      ))}
                    {overview.seasons.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          Keine aggregierten Saisondaten für diesen Verein gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold text-foreground">Spieler-Metriken (Top 20 nach Schnitt)</h2>
              <p className="mt-1 text-xs text-muted-foreground">Klicke auf eine Spielerzeile für Details pro Saison und Spiel.</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Spieler</th>
                      <th className="px-3 py-2 text-center">Spiele</th>
                      <th className="px-3 py-2 text-center">Schnitt</th>
                      <th className="px-3 py-2 text-center">Ø Volle</th>
                      <th className="px-3 py-2 text-center">Ø Abr.</th>
                      <th className="px-3 py-2 text-center">Ø Fehl</th>
                      <th className="px-3 py-2 text-center">Bestes</th>
                      <th className="px-3 py-2 text-center">Total Kegel</th>
                      <th className="px-3 py-2 text-center">Total MP</th>
                      <th className="px-3 py-2 text-center">Total SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPlayers.map((player) => {
                      const isOpen = selectedPlayerName === player.name;
                      const playerAvg = player.games > 0 ? player.totalKegel / player.games : 0;
                      const maxSeasonAvg = player.seasons.length
                        ? Math.max(...player.seasons.map((season) => (season.games > 0 ? season.totalKegel / season.games : 0)))
                        : 0;
                      const maxSeasonBest = player.seasons.length ? Math.max(...player.seasons.map((season) => season.bestKegel)) : 0;
                      const maxSeasonMp = player.seasons.length ? Math.max(...player.seasons.map((season) => season.totalMp)) : 0;
                      const maxSeasonSp = player.seasons.length ? Math.max(...player.seasons.map((season) => season.totalSp)) : 0;
                      const maxSeasonVolle = player.seasons.length ? Math.max(...player.seasons.map((season) => (season.statGames > 0 ? season.totalVolle / season.statGames : 0))) : 0;
                      const maxSeasonAbr = player.seasons.length ? Math.max(...player.seasons.map((season) => (season.statGames > 0 ? season.totalAbr / season.statGames : 0))) : 0;
                      const minSeasonFehl = player.seasons.length ? Math.min(...player.seasons.filter((season) => season.statGames > 0).map((season) => season.totalFehl / season.statGames)) : Number.POSITIVE_INFINITY;
                      const maxGameKegel = player.gameStats.length ? Math.max(...player.gameStats.map((game) => game.kegel)) : 0;
                      const maxGameMp = player.gameStats.length ? Math.max(...player.gameStats.map((game) => game.mp)) : 0;
                      const maxGameSp = player.gameStats.length ? Math.max(...player.gameStats.map((game) => game.sp)) : 0;
                      const maxGameVolle = player.gameStats.length ? Math.max(...player.gameStats.map((game) => game.volle)) : 0;
                      const maxGameAbr = player.gameStats.length ? Math.max(...player.gameStats.map((game) => game.abraeumen)) : 0;
                      const minGameFehl = player.gameStats.length ? Math.min(...player.gameStats.map((game) => game.fehl)) : Number.POSITIVE_INFINITY;
                      const avgVolle = player.statGames > 0 ? player.totalVolle / player.statGames : 0;
                      const avgAbr = player.statGames > 0 ? player.totalAbr / player.statGames : 0;
                      const avgFehl = player.statGames > 0 ? player.totalFehl / player.statGames : 0;
                      return (
                        <Fragment key={player.name}>
                          <tr
                            className="cursor-pointer border-t border-border hover:bg-accent/40"
                            onClick={() => setSelectedPlayerName((current) => (current === player.name ? null : player.name))}
                          >
                            <td className="px-3 py-2">{player.name}</td>
                            <td className="px-3 py-2 text-center">{player.games}</td>
                            <td
                              className={`px-3 py-2 text-center ${
                                playerAvg === topPlayerStats.bestAvg ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {formatAverage(player.totalKegel, player.games)}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                avgVolle === topPlayerStats.bestVolle ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.statGames > 0 ? avgVolle.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                avgAbr === topPlayerStats.bestAbr ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.statGames > 0 ? avgAbr.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                player.statGames > 0 && avgFehl === topPlayerStats.bestFehl ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.statGames > 0 ? avgFehl.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                player.bestKegel === topPlayerStats.bestSingle ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.bestKegel}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                player.totalKegel === topPlayerStats.bestTotalKegel ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.totalKegel}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                player.totalMp === topPlayerStats.bestMp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.totalMp.toLocaleString('de-DE')}
                            </td>
                            <td
                              className={`px-3 py-2 text-center ${
                                player.totalSp === topPlayerStats.bestSp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                              }`}
                            >
                              {player.totalSp.toLocaleString('de-DE')}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-border bg-muted/20">
                              <td colSpan={10} className="px-3 py-4">
                                <div className="space-y-4">
                                  <div className="grid gap-3 md:grid-cols-4">
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Spiele</div>
                                      <div className="text-lg font-semibold">{player.games}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Schnitt</div>
                                      <div className="text-lg font-semibold">{formatAverage(player.totalKegel, player.games)}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Bestes</div>
                                      <div className="text-lg font-semibold">{player.bestKegel}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">MP / SP</div>
                                      <div className="text-lg font-semibold">
                                        {player.totalMp.toLocaleString('de-DE')} / {player.totalSp.toLocaleString('de-DE')}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Ø Volle / Abr.</div>
                                      <div className="text-lg font-semibold">
                                        {player.statGames > 0
                                          ? `${(player.totalVolle / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${(player.totalAbr / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 })}`
                                          : '-'}
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3">
                                      <div className="text-xs text-muted-foreground">Ø Fehlwürfe</div>
                                      <div className="text-lg font-semibold">
                                        {player.statGames > 0 ? (player.totalFehl / player.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="text-sm font-semibold text-foreground">Saison-Aufschlüsselung</h3>
                                    <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                                      <table className="min-w-full text-xs">
                                        <thead className="bg-muted/70">
                                          <tr>
                                            <th className="px-2 py-2 text-left">Saison</th>
                                            <th className="px-2 py-2 text-center">Spiele</th>
                                            <th className="px-2 py-2 text-center">Schnitt</th>
                                            <th className="px-2 py-2 text-center">Ø Volle</th>
                                            <th className="px-2 py-2 text-center">Ø Abr.</th>
                                            <th className="px-2 py-2 text-center">Ø Fehl</th>
                                            <th className="px-2 py-2 text-center">Bestes</th>
                                            <th className="px-2 py-2 text-center">Total MP</th>
                                            <th className="px-2 py-2 text-center">Total SP</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {player.seasons.map((season) => (
                                            <tr key={`${player.name}-${season.seasonId}`} className="border-t border-border">
                                              <td className="px-2 py-2">{season.seasonLabel}</td>
                                              <td className="px-2 py-2 text-center">{season.games}</td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  (season.games > 0 ? season.totalKegel / season.games : 0) === maxSeasonAvg
                                                    ? 'bg-rose-100 font-semibold text-rose-900'
                                                    : ''
                                                }`}
                                              >
                                                {formatAverage(season.totalKegel, season.games)}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.statGames > 0 && season.totalVolle / season.statGames === maxSeasonVolle ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.statGames > 0 ? (season.totalVolle / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.statGames > 0 && season.totalAbr / season.statGames === maxSeasonAbr ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.statGames > 0 ? (season.totalAbr / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.statGames > 0 && season.totalFehl / season.statGames === minSeasonFehl ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.statGames > 0 ? (season.totalFehl / season.statGames).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.bestKegel === maxSeasonBest ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.bestKegel}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.totalMp === maxSeasonMp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.totalMp}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  season.totalSp === maxSeasonSp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {season.totalSp}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="text-sm font-semibold text-foreground">Spiel-Detailzeilen</h3>
                                    <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border">
                                      <table className="min-w-full text-xs">
                                        <thead className="bg-muted/70">
                                          <tr>
                                            <th className="px-2 py-2 text-left">Saison</th>
                                            <th className="px-2 py-2 text-left">Datum</th>
                                            <th className="px-2 py-2 text-left">Liga</th>
                                            <th className="px-2 py-2 text-left">Spieltag</th>
                                            <th className="px-2 py-2 text-left">Ort</th>
                                            <th className="px-2 py-2 text-left">Gegner</th>
                                            <th className="px-2 py-2 text-center">Kegel</th>
                                            <th className="px-2 py-2 text-center">Volle</th>
                                            <th className="px-2 py-2 text-center">Abr.</th>
                                            <th className="px-2 py-2 text-center">Fehl</th>
                                            <th className="px-2 py-2 text-center">MP</th>
                                            <th className="px-2 py-2 text-center">SP</th>
                                            <th className="px-2 py-2 text-left">Ergebnis</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {player.gameStats.slice(0, 60).map((game, index) => (
                                            <tr key={`${player.name}-game-${index}`} className="border-t border-border">
                                              <td className="px-2 py-2">{game.seasonLabel}</td>
                                              <td className="px-2 py-2">{game.dateTime || '-'}</td>
                                              <td className="px-2 py-2">{game.leagueName || '-'}</td>
                                              <td className="px-2 py-2">{game.spieltag || '-'}</td>
                                              <td className="px-2 py-2">{game.isHome ? 'Heim' : 'Auswärts'}</td>
                                              <td className="px-2 py-2">{game.opponent || '-'}</td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.kegel === maxGameKegel ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.kegel}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.volle === maxGameVolle ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.volle.toLocaleString('de-DE')}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.abraeumen === maxGameAbr ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.abraeumen.toLocaleString('de-DE')}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.fehl === minGameFehl ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.fehl.toLocaleString('de-DE')}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.mp === maxGameMp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.mp.toLocaleString('de-DE')}
                                              </td>
                                              <td
                                                className={`px-2 py-2 text-center ${
                                                  game.sp === maxGameSp ? 'bg-rose-100 font-semibold text-rose-900' : ''
                                                }`}
                                              >
                                                {game.sp.toLocaleString('de-DE')}
                                              </td>
                                              <td className="px-2 py-2">{game.result || '-'}</td>
                                            </tr>
                                          ))}
                                          {player.gameStats.length === 0 && (
                                            <tr>
                                              <td colSpan={13} className="px-2 py-4 text-center text-muted-foreground">
                                                Keine Spielzeilen für diesen Spieler gefunden.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {topPlayers.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                          Keine Spieler-Metriken für diesen Verein gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedPlayer && selectedPlayerPerformance && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">Spieler-Analyse: {selectedPlayer.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={exportPlayerPdfReport}
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Spieler-PDF-Report
                    </button>
                    <button
                      type="button"
                      onClick={exportPlayerPngReport}
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Spieler-PNG-Report
                    </button>
                    <button
                      type="button"
                      onClick={exportSelectedPlayerGamesCsv}
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      CSV: Spieler-Spiele
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    value={playerImageUrl}
                    onChange={(event) => setPlayerImageUrl(event.target.value)}
                    placeholder="Bild-URL fuer Player-PDF (linke Seite)"
                    className="min-w-[22rem] flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    onChange={handlePlayerImageUpload}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  {(playerImageUrl || playerImageDataUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerImageUrl('');
                        setPlayerImageDataUrl('');
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Bild entfernen
                    </button>
                  )}
                </div>
                {playerImageDataUrl && (
                  <div className="mt-3">
                    <img
                      src={playerImageDataUrl}
                      alt="Player upload preview"
                      className="max-h-40 rounded-lg border border-border object-cover"
                    />
                  </div>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-8">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Heim-Schnitt</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.homeAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">{selectedPlayerPerformance.homeGames.length} Spiele</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Auswärts-Schnitt</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.awayAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">{selectedPlayerPerformance.awayGames.length} Spiele</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Bestes Heimspiel</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.homeBest}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPlayerPerformance.bestHomeGame?.seasonLabel || '-'} | {selectedPlayerPerformance.bestHomeGame?.dateTime || '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Bestes Auswärtsspiel</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.awayBest}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPlayerPerformance.bestAwayGame?.seasonLabel || '-'} | {selectedPlayerPerformance.bestAwayGame?.dateTime || '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Aktuelle Form (letzte 5)</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.recentFormAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">Kegel-Schnitt</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Konstanz (Std.-Abw.)</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.overallStdDev.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">Niedriger ist stabiler</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Ø Volle / Abr.</div>
                    <div className="text-lg font-semibold">
                      {selectedPlayerPerformance.volleAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / {selectedPlayerPerformance.abrAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-muted-foreground">Wertung=0 Daten</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Ø Fehlwürfe</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.fehlAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">Niedriger ist besser</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">Heim vs. Auswärts: Kegel-Schnitt</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Heim-Schnitt</div>
                        <div className="text-xl font-semibold">
                          {selectedPlayerPerformance.homeAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Auswärts-Schnitt</div>
                        <div className="text-xl font-semibold">
                          {selectedPlayerPerformance.awayAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Differenz (Heim - Auswärts):{' '}
                      <span className="font-semibold text-foreground">
                        {(selectedPlayerPerformance.homeAvg - selectedPlayerPerformance.awayAvg).toLocaleString('de-DE', {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">Heim vs. Auswärts: Extremwerte</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Heim Best / Tiefst</div>
                        <div className="text-xl font-semibold">
                          {selectedPlayerPerformance.homeBest} / {selectedPlayerPerformance.homeWorst}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground">Auswärts Best / Tiefst</div>
                        <div className="text-xl font-semibold">
                          {selectedPlayerPerformance.awayBest} / {selectedPlayerPerformance.awayWorst}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">Top 3 Heimleistungen</h3>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/70">
                          <tr>
                            <th className="px-2 py-2 text-left">Saison</th>
                            <th className="px-2 py-2 text-left">Datum</th>
                            <th className="px-2 py-2 text-left">Gegner</th>
                            <th className="px-2 py-2 text-center">Kegel</th>
                            <th className="px-2 py-2 text-center">MP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlayerPerformance.homeTopGames.map((game, index) => (
                            <tr key={`home-top-${index}`} className="border-t border-border">
                              <td className="px-2 py-2">{game.seasonLabel}</td>
                              <td className="px-2 py-2">{game.dateTime || '-'}</td>
                              <td className="px-2 py-2">{game.opponent || '-'}</td>
                              <td className="px-2 py-2 text-center">{game.kegel}</td>
                              <td className="px-2 py-2 text-center">{game.mp.toLocaleString('de-DE')}</td>
                            </tr>
                          ))}
                          {selectedPlayerPerformance.homeTopGames.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                                Keine Heimspiele gefunden.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">Top 3 Auswärtsleistungen</h3>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/70">
                          <tr>
                            <th className="px-2 py-2 text-left">Saison</th>
                            <th className="px-2 py-2 text-left">Datum</th>
                            <th className="px-2 py-2 text-left">Gegner</th>
                            <th className="px-2 py-2 text-center">Kegel</th>
                            <th className="px-2 py-2 text-center">MP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlayerPerformance.awayTopGames.map((game, index) => (
                            <tr key={`away-top-${index}`} className="border-t border-border">
                              <td className="px-2 py-2">{game.seasonLabel}</td>
                              <td className="px-2 py-2">{game.dateTime || '-'}</td>
                              <td className="px-2 py-2">{game.opponent || '-'}</td>
                              <td className="px-2 py-2 text-center">{game.kegel}</td>
                              <td className="px-2 py-2 text-center">{game.mp.toLocaleString('de-DE')}</td>
                            </tr>
                          ))}
                          {selectedPlayerPerformance.awayTopGames.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                                Keine Auswärtsspiele gefunden.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Heim-MP-Schnitt</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.homeMpAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Auswärts-MP-Schnitt</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.awayMpAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Heim-Ø Volle</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.homeVolleAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Auswärts-Ø Volle</div>
                    <div className="text-lg font-semibold">{selectedPlayerPerformance.awayVolleAvg.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">Historische Spiele ({filteredHistoricGames.length})</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportHistoricGamesCsv}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    CSV: Historische Spiele
                  </button>
                  <div className="flex flex-col">
                    <label className="mb-1 text-xs text-muted-foreground" htmlFor="historicVenueFilter">Ort</label>
                    <select
                      id="historicVenueFilter"
                      value={historicVenueFilter}
                      onChange={(event) => setHistoricVenueFilter(event.target.value as 'all' | 'home' | 'away')}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <option value="all">Alle</option>
                      <option value="home">Heim</option>
                      <option value="away">Auswärts</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-xs text-muted-foreground" htmlFor="historicSort">Sortierung</label>
                    <select
                      id="historicSort"
                      value={historicSort}
                      onChange={(event) => setHistoricSort(event.target.value as 'newest' | 'oldest')}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <option value="newest">Neu nach Alt</option>
                      <option value="oldest">Alt nach Neu</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Saison</th>
                      <th className="px-3 py-2 text-left">Liga</th>
                      <th className="px-3 py-2 text-left">Spieltag</th>
                      <th className="px-3 py-2 text-left">Datum</th>
                      <th className="px-3 py-2 text-left">Ort</th>
                      <th className="px-3 py-2 text-left">Heim</th>
                      <th className="px-3 py-2 text-left">Auswärts</th>
                      <th className="px-3 py-2 text-left">Ergebnis</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoricGames.map((entry, index) => {
                      const gameKey = `${entry.seasonId}:${entry.game.game_id}`;
                      const isOpen = openHistoricGameKey === gameKey;
                      const lost = isLostGame(entry);
                      return (
                        <Fragment key={`${entry.seasonId}-${entry.leagueId}-${entry.game.game_id}-${index}`}>
                          <tr className={`border-t border-border ${lost ? 'bg-red-500/10' : ''}`}>
                            <td className="px-3 py-2">{entry.seasonLabel}</td>
                            <td className="px-3 py-2">{entry.leagueName}</td>
                            <td className="px-3 py-2">{entry.game.spieltag || '-'}</td>
                            <td className="px-3 py-2">{entry.game.date_time || '-'}</td>
                            <td className="px-3 py-2">{entry.isHome ? 'Heim' : 'Auswärts'}</td>
                            <td className="px-3 py-2">{entry.game.team_home || '-'}</td>
                            <td className="px-3 py-2">{entry.game.team_away || '-'}</td>
                            <td className="px-3 py-2">{entry.game.result || '-'}</td>
                            <td className="px-3 py-2">
                              {lost ? (
                                <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Niederlage</span>
                              ) : (
                                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Kein Loss</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => toggleHistoricGameDetails(entry)}
                                className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                              >
                                {isOpen ? 'Schließen' : 'Details'}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-border bg-muted/20">
                              <td colSpan={10} className="px-3 py-3">
                                {historicDetailsLoading[gameKey] ? (
                                  <LoadingSpinner label="Lade Spiel-Details..." className="py-3" size="sm" />
                                ) : (
                                  renderHistoricGameDetailsTable(historicGameDetails[gameKey] || [])
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {filteredHistoricGames.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                          Keine Spiele für diesen Verein gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
