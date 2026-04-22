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
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-md overflow-hidden">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2">
            <div>
              <CardDescription className="uppercase tracking-wide">Schnittliste</CardDescription>
              <CardTitle className="text-3xl font-bold">Scores</CardTitle>
              <CardDescription>Durchschnittswerte und Matchpunkte der Spieler.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Spieler</div>
                <div className="text-base font-semibold text-foreground">{formatNumber(players.length)}</div>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Kategorien</div>
                <div className="text-base font-semibold text-foreground">{formatNumber(categories.length)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end mt-4">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="seasonFilter" className="text-sm font-medium">Saison</label>
                <Select
                  id="seasonFilter"
                  value={selectedSeason}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="w-[180px]"
                >
                  <option value="">Alle Saisons</option>
                  {seasons.map((season) => (
                    <option key={season.season_id} value={season.season_id}>
                      {season.yearof_season}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="leagueFilter" className="text-sm font-medium">Liga</label>
                <Select
                  id="leagueFilter"
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-[220px]"
                >
                  <option value="">Alle Ligen</option>
                  {leagues.map((league) => (
                    <option key={league.liga_id} value={league.liga_id}>
                      {league.name_der_liga}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="categoryFilter" className="text-sm font-medium">Kategorie</label>
                <Select
                  id="categoryFilter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-[180px]"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="spieltagFilter" className="text-sm font-medium">Spieltag</label>
                <Select
                  id="spieltagFilter"
                  value={selectedSpieltag}
                  onChange={(e) => setSelectedSpieltag(e.target.value)}
                  className="w-[180px]"
                >
                  <option value="100">Aktuell (100)</option>
                  {spieltage.map((spieltag) => (
                    <option key={spieltag.id} value={spieltag.nr}>
                      {spieltag.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading && <LoadingSpinner label="Lade Scores..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {standings.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-black tracking-tight uppercase">Tabelle</h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Spieltag {selectedSpieltag === '100' ? 'Aktuell' : selectedSpieltag}
                  </span>
                </div>

                <Card className="border border-border bg-gradient-to-br from-red-500/5 via-background to-rose-500/5 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2">
                        <TableHead onClick={() => handleStandingsSort('position')} className="cursor-pointer hover:bg-accent/50 w-14 text-center text-[10px] font-black uppercase tracking-widest">#</TableHead>
                        <TableHead onClick={() => handleStandingsSort('team')} className="cursor-pointer hover:bg-accent/50 min-w-[16rem] text-[10px] font-black uppercase tracking-widest">Mannschaft</TableHead>
                        <TableHead onClick={() => handleStandingsSort('spTotal')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest">Sp</TableHead>
                        <TableHead onClick={() => handleStandingsSort('tpTotal')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest">TP</TableHead>
                        <TableHead onClick={() => handleStandingsSort('mpTotal')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest">MP</TableHead>
                        <TableHead onClick={() => handleStandingsSort('spHome')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Sp(H)</TableHead>
                        <TableHead onClick={() => handleStandingsSort('tpHome')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">TP(H)</TableHead>
                        <TableHead onClick={() => handleStandingsSort('mpHome')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">MP(H)</TableHead>
                        <TableHead onClick={() => handleStandingsSort('spAway')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Sp(A)</TableHead>
                        <TableHead onClick={() => handleStandingsSort('tpAway')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">TP(A)</TableHead>
                        <TableHead onClick={() => handleStandingsSort('mpAway')} className="cursor-pointer hover:bg-accent/50 text-center text-[10px] font-black uppercase tracking-widest hidden md:table-cell">MP(A)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((row, idx) => {
                        const pos = Number(row[1]);
                        const isTop3 = pos <= 3;
                        return (
                        <TableRow key={`${row[0]}-${idx}`} className={isTop3 ? 'bg-primary/5' : ''}>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span className={`font-black tabular-nums text-sm ${isTop3 ? 'text-primary' : ''}`}>{pos}</span>
                              <PositionArrow teamName={String(row[2] ?? '')} currentPos={pos} />
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleTeamScheduleClick(String(row[2] || ''))}
                              className={`text-left font-bold hover:text-primary transition-colors ${isTop3 ? 'text-foreground' : 'text-foreground/80'}`}
                            >
                              {displayValue(row[2])}
                            </button>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{displayValue(row[4])}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm font-medium">{`${row[7]}:${row[10]}`}</TableCell>
                          <TableCell className="text-center tabular-nums font-black text-base text-primary">{displayValue(row[13])}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell">{displayValue(row[5])}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell font-medium">{`${row[8]}:${row[11]}`}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell">{displayValue(row[14])}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell">{displayValue(row[6])}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell font-medium">{`${row[9]}:${row[12]}`}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm hidden md:table-cell">{displayValue(row[15])}</TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            )}

            {filteredPlayers.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-semibold">Einzelwertung</h2>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {filteredPlayers.length} Spieler
                  </span>
                </div>
                <Card className="border border-border bg-gradient-to-br from-red-500/5 via-background to-rose-500/5 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort('rank')} className="cursor-pointer hover:bg-accent/50 w-12 text-center">Pl.</TableHead>
                        <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-accent/50 min-w-[14rem]">Spieler</TableHead>
                        <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-accent/50 hidden lg:table-cell">Kat.</TableHead>
                        <TableHead onClick={() => handleSort('club')} className="cursor-pointer hover:bg-accent/50">Klub</TableHead>
                        <TableHead onClick={() => handleSort('totalGames')} className="cursor-pointer hover:bg-accent/50 text-center">Sp.</TableHead>
                        <TableHead onClick={() => handleSort('average')} className="cursor-pointer hover:bg-accent/50 text-center">∅</TableHead>
                        <TableHead onClick={() => handleSort('points')} className="cursor-pointer hover:bg-accent/50 text-center">MP</TableHead>
                        <TableHead onClick={() => handleSort('best')} className="cursor-pointer hover:bg-accent/50 text-center hidden md:table-cell">Best</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player, index) => (
                        <TableRow 
                          key={player.id ?? index} 
                          className="cursor-pointer"
                          onClick={() => handlePlayerClick(player.name || '')}
                        >
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span className="font-black tabular-nums text-sm">{displayValue(player.rank)}</span>
                              <RankArrow name={String(player.name ?? '')} currentRank={Number(player.rank)} />
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{displayValue(player.name)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{displayValue(player.category)}</TableCell>
                          <TableCell className="text-sm">{displayValue(player.club)}</TableCell>
                          <TableCell className="text-center">{formatNumber(player.gamesTotal)}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{displayValue(player.avgTotal)}</TableCell>
                          <TableCell className="text-center font-bold">{formatNumber(player.mpTotal)}</TableCell>
                          <TableCell className="text-center hidden md:table-cell">{formatNumber(player.bestGame)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
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
