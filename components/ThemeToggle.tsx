'use client';

import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

function ClubThemeIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#e71f53" />
      <circle cx="32" cy="32" r="22" fill="#ffffff" />
      <circle cx="32" cy="32" r="18" fill="#e71f53" />
      <path
        d="M22 30c0-6 4.8-11 10-11s10 5 10 11c0 4-2 7-4.5 9.5-1.5 1.5-2.5 3.5-2.5 5.5h-6c0-2-1-4-2.5-5.5C24 37 22 34 22 30z"
        fill="#ffffff"
      />
      <circle cx="28" cy="30" r="3" fill="#e71f53" />
      <circle cx="36" cy="30" r="3" fill="#e71f53" />
      <path d="M32 33c-3 0-5 2.5-5 5h10c0-2.5-2-5-5-5z" fill="#e71f53" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-full hover:bg-muted transition-colors duration-200"
    >
      {theme === 'default' ? (
        <ClubThemeIcon />
      ) : theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700" />
      )}
    </button>
  );
}

export function ThemeSelector() {
  const { theme, setTheme, toggleTheme } = useTheme();

  const options: Array<{ value: 'default' | 'dark' | 'light'; label: string }> = [
    { value: 'default', label: 'Club' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</div>
      <div className="grid gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              theme === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <span>{option.label}</span>
            {theme === option.value ? <Check className="h-4 w-4" /> : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
      >
        Next Theme
      </button>
    </div>
  );
}
