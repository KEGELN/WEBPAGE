'use client';

import Image from 'next/image';
import logo from '@/images/logo.png';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, UserCircle2, LogOut } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeToggle';

type AccountState =
  | { kind: 'trainer'; label: string }
  | { kind: 'player'; label: string }
  | { kind: 'guest'; label: string }
  | { kind: 'anonymous'; label: string };

function getInitialAccount(): AccountState {
  if (typeof window === 'undefined') {
    return { kind: 'anonymous', label: 'Account' };
  }

  const trainer = localStorage.getItem('trainer_user');
  const player = localStorage.getItem('player_auth');
  const guest = localStorage.getItem('guest_user');

  if (trainer) {
    const parsed = JSON.parse(trainer) as { email?: string };
    return { kind: 'trainer', label: parsed.email || 'Trainer' };
  }

  if (player) {
    const parsed = JSON.parse(player) as { username?: string; name?: string };
    return { kind: 'player', label: parsed.username || parsed.name || 'Player' };
  }

  if (guest) {
    const parsed = JSON.parse(guest) as { name?: string };
    return { kind: 'guest', label: parsed.name || 'Guest' };
  }

  return { kind: 'anonymous', label: 'Account' };
}

export default function Menubar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [account, setAccount] = useState<AccountState>(() => getInitialAccount());

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

  return (
      <nav className="bg-background text-foreground p-4 shadow-lg sticky top-0 z-50">
          <div className="container mx-auto">
              <div className="flex items-center justify-between">
                  {/* Logo / Home Link (Visible on all) */}
                  <Link
                    href="/"
                    className="flex items-center gap-3 text-xl font-bold text-primary mr-4"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Image src={logo} alt="Logo" width={48} height={48} priority />
                    <span>Kegel</span>
                  </Link>
                  
                  {/* Desktop Navigation Links */}
                  <div className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-primary transition-colors duration-200 font-medium">
              Start
            </Link>
            <Link href="/player" className="hover:text-primary transition-colors duration-200 font-medium">
              Spieler
            </Link>
            <Link href="/scores" className="hover:text-primary transition-colors duration-200 font-medium">
              Tabellen
            </Link>
            <Link href="/tournaments" className="hover:text-primary transition-colors duration-200 font-medium">
              Spielplan
            </Link>
            <Link href="/live" className="hover:text-primary transition-colors duration-200 font-medium">
              Live
            </Link>
            <Link href="/berlin" className="hover:text-primary transition-colors duration-200 font-medium">
              Berlin
            </Link>
            <Link href="/training" className="hover:text-primary transition-colors duration-200 font-medium">
              Training
            </Link>
            <Link href="/trainer/login" className="hover:text-primary transition-colors duration-200 font-medium">
              Trainer
            </Link>
                  </div>

                  {/* Search Bar and Account Menu (Desktop) */}
                  <div className="hidden md:flex items-center space-x-4">
                      <form onSubmit={handleSearch} className="flex-1 max-w-md">
                          <div className="relative">
                              <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search..."
                                  className="w-72 lg:w-80 py-2.5 px-4 pr-10 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-accent transition-all duration-200 shadow-sm"
                              />
                              <button
                                  type="submit"
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                                  aria-label="Search"
                              >
                                  <Search size={18} />
                              </button>
                          </div>
                      </form>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                          className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-muted"
                        >
                          <UserCircle2 className="h-5 w-5" />
                          <span className="max-w-[140px] truncate">{account.label}</span>
                        </button>

                        {isAccountMenuOpen && (
                          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl">
                            <div className="mb-3 border-b border-border pb-3">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</div>
                              <div className="mt-1 text-sm font-semibold">{account.label}</div>
                            </div>

                            <div className="space-y-1 border-b border-border pb-3">
                              <Link href="/training" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                                Player Area
                              </Link>
                              <Link href="/trainer/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                                Trainer Area
                              </Link>
                              <Link href="/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                                Login
                              </Link>
                            </div>

                            <div className="py-3">
                              <ThemeSelector />
                            </div>

                            {account.kind !== 'anonymous' && (
                              <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                              >
                                <LogOut className="h-4 w-4" />
                                Logout
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Mobile Actions: Account & Hamburger */}
                  <div className="flex items-center space-x-4 md:hidden">
                      <button
                          type="button"
                          onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                          className="text-foreground focus:outline-none"
                          aria-label="Toggle account menu"
                      >
                          <UserCircle2 size={24} />
                      </button>
                      <button
                          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                          className="text-foreground focus:outline-none"
                          aria-label="Toggle menu"
                      >
                          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                      </button>
                  </div>
              </div>

              {/* Mobile Menu Dropdown */}
              {isMobileMenuOpen && (
                  <div className="md:hidden mt-4 pb-4 space-y-4 animate-in slide-in-from-top-5 fade-in duration-200">
                      {/* Mobile Search */}
                      <form onSubmit={handleSearch} className="block w-full">
                          <div className="relative">
                              <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search clubs, players..."
                                  className="w-full py-3.5 px-4 pr-12 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-accent shadow-md"
                              />
                              <button
                                  type="submit"
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                  <Search size={20} />
                              </button>
                          </div>
                      </form>

                      <div className="flex flex-col space-y-3">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Start
              </Link>
              <Link
                href="/player"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Spieler
              </Link>
              <Link
                href="/scores"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Tabellen
              </Link>
              <Link
                href="/tournaments"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Spielplan
              </Link>
              <Link
                href="/live"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Live
              </Link>
              <Link
                href="/berlin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Berlin
              </Link>
              <Link
                href="/training"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors font-medium"
              >
                Training
              </Link>
                      </div>
                  </div>
              )}

              {isAccountMenuOpen && (
                <div className="mt-4 md:hidden rounded-2xl border border-border bg-card p-4 shadow-md">
                  <div className="mb-3 text-sm font-semibold">{account.label}</div>
                  <div className="space-y-1 border-b border-border pb-3">
                    <Link href="/training" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      Player Area
                    </Link>
                    <Link href="/trainer/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      Trainer Area
                    </Link>
                    <Link href="/login" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                      Login
                    </Link>
                  </div>
                  <div className="py-3">
                    <ThemeSelector />
                  </div>
                  {account.kind !== 'anonymous' && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  )}
                </div>
              )}
          </div>
      </nav>
  );
}
