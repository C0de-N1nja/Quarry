import React from 'react';
import { 
  RiCopperCoinLine, RiBuildingLine, RiShieldCheckLine, 
  RiFireLine, RiArrowUpLine, RiArrowDownLine 
} from '@remixicon/react';

export default function BoardStatCards({ stats }) {
  const cards = [
    {
      label: 'Pipeline Value',
      value: `$${(stats?.totalPipelineValue || 0).toLocaleString()}`,
      delta: '+$142k',
      isPositive: true,
      caption: 'vs previous batch',
      icon: RiCopperCoinLine,
      gradient: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/10'
    },
    {
      label: 'No-Website Targets',
      value: String(stats?.noWebsite || 0),
      delta: 'High Intent',
      isPositive: true,
      caption: 'Zero digital footprint verified',
      icon: RiFireLine,
      gradient: 'from-rose-500 to-orange-500',
      glow: 'shadow-rose-500/10'
    },
    {
      label: 'Decision Makers Found',
      value: String(stats?.decisionMakers || 0),
      delta: `${stats?.totalLeads ? Math.round(((stats.decisionMakers || 0) / stats.totalLeads) * 100) : 0}%`,
      isPositive: true,
      caption: 'Direct owners & verified cell/email',
      icon: RiShieldCheckLine,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/10'
    },
    {
      label: 'Total Leads Vault',
      value: String(stats?.totalLeads || 0),
      delta: `${stats?.goldLeads || 0} Gold`,
      isPositive: true,
      caption: 'Enriched prospects ready for outreach',
      icon: RiBuildingLine,
      gradient: 'from-purple-500 to-indigo-600',
      glow: 'shadow-purple-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div 
            key={idx}
            className={`p-3.5 rounded-2xl bg-surface-1 dark:bg-surface-1/90 border border-border-subtle shadow-card hover:shadow-dropdown transition-all flex flex-col justify-between ${c.glow}`}
          >
            {/* Top row: Icon tile & Delta chip */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className={`h-10 w-10 rounded-xl bg-linear-to-b ${c.gradient} flex items-center justify-center text-white shadow-sm ring-1 ring-white/20`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-surface-2 dark:bg-surface-3 text-emerald-600 dark:text-emerald-400 border border-border-subtle">
                <RiArrowUpLine className="h-3 w-3" />
                <span>{c.delta}</span>
              </span>
            </div>

            {/* Bottom row: Value, Label, and Caption */}
            <div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {c.value}
              </div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                {c.label}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                {c.caption}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
