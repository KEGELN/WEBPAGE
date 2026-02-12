'use client';

import Image from 'next/image';
import logo from '@/images/logo.png';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Menubar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
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
                  </div>

                  {/* Search Bar and Theme Toggle (Desktop) */}
                  <div className="hidden md:flex items-center space-x-4">
                      <form onSubmit={handleSearch} className="flex-1 max-w-md">
                          <div className="relative">
                              <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search..."
                                  className="w-48 py-2 px-4 pr-10 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-accent transition-all duration-200 shadow-sm"
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
                      <ThemeToggle />
                  </div>

                  {/* Mobile Actions: Theme Toggle & Hamburger */}
                  <div className="flex items-center space-x-4 md:hidden">
                      <ThemeToggle />
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
                                  className="w-full py-3 px-4 pr-12 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-accent shadow-md"
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
                      </div>
                  </div>
              )}
          </div>
      </nav>
  );
}
