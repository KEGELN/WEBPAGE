'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { UserPlus, Users, Trash2, ChevronRight, BarChart3, LogOut, Search, User, History, Plus, ArrowLeft, MessageSquare, Send, Trophy } from 'lucide-react';
import { Throw, Trainer, TrainerMessage, db, Player, TrainingSession } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

interface MirrorHistoryEntry {
  gameId: string;
  date: string | null;
  time: string | null;
  league: string | null;
  spieltag: string | null;
  club: string | null;
  opponentClub: string | null;
  result: string | null;
  teamResult: string | null;
  holz: string | null;
  sp: string | null;
  mp: string | null;
}

interface MirrorPlayerProfile {
  found: boolean;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageScore: number;
  history?: MirrorHistoryEntry[];
}

export default function TrainerDashboard() {
  const router = useRouter();
  const { trainer, loading: authLoading, signOut } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [messages, setMessages] = useState<TrainerMessage[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [mirrorPlayerNameInput, setMirrorPlayerNameInput] = useState('');
  const [mirrorProfile, setMirrorProfile] = useState<MirrorPlayerProfile | null>(null);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileList, setShowMobileList] = useState(true);

  useEffect(() => {
    if (!authLoading && !trainer) {
      router.push('/trainer/login');
    }
  }, [trainer, authLoading, router]);

  useEffect(() => {
    if (trainer) {
      refreshData(trainer.email);
    }
  }, [trainer?.email]);

  const refreshData = async (email: string) => {
    setLoading(true);
    try {
      const [allPlayers, allSessions, allMessages] = await Promise.all([
        db.getPlayers(email),
        db.getSessions({ trainerEmail: email }),
        db.getTrainerMessages({ trainerEmail: email }),
      ]);
      setPlayers(allPlayers);
      setSessions(allSessions);
      setMessages(allMessages);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !trainer) return;

    const playerId = `P-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const generatedUsername = `${newPlayerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'spieler'}${playerId.slice(-3).toLowerCase()}`;
    const generatedTempPassword = Math.random().toString(36).slice(2, 8).toUpperCase();
    const newPlayer: Player = {
      id: playerId,
      name: newPlayerName.trim(),
      trainerEmail: trainer.email,
      createdAt: new Date().toISOString(),
      username: generatedUsername,
      tempPassword: generatedTempPassword,
      passwordResetRequired: true,
    };

    await db.savePlayer(newPlayer);
    await refreshData(trainer.email);
    setNewPlayerName('');
  };

  const handleDeletePlayer = async (id: string) => {
    if (!trainer) return;
    if (!confirm('Möchtest du diesen Spieler wirklich löschen?')) return;
    await db.deletePlayer(id);
    await refreshData(trainer.email);
    if (selectedPlayer?.id === id) {
      setSelectedPlayer(null);
      setShowMobileList(true);
    }
  };

  const logout = async () => {
    await signOut();
    router.push('/trainer/login');
  };

  const sendMessage = async () => {
    if (!selectedPlayer || !trainer || !newMessage.trim()) return;
    await db.saveTrainerMessage({
      playerId: selectedPlayer.id,
      trainerEmail: trainer.email,
      text: newMessage.trim(),
    });
    setNewMessage('');
    await refreshData(trainer.email);
  };

  const resetTempPassword = async (playerId: string) => {
    if (!trainer) return;
    await db.resetPlayerPassword(playerId);
    await refreshData(trainer.email);
  };

  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setSelectedSession(null);
    setMirrorPlayerNameInput(player.mirrorPlayerName || '');
    setMirrorProfile(null);
    setShowMobileList(false);
  };

  useEffect(() => {
    if (!selectedPlayer?.mirrorPlayerName) {
      setMirrorProfile(null);
      return;
    }

    let cancelled = false;
    const loadMirrorProfile = async () => {
      setMirrorLoading(true);
      try {
        const res = await fetch(`/api/mirror/search?q=${encodeURIComponent(selectedPlayer.mirrorPlayerName || '')}`);
        const data = await res.json();
        
        if (data.players && data.players.length > 0) {
          const playerId = data.players[0].id;
          const playerRes = await fetch(`/api/mirror/player?id=${encodeURIComponent(playerId)}`);
          const payload = (await playerRes.json()) as MirrorPlayerProfile;
          if (!cancelled) {
            setMirrorProfile(playerRes.ok ? payload : payload.found ? payload : null);
          }
        } else {
          if (!cancelled) {
            setMirrorProfile(null);
          }
        }
      } catch (error) {
        console.error('Failed to load mirror player profile', error);
        if (!cancelled) {
          setMirrorProfile(null);
        }
      } finally {
        if (!cancelled) {
          setMirrorLoading(false);
        }
      }
    };

    void loadMirrorProfile();
    return () => {
      cancelled = true;
    };
  }, [selectedPlayer?.id, selectedPlayer?.mirrorPlayerName]);

  const assignMirrorPlayerName = async () => {
    if (!selectedPlayer || !trainer) return;
    const updatedPlayer: Player = {
      ...selectedPlayer,
      mirrorPlayerName: mirrorPlayerNameInput.trim() || undefined,
    };
    const saved = await db.updatePlayer(updatedPlayer);
    setSelectedPlayer(saved);
    await refreshData(trainer.email);
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlayerStats = (playerId: string) => {
    const playerSessions = sessions.filter(s => s.playerId === playerId);
    if (playerSessions.length === 0) return { count: 0, avg: 0 };

    const totalPins = playerSessions.reduce((acc, session) => {
      if (session.type === 'game_120' && session.lanes) {
        return acc + Object.values(session.lanes).reduce(
          (laneAcc, lane) => laneAcc + lane.reduce((throwAcc, throwItem) => throwAcc + (throwItem.pins?.length || 0), 0),
          0
        );
      }

      return acc + (session.throws?.reduce((throwAcc, throwItem) => throwAcc + (throwItem.pins?.length || 0), 0) || 0);
    }, 0);

    const totalThrows = playerSessions.reduce((acc, session) => {
      if (session.type === 'game_120' && session.lanes) {
        return acc + Object.values(session.lanes).reduce((laneAcc, lane) => laneAcc + lane.length, 0);
      }

      return acc + (session.throws?.length || 0);
    }, 0);
    
    return {
      count: playerSessions.length,
      avg: totalThrows > 0 ? (totalPins / totalThrows).toFixed(1) : '0.0'
    };
  };

  const getSessionTotal = (session: TrainingSession) => {
    if (session.type === 'game_120' && session.lanes) {
      return Object.values(session.lanes).reduce(
        (laneAcc, lane) => laneAcc + lane.reduce((throwAcc, throwItem) => throwAcc + (throwItem.pins?.length || 0), 0),
        0
      );
    }

    return session.throws?.reduce((acc, throwItem) => acc + (throwItem.pins?.length || 0), 0) || 0;
  };

  const getSessionThrows = (session: TrainingSession) => {
    if (session.type === 'game_120' && session.lanes) {
      return Object.entries(session.lanes).flatMap(([lane, laneThrows]) =>
        laneThrows.map((throwItem, index) => ({
          lane: Number(lane),
          throwNumber: index + 1,
          throwItem,
        }))
      );
    }

    return session.throws.map((throwItem, index) => ({
      lane: 1,
      throwNumber: index + 1,
      throwItem,
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!trainer) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <User className="text-primary" size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Trainer Dashboard</div>
              <div className="text-lg sm:text-xl font-bold truncate">{trainer.email}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border sm:border-transparent"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Side / List View (Hidden on mobile when player selected) */}
          <aside className={`space-y-6 ${!showMobileList ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                Neuen Spieler anlegen
              </h2>
              <form onSubmit={createPlayer} className="space-y-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Vollständiger Name des Spielers"
                  className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Spieler erstellen
                </button>
              </form>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-[600px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  Deine Spieler ({players.length})
                </h2>
              </div>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full bg-muted border border-border rounded-xl py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {loading ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    Lade Spieler...
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    Keine Spieler gefunden.
                  </div>
                ) : (
                  filteredPlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPlayer(p)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${selectedPlayer?.id === p.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-muted/30 border-transparent hover:bg-muted/50'}`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{p.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5">ID: {p.id}</div>
                        {p.mirrorPlayerName && (
                          <div className="mt-1 text-[10px] text-muted-foreground truncate">
                            Sportwinner: {p.mirrorPlayerName}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={14} className={selectedPlayer?.id === p.id ? 'text-primary' : 'text-muted-foreground'} />
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Right Side / Detail View (Hidden on mobile when list active) */}
          <section className={`space-y-6 ${showMobileList ? 'hidden lg:block' : 'block'}`}>
            {!selectedPlayer ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-card rounded-2xl border-2 border-dashed border-border p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                  <BarChart3 size={24} />
                </div>
                <h2 className="text-lg font-bold mb-2">Kein Spieler ausgewählt</h2>
                <p className="text-muted-foreground text-xs max-w-xs">
                  Wähle einen Spieler aus der Liste aus, um Details zu sehen.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setShowMobileList(true)}
                  className="lg:hidden flex items-center gap-2 text-primary font-semibold text-sm mb-2"
                >
                  <ArrowLeft size={16} />
                  Zurück zur Liste
                </button>

                {/* Player Profile Header */}
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-lg font-bold">
                        {selectedPlayer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedPlayer.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded tracking-wider uppercase">ID: {selectedPlayer.id}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded tracking-wider lowercase">user: {selectedPlayer.username}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Seit {new Date(selectedPlayer.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeletePlayer(selectedPlayer.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-all border border-destructive/20"
                    >
                      <Trash2 size={16} />
                      Spieler löschen
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-6 sm:mt-8">
                    <div className="bg-muted/40 p-4 rounded-xl border border-border/50">
                      <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Sessions</div>
                      <div className="text-xl sm:text-2xl font-bold">{getPlayerStats(selectedPlayer.id).count}</div>
                    </div>
                    <div className="bg-muted/40 p-4 rounded-xl border border-border/50">
                      <div className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Ø Pins</div>
                      <div className="text-xl sm:text-2xl font-bold">{getPlayerStats(selectedPlayer.id).avg}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Login</div>
                    <div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div><span className="font-semibold">Username:</span> <span className="font-mono lowercase">{selectedPlayer.username}</span></div>
                        <div><span className="font-semibold">Temp-Passwort:</span> <span className="font-mono">{selectedPlayer.tempPassword}</span></div>
                      </div>
                      <button
                        onClick={() => resetTempPassword(selectedPlayer.id)}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
                      >
                        Temp-Passwort zurücksetzen
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sportwinner-Zuordnung</div>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-semibold text-foreground">Vollständiger Spielername</label>
                        <input
                          type="text"
                          value={mirrorPlayerNameInput}
                          onChange={(e) => setMirrorPlayerNameInput(e.target.value)}
                          placeholder="z. B. Noack, Matthias"
                          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Diese Zuordnung steuert, welche echten Sportwinner-Ergebnisse im Überblick angezeigt werden.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={assignMirrorPlayerName}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Zuordnung speichern
                      </button>
                    </div>
                  </div>
                </div>

                {/* Training History */}
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm">
                  <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                    <History size={18} className="text-primary" />
                    Letzte Trainingseinheiten
                  </h3>
                  
                  <div className="space-y-4">
                    {sessions.filter(s => s.playerId === selectedPlayer.id).length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground">
                        Noch keine Trainingsdaten vorhanden.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {sessions.filter(s => s.playerId === selectedPlayer.id).map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSession(s)}
                            className={`bg-muted/30 border rounded-xl p-4 text-left transition-all group ${
                              selectedSession?.id === s.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[9px] font-bold uppercase text-primary">Sitzung</span>
                              <span className="text-[9px] text-muted-foreground">{new Date(s.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <div className="text-xl font-bold">
                                {s.type === 'game_120' && s.lanes
                                  ? Object.values(s.lanes).reduce((laneAcc, lane) => laneAcc + lane.reduce((throwAcc, t) => throwAcc + (t.pins?.length || 0), 0), 0)
                                  : s.throws?.reduce((acc: number, t: Throw) => acc + (t.pins?.length || 0), 0) || 0}
                                <span className="text-[10px] font-normal text-muted-foreground ml-1">Gesamt</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {s.type === 'game_120' && s.lanes
                                  ? `${Object.values(s.lanes).reduce((laneAcc, lane) => laneAcc + lane.length, 0)} Würfe`
                                  : `${s.throws?.length || 0} Würfe`}
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
                              {(s.type === 'game_120' && s.lanes
                                ? Object.values(s.lanes).flat().slice(-6)
                                : s.throws?.slice(-6) || []).map((t: Throw, idx: number) => (
                                <div key={idx} className="h-3.5 w-3.5 rounded-full bg-primary/20 text-[6px] flex items-center justify-center text-primary font-bold">
                                  {t.pins?.length || 0}
                                </div>
                              ))}
                              {((s.type === 'game_120' && s.lanes
                                ? Object.values(s.lanes).flat().length
                                : s.throws?.length || 0) > 6) && <span className="text-[8px] text-muted-foreground">...</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm">
                  <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                    <Trophy size={18} className="text-primary" />
                    Echte Spielergebnisse
                  </h3>

                  {!selectedPlayer.mirrorPlayerName ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      Weise oben einen vollständigen Sportwinner-Spielernamen zu, damit die echten Ergebnisse geladen werden.
                    </div>
                  ) : mirrorLoading ? (
                    <div className="text-sm text-muted-foreground">Lade Sportwinner-Ergebnisse...</div>
                  ) : !mirrorProfile?.found ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      Für {selectedPlayer.mirrorPlayerName} wurden noch keine gespiegelten Sportwinner-Daten gefunden.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Spiele</div>
                          <div className="text-lg font-bold">{mirrorProfile.gamesPlayed}</div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Siege</div>
                          <div className="text-lg font-bold">{mirrorProfile.wins}</div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Niederlagen</div>
                          <div className="text-lg font-bold">{mirrorProfile.losses}</div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[10px] uppercase text-muted-foreground">Ø Holz</div>
                          <div className="text-lg font-bold">{mirrorProfile.averageScore}</div>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {mirrorProfile.history?.slice(0, 6).map((entry) => (
                          <div key={`${entry.gameId}-${entry.club}-${entry.date}`} className="rounded-xl border border-border bg-muted/20 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {entry.spieltag || 'Spiel'} · {entry.league || 'Liga unbekannt'}
                                </div>
                                <div className="mt-1 font-semibold">
                                  {entry.club} vs {entry.opponentClub}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {[entry.date, entry.time].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="text-[10px] uppercase text-muted-foreground">Ergebnis</div>
                                  <div className="font-semibold">{entry.result || entry.teamResult || '-'}</div>
                                </div>
                                <div className="rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="text-[10px] uppercase text-muted-foreground">Holz</div>
                                  <div className="font-semibold">{entry.holz || '-'}</div>
                                </div>
                                <div className="rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="text-[10px] uppercase text-muted-foreground">SP</div>
                                  <div className="font-semibold">{entry.sp || '-'}</div>
                                </div>
                                <div className="rounded-lg border border-border bg-background px-3 py-2">
                                  <div className="text-[10px] uppercase text-muted-foreground">MP</div>
                                  <div className="font-semibold">{entry.mp || '-'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedSession && (
                  <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold">Sitzungsübersicht</h3>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(selectedSession.timestamp).toLocaleString()} · {selectedSession.type === 'game_120' ? 'Wettkampf 120' : 'Standard 30'}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[9px] uppercase text-muted-foreground">Gesamt</div>
                          <div className="text-lg font-bold">{getSessionTotal(selectedSession)}</div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[9px] uppercase text-muted-foreground">Würfe</div>
                          <div className="text-lg font-bold">{getSessionThrows(selectedSession).length}</div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                          <div className="text-[9px] uppercase text-muted-foreground">Schnitt</div>
                          <div className="text-lg font-bold">
                            {getSessionThrows(selectedSession).length > 0
                              ? (getSessionTotal(selectedSession) / getSessionThrows(selectedSession).length).toFixed(2)
                              : '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-3 py-2 text-left">Bahn</th>
                            <th className="px-3 py-2 text-left">Wurf</th>
                            <th className="px-3 py-2 text-left">Holz</th>
                            <th className="px-3 py-2 text-left">Pins</th>
                            <th className="px-3 py-2 text-left">Zeit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSessionThrows(selectedSession).map(({ lane, throwNumber, throwItem }) => (
                            <tr key={`${selectedSession.id}-${lane}-${throwItem.id}`} className="border-t border-border">
                              <td className="px-3 py-2">{lane}</td>
                              <td className="px-3 py-2">{throwNumber}</td>
                              <td className="px-3 py-2 font-semibold">{throwItem.pins.length}</td>
                              <td className="px-3 py-2">
                                {throwItem.pins.length === 0 ? (
                                  <span className="text-destructive text-xs font-semibold uppercase">Fehlwurf</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {throwItem.pins.map((pin) => (
                                      <span
                                        key={`${throwItem.id}-${pin}`}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                                      >
                                        {pin}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {new Date(throwItem.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-sm">
                  <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary" />
                    Nachricht an Spieler
                  </h3>
                  <div className="space-y-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                      placeholder="Trainingseindruck, Hinweis oder Termin ..."
                      className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={sendMessage}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <Send size={16} />
                      Nachricht senden
                    </button>
                  </div>
                  <div className="mt-6 space-y-3">
                    {messages.filter((message) => message.playerId === selectedPlayer.id).length === 0 ? (
                      <div className="text-xs text-muted-foreground">Noch keine Nachrichten an diesen Spieler.</div>
                    ) : (
                      messages
                        .filter((message) => message.playerId === selectedPlayer.id)
                        .slice(0, 6)
                        .map((message) => (
                          <div key={message.id} className="rounded-xl border border-border bg-muted/30 p-4">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {new Date(message.createdAt).toLocaleString()}
                            </div>
                            <div className="mt-2 text-sm">{message.text}</div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
