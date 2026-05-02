'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from '@/components/menubar';
import PlayerService from '@/lib/player-service';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import { readDefaultLeagueId } from '@/lib/client-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { cn } from '@/lib/utils';

type PlayerRow = {
  id?: string;
  rank?: number;
  name?: string;
  club?: string;
  category?: string;
  gamesTotal?: number | string;
  totalGames?: number | string;
  games?: number | string;
  avgTotal?: string;
  average?: string;
  schnitt?: string;
  mpTotal?: number | string;
  points?: number | string;
  gamesHome?: number | string;
  homeGames?: number | string;
  avgHome?: string;
  homeAverage?: string;
  mpHome?: number | string;
  homePoints?: number | string;
  gamesAway?: number | string;
  awayGames?: number | string;
  avgAway?: string;
  awayAverage?: string;
  mpAway?: number | string;
  awayPoints?: number | string;
  bestGame?: number | string;
  best?: number | string;
};

type SeasonOption = { season_id: string; yearof_season: number; status: number };
type LeagueOption = { liga_id: string; name_der_liga: string };
type SpieltagOption = { id: string; nr: string; label: string; status: string };
type StandingRow = Array<string | number | null | undefined>;

function asString(value: string | number | undefined): string {
  return String(value ?? '');
}

function asReactText(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number' && !Number.isFinite(value)) return '-';
  return String(value);
}

