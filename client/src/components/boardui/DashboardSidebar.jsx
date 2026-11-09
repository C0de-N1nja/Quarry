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
import { cx } from '@/utils/cx';

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

  return (
    <aside 
      className={cx(
        "shrink-0 transition-all duration-300 ease-in-out border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col justify-between z-30 select-none",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Top Branding & Workspace */}
      <div className={cx(
        "p-3.5 border-b border-[var(--card-border)] flex items-center",
        collapsed ? "justify-center relative" : "justify-between gap-2"
      )}>
        <div className={cx("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
          <button
            type="button"
            onClick={() => collapsed && setCollapsed(false)}
            className={cx(
              "size-9 rounded-xl bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 dark:border-neutral-800 shadow-xs flex items-center justify-center text-white shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "cursor-pointer hover:scale-105 transition-transform"
            )}
            title={collapsed ? "Quarry — Click to expand sidebar" : "Quarry"}
            aria-label="Quarry logo"
          >
            <QuarryLogo size={20} />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-[var(--text-primary)] tracking-tight truncate">
                Quarry
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">Client acquisition software</p>
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
            className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--tint-neutral-bg)]"
          />
        )}

        {/* Expand Toggle when Collapsed */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="absolute -right-3 top-5 z-40 size-6 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs hover:shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <RiArrowRightSLine className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-2.5 space-y-3 overflow-y-auto">
        
        {/* Core Nav: Leads, Pipeline (Kanban), Find Leads, Outreach Queue, Settings */}
        <div className="space-y-1">
          {/* Leads Navigation Item */}
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'table'
                ? "bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] font-semibold shadow-2xs border border-[var(--card-border)]/60"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="Leads"
            aria-current={viewMode === 'table' ? 'page' : undefined}
          >
            <RiDashboardLine className={cx("size-4 shrink-0", viewMode === 'table' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">Leads</span>
                {totalLeads > 0 && (
                  <span className={cx(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border",
                    "bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)]"
                  )}>
                    {totalLeads.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Pipeline (Kanban) Navigation Item */}
          <button
            type="button"
            onClick={() => onViewModeChange('kanban')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'kanban'
                ? "bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] font-semibold shadow-2xs border border-[var(--card-border)]/60"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="Pipeline (Kanban)"
            aria-current={viewMode === 'kanban' ? 'page' : undefined}
          >
            <RiKanbanView2 className={cx("size-4 shrink-0", viewMode === 'kanban' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Pipeline (Kanban)</span>
            )}
          </button>

          {/* Find Leads Action */}
          <button
            type="button"
            onClick={() => onOpenSearch && onOpenSearch('search')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-l-[3px] border-l-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "justify-center px-0"
            )}
            title="Find Leads"
          >
            <RiSearch2Line className="size-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            {!collapsed && <span className="flex-1 text-left truncate">Find Leads</span>}
          </button>

          {/* Settings Action */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-l-[3px] border-l-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "justify-center px-0"
            )}
            title="Settings"
          >
            <RiSettings4Line className="size-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            {!collapsed && <span className="flex-1 text-left truncate">Settings</span>}
          </button>
        </div>
      </div>

      {/* Bottom Status / Error Indicator (Visible ONLY when something is wrong) */}
      {systemError && (
        <div className="p-3 border-t border-[var(--card-border)] bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] text-xs flex items-center gap-2">
          <RiAlertLine className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate font-medium">{systemError}</span>}
        </div>
      )}
    </aside>
  );
}
