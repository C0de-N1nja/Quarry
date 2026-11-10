import React, { useState, useEffect, useRef } from 'react';
import { 
  RiShieldCheckLine, 
  RiCheckboxCircleLine, 
  RiErrorWarningLine, 
  RiAlertLine, 
  RiLoader4Line, 
  RiGlobalLine, 
  RiPhoneLine, 
  RiMailLine, 
  RiTimeLine, 
  RiRefreshLine, 
  RiStopCircleLine, 
  RiExternalLinkLine, 
  RiSparklingLine, 
  RiUserFollowLine, 
  RiFireLine,
  RiCloseLine,
  RiArrowDownSLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { Switch } from '@/components/base/switch/switch';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { cx } from '@/utils/cx';

function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function OsintRunModal({ 
  jobId: initialJobId = null,
  targetLeadIds = [],
  filter = 'all',
  category = 'all',
  focusTier = 'vault',
  contactChannel = 'all',
  searchTerm = '',
  collections = [],
  stats = null,
  limit = 100,
  onClose, 
  onRunCompleted 
}) {
  const [jobId, setJobId] = useState(initialJobId);
  const [activeScope, setActiveScope] = useState(() => {
    if (targetLeadIds && targetLeadIds.length > 0) return 'selected';
    if (filter === 'no_website') return 'no_website';
    if (focusTier === 'gold') return 'gold';
    if (focusTier === 'today') return 'today';
    if (contactChannel === 'has_social') return 'social';
    if (contactChannel === 'has_whatsapp') return 'whatsapp';
    if (contactChannel === 'phone_only') return 'phone';
    if (category && category !== 'all') return 'category';
    return 'all';
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    // If the scope is an explicit global scope, don't restrict to a previously active niche unless category was explicitly passed for category scope
    if (filter === 'no_website' || focusTier === 'gold' || focusTier === 'today') {
      return 'all';
    }
    return category || 'all';
  });
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(true);

  const sseRef = useRef(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const stopTelemetry = () => {
    if (sseRef.current) {
      try { sseRef.current.close(); } catch (e) {}
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTelemetry = (targetJobId) => {
    stopTelemetry();

    // 1. SSE Connection
    try {
      const sse = new EventSource(`/api/osint/stream/${targetJobId}`);
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.jobId) {
            setJob(data);
            if (data.status === 'completed' || data.status === 'cancelled') {
              if (data.status === 'cancelled') {
                stopTelemetry();
              }
              if (onRunCompleted) onRunCompleted(data);
            }
          }
        } catch (e) {}
      };

      sse.onerror = () => {
        if (sseRef.current) {
          try { sseRef.current.close(); } catch (e) {}
          sseRef.current = null;
        }
      };
    } catch (e) {}

    // 2. Polling Fallback (dual transport resilience)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/osint/telemetry/${targetJobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.jobId) {
            setJob(data);
            if (data.status === 'completed' || data.status === 'cancelled') {
              if (data.status === 'cancelled') {
                stopTelemetry();
              }
              if (onRunCompleted) onRunCompleted(data);
            }
          }
        }
      } catch (e) {}
    }, 1000);
  };

  const startBatchRun = async (scopeToRun = activeScope, catToRun = selectedCategory, forceOverride = undefined) => {
    setActiveScope(scopeToRun);
    setSelectedCategory(catToRun);
    setLoading(true);
    setError(null);
    setJob(null);
    stopTelemetry();
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let runFilter = 'all';
    let runTier = null;
    let runBatchMode = null;
    let runChannel = 'all';
    let runCategory = catToRun;
    let runLeadIds = targetLeadIds;

    if (scopeToRun === 'selected') {
      runLeadIds = targetLeadIds;
    } else {
      runLeadIds = [];
      if (scopeToRun === 'no_website') {
        runFilter = 'no_website';
      } else if (scopeToRun === 'gold') {
        runTier = 'gold';
      } else if (scopeToRun === 'today') {
        runBatchMode = 'today';
      } else if (scopeToRun === 'whatsapp') {
        runChannel = 'has_whatsapp';
      } else if (scopeToRun === 'social') {
        runChannel = 'has_social';
      } else if (scopeToRun === 'phone') {
        runChannel = 'phone_only';
      } else if (scopeToRun === 'current') {
        runFilter = filter;
        runTier = focusTier === 'gold' ? 'gold' : null;
        runBatchMode = focusTier === 'today' ? 'today' : null;
        runChannel = contactChannel;
        runCategory = category;
      }
    }

    try {
      const shouldForce = forceOverride !== undefined ? forceOverride : forceRefresh;
      const res = await fetch('/api/osint/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: runLeadIds,
          filter: runFilter,
          category: runCategory,
          tier: runTier,
          batchMode: runBatchMode,
          contactChannel: runChannel,
          search: searchTerm,
          limit,
          forceRefresh: shouldForce
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to start OSINT run');

      setJobId(data.jobId);
      startTelemetry(data.jobId);
    } catch (err) {
      setError(err.message || 'Failed to start OSINT batch');
    } finally {
      setLoading(false);
    }
  };

  // Launch batch run on mount or attach to initialJobId
  useEffect(() => {
    if (initialJobId) {
      startTelemetry(initialJobId);
    } else {
      startBatchRun(activeScope, selectedCategory);
    }

    return () => {
      stopTelemetry();
    };
  }, [initialJobId]);

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      stopTelemetry();
      setJob(prev => prev ? {
        ...prev,
        status: 'cancelled',
        isCancelled: true,
        currentLead: null,
        currentStep: 'cancelled',
        activeThreads: 0,
        items: (prev.items || []).map(i => (i.status === 'queued' || i.status === 'running') ? { ...i, status: 'cancelled' } : i)
      } : null);
      await fetch(`/api/osint/cancel/${jobId}`, { method: 'POST' });
      if (onRunCompleted) onRunCompleted({ status: 'cancelled', jobId });
    } catch (e) {}
  };

  const handleRetryFailed = async () => {
    if (!job || !job.items) return;
    const failedLeadIds = job.items
      .filter(i => i.status === 'failed' || i.status === 'uncertain' || i.status === 'cancelled')
      .map(i => i.leadId);

    if (failedLeadIds.length === 0) return;

    setLoading(true);
    setError(null);
    stopTelemetry();

    try {
      const res = await fetch('/api/osint/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: failedLeadIds, forceRefresh: true, retryFailedOnly: true })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setJobId(data.jobId);
      startTelemetry(data.jobId);
    } catch (err) {
      setError(err.message || 'Failed to retry failed leads');
    } finally {
      setLoading(false);
    }
  };

  const total = job?.total || targetLeadIds.length || limit;
  const processed = job?.processed || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const isRunning = job?.status === 'running' || loading;
  const isCompleted = job?.status === 'completed';
  const isCancelled = job?.status === 'cancelled';

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open && !isRunning) onClose(); }}
      size="xl"
      aria-label="OSINT Social Website Verifier"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-3">
          <div className={cx(
            "size-10 rounded-xl border flex items-center justify-center transition-colors shadow-2xs",
            isRunning
              ? "bg-accent-500/10 border-accent-500/30 text-accent-500"
              : "bg-background-tertiary-default border-separator-border text-text-secondary"
          )}>
            <RiShieldCheckLine className={cx("size-5", isRunning && "animate-pulse")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-text-primary">
                Lead Research & Contact Finder
              </h2>
              <Chip
                variant="subtle"
                color={isRunning ? "blue" : isCompleted ? "green" : isCancelled ? "neutral" : "neutral"}
                className="gap-1 font-mono text-[11px]"
              >
                <StatusDot color={isRunning ? "blue" : isCompleted ? "green" : "neutral"} />
                <span>
                  {isRunning
                    ? `Running (${job?.activeThreads || job?.concurrency || 5} Workers)`
                    : isCompleted
                    ? 'Completed'
                    : isCancelled
                    ? 'Cancelled'
                    : 'Ready'}
                </span>
              </Chip>
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">
              Autonomous verification of owner contacts, phone line carrier types, and social profiles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 rounded-lg bg-background-tertiary-default border border-separator-border text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5 shadow-2xs">
            <RiTimeLine className="size-3.5 text-text-tertiary" />
            <span>{formatTimer(job?.elapsedSeconds || elapsedSeconds)}</span>
          </div>
          <CloseButton
            size="md"
            onClick={onClose}
            aria-label="Close Modal"
          />
        </div>
      </div>

      {/* Modal Body */}
      <ModalBody className="p-0 gap-0 overflow-y-auto flex-1 flex flex-col">
        {/* Multi-Scope OSINT Target Selector Strip */}
        <div className="flex flex-col gap-2.5 px-6 py-3 bg-background-primary-default border-b border-separator-border shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-[11px] font-mono font-semibold text-text-tertiary uppercase tracking-wider mr-1">
                Scope:
              </span>

              {targetLeadIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => !isRunning && startBatchRun('selected')}
                  disabled={isRunning}
                  className={cx(
                    "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                    activeScope === 'selected'
                      ? "bg-accent-500 text-white font-semibold shadow-2xs"
                      : "bg-background-secondary-default text-text-secondary hover:text-text-primary border border-separator-border"
                  )}
                >
                  <span>{targetLeadIds.length} Selected Leads</span>
                </button>
              )}

              {/* No-Website Leads */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('no_website', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'no_website'
                    ? "bg-rose-500/15 border border-rose-500/40 text-rose-500 font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-rose-500 border border-separator-border"
                )}
                title="Target prospects verified without a website across all niches"
              >
                <span>No Website</span>
                {stats?.noWebsite !== undefined && (
                  <span className="text-[10px] font-mono opacity-80">({stats.noWebsite})</span>
                )}
              </button>

              {/* Gold Leads */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('gold', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'gold'
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-500 font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-amber-500 border border-separator-border"
                )}
                title="Target 4.5+ high reputation prospects with verified phone"
              >
                <span>Gold Leads</span>
                {stats?.goldLeads !== undefined && (
                  <span className="text-[10px] font-mono opacity-80">({stats.goldLeads})</span>
                )}
              </button>

              {/* WhatsApp Ready */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('whatsapp', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'whatsapp'
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-emerald-500 border border-separator-border"
                )}
                title="Target WhatsApp-ready prospects"
              >
                <span>WhatsApp Ready</span>
                {stats?.withWhatsApp !== undefined && (
                  <span className="text-[10px] font-mono opacity-80">({stats.withWhatsApp})</span>
                )}
              </button>

              {/* Social Media */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('social', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'social'
                    ? "bg-purple-500/15 border border-purple-500/40 text-purple-500 font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-purple-500 border border-separator-border"
                )}
                title="Target Instagram / Facebook profile leads"
              >
                <span>Social Media</span>
                {stats?.withSocial !== undefined && (
                  <span className="text-[10px] font-mono opacity-80">({stats.withSocial})</span>
                )}
              </button>

              {/* Phone Available */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('phone', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'phone'
                    ? "bg-blue-500/15 border border-blue-500/40 text-blue-500 font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-blue-500 border border-separator-border"
                )}
                title="Target phone-verified leads"
              >
                <span>Phone Available</span>
                {stats?.withPhoneOnly !== undefined && (
                  <span className="text-[10px] font-mono opacity-80">({stats.withPhoneOnly})</span>
                )}
              </button>

              {/* All Vault Leads */}
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('all', 'all')}
                disabled={isRunning}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50",
                  activeScope === 'all' && selectedCategory === 'all'
                    ? "bg-accent-500 text-white font-semibold shadow-2xs"
                    : "bg-background-secondary-default text-text-secondary hover:text-text-primary border border-separator-border"
                )}
                title="Run OSINT across all vault leads"
              >
                <span>All Vault ({stats?.totalLeads || 0})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Niche Dropdown */}
              <div className="relative inline-flex items-center shrink-0">
                <select
                  value={selectedCategory}
                  disabled={isRunning}
                  onChange={(e) => !isRunning && startBatchRun(activeScope, e.target.value)}
                  className="appearance-none bg-background-secondary-default text-text-primary text-xs rounded-lg px-2.5 pr-7 py-1 border border-separator-border focus:border-accent-500 cursor-pointer font-medium disabled:opacity-50 shadow-2xs"
                >
                  <option value="all">Any Niche / Category</option>
                  {collections.map(col => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.count})
                    </option>
                  ))}
                </select>
                <RiArrowDownSLine className="pointer-events-none absolute right-1.5 size-3.5 text-text-tertiary" />
              </div>

              {/* Force Refresh Cache Bypass Toggle */}
              <div className="flex items-center gap-2 bg-background-secondary-default px-2.5 py-1 rounded-lg border border-separator-border shadow-2xs" title="Bypasses local cache and forces live web & DNS checks">
                <Switch
                  size="sm"
                  isSelected={forceRefresh}
                  onChange={setForceRefresh}
                  isDisabled={isRunning}
                >
                  <span className="text-[11px] font-medium text-text-secondary select-none">
                    Force Fresh
                  </span>
                </Switch>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Strip & KPI Grid */}
        <div className="p-5 border-b border-separator-border bg-background-secondary-default space-y-4 shrink-0">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-text-primary">
                Progress: <strong className="text-accent-500">{processed}</strong> of <strong>{total}</strong> leads processed
              </span>
              <span className="font-bold text-accent-500">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-background-tertiary-default rounded-full overflow-hidden border border-separator-border/40">
              <div 
                className="h-full bg-accent-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border shadow-2xs">
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider block">Has Website</span>
              <span className="text-xl font-bold font-mono text-blue-500 mt-1 block">
                {job?.hasWebsiteCount || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border shadow-2xs">
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider block">No Website (Target)</span>
              <span className="text-xl font-bold font-mono text-rose-500 mt-1 block">
                {job?.noWebsiteCount || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border shadow-2xs">
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider block">Uncertain</span>
              <span className="text-xl font-bold font-mono text-amber-500 mt-1 block">
                {job?.uncertainCount || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border shadow-2xs">
              <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider block">Failed / Errors</span>
              <span className="text-xl font-bold font-mono text-text-tertiary mt-1 block">
                {job?.failedCount || 0}
              </span>
            </div>
          </div>

          {/* Currently Active Lead Banner */}
          {job?.currentLead && isRunning && (
            <div className="p-3.5 rounded-xl bg-background-primary-default border border-accent-500/30 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <RiLoader4Line className="size-4 text-accent-500 animate-spin shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {job.currentLead.businessName}
                    </span>
                    {job.currentLead.city && (
                      <span className="text-[11px] text-text-tertiary font-mono">
                        · {job.currentLead.city}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-accent-500 font-mono truncate mt-0.5">
                    {job.currentLead.message || 'Processing lead...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono">
                <span className={cx(
                  "px-2 py-0.5 rounded border transition-colors",
                  job.currentLead.step === 'finding_profiles'
                    ? "bg-accent-500 text-white font-semibold border-accent-500 shadow-2xs"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border"
                )}>
                  1. Profiles
                </span>
                <span className={cx(
                  "px-2 py-0.5 rounded border transition-colors",
                  job.currentLead.step === 'scanning_bio'
                    ? "bg-accent-500 text-white font-semibold border-accent-500 shadow-2xs"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border"
                )}>
                  2. Bios
                </span>
                <span className={cx(
                  "px-2 py-0.5 rounded border transition-colors",
                  job.currentLead.step === 'verifying_site'
                    ? "bg-accent-500 text-white font-semibold border-accent-500 shadow-2xs"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border"
                )}>
                  3. Verify
                </span>
                <span className={cx(
                  "px-2 py-0.5 rounded border transition-colors",
                  job.currentLead.step === 'enriching_contacts'
                    ? "bg-accent-500 text-white font-semibold border-accent-500 shadow-2xs"
                    : "bg-background-secondary-default text-text-tertiary border-separator-border"
                )}>
                  4. Contacts
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-danger-primary/10 border border-danger-primary/30 text-danger-primary text-xs flex items-center gap-2">
              <RiErrorWarningLine className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Queue Items Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {(!job?.items || job.items.length === 0) ? (
            <div className="h-40 flex flex-col items-center justify-center text-text-tertiary text-xs gap-2">
              <RiLoader4Line className="size-6 animate-spin text-accent-500" />
              <span className="font-mono">Initializing OSINT batch workers...</span>
            </div>
          ) : (
            job.items.map((item, idx) => (
              <div 
                key={item.leadId}
                className={cx(
                  "p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-2xs",
                  item.status === 'running' 
                    ? "bg-background-primary-default border-accent-500/40 ring-1 ring-accent-500/20" 
                    : item.decision === 'has_website'
                    ? "bg-background-primary-default border-blue-500/20"
                    : item.decision === 'no_website'
                    ? "bg-background-primary-default border-separator-border"
                    : item.decision === 'uncertain'
                    ? "bg-background-primary-default border-amber-500/20"
                    : "bg-background-primary-default border-separator-border opacity-75"
                )}
              >
                {/* Left: Lead identifier + city */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[10px] font-bold text-text-tertiary bg-background-secondary-default border border-separator-border size-6 rounded-lg flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary truncate">
                        {item.businessName}
                      </span>
                      {item.city && (
                        <span className="text-[11px] text-text-tertiary truncate">
                          · {item.city}
                        </span>
                      )}
                    </div>

                    {/* Verified Website Link or Profiles */}
                    {item.verifiedWebsite ? (
                      <a
                        href={item.verifiedWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-accent-500 hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        <RiGlobalLine className="size-3 shrink-0" />
                        <span className="truncate">{item.verifiedWebsite}</span>
                        <RiExternalLinkLine className="size-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-text-tertiary block mt-0.5 font-sans">
                        {item.status === 'queued' ? 'Queued for social scan...' :
                         item.status === 'running' ? 'Scanning profiles & verifying links...' :
                         item.decision === 'no_website' ? 'Verified zero standalone website (authentic prospect)' :
                         item.decision === 'uncertain' ? 'Ambiguous link; manual review required' :
                         item.error || 'Pending'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Contacts */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Contacts Summary */}
                  {item.contacts && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-tertiary">
                      {item.contacts.primary_email && (
                        <span className="px-2 py-0.5 rounded-md bg-background-secondary-default border border-separator-border text-text-primary flex items-center gap-1 font-sans">
                          <RiMailLine className="size-2.5 text-blue-500" />
                          <span className="truncate max-w-[130px]">{item.contacts.primary_email}</span>
                        </span>
                      )}
                      {item.contacts.whatsapp && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold">
                          WhatsApp
                        </span>
                      )}
                    </div>
                  )}

                  {/* Decision Badge */}
                  {item.status === 'queued' && (
                    <Chip variant="subtle" color="neutral" size="sm">
                      Queued
                    </Chip>
                  )}
                  {item.status === 'running' && (
                    <Chip variant="subtle" color="blue" size="sm" className="gap-1 font-mono">
                      <RiLoader4Line className="size-3 animate-spin text-accent-500" />
                      <span>Scanning</span>
                    </Chip>
                  )}
                  {item.status === 'done' && item.decision === 'has_website' && (
                    <Chip variant="subtle" color="blue" size="sm">
                      Has Website
                    </Chip>
                  )}
                  {item.status === 'done' && item.decision === 'no_website' && (
                    <Chip variant="bold" color="rose" size="sm">
                      No Website
                    </Chip>
                  )}
                  {item.status === 'uncertain' && (
                    <Chip variant="subtle" color="amber" size="sm">
                      Uncertain
                    </Chip>
                  )}
                  {item.status === 'failed' && (
                    <Chip variant="subtle" color="neutral" size="sm">
                      Failed
                    </Chip>
                  )}
                  {item.status === 'cancelled' && (
                    <Chip variant="subtle" color="neutral" size="sm">
                      Cancelled
                    </Chip>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ModalBody>

      {/* Footer Actions */}
      <ModalFooter className="flex items-center justify-between px-6 py-3.5 border-t border-separator-border bg-background-secondary-default shrink-0">
        <div className="text-xs text-text-secondary">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-text-secondary font-medium">
              <StatusDot color="blue" />
              <span>Parallel workers scanning leads in background...</span>
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <StatusDot color="green" />
              <span>Batch verification finished!</span>
            </span>
          ) : isCancelled ? (
            <span className="text-amber-500 font-medium flex items-center gap-1.5">
              <StatusDot color="amber" />
              <span>Run stopped by user.</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiStopCircleLine}
              onClick={handleCancel}
              className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 font-semibold"
            >
              Cancel Run
            </Button>
          )}

          {!isRunning && (job?.failedCount > 0 || job?.uncertainCount > 0) && (
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiRefreshLine}
              onClick={handleRetryFailed}
            >
              Retry Failed / Uncertain ({job.failedCount + job.uncertainCount})
            </Button>
          )}

          <Button
            variant={isCompleted ? "primary" : "secondary"}
            size="small"
            onClick={onClose}
          >
            {isRunning ? 'Run in Background' : 'Done'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