export default function ScoresPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [spieltage, setSpieltage] = useState<SpieltagOption[]>([]);
  const [selectedSpieltag, setSelectedSpieltag] = useState<string>('100');
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [prevStandings, setPrevStandings] = useState<StandingRow[]>([]);
  const [prevPlayers, setPrevPlayers] = useState<PlayerRow[]>([]);
  const [standingsSort, setStandingsSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [spielplan, setSpielplan] = useState<Array<{ teamHome: string; teamAway: string; result: string }>>([]);

  const playerService = useMemo(() => new PlayerService(), []);
  const apiService = useMemo(() => ApiService.getInstance(), []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const seasonData = await apiService.getCurrentSeason();
        setSeasons(seasonData);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, [apiService]);

  useEffect(() => {
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0].season_id);
    }
  }, [seasons, selectedSeason]);

  useEffect(() => {
    if (!selectedLeague && leagues.length > 0) {
      const defaultLeague = readDefaultLeagueId();
      const defaultLeagueExists = defaultLeague
        ? leagues.some((league) => String(league.liga_id) === defaultLeague)
        : false;
      setSelectedLeague(defaultLeagueExists ? defaultLeague : leagues[0].liga_id);
    }
  }, [leagues, selectedLeague]);

  useEffect(() => {
    const fetchLeaguesForSeason = async () => {
      if (!selectedSeason) return;
      try {
        const leagueData = await apiService.getLeagues(selectedSeason);
        setLeagues(leagueData);
        const defaultLeague = readDefaultLeagueId();
        setSelectedLeague((prev) => {
          if (leagueData.length === 0) return '';
          const hasPrevious = leagueData.some((league) => String(league.liga_id) === String(prev));
          if (hasPrevious) return prev;
          const hasDefault = defaultLeague
            ? leagueData.some((league) => String(league.liga_id) === String(defaultLeague))
            : false;
          if (hasDefault) return String(defaultLeague);
          return String(leagueData[0].liga_id);
        });
      } catch (err) {
        console.error('Error fetching leagues for season:', err);
        setLeagues([]);
        setSelectedLeague('');
      }
    };

    fetchLeaguesForSeason();
  }, [apiService, selectedSeason]);

  useEffect(() => {
    const fetchSpieltage = async () => {
      if (!selectedSeason || !selectedLeague) return;
      try {
        const data = await apiService.getSpieltage(selectedSeason, selectedLeague);
        setSpieltage(data);
        setSelectedSpieltag((prev) => {
          if (prev === '100') return prev;
          const hasPrevious = data.some((entry) => String(entry.nr) === String(prev));
          return hasPrevious ? prev : '100';
        });
      } catch (err) {
        console.error('Error fetching spieltage:', err);
        setSpieltage([]);
        setSelectedSpieltag('100');
      }
    };

    fetchSpieltage();
  }, [apiService, selectedSeason, selectedLeague]);

  useEffect(() => {
    if (players && players.length > 0) {
      const uniqueCategories = Array.from(new Set(players.map(player => player.category || 'Männer'))).sort();
      setCategories(uniqueCategories);
    } else {
      setCategories([]);
    }
  }, [players]);

  const displayValue = (value: unknown) => asReactText(value);

  const formatNumber = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    const asNumber = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(asNumber)) return '-';
    return asNumber.toLocaleString('de-DE');
  };

  const handleStandingsSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (standingsSort && standingsSort.key === key && standingsSort.direction === 'asc') {
      direction = 'desc';
    }
    setStandingsSort({ key, direction });
  };

  const handleSeasonChange = (nextSeason: string) => {
    if (nextSeason === selectedSeason) return;
    setSelectedSeason(nextSeason);
    setSelectedLeague('');
    setSpieltage([]);
    setSelectedSpieltag('100');
    setStandings([]);
    setPlayers([]);
    setCategories([]);
    setSelectedCategory('');
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason || !selectedLeague || !selectedSpieltag) return;
      setLoading(true);
      setError(null);

      try {
        const spieltagNr = Number(selectedSpieltag);
        const playerList = await playerService.getPlayerSchnitliste(selectedSeason, selectedLeague, spieltagNr);
        setPlayers(playerList);

        let prevNr: number | null = null;
        if (selectedSpieltag === '100') {
          const nrs = spieltage.map((s) => Number(s.nr)).filter((n) => n < 100 && !Number.isNaN(n)).sort((a, b) => a - b);
          if (nrs.length >= 2) prevNr = nrs[nrs.length - 2];
        } else if (spieltagNr > 1) {
          prevNr = spieltagNr - 1;
        }

        if (prevNr !== null) {
          const prev = await playerService.getPlayerSchnitliste(selectedSeason, selectedLeague, prevNr);
          setPrevPlayers(prev);
        } else {
          setPrevPlayers([]);
        }
      } catch (err) {
        setError('Failed to load scores. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerService, selectedSeason, selectedLeague, selectedSpieltag, spieltage]);

  useEffect(() => {
    const fetchStandings = async () => {
      if (!selectedSeason || !selectedLeague || !selectedSpieltag) return;
      try {
        const spieltagNr = Number(selectedSpieltag);
        const data = await apiService.getStandingsRaw(selectedLeague, selectedSeason, spieltagNr, 0);
        const current = data.length > 0 || selectedSpieltag === '100'
          ? data
          : await apiService.getStandingsRaw(selectedLeague, selectedSeason, 100, 0);
        setStandings(current);

        // Determine previous spieltag number for position-change arrows
        let prevNr: number | null = null;
        if (selectedSpieltag === '100') {
          // "100" = latest — compare to second-to-last spieltag so we see actual changes
          const nrs = spieltage.map((s) => Number(s.nr)).filter((n) => n < 100 && !Number.isNaN(n)).sort((a, b) => a - b);
          console.log('[standings] spieltage nrs:', nrs);
          if (nrs.length >= 2) prevNr = nrs[nrs.length - 2];
        } else if (spieltagNr > 1) {
          prevNr = spieltagNr - 1;
        }
        console.log('[standings] selectedSpieltag:', selectedSpieltag, 'prevNr:', prevNr);

        if (prevNr !== null) {
          const prev = await apiService.getStandingsRaw(selectedLeague, selectedSeason, prevNr, 0);
          console.log('[standings] prevStandings sample:', prev.slice(0, 3).map((r) => [r[1], r[2]]));
          setPrevStandings(prev);
        } else {
          console.log('[standings] no prevNr, skipping prev fetch (spieltage may not be loaded yet)');
          setPrevStandings([]);
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
        setStandings([]);
        setPrevStandings([]);
      }
    };

    fetchStandings();
  }, [apiService, selectedSeason, selectedLeague, selectedSpieltag, spieltage]);

  const sortedPlayers = [...players].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: string | number = 0;
    let bValue: string | number = 0;
    switch (sortConfig.key) {
      case 'rank':
        aValue = a.rank || 0;
        bValue = b.rank || 0;
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'club':
        aValue = a.club || '';
        bValue = b.club || '';
        break;
      case 'totalGames':
        aValue = parseInt(asString(a.gamesTotal || a.totalGames || a.games || 0), 10);
        bValue = parseInt(asString(b.gamesTotal || b.totalGames || b.games || 0), 10);
        break;
      case 'average':
        aValue = parseFloat((a.avgTotal || a.average || a.schnitt || '0').replace(',', '.'));
        bValue = parseFloat((b.avgTotal || b.average || b.schnitt || '0').replace(',', '.'));
        break;
      case 'points':
        aValue = parseInt(asString(a.mpTotal || a.points || 0), 10);
        bValue = parseInt(asString(b.mpTotal || b.points || 0), 10);
        break;
      case 'best':
        aValue = parseInt(asString(a.bestGame || a.best || 0), 10);
        bValue = parseInt(asString(b.bestGame || b.best || 0), 10);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredPlayers = selectedCategory
    ? sortedPlayers.filter(player => (player.category || 'Männer') === selectedCategory)
    : sortedPlayers;

  const handlePlayerClick = async (playerName: string) => {
    if (!playerName) return;
    try {
      const res = await fetch(`/api/mirror/search?q=${encodeURIComponent(playerName)}`);
      const data = await res.json();
      if (data.players && data.players.length > 0) {
        router.push(`/player?id=${encodeURIComponent(data.players[0].id)}`);
      } else {
        router.push(`/player?name=${encodeURIComponent(playerName)}`);
      }
    } catch {
      router.push(`/player?name=${encodeURIComponent(playerName)}`);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const prevPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of prevStandings) {
      const name = String(row[2] ?? '').trim();
      const pos = Number(row[1]);
      if (name && !Number.isNaN(pos)) map.set(name, pos);
    }
    return map;
  }, [prevStandings]);

  const prevPlayerRankMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prevPlayers) {
      const name = String(p.name ?? '').trim();
      const rank = Number(p.rank);
      if (name && !Number.isNaN(rank)) map.set(name, rank);
    }
    return map;
  }, [prevPlayers]);

  const RankArrow = ({ name, currentRank }: { name: string; currentRank: number }) => {
    const prev = prevPlayerRankMap.get(name.trim());
    if (prev === undefined) return null;
    if (prev > currentRank) return <span className="text-emerald-500 font-black text-base ml-1 leading-none" title={`War ${prev}.`}>▲</span>;
    if (prev < currentRank) return <span className="text-rose-500 font-black text-base ml-1 leading-none" title={`War ${prev}.`}>▼</span>;
    return <span className="text-foreground text-sm ml-1 leading-none">▬</span>;
  };

  const PositionArrow = ({ teamName, currentPos }: { teamName: string; currentPos: number }) => {
    const prev = prevPositionMap.get(teamName.trim());
    if (prev === undefined) return null;
    if (prev > currentPos) return <span className="text-emerald-500 font-black text-base ml-1 leading-none" title={`War ${prev}.`}>▲</span>;
    if (prev < currentPos) return <span className="text-rose-500 font-black text-base ml-1 leading-none" title={`War ${prev}.`}>▼</span>;
    return <span className="text-foreground text-sm ml-1 leading-none">▬</span>;
  };

  // Load spielplan for form/S/U/N computation
  useEffect(() => {
    const fetchSpielplan = async () => {
      if (!selectedSeason || !selectedLeague) return;
      try {
        const data = await apiService.getSpielplan(selectedSeason, selectedLeague);
        setSpielplan(data.map(g => ({
          teamHome: g.team_home,
          teamAway: g.team_away,
          result: g.result,
        })));
      } catch {
        setSpielplan([]);
      }
    };
    fetchSpielplan();
  }, [apiService, selectedSeason, selectedLeague]);

  // Compute per-team record from spielplan
  const teamRecord = useMemo(() => {
    const map = new Map<string, { s: number; u: number; n: number; form: ('W' | 'D' | 'L')[] }>();
    for (const g of spielplan) {
      if (!g.result || g.result.trim() === '– : –' || g.result.trim() === '- : -') continue;
      const parts = g.result.split(':').map(p => p.trim());
      if (parts.length < 2) continue;
      const home = parseFloat(parts[0].replace(',', '.'));
      const away = parseFloat(parts[1].replace(',', '.'));
      if (isNaN(home) || isNaN(away)) continue;

      const ensureTeam = (name: string) => {
        if (!map.has(name)) map.set(name, { s: 0, u: 0, n: 0, form: [] });
        return map.get(name)!;
      };

      const hRec = ensureTeam(g.teamHome);
      const aRec = ensureTeam(g.teamAway);

      if (home > away) {
        hRec.s++; hRec.form.push('W');
        aRec.n++; aRec.form.push('L');
      } else if (home < away) {
        hRec.n++; hRec.form.push('L');
        aRec.s++; aRec.form.push('W');
      } else {
        hRec.u++; hRec.form.push('D');
        aRec.u++; aRec.form.push('D');
      }
    }
    return map;
  }, [spielplan]);

  // Club abbreviation: first letters of meaningful words
  function getClubAbbr(name: string): string {
    const words = name.replace(/\s+I+$/, '').trim().split(/\s+/);
    const skips = new Set(['und', 'und', 'der', 'die', 'des', 'dem', 'den', 'ein', 'eine', 'von', 'für', 'Berliner']);
    const significant = words.filter(w => !skips.has(w) && w.length > 1);
    if (significant.length >= 2) return (significant[0][0] + significant[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  // Color for club badge based on position in list
  const BADGE_COLORS = [
    'bg-primary/15 text-primary',
    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  ];

  const handleTeamScheduleClick = (teamName: string) => {
    if (!teamName) return;
    const params = new URLSearchParams();
    if (selectedSeason) params.set('season', selectedSeason);
    if (selectedLeague) params.set('league', selectedLeague);
    params.set('team', teamName);
    router.push(`/tournaments?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Page header + filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1">Kegel Hub</div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Tabellen</h1>
            </div>
            {players.length > 0 && (
              <div className="flex gap-3">
                <div className="rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Spieler</div>
                  <div className="text-xl font-black tabular-nums text-foreground">{formatNumber(players.length)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saison</label>
              <Select value={selectedSeason} onChange={(e) => handleSeasonChange(e.target.value)} className="h-9 text-xs font-bold rounded-xl w-[160px]">
                <option value="">Alle Saisons</option>
                {seasons.map((s) => <option key={s.season_id} value={s.season_id}>{s.yearof_season}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Liga</label>
              <Select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="h-9 text-xs font-bold rounded-xl w-[220px]">
                <option value="">Alle Ligen</option>
                {leagues.map((l) => <option key={l.liga_id} value={l.liga_id}>{l.name_der_liga}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Spieltag</label>
              <Select value={selectedSpieltag} onChange={(e) => setSelectedSpieltag(e.target.value)} className="h-9 text-xs font-bold rounded-xl w-[160px]">
                <option value="100">Aktuell</option>
                {spieltage.map((sp) => <option key={sp.id} value={sp.nr}>{sp.label}</option>)}
              </Select>
            </div>
            {categories.length > 1 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kategorie</label>
                <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-9 text-xs font-bold rounded-xl w-[160px]">
                  <option value="">Alle</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
            )}
          </div>
        </div>

        {loading && <LoadingSpinner label="Lade Scores..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {standings.length > 0 && (
              <section className="space-y-3">
                {/* League header */}
                <div className="rounded-[2rem] border border-primary/20 bg-primary/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-black tracking-tighter uppercase">
                      {leagues.find(l => l.liga_id === selectedLeague)?.name_der_liga ?? 'Tabelle'}
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                      Saison {seasons.find(s => s.season_id === selectedSeason)?.yearof_season ?? selectedSeason}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Spieltag {selectedSpieltag === '100' ? 'Aktuell' : selectedSpieltag}
                  </span>
                </div>

                <div className="rounded-[2rem] border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="w-10 text-center py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">#</th>
                          <th className="text-left py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[180px]">Verein</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">SP</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hidden sm:table-cell">S</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">U</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hidden sm:table-cell">N</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">HOLZ+</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">HOLZ−</th>
                          <th className="text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:table-cell">SP</th>
                          <th className="text-center py-3 px-3 text-[10px] font-black uppercase tracking-widest text-primary">MP</th>
                          <th className="text-center py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Form</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {standings.map((row, idx) => {
                          const pos = Number(row[1]);
                          const teamName = String(row[2] ?? '');
                          const rec = teamRecord.get(teamName);
                          const form = rec ? rec.form.slice(-5) : [];
                          // Promotion/relegation zone (top 2 up, bottom 2 down — approximate)
                          const isPromotion = pos <= 2;
                          const isPlayoff = pos === 3;
                          const isRelegation = pos >= standings.length - 1;
                          const abbr = getClubAbbr(teamName);
                          const badgeColor = BADGE_COLORS[idx % BADGE_COLORS.length];

                          return (
                            <tr
                              key={`${row[0]}-${idx}`}
                              className={cn(
                                'hover:bg-muted/40 transition-colors',
                                isPromotion && 'bg-primary/[0.04]',
                                isRelegation && 'bg-rose-500/[0.03]',
                              )}
                            >
                              {/* Position */}
                              <td className="text-center py-3 px-3">
                                <span className="inline-flex items-center justify-center gap-0.5">
                                  <span className={cn(
                                    'font-black tabular-nums',
                                    pos === 1 && 'text-primary text-base',
                                    pos <= 3 && pos > 1 && 'text-foreground',
                                  )}>{pos}</span>
                                  <PositionArrow teamName={teamName} currentPos={pos} />
                                </span>
                              </td>

                              {/* Club name + badge */}
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleTeamScheduleClick(teamName)}
                                  className="flex items-center gap-2.5 text-left group w-full"
                                >
                                  <span className={cn(
                                    'inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black shrink-0',
                                    badgeColor,
                                  )}>{abbr}</span>
                                  <span className={cn(
                                    'font-bold group-hover:text-primary transition-colors text-sm truncate',
                                    pos <= 3 ? 'text-foreground' : 'text-foreground/80',
                                  )}>{teamName}</span>
                                </button>
                              </td>

                              {/* SP */}
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-medium">{displayValue(row[4])}</td>

                              {/* S U N */}
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-black text-emerald-600 dark:text-emerald-400 hidden sm:table-cell">
                                {rec ? rec.s : '–'}
                              </td>
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-medium text-muted-foreground hidden sm:table-cell">
                                {rec ? rec.u : '–'}
                              </td>
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-black text-rose-500 hidden sm:table-cell">
                                {rec ? rec.n : '–'}
                              </td>

                              {/* HOLZ+ HOLZ- */}
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-medium text-emerald-700 dark:text-emerald-400 hidden md:table-cell">{displayValue(row[7])}</td>
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-medium text-rose-500 hidden md:table-cell">{displayValue(row[10])}</td>

                              {/* SP (Spielpunkte) */}
                              <td className="text-center py-3 px-2 tabular-nums text-sm font-medium hidden lg:table-cell">{`${row[7]}:${row[10]}`}</td>

                              {/* MP — bold brand */}
                              <td className="text-center py-3 px-3">
                                <span className={cn(
                                  'font-black tabular-nums',
                                  pos <= 3 ? 'text-primary text-lg' : 'text-foreground text-base',
                                )}>{displayValue(row[13])}</span>
                              </td>

                              {/* FORM squares */}
                              <td className="text-center py-3 px-3 hidden md:table-cell">
                                <span className="inline-flex items-center gap-0.5">
                                  {form.length === 0 && <span className="text-muted-foreground/30 text-[10px]">–</span>}
                                  {form.map((r, i) => (
                                    <span key={i} className={cn(
                                      'w-3.5 h-3.5 rounded-sm inline-block',
                                      r === 'W' && 'bg-emerald-500',
                                      r === 'D' && 'bg-amber-400',
                                      r === 'L' && 'bg-rose-500',
                                    )} title={r === 'W' ? 'Sieg' : r === 'D' ? 'Unentschieden' : 'Niederlage'} />
                                  ))}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="border-t border-border px-5 py-3 flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-[2px] bg-primary/40 inline-block" />
                      Aufstieg / Playoff
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-[2px] bg-rose-500/30 inline-block" />
                      Abstieg
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Sieg</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Niederlage</span>
                    </span>
                  </div>
                </div>
              </section>
            )}

            {filteredPlayers.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-4 px-1">
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Einzelwertung</h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{filteredPlayers.length} Spieler</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent hidden md:block" />
                </div>
                <div className="rounded-[2rem] border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th onClick={() => handleSort('rank')} className="cursor-pointer hover:bg-accent/50 w-10 text-center py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">#</th>
                          <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-accent/50 text-left py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[160px]">Spieler</th>
                          <th onClick={() => handleSort('club')} className="cursor-pointer hover:bg-accent/50 text-left py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Klub</th>
                          <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-accent/50 text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Kat.</th>
                          <th onClick={() => handleSort('totalGames')} className="cursor-pointer hover:bg-accent/50 text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sp.</th>
                          <th onClick={() => handleSort('average')} className="cursor-pointer hover:bg-accent/50 text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-primary">Schnitt</th>
                          <th onClick={() => handleSort('points')} className="cursor-pointer hover:bg-accent/50 text-center py-3 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">MP</th>
                          <th onClick={() => handleSort('best')} className="cursor-pointer hover:bg-accent/50 text-center py-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Best</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPlayers.map((player, index) => {
                          const rank = Number(player.rank);
                          const isTop = rank <= 3;
                          return (
                            <tr
                              key={player.id ?? index}
                              onClick={() => handlePlayerClick(player.name || '')}
                              className={cn(
                                'cursor-pointer hover:bg-muted/40 transition-colors',
                                isTop && 'bg-primary/[0.04]',
                              )}
                            >
                              <td className="text-center py-3 px-3">
                                <span className="inline-flex items-center justify-center gap-0.5">
                                  <span className={cn('font-black tabular-nums', isTop && 'text-primary')}>{displayValue(player.rank)}</span>
                                  <RankArrow name={String(player.name ?? '')} currentRank={rank} />
                                </span>
                              </td>
                              <td className="py-3 px-3 font-bold">{displayValue(player.name)}</td>
                              <td className="py-3 px-3 text-sm text-muted-foreground hidden sm:table-cell">{displayValue(player.club)}</td>
                              <td className="text-center py-3 px-2 text-xs text-muted-foreground hidden lg:table-cell">{displayValue(player.category)}</td>
                              <td className="text-center py-3 px-2 tabular-nums">{formatNumber(player.gamesTotal)}</td>
                              <td className="text-center py-3 px-2 font-black tabular-nums text-primary">{displayValue(player.avgTotal)}</td>
                              <td className="text-center py-3 px-3 font-bold tabular-nums">{formatNumber(player.mpTotal)}</td>
                              <td className="text-center py-3 px-2 tabular-nums hidden md:table-cell">{formatNumber(player.bestGame)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && standings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Keine Daten gefunden</p>
          </div>
        )}
      </main>
    </div>
  );
}
