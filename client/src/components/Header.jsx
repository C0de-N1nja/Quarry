import React, { useState, useEffect } from 'react';
import { 
  Search, UploadCloud, Mail, Settings, Zap, Users, 
  CheckCircle2, AlertTriangle, ShieldCheck, Sun, Moon, 
  Globe, Download, Sparkles 
} from 'lucide-react';
import { RiFlashlightFill, RiSearch2Line, RiMailSendLine, RiSettings4Line } from '@remixicon/react';

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
    <header className="border-b border-border-subtle bg-surface-0/80 dark:bg-surface-0/85 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-(--breakpoint-2xl) mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Clean Title with BoardUI styling */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-brand to-indigo-500 flex items-center justify-center text-white shadow-xs shrink-0 ring-1 ring-white/20">
            <RiFlashlightFill className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
                Quarry <span className="text-brand font-mono text-xs">OS</span>
              </h1>
              {stats && stats.noWebsite > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {stats.noWebsite} No-Website
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAutoPilot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white transition-all shadow-xs cursor-pointer touch-manipulation hover:shadow-card"
            title="Launch 1-Click Automated Batch Pipeline (143/Day)"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Auto-Pilot</span>
          </button>

          <button
            onClick={() => onOpenSearch('search')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle text-gray-800 dark:text-gray-200 transition-colors touch-manipulation cursor-pointer"
          >
            <RiSearch2Line className="h-3.5 w-3.5 text-gray-400" />
            <span className="hidden sm:inline">Find</span><span>Leads</span>
          </button>

          <button
            onClick={() => onOpenSearch('csv')}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors touch-manipulation cursor-pointer"
            title="Import CSV"
          >
            <UploadCloud className="h-3.5 w-3.5 text-gray-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors touch-manipulation cursor-pointer"
            title="Export to Excel (.xlsx)"
          >
            <Download className="h-3.5 w-3.5 text-gray-400" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenQueue}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors touch-manipulation cursor-pointer relative"
          >
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            <span className="hidden sm:inline">Queue</span>
            {stats && stats.pitched > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-brand text-white rounded-full font-mono font-bold">
                {stats.pitched}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-border-subtle mx-0.5" />

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-brand dark:hover:text-white rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle transition-colors touch-manipulation cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-subtle transition-colors relative touch-manipulation cursor-pointer"
            title="Settings & SMTP"
          >
            <RiSettings4Line className="h-4 w-4" />
            {tunnel && tunnel.isRunning && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface-0" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="border-t border-border-subtle/50 bg-surface-1/40 px-3 sm:px-6 lg:px-8 py-1.5">
          <div className="max-w-(--breakpoint-2xl) mx-auto flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                Vault: <strong className="text-gray-900 dark:text-white font-semibold">{stats.totalLeads}</strong>
              </span>
              <span className="text-border-subtle hidden sm:inline">•</span>
              <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400">
                No-Website: <strong className="font-semibold">{stats.noWebsite}</strong>
              </span>
              <span className="text-border-subtle hidden sm:inline">•</span>
              <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                Gold: <strong className="font-semibold">{stats.goldLeads}</strong>
              </span>
              <span className="text-border-subtle hidden sm:inline">•</span>
              <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400">
                Enriched: <strong className="font-semibold">{stats.enriched || 0}</strong>
              </span>
              <span className="text-border-subtle hidden sm:inline">•</span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                Won: <strong className="font-semibold">{stats.won}</strong>
              </span>
            </div>

            {tunnel && tunnel.publicUrl && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>HTTPS Live</span>
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
