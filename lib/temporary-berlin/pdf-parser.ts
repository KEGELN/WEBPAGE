// Temporary PDF parser for Berlinliga/Vereinsliga reports.
// Remove when official API support is available.

import { execFile as execFileCb } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { BerlinPdfReport, BerlinPlayerRow } from './types';

const execFile = promisify(execFileCb);
const TEMP_ROOT = '/tmp/kegel-berlin-temp';

function sanitizeFileName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parsePlayerRows(text: string): BerlinPlayerRow[] {
  const lines = text.split(/\r?\n/);
  const rows: BerlinPlayerRow[] = [];
  const seen = new Set<string>();
  let inSchnittliste = false;

  for (const rawLine of lines) {
    let line = rawLine.replace(/\f/g, '').trimEnd();
    if (!line) continue;

    if (!inSchnittliste && /Pl\.\s+Name\s+Team\s+Spiele\s+[ØO]\s*Kegel\s+MP/i.test(line)) {
      inSchnittliste = true;
      continue;
    }

    if (!inSchnittliste) continue;

    const rankPos = line.search(/\b\d+\s+\./);
    if (rankPos >= 0) line = line.slice(rankPos);

    const rankMatch = line.match(/^\s*(\d+)\s*\.\s*(.+)$/);
    if (!rankMatch) continue;

    const place = Number(rankMatch[1]);
    const tail = rankMatch[2].trim();
    const parts = tail.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 6) continue;

    const fixed = parts.slice(-5);
    const [games, avgKegel, mp, plusAuswechslung] = fixed.slice(1);
    const team = fixed[0];
    const name = parts.slice(0, parts.length - 5).join(' ').trim();
    if (!name || /Bahn\b/.test(name)) continue;

    const key = `${place}::${name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      place,
      name,
      team,
      games,
      avgKegel,
      mp,
      plusAuswechslung,
    });
  }

  return rows;
}

function getSpieltagHint(fileName: string, text: string): string | undefined {
  const fileMatch = fileName.match(/-(\d{1,2})(?:_|\.|$)/);
  if (fileMatch) return fileMatch[1];

  const textMatch = text.match(/(\d{1,2})\.\s*Spieltag/i);
  if (textMatch) return textMatch[1];

  return undefined;
}

export async function parseBerlinPdfReport(url: string, title: string, league: string): Promise<BerlinPdfReport> {
  const warnings: string[] = [];
  const id = url.split('/').pop() || title || 'report';
  const safeName = sanitizeFileName(id);
  const leagueDir = path.join(TEMP_ROOT, league);
  const pdfPath = path.join(leagueDir, safeName);
  const textPath = `${pdfPath}.txt`;

  await fs.mkdir(leagueDir, { recursive: true });

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

    const arr = await response.arrayBuffer();
    await fs.writeFile(pdfPath, Buffer.from(arr));

    await execFile('pdftotext', ['-layout', pdfPath, textPath]);
    text = await fs.readFile(textPath, 'utf8');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown PDF parsing error';
    warnings.push(msg);
  } finally {
    // Always keep temp artifacts removable and non-essential.
    await Promise.allSettled([fs.unlink(pdfPath), fs.unlink(textPath)]);
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
