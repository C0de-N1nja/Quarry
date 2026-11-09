import React from 'react';
import { 
  RiFolderUserLine, 
  RiGlobalLine, 
  RiCheckDoubleLine, 
  RiChat1Line
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { cx } from '@/utils/cx';

export default function SummaryStrip({
  stats,
  activeFilter,
  contactChannel,
  focusTier,
  onFilterChange,
  onContactChannelChange,
  onFocusTierChange,
  totalCount
}) {
  const totalLeads = stats?.totalLeads ?? totalCount ?? 0;
  const noWebsite = stats?.noWebsite ?? 0;
  const readyToPitch = stats?.enriched ?? 0;
  const replied = stats?.replied ?? 0;

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
      icon: RiFolderUserLine,
      chipColor: 'blue',
      chipText: 'Vault',
      tileTone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
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
      chipColor: 'rose',
      chipText: 'High intent',
      tileTone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
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
      chipColor: 'lime',
      chipText: 'Verified',
      tileTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
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
      icon: RiChat1Line,
      chipColor: 'purple',
      chipText: 'In conversation',
      tileTone: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      onClick: () => {
        if (onFocusTierChange) onFocusTierChange('vault');
        if (onContactChannelChange) onContactChannelChange('all');
        if (onFilterChange) onFilterChange('replied');
      }
    }
  ];

  return (
    <div className="w-full mb-3 rounded-2xl border border-separator-border bg-background-secondary-default p-2 sm:p-2.5 shadow-xs">
      {/* 4 Clickable BoardUI Metric Tiles spanning full width */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={m.onClick}
              className={cx(
                "group flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left w-full",
                "button-press-motion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
                m.isActive
                  ? "bg-background-primary-default border-accent-500 text-text-primary shadow-xs ring-1 ring-accent-500"
                  : "bg-background-primary-default/60 hover:bg-background-primary-default border-separator-border/70 hover:border-border-button-hover text-text-secondary hover:text-text-primary"
              )}
              title={`Filter by ${m.label} (${m.count.toLocaleString()})`}
              aria-label={`Filter by ${m.label}: ${m.count.toLocaleString()}`}
            >
              {/* BoardUI Icon Tile */}
              <div className={cx(
                "flex size-8 items-center justify-center rounded-lg border shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                m.tileTone
              )}>
                <Icon className="size-4" aria-hidden="true" />
              </div>

              {/* Metric Label & Count */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  {m.label}
                </span>
                <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-text-primary leading-tight mt-0.5">
                  {m.count.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
