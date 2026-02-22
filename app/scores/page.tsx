'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from '@/components/menubar';
import PlayerService from '@/lib/player-service';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ScoresPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [spieltage, setSpieltage] = useState<any[]>([]);
  const [selectedSpieltag, setSelectedSpieltag] = useState<string>('100');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsSort, setStandingsSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const playerService = new PlayerService();
  const apiService = ApiService.getInstance();

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
      setSelectedLeague(leagues[0].liga_id);
    }
  }, [leagues, selectedLeague]);

  useEffect(() => {
    const fetchLeaguesForSeason = async () => {
      if (!selectedSeason) return;
      try {
        const leagueData = await apiService.getLeagues(selectedSeason);
        setLeagues(leagueData);
        setSelectedLeague((prev) => {
          if (leagueData.length === 0) return '';
          const hasPrevious = leagueData.some((league) => String(league.liga_id) === String(prev));
          return hasPrevious ? prev : String(leagueData[0].liga_id);
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
        setSelectedSpieltag('100');
      } catch (err) {
        console.error('Error fetching spieltage:', err);
      }
    };

    fetchSpieltage();
  }, [selectedSeason, selectedLeague]);

  useEffect(() => {
    if (players && players.length > 0) {
      const uniqueCategories = Array.from(new Set(players.map(player => player.category || 'Männer'))).sort();
      setCategories(uniqueCategories);
    }
  }, [players]);

  const displayValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && !Number.isFinite(value)) return '-';
    return value;
  };

  const formatNumber = (value: any) => {
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
    // Force a fresh data chain for the new season.
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
      } catch (err) {
        setError('Failed to load scores. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSeason, selectedLeague, selectedSpieltag]);

  useEffect(() => {
    const fetchStandings = async () => {
      if (!selectedSeason || !selectedLeague || !selectedSpieltag) return;
      setStandingsLoading(true);
      try {
        const spieltagNr = Number(selectedSpieltag);
        const data = await apiService.getStandingsRaw(selectedLeague, selectedSeason, spieltagNr, 0);
        setStandings(data);
      } catch (err) {
        console.error('Error fetching standings:', err);
      } finally {
        setStandingsLoading(false);
      }
    };

    fetchStandings();
  }, [selectedSeason, selectedLeague, selectedSpieltag]);

  const sortedPlayers = [...players].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any, bValue: any;
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
        aValue = parseInt(a.gamesTotal || a.totalGames || a.games || 0);
        bValue = parseInt(b.gamesTotal || b.totalGames || b.games || 0);
        break;
      case 'average':
        aValue = parseFloat((a.avgTotal || a.average || a.schnitt || '0').replace(',', '.'));
        bValue = parseFloat((b.avgTotal || b.average || b.schnitt || '0').replace(',', '.'));
        break;
      case 'points':
        aValue = parseInt(a.mpTotal || a.points || 0);
        bValue = parseInt(b.mpTotal || b.points || 0);
        break;
      case 'homeGames':
        aValue = parseInt(a.gamesHome || a.homeGames || 0);
        bValue = parseInt(b.gamesHome || b.homeGames || 0);
        break;
      case 'homeAverage':
        aValue = parseFloat((a.avgHome || a.homeAverage || '0').replace(',', '.'));
        bValue = parseFloat((b.avgHome || b.homeAverage || '0').replace(',', '.'));
        break;
      case 'homePoints':
        aValue = parseInt(a.mpHome || a.homePoints || 0);
        bValue = parseInt(b.mpHome || b.homePoints || 0);
        break;
      case 'awayGames':
        aValue = parseInt(a.gamesAway || a.awayGames || 0);
        bValue = parseInt(b.gamesAway || b.awayGames || 0);
        break;
      case 'awayAverage':
        aValue = parseFloat((a.avgAway || a.awayAverage || '0').replace(',', '.'));
        bValue = parseFloat((b.avgAway || b.awayAverage || '0').replace(',', '.'));
        break;
      case 'awayPoints':
        aValue = parseInt(a.mpAway || a.awayPoints || 0);
        bValue = parseInt(b.mpAway || b.awayPoints || 0);
        break;
      case 'best':
        aValue = parseInt(a.bestGame || a.best || 0);
        bValue = parseInt(b.bestGame || b.best || 0);
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

  const handlePlayerClick = (playerName: string) => {
    router.push(`/search?q=${encodeURIComponent(playerName)}`);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Schnittliste</div>
              <h1 className="text-3xl font-bold text-foreground">Scores</h1>
              <p className="text-sm text-muted-foreground">Durchschnittswerte und Matchpunkte der Spieler.</p>
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
          </div>

          <div className="mt-5 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
              <label htmlFor="seasonFilter" className="text-sm font-medium text-foreground mb-1">
                Saison
              </label>
              <select
                id="seasonFilter"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Saisons</option>
                {seasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.yearof_season} (ID: {season.season_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="leagueFilter" className="text-sm font-medium text-foreground mb-1">
                Liga
              </label>
              <select
                id="leagueFilter"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Ligen</option>
                {leagues.map((league) => (
                  <option key={league.liga_id} value={league.liga_id}>
                    {league.name_der_liga}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="categoryFilter" className="text-sm font-medium text-foreground mb-1">
                Kategorie
              </label>
              <select
                id="categoryFilter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="spieltagFilter" className="text-sm font-medium text-foreground mb-1">
                Spieltag
              </label>
              <select
                id="spieltagFilter"
                value={selectedSpieltag}
                onChange={(e) => setSelectedSpieltag(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="100">Aktuell (100)</option>
                {spieltage.length === 0 && <option value="">Keine Spieltage</option>}
                {spieltage.map((spieltag: any) => (
                  <option key={spieltag.id} value={spieltag.nr}>
                    {spieltag.label}{spieltag.status === '1' ? ' (Aktuell)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <LoadingSpinner label="Lade Scores..." />
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!error && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Tabelle</h2>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Spieltag {selectedSpieltag === '100' ? 'Aktuell' : selectedSpieltag}
                </span>
              </div>

              {standingsLoading && <LoadingSpinner label="Lade Tabelle..." className="py-6" size="sm" />}

              {!standingsLoading && standings.length > 0 && (
                (() => {
                  const sortedStandings = [...standings].sort((a, b) => {
                    if (!standingsSort) return 0;
                    const getValue = (row: any[]) => {
                      switch (standingsSort.key) {
                        case 'position':
                          return Number(row[1] || 0);
                        case 'team':
                          return String(row[2] || '');
                        case 'spTotal':
                          return Number(row[4] || 0);
                        case 'tpTotal':
                          return Number(row[7] || 0) - Number(row[10] || 0);
                        case 'mpTotal':
                          return Number(row[13] || 0);
                        case 'spHome':
                          return Number(row[5] || 0);
                        case 'tpHome':
                          return Number(row[8] || 0) - Number(row[11] || 0);
                        case 'mpHome':
                          return Number(row[14] || 0);
                        case 'spAway':
                          return Number(row[6] || 0);
                        case 'tpAway':
                          return Number(row[9] || 0) - Number(row[12] || 0);
                        case 'mpAway':
                          return Number(row[15] || 0);
                        default:
                          return 0;
                      }
                    };
                    const aVal = getValue(a);
                    const bVal = getValue(b);
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                      return standingsSort.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                    }
                    if (aVal < bVal) return standingsSort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return standingsSort.direction === 'asc' ? 1 : -1;
                    return 0;
                  });

                  return (
                    <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-gradient-to-br from-red-500/10 via-background to-rose-500/5 shadow-sm">
                      <table className="min-w-full bg-card/80 rounded-2xl overflow-hidden border border-border">
                        <thead className="bg-muted/70">
                          <tr>
                            <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('position')}>Pl.</th>
                            <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent/50 min-w-[16rem]" onClick={() => handleStandingsSort('team')}>Mannschaft</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('spTotal')}>Sp.</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('tpTotal')}>TP</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('mpTotal')}>MP</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('spHome')}>Sp. (Heim)</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('tpHome')}>TP (Heim)</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('mpHome')}>MP (Heim)</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('spAway')}>Sp. (Ausw)</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('tpAway')}>TP (Ausw)</th>
                            <th className="py-3 px-4 text-center text-foreground cursor-pointer hover:bg-accent/50" onClick={() => handleStandingsSort('mpAway')}>MP (Ausw)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStandings.map((row, idx) => {
                            const pos = row[1];
                            const team = row[2];
                            const spTotal = row[4];
                            const spHome = row[5];
                            const spAway = row[6];
                            const tpTotal = `${row[7]}-${row[10]}`;
                            const tpHome = `${row[8]}-${row[11]}`;
                            const tpAway = `${row[9]}-${row[12]}`;
                            const mpTotal = row[13];
                            const mpHome = row[14];
                            const mpAway = row[15];

                            return (
                              <tr key={`${row[0]}-${idx}`} className="border-b border-border">
                                <td className="py-3 px-4">{displayValue(pos)}</td>
                                <td className="py-3 px-4 font-medium text-foreground min-w-[16rem] whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleTeamScheduleClick(String(team || ''))}
                                    className="text-left underline decoration-dotted underline-offset-4 hover:text-primary"
                                  >
                                    {displayValue(team)}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-center">{displayValue(spTotal)}</td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">{displayValue(tpTotal)}</td>
                                <td className="py-3 px-4 text-center">{displayValue(mpTotal)}</td>
                                <td className="py-3 px-4 text-center">{displayValue(spHome)}</td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">{displayValue(tpHome)}</td>
                                <td className="py-3 px-4 text-center">{displayValue(mpHome)}</td>
                                <td className="py-3 px-4 text-center">{displayValue(spAway)}</td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">{displayValue(tpAway)}</td>
                                <td className="py-3 px-4 text-center">{displayValue(mpAway)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>
          </>
        )}

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-gradient-to-br from-red-500/10 via-background to-rose-500/5 shadow-sm">
            <table className="min-w-full bg-card/80 rounded-2xl overflow-hidden border border-border">
              <thead className="bg-muted/70 sticky top-0">
                <tr>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('rank')}>
                    Pl.
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('name')}>
                    Spieler
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('category')}>
                    Kategorie
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('club')}>
                    Klub
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('totalGames')}>
                    Sp.
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('average')}>
                    ∅
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSort('points')}>
                    MP
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('homeGames')}>
                    Sp. (Heim)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('homeAverage')}>
                    ∅ (Heim)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('homePoints')}>
                    MP (Heim)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('awayGames')}>
                    Sp. (Ausw)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('awayAverage')}>
                    ∅ (Ausw)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('awayPoints')}>
                    MP (Ausw)
                  </th>
                  <th className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors hidden md:table-cell" onClick={() => handleSort('best')}>
                    Best
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, index) => (
                  <tr
                    key={player.id ?? index}
                    className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handlePlayerClick(player.name)}
                  >
                    <td className="py-3 px-4">{displayValue(player.rank)}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{displayValue(player.name)}</td>
                    <td className="py-3 px-4">{displayValue(player.category)}</td>
                    <td className="py-3 px-4">{displayValue(player.club)}</td>
                    <td className="py-3 px-4">{formatNumber(player.gamesTotal)}</td>
                    <td className="py-3 px-4">{displayValue(player.avgTotal)}</td>
                    <td className="py-3 px-4">{formatNumber(player.mpTotal)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{formatNumber(player.gamesHome)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{displayValue(player.avgHome)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{formatNumber(player.mpHome)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{formatNumber(player.gamesAway)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{displayValue(player.avgAway)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{formatNumber(player.mpAway)}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{formatNumber(player.bestGame)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Keine Scores gefunden</p>
          </div>
        )}
      </main>
    </div>
  );
}
