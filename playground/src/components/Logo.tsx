import React from 'react';

/**
 * VisionStream mark — a viewfinder reticle (four corner brackets + focus dot).
 * It reads as "observe / focus / capture", tying the logo to what the product does.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="vs-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4d4d8" />
          <stop offset="1" stopColor="#f5f5f5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#vs-grad)" />
      <g stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12.5 9 H9 V12.5" />
        <path d="M19.5 9 H23 V12.5" />
        <path d="M19.5 23 H23 V19.5" />
        <path d="M12.5 23 H9 V19.5" />
      </g>
      <circle cx="16" cy="16" r="2.5" fill="#0a0a0a" />
    </svg>
  );
}

export function LogoLockup({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`vs-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
        Vision<span style={{ color: 'var(--text-accent)' }}>Stream</span>
      </span>
    </span>
  );
}

export default LogoMark;
