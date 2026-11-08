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
      <div className="flex items-center justify-between px-5 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
            isRunning ? 'bg-accent-500/15 border-accent-500/30 text-accent-500' : 'bg-background-tertiary-default border-separator-border text-text-secondary'
          }`}>
            <RiShieldCheckLine className={`h-5 w-5 ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">
                OSINT Social Website Verifier
              </h2>
              <Chip variant="subtle" color={isRunning ? "amber" : isCompleted ? "emerald" : "neutral"} size="sm">
                {isRunning ? `Running (${job?.activeThreads || job?.concurrency || 8} CPU Workers)` : isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Ready'}
              </Chip>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Probing Facebook, Instagram, LinkedIn, X, TikTok & Linktree to classify authentic no-website prospects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-background-tertiary-default border border-separator-border text-xs font-mono font-semibold text-text-secondary flex items-center gap-1.5">
            <RiTimeLine className="h-3.5 w-3.5 text-text-secondary" />
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
        <div className="flex flex-col gap-2 px-5 py-2.5 bg-background-secondary-default border-b border-separator-border shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider shrink-0 mr-1">
              OSINT Target Scope:
            </span>

            {targetLeadIds.length > 0 && (
              <button
                type="button"
                onClick={() => !isRunning && startBatchRun('selected')}
                disabled={isRunning}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                  activeScope === 'selected'
                    ? 'bg-accent-500 text-white shadow-2xs'
                    : 'bg-background-secondary-default text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary border border-separator-border'
                }`}
              >
                <span>{targetLeadIds.length} Selected Leads</span>
              </button>
            )}

            {/* No-Website Leads */}
            <button
              type="button"
              onClick={() => !isRunning && startBatchRun('no_website', 'all')}
              disabled={isRunning}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'no_website'
                  ? 'bg-danger-primary text-white shadow-2xs'
                  : 'bg-background-secondary-default text-danger-primary hover:bg-background-tertiary-default border border-separator-border'
              }`}
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
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'gold'
                  ? 'bg-warning-primary text-white shadow-2xs'
                  : 'bg-background-secondary-default text-warning-primary hover:bg-background-tertiary-default border border-separator-border'
              }`}
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
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'whatsapp'
                  ? 'bg-success-primary text-white shadow-2xs'
                  : 'bg-background-secondary-default text-success-primary hover:bg-background-tertiary-default border border-separator-border'
              }`}
              title="Target WhatsApp-ready prospects to extract owner emails and social proof"
            >
              <span>WhatsApp Ready</span>
              {stats?.withWhatsApp !== undefined && (
                <span className="text-[10px] font-mono opacity-80">({stats.withWhatsApp})</span>
              )}
            </button>

            {/* Social Media DM */}
            <button
              type="button"
              onClick={() => !isRunning && startBatchRun('social', 'all')}
              disabled={isRunning}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'social'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-background-secondary-default text-purple-600 dark:text-purple-400 hover:bg-background-tertiary-default border border-separator-border'
              }`}
              title="Target Instagram / Facebook profile leads to discover direct decision maker emails"
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
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'phone'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-background-secondary-default text-amber-600 dark:text-amber-400 hover:bg-background-tertiary-default border border-separator-border'
              }`}
              title="Target phone-verified leads to probe for digital channels"
            >
              <span>Phone Available</span>
              {stats?.withPhoneOnly !== undefined && (
                <span className="text-[10px] font-mono opacity-80">({stats.withPhoneOnly})</span>
              )}
            </button>

            {/* Daily Target 143 */}
            <button
              type="button"
              onClick={() => !isRunning && startBatchRun('today', 'all')}
              disabled={isRunning}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'today'
                  ? 'bg-accent-500 text-white shadow-2xs'
                  : 'bg-background-secondary-default text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary border border-separator-border'
              }`}
              title="Target today's daily 143 quota"
            >
              <span>Daily 143</span>
            </button>

            {/* All Vault Leads */}
            <button
              type="button"
              onClick={() => !isRunning && startBatchRun('all', 'all')}
              disabled={isRunning}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                activeScope === 'all' && selectedCategory === 'all'
                  ? 'bg-accent-500 text-white shadow-2xs'
                  : 'bg-background-secondary-default text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary border border-separator-border'
              }`}
              title="Run OSINT across all vault leads"
            >
              <span>All Vault ({stats?.totalLeads || 0})</span>
            </button>

            {/* Niche Dropdown */}
            <div className="relative inline-flex items-center shrink-0 ml-1">
              <select
                value={selectedCategory}
                disabled={isRunning}
                onChange={(e) => !isRunning && startBatchRun(activeScope, e.target.value)}
                className="appearance-none bg-background-secondary-default text-text-primary text-xs rounded-lg px-2.5 pr-7 py-1 border border-separator-border focus:border-accent-500 cursor-pointer font-medium disabled:opacity-50"
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
            <div className="ml-auto flex items-center bg-background-secondary-default px-2.5 py-1 rounded-lg border border-separator-border" title="When checked, bypasses the 14-day local cache and forces live web & DNS checks on all leads">
              <Switch
                size="sm"
                isSelected={forceRefresh}
                onChange={setForceRefresh}
                isDisabled={isRunning}
              >
                <span className="font-semibold text-[11px] text-text-primary">
                  Force Fresh Re-Scan
                </span>
              </Switch>
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
            <div className="w-full h-2.5 bg-background-tertiary-default rounded-full overflow-hidden border border-separator-border">
              <div 
                className="h-full bg-linear-to-r from-accent-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border">
              <span className="text-[10px] text-text-tertiary font-mono uppercase block">Has Website</span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                {job?.hasWebsiteCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border">
              <span className="text-[10px] text-text-tertiary font-mono uppercase block">No Website</span>
              <span className="text-lg font-bold font-mono text-danger-primary">
                {job?.noWebsiteCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border">
              <span className="text-[10px] text-text-tertiary font-mono uppercase block">Uncertain</span>
              <span className="text-lg font-bold font-mono text-warning-primary">
                {job?.uncertainCount || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border">
              <span className="text-[10px] text-text-tertiary font-mono uppercase block">Failed / Errors</span>
              <span className="text-lg font-bold font-mono text-text-tertiary">
                {job?.failedCount || 0}
              </span>
            </div>
          </div>

          {/* Currently Active Lead Banner */}
          {job?.currentLead && isRunning && (
            <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <RiLoader4Line className="h-4 w-4 text-accent-500 animate-spin shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary truncate">
                      {job.currentLead.businessName}
                    </span>
                    {job.currentLead.city && (
                      <span className="text-[11px] text-text-tertiary font-mono">
                        ({job.currentLead.city})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-accent-500 font-mono truncate mt-0.5">
                    {job.currentLead.message || 'Processing lead...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                <span className={`px-2 py-0.5 rounded font-medium ${
                  job.currentLead.step === 'finding_profiles' ? 'bg-accent-500 text-white font-bold' : 'bg-background-tertiary-default text-text-tertiary'
                }`}>
                  1. Profiles
                </span>
                <span className={`px-2 py-0.5 rounded font-medium ${
                  job.currentLead.step === 'scanning_bio' ? 'bg-accent-500 text-white font-bold' : 'bg-background-tertiary-default text-text-tertiary'
                }`}>
                  2. Bios
                </span>
                <span className={`px-2 py-0.5 rounded font-medium ${
                  job.currentLead.step === 'verifying_site' ? 'bg-accent-500 text-white font-bold' : 'bg-background-tertiary-default text-text-tertiary'
                }`}>
                  3. Verify
                </span>
                <span className={`px-2 py-0.5 rounded font-medium ${
                  job.currentLead.step === 'enriching_contacts' ? 'bg-accent-500 text-white font-bold' : 'bg-background-tertiary-default text-text-tertiary'
                }`}>
                  4. Contacts
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-danger-primary/10 border border-danger-primary/30 text-danger-primary text-xs flex items-center gap-2">
              <RiErrorWarningLine className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Queue Items Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {(!job?.items || job.items.length === 0) ? (
            <div className="h-40 flex flex-col items-center justify-center text-text-tertiary text-xs gap-2">
              <RiLoader4Line className="h-6 w-6 animate-spin text-accent-500" />
              <span>Initializing OSINT batch worker...</span>
            </div>
          ) : (
            job.items.map((item, idx) => (
              <div 
                key={item.leadId}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
                  item.status === 'running' ? 'bg-accent-500/5 border-accent-500/40 shadow-2xs' :
                  item.decision === 'has_website' ? 'bg-blue-500/5 border-blue-500/20' :
                  item.decision === 'no_website' ? 'bg-background-secondary-default border-separator-border' :
                  item.decision === 'uncertain' ? 'bg-warning-primary/5 border-warning-primary/20' :
                  'bg-background-secondary-default border-separator-border opacity-75'
                }`}
              >
                {/* Left: Lead identifier + city */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[10px] font-bold text-text-tertiary bg-background-tertiary-default px-1.5 py-0.5 rounded shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary truncate">
                        {item.businessName}
                      </span>
                      {item.city && (
                        <span className="text-[11px] text-text-secondary truncate">
                          • {item.city}
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
                        <RiGlobalLine className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.verifiedWebsite}</span>
                        <RiExternalLinkLine className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-text-tertiary block mt-0.5">
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
                        <span className="px-1.5 py-0.5 rounded bg-background-tertiary-default text-text-secondary flex items-center gap-1">
                          <RiMailLine className="h-2.5 w-2.5 text-accent-500" />
                          <span className="truncate max-w-[120px]">{item.contacts.primary_email}</span>
                        </span>
                      )}
                      {item.contacts.whatsapp && (
                        <span className="px-1.5 py-0.5 rounded bg-success-primary/15 text-success-primary font-bold">
                          WhatsApp
                        </span>
                      )}
                    </div>
                  )}

                  {/* Decision Badge */}
                  {item.status === 'queued' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-background-tertiary-default text-text-tertiary border border-separator-border">
                      Queued
                    </span>
                  )}
                  {item.status === 'running' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent-500/15 text-accent-500 border border-accent-500/30 flex items-center gap-1">
                      <RiLoader4Line className="h-3 w-3 animate-spin" />
                      <span>Running</span>
                    </span>
                  )}
                  {item.status === 'done' && item.decision === 'has_website' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-accent-500/10 text-accent-500 border border-accent-500/30">
                      Has Website
                    </span>
                  )}
                  {item.status === 'done' && item.decision === 'no_website' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-danger-primary/10 text-danger-primary border border-danger-primary/30">
                      No Website
                    </span>
                  )}
                  {item.status === 'uncertain' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-warning-primary/10 text-warning-primary border border-warning-primary/30">
                      Uncertain
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-danger-primary/10 text-danger-primary border border-danger-primary/30">
                      Failed
                    </span>
                  )}
                  {item.status === 'cancelled' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-background-tertiary-default text-text-tertiary">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ModalBody>

      {/* Footer Actions */}
      <ModalFooter className="flex items-center justify-between px-5 py-3.5 border-t border-separator-border bg-background-secondary-default shrink-0">
        <div className="text-xs text-text-secondary">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-accent-500 font-medium">
              <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
              <span>Engine active in background...</span>
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1 text-success-primary font-medium">
              <RiCheckboxCircleLine className="h-3.5 w-3.5" />
              <span>Batch verification finished!</span>
            </span>
          ) : isCancelled ? (
            <span className="text-warning-primary font-medium">
              Run stopped by user.
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <Button
              variant="danger"
              size="small"
              leadingIcon={RiStopCircleLine}
              onClick={handleCancel}
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
