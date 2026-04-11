'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { Lock, UserCheck, AlertCircle, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('player_auth');
    if (auth) {
      router.push('/training');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const player = await db.loginPlayer(username.trim().toLowerCase(), tempPassword.trim().toUpperCase());
      if (player) {
        localStorage.setItem('player_auth', JSON.stringify(player));
        router.push('/training');
      } else {
        setError('Ungültiger Username oder Temp-Passwort.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f4] dark:bg-[#050505] text-foreground selection:bg-primary/30">
      <Menubar />
      <main className="container mx-auto px-4 py-16 md:py-24 flex justify-center items-center">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700">
          <Card className="rounded-[2.5rem] border-red-100 dark:border-white/5 bg-white dark:bg-card/50 shadow-3xl overflow-hidden">
            <CardHeader className="p-10 pb-6 text-center border-b border-red-50 dark:border-white/5 bg-gradient-to-b from-red-50/50 dark:from-white/5 to-transparent">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mb-6 border border-primary/20 shadow-inner group transition-transform hover:scale-110">
                <ShieldCheck className="text-primary group-hover:rotate-12 transition-transform" size={32} />
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase">Spieler Login</CardTitle>
              <CardDescription className="font-medium text-muted-foreground mt-2">
                Melde dich an, um deine Trainingsdaten zu erfassen.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-10 space-y-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(''); }}
                      placeholder="dein_username"
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border-red-50 dark:border-white/10 bg-muted/30 dark:bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="temp-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                    Temp-Passwort
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="temp-password"
                      type="text"
                      value={tempPassword}
                      onChange={(e) => { setTempPassword(e.target.value); setError(''); }}
                      placeholder="ABC-XYZ"
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border-red-50 dark:border-white/10 bg-muted/30 dark:bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono font-black tracking-widest uppercase"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 animate-in shake-in duration-300">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                >
                  {loading ? 'Anmelden...' : (
                    <>
                      Training starten <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="pt-6 border-t border-red-50 dark:border-white/5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed">
                  Deine Zugangsdaten erhältst du direkt von deinem Trainer.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-12 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Kein Konto? <span className="text-primary hover:underline cursor-pointer" onClick={() => router.push('/training')}>Gast-Modus nutzen</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
