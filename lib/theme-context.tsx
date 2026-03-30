'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeName = 'light' | 'dark' | 'default';

interface ThemeContextType {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'default';
    const savedTheme = localStorage.getItem('theme') as ThemeName | null;
    return savedTheme || 'default';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'default');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    if (theme === 'default') {
      document.documentElement.classList.add('default');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (nextTheme: ThemeName) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => {
      const nextOrder: Array<'default' | 'dark' | 'light'> = ['default', 'dark', 'light'];
      const nextIndex = (nextOrder.indexOf(prev) + 1) % nextOrder.length;
      return nextOrder[nextIndex];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
