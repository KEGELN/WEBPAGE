'use client';

import Image from 'next/image';
import logo from '@/images/logo.png';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, UserCircle2, LogOut, ChevronDown, Settings, Star } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/lib/theme-context';
import { readFavoriteTeams } from '@/lib/client-settings';

type AccountState =
  | { kind: 'trainer'; label: string }
  | { kind: 'player'; label: string }
  | { kind: 'guest'; label: string }
  | { kind: 'anonymous'; label: string };

function getAccountState(): AccountState {
  if (typeof window === 'undefined') return { kind: 'anonymous', label: 'Account' };

  const trainer = localStorage.getItem('trainer_user');
  const player = localStorage.getItem('player_auth');
  const guest = localStorage.getItem('guest_user');

  if (trainer) {
    const parsed = JSON.parse(trainer) as { email?: string };
    return { kind: 'trainer', label: parsed.email || 'Trainer' };
  }
  if (player) {
    const parsed = JSON.parse(player) as { username?: string; name?: string };
    return { kind: 'player', label: parsed.username || parsed.name || 'Spieler' };
  }
  if (guest) {
    const parsed = JSON.parse(guest) as { name?: string };
    return { kind: 'guest', label: parsed.name || 'Gast' };
  }
  return { kind: 'anonymous', label: 'Account' };
}

