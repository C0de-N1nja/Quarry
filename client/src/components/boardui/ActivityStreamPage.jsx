import React, { useState, useEffect } from 'react';
import { 
  RiTimeLine, 
  RiPhoneLine, 
  RiWhatsappLine, 
  RiMailLine, 
  RiBookmarkLine,
  RiSearch2Line,
  RiRefreshLine,
  RiBuilding2Line,
  RiArrowRightLine,
  RiFilterLine,
  RiUserSharedLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { cx } from '@/utils/cx';

export default function ActivityStreamPage({
  onSelectLead,
  onViewSavedLeads,
  onOpenSearch
}) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      let url = '/api/leads/activities/all?limit=150';
      if (channelFilter !== 'all') {
        url += `&channel=${encodeURIComponent(channelFilter)}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActivities(data.activities || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch activity stream', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [channelFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchActivities();
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'phone':
        return <RiPhoneLine className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case 'whatsapp':
        return <RiWhatsappLine className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case 'email':
        return <RiMailLine className="size-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />;
      default:
        return <RiBookmarkLine className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
    }
  };

  const getChannelBadge = (channel) => {
    switch (channel) {
      case 'phone':
        return <Chip variant="subtle" color="emerald">Phone Call</Chip>;
      case 'whatsapp':
        return <Chip variant="subtle" color="emerald">WhatsApp</Chip>;
      case 'email':
        return <Chip variant="subtle" color="sky">Cold Email</Chip>;
      default:
        return <Chip variant="subtle" color="neutral">Note</Chip>;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-(--breakpoint-2xl) mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Daily Work</span>
            <span className="text-[var(--text-secondary)]">/</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Call & Action History
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Master record of every call, WhatsApp message, email, and note logged across all businesses.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="small"
            variant="secondary"
            onClick={fetchActivities}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RiRefreshLine className={cx("size-4", isLoading && "animate-spin")} aria-hidden="true" />
            <span>Refresh</span>
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={onViewSavedLeads}
            className="gap-1.5"
          >
            <span>View All Leads</span>
            <RiArrowRightLine className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-3 shadow-xs">
        {/* Channel Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'phone', label: 'Phone Calls' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'email', label: 'Emails' },
            { id: 'manual', label: 'Notes' }
          ].map(ch => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChannelFilter(ch.id)}
              className={cx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer",
                channelFilter === ch.id
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)] hover:text-[var(--text-primary)]"
              )}
            >
              {ch.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <RiSearch2Line className="absolute left-3 top-2.5 size-4 text-[var(--text-secondary)]" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action notes or leads..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </form>
      </div>

      {/* Activities Feed */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl">
          <div className="size-8 mx-auto border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">Loading interaction history...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
          <div className="size-12 rounded-2xl bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
            <RiTimeLine className="size-6" aria-hidden="true" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No recorded actions yet</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              When you call business owners, send WhatsApp messages, or log follow-up notes inside any business dossier, they will be archived here in chronological order.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button size="small" variant="secondary" onClick={onViewSavedLeads}>
              Go to Saved Leads
            </Button>
            <Button size="small" variant="primary" onClick={onOpenSearch}>
              Search New Businesses
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div 
              key={act.id}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="size-9 rounded-xl bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 mt-0.5">
                  {getChannelIcon(act.channel)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectLead && onSelectLead({ id: act.lead_id, name: act.lead_name })}
                      className="text-sm font-bold text-[var(--text-primary)] hover:underline flex items-center gap-1.5 cursor-pointer text-left truncate"
                    >
                      <RiBuilding2Line className="size-3.5 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                      <span>{act.lead_name || `Business #${act.lead_id}`}</span>
                    </button>
                    {getChannelBadge(act.channel)}
                    {act.lead_stage && (
                      <Chip variant="subtle" color="neutral" className="capitalize text-[10px]">
                        {act.lead_stage}
                      </Chip>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {act.title}
                  </p>

                  {act.details && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap bg-[var(--tint-neutral-bg)]/50 p-2.5 rounded-lg border border-[var(--card-border)]/50">
                      {act.details}
                    </p>
                  )}

                  {act.lead_phone && (
                    <div className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1.5 pt-1">
                      <RiPhoneLine className="size-3" aria-hidden="true" />
                      <span>{act.lead_phone}</span>
                      {act.lead_city && <span>• {act.lead_city}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--card-border)]">
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {formatDate(act.created_at)}
                </span>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => onSelectLead && onSelectLead({ id: act.lead_id, name: act.lead_name })}
                  className="text-xs gap-1"
                >
                  <span>Open Dossier</span>
                  <RiArrowRightLine className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
