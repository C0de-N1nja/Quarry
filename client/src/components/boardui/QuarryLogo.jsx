import React from 'react';

/**
 * QuarryLogo: High-precision geometric mineral prism brandmark.
 * Designed with authentic enterprise aesthetics: faceted depth, subtle inner specular highlight,
 * and high-contrast rendering across light/dark themes.
 */
export function QuarryLogo({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="quarry-prism-top" x1="16" y1="2" x2="16" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="quarry-prism-left" x1="4" y1="12" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="quarry-prism-right" x1="28" y1="12" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>
        <linearGradient id="quarry-specular" x1="16" y1="6" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" stopOpacity="0.8" />
          <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Top Facet (Illuminated Table) */}
      <polygon
        points="16,3 27,9 16,15 5,9"
        fill="url(#quarry-prism-top)"
      />

      {/* Left Front Facet */}
      <polygon
        points="5,9 16,15 16,29 5,20"
        fill="url(#quarry-prism-left)"
      />

      {/* Right Front Facet (Shaded Depth) */}
      <polygon
        points="16,15 27,9 27,20 16,29"
        fill="url(#quarry-prism-right)"
      />

      {/* Internal Precision Gem Lines (Prism Core) */}
      <line x1="16" y1="3" x2="16" y2="15" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
      <line x1="5" y1="9" x2="27" y2="9" stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />
      <line x1="16" y1="15" x2="16" y2="29" stroke="white" strokeWidth="0.75" strokeOpacity="0.5" />

      {/* Inner Core Radar Accent Dot */}
      <circle cx="16" cy="15" r="1.5" fill="#FFFFFF" />
      <circle cx="16" cy="15" r="3" stroke="#60A5FA" strokeWidth="0.5" strokeOpacity="0.8" />
    </svg>
  );
}

export function QuarryMonogram({ className = 'size-8', logoSize = 18 }) {
  return (
    <div
      className={`rounded-xl bg-slate-900 border border-slate-700/60 shadow-xs flex items-center justify-center text-white ring-1 ring-white/10 ${className}`}
    >
      <QuarryLogo size={logoSize} />
    </div>
  );
}

export default QuarryLogo;
