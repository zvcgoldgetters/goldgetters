'use client';

import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

function getStoredTheme(): Theme | null {
  try {
    const storedTheme = localStorage.getItem('theme');
    return storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage write failures (private mode / restricted storage).
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);
  const Icon = !mounted || theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={mounted ? toggle : undefined}
      aria-label="Toggle theme"
      aria-disabled={!mounted}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#5c461c]/14 bg-white/40 text-[#3a2a0d]/86 transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a07630]/30 sm:h-11 sm:w-11 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/14 dark:focus-visible:ring-white/40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
