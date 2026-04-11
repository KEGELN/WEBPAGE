'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { parseDateTimeString } from '@/lib/date-parser';
import { cn } from "@/lib/utils";
import { readDefaultLeagueId } from '@/lib/client-settings';
import { useTheme } from '@/lib/theme-context';

interface SpielplanGame {
  spieltag: string;
  game_id: string;
  game_nr: string;
  date_time: string;
  team_home: string;
  team_away: string;
  result: string;
  points_home: string;
  points_away: string;
}

interface SeasonOption {
  season_id: string;
  yearof_season: number;
}

interface LeagueOption {
  liga_id: string;
  wertung?: string;
  name_der_liga: string;
}

interface RawGameOption {
  game_id: string;
  spiel_datum: string;
  spiel_uhrzeit: string;
  team1_name: string;
  team2_name: string;
  status: string;
  additional_info: string;
}

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

const parseGameDate = parseDateTimeString;

function formatDateForIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function normalizeTeamName(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function hasPlayedResult(value: string): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '-') return false;
  return /\d/.test(trimmed);
}

function parseResultScore(value: string): { home: number; away: number } | null {
  const match = String(value || '').match(/(\d+)\s*:\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function isTeamGame(game: SpielplanGame, team: string): boolean {
  const target = normalizeTeamName(team);
  return normalizeTeamName(game.team_home) === target || normalizeTeamName(game.team_away) === target;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function extractDateOnly(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '-';
  const dateMatch = text.match(/([A-Za-z]{2}\.\s*)?\d{1,2}\.\d{1,2}\.\d{2,4}/);
  return dateMatch ? dateMatch[0].trim() : text.replace(/\s*[-|]?\s*\d{1,2}:\d{2}.*$/, '').trim();
}

function mapGamesToSpielplanEntries(games: RawGameOption[]): SpielplanGame[] {
  return games.map((game) => {
    const scoreMatch = String(game.additional_info || '').match(/(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)/);
    const pointsHome = scoreMatch?.[1] ?? '';
    const pointsAway = scoreMatch?.[2] ?? '';
    const result = pointsHome && pointsAway ? `${pointsHome} : ${pointsAway}` : String(game.status || '-');

    return {
      spieltag: '',
      game_id: String(game.game_id || ''),
      game_nr: '',
      date_time: [game.spiel_datum, game.spiel_uhrzeit].filter(Boolean).join(' ').trim(),
      team_home: String(game.team1_name || ''),
      team_away: String(game.team2_name || ''),
      result,
      points_home: pointsHome,
      points_away: pointsAway,
    };
  });
}

function TournamentsPageContent() {
  const apiService = ApiService.getInstance();
  const searchParams = useSearchParams();
  const { expertMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spiele, setSpiele] = useState<SpielplanGame[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<string, GameDetailRow[]>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [spieltagMap, setSpieltagMap] = useState<Record<string, string>>({});
  const [gameNotes, setGameNotes] = useState<Record<string, string>>({});
  const [livePollingMinutes, setLivePollingMinutes] = useState<5 | 10>(5);
  const [lastLiveSync, setLastLiveSync] = useState<Date | null>(null);

  const appliedQueryTeamRef = useRef(false);

  const loadPlanData = useCallback(async (seasonId: string, leagueId: string) => {
    const [planData, spieltagData] = await Promise.all([
      apiService.getSpielplan(seasonId, leagueId),
      apiService.getSpieltage(seasonId, leagueId),
    ]);

    const normalizedPlan = planData.length > 0
      ? planData
      : mapGamesToSpielplanEntries((await apiService.getGames(seasonId, leagueId, '0')) as RawGameOption[]);

    return {
      planData: normalizedPlan,
      spieltagData,
    };
  }, [apiService]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const seasonData = await apiService.getCurrentSeason();
        setSeasons(seasonData);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, [apiService]);

  useEffect(() => {
    if (selectedSeason || seasons.length === 0) return;
    const requestedSeason = searchParams.get('season');
    const isValidRequestedSeason = requestedSeason
      ? seasons.some((season) => String(season.season_id) === requestedSeason)
      : false;
    setSelectedSeason(isValidRequestedSeason ? String(requestedSeason) : String(seasons[0].season_id));
  }, [searchParams, seasons, selectedSeason]);

  useEffect(() => {
    if (selectedLeague || leagues.length === 0) return;
    const requestedLeague = searchParams.get('league');
    const defaultLeague = readDefaultLeagueId();
    const isValidRequestedLeague = requestedLeague
      ? leagues.some((league) => String(league.liga_id) === requestedLeague)
      : false;
    const isValidDefaultLeague = defaultLeague
      ? leagues.some((league) => String(league.liga_id) === defaultLeague)
      : false;
    if (isValidRequestedLeague) {
      setSelectedLeague(String(requestedLeague));
      return;
    }
    if (isValidDefaultLeague) {
      setSelectedLeague(defaultLeague);
      return;
    }
    setSelectedLeague(String(leagues[0].liga_id));
  }, [searchParams, leagues, selectedLeague]);

  useEffect(() => {
    const fetchLeaguesForSeason = async () => {
      if (!selectedSeason) return;
      try {
        const leagueData = (await apiService.getLeagues(selectedSeason)) as LeagueOption[];
        setLeagues(leagueData);
        const requestedLeague = searchParams.get('league');
        const defaultLeague = readDefaultLeagueId();
        setSelectedLeague((prev) => {
          if (leagueData.length === 0) return '';
          const previousIsValid = leagueData.some((league) => String(league.liga_id) === String(prev));
          if (previousIsValid) return prev;
          const requestedIsValid = requestedLeague
            ? leagueData.some((league) => String(league.liga_id) === String(requestedLeague))
            : false;
          if (requestedIsValid) return String(requestedLeague);
          const defaultIsValid = defaultLeague
            ? leagueData.some((league) => String(league.liga_id) === String(defaultLeague))
            : false;
          if (defaultIsValid) return String(defaultLeague);
          return String(leagueData[0].liga_id);
        });
      } catch (err) {
        console.error('Error fetching leagues for season:', err);
        setLeagues([]);
        setSelectedLeague('');
      }
    };

    fetchLeaguesForSeason();
  }, [apiService, searchParams, selectedSeason]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedSeason || !selectedLeague) return;
      setLoading(true);
      setError(null);

      try {
        const { planData, spieltagData } = await loadPlanData(selectedSeason, selectedLeague);
        setSpiele(planData);
        setGameDetails({});
        setDetailsLoading({});
        setGameNotes({});
        setOpenGameId(null);

        const map: Record<string, string> = {};
        spieltagData.forEach((entry) => {
          map[entry.label] = entry.id;
        });
        setSpieltagMap(map);
      } catch (err) {
        console.error(err);
        setError('Failed to load tournament schedule.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loadPlanData, selectedSeason, selectedLeague]);

  useEffect(() => {
    if (!selectedSeason || !selectedLeague) return;
    let cancelled = false;

    const refreshPlan = async () => {
      try {
        const { planData, spieltagData } = await loadPlanData(selectedSeason, selectedLeague);
        if (cancelled) return;
        setSpiele(planData);
        const map: Record<string, string> = {};
        spieltagData.forEach((entry) => {
          map[entry.label] = entry.id;
        });
        setSpieltagMap(map);
        setLastLiveSync(new Date());
        setError(null);
      } catch (err) {
        console.error('Error refreshing live schedule:', err);
      }
    };

    const interval = window.setInterval(refreshPlan, livePollingMinutes * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [livePollingMinutes, loadPlanData, selectedLeague, selectedSeason]);

  useEffect(() => {
    if (appliedQueryTeamRef.current || spiele.length === 0) return;
    const requestedTeam = searchParams.get('team');
    if (!requestedTeam) {
      appliedQueryTeamRef.current = true;
      return;
    }

    const teamSet = new Set<string>();
    spiele.forEach((game) => {
      if (game.team_home) teamSet.add(game.team_home);
      if (game.team_away) teamSet.add(game.team_away);
    });
    const teamList = Array.from(teamSet);
    const matched = teamList.find((team) => normalizeTeamName(team) === normalizeTeamName(requestedTeam));
    if (matched) {
      setSelectedTeam(matched);
    }
    appliedQueryTeamRef.current = true;
  }, [searchParams, spiele]);

  const displayValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  const handleSeasonChange = (nextSeason: string) => {
    if (nextSeason === selectedSeason) return;
    // Reset dependent filters/data so season switch always refetches fresh leagues/tables.
    setSelectedSeason(nextSeason);
    setSelectedLeague('');
    setSelectedTeam('');
    setSpiele([]);
    setSpieltagMap({});
    setGameDetails({});
    setDetailsLoading({});
    setGameNotes({});
    setOpenGameId(null);
    setError(null);
    appliedQueryTeamRef.current = false;
  };

  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    spiele.forEach((game) => {
      if (game.team_home) set.add(game.team_home);
      if (game.team_away) set.add(game.team_away);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [spiele]);

  const filteredGames = useMemo(() => {
    if (!selectedTeam) return spiele;
    return spiele.filter((game) => isTeamGame(game, selectedTeam));
  }, [selectedTeam, spiele]);

  const selectedLeagueConfig = useMemo(
    () => leagues.find((league) => String(league.liga_id) === String(selectedLeague)) ?? null,
    [leagues, selectedLeague]
  );

  const sortedTeamGames = useMemo(() => {
    if (!selectedTeam) return [] as SpielplanGame[];
    return [...filteredGames].sort((a, b) => {
      const aDate = parseGameDate(a.date_time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDate = parseGameDate(b.date_time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  }, [filteredGames, selectedTeam]);

  const playedGames = useMemo(() => {
    const now = new Date();
    return sortedTeamGames.filter((game) => {
      const gameDate = parseGameDate(game.date_time);
      return hasPlayedResult(game.result) || (!!gameDate && gameDate.getTime() <= now.getTime());
    });
  }, [sortedTeamGames]);

  const upcomingGames = useMemo(() => {
    const now = new Date();
    return sortedTeamGames.filter((game) => {
      const gameDate = parseGameDate(game.date_time);
      if (!gameDate) return !hasPlayedResult(game.result);
      return gameDate.getTime() > now.getTime() && !hasPlayedResult(game.result);
    });
  }, [sortedTeamGames]);

  const teamIcsDataUri = useMemo(() => {
    if (!selectedTeam || sortedTeamGames.length === 0) return '';

    const nowStamp = formatDateForIcs(new Date());
    const events = sortedTeamGames
      .map((game) => {
        const start = parseGameDate(game.date_time);
        if (!start) return '';
        const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
        const summary = `${game.team_home} vs ${game.team_away}`;
        const description = `Spieltag: ${game.spieltag}\\nErgebnis: ${game.result || '-'}`;
        return [
          'BEGIN:VEVENT',
          `UID:${escapeIcsText(`${game.game_id}@kegel`)}`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${formatDateForIcs(start)}`,
          `DTEND:${formatDateForIcs(end)}`,
          `SUMMARY:${escapeIcsText(summary)}`,
          `DESCRIPTION:${escapeIcsText(description)}`,
          'END:VEVENT',
        ].join('\r\n');
      })
      .filter(Boolean)
      .join('\r\n');

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kegel//TeamSchedule//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      events,
      'END:VCALENDAR',
    ].join('\r\n');

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  }, [selectedTeam, sortedTeamGames]);


  const fetchGameDetails = async (gameId: string) => {
    if (!selectedSeason) return;
    if (gameDetails[gameId]) return;
    setDetailsLoading((prev) => ({ ...prev, [gameId]: true }));
    try {
      const wertung = Number(selectedLeagueConfig?.wertung || '1') || 1;
      const data = await apiService.getSpielerInfo(selectedSeason, gameId, wertung);
      setGameDetails((prev) => ({ ...prev, [gameId]: data }));
    } catch (err) {
      console.error('Error fetching game details:', err);
    } finally {
      setDetailsLoading((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  const fetchGameNotes = async (gameId: string) => {
    if (!selectedSeason || !selectedLeague) return;
    if (gameNotes[gameId]) return;
    const game = spiele.find((entry) => entry.game_id === gameId);
    const spieltagId = game ? spieltagMap[game.spieltag] : undefined;
    if (!spieltagId) return;
    try {
      const games = await apiService.getGamesBySpieltag(selectedSeason, selectedLeague, spieltagId);
      const notesMap: Record<string, string> = {};
      (games as GameDetailRow[]).forEach((row) => {
        const id = String(row[0] ?? '');
        const note = String(row[10] ?? '');
        if (id) notesMap[id] = note;
      });
      setGameNotes((prev) => ({ ...prev, ...notesMap }));
    } catch (err) {
      console.error('Error fetching game notes:', err);
    }
  };


  const downloadGameDetailsAsPng = async (game: SpielplanGame, rows: GameDetailRow[], notes?: string) => {
    if (!rows || rows.length === 0) return;

    const isNoteRow = (row: GameDetailRow) =>
      row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
    const isTotalsRow = (row: GameDetailRow) => row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];

    const tableRows = rows.filter((row) => !isNoteRow(row));
    if (tableRows.length === 0) return;
    const totalsRow = tableRows.find((row) => isTotalsRow(row));
    const noteLines = rows
      .filter((row) => isNoteRow(row))
      .map((row) => String(row[0] ?? '').trim())
      .filter(Boolean);
    if (notes && notes.trim()) {
      noteLines.push(`Hinweise: ${notes.trim()}`);
    }

    const canvas = document.createElement('canvas');
    const width = 1800;
    const rowHeight = 44;
    const headerHeight = 176;
    const tableHeaderHeight = 46;
    const footerHeight = 28;
    const notesHeight = noteLines.length > 0 ? 56 + (noteLines.length - 1) * 28 : 0;
    const tableHeight = tableHeaderHeight + tableRows.length * rowHeight;
    const cardHeight = headerHeight + tableHeight + notesHeight + footerHeight;
    const height = Math.max(420, cardHeight + 40);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f6f1f2';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e4cbcf';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 14, width - 28, height - 28);
    ctx.strokeRect(14, 14, width - 28, height - 28);

    const logo = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/logo.png';
    });

    const logoSize = 90;
    if (logo) {
      ctx.drawImage(logo, width - 34 - logoSize, 28, logoSize, logoSize);
    }

    const colWidths = [268, 66, 66, 66, 66, 84, 58, 58, 72, 58, 58, 84, 66, 66, 66, 66, 268];
    const columnTotalWidth = colWidths.reduce((sum, current) => sum + current, 0);
    const tableX = Math.floor((width - columnTotalWidth) / 2);
    const tableWidth = columnTotalWidth;
    const tableY = headerHeight;

    const leftBlockWidth = colWidths.slice(0, 8).reduce((sum, current) => sum + current, 0);
    const rightBlockStart = tableX + colWidths.slice(0, 9).reduce((sum, current) => sum + current, 0);
    const rightBlockWidth = colWidths.slice(9).reduce((sum, current) => sum + current, 0);

    const centerX = width / 2;
    const displayDate = extractDateOnly(game.date_time);

    ctx.fillStyle = '#111827';
    ctx.font = '800 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Spielergebnis', centerX, 66);

    ctx.font = '700 28px Arial';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.beginPath();
    ctx.rect(tableX + 8, 84, leftBlockWidth - 16, 36);
    ctx.clip();
    ctx.fillText(game.team_home || '-', tableX + leftBlockWidth / 2, 112);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(rightBlockStart + 8, 84, rightBlockWidth - 16, 36);
    ctx.clip();
    ctx.fillText(game.team_away || '-', rightBlockStart + rightBlockWidth / 2, 112);
    ctx.restore();

    ctx.font = '400 17px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.fillText(`${displayDate} | Spieltag ${game.spieltag}`, centerX, 124);

    const colLabels = ['Spieler', '1', '2', '3', '4', 'Kegel', 'SP', 'MP', '', 'MP', 'SP', 'Kegel', '4', '3', '2', '1', 'Spieler'];
    const colAlign: CanvasTextAlign[] = [
      'right',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'center',
      'left',
    ];

    const drawTextInCell = (
      text: string,
      rowY: number,
      colIndex: number,
      bold = false,
      color = '#2b1e1f'
    ) => {
      const x = tableX + colWidths.slice(0, colIndex).reduce((a, b) => a + b, 0);
      const w = colWidths[colIndex];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, rowY + 2, w - 4, rowHeight - 4);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.font = `${bold ? '700' : '500'} 16px Arial`;
      ctx.textAlign = colAlign[colIndex];
      const tx = colAlign[colIndex] === 'right' ? x + w - 10 : colAlign[colIndex] === 'left' ? x + 10 : x + w / 2;
      ctx.fillText(text || '-', tx, rowY + 28);
      ctx.restore();
    };

    const parseNumericCell = (value: GameDetailCell): number | null => {
      const raw = String(value ?? '').trim();
      if (!raw || raw === '-' || raw === '–') return null;
      const num = Number(raw.replace(',', '.'));
      return Number.isFinite(num) ? num : null;
    };

    const formatTotalValue = (value: number): string => {
      if (Number.isInteger(value)) return String(value);
      return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    };

    const nonTotalRows = tableRows.filter((row) => !isTotalsRow(row));
    const computedMpLeft = nonTotalRows.reduce((sum, row) => sum + (parseNumericCell(row[7]) ?? 0), 0);
    const computedMpRight = nonTotalRows.reduce((sum, row) => sum + (parseNumericCell(row[8]) ?? 0), 0);

    roundedRectPath(ctx, tableX, tableY - tableHeaderHeight, tableWidth, tableHeaderHeight + tableRows.length * rowHeight, 18);
    ctx.fillStyle = '#faf6f7';
    ctx.fill();
    ctx.save();
    roundedRectPath(ctx, tableX, tableY - tableHeaderHeight, tableWidth, tableHeaderHeight + tableRows.length * rowHeight, 18);
    ctx.clip();
    ctx.fillStyle = '#efe5e7';
    ctx.fillRect(tableX, tableY - tableHeaderHeight, tableWidth, tableHeaderHeight);
    ctx.restore();
    ctx.strokeStyle = '#e1c6cb';
    ctx.lineWidth = 1;
    roundedRectPath(ctx, tableX, tableY - tableHeaderHeight, tableWidth, tableHeaderHeight + tableRows.length * rowHeight, 18);
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.font = '700 16px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < colLabels.length; i += 1) {
      const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      const w = colWidths[i];
      const labelAlign = colAlign[i];
      ctx.textAlign = labelAlign;
      const tx = labelAlign === 'right' ? x + w - 10 : labelAlign === 'left' ? x + 10 : x + w / 2;
      ctx.fillText(colLabels[i], tx, tableY - 14);
    }

    tableRows.forEach((row, idx) => {
      const rowY = tableY + idx * rowHeight;
      ctx.fillStyle = idx % 2 === 0 ? '#fff1f3' : '#ffffff';
      ctx.fillRect(tableX, rowY, tableWidth, rowHeight);

      ctx.strokeStyle = '#e7d4d7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tableX, rowY + rowHeight);
      ctx.lineTo(tableX + tableWidth, rowY + rowHeight);
      ctx.stroke();

      const isTotals = Boolean(isTotalsRow(row));
      const leftTotal = totalsRow ? Number(totalsRow[5]) : null;
      const rightTotal = totalsRow ? Number(totalsRow[10]) : null;
      const diff =
        leftTotal !== null && rightTotal !== null && !Number.isNaN(leftTotal) && !Number.isNaN(rightTotal)
          ? leftTotal - rightTotal
          : null;
      const diffLabel = diff === null ? '' : diff > 0 ? `+${diff}-` : diff < 0 ? `${diff}+` : '0';

      const cellValues = [
        String(row[0] ?? ''),
        String(row[1] ?? ''),
        String(row[2] ?? ''),
        String(row[3] ?? ''),
        String(row[4] ?? ''),
        String(row[5] ?? ''),
        String(row[6] ?? ''),
        isTotals ? formatTotalValue(computedMpLeft) : String(row[7] ?? ''),
        isTotals ? diffLabel : '',
        isTotals ? formatTotalValue(computedMpRight) : String(row[8] ?? ''),
        String(row[9] ?? ''),
        String(row[10] ?? ''),
        String(row[11] ?? ''),
        String(row[12] ?? ''),
        String(row[13] ?? ''),
        String(row[14] ?? ''),
        String(row[15] ?? ''),
      ];

      for (let col = 0; col < cellValues.length; col += 1) {
        const isMpColumn = col === 7 || col === 9;
        const mpValue = cellValues[col];
        const hasGainedMp = isMpColumn && mpValue !== '' && mpValue !== '-' && mpValue !== '0';
        const color = col === 8 && isTotals && diffLabel ? '#e11d48' : hasGainedMp ? '#15803d' : '#2b1e1f';
        drawTextInCell(cellValues[col], rowY, col, isTotals, color);
      }
    });

    if (noteLines.length > 0) {
      const notesTop = tableY + tableRows.length * rowHeight + 16;
      const notesBoxHeight = notesHeight - 12;
      const noteGradient = ctx.createLinearGradient(tableX, notesTop, tableX + tableWidth, notesTop + notesBoxHeight);
      noteGradient.addColorStop(0, '#fff1f3');
      noteGradient.addColorStop(1, '#ffe4e6');
      roundedRectPath(ctx, tableX, notesTop, tableWidth, notesBoxHeight, 12);
      ctx.fillStyle = noteGradient;
      ctx.fill();
      ctx.strokeStyle = '#e1c6cb';
      roundedRectPath(ctx, tableX, notesTop, tableWidth, notesBoxHeight, 12);
      ctx.stroke();

      ctx.fillStyle = '#3b2a2d';
      ctx.font = '500 16px Arial';
      ctx.textAlign = 'left';
      noteLines.forEach((line, idx) => {
        ctx.fillText(line, tableX + 14, notesTop + 34 + idx * 28);
      });
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `spiel-${game.game_id}-ergebnis.png`;
    link.click();
  };

  const toggleGame = async (gameId: string) => {
    const next = openGameId === gameId ? null : gameId;
    setOpenGameId(next);
    if (next) {
      await fetchGameDetails(gameId);
      await fetchGameNotes(gameId);
    }
  };

  const isSubstitution = (name: string | number | null | undefined) => {
    const n = String(name || '');
    return n.includes('(A)') || n.includes('(E)') || n.toLowerCase().includes('ab wurf');
  };

  const renderGameDetailsTable = (rows: GameDetailRow[]) => {
    if (!rows || rows.length === 0) return null;

    const totalRow = rows.find((r) => r?.[0] === '' && r?.[15] === '' && r?.[5] && r?.[10]);
    const leftTotal = totalRow ? Number(totalRow[5]) : null;
    const rightTotal = totalRow ? Number(totalRow[10]) : null;
    const diff =
      leftTotal !== null && rightTotal !== null && !Number.isNaN(leftTotal) && !Number.isNaN(rightTotal)
        ? leftTotal - rightTotal
        : null;
    const diffLabel = diff === null ? '' : diff > 0 ? `+${diff}-` : diff < 0 ? `${diff}+` : '0';

    return (
      <Card className="overflow-hidden border border-border/50 shadow-inner">
        <Table className="text-xs">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right w-[14rem]">Spieler</TableHead>
              <TableHead className="text-center hidden sm:table-cell">1</TableHead>
              <TableHead className="text-center hidden sm:table-cell">2</TableHead>
              <TableHead className="text-center hidden sm:table-cell">3</TableHead>
              <TableHead className="text-center hidden sm:table-cell">4</TableHead>
              <TableHead className="text-center font-bold">Kegel</TableHead>
              <TableHead className="text-center">SP</TableHead>
              <TableHead className="text-center">MP</TableHead>
              <TableHead className="text-center w-8 p-0 font-bold text-primary">{diffLabel}</TableHead>
              <TableHead className="text-center">MP</TableHead>
              <TableHead className="text-center">SP</TableHead>
              <TableHead className="text-center font-bold">Kegel</TableHead>
              <TableHead className="text-center hidden sm:table-cell">4</TableHead>
              <TableHead className="text-center hidden sm:table-cell">3</TableHead>
              <TableHead className="text-center hidden sm:table-cell">2</TableHead>
              <TableHead className="text-center hidden sm:table-cell">1</TableHead>
              <TableHead className="text-left w-[14rem]">Spieler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const isNoteRow =
                row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
              if (isNoteRow) {
                return (
                  <TableRow key={`note-${idx}`} className="hover:bg-transparent border-none">
                    <TableCell colSpan={17} className="py-2 px-3 italic text-muted-foreground text-[11px] bg-muted/10">
                      {row[0] || ''}
                    </TableCell>
                  </TableRow>
                );
              }

              const isTotals = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];
              if (isTotals) return null;

              const leftSub = isSubstitution(row[0]);
              const rightSub = isSubstitution(row[15]);

              return (
                <TableRow key={`row-${idx}`} className={cn("h-8 transition-colors", (leftSub || rightSub) ? "bg-amber-500/5" : (idx % 2 === 0 ? "bg-background" : "bg-muted/5"))}>
                  <TableCell className={cn("py-1 px-3 text-right truncate font-medium", leftSub && "text-amber-600 italic")}>{displayValue(row[0])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[1])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[2])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[3])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[4])}</TableCell>
                  <TableCell className="py-1 px-1 text-center font-bold">{displayValue(row[5])}</TableCell>
                  <TableCell className="py-1 px-1 text-center">{displayValue(row[6])}</TableCell>
                  <TableCell className="py-1 px-1 text-center font-semibold text-green-600 dark:text-green-400">{displayValue(row[7])}</TableCell>
                  <TableCell className="py-1 p-0 text-center"></TableCell>
                  <TableCell className="py-1 px-1 text-center font-semibold text-green-600 dark:text-green-400">{displayValue(row[8])}</TableCell>
                  <TableCell className="py-1 px-1 text-center">{displayValue(row[9])}</TableCell>
                  <TableCell className="py-1 px-1 text-center font-bold">{displayValue(row[10])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[11])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[12])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[13])}</TableCell>
                  <TableCell className="py-1 px-1 text-center hidden sm:table-cell text-muted-foreground">{displayValue(row[14])}</TableCell>
                  <TableCell className={cn("py-1 px-3 text-left truncate font-medium", rightSub && "text-amber-600 italic")}>{displayValue(row[15])}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  };

  const groupedSpieltage = useMemo(() => {
    const map = new Map<string, SpielplanGame[]>();
    filteredGames.forEach((game) => {
      const key = game.spieltag || 'Ohne Spieltag';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(game);
    });
    return map;
  }, [filteredGames]);

  return (
    <div className="min-h-screen bg-background">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 border-none shadow-md overflow-hidden">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Turniere</CardTitle>
            <CardDescription>Spielplan nach Saison und Liga.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end rounded-xl border border-border bg-card/50 p-4 shadow-sm">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="seasonFilter" className="text-sm font-medium">Saison</label>
                <Select
                  id="seasonFilter"
                  value={selectedSeason}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="w-[180px]"
                >
                  {seasons.map((season) => (
                    <option key={season.season_id} value={season.season_id}>
                      {season.yearof_season}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="leagueFilter" className="text-sm font-medium">Liga</label>
                <Select
                  id="leagueFilter"
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-[220px]"
                >
                  {leagues.map((league) => (
                    <option key={league.liga_id} value={league.liga_id}>
                      {league.name_der_liga}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="teamFilter" className="text-sm font-medium">Mannschaft</label>
                <Select
                  id="teamFilter"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-[280px]"
                >
                  <option value="">Alle Mannschaften</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="livePollFilter" className="text-sm font-medium">Live-Refresh</label>
                <Select
                  id="livePollFilter"
                  value={String(livePollingMinutes)}
                  onChange={(e) => setLivePollingMinutes(Number(e.target.value) === 10 ? 10 : 5)}
                  className="w-[180px]"
                >
                  <option value="5">Alle 5 Minuten</option>
                  <option value="10">Alle 10 Minuten</option>
                </Select>
              </div>
            </div>

            {selectedTeam && (
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card/70 text-sm">
                <div className="text-muted-foreground">
                  Team: <span className="font-semibold text-foreground">{selectedTeam}</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  Gespielt: {playedGames.length}
                </div>
                <div className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
                  Offen: {upcomingGames.length}
                </div>
                <div className="text-xs text-muted-foreground ml-auto">
                  Letztes Update: {lastLiveSync ? lastLiveSync.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </div>
                {teamIcsDataUri && (
                  <Button variant="outline" size="sm" asChild className="ml-2">
                    <a
                      href={teamIcsDataUri}
                      download={`spielplan-${selectedTeam.replace(/\s+/g, '-').toLowerCase()}.ics`}
                    >
                      ICS herunterladen
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {loading && <LoadingSpinner label="Loading tournament schedule..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">{error}</div>
        )}

        {!loading && !error && filteredGames.length > 0 && (
          <div className="space-y-6">
            {Array.from(groupedSpieltage.keys()).map((spieltag) => {
              const rows = groupedSpieltage.get(spieltag) || [];
              return (
                <section key={spieltag} className="space-y-4">
                  <h2 className="text-xl font-semibold px-1">{spieltag}</h2>
                  <Card className="border border-border bg-gradient-to-br from-red-500/5 via-background to-rose-500/5 shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Datum/Zeit</TableHead>
                          {expertMode && <TableHead className="w-[100px]">Game ID</TableHead>}
                          <TableHead className="w-1/3">Heim</TableHead>
                          <TableHead className="w-1/3">Gast</TableHead>
                          <TableHead className="w-[150px] text-right">Ergebnis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((spiel, idx) => {
                          const isOpen = openGameId === spiel.game_id;
                          const score = parseResultScore(`${spiel.points_home} : ${spiel.points_away}`) ?? parseResultScore(spiel.result);
                          const pointDiff = score ? Math.abs(score.home - score.away) : null;
                          const leader = score
                            ? score.home > score.away
                              ? 'Heim führt'
                              : score.away > score.home
                                ? 'Gast führt'
                                : 'Gleichstand'
                            : null;
                          return (
                            <React.Fragment key={`${spiel.game_id}-${idx}`}>
                              <TableRow
                                className="cursor-pointer"
                                onClick={() => toggleGame(spiel.game_id)}
                              >
                                <TableCell className="whitespace-nowrap font-medium text-xs sm:text-sm">{displayValue(spiel.date_time)}</TableCell>
                                {expertMode && (
                                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{displayValue(spiel.game_id)}</TableCell>
                                )}
                                <TableCell className="font-semibold text-sm sm:text-base w-1/3">{displayValue(spiel.team_home)}</TableCell>
                                <TableCell className="font-semibold text-sm sm:text-base w-1/3">{displayValue(spiel.team_away)}</TableCell>
                                <TableCell className="text-right w-[150px]">
                                  <div className="font-bold text-primary tabular-nums">{displayValue(spiel.result)}</div>
                                  {leader && (
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                      {leader}{pointDiff !== null ? ` (${pointDiff})` : ''}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                              {isOpen && (
                                <TableRow key={`${spiel.game_id}-details`}>
                                  <TableCell colSpan={expertMode ? 5 : 4} className="bg-muted/30 p-6">
                                    {detailsLoading[spiel.game_id] && (
                                      <LoadingSpinner label="Lade Ergebnisse..." className="py-6" size="sm" />
                                    )}
                                    {!detailsLoading[spiel.game_id] && (
                                      <div className="space-y-4">
                                        <div className="flex justify-end">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadGameDetailsAsPng(
                                                spiel,
                                                gameDetails[spiel.game_id] || [],
                                                gameNotes[spiel.game_id] || ''
                                              );
                                            }}
                                          >
                                            Export PNG
                                          </Button>
                                        </div>
                                        {renderGameDetailsTable(gameDetails[spiel.game_id] || [])}
                                        {gameNotes[spiel.game_id] && gameNotes[spiel.game_id].trim() !== '' && (
                                          <Card className="bg-muted/50 border-none">
                                            <CardContent className="p-3 text-sm text-muted-foreground">
                                              <span className="font-bold text-foreground mr-2">Hinweise:</span> 
                                              {gameNotes[spiel.game_id]}
                                            </CardContent>
                                          </Card>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                </section>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredGames.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Keine Turnier-Spiele gefunden</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TournamentsPageContent />
    </Suspense>
  );
}
