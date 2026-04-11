'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { User, Activity, Trophy, Search, Calendar, MapPin, ChevronDown, ChevronUp, History, TrendingUp, BarChart3, ArrowRight, Users, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClubHistoryEntry {
  gameId: string;
  date: string | null;
  time: string | null;
  league: string | null;
  spieltag: string | null;
  opponentClub: string | null;
  result: string | null;
  teamResult: string | null;
  side: 'home' | 'away';
}

interface ClubProfile {
  found: boolean;
  clubName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  history?: ClubHistoryEntry[];
}

interface ClubSearchMatch {
  name: string;
  gameCount: number;
}

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

type GameDetailsPayload = {
  header: Record<string, unknown> | null;
  rows: GameDetailRow[];
};

function GameDetailsTable({ rows }: { rows: GameDetailRow[] }) {
  if (!rows || rows.length === 0) return null;
  
  const isSubstitution = (name: string | number | null | undefined) => {
    const n = String(name || '');
    return n.includes('(A)') || n.includes('(E)') || n.toLowerCase().includes('ab wurf');
  };

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/50 shadow-inner bg-muted/5 animate-in fade-in slide-in-from-top-2 duration-300">
      <Table className="text-xs">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-right w-1/4">Heim</TableHead>
            <TableHead className="text-center">Kegel</TableHead>
            <TableHead className="text-center">SP</TableHead>
            <TableHead className="text-center">MP</TableHead>
            <TableHead className="text-center w-8"></TableHead>
            <TableHead className="text-center">MP</TableHead>
            <TableHead className="text-center">SP</TableHead>
            <TableHead className="text-center">Kegel</TableHead>
            <TableHead className="text-left w-1/4">Gast</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const isNoteRow = row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
            if (isNoteRow) return (
              <TableRow key={idx} className="bg-muted/10 border-none">
                <TableCell colSpan={9} className="py-2 italic text-center text-muted-foreground">{row[0]}</TableCell>
              </TableRow>
            );
            
            const isTotals = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];
            if (isTotals) return null;

            const leftSub = isSubstitution(row[0]);
            const rightSub = isSubstitution(row[15]);

            return (
              <TableRow key={idx} className={cn("h-10", (leftSub || rightSub) && "bg-amber-500/5")}>
                <TableCell className={cn("text-right font-medium", leftSub && "text-amber-600 italic")}>{String(row[0] || '-')}</TableCell>
                <TableCell className="text-center font-bold">{String(row[5] || '-')}</TableCell>
                <TableCell className="text-center text-muted-foreground">{String(row[6] || '-')}</TableCell>
                <TableCell className="text-center font-semibold text-green-600 dark:text-green-400">{String(row[7] || '-')}</TableCell>
                <TableCell className="text-center"></TableCell>
                <TableCell className="text-center font-semibold text-green-600 dark:text-green-400">{String(row[8] || '-')}</TableCell>
                <TableCell className="text-center text-muted-foreground">{String(row[9] || '-')}</TableCell>
                <TableCell className="text-center font-bold">{String(row[10] || '-')}</TableCell>
                <TableCell className={cn("text-left font-medium", rightSub && "text-amber-600 italic")}>{String(row[15] || '-')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ClubClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clubName = searchParams.get('name');

  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClubSearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<string, GameDetailRow[]>>({});

  useEffect(() => {
    if (!clubName) return;

    let cancelled = false;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mirror/club?name=${encodeURIComponent(clubName)}`);
        const payload = (await res.json()) as ClubProfile;
        if (!cancelled) setProfile(payload);
      } catch (err) {
        if (!cancelled) setError('Vereinsdaten konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => { cancelled = true; };
  }, [clubName]);

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
        const payload = await res.json();
        if (!cancelled) setSearchResults(payload.clubs || []);
      } catch (err) {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 200);

    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  const toggleGame = async (gameId: string) => {
    if (openGameId === gameId) {
      setOpenGameId(null);
      return;
    }
    
    setOpenGameId(gameId);
    if (gameDetails[gameId]) return;

    try {
      const res = await fetch(`/api/mirror/game?gameId=${encodeURIComponent(gameId)}`);
      const payload = (await res.json()) as GameDetailsPayload;
      setGameDetails((prev) => ({ ...prev, [gameId]: payload.rows || [] }));
    } catch (err) {
      console.error('Failed to load game details', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      router.push(`/club?name=${encodeURIComponent(searchResults[0].name)}`);
      setSearchResults([]);
      setQuery('');
      return;
    }
    if (!query.trim()) return;
    router.push(`/club?name=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Search Header */}
        <Card className="bg-gradient-to-br from-amber-500/15 via-background to-orange-500/10 border-none shadow-xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-2">
                <CardDescription className="uppercase tracking-[0.3em] font-black text-[10px] text-amber-600 dark:text-amber-500">Club Mirror</CardDescription>
                <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter">
                  {profile?.clubName || 'Verein Suchen'}
                </CardTitle>
                <p className="text-muted-foreground font-medium max-w-xl">
                  Importierte Daten aus dem Sportwinner-System. Vereinsstatistiken, 
                  historische Ergebnisse und Kader-Analysen.
                </p>
              </div>
              <div className="relative w-full lg:max-w-md">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Verein suchen (z.B. KSC)..."
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all font-bold"
                    />
                  </div>
                  <Button type="submit" className="h-14 rounded-2xl px-6 font-black uppercase text-xs tracking-widest shadow-xl bg-amber-600 hover:bg-amber-700">
                    Öffnen
                  </Button>
                </form>
                
                {/* Search Dropdown */}
                {(searchLoading || searchResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchLoading && <div className="p-6 text-center text-sm font-bold text-muted-foreground">Suche läuft...</div>}
                    {searchResults.map((r) => (
                      <button
                        key={r.name}
                        onClick={() => {
                          router.push(`/club?name=${encodeURIComponent(r.name)}`);
                          setSearchResults([]);
                          setQuery('');
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors border-b border-border/50 last:border-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 font-black text-xs">
                            <Users size={14} />
                          </div>
                          <div className="text-left font-bold text-sm">{r.name}</div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                          {r.gameCount} SPIELE <ArrowRight className="h-3 w-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading && <div className="py-20"><LoadingSpinner label="Lade Vereinsdaten..." size="lg" /></div>}
        {error && <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive font-bold text-center">{error}</div>}

        {!loading && !error && clubName && profile?.found && (
          <div className="space-y-12">
            {/* Quick Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-[2rem] border-border/50 bg-card p-6 shadow-sm group hover:border-amber-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 w-fit text-blue-500 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Spiele Gesamt</div>
                    <div className="text-4xl font-black tabular-nums">{profile.gamesPlayed}</div>
                  </div>
                </div>
              </Card>
              <Card className="rounded-[2rem] border-border/50 bg-card p-6 shadow-sm group hover:border-emerald-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 w-fit text-emerald-500 group-hover:scale-110 transition-transform">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Siege</div>
                    <div className="text-4xl font-black tabular-nums text-emerald-500">{profile.wins}</div>
                  </div>
                </div>
              </Card>
              <Card className="rounded-[2rem] border-border/50 bg-card p-6 shadow-sm group hover:border-orange-500/30 transition-all">
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded-2xl bg-orange-500/10 w-fit text-orange-500 group-hover:scale-110 transition-transform">
                    <Hash size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Remis</div>
                    <div className="text-4xl font-black tabular-nums text-orange-500">{profile.draws}</div>
                  </div>
                </div>
              </Card>
              <Card className="rounded-[2rem] border-border/50 bg-amber-600 p-6 shadow-xl shadow-amber-600/20 group hover:scale-[1.02] transition-all">
                <div className="flex flex-col gap-4 text-white">
                  <div className="p-3 rounded-2xl bg-white/20 w-fit group-hover:rotate-12 transition-transform">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Niederlagen</div>
                    <div className="text-4xl font-black tabular-nums tracking-tighter">{profile.losses}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Game History List */}
            <section className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <History className="text-amber-600 h-8 w-8" />
                  SPIELHISTORIE
                </h2>
                <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border/50 to-transparent hidden md:block" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{(profile.history || []).length} EINTRÄGE</span>
              </div>

              <div className="grid gap-4">
                {(profile.history || []).map((entry, idx) => {
                  const isOpen = openGameId === entry.gameId;
                  const isWin = entry.side === 'home' 
                    ? (parseInt(entry.teamResult?.split(':')[0] || '0') > parseInt(entry.teamResult?.split(':')[1] || '0'))
                    : (parseInt(entry.teamResult?.split(':')[1] || '0') > parseInt(entry.teamResult?.split(':')[0] || '0'));
                  
                  return (
                    <Card key={`${entry.gameId}-${idx}`} className={cn(
                      "rounded-[2rem] border-border/50 bg-card overflow-hidden transition-all duration-300",
                      isOpen ? "shadow-2xl ring-2 ring-amber-500/20 scale-[1.01]" : "hover:shadow-md hover:border-amber-500/20"
                    )}>
                      <button
                        onClick={() => void toggleGame(entry.gameId)}
                        className="w-full p-6 md:p-8 text-left group"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest">
                                {entry.spieltag || 'SPIEL'}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {entry.date}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {entry.league || 'LIGA'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-xl font-black tracking-tight">
                                {profile.clubName} <span className="text-amber-500/40 mx-2">vs</span> {entry.opponentClub}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 md:gap-8">
                            <div className="text-center min-w-[100px]">
                              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ergebnis</div>
                              <div className={cn("text-2xl font-black tracking-tighter tabular-nums", isWin ? "text-emerald-500" : "text-red-500")}>
                                {entry.result || entry.teamResult || '-'}
                              </div>
                            </div>
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                              isOpen ? "bg-amber-600 text-white rotate-180" : "bg-muted text-muted-foreground group-hover:bg-amber-600 group-hover:text-white"
                            )}>
                              <ChevronDown size={20} />
                            </div>
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-8 pb-8 border-t border-border/50 bg-muted/5">
                          <GameDetailsTable rows={gameDetails[entry.gameId] || []} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {!clubName && !loading && (
          <div className="py-20 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 rounded-[2rem] bg-muted/30 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground opacity-30">
              <Users size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight uppercase">Kein Verein Ausgewählt</h2>
              <p className="text-muted-foreground max-w-sm font-medium">Suche oben nach einem Verein, um Details zu sehen.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
