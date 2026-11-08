import React from 'react';
import { 
  RiFlashlightFill, 
  RiMailSendLine, 
  RiCheckDoubleLine, 
  RiFireLine, 
  RiArrowRightLine,
  RiTimeLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';

export default function DailyFocusHero({
  stats,
  leads = [],
  onStartOutreachBatch,
  onOpenQueue,
  onSelectPresetTab
}) {
  const totalCount = stats?.totalLeads || leads.length;
  const noWebsiteCount = stats?.noWebsite || 0;
  const readyToPitchCount = stats?.enriched || leads.filter(l => l.email && (l.has_no_website || l.website_status === 'missing')).length || Math.min(noWebsiteCount, 25);
  const activeFollowUps = stats?.pitched || 0;

  return (
    <div className="mb-4 rounded-2xl border border-separator-border bg-gradient-to-r from-accent-500/10 via-background-secondary-default/80 to-background-secondary-default p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Avatar + Greeting & Stat Punchlines */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent-600 text-white shadow-xs ring-2 ring-accent-500/20 shrink-0">
            <RiFlashlightFill className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-body-large font-bold tracking-tight text-text-primary">
                Daily Outreach Cockpit
              </h2>
              <Chip variant="bold" color="lime" className="font-mono text-[10px]">
                {readyToPitchCount} Ready to Pitch
              </Chip>
              {activeFollowUps > 0 && (
                <Chip variant="subtle" color="indigo" size="sm" className="font-mono text-[10px]">
                  {activeFollowUps} In Follow-Up
                </Chip>
              )}
            </div>
            <p className="text-body-small text-text-secondary mt-1 leading-snug">
              You have <strong className="text-text-primary font-semibold">{readyToPitchCount} verified prospects</strong> with active contact intel ready for automated outreach today.
            </p>
          </div>
        </div>

        {/* Right Side: Primary 1-Click Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap">
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiFlashlightFill}
            onClick={onStartOutreachBatch}
            className="flex-1 sm:flex-initial"
            title="Launch 1-Click Multi-Stage Pipeline on top prospects"
          >
            Start Daily Outreach
          </Button>

          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiMailSendLine}
            onClick={onOpenQueue}
            className="flex-1 sm:flex-initial"
            title="Inspect Outbox Queue & Scheduled Drips"
          >
            <span>Outbox Queue</span>
            {activeFollowUps > 0 && (
              <span className="ml-1 rounded-full bg-accent-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                {activeFollowUps}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
