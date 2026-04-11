'use client';

import { useEffect, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTheme } from '@/lib/theme-context';

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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// ... rest of imports

export default function LivePage() {
  const apiService = ApiService.getInstance();
  const { expertMode } = useTheme();
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
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-md overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold">Live Scores</CardTitle>
                <CardDescription>Laufende Spiele der aktuellen Saison.</CardDescription>
              </div>
              <div className="text-xs text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border">
                Update: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading && <LoadingSpinner label="Lade Live-Spiele..." />}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>
        )}

        {!loading && !error && allLiveGames.length === 0 && (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Aktuell sind keine laufenden Spiele gefunden.</p>
              <p className="text-xs mt-2 text-muted-foreground/60 italic">Automatischer Refresh alle 5 Minuten.</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && allLiveGames.length > 0 && (
          <Card className="border border-border bg-gradient-to-br from-red-500/5 via-background to-rose-500/5 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeit</TableHead>
                  <TableHead>Liga</TableHead>
                  <TableHead>Heim</TableHead>
                  <TableHead>Gast</TableHead>
                  <TableHead className="text-center">Ergebnis</TableHead>
                  <TableHead className="hidden lg:table-cell">Führung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLiveGames.map((game) => (
                  <TableRow
                    key={`${game.seasonId}-${game.gameId}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedGame(game)}
                  >
                    <TableCell className="whitespace-nowrap font-medium">{game.dateTimeLabel || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{game.leagueName}</TableCell>
                    <TableCell className="font-semibold">{game.homeTeam}</TableCell>
                    <TableCell className="font-semibold">{game.awayTeam}</TableCell>
                    <TableCell className="text-center font-bold text-primary">{game.resultText}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground italic">{getLeadText(game)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {selectedGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border-none">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
                <div>
                  <CardTitle>Spiel-Details</CardTitle>
                  <CardDescription>{selectedGame.leagueName}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)}>Schließen</Button>
              </CardHeader>
              <CardContent className="p-6 overflow-auto">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Heim</div>
                    <div className="text-lg font-bold">{selectedGame.homeTeam}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gast</div>
                    <div className="text-lg font-bold">{selectedGame.awayTeam}</div>
                  </div>
                  
                  <div className="md:col-span-2 py-4 border-y border-border/50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Aktueller Score</div>
                      <div className="text-4xl font-black text-primary tabular-nums">{selectedGame.resultText}</div>
                      <div className="text-sm font-medium italic text-muted-foreground">{getLeadText(selectedGame)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground">Spieltag</div>
                      <div className="font-semibold">{selectedGame.spieltag || '-'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground">Datum/Zeit</div>
                      <div className="font-semibold">{selectedGame.dateTimeLabel || '-'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground">Status</div>
                      <div className="font-semibold">{selectedGame.status || '-'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-[10px] uppercase text-muted-foreground">Saison</div>
                      <div className="font-semibold">{selectedGame.seasonLabel}</div>
                    </div>
                  </div>

                  {selectedGame.info && (
                    <div className="md:col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="text-[10px] uppercase text-primary/70 font-bold">Zusatzinfo</div>
                      <div className="text-sm">{selectedGame.info}</div>
                    </div>
                  )}
                  
                  {expertMode && (
                    <div className="md:col-span-2 text-[10px] font-mono text-muted-foreground text-right">
                      Game-ID: {selectedGame.gameId}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
