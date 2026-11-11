import React, { useState, useRef, useEffect } from 'react';
import { 
  RiCloseLine, 
  RiSearchLine, 
  RiUploadCloud2Line, 
  RiAddLine, 
  RiLoader4Line, 
  RiCheckLine, 
  RiMapPinLine, 
  RiTimeLine, 
  RiFlashlightFill, 
  RiFireLine, 
  RiBuildingLine, 
  RiStarFill, 
  RiSparklingLine, 
  RiGlobalLine,
  RiMapPin2Line,
  RiArrowDownSLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';

export const SUPPORTED_COUNTRIES = [
  {
    code: 'US',
    name: 'United States',
    dial: '+1',
    currency: '$',
    example: 'e.g. Austin, TX or Miami, FL',
    topCities: [
      'Austin, TX',
      'Dallas, TX',
      'Houston, TX',
      'San Antonio, TX',
      'Miami, FL',
      'Tampa, FL',
      'Orlando, FL',
      'Atlanta, GA',
      'Phoenix, AZ',
      'Los Angeles, CA',
      'San Diego, CA',
      'San Francisco, CA',
      'Chicago, IL',
      'New York, NY',
      'Denver, CO',
      'Seattle, WA',
      'Charlotte, NC',
      'Las Vegas, NV',
      'Nashville, TN',
      'Boston, MA'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dial: '+44',
    currency: '£',
    example: 'e.g. London, Manchester, Bristol',
    topCities: [
      'London',
      'Manchester',
      'Birmingham',
      'Leeds',
      'Glasgow',
      'Liverpool',
      'Bristol',
      'Sheffield',
      'Edinburgh',
      'Newcastle',
      'Nottingham',
      'Cardiff',
      'Belfast'
    ]
  },
  {
    code: 'AU',
    name: 'Australia',
    dial: '+61',
    currency: 'A$',
    example: 'e.g. Sydney, Melbourne, Brisbane',
    topCities: [
      'Sydney',
      'Melbourne',
      'Brisbane',
      'Perth',
      'Adelaide',
      'Gold Coast',
      'Canberra',
      'Newcastle',
      'Sunshine Coast',
      'Wollongong',
      'Geelong',
      'Hobart'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    dial: '+1',
    currency: 'C$',
    example: 'e.g. Toronto, Vancouver, Calgary',
    topCities: [
      'Toronto',
      'Vancouver',
      'Montreal',
      'Calgary',
      'Edmonton',
      'Ottawa',
      'Winnipeg',
      'Quebec City',
      'Hamilton',
      'Kitchener',
      'Halifax',
      'Victoria'
    ]
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dial: '+971',
    currency: 'AED',
    example: 'e.g. Dubai, Abu Dhabi, Sharjah',
    topCities: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Al Ain',
      'Fujairah',
      'Umm Al Quwain'
    ]
  }
];

export const TRADE_CATEGORIES = [
  {
    category: 'Contractor & Home Services',
    trades: [
      'Roofing Contractors',
      'HVAC & Air Conditioning',
      'Plumbing Contractors',
      'Electricians',
      'General Contractors',
      'Remodeling & Renovation',
      'Home Builders',
      'Commercial Contractors',
      'Painters & Painting Contractors',
      'Landscaping & Lawn Care',
      'Hardscaping & Patios',
      'Swimming Pool Builders',
      'Siding, Gutters & Windows',
      'Handyman Services',
      'Flooring & Tiling',
      'Concrete & Masonry',
      'Solar Panel Contractors',
      'Pest Control Services',
      'Tree Service & Arborists',
      'Garage Door Repair',
      'Insulation Contractors',
      'Cleaning & Pressure Washing'
    ]
  },
  {
    category: 'Restaurants & Hospitality',
    trades: [
      'Restaurants',
      'Italian Restaurants',
      'Mexican Restaurants',
      'Pizza & Pizzerias',
      'Cafes & Coffee Shops',
      'Bakeries & Pastry Shops',
      'Steakhouses & BBQ',
      'Seafood Restaurants',
      'Catering Services',
      'Food Trucks',
      'Bars & Breweries'
    ]
  },
  {
    category: 'Medical, Dental & Wellness',
    trades: [
      'Dentists & Dental Clinics',
      'Orthodontists',
      'Med Spas & Aesthetics',
      'Chiropractors',
      'Physical Therapy Clinics',
      'Optometrists & Eye Clinics',
      'Plastic Surgery Clinics',
      'Dermatologists',
      'Veterinary Clinics',
      'Mental Health & Counseling'
    ]
  },
  {
    category: 'Professional & Business Services',
    trades: [
      'Law Firms & Attorneys',
      'Accounting & CPA Firms',
      'Real Estate Agencies',
      'Insurance Agencies',
      'Financial Advisors',
      'Marketing & Creative Agencies'
    ]
  },
  {
    category: 'Automotive Services',
    trades: [
      'Auto Repair & Mechanics',
      'Auto Body & Collision Shops',
      'Car Detailing & Tinting',
      'Tire & Brake Shops',
      'Towing Services'
    ]
  },
  {
    category: 'Personal Care & Fitness',
    trades: [
      'Hair Salons & Barbershops',
      'Nail Salons',
      'Day Spas & Massage',
      'Gyms & Fitness Centers',
      'Personal Training Studios',
      'Martial Arts & Yoga'
    ]
  }
];

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

  // Global Country Scoping
  const [selectedCountry, setSelectedCountry] = useState(() => localStorage.getItem('quarry_selected_country') || 'US');
  const handleCountryChange = (newCountry) => {
    setSelectedCountry(newCountry);
    localStorage.setItem('quarry_selected_country', newCountry);
    setMapsCityOption('');
    setCrawlerCityOption('');
  };

  // Maps Radar form
  const [mapsKeyword, setMapsKeyword] = useState('');
  const [mapsTradeOption, setMapsTradeOption] = useState('');
  const [mapsLocation, setMapsLocation] = useState('');
  const [mapsCityOption, setMapsCityOption] = useState('');
  const [mapsLimitOption, setMapsLimitOption] = useState('100'); // '20', '50', '100', 'custom'
  const [customMapsLimit, setCustomMapsLimit] = useState(100);

  // Crawler search form
  const [keyword, setKeyword] = useState('');
  const [crawlerTradeOption, setCrawlerTradeOption] = useState('');
  const [location, setLocation] = useState('');
  const [crawlerCityOption, setCrawlerCityOption] = useState('');
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
          if (pData?.success) {
            setTelemetry(prev => ({ ...(prev || {}), ...pData }));
          }
        }
      } catch (e) {}
    }, 1000);

    try {
      const res = await fetch('/api/search/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: mapsKeyword, location: mapsLocation, limit: effectiveLimit, jobId, country: selectedCountry })
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
      if (!data || !data.success) throw new Error(data?.error || 'No response data from scraper');

      if (timerRef.current) clearInterval(timerRef.current);
      stopTelemetry();
      const totalSecs = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      const formatted = formatTimer(totalSecs);
      setFinalTimeStr(formatted);
      playChime();
      sendBrowserNotification(
        'Google Maps Scraping Complete!',
        `Harvested ${data.found} verified places (${data.inserted} fresh leads saved) in ${formatted}!`
      );

      setError(null);
      setSuccessMsg(`Google Maps Scraper extracted ${data.found} verified places and inserted ${data.inserted} fresh leads in ${formatted}!`);
      try {
        if (onLeadCreated) onLeadCreated({ found: data.found, inserted: data.inserted, time: formatted, keyword: mapsKeyword });
      } catch (cbErr) {
        console.warn('[SearchModal] onLeadCreated callback error:', cbErr);
      }
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
        body: JSON.stringify({ keyword, location, limit: effectiveLimit, country: selectedCountry })
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
        'Web Crawler Search Complete!',
        `Discovered ${data.found} prospects (${data.inserted} new leads saved) in ${formatted}!`
      );

      setError(null);
      setSuccessMsg(`Discovered ${data.found} prospects and inserted ${data.inserted} new leads in ${formatted}!`);
      try {
        if (onLeadCreated) onLeadCreated({ found: data.found, inserted: data.inserted, time: formatted, keyword });
      } catch (cbErr) {
        console.warn('[SearchModal] onLeadCreated callback error:', cbErr);
      }
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
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open && !loading) onClose(); }}
      size={loading && activeTab === 'maps' ? 'lg' : 'md'}
      aria-label="Lead Ingestion Engine"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-2">
          <RiSearchLine className="h-4 w-4 text-accent-500" />
          <h2 className="text-sm font-semibold text-text-primary">Lead Ingestion Engine</h2>
        </div>
        <CloseButton
          size="md"
          onClick={onClose}
          disabled={loading}
          aria-label="Close Modal"
        />
      </div>

      {/* Tab Buttons using BoardUI PillTabs */}
      <div className="px-5 py-2.5 border-b border-separator-border bg-background-secondary-default shrink-0">
        <PillTabList className="w-full flex justify-between gap-1 overflow-x-auto no-scrollbar">
          <PillTab
            variant="blue"
            icon={RiMapPin2Line}
            isSelected={activeTab === 'maps'}
            disabled={loading}
            onSelect={() => { if (!loading) { setActiveTab('maps'); setError(null); } }}
          >
            Maps Radar
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiSearchLine}
            isSelected={activeTab === 'search'}
            disabled={loading}
            onSelect={() => { if (!loading) { setActiveTab('search'); setError(null); } }}
          >
            Crawler
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiUploadCloud2Line}
            isSelected={activeTab === 'csv'}
            disabled={loading}
            onSelect={() => { if (!loading) { setActiveTab('csv'); setError(null); } }}
          >
            CSV Import
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiAddLine}
            isSelected={activeTab === 'manual'}
            disabled={loading}
            onSelect={() => { if (!loading) { setActiveTab('manual'); setError(null); } }}
          >
            Manual
          </PillTab>
        </PillTabList>
      </div>

      <ModalBody className="p-0 gap-0 flex-1 overflow-y-auto">

        {/* Notifications & Live Stopwatch */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Live Progress Telemetry HUD for Google Maps Radar */}
        {loading && activeTab === 'maps' && (
          <div className="p-6">
            <div className="p-5 rounded-2xl bg-background-secondary-default border border-border-focus-ring/40 shadow-xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            {/* Top Bar: Status, Workers, Speed, and Elapsed Clock */}
            <div className="flex items-center justify-between pb-3 border-b border-separator-border">
              <div className="flex items-center gap-2">
                <StatusDot color="green" className="animate-pulse" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                    {telemetry?.status === 'deduplicating' ? 'Deduplicating' : 'Live Harvester'}
                  </span>
                  <Chip variant="caption" color="lime">
                    {telemetry?.activeWorkers || 8} Workers
                  </Chip>
                  {telemetry && telemetry.speedPerMin > 0 && (
                    <Chip variant="caption" color="yellow" className="animate-pulse font-mono">
                      ~{telemetry.speedPerMin} places/min
                    </Chip>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="xs"
                  variant="danger"
                  onClick={handleCancelHarvest}
                  disabled={isCancelling}
                  leadingIcon={RiCloseLine}
                  title="Stop scraper and conclude harvest immediately"
                >
                  {isCancelling ? 'Stopping...' : 'Stop'}
                </Button>
                <Chip variant="bold" color="blue" className="gap-1 inline-flex items-center font-mono">
                  <RiTimeLine className="size-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </Chip>
              </div>
            </div>

            {/* Stage Text & Mathematical Percentage */}
            <div>
              <div className="flex items-center justify-between text-caption-1-regular mb-1.5">
                <span className="font-medium text-text-primary flex items-center gap-1.5 truncate max-w-[80%]">
                  <RiLoader4Line className="size-3.5 animate-spin text-status-blue-text shrink-0" />
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
                <span className="text-caption-1-semibold font-mono text-status-blue-text shrink-0">
                  {telemetry?.percent ? `${telemetry.percent}%` : `${Math.min(95, Math.max(5, Math.round((elapsedSeconds / 60) * 100)))}%`}
                </span>
              </div>

              {/* Real Mathematical Progress Bar */}
              <div className="w-full bg-background-primary-default h-2 rounded-full overflow-hidden border border-separator-border p-0.5">
                <div
                  className="bg-status-blue-text h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{
                    width: `${Math.max(4, Math.min(100, telemetry?.percent || Math.round((elapsedSeconds / 60) * 100)))}%`
                  }}
                />
              </div>
            </div>

            {/* 4-Column Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-caption-1-regular text-text-tertiary">
                  <span>Harvested</span>
                  <RiMapPinLine className="size-3.5 text-status-blue-text" />
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-bold font-mono text-text-primary">
                    {telemetry?.placesHarvested || 0}
                  </span>
                  <span className="text-caption-1-regular text-text-tertiary font-mono">
                    / {mapsLimitOption === 'custom' ? customMapsLimit : mapsLimitOption}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-caption-1-regular text-text-tertiary">
                  <span>Unique Leads</span>
                  <RiBuildingLine className="size-3.5 text-status-lime-text" />
                </div>
                <div className="mt-1">
                  <span className="text-base font-bold font-mono text-status-lime-text">
                    {telemetry?.uniqueBusinesses || 0}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-caption-1-regular text-text-tertiary">
                  <span>With Website</span>
                  <RiGlobalLine className="size-3.5 text-status-blue-text" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-base font-bold font-mono text-status-blue-text">
                    {telemetry?.withWebsiteCount || 0}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-caption-1-regular text-text-tertiary">
                  <span>No Website</span>
                  <RiFireLine className="size-3.5 text-status-rose-text" />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-base font-bold font-mono text-status-rose-text">
                    {telemetry?.noWebsiteCount || 0}
                  </span>
                  <Chip variant="caption" color="rose">
                    HOT
                  </Chip>
                </div>
              </div>
            </div>

            {/* Live Discovery Ticker Feed */}
            {telemetry?.recentPlaces && telemetry.recentPlaces.length > 0 && (
              <div className="pt-2 border-t border-separator-border">
                <div className="flex items-center justify-between text-caption-1-regular mb-2">
                  <div className="flex items-center gap-1.5 text-text-primary font-medium">
                    <RiSparklingLine className="size-3 text-status-blue-text" />
                    <span>Live Discovery Feed</span>
                  </div>
                  <span className="text-caption-1-regular text-text-tertiary font-mono">Streaming places...</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {telemetry.recentPlaces.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-background-primary-default border border-separator-border flex items-center justify-between gap-2 text-caption-1-regular animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-text-primary truncate text-caption-1-semibold">
                          {item.name}
                        </div>
                        <div className="text-caption-1-regular text-text-tertiary truncate">
                          {item.city}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.rating && (
                          <Chip variant="caption" color="yellow" className="gap-0.5 inline-flex items-center font-mono">
                            <RiStarFill className="size-2.5" />
                            <span>{item.rating.toFixed(1)}</span>
                          </Chip>
                        )}
                        {item.hasNoWebsite ? (
                          <Chip variant="caption" color="rose" className="gap-1 inline-flex items-center">
                            <RiFireLine className="size-2.5" />
                            <span>No Website</span>
                          </Chip>
                        ) : (
                          <Chip variant="caption" color="blue" className="gap-1 inline-flex items-center">
                            <RiGlobalLine className="size-2.5" />
                            <span>Website</span>
                          </Chip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Crawler Search Loading Panel */}
        {loading && activeTab !== 'maps' && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-background-secondary-default border border-border-focus-ring/40 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-separator-border">
              <div className="flex items-center gap-2">
                <StatusDot color="green" className="animate-pulse" />
                <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                  Web Crawler Engine
                </span>
              </div>
              <Chip variant="bold" color="blue" className="gap-1 inline-flex items-center font-mono">
                <RiTimeLine className="size-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                <span>{formatTimer(elapsedSeconds)}</span>
              </Chip>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-caption-1-regular text-text-secondary">
                <span className="font-medium flex items-center gap-1.5">
                  <RiLoader4Line className="size-3.5 animate-spin text-status-blue-text" />
                  Searching & parsing prospects...
                </span>
                <span className="text-caption-1-regular font-mono text-text-tertiary">
                  {elapsedSeconds}s elapsed
                </span>
              </div>
              <div className="w-full bg-background-primary-default h-1.5 rounded-full overflow-hidden border border-separator-border">
                <div
                  className="bg-status-blue-text h-full rounded-full transition-all duration-500 ease-out animate-pulse"
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
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-status-lime-background/40 border border-status-lime-background text-status-lime-text shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-status-lime-background text-status-lime-text shrink-0">
                <RiCheckLine className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                    Scraping Complete!
                  </h4>
                  {finalTimeStr && (
                    <Chip variant="bold" color="lime" className="gap-1 inline-flex items-center font-mono">
                      <RiTimeLine className="size-3" />
                      <span>{finalTimeStr}</span>
                    </Chip>
                  )}
                </div>
                <p className="text-caption-1-regular text-text-secondary mt-1 leading-relaxed">
                  {successMsg}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="small"
                    variant="primary"
                    onClick={onClose}
                  >
                    View Generated Leads in Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 0: Google Maps Lead Radar Form */}
        {activeTab === 'maps' && !loading && (
          <form onSubmit={handleMapsSearch} className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-status-blue-background/30 border border-status-blue-background/60 flex items-start gap-2.5 text-caption-1-regular text-text-secondary">
              <RiMapPinLine className="size-4 text-status-blue-text shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary">Local Standalone Scraper Engine</span>
                <p className="text-caption-1-regular text-text-tertiary mt-0.5">
                  High-speed Go binary extraction directly from Google Maps places. 0 Docker required, 0 SaaS subscription costs.
                </p>
              </div>
            </div>

            {/* Trade / Niche Selection (Dropdown + Custom Input) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                  <RiBuildingLine className="size-3.5 text-text-secondary" />
                  <span>Target Trade or Business Niche</span>
                </label>
                <span className="text-status-blue-text font-mono text-[10px]">Select preset or type custom</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* 1. Trade Dropdown */}
                <div className="relative flex items-center">
                  <select
                    value={mapsTradeOption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMapsTradeOption(val);
                      if (val && val !== 'custom') {
                        setMapsKeyword(val);
                      }
                    }}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    <option value="">-- Choose Trade / Niche Preset --</option>
                    {TRADE_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.trades.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">Custom / Write your own...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>

                {/* 2. Write Trade Yourself */}
                <div>
                  <input
                    type="text"
                    value={mapsKeyword}
                    onChange={(e) => {
                      setMapsKeyword(e.target.value);
                      setMapsTradeOption('custom');
                    }}
                    placeholder="e.g. Italian Restaurants, Dentists, MedSpa, Roofing..."
                    required
                    className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary font-medium"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-text-tertiary uppercase font-mono mr-0.5">Popular:</span>
                {[
                  'Roofing Contractors',
                  'HVAC Services',
                  'Plumbing Contractors',
                  'Dentists',
                  'Restaurants',
                  'Med Spas',
                  'Electricians',
                  'Auto Repair'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setMapsKeyword(chip);
                      setMapsTradeOption(chip);
                    }}
                    className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors ${
                      mapsKeyword.toLowerCase() === chip.toLowerCase()
                        ? 'bg-status-blue-background text-status-blue-text border-status-blue-background/80 font-semibold'
                        : 'bg-background-secondary-default text-text-secondary border-separator-border hover:bg-background-secondary-hover hover:text-text-primary'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Geographic & Limit Selection */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {/* 1. Target Country */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                  <RiGlobalLine className="size-3.5 text-text-secondary" />
                  <span>Target Country</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>

              {/* 2. City Dropdown for Selected Country */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                  <RiMapPinLine className="size-3.5 text-text-secondary" />
                  <span>Select City</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    value={mapsCityOption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMapsCityOption(val);
                      if (val && val !== 'custom') {
                        setMapsLocation(val);
                      }
                    }}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    <option value="">-- Choose City --</option>
                    {(SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry)?.topCities || []).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                    <option value="custom">Other / Custom City...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>

              {/* 3. City / Region Input (Type any city or suburb) */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5">City / Suburb / Region</label>
                <input
                  type="text"
                  value={mapsLocation}
                  onChange={(e) => {
                    setMapsLocation(e.target.value);
                    setMapsCityOption('custom');
                  }}
                  placeholder={SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry)?.example || 'e.g. Austin, TX'}
                  required
                  className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary font-medium"
                />
              </div>

              {/* 4. Max Places to Harvest */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5">Max Places</label>
                <div className="relative flex items-center">
                  <select
                    value={mapsLimitOption}
                    onChange={(e) => setMapsLimitOption(e.target.value)}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer"
                  >
                    <option value="20">20 Places (Quick Scan)</option>
                    <option value="50">50 Places (Medium Batch)</option>
                    <option value="100">100 Places</option>
                    <option value="250">250 Places (Broad Search)</option>
                    <option value="500">500 Places (Metro Sweep)</option>
                    <option value="1000">1,000 Places (Deep Regional Run)</option>
                    <option value="custom">Custom Quantity...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>
            </div>

            {mapsLimitOption === 'custom' && (
              <div className="p-3.5 rounded-xl bg-background-secondary-default border border-border-focus-ring/40 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                    <StatusDot color="indigo" />
                    <span>Custom Quantity of Leads to Scrape</span>
                  </label>
                  <span className="text-caption-1-regular text-text-tertiary font-mono">Unlimited (e.g. 500 – 5,000+)</span>
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
                    className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-primary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary font-mono placeholder:text-text-tertiary"
                  />
                  <div className="absolute right-2.5 top-2 flex items-center gap-1">
                    <Chip variant="caption" color="blue">
                      places
                    </Chip>
                  </div>
                </div>
                <p className="text-caption-1-regular text-text-tertiary mt-1">
                  Engine will dynamically harvest and deduplicate precisely {customMapsLimit || 0} authentic places into your database.
                </p>
              </div>
            )}

            <p className="text-caption-1-regular text-text-tertiary italic">
              Extracts business name, phone, verified address, rating, review count, and canonical website domain into your CRM.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={loading}
                leadingIcon={loading ? RiLoader4Line : RiMapPinLine}
              >
                {loading
                  ? telemetry && telemetry.placesHarvested > 0
                    ? `Harvested ${telemetry.placesHarvested} (${formatTimer(elapsedSeconds)})...`
                    : `Harvesting (${formatTimer(elapsedSeconds)})...`
                  : 'Launch Maps Radar'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 1: Web Search Crawler Form */}
        {activeTab === 'search' && !loading && (
          <form onSubmit={handleCrawlerSearch} className="p-6 space-y-4">
            {/* Trade / Niche Selection (Dropdown + Custom Input) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                  <RiBuildingLine className="size-3.5 text-text-secondary" />
                  <span>Target Trade or Business Niche</span>
                </label>
                <span className="text-status-blue-text font-mono text-[10px]">Select preset or type custom</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* 1. Trade Dropdown */}
                <div className="relative flex items-center">
                  <select
                    value={crawlerTradeOption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCrawlerTradeOption(val);
                      if (val && val !== 'custom') {
                        setKeyword(val);
                      }
                    }}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    <option value="">-- Choose Trade / Niche Preset --</option>
                    {TRADE_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.category}>
                        {cat.trades.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">Custom / Write your own...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>

                {/* 2. Write Trade Yourself */}
                <div>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setCrawlerTradeOption('custom');
                    }}
                    placeholder="e.g. Italian Restaurants, Dentists, MedSpa, Roofing..."
                    required
                    className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary font-medium"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-text-tertiary uppercase font-mono mr-0.5">Popular:</span>
                {[
                  'Roofing Contractors',
                  'HVAC Services',
                  'Plumbing Contractors',
                  'Dentists',
                  'Restaurants',
                  'Med Spas',
                  'Electricians',
                  'Auto Repair'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setKeyword(chip);
                      setCrawlerTradeOption(chip);
                    }}
                    className={`px-2 py-0.5 text-[11px] rounded-lg border transition-colors ${
                      keyword.toLowerCase() === chip.toLowerCase()
                        ? 'bg-status-blue-background text-status-blue-text border-status-blue-background/80 font-semibold'
                        : 'bg-background-secondary-default text-text-secondary border-separator-border hover:bg-background-secondary-hover hover:text-text-primary'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Geographic & Limit Selection */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {/* 1. Target Country */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                  <RiGlobalLine className="size-3.5 text-text-secondary" />
                  <span>Target Country</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    value={selectedCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>

              {/* 2. City Dropdown for Selected Country */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                  <RiMapPinLine className="size-3.5 text-text-secondary" />
                  <span>Select City</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    value={crawlerCityOption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCrawlerCityOption(val);
                      if (val && val !== 'custom') {
                        setLocation(val);
                      }
                    }}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer font-medium"
                  >
                    <option value="">-- Choose City --</option>
                    {(SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry)?.topCities || []).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                    <option value="custom">Other / Custom City...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>

              {/* 3. City / Region Input (Type any city or suburb) */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5">City / Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setCrawlerCityOption('custom');
                  }}
                  placeholder={SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry)?.example || 'e.g. Austin, TX'}
                  required
                  className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary font-medium"
                />
              </div>

              {/* 4. Max Prospects to Fetch */}
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1.5">Max Prospects</label>
                <div className="relative flex items-center">
                  <select
                    value={crawlerLimitOption}
                    onChange={(e) => setCrawlerLimitOption(e.target.value)}
                    className="w-full appearance-none px-3 pr-8 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary cursor-pointer"
                  >
                    <option value="10">10 Prospects</option>
                    <option value="25">25 Prospects</option>
                    <option value="50">50 Prospects</option>
                    <option value="100">100 Prospects</option>
                    <option value="250">250 Prospects</option>
                    <option value="500">500 Prospects</option>
                    <option value="custom">Custom Quantity...</option>
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2.5 size-4 text-text-tertiary" />
                </div>
              </div>
            </div>

            {crawlerLimitOption === 'custom' && (
              <div className="p-3.5 rounded-xl bg-background-secondary-default border border-border-focus-ring/40 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-caption-1-semibold text-text-primary flex items-center gap-1.5">
                    <StatusDot color="indigo" />
                    <span>Custom Quantity of Prospects to Crawl</span>
                  </label>
                  <span className="text-caption-1-regular text-text-tertiary font-mono">Unlimited (1 – 50,000+)</span>
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
                    className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-primary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary font-mono placeholder:text-text-tertiary"
                  />
                  <div className="absolute right-2.5 top-2 flex items-center gap-1">
                    <Chip variant="caption" color="blue">
                      prospects
                    </Chip>
                  </div>
                </div>
                <p className="text-caption-1-regular text-text-tertiary mt-1">
                  Crawler will fetch and filter clean website leads up to {customCrawlerLimit || 0} prospects.
                </p>
              </div>
            )}

            <p className="text-caption-1-regular text-text-tertiary italic">
              Searches verified local businesses, filters directory noise, and automatically ingests clean websites into your database.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={loading}
                leadingIcon={loading ? RiLoader4Line : RiSearchLine}
              >
                {loading ? `Crawling (${formatTimer(elapsedSeconds)})...` : 'Run Search Crawler'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Batch CSV Import */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
            <div>
              <label className="block text-caption-1-semibold text-text-primary mb-2">Upload CSV File</label>
              <div className="border-2 border-dashed border-separator-border hover:border-border-focus-ring/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-background-secondary-default/40">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                  <RiUploadCloud2Line className="size-8 text-status-blue-text mb-2" />
                  <span className="text-body-medium font-semibold text-text-primary">
                    {csvFile ? `Selected: ${csvFile.name} (${(csvFile.size / 1024).toFixed(1)} KB)` : 'Click to select CSV file or drag and drop'}
                  </span>
                  <span className="text-caption-1-regular text-text-tertiary mt-1">
                    Accepts Google Maps exports, roofer/business CSVs, Apollo/directory leads (name, phone, rating, reviews, maps link, website)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={loading || !csvFile}
                leadingIcon={loading ? RiLoader4Line : RiUploadCloud2Line}
              >
                {loading ? 'Importing CSV...' : 'Import Leads'}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Manual Lead Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-caption-1-semibold text-text-primary mb-1">Company / Business Name *</label>
              <input
                type="text"
                value={manualForm.business_name}
                onChange={(e) => setManualForm({ ...manualForm, business_name: e.target.value })}
                placeholder="e.g. Apex Roofing Texas"
                required
                className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-caption-1-semibold text-text-primary mb-1">Website URL (Optional)</label>
              <input
                type="text"
                value={manualForm.website}
                onChange={(e) => setManualForm({ ...manualForm, website: e.target.value })}
                placeholder="e.g. apexroofingtx.com (optional)"
                className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1">Phone</label>
                <input
                  type="text"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  placeholder="e.g. (512) 555-0199"
                  className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div>
                <label className="block text-caption-1-semibold text-text-primary mb-1">City</label>
                <input
                  type="text"
                  value={manualForm.city}
                  onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                  placeholder="e.g. Austin, TX"
                  className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption-1-semibold text-text-primary mb-1">Category / Industry</label>
              <input
                type="text"
                value={manualForm.category}
                onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                placeholder="e.g. Roofing, MedSpa, HVAC"
                className="w-full px-3 py-2 text-caption-1-regular rounded-xl bg-background-secondary-default border border-separator-border focus:border-border-focus-ring focus:outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={loading}
                leadingIcon={loading ? RiLoader4Line : RiAddLine}
              >
                Save Prospect
              </Button>
            </div>
          </form>
        )}
      </ModalBody>
    </Modal>
  );
}
