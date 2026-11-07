import React, { useState, useRef, useEffect } from 'react';
import { X, Search, UploadCloud, Plus, Loader2, CheckCircle2, MapPin, Clock, Zap, Flame, Building2, Star, Sparkles, Globe } from 'lucide-react';

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function sendBrowserNotification(title, body) {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        });
      }
    }
  } catch (e) {}
}

export default function SearchModal({ initialTab = 'maps', onClose, onLeadCreated }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalTimeStr, setFinalTimeStr] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const timerRef = useRef(null);
  const sseRef = useRef(null);
  const pollRef = useRef(null);

  const stopTelemetry = () => {
    if (sseRef.current) {
      try { sseRef.current.close(); } catch (e) {}
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleCancelHarvest = async () => {
    if (!activeJobId || isCancelling) return;
    setIsCancelling(true);
    try {
      await fetch(`/api/search/maps/cancel/${activeJobId}`, { method: 'POST' });
      stopTelemetry();
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      setError('Harvester stopped by user. Process terminated.');
    } catch (e) {
      console.warn('Failed to send cancel signal:', e);
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTelemetry();
    };
  }, []);

  // Maps Radar form
  const [mapsKeyword, setMapsKeyword] = useState('');
  const [mapsLocation, setMapsLocation] = useState('');
  const [mapsLimitOption, setMapsLimitOption] = useState('100'); // '20', '50', '100', 'custom'
  const [customMapsLimit, setCustomMapsLimit] = useState(100);

  // Crawler search form
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [crawlerLimitOption, setCrawlerLimitOption] = useState('15'); // '10', '15', '25', '40', 'custom'
  const [customCrawlerLimit, setCustomCrawlerLimit] = useState(15);

  // Manual lead form
  const [manualForm, setManualForm] = useState({
    business_name: '',
    website: '',
    phone: '',
    city: '',
    category: ''
  });

  // CSV file
  const [csvFile, setCsvFile] = useState(null);

  const handleMapsSearch = async (e) => {
    e.preventDefault();
    if (!mapsLocation || !mapsLocation.trim()) {
      return setError('Please enter a target city/location');
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setFinalTimeStr(null);
    setElapsedSeconds(0);
    stopTelemetry();

    const effectiveLimit = mapsLimitOption === 'custom'
      ? Math.max(1, parseInt(customMapsLimit, 10) || 50)
      : parseInt(mapsLimitOption, 10);

    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    setActiveJobId(jobId);
    setTelemetry({
      jobId,
      status: 'initializing',
      keyword: mapsKeyword,
      city: mapsLocation,
      targetLimit: effectiveLimit,
      placesHarvested: 0,
      uniqueBusinesses: 0,
      withWebsiteCount: 0,
      noWebsiteCount: 0,
      currentSubRegion: mapsLocation,
      speedPerMin: 0,
      percent: 0,
      recentPlaces: []
    });

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // 1. Establish SSE Stream with automatic reconnection
    try {
      const sse = new EventSource(`/api/search/maps/stream/${jobId}`);
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.status) {
            setTelemetry(prev => ({ ...(prev || {}), ...data }));
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

    // 2. Establish 1-second Polling Fallback (dual-transport resilience)
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
        body: JSON.stringify({ keyword: mapsKeyword, location: mapsLocation, limit: effectiveLimit, jobId })
      });
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Server returned ${res.status}`;
        try {
          const errObj = JSON.parse(text);
          if (errObj.error) errMsg = errObj.error;
        } catch (_) {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (timerRef.current) clearInterval(timerRef.current);
      stopTelemetry();
      const totalSecs = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const formatted = formatTimer(totalSecs);
      setFinalTimeStr(formatted);
      playChime();
      sendBrowserNotification(
        '🎯 Google Maps Scraping Complete!',
        `Harvested ${data.found} verified places (${data.inserted} fresh leads saved) in ${formatted}!`
      );

      setSuccessMsg(`Google Maps Scraper extracted ${data.found} verified places and inserted ${data.inserted} fresh leads in ${formatted}!`);
      if (onLeadCreated) onLeadCreated({ found: data.found, inserted: data.inserted, time: formatted, keyword: mapsKeyword });
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTelemetry();
      setError(err.message || 'Failed to complete Google Maps scraping');
    } finally {
      stopTelemetry();
      setLoading(false);
    }
  };

  const handleCrawlerSearch = async (e) => {
    e.preventDefault();
    if (!location || !location.trim()) {
      return setError('Please enter a target city/location');
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setFinalTimeStr(null);
    setElapsedSeconds(0);

    const effectiveLimit = crawlerLimitOption === 'custom'
      ? Math.max(1, parseInt(customCrawlerLimit, 10) || 15)
      : parseInt(crawlerLimitOption, 10);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, location, limit: effectiveLimit })
      });
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Search failed (${res.status})`;
        try {
          const errObj = JSON.parse(text);
          if (errObj.error) errMsg = errObj.error;
        } catch (_) {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (timerRef.current) clearInterval(timerRef.current);
      const totalSecs = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const formatted = formatTimer(totalSecs);
      setFinalTimeStr(formatted);
      playChime();
      sendBrowserNotification(
        '🎯 Web Crawler Search Complete!',
        `Discovered ${data.found} prospects (${data.inserted} new leads saved) in ${formatted}!`
      );

      setSuccessMsg(`Discovered ${data.found} prospects and inserted ${data.inserted} new leads in ${formatted}!`);
      if (onLeadCreated) onLeadCreated({ found: data.found, inserted: data.inserted, time: formatted, keyword });
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setError(err.message || 'Failed to complete lead search');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return setError('Please select a CSV file first');

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch('/api/search/csv', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Upload failed (${res.status})`;
        try {
          const errObj = JSON.parse(text);
          if (errObj.error) errMsg = errObj.error;
        } catch (_) {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuccessMsg(`Imported ${data.inserted} leads from CSV!`);
      if (onLeadCreated) onLeadCreated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.business_name || !manualForm.business_name.trim()) {
      return setError('Company / business name is required');
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Create lead failed (${res.status})`;
        try {
          const errObj = JSON.parse(text);
          if (errObj.error) errMsg = errObj.error;
        } catch (_) {
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuccessMsg('Lead created successfully!');
      if (onLeadCreated) onLeadCreated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-surface-1 border border-border-subtle rounded-xl w-full ${loading && activeTab === 'maps' ? 'max-w-xl' : 'max-w-lg'} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-2/40">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Lead Ingestion Engine</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-4 border-b border-border-subtle bg-surface-2/40 text-xs font-medium text-gray-500 dark:text-gray-400">
          <button
            onClick={() => { setActiveTab('maps'); setError(null); }}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'maps' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-1 font-semibold' : 'hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <span>Maps Radar</span>
          </button>
          <button
            onClick={() => { setActiveTab('search'); setError(null); }}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'search' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-1 font-semibold' : 'hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            <Search className="h-3.5 w-3.5 text-blue-500" />
            <span>Crawler</span>
          </button>
          <button
            onClick={() => { setActiveTab('csv'); setError(null); }}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'csv' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-1 font-semibold' : 'hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            <UploadCloud className="h-3.5 w-3.5 text-emerald-500" />
            <span>CSV Import</span>
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setError(null); }}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'manual' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-1 font-semibold' : 'hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            <Plus className="h-3.5 w-3.5 text-purple-500" />
            <span>Manual</span>
          </button>
        </div>

        {/* Notifications & Live Stopwatch */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Live Progress Telemetry HUD for Google Maps Radar */}
        {loading && activeTab === 'maps' && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-surface-2 border border-brand/30 shadow-xl animate-in fade-in zoom-in-95 duration-200 space-y-3.5">
            {/* Top Bar: Status, Workers, Speed, and Elapsed Clock */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    {telemetry?.status === 'deduplicating' ? 'Deduplicating' : 'Live Harvester'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ⚡ {telemetry?.activeWorkers || 8} Workers
                  </span>
                  {telemetry && telemetry.speedPerMin > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                      ⚡ ~{telemetry.speedPerMin} places/min
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelHarvest}
                  disabled={isCancelling}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors flex items-center gap-1"
                  title="Stop scraper and conclude harvest immediately"
                >
                  <X className="h-3 w-3" />
                  <span>{isCancelling ? 'Stopping...' : 'Stop'}</span>
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand/10 border border-brand/20 text-brand font-mono font-bold text-sm tracking-widest shadow-inner">
                  <Clock className="h-4 w-4 animate-spin text-brand" style={{ animationDuration: '3s' }} />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Stage Text & Mathematical Percentage */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5 truncate max-w-[80%]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand shrink-0" />
                  <span className="truncate">
                    {telemetry?.status === 'deduplicating'
                      ? 'Deduplicating & saving fresh leads to collection...'
                      : telemetry?.placesHarvested > 0
                        ? `Harvesting places across ${telemetry.currentSubRegion || mapsLocation}...`
                        : elapsedSeconds < 10
                          ? 'Spawning parallel browser workers across hardware threads...'
                          : `Extracting Google Maps places across ${mapsLocation}...`}
                  </span>
                </span>
                <span className="text-xs font-mono font-bold text-brand shrink-0">
                  {telemetry?.percent ? `${telemetry.percent}%` : `${Math.min(95, Math.max(5, Math.round((elapsedSeconds / 60) * 100)))}%`}
                </span>
              </div>

              {/* Real Mathematical Progress Bar */}
              <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden shadow-inner p-0.5">
                <div
                  className="bg-gradient-to-r from-brand to-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{
                    width: `${Math.max(4, Math.min(100, telemetry?.percent || Math.round((elapsedSeconds / 60) * 100)))}%`
                  }}
                />
              </div>
            </div>

            {/* 4-Column Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Harvested</span>
                  <MapPin className="h-3.5 w-3.5 text-brand" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-bold font-mono text-gray-900 dark:text-white">
                    {telemetry?.placesHarvested || 0}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    / {mapsLimitOption === 'custom' ? customMapsLimit : mapsLimitOption}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Unique Leads</span>
                  <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="mt-1">
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {telemetry?.uniqueBusinesses || 0}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>With Website</span>
                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                    {telemetry?.withWebsiteCount || 0}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>No Website</span>
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                    {telemetry?.noWebsiteCount || 0}
                  </span>
                  <span className="text-[9px] font-semibold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
                    HOT
                  </span>
                </div>
              </div>
            </div>

            {/* Live Discovery Ticker Feed */}
            {telemetry?.recentPlaces && telemetry.recentPlaces.length > 0 && (
              <div className="pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                    <Sparkles className="h-3 w-3 text-brand" />
                    <span>Live Discovery Feed</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Streaming places...</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {telemetry.recentPlaces.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-1 border border-border-subtle/80 flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white truncate text-[11px]">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {item.city}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.rating && (
                          <div className="flex items-center gap-0.5 text-[10px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            <span>{item.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {item.hasNoWebsite ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                            <Flame className="h-2.5 w-2.5" />
                            <span>No Website</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                            <Globe className="h-2.5 w-2.5" />
                            <span>Website</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Crawler Search Loading Panel */}
        {loading && activeTab !== 'maps' && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-surface-2 border border-brand/30 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  Web Crawler Engine
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand/10 border border-brand/20 text-brand font-mono font-bold text-sm tracking-widest shadow-inner">
                <Clock className="h-4 w-4 animate-spin text-brand" style={{ animationDuration: '3s' }} />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                  Searching & parsing prospects...
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  {elapsedSeconds}s elapsed
                </span>
              </div>
              <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all duration-500 ease-out animate-pulse"
                  style={{
                    width: `${Math.min(95, Math.max(15, (elapsedSeconds / 30) * 100))}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Completion Notification Card */}
        {successMsg && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Scraping Complete!
                  </h4>
                  {finalTimeStr && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-mono font-bold text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {finalTimeStr}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                  {successMsg}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>View Generated Leads in Dashboard</span>
                    <span className="text-[10px]">➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 0: Google Maps Lead Radar Form */}
        {activeTab === 'maps' && (
          <form onSubmit={handleMapsSearch} className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Local Standalone Scraper Engine</span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  High-speed Go binary extraction directly from Google Maps places. 0 Docker required, 0 SaaS subscription costs.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Target Niche or Business Keyword <span className="text-brand font-mono text-[10px]">(Auto-creates its own Collection)</span>
              </label>
              <input
                type="text"
                value={mapsKeyword}
                onChange={(e) => setMapsKeyword(e.target.value)}
                placeholder="e.g. Roofing Contractors, MedSpa, Dental Clinic, Solar, Plumbers"
                required
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target City / State</label>
                <input
                  type="text"
                  value={mapsLocation}
                  onChange={(e) => setMapsLocation(e.target.value)}
                  placeholder="e.g. Austin, TX or Miami, FL"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Places to Harvest</label>
                <select
                  value={mapsLimitOption}
                  onChange={(e) => setMapsLimitOption(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
                >
                  <option value="20">20 Places (Quick Scan)</option>
                  <option value="50">50 Places (Medium Batch)</option>
                  <option value="100">100 Places</option>
                  <option value="250">250 Places (Broad Search)</option>
                  <option value="500">500 Places (Metro Sweep)</option>
                  <option value="1000">1,000 Places (Deep Regional Run)</option>
                  <option value="custom">✏️ Custom Quantity (Enter Any Number: 1000, 2000, 3000+)...</option>
                </select>
              </div>
            </div>

            {mapsLimitOption === 'custom' && (
              <div className="p-3 rounded-lg bg-surface-2/80 border border-brand/30 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
                    <span>Custom Quantity of Leads to Scrape</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">Unlimited (e.g. 500 – 5,000+)</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={customMapsLimit}
                    onChange={(e) => setCustomMapsLimit(e.target.value)}
                    placeholder="e.g. 500, 1000, 2000, 3000, 5000"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface-1 border border-brand/40 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <div className="absolute right-2.5 top-2 flex items-center gap-1">
                    <span className="text-[10px] font-medium text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                      places
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Engine will dynamically harvest and deduplicate precisely {customMapsLimit || 0} authentic places into your database.
                </p>
              </div>
            )}

            <p className="text-[11px] text-gray-500 italic">
              Extracts business name, phone, verified address, rating, review count, and canonical website domain into your CRM.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors shadow-sm shadow-brand/20 font-mono"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                <span>
                  {loading
                    ? telemetry && telemetry.placesHarvested > 0
                      ? `Harvested ${telemetry.placesHarvested} (${formatTimer(elapsedSeconds)})...`
                      : `Harvesting (${formatTimer(elapsedSeconds)})...`
                    : 'Launch Maps Radar'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 1: Web Search Crawler Form */}
        {activeTab === 'search' && (
          <form onSubmit={handleCrawlerSearch} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Target Niche or Business Keyword <span className="text-brand font-mono text-[10px]">(Auto-creates its own Collection)</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Roofing Contractors, Dental Clinics, Shopify Brands"
                required
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target City / Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin TX, Miami, London"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Prospects to Fetch</label>
                <select
                  value={crawlerLimitOption}
                  onChange={(e) => setCrawlerLimitOption(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
                >
                  <option value="10">10 Prospects</option>
                  <option value="25">25 Prospects</option>
                  <option value="50">50 Prospects</option>
                  <option value="100">100 Prospects</option>
                  <option value="250">250 Prospects</option>
                  <option value="500">500 Prospects</option>
                  <option value="custom">✏️ Custom Quantity (Enter Any Number)...</option>
                </select>
              </div>
            </div>

            {crawlerLimitOption === 'custom' && (
              <div className="p-3 rounded-lg bg-surface-2/80 border border-blue-500/30 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <span>Custom Quantity of Prospects to Crawl</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">Unlimited (1 – 50,000+)</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={customCrawlerLimit}
                    onChange={(e) => setCustomCrawlerLimit(e.target.value)}
                    placeholder="e.g. 50, 100, 250, 500, 1000"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface-1 border border-blue-500/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <div className="absolute right-2.5 top-2 flex items-center gap-1">
                    <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      prospects
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Crawler will fetch and filter clean website leads up to {customCrawlerLimit || 0} prospects.
                </p>
              </div>
            )}

            <p className="text-[11px] text-gray-500 italic">
              Searches verified local businesses, filters directory noise, and automatically ingests clean websites into your database.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors shadow-sm shadow-brand/20 font-mono"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>{loading ? `Crawling (${formatTimer(elapsedSeconds)})...` : 'Run Search Crawler'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Batch CSV Import */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Upload CSV File</label>
              <div className="border-2 border-dashed border-border-subtle hover:border-brand/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-surface-2/40">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="h-8 w-8 text-brand mb-2" />
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {csvFile ? `Selected: ${csvFile.name} (${(csvFile.size / 1024).toFixed(1)} KB)` : 'Click to select CSV file or drag and drop'}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1">
                    Accepts Google Maps exports, roofer/business CSVs, Apollo/directory leads (name, phone, rating, reviews, maps link, website)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !csvFile}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                <span>{loading ? 'Importing CSV...' : 'Import Leads'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Manual Lead Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company / Business Name *</label>
              <input
                type="text"
                value={manualForm.business_name}
                onChange={(e) => setManualForm({ ...manualForm, business_name: e.target.value })}
                placeholder="e.g. Apex Roofing Texas"
                required
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL (Optional)</label>
              <input
                type="text"
                value={manualForm.website}
                onChange={(e) => setManualForm({ ...manualForm, website: e.target.value })}
                placeholder="e.g. apexroofingtx.com (optional)"
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  placeholder="e.g. (512) 555-0199"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={manualForm.city}
                  onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                  placeholder="e.g. Austin, TX"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category / Industry</label>
              <input
                type="text"
                value={manualForm.category}
                onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                placeholder="e.g. Roofing, MedSpa, HVAC"
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Save Prospect</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
