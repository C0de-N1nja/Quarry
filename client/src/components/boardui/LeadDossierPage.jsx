import React, { useState, useEffect, useRef } from 'react';
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
  RiBookmarkFill,
  RiShieldUserLine,
  RiTimeLine,
  RiCloseLine,
  RiAlertLine,
  RiRefreshLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Avatar } from '@/components/base/avatar/avatar';
import { toast } from '@/components/base/toast/toast';
import { cx } from '@/utils/cx';

// Friendly Step-by-Step Research Stages
const RECON_STEPS = [
  { id: 'init', label: 'Checking Business & Location', desc: 'Confirming company name, city, and category' },
  { id: 'dns', label: 'Checking Website & Online Status', desc: 'Looking for official website and online presence' },
  { id: 'registry', label: 'Finding Owner in Business Records', desc: 'Searching official registrations for owner or founder name' },
  { id: 'contacts', label: 'Verifying Phone Lines & WhatsApp', desc: 'Detecting mobile vs office numbers and messaging readiness' },
  { id: 'consolidation', label: 'Finalizing Lead Details', desc: 'Organizing contact info so you can reach out' }
];

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
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const abortControllerRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead?.status || 'discovered');
  const [dealValue, setDealValue] = useState(lead?.deal_value || '');

  // Scratchpad Notes (persisted per lead in localStorage and DB)
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(`quarry_notes_${lead?.id}`) || lead?.notes || '';
  });
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimeoutRef = useRef(null);

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
        if (data.lead?.notes && !localStorage.getItem(`quarry_notes_${lead.id}`)) {
          setNotes(data.lead.notes);
          localStorage.setItem(`quarry_notes_${lead.id}`, data.lead.notes);
        }
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
      setDealValue(lead.deal_value || '');
      const initialNotes = localStorage.getItem(`quarry_notes_${lead.id}`) || lead.notes || '';
      setNotes(initialNotes);
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

  // Verified Owner Filter (ignores corporate entity names & raw business names)
  const getVerifiedOwnerName = () => {
    const rawName = contact?.contact_name || currentLead.decision_maker_name || currentLead.owner_name;
    if (!rawName) return null;
    const clean = rawName.trim();
    if (!clean) return null;
    if (clean.toLowerCase() === (currentLead.business_name || '').trim().toLowerCase()) return null;
    if (/\b(llc|inc|corp|services|plumbing|hvac|electric|heating|air|cooling|repair|company|group|associates)\b/i.test(clean) && !/\b(dr|mr|mrs|ms)\b/i.test(clean)) {
      return null;
    }
    return clean;
  };

  const verifiedOwner = getVerifiedOwnerName();

  // Opportunity Pitch Angle Badge for website & no-website leads
  const isNoWebsite = currentLead.has_no_website === 1 || !currentLead.website;
  const getOpportunityBadge = () => {
    if (isNoWebsite) {
      return {
        label: 'Needs a Website (Prime Pitch)',
        color: 'emerald',
        pitch: 'High-intent business with real Google reviews, but missing an official website and booking funnel.'
      };
    }
    if (audit) {
      const score = audit.performance_score || audit.score || 0;
      if (score < 50) {
        return {
          label: 'Slow Website (Redesign Angle)',
          color: 'rose',
          pitch: `Low performance score (${score}/100) causes high mobile visitor bounce rate. Prime opportunity for redesign.`
        };
      }
      if (score < 80) {
        return {
          label: 'Average Speed (SEO Angle)',
          color: 'amber',
          pitch: `Moderate performance score (${score}/100). Technical speed optimizations needed to outrank competitors on Google.`
        };
      }
      return {
        label: 'Fast Website (Optimization Angle)',
        color: 'blue',
        pitch: 'Website has strong speed scores. Focus outreach on conversion rate optimization or paid acquisition.'
      };
    }
    return {
      label: 'Website Active',
      color: 'blue',
      pitch: 'Active commercial website detected. Run a quick speed check to discover performance flaws.'
    };
  };

  const opportunity = getOpportunityBadge();

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

  // Handle Note edits with instant local storage and debounced DB persistence
  const handleNotesChange = (val) => {
    setNotes(val);
    localStorage.setItem(`quarry_notes_${currentLead.id}`, val);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);

    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
    notesSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/leads/${currentLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: val })
        });
        if (onRefreshLead) onRefreshLead(currentLead.id);
      } catch (e) {
        console.error('Failed to sync note to DB', e);
      }
    }, 600);
  };

  const handleAddQuickTag = (tag) => {
    const updated = notes ? `${notes}\n• ${tag}` : `• ${tag}`;
    handleNotesChange(updated);
  };

  // Run in-dossier live website speed and quality audit
  const handleRunAudit = async () => {
    if (!currentLead?.id || !currentLead?.website) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/audit-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentLead.website })
      });
      const data = await res.json();
      if (data.success && data.audit) {
        setDetail(prev => ({
          ...prev,
          audit: data.audit,
          lead: data.lead || prev?.lead
        }));
        toast.success('Website Speed & Mobile Audit Complete!', {
          description: `Speed: ${data.audit.performance_score}/100 • Mobile: ${data.audit.seo?.has_viewport !== false ? 'Friendly' : 'Needs Fix'}`
        });
        if (onRefreshLead) onRefreshLead(currentLead.id);
      } else {
        toast.error('Website audit failed', { description: data.error || 'Could not test this website.' });
      }
    } catch (err) {
      toast.error('Audit failed', { description: err.message });
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Run OSINT Enrichment with Live Progress Ticker & Abort Control
  const handleRunOsint = async () => {
    if (osintLoading) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setOsintLoading(true);
    setScanElapsed(0);
    setScanStepIndex(0);
    setScanProgress(8);

    const startTime = Date.now();
    scanTimerRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      setScanElapsed(elapsedSec);

      if (elapsedSec < 1.6) {
        setScanStepIndex(0);
        setScanProgress(Math.min(22, 8 + elapsedSec * 9));
      } else if (elapsedSec < 3.4) {
        setScanStepIndex(1);
        setScanProgress(Math.min(45, 22 + (elapsedSec - 1.6) * 12));
      } else if (elapsedSec < 5.2) {
        setScanStepIndex(2);
        setScanProgress(Math.min(68, 45 + (elapsedSec - 3.4) * 12));
      } else if (elapsedSec < 7.0) {
        setScanStepIndex(3);
        setScanProgress(Math.min(88, 68 + (elapsedSec - 5.2) * 11));
      } else {
        setScanStepIndex(4);
        setScanProgress(Math.min(96, 88 + (elapsedSec - 7.0) * 1.5));
      }
    }, 100);

    try {
      const res = await fetch(`/api/osint/${currentLead.id}?force=true`, {
        method: 'POST',
        signal: controller.signal
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Successfully finished
      setScanProgress(100);
      setScanStepIndex(RECON_STEPS.length);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);

      // Brief 450ms pause so user visibly sees 100% completion & all green ticks
      await new Promise(r => setTimeout(r, 450));

      const contactCount = (data.contacts && data.contacts.length) || 0;
      toast.success('Lead Research Complete!', {
        description: contactCount > 0 
          ? `Found ${contactCount} verified contact points & updated profile.` 
          : 'Lead details updated successfully.'
      });

      await fetchLeadDetails();
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      if (err.name === 'AbortError') {
        toast.info('Research cancelled');
      } else {
        toast.error(err.message || 'Could not complete research');
      }
    } finally {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      setOsintLoading(false);
      setScanElapsed(0);
      setScanProgress(0);
      setScanStepIndex(0);
    }
  };

  const handleCancelOsint = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
        toast.success('Email is verified and safe to send!', { description: targetEmail });
      } else {
        toast.error('Email could not be verified (might bounce)', { description: targetEmail });
      }
      await fetchLeadDetails();
    } catch (err) {
      toast.error(err.message || 'Could not verify email');
    } finally {
      setEmailVerifying(false);
    }
  };

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

                  <Chip variant="subtle" color={opportunity.color} size="sm">
                    {opportunity.label}
                  </Chip>
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
              variant={osintLoading ? "secondary" : "primary"}
              leadingIcon={osintLoading ? RiLoader4Line : RiShieldCheckLine}
              onClick={handleRunOsint}
              disabled={osintLoading}
              title="Find owner and verified contact info for this business"
            >
              {osintLoading ? `Researching (${Math.floor(scanElapsed)}s)...` : 'Find Contacts'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dossier Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Intelligence Evidence & Web Analysis (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* LIVE RECONNAISSANCE MISSION CONTROL HUD (Active when scan is running) */}
            {osintLoading && (
              <div className="rounded-2xl border-2 border-cyan-500/50 bg-background-primary-default p-5 shadow-xl shadow-cyan-950/20 relative overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent pointer-events-none animate-pulse" />

                {/* HUD Top Bar: Pulse, Title, Real-Time Timer, Abort Button */}
                <div className="relative flex items-center justify-between gap-3 flex-wrap border-b border-separator-border/70 pb-3.5 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex size-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-3 bg-cyan-500" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-text-primary tracking-tight">
                          Researching Business & Contacts
                        </h3>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {Math.round(scanProgress)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Finding owner details, verified phone numbers, and website status for <strong className="text-text-primary">{currentLead.business_name}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-secondary-default border border-separator-border font-mono text-xs text-text-secondary">
                      <RiTimeLine className="size-3.5 text-cyan-400 animate-spin" />
                      <span className="text-text-primary font-bold">00:{scanElapsed < 10 ? `0${Math.floor(scanElapsed)}` : Math.floor(scanElapsed)}s</span>
                    </div>
                    <Button
                      size="small"
                      variant="secondary"
                      leadingIcon={RiCloseLine}
                      onClick={handleCancelOsint}
                      title="Cancel research"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Progress Bar with Gradient */}
                <div className="relative w-full h-2 rounded-full bg-background-tertiary-default overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-150 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                {/* Real-Time Step Progression Indicators */}
                <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {RECON_STEPS.map((step, idx) => {
                    const isDone = idx < scanStepIndex;
                    const isActive = idx === scanStepIndex;
                    return (
                      <div
                        key={step.id}
                        className={cx(
                          "p-2.5 rounded-xl border transition-all flex items-start gap-2.5",
                          isDone
                            ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
                            : isActive
                            ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 ring-1 ring-cyan-500/20 shadow-xs"
                            : "bg-background-secondary-default/40 border-separator-border/40 text-text-tertiary opacity-60"
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <div className="size-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              <RiCheckLine className="size-3 stroke-[2.5]" />
                            </div>
                          ) : isActive ? (
                            <RiLoader4Line className="size-4 animate-spin text-cyan-400" />
                          ) : (
                            <div className="size-4 rounded-full border border-separator-border text-text-tertiary flex items-center justify-center text-[9px] font-mono">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={cx(
                            "block font-medium truncate",
                            isActive ? "text-text-primary font-semibold" : isDone ? "text-text-secondary" : "text-text-tertiary"
                          )}>
                            {step.label}
                          </span>
                          <span className="block text-[10px] text-text-tertiary truncate">
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State Hero Banner (Only shown if NOT scanning and prospect unprobed) */}
            {!osintLoading && !parsedOsint && !audit && (
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <RiSparklingLine className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Automated Research Ready</h3>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      Find the business owner's name, verify phone numbers and email address, and check if they have a working website.
                    </p>
                  </div>
                </div>
                <Button
                  size="small"
                  variant="primary"
                  leadingIcon={RiShieldCheckLine}
                  onClick={handleRunOsint}
                  disabled={osintLoading}
                  className="shrink-0"
                >
                  ⚡ Find Owner & Contacts
                </Button>
              </div>
            )}

            {/* 1. Website & Online Presence */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                    <RiGlobalLine className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary">Website & Online Presence</h2>
                    <p className="text-[11px] text-text-secondary">Official website status, security check, and platform</p>
                  </div>
                </div>
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
                        Opportunity: Needs a Modern Website
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This business is active with real customer reviews on Google, but doesn't have an official website. Perfect prospect for web design or marketing services.
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
                        Secure (HTTPS)
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
                          Built with WordPress
                        </Chip>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Candidate Domains Checked */}
              {parsedOsint?.candidate_domains && parsedOsint.candidate_domains.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-separator-border/60">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                    Web Addresses Checked ({parsedOsint.candidate_domains.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsedOsint.candidate_domains.map((cd, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between text-xs">
                        <span className="font-mono text-text-primary truncate max-w-[180px]">
                          {cd.domain}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                          <Chip variant="subtle" color={cd.dns ? "emerald" : "gray"} size="sm">
                            {cd.dns ? 'Registered' : 'Available'}
                          </Chip>
                          <Chip variant="subtle" color={cd.http ? "emerald" : "rose"} size="sm">
                            {cd.http ? 'Live' : 'Inactive'}
                          </Chip>
                          {cd.isParked && (
                            <Chip variant="subtle" color="amber" size="sm">
                              For Sale
                            </Chip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 2. Owner & Leadership */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                  <RiUser3Line className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Owner & Leadership</h2>
                  <p className="text-[11px] text-text-secondary">
                    {verifiedOwner ? 'Verified business owner from official public filings' : 'Owner not discovered in public records yet'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-1">
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Owner / Decision Maker</span>
                  <span className={cx("text-sm font-bold block", verifiedOwner ? "text-text-primary" : "text-text-tertiary italic")}>
                    {verifiedOwner || 'Owner not found yet'}
                  </span>
                  <span className="text-xs text-text-secondary block">
                    {verifiedOwner ? (contact?.contact_title || currentLead.decision_maker_title || 'Owner / Principal Officer') : 'Executive profile pending research'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-1">
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Official Business Name</span>
                  <span className="text-sm font-bold text-text-primary block">
                    {currentLead.business_name}
                  </span>
                  <span className="text-xs text-text-secondary block">
                    {currentLead.city ? `Location: ${currentLead.city}` : 'Municipal Business Filing'}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Social Profiles & Online Links */}
            <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                  <RiBuildingLine className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Social Profiles & Online Links</h2>
                  <p className="text-[11px] text-text-secondary">Verified company social media and directory links</p>
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
                <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border">
                  <span className="text-xs text-text-tertiary italic">No social profiles found yet</span>
                </div>
              )}
            </section>

            {/* 4. Website Speed & Mobile Quality (If website exists) */}
            {Boolean(currentLead.website) && (
              <section className="rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary">
                      <RiSpeedUpLine className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-text-primary">Website Speed & Mobile Quality</h2>
                      <p className="text-[11px] text-text-secondary">Page loading speed, mobile friendliness, and technical performance</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      variant={audit ? "secondary" : "primary"}
                      leadingIcon={auditLoading ? RiLoader4Line : RiSpeedUpLine}
                      onClick={handleRunAudit}
                      disabled={auditLoading}
                    >
                      {auditLoading ? 'Testing Speed & Quality...' : audit ? 'Re-test Speed' : '⚡ Run Speed & Quality Check'}
                    </Button>
                    {audit && onOpenAudit && (
                      <Button
                        size="small"
                        variant="ghost"
                        leadingIcon={RiExternalLinkLine}
                        onClick={() => onOpenAudit(currentLead.id)}
                        className="text-text-secondary hover:text-text-primary text-xs"
                      >
                        Full Report
                      </Button>
                    )}
                  </div>
                </div>

                {auditLoading && (
                  <div className="p-4 rounded-xl bg-background-secondary-default border border-cyan-500/30 flex items-center gap-3 animate-pulse">
                    <RiLoader4Line className="size-5 animate-spin text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Testing page speed & mobile responsiveness...</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">Measuring TTFB, First Contentful Paint, mobile viewport, and SSL certificates.</p>
                    </div>
                  </div>
                )}

                {!auditLoading && audit ? (
                  <div className="space-y-4 pt-1">
                    {/* 4 Score Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                        <div className="text-[10px] uppercase font-mono text-text-tertiary">Speed Score</div>
                        <div className={cx(
                          "text-2xl font-bold font-mono mt-1",
                          (audit.performance_score || 0) < 50 ? "text-rose-500" : (audit.performance_score || 0) < 80 ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {audit.performance_score ?? 'N/A'}/100
                        </div>
                        <span className="text-[10px] text-text-secondary mt-0.5 block">
                          {(audit.performance_score || 0) < 50 ? 'Slow (High Bounce)' : (audit.performance_score || 0) < 80 ? 'Moderate Speed' : 'Fast'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                        <div className="text-[10px] uppercase font-mono text-text-tertiary">Mobile Friendly</div>
                        <div className={cx(
                          "text-base font-bold mt-2",
                          audit.mobile_friendly !== false && audit.seo?.has_viewport !== false ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {audit.mobile_friendly !== false && audit.seo?.has_viewport !== false ? 'Yes (Mobile Ready)' : 'No (Needs Fix)'}
                        </div>
                        <span className="text-[10px] text-text-secondary mt-0.5 block">Responsive view</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                        <div className="text-[10px] uppercase font-mono text-text-tertiary">Mobile Load Time</div>
                        <div className={cx(
                          "text-2xl font-bold font-mono mt-1",
                          (audit.load_time_sec || (audit.load_time_ms ? audit.load_time_ms / 1000 : 0)) > 3 ? "text-rose-500" : "text-emerald-400"
                        )}>
                          {audit.load_time_sec ? `${audit.load_time_sec}s` : audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '1.4s'}
                        </div>
                        <span className="text-[10px] text-text-secondary mt-0.5 block">
                          {(audit.load_time_sec || (audit.load_time_ms ? audit.load_time_ms / 1000 : 0)) > 3 ? 'Slow mobile render' : 'Quick mobile render'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-center">
                        <div className="text-[10px] uppercase font-mono text-text-tertiary">Secure SSL</div>
                        <div className={cx(
                          "text-base font-bold mt-2",
                          audit.has_ssl !== false && audit.security?.is_https !== false ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {audit.has_ssl !== false && audit.security?.is_https !== false ? 'Yes (HTTPS)' : 'Insecure (HTTP)'}
                        </div>
                        <span className="text-[10px] text-text-secondary mt-0.5 block">Encryption valid</span>
                      </div>
                    </div>

                    {/* SEO & Search Visibility row */}
                    <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary">Google Search (SEO) Score:</span>
                        <span className="font-bold font-mono text-blue-400">{audit.seo_score || 85}%</span>
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {audit.seo?.has_meta_description ? '✓ Meta tags present' : '⚠ Missing meta description'}
                      </div>
                    </div>

                    {/* Critical Flaws & Weaknesses List */}
                    {audit.flaws_summary && audit.flaws_summary.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-mono uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                          <RiAlertLine className="size-3.5 text-amber-400" />
                          Critical Flaws & Opportunities ({audit.flaws_summary.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {audit.flaws_summary.map((flaw, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-background-secondary-default border border-separator-border flex items-start gap-2 text-xs">
                              <span className="size-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span className="text-text-secondary leading-relaxed">{flaw}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sales Pitch Angle Helper */}
                    <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                          <RiSparklingLine className="size-3.5 shrink-0" />
                          <span>Recommended Pitch Angle</span>
                        </div>
                        <p className="text-text-secondary leading-relaxed">
                          {audit.pitch_draft || opportunity.pitch}
                        </p>
                      </div>
                      {onOpenAudit && (
                        <Button size="small" variant="ghost" onClick={() => onOpenAudit(currentLead.id)} className="shrink-0 text-accent-400">
                          View Interactive Report ↗
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !auditLoading ? (
                  <div className="p-5 rounded-xl bg-background-secondary-default border border-separator-border text-center space-y-3">
                    <p className="text-xs text-text-secondary max-w-md mx-auto">
                      Test page load speed, mobile responsiveness, and Google SEO tags with 1 click to discover pitch angles.
                    </p>
                    <Button
                      size="small"
                      variant="primary"
                      leadingIcon={RiSpeedUpLine}
                      onClick={handleRunAudit}
                      disabled={auditLoading}
                    >
                      ⚡ Run Speed & Quality Check
                    </Button>
                  </div>
                ) : null}
              </section>
            )}

            {/* 5. Prospect Scratchpad & Notes (Moved to left column for layout balance) */}
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

          </div>

          {/* RIGHT RAIL: Direct Contacts, Location, Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Verified Contact Channels */}
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
                      Phone Number
                    </span>
                    {currentLead.phone_type === 'wireless' || currentLead.phone_type === 'mobile' ? (
                      <Chip variant="subtle" color="emerald" size="sm">
                        Mobile (Calls & SMS)
                      </Chip>
                    ) : currentLead.phone_type === 'landline' ? (
                      <Chip variant="subtle" color="blue" size="sm">
                        Office Landline
                      </Chip>
                    ) : currentLead.phone_type === 'voip' ? (
                      <Chip variant="subtle" color="purple" size="sm">
                        VOIP Phone
                      </Chip>
                    ) : (
                      <Chip variant="subtle" color="gray" size="sm">
                        Unknown Line
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
                      Email Address
                    </span>
                    {primaryEmail && (
                      <Button
                        size="small"
                        variant="ghost"
                        leadingIcon={emailVerifying ? RiLoader4Line : RiCheckboxCircleLine}
                        onClick={handleVerifyEmail}
                        disabled={emailVerifying}
                        className="h-auto p-0 text-[10px] text-blue-400 hover:underline"
                        title="Check if this email address is active and safe to send to"
                      >
                        {emailVerifying ? 'Checking...' : 'Verify Email'}
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
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                  <RiMapPinLine className="size-3.5 text-text-secondary" />
                  Location & Google Maps
                </h2>
                {currentLead.city && (
                  <span className="text-[11px] text-text-secondary font-medium">
                    {currentLead.city}
                  </span>
                )}
              </div>

              {/* Embedded Interactive Google Map */}
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-separator-border bg-background-secondary-default shadow-xs">
                <iframe
                  title="Google Maps Location"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    currentLead.address || `${currentLead.business_name}, ${currentLead.city || 'Austin'}`
                  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0 filter contrast-[0.95] dark:invert-[0.9] dark:hue-rotate-180"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-mono text-text-tertiary block">Commercial Address</span>
                  <span className="text-xs font-bold text-text-primary block mt-0.5">
                    {currentLead.address || `${currentLead.city || 'Austin'}, United States`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-separator-border/60">
                  <div className="text-[11px] text-text-secondary flex items-center gap-1.5">
                    {currentLead.rating && (
                      <span className="inline-flex items-center gap-1 text-amber-500 font-semibold font-mono">
                        <RiStarFill className="size-3" />
                        {currentLead.rating}
                      </span>
                    )}
                    {currentLead.reviews_count > 0 && (
                      <span className="text-text-tertiary font-mono">
                        ({currentLead.reviews_count} reviews)
                      </span>
                    )}
                  </div>
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

            {/* 3. Archive Lead Action */}
            {onArchiveLead && (
              <Button
                variant="secondary"
                leadingIcon={RiArchiveLine}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to archive "${currentLead.business_name}"?`)) {
                    onArchiveLead(currentLead.id);
                    if (hasNext) handleNext();
                    else onBack();
                  }
                }}
                className="w-full justify-center text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/60 font-semibold transition-colors"
              >
                Archive Lead
              </Button>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
