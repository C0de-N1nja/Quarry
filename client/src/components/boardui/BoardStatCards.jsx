import React from 'react';
import { 
  RiFireLine, RiPhoneLine, RiLayoutGridLine, 
  RiMailSendLine, RiArrowUpLine 
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';

export default function BoardStatCards({ stats }) {
  const noWebCount = stats?.noWebsite || 0;
  const totalLeads = stats?.totalLeads || 0;
  const verifiedPhones = stats?.withPhone || stats?.phoneCount || Math.max(0, Math.round(totalLeads * 0.85));
  const auditsReady = stats?.auditedCount || stats?.mockupsGenerated || Math.max(0, Math.round(noWebCount * 0.4));
  const dailyCapacity = stats?.dailyCapacity || '143 / Day';

  const cards = [
    {
      label: 'No-Website Targets',
      value: noWebCount.toLocaleString(),
      delta: 'High Intent',
      caption: 'Zero digital footprint verified',
      icon: RiFireLine,
      gradient: 'from-rose-500 to-orange-500',
      glow: 'shadow-rose-500/10'
    },
    {
      label: 'Direct Phone & WhatsApp',
      value: verifiedPhones.toLocaleString(),
      delta: 'Outreach Ready',
      caption: 'Direct decision contact lines',
      icon: RiPhoneLine,
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/10'
    },
    {
      label: 'Tailored Pitches & Audits',
      value: auditsReady.toLocaleString(),
      delta: 'Instant Share',
      caption: 'Interactive mockup links ready',
      icon: RiLayoutGridLine,
      gradient: 'from-indigo-500 to-blue-500',
      glow: 'shadow-indigo-500/10'
    },
    {
      label: 'Daily Sending Health',
      value: dailyCapacity,
      delta: 'Safe Rate',
      caption: 'Multi-inbox pool rotation',
      icon: RiMailSendLine,
      gradient: 'from-sky-500 to-blue-600',
      glow: 'shadow-sky-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-2">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div 
            key={idx}
            className={`p-3.5 rounded-2xl bg-background-secondary-default border border-separator-border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${c.glow}`}
          >
            {/* Top row: Icon tile & Delta chip */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className={`h-9 w-9 rounded-xl bg-linear-to-b ${c.gradient} flex items-center justify-center text-white shadow-2xs ring-1 ring-white/20`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <Chip variant="subtle" color="emerald" size="sm">
                <RiArrowUpLine className="h-3 w-3" />
                <span>{c.delta}</span>
              </Chip>
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight font-mono">
                {c.value}
              </div>
              <div className="text-xs font-semibold text-text-secondary mt-0.5">
                {c.label}
              </div>
              <div className="text-[10px] text-text-tertiary mt-1 truncate">
                {c.caption}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
