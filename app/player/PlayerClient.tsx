'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Menubar from '@/components/menubar';
import PlayerService from '@/lib/player-service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PlayerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerId = searchParams.get('id');
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const playerService = new PlayerService();

  useEffect(() => {
    if (!playerId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const stats = await playerService.getPlayerStats(playerId);
        setPlayerStats(stats);
      } catch (err) {
        setError('Spielerdaten konnten nicht geladen werden. Bitte versuche es erneut.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Spieler</div>
              <h1 className="text-3xl font-bold text-foreground">
                {playerId ? 'Spieler-Details' : 'Spieler'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {playerId
                  ? `Details zu: ${playerStats?.playerName || 'Lädt…'}`
                  : 'Suche einen Spieler, um Informationen anzuzeigen.'}
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Spieler suchen..."
                className="w-56 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Suchen
              </button>
            </form>
          </div>
        </div>

        {!playerId && (
          <div className="bg-muted rounded-xl p-8 text-center">
            <p className="text-muted-foreground">
              Öffne die Tabellen, um die komplette Spielerliste und Statistiken zu sehen.
            </p>
          </div>
        )}

        {loading && (
          <LoadingSpinner label="Spielerdaten werden geladen..." size="lg" overlay />
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && playerId && playerStats && (
          <div className="space-y-8">
            <div className="card-grid bento-section max-w-6xl mx-auto">
              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Spiele</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.gamesPlayed}</h2>
                  <p className="magic-bento-card__description">Gesamtspiele</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Siege</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.wins}</h2>
                  <p className="magic-bento-card__description">Gesamtsiege</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Niederlagen</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.losses}</h2>
                  <p className="magic-bento-card__description">Gesamtniederlagen</p>
                </div>
              </div>

              <div className="magic-bento-card magic-bento-card--border-glow">
                <div className="magic-bento-card__header">
                  <div className="magic-bento-card__label">Rang</div>
                </div>
                <div className="magic-bento-card__content">
                  <h2 className="magic-bento-card__title text-3xl font-bold">{playerStats.ranking}</h2>
                  <p className="magic-bento-card__description">Aktueller Rang</p>
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Leistung</h2>
              <div className="card-grid bento-section">
                <div className="magic-bento-card magic-bento-card--border-glow">
                  <div className="magic-bento-card__header">
                    <div className="magic-bento-card__label">Spieler-Stats</div>
                  </div>
                  <div className="magic-bento-card__content">
                    <h2 className="magic-bento-card__title text-xl font-semibold">{playerStats.playerName}</h2>
                    <p className="magic-bento-card__description">Spieler-Statistiken</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Spiele</span>
                        <span className="font-semibold text-primary">{playerStats.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Siege</span>
                        <span className="font-semibold text-primary">{playerStats.wins}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Niederlagen</span>
                        <span className="font-semibold text-primary">{playerStats.losses}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Rang</span>
                        <span className="font-semibold text-primary">{playerStats.ranking}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-foreground/80">Schnitt</span>
                        <span className="font-semibold text-primary">{playerStats.averageScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="magic-bento-card magic-bento-card--border-glow p-6">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Spielername</h3>
                  <p className="text-foreground/80">{playerStats.playerName}</p>
                </div>
                <div className="magic-bento-card magic-bento-card--border-glow p-6">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Schnitt</h3>
                  <p className="text-foreground/80">{playerStats.averageScore}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
