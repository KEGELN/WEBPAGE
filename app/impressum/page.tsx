import Menubar from "@/components/menubar";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-6xl font-black tracking-tighter mb-12 uppercase">Impressum</h1>
        
        <div className="space-y-12 text-muted-foreground font-medium leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">Angaben gemäß § 5 TMG</h2>
            <p>
              Lennard Sdrojek<br />
              KSC RW Berliner<br />
              Hämmerlingstr. 88<br />
              12555 Berlin
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">Kontakt</h2>
            <p>
              E-Mail: lennard.sdrojek@osz-lise-meitner.eu<br />
              Webseite: keglerhub-berlin.vercel.app
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">Redaktionell verantwortlich</h2>
            <p>
              Lennard Sdrojek<br />
              Hämmerlingstr. 88<br />
              12555 Berlin
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest mb-4">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section className="pt-12 border-t border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">Haftung für Inhalte</h2>
            <p className="text-sm">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Haftung für Links</h2>
            <p className="text-sm">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Urheberrecht</h2>
            <p className="text-sm">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
