'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { History, LogOut, Play, Trophy, BarChart3, FileDown, ArrowRight, TrendingUp, FileText, MessageSquare, Users } from 'lucide-react';
import { Club, Trainer, TrainerMessage, db, Player, TrainingSession } from '@/lib/db';

type DetailedThrowRow = {
  sessionId: string;
  sessionTimestamp: string;
  mode: 'standard' | 'game_120';
  lane: number;
  throwNumber: number;
  holz: number;
  pins: number[];
};

const exportPinLayout = [
  { id: 9, x: 40, y: 8 },
  { id: 7, x: 26, y: 22 },
  { id: 8, x: 54, y: 22 },
  { id: 4, x: 12, y: 36 },
  { id: 5, x: 40, y: 36 },
  { id: 6, x: 68, y: 36 },
  { id: 2, x: 26, y: 50 },
  { id: 3, x: 54, y: 50 },
  { id: 1, x: 40, y: 64 },
] as const;

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function flattenSessionThrows(session: TrainingSession): DetailedThrowRow[] {
  if (session.type === 'game_120' && session.lanes) {
    return Object.entries(session.lanes).flatMap(([lane, throws]) =>
      throws.map((throwItem, index) => ({
        sessionId: session.id,
        sessionTimestamp: session.timestamp,
        mode: session.type,
        lane: Number(lane),
        throwNumber: index + 1,
        holz: throwItem.pins.length,
        pins: throwItem.pins,
      }))
    );
  }

  return session.throws.map((throwItem, index) => ({
    sessionId: session.id,
    sessionTimestamp: session.timestamp,
    mode: session.type,
    lane: 1,
    throwNumber: index + 1,
    holz: throwItem.pins.length,
    pins: throwItem.pins,
  }));
}

function renderThrowSvg(pins: number[]) {
  const cells = exportPinLayout.map((pin) => {
    const active = pins.includes(pin.id);
    return `<circle cx="${pin.x}" cy="${pin.y}" r="8" fill="${active ? '#d9485f' : '#ffffff'}" stroke="#5f1d2a" stroke-width="1.5" />
      <text x="${pin.x}" y="${pin.y + 3}" text-anchor="middle" font-size="8" font-family="Arial" fill="${active ? '#ffffff' : '#5f1d2a'}">${pin.id}</text>`;
  }).join('');

  return `
    <svg width="80" height="72" viewBox="0 0 80 72" xmlns="http://www.w3.org/2000/svg">
      <polygon points="40,2 78,36 40,70 2,36" fill="#fff7f8" stroke="#d9485f" stroke-width="1.5" />
      ${cells}
    </svg>
  `;
}

function getTrainingPlayer(): Player | null {
  if (typeof window === 'undefined') return null;

  const playerAuth = localStorage.getItem('player_auth');
  if (playerAuth) {
    return JSON.parse(playerAuth) as Player;
  }

  const trainerAuth = localStorage.getItem('trainer_user');
  if (!trainerAuth) {
    return null;
  }

  const trainer = JSON.parse(trainerAuth) as Trainer;
  const trainerId = `T-${trainer.email.replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase()}`;

  return {
    id: trainerId,
    name: trainer.name,
    trainerEmail: trainer.email,
    createdAt: new Date(0).toISOString(),
    username: trainer.email,
    tempPassword: '',
    passwordResetRequired: false,
  };
}

