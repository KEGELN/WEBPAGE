'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameResultTable from '@/components/GameResultTable';

interface ClubHistoryEntry {
  gameId: string;
  date: string | null;
  time: string | null;
  league: string | null;
  spieltag: string | null;
  opponentClub: string | null;
  result: string | null;
  teamResult: string | null;
  side: 'home' | 'away';
}

interface ClubProfile {
  found: boolean;
  clubName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  history?: ClubHistoryEntry[];
}

interface ClubSearchMatch {
  name: string;
  gameCount: number;
}

type GameDetailCell = string | number | null | undefined;

export default function ClubClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clubName = searchParams.get('name');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClubSearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<string, GameDetailCell[][]>>({});

  useEffect(() => {
    if (!clubName) return;

    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mirror/club?name=${encodeURIComponent(clubName)}`);
        const payload = (await res.json()) as ClubProfile;
        if (!cancelled) {
          setProfile(payload);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('Vereinsdaten konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/mirror/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }
        const payload = (await res.json()) as { clubs: ClubSearchMatch[] };
        if (!cancelled) {
          setSearchResults(payload.clubs || []);
        }
      } catch (searchError) {
        console.error('Club search failed', searchError);
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const openClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      const first = searchResults[0];
      setQuery(first.name);
      setSearchResults([]);
      router.push(`/club?name=${encodeURIComponent(first.name)}`);
      return;
    }
    if (!query.trim()) return;
    router.push(`/club?name=${encodeURIComponent(query.trim())}`);
  };

  const selectClubResult = (name: string) => {
    setQuery(name);
    setSearchResults([]);
    router.push(`/club?name=${encodeURIComponent(name)}`);
  };

  const toggleGame = async (gameId: string) => {
    const next = openGameId === gameId ? null : gameId;
    setOpenGameId(next);
    if (!next || gameDetails[gameId]) return;

    const res = await fetch(`/api/mirror/game?gameId=${encodeURIComponent(gameId)}`);
    const payload = (await res.json()) as { rows: GameDetailCell[][] };
    setGameDetails((prev) => ({ ...prev, [gameId]: payload.rows || [] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-3xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Vereinsprofil</div>
              <h1 className="text-3xl font-bold">{clubName || 'Verein'}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Gespiegelte Spielhistorie und Ergebnisdetails.</p>
            </div>
            <div className="w-full max-w-md">
              <form onSubmit={openClub} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Verein suchen..."
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="submit" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                  Öffnen
                </button>
              </form>
              {(searchLoading || searchResults.length > 0) && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  {searchLoading && <div className="px-4 py-3 text-sm text-muted-foreground">Suche in allen Saisons...</div>}
                  {!searchLoading &&
                    searchResults.map((result) => (
                      <button
                        key={result.name}
                        type="button"
                        onClick={() => selectClubResult(result.name)}
                        className="flex w-full items-start justify-between gap-4 border-t border-border px-4 py-3 text-left first:border-t-0 hover:bg-muted/30"
                      >
                        <div className="font-semibold">{result.name}</div>
                        <div className="text-xs text-muted-foreground">{result.gameCount} Spiele</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && <LoadingSpinner label="Vereinsdaten werden geladen..." size="lg" overlay />}
        {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">{error}</div>}

        {!loading && profile?.found && (
          <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-[10px] uppercase text-muted-foreground">Spiele</div><div className="mt-1 text-2xl font-bold">{profile.gamesPlayed}</div></div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-[10px] uppercase text-muted-foreground">Siege</div><div className="mt-1 text-2xl font-bold">{profile.wins}</div></div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-[10px] uppercase text-muted-foreground">Unentschieden</div><div className="mt-1 text-2xl font-bold">{profile.draws}</div></div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="text-[10px] uppercase text-muted-foreground">Niederlagen</div><div className="mt-1 text-2xl font-bold">{profile.losses}</div></div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Historie</div>
              <h2 className="mt-1 text-2xl font-bold">Letzte Spiele</h2>
              <div className="mt-6 space-y-4">
                {profile.history?.map((entry) => (
                  <div key={`${entry.gameId}-${entry.date}`} className="rounded-2xl border border-border bg-muted/20 p-5">
                    <button type="button" className="w-full text-left" onClick={() => void toggleGame(entry.gameId)}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {entry.spieltag || 'Spiel'} · {entry.league || 'Liga unbekannt'}
                          </div>
                          <div className="mt-1 text-lg font-bold">
                            {profile.clubName} vs {entry.opponentClub}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {[entry.date, entry.time].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background px-4 py-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Ergebnis</div>
                          <div className="text-lg font-bold">{entry.result || entry.teamResult || '-'}</div>
                        </div>
                      </div>
                    </button>

                    {openGameId === entry.gameId && <GameResultTable rows={gameDetails[entry.gameId] || []} />}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
