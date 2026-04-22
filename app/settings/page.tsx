'use client';

import { useEffect, useMemo, useState } from 'react';
import Menubar from '@/components/menubar';
import Footer from '@/components/Footer';
import ApiService from '@/lib/api-service';
import {
  readFavoriteLeagueId,
  writeFavoriteLeagueId,
  readFavoriteTeams,
  toggleFavoriteTeam,
  type FavoriteTeam,
} from '@/lib/client-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeSelector } from '@/components/ThemeToggle';
import { useTheme } from '@/lib/theme-context';
import { Star, StarOff, Trophy, Settings2, Palette, Users, ChevronDown, Check } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

type League = { liga_id: string; name_der_liga: string };
type Standing = { team_id: string; team_name: string; position: number; punkte: number; spiele: number; siege: number };

export default function SettingsPage() {
  const { expertMode, toggleExpertMode } = useTheme();
  const api = useMemo(() => ApiService.getInstance(), []);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [favoriteLeagueId, setFavoriteLeagueId] = useState('');

  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);

  const [leagueOpen, setLeagueOpen] = useState(false);

  useEffect(() => {
    setFavoriteLeagueId(readFavoriteLeagueId());
    setFavoriteTeams(readFavoriteTeams());
  }, []);

  useEffect(() => {
    setLeagueLoading(true);
    api.getLeagues().then((ls) => {
      setLeagues(ls);
      setLeagueLoading(false);
      const saved = readFavoriteLeagueId();
      if (saved) setSelectedLeagueId(saved);
    });
  }, [api]);

  useEffect(() => {
    if (!selectedLeagueId) return;
    setStandingsLoading(true);
    api.getStandings(selectedLeagueId).then((rows) => {
      setStandings(rows);
      setStandingsLoading(false);
    });
  }, [selectedLeagueId, api]);

  const selectedLeague = leagues.find((l) => l.liga_id === selectedLeagueId);
  const favoriteLeague = leagues.find((l) => l.liga_id === favoriteLeagueId);

  const handleSetFavoriteLeague = (id: string) => {
    writeFavoriteLeagueId(id);
    setFavoriteLeagueId(id);
    setSelectedLeagueId(id);
    setLeagueOpen(false);
  };

  const handleToggleTeam = (team: Standing) => {
    const next = toggleFavoriteTeam({
      clubId: team.team_id,
      clubName: team.team_name,
      leagueId: selectedLeagueId,
    });
    setFavoriteTeams(next);
  };

  const isFav = (teamId: string) => favoriteTeams.some((t) => t.clubId === teamId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-12 max-w-4xl space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase flex items-center gap-4">
            <Settings2 size={40} className="text-primary" />
            Einstellungen
          </h1>
          <p className="text-muted-foreground font-medium mt-2 text-sm">Passe Kegler Hub an deine Vorlieben an.</p>
        </div>

        {/* Theme */}
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
              <Palette size={20} className="text-primary" />
              Erscheinungsbild
            </CardTitle>
            <CardDescription>Wähle dein bevorzugtes Theme und aktiviere den Expert Mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ThemeSelector />
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={toggleExpertMode}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <div>
                  <div className="font-bold">Expert Mode</div>
                  <div className="text-xs text-muted-foreground">Zeigt erweiterte Statistiken und Daten an</div>
                </div>
                <span className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors',
                  expertMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {expertMode ? 'An' : 'Aus'}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Favorite League */}
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
              <Trophy size={20} className="text-primary" />
              Lieblingsliga
            </CardTitle>
            <CardDescription>
              Wähle deine Standard-Liga. Sie wird beim Start der Tabellen-Seite vorausgewählt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leagueLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <LoadingSpinner /> Ligen werden geladen…
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLeagueOpen((p) => !p)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span className="truncate">
                      {selectedLeague?.name_der_liga || 'Liga auswählen…'}
                    </span>
                    <ChevronDown size={16} className={cn('shrink-0 transition-transform', leagueOpen && 'rotate-180')} />
                  </button>
                  {leagueOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                      {leagues.map((l) => (
                        <button
                          key={l.liga_id}
                          type="button"
                          onClick={() => { setSelectedLeagueId(l.liga_id); setLeagueOpen(false); }}
                          className={cn(
                            'flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-muted transition-colors',
                            selectedLeagueId === l.liga_id && 'font-bold text-primary'
                          )}
                        >
                          <span className="truncate">{l.name_der_liga}</span>
                          {selectedLeagueId === l.liga_id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedLeagueId && selectedLeagueId !== favoriteLeagueId && (
                  <Button
                    onClick={() => handleSetFavoriteLeague(selectedLeagueId)}
                    className="w-full rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    <Star size={14} className="mr-2" />
                    Als Lieblingsliga speichern
                  </Button>
                )}
                {favoriteLeagueId && favoriteLeague && (
                  <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm">
                    <Star size={14} className="text-primary fill-primary shrink-0" />
                    <span className="font-bold text-primary truncate">{favoriteLeague.name_der_liga}</span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">Aktive Liga</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorite Teams */}
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
              <Users size={20} className="text-primary" />
              Lieblingsteams
            </CardTitle>
            <CardDescription>
              {selectedLeague
                ? `Wähle Favoriten aus ${selectedLeague.name_der_liga}`
                : 'Wähle oben eine Liga, um Teams als Favoriten zu markieren.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Saved favorites summary */}
            {favoriteTeams.length > 0 && (
              <div className="mb-6 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Deine Favoriten</div>
                <div className="flex flex-wrap gap-2">
                  {favoriteTeams.map((t) => (
                    <div key={t.clubId} className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                      <Star size={10} className="fill-primary" />
                      {t.clubName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* League standings to pick from */}
            {!selectedLeagueId ? (
              <p className="text-sm text-muted-foreground">Wähle zuerst eine Liga oben aus.</p>
            ) : standingsLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <LoadingSpinner /> Teams werden geladen…
              </div>
            ) : standings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Teams für diese Liga gefunden.</p>
            ) : (
              <div className="space-y-1">
                {standings.map((team) => {
                  const fav = isFav(team.team_id);
                  return (
                    <button
                      key={team.team_id}
                      type="button"
                      onClick={() => handleToggleTeam(team)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-all border',
                        fav
                          ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                          : 'bg-transparent border-transparent hover:bg-muted text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-muted-foreground w-5 text-right tabular-nums">{team.position}.</span>
                        <span className="font-medium">{team.team_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{team.punkte} Pkt</span>
                        {fav ? (
                          <Star size={16} className="text-primary fill-primary" />
                        ) : (
                          <StarOff size={16} className="text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black uppercase tracking-widest">Rechtliches</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-2">
            {[
              { href: '/privacy', label: 'Datenschutzerklärung' },
              { href: '/tos', label: 'Nutzungsbedingungen' },
              { href: '/impressum', label: 'Impressum' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border border-border px-4 py-3 text-sm font-bold hover:bg-muted transition-colors text-center"
              >
                {label}
              </a>
            ))}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
