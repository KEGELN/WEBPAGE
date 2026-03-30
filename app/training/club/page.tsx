'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Menubar from '@/components/menubar';
import {
  Club,
  ClubAttendancePoll,
  ClubBundle,
  ClubChatMessage,
  ClubMember,
  db,
  GameDetailRow,
  GameResultLookup,
  GuestUser,
  Player,
  Trainer,
} from '@/lib/db';
import { ArrowLeft, CheckCircle2, Clock3, MessageSquare, Send, Share2, Users, UserPlus2, XCircle } from 'lucide-react';

type AuthContext =
  | { type: 'trainer'; id: string; name: string; trainer?: Trainer }
  | { type: 'player'; id: string; name: string; player?: Player }
  | { type: 'guest'; id: string; name: string; guest?: GuestUser }
  | null;

function getAuthContext(): AuthContext {
  if (typeof window === 'undefined') return null;

  const trainerRaw = localStorage.getItem('trainer_user');
  if (trainerRaw) {
    const trainer = JSON.parse(trainerRaw) as Trainer;
    return { type: 'trainer', id: trainer.email, name: trainer.name, trainer };
  }

  const playerRaw = localStorage.getItem('player_auth');
  if (playerRaw) {
    const player = JSON.parse(playerRaw) as Player;
    return { type: 'player', id: player.id, name: player.name, player };
  }

  const guestRaw = localStorage.getItem('guest_user');
  if (guestRaw) {
    const guest = JSON.parse(guestRaw) as GuestUser;
    return { type: 'guest', id: guest.id, name: guest.name, guest };
  }

  return null;
}

function getVoteCount(poll: ClubAttendancePoll, status: 'yes' | 'no' | 'maybe') {
  return poll.votes.filter((vote) => vote.status === status).length;
}

function extractGameIds(text: string) {
  return Array.from(new Set((text.match(/@([A-Za-z0-9_-]+)/g) ?? []).map((match) => match.slice(1))));
}

function getPollQuestion(game: GameResultLookup | null, fallbackGameId: string) {
  if (!game) return `Wer kommt zu Spiel ${fallbackGameId}?`;
  return `Wer kommt zu ${game.teamHome} vs ${game.teamAway} am ${game.dateTime || 'geplanten Termin'}?`;
}

function displayValue(value: string | number | null | undefined) {
  const text = String(value ?? '').trim();
  return text || '-';
}

