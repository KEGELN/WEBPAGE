'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Users, Search, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

type SearchResult = {
  id: string;
  type: 'Player' | 'Club';
  name: string;
  description: string;
  club?: string;
  gameCount: number;
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
            type: 'Club' as const,
            name: club.name,
            gameCount: club.gameCount,
            description: `${club.gameCount} gespiegelte Spiele`
          })),
          ...payload.players.map(player => ({
            id: player.id,
            type: 'Player' as const,
            name: player.name,
            club: player.club,
            gameCount: player.gameCount,
            description: `${player.club || 'Kein Verein'} · ${player.gameCount} Spiele`
          }))
        ];

        setResults(formattedResults);
      } catch (err) {
        setError('Suche fehlgeschlagen. Bitte versuche es erneut.');
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
    if (filter === 'clubs') return result.type === 'Club';
    if (filter === 'players') return result.type === 'Player';
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-md overflow-hidden">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardDescription className="uppercase tracking-wide">Mirror Search</CardDescription>
                <CardTitle className="text-3xl font-bold">Suchergebnisse</CardTitle>
                <CardDescription className="mt-1">
                  {searchTerm ? `Ergebnisse für "${searchTerm}"` : 'Suche nach Spielern und Vereinen.'}
                </CardDescription>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm h-fit">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    filter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilter('players')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    filter === 'players' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Spieler
                </button>
                <button
                  onClick={() => setFilter('clubs')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    filter === 'clubs' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  Vereine
                </button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading && <LoadingSpinner label="Suche läuft..." />}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-destructive text-center font-semibold">
              {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredResults.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResults.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.type === 'Player' ? `/player?id=${encodeURIComponent(result.id)}` : `/club?name=${encodeURIComponent(result.name)}`}
                className="group block h-full"
              >
                <Card className="h-full border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-lg ${result.type === 'Player' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        {result.type === 'Player' ? <User size={20} /> : <Users size={20} />}
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        result.type === 'Player' ? 'border-blue-500/20 bg-blue-500/5 text-blue-600' : 'border-amber-500/20 bg-amber-500/5 text-amber-600'
                      }`}>
                        {result.type === 'Player' ? 'Spieler' : 'Verein'}
                      </span>
                    </div>
                    <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">{result.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm line-clamp-2">
                      {result.description}
                    </CardDescription>
                    <div className="mt-6 flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                      ZUM PROFIL <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && filteredResults.length === 0 && searchTerm && (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-20 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg text-muted-foreground font-medium">
                Keine Treffer für &quot;{searchTerm}&quot; gefunden.
              </p>
              <Button variant="link" onClick={() => setFilter('all')} className="mt-2">Alle Filter zurücksetzen</Button>
            </CardContent>
          </Card>
        )}

        {!searchTerm && (
          <div className="py-20 text-center space-y-6">
            <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto border border-primary/10">
              <Search className="h-10 w-10 text-primary opacity-40" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold">Mirror Search</h2>
              <p className="text-muted-foreground mt-2">
                Suche nach Spielern oder Vereinen, um deren historische Ergebnisse und Statistiken aus dem Sportwinner-System zu sehen.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
