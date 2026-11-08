import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  RiBuildingLine, 
  RiShieldCheckLine, 
  RiGlobalLine, 
  RiPhoneLine, 
  RiMailLine, 
  RiWhatsappLine, 
  RiArrowRightLine, 
  RiStarFill 
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { IconButton } from '@/components/base/buttons/icon-button';

function BoardTicket({ 
  lead, 
  onSelect, 
  onAdvance, 
  onSaveDealValue, 
  isDragging = false 
}) {
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [dealInput, setDealInput] = useState(String(lead.deal_value || 1000));
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);

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
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(lead.id));
        setIsDraggingLocal(true);
      }}
      onDragEnd={() => setIsDraggingLocal(false)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      onClick={() => onSelect(lead)}
      className={`group relative p-3.5 rounded-xl bg-background-primary-default border border-separator-border hover:border-accent-500/60 hover:shadow-dropdown transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging || isDraggingLocal ? 'opacity-50 ring-2 ring-accent-500 shadow-dropdown rotate-1 scale-98' : ''
      }`}
    >
      {/* Top Header Row: Business Identity */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-background-secondary-default border border-separator-border flex items-center justify-center font-bold text-xs text-accent-500 shrink-0 group-hover:scale-105 transition-transform">
            {lead.business_name ? lead.business_name.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-body-medium font-semibold text-text-primary truncate group-hover:text-accent-500 transition-colors leading-tight">
              {lead.business_name}
            </h4>
            <div className="flex items-center gap-1.5 text-caption-1-regular text-text-tertiary mt-0.5 truncate">
              <span>{lead.category || 'Local Business'}</span>
              <span>•</span>
              <span>{lead.city || 'Remote'}</span>
            </div>
          </div>
        </div>

        {/* Quick Advance Button */}
        {onAdvance && (
          <IconButton
            size="small"
            icon={RiArrowRightLine}
            aria-label="Advance stage"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(e, lead);
            }}
            title="Advance stage"
            className="shrink-0 opacity-80 group-hover:opacity-100 cursor-pointer"
          />
        )}
      </div>

      {/* Decision Maker & Status Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {ownerName && (
          <Chip 
            variant="subtle" 
            color="emerald" 
            size="sm"
            className="gap-1 inline-flex items-center"
            title={`Verified Decision Maker: ${ownerName}`}
          >
            <RiShieldCheckLine className="size-3 shrink-0" />
            <span className="truncate max-w-[140px]">{ownerName}</span>
          </Chip>
        )}

        {hasNoWebsite ? (
          <Chip variant="subtle" color="rose" size="sm">
            No Website
          </Chip>
        ) : (
          <Chip variant="subtle" color="blue" size="sm" className="gap-1 inline-flex items-center">
            <RiGlobalLine className="size-3 shrink-0" />
            <span>Site Found</span>
          </Chip>
        )}

        {lead.rating > 0 && (
          <Chip variant="subtle" color="amber" size="sm" className="gap-1 inline-flex items-center font-mono">
            <RiStarFill className="size-2.5 shrink-0 text-amber-500" />
            <span>{lead.rating} / 5.0</span>
          </Chip>
        )}
      </div>

      {/* Quick Contact Previews */}
      <div className="flex items-center gap-2 text-caption-1-regular text-text-secondary mb-2.5 flex-wrap">
        {lead.phone && (
          <span className="inline-flex items-center gap-1 font-mono text-caption-1-medium text-text-secondary" title={lead.phone}>
            <RiPhoneLine className="size-3 text-success-primary shrink-0" />
            <span className="truncate max-w-[130px]">{lead.phone}</span>
          </span>
        )}
        {lead.email && (
          <span className="inline-flex items-center gap-1 font-mono text-caption-1-medium text-text-secondary" title={lead.email}>
            <RiMailLine className="size-3 text-accent-500 shrink-0" />
            <span className="truncate max-w-[140px]">{lead.email}</span>
          </span>
        )}
        {lead.whatsapp && (
          <span className="inline-flex items-center gap-0.5 text-success-primary" title="WhatsApp Active">
            <RiWhatsappLine className="size-3 shrink-0" />
          </span>
        )}
      </div>

      {/* Footer: Deal Value & Follow-up Step */}
      <div className="pt-2.5 border-t border-separator-border flex items-center justify-between gap-2">
        {/* Deal Value Pill */}
        {isEditingDeal ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-text-tertiary font-mono text-caption-1-medium">$</span>
            <input
              type="number"
              autoFocus
              value={dealInput}
              onChange={(e) => setDealInput(e.target.value)}
              onBlur={handleDealSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleDealSubmit(e)}
              className="w-16 px-1.5 py-0.5 rounded bg-background-secondary-default border border-border-focus-ring text-caption-1-semibold font-mono text-text-primary outline-hidden"
            />
          </div>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingDeal(true);
            }}
            title="Click to change deal value"
            className="cursor-pointer inline-flex items-center"
          >
            <Chip variant="subtle" color="lime" className="font-mono font-bold hover:opacity-80">
              ${(lead.deal_value || 1000).toLocaleString()}
            </Chip>
          </div>
        )}

        {/* Sequence / Stage Step Info */}
        <div className="flex items-center gap-1">
          {lead.status === 'replied' ? (
            <Chip variant="caption" color="cyan">
              In Discussion
            </Chip>
          ) : lead.sequence_step > 1 && lead.sequence_step < 4 ? (
            <Chip variant="caption" color={isDue ? "rose" : "neutral"} className="font-mono">
              Step {lead.sequence_step}/3 {isDue ? '• Due' : ''}
            </Chip>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default React.memo(BoardTicket);
