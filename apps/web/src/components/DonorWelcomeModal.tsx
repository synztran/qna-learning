'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Heart } from 'lucide-react';
import { DonorBadge } from '@qna/ui';
import { getDonorTierByLevel, getDonorTierBySlug } from '@qna/types';

interface DonorWelcomeModalProps {
  user?: {
    id?: string;
    displayName?: string;
    donorLevel?: number;
    donorTier?: string | null;
  };
}

export function DonorWelcomeModal({ user }: DonorWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const donorLevel = user?.donorLevel ?? 0;
  const donorTier = user?.donorTier ?? null;

  useEffect(() => {
    if (!user || donorLevel <= 0) return;
    const storageKey = `qna_donor_welcome_${user.id || user.displayName || 'user'}_lv${donorLevel}`;
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        setIsOpen(true);
      }
    } catch {
      // Ignore storage error
    }
  }, [user, donorLevel]);

  const handleClose = () => {
    if (user && donorLevel > 0) {
      const storageKey = `qna_donor_welcome_${user.id || user.displayName || 'user'}_lv${donorLevel}`;
      try {
        localStorage.setItem(storageKey, 'true');
      } catch {
        // Ignore storage error
      }
    }
    setIsOpen(false);
  };

  // Fireworks canvas animation
  useEffect(() => {
    if (!isOpen) return;
    const surface = canvasRef.current;
    if (!surface) return;
    const context = surface.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const width = surface.clientWidth;
    const height = surface.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    surface.width = width * scale;
    surface.height = height * scale;
    context.scale(scale, scale);

    const colors = donorTier === 'tinh_hoa'
      ? ['#F59E0B', '#FBBF24', '#FCD34D', '#EF4444', '#EC4899', '#FFFFFF']
      : donorTier === 'uyen_bac'
        ? ['#3B82F6', '#60A5FA', '#06B6D4', '#818CF8', '#A78BFA', '#FFFFFF']
        : ['#10B981', '#34D399', '#14B8A6', '#84CC16', '#FBBF24', '#FFFFFF'];

    const particles = Array.from({ length: 120 }, (_, index) => {
      const burst = Math.floor(index / 40); // 3 bursts
      const angle = (index % 40) * ((Math.PI * 2) / 40);
      const speed = 40 + Math.random() * 85;
      return {
        x: width * [0.25, 0.75, 0.5][burst],
        y: height * [0.35, 0.32, 0.2][burst],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        delay: burst * 450,
        color: colors[index % colors.length],
        radius: 2 + Math.random() * 1.8,
      };
    });

    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      if (document.hidden) return;
      for (const p of particles) {
        const age = ((now - start) % 3500 - p.delay) / 1000;
        if (age < 0 || age > 1.8) continue;
        context.globalAlpha = Math.max(0, 1 - age / 1.8);
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(
          p.x + p.vx * age,
          p.y + p.vy * age + 38 * age * age,
          p.radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, donorTier]);

  if (!isOpen || donorLevel <= 0) return null;

  const config = getDonorTierBySlug(donorTier) || getDonorTierByLevel(donorLevel);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="donor-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Fireworks Canvas */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full z-10"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 15 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="relative z-20 w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/30 bg-base-100 p-6 shadow-2xl space-y-4 text-center"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng thông báo tri ân"
              className="btn btn-circle btn-ghost btn-xs absolute right-3 top-3 text-base-content/60 hover:text-base-content"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon Header */}
            <div className="flex justify-center pt-2">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 shadow-inner ring-4 ring-amber-500/10">
                  <Sparkles className="h-8 w-8 animate-pulse text-amber-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white shadow-sm">
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
            </div>

            {/* Title & Badge */}
            <div className="space-y-1.5">
              <h2
                id="donor-modal-title"
                className="font-display text-lg font-bold tracking-tight text-base-content"
              >
                Trân Trọng Tri Ân!
              </h2>
              <p className="text-xs text-base-content/70">
                Ghi nhận đóng góp từ học viên
              </p>
            </div>

            <div className="flex justify-center py-1">
              <DonorBadge level={donorLevel} tier={donorTier} />
            </div>

            {/* Message Body */}
            <div className="rounded-2xl border border-base-300/80 bg-base-200/50 p-3.5 text-xs text-base-content/85 leading-relaxed space-y-1.5">
              <p>
                Chào <b className="text-primary font-semibold">{user?.displayName || 'bạn'}</b>,
              </p>
              <p className="italic text-base-content/75">
                &ldquo;{config?.description || 'Cảm ơn bạn đã đồng hành và tiếp sức cho nền tảng!'} &rdquo;
              </p>
              <p className="text-[11px] text-base-content/60">
                Sự hỗ trợ của bạn là nguồn động lực to lớn giúp duy trì và hoàn thiện hệ thống câu hỏi chất lượng cao.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-primary w-full rounded-2xl font-display font-bold text-sm text-primary-content shadow-md shadow-primary/20"
            >
              Bắt đầu ôn luyện ✨
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
