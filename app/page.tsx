'use client';

import Link from 'next/link';
import Menubar from "@/components/menubar";
import { Trophy, Users, Calendar, Target, TrendingUp, ArrowRight, Play, Download, Search, Share2, Info, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState, useMemo } from 'react';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Select } from '@/components/ui/select';

const features = [
  {
    icon: Trophy,
    title: 'Tabellen',
    description: 'Aktuelle Spielstände und Ligatabellen der laufenden Saison.',
    href: '/scores',
    color: 'text-red-600 dark:text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Users,
    title: 'Spieler',
    description: 'Detaillierte Profile, Historien und Leistungsstatistiken.',
    href: '/search',
    color: 'text-rose-600 dark:text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    icon: Calendar,
    title: 'Spielplan',
    description: 'Termine, Ergebnisse und ICS-Export für deinen Kalender.',
    href: '/tournaments',
    color: 'text-orange-600 dark:text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Target,
    title: 'Training',
    description: 'Erfasse deine Trainingsdaten und teile deine Erfolge.',
    href: '/training',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

function Reveal({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {children}
    </div>
  );
}

interface HomeGame {
  id: string;
  date: string;
  time: string;
  teamHome: string;
  teamAway: string;
  result: string;
  info: string;
}

function HomeCalendar() {
  const apiService = ApiService.getInstance();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<HomeGame[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const seasons = await apiService.getCurrentSeason();
        if (!seasons || seasons.length === 0) return;
        const currentSeason = seasons[0].season_id;
        
        const leagues = await apiService.getLeagues(currentSeason);
        const topLeagues = leagues.filter(l => 
          l.name_der_liga.toLowerCase().includes('berlin') || 
          l.liga_id === '3874'
        ).slice(0, 2);
        
        if (topLeagues.length === 0) topLeagues.push(...leagues.slice(0, 2));

        const gamesPromises = topLeagues.map(l => apiService.getSpielplan(currentSeason, l.liga_id));
        const results = await Promise.all(gamesPromises);
        const allGames = results.flat();
        
        if (allGames && allGames.length > 0) {
          const gameObjects = allGames.map(g => ({
            id: g.game_id,
            date: g.date_time.split(' - ')[0],
            time: g.date_time.split(' - ')[1],
            teamHome: g.team_home,
            teamAway: g.team_away,
            result: g.result,
            info: g.spieltag
          }));

          setGames(gameObjects);
          const teamNames = Array.from(new Set(gameObjects.flatMap(g => [g.teamHome, g.teamAway]))).sort();
          setTeams(teamNames);
        }
      } catch (err) {
        console.error('Home calendar error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredGames = useMemo(() => {
    if (!selectedTeam) return games.slice(0, 6);
    return games.filter(g => g.teamHome === selectedTeam || g.teamAway === selectedTeam).slice(0, 10);
  }, [games, selectedTeam]);

  const handleDownloadICS = () => {
    if (!selectedTeam || filteredGames.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//KegelWeb//NONSGML v1.0//EN\n";
    
    filteredGames.forEach(game => {
      const dateParts = game.date.split('.'); 
      if (dateParts.length !== 3) return;
      const year = dateParts[2];
      const month = dateParts[1];
      const day = dateParts[0];
      const timeParts = (game.time || "10:00").split(':');
      const hour = timeParts[0].padStart(2, '0');
      const minute = timeParts[1].padStart(2, '0');
      
      const start = `${year}${month}${day}T${hour}${minute}00`;
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `SUMMARY:Kegeln: ${game.teamHome} vs ${game.teamAway}\n`;
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DESCRIPTION:Spiel im Sportwinner System. ${game.info || ''}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `spielplan-${selectedTeam.replace(/\s+/g, '-').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border border-border bg-card shadow-xl overflow-hidden rounded-[2rem]">
      <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Calendar className="text-primary h-6 w-6" />
              SPIELKALENDER
            </CardTitle>
            <CardDescription className="font-medium">Termine & Ergebnisse</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={selectedTeam} 
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full md:w-[240px] h-10 text-xs font-bold rounded-xl"
            >
              <option value="">Alle Mannschaften</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-xl"
              onClick={handleDownloadICS}
              disabled={!selectedTeam}
              title="ICS Export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="sm" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lade Spieldaten...</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGames.map((game, idx) => (
              <div key={`${game.id}-${idx}`} className="p-5 hover:bg-accent/50 transition-all flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl bg-muted border border-border group-hover:border-primary/30 transition-all">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">{game.date.split('.')[0]}.{game.date.split('.')[1]}</span>
                    <span className="text-xs font-bold text-foreground">{game.time || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">{game.teamHome}</span>
                      <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50">VS</span>
                      <span className="font-bold text-sm sm:text-base">{game.teamAway}</span>
                    </div>
                    {game.info && <span className="text-[10px] font-medium text-muted-foreground mt-0.5 italic">{game.info}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-primary font-black text-lg tabular-nums tracking-tighter bg-primary/5 px-3 py-1 rounded-lg border border-primary/10">
                    {game.result || '- : -'}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                </div>
              </div>
            ))}
            {filteredGames.length === 0 && (
              <div className="py-16 text-center">
                <Info className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Keine Spiele gefunden</p>
              </div>
            )}
          </div>
        )}
        <div className="p-4 bg-muted/10 border-t border-border flex justify-center">
          <Button asChild variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-white transition-all rounded-full px-6">
            <Link href="/tournaments" className="flex items-center gap-2">
              VOLLSTÄNDIGER SPIELPLAN <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      <Menubar />
      
      <main className="container mx-auto px-4 py-10 space-y-32">
        {/* Hero Section */}
        <Reveal>
          <section className="relative mt-8">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 -right-20 w-80 h-80 bg-rose-600/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-10 animate-in fade-in zoom-in duration-1000">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live Berliner Kegelsport
              </div>
              
              <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.8] mb-12">
                KEGLER HUB.
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground font-semibold leading-relaxed mb-12 max-w-2xl mx-auto px-4">
                Präzise Daten aus dem Sportwinner-System. Tabellen, Termine und Statistiken in einem modernen Interface.
              </p>
              
              <div className="flex flex-wrap gap-6 justify-center">
                <Button asChild size="lg" className="rounded-full h-16 px-10 font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/40 hover:shadow-primary/60 transition-all hover:scale-105 active:scale-95">
                  <Link href="/scores">
                    <Trophy className="mr-3 h-5 w-5" />
                    Ligatabellen
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full h-16 px-10 font-black text-xs uppercase tracking-widest border-border bg-card/50 backdrop-blur-xl hover:bg-accent transition-all hover:scale-105 active:scale-95 border-2">
                  <Link href="/tournaments">
                    <Calendar className="mr-3 h-5 w-5 text-primary" />
                    Spielplan
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Feature Bento Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <Reveal key={feature.title} delay={idx * 100}>
              <Link
                href={feature.href}
                className="group relative h-full flex flex-col rounded-[2rem] border border-border bg-card p-8 shadow-sm transition-all hover:border-primary/30 hover:shadow-xl hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute -bottom-4 -right-4 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                  <feature.icon size={120} />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`inline-flex items-center justify-center rounded-xl ${feature.bgColor} h-12 w-12 group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                    <feature.icon className={feature.color} size={24} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight uppercase text-white">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground font-medium mb-10 leading-relaxed">{feature.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-auto">
                  Entdecken <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-500" />
                </div>
              </Link>
            </Reveal>
          ))}
        </section>

        {/* Calendar and Stats Section */}
        <section className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <Reveal delay={200}>
            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Termine</h2>
                <div className="h-px flex-1 mx-10 bg-gradient-to-r from-border to-transparent hidden md:block" />
              </div>
              <HomeCalendar />
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="space-y-8 h-full flex flex-col">
              <h2 className="text-4xl font-black tracking-tighter uppercase">Highlights</h2>
              <Card className="flex-1 rounded-[2.5rem] border-none bg-gradient-to-br from-red-600 to-rose-800 text-white p-10 shadow-2xl shadow-red-600/30 flex flex-col justify-between overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                  <TrendingUp size={240} />
                </div>
                <div className="relative z-10 space-y-10">
                  <div className="space-y-2">
                    <div className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Top Leistung</div>
                    <div className="text-8xl font-black tabular-nums tracking-tighter">847</div>
                    <div className="text-sm font-bold text-white/80 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      KSC RW Berliner Bär I · 2025
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/20">
                    <div className="space-y-1">
                      <div className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Spieler</div>
                      <div className="text-4xl font-black tabular-nums">1.242</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Schnitt</div>
                      <div className="text-4xl font-black tabular-nums">3.120</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 mt-16">
                  <Button asChild variant="secondary" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-red-600 hover:bg-white/90 transition-all hover:scale-[1.02]">
                    <Link href="/scores">Detaillierte Analyse</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </Reveal>
        </section>

        {/* Search Callout */}
        <Reveal delay={300}>
          <section className="rounded-[3rem] border border-border bg-card p-12 md:p-24 text-center relative overflow-hidden group shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-10">
              <div className="h-24 w-24 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 group-hover:rotate-12 transition-transform duration-700 border-4 border-background">
                <Search className="h-10 w-10" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter">DATEN FÜR ALLE.</h2>
              <p className="text-xl text-muted-foreground font-semibold leading-relaxed">
                Durchsuche tausende von historischen Datensätzen. Jedes Spiel, jeder Schnitt, jeder Trend. 
                Vollständig indiziert und blitzschnell abrufbar.
              </p>
              <div className="pt-6">
                <Button asChild size="lg" className="rounded-full h-16 px-12 font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all hover:scale-110 active:scale-95">
                  <Link href="/search">Spieler finden</Link>
                </Button>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="mt-40 border-t border-border bg-card py-20">
        <div className="container mx-auto px-4 grid gap-16 md:grid-cols-3">
          <div className="space-y-8">
            <div className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground not-italic font-black text-xl">KH</div>
              KEGLER HUB BERLIN
            </div>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xs">
              Die Evolution der Kegel-Statistik. 
              Entwickelt für Spieler, Trainer und Fans des Berliner Kegelsports.
            </p>
          </div>
          <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Kontakt</h3>
            <div className="space-y-4 text-sm font-bold">
              <p>Lennard Sdrojek / KSC RW Berliner</p>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Hämmerlingstr. 88 · Berlin Köpenick</p>
              <p className="text-primary hover:underline cursor-pointer text-xs">lennard.sdrojek@osz-lise-meitner.eu</p>
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Sitemap</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[10px] font-black uppercase tracking-widest">
              <Link href="/scores" className="hover:text-primary transition-colors">Tabellen</Link>
              <Link href="/tournaments" className="hover:text-primary transition-colors">Spielplan</Link>
              <Link href="/training" className="hover:text-primary transition-colors">Training</Link>
              <Link href="/live" className="hover:text-primary transition-colors">Live Scores</Link>
              <Link href="/search" className="hover:text-primary transition-colors">Suche</Link>
              <Link href="/berlin" className="hover:text-primary transition-colors">Berlin Liga</Link>
            </div>
          </div>
        </div>
        <div className="mt-20 border-t border-border pt-10 text-center text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40">
          © 2026 KEGLER HUB · ALL DATA SYNCED
        </div>

      </footer>
    </div>
  );
}
