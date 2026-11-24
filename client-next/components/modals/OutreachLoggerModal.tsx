'use client';

import React, { useState } from 'react';
import { useQuarry } from '@/context/QuarryContext';
import { X, Send, Mail, MessageSquare, Phone, CheckCircle, AlertCircle } from 'lucide-react';

export function OutreachLoggerModal() {
  const {
    isOutreachModalOpen,
    setIsOutreachModalOpen,
    selectedBusiness,
    logOutreachEvent,
    outreachChannel,
    setOutreachChannel
  } = useQuarry();

  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'phone'>(outreachChannel);
  const [adminEmail, setAdminEmail] = useState('rehan@quarry.local');
  const [notes, setNotes] = useState('Dispatched working preview showcase link via Pitch Studio.');
  const [outcome, setOutcome] = useState('Messaged (Awaiting Response)');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOutreachModalOpen || !selectedBusiness) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    // If channel is Email, enforce Confirm Admin Email Used as mandated by spec
    if (channel === 'email' && !emailConfirmed) {
      setErrorNotice('You must confirm the verified sender email address before logging email outreach.');
      return;
    }

    logOutreachEvent(selectedBusiness.id, {
      channel,
      notes: `${outcome}: ${notes}`,
      adminEmail: channel === 'email' ? adminEmail : undefined
    });

    setIsOutreachModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0c0c0c] border border-[#1c1c1c] rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#171717]">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Log Prospect Outreach</h3>
            <p className="text-xs text-[#8a8a8a]">{selectedBusiness.business_name} ({selectedBusiness.city})</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOutreachModalOpen(false)}
            className="p-1 rounded-lg text-[#7e7e7e] hover:text-white hover:bg-[#171717] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1.5">
              Outreach Channel Used:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setChannel('whatsapp'); setOutreachChannel('whatsapp'); }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#050505] border-[#171717] text-[#8a8a8a]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => { setChannel('email'); setOutreachChannel('email'); }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'email'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-[#050505] border-[#171717] text-[#8a8a8a]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </button>

              <button
                type="button"
                onClick={() => setChannel('phone')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  channel === 'phone'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#050505] border-[#171717] text-[#8a8a8a]'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> Phone Call
              </button>
            </div>
          </div>

          {/* Dynamically Revealed Required "Confirm Admin Email Used" box for Email mode */}
          {channel === 'email' && (
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2">
              <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
                <Mail className="w-4 h-4" />
                <span>Confirm Admin Email Dispatch Address</span>
              </div>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-[#050505] border border-sky-500/30 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
              />
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[#cfcfcf] select-none">
                <input
                  type="checkbox"
                  checked={emailConfirmed}
                  onChange={(e) => setEmailConfirmed(e.target.checked)}
                  className="rounded border-[#171717] bg-[#050505] text-sky-500 focus:ring-0"
                />
                <span>I confirm this email was sent from the authentic domain above</span>
              </label>
            </div>
          )}

          {/* Outcome Selector */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1">
              Recorded Outcome:
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full bg-[#050505] border border-[#171717] rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="Messaged (Awaiting Response)">Messaged (Awaiting Response)</option>
              <option value="Showcase Link Delivered">Showcase Link Delivered</option>
              <option value="Gatekeeper Screened">Gatekeeper Screened</option>
              <option value="Owner Interested / Requested Callback">Owner Interested / Requested Callback</option>
              <option value="Declined / Not Interested">Declined / Not Interested</option>
            </select>
          </div>

          {/* Activity Notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1">
              Outreach Details & Notes:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#050505] border border-[#171717] rounded-2xl p-3 text-xs text-[#cfcfcf] outline-none resize-none leading-relaxed"
            />
          </div>

          {errorNotice && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#171717]">
            <button
              type="button"
              onClick={() => setIsOutreachModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8a8a8a] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
