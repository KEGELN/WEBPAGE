'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import { db, Player, Throw, Trainer, TrainingSession } from '@/lib/db';
import { ArrowLeft, Check, CircleOff, Save, Trophy, Hash } from 'lucide-react';

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

function getTrainingPlayer(): Player | null {
  if (typeof window === 'undefined') return null;

  const playerAuth = localStorage.getItem('player_auth');
  if (playerAuth) {
    return JSON.parse(playerAuth) as Player;
  }

  const trainerAuth = localStorage.getItem('trainer_user');
  if (!trainerAuth) {
    return null;
  }

  const trainer = JSON.parse(trainerAuth) as Trainer;
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

export default function TrainingSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [player] = useState<Player | null>(() => {
    return getTrainingPlayer();
  });
  const [selectedPins, setSelectedPins] = useState<number[]>([]);
  const [quickCount, setQuickCount] = useState('');
  const [standardThrows, setStandardThrows] = useState<Throw[]>([]);
  const [lanes, setLanes] = useState<LaneRecord>({ 1: [], 2: [], 3: [], 4: [] });
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!player) router.push('/login');
  }, [player, router]);

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
      setLanes((current) => ({
        ...current,
        [activeLane]: [...current[activeLane], nextThrow],
      }));
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

    const nextThrow: Throw = {
      id: Date.now(),
      pins: Array.from({ length: parsed }, (_, index) => index + 1),
      timestamp: new Date().toISOString(),
    };

    if (mode === 'game_120') {
      setLanes((current) => ({
        ...current,
        [activeLane]: [...current[activeLane], nextThrow],
      }));
    } else {
      setStandardThrows((current) => [...current, nextThrow]);
    }

    setSelectedPins([]);
    setQuickCount('');
  };

  const saveSession = async () => {
    if (!player || totalThrows === 0 || isSaving) return;

    const session: TrainingSession = {
      id: `session_${Date.now()}`,
      playerId: player.id,
      trainerEmail: player.trainerEmail,
      timestamp: new Date().toISOString(),
      type: mode,
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

  const sessionTotal = mode === 'game_120'
    ? laneKeys.reduce((acc, lane) => acc + getScore(lanes[lane]), 0)
    : getScore(standardThrows);

  if (!player) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-6 sm:py-10 space-y-6">
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <button
              onClick={() => router.push('/training')}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Zurück zur Übersicht
            </button>
            <h1 className="text-2xl font-bold">
              {mode === 'game_120' ? 'Wettkampfmodus' : 'Standardtraining'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'game_120'
                ? `Bahn ${activeLane} von 4 · ${totalThrows}/120 Würfe`
                : `${totalThrows}/30 Würfe · ${getThrowLabel(totalThrows)}`
              }
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spieler</div>
              <div className="mt-1 text-sm font-semibold">{player.name}</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pins</div>
              <div className="mt-1 text-2xl font-black">{sessionTotal}</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aktiv</div>
              <div className="mt-1 text-sm font-semibold">{getThrowLabel(totalThrows)}</div>
            </div>
          </div>
        </section>

        {mode === 'game_120' && (
          <section className="grid gap-3 sm:grid-cols-4">
            {laneKeys.map((lane) => {
              const laneThrows = lanes[lane];
              const isLaneActive = lane === activeLane && laneThrows.length < THROWS_PER_BLOCK;

              return (
                <div
                  key={lane}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isLaneActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">Bahn {lane}</div>
                    <Trophy size={16} className={isLaneActive ? 'text-primary' : 'text-muted-foreground'} />
                  </div>
                  <div className="mt-2 text-2xl font-black">{getScore(laneThrows)}</div>
                  <div className="text-xs text-muted-foreground">{laneThrows.length}/30 Würfe</div>
                </div>
              );
            })}
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Pins erfassen</h2>
                <p className="text-sm text-muted-foreground">
                  Ab Wurf 16 bleiben getroffene Pins gesperrt, bis alle 9 gefallen sind.
                </p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase text-muted-foreground">
                {selectedPins.length} ausgewählt
              </div>
            </div>

            <div className="mx-auto grid w-fit grid-cols-5 gap-3 rounded-[2rem] bg-muted/30 p-5">
              {pinLayout.map((pin) => {
                const isSelected = selectedPins.includes(pin.id);
                const isDisabled = disabledPins.includes(pin.id);

                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => togglePin(pin.id)}
                    style={{ gridColumnStart: pin.x + 1, gridRowStart: pin.y + 1 }}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border text-lg font-black transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : isDisabled
                          ? 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-45'
                          : 'border-border bg-card hover:border-primary hover:text-primary'
                    }`}
                    disabled={isDisabled || isComplete}
                  >
                    {pin.id}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setSelectedPins([])}
                className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Auswahl löschen
              </button>
              <button
                onClick={() => saveThrow(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15"
              >
                <CircleOff size={16} />
                Fehlwurf
              </button>
              <button
                onClick={() => saveThrow(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={selectedPins.length === 0 || isComplete}
              >
                <Check size={16} />
                Wurf speichern
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Hash size={16} className="text-primary" />
                Schnelle Eingabe
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Falls dir die einzelnen Pins egal sind, gib nur die gefallene Zahl von 0 bis 9 ein.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={quickCount}
                  onChange={(event) => setQuickCount(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-[180px]"
                  placeholder="0-9"
                />
                <button
                  onClick={saveQuickThrow}
                  disabled={quickCount === '' || isComplete}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                >
                  <Check size={16} />
                  Zahl speichern
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Live-Protokoll</h2>
                <span className="text-xs text-muted-foreground">
                  {mode === 'game_120' ? `Bahn ${activeLane}` : 'Bahn 1'}
                </span>
              </div>
              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {activeThrows.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Noch keine Würfe erfasst.
                  </div>
                ) : (
                  activeThrows.map((throwItem, index) => (
                    <div key={throwItem.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">Wurf {index + 1}</div>
                        <div className="text-xs text-muted-foreground">{getThrowLabel(index)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {throwItem.pins.length === 0 ? (
                          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">Fehlwurf</span>
                        ) : (
                          throwItem.pins.map((pin) => (
                            <span key={`${throwItem.id}-${pin}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {pin}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">Session speichern</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Du kannst jederzeit speichern. Für den Wettkampf werden alle vier Bahnen zusammen abgelegt.
              </p>
              <button
                onClick={saveSession}
                disabled={totalThrows === 0 || isSaving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Speichert...' : 'Session speichern'}
              </button>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
