'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';

type SearchResult = {
  id: string;
  type: string;
  name: string;
  description: string;
};

export default function SearchClient() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/mirror/search?q=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }
        const payload = (await res.json()) as {
          players: Array<{ id: string; name: string; club: string; gameCount: number }>;
          clubs: Array<{ name: string; gameCount: number }>;
        };

        const formattedResults: SearchResult[] = [
          ...payload.clubs.map(club => ({
            id: club.name,
            type: 'Club',
            name: club.name,
            description: `${club.gameCount} gespiegelte Spiele`
          })),
          ...payload.players.map(player => ({
            id: player.id,
            type: 'Player',
            name: player.name,
            description: `${player.club || 'Kein Verein'} · ${player.gameCount} Spiele`
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

    void performSearch();
  }, [searchTerm]);

  const [filter, setFilter] = useState<'all' | 'clubs' | 'players'>('all');

  const filteredResults = results.filter(result => {
    if (filter === 'all') return true;
    if (filter === 'clubs') return result.type.toLowerCase().includes('club') || result.type.toLowerCase() === 'team';
    if (filter === 'players') return result.type.toLowerCase().includes('player');
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-3xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Mirror Search</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Suche</h1>
          <p className="text-muted-foreground">
            {searchTerm ? `Ergebnisse für "${searchTerm}"` : 'Spieler und Vereine aus dem gespiegelten Sportwinner-Bestand.'}
          </p>

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
          </div>
        </div>

        {loading && <LoadingSpinner label="Loading search results..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && filteredResults.length > 0 && (
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
            {filteredResults.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.type === 'Player' ? `/player?id=${encodeURIComponent(result.id)}` : `/club?name=${encodeURIComponent(result.name)}`}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/20"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{result.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{result.description}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                    {result.type}
                  </span>
                </div>
                <div className="mt-4 text-sm font-medium text-primary group-hover:underline">
                  {result.type === 'Player' ? 'Spielerprofil öffnen' : 'Vereinsseite öffnen'}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && filteredResults.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Keine Treffer für &quot;{searchTerm}&quot;
            </p>
          </div>
        )}

        {!searchTerm && (
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Spieler und Vereine suchen</h2>
            <div className="bg-muted rounded-xl p-8 text-center">
              <p className="text-muted-foreground">Suche nach einem Namen, um gespiegelte Historien und Ergebnisse zu öffnen.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
