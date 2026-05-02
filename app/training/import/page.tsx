'use client';

import { useState } from 'react';
import Menubar from '@/components/menubar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Copy, Check, Upload, FileText, Sparkles, AlertCircle,
  ChevronDown, Info, ClipboardPaste, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── The canonical AI prompt ──────────────────────────────────────────────────
const AI_PROMPT = `Du bist ein Datenerfassungsassistent für Kegel-Trainingsbögen (9-Pin-Kegeln, deutsches System).

Deine Aufgabe: Lies den Trainingszettel/das Foto und erzeuge EXAKT das folgende JSON-Format. Weiche NICHT vom Schema ab.

━━━ KEGELNOTATION – LEGENDE ━━━
• Auf dem Zettel stehen pro Wurf entweder:
  - Eine Zahl (z.B. "7") = 7 Kegel gefallen
  - "V" oder "Voll" = Volle = alle 9 Kegel (erster Wurf einer Garbe)
  - "A" oder "Ab" = Abräumen = alle verbleibenden Kegel (zweiter Wurf)
  - "-" oder "0" oder "F" = Fehlwurf, kein Kegel
  - Einzelne Pinnummern (z.B. "1 3 5") = diese Pins gefallen

• Pins sind nummeriert 1–9 (deutsches Kegeln):
     7
   4   8
  2  5  9  ← Blickrichtung von vorne
   1   6
     3
  Hinten: 7,8 | Mitte: 4,5,9 | Vorne: 1,2,3,6 | Vorderpfahl: 3

• Wenn nur eine Gesamtzahl pro Wurf angegeben ist (z.B. "7 Holz"):
  Wähle die plausibelsten Pins 1–9 entsprechend der Holzzahl.
  Beispiel: "7" → [1,2,3,4,5,6,7] (erste 7 Pins).
  Bei "V" / "9" → [1,2,3,4,5,6,7,8,9]
  Bei "0" / "-" → []

━━━ SPIELMODI ━━━
1. Standardtraining ("standard"): 30 Würfe gesamt, gespeichert in "throws".
2. Wettkampf 120 ("game_120"): 120 Würfe auf 4 Bahnen à 30 Würfe,
   gespeichert in "lanes" mit Schlüsseln "1","2","3","4".

━━━ JSON-FORMAT (exakt einhalten) ━━━

Für EINE Session:
{
  "id": "import_<DATUM_ohne_Trennzeichen>_<SPIELERNAME_kompakt>",
  "playerId": "<SPIELER_ID_wenn_bekannt_sonst_leer_string>",
  "playerName": "<Vor- und Nachname>",
  "trainerEmail": "<E-Mail_wenn_auf_Zettel_sonst_leer_string>",
  "timestamp": "<ISO-8601-Datum, z.B. 2025-06-15T10:00:00.000Z>",
  "type": "standard",
  "throws": [
    { "id": 0, "pins": [1,2,3,4,5,6,7], "timestamp": "<ISO-8601>" },
    { "id": 1, "pins": [1,2,5,9], "timestamp": "<ISO-8601>" },
    ...
  ]
}

Für game_120 zusätzlich STATT throws:
  "throws": [],
  "lanes": {
    "1": [ { "id": 0, "pins": [...], "timestamp": "..." }, ... ],
    "2": [ { "id": 0, "pins": [...], "timestamp": "..." }, ... ],
    "3": [ { "id": 0, "pins": [...], "timestamp": "..." }, ... ],
    "4": [ { "id": 0, "pins": [...], "timestamp": "..." }, ... ]
  }

Mehrere Spieler auf EINEM Zettel → Ausgabe als JSON-Array: [ {...}, {...} ]

━━━ REGELN ━━━
1. "id" muss eindeutig sein. Format: "import_20250615_MaxMustermann"
2. "pins" enthält NUR Zahlen 1–9 (keine Wiederholungen pro Wurf).
3. "id" in jedem Throw-Objekt = fortlaufende Nummer beginnend bei 0.
4. Timestamps: Wenn nur Datum bekannt → setze Uhrzeit auf 10:00:00.000Z.
   Wurf-Timestamps können identisch zum Session-Timestamp sein.
5. Leere Felder (playerId, trainerEmail) = leerer String "".
6. Falls du eine Angabe nicht lesen/ableiten kannst → lasse pins: [] (Fehlwurf).
7. Erzeuge KEIN Markdown, KEINE Erklärungen, KEINEN Code-Block (kein \`\`\`).
   Gib NUR das rohe JSON aus.
8. Prüfe: standard → genau 30 Einträge in throws. game_120 → je 30 Einträge pro Lane.

━━━ BEISPIELAUSGABE (Standardtraining, 30 Würfe) ━━━
{
  "id": "import_20250615_MaxMustermann",
  "playerId": "",
  "playerName": "Max Mustermann",
  "trainerEmail": "",
  "timestamp": "2025-06-15T10:00:00.000Z",
  "type": "standard",
  "throws": [
    { "id": 0, "pins": [1,2,3,4,5,6,7,8,9], "timestamp": "2025-06-15T10:00:00.000Z" },
    { "id": 1, "pins": [1,2,3,4,5,6], "timestamp": "2025-06-15T10:00:00.000Z" },
    { "id": 2, "pins": [7,8,9], "timestamp": "2025-06-15T10:00:00.000Z" },
    { "id": 3, "pins": [], "timestamp": "2025-06-15T10:00:00.000Z" },
    { "id": 4, "pins": [1,2,3,5,7], "timestamp": "2025-06-15T10:00:00.000Z" }
  ]
}

━━━ JETZT VERARBEITE DEN FOLGENDEN TRAININGSZETTEL ━━━
[Füge hier deinen Text / dein Foto ein]`;

