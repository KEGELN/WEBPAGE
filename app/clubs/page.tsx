'use client';

import { Fragment, useMemo, useState } from 'react';
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
}

interface PlayerGameStat {
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
}

interface PlayerAggregate {
  name: string;
  games: number;
  totalKegel: number;
  bestKegel: number;
  totalMp: number;
  totalSp: number;
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

interface ChartPoint {
  label: string;
  value: number;
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

function toChartPoints(seasons: SeasonAggregate[], selector: (season: SeasonAggregate) => number): ChartPoint[] {
  return seasons.map((season) => ({ label: season.seasonLabel, value: selector(season) }));
}

function buildLinearTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (count <= 1) return [min];
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + index * step);
}

function defaultChartValueFormatter(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function TrendLineChart({ title, points, color = '#ef4444' }: { title: string; points: ChartPoint[]; color?: string }) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-xs text-muted-foreground">Noch keine Saisondaten vorhanden.</p>
      </div>
    );
  }

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760;
  const height = 220;
  const left = 58;
  const right = 24;
  const top = 16;
  const bottom = 30;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const yTicks = buildLinearTicks(min, max, 5);

  const coords = points.map((point, index) => {
    const x = left + (index * (width - left - right)) / Math.max(points.length - 1, 1);
    const y = top + ((max - point.value) * (height - top - bottom)) / span;
    return { ...point, x, y };
  });

  const path = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const hoveredPoint = hoveredIndex !== null ? coords[hoveredIndex] : null;
  const prevValue = hoveredIndex !== null && hoveredIndex > 0 ? coords[hoveredIndex - 1].value : null;
  const hoveredDelta = prevValue !== null && hoveredPoint ? hoveredPoint.value - prevValue : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          Min: {defaultChartValueFormatter(min)} | Max: {defaultChartValueFormatter(max)}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
        {yTicks.map((tick, tickIndex) => {
          const y = top + ((max - tick) * (height - top - bottom)) / span;
          const isAxis = tickIndex === 0;
          return (
            <Fragment key={`${title}-tick-${tickIndex}`}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                stroke="#64748b"
                strokeOpacity={isAxis ? '0.45' : '0.2'}
              />
              <text x={left - 8} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="10">
                {defaultChartValueFormatter(tick)}
              </text>
            </Fragment>
          );
        })}
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#64748b" strokeOpacity="0.35" />
        <line x1={left} y1={top} x2={left} y2={height - bottom} stroke="#64748b" strokeOpacity="0.35" />
        <polyline fill="none" stroke={color} strokeWidth="3" points={path} />
        {coords.map((point, idx) => (
          <g key={`${point.label}-${idx}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === idx ? 6 : 4}
              fill={color}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <title>{`${point.label}: ${defaultChartValueFormatter(point.value)}`}</title>
            </circle>
            {(idx === 0 || idx === coords.length - 1 || idx % Math.ceil(coords.length / 4) === 0) && (
              <text x={point.x} y={height - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-2 min-h-12 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
        {!hoveredPoint && <span>Fahre mit der Maus über einen Punkt für detaillierte Saisondaten.</span>}
        {hoveredPoint && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-foreground">Saison {hoveredPoint.label}</span>
            <span>Wert: {defaultChartValueFormatter(hoveredPoint.value)}</span>
            <span>
              Differenz: {hoveredDelta === null ? '-' : `${hoveredDelta >= 0 ? '+' : ''}${defaultChartValueFormatter(hoveredDelta)}`}
            </span>
            <span>Bereichsposition: {(((hoveredPoint.value - min) / span) * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function VerticalBarChart({
  title,
  points,
  color = '#dc2626',
  valueFormatter = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 2 }),
}: {
  title: string;
  points: ChartPoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-xs text-muted-foreground">Noch keine Saisondaten vorhanden.</p>
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3">
        <div className="flex h-44 items-end gap-2 rounded-md border border-border bg-muted/25 p-2">
          {points.map((point) => {
            const heightPct = (point.value / max) * 100;
            const safeHeight = Math.max(heightPct, 4);
            return (
              <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="relative h-36 w-full">
                  <div
                    className="absolute left-1/2 -translate-x-1/2 text-[10px] text-foreground"
                    style={{ bottom: `calc(${safeHeight}% + 4px)` }}
                  >
                    {valueFormatter(point.value)}
                  </div>
                  <div
                    className="absolute bottom-0 w-full rounded-sm"
                    style={{ height: `${safeHeight}%`, backgroundColor: color }}
                    title={`${point.label}: ${valueFormatter(point.value)}`}
                  />
                </div>
                <div className="mt-1 truncate text-center text-[10px] text-muted-foreground">{point.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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

export default function ClubsPage() {
  const apiService = ApiService.getInstance();
  const MAX_SEASONS_TO_SCAN = 20;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<HistoricOverview | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);

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
        const leagues = (await apiService.getLeagues(season.season_id)) as League[];
        totalLeaguesChecked += leagues.length;

        const seasonPlans = await mapWithConcurrency(
          leagues,
          async (league) => {
            try {
              let plan = (await apiService.getSpielplan(season.season_id, league.liga_id)) as SpielplanGame[];
              if (!plan || plan.length === 0) {
                plan = await fetchGetSpielFallback(season.season_id, league.liga_id);
              }
              return { league, plan };
            } catch (planError) {
              console.warn(`Could not load spielplan for season ${season.season_id}, league ${league.liga_id}`, planError);
              return { league, plan: [] as SpielplanGame[] };
            }
          },
          5
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
              rows: (await apiService.getSpielerInfo(entry.seasonId, entry.game.game_id, 1)) as GameDetailRow[],
            };
          } catch (detailError) {
            console.warn(`Could not load detail rows for game ${entry.game.game_id}`, detailError);
            return { gameKey: `${entry.seasonId}:${entry.game.game_id}`, rows: [] as GameDetailRow[] };
          }
        },
        5
      );

      detailPayloads.forEach((payload) => {
        detailRowsByGameId.set(payload.gameKey, payload.rows);
      });

      const seasonMap = new Map<string, SeasonAggregate>();
      const playerMap = new Map<
        string,
        {
          name: string;
          games: number;
          totalKegel: number;
          bestKegel: number;
          totalMp: number;
          totalSp: number;
          seasons: Map<string, PlayerSeasonAggregate>;
          gameStats: PlayerGameStat[];
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
              totalKegel: 0,
              bestKegel: 0,
              totalMp: 0,
              totalSp: 0,
              seasons: new Map<string, PlayerSeasonAggregate>(),
              gameStats: [],
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
            });
          }

          const playerSeason = playerBucket.seasons.get(entry.seasonId)!;
          playerSeason.games += 1;
          playerSeason.totalKegel += kegel;
          playerSeason.totalMp += mp;
          playerSeason.totalSp += sp;
          playerSeason.bestKegel = Math.max(playerSeason.bestKegel, kegel);

          playerBucket.gameStats.push({
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
          });
        });
      });

      const players: PlayerAggregate[] = Array.from(playerMap.values())
        .map((player) => ({
          name: player.name,
          games: player.games,
          totalKegel: player.totalKegel,
          bestKegel: player.bestKegel,
          totalMp: player.totalMp,
          totalSp: player.totalSp,
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
      overallStdDev: getStdDev(allKegel),
      recentFormAvg: getAverage(recentFormGames.map((game) => game.kegel)),
      recentGames,
      bestHomeGame,
      bestAwayGame,
      homeTopGames: [...homeGames].sort((a, b) => b.kegel - a.kegel).slice(0, 3),
      awayTopGames: [...awayGames].sort((a, b) => b.kegel - a.kegel).slice(0, 3),
    };
  }, [selectedPlayer]);

  const seasonScorePoints = useMemo(() => (overview ? toChartPoints(overview.seasons, (season) => season.avgTeamScore) : []), [overview]);
  const seasonWinRatePoints = useMemo(
    () =>
      overview
        ? toChartPoints(overview.seasons, (season) =>
            season.completedGames > 0 ? (season.wins / season.completedGames) * 100 : 0
          )
        : [],
    [overview]
  );
  const seasonGameVolumePoints = useMemo(() => (overview ? toChartPoints(overview.seasons, (season) => season.games) : []), [overview]);

  const averageRise = useMemo(() => {
    if (!overview || overview.seasons.length < 2) return 0;
    const first = overview.seasons[0].avgTeamScore;
    const last = overview.seasons[overview.seasons.length - 1].avgTeamScore;
    return last - first;
  }, [overview]);

  const bestSeason = useMemo(() => {
    if (!overview || overview.seasons.length === 0) return null;
    return [...overview.seasons].sort((a, b) => b.avgTeamScore - a.avgTeamScore)[0];
  }, [overview]);

  const strongestSeasonWinRate = useMemo(() => {
    if (!overview || overview.seasons.length === 0) return null;
    return [...overview.seasons].sort((a, b) => {
      const rateA = a.completedGames > 0 ? a.wins / a.completedGames : 0;
      const rateB = b.completedGames > 0 ? b.wins / b.completedGames : 0;
      return rateB - rateA;
    })[0];
  }, [overview]);

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
              <h2 className="text-xl font-semibold text-foreground">{overview.clubName}</h2>
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
              <h2 className="text-xl font-semibold text-foreground">Saisonentwicklung, Durchschnitte und Trend</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Team-Holz/Kegel-Schnitt-Veränderung (erste bis letzte Saison)</div>
                  <div className={`text-lg font-semibold ${averageRise >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {averageRise >= 0 ? '+' : ''}
                    {averageRise.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Beste Durchschnitts-Saison</div>
                  <div className="text-lg font-semibold">{bestSeason ? bestSeason.seasonLabel : '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {bestSeason ? bestSeason.avgTeamScore.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '-'}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Stärkste Siegquote-Saison</div>
                  <div className="text-lg font-semibold">{strongestSeasonWinRate ? strongestSeasonWinRate.seasonLabel : '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {strongestSeasonWinRate
                      ? `${((strongestSeasonWinRate.wins / Math.max(strongestSeasonWinRate.completedGames, 1)) * 100).toLocaleString('de-DE', {
                          maximumFractionDigits: 2,
                        })}%`
                      : '-'}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Saisonabdeckung</div>
                  <div className="text-lg font-semibold">{overview.seasons.length}</div>
                  <div className="text-xs text-muted-foreground">Saisons mit erkannten Spielen</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <TrendLineChart title="Team-Holz/Kegel-Schnitt pro Saison" points={seasonScorePoints} color="#ef4444" />
                <VerticalBarChart
                  title="Siegquote pro Saison (%)"
                  points={seasonWinRatePoints}
                  color="#0f766e"
                  valueFormatter={(value) => `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%`}
                />
                <VerticalBarChart title="Spiele pro Saison" points={seasonGameVolumePoints} color="#2563eb" valueFormatter={(value) => `${Math.round(value)}`} />
                <TrendLineChart
                  title="Matchpunkt-Differenz pro Saison"
                  points={
                    overview.seasons.map((season) => ({
                      label: season.seasonLabel,
                      value: season.matchPointsFor - season.matchPointsAgainst,
                    }))
                  }
                  color="#7c3aed"
                />
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
                      <th className="px-3 py-2 text-center">Bestes</th>
                      <th className="px-3 py-2 text-center">Total Kegel</th>
                      <th className="px-3 py-2 text-center">Total MP</th>
                      <th className="px-3 py-2 text-center">Total SP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPlayers.map((player) => {
                      const isOpen = selectedPlayerName === player.name;
                      return (
                        <Fragment key={player.name}>
                          <tr
                            className="cursor-pointer border-t border-border hover:bg-accent/40"
                            onClick={() => setSelectedPlayerName((current) => (current === player.name ? null : player.name))}
                          >
                            <td className="px-3 py-2">{player.name}</td>
                            <td className="px-3 py-2 text-center">{player.games}</td>
                            <td className="px-3 py-2 text-center">{formatAverage(player.totalKegel, player.games)}</td>
                            <td className="px-3 py-2 text-center">{player.bestKegel}</td>
                            <td className="px-3 py-2 text-center">{player.totalKegel}</td>
                            <td className="px-3 py-2 text-center">{player.totalMp.toLocaleString('de-DE')}</td>
                            <td className="px-3 py-2 text-center">{player.totalSp.toLocaleString('de-DE')}</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-t border-border bg-muted/20">
                              <td colSpan={7} className="px-3 py-4">
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
                                              <td className="px-2 py-2 text-center">{formatAverage(season.totalKegel, season.games)}</td>
                                              <td className="px-2 py-2 text-center">{season.bestKegel}</td>
                                              <td className="px-2 py-2 text-center">{season.totalMp}</td>
                                              <td className="px-2 py-2 text-center">{season.totalSp}</td>
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
                                              <td className="px-2 py-2 text-center">{game.kegel}</td>
                                              <td className="px-2 py-2 text-center">{game.mp.toLocaleString('de-DE')}</td>
                                              <td className="px-2 py-2 text-center">{game.sp.toLocaleString('de-DE')}</td>
                                              <td className="px-2 py-2">{game.result || '-'}</td>
                                            </tr>
                                          ))}
                                          {player.gameStats.length === 0 && (
                                            <tr>
                                              <td colSpan={10} className="px-2 py-4 text-center text-muted-foreground">
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
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
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
                <h2 className="text-xl font-semibold text-foreground">Spieler-Analyse: {selectedPlayer.name}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
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
                  <VerticalBarChart
                    title="Heim vs. Auswärts: Beste und schwächste"
                    color="#b91c1c"
                    points={[
                      { label: 'Heim-Bestwert', value: selectedPlayerPerformance.homeBest },
                      { label: 'Auswärts-Bestwert', value: selectedPlayerPerformance.awayBest },
                      { label: 'Heim-Tiefstwert', value: selectedPlayerPerformance.homeWorst },
                      { label: 'Auswärts-Tiefstwert', value: selectedPlayerPerformance.awayWorst },
                    ]}
                    valueFormatter={(value) => `${Math.round(value)}`}
                  />
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
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold text-foreground">Historische Spiele ({overview.games.length})</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Saison</th>
                      <th className="px-3 py-2 text-left">Liga</th>
                      <th className="px-3 py-2 text-left">Spieltag</th>
                      <th className="px-3 py-2 text-left">Datum</th>
                      <th className="px-3 py-2 text-left">Heim</th>
                      <th className="px-3 py-2 text-left">Auswärts</th>
                      <th className="px-3 py-2 text-left">Ergebnis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.games.map((entry, index) => (
                      <tr key={`${entry.seasonId}-${entry.leagueId}-${entry.game.game_id}-${index}`} className="border-t border-border">
                        <td className="px-3 py-2">{entry.seasonLabel}</td>
                        <td className="px-3 py-2">{entry.leagueName}</td>
                        <td className="px-3 py-2">{entry.game.spieltag || '-'}</td>
                        <td className="px-3 py-2">{entry.game.date_time || '-'}</td>
                        <td className="px-3 py-2">{entry.game.team_home || '-'}</td>
                        <td className="px-3 py-2">{entry.game.team_away || '-'}</td>
                        <td className="px-3 py-2">{entry.game.result || '-'}</td>
                      </tr>
                    ))}
                    {overview.games.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
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
