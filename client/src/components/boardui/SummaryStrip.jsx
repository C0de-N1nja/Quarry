import React from 'react';
import { RiFlashlightFill } from '@remixicon/react';
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
  onStartOutreachBatch,
  totalCount
}) {
  const totalLeads = stats?.totalLeads ?? totalCount ?? 0;
  const noWebsite = stats?.noWebsite ?? 0;
  const readyToPitch = stats?.enriched ?? 0;
  const replied = stats?.replied ?? 0;
  const sentToday = stats?.sent ?? 0;

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
      badgeColor: 'text-rose-500',
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
      badgeColor: 'text-emerald-500',
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
      badgeColor: 'text-indigo-400',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('replied');
      }
    }
  ];

  return (
    <div className="w-full mb-3 rounded-2xl border border-separator-border bg-background-secondary-default/80 backdrop-blur-sm px-4 py-2.5 sm:px-5 flex flex-col md:flex-row items-center justify-between gap-3 min-h-[72px] shadow-xs">
      {/* 4 Clickable Metric Counters */}
      <div className="flex items-center gap-1 sm:gap-2 w-full md:w-auto overflow-x-auto py-1 scrollbar-none">
        {metrics.map((m, index) => (
          <React.Fragment key={m.id}>
            {index > 0 && (
              <div className="h-8 w-px bg-separator-border/80 shrink-0 mx-1 hidden sm:block" />
            )}
            <button
              type="button"
              onClick={m.onClick}
              className={cx(
                "group flex flex-col items-start px-3 py-1.5 rounded-xl transition-all cursor-pointer text-left shrink-0",
                m.isActive
                  ? "bg-background-tertiary-default ring-1 ring-separator-border shadow-2xs"
                  : "hover:bg-background-tertiary-default/60"
              )}
              title={`Filter by ${m.label} (${m.count.toLocaleString()})`}
            >
              <span className="text-[11px] font-medium text-text-tertiary group-hover:text-text-secondary transition-colors">
                {m.label}
              </span>
              <span className={cx(
                "text-lg font-bold font-mono tracking-tight leading-tight",
                m.isActive ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
              )}>
                {m.count.toLocaleString()}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Right Action: Capacity text + Sole Primary Button on screen */}
      <div className="flex items-center justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-separator-border/60 pt-2 md:pt-0">
        <div className="text-right">
          <span className="text-xs font-mono font-medium text-text-secondary">
            Sent today <strong className="text-text-primary font-bold">{sentToday}</strong> / 143
          </span>
        </div>

        <Button
          size="small"
          variant="primary"
          leadingIcon={RiFlashlightFill}
          onClick={onStartOutreachBatch}
          className="shadow-sm font-semibold whitespace-nowrap cursor-pointer"
          title="Start Daily Outreach automation"
        >
          Start Daily Outreach
        </Button>
      </div>
    </div>
  );
}
