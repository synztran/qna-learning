'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { LearningActions } from './LearningActions';

export function FloatingLearningMenu() {
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

  return <div ref={root} className="relative flex items-center justify-end gap-3">
    <div id="floating-learning-actions" hidden={!open} className="rounded-full border border-base-300 bg-base-100 p-2 shadow-lg">
      <div className="flex items-center gap-2"><LearningActions /></div>
    </div>
    <button ref={trigger} type="button" aria-label={open ? 'Đóng tiện ích' : 'Mở xếp hạng và lịch sử'}
      aria-expanded={open} aria-controls="floating-learning-actions" onClick={() => setOpen(value => !value)}
      className="btn btn-primary btn-circle shadow-lg">
      {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
    </button>
  </div>;
}
