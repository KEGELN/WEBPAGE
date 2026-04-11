'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import { readDefaultLeagueId, writeDefaultLeagueId } from '@/lib/client-settings';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, Database, Settings, FileText, Trash2, Save, ChevronRight, Activity, Code, Calendar } from 'lucide-react';

type SeasonOption = { season_id: string; yearof_season: number };
type LeagueOption = { liga_id: string; name_der_liga: string };

export default function AdminPage() {
  const apiService = ApiService.getInstance();
  const [defaultLeagueInput, setDefaultLeagueInput] = useState(() => readDefaultLeagueId());
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('');
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [standings, setStandings] = useState<unknown[]>([]);
  const [spielplan, setSpielplan] = useState<unknown[]>([]);
  const [spieltage, setSpieltage] = useState<unknown[]>([]);
  const [reportGameId, setReportGameId] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportContext, setReportContext] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const run = async () => {
      const seasonData = (await apiService.getCurrentSeason()) as SeasonOption[];
      setSeasons(seasonData);
      if (seasonData.length > 0) {
        setSelectedSeason(String(seasonData[0].season_id));
      }
    };
    void run();
  }, [apiService]);

  useEffect(() => {
    if (!selectedSeason) return;
    const run = async () => {
      const leagueData = (await apiService.getLeagues(selectedSeason)) as LeagueOption[];
      setLeagues(leagueData);
      const storedDefault = readDefaultLeagueId();
      const validStoredDefault = storedDefault
        ? leagueData.some((league) => String(league.liga_id) === storedDefault)
        : false;
      setSelectedLeague(
        validStoredDefault ? storedDefault : leagueData.length > 0 ? String(leagueData[0].liga_id) : ''
      );
    };
    void run();
  }, [apiService, selectedSeason]);

  useEffect(() => {
    if (!selectedSeason || !selectedLeague) return;
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const [standingsData, spielplanData, spieltageData] = await Promise.all([
          apiService.getStandingsRaw(selectedLeague, selectedSeason, 100, 0),
          apiService.getSpielplan(selectedSeason, selectedLeague),
          apiService.getSpieltage(selectedSeason, selectedLeague),
        ]);
        if (cancelled) return;
        setStandings(standingsData);
        setSpielplan(spielplanData);
        setSpieltage(spieltageData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiService, selectedLeague, selectedSeason]);

  const infoRows = useMemo(
    () => [
      { label: 'Saisons', value: seasons.length, icon: Calendar },
      { label: 'Ligen', value: leagues.length, icon: Database },
      { label: 'Spieltage', value: spieltage.length, icon: Activity },
      { label: 'Spielplan', value: spielplan.length, icon: FileText },
    ],
    [leagues.length, seasons.length, spielplan.length, spieltage.length]
  );

  const saveDefaultLeague = () => {
    writeDefaultLeagueId(defaultLeagueInput);
    setSaveMessage(defaultLeagueInput.trim() ? `Gespeichert: ${defaultLeagueInput.trim()}` : 'Geleert');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const generateSpielbericht = async () => {
    if (!reportGameId.trim()) {
      setReportError('Bitte game_id eingeben.');
      return;
    }
    setReportLoading(true);
    setReportError('');
    try {
      const payload = {
        gameId: reportGameId.trim(),
      };
      const result = await apiService.generateAdminSpielbericht(payload);
      setReportText(String(result?.report || ''));
      const context = result?.context;
      if (context && typeof context === 'object' && !Array.isArray(context)) {
        setReportContext(Object.fromEntries(Object.entries(context as Record<string, unknown>)));
      } else {
        setReportContext(null);
      }
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Fehler.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <Card className="bg-gradient-to-br from-red-600/10 via-background to-rose-600/5 border-none shadow-xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-10 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                  <Shield className="h-3 w-3" /> System Diagnostics
                </div>
                <CardTitle className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Admin Board</CardTitle>
                <p className="text-muted-foreground font-medium max-w-xl text-lg">
                  Zentrale Verwaltung, Defaults und API-Diagnose Tools für den Kegler Hub.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {infoRows.map((item) => (
            <Card key={item.label} className="rounded-[2rem] border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:scale-110 transition-transform"><item.icon size={80} /></div>
                <div className="relative z-10 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</div>
                    <div className="text-4xl font-black tabular-nums">{String(item.value)}</div>
                </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
            {/* Settings Card */}
            <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
                <CardHeader className="p-8 border-b border-border/50">
                    <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                        <Settings className="text-primary h-6 w-6" /> Globale Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1" htmlFor="defaultLeagueId">Default League ID</label>
                            <input
                                id="defaultLeagueId"
                                value={defaultLeagueInput}
                                onChange={(e) => setDefaultLeagueInput(e.target.value)}
                                className="h-12 rounded-xl border border-border/50 bg-muted/20 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                placeholder="z.B. 3874"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={saveDefaultLeague} className="rounded-xl font-bold gap-2"><Save size={16}/> Speichern</Button>
                            <Button variant="outline" onClick={() => { setDefaultLeagueInput(''); writeDefaultLeagueId(''); }} className="rounded-xl font-bold"><Trash2 size={16}/></Button>
                        </div>
                        {saveMessage && <p className="text-xs font-bold text-emerald-500 animate-in fade-in">{saveMessage}</p>}
                    </div>

                    <div className="pt-8 border-t border-border/50 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Saison Filter</label>
                                <Select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
                                    {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.yearof_season}</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Liga Filter</label>
                                <Select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
                                    {leagues.map(l => <option key={l.liga_id} value={l.liga_id}>{l.name_der_liga}</option>)}
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Generator Card */}
            <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
                <CardHeader className="p-8 border-b border-border/50">
                    <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                        <Code className="text-primary h-6 w-6" /> Bericht-Generator
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1" htmlFor="reportGameId">Game ID (id_spiel)</label>
                        <input
                            id="reportGameId"
                            value={reportGameId}
                            onChange={(e) => setReportGameId(e.target.value)}
                            className="h-12 w-full rounded-xl border border-border/50 bg-muted/20 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                            placeholder="z.B. 143427"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={generateSpielbericht} disabled={reportLoading} className="rounded-xl font-bold shadow-lg">
                            {reportLoading ? 'Generiere...' : 'Bericht generieren'}
                        </Button>
                        <Button variant="outline" onClick={() => { setReportText(''); setReportContext(null); }} className="rounded-xl font-bold">Leeren</Button>
                    </div>
                    {reportError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold">{reportError}</div>}
                    
                    {reportText && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">Vorschau</span>
                                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(reportText)} className="text-[10px] h-7 font-black">Kopieren</Button>
                             </div>
                             <textarea value={reportText} readOnly rows={10} className="w-full bg-muted/30 border border-border/50 rounded-xl p-4 text-xs font-mono" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Data Inspector */}
        <section className="space-y-8">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Database className="text-primary h-6 w-6" /> RAW DATA INSPECTOR
                </h2>
                <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
            </div>

            <div className="grid gap-6">
                {[
                    { label: 'Leagues JSON', data: leagues },
                    { label: 'Spieltage JSON', data: spieltage },
                    { label: 'Standings JSON', data: standings },
                    { label: 'Spielplan JSON', data: spielplan }
                ].map((item) => (
                    <details key={item.label} className="group border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                        <summary className="p-6 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between">
                            <span className="font-black uppercase tracking-widest text-sm">{item.label}</span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="p-6 border-t border-border/50 bg-muted/10">
                            <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-96">
                                {JSON.stringify(item.data, null, 2)}
                            </pre>
                        </div>
                    </details>
                ))}
            </div>
        </section>
      </main>
    </div>
  );
}
