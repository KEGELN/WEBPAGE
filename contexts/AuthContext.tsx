'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Trainer } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  trainer: Trainer | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshTrainer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrainer = async (userId: string, email: string) => {
    try {
      const res = await fetch('/api/training/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-trainer', supabaseUserId: userId, email }),
      });
      if (res.ok) {
        const trainerData = await res.json();
        setTrainer(trainerData);
      }
    } catch (error) {
      console.error('Failed to fetch trainer:', error);
    }
  };

  const refreshTrainer = async () => {
    if (user) {
      await fetchTrainer(user.id, user.email || '');
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTrainer(session.user.id, session.user.email || '');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTrainer(session.user.id, session.user.email || '');
      } else {
        setTrainer(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Auth not configured' };
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) return { error: error.message };

    if (data.user) {
      const res = await fetch('/api/training/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-trainer',
          supabaseUserId: data.user.id,
          email: data.user.email,
          name,
        }),
      });

      if (!res.ok) {
        return { error: 'Failed to create trainer profile' };
      }

      const trainerData = await res.json();
      setTrainer(trainerData);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Auth not configured' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    if (data.user) {
      await fetchTrainer(data.user.id, data.user.email || '');
    }

    return { error: null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setTrainer(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, trainer, loading, signUp, signIn, signOut, refreshTrainer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
