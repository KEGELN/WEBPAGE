'use client';

import React, { useEffect, useState } from 'react';
import Menubar from '@/components/menubar';
import ApiService from '@/lib/api-service';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TournamentsPage() {
  const apiService = ApiService.getInstance();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spiele, setSpiele] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [gameDetails, setGameDetails] = useState<Record<string, any[]>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [spieltagMap, setSpieltagMap] = useState<Record<string, string>>({});
  const [gameNotes, setGameNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const seasonData = await apiService.getCurrentSeason();
        setSeasons(seasonData);

        const leagueData = await apiService.getLeagues();
        setLeagues(leagueData);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

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
        setSpiele(planData);
        const map: Record<string, string> = {};
        spieltagData.forEach((entry: any) => {
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
  }, [selectedSeason, selectedLeague]);

  useEffect(() => {
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0].season_id);
    }
  }, [seasons]);

  useEffect(() => {
    if (!selectedLeague && leagues.length > 0) {
      setSelectedLeague(leagues[0].liga_id);
    }
  }, [leagues]);

  const displayValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    return value;
  };

  const fetchGameDetails = async (gameId: string) => {
    if (!selectedSeason) return;
    if (gameDetails[gameId]) return;
    setDetailsLoading(prev => ({ ...prev, [gameId]: true }));
    try {
      const data = await apiService.getSpielerInfo(selectedSeason, gameId, 1);
      setGameDetails(prev => ({ ...prev, [gameId]: data }));
    } catch (err) {
      console.error('Error fetching game details:', err);
    } finally {
      setDetailsLoading(prev => ({ ...prev, [gameId]: false }));
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
      games.forEach((row: any[]) => {
        const id = String(row[0] ?? '');
        const note = String(row[10] ?? '');
        if (id) notesMap[id] = note;
      });
      setGameNotes(prev => ({ ...prev, ...notesMap }));
    } catch (err) {
      console.error('Error fetching game notes:', err);
    }
  };

  const toggleGame = async (gameId: string) => {
    const next = openGameId === gameId ? null : gameId;
    setOpenGameId(next);
    if (next) {
      await fetchGameDetails(gameId);
      await fetchGameNotes(gameId);
    }
  };

  const renderGameDetailsTable = (rows: any[]) => {
    if (!rows || rows.length === 0) return null;

    const totalRow = rows.find((r) => r?.[0] === '' && r?.[15] === '' && r?.[5] && r?.[10]);
    const leftTotal = totalRow ? Number(totalRow[5]) : null;
    const rightTotal = totalRow ? Number(totalRow[10]) : null;
    const diff = leftTotal !== null && rightTotal !== null && !Number.isNaN(leftTotal) && !Number.isNaN(rightTotal)
      ? leftTotal - rightTotal
      : null;
    const diffLabel =
      diff === null
        ? ''
        : diff > 0
        ? `+${diff}-`
        : diff < 0
        ? `${diff}+`
        : '0';

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
              const isNoteRow = row.length > 16 || (row?.[0] && row.slice(1).every((v: any) => v === '' || v === undefined));
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

              // Right side mapping based on observed API shape (length 16)
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
                  <td className="py-2 px-2 text-center font-semibold text-primary">
                    {isTotals ? diffLabel : ''}
                  </td>
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
                onChange={(e) => setSelectedSeason(e.target.value)}
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

          </div>
        </div>

        {loading && <LoadingSpinner label="Loading tournament schedule..." />}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && spiele.length > 0 && (
          <div className="space-y-6">
            {Array.from(
              new Map(
                spiele.map((spiel) => [spiel.spieltag, [] as any[]])
              ).keys()
            ).map((spieltag) => {
              const rows = spiele.filter((spiel) => spiel.spieltag === spieltag);
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
                        )})}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && !error && spiele.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No tournament games found</p>
          </div>
        )}
      </main>
    </div>
  );
}
