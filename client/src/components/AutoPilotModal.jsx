import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, Play, CheckCircle2, AlertTriangle, AlertCircle, 
  Loader2, Globe, Phone, Mail, Sparkles, Clock, ArrowRight,
  ShieldCheck, Smartphone, Check, RefreshCw, Terminal, PauseCircle
} from 'lucide-react';

export default function AutoPilotModal({ 
  preSelectedLeads = [], 
  initialFilter = 'discovered',
  onClose, 
  onPipelineUpdated,
  onOpenQueue 
}) {
  const safePreSelected = Array.isArray(preSelectedLeads) ? preSelectedLeads : [];
  const defaultScope = safePreSelected.length > 0 
    ? 'selected' 
    : (initialFilter === 'no_website' ? 'no_website' : 'discovered');

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);

  // Configuration options
  const [targetScope, setTargetScope] = useState(defaultScope);
  const [batchLimit, setBatchLimit] = useState(10);
  const [selectedAngle, setSelectedAngle] = useState(defaultScope === 'no_website' ? 'no_website_showcase' : 'mockup_pitch');
  const [dispatchMode, setDispatchMode] = useState('queue'); // 'queue', 'prepare_only', 'send'
  const [skipExistingEnriched, setSkipExistingEnriched] = useState(true);

  // Progress tracking
  const [totalLeads, setTotalLeads] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLeadName, setCurrentLeadName] = useState('');
  const [currentLeadSteps, setCurrentLeadSteps] = useState({});
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);

  const terminalEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (text, type = 'info') => {
    const timestamp = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date());

    setLogs(prev => [...prev, { text, type, timestamp }]);
  };

  const handleStartAutoPilot = async () => {
    setRunning(true);
    setCompleted(false);
    setError(null);
    setLogs([]);
    setCurrentIndex(0);
    setCurrentLeadName('');
    setCurrentLeadSteps({});
    setSummary(null);

    addLog('Initializing Auto-Pilot engine...', 'info');

    const leadIds = targetScope === 'selected' 
      ? safePreSelected.map(l => (typeof l === 'object' && l !== null ? l.id : l)) 
      : [];

    const payload = {
      leadIds,
      filter: targetScope === 'selected' ? null : targetScope,
      limit: targetScope === 'selected' ? leadIds.length : batchLimit,
      angle: selectedAngle,
      dispatchMode,
      skipExistingEnriched
    };

    try {
      // Use SSE streaming endpoint for live updates
      const response = await fetch('/api/autopilot/run?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder

        for (const block of lines) {
          const matchEvent = block.match(/event:\s*(\w+)/);
          const matchData = block.match(/data:\s*(.+)/s);

          if (matchEvent && matchData) {
            const eventName = matchEvent[1];
            try {
              const data = JSON.parse(matchData[1]);
              handleEvent(eventName, data);
            } catch (err) {
              console.error('Failed to parse SSE payload', err);
            }
          }
        }
      }

      setRunning(false);
      setCompleted(true);
      if (onPipelineUpdated) onPipelineUpdated();
    } catch (err) {
      setError(err.message || 'Auto-Pilot pipeline encountered an error');
      addLog(`[ERROR] ${err.message}`, 'error');
      setRunning(false);
    }
  };

  const handleEvent = (eventName, data) => {
    switch (eventName) {
      case 'start':
        setTotalLeads(data.total);
        addLog(`Started pipeline targeting ${data.total} leads (Angle: ${data.angle}, Mode: ${data.dispatchMode})`, 'success');
        break;

      case 'lead_start':
        setCurrentIndex(data.index);
        setCurrentLeadName(data.businessName);
        setCurrentLeadSteps({});
        addLog(`[${data.index}/${totalLeads || data.total}] Starting prospect: "${data.businessName}"`, 'lead');
        break;

      case 'lead_step':
        setCurrentLeadSteps(prev => ({
          ...prev,
          [data.step]: { status: data.status, msg: data.msg }
        }));
        addLog(`  ↳ ${data.step.toUpperCase()}: ${data.msg}`, data.status === 'warning' ? 'warn' : 'info');
        break;

      case 'lead_done':
        if (data.success) {
          addLog(`✓ Finished: "${data.businessName}" successfully processed`, 'success');
        } else {
          addLog(`✗ Failed: "${data.businessName}" - ${data.error}`, 'error');
        }
        break;

      case 'complete':
        setSummary(data);
        addLog(`🏁 Auto-Pilot Finished: Processed ${data.processed} | Enriched ${data.enriched} | Mockups ${data.mockupsBuilt} | Queued ${data.pitchesQueued}`, 'success');
        break;

      case 'error':
        setError(data.error);
        addLog(`[FATAL] ${data.error}`, 'error');
        break;

      default:
        break;
    }
  };

  const progressPercent = totalLeads > 0 ? Math.round((currentIndex / totalLeads) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border-subtle rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-2/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-amber-500 to-brand flex items-center justify-center text-white shadow-md shadow-brand/20">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Auto-Pilot Batch Pipeline</h2>
                <span className="px-2 py-0.2 text-[10px] font-mono rounded-full bg-brand/10 text-brand border border-brand/20">
                  Full Automation
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                OSINT ➔ Phone ➔ Interactive Prototype ➔ Spintax Pitch ➔ Smart Outbox
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={running}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Configuration View (when not running and not finished) */}
          {!running && !completed && (
            <div className="space-y-4">
              {/* Target Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  1. Target Prospects
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {safePreSelected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetScope('selected')}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        targetScope === 'selected'
                          ? 'border-brand bg-brand/10 text-brand font-medium shadow-sm'
                          : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Selected Leads ({safePreSelected.length})
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Leads checked in table</div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTargetScope('no_website');
                      setSelectedAngle('no_website_showcase');
                    }}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      targetScope === 'no_website'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium shadow-sm'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>No-Website Leads</span>
                      <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">HOT</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Filter: Zero web presence</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('discovered')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      targetScope === 'discovered'
                        ? 'border-brand bg-brand/10 text-brand font-medium shadow-sm'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">Fresh Prospects</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Status = "discovered"</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      targetScope === 'all'
                        ? 'border-brand bg-brand/10 text-brand font-medium shadow-sm'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">All Active Leads</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Excludes Won & Archived</div>
                  </button>
                </div>
              </div>

              {/* Angle & Batch Limit Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    2. Pitch Angle Template
                  </label>
                  <select
                    value={selectedAngle}
                    onChange={(e) => setSelectedAngle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white font-medium"
                  >
                    <option value="no_website_showcase">🚀 No-Website Showcase Pitch (Niche Prototype)</option>
                    <option value="mockup_pitch">🎨 Pre-Built Mockup Redesign</option>
                    <option value="speed_mobile">⚡ Mobile Speed & Latency Flaws</option>
                    <option value="security_form_leak">🛡️ Form & Security Leaks (HSTS/DMARC)</option>
                    <option value="booking_leak">📅 Booking / Lead Drop-off</option>
                    <option value="social_verification">🔎 Social Media Website Verification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    3. Batch Processing Limit
                  </label>
                  <select
                    value={batchLimit}
                    disabled={targetScope === 'selected'}
                    onChange={(e) => setBatchLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white font-medium disabled:opacity-50"
                  >
                    <option value={5}>5 Leads (Fast Sprint)</option>
                    <option value={10}>10 Leads (Recommended)</option>
                    <option value={20}>20 Leads (Batch)</option>
                    <option value={50}>50 Leads (Daily Single-Inbox Quota)</option>
                    <option value={100}>100 Leads (Multi-Inbox Pool)</option>
                    <option value={300}>300 Leads (Full Daily Scale 🔥)</option>
                  </select>
                </div>
              </div>

              {/* Dispatch Action Mode */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  4. Outreach Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDispatchMode('queue')}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      dispatchMode === 'queue'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Smart Outbox Queue (Recommended)</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Stages Spintax email to automatically dispatch at 9:30 AM local recipient time
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispatchMode('prepare_only')}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      dispatchMode === 'prepare_only'
                        ? 'border-brand bg-brand/10 text-brand font-medium'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand" />
                      <span>Prepare Only (No Dispatch)</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Runs OSINT, builds prototype & drafts pitch ready in the drawer
                    </div>
                  </button>
                </div>
              </div>

              {/* Compliance & Optimization Checkbox */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipExistingEnriched}
                    onChange={(e) => setSkipExistingEnriched(e.target.checked)}
                    className="rounded border-border-subtle text-brand focus:ring-brand"
                  />
                  <span>Skip leads with existing enriched contacts (Saves time)</span>
                </label>
                <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  RFC 8058 & Spintax Active
                </span>
              </div>
            </div>
          )}

          {/* Execution Progress & Terminal View (when running or completed) */}
          {(running || completed) && (
            <div className="space-y-4">
              {/* Progress Bar Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {running ? <Loader2 className="h-4 w-4 text-brand animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <span>{running ? `Processing ${currentIndex} of ${totalLeads} prospects...` : 'Pipeline Complete!'}</span>
                  </span>
                  <span className="font-mono text-brand font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-border-subtle">
                  <div 
                    className="h-full bg-linear-to-r from-brand to-indigo-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Active Prospect Spotlight Card */}
              {running && currentLeadName && (
                <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[280px]">
                      {currentLeadName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                      Step {currentIndex}/{totalLeads}
                    </span>
                  </div>

                  {/* 5-Stage Live Pipeline Badges */}
                  <div className="grid grid-cols-5 gap-1.5 text-[10px] font-medium text-center">
                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.resolve?.status === 'done' || currentLeadSteps.resolve?.status === 'cached'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : currentLeadSteps.resolve?.status === 'running'
                        ? 'bg-brand/10 border-brand text-brand animate-pulse'
                        : 'bg-surface-1 border-border-subtle text-gray-400'
                    }`}>
                      Verify
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.osint?.status === 'done'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : currentLeadSteps.osint?.status === 'running'
                        ? 'bg-brand/10 border-brand text-brand animate-pulse'
                        : 'bg-surface-1 border-border-subtle text-gray-400'
                    }`}>
                      OSINT
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.phone?.status === 'done'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : currentLeadSteps.phone?.status === 'running'
                        ? 'bg-brand/10 border-brand text-brand animate-pulse'
                        : 'bg-surface-1 border-border-subtle text-gray-400'
                    }`}>
                      Phone
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.mockup?.status === 'done'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                        : currentLeadSteps.mockup?.status === 'running'
                        ? 'bg-brand/10 border-brand text-brand animate-pulse'
                        : 'bg-surface-1 border-border-subtle text-gray-400'
                    }`}>
                      Mockup
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.pitch?.status === 'done'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                        : currentLeadSteps.pitch?.status === 'running'
                        ? 'bg-brand/10 border-brand text-brand animate-pulse'
                        : 'bg-surface-1 border-border-subtle text-gray-400'
                    }`}>
                      Pitch
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Metrics Summary */}
              {completed && summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-400 block">Processed</span>
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-0.5 block">
                      {summary.processed}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-400 block">Enriched</span>
                    <span className="text-xl font-bold font-mono text-purple-500 mt-0.5 block">
                      {summary.enriched}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-400 block">Mockups Built</span>
                    <span className="text-xl font-bold font-mono text-purple-500 mt-0.5 block">
                      {summary.mockupsBuilt}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-2 border border-border-subtle text-center">
                    <span className="text-[10px] uppercase font-mono text-gray-400 block">Pitches Queued</span>
                    <span className="text-xl font-bold font-mono text-emerald-500 mt-0.5 block">
                      {summary.pitchesQueued}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Streaming Activity Terminal */}
              <div className="rounded-xl border border-border-subtle overflow-hidden bg-black/90 font-mono text-[11px] shadow-inner">
                <div className="px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-brand" />
                    <span>Live Pipeline Telemetry</span>
                  </div>
                  <span className="text-[10px]">{logs.length} events logged</span>
                </div>
                <div className="p-3 max-h-48 overflow-y-auto space-y-1 text-neutral-300">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-neutral-500 shrink-0 text-[10px]">{log.timestamp}</span>
                      <span className={
                        log.type === 'error' ? 'text-rose-400' :
                        log.type === 'warn' ? 'text-amber-400' :
                        log.type === 'success' ? 'text-emerald-400 font-semibold' :
                        log.type === 'lead' ? 'text-cyan-400 font-medium' :
                        'text-neutral-300'
                      }>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-border-subtle bg-surface-2/40 flex items-center justify-between">
          <div>
            {!running && !completed && (
              <span className="text-[11px] text-gray-500">
                Processes leads sequentially with zero rate limits or port conflicts.
              </span>
            )}
            {completed && (
              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                All prospects staged for optimal 9:30 AM dispatch
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!running && !completed && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartAutoPilot}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-linear-to-r from-brand to-indigo-600 hover:from-brand-hover hover:to-indigo-500 text-white transition-all shadow-md shadow-brand/25 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Launch Auto-Pilot</span>
                </button>
              </>
            )}

            {completed && (
              <>
                {onOpenQueue && summary?.pitchesQueued > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQueue();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>View Outbox ({summary.pitchesQueued})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-3 hover:bg-surface-4 text-gray-800 dark:text-gray-100 border border-border-subtle transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
