import React, { useState, useEffect } from 'react';
import { 
  RiRadarLine, RiPulseLine, RiTerminalBoxLine, 
  RiCloseLine, RiAlertLine, RiCheckLine, RiStopCircleLine,
  RiRefreshLine, RiDatabase2Line, RiServerLine, RiTimeLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';

export default function LiveJobsDrawer({
  isOpen,
  onClose,
  stats,
  onRefresh
}) {
  const [activeJob, setActiveJob] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isAborting, setIsAborting] = useState(false);
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'logs' | 'health'

  // Poll active background job and telemetry
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchJobStatus() {
      try {
        const res = await fetch('/api/osint/active-job');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.success) {
            setActiveJob(data.active ? data.job : null);
            if (data.job?.recentPlaces) {
              setRecentLogs(data.job.recentPlaces);
            }
          }
        }
      } catch (e) {}
    }

    fetchJobStatus();
    const interval = setInterval(fetchJobStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAbortJob = async () => {
    if (!activeJob?.id) return;
    setIsAborting(true);
    try {
      await fetch(`/api/osint/cancel/${activeJob.id}`, { method: 'POST' });
      setActiveJob(null);
      if (onRefresh) onRefresh();
    } catch (e) {} finally {
      setIsAborting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-background-primary-default border-l border-separator-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Top Header */}
          <div className="p-4 border-b border-separator-border flex items-center justify-between bg-background-secondary-default/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-500 flex items-center justify-center">
                <RiRadarLine className="size-4 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-body-medium font-bold text-text-primary tracking-tight">
                  Mission Control
                </h3>
                <p className="text-[11px] font-mono text-text-tertiary">Background Task Engine & Worker Fleet</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="size-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors"
                title="Close Mission Control (Esc)"
              >
                <RiCloseLine className="size-5" />
              </button>
            </div>
          </div>

          {/* Segmented Tab Control */}
          <div className="px-4 pt-3 pb-2 border-b border-separator-border flex items-center gap-2">
            {[
              { id: 'workers', label: 'Active Workers' },
              { id: 'logs', label: 'Streaming stdout' },
              { id: 'health', label: 'Node & DB Latency' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-accent-500 text-white font-semibold'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-background-secondary-default'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'workers' && (
              <div className="space-y-4">
                {activeJob ? (
                  <div className="p-4 rounded-2xl border border-accent-500/30 bg-accent-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot color="green" className="animate-pulse" />
                        <span className="text-xs font-bold font-mono text-text-primary">
                          Worker ID: {activeJob.id.substring(0, 18)}...
                        </span>
                      </div>
                      <Chip variant="bold" color="cyan" size="sm">
                        Running
                      </Chip>
                    </div>

                    <div className="text-xs text-text-secondary">
                      <div><span className="text-text-tertiary">Type:</span> {activeJob.type || 'Batch Recon'}</div>
                      <div><span className="text-text-tertiary">Target:</span> {activeJob.keyword || 'Active Pipeline'} ({activeJob.city || 'Global'})</div>
                      <div><span className="text-text-tertiary">Yield:</span> {activeJob.processed || 0} / {activeJob.total || 0} records</div>
                    </div>

                    <div className="pt-1">
                      <Button
                        variant="danger"
                        size="small"
                        leadingIcon={RiStopCircleLine}
                        disabled={isAborting}
                        onClick={handleAbortJob}
                        className="w-full"
                      >
                        {isAborting ? 'Terminating Worker...' : 'Emergency Terminate Worker'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-separator-border bg-background-secondary-default/50 text-center space-y-2">
                    <div className="size-10 rounded-xl bg-background-primary-default border border-separator-border text-text-tertiary flex items-center justify-center mx-auto">
                      <RiCheckLine className="size-5 text-success-primary" />
                    </div>
                    <div className="text-xs font-semibold text-text-primary">Worker Fleet Standing By</div>
                    <p className="text-[11px] text-text-tertiary leading-relaxed">
                      All background crawlers, reverse DNS threads, and email MX verifiers are idle. Start a Maps acquisition or launch Auto-Pilot to dispatch threads.
                    </p>
                  </div>
                )}

                {/* System Concurrency Specs */}
                <div className="space-y-2">
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-text-tertiary">
                    Thread Allocation
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary-default border border-separator-border">
                      <span className="text-text-secondary">UV_THREADPOOL_SIZE</span>
                      <span className="text-text-primary font-bold">16 Threads</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary-default border border-separator-border">
                      <span className="text-text-secondary">Concurrent Stealth Workers</span>
                      <span className="text-text-primary font-bold">4 Processes</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-secondary-default border border-separator-border">
                      <span className="text-text-secondary">SQLite Journal Mode</span>
                      <span className="text-text-primary font-bold">WAL (Zero Lockups)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-text-tertiary uppercase">Real-time Stream</span>
                  <button onClick={() => setRecentLogs([])} className="text-[10px] font-mono text-accent-500 hover:underline">
                    Clear Terminal
                  </button>
                </div>
                <div className="h-96 rounded-2xl bg-black border border-slate-800 p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1.5 leading-relaxed">
                  <div className="text-slate-500">[System] Quarry Daemon initialized. Listening for IPC events...</div>
                  {activeJob ? (
                    <div className="text-cyan-400">[Worker] Job #{activeJob.id} running with PID allocation...</div>
                  ) : (
                    <div className="text-slate-600">[Idle] No background scraping tasks active.</div>
                  )}
                  {recentLogs.map((log, i) => (
                    <div key={i} className="text-slate-300">
                      <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log.title || log.name || JSON.stringify(log)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'health' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Express API Ping</span>
                    <span className="text-emerald-500 font-bold">4.2ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">SQLite Query Latency</span>
                    <span className="text-emerald-500 font-bold">0.8ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Local Tunnel Bridge</span>
                    <span className="text-text-primary font-bold">Active</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Prospects Vault</span>
                    <span className="text-text-primary font-bold">{stats?.totalLeads || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">No-Website Verified</span>
                    <span className="text-rose-500 font-bold">{stats?.noWebsite || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Ready to Pitch</span>
                    <span className="text-accent-500 font-bold">{stats?.pitched || stats?.enriched || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Status */}
          <div className="p-3 border-t border-separator-border bg-background-secondary-default flex items-center justify-between text-[11px] font-mono text-text-tertiary">
            <div className="flex items-center gap-1.5">
              <StatusDot color="green" />
              <span>Quarry Core v2.4.0</span>
            </div>
            <span>Port 5000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
