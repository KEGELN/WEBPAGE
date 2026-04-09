'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import PlayerService, { type PlayerHistoryEntry } from '@/lib/player-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import GameResultTable from '@/components/GameResultTable';

interface PlayerStats {
  found: boolean;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ranking: number | null;
  averageScore: string | number;
  clubs?: string[];
  history?: PlayerHistoryEntry[];
}

interface PlayerSearchMatch {
  name: string;
  club: string;
  gameCount: number;
}

type GameDetailsPayload = {
  header: Record<string, unknown> | null;
  rows: GameDetailRow[];
};

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

function parseHolz(value: string | null | undefined) {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) ? number : 0;
}

function buildPolyline(values: number[], width: number, height: number) {
  if (values.length === 0) return '';
  const topPadding = 10;
  const bottomPadding = 10;
  const min = Math.min(...values);
  const max = Math.max(...values, 1);
  const span = Math.max(max - min, 1);
  const drawableHeight = Math.max(height - topPadding - bottomPadding, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const normalized = (value - min) / span;
      const y = topPadding + (1 - normalized) * drawableHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

export default function PlayerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get('name') || searchParams.get('player') || searchParams.get('id');

  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<string, GameDetailRow[]>>({});

  const playerService = useMemo(() => new PlayerService(), []);
  const history = playerStats?.history || [];
  const graphValues = history.slice().reverse().map((entry) => parseHolz(entry.holz));

  useEffect(() => {
    if (!playerName) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const stats = (await playerService.getPlayerStats(playerName)) as PlayerStats;
        if (!cancelled) {
          setPlayerStats(stats);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Spielerdaten konnten nicht geladen werden. Bitte versuche es erneut.');
        }
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [playerName, playerService]);

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
        const payload = (await res.json()) as { players: PlayerSearchMatch[] };
        if (!cancelled) {
          setSearchResults(payload.players || []);
        }
      } catch (searchError) {
        console.error('Player search failed', searchError);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      const first = searchResults[0];
      setQuery(first.name);
      setSearchResults([]);
      router.push(`/player?name=${encodeURIComponent(first.name)}`);
      return;
    }
    if (!query.trim()) return;
    router.push(`/player?name=${encodeURIComponent(query.trim())}`);
  };

  const selectPlayerResult = (name: string) => {
    setQuery(name);
    setSearchResults([]);
    router.push(`/player?name=${encodeURIComponent(name)}`);
  };

  const toggleGame = async (gameId: string) => {
    const next = openGameId === gameId ? null : gameId;
    setOpenGameId(next);
    if (!next || gameDetails[gameId]) return;

    try {
      const res = await fetch(`/api/mirror/game?gameId=${encodeURIComponent(gameId)}`);
      if (!res.ok) {
        throw new Error(`Game details failed: ${res.status}`);
      }
      const payload = (await res.json()) as GameDetailsPayload;
      setGameDetails((prev) => ({ ...prev, [gameId]: payload.rows || [] }));
    } catch (detailError) {
      console.error('Failed to load game details', detailError);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-3xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Spielerprofil</div>
              <h1 className="text-3xl font-bold text-foreground">{playerName ? (playerStats?.playerName || playerName) : 'Spieler'}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {playerName
                  ? 'Gespiegelte Sportwinner-Historie mit Ergebnisdetails.'
                  : 'Suche einen Spieler, um Profil, Trend und letzte Ergebnisse zu sehen.'}
              </p>
            </div>
            <div className="w-full max-w-md">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Spielername suchen..."
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="submit" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                  Öffnen
                </button>
              </form>
              {(searchLoading || searchResults.length > 0) && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  {searchLoading && <div className="px-4 py-3 text-sm text-muted-foreground">Suche...</div>}
                  {!searchLoading &&
                    searchResults.map((result) => (
                      <button
                        key={`${result.name}-${result.club}`}
                        type="button"
                        onClick={() => selectPlayerResult(result.name)}
                        className="flex w-full items-start justify-between gap-4 border-t border-border px-4 py-3 text-left first:border-t-0 hover:bg-muted/30"
                      >
                        <div>
                          <div className="font-semibold">{result.name}</div>
                          <div className="text-xs text-muted-foreground">{result.club || 'Kein Verein'}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{result.gameCount} Spiele</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!playerName && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground">Kein Spieler ausgewählt. Gib oben einen vollständigen Namen ein oder nutze die Suche.</p>
          </div>
        )}

        {loading && <LoadingSpinner label="Spielerdaten werden geladen..." size="lg" overlay />}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && playerName && playerStats && !playerStats.found && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold">Kein Datensatz gefunden</h2>
            <p className="mt-2 text-muted-foreground">
              Für {playerName} gibt es noch keine importierten Sportwinner-Ergebnisse.
            </p>
          </div>
        )}

        {!loading && !error && playerName && playerStats?.found && (
          <div className="space-y-8">
            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Performance</div>
                <h2 className="mt-1 text-2xl font-bold">{playerStats.playerName}</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="text-[10px] uppercase text-muted-foreground">Spiele</div>
                    <div className="mt-1 text-2xl font-bold">{playerStats.gamesPlayed}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="text-[10px] uppercase text-muted-foreground">Siege</div>
                    <div className="mt-1 text-2xl font-bold">{playerStats.wins}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="text-[10px] uppercase text-muted-foreground">Niederlagen</div>
                    <div className="mt-1 text-2xl font-bold">{playerStats.losses}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="text-[10px] uppercase text-muted-foreground">Ø Holz</div>
                    <div className="mt-1 text-2xl font-bold">{playerStats.averageScore}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {playerStats.clubs?.length ? `Vereine: ${playerStats.clubs.join(', ')}` : 'Kein Verein hinterlegt'}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Trend</div>
                    <h2 className="mt-1 text-xl font-bold">Letzte Holz-Werte</h2>
                  </div>
                  <div className="text-sm text-muted-foreground">Rang {playerStats.ranking ?? '-'}</div>
                </div>
                <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
                  <svg viewBox="0 0 280 120" className="h-40 w-full">
                    <defs>
                      <linearGradient id="playerGraph" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                    <path d="M0 119 H280" stroke="hsl(var(--border))" strokeWidth="1" fill="none" />
                    <polyline
                      fill="none"
                      stroke="url(#playerGraph)"
                      strokeWidth="3"
                      points={buildPolyline(graphValues, 280, 100)}
                    />
                    {graphValues.map((value, index) => {
                      const topPadding = 10;
                      const bottomPadding = 10;
                      const min = Math.min(...graphValues);
                      const max = Math.max(...graphValues, 1);
                      const span = Math.max(max - min, 1);
                      const drawableHeight = Math.max(100 - topPadding - bottomPadding, 1);
                      const x = graphValues.length === 1 ? 140 : (index / Math.max(graphValues.length - 1, 1)) * 280;
                      const normalized = (value - min) / span;
                      const y = topPadding + (1 - normalized) * drawableHeight;
                      return <circle key={`${value}-${index}`} cx={x} cy={y} r="4.5" fill="#dc2626" stroke="#fff7f8" strokeWidth="2" />;
                    })}
                  </svg>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Älter</span>
                    <span>Neuer</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Historie</div>
                  <h2 className="text-2xl font-bold">Letzte Spiele</h2>
                </div>
                <div className="text-sm text-muted-foreground">Klicke ein Spiel fuer die komplette Ergebnisansicht.</div>
              </div>

              <div className="mt-6 space-y-4">
                {history.map((entry) => (
                  <div key={`${entry.gameId}-${entry.club}-${entry.date}`} className="rounded-2xl border border-border bg-muted/20 p-5">
                    <button
                      type="button"
                      onClick={() => void toggleGame(entry.gameId)}
                      className="w-full text-left"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {entry.spieltag || 'Spiel'} · {entry.league || 'Liga unbekannt'}
                          </div>
                          <div className="mt-1 text-lg font-bold">
                            {entry.club} vs {entry.opponentClub}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {[entry.date, entry.time].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-xl border border-border bg-background px-4 py-3">
                            <div className="text-[10px] uppercase text-muted-foreground">Ergebnis</div>
                            <div className="text-lg font-bold">{entry.result || entry.teamResult || '-'}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-background px-4 py-3">
                            <div className="text-[10px] uppercase text-muted-foreground">Holz</div>
                            <div className="text-lg font-bold">{entry.holz || '-'}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-background px-4 py-3">
                            <div className="text-[10px] uppercase text-muted-foreground">SP</div>
                            <div className="text-lg font-bold">{entry.sp || '-'}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-background px-4 py-3">
                            <div className="text-[10px] uppercase text-muted-foreground">MP</div>
                            <div className="text-lg font-bold">{entry.mp || '-'}</div>
                          </div>
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
