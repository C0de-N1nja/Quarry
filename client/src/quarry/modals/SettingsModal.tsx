'use client';

import React, { useState } from 'react';
import { useQuarry } from '../context/QuarryContext';
import { X, Settings, Server, Shield, Check, Cpu } from 'lucide-react';

export function SettingsModal() {
  const { isSettingsModalOpen, setIsSettingsModalOpen } = useQuarry();

  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [useScraplingStealth, setUseScraplingStealth] = useState(true);
  const [concurrencyWorkers, setConcurrencyWorkers] = useState(8);
  const [isSaved, setIsSaved] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsSettingsModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c0c0c] border border-[#1c1c1c] rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#171717]">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Settings & Hardware Engine</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1 rounded-lg text-[#7e7e7e] hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] flex items-center gap-1.5 mb-1">
              <Server className="w-3.5 h-3.5 text-emerald-400" /> Quarry Backend API Endpoint:
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none font-mono text-xs"
            />
            <p className="text-[10px] text-[#7e7e7e] mt-1">
              Proxies /api requests directly to Quarry&apos;s Express server on port 3001.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Multi-Thread Hardware Workers:
            </label>
            <input
              type="number"
              min={1}
              max={32}
              value={concurrencyWorkers}
              onChange={(e) => setConcurrencyWorkers(Number(e.target.value))}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none font-mono text-xs"
            />
          </div>

          <div className="pt-2 border-t border-[#141414]">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="flex items-center gap-2 text-[#cfcfcf]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stealth Scrapling Anti-Bot Engine</span>
              </span>
              <input
                type="checkbox"
                checked={useScraplingStealth}
                onChange={(e) => setUseScraplingStealth(e.target.checked)}
                className="rounded border-[#171717] bg-[#050505] text-emerald-500 focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#171717]">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8a8a8a] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
            <span>{isSaved ? 'Saved Settings' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
