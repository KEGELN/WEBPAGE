import Menubar from "@/components/menubar";

export default function TOSPage() {
  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-6xl font-black tracking-tighter mb-12 uppercase">Nutzungsbedingungen</h1>
        
        <div className="space-y-12 text-muted-foreground font-medium leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">1. Geltungsbereich</h2>
            <p className="text-sm">
              Diese Nutzungsbedingungen gelten für die Nutzung der Webseite "Kegler Hub Berlin" (keglerhub-berlin.vercel.app). Mit dem Zugriff auf unsere Webseite erklären Sie sich mit diesen Bedingungen einverstanden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">2. Dienste und Inhalte</h2>
            <p className="text-sm">
              Kegler Hub Berlin bietet Statistiken, Tabellen und Analyse-Tools für den Kegelsport. Die Daten stammen teilweise aus Drittsystemen (Sportwinner). Wir übernehmen keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Daten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">3. Nutzerkonten</h2>
            <p className="text-sm">
              Für bestimmte Funktionen (Trainer-/Spieler-Login) ist ein Nutzerkonto erforderlich. Sie sind verpflichtet, Ihre Zugangsdaten geheim zu halten und vor dem Zugriff durch unbefugte Dritte zu schützen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">4. Geistiges Eigentum</h2>
            <p className="text-sm">
              Die auf dieser Webseite veröffentlichten Inhalte (Texte, Grafiken, Logos) sind urheberrechtlich geschützt. Die Nutzung ist nur für private Zwecke gestattet. Jede darüber hinausgehende Nutzung bedarf der schriftlichen Zustimmung.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">5. Disclaimer / Haftungsausschluss</h2>
            <p className="text-sm">
              Kegler Hub Berlin ist ein inoffizielles Projekt und steht in keiner direkten geschäftlichen Verbindung mit dem Sportwinner-System oder offiziellen Sportverbänden, sofern nicht ausdrücklich anders angegeben.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">6. Änderungen der Bedingungen</h2>
            <p className="text-sm">
              Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Die aktuelle Fassung ist stets auf der Webseite einsehbar.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
