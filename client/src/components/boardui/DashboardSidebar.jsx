import React, { useState, useEffect } from 'react';
import { 
  RiDashboardLine, 
  RiKanbanView2, 
  RiSearch2Line,
  RiSettings4Line, 
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAlertLine
} from '@remixicon/react';
import { IconButton } from '@/components/base/buttons/icon-button';
import { QuarryLogo } from './QuarryLogo';

export default function DashboardSidebar({
  viewMode,
  onViewModeChange,
  stats,
  onOpenSearch,
  onOpenSettings,
  onOpenOnboarding
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [systemError, setSystemError] = useState(null);

  // Monitor health silently — show status indicator ONLY when something is wrong
  useEffect(() => {
    let isMounted = true;
    const checkSystemHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          if (isMounted) setSystemError('System warning: service degraded');
        } else {
          if (isMounted) setSystemError(null);
        }
      } catch (err) {
        if (isMounted) setSystemError('System offline');
      }
    };
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const totalLeads = stats?.totalLeads || 0;
  const inFlightCount = stats?.pitched || 0;

  return (
    <aside 
      className={`shrink-0 transition-all duration-300 ease-in-out border-r border-separator-border bg-background-secondary-default backdrop-blur-xl flex flex-col justify-between z-30 select-none ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
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
            aria-label="Quarry logo"
          >
            <QuarryLogo size={20} />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-text-primary tracking-tight truncate">
                Quarry
              </h1>
              <p className="text-[10px] text-text-tertiary font-mono truncate">Client acquisition software</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <IconButton
            size="small"
            variant="ghost"
            icon={RiArrowLeftSLine}
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="shrink-0 text-text-tertiary hover:text-text-primary"
          />
        )}

        {/* Expand Toggle when Collapsed */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="absolute -right-3 top-5 z-40 size-6 rounded-full border border-separator-border bg-background-primary-default text-text-secondary hover:text-text-primary shadow-xs hover:shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-all"
          >
            <RiArrowRightSLine className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-2.5 space-y-3 overflow-y-auto">
        
        {/* Core Nav: Leads, Pipeline (Kanban), Find Leads, Outreach Queue, Settings */}
        <div className="space-y-1">
          {/* Leads */}
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-background-tertiary-default text-text-primary shadow-2xs border border-separator-border/60'
                : 'text-text-secondary hover:bg-background-tertiary-default/60 hover:text-text-primary'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title="Leads"
          >
            <RiDashboardLine className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">Leads</span>
                {totalLeads > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    viewMode === 'table'
                      ? 'bg-background-primary-default text-text-primary border border-separator-border/80 font-bold'
                      : 'bg-background-tertiary-default text-text-tertiary'
                  }`}>
                    {totalLeads.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Pipeline (Kanban) */}
          <button
            type="button"
            onClick={() => onViewModeChange('kanban')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-background-tertiary-default text-text-primary shadow-2xs border border-separator-border/60'
                : 'text-text-secondary hover:bg-background-tertiary-default/60 hover:text-text-primary'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title="Pipeline (Kanban)"
          >
            <RiKanbanView2 className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">Pipeline (Kanban)</span>
                {inFlightCount > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    viewMode === 'kanban'
                      ? 'bg-background-primary-default text-text-primary border border-separator-border/80 font-bold'
                      : 'bg-background-tertiary-default text-text-tertiary'
                  }`}>
                    {inFlightCount}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Find Leads */}
          <button
            type="button"
            onClick={() => onOpenSearch && onOpenSearch('search')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default/60 hover:text-text-primary transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Find Leads"
          >
            <RiSearch2Line className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="flex-1 text-left truncate">Find Leads</span>}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-background-tertiary-default/60 hover:text-text-primary transition-colors cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Settings"
          >
            <RiSettings4Line className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="flex-1 text-left truncate">Settings</span>}
          </button>
        </div>
      </div>

      {/* Bottom Footer: Status Indicator ONLY when something is wrong */}
      {systemError && !collapsed && (
        <div className="p-3 border-t border-separator-border bg-rose-500/10 text-rose-500 flex items-center gap-2 text-[11px] font-medium">
          <RiAlertLine className="size-4 shrink-0 animate-pulse" aria-hidden="true" />
          <span className="truncate">{systemError}</span>
        </div>
      )}
    </aside>
  );
}