export default function TrainingHomePage() {
  const router = useRouter();
  const [player] = useState<Player | null>(() => {
    return getTrainingPlayer();
  });
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [messages, setMessages] = useState<TrainerMessage[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!player) {
      router.push('/login');
      return;
    }

    Promise.all([
      db.getSessions({ playerId: player.id }),
      db.getTrainerMessages({ playerId: player.id }),
      db.getClubs({ memberType: 'player', memberId: player.id }),
    ]).then(([nextSessions, nextMessages, nextClubs]) => {
      setSessions(nextSessions);
      setMessages(nextMessages);
      setClubs(nextClubs);
    });
  }, [player, router]);

  const handleLogout = () => {
    localStorage.removeItem('player_auth');
    localStorage.removeItem('trainer_user');
    router.push('/login');
  };

  const getSessionTotal = (s: TrainingSession) => {
    if (s.type === 'game_120' && s.lanes) {
      return Object.values(s.lanes).reduce((acc, lane) => 
        acc + lane.reduce((lacc, t) => lacc + (t.pins?.length || 0), 0), 0);
    }
    return s.throws?.reduce((acc, t) => acc + (t.pins?.length || 0), 0) || 0;
  };

  const exportToCSV = () => {
    if (sessions.length === 0) return;
    let csv = 'Session-ID;Datum;Modus;Bahn;Wurf;Holz;Pins\n';
    sessions.flatMap(flattenSessionThrows).forEach((row) => {
      csv += `${row.sessionId};${new Date(row.sessionTimestamp).toLocaleString()};${row.mode};${row.lane};${row.throwNumber};${row.holz};${row.pins.join(',')}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kegel_training_${player?.name || 'player'}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!player) return;

    const sessionSections = sessions.map((session) => {
      const rows = flattenSessionThrows(session)
        .map((row) => `
          <tr>
            <td>${row.lane}</td>
            <td>${row.throwNumber}</td>
            <td>${row.holz}</td>
            <td>${renderThrowSvg(row.pins)}</td>
          </tr>
        `)
        .join('');

      return `
        <section class="receipt">
          <div class="receipt-header">
            <div>
              <h2>${session.type === 'game_120' ? 'Wettkampf 120' : 'Standard 30'}</h2>
              <div class="meta">${new Date(session.timestamp).toLocaleString()}</div>
            </div>
            <div class="total-box">
              <div class="label">Gesamt</div>
              <div class="value">${getSessionTotal(session)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Bahn</th>
                <th>Wurf</th>
                <th>Holz</th>
                <th>Bild</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="4">Keine Würfe vorhanden.</td></tr>'}</tbody>
          </table>
        </section>
      `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Trainingsbericht ${escapeHtml(player.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { color: #4b5563; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
            .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; }
            .label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
            .value { font-size: 28px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
            th { background: #f3f4f6; }
            .receipt { border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; margin-top: 20px; page-break-inside: avoid; }
            .receipt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
            .total-box { border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 16px; min-width: 100px; text-align: center; }
            td svg { display: block; }
          </style>
        </head>
        <body>
          <h1>Trainingsbericht</h1>
          <p>${escapeHtml(player.name)} (${escapeHtml(player.id)})</p>
          <div class="stats">
            <div class="card">
              <div class="label">Sitzungen</div>
              <div class="value">${sessions.length}</div>
            </div>
            <div class="card">
              <div class="label">Bestwert</div>
              <div class="value">${sessions.length > 0 ? Math.max(...sessions.map((s) => getSessionTotal(s))) : 0}</div>
            </div>
            <div class="card">
              <div class="label">Letzte Einheit</div>
              <div class="value" style="font-size:16px;">${sessions[0] ? new Date(sessions[0].timestamp).toLocaleDateString() : '-'}</div>
            </div>
          </div>
          ${sessionSections || '<p>Keine Sitzungen vorhanden.</p>'}
        </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (!player) return null;

  const graphSessions = sessions.slice(0, 10).reverse();
  const graphTotals = graphSessions.map((s) => getSessionTotal(s));
  const maxTotal = Math.max(...graphTotals, 1);
  const points = graphTotals.map((value, index) => {
    const x = graphTotals.length === 1 ? 180 : (index / Math.max(graphTotals.length - 1, 1)) * 360;
    const y = 140 - (value / maxTotal) * 110;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-6 sm:py-10 space-y-8">
        {/* Welcome Header */}
        <section className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/20">
              {player.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gut Holz, {player.name.split(',')[0]}!</h1>
              <p className="text-muted-foreground text-sm mt-1">Willkommen in deinem Trainings-Center.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="p-3 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" title="CSV Export">
              <FileDown size={20} />
            </button>
            <button onClick={exportToPDF} className="p-3 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" title="PDF Export">
              <FileText size={20} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </section>

        {/* Quick Stats & Graph */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Leistungskurve
              </h2>
              <span className="text-xs text-muted-foreground">Letzte 10 Einheiten</span>
            </div>
            <div className="h-40">
              {graphTotals.length > 0 ? (
                <svg viewBox="0 0 360 150" className="h-full w-full overflow-visible">
                  <defs>
                    <linearGradient id="trainingLine" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="var(--color-chart-2)" />
                      <stop offset="100%" stopColor="var(--color-chart-1)" />
                    </linearGradient>
                  </defs>
                  {[25, 55, 85, 115, 145].map((y) => (
                    <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="color-mix(in oklab, var(--color-border) 80%, transparent)" strokeWidth="1" />
                  ))}
                  <polyline
                    fill="none"
                    stroke="url(#trainingLine)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                  />
                  {graphTotals.map((value, index) => {
                    const x = graphTotals.length === 1 ? 180 : (index / Math.max(graphTotals.length - 1, 1)) * 360;
                    const y = 140 - (value / maxTotal) * 110;

                    return (
                      <g key={`${value}-${index}`}>
                        <circle cx={x} cy={y} r="6" fill="var(--color-card)" stroke="var(--color-chart-1)" strokeWidth="3" />
                        <text x={x} y={148} textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">
                          S{graphSessions.length - index}
                        </text>
                        <title>{`${value} Holz`}</title>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Noch nicht genug Daten für eine Kurve.
                </div>
              )}
            </div>
          </div>

          <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-xl shadow-primary/20 flex flex-col justify-between">
            <div>
              <div className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">Bestwert</div>
              <div className="text-5xl font-black mb-2">{sessions.length > 0 ? Math.max(...sessions.map(s => getSessionTotal(s))) : 0}</div>
              <div className="text-sm font-medium opacity-80">Gesamtholz in einer Sitzung</div>
            </div>
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between">
              <div className="text-xs">Sitzungen: {sessions.length}</div>
              <BarChart3 size={24} className="opacity-50" />
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold px-1">Training starten</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <button 
              onClick={() => router.push('/training/session?mode=standard')}
              className="group bg-card hover:border-primary transition-all p-8 rounded-3xl border border-border shadow-sm text-left flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Play size={24} fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold">Standard Modus</h3>
                <p className="text-muted-foreground text-sm max-w-[200px]">30 Würfe (15 Vollen, 15 Abräumen) auf einer Bahn.</p>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </button>

            <button 
              onClick={() => router.push('/training/session?mode=game_120')}
              className="group bg-card hover:border-primary transition-all p-8 rounded-3xl border border-border shadow-sm text-left flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Trophy size={24} />
                </div>
                <h3 className="text-xl font-bold">Wettkampf (120)</h3>
                <p className="text-muted-foreground text-sm max-w-[200px]">Der Klassiker: 4 Bahnen à 30 Würfe. Volle Konzentration.</p>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare size={20} className="text-primary" />
                Nachrichten vom Trainer
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {messages.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-6 text-sm text-muted-foreground">
                  Noch keine Nachrichten vorhanden.
                </div>
              ) : (
                messages.slice(0, 5).map((message) => (
                  <div key={message.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{message.trainerEmail}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6">{message.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Club-Bereich
              </h2>
              <button
                onClick={() => router.push('/training/club')}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Öffnen
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {clubs.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-6 text-sm text-muted-foreground">
                  Du bist noch in keinem Club. Öffne den Club-Bereich mit einem Einladungslink eines Trainers.
                </div>
              ) : (
                clubs.map((club) => (
                  <div key={club.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-sm font-semibold">{club.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Einladungscode: {club.inviteToken}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Detailed History */}
        <section className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History size={20} className="text-primary" />
              Sitzungsverlauf
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">Datum</th>
                  <th className="px-6 py-4">Modus</th>
                  <th className="px-6 py-4 text-center">Holz</th>
                  <th className="px-6 py-4 text-center">Schnitt</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Noch keine Trainingseinheiten absolviert.
                    </td>
                  </tr>
                ) : sessions.map((s) => {
                  const total = getSessionTotal(s);
                  const count = s.type === 'game_120' ? 120 : (s.throws?.length || 0);
                  const avg = count > 0 ? (total / count).toFixed(2) : '0.00';
                  const isExpanded = expandedSessionId === s.id;
                  const detailRows = flattenSessionThrows(s);
                  
                  return (
                    <Fragment key={s.id}>
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{new Date(s.timestamp).toLocaleDateString()}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.type === 'game_120' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {s.type === 'game_120' ? '120 Würfe' : '30 Würfe'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-lg">{total}</td>
                        <td className="px-6 py-4 text-center text-sm font-mono">{avg}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedSessionId((current) => current === s.id ? null : s.id)}
                            className="text-primary hover:underline text-xs font-semibold"
                          >
                            {isExpanded ? 'Schließen' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-muted/20 px-6 py-5">
                            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-xs uppercase font-bold text-muted-foreground">
                                  <tr>
                                    <th className="px-4 py-3">Bahn</th>
                                    <th className="px-4 py-3">Wurf</th>
                                    <th className="px-4 py-3">Holz</th>
                                    <th className="px-4 py-3">Pins</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {detailRows.map((row) => (
                                    <tr key={`${row.sessionId}-${row.lane}-${row.throwNumber}`}>
                                      <td className="px-4 py-3 font-medium">{row.lane}</td>
                                      <td className="px-4 py-3">{row.throwNumber}</td>
                                      <td className="px-4 py-3 font-semibold">{row.holz}</td>
                                      <td className="px-4 py-3">
                                        {row.pins.length > 0 ? row.pins.join(', ') : 'Fehlwurf'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
