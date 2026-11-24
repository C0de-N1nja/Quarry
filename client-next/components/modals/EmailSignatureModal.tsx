'use client';

import React, { useState } from 'react';
import { useQuarry } from '@/context/QuarryContext';
import { X, Check, PenTool } from 'lucide-react';

export function EmailSignatureModal() {
  const { isEmailSignatureModalOpen, setIsEmailSignatureModalOpen } = useQuarry();

  const [senderName, setSenderName] = useState('Rehan');
  const [jobTitle, setJobTitle] = useState('Client Growth Specialist');
  const [organization, setOrganization] = useState('Quarry Enterprise');
  const [contactEmail, setContactEmail] = useState('rehan@quarry.local');
  const [contactPhone, setContactPhone] = useState('+1 (512) 843-9120');
  const [calendarUrl, setCalendarUrl] = useState('https://cal.com/quarry');
  const [isCopied, setIsCopied] = useState(false);

  if (!isEmailSignatureModalOpen) return null;

  const handleCopySignature = () => {
    const textSig = `${senderName}\n${jobTitle} | ${organization}\nDirect: ${contactPhone} | ${contactEmail}\nCalendar: ${calendarUrl}`;
    navigator.clipboard.writeText(textSig);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-[#1c1c1c] rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#171717]">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Email Signature Studio</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsEmailSignatureModalOpen(false)}
            className="p-1 rounded-lg text-[#7e7e7e] hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] block mb-1">Sender Name:</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] block mb-1">Job Title:</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] block mb-1">Company / Organization:</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-[#7e7e7e] block mb-1">Direct Phone:</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-1.5 text-white outline-none font-mono"
            />
          </div>
        </div>

        {/* Live Monospace-Free Signature Preview as strictly specified in PDF */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1.5">
            Live Monospace-Free Signature Preview:
          </label>
          <div className="p-4 rounded-2xl bg-[#050505] border border-[#171717] font-sans text-xs text-[#cfcfcf] space-y-1 select-none">
            <p className="font-bold text-white text-sm">{senderName}</p>
            <p className="text-emerald-400 font-medium">{jobTitle} · {organization}</p>
            <div className="pt-2 text-[11px] text-[#8a8a8a] space-y-0.5 border-t border-[#141414] mt-2">
              <p>Direct: <span className="text-[#cfcfcf]">{contactPhone}</span> | <span className="text-sky-400">{contactEmail}</span></p>
              <p>Booking link: <span className="text-indigo-400 underline">{calendarUrl}</span></p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#171717]">
          <button
            type="button"
            onClick={() => setIsEmailSignatureModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8a8a8a] hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopySignature}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-black" /> : null}
            <span>{isCopied ? 'Copied to Clipboard' : 'Copy Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
