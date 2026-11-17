import React, { useState, useEffect, useRef } from 'react';
import { 
  RiShieldCheckLine, 
  RiMapPinLine, 
  RiEyeLine, 
  RiWhatsappLine, 
  RiMailLine, 
  RiPhoneLine, 
  RiFileCopyLine, 
  RiCheckLine, 
  RiSparklingLine, 
  RiStarFill, 
  RiInstagramLine, 
  RiFacebookCircleLine, 
  RiLinkedinBoxLine, 
  RiTwitterXLine, 
  RiDeleteBinLine, 
  RiBuildingLine, 
  RiGlobalLine, 
  RiFireLine,
  RiArrowRightUpLine,
  RiMoreFill,
  RiCalendarCheckLine
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownGroup, DropdownItem, DropdownDivider } from '@/components/base/dropdown/dropdown';
import { Kbd } from '@/components/base/kbd/kbd';
import { formatLocation } from '@/utils/pitchGenerator';
import { STAGES, STAGE_CONFIG, normalizeStage, getStageLabel } from '@shared/stages';
import NextActionButton from './boardui/NextActionButton';
import WhatsAppModal from './boardui/WhatsAppModal';
import { canCheckWebsite } from '@/utils/nextAction';
import { toast } from '@/components/base/toast/toast';
import { 
  generateWhatsAppMessage, 
  getWhatsAppWebUrl, 
  normalizeWhatsAppPhone 
} from '@/utils/whatsappHelper';

function SplitQueueSkeleton({ index }) {
  return (
    <div key={`queue-skeleton-${index}`} className="p-3.5 border-b border-separator-border/60 space-y-2.5 animate-pulse select-none">
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-1/2 rounded bg-background-tertiary-default/80 dark:bg-zinc-800" />
        <div className="h-3 w-12 rounded-full bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
      </div>
      <div className="h-3 w-3/4 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
      <div className="flex items-center gap-2 pt-1">
        <div className="h-4 w-16 rounded-full bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
        <div className="h-4 w-14 rounded-full bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
        <div className="h-4 w-16 rounded-full bg-background-tertiary-default/50 dark:bg-zinc-800/50 ml-auto" />
      </div>
    </div>
  );
}

function SplitDossierSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 animate-pulse select-none">
      <div className="space-y-2.5 pb-4 border-b border-separator-border/60">
        <div className="flex items-center justify-between">
          <div className="h-7 w-64 rounded-lg bg-background-tertiary-default/80 dark:bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
            <div className="h-8 w-28 rounded-lg bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-28 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          <div className="h-4 w-40 rounded bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 space-y-3">
          <div className="h-4 w-28 rounded bg-background-tertiary-default/80 dark:bg-zinc-800" />
          <div className="h-4 w-44 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          <div className="h-4 w-36 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
        </div>
        <div className="p-4 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 space-y-3">
          <div className="h-4 w-32 rounded bg-background-tertiary-default/80 dark:bg-zinc-800" />
          <div className="h-4 w-40 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          <div className="h-4 w-48 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-separator-border bg-background-secondary-default/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-background-tertiary-default/80 dark:bg-zinc-800" />
          <div className="h-4 w-20 rounded bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          <div className="h-3 w-5/6 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
          <div className="h-3 w-4/6 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
        </div>
      </div>
    </div>
  );
}

