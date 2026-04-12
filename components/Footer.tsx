import Link from 'next/link';

export default function Footer() {
  return (
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
            <Link href="/" className="hover:text-primary transition-colors">Start</Link>
            <Link href="/scores" className="hover:text-primary transition-colors">Tabellen</Link>
            <Link href="/tournaments" className="hover:text-primary transition-colors">Spielplan</Link>
            <Link href="/training" className="hover:text-primary transition-colors">Training</Link>
            <Link href="/search" className="hover:text-primary transition-colors">Suche</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Datenschutz</Link>
            <Link href="/tos" className="hover:text-primary transition-colors">AGB</Link>
            <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
          </div>
        </div>
      </div>
      <div className="mt-20 border-t border-border pt-10 text-center text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40">
        © 2026 KEGLER HUB · ALL DATA SYNCED · UNOFFICIAL PROJECT
      </div>
    </footer>
  );
}
