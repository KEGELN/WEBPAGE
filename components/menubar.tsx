'use client';

import Image from 'next/image';
import logo from '@/images/logo.png';
import Link from 'next/link';
import { useState, useSyncExternalStore, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Menu, X, UserCircle2, LogOut, ChevronDown, Settings,
  Star, Shield, User, LayoutDashboard, Trophy, Calendar,
  TrendingUp, Users, ArrowRight, Dumbbell, Megaphone,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/lib/theme-context';
import { readFavoriteTeams } from '@/lib/client-settings';
import { cn } from '@/lib/utils';

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
    const p = JSON.parse(trainer) as { email?: string };
    return { kind: 'trainer', label: p.email || 'Trainer' };
  }
  if (player) {
    const p = JSON.parse(player) as { username?: string; name?: string };
    return { kind: 'player', label: p.username || p.name || 'Spieler' };
  }
  if (guest) {
    const p = JSON.parse(guest) as { name?: string };
    return { kind: 'guest', label: p.name || 'Gast' };
  }
  return { kind: 'anonymous', label: 'Account' };
}

function getInitials(label: string) {
  return label.split(/[\s@]/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

const ROLE_META: Record<AccountState['kind'], { color: string; bg: string; label: string; icon: typeof User }> = {
  trainer:   { color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/15',   label: 'Trainer',       icon: Shield },
  player:    { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/15', label: 'Spieler',  icon: User },
  guest:     { color: 'text-orange-500',                    bg: 'bg-orange-500/15',  label: 'Gast',          icon: User },
  anonymous: { color: 'text-muted-foreground',              bg: 'bg-muted',          label: 'Nicht eingeloggt', icon: UserCircle2 },
};

const NAV_LINKS = [
  { href: '/player',      label: 'Spieler' },
  { href: '/scores',      label: 'Tabellen' },
  { href: '/tournaments', label: 'Spielplan' },
  { href: '/berlin',      label: 'Berlin',   accent: 'text-rose-500' },
  { href: '/live',        label: 'Live' },
  { href: '/compare',     label: 'Vergleich' },
  { href: '/ksc',         label: 'KSC',      accent: 'text-red-600 dark:text-red-400' },
];

export default function Menubar() {
  const router = useRouter();
  const pathname = usePathname();
  const { expertMode } = useTheme();

  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const visibleAccount = isMounted ? getAccountState() : ({ kind: 'anonymous', label: 'Account' } as AccountState);
  const favoriteTeams = isMounted ? readFavoriteTeams() : [];
  const roleMeta = ROLE_META[visibleAccount.kind];
  const RoleIcon = roleMeta.icon;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('trainer_user');
    localStorage.removeItem('player_auth');
    localStorage.removeItem('guest_user');
    setAccountOpen(false);
    setMobileOpen(false);
    router.push('/home');
  };

  const closeAll = () => {
    setAccountOpen(false);
    setTrainingOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
  };

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <nav className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.15)]'
          : 'bg-background/60 backdrop-blur-md border-b border-transparent'
      )}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo */}
            <Link
              href="/home"
              onClick={closeAll}
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image src={logo} alt="Logo" width={36} height={36} priority className="relative rounded-xl" />
              </div>
              <span className="text-base font-black tracking-tight hidden sm:block">Kegel<span className="text-primary">Web</span></span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {NAV_LINKS.map(({ href, label, accent }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
                    isActive(href)
                      ? 'bg-primary/10 text-primary'
                      : accent
                        ? `hover:bg-muted ${accent}`
                        : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </Link>
              ))}

              {/* Training dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTrainingOpen((p) => !p)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
                    isActive('/training') || isActive('/trainer')
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                  )}
                >
                  Training
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', trainingOpen && 'rotate-180')} />
                </button>
                {trainingOpen && (
                  <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <Link href="/training" onClick={() => setTrainingOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-medium">
                      <Dumbbell size={14} className="text-primary" /> Training Home
                    </Link>
                    <Link href="/trainer/login" onClick={() => setTrainingOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-medium">
                      <Shield size={14} className="text-blue-500" /> Trainer Login
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Search toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSearchOpen((p) => !p)}
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center transition-all',
                    searchOpen ? 'bg-primary text-primary-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-muted'
                  )}
                  aria-label="Suchen"
                >
                  {searchOpen ? <X size={16} /> : <Search size={16} />}
                </button>

                {searchOpen && (
                  <div className="absolute right-0 top-full mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <form onSubmit={handleSearch}>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          ref={searchRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Spieler, Verein, Liga…"
                          className="w-72 h-11 pl-10 pr-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <ThemeToggle />

              {/* Account button */}
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((p) => !p)}
                  className={cn(
                    'flex items-center gap-2 h-9 pl-2 pr-3 rounded-xl border transition-all text-sm font-semibold',
                    accountOpen
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 hover:border-border bg-card/50 hover:bg-muted'
                  )}
                >
                  <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black', roleMeta.bg, roleMeta.color)}>
                    {visibleAccount.kind === 'anonymous' ? <UserCircle2 size={14} /> : getInitials(visibleAccount.label)}
                  </div>
                  <span className="max-w-[100px] truncate text-xs">{visibleAccount.label}</span>
                  {expertMode && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">Pro</span>
                  )}
                  <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', accountOpen && 'rotate-180')} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Identity header */}
                    <div className={cn('p-4 flex items-center gap-3', roleMeta.bg)}>
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black shrink-0', roleMeta.bg, roleMeta.color, 'border border-current/20')}>
                        {visibleAccount.kind === 'anonymous' ? <UserCircle2 size={20} /> : getInitials(visibleAccount.label)}
                      </div>
                      <div className="min-w-0">
                        <div className={cn('text-[10px] font-black uppercase tracking-widest', roleMeta.color)}>{roleMeta.label}</div>
                        <div className="text-sm font-bold truncate mt-0.5">{visibleAccount.label}</div>
                      </div>
                    </div>

                    {/* Favorites */}
                    {favoriteTeams.length > 0 && (
                      <div className="p-2 border-b border-border/50">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Favoriten</div>
                        {favoriteTeams.slice(0, 3).map((t) => (
                          <Link
                            key={t.clubId}
                            href={t.leagueId ? `/scores?league=${t.leagueId}` : '/scores'}
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs hover:bg-muted transition-colors"
                          >
                            <Star size={10} className="text-primary fill-primary shrink-0" />
                            <span className="truncate font-semibold">{t.clubName}</span>
                            <ArrowRight size={10} className="ml-auto text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-2 space-y-0.5">
                      {visibleAccount.kind === 'anonymous' ? (
                        <>
                          <Link href="/login" onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-semibold">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <User size={14} className="text-emerald-500" />
                            </div>
                            Spieler Login
                          </Link>
                          <Link href="/trainer/login" onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-semibold">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Shield size={14} className="text-blue-500" />
                            </div>
                            Trainer Login
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={visibleAccount.kind === 'trainer' ? '/trainer/dashboard' : '/training'}
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-semibold"
                        >
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', roleMeta.bg)}>
                            <LayoutDashboard size={14} className={roleMeta.color} />
                          </div>
                          Mein Bereich
                        </Link>
                      )}
                      <Link href="/settings" onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors font-medium text-foreground/70">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                          <Settings size={14} />
                        </div>
                        Einstellungen
                      </Link>
                    </div>

                    {/* Logout */}
                    {visibleAccount.kind !== 'anonymous' && (
                      <div className="p-2 border-t border-border/50">
                        <button type="button" onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors font-semibold">
                          <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <LogOut size={14} />
                          </div>
                          Ausloggen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => { setMobileOpen((p) => !p); setAccountOpen(false); }}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted transition-all"
                aria-label="Menü"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="container mx-auto px-4 py-4 space-y-1">
              {/* Mobile search */}
              <form onSubmit={handleSearch} className="pb-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Spieler, Verein, Liga suchen…"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border/50 bg-muted/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </form>

              {/* Account strip */}
              <div className={cn('rounded-2xl p-3 flex items-center gap-3 mb-2', roleMeta.bg)}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black', roleMeta.bg, roleMeta.color, 'border border-current/20')}>
                  {visibleAccount.kind === 'anonymous' ? <UserCircle2 size={16} /> : getInitials(visibleAccount.label)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-[10px] font-black uppercase tracking-widest', roleMeta.color)}>{roleMeta.label}</div>
                  <div className="text-sm font-bold truncate">{visibleAccount.label}</div>
                </div>
                {visibleAccount.kind === 'anonymous' ? (
                  <Link href="/login" onClick={closeAll}
                    className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-3 py-1.5 rounded-xl">
                    Login
                  </Link>
                ) : (
                  <button type="button" onClick={handleLogout}
                    className="text-[10px] font-black uppercase tracking-widest text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl">
                    Logout
                  </button>
                )}
              </div>

              {/* Nav links */}
              {NAV_LINKS.map(({ href, label, accent }) => (
                <Link key={href} href={href} onClick={closeAll}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors',
                    isActive(href) ? 'bg-primary/10 text-primary' : accent ? `hover:bg-muted ${accent}` : 'hover:bg-muted text-foreground/80'
                  )}
                >
                  {label}
                  {isActive(href) && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </Link>
              ))}

              {/* Training */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <button type="button" onClick={() => setTrainingOpen((p) => !p)}
                  className="flex w-full items-center justify-between px-4 py-2.5 font-semibold text-sm hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2"><Dumbbell size={14} className="text-primary" /> Training</div>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', trainingOpen && 'rotate-180')} />
                </button>
                {trainingOpen && (
                  <div className="border-t border-border/50 bg-muted/30">
                    <Link href="/training" onClick={closeAll} className="flex items-center gap-2 px-6 py-2.5 text-sm hover:bg-muted font-medium">
                      <Dumbbell size={12} /> Training Home
                    </Link>
                    <Link href="/trainer/login" onClick={closeAll} className="flex items-center gap-2 px-6 py-2.5 text-sm hover:bg-muted font-medium">
                      <Shield size={12} className="text-blue-500" /> Trainer Login
                    </Link>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-2 space-y-1">
                {visibleAccount.kind !== 'anonymous' && (
                  <Link href={visibleAccount.kind === 'trainer' ? '/trainer/dashboard' : '/training'} onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted">
                    <LayoutDashboard size={14} className={roleMeta.color} /> Mein Bereich
                  </Link>
                )}
                <Link href="/settings" onClick={closeAll}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted text-foreground/70">
                  <Settings size={14} /> Einstellungen
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
