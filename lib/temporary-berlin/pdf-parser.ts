// Temporary PDF parser for Berlinliga/Vereinsliga reports.
// Pure Node implementation using pdf-parse (Vercel-compatible).
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

function isInvalidLeftSegment(value: string): boolean {
  return /(?:^|\s)(?:Bahn|Kegel|SP|MP|Endstand|Schnittliste)(?:\s|$)/i.test(value);
}

function splitNameAndTeam(left: string): { name: string; team: string } {
  const trimmed = left.trim();

  // Handles compact forms like "...(EO)KSC" and "...SempAdW IV (g)".
  const teamMatch = trimmed.match(
    /^(.*?)(KSC(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|Ferns\s+\([^)]+\)|Semp(?:\/AdW|AdW)?(?:\s+[IVX]+)?(?:\s+\([^)]+\))?|SempAdW)$/i
  );
  if (teamMatch) {
    return { name: teamMatch[1].trim(), team: teamMatch[2].trim() };
  }

  // Fallback split for unknown team labels.
  const tokens = trimmed.split(/\s+/);
  const splitIndex = Math.max(1, Math.floor(tokens.length * 0.65));
  return {
    name: tokens.slice(0, splitIndex).join(' ').trim(),
    team: tokens.slice(splitIndex).join(' ').trim(),
  };
}

function pickGamesAndAvg(rest: string): { left: string; games: string; avgKegel: string } | null {
  type Candidate = { left: string; games: string; avgKegel: string; score: number };
  const candidates: Candidate[] = [];

  // Try all plausible "games + avg" splits at the tail.
  for (let avgIntDigits = 1; avgIntDigits <= 4; avgIntDigits++) {
    for (let gamesDigits = 1; gamesDigits <= 2; gamesDigits++) {
      const re = new RegExp(`^(.*?)(\\d{${gamesDigits}})(\\d{${avgIntDigits}},\\d)$`);
      const m = rest.match(re);
      if (!m) continue;

      const left = m[1].trim();
      const games = m[2];
      const avgKegel = m[3];
      if (!left) continue;

      const gamesNum = Number(games);
      const avgNum = Number(avgKegel.replace(',', '.'));
      if (!Number.isFinite(gamesNum) || !Number.isFinite(avgNum)) continue;
      if (gamesNum > 30) continue;
      if (avgNum > 999.9) continue;

      let score = 0;
      if (avgNum >= 100) score += 100; // realistic kegel average
      if (avgNum === 0 && gamesNum === 0) score += 90;
      if (gamesNum <= 12) score += 30;
      if (/\b(KSC|Ferns|Semp)\b/i.test(left)) score += 20;
      if (/\)$/.test(left)) score += 5;

      candidates.push({ left, games, avgKegel, score });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function parseChunk(chunk: string): {
  left: string;
  games: string;
  avgKegel: string;
  mp: string;
  plusAuswechslung: string;
} | null {
  let rest = chunk.trim();
  if (!rest) return null;

  // Tail format in flattened text commonly looks like:
  // "...<games><avg><mp><plus>" e.g. KSC1562,03,00
  const plus = rest.match(/(\d)$/)?.[1];
  if (!plus) return null;
  rest = rest.slice(0, -1);

  const mp = rest.match(/((?:[1-9]\d|\d),\d)$/)?.[1];
  if (!mp) return null;
  rest = rest.slice(0, -mp.length);

  const gamesAvg = pickGamesAndAvg(rest);
  if (!gamesAvg) return null;

  return {
    left: gamesAvg.left,
    games: gamesAvg.games,
    avgKegel: gamesAvg.avgKegel,
    mp,
    plusAuswechslung: plus,
  };
}

function parsePlayerRows(text: string): BerlinPlayerRow[] {
  const normalized = normalizePdfText(text);
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const rows: BerlinPlayerRow[] = [];
  const seen = new Set<string>();

  // Rank rows in this source are encoded as "1 .", "2 .", etc.
  // This avoids false positives like "1. Bahn".
  const rankChunkRegex = /(\d{1,2})\s+\.\s*(.*?)(?=\s+\d{1,2}\s+\.|$)/g;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = rankChunkRegex.exec(line)) !== null) {
      const place = Number(match[1]);
      const parsed = parseChunk(match[2]);
      if (!parsed) continue;
      if (isInvalidLeftSegment(parsed.left)) continue;

      const split = splitNameAndTeam(parsed.left);
      if (!split.name || !split.team) continue;

      const key = `${place}::${split.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        place,
        name: split.name,
        team: split.team,
        games: parsed.games,
        avgKegel: parsed.avgKegel,
        mp: parsed.mp,
        plusAuswechslung: parsed.plusAuswechslung,
      });
    }
  }

  rows.sort((a, b) => a.place - b.place || a.name.localeCompare(b.name, 'de'));
  return rows;
}

function getSpieltagHint(fileName: string, text: string): string | undefined {
  const fileMatch = fileName.match(/(?:-|_)(\d{1,2})(?:_|\.|$)/);
  if (fileMatch) return String(Number(fileMatch[1]));

  const textMatch = normalizePdfText(text).match(/(\d{1,2})\.\s*Spieltag/i);
  if (textMatch) return String(Number(textMatch[1]));

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
