'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar.tsx';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  // State to hold search results
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get API instance
  const apiService = ApiService.getInstance();

  // Perform search when page loads or search term changes
  useEffect(() => {
    if (searchTerm) {
      performSearch(searchTerm);
    }
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      // Determine what type of search to perform based on the query
      // Search clubs, districts, leagues and players
      const [clubs, districts, leagues, players] = await Promise.all([
        apiService.searchClubs(query),
        apiService.getDistricts(),
        apiService.getLeagues(),
        apiService.searchPlayers(query)
      ]);

      // Filter results based on query
      const filteredDistricts = districts.filter(district =>
        district.name_des_bezirks.toLowerCase().includes(query.toLowerCase())
      );

      const filteredLeagues = leagues.filter(league =>
        league.name_der_liga.toLowerCase().includes(query.toLowerCase())
      );

      // Format the results
      const formattedResults = [
        ...clubs.map(club => ({
          id: club.nr_club,
          type: 'Club',
          name: club.name_klub,
          description: 'Kegel club'
        })),
        ...players.map(player => ({
          id: player.id,
          type: 'Player',
          name: player.name,
          description: `Player at ${player.club}`
        })),
        ...filteredDistricts.map(district => ({
          id: district.bezirk_id,
          type: 'District',
          name: district.name_des_bezirks,
          description: 'Region for kegel sport'
        })),
        ...filteredLeagues.map(league => ({
          id: league.liga_id,
          type: 'League',
          name: league.name_der_liga,
          description: league.kontakt_name ? `Contact: ${league.kontakt_name}` : 'Kegel league'
        }))
      ];

      setResults(formattedResults);
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [filter, setFilter] = useState<'all' | 'clubs' | 'players' | 'leagues'>('all');

  // Filter results based on selected filter
  const filteredResults = results.filter(result => {
    if (filter === 'all') return true;
    if (filter === 'clubs') return result.type.toLowerCase().includes('club') || result.type.toLowerCase() === 'team';
    if (filter === 'players') return result.type.toLowerCase().includes('player');
    if (filter === 'leagues') return result.type.toLowerCase().includes('league') || result.type.toLowerCase().includes('district');
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Search Results</h1>
          <p className="text-muted-foreground">
            {searchTerm ? `Results for "${searchTerm}"` : 'Enter a search term to begin'}
          </p>

          {/* Filter buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('clubs')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'clubs'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Clubs
            </button>
            <button
              onClick={() => setFilter('players')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'players'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setFilter('leagues')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'leagues'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Leagues & Districts
            </button>
          </div>
        </div>

        {loading && (
          <LoadingSpinner label="Loading search results..." />
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && filteredResults.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredResults.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{result.name}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{result.description}</p>
                  </div>
                  <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                    {result.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredResults.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No {filter !== 'all' ? filter : ''} results found for "{searchTerm}"
            </p>
          </div>
        )}

        {!searchTerm && (
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Search Kegel Clubs, Players & Leagues</h2>
            <div className="bg-muted rounded-xl p-8 text-center">
              <p className="text-muted-foreground">Enter a search term above to get started</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
