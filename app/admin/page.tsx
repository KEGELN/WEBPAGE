'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import { readDefaultLeagueId, writeDefaultLeagueId } from '@/lib/client-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Shield, Database, Settings, FileText, Trash2, Save, ChevronRight,
  Activity, Code, Calendar, Plus, Check, Circle, AlertCircle, Clock,
  BarChart3, ExternalLink, Megaphone, Pin, Trophy, Info, Star, Edit2, X,
  Bug, Send, BookOpen, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SeasonOption = { season_id: string; yearof_season: number };
type LeagueOption = { liga_id: string; name_der_liga: string };
type Todo = { id: string; text: string; done: boolean; priority: 'low' | 'medium' | 'high'; createdAt: string; doneAt?: string };
type AnnouncementType = 'info' | 'result' | 'event' | 'training';
type Announcement = { id: string; title: string; body: string; type: AnnouncementType; pinned: boolean; createdAt: string; updatedAt?: string; gameId?: string; tags?: string[] };

const ANN_TYPE_META: Record<AnnouncementType, { label: string; color: string; bg: string; icon: typeof Info }> = {
  info:     { label: 'Info',      color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: Info },
  result:   { label: 'Ergebnis',  color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Trophy },
  event:    { label: 'Event',     color: 'text-orange-500',  bg: 'bg-orange-500/10',  icon: Calendar },
  training: { label: 'Training',  color: 'text-purple-500',  bg: 'bg-purple-500/10',  icon: Star },
};

const PRIORITY_META: Record<Todo['priority'], { label: string; color: string; icon: typeof Circle }> = {
  low:    { label: 'Niedrig', color: 'text-muted-foreground', icon: Circle },
  medium: { label: 'Mittel',  color: 'text-yellow-500',       icon: Clock },
  high:   { label: 'Hoch',    color: 'text-destructive',      icon: AlertCircle },
};

