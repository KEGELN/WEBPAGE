'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { BerlinLeagueData, BerlinLeagueKey } from '@/lib/temporary-berlin/types';

const leagueOptions: { key: BerlinLeagueKey; label: string }[] = [
  { key: 'berlinliga', label: 'Berlinliga' },
  { key: 'vereinsliga', label: 'Vereinsliga' },
];

export default function BerlinPage() {
  const [league, setLeague] = useState<BerlinLeagueKey>('berlinliga');
  const [data, setData] = useState<BerlinLeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/berlin?league=${league}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const json = (await response.json()) as BerlinLeagueData;
        if (!active) return;
        setData(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Fehler beim Laden der Berlin-Daten.';
        if (!active) return;
        setError(message);
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [league]);

  const fetchedAtLabel = useMemo(() => {
    if (!data?.fetchedAt) return '';
    const date = new Date(data.fetchedAt);
    if (Number.isNaN(date.getTime())) return data.fetchedAt;
    return date.toLocaleString('de-DE');
  }, [data?.fetchedAt]);

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Temporare Integration</div>
              <h1 className="text-3xl font-bold text-foreground">Berlin Spielbetrieb</h1>
              <p className="text-sm text-muted-foreground">
                Datenquelle: kleeblatt-berlin.de (Scraping-Bridge, bis offizielle API verfugbar ist)
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-card p-1">
              {leagueOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setLeague(option.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    league === option.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {data && (
            <div className="mt-4 text-xs text-muted-foreground">
              Stand: {fetchedAtLabel} · Quelle:{' '}
              <a className="underline hover:text-foreground" href={data.sourceUrl} target="_blank" rel="noreferrer">
                {data.sourceUrl}
              </a>
            </div>
          )}
        </section>

        {loading && <LoadingSpinner label="Lade Berlin-Daten..." />}

        {error && (
          <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            Fehler: {error}
          </section>
        )}

        {!loading && !error && data && (
          <>
            <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-xl font-semibold text-foreground">Liga-Tabelle</h2>
              </div>
              <table className="min-w-full">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 text-left">Platz</th>
                    <th className="px-4 py-3 text-left">Mannschaft</th>
                    <th className="px-4 py-3 text-left">Spiele</th>
                    <th className="px-4 py-3 text-left">MP</th>
                    <th className="px-4 py-3 text-left">SP</th>
                    <th className="px-4 py-3 text-left">Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((row, index) => (
                    <tr key={`${row.team}-${index}`} className="border-t border-border">
                      <td className="px-4 py-3">{row.place}</td>
                      <td className="px-4 py-3 font-medium">{row.team}</td>
                      <td className="px-4 py-3">{row.games}</td>
                      <td className="px-4 py-3">{row.mp}</td>
                      <td className="px-4 py-3">{row.sp}</td>
                      <td className="px-4 py-3">{row.points}</td>
                    </tr>
                  ))}
                  {data.standings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        Keine Tabellen-Daten gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground">Auswertungen (PDFs)</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.pdfLinks.map((pdf) => (
                  <a
                    key={pdf.url}
                    href={pdf.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                  >
                    {pdf.title}
                  </a>
                ))}
                {data.pdfLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine PDF-Links erkannt.</p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Spielplan und Ergebnisse</h2>
              {data.matchdays.map((day) => (
                <article key={`${day.title}-${day.anchorId || ''}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">{day.title}</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-3 py-2 text-left">Nr.</th>
                          <th className="px-3 py-2 text-left">Zeit</th>
                          <th className="px-3 py-2 text-left">Bahn</th>
                          <th className="px-3 py-2 text-left">Paarung</th>
                          <th className="px-3 py-2 text-left">Ergebnis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.games.map((game) => (
                          <tr key={`${day.title}-${game.spielNumber}-${game.pairing}`} className="border-t border-border">
                            <td className="px-3 py-2">{game.spielNumber || '-'}</td>
                            <td className="px-3 py-2">{game.time || '-'}</td>
                            <td className="px-3 py-2">{game.venue || '-'}</td>
                            <td className="px-3 py-2">
                              <div>{game.pairing || '-'}</div>
                              {game.note && <div className="text-xs text-amber-600">{game.note}</div>}
                            </td>
                            <td className="px-3 py-2">{game.result || '-'}</td>
                          </tr>
                        ))}
                        {day.games.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-center text-muted-foreground">
                              Keine Spiele gefunden.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
              {data.matchdays.length === 0 && (
                <p className="text-muted-foreground">Keine Spieltag-Abschnitte gefunden.</p>
              )}
            </section>

            {data.warnings.length > 0 && (
              <section className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {data.warnings.join(' ')}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
