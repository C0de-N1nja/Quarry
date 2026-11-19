import React, { useState, useEffect } from 'react';
import { 
  RiDashboardLine, 
  RiKanbanView2, 
  RiCalendarCheckLine,
  RiSearch2Line,
  RiSettings4Line, 
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiAlertLine,
  RiTimeLine,
  RiMailLine,
  RiWhatsappLine,
  RiArrowDownSLine,
  RiUser3Line,
  RiMoonLine,
  RiSunLine
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
  onOpenOnboarding,
  onOpenBatchQueue,
  activeFilter,
  onFilterChange,
  theme,
  onToggleTheme
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
  const followUpsDue = stats?.followUpsDue || 0;
  const followUpsOverdue = stats?.followUpsOverdue || 0;

  return (
    <aside 
      className={cx(
        "shrink-0 transition-all duration-300 ease-in-out border-r border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col justify-between z-30 select-none",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Top Workspace Header */}
      <div className={cx(
        "p-3 border-b border-[var(--card-border)] flex items-center",
        collapsed ? "justify-center relative" : "justify-between gap-2"
      )}>
        <div className={cx("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
          {/* Workspace Avatar */}
          <div className="size-9 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
            A
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">Anonymous</span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)] px-1 py-0.2 rounded bg-[var(--tint-neutral-bg)] border border-[var(--card-border)]">Owner</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">Quarry Enterprise</p>
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

      {/* Main Categorized Navigation */}
      <div className="flex-1 p-2.5 space-y-5 overflow-y-auto">
        
        {/* Category 1: DAILY WORK */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Daily Work
            </div>
          )}

          {/* Item 1.1: Who to Message Today */}
          <button
            type="button"
            onClick={() => {
              onViewModeChange('table');
              if (onFilterChange) onFilterChange('follow_up');
            }}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'table' && activeFilter === 'follow_up'
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-2xs"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title={`Who to Message Today (${followUpsDue} due${followUpsOverdue ? `, ${followUpsOverdue} overdue` : ''})`}
            aria-current={viewMode === 'table' && activeFilter === 'follow_up' ? 'page' : undefined}
          >
            <RiCalendarCheckLine className={cx(
              "size-4 shrink-0", 
              viewMode === 'table' && activeFilter === 'follow_up' 
                ? (theme === 'dark' ? "text-neutral-900" : "text-white")
                : (followUpsOverdue > 0 ? "text-rose-500 animate-pulse" : "text-[var(--text-secondary)]")
            )} aria-hidden="true" />
            
            {!collapsed ? (
              <>
                <span className="flex-1 text-left truncate">Who to Message Today</span>
                {followUpsDue > 0 && (
                  <span className={cx(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border transition-colors",
                    followUpsOverdue > 0
                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  )}>
                    {followUpsDue}
                  </span>
                )}
              </>
            ) : (
              followUpsDue > 0 && (
                <span className={cx(
                  "absolute top-1.5 right-1.5 size-2 rounded-full",
                  followUpsOverdue > 0 ? "bg-rose-500 ring-2 ring-[var(--card-bg)]" : "bg-amber-500"
                )} />
              )
            )}
          </button>

          {/* Item 1.2: Call & Action History */}
          <button
            type="button"
            onClick={() => onViewModeChange('activity')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'activity'
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-2xs"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="Call & Action History"
            aria-current={viewMode === 'activity' ? 'page' : undefined}
          >
            <RiTimeLine className={cx("size-4 shrink-0", viewMode === 'activity' ? (theme === 'dark' ? "text-neutral-900" : "text-white") : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Call & Action History</span>
            )}
          </button>
        </div>

        {/* Category 2: FIND & MANAGE */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Find & Manage
            </div>
          )}

          {/* Item 2.1: Search Businesses (Full-Page Find Prospects) */}
          <button
            type="button"
            onClick={() => onViewModeChange('search')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'search'
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-2xs"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="Search Businesses"
            aria-current={viewMode === 'search' ? 'page' : undefined}
          >
            <RiSearch2Line className={cx("size-4 shrink-0", viewMode === 'search' ? (theme === 'dark' ? "text-neutral-900" : "text-white") : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Search Businesses</span>
            )}
          </button>

          {/* Item 2.2: All Saved Leads */}
          <button
            type="button"
            onClick={() => {
              onViewModeChange('table');
              if (onFilterChange && activeFilter === 'follow_up') onFilterChange('all');
            }}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'table' && activeFilter !== 'follow_up'
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-2xs"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="All Saved Leads"
            aria-current={viewMode === 'table' && activeFilter !== 'follow_up' ? 'page' : undefined}
          >
            <RiDashboardLine className={cx("size-4 shrink-0", viewMode === 'table' && activeFilter !== 'follow_up' ? (theme === 'dark' ? "text-neutral-900" : "text-white") : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">All Saved Leads</span>
                {totalLeads > 0 && (
                  <span className={cx(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border",
                    viewMode === 'table' && activeFilter !== 'follow_up'
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900 border-transparent"
                      : "bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] border-[var(--card-border)]"
                  )}>
                    {totalLeads.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Item 2.3: Sales Board (Kanban) */}
          <button
            type="button"
            onClick={() => onViewModeChange('kanban')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              viewMode === 'kanban'
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-2xs"
                : "border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              collapsed && "justify-center px-0"
            )}
            title="Sales Board"
            aria-current={viewMode === 'kanban' ? 'page' : undefined}
          >
            <RiKanbanView2 className={cx("size-4 shrink-0", viewMode === 'kanban' ? (theme === 'dark' ? "text-neutral-900" : "text-white") : "text-[var(--text-secondary)]")} aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Sales Board</span>
            )}
          </button>
        </div>

        {/* Category 3: MESSAGES */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Messages
            </div>
          )}

          {/* Item 3.1: Message Templates */}
          <button
            type="button"
            onClick={() => onOpenSettings && onOpenSettings('templates')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "justify-center px-0"
            )}
            title="Message Templates"
          >
            <RiMailLine className="size-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Message Templates</span>
            )}
          </button>

          {/* Item 3.2: Bulk WhatsApp Sender */}
          <button
            type="button"
            onClick={() => onOpenBatchQueue && onOpenBatchQueue()}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "justify-center px-0"
            )}
            title="Bulk WhatsApp Sender"
          >
            <RiWhatsappLine className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {!collapsed && (
              <span className="flex-1 text-left truncate">Bulk WhatsApp Sender</span>
            )}
          </button>
        </div>

        {/* Category 4: SETTINGS */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Settings
            </div>
          )}

          {/* Item 4.1: App Settings */}
          <button
            type="button"
            onClick={() => onOpenSettings && onOpenSettings('general')}
            className={cx(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-transparent text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
              collapsed && "justify-center px-0"
            )}
            title="App Settings"
          >
            <RiSettings4Line className="size-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            {!collapsed && <span className="flex-1 text-left truncate">App Settings</span>}
          </button>
        </div>
      </div>

      {/* Bottom User Profile & Theme Bar */}
      <div className="p-3 border-t border-[var(--card-border)] bg-[var(--card-bg)] space-y-2">
        <div className={cx(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed ? (
            <div className="min-w-0 flex items-center gap-2">
              <div className="size-7 rounded-lg bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                <RiUser3Line className="size-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">Anonymous</p>
                <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">rehanbaig2003@gmail.com</p>
              </div>
            </div>
          ) : (
            <div className="size-7 rounded-lg bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] shrink-0" title="rehanbaig2003@gmail.com">
              <RiUser3Line className="size-3.5" aria-hidden="true" />
            </div>
          )}

          {onToggleTheme && !collapsed && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="size-7 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--tint-neutral-bg)] flex items-center justify-center transition-colors cursor-pointer"
              title={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <RiSunLine className="size-3.5" aria-hidden="true" />
              ) : (
                <RiMoonLine className="size-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Bottom Error Indicator (Visible ONLY when something is degraded) */}
        {systemError && (
          <div className="p-2 rounded-lg bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] text-[11px] flex items-center gap-1.5 font-medium">
            <RiAlertLine className="size-3.5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{systemError}</span>}
          </div>
        )}
      </div>
    </aside>
  );
}
