'use client';

import { useEffect, useState, useMemo } from 'react';
import Menubar from '@/components/menubar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Trophy, BarChart3, Search, ArrowRight, X, TrendingUp, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlayerStats {
  found: boolean;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  averageScore: string | number;
  clubs?: string[];
}

export default function CompareClient() {
  const [player1Id, setPlayer1Id] = useState<string | null>(null);
  const [player2Id, setPlayer2Id] = useState<string | null>(null);
  const [player1Data, setPlayer1Data] = useState<PlayerStats | null>(null);
  const [player2Data, setPlayer2Data] = useState<PlayerStats | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectingFor, setSelectingFor] = useState<1 | 2 | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{ p1: number, p2: number } | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    if (player1Id) {
      setLoading1(true);
      fetch(`/api/mirror/player?id=${encodeURIComponent(player1Id)}`)
        .then(res => res.json())
        .then(data => setPlayer1Data(data))
        .finally(() => setLoading1(false));
    }
  }, [player1Id]);

  useEffect(() => {
    if (player2Id) {
      setLoading2(true);
      fetch(`/api/mirror/player?id=${encodeURIComponent(player2Id)}`)
        .then(res => res.json())
        .then(data => setPlayer2Data(data))
        .finally(() => setLoading2(false));
    }
  }, [player2Id]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/mirror/search?q=${encodeURIComponent(trimmed)}`);
        const payload = await res.json();
        setSearchResults(payload.players || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const predictWinChance = async () => {
    if (!player1Data?.playerName || !player2Data?.playerName) return;
    
    setPredictionLoading(true);
    setPredictionError(null);
    try {
      const p1 = player1Data.playerName;
      const p2 = player2Data.playerName;
      const res = await fetch(`/api/predict?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`);
      const data = await res.json();
      
      if (data.error) {
        setPredictionError(data.error);
      } else {
        setPredictionResult({
          p1: data.prediction * 100,
          p2: (1 - data.prediction) * 100
        });
      }
    } catch (err) {
      setPredictionError("Server konnte Vorhersage nicht berechnen.");
    } finally {
      setPredictionLoading(false);
    }
  };

  const StatRow = ({ label, val1, val2, higherIsBetter = true }: { label: string, val1: any, val2: any, higherIsBetter?: boolean }) => {
    const num1 = parseFloat(String(val1).replace(',', '.'));
    const num2 = parseFloat(String(val2).replace(',', '.'));
    
    let color1 = "text-foreground";
    let color2 = "text-foreground";
    
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 > num2) {
        color1 = higherIsBetter ? "text-emerald-500 font-black" : "text-rose-500";
        color2 = higherIsBetter ? "text-rose-500" : "text-emerald-500 font-black";
      } else if (num2 > num1) {
        color2 = higherIsBetter ? "text-emerald-500 font-black" : "text-rose-500";
        color1 = higherIsBetter ? "text-rose-500" : "text-emerald-500 font-black";
      }
    }

    return (
      <div className="py-6 border-b border-border/50 group">
        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] text-center mb-4 group-hover:text-primary transition-colors">{label}</div>
        <div className="grid grid-cols-2 gap-8 items-center">
          <div className={`text-3xl md:text-5xl font-black tracking-tighter text-right tabular-nums ${color1}`}>
            {val1 ?? '-'}
          </div>
          <div className={`text-3xl md:text-5xl font-black tracking-tighter text-left tabular-nums ${color2}`}>
            {val2 ?? '-'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 py-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">
            Comparison Tool
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">Spielervergleich.</h1>
          <p className="text-muted-foreground font-medium max-w-xl mx-auto">
            Vergleiche zwei Spieler direkt miteinander und analysiere deren historische Leistungswerte.
          </p>
        </div>

        {/* Selection Area */}
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl transition-all hover:shadow-2xl relative">
            {player1Data ? (
              <div className="p-8">
                <button 
                  onClick={() => { setPlayer1Id(null); setPlayer1Data(null); }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary">
                    <User size={48} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">{player1Data.playerName}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase mt-1">{player1Data.clubs?.[0] || 'Kein Verein'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center min-h-[300px] gap-6">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-border flex items-center justify-center text-muted-foreground opacity-30">
                  <User size={32} />
                </div>
                <Button onClick={() => setSelectingFor(1)} className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest shadow-xl">
                  Spieler 1 Wählen
                </Button>
              </div>
            )}
          </Card>

          <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden shadow-xl transition-all hover:shadow-2xl relative">
             {player2Data ? (
              <div className="p-8">
                <button 
                  onClick={() => { setPlayer2Id(null); setPlayer2Data(null); }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <User size={48} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">{player2Data.playerName}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase mt-1">{player2Data.clubs?.[0] || 'Kein Verein'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center min-h-[300px] gap-6">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-border flex items-center justify-center text-muted-foreground opacity-30">
                  <User size={32} />
                </div>
                <Button onClick={() => setSelectingFor(2)} variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest border-2">
                  Spieler 2 Wählen
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Search Modal */}
        {selectingFor !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <Card className="w-full max-w-xl rounded-[2.5rem] shadow-2xl border-primary/20 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <CardTitle className="text-2xl font-black tracking-tight uppercase">Spieler {selectingFor} suchen</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectingFor(null); setSearchQuery(''); }} className="rounded-full">
                    <X size={20} />
                  </Button>
                </div>
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name eingeben..."
                    className="w-full h-16 pl-14 pr-6 rounded-2xl border-2 border-border/50 bg-muted/30 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                {searchLoading ? (
                  <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          const idToSet = r.id || Buffer.from(r.name).toString('base64url');
                          if (selectingFor === 1) setPlayer1Id(idToSet);
                          else setPlayer2Id(idToSet);
                          setSelectingFor(null);
                          setSearchQuery('');
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-primary/5 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                            <User size={20} />
                          </div>
                          <div className="text-left">
                            <div className="font-black text-sm uppercase group-hover:text-primary transition-colors">{r.name}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground">{r.club}</div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="py-12 text-center text-muted-foreground font-bold italic uppercase tracking-widest text-xs">Keine Ergebnisse</div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] opacity-40">Tippe mindestens 2 Buchstaben</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Table */}
        {(player1Data || player2Data) && (
          <Card className="rounded-[3rem] border-border/50 bg-card p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 opacity-[0.02] -rotate-12 pointer-events-none">
              <TrendingUp size={300} />
            </div>
            
            <div className="relative z-10 space-y-4">
              {loading1 || loading2 ? (
                <div className="py-32 flex flex-col items-center gap-6">
                  <LoadingSpinner size="lg" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Synchronisiere Daten...</span>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <StatRow 
                    label="Spiele Gesamt" 
                    val1={player1Data?.gamesPlayed} 
                    val2={player2Data?.gamesPlayed} 
                  />
                  <StatRow 
                    label="Durchschnitt (Ø)" 
                    val1={player1Data?.averageScore} 
                    val2={player2Data?.averageScore} 
                  />
                  <StatRow 
                    label="Siege" 
                    val1={player1Data?.wins} 
                    val2={player2Data?.wins} 
                  />
                  <StatRow 
                    label="Niederlagen" 
                    val1={player1Data?.losses} 
                    val2={player2Data?.losses} 
                    higherIsBetter={false}
                  />
                  <div className="py-6 border-b border-border/50">
                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] text-center mb-4">Vereine</div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-wrap justify-end gap-2 px-2">
                        {player1Data?.clubs?.map(c => <span key={c} className="px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-tighter text-right">{c}</span>)}
                        {!player1Data?.clubs?.length && <span className="text-sm font-bold text-muted-foreground">-</span>}
                      </div>
                      <div className="flex flex-wrap justify-start gap-2 px-2">
                        {player2Data?.clubs?.map(c => <span key={c} className="px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-tighter text-left">{c}</span>)}
                        {!player2Data?.clubs?.length && <span className="text-sm font-bold text-muted-foreground">-</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* AI Prediction Section */}
        {player1Data && player2Data && (
          <Card className="rounded-[3rem] border-primary/20 bg-primary/5 p-8 md:p-12 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  <Activity size={14} />
                  AI Performance Predictor
                </div>
                <h3 className="text-3xl font-black tracking-tighter uppercase">KI-Siegvorhersage</h3>
                <p className="text-sm font-medium text-muted-foreground max-w-md">
                   Basierend auf ELO-Rating, historischem Durchschnitt und aktuellen Leistungstrends.
                </p>
              </div>

              {!predictionResult && !predictionLoading && (
                <Button 
                  onClick={predictWinChance}
                  size="lg" 
                  className="rounded-2xl h-16 px-12 font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all bg-primary text-primary-foreground"
                >
                  Siegchance berechnen
                </Button>
              )}

              {predictionLoading && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <LoadingSpinner />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Analysiere Spielerprofile...</span>
                </div>
              )}

              {predictionError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold uppercase tracking-tight">
                   {predictionError}
                </div>
              )}

              {predictionResult && (
                <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">
                  <div className="flex justify-between items-end mb-4">
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{player1Data.playerName}</div>
                      <div className="text-4xl font-black text-primary tabular-nums">{predictionResult.p1.toFixed(1)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{player2Data.playerName}</div>
                      <div className="text-4xl font-black text-foreground tabular-nums">{predictionResult.p2.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex border border-border/50">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${predictionResult.p1}%` }}
                    />
                    <div 
                      className="h-full bg-border transition-all duration-1000 ease-out"
                      style={{ width: `${predictionResult.p2}%` }}
                    />
                  </div>

                  <div className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60 leading-relaxed">
                     Statistische Wahrscheinlichkeit basierend auf XGBoost Machine Learning Modell
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => setPredictionResult(null)}
                    className="mt-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    Neu berechnen
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Empty State Instructions */}
        {!player1Data && !player2Data && (
          <div className="py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="inline-flex items-center justify-center p-8 rounded-[3rem] bg-muted/30 mb-8 border border-dashed border-border/50">
                <BarChart3 size={64} className="text-muted-foreground opacity-20" />
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tight">Bereit zum Vergleich</h3>
             <p className="text-muted-foreground max-w-sm mx-auto mt-2 font-medium">Wähle zwei Spieler oben aus, um Statistiken wie Schnitt, Siege und vieles mehr zu vergleichen.</p>
          </div>
        )}
      </main>
    </div>
  );
}
