import React, { useState, useEffect, useRef } from 'react';
import { 
  RiCloseLine, 
  RiFlashlightFill, 
  RiPlayFill, 
  RiCheckboxCircleLine, 
  RiAlertLine, 
  RiErrorWarningLine, 
  RiLoader4Line, 
  RiGlobalLine, 
  RiPhoneLine, 
  RiMailLine, 
  RiSparklingLine, 
  RiTimeLine, 
  RiArrowRightLine,
  RiShieldCheckLine, 
  RiSmartphoneLine, 
  RiCheckLine, 
  RiRefreshLine, 
  RiTerminalBoxLine, 
  RiPauseCircleLine,
  RiArrowDownSLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { Switch } from '@/components/base/switch/switch';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';

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
          addLog(`Finished: "${data.businessName}" successfully processed`, 'success');
        } else {
          addLog(`Failed: "${data.businessName}" - ${data.error}`, 'error');
        }
        break;

      case 'complete':
        setSummary(data);
        addLog(`Auto-Pilot Finished: Processed ${data.processed} | Enriched ${data.enriched} | Mockups ${data.mockupsBuilt} | Queued ${data.pitchesQueued}`, 'success');
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
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open && !running) onClose(); }}
      size="lg"
      aria-label="Auto-Pilot Batch Pipeline"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent-500/15 text-accent-500 flex items-center justify-center border border-accent-500/30">
            <RiFlashlightFill className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-primary">Auto-Pilot Batch Pipeline</h2>
              <Chip variant="bold" color="lime">
                Full Automation
              </Chip>
            </div>
            <p className="text-[11px] text-text-secondary">
              OSINT -&gt; Phone -&gt; Interactive Prototype -&gt; Spintax Pitch -&gt; Smart Outbox
            </p>
          </div>
        </div>
        <CloseButton 
          size="md"
          onClick={onClose} 
          disabled={running}
          aria-label="Close Modal"
        />
      </div>

      {/* Modal Body */}
      <ModalBody className="p-6 space-y-5 flex-1 bg-background-primary-default text-text-primary">
          {error && (
            <div className="p-3 rounded-xl bg-danger-primary/10 border border-danger-primary/20 text-danger-primary text-xs flex items-center gap-2">
              <RiErrorWarningLine className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Configuration View (when not running and not finished) */}
          {!running && !completed && (
            <div className="space-y-4">
              {/* Target Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-2">
                  1. Target Prospects
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {safePreSelected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetScope('selected')}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        targetScope === 'selected'
                          ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium shadow-sm'
                          : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-hover'
                      }`}
                    >
                      <div className="font-semibold text-text-primary">
                        Selected Leads ({safePreSelected.length})
                      </div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">Leads checked in table</div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTargetScope('no_website');
                      setSelectedAngle('no_website_showcase');
                    }}
                    className={`p-3 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                      targetScope === 'no_website'
                        ? 'border-warning-primary bg-warning-primary/10 text-warning-primary font-medium shadow-sm'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <span>No-Website Leads</span>
                      <Chip variant="subtle" color="amber" size="sm">HOT</Chip>
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Filter: Zero web presence</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('discovered')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                      targetScope === 'discovered'
                        ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium shadow-sm'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary">Fresh Prospects</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Status = "discovered"</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`p-3 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                      targetScope === 'all'
                        ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium shadow-sm'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary">All Active Leads</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Excludes Won & Archived</div>
                  </button>
                </div>
              </div>

              {/* Angle & Batch Limit Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5">
                    2. Pitch Angle Template
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={selectedAngle}
                      onChange={(e) => setSelectedAngle(e.target.value)}
                      className="w-full appearance-none px-3 pr-8 py-2 text-xs rounded-xl bg-background-secondary-default border border-separator-border focus:border-accent-500 focus:outline-none text-text-primary font-medium cursor-pointer"
                    >
                      <option value="no_website_showcase">No-Website Showcase Pitch (Niche Prototype)</option>
                      <option value="mockup_pitch">Pre-Built Mockup Redesign</option>
                      <option value="speed_mobile">Mobile Speed & Latency Flaws</option>
                      <option value="security_form_leak">Form & Security Leaks (HSTS/DMARC)</option>
                      <option value="booking_leak">Booking / Lead Drop-off</option>
                      <option value="social_verification">Social Media Website Verification</option>
                    </select>
                    <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5">
                    3. Batch Processing Limit
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={batchLimit}
                      disabled={targetScope === 'selected'}
                      onChange={(e) => setBatchLimit(Number(e.target.value))}
                      className="w-full appearance-none px-3 pr-8 py-2 text-xs rounded-xl bg-background-secondary-default border border-separator-border focus:border-accent-500 focus:outline-none text-text-primary font-medium disabled:opacity-50 cursor-pointer"
                    >
                      <option value={5}>5 Leads (Fast Sprint)</option>
                      <option value={10}>10 Leads (Recommended)</option>
                      <option value={20}>20 Leads (Batch)</option>
                      <option value={50}>50 Leads (Daily Single-Inbox Quota)</option>
                      <option value={100}>100 Leads (Multi-Inbox Pool)</option>
                      <option value={300}>300 Leads (Full Daily Scale)</option>
                    </select>
                    <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                  </div>
                </div>
              </div>

              {/* Dispatch Action Mode */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5">
                  4. Outreach Action
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDispatchMode('queue')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      dispatchMode === 'queue'
                        ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <RiTimeLine className="h-3.5 w-3.5 text-accent-500" />
                      <span>Smart Outbox Queue (Recommended)</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      Stages Spintax email to automatically dispatch at 9:30 AM local recipient time
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispatchMode('prepare_only')}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      dispatchMode === 'prepare_only'
                        ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <RiSparklingLine className="h-3.5 w-3.5 text-accent-500" />
                      <span>Prepare Only (No Dispatch)</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      Runs OSINT, builds prototype & drafts pitch ready in the drawer
                    </div>
                  </button>
                </div>
              </div>

              {/* Compliance & Optimization Switch */}
              <div className="pt-2 border-t border-separator-border flex items-center justify-between text-xs text-text-secondary flex-wrap gap-2">
                <Switch
                  size="sm"
                  isSelected={skipExistingEnriched}
                  onChange={setSkipExistingEnriched}
                >
                  <span className="text-xs text-text-secondary">
                    Skip leads with existing enriched contacts (Saves time)
                  </span>
                </Switch>
                <span className="text-[11px] text-success-primary font-medium flex items-center gap-1">
                  <RiShieldCheckLine className="h-3.5 w-3.5" />
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
                  <span className="font-semibold text-text-primary flex items-center gap-2">
                    {running ? <RiLoader4Line className="h-4 w-4 text-accent-500 animate-spin" /> : <RiCheckboxCircleLine className="h-4 w-4 text-success-primary" />}
                    <span>{running ? `Processing ${currentIndex} of ${totalLeads} prospects...` : 'Pipeline Complete!'}</span>
                  </span>
                  <span className="font-mono text-accent-500 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-background-tertiary-default overflow-hidden border border-separator-border">
                  <div 
                    className="h-full bg-accent-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Active Prospect Spotlight Card */}
              {running && currentLeadName && (
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary truncate max-w-[280px]">
                      {currentLeadName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-500/10 text-accent-500 border border-accent-500/20">
                      Step {currentIndex}/{totalLeads}
                    </span>
                  </div>

                  {/* 5-Stage Live Pipeline Badges */}
                  <div className="grid grid-cols-5 gap-1.5 text-[10px] font-medium text-center">
                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.resolve?.status === 'done' || currentLeadSteps.resolve?.status === 'cached'
                        ? 'bg-success-primary/10 border-success-primary/30 text-success-primary'
                        : currentLeadSteps.resolve?.status === 'running'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-500 animate-pulse'
                        : 'bg-background-tertiary-default border-separator-border text-text-tertiary'
                    }`}>
                      Verify
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.osint?.status === 'done'
                        ? 'bg-success-primary/10 border-success-primary/30 text-success-primary'
                        : currentLeadSteps.osint?.status === 'running'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-500 animate-pulse'
                        : 'bg-background-tertiary-default border-separator-border text-text-tertiary'
                    }`}>
                      OSINT
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.phone?.status === 'done'
                        ? 'bg-success-primary/10 border-success-primary/30 text-success-primary'
                        : currentLeadSteps.phone?.status === 'running'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-500 animate-pulse'
                        : 'bg-background-tertiary-default border-separator-border text-text-tertiary'
                    }`}>
                      Phone
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.mockup?.status === 'done'
                        ? 'bg-accent-500/10 border-accent-500/30 text-accent-500'
                        : currentLeadSteps.mockup?.status === 'running'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-500 animate-pulse'
                        : 'bg-background-tertiary-default border-separator-border text-text-tertiary'
                    }`}>
                      Mockup
                    </div>

                    <div className={`p-1.5 rounded-lg border ${
                      currentLeadSteps.pitch?.status === 'done'
                        ? 'bg-accent-500/10 border-accent-500/30 text-accent-500'
                        : currentLeadSteps.pitch?.status === 'running'
                        ? 'bg-accent-500/10 border-accent-500 text-accent-500 animate-pulse'
                        : 'bg-background-tertiary-default border-separator-border text-text-tertiary'
                    }`}>
                      Pitch
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Metrics Summary */}
              {completed && summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary block">Processed</span>
                    <span className="text-xl font-bold font-mono text-text-primary mt-0.5 block">
                      {summary.processed}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary block">Enriched</span>
                    <span className="text-xl font-bold font-mono text-accent-500 mt-0.5 block">
                      {summary.enriched}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary block">Mockups Built</span>
                    <span className="text-xl font-bold font-mono text-accent-500 mt-0.5 block">
                      {summary.mockupsBuilt}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary block">Pitches Queued</span>
                    <span className="text-xl font-bold font-mono text-success-primary mt-0.5 block">
                      {summary.pitchesQueued}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Streaming Activity Terminal */}
              <div className="rounded-xl border border-separator-border overflow-hidden bg-background-primary-default font-mono text-[11px] shadow-inner">
                <div className="px-3 py-1.5 bg-background-secondary-default border-b border-separator-border flex items-center justify-between text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <RiTerminalBoxLine className="h-3 w-3 text-accent-500" />
                    <span>Live Pipeline Telemetry</span>
                  </div>
                  <span className="text-[10px]">{logs.length} events logged</span>
                </div>
                <div className="p-3 max-h-48 overflow-y-auto space-y-1 text-text-secondary">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-text-tertiary shrink-0 text-[10px]">{log.timestamp}</span>
                      <span className={
                        log.type === 'error' ? 'text-danger-primary' :
                        log.type === 'warn' ? 'text-warning-primary' :
                        log.type === 'success' ? 'text-success-primary font-semibold' :
                        log.type === 'lead' ? 'text-accent-500 font-medium' :
                        'text-text-primary'
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
      </ModalBody>

      {/* Modal Footer Controls */}
      <ModalFooter className="p-4 border-t border-separator-border bg-background-secondary-default flex items-center justify-between shrink-0">
        <div>
          {!running && !completed && (
            <span className="text-[11px] text-text-secondary">
              Processes leads sequentially with zero rate limits or port conflicts.
            </span>
          )}
          {completed && (
            <span className="text-[11px] text-accent-500 font-medium flex items-center gap-1">
              <RiCheckLine className="h-3.5 w-3.5" />
              All prospects staged for optimal 9:30 AM dispatch
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!running && !completed && (
            <>
              <Button
                variant="secondary"
                size="medium"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="medium"
                leadingIcon={RiPlayFill}
                onClick={handleStartAutoPilot}
              >
                Launch Auto-Pilot
              </Button>
            </>
          )}

          {completed && (
            <>
              {onOpenQueue && summary?.pitchesQueued > 0 && (
                <Button
                  variant="primary"
                  size="medium"
                  leadingIcon={RiMailLine}
                  onClick={() => {
                    onClose();
                    onOpenQueue();
                  }}
                >
                  View Outbox ({summary.pitchesQueued})
                </Button>
              )}
              <Button
                variant="secondary"
                size="medium"
                onClick={onClose}
              >
                Close
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}