export default function SplitView({
  leads = [],
  isLoading = false,
  selectedLead,
  onSelectLead,
  onRefreshLead,
  onOpenOsintRun,
  onDeleteLead,
  onOpenLeadDrawer,
  onOpenAudit,
  activeFilter,
  stats
}) {
  const [activeLeadId, setActiveLeadId] = useState(selectedLead?.id || (leads.length > 0 ? leads[0].id : null));
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [visibleQueueCount, setVisibleQueueCount] = useState(50);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState(null);
  const listRef = useRef(null);

  const handleLogReplyAction = async (lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'replied' })
      });
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      console.error('Failed to log reply', err);
    }
  };

  const handleMarkWonAction = async (lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'won' })
      });
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      console.error('Failed to mark won', err);
    }
  };

  const handleEmailAction = (lead) => {
    if (!lead?.email) return;
    const subject = encodeURIComponent(`Website concept for ${lead.business_name || 'your business'}`);
    window.open(`mailto:${lead.email}?subject=${subject}`, '_blank');
  };

  const handleLaunchWhatsAppDirect = async (lead) => {
    const phone = lead?.phone || lead?.whatsapp;
    if (!phone) {
      toast.error('No phone number recorded for this lead');
      return;
    }
    const message = generateWhatsAppMessage(lead);
    const waUrl = getWhatsAppWebUrl(phone, message, lead?.country);
    window.open(waUrl, '_blank');
    toast.info('Opening WhatsApp Web...', {
      description: `Message pre-filled for ${lead?.business_name || 'recipient'}. Press Enter in WhatsApp Web to send!`
    });

    try {
      const res = await fetch(`/api/leads/${lead.id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          note: 'Direct WhatsApp Web outreach'
        })
      });
      const data = await res.json();
      if (data.success && onRefreshLead) {
        onRefreshLead();
      }
    } catch (err) {
      console.error('Failed to auto-advance stage on WhatsApp launch', err);
    }
  };

  const handleCopyWhatsAppMessage = (lead) => {
    const message = generateWhatsAppMessage(lead);
    navigator.clipboard.writeText(message);
    toast.success('WhatsApp pitch message copied!', {
      description: 'Ready to paste into WhatsApp Web or mobile chat'
    });
  };

  // Sliced queue to ensure 60fps scrolling
  const visibleQueueLeads = leads.slice(0, visibleQueueCount);

  // Sync selection
  useEffect(() => {
    if (selectedLead && selectedLead.id !== activeLeadId) {
      setActiveLeadId(selectedLead.id);
    } else if (!activeLeadId && leads.length > 0) {
      setActiveLeadId(leads[0].id);
    }
  }, [selectedLead, leads]);

  // Current active lead object
  const currentLead = leads.find(l => l.id === activeLeadId) || selectedLead || leads[0] || null;

  // Keyboard navigation: Arrow Up / Arrow Down to quickly triage leads
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const currentIndex = leads.findIndex(l => l.id === activeLeadId);
        if (currentIndex < leads.length - 1) {
          const nextIndex = currentIndex + 1;
          if (nextIndex >= visibleQueueCount) {
            setVisibleQueueCount(c => Math.min(leads.length, c + 30));
          }
          const nextLead = leads[nextIndex];
          setActiveLeadId(nextLead.id);
          if (onSelectLead) onSelectLead(nextLead);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const currentIndex = leads.findIndex(l => l.id === activeLeadId);
        if (currentIndex > 0) {
          const prevLead = leads[currentIndex - 1];
          setActiveLeadId(prevLead.id);
          if (onSelectLead) onSelectLead(prevLead);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leads, activeLeadId, onSelectLead, visibleQueueCount]);

  // Quick Stage Update
  const handleStageChange = async (newStatus) => {
    if (!currentLead) return;
    setUpdatingStage(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Stage updated to ${newStatus}`);
        setTimeout(() => setStatusMsg(null), 2500);
        if (onRefreshLead) onRefreshLead();
      }
    } catch (err) {
      console.error('Failed to update stage', err);
    } finally {
      setUpdatingStage(false);
    }
  };

  // Helper to parse socials
  const getSocials = (lead) => {
    if (!lead) return {};
    let socials = {};
    if (lead.social_profiles) {
      try {
        socials = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;
      } catch {}
    }
    if (!socials || Object.keys(socials).length === 0) {
      if (lead.website) {
        const w = lead.website.toLowerCase();
        if (w.includes('instagram.com/')) socials.instagram = lead.website;
        else if (w.includes('facebook.com/')) socials.facebook = lead.website;
        else if (w.includes('linkedin.com/')) socials.linkedin = lead.website;
        else if (w.includes('twitter.com/') || w.includes('x.com/')) socials.twitter = lead.website;
      }
    }
    return socials || {};
  };

  // Generate 1-Click WhatsApp outreach URL
  const getWhatsAppUrl = (lead) => {
    if (!lead) return '#';
    let phone = lead.whatsapp || lead.phone_e164 || lead.phone || '';
    const digits = phone.replace(/[^\d]/g, '');
    if (!digits) return '#';
    const cleanDigits = digits.length === 10 ? `1${digits}` : digits;
    const location = formatLocation(lead);
    const reputationNote = (Number(lead.rating) > 0 && Number(lead.reviews_count) > 0)
      ? `noticed your ${lead.rating} rating on Google Maps`
      : `came across ${lead.business_name || 'your business'} on Google Maps`;
    const msg = encodeURIComponent(
      `Hi ${lead.business_name || 'there'}! I ${reputationNote} in ${location}, but saw you don't have an active website yet. We created a free modern website concept for your business. Would you like me to send you the preview link?`
    );
    return `https://wa.me/${cleanDigits}?text=${msg}`;
  };

  const getPitchText = (lead) => {
    if (!lead) return '';
    const location = formatLocation(lead);
    const hasReviews = Number(lead.rating) > 0 && Number(lead.reviews_count) > 0;
    const proofText = hasReviews
      ? `saw your established reputation (${lead.rating} / 5.0 with ${lead.reviews_count} verified reviews)`
      : `came across your local service listing on Google`;
    return `Hi ${lead.business_name} Team,\n\nI was researching businesses in ${location} and ${proofText}.\n\nI noticed you don't currently have a dedicated commercial website, meaning you could be losing high-value local customers searching Google directly to competitors.\n\nWe put together a clean, mobile-optimized website prototype designed specifically for ${lead.business_name}. Would you be open to checking out a quick 30-second live preview?`;
  };

  // Copy quick pitch text
  const handleCopyPitch = (lead) => {
    if (!lead) return;
    const text = getPitchText(lead);
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const socials = getSocials(currentLead);
  const isNoWebsite = currentLead ? (currentLead.has_no_website === 1 || !currentLead.website) : false;
  const isGold = currentLead ? (Number(currentLead.rating) >= 4.5 && Number(currentLead.reviews_count) >= 10) : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)] min-h-[600px]">
      {/* -------------------------------------------------------------
          LEFT PANE: LEAD TRIAGE QUEUE (Col 1 to 5)
      ------------------------------------------------------------- */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-background-primary-default rounded-2xl border border-separator-border shadow-xs overflow-hidden">
        {/* Queue Header & Shortcut Indicator */}
        <div className="p-3 border-b border-separator-border bg-background-secondary-default/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
              Lead Queue
            </span>
            <Chip variant="bold" color="blue">
              {leads.length}
            </Chip>
            {leads.length > 0 && onOpenOsintRun && (
              <Button
                size="xs"
                variant="secondary"
                leadingIcon={RiShieldCheckLine}
                onClick={() => onOpenOsintRun({
                  filter: activeFilter,
                  leadIds: leads.map(l => l.id)
                })}
                title={`Run OSINT specifically on these ${leads.length} visible leads`}
              >
                OSINT View
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-caption-1-regular text-text-tertiary">
            <span>Navigate:</span>
            <Kbd>Up</Kbd>
            <Kbd>Down</Kbd>
          </div>
        </div>

        {/* Scrollable List of Lead Cards */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-separator-border/60">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SplitQueueSkeleton key={`split-skel-${i}`} index={i} />
            ))
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-text-tertiary">
              <RiBuildingLine className="h-8 w-8 mx-auto mb-2 opacity-40 text-text-secondary" />
              <p className="text-body-medium font-medium text-text-secondary">No leads match this view</p>
              <p className="text-caption-1-regular text-text-tertiary mt-1">Try switching filters or run a new search.</p>
            </div>
          ) : (
            <>
              {visibleQueueLeads.map((lead, idx) => {
                const isSelected = lead.id === activeLeadId;
                const leadSocials = getSocials(lead);
                const leadNoWeb = lead.has_no_website === 1 || !lead.website;
                const hasPhone = !!lead.phone;
                const hasEmail = !!lead.email;
                const hasWa = !!lead.whatsapp;

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setActiveLeadId(lead.id);
                      if (onSelectLead) onSelectLead(lead);
                    }}
                    className={`p-3.5 transition-all cursor-pointer relative group ${
                      isSelected 
                        ? 'bg-background-secondary-default border-l-4 border-l-border-focus-ring' 
                        : 'hover:bg-background-secondary-default/60 bg-transparent border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-caption-1-medium font-mono text-text-tertiary">
                            #{idx + 1}
                          </span>
                          <h4 className={`text-body-medium font-semibold truncate ${
                            isSelected ? 'text-text-primary' : 'text-text-secondary'
                          }`}>
                            {lead.business_name}
                          </h4>
                        </div>

                        {/* Subtitle: Category & City */}
                        <div className="flex items-center gap-2 mt-1 text-caption-1-regular text-text-tertiary">
                          {lead.google_category && (
                            <span className="truncate max-w-[130px]">
                              {lead.google_category}
                            </span>
                          )}
                          {lead.city && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[100px] flex items-center gap-0.5">
                                <RiMapPinLine className="size-3 opacity-60" />
                                {lead.city}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      {lead.rating && (
                        <Chip variant="caption" color="yellow" className="gap-1 inline-flex items-center font-mono shrink-0">
                          <RiStarFill className="size-2.5" />
                          <span>{lead.rating}</span>
                          {lead.reviews_count && (
                            <span className="opacity-75 font-normal">({lead.reviews_count})</span>
                          )}
                        </Chip>
                      )}
                    </div>

                    {/* Channel & Status Pills */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {leadNoWeb ? (
                        <Chip variant="caption" color="rose" className="gap-1 inline-flex items-center">
                          <RiFireLine className="size-2.5" />
                          <span>No Website</span>
                        </Chip>
                      ) : (
                        <Chip variant="caption" color="neutral" className="truncate max-w-[120px]">
                          Has Site
                        </Chip>
                      )}

                      {hasWa && (
                        <Chip variant="caption" color="lime" className="gap-1 inline-flex items-center">
                          <RiWhatsappLine className="size-2.5" />
                          <span>WhatsApp</span>
                        </Chip>
                      )}

                      {hasEmail && (
                        <Chip variant="caption" color="blue" className="gap-1 inline-flex items-center">
                          <RiMailLine className="size-2.5" />
                          <span>Email</span>
                        </Chip>
                      )}

                      {hasPhone && !hasWa && (
                        <Chip variant="caption" color="yellow" className="gap-1 inline-flex items-center">
                          <RiPhoneLine className="size-2.5" />
                          <span>Phone</span>
                        </Chip>
                      )}

                      {/* Stage status indicator */}
                      <div className="ml-auto">
                        <Chip 
                          variant="caption" 
                          color={
                            normalizeStage(lead.status) === 'won' ? 'lime' :
                            normalizeStage(lead.status) === 'messaged' ? 'yellow' :
                            normalizeStage(lead.status) === 'contact_found' ? 'purple' :
                            normalizeStage(lead.status) === 'replied' ? 'cyan' :
                            'neutral'
                          }
                          className="uppercase font-mono text-[10px]"
                        >
                          {getStageLabel(lead.status)}
                        </Chip>
                      </div>
                    </div>

                    {/* Single Next Action primary button or status text */}
                    <div className="mt-2 pt-2 border-t border-separator-border/40 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      <NextActionButton
                        lead={lead}
                        size="xs"
                        onFindContact={() => onOpenOsintRun ? onOpenOsintRun([lead.id], lead.google_category) : (onSelectLead && onSelectLead(lead))}
                        onWhatsApp={() => setWhatsAppModalLead(lead)}
                        onEmail={() => handleEmailAction(lead)}
                        onFollowUp={() => onSelectLead && onSelectLead(lead)}
                        onMarkWon={() => handleMarkWonAction(lead)}
                      />
                    </div>
                  </div>
                );
              })}

              {leads.length > visibleQueueCount && (
                <div className="p-3 text-center">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setVisibleQueueCount(c => c + 50)}
                    className="w-full text-text-tertiary hover:text-text-primary"
                  >
                    Load more leads ({leads.length - visibleQueueCount} remaining)...
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          RIGHT PANE: LIVE PROSPECT DOSSIER & 1-CLICK OUTREACH (Col 6 to 12)
      ------------------------------------------------------------- */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-background-primary-default rounded-2xl border border-separator-border shadow-xs overflow-hidden">
        {isLoading ? (
          <SplitDossierSkeleton />
        ) : currentLead ? (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Dossier Top Bar */}
            <div className="p-4 sm:p-5 border-b border-separator-border bg-background-secondary-default/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                      {currentLead.business_name}
                    </h2>
                    {isGold && (
                      <Chip variant="bold" color="yellow">
                        GOLD PROSPECT
                      </Chip>
                    )}
                    {currentLead.google_category && (
                      <Chip variant="subtle" color="neutral">
                        {currentLead.google_category}
                      </Chip>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-caption-1-regular text-text-secondary flex-wrap">
                    {currentLead.rating && (
                      <div className="flex items-center gap-1 font-bold text-status-yellow-text">
                        <RiStarFill className="size-3.5 fill-current" />
                        <span>{currentLead.rating}</span>
                        <span className="text-text-tertiary font-normal">({currentLead.reviews_count || 0} Google reviews)</span>
                      </div>
                    )}
                    {currentLead.city && (
                      <span className="flex items-center gap-1 text-text-tertiary">
                        <RiMapPinLine className="size-3.5" />
                        {currentLead.address || currentLead.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Single Primary Action + Context Menu */}
                <div className="flex items-center gap-2 shrink-0">
                  <NextActionButton
                    lead={currentLead}
                    size="small"
                    onFindContact={() => onOpenOsintRun ? onOpenOsintRun([currentLead.id], currentLead.google_category) : (onOpenLeadDrawer && onOpenLeadDrawer(currentLead))}
                    onWhatsApp={() => setWhatsAppModalLead(currentLead)}
                    onEmail={() => handleEmailAction(currentLead)}
                    onFollowUp={() => onOpenLeadDrawer && onOpenLeadDrawer(currentLead)}
                    onMarkWon={() => handleMarkWonAction(currentLead)}
                  />

                  <Button
                    onClick={() => handleCopyPitch(currentLead)}
                    size="small"
                    variant="ghost"
                    leadingIcon={copiedPitch ? RiCheckLine : RiFileCopyLine}
                  >
                    {copiedPitch ? 'Copied Pitch!' : 'Copy Script'}
                  </Button>

                  <Dropdown>
                    <DropdownTrigger asChild>
                      <IconButton
                        size="small"
                        icon={RiMoreFill}
                        aria-label="More options"
                        className="cursor-pointer"
                      />
                    </DropdownTrigger>
                    <DropdownPopover align="end" className="w-52">
                      <DropdownGroup>
                        {canCheckWebsite(currentLead) && (
                          <DropdownItem
                            onSelect={() => onOpenAudit ? onOpenAudit(currentLead.id) : (onOpenLeadDrawer && onOpenLeadDrawer(currentLead))}
                            className="px-2.5 py-2 rounded-lg text-body-medium text-sky-500 hover:bg-sky-500/10"
                          >
                            <RiShieldCheckLine className="size-4 text-sky-500" />
                            <span>Check website</span>
                          </DropdownItem>
                        )}

                        {normalizeStage(currentLead.status) === 'messaged' && (
                          <DropdownItem
                            onSelect={() => handleLogReplyAction(currentLead)}
                            className="px-2.5 py-2 rounded-lg text-body-medium text-amber-500 hover:bg-amber-500/10"
                          >
                            <RiCalendarCheckLine className="size-4 text-amber-500" />
                            <span>Log reply</span>
                          </DropdownItem>
                        )}

                        {currentLead.phone && (
                          <>
                            <DropdownItem
                              onSelect={() => handleLaunchWhatsAppDirect(currentLead)}
                              className="px-2.5 py-2 rounded-lg text-body-medium text-emerald-400"
                            >
                              <RiWhatsappLine className="size-4 text-emerald-500" />
                              <span>Open WhatsApp Web</span>
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => handleCopyWhatsAppMessage(currentLead)}
                              className="px-2.5 py-2 rounded-lg text-body-medium"
                            >
                              <RiFileCopyLine className="size-4 text-text-secondary" />
                              <span>Copy WhatsApp Pitch</span>
                            </DropdownItem>
                            <DropdownItem
                              onSelect={() => window.open(`tel:${currentLead.phone}`)}
                              className="px-2.5 py-2 rounded-lg text-body-medium"
                            >
                              <RiPhoneLine className="size-4 text-text-secondary" />
                              <span>Call {currentLead.phone}</span>
                            </DropdownItem>
                          </>
                        )}

                        {currentLead.maps_link && (
                          <DropdownItem
                            onSelect={() => window.open(currentLead.maps_link, '_blank')}
                            className="px-2.5 py-2 rounded-lg text-body-medium"
                          >
                            <RiMapPinLine className="size-4 text-text-secondary" />
                            <span>Google Maps</span>
                          </DropdownItem>
                        )}

                        <DropdownItem
                          onSelect={() => onOpenLeadDrawer && onOpenLeadDrawer(currentLead)}
                          className="px-2.5 py-2 rounded-lg text-body-medium"
                        >
                          <RiEyeLine className="size-4 text-text-secondary" />
                          <span>Full Drawer</span>
                        </DropdownItem>

                        <DropdownDivider />

                        <DropdownItem
                          onSelect={() => onDeleteLead && onDeleteLead(currentLead.id)}
                          className="px-2.5 py-2 rounded-lg text-body-medium text-rose-500 hover:bg-rose-500/10"
                        >
                          <RiDeleteBinLine className="size-4 text-rose-500" />
                          <span>Delete Lead</span>
                        </DropdownItem>
                      </DropdownGroup>
                    </DropdownPopover>
                  </Dropdown>
                </div>
              </div>
            </div>

            {/* Dossier Content Cards */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Card 1: Website Opportunity Audit */}
              <div className={`p-4 rounded-xl border ${
                isNoWebsite 
                  ? 'bg-status-rose-background/40 border-status-rose-background' 
                  : 'bg-background-secondary-default/50 border-separator-border'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                        Website & Digital Presence
                      </span>
                      {isNoWebsite ? (
                        <Chip variant="bold" color="rose">
                          TARGET: NO WEBSITE FOUND
                        </Chip>
                      ) : (
                        <Chip variant="subtle" color="neutral">
                          Registered Domain
                        </Chip>
                      )}
                    </div>
                    <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                      {isNoWebsite 
                        ? `This business has ${currentLead.reviews_count || 10}+ reviews with a ${currentLead.rating || '4.5'} rating but NO official website. They are actively losing web searches to competitors.`
                        : `Current domain: ${currentLead.website}. Audit website speed and mobile readiness to pitch a modern upgrade.`}
                    </p>
                  </div>

                  {/* Showcase Prototype Link */}
                  <ButtonLink
                    href={`/showcase/${currentLead.google_category?.toLowerCase().includes('roof') ? 'roofing' : currentLead.google_category?.toLowerCase().includes('dent') ? 'dental' : 'contractor'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    variant="secondary"
                    leadingIcon={RiSparklingLine}
                    trailingIcon={RiArrowRightUpLine}
                    className="shrink-0"
                  >
                    View Demo Site
                  </ButtonLink>
                </div>
              </div>

              {/* Card 2: Verified Contacts Grid */}
              <div className="p-4 rounded-xl bg-background-secondary-default/40 border border-separator-border space-y-3">
                <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider block">
                  Verified Contact Intelligence
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption-1-regular">
                  {/* Phone Details */}
                  <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-caption-1-medium text-text-tertiary flex items-center gap-1">
                        <RiPhoneLine className="size-3 text-status-lime-text" /> Direct Phone Line
                      </span>
                      {currentLead.phone && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          +{normalizeWhatsAppPhone(currentLead.phone, currentLead.country)}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-body-medium font-semibold text-text-primary">
                      {currentLead.phone || 'No phone recorded'}
                    </p>
                    {currentLead.phone_type && (
                      <p className="text-caption-1-regular text-text-tertiary">
                        {currentLead.phone_type} {currentLead.carrier ? `• ${currentLead.carrier}` : ''}
                      </p>
                    )}
                    {currentLead.phone && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-separator-border/60 flex-wrap">
                        <Button
                          size="small"
                          variant="secondary"
                          leadingIcon={RiFileCopyLine}
                          onClick={() => handleCopyWhatsAppMessage(currentLead)}
                          className="text-[11px] h-7 px-2"
                          title="Copy tailored WhatsApp pitch"
                        >
                          Copy Pitch
                        </Button>
                        <Button
                          size="small"
                          variant="primary"
                          leadingIcon={RiWhatsappLine}
                          onClick={() => handleLaunchWhatsAppDirect(currentLead)}
                          className="text-[11px] h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                          title="Directly opens WhatsApp Web with message pre-filled. Press Enter to send!"
                        >
                          WhatsApp Web
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Email Details */}
                  <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                    <span className="text-caption-1-medium text-text-tertiary flex items-center gap-1">
                      <RiMailLine className="size-3 text-status-blue-text" /> Verified Email
                    </span>
                    <p className="font-mono text-body-medium font-semibold text-text-primary truncate">
                      {currentLead.email || 'No verified email yet'}
                    </p>
                    <div className="flex items-center gap-2 text-caption-1-regular">
                      {currentLead.email_type === 'decision_maker' ? (
                        <Chip variant="caption" color="lime" className="gap-1 inline-flex items-center">
                          <RiShieldCheckLine className="size-2.5" /> Decision Maker
                        </Chip>
                      ) : (
                        <span className="text-text-tertiary">Public Inbox</span>
                      )}
                      {currentLead.is_mx_valid === 1 && (
                        <Chip variant="caption" color="blue" className="font-mono">
                          MX Validated
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discovered Socials */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-caption-1-regular text-text-tertiary mr-1">Social Footprint:</span>
                  {socials.instagram && (
                    <ButtonLink
                      href={socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      variant="instagram"
                      leadingIcon={RiInstagramLine}
                    >
                      Instagram
                    </ButtonLink>
                  )}
                  {socials.facebook && (
                    <ButtonLink
                      href={socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      variant="facebook"
                      leadingIcon={RiFacebookCircleLine}
                    >
                      Facebook
                    </ButtonLink>
                  )}
                  {socials.linkedin && (
                    <ButtonLink
                      href={socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      variant="linkedin"
                      leadingIcon={RiLinkedinBoxLine}
                    >
                      LinkedIn
                    </ButtonLink>
                  )}
                  {socials.twitter && (
                    <ButtonLink
                      href={socials.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                      variant="twitter"
                      leadingIcon={RiTwitterXLine}
                    >
                      X
                    </ButtonLink>
                  )}
                  {!socials.instagram && !socials.facebook && !socials.linkedin && !socials.twitter && (
                    <span className="text-caption-1-regular text-text-tertiary italic">No social links discovered</span>
                  )}
                </div>
              </div>

              {/* Card 3: Instant Pitch Script Preview */}
              <div className="p-4 rounded-xl bg-background-secondary-default/40 border border-separator-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                    Recommended Outreach Angle
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    leadingIcon={copiedPitch ? RiCheckLine : RiFileCopyLine}
                    onClick={() => handleCopyPitch(currentLead)}
                  >
                    {copiedPitch ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border font-sans text-caption-1-regular text-text-secondary leading-relaxed whitespace-pre-line">
                  {getPitchText(currentLead)}
                </div>
              </div>

              {/* Card 4: Pipeline Status Tagger */}
              <div className="p-4 rounded-xl bg-background-secondary-default/40 border border-separator-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                    Pipeline Stage:
                  </span>
                  {statusMsg && (
                    <Chip variant="bold" color="lime" className="animate-pulse">
                      {statusMsg}
                    </Chip>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <ButtonGroup size="small">
                    {STAGE_CONFIG.map((stage) => (
                      <ButtonGroupItem
                        key={stage.id}
                        selected={normalizeStage(currentLead.status) === stage.id}
                        disabled={updatingStage}
                        onClick={() => handleStageChange(stage.id)}
                        className="capitalize"
                      >
                        {stage.label}
                      </ButtonGroupItem>
                    ))}
                  </ButtonGroup>

                  <Button
                    size="small"
                    variant="danger"
                    leadingIcon={RiDeleteBinLine}
                    iconOnly
                    aria-label="Delete Lead"
                    onClick={(e) => {
                      if (window.confirm('Remove this lead from your pipeline?')) {
                        onDeleteLead(currentLead.id);
                      }
                    }}
                    title="Delete Lead"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-tertiary">
            <RiBuildingLine className="size-12 mb-3 opacity-30 text-text-secondary" />
            <h3 className="text-body-medium font-semibold text-text-secondary">
              No Prospect Selected
            </h3>
            <p className="text-caption-1-regular text-text-tertiary max-w-sm mt-1">
              Select any lead from the left queue to open their complete intelligence dossier and 1-click outreach channels.
            </p>
            <p className="text-caption-1-medium font-mono text-text-tertiary mt-3 flex items-center gap-1.5">
              <span>Tip: Use</span>
              <Kbd>Up</Kbd>
              <Kbd>Down</Kbd>
              <span>arrow keys to navigate fast!</span>
            </p>
          </div>
        )}
      </div>
      {/* WhatsApp Pitch Modal */}
      {whatsAppModalLead && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppModalLead)}
          lead={whatsAppModalLead}
          onClose={() => setWhatsAppModalLead(null)}
          onSuccess={() => onRefreshLead && onRefreshLead()}
        />
      )}
    </div>
  );
}
