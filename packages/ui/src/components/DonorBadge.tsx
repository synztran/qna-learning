'use client';

import React from 'react';
import { Crown, GraduationCap, Sprout } from '../icons/lucide';
import { getDonorTierByLevel, getDonorTierBySlug, type DonorTier } from '@qna/types';

export interface DonorBadgeProps {
  level?: number | null;
  tier?: string | null;
  compact?: boolean;
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function DonorBadge({
  level,
  tier,
  compact = false,
  showIcon = true,
  showLabel = true,
  className = '',
}: DonorBadgeProps) {
  const config = getDonorTierBySlug(tier) || getDonorTierByLevel(level);

  if (!config) return null;

  const renderIcon = (iconClass: string) => {
    switch (config.tier) {
      case 'hieu_hoc':
        return <Sprout aria-hidden="true" className={iconClass} />;
      case 'uyen_bac':
        return <GraduationCap aria-hidden="true" className={iconClass} />;
      case 'tinh_hoa':
        return <Crown aria-hidden="true" className={iconClass} />;
      default:
        return null;
    }
  };

  const styleByTier: Record<DonorTier, string> = {
    hieu_hoc: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    uyen_bac: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    tinh_hoa: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  };

  if (compact) {
    return (
      <span
        title={`Tri ân: ${config.label} (${config.description})`}
        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none select-none ${styleByTier} ${className}`}
      >
        {showIcon && renderIcon('w-3 h-3 shrink-0')}
        {showLabel && <span>{config.shortLabel}</span>}
      </span>
    );
  }

  return (
    <span
      title={`Tri ân: ${config.label} (${config.description})`}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold leading-none select-none ${styleByTier} ${className}`}
    >
      {showIcon && renderIcon('w-3.5 h-3.5 shrink-0')}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
