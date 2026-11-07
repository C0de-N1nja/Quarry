import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, Phone, Globe, ExternalLink, ShieldCheck, Zap, Sparkles, 
  MessageCircle, Instagram, Facebook, Linkedin, Twitter, AlertTriangle, 
  CheckCircle2, ChevronRight, Trash2, RefreshCw, Star, Building2, 
  MapPin, X, Eye, Send, Copy, ArrowUpRight, Check, User, Flame
} from 'lucide-react';

export default function SplitView({
  leads = [],
  selectedLead,
  onSelectLead,
  onRefreshLead,
  onOpenOsintRun,
  onDeleteLead,
  onOpenAutoPilot,
  onOpenLeadDrawer,
  activeFilter,
  stats
}) {
  const [activeLeadId, setActiveLeadId] = useState(selectedLead?.id || (leads.length > 0 ? leads[0].id : null));
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const listRef = useRef(null);

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
          const nextLead = leads[currentIndex + 1];
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
  }, [leads, activeLeadId, onSelectLead]);

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
      `Hi ${lead.business_name || 'there'}! I noticed your excellent local rating (${lead.rating || '5.0'}★) in ${lead.city || 'your area'}, but saw you don't have an active website yet. We created a free modern website concept for your business. Would you like me to send you the preview link?`
    );
    return `https://wa.me/${cleanDigits}?text=${msg}`;
  };

  // Copy quick pitch text
  const handleCopyPitch = (lead) => {
    if (!lead) return;
    const text = `Hi ${lead.business_name} Team,\n\nI was researching top-rated businesses in ${lead.city || 'your area'} and saw your stellar reputation (${lead.rating || '5.0'}★ with ${lead.reviews_count || 'many'} reviews).\n\nI noticed you don't currently have a dedicated website, meaning you could be losing high-value local customers searching Google directly to competitors.\n\nWe put together a clean, mobile-optimized website prototype designed specifically for ${lead.business_name}. Would you be open to checking out a quick 30-second live preview?`;
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const socials = getSocials(currentLead);
  const isNoWebsite = currentLead ? (currentLead.has_no_website === 1 || !currentLead.website) : false;
  const isGold = currentLead ? (Number(currentLead.rating) >= 4.5 && Number(currentLead.reviews_count) >= 10) : false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)] min-h-[600px]">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE: LEAD TRIAGE QUEUE (Col 1 to 5)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-surface-1 rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {/* Queue Header & Shortcut Indicator */}
        <div className="p-3 border-b border-border-subtle bg-surface-2/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Lead Queue
            </span>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-brand/10 text-brand">
              {leads.length}
            </span>
            {leads.length > 0 && onOpenOsintRun && (
              <button
                onClick={() => onOpenOsintRun({
                  filter: activeFilter,
                  leadIds: leads.map(l => l.id)
                })}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                title={`Run OSINT specifically on these ${leads.length} visible leads`}
              >
                <ShieldCheck className="h-3 w-3" />
                <span>OSINT View</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle">↓</kbd>
          </div>
        </div>

        {/* Scrollable List of Lead Cards */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-border-subtle/60">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No leads match this view</p>
              <p className="text-xs text-gray-500 mt-1">Try switching filters or run a new search.</p>
            </div>
          ) : (
            leads.map((lead, idx) => {
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
                      ? 'bg-brand/10 dark:bg-brand/15 border-l-4 border-l-brand' 
                      : 'hover:bg-surface-2/70 bg-transparent border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-gray-400 font-medium">
                          #{idx + 1}
                        </span>
                        <h4 className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-brand dark:text-brand-light' : 'text-gray-900 dark:text-white'
                        }`}>
                          {lead.business_name}
                        </h4>
                      </div>

                      {/* Subtitle: Category & City */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        {lead.google_category && (
                          <span className="truncate max-w-[130px]">
                            {lead.google_category}
                          </span>
                        )}
                        {lead.city && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[100px] flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5 opacity-60" />
                              {lead.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    {lead.rating && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold shrink-0">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{lead.rating}</span>
                        {lead.reviews_count && (
                          <span className="text-[9px] opacity-75 font-normal">({lead.reviews_count})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Channel & Status Pills */}
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {leadNoWeb ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5 text-rose-500" />
                        <span>No Website</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-gray-600 dark:text-gray-400 border border-border-subtle truncate max-w-[120px]">
                        🌐 Has Site
                      </span>
                    )}

                    {hasWa && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" />
                        <span>WhatsApp</span>
                      </span>
                    )}

                    {hasEmail && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-0.5">
                        <Mail className="h-2.5 w-2.5" />
                        <span>Email</span>
                      </span>
                    )}

                    {hasPhone && !hasWa && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" />
                        <span>Phone</span>
                      </span>
                    )}

                    {/* Stage status indicator */}
                    <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      lead.status === 'won' ? 'bg-emerald-500/20 text-emerald-500 font-bold' :
                      lead.status === 'pitched' ? 'bg-indigo-500/20 text-indigo-400' :
                      lead.status === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                      'text-gray-400'
                    }`}>
                      {lead.status || 'discovered'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE: LIVE PROSPECT DOSSIER & 1-CLICK OUTREACH (Col 6 to 12)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-surface-1 rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {currentLead ? (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Dossier Top Bar */}
            <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface-2/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {currentLead.business_name}
                    </h2>
                    {isGold && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⭐ GOLD PROSPECT
                      </span>
                    )}
                    {currentLead.google_category && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle">
                        {currentLead.google_category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    {currentLead.rating && (
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{currentLead.rating}</span>
                        <span className="text-gray-400 font-normal">({currentLead.reviews_count || 0} Google reviews)</span>
                      </div>
                    )}
                    {currentLead.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {currentLead.address || currentLead.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Google Maps & Full Drawer Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {currentLead.maps_link && (
                    <a
                      href={currentLead.maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
                      title="Open Google Maps Profile"
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <span>Google Maps</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}

                  <button
                    onClick={() => onOpenLeadDrawer && onOpenLeadDrawer(currentLead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-3 hover:bg-border-subtle text-gray-900 dark:text-white border border-border-hover transition-colors cursor-pointer"
                    title="Open full detail & prototype drawer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Full Drawer</span>
                  </button>
                </div>
              </div>

              {/* ⚡ INSTANT 1-CLICK OUTREACH ACTION BAR ⚡ */}
              <div className="mt-4 pt-3 border-t border-border-subtle/80 flex items-center gap-2 flex-wrap">
                {/* 1-Click WhatsApp Button */}
                {(currentLead.whatsapp || currentLead.phone) && (
                  <a
                    href={getWhatsAppUrl(currentLead)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                    title="Open 1-Click WhatsApp outreach chat with prefilled pitch"
                  >
                    <MessageCircle className="h-4 w-4 fill-white" />
                    <span>WhatsApp Pitch</span>
                    <ArrowUpRight className="h-3 w-3 opacity-75" />
                  </a>
                )}

                {/* 1-Click Email Pitch */}
                {currentLead.email ? (
                  <a
                    href={`mailto:${currentLead.email}?subject=${encodeURIComponent(`Website concept for ${currentLead.business_name}`)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Pitch</span>
                    <ArrowUpRight className="h-3 w-3 opacity-75" />
                  </a>
                ) : (
                  <button
                    onClick={() => onOpenOsintRun && onOpenOsintRun([currentLead.id], currentLead.google_category)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Find Owner Email (OSINT)</span>
                  </button>
                )}

                {/* Direct Call Button */}
                {currentLead.phone && (
                  <a
                    href={`tel:${currentLead.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Call {currentLead.phone}</span>
                  </a>
                )}

                {/* Copy Pitch Button */}
                <button
                  onClick={() => handleCopyPitch(currentLead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors ml-auto cursor-pointer"
                >
                  {copiedPitch ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            {/* Dossier Content Cards */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Card 1: Website Opportunity Audit */}
              <div className={`p-4 rounded-xl border ${
                isNoWebsite 
                  ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20' 
                  : 'bg-surface-2/60 border-border-subtle'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Website & Digital Presence
                      </span>
                      {isNoWebsite ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                          🔥 PRIME TARGET: NO WEBSITE FOUND
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-3 text-gray-600 dark:text-gray-400">
                          Registered Domain
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {isNoWebsite 
                        ? `This business has ${currentLead.reviews_count || 10}+ reviews with a ${currentLead.rating || '4.5'}★ reputation but NO official website. They are actively losing web searches to competitors.`
                        : `Current domain: ${currentLead.website}. Audit website speed and mobile readiness to pitch a modern upgrade.`}
                    </p>
                  </div>

                  {/* Showcase Prototype Link */}
                  <a
                    href={`/showcase/${currentLead.google_category?.toLowerCase().includes('roof') ? 'roofing' : currentLead.google_category?.toLowerCase().includes('dent') ? 'dental' : 'contractor'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0 transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                    <span>View Demo Site</span>
                    <ArrowUpRight className="h-2.5 w-2.5 opacity-75" />
                  </a>
                </div>
              </div>

              {/* Card 2: Verified Contacts Grid */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-border-subtle space-y-3">
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                  Verified Contact Intelligence
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Phone Details */}
                  <div className="p-3 rounded-lg bg-surface-1 border border-border-subtle space-y-1">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-500" /> Direct Phone Line
                    </span>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {currentLead.phone || 'No phone recorded'}
                    </p>
                    {currentLead.phone_type && (
                      <p className="text-[10px] text-gray-500">
                        {currentLead.phone_type} {currentLead.carrier ? `• ${currentLead.carrier}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Email Details */}
                  <div className="p-3 rounded-lg bg-surface-1 border border-border-subtle space-y-1">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-blue-500" /> Verified Email
                    </span>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {currentLead.email || 'No verified email yet'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                      {currentLead.email_type === 'decision_maker' ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Decision Maker
                        </span>
                      ) : (
                        <span className="text-gray-500">Public Inbox</span>
                      )}
                      {currentLead.is_mx_valid === 1 && (
                        <span className="text-blue-500 font-mono font-bold">MX Validated ✓</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discovered Socials */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 mr-1">Social Footprint:</span>
                  {socials.instagram && (
                    <a
                      href={socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-xs font-medium"
                    >
                      <Instagram className="h-3 w-3" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {socials.facebook && (
                    <a
                      href={socials.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/20 text-xs font-medium"
                    >
                      <Facebook className="h-3 w-3" />
                      <span>Facebook</span>
                    </a>
                  )}
                  {socials.linkedin && (
                    <a
                      href={socials.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600/10 hover:bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-600/20 text-xs font-medium"
                    >
                      <Linkedin className="h-3 w-3" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {!socials.instagram && !socials.facebook && !socials.linkedin && (
                    <span className="text-xs text-gray-400 italic">No social links discovered</span>
                  )}
                </div>
              </div>

              {/* Card 3: Instant Pitch Script Preview */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Recommended Outreach Angle
                  </span>
                  <button
                    onClick={() => handleCopyPitch(currentLead)}
                    className="text-xs text-brand hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPitch ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPitch ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-surface-1 border border-border-subtle font-sans text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {`Hi ${currentLead.business_name} Team,\n\nI was researching top-rated businesses in ${currentLead.city || 'your area'} and saw your stellar reputation (${currentLead.rating || '5.0'}★ with ${currentLead.reviews_count || 'many'} reviews).\n\nI noticed you don't currently have a dedicated website, meaning you could be losing high-value local customers searching Google directly to competitors.\n\nWe put together a clean, mobile-optimized website prototype designed specifically for ${currentLead.business_name}. Would you be open to checking out a quick 30-second live preview?`}
                </div>
              </div>

              {/* Card 4: Pipeline Status Tagger */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Pipeline Stage:
                  </span>
                  {statusMsg && (
                    <span className="text-xs text-emerald-500 font-semibold animate-pulse">
                      {statusMsg}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {['discovered', 'ready', 'pitched', 'contacted', 'won'].map((st) => (
                    <button
                      key={st}
                      disabled={updatingStage}
                      onClick={() => handleStageChange(st)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                        currentLead.status === st
                          ? 'bg-brand text-white shadow-xs font-semibold'
                          : 'bg-surface-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-border-subtle'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    onClick={(e) => {
                      if (window.confirm('Remove this lead from your pipeline?')) {
                        onDeleteLead(currentLead.id);
                      }
                    }}
                    className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors ml-2 cursor-pointer"
                    title="Delete Lead"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <Building2 className="h-12 w-12 mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
              No Prospect Selected
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Select any lead from the left queue to open their complete intelligence dossier and 1-click outreach channels.
            </p>
            <p className="text-[11px] font-mono text-gray-400 mt-3">
              Tip: Use the <kbd className="px-1.5 py-0.5 rounded bg-surface-3">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-surface-3">↓</kbd> arrow keys to navigate fast!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
