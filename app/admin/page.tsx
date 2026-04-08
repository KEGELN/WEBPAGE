'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import { readDefaultLeagueId, writeDefaultLeagueId } from '@/lib/client-settings';

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
      { label: 'Saisons', value: seasons.length },
      { label: 'Ligen (gew. Saison)', value: leagues.length },
      { label: 'Spieltage', value: spieltage.length },
      { label: 'Spielplan-Spiele', value: spielplan.length },
      { label: 'Tabellen-Zeilen', value: standings.length },
    ],
    [leagues.length, seasons.length, spielplan.length, spieltage.length, standings.length]
  );

  const saveDefaultLeague = () => {
    writeDefaultLeagueId(defaultLeagueInput);
    setSaveMessage(defaultLeagueInput.trim() ? `Default league saved: ${defaultLeagueInput.trim()}` : 'Default league cleared');
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
      setReportError(error instanceof Error ? error.message : 'Spielbericht konnte nicht erzeugt werden.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h1 className="text-2xl font-bold text-foreground">Admin Board</h1>
          <p className="text-sm text-muted-foreground">Unlinked low-security page for diagnostics and defaults.</p>
          <div className="mt-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1" htmlFor="defaultLeagueId">
                Default League ID
              </label>
              <input
                id="defaultLeagueId"
                value={defaultLeagueInput}
                onChange={(e) => setDefaultLeagueInput(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
                placeholder="e.g. 3874"
              />
            </div>
            <button
              type="button"
              onClick={saveDefaultLeague}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Save Default League
            </button>
            <button
              type="button"
              onClick={() => {
                setDefaultLeagueInput('');
                writeDefaultLeagueId('');
                setSaveMessage('Default league cleared');
              }}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Clear
            </button>
          </div>
          {saveMessage && <p className="mt-2 text-sm text-muted-foreground">{saveMessage}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1" htmlFor="seasonSelect">Season</label>
              <select
                id="seasonSelect"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
              >
                {seasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.yearof_season} (ID: {season.season_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1" htmlFor="leagueSelect">League</label>
              <select
                id="leagueSelect"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
              >
                {leagues.map((league) => (
                  <option key={league.liga_id} value={league.liga_id}>
                    {league.name_der_liga} (ID: {league.liga_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {infoRows.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">{item.label}</div>
              <div className="text-2xl font-semibold text-foreground">{String(item.value)}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Spielbericht Generator (Grok)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nur <code>id_spiel</code> eingeben. Alle weiteren Daten (Saison/Liga/Details/Tabelle/Restspiele) werden automatisch aus der API geholt.
          </p>
          <div className="mt-4">
            <div className="flex max-w-md flex-col">
              <label className="mb-1 text-sm font-medium" htmlFor="reportGameId">Game ID (id_spiel)</label>
              <input
                id="reportGameId"
                value={reportGameId}
                onChange={(e) => setReportGameId(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-foreground"
                placeholder="z. B. 143427"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateSpielbericht}
              disabled={reportLoading}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              {reportLoading ? 'Generiere...' : 'Spielbericht generieren'}
            </button>
            <button
              type="button"
              onClick={() => {
                setReportText('');
                setReportContext(null);
                setReportError('');
              }}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Ausgabe leeren
            </button>
          </div>
          {reportError && <p className="mt-3 text-sm text-red-700">{reportError}</p>}
          {reportText && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-foreground">Generierter Bericht</h3>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(reportText)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Kopieren
                </button>
              </div>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={26}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground"
              />
            </div>
          )}
          {reportContext && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Generator-Kontext JSON</summary>
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(reportContext, null, 2)}</pre>
            </details>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Raw Data</h2>
          {loading && <p className="text-sm text-muted-foreground mt-2">Loading…</p>}
          {!loading && (
            <div className="mt-3 space-y-4">
              <details open>
                <summary className="cursor-pointer font-medium">Leagues JSON</summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(leagues, null, 2)}</pre>
              </details>
              <details>
                <summary className="cursor-pointer font-medium">Spieltage JSON</summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(spieltage, null, 2)}</pre>
              </details>
              <details>
                <summary className="cursor-pointer font-medium">Standings JSON</summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(standings, null, 2)}</pre>
              </details>
              <details>
                <summary className="cursor-pointer font-medium">Spielplan JSON</summary>
                <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(spielplan, null, 2)}</pre>
              </details>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
