// Temporary PDF parser for Berlinliga/Vereinsliga reports using pdf-parse (Vercel-safe).
// Remove when official API support is available.

import pdfParse from 'pdf-parse';
import type { BerlinPdfReport, BerlinPlayerRow } from './types';

function normalizePdfText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeNumberToken(value: string): string {
  return value.replace(/\./g, ',');
}

function isInvalidLeftSegment(value: string): boolean {
  return /(?:^|\s)(?:Bahn|Kegel|SP|MP|Endstand|Schnittliste)(?:\s|$)/i.test(value);
}

function splitNameAndTeam(left: string): { name: string; team: string } {
  const trimmed = left.trim();

  // Strong known shapes from SKB reports.
  const explicit = trimmed.match(
    /^(.*)\s+((?:KSC|Ferns|Semp(?:\/AdW|AdW)?)(?:\s+[IVX]+)?(?:\s+\([^)]+\))?)$/i
  );
  if (explicit) {
    return { name: explicit[1].trim(), team: explicit[2].trim() };
  }

  // Generic team suffix that ends in bracketed class, e.g. "(M)" or "(g)".
  const bracketTeam = trimmed.match(/^(.+?)\s+([A-Za-zÄÖÜäöüß./-]+(?:\s+[IVX]+)?\s+\([^)]+\))$/);
  if (bracketTeam) {
    return { name: bracketTeam[1].trim(), team: bracketTeam[2].trim() };
  }

  // Fallback split when parser flattens spacing too aggressively.
  const tokens = trimmed.split(/\s+/);
  const splitIndex = Math.max(1, Math.floor(tokens.length * 0.65));
  return {
    name: tokens.slice(0, splitIndex).join(' ').trim(),
    team: tokens.slice(splitIndex).join(' ').trim(),
  };
}

function parsePlayerRows(text: string): BerlinPlayerRow[] {
  const rows: BerlinPlayerRow[] = [];
  const seen = new Set<string>();
  const normalized = normalizePdfText(text);
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  // Rank rows in these PDFs are encoded with spaces: "1 . Name ...".
  // This avoids matching lane columns like "1. Bahn".
  const lineRowRegex =
    /(\d{1,2})\s+\.\s*(.*?)\s+(\d+)\s+(\d{1,4}[,.]\d)\s+(\d{1,2}[,.]\d)\s+(\d+)(?=\s+\d{1,2}\s+\.|$)/g;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = lineRowRegex.exec(line)) !== null) {
      const place = Number(match[1]);
      const left = match[2].trim();
      const games = match[3];
      const avgKegel = normalizeNumberToken(match[4]);
      const mp = normalizeNumberToken(match[5]);
      const plusAuswechslung = match[6];
      if (!left || isInvalidLeftSegment(left)) continue;

      const split = splitNameAndTeam(left);
      const name = split.name;
      const team = split.team;
      if (!name || !team) continue;

      const key = `${place}::${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        place,
        name: name.trim(),
        team: team.trim(),
        games,
        avgKegel,
        mp,
        plusAuswechslung,
      });
    }
  }

  rows.sort((a, b) => a.place - b.place || a.name.localeCompare(b.name, 'de'));

  return rows;
}

function getSpieltagHint(fileName: string, text: string): string | undefined {
  const fileMatch = fileName.match(/(?:-|_)(\d{1,2})(?:_|\.|$)/);
  if (fileMatch) return fileMatch[1];

  const normalized = normalizePdfText(text);
  const textMatch = normalized.match(/(\d{1,2})\.\s*Spieltag/i);
  if (textMatch) return textMatch[1];

  return undefined;
}

export async function parseBerlinPdfReport(url: string, title: string, league: string): Promise<BerlinPdfReport> {
  const warnings: string[] = [];
  const id = url.split('/').pop() || title || `${league}-report`;
  const safeName = id.replace(/[^a-zA-Z0-9._-]/g, '_');

  let text = '';
  try {
    const response = await fetch(url, {
      headers: {
        Referer: 'https://kleeblatt-berlin.de/',
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      throw new Error(`PDF download failed (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const parsed = await pdfParse(buffer);
    text = parsed.text || '';
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown PDF parsing error';
    warnings.push(msg);
  }

  const players = text ? parsePlayerRows(text) : [];
  if (text && players.length === 0) {
    warnings.push('No Schnittliste player rows parsed from PDF.');
  }

  return {
    id: safeName,
    title: title || safeName,
    url,
    spieltagHint: getSpieltagHint(safeName, text),
    players,
    warnings,
  };
}
