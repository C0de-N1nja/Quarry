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
  RiCheckboxCircleLine
} from '@remixicon/react';

import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { ThemeToggle } from '@/components/application/theme/theme-toggle';

export default function Header({ 
  stats, 
  onOpenSearch, 
  onOpenAutoPilot, 
  onOpenQueue, 
  onOpenSettings, 
  theme, 
  onToggleTheme, 
  onExportExcel 
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
        {/* Brand Logo & Clean Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent-600 text-white shadow-xs ring-1 ring-white/20">
            <RiFlashlightFill className="size-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-body-medium font-semibold tracking-tight text-text-primary">
              Quarry <span className="font-mono text-caption-1-medium text-accent-500">OS</span>
            </h1>
            {stats && stats.noWebsite > 0 && (
              <Chip variant="bold" color="rose">
                {stats.noWebsite} No-Website
              </Chip>
            )}
          </div>
        </div>

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

          <div className="hidden md:inline-flex">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiFileUploadLine}
              onClick={() => onOpenSearch && onOpenSearch('csv')}
              title="Import CSV"
            >
              CSV
            </Button>
          </div>

          <div className="hidden md:inline-flex">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiDownloadLine}
              onClick={onExportExcel}
              title="Export to Excel (.xlsx)"
            >
              Export
            </Button>
          </div>

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

          <div className="mx-1 h-4 w-px bg-separator-border" />

          {/* Theme Toggle (BoardUI Official Segmented Control) */}
          <div className="hidden sm:block">
            <ThemeToggle variant="segmented" small />
          </div>

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

      {/* KPI Stats Strip using BoardUI Tokens & Status Indicators */}
      {stats && (
        <div className="border-t border-separator-border/60 bg-background-secondary-default/50 px-3 py-1.5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-between gap-4 text-caption-1-regular">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <span className="font-mono text-text-tertiary">
                Vault: <strong className="font-semibold text-text-primary">{(stats.totalLeads || 0).toLocaleString()}</strong>
              </span>
              <span className="hidden text-text-tertiary sm:inline">•</span>
              <span className="flex items-center gap-1.5 font-mono text-status-rose-text">
                <StatusDot color="indigo" />
                <span>No-Website: <strong>{(stats.noWebsite || 0).toLocaleString()}</strong></span>
              </span>
              <span className="hidden text-text-tertiary sm:inline">•</span>
              <span className="flex items-center gap-1.5 font-mono text-status-yellow-text">
                <StatusDot color="yellow" />
                <span>Gold: <strong>{(stats.goldLeads || 0).toLocaleString()}</strong></span>
              </span>
              <span className="hidden text-text-tertiary sm:inline">•</span>
              <span className="flex items-center gap-1.5 font-mono text-status-lime-text">
                <StatusDot color="green" />
                <span>Won: <strong>{(stats.won || 0).toLocaleString()}</strong></span>
              </span>
            </div>

            {tunnel && tunnel.publicUrl && (
              <div className="hidden items-center gap-1.5 font-mono text-status-lime-text md:flex">
                <StatusDot color="green" className="animate-pulse" />
                <span className="text-caption-1-medium">HTTPS Live Tunnel</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
