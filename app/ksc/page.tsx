'use client';

import Link from 'next/link';
import Menubar from '@/components/menubar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin, Clock, Phone, Mail, Users, Trophy, Calendar,
  ChevronRight, Star, Shield, Info, Target, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TRAINING_TIMES = [
  { day: 'Mittwoch', time: '18:00 – 21:30 Uhr', icon: Clock },
  { day: 'Donnerstag', time: '18:00 – 21:30 Uhr', icon: Clock },
];

const TEAMS = [
  { league: 'SKVB (Berlin/Brandenburg)', desc: '1 Mannschaft im gemeinsamen Spielbetrieb', color: 'text-red-500', bg: 'bg-red-500/10' },
  { league: 'Berliner Liga', desc: '3 gemischte Mannschaften (u.a. Berliner Vereinsliga)', color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const CONTACTS = [
  { role: 'Präsident', name: 'Rainer Schürer', email: 'yrs.schuerer@t-online.de', icon: Shield },
  { role: 'Sportwart', name: 'Robert Schild', email: 'robertschild@gmx.net', icon: Target },
];

const MILESTONES = [
  { year: '1963', text: 'Gründung durch neun Bohlekegler — Wechsel auf Asphaltbahnen' },
  { year: '~1970s', text: 'Aufstieg in die Bezirksliga, Mitgliederzahl wächst auf ~40 Sportfreunde' },
  { year: 'Heute', text: 'Aktiver Spielbetrieb in Berlin & Brandenburg — gern gesehener Gast auf den Bahnen der Region' },
];

export default function KSCPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-12">

        {/* Hero */}
        <Card className="relative overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-red-600/20 via-background to-rose-500/10">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-red-500/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-rose-500/5 blur-2xl" />
          </div>
          <CardHeader className="relative p-8 md:p-12 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 border border-red-500/20">
                    <Star className="h-3 w-3" /> Seit 1963
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                    <MapPin className="h-3 w-3" /> Berlin-Köpenick
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Unser Verein</div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                    KSC Rot-Weiß<br />
                    <span className="text-red-600 dark:text-red-500">Berliner Bär</span>
                  </h1>
                </div>
                <p className="text-muted-foreground font-medium max-w-2xl text-lg leading-relaxed">
                  Kegeln mit Tradition seit 1963 – gemeinsam stark in Berlin und Brandenburg.
                  Heimstätte ist das Kegelsportzentrum Hämmerlingstraße in Köpenick,
                  direkt neben dem Stadion An der Alten Försterei.
                </p>
              </div>

              {/* Quick Facts */}
              <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                {[
                  { label: 'Gegründet', value: '1963', color: 'text-red-500' },
                  { label: 'Mannschaften', value: '4', color: 'text-blue-500' },
                  { label: 'Trainingstage', value: '2/Woche', color: 'text-emerald-500' },
                  { label: 'Ligen', value: '2', color: 'text-orange-500' },
                ].map((f) => (
                  <div key={f.label} className="rounded-2xl bg-card border border-border/50 p-4 text-center shadow-sm">
                    <div className={cn('text-2xl font-black tabular-nums', f.color)}>{f.value}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Training + Location */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Training Times */}
          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
            <CardHeader className="p-8 border-b border-border/50">
              <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Clock size={20} /></div>
                Trainingszeiten
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {TRAINING_TIMES.map(({ day, time }) => (
                <div key={day} className="flex items-center justify-between rounded-2xl bg-emerald-500/5 border border-emerald-500/20 px-6 py-4">
                  <div className="font-black text-lg">{day}</div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                    <Clock size={14} />
                    {time}
                  </div>
                </div>
              ))}
              <div className="pt-2 rounded-2xl bg-muted/30 px-6 py-4 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trainingsort</div>
                <div className="font-black text-base">Kegelsportzentrum Hämmerlingstraße</div>
                <div className="text-sm text-muted-foreground font-medium">Hämmerlingstr. 80 – 88, 12555 Berlin-Köpenick</div>
              </div>
              <a
                href="https://maps.google.com/?q=Hämmerlingstr.+80,+12555+Berlin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full rounded-2xl bg-primary/10 text-primary px-6 py-3 font-black text-sm hover:bg-primary/20 transition-colors"
              >
                <MapPin size={16} /> In Google Maps öffnen <ChevronRight size={14} className="ml-auto" />
              </a>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
            <CardHeader className="p-8 border-b border-border/50">
              <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Users size={20} /></div>
                Kontakt & Vorstand
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {CONTACTS.map(({ role, name, email, icon: Icon }) => (
                <div key={role} className="rounded-2xl bg-blue-500/5 border border-blue-500/20 px-6 py-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Icon size={16} /></div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{role}</div>
                  </div>
                  <div className="font-black text-lg pl-1">{name}</div>
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium pl-1"
                  >
                    <Mail size={13} /> {email}
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Teams */}
        <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl">
          <CardHeader className="p-8 border-b border-border/50">
            <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Trophy size={20} /></div>
              Unsere Mannschaften (aktuelle Saison)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 grid gap-4 sm:grid-cols-2">
            {TEAMS.map(({ league, desc, color, bg }) => (
              <div key={league} className={cn('rounded-2xl border px-6 py-5 space-y-2', bg, 'border-current/20')}>
                <div className={cn('text-[10px] font-black uppercase tracking-widest', color)}>{league}</div>
                <div className="font-bold text-sm text-foreground/80">{desc}</div>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl bg-muted/30 px-6 py-4">
              <Link
                href="/club?name=KSC+Rot-Wei%C3%9F+Berliner+B%C3%A4r"
                className="flex items-center gap-2 text-sm font-black text-primary hover:underline"
              >
                Vereinsstatistiken im Mirror ansehen <ChevronRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Club History */}
        <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl relative">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Award size={200} />
          </div>
          <CardHeader className="p-8 border-b border-border/50 relative">
            <CardTitle className="text-2xl font-black uppercase flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><Award size={20} /></div>
              Geschichte & Meilensteine
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 relative space-y-0">
            {MILESTONES.map(({ year, text }, i) => (
              <div key={year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Star size={14} />
                  </div>
                  {i < MILESTONES.length - 1 && (
                    <div className="w-px flex-1 bg-border/50 my-2" />
                  )}
                </div>
                <div className="pb-8 space-y-1 pt-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">{year}</div>
                  <div className="font-medium text-foreground/80">{text}</div>
                </div>
              </div>
            ))}

            <div className="mt-4 rounded-2xl bg-muted/30 p-6 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Info size={12} /> Über uns
              </div>
              <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                Gegründet im Mai 1963 von neun Bohlekeglern, die auf Asphaltbahnen wechselten,
                hat sich der KSC Rot-Weiss Berliner Bär schnell etabliert. Frühe Erfolge – etwa
                der Aufstieg in die Bezirksliga – und stetiger Zulauf ließen den Club zeitweise
                auf rund 40 Sportfreundinnen und Sportfreunde anwachsen. Über Jahrzehnte mit
                Höhen und Tiefen geblieben: Wir sind bis heute ein gern gesehener Gast auf den
                Bahnen der Region.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/scores"
            className="rounded-[2rem] bg-card border border-border/50 p-8 hover:border-primary/30 hover:shadow-lg transition-all group flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Liga</div>
              <div className="text-xl font-black">Aktuelle Tabellen</div>
            </div>
            <Trophy className="text-primary h-8 w-8 group-hover:scale-110 transition-transform" />
          </Link>
          <Link
            href="/training"
            className="rounded-[2rem] bg-card border border-border/50 p-8 hover:border-emerald-500/30 hover:shadow-lg transition-all group flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Club</div>
              <div className="text-xl font-black">Training erfassen</div>
            </div>
            <Target className="text-emerald-500 h-8 w-8 group-hover:scale-110 transition-transform" />
          </Link>
        </div>

      </main>
    </div>
  );
}
