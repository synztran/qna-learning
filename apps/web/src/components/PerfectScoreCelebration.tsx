'use client';

import { useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';

const COLORS = ['#52796F', '#84A98C', '#D4A84B', '#E09F7D'];

export function PerfectScoreCelebration({ total }: { total: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!surface) return;
    const context = surface.getContext('2d');
    if (!context) return;

    const width = surface.clientWidth;
    const height = surface.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    surface.width = width * scale;
    surface.height = height * scale;
    context.scale(scale, scale);

    const particles = Array.from({ length: 96 }, (_, index) => {
      const burst = Math.floor(index / 32);
      const angle = (index % 32) * Math.PI * 2 / 32;
      const speed = 45 + Math.random() * 75;
      return {
        x: width * [0.25, 0.75, 0.5][burst],
        y: height * [0.4, 0.35, 0.22][burst],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        delay: burst * 550,
        color: COLORS[index % COLORS.length],
      };
    });
    let frame = 0;
    const start = performance.now();
    const clear = () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      if (document.hidden || reducedMotion.matches) return;
      for (const particle of particles) {
        const age = ((now - start) % 3000 - particle.delay) / 1000;
        if (age < 0 || age > 1.7) continue;
        context.globalAlpha = Math.max(0, 1 - age / 1.7);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x + particle.vx * age,
          particle.y + particle.vy * age + 35 * age * age, 2.5, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    const update = () => {
      clear();
      if (!document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(draw);
    };
    update();
    reducedMotion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clear();
      reducedMotion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div className="relative isolate mt-4">
    <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute -top-20 left-0 -z-10 h-64 w-full" />
    <p role="status" className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
      <Trophy aria-hidden="true" className="h-5 w-5 shrink-0" />
      Chúc mừng! {total}/{total} câu đúng!
    </p>
  </div>;
}