export default function Menubar() {
  const router = useRouter();
  const { expertMode } = useTheme();

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isTrainingMenuOpen, setIsTrainingMenuOpen] = useState(false);
  const [isMobileTrainingMenuOpen, setIsMobileTrainingMenuOpen] = useState(false);
  const [account, setAccount] = useState<AccountState>({ kind: 'anonymous', label: 'Account' });

  const visibleAccount = isMounted ? getAccountState() : account;
  const favoriteTeams = isMounted ? readFavoriteTeams() : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('trainer_user');
    localStorage.removeItem('player_auth');
    localStorage.removeItem('guest_user');
    setAccount({ kind: 'anonymous', label: 'Account' });
    setIsAccountMenuOpen(false);
    router.push('/login');
  };

  const closeAll = () => {
    setIsAccountMenuOpen(false);
    setIsTrainingMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileTrainingMenuOpen(false);
  };

  return (
    <nav className="bg-background text-foreground p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-xl font-bold text-primary mr-4" onClick={closeAll}>
            <Image src={logo} alt="Logo" width={48} height={48} priority />
            <span>Kegel Web</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-primary transition-colors font-medium">Start</Link>
            <Link href="/player" className="hover:text-primary transition-colors font-medium">Spieler</Link>
            <Link href="/berlin" className="hover:text-primary transition-colors font-medium font-black text-rose-500">Berlin</Link>
            <Link href="/scores" className="hover:text-primary transition-colors font-medium">Tabellen</Link>
            <Link href="/tournaments" className="hover:text-primary transition-colors font-medium">Spielplan</Link>
            <Link href="/live" className="hover:text-primary transition-colors font-medium">Live</Link>
            <Link href="/compare" className="hover:text-primary transition-colors font-medium">Vergleich</Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTrainingMenuOpen((p) => !p)}
                className="inline-flex items-center gap-1 font-medium transition-colors hover:text-primary"
              >
                Training
                <ChevronDown className={`h-4 w-4 transition-transform ${isTrainingMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTrainingMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl border border-border bg-card p-2 shadow-xl">
                  <Link href="/training" onClick={() => setIsTrainingMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    Training Home
                  </Link>
                  <Link href="/trainer/login" onClick={() => setIsTrainingMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    Trainer Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Right: Search + Theme + Account */}
          <div className="hidden md:flex items-center gap-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suchen…"
                  className="w-64 lg:w-72 py-2.5 px-4 pr-10 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Suchen">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Standalone theme toggle */}
            <ThemeToggle />

            {/* Account button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((p) => !p)}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <UserCircle2 className="h-5 w-5" />
                <span className="max-w-[120px] truncate">{visibleAccount.label}</span>
                {expertMode && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">Pro</span>
                )}
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                  {/* Account info */}
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {visibleAccount.kind === 'trainer' ? 'Trainer' :
                       visibleAccount.kind === 'player' ? 'Spieler' :
                       visibleAccount.kind === 'guest' ? 'Gast' : 'Nicht eingeloggt'}
                    </div>
                    <div className="mt-0.5 text-sm font-bold truncate">{visibleAccount.label}</div>
                  </div>

                  {/* Favorite teams quick-access */}
                  {favoriteTeams.length > 0 && (
                    <div className="p-2 border-b border-border">
                      <div className="text-[10px] px-2 py-1 uppercase tracking-wider text-muted-foreground font-black">Favoriten</div>
                      {favoriteTeams.slice(0, 3).map((t) => (
                        <Link
                          key={t.clubId}
                          href={t.leagueId ? `/scores?league=${t.leagueId}` : '/scores'}
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors"
                        >
                          <Star size={10} className="text-primary fill-primary shrink-0" />
                          <span className="truncate font-medium">{t.clubName}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="p-2 space-y-0.5">
                    {visibleAccount.kind === 'anonymous' ? (
                      <>
                        <Link href="/login" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <UserCircle2 size={15} />
                          Spieler Login
                        </Link>
                        <Link href="/trainer/login" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
                          <UserCircle2 size={15} />
                          Trainer Login
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={visibleAccount.kind === 'trainer' ? '/trainer/dashboard' : '/training'}
                          onClick={() => setIsAccountMenuOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors font-medium"
                        >
                          <UserCircle2 size={15} />
                          Mein Bereich
                        </Link>
                      </>
                    )}
                    <Link href="/settings" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <Settings size={15} />
                      Einstellungen
                    </Link>
                  </div>

                  {/* Logout */}
                  {visibleAccount.kind !== 'anonymous' && (
                    <div className="p-2 border-t border-border">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut size={15} />
                        Ausloggen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((p) => !p)}
              className="text-foreground focus:outline-none"
              aria-label="Account"
            >
              <UserCircle2 size={24} />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((p) => !p)}
              className="text-foreground focus:outline-none"
              aria-label="Menü"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 animate-in slide-in-from-top-5 fade-in duration-200">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Spieler, Ligen suchen…"
                  className="w-full py-3 px-4 pr-12 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Search size={20} />
                </button>
              </div>
            </form>
            <div className="flex flex-col space-y-1">
              {[
                { href: '/', label: 'Start' },
                { href: '/player', label: 'Spieler' },
                { href: '/scores', label: 'Tabellen' },
                { href: '/tournaments', label: 'Spielplan' },
                { href: '/live', label: 'Live' },
                { href: '/compare', label: 'Vergleich' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={closeAll} className="block px-4 py-2.5 hover:bg-muted rounded-lg font-medium">
                  {label}
                </Link>
              ))}
              <Link href="/berlin" onClick={closeAll} className="block px-4 py-2.5 hover:bg-muted rounded-lg font-black text-rose-500">
                Berlin
              </Link>

              {/* Training submenu */}
              <div className="rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setIsMobileTrainingMenuOpen((p) => !p)}
                  className="flex w-full items-center justify-between px-4 py-2.5 font-medium hover:bg-muted rounded-lg"
                >
                  <span>Training</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isMobileTrainingMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileTrainingMenuOpen && (
                  <div className="border-t border-border/60 py-1">
                    <Link href="/training" onClick={closeAll} className="block px-6 py-2 text-sm hover:bg-muted">Training Home</Link>
                    <Link href="/trainer/login" onClick={closeAll} className="block px-6 py-2 text-sm hover:bg-muted">Trainer Login</Link>
                  </div>
                )}
              </div>

              <Link href="/settings" onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted rounded-lg font-medium text-sm">
                <Settings size={15} />
                Einstellungen
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Account Dropdown */}
        {isAccountMenuOpen && (
          <div className="mt-4 md:hidden rounded-2xl border border-border bg-card shadow-md overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {visibleAccount.kind === 'trainer' ? 'Trainer' :
                 visibleAccount.kind === 'player' ? 'Spieler' :
                 visibleAccount.kind === 'guest' ? 'Gast' : 'Nicht eingeloggt'}
              </div>
              <div className="mt-0.5 font-bold">{visibleAccount.label}</div>
            </div>
            <div className="p-2 space-y-0.5">
              {visibleAccount.kind === 'anonymous' ? (
                <>
                  <Link href="/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Spieler Login</Link>
                  <Link href="/trainer/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Trainer Login</Link>
                </>
              ) : (
                <Link href={visibleAccount.kind === 'trainer' ? '/trainer/dashboard' : '/training'} onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted font-medium">
                  Mein Bereich
                </Link>
              )}
              <Link href="/settings" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                <Settings size={14} />
                Einstellungen
              </Link>
            </div>
            {visibleAccount.kind !== 'anonymous' && (
              <div className="p-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut size={14} />
                  Ausloggen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