export default function AdminPage() {
  const apiService = ApiService.getInstance();

  // ── League / Settings ──────────────────────────────────────────────
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

  // ── Report generator ───────────────────────────────────────────────
  const [reportGameId, setReportGameId] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportText, setReportText] = useState('');

  // ── Todos ──────────────────────────────────────────────────────────
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoText, setTodoText] = useState('');
  const [todoPriority, setTodoPriority] = useState<Todo['priority']>('medium');
  const [todoLoading, setTodoLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // ── Bug Report ────────────────────────────────────────────────────
  const [bugTitle, setBugTitle] = useState('');
  const [bugBody, setBugBody] = useState('');
  const [bugSeverity, setBugSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [bugSent, setBugSent] = useState(false);
  const [bugLoading, setBugLoading] = useState(false);

  // ── Announcements ──────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annType, setAnnType] = useState<AnnouncementType>('info');
  const [annPinned, setAnnPinned] = useState(false);
  const [annGameId, setAnnGameId] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);

  // ── Init ───────────────────────────────────────────────────────────
  useEffect(() => {
    void apiService.getCurrentSeason().then((d) => {
      const data = d as SeasonOption[];
      setSeasons(data);
      if (data.length > 0) setSelectedSeason(String(data[0].season_id));
    });
    fetchTodos();
    fetchAnnouncements();
  }, [apiService]);

  useEffect(() => {
    if (!selectedSeason) return;
    void apiService.getLeagues(selectedSeason).then((d) => {
      const data = d as LeagueOption[];
      setLeagues(data);
      const stored = readDefaultLeagueId();
      const valid = stored ? data.some((l) => String(l.liga_id) === stored) : false;
      setSelectedLeague(valid ? stored : data.length > 0 ? String(data[0].liga_id) : '');
    });
  }, [apiService, selectedSeason]);

  useEffect(() => {
    if (!selectedSeason || !selectedLeague) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      apiService.getStandingsRaw(selectedLeague, selectedSeason, 100, 0),
      apiService.getSpielplan(selectedSeason, selectedLeague),
      apiService.getSpieltage(selectedSeason, selectedLeague),
    ]).then(([s, p, t]) => {
      if (cancelled) return;
      setStandings(s); setSpielplan(p); setSpieltage(t);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiService, selectedLeague, selectedSeason]);

  // ── Todo helpers ───────────────────────────────────────────────────
  const fetchTodos = () => {
    fetch('/api/admin/todos').then((r) => r.json()).then((d) => setTodos(d as Todo[]));
  };

  const addTodo = async () => {
    if (!todoText.trim()) return;
    setTodoLoading(true);
    await fetch('/api/admin/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: todoText.trim(), priority: todoPriority }),
    });
    setTodoText('');
    fetchTodos();
    setTodoLoading(false);
  };

  const toggleTodo = async (todo: Todo) => {
    await fetch('/api/admin/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: todo.id, done: !todo.done }),
    });
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await fetch(`/api/admin/todos?id=${id}`, { method: 'DELETE' });
    fetchTodos();
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await fetch('/api/admin/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text: editText.trim() }),
    });
    setEditingId(null);
    fetchTodos();
  };

  // ── Announcement helpers ───────────────────────────────────────────
  const fetchAnnouncements = () => {
    fetch('/api/admin/announcements').then((r) => r.json()).then((d) => setAnnouncements(d as Announcement[]));
  };

  const submitAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setAnnLoading(true);
    const method = editingAnn ? 'PATCH' : 'POST';
    const body = editingAnn
      ? { id: editingAnn.id, title: annTitle, body: annBody, type: annType, pinned: annPinned }
      : { title: annTitle, body: annBody, type: annType, pinned: annPinned, gameId: annGameId.trim() || undefined };
    await fetch('/api/admin/announcements', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setAnnTitle(''); setAnnBody(''); setAnnType('info'); setAnnPinned(false); setAnnGameId(''); setEditingAnn(null);
    fetchAnnouncements();
    setAnnLoading(false);
  };

  const deleteAnnouncement = async (id: string) => {
    await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
    fetchAnnouncements();
  };

  const startEditAnn = (a: Announcement) => {
    setEditingAnn(a);
    setAnnTitle(a.title); setAnnBody(a.body); setAnnType(a.type); setAnnPinned(a.pinned);
  };

  const autoResultAnnouncement = async () => {
    if (!reportGameId.trim() || !reportText) return;
    setAnnTitle(`Spielergebnis – Spiel #${reportGameId.trim()}`);
    setAnnBody(reportText);
    setAnnType('result');
    setAnnGameId(reportGameId.trim());
  };

  // ── Report ─────────────────────────────────────────────────────────
  const generateSpielbericht = async () => {
    if (!reportGameId.trim()) { setReportError('Bitte game_id eingeben.'); return; }
    setReportLoading(true); setReportError('');
    try {
      const result = await apiService.generateAdminSpielbericht({ gameId: reportGameId.trim() });
      setReportText(String(result?.report || ''));
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Fehler.');
    } finally { setReportLoading(false); }
  };

  const infoRows = useMemo(() => [
    { label: 'Saisons',   value: seasons.length,   icon: Calendar  },
    { label: 'Ligen',     value: leagues.length,   icon: Database  },
    { label: 'Spieltage', value: spieltage.length, icon: Activity  },
    { label: 'Spielplan', value: spielplan.length, icon: FileText  },
  ], [leagues.length, seasons.length, spielplan.length, spieltage.length]);

  const todosOpen   = todos.filter((t) => !t.done);
  const todosDone   = todos.filter((t) => t.done);

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
                  Verwaltung, Defaults, API-Diagnose und Todo-Tracker.
                </p>
              </div>
              <a href="/analyse" className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-black text-primary hover:bg-primary/20 transition-colors uppercase tracking-widest">
                <BarChart3 size={16} /> Analyse anfragen <ExternalLink size={12} />
              </a>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {infoRows.map((item) => (
            <Card key={item.label} className="relative rounded-[2rem] border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:scale-110 transition-transform"><item.icon size={80} /></div>
              <div className="relative z-10 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</div>
                <div className="text-4xl font-black tabular-nums">{item.value}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Todo Tracker ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <Check className="text-primary h-6 w-6" /> Todo Tracker
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
            <span className="text-xs font-black text-muted-foreground tabular-nums">
              {todosOpen.length} offen · {todosDone.length} erledigt
            </span>
          </div>

          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
            <CardContent className="p-6 space-y-6">
              {/* Add input */}
              <div className="flex gap-2">
                <input
                  value={todoText}
                  onChange={(e) => setTodoText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void addTodo()}
                  placeholder="Neues Todo hinzufügen…"
                  className="flex-1 h-11 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <select
                  value={todoPriority}
                  onChange={(e) => setTodoPriority(e.target.value as Todo['priority'])}
                  className="h-11 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
                <Button onClick={addTodo} disabled={todoLoading || !todoText.trim()} className="h-11 rounded-xl px-4 font-black">
                  <Plus size={18} />
                </Button>
              </div>

              {/* Open todos */}
              {todosOpen.length > 0 && (
                <div className="space-y-1">
                  {todosOpen.map((todo) => {
                    const meta = PRIORITY_META[todo.priority];
                    const Icon = meta.icon;
                    return (
                      <div key={todo.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 group transition-colors">
                        <button type="button" onClick={() => void toggleTodo(todo)} className="shrink-0">
                          <Circle size={18} className="text-border group-hover:text-primary transition-colors" />
                        </button>
                        <Icon size={14} className={cn('shrink-0', meta.color)} />
                        {editingId === todo.id ? (
                          <input
                            ref={editRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => void saveEdit(todo.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(todo.id); if (e.key === 'Escape') setEditingId(null); }}
                            className="flex-1 bg-transparent text-sm font-medium focus:outline-none border-b border-primary"
                          />
                        ) : (
                          <span className="flex-1 text-sm font-medium cursor-pointer" onDoubleClick={() => startEdit(todo)}>
                            {todo.text}
                          </span>
                        )}
                        <button type="button" onClick={() => void deleteTodo(todo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {todosOpen.length === 0 && (
                <p className="text-center py-4 text-sm text-muted-foreground font-medium">Keine offenen Todos 🎉</p>
              )}

              {/* Done todos */}
              {todosDone.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                    <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
                    Erledigt ({todosDone.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {todosDone.map((todo) => (
                      <div key={todo.id} className="flex items-center gap-3 rounded-xl px-3 py-2 opacity-50 hover:opacity-80 group transition-opacity">
                        <button type="button" onClick={() => void toggleTodo(todo)} className="shrink-0">
                          <Check size={18} className="text-primary" />
                        </button>
                        <span className="flex-1 text-sm line-through">{todo.text}</span>
                        <button type="button" onClick={() => void deleteTodo(todo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Settings + Report */}
        <div className="grid gap-8 lg:grid-cols-2">
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
                  <input id="defaultLeagueId" value={defaultLeagueInput} onChange={(e) => setDefaultLeagueInput(e.target.value)}
                    className="h-12 rounded-xl border border-border/50 bg-muted/20 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="z.B. 3874" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { writeDefaultLeagueId(defaultLeagueInput); setSaveMessage(defaultLeagueInput.trim() ? `Gespeichert: ${defaultLeagueInput.trim()}` : 'Geleert'); setTimeout(() => setSaveMessage(''), 3000); }} className="rounded-xl font-bold gap-2">
                    <Save size={16} /> Speichern
                  </Button>
                  <Button variant="outline" onClick={() => { setDefaultLeagueInput(''); writeDefaultLeagueId(''); }} className="rounded-xl font-bold"><Trash2 size={16} /></Button>
                </div>
                {saveMessage && <p className="text-xs font-bold text-emerald-500 animate-in fade-in">{saveMessage}</p>}
              </div>
              <div className="pt-8 border-t border-border/50 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Saison</label>
                  <Select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
                    {seasons.map((s) => <option key={s.season_id} value={s.season_id}>{s.yearof_season}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Liga</label>
                  <Select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
                    {leagues.map((l) => <option key={l.liga_id} value={l.liga_id}>{l.name_der_liga}</option>)}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
            <CardHeader className="p-8 border-b border-border/50">
              <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                <Code className="text-primary h-6 w-6" /> Bericht-Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1" htmlFor="reportGameId">Game ID (id_spiel)</label>
                <input id="reportGameId" value={reportGameId} onChange={(e) => setReportGameId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border/50 bg-muted/20 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="z.B. 143427" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={generateSpielbericht} disabled={reportLoading} className="rounded-xl font-bold shadow-lg">
                  {reportLoading ? 'Generiere…' : 'Bericht generieren'}
                </Button>
                <Button variant="outline" onClick={() => setReportText('')} className="rounded-xl font-bold">Leeren</Button>
                {reportText && (
                  <Button variant="outline" onClick={autoResultAnnouncement} className="rounded-xl font-bold gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
                    <Megaphone size={14} /> Als Ankündigung übernehmen
                  </Button>
                )}
              </div>
              {reportError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold">{reportError}</div>}
              {reportText && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Vorschau</span>
                    <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(reportText)} className="text-[10px] h-7 font-black">Kopieren</Button>
                  </div>
                  <textarea value={reportText} readOnly rows={10} className="w-full bg-muted/30 border border-border/50 rounded-xl p-4 text-xs font-mono" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Announcements ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <Megaphone className="text-primary h-6 w-6" /> Ankündigungen
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
            <span className="text-xs font-black text-muted-foreground tabular-nums">
              {announcements.filter((a) => a.pinned).length} gepinnt · {announcements.length} gesamt
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Create / Edit form */}
            <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
              <CardHeader className="p-6 border-b border-border/50">
                <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                  {editingAnn ? <><Edit2 size={16} className="text-primary" /> Ankündigung bearbeiten</> : <><Plus size={16} className="text-primary" /> Neue Ankündigung</>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Titel…"
                  className="w-full h-11 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <textarea
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Inhalt der Ankündigung…"
                  rows={5}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                    className="h-10 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-[110px]"
                  >
                    <option value="info">Info</option>
                    <option value="result">Ergebnis</option>
                    <option value="event">Event</option>
                    <option value="training">Training</option>
                  </select>
                  {!editingAnn && (
                    <input
                      value={annGameId}
                      onChange={(e) => setAnnGameId(e.target.value)}
                      placeholder="Game ID (optional)"
                      className="h-10 rounded-xl border border-border/50 bg-muted/20 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-[120px]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setAnnPinned((p) => !p)}
                    className={cn(
                      'h-10 w-10 rounded-xl border flex items-center justify-center transition-colors',
                      annPinned ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border/50 text-muted-foreground'
                    )}
                    title="Anpinnen"
                  >
                    <Pin size={15} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={submitAnnouncement} disabled={annLoading || !annTitle.trim() || !annBody.trim()} className="rounded-xl font-bold flex-1">
                    {annLoading ? 'Speichern…' : editingAnn ? 'Aktualisieren' : 'Veröffentlichen'}
                  </Button>
                  {editingAnn && (
                    <Button variant="outline" onClick={() => { setEditingAnn(null); setAnnTitle(''); setAnnBody(''); setAnnType('info'); setAnnPinned(false); }} className="rounded-xl font-bold">
                      <X size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {announcements.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground font-medium rounded-2xl bg-muted/10 border border-dashed border-border">Noch keine Ankündigungen</div>
              )}
              {announcements.map((a) => {
                const meta = ANN_TYPE_META[a.type];
                const Icon = meta.icon;
                return (
                  <div key={a.id} className={cn(
                    'rounded-2xl border p-5 space-y-2 transition-all',
                    a.pinned ? 'border-primary/30 bg-primary/5 shadow-md' : 'border-border/50 bg-card'
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest', meta.bg, meta.color)}>
                          <Icon size={10} /> {meta.label}
                        </span>
                        {a.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary"><Pin size={9} /> Gepinnt</span>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => startEditAnn(a)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button type="button" onClick={() => void deleteAnnouncement(a.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="font-black text-sm">{a.title}</div>
                    <div className="text-xs text-muted-foreground font-medium line-clamp-2">{a.body}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{new Date(a.createdAt).toLocaleDateString('de-DE')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Raw Data Inspector */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <Database className="text-primary h-6 w-6" /> RAW DATA INSPECTOR
            </h2>
            <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
          </div>
          <div className="grid gap-6">
            {[
              { label: 'Leagues JSON',  data: leagues   },
              { label: 'Spieltage JSON',data: spieltage },
              { label: 'Standings JSON',data: standings },
              { label: 'Spielplan JSON',data: spielplan },
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

        {/* ── Docs & Guides ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 px-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <BookOpen className="text-primary h-6 w-6" /> Dokumentation & Anleitungen
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Zap,
                title: 'KI-Import',
                desc: 'Trainingszettel fotografieren und automatisch als JSON importieren.',
                href: '/training/import',
                color: 'text-violet-500',
                bg: 'bg-violet-500/10',
              },
              {
                icon: Shield,
                title: 'Login-Links',
                desc: 'Spieler-Login-Links generieren: Trainer-Dashboard → Spieler auswählen → Link kopieren.',
                href: '/trainer/dashboard',
                color: 'text-blue-500',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Megaphone,
                title: 'Ankündigungen',
                desc: 'Neuigkeiten veröffentlichen, die auf der Startseite erscheinen. Gepinnte Meldungen erscheinen zuerst.',
                href: '#',
                color: 'text-orange-500',
                bg: 'bg-orange-500/10',
              },
              {
                icon: Calendar,
                title: 'ICS-Export',
                desc: 'Startseite → Spielkalender → Mannschaft wählen → Download-Button für Kalender-Import.',
                href: '/home',
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10',
              },
              {
                icon: Code,
                title: 'Spielbericht',
                desc: 'Spiel-ID aus dem Sportwinner-System eingeben → automatisch formatierten Bericht generieren.',
                href: '#',
                color: 'text-primary',
                bg: 'bg-primary/10',
              },
              {
                icon: BarChart3,
                title: 'Analyse',
                desc: 'Tiefgehende Statistiken, ELO-Verläufe und Heim/Auswärts-Vergleiche pro Spieler.',
                href: '/analyse',
                color: 'text-red-500',
                bg: 'bg-red-500/10',
              },
            ].map(({ icon: Icon, title, desc, href, color, bg }) => (
              <a
                key={title}
                href={href}
                className="rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all group space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-xl w-fit', bg)}>
                    <Icon size={16} className={color} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-wide">{title}</span>
                  <ExternalLink size={12} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">{desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Bug Report ── */}
        <section id="bug-report" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-4 px-1">
            <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
              <Bug className="text-destructive h-6 w-6" /> Bug Report
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
          </div>

          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
            <CardContent className="p-8 space-y-5">
              {bugSent ? (
                <div className="py-10 flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Check className="text-emerald-500 h-8 w-8" />
                  </div>
                  <div>
                    <div className="text-xl font-black">Danke für den Bericht!</div>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Der Bug wurde als Ankündigung gespeichert und wird geprüft.</p>
                  </div>
                  <Button variant="outline" onClick={() => { setBugSent(false); setBugTitle(''); setBugBody(''); setBugSeverity('medium'); }} className="rounded-xl font-bold">
                    Weiteren Bug melden
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Kurzbeschreibung</label>
                      <input
                        value={bugTitle}
                        onChange={(e) => setBugTitle(e.target.value)}
                        placeholder="z.B. Spielersuche zeigt falsche Ergebnisse"
                        className="w-full h-12 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Schweregrad</label>
                      <select
                        value={bugSeverity}
                        onChange={(e) => setBugSeverity(e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full h-12 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      >
                        <option value="low">Niedrig – kosmetisch / minor</option>
                        <option value="medium">Mittel – Funktion eingeschränkt</option>
                        <option value="high">Hoch – Funktion komplett kaputt</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Seite / Bereich</label>
                      <input
                        placeholder="z.B. /player?id=xyz"
                        className="w-full h-12 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-all"
                        onBlur={(e) => setBugBody((b) => b ? b : `Seite: ${e.target.value}\n\n`)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Schritte zur Reproduktion / Details</label>
                    <textarea
                      value={bugBody}
                      onChange={(e) => setBugBody(e.target.value)}
                      placeholder="1. Öffne /player&#10;2. Suche nach …&#10;3. Klicke auf …&#10;→ Erwartet: …&#10;→ Passiert: …"
                      rows={6}
                      className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      disabled={bugLoading || !bugTitle.trim() || !bugBody.trim()}
                      onClick={async () => {
                        setBugLoading(true);
                        const severityLabel = { low: '🟡 Niedrig', medium: '🟠 Mittel', high: '🔴 Hoch' }[bugSeverity];
                        await fetch('/api/admin/announcements', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: `[Bug ${severityLabel}] ${bugTitle.trim()}`,
                            body: bugBody.trim(),
                            type: 'info',
                            pinned: bugSeverity === 'high',
                          }),
                        });
                        fetchAnnouncements();
                        setBugSent(true);
                        setBugLoading(false);
                      }}
                      className="rounded-xl font-black gap-2 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20"
                    >
                      <Send size={15} />
                      {bugLoading ? 'Wird gesendet…' : 'Bug melden'}
                    </Button>
                    <a
                      href={`mailto:lennard.sdrojek@osz-lise-meitner.eu?subject=Kegel Hub Bug: ${encodeURIComponent(bugTitle)}&body=${encodeURIComponent(bugBody)}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-4 py-2 text-sm font-bold hover:bg-muted transition-colors"
                    >
                      <ExternalLink size={14} /> Per E-Mail melden
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  );
}
