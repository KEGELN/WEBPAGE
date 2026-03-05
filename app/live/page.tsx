'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SeasonOption {
  season_id: string;
  yearof_season: number;
  status?: number;
}

interface LeagueOption {
  liga_id: string;
  name_der_liga: string;
}

interface LiveGame {
  seasonId: string;
  seasonLabel: string;
  leagueId: string;
  leagueName: string;
  gameId: string;
  spieltag: string;
  date: string;
  time: string;
  dateTimeLabel: string;
  startTimestamp: number;
  homeTeam: string;
  awayTeam: string;
  pointsHome: number | null;
  pointsAway: number | null;
  resultText: string;
  status: string;
  info: string;
}

function parseGameDate(date: string, time: string): Date | null {
  const d = String(date || '').trim();
  if (!d) return null;
  const t = String(time || '').trim();
  const dm = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!dm) return null;
  const day = Number(dm[1]);
  const month = Number(dm[2]) - 1;
  const year = Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]);
  let hour = 0;
  let minute = 0;
  const tm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (tm) {
    hour = Number(tm[1]);
    minute = Number(tm[2]);
  }
  const parsed = new Date(year, month, day, hour, minute, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseScore(value: unknown): number | null {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function isActuallyOngoing(game: LiveGame, now: Date): boolean {
  const start = game.startTimestamp;
  if (!Number.isFinite(start)) return false;
  const end = start + 4 * 60 * 60 * 1000;
  if (now.getTime() < start || now.getTime() > end) return false;
  const status = String(game.status || '').toLowerCase();
  if (status.includes('verlegt') || status.includes('abgesagt') || status.includes('offen')) return false;
  return true;
}

function getLeadText(game: LiveGame): string {
  if (game.pointsHome === null || game.pointsAway === null) return 'Kein Ergebnis';
  if (game.pointsHome > game.pointsAway) return `${game.homeTeam} führt (+${game.pointsHome - game.pointsAway})`;
  if (game.pointsAway > game.pointsHome) return `${game.awayTeam} führt (+${game.pointsAway - game.pointsHome})`;
  return 'Gleichstand';
}

async function fetchLeagueGames(seasonId: string, seasonLabel: string, league: LeagueOption): Promise<LiveGame[]> {
  const formData = new URLSearchParams({
    command: 'GetSpiel',
    id_saison: seasonId,
    id_klub: '0',
    id_bezirk: '0',
    id_liga: String(league.liga_id),
    id_spieltag: '0',
    favorit: '',
    art_bezirk: '1',
    art_liga: '0',
    art_spieltag: '0',
  });

  const response = await fetch('/api/sportwinner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  if (!response.ok) return [];

  const data = (await response.json()) as unknown[];
  if (!Array.isArray(data)) return [];

  return data
    .filter((row): row is Array<unknown> => Array.isArray(row))
    .map((row) => {
      const gameId = String(row[0] ?? '');
      const date = String(row[1] ?? '').trim();
      const time = String(row[2] ?? '').trim();
      const start = parseGameDate(date, time);
      const homeTeam = String(row[3] ?? '').trim();
      const awayTeam = String(row[6] ?? '').trim();
      const pointsHome = parseScore(row[7]);
      const pointsAway = parseScore(row[8]);
      const status = String(row[9] ?? '').trim();
      const info = String(row[10] ?? '').trim();
      const spieltag = String(row[11] ?? '').trim();
      return {
        seasonId,
        seasonLabel,
        leagueId: String(league.liga_id),
        leagueName: String(league.name_der_liga),
        gameId,
        spieltag,
        date,
        time,
        dateTimeLabel: [date, time].filter(Boolean).join(' ').trim(),
        startTimestamp: start ? start.getTime() : Number.NaN,
        homeTeam,
        awayTeam,
        pointsHome,
        pointsAway,
        resultText:
          pointsHome !== null && pointsAway !== null ? `${pointsHome}:${pointsAway}` : (status || '-'),
        status,
        info,
      } satisfies LiveGame;
    })
    .filter((game) => game.gameId && game.homeTeam && game.awayTeam);
}

export default function LivePage() {
  const apiService = ApiService.getInstance();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLiveGames, setAllLiveGames] = useState<LiveGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLive = async () => {
      setLoading(true);
      setError(null);
      try {
        const seasons = (await apiService.getCurrentSeason()) as SeasonOption[];
        const seasonList = [...seasons].filter((s) => String(s.season_id || '').trim() !== '');
        const currentSeason =
          seasonList.find((season) => Number(season.status || 0) === 1) ||
          seasonList.sort((a, b) => Number(b.yearof_season) - Number(a.yearof_season))[0];
        if (!currentSeason) {
          setAllLiveGames([]);
          setLastUpdatedAt(new Date());
          return;
        }

        const liveRows: LiveGame[] = [];
        const leagues = (await apiService.getLeagues(currentSeason.season_id)) as LeagueOption[];
        const leagueResults = await Promise.all(
          leagues.map((league) =>
            fetchLeagueGames(String(currentSeason.season_id), String(currentSeason.yearof_season), league)
          )
        );
        leagueResults.forEach((rows) => liveRows.push(...rows));

        const now = new Date();
        const liveNow = liveRows
          .filter((game) => isActuallyOngoing(game, now))
          .sort((a, b) => a.startTimestamp - b.startTimestamp);

        if (cancelled) return;
        setAllLiveGames(liveNow);
        setLastUpdatedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError('Live-Spiele konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLive();
    const timer = window.setInterval(loadLive, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiService]);

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Live Scores</h1>
          <p className="text-sm text-muted-foreground">
            Laufende Spiele der aktuellen Saison (nur GetSpiel-Daten).
          </p>
          <div className="mt-3 text-xs text-muted-foreground">
            Letztes Update:{' '}
            {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'}
          </div>
        </div>

        {loading && <LoadingSpinner label="Lade Live-Spiele..." />}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>
        )}

        {!loading && !error && allLiveGames.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
            Aktuell sind keine laufenden Spiele gefunden.
          </div>
        )}

        {!loading && !error && allLiveGames.length > 0 && (
          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 text-left">Zeit</th>
                    <th className="px-4 py-3 text-left">Liga</th>
                    <th className="px-4 py-3 text-left">Heim</th>
                    <th className="px-4 py-3 text-left">Gast</th>
                    <th className="px-4 py-3 text-left">Ergebnis</th>
                    <th className="px-4 py-3 text-left">Führung</th>
                  </tr>
                </thead>
                <tbody>
                  {allLiveGames.map((game) => (
                    <tr
                      key={`${game.seasonId}-${game.gameId}`}
                      className="cursor-pointer border-t border-border hover:bg-accent/40"
                      onClick={() => setSelectedGame(game)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{game.dateTimeLabel || '-'}</td>
                      <td className="px-4 py-3">{game.leagueName}</td>
                      <td className="px-4 py-3">{game.homeTeam}</td>
                      <td className="px-4 py-3">{game.awayTeam}</td>
                      <td className="px-4 py-3 font-semibold">{game.resultText}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getLeadText(game)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Spiel-Details (GetSpiel)</h2>
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Schließen
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Saison</div>
                  <div className="font-semibold">{selectedGame.seasonLabel}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Liga</div>
                  <div className="font-semibold">{selectedGame.leagueName}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Spiel-ID</div>
                  <div className="font-semibold">{selectedGame.gameId}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Spieltag</div>
                  <div className="font-semibold">{selectedGame.spieltag || '-'}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Datum/Zeit</div>
                  <div className="font-semibold">{selectedGame.dateTimeLabel || '-'}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-semibold">{selectedGame.status || '-'}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Heim</div>
                  <div className="font-semibold">{selectedGame.homeTeam}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Gast</div>
                  <div className="font-semibold">{selectedGame.awayTeam}</div>
                </div>
                <div className="rounded-lg border border-border p-3 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Ergebnis / Führung</div>
                  <div className="text-xl font-bold">
                    {selectedGame.resultText} · <span className="text-base">{getLeadText(selectedGame)}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Zusatzinfo</div>
                  <div className="font-medium">{selectedGame.info || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
