import React, { useState } from 'react';
import { 
  RiFlashlightFill, RiDashboardLine, RiKanbanView2, 
  RiLayoutGridLine, RiRadarLine, RiMailSendLine, 
  RiSettings4Line, RiSunLine, RiMoonLine, RiSearch2Line,
  RiDatabase2Line, RiShieldCheckLine, RiArrowLeftSLine,
  RiArrowRightSLine, RiUserLine, RiUploadCloud2Line, RiDownload2Line
} from '@remixicon/react';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';

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
      <div className="p-3.5 border-b border-separator-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-accent-500 to-indigo-500 flex items-center justify-center text-white shadow-2xs ring-1 ring-white/20 shrink-0">
            <RiFlashlightFill className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-text-primary tracking-tight flex items-center gap-1.5 truncate">
                <span>Quarry</span>
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-accent-500/20 text-accent-500">OS</span>
              </h1>
              <p className="text-[10px] text-text-tertiary font-mono truncate">Lead Mining & OSINT</p>
            </div>
          )}
        </div>

        <IconButton
          size="small"
          icon={collapsed ? RiArrowRightSLine : RiArrowLeftSLine}
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="shrink-0 text-text-tertiary hover:text-text-primary"
        />
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
        <div className="flex items-center justify-between gap-1">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl text-text-secondary hover:bg-background-tertiary-default transition-colors cursor-pointer flex items-center gap-2 ${
              collapsed ? 'w-full justify-center' : ''
            }`}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? (
              <RiSunLine className="h-4 w-4 text-warning-primary" />
            ) : (
              <RiMoonLine className="h-4 w-4 text-indigo-500" />
            )}
            {!collapsed && (
              <span className="text-xs font-medium">
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
            )}
          </button>

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
