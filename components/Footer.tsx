import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const DOCS = [
  { label: 'Spieler suchen', href: '/player', desc: 'Profile & Spielhistorie' },
  { label: 'KI-Import', href: '/training/import', desc: 'Papierzettel digitalisieren' },
  { label: 'Verein-Info KSC', href: '/ksc', desc: 'KSC Rot-Weiß Berliner Bär' },
  { label: 'Training erfassen', href: '/training', desc: 'Würfe & Schnitt aufzeichnen' },
  { label: 'Heim vs. Auswärts', href: '/player', desc: 'Leistungsvergleich im Profil' },
  { label: 'Bericht-Generator', href: '/admin', desc: 'Spielberichte als Text' },
];

const GUIDES = [
  { label: 'Login-Link erstellen', href: '/trainer/dashboard', desc: 'Trainer-Dashboard → Spieler → Login-Link kopieren' },
  { label: 'Training importieren', href: '/training/import', desc: 'KI-Prompt → JSON → Import-Seite' },
  { label: 'ICS-Export', href: '/home', desc: 'Kalender → Mannschaft wählen → Download' },
  { label: 'Ankündigungen posten', href: '/admin', desc: 'Admin-Board → Ankündigungen' },
  { label: 'Spieler vergleichen', href: '/compare', desc: 'Vergleich-Seite, zwei Namen eingeben' },
];

export default function Footer() {
  return (
    <footer className="mt-40 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-20">
        <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="space-y-6 lg:col-span-1">
            <div className="text-3xl font-black tracking-tighter italic flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground not-italic font-black text-xl">KH</div>
              KEGLER HUB BERLIN
            </div>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xs">
              Die Evolution der Kegel-Statistik.
              Entwickelt für Spieler, Trainer und Fans des Berliner Kegelsports.
            </p>
            <div className="space-y-2 text-sm font-bold">
              <p>Lennard Sdrojek / KSC RW Berliner</p>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Hämmerlingstr. 88 · Berlin Köpenick</p>
              <a href="mailto:lennard.sdrojek@osz-lise-meitner.eu" className="text-primary hover:underline text-xs block">
                lennard.sdrojek@osz-lise-meitner.eu
              </a>
            </div>
          </div>

          {/* Docs */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Funktionen</h3>
            <div className="space-y-3">
              {DOCS.map(({ label, href, desc }) => (
                <Link key={label} href={href}
                  className="group flex flex-col gap-0.5 hover:text-primary transition-colors">
                  <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Guides */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Anleitungen</h3>
            <div className="space-y-3">
              {GUIDES.map(({ label, href, desc }) => (
                <Link key={label} href={href}
                  className="group flex flex-col gap-0.5 hover:text-primary transition-colors">
                  <span className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
                  <span className="text-[10px] text-muted-foreground font-medium leading-snug">{desc}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Sitemap + Bug report */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Sitemap</h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[10px] font-black uppercase tracking-widest">
                {[
                  ['/', 'Start'],
                  ['/scores', 'Tabellen'],
                  ['/tournaments', 'Spielplan'],
                  ['/training', 'Training'],
                  ['/live', 'Live'],
                  ['/search', 'Suche'],
                  ['/ksc', 'KSC'],
                  ['/analyse', 'Analyse'],
                  ['/privacy', 'Datenschutz'],
                  ['/impressum', 'Impressum'],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="hover:text-primary transition-colors">{label}</Link>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Fehler melden</h3>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Bug gefunden? Schreib uns oder öffne ein Ticket im Admin-Bereich.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/admin#bug-report"
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                  Admin Bug-Report →
                </Link>
                <a href="mailto:lennard.sdrojek@osz-lise-meitner.eu?subject=Kegel Hub Bug Report"
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  Per E-Mail melden <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="border-t border-border py-8 text-center text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40">
        © 2026 KEGLER HUB · ALL DATA SYNCED · UNOFFICIAL PROJECT
      </div>
    </footer>
  );
}
