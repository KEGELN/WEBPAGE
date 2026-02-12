// Temporary integration types for Berlinliga/Vereinsliga scraping.
// Remove this folder when official API support is available.

export type BerlinLeagueKey = 'berlinliga' | 'vereinsliga';

export interface BerlinStandingRow {
  place: string;
  team: string;
  games: string;
  mp: string;
  sp: string;
  points: string;
}

export interface BerlinMatch {
  spielNumber: string;
  time: string;
  venue: string;
  pairing: string;
  result: string;
  note?: string;
}

export interface BerlinMatchday {
  title: string;
  anchorId?: string;
  games: BerlinMatch[];
}

export interface BerlinPdfLink {
  title: string;
  url: string;
}

export interface BerlinLeagueData {
  league: BerlinLeagueKey;
  title: string;
  sourceUrl: string;
  standings: BerlinStandingRow[];
  matchdays: BerlinMatchday[];
  pdfLinks: BerlinPdfLink[];
  fetchedAt: string;
  warnings: string[];
}

