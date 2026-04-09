'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { Lock, AlertCircle, CheckCircle, Shield, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabaseClient = supabase;
    if (!supabaseClient) {
      setInvalidToken(true);
      return;
    }
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        setInvalidToken(true);
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabase) {
      setError('Auth ist nicht konfiguriert.');
      return;
    }

    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Menubar />
        <main className="container mx-auto px-4 py-20 flex justify-center">
          <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold">Ungültiger Link</h1>
            <p className="text-muted-foreground">
              Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
              Bitte fordere einen neuen Link an.
            </p>
            <div className="pt-6">
              <Link 
                href="/trainer/forgot-password"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
              >
                Neuen Link anfordern
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Menubar />
        <main className="container mx-auto px-4 py-20 flex justify-center">
          <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold">Passwort geändert!</h1>
            <p className="text-muted-foreground">
              Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt mit dem neuen Passwort anmelden.
            </p>
            <div className="pt-6">
              <Link 
                href="/trainer/login"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
              >
                <ArrowLeft size={18} />
                Zum Login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-20 flex justify-center">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-bold">Neues Passwort</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Gib dein neues Passwort ein.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium ml-1">
                Neues Passwort
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
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full bg-muted border border-border rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                  minLength={6}
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

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium ml-1">
                Passwort bestätigen
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Passwort wiederholen"
                  className="w-full bg-muted border border-border rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Passwort speichern
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/trainer/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                Zurück zum Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
