'use client';

import React from 'react';
import { useQuarry } from '../context/QuarryContext';
import { BusinessAvatar } from './BusinessAvatar';
import { Star, CheckCircle, Search, Compass, Globe, AlertTriangle } from 'lucide-react';
import { BusinessItem } from '../types/quarry';

export function BusinessListSidebar() {
  const {
    searchResult,
    selectedId,
    selectBusiness,
    reviewedIds,
    toggleReviewed,
    scanAdjacentSector,
    filterChip,
    setFilterChip,
    filterQuery,
    setFilterQuery,
    isScanning
  } = useQuarry();

  const businesses = searchResult?.businesses || [];

  // Filter businesses by active filter chip and search query
  const filtered = businesses.filter((b) => {
    // Text search query
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchName = b.business_name.toLowerCase().includes(q);
      const matchCat = b.category.toLowerCase().includes(q);
      const matchPhone = b.phone && b.phone.includes(q);
      if (!matchName && !matchCat && !matchPhone) return false;
    }

    // Filter Chips
    if (filterChip === 'unreviewed') {
      return !reviewedIds.has(b.id) && !b.is_reviewed;
    }
    if (filterChip === 'no_website') {
      return b.has_no_website === true || b.has_no_website === 1 || !b.website;
    }
    if (filterChip === 'low_reviews') {
      return (b.reviews_count || 0) < 20;
    }
    return true;
  });

  const totalCount = businesses.length;
  const reviewedCount = businesses.filter(b => reviewedIds.has(b.id) || b.is_reviewed).length;
  const leftCount = Math.max(0, totalCount - reviewedCount);

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] border border-[#171717] rounded-3xl overflow-hidden shadow-xl">
      {/* Top Bar: Counters + Sector Expansion */}
      <div className="p-3 bg-[#0b0b0b] border-b border-[#141414] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#8a8a8a]">Total: <strong className="text-white">{totalCount}</strong></span>
            <span className="text-[#242424]">|</span>
            <span className="text-[#8a8a8a]">Reviewed: <strong className="text-emerald-400">{reviewedCount}</strong></span>
            <span className="text-[#242424]">|</span>
            <span className="text-[#8a8a8a]">Left: <strong className="text-amber-400">{leftCount}</strong></span>
          </div>

          {/* Sector Expansion Buttons: +N, +S, +E, +W */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#7e7e7e] font-mono mr-1">Expand:</span>
            {(['N', 'S', 'E', 'W'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                disabled={isScanning}
                onClick={() => scanAdjacentSector(dir)}
                className="px-1.5 py-0.5 rounded-[8px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/25 transition-all disabled:opacity-40"
                title={`Expand scan sector to the ${dir}`}
              >
                +{dir}
              </button>
            ))}
          </div>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a8a8a]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by name, trade, or phone..."
            className="w-full bg-[#050505] border border-[#171717] focus:border-emerald-500/50 rounded-[12px] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#7e7e7e] outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'unreviewed', label: 'Unreviewed' },
            { id: 'no_website', label: 'No Website' },
            { id: 'low_reviews', label: 'Low Rev' }
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterChip(chip.id as any)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                filterChip === chip.id
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-[#050505] border border-[#171717] text-[#8a8a8a] hover:text-[#cfcfcf] hover:border-[#242424]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Business List Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#141414] p-1.5 space-y-1">
        {filtered.length > 0 ? (
          filtered.map((b) => {
            const isSelected = b.id === selectedId;
            const isReviewed = reviewedIds.has(b.id) || b.is_reviewed;
            const hasNoWeb = b.has_no_website === true || b.has_no_website === 1 || !b.website;
            const isLowRev = (b.reviews_count || 0) < 20;

            return (
              <div
                key={b.id}
                onClick={() => selectBusiness(b.id)}
                className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-[#171717] border border-emerald-500/40 shadow-lg'
                    : 'hover:bg-[#111111] border border-transparent'
                }`}
              >
                {/* Independent Reviewed Checkbox (Stops Click Propagation) */}
                <button
                  type="button"
                  onClick={(e) => toggleReviewed(b.id, e)}
                  title={isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                  className="mt-1 p-0.5 rounded text-[#7e7e7e] hover:text-emerald-400 shrink-0"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isReviewed
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-[#242424] bg-[#050505]'
                    }`}
                  >
                    {isReviewed && <CheckCircle className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                </button>

                {/* Avatar with monogram fallback */}
                <BusinessAvatar name={b.business_name} size="md" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate tracking-tight">
                      {b.business_name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] text-amber-400 font-semibold">
                      <span>{b.rating}★</span>
                      <span className="text-[#7e7e7e]">({b.reviews_count})</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8a8a8a] truncate mt-0.5">
                    {b.category} · {b.city || 'Austin'}
                  </p>

                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {isReviewed && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        Reviewed
                      </span>
                    )}
                    {hasNoWeb ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> No Website
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" /> Has Web
                      </span>
                    )}
                    {isLowRev && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        Low Rev
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#7e7e7e]">
            No businesses match the active filter.
          </div>
        )}
      </div>
    </div>
  );
}
