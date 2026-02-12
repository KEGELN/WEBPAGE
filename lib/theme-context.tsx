'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'default';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'default'>('default');

  useEffect(() => {
    // Check for saved theme in localStorage or default to default theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'default' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to club theme
      setTheme('default');
      localStorage.setItem('theme', 'default');
    }
  }, []);

  useEffect(() => {
    // Update the document class and localStorage when theme changes
    document.documentElement.classList.remove('dark', 'default');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    if (theme === 'default') {
      document.documentElement.classList.add('default');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextOrder: Array<'default' | 'dark' | 'light'> = ['default', 'dark', 'light'];
      const nextIndex = (nextOrder.indexOf(prev) + 1) % nextOrder.length;
      const newTheme = nextOrder[nextIndex];
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
