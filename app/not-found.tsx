'use client';

import Link from 'next/link';
import Menubar from '@/components/menubar';
import { Home, Search, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="text-center space-y-8 max-w-lg">
          <div className="space-y-4">
            <div className="text-[120px] font-black leading-none text-primary/20 select-none">
              404
            </div>
            <h1 className="text-3xl font-bold -mt-8">Seite nicht gefunden</h1>
            <p className="text-muted-foreground">
              Die Seite, die du suchst, existiert nicht oder wurde verschoben.
              Möchtest du zurück zur Startseite oder nach etwas anderem suchen?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Home size={18} />
              Zur Startseite
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Search size={18} />
              Spieler suchen
            </Link>
            <Link
              href="/scores"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Compass size={18} />
              Tabellen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
