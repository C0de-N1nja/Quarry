import React, { useState, useEffect } from 'react';
import { 
  RiSearch2Line, 
  RiSettings4Line,
  RiMoonClearLine,
  RiSunLine,
  RiAlertLine
} from '@remixicon/react';

import { IconButton } from '@/components/base/buttons/icon-button';
import { Kbd } from '@/components/base/kbd/kbd';
import { QuarryLogo } from './boardui/QuarryLogo';

export default function Header({ 
  stats, 
  theme, 
  onToggleTheme, 
  onOpenSettings, 
  onOpenCommandPalette 
}) {
  const [systemError, setSystemError] = useState(null);

  // Monitor system health silently — show status indicator ONLY when something is wrong
  useEffect(() => {
    let isMounted = true;
    const checkSystemHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          if (isMounted) setSystemError('Server responding with errors');
        } else {
          if (isMounted) setSystemError(null);
        }
      } catch (err) {
        if (isMounted) setSystemError('Server offline or connection interrupted');
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-between gap-4 px-3 py-2 sm:px-6 lg:px-8">
        
        {/* Brand Logo (Visible on mobile/tablet; on desktop the sidebar displays branding) */}
        <div className="flex md:hidden items-center gap-2.5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white shadow-xs">
            <QuarryLogo size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-body-small font-semibold tracking-tight text-[var(--text-primary)]">
              Quarry
            </h1>
          </div>
        </div>

        {/* Universal Search (⌘K) */}
        <div className="flex-1 max-w-sm">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-colors cursor-pointer w-full justify-between shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
              title="Search leads, actions (⌘K / Ctrl+K)"
              aria-label="Search leads, actions"
            >
              <span className="flex items-center gap-2 truncate">
                <RiSearch2Line className="size-3.5 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                <span className="truncate">Search leads, actions...</span>
              </span>
              <Kbd className="text-[10px] shrink-0 border border-[var(--card-border)] bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)]">⌘K</Kbd>
            </button>
          )}
        </div>

        {/* Right Tools: Error Indicator (only if error) + Theme Toggle + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Indicator ONLY when something is wrong */}
          {systemError && (
            <div 
              role="status"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] border border-[var(--tint-danger-border)] text-xs font-medium"
              title={systemError}
            >
              <RiAlertLine className="size-3.5 animate-pulse shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{systemError}</span>
            </div>
          )}

          {/* Theme Toggle */}
          <IconButton
            size="small"
            variant="ghost"
            icon={theme === 'dark' ? RiSunLine : RiMoonClearLine}
            aria-label={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"}
            onClick={onToggleTheme}
            className={theme === 'dark' ? "text-[var(--tint-warning-text)] hover:bg-[var(--tint-neutral-bg)]" : "text-[var(--brand-solid)] hover:bg-[var(--tint-neutral-bg)]"}
          />

          {/* Settings Button */}
          <IconButton
            size="small"
            variant="ghost"
            icon={RiSettings4Line}
            aria-label="Settings"
            title="Settings"
            onClick={onOpenSettings}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--tint-neutral-bg)]"
          />
        </div>
      </div>
    </header>
  );
}
