'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Menubar from "@/components/menubar";
import { LogIn, AlertCircle, Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-20 flex justify-center">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <Shield size={24} />
            </div>
            <h1 className="text-2xl font-bold">Trainer Login</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Melde dich mit deiner E-Mail und Passwort an, um Spieler zu verwalten und Trainingsdaten einzusehen.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium ml-1">
                E-Mail Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="trainer@verein.de"
                className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium ml-1">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Dein Passwort"
                  className="w-full bg-muted border border-border rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Anmelden...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Anmelden
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Noch kein Konto?{' '}
              <Link href="/trainer/register" className="text-primary font-semibold hover:underline">
                Jetzt registrieren
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Passwort vergessen?{' '}
              <Link href="/trainer/forgot-password" className="text-primary font-semibold hover:underline">
                Zurücksetzen
              </Link>
            </p>
          </div>

          <div className="pt-6 border-t border-border mt-6">
            <p className="text-xs text-center text-muted-foreground">
              Exklusiv für Vereinstrainer. Als Trainer kannst du Spieler-IDs generieren und deren Fortschritt verfolgen.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
