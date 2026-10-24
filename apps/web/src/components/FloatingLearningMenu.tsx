'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LearningActions } from './LearningActions';
import type { LeaderboardCache } from '@/lib/leaderboard-cache';

export function FloatingLearningMenu({ leaderboardCache }: { leaderboardCache: LeaderboardCache }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (root.current?.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div ref={root} className="home-learning-menu relative flex h-14 items-center justify-end gap-3">
    <div id="floating-learning-actions" inert={!open ? true : undefined} aria-hidden={!open}
      className={`home-learning-menu-actions absolute right-[3.75rem] rounded-full border border-base-300 bg-base-100 p-2 shadow-lg ${open ? 'is-open' : ''}`}>
      <div className="flex items-center gap-2"><LearningActions cache={leaderboardCache} /></div>
    </div>
    <button ref={trigger} type="button" aria-label={open ? 'Đóng tiện ích' : 'Mở xếp hạng và lịch sử'}
      aria-expanded={open} aria-controls="floating-learning-actions" onClick={() => setOpen(value => !value)}
      className="home-menu-trigger btn btn-primary btn-circle shadow-lg">
      {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
    </button>
  </div>;
}
