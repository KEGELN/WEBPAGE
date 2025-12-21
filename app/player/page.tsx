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
  const [seasons, setSeasons] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);

  const playerService = new PlayerService();
  const apiService = ApiService.getInstance();

  // Fetch seasons and leagues when component mounts
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
          // Fetch player schnitliste (list of players) with season and league filters
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

  // Handle season filter change
  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeason(e.target.value);
  };

  // Handle league filter change
  const handleLeagueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLeague(e.target.value);
  };

  const handlePlayerClick = (playerId: string) => {
    router.push(`/player?id=${playerId}`);
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

          {/* Filter controls for seasons and leagues */}
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
          <div className="overflow-x-auto">
            <table className="min-w-full bg-card rounded-lg overflow-hidden border border-border">
              <thead className="bg-muted">
                <tr>
                  <th className="py-3 px-4 text-left text-foreground">Rank</th>
                  <th className="py-3 px-4 text-left text-foreground">Name</th>
                  <th className="py-3 px-4 text-left text-foreground">Club</th>
                  <th className="py-3 px-4 text-left text-foreground">Category</th>
                  <th className="py-3 px-4 text-left text-foreground">Games</th>
                  <th className="py-3 px-4 text-left text-foreground">Wins</th>
                  <th className="py-3 px-4 text-left text-foreground">Losses</th>
                  <th className="py-3 px-4 text-left text-foreground">Total</th>
                  <th className="py-3 px-4 text-left text-foreground">Average</th>
                  <th className="py-3 px-4 text-left text-foreground">Schnitt</th>
                  <th className="py-3 px-4 text-left text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr
                    key={player.id || index}
                    className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <td className="py-3 px-4">{player.id}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{player.name}</td>
                    <td className="py-3 px-4 text-foreground">{player.club || 'N/A'}</td>
                    <td className="py-3 px-4 text-foreground">{player.category || 'Männer'}</td>
                    <td className="py-3 px-4 text-foreground">{player.games || 4}</td>
                    <td className="py-3 px-4 text-foreground">{player.wins || 4}</td>
                    <td className="py-3 px-4 text-foreground">{player.losses || 8}</td>
                    <td className="py-3 px-4 text-foreground">{player.total || 589}</td>
                    <td className="py-3 px-4 text-foreground">{player.average || '600,25'}</td>
                    <td className="py-3 px-4 text-foreground">{player.schnitt || '594,63'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayerClick(player.id);
                        }}
                        className="text-primary hover:underline"
                      >
                        View Details
                      </button>
                    </td>
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
