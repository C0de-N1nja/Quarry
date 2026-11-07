import React, { useState } from 'react';
import { 
  Globe, Phone, ShieldCheck, Mail, Zap, ExternalLink, Trash2, 
  Search as SearchIcon, ArrowUpRight, Sparkles, AlertCircle, CheckCircle2,
  MapPin, Star, Globe2, Loader2, Layout, List, Download, ChevronLeft, ChevronRight, X,
  MessageCircle, Instagram, Facebook, Linkedin, Twitter, Columns2
} from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import SplitView from './SplitView';
import BoardStatCards from './boardui/BoardStatCards';
import BoardLeadTable from './boardui/BoardLeadTable';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { RiCoinsFill, RiGlobalLine, RiShieldCheckLine, RiGroupFill } from '@remixicon/react';

export default function LeadTable({ 
  leads, 
  activeFilter, 
  onFilterChange, 
  searchTerm, 
  onSearchChange, 
  onSelectLead,
  selectedLead,
  onOpenLeadDrawer,
  onRunOsint, 
  onOpenOsintRun,
  onDeleteLead,
  onResolveWebsite,
  onOpenSearch,
  onOpenAutoPilot,
  onExportExcel,
  viewMode = 'split',
  onViewModeChange,
  stats,
  totalCount,
  pageSize = 'all',
  onPageSizeChange,
  currentPage = 1,
  onPageChange,
  activeNiche = 'all',
  onNicheChange,
  contactChannel = 'all',
  onContactChannelChange,
  focusTier = 'vault',
  onFocusTierChange,
  onCleanWebsites,
  onPurgeAllLeads,
  onResetOsint,
  onRefresh
}) {
  const [processingId, setProcessingId] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleToggleLead = (e, leadId) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const filterTabs = [
    { id: 'all', label: 'All Leads' },
    { id: 'no_website', label: 'No Website 🌐❌' },
    { id: 'discovered', label: 'Discovered' },
    { id: 'enriched', label: 'Enriched' },
    { id: 'pitched', label: 'Pitched' },
    { id: 'sent', label: 'Sent' },
    { id: 'replied', label: 'In Discussion' },
    { id: 'won', label: 'Won 🏆' }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'discovered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Discovered</span>
          </span>
        );
      case 'enriched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span>Enriched</span>
          </span>
        );
      case 'pitched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span>Pitched</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Sent ✓</span>
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>In Discussion</span>
          </span>
        );
      case 'won':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            <span>🏆 Won</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-2 text-gray-500 border border-border-subtle">
            {status}
          </span>
        );
    }
  };

  const isSocialOrAggregator = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return [
      'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
      'yelp.com', 'yellowpages.com', 'mapquest.com', 'bbb.org', 'angi.com',
      'homeadvisor.com', 'thumbtack.com', 'manta.com', 'linktr.ee'
    ].some(d => lower.includes(d));
  };

  const getVerificationBadge = (lead) => {
    const hasRealWebsite = lead.website && !isSocialOrAggregator(lead.website);

    if (hasRealWebsite || lead.website_status === 'has_website' || lead.website_status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Verified Domain">
          <Globe className="h-3 w-3" />
          <span>Site Found</span>
        </span>
      );
    }
    if (lead.website_status === 'no_website' || (lead.has_no_website === 1 && lead.no_website_verified === 1)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Verified No Website via OSINT">
          <ShieldCheck className="h-3 w-3" />
          <span>No Site Verified</span>
        </span>
      );
    }
    if (lead.website_status === 'uncertain') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Ambiguous or unreachable">
          <AlertCircle className="h-3 w-3" />
          <span>Uncertain</span>
        </span>
      );
    }
    return (
      <span className="text-gray-400 dark:text-gray-500 text-[10px] font-mono italic">Unverified</span>
    );
  };

  const handleOsintClick = async (e, lead) => {
    e.stopPropagation();
    setProcessingId(`osint-${lead.id}`);
    try {
      await onRunOsint(lead.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveClick = async (e, lead) => {
    e.stopPropagation();
    setProcessingId(`resolve-${lead.id}`);
    try {
      await onResolveWebsite(lead.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this lead?')) {
      onDeleteLead(id);
    }
  };

  const renderContactCell = (lead) => {
    let socials = null;
    if (lead.social_profiles) {
      try {
        socials = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;
      } catch {}
    }

    if (!socials && lead.website) {
      const w = lead.website.toLowerCase();
      if (w.includes('instagram.com/')) socials = { instagram: lead.website };
      else if (w.includes('facebook.com/')) socials = { facebook: lead.website };
      else if (w.includes('linkedin.com/')) socials = { linkedin: lead.website };
      else if (w.includes('twitter.com/') || w.includes('x.com/')) socials = { twitter: lead.website };
    }

    const hasEmail = !!lead.email;
    const hasPhone = !!lead.phone;
    const hasWa = !!lead.whatsapp;
    const hasSocials = socials && (socials.instagram || socials.facebook || socials.linkedin || socials.twitter || socials.tiktok || socials.youtube);

    if (!hasEmail && !hasPhone && !hasWa && !hasSocials) {
      return (
        <span className="text-gray-400 dark:text-gray-500 text-[11px] italic">
          No contact info
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 items-start">
        {/* Verified Owner Name Pill */}
        {lead.decision_maker_name && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold"
            title={`Verified Decision Maker: ${lead.decision_maker_name}`}
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[150px]">{lead.decision_maker_name}</span>
          </span>
        )}

        {/* 1. Verified Email (if discovered) */}
        {hasEmail && (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 group/email">
              <Mail className="h-3 w-3 text-blue-500 shrink-0" />
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 hover:text-brand hover:underline truncate max-w-[170px]"
                title={`Send Email to ${lead.email}`}
              >
                {lead.email}
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {lead.email_type === 'decision_maker' ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" /> Owner Found
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Generic Inbox</span>
              )}
              {lead.is_mx_valid === 1 && (
                <span className="text-blue-600 dark:text-blue-400 font-mono text-[9px] bg-blue-500/10 px-1 rounded font-semibold">
                  MX ✓
                </span>
              )}
            </div>
          </div>
        )}

        {/* 2. Direct Phone & Line Info (if discovered) */}
        {hasPhone && (
          <div className="space-y-0.5">
            <a
              href={`tel:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-gray-800 dark:text-gray-200 hover:text-brand font-mono text-[11px] font-medium transition-colors"
              title={`Call ${lead.phone}`}
            >
              <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>{lead.phone}</span>
            </a>
            {lead.phone_type && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[150px]">
                {lead.phone_type} {lead.carrier ? `• ${lead.carrier}` : ''}
              </div>
            )}
          </div>
        )}

        {/* 3. Social Media & Direct Messaging Badges (All Discovered Platforms) */}
        {(hasWa || hasSocials) && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {/* WhatsApp */}
            {hasWa && (() => {
              const digits = (lead.whatsapp.match(/\d+/) ? lead.whatsapp.replace(/[^\d]/g, '') : (lead.phone ? lead.phone.replace(/[^\d]/g, '') : ''));
              const waUrl = lead.whatsapp.startsWith('http') ? lead.whatsapp : `https://wa.me/${digits}`;
              return (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-[10px] transition-all cursor-pointer"
                  title="WhatsApp Chat"
                >
                  <MessageCircle className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              );
            })()}

            {/* Facebook */}
            {socials?.facebook && (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/15 hover:bg-blue-600/25 text-blue-700 dark:text-blue-300 border border-blue-600/30 text-[10px] font-semibold transition-all cursor-pointer"
                title="Facebook Page / Messenger"
              >
                <Facebook className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                <span>Facebook</span>
                <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
              </a>
            )}

            {/* Instagram */}
            {socials?.instagram && (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/15 hover:bg-pink-500/25 text-pink-700 dark:text-pink-300 border border-pink-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                title="Instagram Profile / DM"
              >
                <Instagram className="h-2.5 w-2.5 text-pink-500 shrink-0" />
                <span>Instagram</span>
                <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
              </a>
            )}

            {/* LinkedIn */}
            {socials?.linkedin && (
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-600/15 hover:bg-sky-600/25 text-sky-700 dark:text-sky-300 border border-sky-600/30 text-[10px] font-semibold transition-all cursor-pointer"
                title="LinkedIn Profile"
              >
                <Linkedin className="h-2.5 w-2.5 text-sky-500 shrink-0" />
                <span>LinkedIn</span>
                <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
              </a>
            )}

            {/* Twitter / X */}
            {socials?.twitter && (
              <a
                href={socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-600/15 hover:bg-gray-600/25 text-gray-700 dark:text-gray-300 border border-gray-600/30 text-[10px] font-semibold transition-all cursor-pointer"
                title="X / Twitter"
              >
                <Twitter className="h-2.5 w-2.5 text-gray-700 dark:text-gray-300 shrink-0" />
                <span>X</span>
                <ExternalLink className="h-2 w-2 opacity-60 shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'table') {
    const kpiStats = [
      {
        icon: RiCoinsFill,
        label: "Pipeline Value",
        value: `$${(((stats?.totalLeads || totalCount || leads.length) * 2250) || 2691000).toLocaleString()}`,
        delta: "+18.4%",
        deltaColor: "lime",
      },
      {
        icon: RiGlobalLine,
        label: "No-Website Targets",
        value: (stats?.noWebsite ?? 342).toLocaleString(),
        delta: "+24%",
        deltaColor: "lime",
      },
      {
        icon: RiShieldCheckLine,
        label: "Decision Makers Found",
        value: (stats?.hasOwner ?? 580).toLocaleString(),
        delta: "+12.8%",
        deltaColor: "lime",
      },
      {
        icon: RiGroupFill,
        label: "Total Prospect Vault",
        value: (totalCount || stats?.totalLeads || leads.length).toLocaleString(),
        delta: `${leads.length} in view`,
        deltaColor: "neutral",
      },
    ];

    return (
      <div className="flex w-full flex-col gap-6">
        <StatCards stats={kpiStats} />
        <BoardLeadTable
          leads={leads}
          totalCount={totalCount}
          stats={stats}
          selectedLead={selectedLead}
          onSelectLead={onSelectLead}
          onOpenLeadDrawer={onOpenLeadDrawer}
          onRunOsint={onRunOsint}
          onOpenOsintRun={onOpenOsintRun}
          onDeleteLead={onDeleteLead}
          onOpenAutoPilot={onOpenAutoPilot}
          onOpenSearch={onOpenSearch}
          onExportExcel={onExportExcel}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          activeNiche={activeNiche}
          onNicheChange={onNicheChange}
          contactChannel={contactChannel}
          onContactChannelChange={onContactChannelChange}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          currentPage={currentPage}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* BoardUI Top Stat Cards */}
      <BoardStatCards stats={stats} />

      {/* Single Unified Toolbar: Minimalist, Fast, Zero Horizontal Scrollbars */}
      <div className="bg-surface-1 p-2.5 sm:p-3 rounded-xl border border-border-subtle shadow-xs space-y-2.5">
        {/* Row 1: Segment Pills, Niche & Channel Selectors */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Left: Quick Priority Segments */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                if (onNicheChange) onNicheChange('all');
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onFilterChange) onFilterChange(activeFilter === 'no_website' ? 'all' : 'no_website');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'no_website'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
              }`}
              title="Filter prospects verified with zero website"
            >
              <span>🔥 No Website</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeFilter === 'no_website' ? 'bg-white/20 text-white' : 'bg-rose-500/20'
              }`}>
                {stats?.noWebsite || 0}
              </span>
            </button>

            <button
              onClick={() => {
                if (onNicheChange) onNicheChange('all');
                if (onFocusTierChange) onFocusTierChange(focusTier === 'gold' ? 'vault' : 'gold');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                focusTier === 'gold'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
              title="High-revenue prospects: 4.5★+ rating, 10+ reviews, phone verified"
            >
              <span>⭐ Gold</span>
              {stats && stats.goldLeads > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  focusTier === 'gold' ? 'bg-white/20 text-white' : 'bg-amber-500/20'
                }`}>
                  {stats.goldLeads}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (onNicheChange) onNicheChange('all');
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onFilterChange && activeFilter === 'no_website') onFilterChange('all');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeNiche === 'all' && focusTier === 'vault' && activeFilter !== 'no_website'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-2 text-gray-700 dark:text-gray-300 hover:bg-surface-3 border border-border-subtle'
              }`}
            >
              <span>All ({stats?.totalLeads || totalCount || leads.length})</span>
            </button>

            <div className="h-4 w-px bg-border-subtle mx-0.5" />

            {/* Niche Dropdown */}
            <select
              value={activeNiche}
              onChange={(e) => {
                if (onNicheChange) onNicheChange(e.target.value);
                if (onFocusTierChange) onFocusTierChange('vault');
              }}
              className="bg-surface-2 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-2 py-1 border border-border-subtle focus:outline-hidden focus:ring-1 focus:ring-brand cursor-pointer font-medium"
            >
              <option value="all">🏷️ All Niches</option>
              {(stats?.collections || []).map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.count})
                </option>
              ))}
            </select>

            {/* Channels Dropdown */}
            <select
              value={contactChannel}
              onChange={(e) => onContactChannelChange && onContactChannelChange(e.target.value)}
              className="bg-surface-2 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-2 py-1 border border-border-subtle focus:outline-hidden focus:ring-1 focus:ring-brand cursor-pointer font-medium"
            >
              <option value="all">⚡ All Channels</option>
              <option value="has_whatsapp">💬 WhatsApp ({stats?.withWhatsApp || 0})</option>
              <option value="has_email">✉️ Email ({stats?.withEmail || 0})</option>
              <option value="has_social">📸 Social DM ({stats?.withSocial || 0})</option>
              <option value="phone_only">📞 Phone ({stats?.withPhoneOnly || 0})</option>
            </select>
          </div>

          {/* Right: Actions (Clean Data, Reset OSINT) */}
          <div className="flex items-center gap-2">
            {onCleanWebsites && stats && stats.withWebsites > 0 && (
              <button
                onClick={onCleanWebsites}
                className="px-2 py-1 text-[11px] font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer whitespace-nowrap"
                title="Purge leads that already have websites"
              >
                Purge {stats.withWebsites} with Sites
              </button>
            )}

            <button
              onClick={() => onResetOsint && onResetOsint(activeNiche)}
              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-600 dark:text-gray-400 border border-border-subtle cursor-pointer transition-all shrink-0"
              title="Reset OSINT data"
            >
              Reset OSINT
            </button>
          </div>
        </div>

        {/* Row 2: Search, Run OSINT & View Switcher */}
        <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-border-subtle/50 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search business, city, phone..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Action: Run OSINT */}
            <button
              onClick={() => onOpenOsintRun && onOpenOsintRun({
                leadIds: selectedLeadIds.size > 0 ? Array.from(selectedLeadIds) : null,
                category: activeNiche,
                filter: activeFilter,
                focusTier,
                contactChannel,
                searchTerm
              })}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-all"
              title="Launch targeted OSINT probe on current dataset"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {selectedLeadIds.size > 0
                  ? `Run OSINT (${selectedLeadIds.size})`
                  : activeFilter === 'no_website'
                    ? (activeNiche && activeNiche !== 'all'
                        ? `Run OSINT: No-Website in ${activeNiche} (${totalCount !== undefined ? totalCount : leads.length})`
                        : `Run OSINT: No-Website (${totalCount !== undefined ? totalCount : (stats?.noWebsite || leads.length)})`)
                    : focusTier === 'gold'
                      ? (activeNiche && activeNiche !== 'all'
                          ? `Run OSINT: Gold in ${activeNiche} (${totalCount !== undefined ? totalCount : leads.length})`
                          : `Run OSINT: Gold (${totalCount !== undefined ? totalCount : (stats?.goldLeads || leads.length)})`)
                      : activeNiche && activeNiche !== 'all'
                        ? `Run OSINT: ${activeNiche} (${totalCount !== undefined ? totalCount : leads.length})`
                        : `Run OSINT (${totalCount !== undefined ? totalCount : leads.length})`}
              </span>
            </button>

            {/* BoardUI Segmented Control: Split / Table / Kanban */}
            <div className="flex items-center bg-surface-2 dark:bg-surface-3 p-1 rounded-xl border border-border-subtle shadow-xs">
              <button
                onClick={() => onViewModeChange && onViewModeChange('split')}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-brand text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Split Fast Triage View"
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span>Split</span>
              </button>
              <button
                onClick={() => onViewModeChange && onViewModeChange('table')}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-brand text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="BoardUI Data Table"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => onViewModeChange && onViewModeChange('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-brand text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="BoardUI Kanban Board"
              >
                <Layout className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Batch Selection Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-linear-to-r from-brand/10 via-amber-500/10 to-brand/10 border border-brand/30 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-brand text-white">
              {selectedLeadIds.size}
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {selectedLeadIds.size === 1 ? 'prospect selected' : 'prospects selected'}
            </span>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline ml-2 cursor-pointer"
            >
              Deselect all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenOsintRun && onOpenOsintRun(Array.from(selectedLeadIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Run OSINT ({selectedLeadIds.size})</span>
            </button>
            <button
              onClick={() => onOpenAutoPilot && onOpenAutoPilot(Array.from(selectedLeadIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white shadow-xs cursor-pointer transition-all"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>⚡ Launch Auto-Pilot ({selectedLeadIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <KanbanBoard
          leads={leads}
          stats={stats}
          onSelectLead={onSelectLead}
          onRefresh={onRefresh}
        />
      ) : viewMode === 'split' ? (
        <SplitView
          leads={leads}
          selectedLead={selectedLead}
          onSelectLead={onSelectLead}
          onRefreshLead={onRefresh}
          onOpenOsintRun={onOpenOsintRun}
          onDeleteLead={onDeleteLead}
          onOpenAutoPilot={onOpenAutoPilot}
          onOpenLeadDrawer={onOpenLeadDrawer || onSelectLead}
          activeFilter={activeFilter}
          stats={stats}
        />
      ) : (
      <>
      {/* Desktop Main Table (Tablet & Desktop) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 dark:bg-surface-1/90 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-border-subtle bg-surface-2/70 dark:bg-surface-2/40 text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="w-10 px-2 py-3 text-center font-mono text-gray-400">#</th>
                <th className="w-8 px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border-subtle bg-surface-2 text-brand focus:ring-brand h-3.5 w-3.5 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Company / Niche</th>
                <th className="px-3 py-3 font-semibold">Website / Digital</th>
                <th className="px-2.5 py-3 font-semibold">Reviews</th>
                <th className="px-2.5 py-3 font-semibold">Verification</th>
                <th className="px-3 py-3 font-semibold">Decision Maker & Contact</th>
                <th className="px-2.5 py-3 font-semibold">Pipeline Stage</th>
                <th className="px-3 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-gray-700 dark:text-gray-300">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-10 w-10 mx-auto rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-gray-400">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">No prospects found in this view</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Run the search crawler or upload a CSV list to automatically populate the pipeline.
                      </p>
                      <button
                        onClick={() => onOpenSearch('search')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span>Discover Prospects Now</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  let parsedStack = [];
                  if (lead.tech_stack) {
                    try {
                      parsedStack = typeof lead.tech_stack === 'string' ? JSON.parse(lead.tech_stack) : lead.tech_stack;
                    } catch {}
                  }

                  let cleanDomain = lead.website ? lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={`hover:bg-surface-2/70 transition-colors cursor-pointer group ${
                        selectedLeadIds.has(lead.id) ? 'bg-brand/5 dark:bg-brand/10' : ''
                      }`}
                    >
                      {/* Number Index */}
                      <td className="w-10 px-2 py-3.5 text-center font-mono text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {index + 1}
                      </td>

                      {/* Checkbox */}
                      <td className="w-10 px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={(e) => handleToggleLead(e, lead.id)}
                          className="rounded border-border-subtle bg-surface-2 text-brand focus:ring-brand h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Business Name, Phone & Category */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-surface-2 dark:bg-surface-3 border border-border-subtle flex items-center justify-center font-bold text-xs text-brand shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {lead.business_name ? lead.business_name.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors text-xs truncate max-w-[200px]">
                              {lead.business_name}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="font-medium text-gray-600 dark:text-gray-300">{lead.category || 'General'}</span>
                              {lead.phone && (
                                <span className="font-mono text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                  • <Phone className="h-2.5 w-2.5 inline" /> {lead.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Website or Google Maps link */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {lead.website && !isSocialOrAggregator(lead.website) ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-brand transition-colors font-mono text-[11px]"
                            >
                              <span>{cleanDomain.length > 20 ? cleanDomain.slice(0, 18) + '...' : cleanDomain}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          ) : lead.has_no_website === 1 || lead.no_website_verified === 1 || !lead.website || isSocialOrAggregator(lead.website) ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  🌐❌ No Website
                                </span>
                                {lead.website && isSocialOrAggregator(lead.website) && (
                                  <a
                                    href={lead.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-2 text-gray-600 dark:text-gray-300 hover:text-brand border border-border-subtle"
                                    title={`Social page: ${lead.website}`}
                                  >
                                    <span>{lead.website.toLowerCase().includes('facebook') ? 'Facebook' : lead.website.toLowerCase().includes('instagram') ? 'Instagram' : 'Social'}</span>
                                    <ExternalLink className="h-2 w-2 opacity-60" />
                                  </a>
                                )}
                              </div>
                              {lead.showcase_niche && (
                                <div>
                                  <a
                                    href={`/showcase/${lead.showcase_niche}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                    title="Open matched pre-built laptop prototype"
                                  >
                                    <span>Showcase: {lead.showcase_niche}</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleResolveClick(e, lead)}
                                disabled={processingId === `resolve-${lead.id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 transition-colors"
                                title="Automatically find official business website"
                              >
                                {processingId === `resolve-${lead.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Globe2 className="h-3 w-3" />
                                )}
                                <span>Find Website</span>
                              </button>
                            </div>
                          )}

                          {lead.maps_link && (
                            <div>
                              <a
                                href={lead.maps_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-400 transition-colors"
                              >
                                <MapPin className="h-2.5 w-2.5 text-rose-500" />
                                <span>Google Maps View</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reviews & Rating */}
                      <td className="px-4 py-3.5">
                        {lead.reviews_count > 0 || lead.rating > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-amber-500 font-semibold font-mono text-xs">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{lead.rating ? lead.rating.toFixed(1) : '5.0'}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              {lead.reviews_count.toLocaleString()} reviews
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="px-4 py-3.5">
                        {getVerificationBadge(lead)}
                      </td>

                      {/* Primary Contact / Outreach */}
                      <td className="px-4 py-3.5">
                        {renderContactCell(lead)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {getStatusBadge(lead.status)}
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Quick OSINT Button */}
                          <button
                            onClick={(e) => handleOsintClick(e, lead)}
                            disabled={processingId === `osint-${lead.id}`}
                            className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-500 hover:text-brand transition-colors shadow-2xs cursor-pointer"
                            title="Run OSINT Verification & Contacts"
                          >
                            <ShieldCheck className={`h-3.5 w-3.5 ${processingId === `osint-${lead.id}` ? 'animate-spin text-brand' : ''}`} />
                          </button>

                          {/* Quick Mockup Prototype Button */}
                          <button
                            onClick={() => onSelectLead({ ...lead, initialTab: 'mockup' })}
                            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-600 dark:text-purple-400 transition-colors shadow-2xs cursor-pointer"
                            title={lead.has_no_website === 1 ? `Preview Laptop ${lead.showcase_niche || 'Niche'} Prototype` : "Open Instant Website Mockup"}
                          >
                            <Layout className="h-3.5 w-3.5" />
                          </button>

                          {/* Pitch Drawer Button */}
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="p-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand transition-colors shadow-2xs cursor-pointer"
                            title="Synthesize Pitch & Review"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Lead */}
                          <button
                            onClick={(e) => handleDeleteClick(e, lead.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Stream (Phones & Small Devices) */}
      <div className="block md:hidden space-y-3">
        {leads.length === 0 ? (
          <div className="p-8 text-center bg-surface-1 rounded-xl border border-border-subtle space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-gray-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">No prospects found in this view</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Run the search crawler or upload a CSV list to automatically populate the pipeline.
            </p>
            <button
              onClick={() => onOpenSearch('search')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Discover Prospects Now</span>
            </button>
          </div>
        ) : (
          leads.map((lead, index) => {
            let cleanDomain = lead.website ? lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
            const phoneDigits = lead.phone ? lead.phone.replace(/[^\d]/g, '') : '';
            const waText = encodeURIComponent(
              lead.has_no_website === 1
                ? `Hi ${lead.business_name}, I saw your great reviews on Google Maps and noticed you don't have a website yet. I prepared a live preview reference with an instant quote calculator: ${window.location.origin}/showcase/${lead.showcase_niche || 'roofing'}`
                : `Hi ${lead.business_name}, I saw your business on Google Maps and built a fast mobile preview website: ${window.location.origin}/mockup/${lead.id}`
            );

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  selectedLeadIds.has(lead.id)
                    ? 'bg-brand/5 border-brand/40 shadow-sm'
                    : 'bg-surface-1 border-border-subtle hover:border-border-hover'
                }`}
              >
                {/* Header: Number + Checkbox + Business Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5 font-mono text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle shrink-0">
                      #{index + 1}
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.has(lead.id)}
                      onChange={(e) => handleToggleLead(e, lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded border-border-subtle bg-surface-2 text-brand focus:ring-brand h-4 w-4 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {lead.business_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{lead.category || 'General'}</span>
                        {lead.city && <span>• {lead.city}</span>}
                        {lead.reviews_count > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-mono font-medium">
                            • <Star className="h-2.5 w-2.5 fill-current" />
                            {lead.rating ? lead.rating.toFixed(1) : '5.0'} ({lead.reviews_count})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {getStatusBadge(lead.status)}
                    <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      ${(lead.deal_value || 1000).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Web & Showcase Presence */}
                <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                  {lead.website && !isSocialOrAggregator(lead.website) ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      <span>{cleanDomain.length > 24 ? cleanDomain.slice(0, 22) + '...' : cleanDomain}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : lead.has_no_website === 1 || lead.no_website_verified === 1 || !lead.website ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        🌐❌ No Website
                      </span>
                      {lead.showcase_niche && (
                        <a
                          href={`/showcase/${lead.showcase_niche}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                          title="Open matched pre-built prototype"
                        >
                          <span>Showcase: {lead.showcase_niche}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleResolveClick(e, lead)}
                      disabled={processingId === `resolve-${lead.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-brand/10 text-brand border border-brand/20"
                    >
                      {processingId === `resolve-${lead.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe2 className="h-3 w-3" />}
                      <span>Find Website</span>
                    </button>
                  )}

                  {lead.maps_link && (
                    <a
                      href={lead.maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-400"
                    >
                      <MapPin className="h-2.5 w-2.5 text-rose-500" />
                      <span>Maps</span>
                    </a>
                  )}

                  {lead.website_status ? (
                    <div className="ml-auto">
                      {getVerificationBadge(lead)}
                    </div>
                  ) : null}
                </div>

                {/* Direct Phone / WhatsApp / OSINT Row */}
                <div className="p-2 rounded-lg bg-surface-2/60 border border-border-subtle/50 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    {lead.phone ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-semibold text-gray-900 dark:text-white hover:text-brand flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3 text-brand" />
                          <span>{lead.phone}</span>
                        </a>
                        {phoneDigits && (
                          <a
                            href={`https://wa.me/${phoneDigits}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                            title="Direct 1-Click WhatsApp pitch"
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">No phone found</span>
                    )}

                    {lead.email ? (
                      <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate max-w-[200px] mt-0.5">
                        {lead.email} {lead.email_type === 'decision_maker' && '👑'}
                      </div>
                    ) : null}

                    {/* Mobile Card Discovered Social Badges */}
                    {(() => {
                      let mSocials = null;
                      if (lead.social_profiles) {
                        try { mSocials = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles; } catch {}
                      }
                      if (!mSocials && lead.website) {
                        const w = lead.website.toLowerCase();
                        if (w.includes('instagram.com/')) mSocials = { instagram: lead.website };
                        else if (w.includes('facebook.com/')) mSocials = { facebook: lead.website };
                        else if (w.includes('linkedin.com/')) mSocials = { linkedin: lead.website };
                        else if (w.includes('twitter.com/') || w.includes('x.com/')) mSocials = { twitter: lead.website };
                      }
                      if (!mSocials) return null;
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {mSocials.facebook && (
                            <a
                              href={mSocials.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-600/20 text-[9px] font-semibold flex items-center gap-1"
                              title="Facebook Page"
                            >
                              <Facebook className="h-2 w-2" />
                              <span>FB</span>
                            </a>
                          )}
                          {mSocials.instagram && (
                            <a
                              href={mSocials.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-[9px] font-semibold flex items-center gap-1"
                              title="Instagram"
                            >
                              <Instagram className="h-2 w-2" />
                              <span>IG</span>
                            </a>
                          )}
                          {mSocials.linkedin && (
                            <a
                              href={mSocials.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded bg-sky-600/15 text-sky-600 dark:text-sky-400 border border-sky-600/20 text-[9px] font-semibold flex items-center gap-1"
                              title="LinkedIn"
                            >
                              <Linkedin className="h-2 w-2" />
                              <span>LI</span>
                            </a>
                          )}
                          {mSocials.twitter && (
                            <a
                              href={mSocials.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded bg-gray-600/15 text-gray-700 dark:text-gray-300 border border-gray-600/20 text-[9px] font-semibold flex items-center gap-1"
                              title="X / Twitter"
                            >
                              <Twitter className="h-2 w-2" />
                              <span>X</span>
                            </a>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Pitch Button */}
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white flex items-center gap-1 shadow-xs touch-manipulation cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Pitch</span>
                  </button>
                </div>

                {/* Quick Action Icon Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle/40 text-xs">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOsintClick(e, lead)}
                      disabled={processingId === `osint-${lead.id}`}
                      className="px-2 py-1 rounded-md bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-600 dark:text-gray-300 hover:text-brand text-[10px] font-medium flex items-center gap-1 touch-manipulation cursor-pointer"
                      title="Run OSINT Verification & Contacts"
                    >
                      <ShieldCheck className={`h-3 w-3 ${processingId === `osint-${lead.id}` ? 'animate-spin text-brand' : 'text-brand'}`} />
                      <span>OSINT</span>
                    </button>

                    <button
                      onClick={() => onSelectLead({ ...lead, initialTab: 'mockup' })}
                      className="px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] font-medium flex items-center gap-1 touch-manipulation cursor-pointer"
                    >
                      <Layout className="h-3 w-3" />
                      <span>Prototype</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleDeleteClick(e, lead.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 touch-manipulation cursor-pointer"
                    title="Delete lead"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Table Bottom Footer: Record count & Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface-1 rounded-xl border border-border-subtle shadow-xs text-xs mt-3">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 flex-wrap">
          <span>
            Showing <strong className="text-gray-900 dark:text-white font-mono">{leads.length}</strong> of{' '}
            <strong className="text-gray-900 dark:text-white font-mono">{totalCount !== undefined ? totalCount : leads.length}</strong> prospects
          </span>
          {activeFilter !== 'all' && (
            <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-medium font-mono">
              Filter: {activeFilter}
            </span>
          )}
          {activeNiche !== 'all' && (
            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-gray-700 dark:text-gray-300 text-[10px] font-medium font-mono">
              Niche: {activeNiche}
            </span>
          )}
          {focusTier === 'gold' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium font-mono">
              ⭐ Gold Tier
            </span>
          )}
          {focusTier === 'today' && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium font-mono">
              🎯 Daily 143
            </span>
          )}
        </div>

        {/* Pagination Controls when not in 'all' view */}
        {pageSize !== 'all' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 py-1 text-xs font-mono text-gray-600 dark:text-gray-400">
              Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of{' '}
              <strong className="text-gray-900 dark:text-white">
                {Math.max(1, Math.ceil((totalCount || leads.length) / (parseInt(pageSize, 10) || 50)))}
              </strong>
            </span>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil((totalCount || leads.length) / (parseInt(pageSize, 10) || 50))}
              className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
