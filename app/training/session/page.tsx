'use client';

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, Player, Throw, Trainer, TrainingSession } from '@/lib/db';
import { ArrowLeft, Check, CircleOff, Save, Trophy, Hash, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  if (!trainer) return null;
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
  const [showQuickInput, setShowQuickInput] = useState(false);

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
  const isRecordingForAnotherPlayer = Boolean(trainer && targetPlayerId && authPlayer && targetPlayerId !== authPlayer.id);
  const isClearingPhase = getThrowLabel(totalThrows) === 'Abräumen';
  const remainingPins = isClearingPhase
    ? pinLayout.map((pin) => pin.id).filter((pin) => !disabledPins.includes(pin))
    : pinLayout.map((pin) => pin.id);
  const sessionTotal = mode === 'game_120'
    ? laneKeys.reduce((acc, lane) => acc + getScore(lanes[lane]), 0)
    : getScore(standardThrows);

  useEffect(() => {
    if (!isMounted) return;
    if (!authPlayer) { router.push('/login'); return; }
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
    setShowQuickInput(false);
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

  const saveStrike = () => saveSpecificPinsThrow(pinLayout.map((pin) => pin.id));
  const saveClearedLane = () => saveSpecificPinsThrow(remainingPins);

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
      await db.saveSession(session);
      router.push('/training');
    } finally {
      setIsSaving(false);
    }
  };

  const selectLane = (lane: 1 | 2 | 3 | 4) => {
    setLanes((current) => {
      const newLanes = { ...current };
      newLanes[lane] = [];
      return newLanes;
    });
    setShowLanes(false);
  };

  if (!isMounted || !player) return null;

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => router.push('/training')}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{player.name}</div>
            <div className="font-bold">{sessionTotal} Holz</div>
          </div>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${
            isComplete ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
          }`}>
            {totalThrows}/{mode === 'game_120' ? 120 : 30}
          </div>
        </div>
        <button
          onClick={() => setShowLanes(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Trophy size={24} className={mode === 'game_120' ? 'text-primary' : 'text-muted-foreground'} />
        </button>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col justify-center px-4 py-6 space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {getThrowLabel(totalThrows)} • {isClearingPhase ? `${remainingPins.length} stehend` : '9 Pins'}
          </div>

          {showQuickInput ? (
            <div className="space-y-4">
              <button
                onClick={() => setShowQuickInput(false)}
                className="w-full p-3 rounded-xl border border-border text-sm text-muted-foreground"
              >
                <X size={20} className="inline mr-2" />
                Abbrechen
              </button>
              <div className="flex gap-3">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuickCount(String(num))}
                    className={`flex-1 h-14 rounded-xl text-xl font-bold transition-all ${
                      quickCount === String(num)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <button
                onClick={saveQuickThrow}
                disabled={quickCount === '' || isComplete}
                className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-xl disabled:opacity-50 active:scale-95 transition-transform"
              >
                <Check size={24} className="inline mr-2" />
                Speichern ({quickCount || 0})
              </button>
            </div>
          ) : (
            <div className="relative mx-auto w-full max-w-sm aspect-square">
              <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-2 p-4">
                {pinLayout.map((pin) => {
                  const isSelected = selectedPins.includes(pin.id);
                  const isDisabled = disabledPins.includes(pin.id);
                  return (
                    <button
                      key={pin.id}
                      onClick={() => togglePin(pin.id)}
                      style={{ gridColumn: pin.x + 1, gridRow: pin.y + 1 }}
                      className={`rounded-full flex items-center justify-center text-2xl sm:text-3xl font-black transition-all active:scale-90 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : isDisabled
                            ? 'bg-muted text-muted-foreground opacity-40'
                            : 'bg-card border-2 border-border hover:border-primary'
                      } ${(isDisabled || isComplete) ? 'pointer-events-none' : ''}`}
                    >
                      {pin.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {showQuickInput ? null : (
              <>
                <div className="flex gap-3">
                  <button
                    onClick={() => saveThrow(true)}
                    disabled={isComplete}
                    className="flex-1 h-14 rounded-2xl bg-destructive/10 text-destructive font-bold disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <CircleOff size={24} className="inline mr-2" />
                    0
                  </button>
                  <button
                    onClick={() => saveThrow(false)}
                    disabled={selectedPins.length === 0 || isComplete}
                    className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <Check size={24} className="inline mr-2" />
                    {selectedPins.length || '?'}
                  </button>
                </div>

                <div className="flex gap-3">
                  {isClearingPhase ? (
                    <button
                      onClick={saveClearedLane}
                      disabled={remainingPins.length === 0 || isComplete}
                      className="flex-1 h-14 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      <Sparkles size={24} className="inline mr-2" />
                      Räumen ({remainingPins.length})
                    </button>
                  ) : (
                    <button
                      onClick={saveStrike}
                      disabled={isComplete}
                      className="flex-1 h-14 rounded-2xl bg-amber-500 text-white font-bold disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      <Sparkles size={24} className="inline mr-2" />
                      Strike!
                    </button>
                  )}
                  <button
                    onClick={() => setShowQuickInput(true)}
                    className="h-14 px-6 rounded-2xl bg-muted font-bold active:scale-95 transition-transform"
                  >
                    <Hash size={24} className="inline" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-card">
          <div className="flex gap-1 overflow-x-auto px-4 py-3 -mx-4 scrollbar-hide">
            {activeThrows.length === 0 ? (
              <div className="w-full text-center text-sm text-muted-foreground py-4">
                Noch keine Würfe
              </div>
            ) : (
              activeThrows.slice(-15).map((throwItem, index) => {
                const actualIndex = Math.max(0, activeThrows.length - 15) + index;
                return (
                  <div
                    key={throwItem.id}
                    className="flex-shrink-0 w-12 h-14 rounded-xl bg-muted flex flex-col items-center justify-center"
                  >
                    <span className="text-lg font-bold">
                      {throwItem.pins.length || 'X'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {actualIndex + 1}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={saveSession}
            disabled={totalThrows === 0 || isSaving}
            className="w-full h-14 bg-green-600 text-white font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Save size={20} className="inline mr-2" />
            {isSaving ? 'Speichern...' : 'Training beenden'}
          </button>
        </div>
      </main>

      {showLanes && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-card w-full sm:w-auto sm:rounded-3xl p-6 sm:p-8 space-y-4 max-w-md">
            <h2 className="text-xl font-bold text-center">Bahn wählen</h2>
            <div className="grid grid-cols-2 gap-4">
              {laneKeys.map((lane) => {
                const laneThrows = lanes[lane];
                const isComplete = laneThrows.length >= THROWS_PER_BLOCK;
                return (
                  <button
                    key={lane}
                    onClick={() => selectLane(lane)}
                    className={`p-6 rounded-2xl border-2 text-center ${
                      isComplete
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    <div className="text-3xl font-black">{lane}</div>
                    <div className="text-sm text-muted-foreground">{getScore(laneThrows)} / 120</div>
                    <div className="text-xs text-muted-foreground">{laneThrows.length} Würfe</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowLanes(false)}
              className="w-full h-12 rounded-xl border border-border font-semibold"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrainingSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background text-foreground" />}>
      <TrainingSessionPageContent />
    </Suspense>
  );
}
