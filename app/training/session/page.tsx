'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, Player, Throw, Trainer, TrainingSession } from '@/lib/db';
import { ArrowLeft, Check, CircleOff, Save, Trophy, Hash, Sparkles, X, Share2, MessageCircle, Send, Link as LinkIcon, ClipboardList, User as UserIcon, Target, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from '@/lib/utils';

const pinLayout = [
  { id: 9, x: 2, y: 0 },
  { id: 7, x: 1, y: 1 },
  { id: 8, x: 3, y: 1 },
  { id: 4, x: 0, y: 2 },
  { id: 5, x: 2, y: 2 },
  { id: 6, x: 4, y: 2 },
  { id: 2, x: 1, y: 3 },
  { id: 3, x: 3, y: 3 },
  { id: 1, x: 2, y: 4 },
] as const;

const laneKeys = [1, 2, 3, 4] as const;
const TOTAL_PINS = 9;
const THROWS_PER_BLOCK = 30;

type GameMode = 'standard' | 'game_120';
type LaneRecord = Record<1 | 2 | 3 | 4, Throw[]>;

function getThrownPins(throws: Throw[]) {
  return throws.reduce<number[]>((acc, throwItem) => acc.concat(throwItem.pins), []);
}

function getDisabledPins(throws: Throw[]) {
  const throwInBlock = (throws.length % THROWS_PER_BLOCK) + 1;
  if (throwInBlock <= 15) return [];
  const clearingStart = Math.floor(throws.length / THROWS_PER_BLOCK) * THROWS_PER_BLOCK + 15;
  const alreadyHit = Array.from(new Set(getThrownPins(throws.slice(clearingStart))));
  return alreadyHit.length >= TOTAL_PINS ? [] : alreadyHit;
}

function getThrowLabel(index: number) {
  const inBlock = (index % THROWS_PER_BLOCK) + 1;
  return inBlock <= 15 ? 'Volle' : 'Abräumen';
}

function getScore(throws: Throw[]) {
  return throws.reduce((acc, throwItem) => acc + throwItem.pins.length, 0);
}

function getTrainingPlayer(trainer: Trainer | null): Player | null {
  if (typeof window === 'undefined') return null;
  const playerAuth = localStorage.getItem('player_auth');
  if (playerAuth) return JSON.parse(playerAuth) as Player;
  if (trainer) {
    const trainerId = `T-${trainer.email.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase()}`;
    return {
      id: trainerId,
      name: trainer.name,
      trainerEmail: trainer.email,
      createdAt: new Date(0).toISOString(),
      username: trainer.email,
      tempPassword: '',
      passwordResetRequired: false,
    };
  }
  
  const guestData = localStorage.getItem('guest_user');
  if (guestData) {
    const guest = JSON.parse(guestData) as { name: string };
    return {
      id: 'GUEST',
      name: guest.name || 'Gast-Spieler',
      trainerEmail: '',
      createdAt: new Date().toISOString(),
      username: 'guest',
      tempPassword: '',
      passwordResetRequired: false,
    };
  }
  return {
    id: 'GUEST',
    name: 'Gast-Spieler',
    trainerEmail: '',
    createdAt: new Date().toISOString(),
    username: 'guest',
    tempPassword: '',
    passwordResetRequired: false,
  };
}

function TrainingSessionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { trainer } = useAuth();
  const authPlayer = useMemo(() => (isMounted ? getTrainingPlayer(trainer) : null), [isMounted, trainer]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [selectedPins, setSelectedPins] = useState<number[]>([]);
  const [quickCount, setQuickCount] = useState('');
  const [standardThrows, setStandardThrows] = useState<Throw[]>([]);
  const [lanes, setLanes] = useState<LaneRecord>({ 1: [], 2: [], 3: [], 4: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [showLanes, setShowLanes] = useState(false);
  const [finishedSession, setFinishedSession] = useState<TrainingSession | null>(null);
  const [copied, setCopied] = useState(false);

  const mode = (searchParams.get('mode') === 'game_120' ? 'game_120' : 'standard') as GameMode;
  const activeLane = mode === 'game_120'
    ? laneKeys.find((lane) => lanes[lane].length < THROWS_PER_BLOCK) ?? 4
    : 1;
  const activeThrows = mode === 'game_120' ? lanes[activeLane] : standardThrows;
  const totalThrows = mode === 'game_120'
    ? laneKeys.reduce((acc, lane) => acc + lanes[lane].length, 0)
    : standardThrows.length;
  const disabledPins = useMemo(() => getDisabledPins(activeThrows), [activeThrows]);
  const isComplete = mode === 'game_120' ? totalThrows >= 120 : totalThrows >= THROWS_PER_BLOCK;
  const targetPlayerId = searchParams.get('playerId') ?? '';
  const isRecordingForAnotherPlayer = Boolean(trainer && targetPlayerId && authPlayer && targetPlayerId !== authPlayer.id && authPlayer.id !== 'GUEST');
  const isClearingPhase = getThrowLabel(totalThrows) === 'Abräumen';
  const remainingPins = isClearingPhase
    ? pinLayout.map((pin) => pin.id).filter((pin) => !disabledPins.includes(pin))
    : pinLayout.map((pin) => pin.id);
  const sessionTotal = mode === 'game_120'
    ? laneKeys.reduce((acc, lane) => acc + getScore(lanes[lane]), 0)
    : getScore(standardThrows);

  useEffect(() => {
    if (!isMounted) return;
    if (!authPlayer) { 
      setPlayer({ id: 'GUEST', name: 'Gast-Spieler', trainerEmail: '', createdAt: '', username: '', tempPassword: '', passwordResetRequired: false });
      return; 
    }
    if (!isRecordingForAnotherPlayer) { setPlayer(authPlayer); return; }
    if (!trainer) { router.push('/training'); return; }
    let cancelled = false;
    db.getPlayers(trainer.email)
      .then((players) => {
        if (cancelled) return;
        const targetPlayer = players.find((candidate) => candidate.id === targetPlayerId) ?? null;
        if (!targetPlayer) { router.push('/training'); return; }
        setPlayer(targetPlayer);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load target training player:', error);
        router.push('/training');
      });
    return () => { cancelled = true; };
  }, [authPlayer, isMounted, isRecordingForAnotherPlayer, router, targetPlayerId, trainer]);

  useEffect(() => {
    setSelectedPins((current) => current.filter((pin) => !disabledPins.includes(pin)));
  }, [disabledPins]);

  const togglePin = (pin: number) => {
    if (disabledPins.includes(pin) || isComplete) return;
    setSelectedPins((current) =>
      current.includes(pin)
        ? current.filter((entry) => entry !== pin)
        : [...current, pin].sort((a, b) => a - b)
    );
  };

  const saveThrow = (isMiss = false) => {
    if (isComplete) return;
    if (!isMiss && selectedPins.length === 0) return;
    const nextThrow: Throw = {
      id: Date.now(),
      pins: isMiss ? [] : selectedPins,
      timestamp: new Date().toISOString(),
    };
    if (mode === 'game_120') {
      setLanes((current) => ({ ...current, [activeLane]: [...current[activeLane], nextThrow] }));
    } else {
      setStandardThrows((current) => [...current, nextThrow]);
    }
    setSelectedPins([]);
    setQuickCount('');
  };

  const saveQuickThrow = () => {
    if (isComplete) return;
    const parsed = Number(quickCount);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > TOTAL_PINS) return;
    const quickPins = isClearingPhase
      ? remainingPins.slice(0, parsed)
      : Array.from({ length: parsed }, (_, index) => index + 1);
    if (parsed > 0 && quickPins.length !== parsed) return;
    const nextThrow: Throw = {
      id: Date.now(),
      pins: quickPins,
      timestamp: new Date().toISOString(),
    };
    if (mode === 'game_120') {
      setLanes((current) => ({ ...current, [activeLane]: [...current[activeLane], nextThrow] }));
    } else {
      setStandardThrows((current) => [...current, nextThrow]);
    }
    setSelectedPins([]);
    setQuickCount('');
  };

  const saveSpecificPinsThrow = (pins: number[]) => {
    if (isComplete || pins.length === 0) return;
    const nextThrow: Throw = {
      id: Date.now(),
      pins: [...pins].sort((a, b) => a - b),
      timestamp: new Date().toISOString(),
    };
    if (mode === 'game_120') {
      setLanes((current) => ({ ...current, [activeLane]: [...current[activeLane], nextThrow] }));
    } else {
      setStandardThrows((current) => [...current, nextThrow]);
    }
    setSelectedPins([]);
  };

  const saveSession = async () => {
    if (!player || totalThrows === 0 || isSaving) return;
    const session: TrainingSession = {
      id: `session_${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      trainerEmail: player.trainerEmail,
      timestamp: new Date().toISOString(),
      type: mode,
      recorderId: isRecordingForAnotherPlayer ? trainer?.email : undefined,
      recorderName: isRecordingForAnotherPlayer ? trainer?.name : undefined,
      throws: mode === 'standard' ? standardThrows : [],
      lanes: mode === 'game_120' ? lanes : undefined,
    };
    setIsSaving(true);
    try {
      if (player.id === 'GUEST') {
        const stored = localStorage.getItem('guest_sessions');
        const sessions = stored ? JSON.parse(stored) : [];
        sessions.unshift(session);
        localStorage.setItem('guest_sessions', JSON.stringify(sessions));
      } else {
        await db.saveSession(session);
      }
      setFinishedSession(session);
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = (platform: 'wa' | 'tg' | 'copy') => {
    if (!finishedSession) return;
    
    const shareData = {
      n: finishedSession.playerName || 'Spieler',
      t: finishedSession.timestamp,
      m: finishedSession.type,
      s: sessionTotal,
      id: finishedSession.id,
      th: finishedSession.throws,
      ln: finishedSession.lanes
    };
    
    const encoded = btoa(JSON.stringify(shareData)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const shareUrl = `${window.location.origin}/training/share?d=${encoded}`;
    const text = `Gut Holz! Ich habe gerade ${sessionTotal} Holz im ${finishedSession.type === 'game_120' ? '120er' : '30er'} Training geschoben. Schau es dir hier an: ${shareUrl}`;

    if (platform === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'tg') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isMounted || !player) return null;

  return (
    <div className="min-h-screen bg-[#fdf2f4] dark:bg-[#050505] text-foreground p-4 md:p-8">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-card/50 p-6 rounded-[2rem] border border-red-100 dark:border-white/5 shadow-sm">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/training')}
              className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2"
            >
              <ArrowLeft size={14} />
              Zurück zur Übersicht
            </button>
            <h1 className="text-3xl font-black tracking-tighter">
              {mode === 'game_120' ? 'Wettkampf 120' : 'Standardtraining'}
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {totalThrows}/{mode === 'game_120' ? 120 : 30} Würfe · {getThrowLabel(totalThrows)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Card className="min-w-[140px] bg-[#fff7f8] dark:bg-white/5 border-red-50 dark:border-white/5 rounded-2xl shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Spieler</span>
                <span className="font-bold text-sm truncate">{player.name}</span>
              </CardContent>
            </Card>
            <Card className="min-w-[100px] bg-[#fff7f8] dark:bg-white/5 border-red-50 dark:border-white/5 rounded-2xl shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pins</span>
                <span className="font-black text-2xl tabular-nums leading-none">{sessionTotal}</span>
              </CardContent>
            </Card>
            <Card className="min-w-[100px] bg-[#fff7f8] dark:bg-white/5 border-red-50 dark:border-white/5 rounded-2xl shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aktiv</span>
                <span className="font-bold text-sm text-primary">{getThrowLabel(totalThrows)}</span>
              </CardContent>
            </Card>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Collection Area */}
          <div className="space-y-8">
            <Card className="bg-white dark:bg-card/50 rounded-[2.5rem] border border-red-100 dark:border-white/5 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-red-50 dark:border-white/5 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black">Pins erfassen</CardTitle>
                    <CardDescription className="text-xs font-medium">Ab Wurf 16 bleiben getroffene Pins gesperrt, bis alle 9 gefallen sind.</CardDescription>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest">
                    {selectedPins.length} Ausgewählt
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                <div className="relative mx-auto w-full max-w-[320px] aspect-square bg-[#fffcfd] dark:bg-white/5 rounded-[3rem] border border-red-50 dark:border-white/5">
                  <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-4 p-8">
                    {pinLayout.map((pin) => {
                      const isSelected = selectedPins.includes(pin.id);
                      const isDisabled = disabledPins.includes(pin.id);
                      return (
                        <button
                          key={pin.id}
                          onClick={() => togglePin(pin.id)}
                          style={{ gridColumn: pin.x + 1, gridRow: pin.y + 1 }}
                          className={cn(
                            "rounded-full flex items-center justify-center text-xl font-black transition-all active:scale-90 shadow-sm border-2",
                            isSelected 
                              ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" 
                              : isDisabled
                                ? "bg-muted/30 border-transparent text-muted-foreground opacity-20"
                                : "bg-white dark:bg-card border-red-50 dark:border-white/10 hover:border-primary/50"
                          )}
                          disabled={isDisabled || isComplete}
                        >
                          {pin.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-12 flex flex-wrap gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="rounded-2xl h-14 px-8 font-bold border-red-100 dark:border-white/10 hover:bg-red-50 dark:hover:bg-white/5"
                    onClick={() => setSelectedPins([])}
                    disabled={selectedPins.length === 0 || isComplete}
                  >
                    Auswahl löschen
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="rounded-2xl h-14 px-8 font-bold border-red-100 dark:border-white/10 hover:bg-red-50 dark:hover:bg-white/5 text-red-500"
                    onClick={() => saveThrow(true)}
                    disabled={isComplete}
                  >
                    <CircleOff size={18} className="mr-2" />
                    Fehlwurf
                  </Button>
                  
                  {isClearingPhase ? (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="rounded-2xl h-14 px-8 font-bold border-emerald-100 dark:border-emerald-900/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10"
                      onClick={() => saveSpecificPinsThrow(remainingPins)}
                      disabled={remainingPins.length === 0 || isComplete}
                    >
                      <Sparkles size={18} className="mr-2" />
                      Räumen ({remainingPins.length})
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="rounded-2xl h-14 px-8 font-bold border-amber-100 dark:border-amber-900/30 text-amber-600 bg-amber-50/50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10"
                      onClick={() => saveSpecificPinsThrow(pinLayout.map(p => p.id))}
                      disabled={isComplete}
                    >
                      <Trophy size={18} className="mr-2" />
                      Alle 9!
                    </Button>
                  )}

                  <Button 
                    size="lg" 
                    className="rounded-2xl h-14 px-10 font-bold shadow-xl shadow-primary/20"
                    onClick={() => saveThrow(false)}
                    disabled={selectedPins.length === 0 || isComplete}
                  >
                    <Check size={18} className="mr-2" />
                    Wurf speichern
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Input Section */}
            <Card className="bg-white dark:bg-card/50 rounded-[2rem] border border-red-100 dark:border-white/5 shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Hash size={16} className="text-primary" />
                  Schnelle Eingabe
                </CardTitle>
                <CardDescription className="text-[11px]">Falls dir die einzelnen Pins egal sind, gib nur die gefallene Zahl von 0 bis 9 ein.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={quickCount}
                  onChange={(e) => setQuickCount(e.target.value)}
                  placeholder="0-9"
                  className="w-24 h-12 rounded-xl border border-red-50 dark:border-white/10 bg-muted/30 px-4 font-black text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl px-6 font-bold border-red-50 dark:border-white/10 text-primary bg-[#fff7f8] dark:bg-white/5"
                  onClick={saveQuickThrow}
                  disabled={!quickCount || isComplete}
                >
                  <Check size={16} className="mr-2" />
                  Zahl speichern
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Protocol */}
            <Card className="bg-white dark:bg-card/50 rounded-[2rem] border border-red-100 dark:border-white/5 shadow-lg overflow-hidden flex flex-col h-[500px]">
              <CardHeader className="border-b border-red-50 dark:border-white/5 bg-muted/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-black">Live-Protokoll</CardTitle>
                  <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 tracking-widest">Bahn {activeLane}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {activeThrows.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="border-2 border-dashed border-red-100 dark:border-white/5 rounded-3xl p-10 text-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Noch keine Würfe erfasst.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-red-50 dark:divide-white/5">
                    {[...activeThrows].reverse().map((t, idx) => (
                      <div key={t.id} className="p-4 flex items-center justify-between hover:bg-red-50/30 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-muted-foreground w-6">#{activeThrows.length - idx}</span>
                          <div className="flex flex-wrap gap-1">
                            {t.pins.length === 0 ? (
                              <span className="text-[10px] font-black text-red-500 uppercase">Fehlwurf</span>
                            ) : (
                              t.pins.map(p => (
                                <span key={p} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">{p}</span>
                              ))
                            )}
                          </div>
                        </div>
                        <span className="font-black text-lg text-primary tabular-nums">{t.pins.length}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Action */}
            <Card className="bg-white dark:bg-card/50 rounded-[2rem] border border-red-100 dark:border-white/5 shadow-xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-black">Session speichern</CardTitle>
                <CardDescription className="text-xs">Du kannst jederzeit speichern. Für den Wettkampf werden alle vier Bahnen zusammen abgelegt.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-primary/20"
                  onClick={saveSession}
                  disabled={totalThrows === 0 || isSaving}
                >
                  <Save size={18} className="mr-2" />
                  {isSaving ? 'Speichern...' : 'Session speichern'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Popup */}
      {finishedSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md rounded-[2.5rem] border-none bg-gradient-to-br from-red-600 to-rose-800 text-white p-8 shadow-3xl text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Trophy size={160} />
            </div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 border border-white/30 animate-bounce">
                  <Trophy size={40} className="text-white" />
                </div>
                <div className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Training Beendet</div>
                <div className="text-7xl font-black tabular-nums tracking-tighter">{sessionTotal}</div>
                <div className="text-lg font-bold mt-2 opacity-90">Holz Gesamtergebnis</div>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-sm font-medium text-white/70">Teile dein Ergebnis mit deinem Trainer oder deinen Teamkollegen:</p>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => handleShare('wa')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg group"
                  >
                    <MessageCircle size={24} />
                    <span className="text-[10px] font-black uppercase">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => handleShare('tg')}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-sky-500 hover:bg-sky-400 transition-colors shadow-lg group"
                  >
                    <Send size={24} />
                    <span className="text-[10px] font-black uppercase">Telegram</span>
                  </button>
                  <button 
                    onClick={() => handleShare('copy')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all shadow-lg group",
                      copied ? "bg-white text-primary" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    {copied ? <Check size={24} /> : <LinkIcon size={24} />}
                    <span className="text-[10px] font-black uppercase">{copied ? 'Kopiert!' : 'Link'}</span>
                  </button>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/training')}
                className="w-full h-14 rounded-2xl bg-white text-red-600 hover:bg-white/90 font-black uppercase tracking-widest text-xs mt-4 shadow-xl border-none"
              >
                Fertig
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TrainingSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf2f4] dark:bg-background" />}>
      <TrainingSessionPageContent />
    </Suspense>
  );
}
