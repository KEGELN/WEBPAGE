'use client';

import { useState } from 'react';
import Link from 'next/link';
import Menubar from "@/components/menubar";
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

    if (!supabase) {
      setError('Auth ist nicht konfiguriert.');
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

  return (
    <div className="min-h-screen bg-[#fdf2f4] dark:bg-[#050505] text-foreground selection:bg-primary/30">
      <Menubar />
      <main className="container mx-auto px-4 py-16 md:py-24 flex justify-center items-center">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700">
          <Card className="rounded-[2.5rem] border-red-100 dark:border-white/5 bg-white dark:bg-card/50 shadow-3xl overflow-hidden">
            {success ? (
              <div className="p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <CheckCircle className="text-emerald-500" size={40} />
                </div>
                <div className="space-y-2">
                    <CardTitle className="text-3xl font-black tracking-tighter uppercase">E-Mail gesendet!</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Wir haben einen Link zum Zurücksetzen deines Passworts an <strong className="text-foreground">{email}</strong> gesendet.
                    </p>
                </div>
                <Button asChild className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl">
                    <Link href="/trainer/login">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zum Login
                    </Link>
                </Button>
              </div>
            ) : (
              <>
                <CardHeader className="p-10 pb-6 text-center border-b border-red-50 dark:border-white/5 bg-gradient-to-b from-red-50/50 dark:from-white/5 to-transparent">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mb-6 border border-primary/20 shadow-inner group transition-transform hover:scale-110">
                    <Mail className="text-primary group-hover:rotate-12 transition-transform" size={32} />
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tighter uppercase">Reset</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground mt-2">
                    Passwort vergessen? Gib deine E-Mail ein.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-10 space-y-8">
                  <form onSubmit={handleReset} className="space-y-6">
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
                          Senden...
                        </>
                      ) : (
                        <>
                          Reset-Link anfordern <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Link href="/trainer/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                      <ArrowLeft size={14} /> Zurück zum Login
                    </Link>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
