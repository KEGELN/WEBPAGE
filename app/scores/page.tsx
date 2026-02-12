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

  const playerService = new PlayerService();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const seasonData = await apiService.getCurrentSeason();
        setSeasons(seasonData);

        const leagueData = await apiService.getLeagues();
        setLeagues(leagueData);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

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
                onChange={(e) => setSelectedSeason(e.target.value)}
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

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="min-w-full bg-card rounded-2xl overflow-hidden border border-border">
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
