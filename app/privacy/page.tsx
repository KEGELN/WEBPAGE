import Menubar from "@/components/menubar";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-6xl font-black tracking-tighter mb-12 uppercase">Datenschutz</h1>
        
        <div className="space-y-12 text-muted-foreground font-medium leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">1. Datenschutz auf einen Blick</h2>
            <h3 className="font-bold text-foreground mb-2">Allgemeine Hinweise</h3>
            <p className="text-sm">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">2. Datenerfassung auf dieser Website</h2>
            <h3 className="font-bold text-foreground mb-2">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h3>
            <p className="text-sm mb-4">
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber:
            </p>
            <p className="text-sm font-bold">
              Lennard Sdrojek<br />
              lennard.sdrojek@osz-lise-meitner.eu
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">3. Bereitgestellte Daten durch Drittsysteme</h2>
            <p className="text-sm">
              Diese Website spiegelt Daten aus dem externen System "Sportwinner". Die dort veröffentlichten Spielergebnisse und Statistiken sind öffentlich zugängliche Informationen aus dem Ligabetrieb. Wir verarbeiten diese Daten berechtigtem Interesse (Art. 6 Abs. 1 lit. f DSGVO) zur Information über den Kegelsport in Berlin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">4. Benutzereingaben und Konten</h2>
            <p className="text-sm">
              Sofern Sie die Trainer- oder Spieler-Login-Funktionen nutzen, werden Ihre Anmeldedaten (E-Mail/Nutzername) sowie Ihre im System erfassten Trainingsdaten gespeichert. Dies erfolgt zur Vertragserfüllung oder zur Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">5. Ihre Rechte</h2>
            <p className="text-sm">
              Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
            </p>
          </section>

          <section className="pt-12 border-t border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">CCPA Compliance (California Consumer Privacy Act)</h2>
            <p className="text-xs">
              Although primarily focused on German/EU law, for California residents: We do not sell your personal information. We only collect data necessary for the functionality of the sports statistics platform. If you wish to exercise your CCPA rights (knowledge, deletion, non-discrimination), please contact us via the email above.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
