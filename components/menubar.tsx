'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Menubar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="bg-background text-foreground p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        {/* Navigation Links */}
        <div className="flex space-x-6">
          <Link href="/" className="hover:text-primary transition-colors duration-200 font-medium">
            Home
          </Link>
          <Link href="/player" className="hover:text-primary transition-colors duration-200 font-medium">
            Player
          </Link>
          <Link href="/scores" className="hover:text-primary transition-colors duration-200 font-medium">
            Scores
          </Link>
          <Link href="/tournaments" className="hover:text-primary transition-colors duration-200 font-medium">
            Tournaments
          </Link>
        </div>

        {/* Search Bar and GitHub Icon */}
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clubs, players..."
                className="w-full py-3 px-4 pr-12 rounded-lg bg-muted text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-accent transition-all duration-200 shadow-md"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* GitHub Icon */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-accent transition-colors duration-200"
            aria-label="GitHub"
          >
            <Github size={24} />
          </a>
        </div>
      </div>
    </nav>
  );
}
