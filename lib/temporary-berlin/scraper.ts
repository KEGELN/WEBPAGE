// Temporary integration for Kleeblatt Berlin pages.
// Remove this module and the /api/berlin route once official API support exists.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  BerlinLeagueData,
  BerlinLeagueKey,
  BerlinMatch,
  BerlinMatchday,
  BerlinPdfLink,
  BerlinPdfReport,
  BerlinSpieltagReportRef,
  BerlinStandingRow,
} from './types';

const LEAGUE_SOURCES: Record<BerlinLeagueKey, { page: string; pdfPage: string }> = {
  berlinliga: {
    page: 'https://kleeblatt-berlin.de/berlinliga-skb/',
    pdfPage: 'https://kleeblatt-berlin.de/berlinliga-skb/auswertungen-berlinliga/',
  },
  vereinsliga: {
    page: 'https://kleeblatt-berlin.de/vereinsliga-skb/',
    pdfPage: 'https://kleeblatt-berlin.de/vereinsliga-skb/auswertungen-vereinsliga/',
  },
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function toAbsoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

async function fetchHtml(url: string, referer: string): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.8,en;q=0.6',
      Referer: referer,
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    },
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Kleeblatt request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

function parseStandings(pageHtml: string): BerlinStandingRow[] {
  const containerMatch = pageHtml.match(
    /<div class="skb-liga-tabelle-container">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/div>/i
  );
  if (!containerMatch) return [];

  const tbodyHtml = containerMatch[1];
  const rows: BerlinStandingRow[] = [];

  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(tbodyHtml)) !== null) {
    const rowHtml = trMatch[1];
    const cells = Array.from(rowHtml.matchAll(/<td>([\s\S]*?)<\/td>/gi)).map((m) => stripHtml(m[1]));
    if (cells.length >= 6) {
      rows.push({
        place: cells[0],
        team: cells[1],
        games: cells[2],
        mp: cells[3],
        sp: cells[4],
        points: cells[5],
      });
    }
  }

  return rows;
}

function parseResultText(gameHtml: string): string {
  const resultBlock = gameHtml.match(/<div class="ergebnis-info">([\s\S]*?)<\/div>/i)?.[1];
  if (!resultBlock) return '';
  const parts = Array.from(resultBlock.matchAll(/<p>([\s\S]*?)<\/p>/gi)).map((m) => stripHtml(m[1]));
  if (parts.length > 0) return parts.join(' | ');
  return stripHtml(resultBlock);
}

function parseTimeText(gameHtml: string): string {
  const timeTags = Array.from(gameHtml.matchAll(/<time[^>]*>([\s\S]*?)<\/time>/gi)).map((m) => stripHtml(m[1]));
  if (timeTags.length >= 2) return `${timeTags[0]} -> ${timeTags[1]}`;
  if (timeTags.length === 1) return timeTags[0];

  const spanTime = gameHtml.match(/<span class="spielzeit">([\s\S]*?)<\/span>/i)?.[1];
  return spanTime ? stripHtml(spanTime) : '';
}

function parseMatchdays(pageHtml: string): BerlinMatchday[] {
  const sections: BerlinMatchday[] = [];
  const sectionRegex =
    /<h3 class="spieltag-heading"(?:\s+id="([^"]+)")?>([\s\S]*?)<\/h3>\s*<ul class="spielplan-liste">([\s\S]*?)<\/ul>/gi;

  let sectionMatch: RegExpExecArray | null;
  while ((sectionMatch = sectionRegex.exec(pageHtml)) !== null) {
    const anchorId = sectionMatch[1] ? stripHtml(sectionMatch[1]) : undefined;
    const title = stripHtml(sectionMatch[2]);
    const listHtml = sectionMatch[3];
    const games: BerlinMatch[] = [];

    const gameRegex = /<li class="spiel-item">([\s\S]*?)<\/li>/gi;
    let gameMatch: RegExpExecArray | null;
    while ((gameMatch = gameRegex.exec(listHtml)) !== null) {
      const gameHtml = gameMatch[1];
      const spielNumber = stripHtml(gameHtml.match(/<span class="spielnummer">([\s\S]*?)<\/span>/i)?.[1] || '');
      const venue = stripHtml(gameHtml.match(/<strong>([\s\S]*?)<\/strong>/i)?.[1] || '');
      const pairing = stripHtml(gameHtml.match(/<span class="spielpaarung">([\s\S]*?)<\/span>/i)?.[1] || '');
      const time = parseTimeText(gameHtml);
      const result = parseResultText(gameHtml);
      const note = gameHtml.includes('Achtung: Spiel verlegt') ? 'Achtung: Spiel verlegt' : undefined;

      if (spielNumber || pairing || result) {
        games.push({ spielNumber, time, venue, pairing, result, note });
      }
    }

    sections.push({ title, anchorId, games });
  }

  return sections;
}

