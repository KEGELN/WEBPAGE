'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { BerlinLeagueData, BerlinLeagueKey } from '@/lib/temporary-berlin/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Calendar, Info } from 'lucide-react';

type ApiRow = (string | number | null | undefined)[];

const leagueOptions: { key: BerlinLeagueKey; label: string }[] = [
  { key: 'berlinliga', label: 'Berlinliga' },
  { key: 'vereinsliga', label: 'Vereinsliga' },
];

function extractSpieltagNumber(title: string): string | null {
  const match = title.match(/Spieltag:\s*(\d{1,2})/i);
  if (!match) return null;
  return String(Number(match[1]));
}

function isUnplayedResult(value: string): boolean {
  const normalized = value.replace(/\s+/g, '');
  return /^[-–—]:[-–—]$/.test(normalized);
}

export default function BerlinPage() {
  const [league, setLeague] = useState<BerlinLeagueKey>('berlinliga');
  const [data, setData] = useState<BerlinLeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // We try to use our new unified API which now includes the local database leagues
        const leagueId = league === 'berlinliga' ? 'berlinliga-local' : 'vereinsliga-local';
        
        // Fetch standings, games and spieltage in parallel from our DB
        const [standingsRes, gamesRes, matchdaysRes] = await Promise.all([
          fetch(`/api/sportwinner?command=GetTabelle&id_liga=${leagueId}&id_saison=11&nr_spieltag=100`),
          fetch(`/api/sportwinner?command=GetSpiel&id_liga=${leagueId}&id_saison=11`),
          fetch(`/api/sportwinner?command=GetSpieltagArray&id_liga=${leagueId}&id_saison=11`)
        ]);

        if (!standingsRes.ok || !gamesRes.ok) {
          throw new Error("Failed to fetch data from database");
        }

        const standingsRaw = (await standingsRes.json()) as ApiRow[];
        const gamesRaw = (await gamesRes.json()) as ApiRow[];
        const matchdaysRaw = (await matchdaysRes.json()) as ApiRow[];

        // Map standings from Sportwinner format back to Berlin page format
        const mappedStandings = standingsRaw.map((row: ApiRow) => ({
          place: String(row[1]),
          team: String(row[2]),
          games: String(row[4]),
          mp: String(row[13] || '-'),
          sp: String(row[14] || '-'),
          points: `${row[7]} : ${row[10]}`
        }));

        // Group games by matchday
        const matchdayMap = new Map<string, { title: string; games: { spielNumber: string; pairing: string; time: string; result: string }[] }>();
        matchdaysRaw.forEach((m: ApiRow) => {
          matchdayMap.set(String(m[1]), { title: String(m[2]), games: [] });
        });

        gamesRaw.forEach((g: ApiRow) => {
          const mday = matchdayMap.get(String(g[11]));
          if (mday) {
            mday.games.push({
              spielNumber: String(g[6] || ''),
              pairing: `${g[3]} - ${g[6]}`, // This mapping might need check based on local games format
              time: `${g[1]} ${g[2]}`,
              result: String(g[10] || '')
            });
          }
        });

        // For the PDF reports and extra links, we still might want the scraper 
        // OR we just use the API for everything. Let's keep a hybrid or 
        // fetch the full object if DB is empty.
        
        if (!active) return;
        
        // If DB had data, use it. Otherwise fallback to scraper.
        if (mappedStandings.length > 0) {
           // We'll still need the PDF links from the scraper for now
           const scraperRes = await fetch(`/api/berlin?league=${league}`);
           const scraperData = await scraperRes.json();
           
           setData({
             ...scraperData,
             standings: mappedStandings,
             // Keep the scraper's matchdays if they are more detailed (venues etc)
           });
        } else {
           const scraperRes = await fetch(`/api/berlin?league=${league}`);
           const scraperData = await scraperRes.json();
           setData(scraperData);
        }
        
      } catch (err: unknown) {
        console.error("Berlin page DB fetch error, falling back to scraper:", err);
        // Fallback to pure scraper
        try {
          const response = await fetch(`/api/berlin?league=${league}`);
          const json = await response.json();
          if (active) setData(json);
        } catch (scraperErr) {
          setError("Fehler beim Laden der Daten.");
        }
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

  const selectedReport = useMemo(() => {
    if (!data) return null;
    return data.pdfReports.find((report) => report.id === selectedReportId) || data.pdfReports[0] || null;
  }, [data, selectedReportId]);

  const spieltagReportMap = useMemo(() => {
    const map = new Map<string, { url: string; title: string }>();
    if (!data) return map;
    for (const ref of data.spieltagReports) {
      map.set(ref.spieltag, { url: ref.reportUrl, title: ref.reportTitle });
    }
    return map;
  }, [data]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-md overflow-hidden">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-6">
            <div>
              <CardDescription className="uppercase tracking-wide">Temporäre Integration</CardDescription>
              <CardTitle className="text-3xl font-bold">Berlin Spielbetrieb</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                Quelle: kleeblatt-berlin.de <Info className="h-3.5 w-3.5" />
              </CardDescription>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
              {leagueOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setLeague(option.key)}
                  className={`rounded-lg px-6 py-2 text-sm font-semibold transition-all ${
                    league === option.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="border-t border-border/50 bg-muted/5 py-3">
            {data && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stand: {fetchedAtLabel}</span>
                <a className="flex items-center gap-1 hover:text-primary transition-colors" href={data.sourceUrl} target="_blank" rel="noreferrer">
                  Original-Quelle <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {loading && <LoadingSpinner label="Lade Berlin-Daten..." />}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-destructive flex items-center gap-2">
              <Info className="h-5 w-5" />
              <span>Fehler: {error}</span>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-bold">Liga-Tabelle</h2>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{leagueOptions.find(l => l.key === league)?.label}</span>
                </div>
                <Card className="border border-border bg-gradient-to-br from-red-500/5 via-background to-rose-500/5 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Pl.</TableHead>
                        <TableHead>Mannschaft</TableHead>
                        <TableHead className="text-center">Sp.</TableHead>
                        <TableHead className="text-center">MP</TableHead>
                        <TableHead className="text-center">SP</TableHead>
                        <TableHead className="text-center font-bold">Punkte</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.standings.map((row, index) => (
                        <TableRow key={`${row.team}-${index}`}>
                          <TableCell className="text-center font-medium">{row.place}</TableCell>
                          <TableCell className="font-semibold">{row.team}</TableCell>
                          <TableCell className="text-center">{row.games}</TableCell>
                          <TableCell className="text-center">{row.mp}</TableCell>
                          <TableCell className="text-center">{row.sp}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{row.points}</TableCell>
                        </TableRow>
                      ))}
                      {data.standings.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Keine Tabellen-Daten gefunden.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-2xl font-bold">Spielplan & Ergebnisse</h2>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-6">
                  {data.matchdays.map((day) => {
                    const spieltag = extractSpieltagNumber(day.title);
                    const report = spieltag ? spieltagReportMap.get(spieltag) : undefined;
                    const unplayedCount = day.games.filter((game) => isUnplayedResult(game.result)).length;
                    
                    return (
                      <Card key={`${day.title}-${day.anchorId || ''}`} className="border border-border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <CardTitle className="text-lg">{day.title}</CardTitle>
                              {unplayedCount > 0 && (
                                <CardDescription className="text-primary font-medium">{unplayedCount} offene Spiele</CardDescription>
                              )}
                            </div>
                            {report && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={report.url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Ergebnis-PDF
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-transparent border-none">
                                <TableHead className="w-12 text-center text-[10px] uppercase">Nr.</TableHead>
                                <TableHead className="w-24 text-[10px] uppercase">Zeit</TableHead>
                                <TableHead className="text-[10px] uppercase">Paarung</TableHead>
                                <TableHead className="w-24 text-right text-[10px] uppercase">Ergebnis</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {day.games.map((game, gIdx) => (
                                <TableRow key={`${day.title}-${gIdx}`} className="group hover:bg-muted/20 transition-colors">
                                  <TableCell className="text-center text-muted-foreground font-mono text-xs">{game.spielNumber || '-'}</TableCell>
                                  <TableCell className="text-xs font-medium whitespace-nowrap">
                                    {game.time || '-'}
                                    <div className="text-[10px] text-muted-foreground font-normal">{game.venue || ''}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-sm">{game.pairing || '-'}</div>
                                    {game.note && <div className="text-[10px] text-amber-600 font-medium italic">{game.note}</div>}
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary tabular-nums">
                                    {game.result || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold px-1">Spieler-Statistiken</h2>
                <Card className="border border-border shadow-md">
                  <CardHeader className="pb-4">
                    <CardDescription>Auswertung der offiziellen Spielberichte</CardDescription>
                    <div className="mt-2">
                      <Select
                        value={selectedReport?.id || ''}
                        onChange={(e) => setSelectedReportId(e.target.value)}
                        className="w-full"
                      >
                        {data.pdfReports.map((report) => (
                          <option key={report.id} value={report.id}>
                            {report.title}{report.spieltagHint ? ` (ST ${report.spieltagHint})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {selectedReport && (
                      <div className="space-y-4">
                        <div className="px-6 pb-2">
                          {selectedReport.warnings.length > 0 && (
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                              <Info className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>{selectedReport.warnings.join(' ')}</span>
                            </div>
                          )}
                        </div>

                        <div className="overflow-hidden border-t border-border">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10 text-center">Pl.</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">∅</TableHead>
                                <TableHead className="text-right">MP</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedReport.players.map((row, pIdx) => (
                                <TableRow key={`${selectedReport.id}-${pIdx}`} className="h-10">
                                  <TableCell className="text-center text-muted-foreground">{row.place}</TableCell>
                                  <TableCell>
                                    <div className="font-semibold truncate max-w-[120px]">{row.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{row.team}</div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">{row.avgKegel}</TableCell>
                                  <TableCell className="text-right font-bold text-primary">{row.mp}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        <div className="p-4 border-t border-border bg-muted/5 flex justify-center">
                          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                            <a href={selectedReport.url} target="_blank" rel="noreferrer">Original PDF öffnen</a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold px-1">Alle PDF-Berichte</h2>
                <Card className="border border-border shadow-sm">
                  <CardContent className="pt-6 space-y-2">
                    {data.pdfLinks.map((pdf, idx) => (
                      <a
                        key={pdf.url + idx}
                        href={pdf.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-sm group"
                      >
                        <div className="h-8 w-8 rounded bg-red-500/10 flex items-center justify-center text-red-600 group-hover:bg-red-500/20">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="flex-1 font-medium">{pdf.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </a>
                    ))}
                    {data.pdfLinks.length === 0 && (
                      <p className="text-sm text-center py-8 text-muted-foreground italic">Keine PDF-Links erkannt.</p>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        )}

        {data && data.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
            <strong>Hinweis:</strong> {data.warnings.join(' ')}
          </div>
        )}
      </main>
    </div>
  );
}
