'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import Footer from '@/components/Footer';
import ApiService from '@/lib/api-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Send, BarChart3, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

type League = { liga_id: string; name_der_liga: string };
type Standing = { team_id: string; team_name: string; position: number };

type AnalysisMode = {
  id: string;
  label: string;
  description: string;
};

const ANALYSIS_MODES: AnalysisMode[] = [
  { id: 'elo',         label: 'ELO-Verlauf',        description: 'Rating aller Spieler über die Saison' },
  { id: 'home_away',   label: 'Heim / Auswärts',    description: 'Bilanz und Schnitt nach Spielort' },
  { id: 'recent',      label: 'Aktuelle Form',       description: 'Letzte 5 / 10 Spiele im Trend' },
  { id: 'players',     label: 'Spieler-Details',     description: 'Einzelstatistiken und Top-Performer' },
  { id: 'comparison',  label: 'Team-Vergleich',      description: 'Zweites Team für direkten Vergleich' },
  { id: 'prediction',  label: 'Leistungsprognose',   description: 'Auf Basis der aktuellen Form' },
];

export default function AnalysePage() {
  const api = useMemo(() => ApiService.getInstance(), []);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [leagueOpen, setLeagueOpen] = useState(false);

  const [teams, setTeams] = useState<Standing[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamOpen, setTeamOpen] = useState(false);

  // Optional second team for comparison mode
  const [team2Id, setTeam2Id] = useState('');
  const [team2Open, setTeam2Open] = useState(false);

  const [selectedModes, setSelectedModes] = useState<Set<string>>(new Set(['elo', 'home_away', 'recent', 'players']));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const comparisonSelected = selectedModes.has('comparison');

  useEffect(() => {
    setLeagueLoading(true);
    api.getLeagues().then((ls) => { setLeagues(ls); setLeagueLoading(false); });
  }, [api]);

  useEffect(() => {
    if (!selectedLeagueId) return;
    setTeams([]);
    setSelectedTeamId('');
    setTeam2Id('');
    setTeamsLoading(true);
    api.getStandings(selectedLeagueId).then((rows) => {
      setTeams(rows);
      setTeamsLoading(false);
    });
  }, [api, selectedLeagueId]);

  const selectedLeague = leagues.find((l) => l.liga_id === selectedLeagueId);
  const selectedTeam  = teams.find((t) => t.team_id === selectedTeamId);
  const selectedTeam2 = teams.find((t) => t.team_id === team2Id);

  const toggleMode = (id: string) => {
    setSelectedModes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName:    selectedTeam?.team_name,
          team2Name:   selectedTeam2?.team_name,
          leagueName:  selectedLeague?.name_der_liga,
          modes:       Array.from(selectedModes),
          notes:       notes.trim(),
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || 'Fehler beim Senden');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const TeamDropdown = ({
    label, value, onChange, open, setOpen, exclude,
  }: {
    label: string;
    value: string;
    onChange: (id: string) => void;
    open: boolean;
    setOpen: (v: boolean) => void;
    exclude?: string;
  }) => {
    const filtered = teams.filter((t) => t.team_id !== exclude);
    const selected = teams.find((t) => t.team_id === value);
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
        {teamsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoadingSpinner />Teams laden…</div>
        ) : (
          <div className="relative">
            <button type="button" onClick={() => setOpen(!open)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
              <span className="truncate">{selected?.team_name || 'Team auswählen…'}</span>
              <ChevronDown size={16} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                {filtered.map((t) => (
                  <button key={t.team_id} type="button"
                    onClick={() => { onChange(t.team_id); setOpen(false); }}
                    className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted',
                      value === t.team_id && 'font-bold text-primary')}>
                    <span className="text-[10px] text-muted-foreground w-5 tabular-nums text-right">{t.position}.</span>
                    <span className="truncate">{t.team_name}</span>
                    {value === t.team_id && <Check size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-12 max-w-2xl space-y-10">

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
            <BarChart3 size={12} /> Detailanalyse
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Team-Analyse anfragen</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Wähle Liga, Team und Analyse-Modi. Der Bericht wird automatisch generiert und dir per E-Mail zugesandt.
          </p>
        </div>

        {success ? (
          <Card className="rounded-3xl border-none bg-emerald-500/10 shadow-none">
            <CardContent className="p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black">Anfrage gesendet!</h2>
              <p className="text-muted-foreground font-medium">
                Analyse-Anfrage für <strong>{selectedTeam?.team_name}</strong> wurde übermittelt.
              </p>
              <Button onClick={() => { setSuccess(false); setSelectedTeamId(''); setTeam2Id(''); setNotes(''); }} variant="outline" className="rounded-xl mt-4">
                Weitere Anfrage stellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-widest">Analyse konfigurieren</CardTitle>
              <CardDescription>Wähle Liga, Team und die gewünschten Analyse-Module.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* League */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Liga *</label>
                  {leagueLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoadingSpinner />Ligen laden…</div>
                  ) : (
                    <div className="relative">
                      <button type="button" onClick={() => { setLeagueOpen((p) => !p); setTeamOpen(false); setTeam2Open(false); }}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
                        <span className="truncate">{selectedLeague?.name_der_liga || 'Liga auswählen…'}</span>
                        <ChevronDown size={16} className={cn('shrink-0 transition-transform', leagueOpen && 'rotate-180')} />
                      </button>
                      {leagueOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                          {leagues.map((l) => (
                            <button key={l.liga_id} type="button"
                              onClick={() => { setSelectedLeagueId(l.liga_id); setLeagueOpen(false); }}
                              className={cn('flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-muted',
                                selectedLeagueId === l.liga_id && 'font-bold text-primary')}>
                              <span className="truncate">{l.name_der_liga}</span>
                              {selectedLeagueId === l.liga_id && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Team 1 */}
                {selectedLeagueId && (
                  <TeamDropdown label="Team *" value={selectedTeamId} onChange={setSelectedTeamId}
                    open={teamOpen} setOpen={setTeamOpen} />
                )}

                {/* Analysis modes */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analyse-Module *</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ANALYSIS_MODES.map((mode) => {
                      const active = selectedModes.has(mode.id);
                      return (
                        <button key={mode.id} type="button" onClick={() => toggleMode(mode.id)}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                            active ? 'border-primary/50 bg-primary/10' : 'border-border hover:bg-muted'
                          )}>
                          <div className={cn('mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            active ? 'bg-primary border-primary' : 'border-border')}>
                            {active && <Check size={10} className="text-primary-foreground" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{mode.label}</div>
                            <div className="text-xs text-muted-foreground">{mode.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Team 2 — only when comparison mode is active */}
                {comparisonSelected && selectedLeagueId && (
                  <TeamDropdown label="Vergleichs-Team *" value={team2Id} onChange={setTeam2Id}
                    open={team2Open} setOpen={setTeam2Open} exclude={selectedTeamId} />
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Anmerkungen / Schwerpunkte (optional)
                  </label>
                  <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="z.B. Fokus auf die letzten 5 Auswärtsspiele, Vergleich mit Vorjahr…"
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-bold">
                    <AlertCircle size={16} />{error}
                  </div>
                )}

                <Button type="submit"
                  disabled={submitting || !selectedTeamId || selectedModes.size === 0 || (comparisonSelected && !team2Id)}
                  className="w-full rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                  {submitting ? (
                    <span className="flex items-center gap-2"><LoadingSpinner />Wird gesendet…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send size={16} />Analyse anfragen</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
