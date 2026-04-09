import Link from 'next/link';
import Menubar from "@/components/menubar";
import { Trophy, Users, Calendar, Target, TrendingUp, ArrowRight, Play } from 'lucide-react';

const features = [
  {
    icon: Trophy,
    title: 'Tabellen',
    description: 'Aktuelle Spielstände und Ligatabellen',
    href: '/scores',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Users,
    title: 'Spieler',
    description: 'Individuelle Statistiken und Leistungsdaten',
    href: '/search',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Calendar,
    title: 'Spielplan',
    description: 'Alle Termine und Begegnungen auf einen Blick',
    href: '/tournaments',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Target,
    title: 'Training',
    description: 'Trainingsdaten erfassen und auswerten',
    href: '/training',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-10 space-y-16">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Live Daten
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Kegeln.<br />
              <span className="text-primary">Ergebnisse.</span><br />
              Statistiken.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Dein digitaler Begleiter für Ligatabellen, Spielpläne und detaillierte Spielerstatistiken. Alles an einem Ort.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link 
                href="/scores" 
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                <Trophy size={18} />
                Tabellen ansehen
              </Link>
              <Link 
                href="/tournaments" 
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
              >
                <Play size={18} />
                Spielplan
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className={`inline-flex rounded-xl ${feature.bgColor} p-3 text-2xl`}>
                <feature.icon className={feature.color} size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Mehr erfahren <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <TrendingUp className="text-amber-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Saison-Highlights</h2>
                <p className="text-sm text-muted-foreground">Die besten Leistungen dieser Saison</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <div className="font-semibold">Höchster Einzelschnitt</div>
                  <div className="text-sm text-muted-foreground">Saisonübergreifende Analyse</div>
                </div>
                <div className="text-2xl font-bold text-primary">8.42</div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <div className="font-semibold">Beste Serie</div>
                  <div className="text-sm text-muted-foreground">800+ Holzdurchgang</div>
                </div>
                <div className="text-2xl font-bold text-primary">847</div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <div className="font-semibold">Spiele gesamt</div>
                  <div className="text-sm text-muted-foreground">Diese Saison erfasst</div>
                </div>
                <div className="text-2xl font-bold text-primary">842</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-rose-500/10 p-3">
                <Users className="text-rose-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Für Trainer</h2>
                <p className="text-sm text-muted-foreground">Verwalte deine Spieler</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Als Trainer hast du Zugriff auf exklusive Funktionen: Spieler-Management, Trainingsdaten und detaillierte Leistungsanalysen.
            </p>
            <div className="space-y-3">
              <Link 
                href="/trainer/login"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
              >
                <span className="font-medium">Trainer-Login</span>
                <ArrowRight size={16} className="text-muted-foreground" />
              </Link>
              <Link 
                href="/trainer/register"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
              >
                <span className="font-medium">Noch kein Konto?</span>
                <ArrowRight size={16} className="text-muted-foreground" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-8 text-center">
          <h2 className="text-2xl font-bold">Spieler suchen</h2>
          <p className="mt-2 text-muted-foreground">Finde schnell Ergebnisse und Statistiken zu einem bestimmten Spieler</p>
          <Link 
            href="/search"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Users size={18} />
            Zur Spielersuche
          </Link>
        </section>
      </main>

      <footer className="mt-16 border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">Impressum</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lennard Sdrojek / KSC RW Berliner
            </p>
            <p className="text-sm text-muted-foreground">Hämmerlingstr. 88 • Berlin Köpenick</p>
          </div>
          <div>
            <h3 className="font-semibold">Kontakt</h3>
            <p className="mt-2 text-sm text-muted-foreground">lennard.sdrojek@osz-lise-meitner.eu</p>
          </div>
          <div>
            <h3 className="font-semibold">Quick Links</h3>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <Link href="/scores" className="text-muted-foreground hover:text-foreground">Tabellen</Link>
              <Link href="/tournaments" className="text-muted-foreground hover:text-foreground">Spielplan</Link>
              <Link href="/training" className="text-muted-foreground hover:text-foreground">Training</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
