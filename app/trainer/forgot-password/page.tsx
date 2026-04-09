'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Menubar from "@/components/menubar";
import { Mail, AlertCircle, CheckCircle, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/trainer/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
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
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold">E-Mail gesendet!</h1>
            <p className="text-muted-foreground">
              Wir haben eine E-Mail mit einem Link zum Zurücksetzen deines Passworts an <strong>{email}</strong> gesendet.
              Bitte überprüfe dein Postfach.
            </p>
            <div className="pt-6">
              <Link 
                href="/trainer/login"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
              >
                <ArrowLeft size={18} />
                Zurück zum Login
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
              <Mail size={24} />
            </div>
            <h1 className="text-2xl font-bold">Passwort vergessen?</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
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
                placeholder="deine@email.de"
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
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Mail size={20} />
                  Link senden
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
