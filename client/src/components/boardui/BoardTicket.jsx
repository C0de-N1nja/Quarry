import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building, Globe, Phone, Mail, ArrowRight, ShieldCheck, 
  MessageCircle, Star, Sparkles, CheckCircle2, UserCheck, 
  ExternalLink, Calendar
} from 'lucide-react';
import { RiBuildingLine, RiUserStarLine, RiWhatsappLine } from '@remixicon/react';

export default function BoardTicket({ 
  lead, 
  onSelect, 
  onAdvance, 
  onSaveDealValue, 
  isDragging = false 
}) {
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [dealInput, setDealInput] = useState(String(lead.deal_value || 1000));

  const hasNoWebsite = lead.website_status === 'no_website' || 
    (lead.has_no_website === 1 && lead.no_website_verified === 1) || 
    !lead.website;

  const isDue = lead.next_followup_date && new Date(lead.next_followup_date) <= new Date();

  // Social profiles extraction
  let socials = null;
  if (lead.social_profiles) {
    try {
      socials = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;
    } catch {}
  }

  // Decision maker display name
  const ownerName = lead.decision_maker_name || (lead.email_type === 'decision_maker' ? 'Owner Verified' : null);

  const handleDealSubmit = (e) => {
    e?.stopPropagation();
    const val = parseInt(dealInput, 10);
    if (!isNaN(val) && val > 0 && onSaveDealValue) {
      onSaveDealValue(lead.id, val);
    }
    setIsEditingDeal(false);
  };

  return (
    <motion.div
      layout
      layoutId={`ticket-${lead.id}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={() => onSelect(lead)}
      className={`group relative p-3.5 rounded-xl bg-surface-1 dark:bg-surface-1/90 border border-border-subtle hover:border-brand/50 hover:shadow-card transition-all cursor-pointer ${
        isDragging ? 'shadow-dropdown ring-2 ring-brand/50 rotate-1' : ''
      }`}
    >
      {/* Top Header Row: Business Identity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-surface-2 dark:bg-surface-3 border border-border-subtle flex items-center justify-center font-bold text-xs text-brand shrink-0 group-hover:scale-105 transition-transform">
            {lead.business_name ? lead.business_name.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand transition-colors leading-tight">
              {lead.business_name}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              <span>{lead.category || 'Local Business'}</span>
              <span>•</span>
              <span>{lead.city || 'Remote'}</span>
            </div>
          </div>
        </div>

        {/* Quick Advance Button */}
        {onAdvance && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(e, lead);
            }}
            title="Advance stage"
            className="p-1 rounded-md text-gray-400 hover:text-brand hover:bg-surface-2 dark:hover:bg-surface-3 transition-colors shrink-0 opacity-80 group-hover:opacity-100"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Decision Maker & Status Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {ownerName && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium"
            title={`Verified Decision Maker: ${ownerName}`}
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[120px]">{ownerName}</span>
          </span>
        )}

        {hasNoWebsite ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-medium">
            🔥 No Website
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-medium">
            <Globe className="h-2.5 w-2.5 shrink-0" />
            <span>Site Found</span>
          </span>
        )}

        {lead.rating > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono">
            ★ {lead.rating}
          </span>
        )}
      </div>

      {/* Quick Contact Previews */}
      <div className="flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400 mb-2.5">
        {lead.phone && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px]" title={lead.phone}>
            <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate max-w-[95px]">{lead.phone}</span>
          </span>
        )}
        {lead.email && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px]" title={lead.email}>
            <Mail className="h-3 w-3 text-blue-500 shrink-0" />
            <span className="truncate max-w-[100px]">{lead.email}</span>
          </span>
        )}
        {lead.whatsapp && (
          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="WhatsApp Active">
            <RiWhatsappLine className="h-3 w-3 shrink-0" />
          </span>
        )}
      </div>

      {/* Footer: Deal Value & Follow-up Step */}
      <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2">
        {/* Deal Value Pill */}
        {isEditingDeal ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-gray-400 font-mono text-xs">$</span>
            <input
              type="number"
              autoFocus
              value={dealInput}
              onChange={(e) => setDealInput(e.target.value)}
              onBlur={handleDealSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleDealSubmit(e)}
              className="w-16 px-1.5 py-0.5 rounded bg-surface-2 border border-brand text-xs font-mono text-gray-900 dark:text-white outline-hidden"
            />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingDeal(true);
            }}
            title="Click to change deal value"
            className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md transition-colors"
          >
            <span>${(lead.deal_value || 1000).toLocaleString()}</span>
          </button>
        )}

        {/* Sequence / Stage Step Info */}
        <div className="flex items-center gap-1">
          {lead.status === 'replied' ? (
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
              In Discussion
            </span>
          ) : lead.sequence_step > 1 && lead.sequence_step < 4 ? (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
              isDue 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold' 
                : 'bg-surface-2 text-gray-500 dark:text-gray-400 border border-border-subtle'
            }`}>
              Step {lead.sequence_step}/3 {isDue ? '• Due' : ''}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
