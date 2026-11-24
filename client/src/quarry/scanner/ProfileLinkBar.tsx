'use client';

import React, { useState } from 'react';
import { useQuarry } from '../context/QuarryContext';
import { Link2, ArrowRight, Phone, Globe, Building } from 'lucide-react';

export function ProfileLinkBar() {
  const { lookupProfile } = useQuarry();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setMatchNotice(null);

    const isPhone = /^\+?[\d\s()-]{7,}$/.test(query);
    const isUrl = /^https?:\/\//i.test(query);

    const result = await lookupProfile(query);
    setIsSearching(false);

    if (result) {
      if (isPhone) setMatchNotice(`Matched phone: ${result.phone}`);
      else if (isUrl) setMatchNotice(`Resolved domain: ${result.business_name}`);
      else setMatchNotice(`Located: ${result.business_name}`);
      setTimeout(() => setMatchNotice(null), 4000);
    }
  };

  // Determine query icon helper
  const getQueryIcon = () => {
    if (/^\+?[\d\s()-]{7,}$/.test(query)) return <Phone className="w-4 h-4 text-emerald-400" />;
    if (/^https?:\/\//i.test(query)) return <Globe className="w-4 h-4 text-sky-400" />;
    return <Building className="w-4 h-4 text-[#8a8a8a]" />;
  };

  return (
    <div className="w-full bg-[#050505] border-b border-[#111111] py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        <form onSubmit={handleLookup} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
              {getQueryIcon()}
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste Google Maps link, phone number (7+ digits), or business name..."
              className="w-full bg-[#0c0c0c] border border-[#171717] hover:border-[#242424] focus:border-sky-500/50 rounded-[14px] pl-10 pr-4 py-2 text-xs text-white placeholder-[#7e7e7e] outline-none transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] bg-[#0c0c0c] border border-sky-500/30 hover:border-sky-500/60 text-sky-300 text-xs font-semibold hover:bg-sky-500/10 transition-all disabled:opacity-40 shrink-0"
          >
            <span>{isSearching ? 'Resolving...' : 'Find by Link / Phone'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {matchNotice && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 animate-fadeIn">
            {matchNotice}
          </span>
        )}
      </div>
    </div>
  );
}
