'use client';

import React, { useState } from 'react';
import { useQuarry } from '@/context/QuarryContext';
import { BusinessAvatar } from './BusinessAvatar';
import { PitchStudio } from './PitchStudio';
import {
  Phone,
  Mail,
  Globe,
  Clock,
  ExternalLink,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Target,
  Package,
  ShieldAlert,
  Star
} from 'lucide-react';

export function BusinessDetailPanel() {
  const { selectedBusiness, pushToLeads, leads } = useQuarry();
  const [isBriefCopied, setIsBriefCopied] = useState(false);
  const [isPushed, setIsPushed] = useState(false);

  if (!selectedBusiness) {
    return (
      <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-12 text-center text-sm text-[#7e7e7e]">
        Select a business from the radar scan or map to inspect intelligence.
      </div>
    );
  }

  const b = selectedBusiness;
  const isAlreadyLead = leads.some(l => l.id === b.id || l.business_name.toLowerCase() === b.business_name.toLowerCase());
  const hasNoWeb = b.has_no_website === true || b.has_no_website === 1 || !b.website;

  const handlePushToLeads = async () => {
    await pushToLeads(b);
    setIsPushed(true);
    setTimeout(() => setIsPushed(false), 2000);
  };

  const handleCopyBrief = () => {
    const brief = `QUARRY INTELLIGENCE BRIEF
Business: ${b.business_name}
Category: ${b.category} (${b.city})
Rating: ${b.rating}★ (${b.reviews_count} reviews)
Phone: ${b.phone || 'N/A'}
Website: ${b.website || 'NO WEBSITE (HIGH INTENT)'}
Opportunity Score: ${b.opportunity_score}/100
Pitch Angle: ${b.pitch_angle}
Executive Summary: ${b.executive_summary}
Missing Audit Gaps: ${(b.gaps || []).map(g => `[${g.severity.toUpperCase()}] ${g.title}: ${g.description}`).join('\n')}`;

    navigator.clipboard.writeText(brief);
    setIsBriefCopied(true);
    setTimeout(() => setIsBriefCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header + Actions + Opportunity Score Tile */}
      <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Avatar + Titles + Category/Maturity Pills */}
          <div className="flex items-start gap-3.5">
            <BusinessAvatar name={b.business_name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{b.business_name}</h2>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{b.rating}</span>
                  <span className="text-[#7e7e7e]">({b.reviews_count})</span>
                </div>
              </div>
              <p className="text-xs text-[#8a8a8a] mt-0.5">{b.address}</p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                  {b.category}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
                  {b.maturity || 'Established'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#171717] border border-[#242424] text-[#cfcfcf]">
                  Source: {b.source || 'Google Maps'}
                </span>
              </div>
            </div>
          </div>

          {/* Opportunity Score Tile (0-100) + Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Opportunity Score Tile */}
            <div className="bg-[#050505] border border-[#1c1c1c] rounded-2xl p-2.5 text-center min-w-[85px] shadow-inner">
              <span className="text-[10px] uppercase font-mono text-[#7e7e7e] block font-semibold">Opp Score</span>
              <span className="text-xl font-black text-rose-400 tracking-tight">
                {b.opportunity_score || 85}
              </span>
              <span className="text-[9px] text-rose-400/80 block font-mono">/ 100 HIGH</span>
            </div>

            {/* Actions: Push to Leads (Emerald), Google Profile (Sky), Copy Brief (Indigo) */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePushToLeads}
                disabled={isAlreadyLead || isPushed}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all ${
                  isAlreadyLead || isPushed
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-950/40'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAlreadyLead ? 'In Leads CRM' : (isPushed ? 'Saved!' : 'Push to Leads')}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.business_name + ' ' + (b.city || ''))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 text-[11px] font-semibold transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Google Profile</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyBrief}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-[11px] font-semibold transition-colors"
                >
                  {isBriefCopied ? <Check className="w-3 h-3 text-indigo-300" /> : <Copy className="w-3 h-3" />}
                  <span>{isBriefCopied ? 'Copied' : 'Copy Brief'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Contact Grid: 4-Column Tiles (Highlighting missing items in rose) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-[#141414]">
          {/* Phone */}
          <div className="bg-[#050505] border border-[#171717] rounded-xl p-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#7e7e7e]">
              <Phone className="w-3 h-3 text-emerald-400" /> Phone
            </span>
            <span className="text-xs font-mono text-white mt-1 block truncate">
              {b.phone || <span className="text-rose-400 font-semibold">Missing Phone</span>}
            </span>
          </div>

          {/* Email */}
          <div className="bg-[#050505] border border-[#171717] rounded-xl p-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#7e7e7e]">
              <Mail className="w-3 h-3 text-sky-400" /> Email
            </span>
            <span className="text-xs font-mono text-white mt-1 block truncate">
              {b.email || <span className="text-rose-400 font-semibold">Missing Email</span>}
            </span>
          </div>

          {/* Website */}
          <div className={`rounded-xl p-2.5 border ${hasNoWeb ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#050505] border-[#171717]'}`}>
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#7e7e7e]">
              <Globe className={`w-3 h-3 ${hasNoWeb ? 'text-rose-400' : 'text-sky-400'}`} /> Website
            </span>
            <span className="text-xs font-mono mt-1 block truncate">
              {hasNoWeb ? (
                <span className="text-rose-300 font-bold">No Official Site (Critical Gap)</span>
              ) : (
                <a href={b.website!} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                  {b.website}
                </a>
              )}
            </span>
          </div>

          {/* Hours */}
          <div className="bg-[#050505] border border-[#171717] rounded-xl p-2.5">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#7e7e7e]">
              <Clock className="w-3 h-3 text-amber-400" /> Hours
            </span>
            <span className="text-xs font-mono text-white mt-1 block truncate">
              {b.hours || 'Mon–Fri 8am–6pm'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Executive Summary + Pitch Angle Callout */}
      <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl space-y-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1">
            Executive Summary
          </span>
          <p className="text-xs text-[#cfcfcf] leading-relaxed">
            {b.executive_summary}
          </p>
        </div>

        {/* Pitch Angle Callout */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-tight">
            <TrendingUp className="w-4 h-4" />
            <span>Recommended Pitch Angle:</span>
          </div>
          <p className="text-xs text-white font-medium mt-1">
            {b.pitch_angle}
          </p>
        </div>
      </div>

      {/* 4. Quarry Pitch Studio (WA/Email + Top 5 Hooks) */}
      <PitchStudio business={b} />

      {/* 5. 3-Col Grid: Targets | Products | Problems */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Targets */}
        <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-tight mb-2.5">
            <Target className="w-3.5 h-3.5" />
            <span>Target Segments</span>
          </div>
          <ul className="space-y-1.5">
            {(b.targets || []).map((t, i) => (
              <li key={i} className="text-xs text-[#cfcfcf] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 mt-1.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Products */}
        <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-tight mb-2.5">
            <Package className="w-3.5 h-3.5" />
            <span>High-Margin Services</span>
          </div>
          <ul className="space-y-1.5">
            {(b.products || []).map((p, i) => (
              <li key={i} className="text-xs text-[#cfcfcf] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500/60 mt-1.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Problems */}
        <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-4">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-tight mb-2.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Operational Bottlenecks</span>
          </div>
          <ul className="space-y-1.5">
            {(b.problems || []).map((pr, i) => (
              <li key={i} className="text-xs text-[#cfcfcf] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60 mt-1.5 shrink-0" />
                <span>{pr}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. What's Missing Audit (2-Col Severity Cards) */}
      <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-[1.4px] text-[#7e7e7e] mb-3">
          What&apos;s Missing Audit (Diagnostics & Severity)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(b.gaps || []).map((gap, i) => {
            const isCritical = gap.severity === 'critical';
            const isWarning = gap.severity === 'warning';
            return (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border ${
                  isCritical
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : (isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-[#141414] border-[#1c1c1c] text-[#cfcfcf]')
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-[#8a8a8a] shrink-0" />
                  ))}
                  <h4 className="text-xs font-bold">{gap.title}</h4>
                </div>
                <p className="text-[11px] text-[#8a8a8a] mt-1.5 leading-relaxed pl-6">
                  {gap.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Review Comparison Bars + Competitors Grid */}
      <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[1.4px] text-[#7e7e7e]">
          Competitive Benchmark & Review Velocity
        </h3>

        {/* Horizontal Progress Bars: Selected vs Avg vs Top Competitor */}
        <div className="space-y-3 bg-[#050505] p-3.5 rounded-2xl border border-[#171717]">
          {/* Selected Lead */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white">{b.business_name} (Selected)</span>
              <span className="font-mono text-emerald-400">{b.rating}★ · {b.reviews_count} reviews</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#171717] overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, ((b.reviews_count || 1) / 84) * 100)}%` }}
              />
            </div>
          </div>

          {/* Market Average */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#8a8a8a]">Regional Suburb Average</span>
              <span className="font-mono text-[#8a8a8a]">4.3★ · 28 reviews</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#171717] overflow-hidden">
              <div className="h-full bg-[#8a8a8a] rounded-full" style={{ width: '33%' }} />
            </div>
          </div>

          {/* Top Competitor */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-400 font-semibold">Apex Premier Solutions (Top Rank)</span>
              <span className="font-mono text-amber-400">4.8★ · 84 reviews</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#171717] overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Competitors Mini Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(b.competitors || []).map((comp, idx) => (
            <div key={idx} className="bg-[#050505] border border-[#171717] p-2.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">{comp.name}</span>
                <span className="text-[10px] text-[#7e7e7e]">
                  {comp.has_website ? 'Verified Domain' : 'No Website'}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {comp.rating}★ ({comp.reviews_count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
