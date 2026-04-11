'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Menubar from "@/components/menubar";
import { LogIn, AlertCircle, Shield, Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrainerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { trainer, signIn } = useAuth();

  useEffect(() => {
    if (trainer) {
      router.push('/trainer/dashboard');
    }
  }, [trainer, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.');
      setLoading(false);
      return;
    }

    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error === 'Invalid login credentials' 
        ? 'Ungültige E-Mail oder Passwort.' 
        : result.error);
      setLoading(false);
    } else {
      router.push('/trainer/dashboard');
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
                <Shield className="text-primary group-hover:rotate-12 transition-transform" size={32} />
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter uppercase">Trainer Login</CardTitle>
              <CardDescription className="font-medium text-muted-foreground mt-2">
                Verwalte deine Spieler und analysiere Trainingsdaten.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-10 space-y-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                    E-Mail Adresse
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="trainer@verein.de"
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border-red-50 dark:border-white/10 bg-muted/30 dark:bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                    Passwort
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full h-14 pl-12 pr-12 rounded-2xl border-red-50 dark:border-white/10 bg-muted/30 dark:bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
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
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Anmelden...
                    </>
                  ) : (
                    <>
                      Dashboard öffnen <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="flex flex-col gap-4 text-center">
                <Link href="/trainer/forgot-password" title="Passwort vergessen?" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  Passwort vergessen?
                </Link>
                <div className="h-px bg-red-50 dark:bg-white/5 w-full" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Noch kein Konto? <Link href="/trainer/register" className="text-primary hover:underline">Jetzt registrieren</Link>
                </p>
              </div>
            </CardContent>
          </Card>
          
          <p className="mt-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 text-center leading-relaxed max-w-xs mx-auto">
            Exklusiver Zugang für Vereinstrainer zur Verwaltung von Spielerprofilen und Trainingsanalysen.
          </p>
        </div>
      </main>
    </div>
  );
}
