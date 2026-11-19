import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  RiSearchLine, 
  RiMapPinLine, 
  RiGlobalLine, 
  RiPhoneLine, 
  RiStarFill, 
  RiShieldCheckLine, 
  RiUploadCloud2Line,
  RiLoader4Line,
  RiCheckLine,
  RiCloseLine,
  RiCompass3Line,
  RiFilterLine,
  RiArrowRightLine,
  RiTimeLine,
  RiInformationLine,
  RiLayoutGridLine,
  RiMap2Line
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { toast } from '@/components/base/toast/toast';
import { cx } from '@/utils/cx';

export default function FindProspectsPage({ 
  onSelectLead, 
  onViewSavedLeads, 
  onRefresh, 
  onOpenCsvUpload 
}) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('25');
  const [isSearching, setIsSearching] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [activeJobId, setActiveJobId] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Harvested businesses in current preview session
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [savingToLeads, setSavingToLeads] = useState(false);

  // Filters
  const [websiteFilter, setWebsiteFilter] = useState('any'); // 'any', 'no_website', 'has_website'
  const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '4.5', '4.0', 'unrated'
  const [phoneFilter, setPhoneFilter] = useState('all'); // 'all', 'has_phone'
  const [viewMode, setViewMode] = useState('split'); // 'split', 'map', 'list'
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const sseRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Clean up streaming telemetry on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (_) {}
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const trade = keyword.trim();
    const city = location.trim();

    if (!trade || !city) {
      toast.error('Please enter both a trade/keyword and a city/location.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResults([]);
    setSelectedIds(new Set());
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setActiveJobId(jobId);
    setTelemetry({ status: 'running', percent: 5, currentPhase: 'Scanning Google Maps...' });

    // Establish live SSE telemetry stream
    try {
      const sse = new EventSource(`/api/search/maps/stream/${jobId}`);
      sseRef.current = sse;
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.status) {
            setTelemetry(prev => ({ ...(prev || {}), ...data }));
          }
        } catch (_) {}
      };
      sse.onerror = () => {
        if (sseRef.current) {
          try { sseRef.current.close(); } catch (_) {}
          sseRef.current = null;
        }
      };
    } catch (_) {}

    try {
      const res = await fetch('/api/search/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: trade,
          location: city,
          limit: 30,
          jobId,
          country: /kuwait|kw|shuwaikh|salmiya|hawally/i.test(city) ? 'KW' : 'US'
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No response from map harvester');
      }

      const rawLeads = data.leads || [];
      setResults(rawLeads);
      // Pre-select all returned leads
      setSelectedIds(new Set(rawLeads.map((l, i) => l.id || `lead_${i}`)));
      toast.success(`Discovered ${rawLeads.length} businesses in ${city}!`, {
        description: 'Preview them below and add the ones you want to your saved leads.'
      });
    } catch (err) {
      setSearchError(err.message || 'Failed to search map records');
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearching(false);
      if (sseRef.current) {
        try { sseRef.current.close(); } catch (_) {}
        sseRef.current = null;
      }
    }
  };

  // Filtered Results
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // Website filter
      const hasWeb = Boolean(item.website && item.website !== 'None' && item.website.trim() !== '');
      if (websiteFilter === 'no_website' && hasWeb) return false;
      if (websiteFilter === 'has_website' && !hasWeb) return false;

      // Rating filter
      const rating = Number(item.rating) || 0;
      if (ratingFilter === '4.5' && rating < 4.5) return false;
      if (ratingFilter === '4.0' && rating < 4.0) return false;
      if (ratingFilter === 'unrated' && rating > 0) return false;

      // Phone filter
      if (phoneFilter === 'has_phone' && !item.phone) return false;

      return true;
    });
  }, [results, websiteFilter, ratingFilter, phoneFilter]);

  const allFilteredSelected = filteredResults.length > 0 && filteredResults.every((l, i) => selectedIds.has(l.id || `lead_${i}`));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((l, i) => l.id || `lead_${i}`)));
    }
  };

  const handleToggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Save selected leads to main database
  const handleSaveToLeads = async () => {
    const leadsToSave = results.filter((l, i) => selectedIds.has(l.id || `lead_${i}`));
    if (leadsToSave.length === 0) {
      toast.error('No businesses selected');
      return;
    }

    setSavingToLeads(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToSave })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${leadsToSave.length} businesses to your saved leads list!`, {
          description: 'You can now view, research, and outreach to them in All Saved Leads.'
        });
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to save leads');
      }
    } catch (err) {
      toast.error('Network error saving leads');
    } finally {
      setSavingToLeads(false);
    }
  };

  const activeLead = filteredResults[activePreviewIndex] || filteredResults[0] || null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-canvas text-text-primary">
      {/* Top Breadcrumb & Page Header */}
      <header className="px-6 py-4 border-b border-separator-border bg-background-primary-default shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-tertiary mb-1">
              <span>Apex Studio</span>
              <span>/</span>
              <span className="text-text-primary font-semibold">Search Businesses</span>
            </div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              Search Businesses
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Search any trade and place. Preview on map, narrow down, then add to your saved leads. Nothing is saved until you approve it.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiUploadCloud2Line}
              onClick={onOpenCsvUpload}
              title="Import spreadsheet of existing businesses"
            >
              Upload a CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* Prominent Search Bar (Free-form Trade + Location) */}
        <form 
          onSubmit={handleSearch}
          className="rounded-2xl border border-separator-border bg-background-primary-default p-4 sm:p-5 shadow-xs space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Keyword / Trade (Free-form text input) */}
            <div className="md:col-span-5 relative">
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block mb-1.5 font-semibold">
                Trade or Business Type
              </label>
              <div className="relative flex items-center">
                <RiSearchLine className="size-4 text-text-tertiary absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. dentist, roofing, car detailing, villa fit-out"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-background-secondary-default border border-separator-border text-xs text-text-primary placeholder:text-text-tertiary focus:border-text-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Location (City, Area or ZIP) */}
            <div className="md:col-span-4 relative">
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block mb-1.5 font-semibold">
                Location or City
              </label>
              <div className="relative flex items-center">
                <RiMapPinLine className="size-4 text-text-tertiary absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, address or area (e.g. Shuwaikh, Kuwait or Austin, TX)"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-background-secondary-default border border-separator-border text-xs text-text-primary placeholder:text-text-tertiary focus:border-text-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Search Radius */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block mb-1.5 font-semibold">
                Distance Radius
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background-secondary-default border border-separator-border text-xs text-text-primary focus:border-text-primary focus:outline-none transition-colors cursor-pointer"
              >
                <option value="5">5 miles (Town center)</option>
                <option value="10">10 miles (City wide)</option>
                <option value="25">25 miles (Standard area)</option>
                <option value="50">50 miles (Metro region)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-1 pt-0 md:pt-5">
              <Button
                type="submit"
                variant="primary"
                size="medium"
                disabled={isSearching}
                className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 border-0"
              >
                {isSearching ? <RiLoader4Line className="size-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Quick Trade Inspiration Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-separator-border/60 text-xs">
            <span className="text-[11px] text-text-tertiary font-mono">Popular searches:</span>
            {[
              { t: 'Interior Design', c: 'Shuwaikh' },
              { t: 'Dental Clinic', c: 'Salmiya' },
              { t: 'Car Detailing', c: 'Kuwait City' },
              { t: 'Roofing Contractor', c: 'Austin, TX' },
              { t: 'Flooring & Tiling', c: 'Tampa, FL' },
              { t: 'AC Maintenance', c: 'Hawally' }
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setKeyword(p.t);
                  setLocation(p.c);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-background-secondary-default hover:bg-background-secondary-hover border border-separator-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {p.t} in {p.c}
              </button>
            ))}
          </div>
        </form>

        {/* Live Search Status / Progress Banner */}
        {isSearching && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <RiLoader4Line className="size-5 text-blue-500 animate-spin shrink-0" />
              <div>
                <span className="font-semibold text-text-primary">Scanning Google Maps radar live... </span>
                <span className="text-text-secondary">
                  {telemetry?.currentPhase || `Searching "${keyword}" in "${location}"`}
                </span>
              </div>
            </div>
            {telemetry?.percent && (
              <span className="font-mono text-blue-500 font-bold">{telemetry.percent}%</span>
            )}
          </div>
        )}

        {searchError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <RiInformationLine className="size-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Results Workspace (When results exist) */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Filter Column (12 cols on mobile, 3 cols on desktop) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-2xl border border-separator-border bg-background-primary-default p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-separator-border">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary font-semibold flex items-center gap-1.5">
                    <RiFilterLine className="size-3.5" />
                    <span>Filter Results</span>
                  </h3>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {filteredResults.length} / {results.length}
                  </span>
                </div>

                {/* Filter 1: Website Status */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-secondary block">
                    Website Status
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: 'any', label: 'Any Status' },
                      { id: 'no_website', label: 'No Website Only (High intent)' },
                      { id: 'has_website', label: 'Has Website' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setWebsiteFilter(opt.id)}
                        className={cx(
                          "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                          websiteFilter === opt.id
                            ? "bg-blue-500/15 border-blue-500/40 text-blue-400 font-semibold"
                            : "bg-background-secondary-default border-separator-border text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Rating */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-secondary block">
                    Customer Reviews
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: '4.5', label: '4.5+ Stars' },
                      { id: '4.0', label: '4.0+ Stars' },
                      { id: 'unrated', label: 'Unrated' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRatingFilter(opt.id)}
                        className={cx(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer",
                          ratingFilter === opt.id
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold"
                            : "bg-background-secondary-default border-separator-border text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 3: Phone line */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-text-secondary block">
                    Contact Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setPhoneFilter(phoneFilter === 'has_phone' ? 'all' : 'has_phone')}
                    className={cx(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center justify-between",
                      phoneFilter === 'has_phone'
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold"
                        : "bg-background-secondary-default border-separator-border text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <span>Has Phone Line</span>
                    {phoneFilter === 'has_phone' && <RiCheckLine className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Display Area (Map + Preview Cards) */}
            <div className="lg:col-span-9 space-y-4">
              {/* Header Bar with View Switcher and Selection */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-background-primary-default border border-separator-border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="size-4 rounded border-separator-border text-blue-600 focus:ring-0 cursor-pointer"
                    id="select-all-filtered"
                  />
                  <label htmlFor="select-all-filtered" className="text-xs font-semibold text-text-primary cursor-pointer select-none">
                    Select All ({selectedIds.size} of {filteredResults.length} selected)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-background-secondary-default p-0.5 rounded-lg border border-separator-border">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={cx(
                        "px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex items-center gap-1",
                        viewMode === 'split' ? "bg-background-primary-default text-text-primary shadow-2xs font-bold" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <RiMap2Line className="size-3.5" />
                      <span>Map & List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cx(
                        "px-2.5 py-1 rounded text-xs font-medium cursor-pointer flex items-center gap-1",
                        viewMode === 'list' ? "bg-background-primary-default text-text-primary shadow-2xs font-bold" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <RiLayoutGridLine className="size-3.5" />
                      <span>List Only</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Grid: Map + List */}
              <div className={cx(
                "grid gap-4",
                viewMode === 'split' ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
              )}>
                {/* Visual Map Representation */}
                {viewMode === 'split' && (
                  <div className="lg:col-span-6 rounded-2xl border border-separator-border bg-background-primary-default overflow-hidden min-h-[460px] flex flex-col relative shadow-xs">
                    {/* Visual Interactive Map Canvas / OSM Tile */}
                    <div className="w-full flex-1 bg-zinc-950 flex flex-col items-center justify-center relative p-4 select-none">
                      {/* Grid Radar Visualizer */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_70%)] pointer-events-none" />
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                      {/* Map Pins Plot */}
                      <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
                        {filteredResults.slice(0, 15).map((biz, idx) => {
                          const isSelected = selectedIds.has(biz.id || `lead_${idx}`);
                          const hasNoWeb = !biz.website || biz.website === 'None';
                          // Calculated pseudo-coordinates spread around center
                          const angle = (idx / 15) * 2 * Math.PI;
                          const dist = 50 + (idx % 4) * 35;
                          const top = `calc(50% + ${Math.sin(angle) * dist}px)`;
                          const left = `calc(50% + ${Math.cos(angle) * dist}px)`;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePreviewIndex(idx)}
                              style={{ top, left }}
                              title={`${biz.business_name || 'Business'} (${hasNoWeb ? 'No Website' : 'Has Website'})`}
                              className={cx(
                                "absolute size-7 -ml-3.5 -mt-3.5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-transform hover:scale-125 cursor-pointer shadow-lg",
                                isSelected ? "ring-2 ring-white" : "opacity-80",
                                hasNoWeb 
                                  ? "bg-rose-500 text-white" 
                                  : "bg-emerald-500 text-white"
                              )}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}

                        {/* Center Center Radar Pin */}
                        <div className="size-4 rounded-full bg-blue-500 ring-4 ring-blue-500/30 flex items-center justify-center animate-pulse">
                          <div className="size-1.5 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Map Legend */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-text-tertiary bg-background-primary-default/90 backdrop-blur-xs p-2 rounded-xl border border-separator-border">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-rose-500" />
                            <span>No Website ({filteredResults.filter(r => !r.website || r.website === 'None').length})</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span>Has Website ({filteredResults.filter(r => r.website && r.website !== 'None').length})</span>
                          </span>
                        </div>
                        <span>Radius: {radius} miles</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Businesses Cards Column */}
                <div className={cx(
                  "space-y-3 overflow-y-auto max-h-[600px] pr-1",
                  viewMode === 'split' ? "lg:col-span-6" : "w-full"
                )}>
                  {filteredResults.map((item, idx) => {
                    const itemId = item.id || `lead_${idx}`;
                    const isSelected = selectedIds.has(itemId);
                    const hasWeb = Boolean(item.website && item.website !== 'None' && item.website.trim() !== '');

                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleItem(itemId)}
                        className={cx(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs space-y-2.5",
                          isSelected
                            ? "bg-background-primary-default border-blue-500/60 ring-1 ring-blue-500/30"
                            : "bg-background-primary-default border-separator-border hover:border-text-secondary"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleItem(itemId)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 size-4 rounded border-separator-border text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-text-primary leading-tight">
                                {item.business_name}
                              </h4>
                              <p className="text-[11px] text-text-secondary mt-0.5">
                                {item.category || item.google_category || keyword || 'Local Trade'} • {item.city || location}
                              </p>
                            </div>
                          </div>

                          {/* Website Status Badge */}
                          {hasWeb ? (
                            <Chip variant="subtle" color="emerald" size="sm" className="font-mono text-[10px]">
                              Has Website
                            </Chip>
                          ) : (
                            <Chip variant="subtle" color="rose" size="sm" className="font-mono text-[10px] font-bold">
                              No Website
                            </Chip>
                          )}
                        </div>

                        {/* Contacts & Ratings row */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary pt-1.5 border-t border-separator-border/60">
                          <div className="flex items-center gap-3">
                            {item.phone ? (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <RiPhoneLine className="size-3" />
                                <span>{item.phone}</span>
                              </span>
                            ) : (
                              <span className="text-text-tertiary">No phone listed</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {item.rating ? (
                              <>
                                <RiStarFill className="size-3 text-amber-400" />
                                <span className="font-bold text-text-primary">{item.rating}</span>
                                <span className="text-text-tertiary">({item.reviews_count || 0})</span>
                              </>
                            ) : (
                              <span className="text-text-tertiary">Unrated</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Floating Bottom Action Bar: + Get these businesses */}
              <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-background-primary-default border border-separator-border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    {selectedIds.size} of {filteredResults.length} businesses selected
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    Nothing is saved to your CRM list until you click &quot;Get these businesses&quot;.
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="medium"
                    disabled={selectedIds.size === 0 || savingToLeads}
                    onClick={handleSaveToLeads}
                    leadingIcon={savingToLeads ? RiLoader4Line : RiCheckLine}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 border-0"
                  >
                    {savingToLeads ? 'Adding to Leads...' : `+ Get these businesses (${selectedIds.size})`}
                  </Button>

                  <Button
                    variant="secondary"
                    size="medium"
                    onClick={onViewSavedLeads}
                    className="text-xs"
                  >
                    View All Saved Leads →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State before search */}
        {!isSearching && results.length === 0 && !searchError && (
          <div className="p-12 text-center rounded-2xl border border-separator-border bg-background-primary-default space-y-3">
            <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <RiSearchLine className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">
              Find New Local Businesses
            </h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
              Enter any trade (e.g. dentist, interior design, roofing) and a city (e.g. Kuwait City, Shuwaikh, Austin, Tampa) above to preview and collect leads.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
