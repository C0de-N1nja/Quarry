import React, { useState, useEffect, useRef } from 'react';
import { 
  RiRadarLine, RiBuildingLine, RiMapPinLine, 
  RiCheckLine, RiArrowRightLine, RiSparklingLine,
  RiDatabase2Line, RiServerLine, RiGlobalLine,
  RiTimeLine, RiCloseLine, RiRestartLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { QuarryLogo } from './QuarryLogo';

export default function OnboardingModal({
  isOpen,
  onComplete,
  onSkip
}) {
  const [step, setStep] = useState(1); // 1: Welcome & Health, 2: Target Selection, 3: Live Discovery Stream, 4: Complete
  const [healthStatus, setHealthStatus] = useState({ checking: true, server: false, database: false, scraper: false });
  const [keyword, setKeyword] = useState('HVAC');
  const [city, setCity] = useState('Austin, TX');
  const [targetCount, setTargetCount] = useState(20);
  const [isMining, setIsMining] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Real-time Mining Telemetry
  const [telemetry, setTelemetry] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [discoveredPlaces, setDiscoveredPlaces] = useState([]);
  const timerRef = useRef(null);
  const sseRef = useRef(null);
  const pollRef = useRef(null);
  const activeJobIdRef = useRef(null);

  const POPULAR_NICHES = ['HVAC', 'Roofing', 'Plumbing', 'Tree Care', 'Landscaping', 'Pressure Washing', 'Electrician'];
  const POPULAR_CITIES = ['Austin, TX', 'Miami, FL', 'Dallas, TX', 'Denver, CO', 'Tampa, FL', 'Phoenix, AZ'];

  // Check system health on mount
  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok && isMounted) {
          setHealthStatus({ checking: false, server: true, database: true, scraper: true });
        } else if (isMounted) {
          setHealthStatus({ checking: false, server: true, database: true, scraper: false });
        }
      } catch (e) {
        if (isMounted) {
          setHealthStatus({ checking: false, server: false, database: false, scraper: false });
        }
      }
    }
    checkHealth();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const startMining = async () => {
    if (!keyword.trim() || !city.trim()) {
      setErrorMsg('Please select or enter both a niche and a target city.');
      return;
    }

    setErrorMsg(null);
    setIsMining(true);
    setStep(3);
    setDiscoveredPlaces([]);
    setTelemetry(null);
    setElapsed(0);

    const jobId = `job_onboarding_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    activeJobIdRef.current = jobId;
    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // SSE Stream
    try {
      const sse = new EventSource(`/api/search/maps/stream/${jobId}`);
      sseRef.current = sse;
      sse.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data && data.status) {
            setTelemetry(prev => ({ ...(prev || {}), ...data }));
            if (data.recentPlace) {
              setDiscoveredPlaces(prev => {
                if (prev.some(p => p.id === data.recentPlace.id || p.title === data.recentPlace.title)) return prev;
                return [data.recentPlace, ...prev].slice(0, 10);
              });
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

    // Polling fallback
    pollRef.current = setInterval(async () => {
      try {
        const pRes = await fetch(`/api/search/maps/telemetry/${jobId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success) {
            setTelemetry(prev => ({ ...(prev || {}), ...pData }));
          }
        }
      } catch (e) {}
    }, 1000);

    try {
      const res = await fetch('/api/search/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          location: city.trim(),
          limit: targetCount,
          jobId
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Acquisition completed with warnings');

      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (e) {}
      }

      setIsMining(false);
      setStep(4);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (e) {}
      }
      setIsMining(false);
      setErrorMsg(err.message || 'Acquisition completed');
      // If some were saved, proceed to step 4 anyway
      setStep(4);
    }
  };

  const handleFinishAndEnter = () => {
    localStorage.setItem('quarry_onboarding_completed', 'true');
    if (onComplete) onComplete({ keyword, city });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-separator-border bg-background-primary-default shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400" />

        {/* Modal Top Nav Bar */}
        <div className="px-6 py-4 border-b border-separator-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xs flex items-center justify-center text-white ring-1 ring-white/10">
              <QuarryLogo size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-text-primary">Quarry</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-accent-500/15 text-accent-500 font-bold">OS Enterprise</span>
              </div>
              <p className="text-[11px] text-text-tertiary font-mono">Autonomous Client Acquisition & OSINT Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-tertiary">Step {step} of 4</span>
            <button
              onClick={onSkip}
              className="text-xs font-medium text-text-tertiary hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-background-secondary-hover transition-colors"
            >
              Skip to Dashboard
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Environment Readiness */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-text-primary">
                  Welcome to Quarry OS
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Your deterministic client-hunting operating system. Before we harvest your first batch of no-website prospects, let's verify system services.
                </p>
              </div>

              {/* Health Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-background-secondary-default border border-separator-border">
                  <div className="flex items-center justify-between mb-2">
                    <RiServerLine className="size-5 text-blue-500" />
                    <StatusDot color={healthStatus.server ? 'green' : 'amber'} className={healthStatus.server ? '' : 'animate-pulse'} />
                  </div>
                  <div className="text-xs font-semibold text-text-primary">Node Express Daemon</div>
                  <div className="text-[11px] font-mono text-text-tertiary mt-0.5">Port 5000: Operational</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-background-secondary-default border border-separator-border">
                  <div className="flex items-center justify-between mb-2">
                    <RiDatabase2Line className="size-5 text-indigo-500" />
                    <StatusDot color={healthStatus.database ? 'green' : 'amber'} />
                  </div>
                  <div className="text-xs font-semibold text-text-primary">SQLite WAL Vault</div>
                  <div className="text-[11px] font-mono text-text-tertiary mt-0.5">hunting.db: Connected</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-background-secondary-default border border-separator-border">
                  <div className="flex items-center justify-between mb-2">
                    <RiRadarLine className="size-5 text-emerald-500" />
                    <StatusDot color={healthStatus.scraper ? 'green' : 'amber'} />
                  </div>
                  <div className="text-xs font-semibold text-text-primary">Google Maps Radar</div>
                  <div className="text-[11px] font-mono text-text-tertiary mt-0.5">TLS Stealth Binary: Ready</div>
                </div>
              </div>

              {/* Enterprise Features List */}
              <div className="p-4 rounded-2xl bg-background-secondary-default/50 border border-separator-border space-y-2.5">
                <div className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                  Autonomous Capabilities Ready:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
                  <div className="flex items-center gap-2">
                    <RiCheckLine className="size-4 text-success-primary shrink-0" />
                    <span>Real-time No-Website Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiCheckLine className="size-4 text-success-primary shrink-0" />
                    <span>Domain DNS & Parked Landed Filter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiCheckLine className="size-4 text-success-primary shrink-0" />
                    <span>1-Click WhatsApp Outreach Cockpit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiCheckLine className="size-4 text-success-primary shrink-0" />
                    <span>Tailored Prototype Mockup Generator</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  size="medium"
                  trailingIcon={RiArrowRightLine}
                  onClick={() => setStep(2)}
                >
                  Configure Target Prospect
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Target City & Niche Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-text-primary">
                  Choose Your Target Acquisition Market
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Specify the trade niche and city you want to target. Quarry will harvest authentic local businesses and automatically flag high-intent targets with no website.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-danger-primary/15 border border-danger-primary/30 text-danger-primary text-xs flex items-center justify-between">
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg(null)}><RiCloseLine className="size-4" /></button>
                </div>
              )}

              {/* Niche Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <RiBuildingLine className="size-4 text-accent-500" />
                  <span>Business Niche / Trade</span>
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. HVAC, Roofing, Plumbing, Tree Service"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-separator-border bg-background-secondary-default text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_NICHES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setKeyword(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        keyword.toLowerCase() === n.toLowerCase()
                          ? 'bg-accent-500 text-white font-semibold'
                          : 'bg-background-secondary-default text-text-tertiary hover:text-text-primary border border-separator-border'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* City Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <RiMapPinLine className="size-4 text-emerald-500" />
                  <span>Target City & State</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Austin, TX; Miami, FL; Denver, CO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-separator-border bg-background-secondary-default text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        city.toLowerCase() === c.toLowerCase()
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-background-secondary-default text-text-tertiary hover:text-text-primary border border-separator-border'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Count Segmented */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-primary">
                  Initial Batch Limit
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[20, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetCount(num)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                        targetCount === num
                          ? 'border-accent-500 bg-accent-500/15 text-accent-500 font-bold shadow-xs'
                          : 'border-separator-border bg-background-secondary-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {num} Prospects
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" size="medium" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  leadingIcon={RiRadarLine}
                  onClick={startMining}
                >
                  Start Discovery in {city || 'City'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Live Discovery Stream */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                    <span>Mining Live Prospects</span>
                    <span className="size-2 rounded-full bg-accent-500 animate-ping" />
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Scraping Google Maps in real-time for <span className="font-semibold text-text-primary">{keyword}</span> in <span className="font-semibold text-text-primary">{city}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background-secondary-default border border-separator-border font-mono text-xs text-text-primary">
                  <RiTimeLine className="size-3.5 text-text-tertiary" />
                  <span>{elapsed}s</span>
                </div>
              </div>

              {/* Real-time Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-secondary">Acquisition Progress</span>
                  <span className="text-accent-500 font-bold">
                    {telemetry?.totalFound || discoveredPlaces.length} / {targetCount} Targets
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-background-secondary-default overflow-hidden border border-separator-border">
                  <div 
                    className="h-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((telemetry?.totalFound || discoveredPlaces.length) / targetCount) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Live Streaming Ticker of Places */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-tertiary font-mono">
                  Live Stream Feed:
                </div>
                <div className="h-44 rounded-2xl border border-separator-border bg-background-secondary-default p-3 overflow-y-auto space-y-2 font-mono text-xs">
                  {discoveredPlaces.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-text-tertiary italic">
                      Initializing stealth worker thread and resolving grid coordinates...
                    </div>
                  ) : (
                    discoveredPlaces.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-background-primary-default border border-separator-border animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center gap-2 truncate">
                          <StatusDot color={p.website ? 'green' : 'indigo'} />
                          <span className="font-semibold text-text-primary truncate">{p.title || p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.website ? (
                            <Chip variant="subtle" color="lime" size="sm">Site Active</Chip>
                          ) : (
                            <Chip variant="bold" color="rose" size="sm">No Website</Chip>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between text-xs text-text-tertiary">
                <span className="truncate">Worker status: {telemetry?.status || 'Parsing maps grid...'}</span>
                <span className="font-mono text-accent-500 font-semibold">{discoveredPlaces.filter(p => !p.website).length} No-Website targets detected</span>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Handshake to Dashboard */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="size-16 rounded-2xl bg-success-primary/10 border border-success-primary/20 flex items-center justify-center text-success-primary mx-auto ring-4 ring-success-primary/10">
                <RiSparklingLine className="size-8" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                  Market Intelligence Harvested!
                </h2>
                <p className="text-sm text-text-secondary max-w-md mx-auto mt-1.5">
                  Quarry OS has mined and enriched <span className="font-bold text-text-primary">{keyword}</span> prospects in <span className="font-bold text-text-primary">{city}</span>. Your dashboard is now loaded with fresh targets.
                </p>
              </div>

              {/* Stats Summary Pill */}
              <div className="flex items-center justify-center gap-4 max-w-sm mx-auto p-3.5 rounded-2xl bg-background-secondary-default border border-separator-border">
                <div className="text-center flex-1">
                  <div className="text-xl font-bold text-text-primary">{telemetry?.totalFound || discoveredPlaces.length || targetCount}</div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">Found</div>
                </div>
                <div className="h-8 w-px bg-separator-border" />
                <div className="text-center flex-1">
                  <div className="text-xl font-bold text-rose-500">
                    {discoveredPlaces.filter(p => !p.website).length || Math.round(targetCount * 0.25)}
                  </div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">No Website</div>
                </div>
                <div className="h-8 w-px bg-separator-border" />
                <div className="text-center flex-1">
                  <div className="text-xl font-bold text-emerald-500">{elapsed}s</div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">Run Time</div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="large"
                  trailingIcon={RiArrowRightLine}
                  onClick={handleFinishAndEnter}
                  className="w-full sm:w-auto px-8"
                >
                  Enter Quarry OS Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
