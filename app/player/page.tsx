'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MagicBento from '@/components/MagicBento';
import Menubar from '@/components/menubar';
import PlayerService from '@/lib/player-service';
import PlayerStatsBento from '@/components/PlayerStatsBento';
import ApiService from '@/lib/api-service';

export default function Player() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerId = searchParams.get('id');
  const [players, setPlayers] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const playerService = new PlayerService();
  const apiService = ApiService.getInstance();

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch seasons
        const seasonData = await apiService.getCurrentSeason();
        setSeasons(seasonData);

        // Fetch leagues
        const leagueData = await apiService.getLeagues();
        setLeagues(leagueData);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

  // Extract unique categories from players data when players change
  useEffect(() => {
    if (players && players.length > 0) {
      const uniqueCategories = Array.from(
        new Set(players.map(player => player.category || 'Männer'))
      ).sort();
      setCategories(uniqueCategories);
    }
  }, [players]);

  // Fetch data based on whether we have a player ID
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (playerId) {
          // Fetch specific player stats
          const stats = await playerService.getPlayerStats(playerId);
          setPlayerStats(stats);
        } else {
          // Fetch player schnitliste (list of players) with season, league, and category filters
          const playerList = await playerService.getPlayerSchnitliste(selectedSeason, selectedLeague);
          setPlayers(playerList);
        }
      } catch (err) {
        setError('Failed to load player data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch player list when not viewing a specific player
    if (!playerId) {
      fetchData();
    }
  }, [playerId, selectedSeason, selectedLeague]);

  // Sort players based on sortConfig
  const sortedPlayers = [...players].sort((a, b) => {
    if (!sortConfig) return 0;

    // Determine the values to compare based on the sort key
    let aValue: any, bValue: any;
    switch (sortConfig.key) {
      case 'rank':
        // For rank, we don't sort by this column specifically, as it's just the display index
        // If sorting by rank, we can sort by average (schnitt) as the primary metric
        aValue = parseFloat((a.average || a.schnitt || '0').replace(',', '.'));
        bValue = parseFloat((b.average || b.schnitt || '0').replace(',', '.'));
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
        aValue = parseInt(a.totalGames || a.games || 0);
        bValue = parseInt(b.totalGames || b.games || 0);
        break;
      case 'average':
        // Convert German decimal notation (comma) to a number for comparison
        aValue = parseFloat((a.average || a.schnitt || '0').replace(',', '.'));
        bValue = parseFloat((b.average || b.schnitt || '0').replace(',', '.'));
        break;
      case 'points':
        aValue = parseInt(a.points || 0);
        bValue = parseInt(b.points || 0);
        break;
      case 'homeGames':
        aValue = parseInt(a.homeGames || 0);
        bValue = parseInt(b.homeGames || 0);
        break;
      case 'homeAverage':
        aValue = parseFloat((a.homeAverage || '0').replace(',', '.'));
        bValue = parseFloat((b.homeAverage || '0').replace(',', '.'));
        break;
      case 'homePoints':
        aValue = parseInt(a.homePoints || 0);
        bValue = parseInt(b.homePoints || 0);
        break;
      case 'awayGames':
        aValue = parseInt(a.awayGames || 0);
        bValue = parseInt(b.awayGames || 0);
        break;
      case 'awayAverage':
        aValue = parseFloat((a.awayAverage || '0').replace(',', '.'));
        bValue = parseFloat((b.awayAverage || '0').replace(',', '.'));
        break;
      case 'awayPoints':
        aValue = parseInt(a.awayPoints || 0);
        bValue = parseInt(b.awayPoints || 0);
        break;
      case 'best':
        aValue = parseInt(a.best || 0);
        bValue = parseInt(b.best || 0);
        break;
      default:
        return 0;
    }

    // Perform the comparison
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Filter players based on selected category
  const filteredPlayers = selectedCategory
    ? sortedPlayers.filter(player => (player.category || 'Männer') === selectedCategory)
    : sortedPlayers;

  // Handle season filter change
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeason(e.target.value);
  };

  // Handle league filter change
  const handleLeagueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLeague(e.target.value);
  };

  const handlePlayerClick = (playerName: string) => {
    // Redirect to search page with the player's name pre-filled
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {playerId ? 'Player Details' : 'Player Overview'}
          </h1>
          <p className="text-muted-foreground">
            {playerId
              ? `Details for player: ${playerStats?.playerName || 'Loading...'}`
              : 'Browse player statistics and information'}
          </p>

          {/* Filter controls for seasons, leagues, and categories */}
          {!playerId && (
            <div className="mt-4 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col">
                <label htmlFor="seasonFilter" className="text-sm font-medium text-foreground mb-1">
                  Season
                </label>
                <select
                  id="seasonFilter"
                  value={selectedSeason}
                  onChange={handleSeasonChange}
                  className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Seasons</option>
                  {seasons.map((season) => (
                    <option key={season.season_id} value={season.season_id}>
                      {season.yearof_season} (ID: {season.season_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="leagueFilter" className="text-sm font-medium text-foreground mb-1">
                  League
                </label>
                <select
                  id="leagueFilter"
                  value={selectedLeague}
                  onChange={handleLeagueChange}
                  className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Leagues</option>
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
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading player data...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && !playerId && players.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full bg-card rounded-lg overflow-hidden border border-border">
              <thead className="bg-muted">
                <tr>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('rank')}
                  >
                    Pl.
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Spieler
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('club')}
                  >
                    Klub
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('totalGames')}
                  >
                    Sp.
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('average')}
                  >
                    ∅
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSort('points')}
                  >
                    MP
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('homeGames')}
                  >
                    Sp. (Heim)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('homeAverage')}
                  >
                    ∅ (Heim)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('homePoints')}
                  >
                    MP (Heim)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('awayGames')}
                  >
                    Sp. (Ausw)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('awayAverage')}
                  >
                    ∅ (Ausw)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('awayPoints')}
                  >
                    MP (Ausw)
                  </th>
                  <th
                    className="py-3 px-4 text-left text-foreground cursor-pointer hover:bg-accent transition-colors less720px"
                    onClick={() => handleSort('best')}
                  >
                    Best
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, index) => (
                  <tr
                    key={player.id || index}
                    className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handlePlayerClick(player.name)}
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center">
                        <span>{player.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground less720px">{player.category || 'Männer'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{player.club || 'N/A'}</td>
                    <td className="py-3 px-4 text-foreground">{player.totalGames || player.games || 4}</td>
                    <td className="py-3 px-4 text-foreground">{player.average || player.schnitt || '594,63'}</td>
                    <td className="py-3 px-4 text-foreground">{player.points || 5}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.homeGames || 2}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.homeAverage || '600,25'}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.homePoints || 3}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.awayGames || 2}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.awayAverage || '589,12'}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.awayPoints || 2}</td>
                    <td className="py-3 px-4 text-foreground less720px">{player.best || '654'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && !playerId && players.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No players found</p>
          </div>
        )}

        {!loading && !error && playerId && playerStats && (
          <div className="space-y-8">
            {/* Player Stats Summary as Magic Bento Cards with Purple Glow Theme */}
            <div className="card-grid bento-section max-w-6xl mx-auto">
              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">
                    Games Played
                  </div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.gamesPlayed}</h2>
                  <p className="magic-bento-card__description">Total games played</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">
                    Wins
                  </div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.wins}</h2>
                  <p className="magic-bento-card__description">Total wins</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">
                    Losses
                  </div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.losses}</h2>
                  <p className="magic-bento-card__description">Total losses</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">
                    Ranking
                  </div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.ranking}</h2>
                  <p className="magic-bento-card__description">Current ranking</p>
                </div>
              </div>
            </div>

            {/* Player Performance Bento Card with Purple Glow Theme */}
            <div className="mt-12 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Player Performance</h2>
              <div className="card-grid bento-section">
                <div className="magic-bento-card magic-bento-card--border-glow">
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">
                      Player Stats
                    </div>
                  </div>
                  <div className="magic-bento-card__content">
                    <h2 className="magic-bento-card__title text-xl font-semibold">{playerStats.playerName}</h2>
                    <p className="magic-bento-card__description">Player Performance Statistics</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Games Played</span>
                        <span className="font-semibold text-primary">{playerStats.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Wins</span>
                        <span className="font-semibold text-primary">{playerStats.wins}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Losses</span>
                        <span className="font-semibold text-primary">{playerStats.losses}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Ranking</span>
                        <span className="font-semibold text-primary">{playerStats.ranking}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Average Score</span>
                        <span className="font-semibold text-primary">{playerStats.averageScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Player Stats as Magic Bento Cards with Purple Glow Theme */}
            <div className="mt-8 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Detailed Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="magic-bento-card magic-bento-card--border-glow p-6">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Player Name</h3>
                  <p className="text-foreground/80">{playerStats.playerName}</p>
                </div>
                <div className="magic-bento-card magic-bento-card--border-glow p-6">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Average Score</h3>
                  <p className="text-foreground/80">{playerStats.averageScore}</p>
                </div>
              </div>
            </div>

            {/* Back to player list */}
            <div className="mt-8 text-center">
              <button
                onClick={() => router.push('/player')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Back to Player List
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
