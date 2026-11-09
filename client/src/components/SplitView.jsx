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
  RiArrowRightUpLine
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { Kbd } from '@/components/base/kbd/kbd';

export default function SplitView({
  leads = [],
  selectedLead,
  onSelectLead,
  onRefreshLead,
  onOpenOsintRun,
  onDeleteLead,
  onOpenLeadDrawer,
  activeFilter,
  stats
}) {
  const [activeLeadId, setActiveLeadId] = useState(selectedLead?.id || (leads.length > 0 ? leads[0].id : null));
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [visibleQueueCount, setVisibleQueueCount] = useState(50);
  const listRef = useRef(null);

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
    const msg = encodeURIComponent(
      `Hi ${lead.business_name || 'there'}! I noticed your excellent local rating (${lead.rating || '5.0'} / 5.0) in ${lead.city || 'your area'}, but saw you don't have an active website yet. We created a free modern website concept for your business. Would you like me to send you the preview link?`
    );
    return `https://wa.me/${cleanDigits}?text=${msg}`;
  };

  // Copy quick pitch text
  const handleCopyPitch = (lead) => {
    if (!lead) return;
    const text = `Hi ${lead.business_name} Team,\n\nI was researching top-rated businesses in ${lead.city || 'your area'} and saw your stellar reputation (${lead.rating || '5.0'} / 5.0 with ${lead.reviews_count || 'many'} reviews).\n\nI noticed you don't currently have a dedicated website, meaning you could be losing high-value local customers searching Google directly to competitors.\n\nWe put together a clean, mobile-optimized website prototype designed specifically for ${lead.business_name}. Would you be open to checking out a quick 30-second live preview?`;
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
          {leads.length === 0 ? (
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
                            lead.status === 'won' ? 'lime' :
                            lead.status === 'pitched' ? 'yellow' :
                            lead.status === 'contacted' ? 'purple' :
                            'neutral'
                          }
                          className="uppercase font-mono"
                        >
                          {lead.status || 'discovered'}
                        </Chip>
                      </div>
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
        {currentLead ? (
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

                {/* Primary Google Maps & Full Drawer Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentLead.maps_link && (
                    <ButtonLink
                      href={currentLead.maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="google-subtle"
                      leadingIcon={RiMapPinLine}
                      trailingIcon={RiArrowRightUpLine}
                      title="Open Google Maps Profile"
                    >
                      Google Maps
                    </ButtonLink>
                  )}

                  <Button
                    onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(currentLead)}
                    size="small"
                    variant="primary"
                    leadingIcon={RiEyeLine}
                    title="Open full detail & prototype drawer"
                  >
                    Full Drawer
                  </Button>
                </div>
              </div>

              {/* INSTANT 1-CLICK OUTREACH ACTION BAR */}
              <div className="mt-4 pt-3 border-t border-separator-border flex items-center gap-2 flex-wrap">
                {/* 1-Click WhatsApp Button */}
                {(currentLead.whatsapp || currentLead.phone) && (
                  <ButtonLink
                    href={getWhatsAppUrl(currentLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    variant="whatsapp"
                    leadingIcon={RiWhatsappLine}
                    trailingIcon={RiArrowRightUpLine}
                    title="Open 1-Click WhatsApp outreach chat with prefilled pitch"
                  >
                    WhatsApp Pitch
                  </ButtonLink>
                )}

                {/* 1-Click Email Pitch */}
                {currentLead.email ? (
                  <ButtonLink
                    href={`mailto:${currentLead.email}?subject=${encodeURIComponent(`Website concept for ${currentLead.business_name}`)}`}
                    size="small"
                    variant="primary"
                    leadingIcon={RiMailLine}
                    trailingIcon={RiArrowRightUpLine}
                  >
                    Email Pitch
                  </ButtonLink>
                ) : (
                  <Button
                    onClick={() => onOpenOsintRun && onOpenOsintRun([currentLead.id], currentLead.google_category)}
                    size="small"
                    variant="secondary"
                    leadingIcon={RiShieldCheckLine}
                  >
                    Find Owner Email (OSINT)
                  </Button>
                )}

                {/* Direct Call Button */}
                {currentLead.phone && (
                  <ButtonLink
                    href={`tel:${currentLead.phone}`}
                    size="small"
                    variant="phone"
                    leadingIcon={RiPhoneLine}
                  >
                    Call {currentLead.phone}
                  </ButtonLink>
                )}

                {/* Copy Pitch Button */}
                <Button
                  onClick={() => handleCopyPitch(currentLead)}
                  size="small"
                  variant="ghost"
                  leadingIcon={copiedPitch ? RiCheckLine : RiFileCopyLine}
                  className="ml-auto"
                >
                  {copiedPitch ? 'Copied Pitch!' : 'Copy Script'}
                </Button>
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
                  <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                    <span className="text-caption-1-medium text-text-tertiary flex items-center gap-1">
                      <RiPhoneLine className="size-3 text-status-lime-text" /> Direct Phone Line
                    </span>
                    <p className="font-mono text-body-medium font-semibold text-text-primary">
                      {currentLead.phone || 'No phone recorded'}
                    </p>
                    {currentLead.phone_type && (
                      <p className="text-caption-1-regular text-text-tertiary">
                        {currentLead.phone_type} {currentLead.carrier ? `• ${currentLead.carrier}` : ''}
                      </p>
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
                  {`Hi ${currentLead.business_name} Team,\n\nI was researching top-rated businesses in ${currentLead.city || 'your area'} and saw your stellar reputation (${currentLead.rating || '5.0'} / 5.0 with ${currentLead.reviews_count || 'many'} reviews).\n\nI noticed you don't currently have a dedicated website, meaning you could be losing high-value local customers searching Google directly to competitors.\n\nWe put together a clean, mobile-optimized website prototype designed specifically for ${currentLead.business_name}. Would you be open to checking out a quick 30-second live preview?`}
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
                    {['discovered', 'ready', 'pitched', 'contacted', 'won'].map((st) => (
                      <ButtonGroupItem
                        key={st}
                        selected={currentLead.status === st}
                        disabled={updatingStage}
                        onClick={() => handleStageChange(st)}
                        className="capitalize"
                      >
                        {st}
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
    </div>
  );
}
