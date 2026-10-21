import React from 'react';

interface ThiingsIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function ThiingsTrophy({ size = 36, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="trophyGold" x1="12" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#EAB308" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="trophyBase" x1="16" y1="34" x2="32" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#475569" />
          <stop offset="1" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="trophyRim" x1="14" y1="6" x2="34" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path
        d="M14 12C9 12 7 16 7 21C7 27 12 30 15 30"
        stroke="url(#trophyGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M34 12C39 12 41 16 41 21C41 27 36 30 33 30"
        stroke="url(#trophyGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Main Cup */}
      <path
        d="M13 8H35V19C35 26.5 29.5 31 24 31C18.5 31 13 26.5 13 19V8Z"
        fill="url(#trophyGold)"
      />
      {/* Cup Rim */}
      <rect x="12" y="6" width="24" height="4" rx="2" fill="url(#trophyRim)" />
      {/* Stem */}
      <path d="M22 31H26V36H22V31Z" fill="#CA8A04" />
      {/* Pedestal */}
      <rect x="14" y="36" width="20" height="7" rx="3" fill="url(#trophyBase)" />
      <rect x="17" y="38" width="14" height="3" rx="1" fill="#94A3B8" opacity="0.4" />
      {/* Star Emblem */}
      <path
        d="M24 14L25.3 17.5H29L26 19.5L27.2 23L24 21L20.8 23L22 19.5L19 17.5H22.7L24 14Z"
        fill="#FFFFFF"
        opacity="0.9"
      />
    </svg>
  );
}

export function ThiingsBook({ size = 36, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="bookCover" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#991B1B" />
          <stop offset="1" stopColor="#581C87" />
        </linearGradient>
        <linearGradient id="bookPages" x1="12" y1="12" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFBEB" />
          <stop offset="1" stopColor="#FEF3C7" />
        </linearGradient>
      </defs>
      {/* Back Cover */}
      <rect x="8" y="10" width="32" height="30" rx="4" fill="#450A0A" />
      {/* Pages Layer */}
      <rect x="10" y="8" width="30" height="30" rx="3" fill="url(#bookPages)" />
      {/* Front Cover */}
      <path
        d="M8 8C8 5.79086 9.79086 4 12 4H38C39.1046 4 40 4.89543 40 6V36C40 37.1046 39.1046 38 38 38H12C9.79086 38 8 36.2091 8 34V8Z"
        fill="url(#bookCover)"
      />
      {/* Spine Detail */}
      <path d="M14 4V38" stroke="#FDE047" strokeWidth="2" strokeDasharray="3 3" />
      {/* Golden Bookmark */}
      <path d="M28 4V18L32 15L36 18V4H28Z" fill="#F59E0B" />
    </svg>
  );
}

export function ThiingsTarget({ size = 36, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="24" cy="24" r="20" fill="#EF4444" />
      <circle cx="24" cy="24" r="15" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="10" fill="#EF4444" />
      <circle cx="24" cy="24" r="5" fill="#FEF08A" />
      {/* Hit arrow feather */}
      <path
        d="M26 12L36 2M36 2H31M36 2V7"
        stroke="#1E293B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThiingsSparkle({ size = 32, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="sparkleGrad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path
        d="M18 2C18 10 22 14 30 18C22 22 18 26 18 34C18 26 14 22 6 18C14 14 18 10 18 2Z"
        fill="url(#sparkleGrad)"
      />
      <circle cx="28" cy="8" r="3" fill="#FDE047" />
      <circle cx="8" cy="28" r="2" fill="#FDE047" />
    </svg>
  );
}

export function ThiingsFire({ size = 36, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="fireOuter" x1="12" y1="6" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="fireInner" x1="18" y1="20" x2="30" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      <path
        d="M24 4C24 4 28 12 32 16C37 21 40 27 40 33C40 40 33 44 24 44C15 44 8 40 8 33C8 26 13 20 18 16C19 21 21 23 23 23C24 18 24 10 24 4Z"
        fill="url(#fireOuter)"
      />
      <path
        d="M24 24C28 27 30 30 30 33C30 37 27 39 24 39C21 39 18 37 18 33C18 30 20 28 22 26C23 28 24 29 25 29C25 27 24 25 24 24Z"
        fill="url(#fireInner)"
      />
    </svg>
  );
}

export function ThiingsShield({ size = 36, className = '', ...props }: ThiingsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M24 6L38 11V22C38 31.5 32 39 24 42C16 39 10 31.5 10 22V11L24 6Z"
        fill="url(#shieldGrad)"
      />
      <path
        d="M24 10V38C29.5 35.5 34 29.5 34 22V13.5L24 10Z"
        fill="#FFFFFF"
        opacity="0.15"
      />
      <path
        d="M19 22L23 26L29 18"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
