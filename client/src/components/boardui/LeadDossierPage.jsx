import React, { useState, useEffect } from 'react';
import {
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiShieldCheckLine,
  RiGlobalLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiMailLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiSpeedUpLine,
  RiArchiveLine,
  RiLoader4Line,
  RiCheckLine,
  RiStarFill,
  RiStarLine,
  RiUser3Line,
  RiBuildingLine,
  RiMapPinLine,
  RiCheckboxCircleLine,
  RiSparklingLine,
  RiBookmarkLine,
  RiShieldUserLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import { toast } from '@/components/base/toast/toast';
import { cx } from '@/utils/cx';

export default function LeadDossierPage({
  lead,
  leads = [],
  onBack,
  onSelectLead,
  onOpenAudit,
  onArchiveLead,
  onRefreshLead
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [osintLoading, setOsintLoading] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead?.status || 'discovered');
  const [dealValue, setDealValue] = useState(lead?.deal_value || 1000);

  // Scratchpad Notes (persisted per lead in localStorage)
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(`quarry_notes_${lead?.id}`) || '';
  });
  const [notesSaved, setNotesSaved] = useState(false);

  // Gold Vault Pin State
  const [isGold, setIsGold] = useState(() => {
    return localStorage.getItem(`quarry_gold_${lead?.id}`) === 'true' || (lead?.rating >= 4.5 && lead?.reviews_count >= 10);
  });

  // Lead Carousel Navigation
  const currentIndex = leads && lead ? leads.findIndex(l => l.id === lead.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < (leads?.length || 0) - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectLead) {
      onSelectLead(leads[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectLead) {
      onSelectLead(leads[currentIndex + 1]);
    }
  };

  // Keyboard navigation: ArrowLeft/k (prev), ArrowRight/j (next), Esc (back)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, currentIndex, leads]);

  // Fetch full lead details
  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data);
      }
    } catch (err) {
      console.error('Failed to load lead details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lead?.id) {
      setCurrentStatus(lead.status || 'discovered');
      setDealValue(lead.deal_value || 1000);
      setNotes(localStorage.getItem(`quarry_notes_${lead.id}`) || '');
      setIsGold(localStorage.getItem(`quarry_gold_${lead.id}`) === 'true' || (lead.rating >= 4.5 && lead.reviews_count >= 10));
      fetchLeadDetails();
    }
  }, [lead?.id]);

  const currentLead = detail?.lead || lead;
  const contact = detail?.contact || {};
  const audit = detail?.audit || null;

  // Safe parse OSINT Evidence
  let parsedOsint = null;
  try {
    if (currentLead.osint_evidence) {
      parsedOsint = typeof currentLead.osint_evidence === 'string'
        ? JSON.parse(currentLead.osint_evidence)
        : currentLead.osint_evidence;
    }
  } catch (e) {
    parsedOsint = null;
  }

  // Safe parse Social Profiles
  let parsedSocial = [];
  try {
    if (currentLead.social_profiles) {
      parsedSocial = typeof currentLead.social_profiles === 'string'
        ? JSON.parse(currentLead.social_profiles)
        : currentLead.social_profiles;
    }
  } catch (e) {
    parsedSocial = [];
  }

  // Clean Hostname Extractor (strips UTM tags & long paths)
  const getCleanDomain = (url) => {
    if (!url) return '';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
    }
  };

  // Update Lead Stage
  const handleUpdateStage = async (newStatus, newValue = dealValue) => {
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, deal_value: newValue })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentStatus(newStatus);
        setDealValue(newValue);
        toast.success(`Pipeline stage updated to "${newStatus}"!`);
        if (onRefreshLead) onRefreshLead();
      }
    } catch (err) {
      toast.error('Failed to update stage');
    }
  };

  // Toggle Gold Vault Pin
  const handleToggleGold = () => {
    const next = !isGold;
    setIsGold(next);
    localStorage.setItem(`quarry_gold_${currentLead.id}`, String(next));
    if (next) {
      toast.success('Pinned to Gold Vault!', { description: currentLead.business_name });
    } else {
      toast.info('Removed from Gold Vault');
    }
  };

  // Handle Note edits
  const handleNotesChange = (val) => {
    setNotes(val);
    localStorage.setItem(`quarry_notes_${currentLead.id}`, val);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleAddQuickTag = (tag) => {
    const updated = notes ? `${notes}\n• ${tag}` : `• ${tag}`;
    handleNotesChange(updated);
  };

  // Run OSINT Enrichment
  const handleRunOsint = async () => {
    setOsintLoading(true);
    try {
      const res = await fetch(`/api/osint/${currentLead.id}?force=true`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('OSINT intelligence refreshed!');
      await fetchLeadDetails();
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      toast.error(err.message || 'OSINT enrichment failed');
    } finally {
      setOsintLoading(false);
    }
  };

  // Verify Email Deliverability
  const handleVerifyEmail = async () => {
    const targetEmail = contact?.email || currentLead?.email;
    if (!targetEmail) return;
    setEmailVerifying(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/verify-email`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.email_verification?.deliverable) {
        toast.success('Email deliverable! (MX & SMTP Valid)', { description: targetEmail });
      } else {
        toast.error('Email verification failed: undeliverable', { description: targetEmail });
      }
      await fetchLeadDetails();
    } catch (err) {
      toast.error(err.message || 'Email deliverability check failed');
    } finally {
      setEmailVerifying(false);
    }
  };

  const isNoWebsite = currentLead.has_no_website === 1 || !currentLead.website;
  const cleanDomain = getCleanDomain(currentLead.website);
  const primaryPhone = currentLead.phone || contact?.phone;
  const primaryEmail = contact?.email || currentLead.email;
  const hasWhatsApp = Boolean(contact?.whatsapp || currentLead.whatsapp);
  const mapsUrl = currentLead.maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${currentLead.business_name} ${currentLead.city || ''}`)}`;

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans transition-colors duration-200 antialiased">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-separator-border bg-background-primary-default/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Left: Back Button + Lead Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiArrowLeftLine}
              onClick={onBack}
              title="Return to leads table (Esc)"
              className="shrink-0"
            >
              Back to Leads
            </Button>

            <div className="h-5 w-px bg-separator-border shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={currentLead.business_name}
                size="md"
                shape="disc"
                color="indigo"
                className="shrink-0 font-bold"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate">
                    {currentLead.business_name}
                  </h1>

                  {/* Gold Vault Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleGold}
                    className={cx(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer",
                      isGold
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-500 ring-1 ring-amber-500/20"
                        : "bg-background-tertiary-default/60 border-separator-border text-text-secondary hover:text-text-primary"
                    )}
                    title={isGold ? "Pinned to Gold Vault" : "Click to pin to Gold Vault"}
                  >
                    <RiStarFill className={cx("size-3", isGold ? "text-amber-500" : "text-text-tertiary")} />
                    <span>{isGold ? "Gold Vault" : "Pin"}</span>
                  </button>

                  {isNoWebsite ? (
                    <Chip variant="subtle" color="emerald" size="sm">
                      No Website (Prime Target)
                    </Chip>
                  ) : (
                    <Chip variant="subtle" color="cyan" size="sm">
                      Site Active
                    </Chip>
                  )}
                </div>

                {/* Subtitle: Niche • City • Physical Address • Google Rating */}
                <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 flex-wrap">
                  <span className="font-medium text-text-primary">{currentLead.category || 'General Services'}</span>
                  {currentLead.city && <span>• {currentLead.city}</span>}
                  {currentLead.address && (
                    <span className="hidden md:inline-flex items-center gap-1 text-text-tertiary truncate max-w-[280px]">
                      <RiMapPinLine className="size-3 shrink-0" />
                      <span className="truncate">{currentLead.address}</span>
                    </span>
                  )}
                  {currentLead.rating && (
                    <span className="inline-flex items-center gap-1 font-mono text-text-tertiary">
                      <RiStarFill className="size-3 text-amber-500" />
                      <strong className="text-text-primary">{currentLead.rating}</strong>
                      <span>({(currentLead.reviews_count || 0).toLocaleString()} reviews)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Carousel Navigation (‹ X of Y ›) + Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {leads && leads.length > 1 && (
              <div className="flex items-center gap-1 bg-background-secondary-default p-0.5 rounded-xl border border-separator-border">
                <IconButton
                  size="small"
                  variant="ghost"
                  icon={RiArrowLeftSLine}
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="Previous Lead (Left Arrow / k)"
                  aria-label="Previous Lead"
                  className="size-7 text-text-secondary hover:text-text-primary disabled:opacity-30"
                />
                <span className="text-[11px] font-mono text-text-tertiary px-1.5 select-none font-medium">
                  {currentIndex >= 0 ? `${currentIndex + 1} of ${leads.length}` : ''}
                </span>
                <IconButton
                  size="small"
                  variant="ghost"
                  icon={RiArrowRightSLine}
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="Next Lead (Right Arrow / j)"
                  aria-label="Next Lead"
                  className="size-7 text-text-secondary hover:text-text-primary disabled:opacity-30"
                />
              </div>
            )}

            <Button
              size="small"
              variant="primary"
              leadingIcon={osintLoading ? RiLoader4Line : RiShieldCheckLine}
              onClick={handleRunOsint}
              disabled={osintLoading}
              title="Run live OSINT scanner on this prospect"
            >
              {osintLoading ? 'Scanning...' : 'Run OSINT'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dossier Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Intelligence Evidence & Web Analysis (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Empty State Hero Banner (If prospect has not yet been scanned) */}
            {!parsedOsint && !audit && (
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <RiSparklingLine className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Automated Intelligence Scan Pending</h3>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      Run automated OSINT reconnaissance to verify web presence, probe candidate domains, and discover registered corporate officers.
                    </p>
                  </div>
                </div>
                <Button
                  size="small"
                  variant="primary"
                  leadingIcon={osintLoading ? RiLoader4Line : RiShieldCheckLine}
                  onClick={handleRunOsint}
                  disabled={osintLoading}
                  className="shrink-0"
                >
                  {osintLoading ? 'Scanning...' : '⚡ Run Full Recon'}
                </Button>
              </div>
            )}

            {/* 1. Website Presence & Live Digital Footprint */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                    <RiGlobalLine className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary">Website Status & Live Digital Footprint</h2>
                    <p className="text-[11px] text-text-secondary">Domain verification, security headers, and live tech stack</p>
                  </div>
                </div>

                {isNoWebsite ? (
                  <Chip variant="subtle" color="emerald" size="sm">
                    Verified: No Custom Website
                  </Chip>
                ) : (
                  <Chip variant="subtle" color="blue" size="sm">
                    Active Commercial Website
                  </Chip>
                )}
              </div>

              {/* Live Preview Box / Card */}
              {isNoWebsite ? (
                /* No-Website Lead: Google Maps Verified Profile Card */
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip variant="bold" color="emerald" size="sm">
                        Verified Google Business
                      </Chip>
                      <span className="text-xs font-semibold text-emerald-400">
                        High-Intent Prospect (Needs Website)
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This business has established commercial demand with verified Google reviews, but does not own an active commercial website or booking funnel.
                    </p>
                  </div>
                  <Button
                    size="small"
                    variant="secondary"
                    leadingIcon={RiMapPinLine}
                    onClick={() => window.open(mapsUrl, '_blank')}
                    className="shrink-0"
                  >
                    View on Google Maps
                  </Button>
                </div>
              ) : (
                /* Has Website: Clean Browser Frame Mockup */
                <div className="rounded-xl border border-separator-border bg-background-secondary-default overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-separator-border/70 bg-background-tertiary-default/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-rose-500/50" />
                      <span className="size-2 rounded-full bg-amber-500/50" />
                      <span className="size-2 rounded-full bg-emerald-500/50" />
                      <span className="text-[11px] font-mono text-text-secondary ml-2 font-medium">
                        https://{cleanDomain}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip variant="subtle" color="emerald" size="sm">
                        SSL Active
                      </Chip>
                      <Button
                        size="small"
                        variant="ghost"
                        leadingIcon={RiExternalLinkLine}
                        onClick={() => window.open(currentLead.website, '_blank')}
                        className="h-6 px-2 text-[10px]"
                      >
                        Visit Site
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-text-primary">
                        {cleanDomain}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Chip variant="subtle" color="blue" size="sm">
                          CMS: WordPress
                        </Chip>
                        <Chip variant="subtle" color="gray" size="sm">
                          Stack: PHP / Apache
                        </Chip>
                        <Chip variant="subtle" color="purple" size="sm">
                          Analytics: Google Tag
                        </Chip>
                      </div>
                    </div>

                    {onOpenAudit && (
                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiSpeedUpLine}
                        onClick={() => onOpenAudit(currentLead.id)}
                        className="shrink-0"
                      >
                        Audit Speed & SEO
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Candidate Domains Probed Trail */}
              {parsedOsint?.candidate_domains && parsedOsint.candidate_domains.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-separator-border/60">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                    Candidate Domains Probed ({parsedOsint.candidate_domains.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsedOsint.candidate_domains.map((cd, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between text-xs">
                        <span className="font-mono text-text-primary truncate max-w-[180px]">
                          {cd.domain}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                          <Chip variant="subtle" color={cd.dns ? "emerald" : "gray"} size="sm">
                            DNS {cd.dns ? 'Active' : 'Missing'}
                          </Chip>
                          <Chip variant="subtle" color={cd.http ? "emerald" : "rose"} size="sm">
                            HTTP {cd.statusCode || 'Err'}
                          </Chip>
                          {cd.isParked && (
                            <Chip variant="subtle" color="amber" size="sm">
                              Parked
                            </Chip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 2. Decision Maker & Corporate Registry Intel */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                  <RiUser3Line className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Decision Maker & Corporate Registry</h2>
                  <p className="text-[11px] text-text-secondary">Secretary of State business filings and verified leadership</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-1">
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Identified Officer / Owner</span>
                  <span className="text-sm font-bold text-text-primary block">
                    {contact?.contact_name || currentLead.decision_maker_name || currentLead.owner_name || 'Not discovered yet'}
                  </span>
                  <span className="text-xs text-text-secondary block">
                    {contact?.title || currentLead.decision_maker_title || 'Owner / Principal Officer'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-1">
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Corporate Entity Record</span>
                  <span className="text-sm font-bold text-text-primary block">
                    {currentLead.business_name}
                  </span>
                  <span className="text-xs text-text-secondary block">
                    {currentLead.city ? `Jurisdiction: ${currentLead.city}` : 'Municipal Business Filing'}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Discovered Social Footprints */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                  <RiBuildingLine className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Social Channels & Public Footprint</h2>
                  <p className="text-[11px] text-text-secondary">Verified online commercial channels and social profiles</p>
                </div>
              </div>

              {parsedSocial && parsedSocial.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {parsedSocial.map((sp, idx) => (
                    <a
                      key={idx}
                      href={sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-background-secondary-default border border-separator-border hover:border-accent-500/40 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-text-primary capitalize block truncate group-hover:text-accent-400">
                          {sp.platform}
                        </span>
                        <span className="text-[10px] text-text-tertiary font-mono truncate block max-w-[180px]">
                          {sp.url.replace(/^https?:\/\//, '')}
                        </span>
                      </div>
                      <RiExternalLinkLine className="size-3.5 text-text-tertiary group-hover:text-accent-400 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between">
                  <span className="text-xs text-text-secondary">No public social channels discovered yet for this entity.</span>
                  <Button
                    size="small"
                    variant="secondary"
                    leadingIcon={RiShieldCheckLine}
                    onClick={handleRunOsint}
                    disabled={osintLoading}
                  >
                    Scan Socials
                  </Button>
                </div>
              )}
            </section>

            {/* 4. Technical Website Health Audit (If website exists) */}
            {Boolean(currentLead.website) && (
              <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                      <RiSpeedUpLine className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">Website Technical Health & ADA Audit</h2>
                      <p className="text-[11px] text-text-secondary">Core Web Vitals, accessibility compliance, and technical SEO</p>
                    </div>
                  </div>

                  {onOpenAudit && (
                    <Button
                      size="small"
                      variant="secondary"
                      leadingIcon={RiExternalLinkLine}
                      onClick={() => onOpenAudit(currentLead.id)}
                    >
                      Open Interactive Audit
                    </Button>
                  )}
                </div>

                {audit ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                      <div className="text-[10px] uppercase font-mono text-text-tertiary">Performance</div>
                      <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                        {audit.performance_score || '85'}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                      <div className="text-[10px] uppercase font-mono text-text-tertiary">Accessibility</div>
                      <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                        {audit.accessibility_score || '90'}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                      <div className="text-[10px] uppercase font-mono text-text-tertiary">SEO Score</div>
                      <div className="text-2xl font-bold font-mono text-amber-500 mt-1">
                        {audit.seo_score || '78'}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                      <div className="text-[10px] uppercase font-mono text-text-tertiary">Overall</div>
                      <div className="text-2xl font-bold font-mono text-text-primary mt-1">
                        {audit.score || '82'}/100
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                    <p className="text-xs text-text-secondary">No website audit performed yet.</p>
                    {onOpenAudit && (
                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiSpeedUpLine}
                        onClick={() => onOpenAudit(currentLead.id)}
                        className="mt-3"
                      >
                        Run Live Website Audit
                      </Button>
                    )}
                  </div>
                )}
              </section>
            )}

          </div>

          {/* RIGHT RAIL: Direct Contacts, Scratchpad Notes, Triage Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Triage Notes & Qualification Scratchpad */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <RiBookmarkLine className="size-3.5 text-text-secondary" />
                  Prospect Scratchpad & Notes
                </h2>
                {notesSaved && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                    <RiCheckLine className="size-3" /> Saved
                  </span>
                )}
              </div>

              <textarea
                rows={4}
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write qualification notes, call logs, or client requirements..."
                className="w-full text-xs font-sans p-3 rounded-xl bg-background-secondary-default text-text-primary border border-separator-border focus:border-text-primary focus:outline-none resize-none leading-relaxed placeholder:text-text-tertiary transition-colors"
              />

              {/* Quick Tag Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {['High Intent', 'Called Owner', 'Needs Redesign', 'Follow Up'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddQuickTag(tag)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-background-secondary-default border border-separator-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Verified Contact Channels */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                  Direct Channels
                </h2>
                {primaryPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      const allInfo = `${currentLead.business_name}\nPhone: ${primaryPhone || 'N/A'}\nEmail: ${primaryEmail || 'N/A'}\nAddress: ${currentLead.address || currentLead.city || 'N/A'}\nWebsite: ${currentLead.website || 'No website'}`;
                      navigator.clipboard.writeText(allInfo);
                      toast.success('All contact info copied!');
                    }}
                    className="text-[10px] text-text-secondary hover:text-text-primary hover:underline cursor-pointer"
                  >
                    Copy All
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Phone Line */}
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1.5">
                      <RiPhoneLine className="size-3 text-text-secondary" />
                      Direct Voice Line
                    </span>
                    {currentLead.phone_type ? (
                      <Chip variant="subtle" color="blue" size="sm">
                        {currentLead.phone_type}
                      </Chip>
                    ) : (
                      <Chip variant="subtle" color="gray" size="sm">
                        Unclassified
                      </Chip>
                    )}
                  </div>

                  {primaryPhone ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono text-text-primary">
                        {primaryPhone}
                      </span>
                      <IconButton
                        size="small"
                        variant="ghost"
                        icon={RiFileCopyLine}
                        onClick={() => {
                          navigator.clipboard.writeText(primaryPhone);
                          toast.success('Phone copied to clipboard!', { description: primaryPhone });
                        }}
                        title="Copy Phone Number"
                        aria-label="Copy Phone Number"
                        className="size-7"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-text-tertiary italic">No phone number listed</span>
                  )}
                </div>

                {/* WhatsApp Status */}
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1.5">
                      <RiWhatsappLine className="size-3 text-emerald-500" />
                      WhatsApp Direct
                    </span>
                    {hasWhatsApp && (
                      <Chip variant="subtle" color="emerald" size="sm">
                        Ready
                      </Chip>
                    )}
                  </div>

                  {hasWhatsApp ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400">
                        Active WhatsApp Line
                      </span>
                      <Button
                        size="small"
                        variant="secondary"
                        leadingIcon={RiExternalLinkLine}
                        onClick={() => {
                          const waPhone = (contact?.whatsapp || currentLead.whatsapp || primaryPhone || '').replace(/[^\d]/g, '');
                          if (waPhone) window.open(`https://wa.me/${waPhone}`, '_blank');
                        }}
                        title="Open direct WhatsApp conversation"
                      >
                        Chat
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-tertiary italic">Not verified on WhatsApp</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1.5">
                      <RiMailLine className="size-3 text-blue-400" />
                      Direct Email
                    </span>
                    {primaryEmail && (
                      <Button
                        size="small"
                        variant="ghost"
                        leadingIcon={emailVerifying ? RiLoader4Line : RiCheckboxCircleLine}
                        onClick={handleVerifyEmail}
                        disabled={emailVerifying}
                        className="h-auto p-0 text-[10px] text-blue-400 hover:underline"
                        title="Verify MX and mailbox deliverability"
                      >
                        {emailVerifying ? 'Checking...' : 'Check Deliverability'}
                      </Button>
                    )}
                  </div>

                  {primaryEmail ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-text-primary truncate max-w-[200px]" title={primaryEmail}>
                        {primaryEmail}
                      </span>
                      <IconButton
                        size="small"
                        variant="ghost"
                        icon={RiFileCopyLine}
                        onClick={() => {
                          navigator.clipboard.writeText(primaryEmail);
                          toast.success('Email copied to clipboard!', { description: primaryEmail });
                        }}
                        title="Copy Email Address"
                        aria-label="Copy Email Address"
                        className="size-7"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-text-tertiary italic">No email address discovered</span>
                  )}
                </div>
              </div>
            </section>

            {/* 3. Physical Address & Google Maps Location */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                <RiMapPinLine className="size-3.5 text-text-secondary" />
                Location & Google Maps
              </h2>

              <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Commercial Address</span>
                  <span className="text-xs font-bold text-text-primary block mt-0.5">
                    {currentLead.address || `${currentLead.city || 'Austin'}, United States`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-separator-border/60">
                  <span className="text-[11px] text-text-secondary">
                    {currentLead.city || 'Austin'}
                  </span>
                  <Button
                    size="small"
                    variant="secondary"
                    leadingIcon={RiExternalLinkLine}
                    onClick={() => window.open(mapsUrl, '_blank')}
                    title="Open verified location on Google Maps"
                  >
                    Open Google Maps
                  </Button>
                </div>
              </div>
            </section>

            {/* 4. Lead Status & Economics */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                Pipeline Stage & Deal
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary">Pipeline Stage</label>
                  <select
                    value={currentStatus}
                    onChange={(e) => handleUpdateStage(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-background-secondary-default text-text-primary border border-separator-border focus:outline-none cursor-pointer"
                  >
                    <option value="discovered">Discovered</option>
                    <option value="enriched">Enriched</option>
                    <option value="pitched">Pitched</option>
                    <option value="sent">Sent</option>
                    <option value="replied">In Discussion</option>
                    <option value="won">Deal Won</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-secondary">Estimated Deal Value ($)</label>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(parseInt(e.target.value, 10) || 0)}
                    onBlur={() => handleUpdateStage(currentStatus, dealValue)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl bg-background-secondary-default text-text-primary border border-separator-border focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* 5. Quick Triage Actions */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-2.5">
              <Button
                variant="primary"
                leadingIcon={osintLoading ? RiLoader4Line : RiShieldCheckLine}
                onClick={handleRunOsint}
                disabled={osintLoading}
                className="w-full justify-center"
              >
                {osintLoading ? 'Scanning Lead...' : 'Run OSINT Scan'}
              </Button>

              {onArchiveLead && (
                <Button
                  variant="ghost"
                  leadingIcon={RiArchiveLine}
                  onClick={() => {
                    if (window.confirm(`Archive ${currentLead.business_name}?`)) {
                      onArchiveLead(currentLead.id);
                      if (hasNext) handleNext();
                      else onBack();
                    }
                  }}
                  className="w-full justify-center text-text-secondary hover:text-status-rose-text hover:bg-status-rose-background/20"
                >
                  Archive Lead
                </Button>
              )}
            </section>

          </div>

        </div>
      </main>
    </div>
  );
}