// ─── Prompt for image-capable models ─────────────────────────────────────────
const IMAGE_ADDENDUM = `

━━━ HINWEIS FÜR BILDBASIERTE MODELLE (GPT-4o, Claude 3.5+) ━━━
Lade das Foto des Trainingszettels direkt hoch.
Der Assistent erkennt die handschriftlichen oder gedruckten Werte und erzeugt das JSON automatisch.
Kein manuelles Abtippen notwendig.`;

const FULL_PROMPT = AI_PROMPT + IMAGE_ADDENDUM;

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
  sessions: { id: string; playerName?: string; timestamp: string }[];
};

export default function ImportPage() {
  const [promptCopied, setPromptCopied] = useState(false);
  const [json, setJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(FULL_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const downloadPrompt = () => {
    const blob = new Blob([FULL_PROMPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kegel-import-prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setImportError(null);

    let parsed: unknown;
    try {
      // Strip markdown code fences if the LLM added them anyway
      const cleaned = json.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      parsed = JSON.parse(cleaned);
    } catch {
      setImportError('Ungültiges JSON. Stelle sicher, dass der KI-Output kein Markdown enthält.');
      setImporting(false);
      return;
    }

    // Inject playerId / trainerEmail overrides if provided
    const sessions: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const s of sessions) {
      if (s && typeof s === 'object') {
        const obj = s as Record<string, unknown>;
        if (playerId.trim()) obj.playerId = playerId.trim();
        if (trainerEmail.trim()) obj.trainerEmail = trainerEmail.trim();
      }
    }

    try {
      const res = await fetch('/api/training/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessions.length === 1 ? sessions[0] : sessions),
      });
      const data = await res.json() as ImportResult & { error?: string };
      if (!res.ok) {
        setImportError(data.error ?? 'Import fehlgeschlagen.');
      } else {
        setResult(data);
        setJson('');
      }
    } catch {
      setImportError('Netzwerkfehler beim Import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-10 max-w-4xl">

        {/* Header */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-gradient-to-br from-violet-500/15 via-background to-purple-500/10">
          <CardHeader className="p-8 md:p-12 pb-8">
            <div className="flex items-start gap-6">
              <div className="p-4 rounded-3xl bg-violet-500/10 text-violet-500 shrink-0 border border-violet-500/20">
                <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-500">KI-gestützt</div>
                <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter">
                  Papierzettel Importieren
                </CardTitle>
                <p className="text-muted-foreground font-medium max-w-xl text-base leading-relaxed">
                  Nutze ChatGPT, Claude oder ein anderes KI-Modell, um Trainingszettel automatisch
                  in digitale Trainingsdaten umzuwandeln — und importiere sie hier mit einem Klick.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step 1 — Copy prompt */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shrink-0">1</div>
            <h2 className="text-xl font-black uppercase tracking-tight">KI-Prompt kopieren</h2>
          </div>

          <Card className="rounded-[2rem] border-border/50 bg-card shadow-lg overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                Kopiere den Prompt und füge ihn in{' '}
                <strong>ChatGPT</strong>, <strong>Claude</strong>, <strong>Gemini</strong> oder ein anderes Modell ein.
                Füge danach deinen Trainingszettel (als Text oder Foto) hinzu und schicke die Anfrage ab.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button onClick={copyPrompt} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20">
                  {promptCopied ? <><Check size={16} /> Kopiert!</> : <><Copy size={16} /> Prompt kopieren</>}
                </Button>
                <Button variant="outline" onClick={downloadPrompt} className="rounded-xl font-bold gap-2">
                  <Download size={15} /> Als .txt herunterladen
                </Button>
              </div>

              {/* Collapsible preview */}
              <div className="rounded-2xl border border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPromptOpen((p) => !p)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-black uppercase tracking-widest"
                >
                  <span className="flex items-center gap-2"><FileText size={14} /> Prompt Vorschau</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', promptOpen && 'rotate-180')} />
                </button>
                {promptOpen && (
                  <pre className="p-5 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96 bg-muted/10 text-foreground/70 leading-relaxed animate-in fade-in duration-200">
                    {FULL_PROMPT}
                  </pre>
                )}
              </div>

              <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-4 flex gap-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                  <strong>Tipp für Fotos:</strong> GPT-4o und Claude 3.5+ können Fotos direkt lesen.
                  Lade das Foto des Zettels direkt im Chat hoch, ohne manuell abzutippen.
                  Stelle das Bild auf gute Beleuchtung und gerade Ausrichtung.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Step 2 — Optional overrides */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-muted text-foreground flex items-center justify-center text-sm font-black shrink-0">2</div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Zuordnung (optional)</h2>
              <p className="text-xs text-muted-foreground font-medium">Überschreibt playerId und trainerEmail im JSON, falls die KI sie leer gelassen hat.</p>
            </div>
          </div>

          <Card className="rounded-[2rem] border-border/50 bg-card shadow-lg">
            <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Player ID</label>
                <input
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="z.B. player_abc123"
                  className="w-full h-11 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Trainer E-Mail</label>
                <input
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  placeholder="trainer@beispiel.de"
                  className="w-full h-11 rounded-xl border border-border/50 bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Step 3 — Paste & import */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shrink-0">3</div>
            <h2 className="text-xl font-black uppercase tracking-tight">JSON einfügen &amp; importieren</h2>
          </div>

          <Card className="rounded-[2rem] border-border/50 bg-card shadow-lg overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <ClipboardPaste size={11} /> KI-Ausgabe einfügen
                </label>
                <textarea
                  value={json}
                  onChange={(e) => { setJson(e.target.value); setImportError(null); setResult(null); }}
                  placeholder={'[\n  {\n    "id": "import_20250615_MaxMustermann",\n    "playerName": "Max Mustermann",\n    ...\n  }\n]'}
                  rows={12}
                  className="w-full rounded-2xl border border-border/50 bg-muted/10 px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
                />
              </div>

              {importError && (
                <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in duration-200">
                  <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive font-semibold">{importError}</p>
                </div>
              )}

              {result && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                    <Check size={18} />
                    {result.imported} Session{result.imported !== 1 ? 's' : ''} erfolgreich importiert
                    {result.skipped > 0 && <span className="text-orange-500 font-bold">· {result.skipped} übersprungen</span>}
                  </div>
                  <div className="space-y-1">
                    {result.sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl bg-emerald-500/5 px-3 py-2 text-xs">
                        <span className="font-bold">{s.playerName || s.id}</span>
                        <span className="text-muted-foreground">{new Date(s.timestamp).toLocaleDateString('de-DE')}</span>
                      </div>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="space-y-1">
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-xs text-orange-600 dark:text-orange-400 font-medium">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={importing || !json.trim()}
                className="w-full h-13 rounded-2xl font-black uppercase tracking-widest text-sm gap-2 shadow-xl shadow-primary/20"
              >
                {importing
                  ? 'Importiere…'
                  : <><Upload size={16} /> Training importieren</>}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Reference card */}
        <section className="space-y-4">
          <h2 className="text-lg font-black uppercase tracking-tight px-1 text-muted-foreground">JSON-Schema Referenz</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Standard (30 Würfe)',
                desc: 'Normales Training, 30 Würfe gesamt.',
                code: `{
  "type": "standard",
  "throws": [
    { "id": 0, "pins": [1,2,3,5,7], "timestamp": "..." },
    { "id": 1, "pins": [4,6,8,9],   "timestamp": "..." }
    // ... 28 weitere
  ]
}`,
              },
              {
                title: 'Wettkampf 120 (4 × 30)',
                desc: '4 Bahnen, je 30 Würfe pro Bahn.',
                code: `{
  "type": "game_120",
  "throws": [],
  "lanes": {
    "1": [ { "id": 0, "pins": [...] } ... ],
    "2": [ { "id": 0, "pins": [...] } ... ],
    "3": [ { "id": 0, "pins": [...] } ... ],
    "4": [ { "id": 0, "pins": [...] } ... ]
  }
}`,
              },
            ].map(({ title, desc, code }) => (
              <Card key={title} className="rounded-[1.5rem] border-border/50 bg-card overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-border/50">
                  <div className="font-black text-sm">{title}</div>
                  <p className="text-xs text-muted-foreground font-medium">{desc}</p>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[10px] font-mono whitespace-pre-wrap text-foreground/60 leading-relaxed overflow-auto max-h-48">{code}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
