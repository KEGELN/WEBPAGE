'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Menubar from "@/components/menubar";
import { UserPlus, AlertCircle, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TrainerRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { trainer, signUp } = useAuth();

  useEffect(() => {
    if (trainer) {
      router.push('/trainer/dashboard');
    }
  }, [trainer, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bitte gib deinen Namen ein.');
      return;
    }

    if (!email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
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
    const result = await signUp(email, password, name.trim());
    setLoading(false);

    if (result.error) {
      if (result.error.includes('already registered')) {
        setError('Diese E-Mail-Adresse ist bereits registriert.');
      } else {
        setError(result.error);
      }
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Menubar />
        <main className="container mx-auto px-4 py-20 flex justify-center">
          <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold">Registrierung erfolgreich!</h1>
            <p className="text-muted-foreground mt-2">
              Bitte überprüfe deine E-Mail und klicke auf den Bestätigungslink, um dein Konto zu aktivieren.
            </p>
            <div className="pt-6">
              <Link 
                href="/trainer/login"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
              >
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
              <UserPlus size={24} />
            </div>
            <h1 className="text-2xl font-bold">Trainer Registrierung</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Erstelle dein Trainer-Konto, um Spieler zu verwalten und Trainingsdaten einzusehen.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium ml-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Max Mustermann"
                className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>

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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Mindestens 6 Zeichen"
                className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium ml-1">
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Passwort wiederholen"
                className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
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
                  Registrieren...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Konto erstellen
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Bereits ein Konto?{' '}
              <Link href="/trainer/login" className="text-primary font-semibold hover:underline">
                Hier anmelden
              </Link>
            </p>
          </div>

          <div className="pt-6 border-t border-border mt-6">
            <p className="text-xs text-center text-muted-foreground">
              <Shield size={12} className="inline mr-1" />
              Deine Daten werden sicher gespeichert und nur für die Trainer-Verwaltung verwendet.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
