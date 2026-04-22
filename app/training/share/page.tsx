'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Menubar from "@/components/menubar";
import { Trophy, Calendar, User, BarChart3, ArrowLeft, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ShareData = {
  n: string; // name
  t: string; // timestamp
  m: string; // mode
  s: number; // score
  id: string; // id
  th?: Array<{ pins: number[] }>; // throws
  ln?: Record<string, Array<{ pins: number[] }>>; // lanes
};

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

function PinShape({ pins, className = "" }: { pins: number[], className?: string }) {
  return (
    <div className={cn("relative w-full aspect-square bg-muted/10 rounded-xl border border-border/50", className)}>
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-1 p-2">
        {pinLayout.map((pin) => {
          const isHit = pins.includes(pin.id);
          return (
            <div
              key={pin.id}
              style={{ gridColumn: pin.x + 1, gridRow: pin.y + 1 }}
              className={cn(
                "rounded-full flex items-center justify-center text-[8px] font-black transition-all border",
                isHit 
                  ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                  : "bg-background border-border text-muted-foreground opacity-30"
              )}
            >
              {pin.id}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShareContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    const d = searchParams.get('d');

    if (id) {
      fetch(`/api/training/share?id=${encodeURIComponent(id)}`)
        .then((res) => {
          if (!res.ok) throw new Error('not found');
          return res.json();
        })
        .then((decoded) => setData(decoded))
        .catch(() => setError(true));
      return;
    }

    if (d) {
      try {
        const decoded = JSON.parse(atob(d.replace(/-/g, '+').replace(/_/g, '/')));
        const timer = setTimeout(() => setData(decoded), 0);
        return () => clearTimeout(timer);
      } catch {
        const timer = setTimeout(() => setError(true), 0);
        return () => clearTimeout(timer);
      }
    }

    const timer = setTimeout(() => setError(true), 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const allThrows = useMemo(() => {
    if (!data) return [];
    if (data.m === 'game_120' && data.ln) {
      return Object.entries(data.ln).flatMap(([lane, throws]) => 
        throws.map((t, idx) => ({ ...t, lane, nr: idx + 1 }))
      );
    }
    return (data.th || []).map((t, idx) => ({ ...t, lane: '1', nr: idx + 1 }));
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="text-destructive text-xl font-bold">Ungültiger Link</div>
        <p className="text-muted-foreground">Dieser Link ist nicht mehr gültig oder wurde beschädigt.</p>
        <Button asChild>
          <Link href="/training">Zum Training</Link>
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-red-600 to-rose-800 text-white border-none shadow-3xl overflow-hidden relative rounded-[3rem]">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <Trophy size={200} />
        </div>
        <CardHeader className="p-10 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
              <Target size={24} className="text-white" />
            </div>
            <CardDescription className="text-white/70 uppercase tracking-[0.3em] font-black text-[10px]">Trainingsergebnis</CardDescription>
          </div>
          <CardTitle className="text-7xl md:text-8xl font-black tracking-tighter tabular-nums">{data.s}</CardTitle>
          <p className="text-xl font-bold opacity-90 mt-2">Holz Gesamtergebnis</p>
        </CardHeader>
        <CardContent className="p-10 pt-0">
          <div className="flex flex-wrap gap-8 mt-8 border-t border-white/10 pt-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Spieler</span>
              <div className="flex items-center gap-2">
                <User size={16} className="text-white/70" />
                <span className="font-bold text-lg">{data.n}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Datum</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-white/70" />
                <span className="font-bold text-lg">{new Date(data.t).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Modus</span>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-white/70" />
                <span className="bg-white/20 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest">
                  {data.m === 'game_120' ? '120 Würfe' : '30 Würfe'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Throw Breakdown */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Wurf-für-Wurf Protokoll</h2>
          <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border to-transparent hidden md:block" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {allThrows.map((t, idx) => (
            <Card key={idx} className="bg-card border border-border/50 hover:border-primary/30 transition-all group rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wurf {t.nr}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Bahn {t.lane}</span>
              </div>
              <CardContent className="p-4 flex gap-4 items-center">
                <div className="w-16 h-16 shrink-0">
                  <PinShape pins={t.pins || []} />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tabular-nums">{t.pins?.length || 0}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Holz</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <div className="text-center space-y-8 pt-12 border-t border-border/50">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 mb-4">
          <Trophy size={32} className="text-primary" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-3xl font-black tracking-tighter mb-4">LUST AUF EIN DUELL?</h3>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Starte jetzt dein eigenes Training oder verwalte deine Spieler als Trainer. 
            Kegler Hub ist die modernste Art, Statistiken zu führen.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
            <Link href="/training">Selbst trainieren</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs border-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Zur Startseite
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TrainingSharePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-12">
        <Suspense fallback={<div className="text-center py-20 flex flex-col items-center gap-4">
          <LoadingSpinner />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lade Trainingsergebnis...</span>
        </div>}>
          <ShareContent />
        </Suspense>
      </main>
    </div>
  );
}
