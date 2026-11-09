import React from 'react';
import { 
  RiDashboardLine, 
  RiGlobalLine, 
  RiCheckDoubleLine, 
  RiChat3Line,
  RiFlashlightFill
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { cx } from '@/utils/cx';

export default function SummaryStrip({
  stats,
  activeFilter,
  contactChannel,
  focusTier,
  onFilterChange,
  onContactChannelChange,
  onFocusTierChange,
  onStartDailyOutreach,
  totalCount
}) {
  const totalLeads = stats?.totalLeads ?? totalCount ?? 0;
  const noWebsite = stats?.noWebsite ?? 0;
  const readyToPitch = stats?.enriched ?? 0;
  const replied = stats?.replied ?? 0;
  const pitchedToday = stats?.pitched ?? 0;

  // Active filter states matching tabs exactly
  const isTotalActive = activeFilter === 'all' && contactChannel === 'all' && focusTier === 'vault';
  const isNoWebsiteActive = activeFilter === 'no_website';
  const isReadyToPitchActive = activeFilter === 'enriched';
  const isRepliedActive = activeFilter === 'replied';

  const metrics = [
    {
      id: 'total',
      label: 'Total prospects',
      count: totalLeads,
      isActive: isTotalActive,
      icon: RiDashboardLine,
      iconSquareClass: 'bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)]',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('all');
      }
    },
    {
      id: 'no_website',
      label: 'No website',
      count: noWebsite,
      isActive: isNoWebsiteActive,
      icon: RiGlobalLine,
      iconSquareClass: 'bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] border border-[var(--tint-danger-border)]',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('no_website');
      }
    },
    {
      id: 'ready_to_pitch',
      label: 'Ready to pitch',
      count: readyToPitch,
      isActive: isReadyToPitchActive,
      icon: RiCheckDoubleLine,
      iconSquareClass: 'bg-[var(--tint-success-bg)] text-[var(--tint-success-text)] border border-[var(--tint-success-border)]',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('enriched');
      }
    },
    {
      id: 'replied',
      label: 'Replied',
      count: replied,
      isActive: isRepliedActive,
      icon: RiChat3Line,
      iconSquareClass: 'bg-[var(--tint-violet-bg)] text-[var(--tint-violet-text)] border border-[var(--tint-violet-border)]',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('replied');
      }
    }
  ];

  return (
    <div className="w-full mb-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5 sm:px-5 flex flex-col md:flex-row items-center justify-between gap-3 min-h-[72px] shadow-xs">
      {/* 4 Clickable Metric Counters */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 w-full md:w-auto overflow-x-auto py-1 scrollbar-none">
        {metrics.map((m, index) => {
          const Icon = m.icon;
          return (
            <React.Fragment key={m.id}>
              {index > 0 && (
                <div className="h-8 w-px bg-[var(--card-border)] shrink-0 mx-0.5 hidden sm:block" />
              )}
              <button
                type="button"
                onClick={m.onClick}
                className={cx(
                  "group flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-left shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
                  m.isActive
                    ? "bg-[var(--brand-tint-bg)] border border-[var(--brand-tint-border)] ring-1 ring-[var(--brand-tint-border)] shadow-2xs"
                    : "hover:bg-[var(--tint-neutral-bg)] border border-transparent"
                )}
                title={`Filter by ${m.label} (${m.count.toLocaleString()})`}
                aria-label={`Filter by ${m.label}: ${m.count.toLocaleString()}`}
              >
                {/* Rounded Icon Square with Tint */}
                <div className={cx(
                  "flex size-8 items-center justify-center rounded-lg shrink-0",
                  m.iconSquareClass
                )}>
                  <Icon className="size-4" aria-hidden="true" />
                </div>

                {/* Metric Label & Count */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {m.label}
                  </span>
                  <span className="text-base font-bold font-mono tracking-tight leading-tight text-[var(--text-primary)]">
                    {m.count.toLocaleString()}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Right Action: Sent today X / 143 + One Solid Indigo Primary Button */}
      <div className="flex items-center justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-[var(--card-border)] pt-2 md:pt-0">
        <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
          Sent today <strong className="font-semibold text-[var(--text-primary)] font-mono">{pitchedToday}</strong> / 143
        </span>

        <button
          type="button"
          onClick={() => {
            if (onStartDailyOutreach) {
              onStartDailyOutreach();
            } else if (onFilterChange) {
              onFilterChange('enriched');
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--brand-solid)] hover:bg-[var(--brand-solid-hover)] text-white shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 transition-colors shrink-0"
          title="Launch daily outreach triage on high-intent prospects"
        >
          <RiFlashlightFill className="size-3.5" aria-hidden="true" />
          <span>Start Daily Outreach</span>
        </button>
      </div>
    </div>
  );
}
