'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { Lock, UserCheck, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('player_auth');
    if (auth) {
      router.push('/training');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const player = await db.loginPlayer(username, tempPassword);
      if (player) {
        localStorage.setItem('player_auth', JSON.stringify(player));
        router.push('/training');
      } else {
        setError('Ungültiger Username oder Temp-Passwort. Bitte frage deinen Trainer nach den Zugangsdaten.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Menubar />
      <main className="container mx-auto px-4 py-20 flex justify-center">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border border-border shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-primary" size={24} />
            </div>
            <h1 className="text-2xl font-bold">Spieler-Login</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Melde dich mit Username und Temp-Passwort an, um dein Training zu starten.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium ml-1">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="z.B. janv0"
                  className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all lowercase"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="temp-password" className="text-sm font-medium ml-1">
                Temp-Passwort
              </label>
              <div className="relative">
                <input
                  id="temp-password"
                  type="text"
                  value={tempPassword}
                  onChange={(e) => {
                    setTempPassword(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="z.B. 7AB91C"
                  className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase"
                  required
                />
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
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <UserCheck size={20} />
              Training starten
            </button>
          </form>

          <div className="pt-6 border-t border-border mt-6">
            <p className="text-xs text-center text-muted-foreground">
              Username und Temp-Passwort erhältst du von deinem Trainer. Deine Trainingsdaten sind für deinen Trainer einsehbar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