function renderResultTable(rows: GameDetailRow[]) {
  if (!rows.length) return null;

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card/80">
      <table className="min-w-full table-fixed text-xs">
        <thead className="bg-muted/70">
          <tr>
            <th className="py-2 px-3 text-right w-[12rem]">Spieler</th>
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
            <th className="py-2 px-3 text-left w-[12rem]">Spieler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isNoteRow = row.length > 16 || (row?.[0] && row.slice(1).every((v) => v === '' || v === undefined));
            if (isNoteRow) {
              return (
                <tr key={`note-${idx}`}>
                  <td colSpan={17} className="py-2 px-3 text-xs text-muted-foreground">
                    {row[0] || ''}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={`row-${idx}`} className="border-t border-border">
                <td className="py-2 px-3 text-right truncate">{displayValue(row[0])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[1])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[2])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[3])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[4])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[5])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[6])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[7])}</td>
                <td className="py-2 px-2 text-center font-semibold text-primary">{displayValue(row[8])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[9])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[10])}</td>
                <td className="py-2 px-2 text-center">{displayValue(row[11])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[12])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[13])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[14])}</td>
                <td className="py-2 px-2 text-center hidden sm:table-cell">{displayValue(row[15])}</td>
                <td className="py-2 px-3 text-left truncate">{displayValue(row[16])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ClubRoomPage({ chatOnly = false }: { chatOnly?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? '';
  const initialPollId = searchParams.get('poll') ?? '';
  const [auth] = useState<AuthContext>(() => getAuthContext());
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubBundle, setClubBundle] = useState<ClubBundle | null>(null);
  const [joinableClub, setJoinableClub] = useState<Club | null>(null);
  const [message, setMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sendError, setSendError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [gameResults, setGameResults] = useState<Record<string, GameResultLookup | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      if (!inviteToken) {
        router.push('/login');
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      const [memberClubs, inviteClubs] = await Promise.all([
        db.getClubs({ memberType: auth.type, memberId: auth.id }),
        inviteToken ? db.getClubs({ inviteToken }) : Promise.resolve([]),
      ]);

      setClubs(memberClubs);
      setJoinableClub(inviteClubs[0] ?? null);
      const nextSelectedClubId = memberClubs[0]?.id ?? inviteClubs[0]?.id ?? '';
      setSelectedClubId((current) => current || nextSelectedClubId);
      setLoading(false);
    };

    load();
  }, [auth, inviteToken, router]);

  useEffect(() => {
    if (!selectedClubId) return;

    db.getClubBundle(selectedClubId).then((bundle) => {
      setClubBundle(bundle);
    });
  }, [selectedClubId]);

  useEffect(() => {
    if (!clubBundle?.polls?.length) return;

    const missingGameIds = clubBundle.polls
      .map((poll) => poll.gameId)
      .filter((gameId) => gameId && !(gameId in gameResults));

    if (missingGameIds.length === 0) return;

    Promise.all(
      missingGameIds.map(async (gameId) => ({
        gameId,
        result: await db.getGameResult(gameId),
      }))
    ).then((entries) => {
      setGameResults((current) => {
        const next = { ...current };
        entries.forEach((entry) => {
          next[entry.gameId] = entry.result;
        });
        return next;
      });
    });
  }, [clubBundle, gameResults]);

  const memberClubIds = useMemo(() => new Set(clubs.map((club) => club.id)), [clubs]);

  const createGuest = async () => {
    if (!guestName.trim()) return;

    const guest: GuestUser = {
      id: `G-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name: guestName.trim(),
      tempCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      role: 'guest',
    };
    localStorage.setItem('guest_user', JSON.stringify(guest));
    window.location.reload();
  };

  const joinClub = async () => {
    if (!auth || !joinableClub || memberClubIds.has(joinableClub.id)) return;

    try {
      const joined = await db.joinClub({
        inviteToken: joinableClub.inviteToken,
        memberType: auth.type,
        memberId: auth.id,
        displayName: auth.name,
      });

      if (!joined) return;

      const nextClubs = await db.getClubs({ memberType: auth.type, memberId: auth.id });
      setClubs(nextClubs);
      setSelectedClubId(joined.id);
      setJoinError('');
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Beitritt fehlgeschlagen.');
    }
  };

  const sendMessage = async () => {
    if (!auth || !selectedClubId || !message.trim()) return;

    const referencedGameIds = extractGameIds(message);
    if (referencedGameIds.length > 0) {
      const results = await Promise.all(referencedGameIds.map((gameId) => db.getGameResult(gameId)));
      const missingGameId = results.findIndex((result) => !result);
      if (missingGameId >= 0) {
        setSendError(`Spiel ${referencedGameIds[missingGameId]} wurde in der API nicht gefunden. Nachricht wurde nicht gesendet.`);
        return;
      }

      setGameResults((current) => {
        const next = { ...current };
        results.forEach((result) => {
          if (result) next[result.gameId] = result;
        });
        return next;
      });
    }

    await db.sendClubMessage({
      clubId: selectedClubId,
      authorType: auth.type,
      authorId: auth.id,
      authorName: auth.name,
      text: message.trim(),
    });
    setMessage('');
    setSendError('');
    const nextBundle = await db.getClubBundle(selectedClubId);
    setClubBundle(nextBundle);
  };

  const vote = async (pollId: string, status: 'yes' | 'no' | 'maybe') => {
    if (!auth || !selectedClubId) return;

    await db.voteClubPoll({
      pollId,
      memberType: auth.type,
      memberId: auth.id,
      displayName: auth.name,
      status,
    });
    const nextBundle = await db.getClubBundle(selectedClubId);
    setClubBundle(nextBundle);
  };

  const sharePollToWhatsApp = (poll: ClubAttendancePoll) => {
    const invite = clubBundle?.club?.inviteToken || joinableClub?.inviteToken || inviteToken;
    const url = `${window.location.origin}/training/club?invite=${invite}&poll=${poll.id}`;
    const text = `Zusage fuer Spiel ${poll.gameId}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (!auth && inviteToken) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Menubar />
        <main className="container mx-auto px-4 py-10">
          <section className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Club-Einladung</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Kein Login gefunden. Lege einen temporären Gastzugang an, um an Chat und Umfragen teilzunehmen.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Dein Name"
                className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={createGuest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <UserPlus2 size={16} />
                Temp-Account erzeugen
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!auth) return null;

  const members: ClubMember[] = clubBundle?.members ?? [];
  const messages: ClubChatMessage[] = clubBundle?.messages ?? [];
  const polls: ClubAttendancePoll[] = clubBundle?.polls ?? [];
  const activePolls = polls.filter((poll) => !gameResults[poll.gameId]?.isCompleted);
  const finishedPolls = polls.filter((poll) => gameResults[poll.gameId]?.isCompleted);
  const pollsByMessageId = new Map(polls.map((poll) => [poll.sourceMessageId, poll]));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:py-10">
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push(auth.type === 'trainer' ? '/trainer/dashboard' : auth.type === 'guest' ? '/login' : '/training')}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} />
              {chatOnly ? 'Zurück zur Übersicht' : 'Zurück'}
            </button>
            <h1 className="mt-2 text-2xl font-bold">{chatOnly ? 'Club-Chat' : 'Club-Raum'}</h1>
            <p className="text-sm text-muted-foreground">
              Login erforderlich. Mit `@GAME_ID` in einer Nachricht wird automatisch eine Zusage-Umfrage erstellt.
            </p>
          </div>
          {clubs.length > 0 && (
            <select
              value={selectedClubId}
              onChange={(event) => setSelectedClubId(event.target.value)}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {joinableClub && !memberClubIds.has(joinableClub.id) && (
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Einladung gefunden: {joinableClub.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {auth.type === 'guest'
                    ? `Gastcode: ${auth.guest?.tempCode}. Du kannst diesem Club direkt beitreten.`
                    : 'Du bist eingeloggt und kannst diesem Club direkt beitreten.'}
                </p>
                {joinError && (
                  <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {joinError}
                  </div>
                )}
              </div>
              <button
                onClick={joinClub}
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Club beitreten
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
            Clubdaten werden geladen...
          </div>
        ) : clubs.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
            Kein Club verfügbar. Ein Trainer muss zuerst einen Club anlegen und den Einladungslink teilen.
          </div>
        ) : (
          <>
            {!chatOnly && <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3 overflow-x-auto">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm font-semibold whitespace-nowrap">
                  <Users size={16} className="text-primary" />
                  Mitglieder {members.length}
                </div>
                {members.map((member) => (
                  <div
                    key={`${member.memberType}-${member.memberId}`}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm whitespace-nowrap"
                  >
                    <span className="font-semibold">{member.displayName}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{member.memberType}</span>
                  </div>
                ))}
              </div>
            </section>}

            <div className={chatOnly ? '' : 'grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'}>
            {!chatOnly && <div className="space-y-6">
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-bold">Spiel-Umfragen</h2>
                <div className="mt-4 space-y-4">
                  {activePolls.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Noch keine Umfrage. Schreibe im Chat zum Beispiel `@123456`.
                    </div>
                  ) : (
                    activePolls.map((poll) => (
                      <div key={poll.id} id={poll.id} className={`rounded-2xl border border-border bg-muted/20 p-4 ${initialPollId === poll.id ? 'ring-2 ring-primary/40' : ''}`}>
                        <div className="text-sm font-semibold">Spiel {poll.gameId}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Zusagen: {getVoteCount(poll, 'yes')} · Vielleicht: {getVoteCount(poll, 'maybe')} · Absagen: {getVoteCount(poll, 'no')}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => vote(poll.id, 'yes')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                          >
                            <CheckCircle2 size={14} />
                            Komme
                          </button>
                          <button
                            onClick={() => vote(poll.id, 'maybe')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                          >
                            <Clock3 size={14} />
                            Vielleicht
                          </button>
                          <button
                            onClick={() => vote(poll.id, 'no')}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                          >
                            <XCircle size={14} />
                            Nein
                          </button>
                          <button
                            onClick={() => sharePollToWhatsApp(poll)}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                          >
                            <Share2 size={14} />
                            WhatsApp
                          </button>
                        </div>
                        {poll.votes.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {poll.votes.map((voteItem) => (
                              <div key={`${voteItem.memberType}-${voteItem.memberId}`} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
                                <span>{voteItem.displayName}</span>
                                <span className="font-semibold uppercase text-muted-foreground">{voteItem.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-bold">Ergebnis-Tabelle</h2>
                <div className="mt-4 overflow-x-auto">
                  {finishedPolls.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Abgeschlossene Spiele mit Ergebnis erscheinen hier automatisch.
                    </div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/70">
                        <tr>
                          <th className="px-3 py-2 text-left">Game ID</th>
                          <th className="px-3 py-2 text-left">Spieltag</th>
                          <th className="px-3 py-2 text-left">Paarung</th>
                          <th className="px-3 py-2 text-left">Ergebnis</th>
                          <th className="px-3 py-2 text-left">Liga</th>
                          <th className="px-3 py-2 text-left">Zusagen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finishedPolls.map((poll) => {
                          const result = gameResults[poll.gameId];
                          return (
                            <tr key={`result-${poll.id}`} className="border-t border-border">
                              <td className="px-3 py-2 font-mono text-xs">{poll.gameId}</td>
                              <td className="px-3 py-2">{result?.spieltag || '-'}</td>
                              <td className="px-3 py-2">{result ? `${result.teamHome} vs ${result.teamAway}` : '-'}</td>
                              <td className="px-3 py-2 font-semibold">{result?.result || '-'}</td>
                              <td className="px-3 py-2">{result?.leagueName || '-'}</td>
                              <td className="px-3 py-2">{getVoteCount(poll, 'yes')} / {poll.votes.length}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>}

            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MessageSquare size={20} className="text-primary" />
                Club-Chat
              </h2>
              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border p-8 text-sm text-muted-foreground">
                    Noch keine Nachrichten.
                  </div>
                ) : (
                  messages.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{entry.authorName}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6">{entry.text}</p>
                      {pollsByMessageId.has(entry.id) && (
                        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          {(() => {
                            const poll = pollsByMessageId.get(entry.id)!;
                            const result = gameResults[poll.gameId] ?? null;
                            const isCompleted = Boolean(result?.isCompleted);
                            return (
                              <>
                                <div className="text-sm font-semibold">
                                  {getPollQuestion(result, poll.gameId)}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Spiel-ID {poll.gameId} · Zusagen: {getVoteCount(poll, 'yes')} · Vielleicht: {getVoteCount(poll, 'maybe')} · Absagen: {getVoteCount(poll, 'no')}
                                </div>
                                {isCompleted ? (
                                  <>
                                    <div className="mt-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                                      <span className="font-semibold">Ergebnis:</span> {result?.result || '-'}
                                      {result?.leagueName ? <span className="ml-2 text-muted-foreground">• {result.leagueName}</span> : null}
                                    </div>
                                    {renderResultTable(result?.detailRows || [])}
                                  </>
                                ) : (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => vote(poll.id, 'yes')}
                                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                    >
                                      <CheckCircle2 size={14} />
                                      Komme
                                    </button>
                                    <button
                                      onClick={() => vote(poll.id, 'maybe')}
                                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                    >
                                      <Clock3 size={14} />
                                      Vielleicht
                                    </button>
                                    <button
                                      onClick={() => vote(poll.id, 'no')}
                                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                    >
                                      <XCircle size={14} />
                                      Nein
                                    </button>
                                    <button
                                      onClick={() => sharePollToWhatsApp(poll)}
                                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                                    >
                                      <Share2 size={14} />
                                      WhatsApp
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 space-y-3">
                <textarea
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setSendError('');
                  }}
                  rows={4}
                  placeholder="Nachricht schreiben. Mit @GAME_ID erstellst du automatisch eine Zusage-Umfrage."
                  className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {sendError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {sendError}
                  </div>
                )}
                <button
                  onClick={sendMessage}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Send size={16} />
                  Senden
                </button>
              </div>
            </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ClubRoomRoutePage() {
  return <ClubRoomPage />;
}
