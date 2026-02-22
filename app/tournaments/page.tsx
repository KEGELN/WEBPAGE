'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  name_der_liga: string;
}

interface SpieltagOption {
  id: string;
  nr: string;
  label: string;
  status: string;
}

type GameDetailCell = string | number | null | undefined;
type GameDetailRow = GameDetailCell[];

function parseGameDate(value: string): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const dm = trimmed.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dm) {
    const year = Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]);
    const month = Number(dm[2]) - 1;
    const day = Number(dm[1]);
    const hour = dm[4] ? Number(dm[4]) : 0;
    const minute = dm[5] ? Number(dm[5]) : 0;
    const date = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

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

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hasPlayedResult(value: string): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '-') return false;
  return /\d/.test(trimmed);
}

function isTeamGame(game: SpielplanGame, team: string): boolean {
  const target = normalizeTeamName(team);
  return normalizeTeamName(game.team_home) === target || normalizeTeamName(game.team_away) === target;
}

function notifyIfAllowed(title: string, body: string, tag: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, tag });
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

function TournamentsPageContent() {
  const apiService = ApiService.getInstance();
  const searchParams = useSearchParams();
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribedForTeam, setIsSubscribedForTeam] = useState(false);

  const appliedQueryTeamRef = useRef(false);
  const notifiedKeysRef = useRef<Set<string>>(new Set());
  const knownResultsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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
    const isValidRequestedLeague = requestedLeague
      ? leagues.some((league) => String(league.liga_id) === requestedLeague)
      : false;
    setSelectedLeague(isValidRequestedLeague ? String(requestedLeague) : String(leagues[0].liga_id));
  }, [searchParams, leagues, selectedLeague]);

  useEffect(() => {
    const fetchLeaguesForSeason = async () => {
      if (!selectedSeason) return;
      try {
        const leagueData = (await apiService.getLeagues(selectedSeason)) as LeagueOption[];
        setLeagues(leagueData);
        const requestedLeague = searchParams.get('league');
        setSelectedLeague((prev) => {
          if (leagueData.length === 0) return '';
          const previousIsValid = leagueData.some((league) => String(league.liga_id) === String(prev));
          if (previousIsValid) return prev;
          const requestedIsValid = requestedLeague
            ? leagueData.some((league) => String(league.liga_id) === String(requestedLeague))
            : false;
          if (requestedIsValid) return String(requestedLeague);
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
        const [planData, spieltagData] = await Promise.all([
          apiService.getSpielplan(selectedSeason, selectedLeague),
          apiService.getSpieltage(selectedSeason, selectedLeague),
        ]);
        setSpiele(planData as SpielplanGame[]);
        setGameDetails({});
        setDetailsLoading({});
        setGameNotes({});
        setOpenGameId(null);

        const map: Record<string, string> = {};
        (spieltagData as SpieltagOption[]).forEach((entry) => {
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
  }, [apiService, selectedSeason, selectedLeague]);

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
    notifiedKeysRef.current.clear();
    knownResultsRef.current = {};
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

  useEffect(() => {
    if (!selectedSeason || !selectedLeague || !selectedTeam) {
      setIsSubscribedForTeam(false);
      return;
    }
    if (typeof window === 'undefined') return;

    const key = `${selectedSeason}:${selectedLeague}:${selectedTeam}`;
    const raw = window.localStorage.getItem('kegel:teamSubscriptions');
    const subscriptions = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    setIsSubscribedForTeam(Boolean(subscriptions[key]));
  }, [selectedSeason, selectedLeague, selectedTeam]);

  useEffect(() => {
    if (!isSubscribedForTeam || notificationPermission !== 'granted') return;
    if (!selectedSeason || !selectedLeague || !selectedTeam) return;

    let cancelled = false;

    const checkTodayGames = async () => {
      const now = new Date();
      const currentDateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      const todaysGames = sortedTeamGames.filter((game) => {
        const date = parseGameDate(game.date_time);
        return date ? isSameCalendarDay(date, now) : false;
      });

      // Requirement: only update/check for notification details when game exists today.
      if (todaysGames.length === 0) return;

      try {
        const latestPlan = (await apiService.getSpielplan(selectedSeason, selectedLeague)) as SpielplanGame[];
        if (cancelled) return;
        setSpiele(latestPlan);

        const latestTeamGames = latestPlan
          .filter((game) => isTeamGame(game, selectedTeam))
          .filter((game) => {
            const date = parseGameDate(game.date_time);
            return date ? isSameCalendarDay(date, now) : false;
          })
          .sort((a, b) => {
            const aDate = parseGameDate(a.date_time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            const bDate = parseGameDate(b.date_time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
            return aDate - bDate;
          });

        const nextGameToday = latestTeamGames.find((game) => {
          const date = parseGameDate(game.date_time);
          return date ? date.getTime() >= now.getTime() : false;
        });

        if (nextGameToday) {
          const nextKey = `next:${currentDateKey}:${nextGameToday.game_id}`;
          if (!notifiedKeysRef.current.has(nextKey)) {
            notifyIfAllowed(
              `${selectedTeam}: naechstes Spiel heute`,
              `${nextGameToday.date_time} - ${nextGameToday.team_home} vs ${nextGameToday.team_away}`,
              nextKey
            );
            notifiedKeysRef.current.add(nextKey);
          }
        }

        latestTeamGames.forEach((game) => {
          const gameDate = parseGameDate(game.date_time);
          if (!gameDate) return;

          const liveWindowEnd = new Date(gameDate.getTime() + 4 * 60 * 60 * 1000);
          const startKey = `start:${currentDateKey}:${game.game_id}`;
          if (now >= gameDate && now <= liveWindowEnd && !notifiedKeysRef.current.has(startKey)) {
            notifyIfAllowed(
              `${selectedTeam}: Spiel laeuft`,
              `${game.team_home} vs ${game.team_away} hat begonnen.`,
              startKey
            );
            notifiedKeysRef.current.add(startKey);
          }

          const normalizedResult = String(game.result || '').trim();
          const previousResult = String(knownResultsRef.current[game.game_id] || '').trim();
          if (previousResult && normalizedResult && normalizedResult !== previousResult) {
            const updateKey = `update:${currentDateKey}:${game.game_id}:${normalizedResult}`;
            if (!notifiedKeysRef.current.has(updateKey)) {
              notifyIfAllowed(
                `${selectedTeam}: Live-Update`,
                `${game.team_home} vs ${game.team_away} - ${normalizedResult}`,
                updateKey
              );
              notifiedKeysRef.current.add(updateKey);
            }
          }
          knownResultsRef.current[game.game_id] = normalizedResult;
        });
      } catch (err) {
        console.error('Error while checking live team updates:', err);
      }
    };

    checkTodayGames();
    const interval = window.setInterval(checkTodayGames, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    apiService,
    isSubscribedForTeam,
    notificationPermission,
    selectedLeague,
    selectedSeason,
    selectedTeam,
    sortedTeamGames,
  ]);

  const fetchGameDetails = async (gameId: string) => {
    if (!selectedSeason) return;
    if (gameDetails[gameId]) return;
    setDetailsLoading((prev) => ({ ...prev, [gameId]: true }));
    try {
      const data = await apiService.getSpielerInfo(selectedSeason, gameId, 1);
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

  const toggleSubscription = async () => {
    if (!selectedSeason || !selectedLeague || !selectedTeam) return;
    if (typeof window === 'undefined') return;

    let permission: NotificationPermission = notificationPermission;
    if ('Notification' in window && permission !== 'granted') {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    if (permission === 'denied') return;

    const key = `${selectedSeason}:${selectedLeague}:${selectedTeam}`;
    const raw = window.localStorage.getItem('kegel:teamSubscriptions');
    const subscriptions = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const nextValue = !Boolean(subscriptions[key]);
    subscriptions[key] = nextValue;
    window.localStorage.setItem('kegel:teamSubscriptions', JSON.stringify(subscriptions));
    setIsSubscribedForTeam(nextValue);
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
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-gradient-to-br from-red-500/10 via-background to-rose-500/5">
        <table className="min-w-full table-fixed text-sm bg-card/80">
          <thead className="bg-muted/70">
            <tr>
              <th className="py-2 px-3 text-right w-[16rem]">Spieler</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">1</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">2</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">3</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">4</th>
              <th className="py-2 px-2 text-center">Kegel</th>
              <th className="py-2 px-2 text-center">SP</th>
              <th className="py-2 px-2 text-center">MP</th>
              <th className="py-2 px-2 text-center w-10"></th>
              <th className="py-2 px-2 text-center">MP</th>
              <th className="py-2 px-2 text-center">SP</th>
              <th className="py-2 px-2 text-center">Kegel</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">4</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">3</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">2</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">1</th>
              <th className="py-2 px-3 text-left w-[16rem]">Spieler</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isNoteRow =
                row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
              if (isNoteRow) {
                return (
                  <tr key={`note-${idx}`}>
                    <td colSpan={17} className="py-2 px-3 text-sm text-muted-foreground">
                      {row[0] || ''}
                    </td>
                  </tr>
                );
              }

              const isTotals = row?.[0] === '' && row?.[15] === '' && row?.[5] && row?.[10];

              const nameLeft = row[0];
              const set1 = row[1];
              const set2 = row[2];
              const set3 = row[3];
              const set4 = row[4];
              const kegelLeft = row[5];
              const spLeft = row[6];
              const mpLeft = row[7];

              const mpRight = row[8];
              const spRight = row[9];
              const kegelRight = row[10];
              const set4Right = row[11];
              const set3Right = row[12];
              const set2Right = row[13];
              const set1Right = row[14];
              const nameRight = row[15];

              return (
                <tr key={`row-${idx}`} className="border-b border-border">
                  <td className="py-2 px-3 text-right truncate">{displayValue(nameLeft)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set1)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set2)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set3)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set4)}</td>
                  <td className="py-2 px-2 text-center">{displayValue(kegelLeft)}</td>
                  <td className="py-2 px-2 text-center">{displayValue(spLeft)}</td>
                  <td className="py-2 px-2 text-center">{displayValue(mpLeft)}</td>
                  <td className="py-2 px-2 text-center font-semibold text-primary">{isTotals ? diffLabel : ''}</td>
                  <td className="py-2 px-2 text-center">{displayValue(mpRight)}</td>
                  <td className="py-2 px-2 text-center">{displayValue(spRight)}</td>
                  <td className="py-2 px-2 text-center">{displayValue(kegelRight)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set4Right)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set3Right)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set2Right)}</td>
                  <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(set1Right)}</td>
                  <td className="py-2 px-3 text-left truncate">{displayValue(nameRight)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-red-500/15 via-background to-rose-500/10 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-foreground">Turniere</h1>
          <p className="text-muted-foreground">Spielplan nach Saison und Liga.</p>

          <div className="mt-4 flex flex-wrap gap-4 items-end rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col">
              <label htmlFor="seasonFilter" className="text-sm font-medium text-foreground mb-1">
                Saison
              </label>
              <select
                id="seasonFilter"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {seasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.yearof_season} (ID: {season.season_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="leagueFilter" className="text-sm font-medium text-foreground mb-1">
                Liga
              </label>
              <select
                id="leagueFilter"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {leagues.map((league) => (
                  <option key={league.liga_id} value={league.liga_id}>
                    {league.name_der_liga}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col min-w-[18rem]">
              <label htmlFor="teamFilter" className="text-sm font-medium text-foreground mb-1">
                Mannschaft
              </label>
              <select
                id="teamFilter"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Mannschaften</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTeam && (
            <div className="mt-4 rounded-xl border border-border bg-card/70 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Team: <span className="font-semibold text-foreground">{selectedTeam}</span>
                </div>
                <div className="rounded-md border border-border px-2 py-1 text-xs">
                  Gespielt: <span className="font-semibold">{playedGames.length}</span>
                </div>
                <div className="rounded-md border border-border px-2 py-1 text-xs">
                  Offen: <span className="font-semibold">{upcomingGames.length}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleSubscription}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  {isSubscribedForTeam ? 'Abo aktiv (Benachrichtigungen)' : 'Team abonnieren'}
                </button>
                {teamIcsDataUri && (
                  <a
                    href={teamIcsDataUri}
                    download={`spielplan-${selectedTeam.replace(/\s+/g, '-').toLowerCase()}.ics`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    ICS herunterladen
                  </a>
                )}
              </div>
              {notificationPermission === 'denied' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Browser-Benachrichtigungen sind blockiert. Bitte in den Browser-Einstellungen erlauben.
                </p>
              )}
            </div>
          )}
        </div>

        {loading && <LoadingSpinner label="Loading tournament schedule..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">{error}</div>
        )}

        {!loading && !error && filteredGames.length > 0 && (
          <div className="space-y-6">
            {Array.from(groupedSpieltage.keys()).map((spieltag) => {
              const rows = groupedSpieltage.get(spieltag) || [];
              return (
                <section key={spieltag} className="space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">{spieltag}</h2>
                  <div className="overflow-x-auto rounded-2xl border border-border bg-gradient-to-br from-red-500/10 via-background to-rose-500/5 shadow-sm">
                    <table className="min-w-full bg-card/80 rounded-2xl overflow-hidden border border-border">
                      <thead className="bg-muted/70">
                        <tr>
                          <th className="py-3 px-4 text-left text-foreground">Datum/Zeit</th>
                          <th className="py-3 px-4 text-left text-foreground">Heim</th>
                          <th className="py-3 px-4 text-left text-foreground">Gast</th>
                          <th className="py-3 px-4 text-left text-foreground">Ergebnis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((spiel, idx) => {
                          const isOpen = openGameId === spiel.game_id;
                          return (
                            <React.Fragment key={`${spiel.game_id}-${idx}`}>
                              <tr
                                className="border-b border-border hover:bg-accent/40 cursor-pointer"
                                onClick={() => toggleGame(spiel.game_id)}
                              >
                                <td className="py-3 px-4 whitespace-nowrap">{displayValue(spiel.date_time)}</td>
                                <td className="py-3 px-4 min-w-[10rem]">{displayValue(spiel.team_home)}</td>
                                <td className="py-3 px-4 min-w-[10rem]">{displayValue(spiel.team_away)}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{displayValue(spiel.result)}</td>
                              </tr>
                              {isOpen && (
                                <tr key={`${spiel.game_id}-details`}>
                                  <td colSpan={4} className="px-4 pb-4">
                                    {detailsLoading[spiel.game_id] && (
                                      <LoadingSpinner label="Loading game results..." className="py-6" size="sm" />
                                    )}
                                    {!detailsLoading[spiel.game_id] && (
                                      <>
                                        <div className="mt-3 flex justify-end">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadGameDetailsAsPng(
                                                spiel,
                                                gameDetails[spiel.game_id] || [],
                                                gameNotes[spiel.game_id] || ''
                                              );
                                            }}
                                            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                                          >
                                            Ergebnis als PNG exportieren
                                          </button>
                                        </div>
                                        {renderGameDetailsTable(gameDetails[spiel.game_id] || [])}
                                        {gameNotes[spiel.game_id] && gameNotes[spiel.game_id].trim() !== '' && (
                                          <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Hinweise:</span> {gameNotes[spiel.game_id]}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredGames.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No tournament games found</p>
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
