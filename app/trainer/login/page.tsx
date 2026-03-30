'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Menubar from "@/components/menubar";
import { Mail, LogIn, AlertCircle, Shield } from 'lucide-react';
import { db } from '@/lib/db';

export default function TrainerLoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('trainer_user');
    if (auth) {
      router.push('/trainer/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (email.includes('@')) {
      const trainer = await db.loginTrainer(email);
      if (trainer) {
        localStorage.setItem('trainer_user', JSON.stringify(trainer));
        router.push('/trainer/dashboard');
      } else {
        setError('Login fehlgeschlagen. Bitte versuche es erneut.');
      }
    } else {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
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
            <h1 className="text-2xl font-bold">Trainer-Bereich</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Melde dich mit deiner E-Mail an, um Spieler zu verwalten und Trainingsdaten einzusehen.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium ml-1">
                E-Mail Adresse
              </label>
              <div className="relative">
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
              <LogIn size={20} />
              Einloggen
            </button>
          </form>

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
