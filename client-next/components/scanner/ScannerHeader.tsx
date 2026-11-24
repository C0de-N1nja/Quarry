'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuarry } from '@/context/QuarryContext';
import { Search, MapPin, Tag, Compass, FileSpreadsheet, PenTool, Settings, Users, LogOut, X, Clock, Trash2, Sun, Moon } from 'lucide-react';

export function ScannerHeader() {
  const {
    regionInput,
    setRegionInput,
    category,
    setCategory,
    radiusKm,
    setRadiusKm,
    searchHistory,
    deleteSearchHistoryItem,
    clearSearchHistory,
    runScan,
    isScanning,
    activeWorkspace,
    setActiveWorkspace,
    leads,
    setIsEmailSignatureModalOpen,
    setIsSettingsModalOpen,
    theme,
    toggleTheme
  } = useQuarry();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredHistory = searchHistory.filter(h =>
    h.toLowerCase().includes(regionInput.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsHistoryOpen(false);
    runScan();
  };

  const handleExportCsv = () => {
    window.open('/api/export?format=csv', '_blank');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050505]/90 backdrop-blur-xl border-b border-[#111111]">
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center border border-emerald-400/30 shadow-lg shadow-emerald-950/40">
            <span className="text-white font-black text-sm tracking-tighter">Q</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight">Quarry</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                INTELLIGENCE SUITE
              </span>
            </div>
            <p className="text-[11px] text-[#7e7e7e]">Lead Intelligence & Pitch Studio</p>
          </div>
        </div>

        {/* Scan Parameters Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 max-w-[850px] items-center gap-2">
          {/* Region Input with History Dropdown */}
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a]" />
              <input
                type="text"
                value={regionInput}
                onChange={(e) => {
                  setRegionInput(e.target.value);
                  setIsHistoryOpen(true);
                }}
                onFocus={() => setIsHistoryOpen(true)}
                placeholder="Target City or Region (e.g. Austin, TX)"
                className="w-full bg-[#0c0c0c] border border-[#1c1c1c] hover:border-[#242424] focus:border-emerald-500/50 rounded-[14px] pl-9 pr-3 py-2 text-sm text-white placeholder-[#7e7e7e] outline-none transition-colors"
              />
            </div>

            {/* Recent Searches Dropdown */}
            {isHistoryOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0c0c0c] border border-[#1c1c1c] rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl">
                <div className="flex items-center justify-between px-2.5 py-1 text-[11px] uppercase tracking-[1.4px] text-[#7e7e7e] font-semibold border-b border-[#141414] pb-1.5 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#8a8a8a]" /> Recent Searches
                  </span>
                  {searchHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSearchHistory();
                      }}
                      className="text-[#7e7e7e] hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px]"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setRegionInput(item);
                          setIsHistoryOpen(false);
                          runScan(item);
                        }}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#171717] cursor-pointer text-xs text-[#cfcfcf] group transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#8a8a8a] group-hover:text-emerald-400" />
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSearchHistoryItem(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#7e7e7e] hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-[#7e7e7e]">No matching search history</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Category Input */}
          <div className="relative w-48">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a]" />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Niche (e.g. Roofing)"
              className="w-full bg-[#0c0c0c] border border-[#1c1c1c] hover:border-[#242424] focus:border-emerald-500/50 rounded-[14px] pl-9 pr-3 py-2 text-sm text-white placeholder-[#7e7e7e] outline-none transition-colors"
            />
          </div>

          {/* Radius Selector */}
          <div className="relative w-28">
            <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8a8a]" />
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              aria-label="Radius distance in kilometers"
              className="w-full bg-[#0c0c0c] border border-[#1c1c1c] hover:border-[#242424] focus:border-emerald-500/50 rounded-[14px] pl-9 pr-2 py-2 text-sm text-white outline-none cursor-pointer appearance-none transition-colors"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={15}>15 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>

          {/* Scan Action Button */}
          <button
            type="submit"
            disabled={isScanning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all shadow-md shadow-emerald-950/30 disabled:opacity-50 shrink-0"
          >
            <Search className="w-4 h-4" />
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </form>

        {/* Global Navigation and Utility Bar */}
        <div className="flex items-center gap-1.5">
          {/* CSV Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Export CSV"
            className="p-2 rounded-[14px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-amber-500/40 text-[#8a8a8a] hover:text-amber-300 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Email Signature Config */}
          <button
            type="button"
            onClick={() => setIsEmailSignatureModalOpen(true)}
            title="Email Signature"
            className="p-2 rounded-[14px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-sky-500/40 text-[#8a8a8a] hover:text-sky-300 transition-colors"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Settings & API Engine"
            className="p-2 rounded-[14px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-violet-500/40 text-[#8a8a8a] hover:text-violet-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-[14px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-amber-400/50 text-[#8a8a8a] hover:text-amber-300 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Workspace Switcher: Scanner vs Leads */}
          <button
            type="button"
            onClick={() => setActiveWorkspace(activeWorkspace === 'scanner' ? 'leads' : 'scanner')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[14px] border text-xs font-semibold transition-all ${
              activeWorkspace === 'leads'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-[#0c0c0c] border-[#1c1c1c] text-[#cfcfcf] hover:border-[#242424]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{activeWorkspace === 'leads' ? 'Back to Scanner' : 'Leads CRM'}</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px]">
              {leads.length}
            </span>
          </button>

          {/* Reset / Clear */}
          <button
            type="button"
            onClick={() => runScan('Austin, TX', 'Roofing', 15)}
            title="Reset to Default"
            className="p-2 rounded-[14px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-rose-500/40 text-[#8a8a8a] hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
