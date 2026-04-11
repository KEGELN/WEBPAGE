'use client';

import { useState, useMemo } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTheme } from '@/lib/theme-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, History, Calendar, Trophy, Activity, TrendingUp, ChevronDown, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        return { spieltag: '', game_id: '', date_time: '', team_home: '', team_away: '', result: '' } as SpielplanGame;
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
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<HistoricOverview | null>(null);
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
      const seasonSorted = [...seasons]
        .filter((season) => String(season.season_id || '').trim() !== '')
        .sort((a, b) => Number(b.yearof_season) - Number(a.yearof_season))
        .slice(0, 8); 

      const allGames: HistoricGameRow[] = [];
      let totalLeaguesChecked = 0;

      for (const season of seasonSorted) {
        const leagues = await apiService.getLeagues(season.season_id, '0', '', '2');
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
            } catch {
              return { league, plan: [] as SpielplanGame[] };
            }
          },
          4
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

      const seasonMap = new Map<string, SeasonAggregate>();

      let completedGames = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      let bestTeamScore = 0;

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

        const s = seasonMap.get(entry.seasonId)!;
        s.games += 1;

        const score = parseScore(entry.game.result);
        if (score) {
          completedGames += 1;
          s.completedGames += 1;

          const clubFor = entry.isHome ? score.home : score.away;
          const clubAgainst = entry.isHome ? score.away : score.home;

          pointsFor += clubFor;
          pointsAgainst += clubAgainst;
          s.pointsFor += clubFor;
          s.pointsAgainst += clubAgainst;

          bestTeamScore = Math.max(bestTeamScore, clubFor);
          s.bestTeamScore = Math.max(s.bestTeamScore, clubFor);

          if (clubFor > clubAgainst) { wins += 1; s.wins += 1; }
          else if (clubFor < clubAgainst) { losses += 1; s.losses += 1; }
          else { draws += 1; s.draws += 1; }
        }
      });

      setOverview({
        clubName: resolvedClubName,
        searchedClub: trimmed,
        totalSeasons: seasonSorted.length,
        totalLeaguesChecked,
        games: allGames.sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel)),
        team: { 
            totalGames: allGames.length, completedGames, wins, draws, losses, pointsFor, pointsAgainst,
            bestTeamScore, avgTeamScore: completedGames > 0 ? pointsFor / completedGames : 0,
            homeGames: allGames.filter(g => g.isHome).length,
            awayGames: allGames.filter(g => !g.isHome).length,
            homeWins: 0, awayWins: 0, matchPointsFor: 0, matchPointsAgainst: 0, setPointsFor: 0, setPointsAgainst: 0
        },
        players: [], 
        seasons: Array.from(seasonMap.values()).map(s => ({
            ...s,
            avgTeamScore: s.completedGames > 0 ? s.pointsFor / s.completedGames : 0
        })).sort((a, b) => toSeasonNumber(b.seasonLabel) - toSeasonNumber(a.seasonLabel))
      });
    } catch {
      setError('Fehler beim Laden der historischen Daten.');
    } finally {
      setLoading(false);
    }
  };

  const toggleGame = async (entry: HistoricGameRow) => {
    const key = `${entry.seasonId}:${entry.game.game_id}`;
    if (openHistoricGameKey === key) {
        setOpenHistoricGameKey(null);
        return;
    }
    setOpenHistoricGameKey(key);
    if (historicGameDetails[key]) return;

    setHistoricDetailsLoading(prev => ({ ...prev, [key]: true }));
    try {
        const res = await fetch(`/api/mirror/game?gameId=${encodeURIComponent(entry.game.game_id)}`);
        const payload = await res.json();
        setHistoricGameDetails(prev => ({ ...prev, [key]: payload.rows || [] }));
    } catch (err) {
        console.error(err);
    } finally {
        setHistoricDetailsLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Modern Search Header */}
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-10 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  <History className="h-3 w-3" /> Historic Data Explorer
                </div>
                <CardTitle className="text-4xl md:text-6xl font-black tracking-tighter">
                  {overview?.clubName || 'Vereins-Historie'}
                </CardTitle>
                <p className="text-muted-foreground font-medium max-w-xl text-lg">
                  Tiefenanalyse über alle verfügbaren Saisons. Teammetriken, Spielerstatistiken 
                  und historische Spielverläufe.
                </p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <form onSubmit={(e) => { e.preventDefault(); runHistoricOverview(); }} className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Verein (z.B. KSC RW Berliner Bär)..."
                      className="w-full h-16 pl-12 pr-4 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold text-lg shadow-inner"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="h-16 rounded-2xl px-8 font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                    Analysieren
                  </Button>
                </form>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading && <div className="py-24 flex flex-col items-center gap-4"><LoadingSpinner size="lg" /><p className="font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Durchsuche Datenbanken...</p></div>}
        {error && <Card className="p-8 border-destructive/50 bg-destructive/5 rounded-3xl text-destructive font-black text-center uppercase tracking-widest">{error}</Card>}

        {overview && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-[2.5rem] p-8 border-border bg-card shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform"><Activity size={160} /></div>
                <div className="relative z-10 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Spiele Gesamt</div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter">{overview.team.totalGames}</div>
                  <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg w-fit">{overview.team.completedGames} Beendet</div>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 border-border bg-card shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform"><Trophy size={160} /></div>
                <div className="relative z-10 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Winrate</div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter">
                    {overview.team.completedGames > 0 ? ((overview.team.wins / overview.team.completedGames) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-xs font-bold text-muted-foreground">{overview.team.wins} Siege / {overview.team.losses} Niederlagen</div>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 border-border bg-card shadow-sm hover:shadow-xl transition-all group overflow-hidden border-b-4 border-b-primary">
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform"><TrendingUp size={160} /></div>
                <div className="relative z-10 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Team-Schnitt</div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter">{overview.team.avgTeamScore.toFixed(1)}</div>
                  <div className="text-xs font-bold text-primary">Bestleistung: {overview.team.bestTeamScore}</div>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/20 group overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={160} /></div>
                <div className="relative z-10 space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Geprüfte Ligen</div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter">{overview.totalLeaguesChecked}</div>
                  <div className="text-xs font-black px-2 py-1 rounded-lg bg-white/20 w-fit uppercase tracking-tighter">Über {overview.totalSeasons} Saisons</div>
                </div>
              </Card>
            </div>

            {/* Season History Section */}
            <section className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-4">
                  <Calendar className="text-primary h-8 w-8" /> SAISON-HISTORY
                </h2>
                <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
              </div>

              <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
                 <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest">Saison</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Spiele</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">W/D/L</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Team-Ø</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Bestwert</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {overview.seasons.map((s) => (
                            <TableRow key={s.seasonId} className="group hover:bg-primary/5 transition-colors">
                                <TableCell className="py-6 px-8 font-black text-xl tracking-tight">{s.seasonLabel}</TableCell>
                                <TableCell className="text-center font-bold">{s.games}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 font-black tabular-nums">
                                        <span className="text-emerald-500">{s.wins}</span>
                                        <span className="text-muted-foreground opacity-30">/</span>
                                        <span className="text-amber-500">{s.draws}</span>
                                        <span className="text-muted-foreground opacity-30">/</span>
                                        <span className="text-red-500">{s.losses}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-black text-primary text-lg">{s.avgTeamScore.toFixed(1)}</TableCell>
                                <TableCell className="text-center font-bold">{s.bestTeamScore}</TableCell>
                                <TableCell className="text-right pr-8">
                                    <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest">History</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
              </Card>
            </section>

            {/* Game History List */}
            <section className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-4">
                  <History className="text-primary h-8 w-8" /> ALLE SPIELE
                </h2>
                <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
              </div>

              <div className="grid gap-4">
                {overview.games.slice(0, 100).map((entry, idx) => {
                  const key = `${entry.seasonId}:${entry.game.game_id}`;
                  const isOpen = openHistoricGameKey === key;
                  
                  return (
                    <Card key={idx} className={cn(
                      "rounded-[2rem] border-border/50 bg-card overflow-hidden transition-all duration-300",
                      isOpen ? "shadow-2xl ring-2 ring-primary/20 scale-[1.01]" : "hover:shadow-md hover:border-primary/20"
                    )}>
                      <button
                        onClick={() => void toggleGame(entry)}
                        className="w-full p-6 md:p-8 text-left group"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest">
                                {entry.seasonLabel}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {entry.game.date_time}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {entry.leagueName}
                              </span>
                            </div>
                            <div className="text-xl font-black tracking-tight flex items-center gap-3">
                                <span className={cn(entry.isHome ? "text-primary" : "text-foreground")}>{entry.game.team_home}</span>
                                <span className="text-muted-foreground opacity-20 uppercase text-xs font-black">vs</span>
                                <span className={cn(!entry.isHome ? "text-primary" : "text-foreground")}>{entry.game.team_away}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center bg-muted/30 px-6 py-3 rounded-2xl border border-border/50">
                              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ergebnis</div>
                              <div className="text-2xl font-black tracking-tighter tabular-nums">{entry.game.result || '- : -'}</div>
                            </div>
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                              isOpen ? "bg-primary text-white rotate-180" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                            )}>
                              <ChevronDown size={20} />
                            </div>
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-8 pb-8 border-t border-border/50 bg-muted/5">
                          {historicDetailsLoading[key] ? (
                            <div className="py-12 flex justify-center"><LoadingSpinner size="sm" /></div>
                          ) : (
                            <div className="mt-8 overflow-hidden rounded-2xl border border-border/50 shadow-inner bg-card">
                                <Table className="text-xs">
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-right w-1/4">Heim</TableHead>
                                            <TableHead className="text-center font-black">Kegel</TableHead>
                                            <TableHead className="text-center">SP</TableHead>
                                            <TableHead className="text-center">MP</TableHead>
                                            <TableHead className="text-center w-8"></TableHead>
                                            <TableHead className="text-center">MP</TableHead>
                                            <TableHead className="text-center">SP</TableHead>
                                            <TableHead className="text-center font-black">Kegel</TableHead>
                                            <TableHead className="text-left w-1/4">Gast</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(historicGameDetails[key] || []).map((row, rIdx) => {
                                            const isTotals = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];
                                            if (isTotals) return null;
                                            return (
                                                <TableRow key={rIdx} className="h-10">
                                                    <TableCell className="text-right font-medium">{String(row[0] || '-')}</TableCell>
                                                    <TableCell className="text-center font-black">{String(row[5] || '-')}</TableCell>
                                                    <TableCell className="text-center text-muted-foreground">{String(row[6] || '-')}</TableCell>
                                                    <TableCell className="text-center font-bold text-emerald-500">{String(row[7] || '-')}</TableCell>
                                                    <TableCell className="text-center"></TableCell>
                                                    <TableCell className="text-center font-bold text-emerald-500">{String(row[8] || '-')}</TableCell>
                                                    <TableCell className="text-center text-muted-foreground">{String(row[9] || '-')}</TableCell>
                                                    <TableCell className="text-center font-black">{String(row[10] || '-')}</TableCell>
                                                    <TableCell className="text-left font-medium">{String(row[15] || '-')}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {!overview && !loading && (
          <div className="py-32 flex flex-col items-center gap-8 text-center opacity-40">
            <div className="w-32 h-32 rounded-[3rem] bg-muted flex items-center justify-center border-4 border-dashed border-border"><History size={60} /></div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight uppercase">Kein Verein geladen</h2>
              <p className="max-w-sm font-bold uppercase tracking-widest text-[10px]">Starte eine Analyse oben mit einem Vereinsnamen</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