function parsePdfLinks(html: string, baseUrl: string): BerlinPdfLink[] {
  const links: BerlinPdfLink[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = toAbsoluteUrl(match[1], baseUrl);
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({
      title: stripHtml(match[2]) || href.split('/').pop() || 'PDF',
      url: href,
    });
  }

  return links;
}

function sortPdfLinksNewestFirst(links: BerlinPdfLink[]): BerlinPdfLink[] {
  const score = (url: string): number => {
    const name = url.split('/').pop() || '';
    const match = name.match(/-(\d{1,2})(?:_|\.|$)/);
    return match ? Number(match[1]) : -1;
  };

  return [...links].sort((a, b) => score(b.url) - score(a.url));
}

function parsePageTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*id="post-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return stripHtml(h1);

  const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  return titleTag ? stripHtml(titleTag) : 'Berlinliga / Vereinsliga';
}

function normalizeSpieltagNumber(value: string): string {
  const asNum = Number(value);
  if (!Number.isFinite(asNum)) return value;
  return String(asNum);
}

function buildSpieltagReportRefs(pdfReports: BerlinPdfReport[]): BerlinSpieltagReportRef[] {
  const refs: BerlinSpieltagReportRef[] = [];
  const seen = new Set<string>();

  for (const report of pdfReports) {
    if (!report.spieltagHint) continue;
    const spieltag = normalizeSpieltagNumber(report.spieltagHint);
    if (!spieltag) continue;
    if (seen.has(spieltag)) continue;
    seen.add(spieltag);
    refs.push({
      spieltag,
      reportId: report.id,
      reportTitle: report.title,
      reportUrl: report.url,
    });
  }

  return refs.sort((a, b) => Number(a.spieltag) - Number(b.spieltag));
}

type BerlinReportIndexEntry = {
  id: string;
  title: string;
  pdf_url: string;
  csv_file: string | null;
  spieltag: string | null;
  row_count?: number;
  error?: string;
};

type BerlinReportIndex = {
  league: string;
  reports: BerlinReportIndexEntry[];
};

function parseCsvRows(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const out: BerlinPdfReport['players'] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(';');
    if (parts.length < 7) continue;
    const place = Number(parts[0]);
    if (!Number.isFinite(place)) continue;
    out.push({
      place,
      name: parts[1],
      team: parts[2],
      games: parts[3],
      avgKegel: parts[4],
      mp: parts[5],
      plusAuswechslung: parts[6],
    });
  }
  return out;
}

async function loadIndexedReports(league: BerlinLeagueKey): Promise<BerlinPdfReport[]> {
  const baseDir = path.join(process.cwd(), 'data', league);
  const indexPath = path.join(baseDir, 'index.json');
  const indexRaw = await readFile(indexPath, 'utf8');
  const index = JSON.parse(indexRaw) as BerlinReportIndex;
  const reports: BerlinPdfReport[] = [];

  for (const entry of index.reports || []) {
    const warnings: string[] = [];
    if (entry.error) warnings.push(entry.error);

    let players: BerlinPdfReport['players'] = [];
    if (entry.csv_file) {
      try {
        const csvRaw = await readFile(path.join(baseDir, entry.csv_file), 'utf8');
        players = parseCsvRows(csvRaw);
        if (players.length === 0) warnings.push('No Schnittliste player rows in CSV.');
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'Failed to read CSV report');
      }
    } else {
      warnings.push('No CSV generated for this report.');
    }

    reports.push({
      id: entry.id,
      title: entry.title,
      url: entry.pdf_url,
      spieltagHint: entry.spieltag || undefined,
      players,
      warnings,
    });
  }

  return reports;
}

export async function fetchBerlinLeagueData(league: BerlinLeagueKey): Promise<BerlinLeagueData> {
  const source = LEAGUE_SOURCES[league];
  const warnings: string[] = [];

  const pageHtml = await fetchHtml(source.page, 'https://kleeblatt-berlin.de/');

  let pdfPageHtml = '';
  try {
    pdfPageHtml = await fetchHtml(source.pdfPage, source.page);
  } catch (error) {
    warnings.push(`Auswertungen page fetch failed for ${league}; using PDF links from main page only.`);
    console.warn(error);
  }

  const standings = parseStandings(pageHtml);
  const matchdays = parseMatchdays(pageHtml);
  const pdfLinks = sortPdfLinksNewestFirst(parsePdfLinks(`${pageHtml}\n${pdfPageHtml}`, source.page));

  let pdfReports: BerlinPdfReport[] = [];
  try {
    pdfReports = await loadIndexedReports(league);
  } catch (error) {
    warnings.push('No local CSV index found. Run scripts/build_berlin_csv.py first.');
    console.error(error);
  }

  const spieltagReports = buildSpieltagReportRefs(pdfReports);

  return {
    league,
    title: parsePageTitle(pageHtml),
    sourceUrl: source.page,
    standings,
    matchdays,
    pdfLinks,
    pdfReports,
    spieltagReports,
    fetchedAt: new Date().toISOString(),
    warnings,
  };
}
