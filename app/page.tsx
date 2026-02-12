import Menubar from "@/components/menubar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-10 space-y-12">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-8 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Kegeln • Ergebnisse • Statistik</div>
              <h1 className="text-4xl font-bold text-foreground">Dein Überblick über Liga, Spielplan und Spieler</h1>
              <p className="text-base text-muted-foreground">
                Aktuelle Tabellen, historische Schnittlisten und detaillierte Spielberichte – alles an einem Ort.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/scores" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                  Zu den Tabellen
                </a>
                <a href="/tournaments" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Spielplan ansehen
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="text-sm font-semibold text-foreground">Heute im Fokus</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Live</div>
                  <div className="mt-2 text-lg font-semibold">Spieltag-Updates</div>
                  <p className="text-sm text-muted-foreground">Direkt zur aktuellen Spieltag-Ansicht.</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Historie</div>
                  <div className="mt-2 text-lg font-semibold">Schnittlisten</div>
                  <p className="text-sm text-muted-foreground">Vergleiche Spieler über die Saison.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tabellen</div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Schnell vergleichen</h2>
            <p className="mt-2 text-sm text-muted-foreground">Filtere nach Saison, Liga und Spieltag.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Spieler</div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Leistung im Detail</h2>
            <p className="mt-2 text-sm text-muted-foreground">Detaillierte Werte pro Spiel.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Spielplan</div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Alle Termine</h2>
            <p className="mt-2 text-sm text-muted-foreground">Übersichtliche Tagesansicht mit Ergebnissen.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Schnellzugriff</h2>
              <p className="text-sm text-muted-foreground">Starte direkt in den gewünschten Bereich.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/player" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Spieler
              </a>
              <a href="/scores" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Tabellen
              </a>
              <a href="/tournaments" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Spielplan
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Impressum</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lennard Sdrojek / KSC RW Berliner
            </p>
            <p className="text-sm text-muted-foreground">Hämmerlingstr. 88 • Berlin Köpenick</p>
            <p className="text-sm text-muted-foreground">Vertreten durch: Lennard Sdrojek</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Kontakt</h3>
            <p className="mt-2 text-sm text-muted-foreground">E-Mail: lennard.sdrojek@osz-lise-meitner.eu</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
