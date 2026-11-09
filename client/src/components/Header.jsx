import React, { useState, useEffect } from 'react';
import { 
  RiFlashlightFill, 
  RiSearch2Line, 
  RiFileUploadLine, 
  RiDownloadLine, 
  RiMailSendLine, 
  RiSettings4Line,
  RiGlobalLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiCheckboxCircleLine,
  RiMoonClearLine,
  RiSunLine
} from '@remixicon/react';

import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Kbd } from '@/components/base/kbd/kbd';
import { QuarryLogo } from './boardui/QuarryLogo';

export default function Header({ 
  stats, 
  onOpenSearch, 
  onOpenAutoPilot, 
  onOpenQueue, 
  onOpenSettings, 
  theme, 
  onToggleTheme, 
  onExportExcel,
  onOpenCommandPalette,
  onOpenLiveJobs,
  onOpenOnboarding
}) {
  const [tunnel, setTunnel] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/settings/tunnel');
        const data = await res.json();
        if (data.success) {
          setTunnel(data.tunnel);
        }
      } catch (err) {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-separator-border bg-background-primary-default/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-between gap-4 px-3 py-2.5 sm:px-6 lg:px-8">
        {/* Brand Logo & Clean Title (Visible on mobile/tablet; on desktop the sidebar displays branding) */}
        <div className="flex md:hidden items-center gap-2.5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/60 text-white shadow-xs">
            <QuarryLogo size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-body-small font-semibold tracking-tight text-text-primary">
              Quarry <span className="font-mono text-[10px] text-accent-500">OS</span>
            </h1>
            {stats && stats.noWebsite > 0 && (
              <Chip variant="bold" color="rose" size="sm">
                {stats.noWebsite}
              </Chip>
            )}
          </div>
        </div>

        {/* Universal Command Palette Trigger (BoardUI Pill) */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-separator-border bg-background-secondary-default hover:bg-background-secondary-hover text-text-tertiary hover:text-text-primary text-xs transition-colors cursor-pointer max-w-xs w-64 justify-between shadow-xs"
            title="Open Command Palette (⌘K / Ctrl+K)"
          >
            <span className="flex items-center gap-2 truncate">
              <RiSearch2Line className="size-3.5 text-text-tertiary shrink-0" />
              <span className="truncate">Search leads, actions...</span>
            </span>
            <Kbd className="text-[10px] shrink-0">⌘K</Kbd>
          </button>
        )}

        {/* Global Action Buttons using Official BoardUI */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiFlashlightFill}
            onClick={onOpenAutoPilot}
            title="Launch 1-Click Automated Batch Pipeline"
          >
            <span className="hidden sm:inline">Auto-Pilot</span>
          </Button>

          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiSearch2Line}
            onClick={() => onOpenSearch && onOpenSearch('search')}
          >
            <span className="hidden sm:inline">Find Leads</span>
            <span className="sm:hidden">Find</span>
          </Button>

          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiMailSendLine}
            onClick={onOpenQueue}
            title="Outbox Delivery Queue"
          >
            <span>Queue</span>
            {stats && stats.pitched > 0 && (
              <span className="ml-1 rounded-full bg-accent-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                {stats.pitched}
              </span>
            )}
          </Button>

          {/* HTTPS Tunnel Live Pill */}
          {tunnel && tunnel.publicUrl && (
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-status-lime-background/30 border border-separator-border text-status-lime-text font-mono text-[11px]">
              <StatusDot color="green" className="animate-pulse" />
              <span>Live Tunnel</span>
            </div>
          )}

          {/* Mission Control Trigger Pill */}
          {onOpenLiveJobs && (
            <button
              onClick={onOpenLiveJobs}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-separator-border bg-background-secondary-default hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary text-xs font-mono transition-colors cursor-pointer"
              title="Open Mission Control Background Jobs Drawer"
            >
              <StatusDot color="green" className="animate-pulse" />
              <span>Mission Control</span>
            </button>
          )}

          <div className="mx-1 h-4 w-px bg-separator-border" />

          {/* Theme Toggle (BoardUI Moon-Star / Sun Icon Button) */}
          <IconButton
            size="small"
            icon={theme === 'dark' ? RiSunLine : RiMoonClearLine}
            aria-label={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            onClick={onToggleTheme}
            className={theme === 'dark' ? "text-warning-primary hover:text-warning-hover" : "text-indigo-500 hover:text-indigo-600"}
          />

          {/* Settings Trigger */}
          <div className="relative">
            <IconButton
              size="small"
              variant="secondary"
              icon={RiSettings4Line}
              aria-label="Settings & SMTP"
              onClick={onOpenSettings}
            />
            {tunnel && tunnel.isRunning && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-green-500 ring-2 ring-background-primary-default" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
