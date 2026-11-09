import React, { useState } from 'react';
import { 
  RiFlashlightFill, RiDashboardLine, RiKanbanView2, 
  RiLayoutGridLine, RiRadarLine, RiMailSendLine, 
  RiSettings4Line, RiSunLine, RiMoonClearLine, RiSearch2Line,
  RiDatabase2Line, RiShieldCheckLine, RiArrowLeftSLine,
  RiArrowRightSLine, RiUserLine, RiUploadCloud2Line, RiDownload2Line,
  RiCompass3Line
} from '@remixicon/react';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { QuarryLogo } from './QuarryLogo';

export default function DashboardSidebar({
  viewMode,
  onViewModeChange,
  stats,
  theme,
  onToggleTheme,
  onOpenSearch,
  onOpenAutoPilot,
  onOpenQueue,
  onOpenSettings,
  onExportExcel,
  onOpenOnboarding,
  activeFilter,
  onFilterChange,
  tunnel
}) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      id: 'split',
      label: 'Fast Triage (Split)',
      icon: RiLayoutGridLine,
      mode: 'split',
      badge: null
    },
    {
      id: 'table',
      label: 'Leads Table',
      icon: RiDashboardLine,
      mode: 'table',
      badge: stats?.totalLeads || 0
    },
    {
      id: 'kanban',
      label: 'Deal Pipeline (Kanban)',
      icon: RiKanbanView2,
      mode: 'kanban',
      badge: stats?.totalPipelineValue ? `$${Math.round(stats.totalPipelineValue / 1000)}k` : null
    }
  ];

  return (
    <aside 
      className={`shrink-0 transition-all duration-300 ease-in-out border-r border-separator-border bg-background-secondary-default backdrop-blur-xl flex flex-col justify-between z-30 select-none ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Top Branding & Workspace */}
      <div className={`p-3.5 border-b border-separator-border flex items-center ${collapsed ? 'justify-center relative' : 'justify-between gap-2'}`}>
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
          <button
            type="button"
            onClick={() => collapsed && setCollapsed(false)}
            className={`h-9 w-9 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xs flex items-center justify-center text-white ring-1 ring-white/10 shrink-0 ${
              collapsed ? 'cursor-pointer hover:scale-105 transition-transform' : ''
            }`}
            title={collapsed ? "Quarry — Click to expand sidebar" : "Quarry"}
          >
            <QuarryLogo size={20} />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-text-primary tracking-tight truncate">
                Quarry
              </h1>
              <p className="text-[10px] text-text-tertiary font-mono truncate">Lead Mining & OSINT</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <IconButton
            size="small"
            icon={RiArrowLeftSLine}
            aria-label="Collapse Sidebar"
            onClick={() => setCollapsed(true)}
            title="Collapse Sidebar"
            className="shrink-0 text-text-tertiary hover:text-text-primary"
          />
        )}

        {/* Floating Border Expand Toggle when Collapsed */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand Sidebar"
            title="Expand Sidebar"
            className="absolute -right-3 top-5 z-40 size-6 rounded-full border border-separator-border bg-background-primary-default text-text-secondary hover:text-text-primary shadow-xs hover:shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-all"
          >
            <RiArrowRightSLine className="size-3.5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-2.5 space-y-4 overflow-y-auto">
        {/* Core Views */}
        <div>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5 font-semibold">
              Views & Pipeline
            </p>
          )}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = viewMode === item.mode;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewModeChange(item.mode)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-accent-500 text-white shadow-2xs'
                      : 'text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-background-tertiary-default text-text-tertiary'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Autonomous Agents & Automation */}
        <div>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5 font-semibold">
              Agents & Automation
            </p>
          )}
          <div className="space-y-1">
            <button
              onClick={() => onOpenAutoPilot && onOpenAutoPilot()}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Launch Auto-Pilot Batch Pipeline"
            >
              <RiFlashlightFill className="size-4 text-accent-500 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">Auto-Pilot Agent</span>
                  <span className="h-2 w-2 rounded-full bg-success-primary animate-pulse shrink-0" />
                </>
              )}
            </button>

            <button
              onClick={() => onOpenOnboarding && onOpenOnboarding()}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Launch Discovery Wizard (Onboarding)"
            >
              <RiCompass3Line className="size-4 text-emerald-500 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">Discovery Wizard</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Setup</span>
                </>
              )}
            </button>

            <button
              onClick={() => onOpenSearch && onOpenSearch('search')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Find Leads via Google Maps & Web Crawler"
            >
              <RiSearch2Line className="h-4 w-4 text-blue-500 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">Find Leads</span>}
            </button>

            <button
              onClick={() => onOpenSearch && onOpenSearch('csv')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Import Prospects from CSV"
            >
              <RiUploadCloud2Line className="h-4 w-4 text-purple-500 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">CSV Ingestion</span>}
            </button>

            <button
              onClick={onExportExcel}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Export Leads to Excel (.xlsx)"
            >
              <RiDownload2Line className="h-4 w-4 text-success-primary shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">Export Excel</span>}
            </button>

            <button
              onClick={onOpenQueue}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary transition-colors cursor-pointer ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Outbox Staging Queue"
            >
              <RiMailSendLine className="h-4 w-4 text-warning-primary shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">Outreach Queue</span>
                  {stats && stats.pitched > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-accent-500 text-white rounded-full font-mono font-bold">
                      {stats.pitched}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fast Priority Filters */}
        {!collapsed && (
          <div>
            <p className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5 font-semibold">
              Fast Filters
            </p>
            <div className="space-y-1">
              <button
                onClick={() => onFilterChange && onFilterChange(activeFilter === 'no_website' ? 'all' : 'no_website')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === 'no_website'
                    ? 'bg-danger-primary/15 text-danger-primary border border-danger-primary/30'
                    : 'text-text-secondary hover:bg-background-tertiary-default'
                }`}
              >
                <span>No-Website</span>
                <Chip variant="subtle" color={activeFilter === 'no_website' ? 'rose' : 'gray'} size="sm" className="font-mono">
                  {stats?.noWebsite || 0}
                </Chip>
              </button>

              <button
                onClick={() => onFilterChange && onFilterChange(activeFilter === 'gold' ? 'all' : 'gold')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === 'gold'
                    ? 'bg-warning-primary/15 text-warning-primary border border-warning-primary/30'
                    : 'text-text-secondary hover:bg-background-tertiary-default'
                }`}
              >
                <span>Gold Targets</span>
                <Chip variant="subtle" color={activeFilter === 'gold' ? 'amber' : 'gray'} size="sm" className="font-mono">
                  {stats?.goldLeads || 0}
                </Chip>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer: Theme, Settings & Status */}
      <div className="p-3 border-t border-separator-border bg-background-secondary-default space-y-2">
        <div className={`flex items-center gap-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Theme Toggle Button (BoardUI Moon-Star / Sun Icon Button) */}
          <IconButton
            size="small"
            icon={theme === 'dark' ? RiSunLine : RiMoonClearLine}
            aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={onToggleTheme}
            className={theme === 'dark' ? "text-warning-primary hover:text-warning-hover" : "text-indigo-500 hover:text-indigo-600"}
          />

          {!collapsed && (
            <IconButton
              size="small"
              icon={RiSettings4Line}
              aria-label="Settings & SMTP"
              onClick={onOpenSettings}
              title="Settings & SMTP"
              className="text-text-tertiary hover:text-text-primary"
            />
          )}
        </div>

        {/* Public Tunnel Live Badge */}
        {!collapsed && tunnel && tunnel.isRunning && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-success-primary/10 text-success-primary border border-success-primary/20 text-[10px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success-primary animate-pulse shrink-0" />
            <span className="truncate">Public HTTPS Live</span>
          </div>
        )}
      </div>
    </aside>
  );
}
