'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from '../icons/lucide';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('qna-theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = saved || (prefersDark ? 'dark' : 'light');
    setTheme(current);
    document.documentElement.setAttribute('data-theme', current);
    if (current === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('qna-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`btn btn-circle btn-xs btn-ghost transition-transform duration-200 active:scale-95 ${className}`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-brand-burgundy dark:text-brand-rose" />
      ) : (
        <Sun className="w-5 h-5 text-brand-gold" />
      )}
    </button>
  );
}
