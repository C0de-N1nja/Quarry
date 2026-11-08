import React, { useState, useEffect } from 'react';
import {
  RiArrowLeftLine,
  RiRefreshLine as RefreshCw,
  RiLoader4Line as Loader2,
  RiSpeedUpLine,
  RiShieldCheckLine,
  RiSearchEyeLine,
  RiLockLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiCheckLine,
  RiAlertLine,
  RiErrorWarningLine,
  RiSmartphoneLine,
  RiComputerLine,
  RiSparklingLine,
  RiTimeLine,
  RiFileTextLine,
  RiPrinterLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';

export default function AuditPage({ leadId, onBack, onOpenPitch }) {
  const [lead, setLead] = useState(null);
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'accessibility', 'seo', 'security'

  const fetchLeadAndAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Lead
      const leadRes = await fetch(`/api/leads/${leadId}`);
      const leadData = await leadRes.json();
      if (!leadData.success || !leadData.lead) {
        throw new Error('Lead not found');
      }
      setLead(leadData.lead);

      // 2. Fetch Existing Audit
      const auditRes = await fetch(`/api/leads/${leadId}/audit`);
      const auditData = await auditRes.json();
      if (auditData.success && auditData.audit) {
        setAudit(auditData.audit.audit_data || auditData.audit);
      } else if (leadData.lead.website) {
        // Auto-trigger audit if never run before
        await runAudit(leadData.lead.website);
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async (overrideUrl = null) => {
    setAuditing(true);
    setError(null);
    try {
      const targetUrl = overrideUrl || lead?.website;
      const res = await fetch(`/api/leads/${leadId}/audit-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setAudit(data.audit);
      if (data.lead) setLead(data.lead);
    } catch (err) {
      setError(err.message || 'Website audit execution failed');
    } finally {
      setAuditing(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchLeadAndAudit();
  }, [leadId]);

  const copyPitchToClipboard = () => {
    if (!audit?.pitch_draft?.body) return;
    const text = `Subject: ${audit.pitch_draft.subject}\n\n${audit.pitch_draft.body}`;
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    toast.success('Website audit pitch report copied to clipboard!', {
      description: 'Ready to send to the business owner via email or proposal'
    });
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary-default text-text-primary flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
        <div className="text-sm font-medium text-text-secondary">
          Initializing Website Health & Core Web Vitals Auditor...
        </div>
      </div>
    );
  }

  if (error && !audit) {
    return (
      <div className="min-h-screen bg-background-primary-default text-text-primary p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-background-secondary-default border border-rose-500/30 text-center space-y-4">
          <RiAlertLine className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold">Audit Unavailable</h2>
          <p className="text-xs text-text-secondary">{error}</p>
          <Button variant="secondary" onClick={onBack} className="w-full justify-center">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const perfScore = audit?.performance_score || 0;
  const a11yScore = audit?.accessibility_score || 0;
  const seoScore = audit?.seo_score || 0;
  const secScore = audit?.security_score || 0;
  const overallScore = audit?.overall_score || Math.round((perfScore + a11yScore + seoScore + secScore) / 4);

  const getScoreColor = (score) => {
    if (score >= 90) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Good' };
    if (score >= 50) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Needs Work' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Critical' };
  };

  const perfMeta = getScoreColor(perfScore);
  const a11yMeta = getScoreColor(a11yScore);
  const seoMeta = getScoreColor(seoScore);
  const secMeta = getScoreColor(secScore);

  return (
    <div className="min-h-screen bg-background-primary-default text-text-primary flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-background-primary-default/90 backdrop-blur-md border-b border-separator-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="small"
              onClick={onBack}
              leadingIcon={RiArrowLeftLine}
            >
              Back to Dashboard
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-text-primary">
                  {lead?.business_name || 'Client Website Audit'}
                </h1>
                <Chip variant="subtle" color="cyan" size="sm">
                  Full Website Audit
                </Chip>
                {audit?.audited_at && (
                  <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                    <RiTimeLine className="h-3 w-3" />
                    {new Date(audit.audited_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {audit?.url && (
                <a
                  href={audit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-accent-400 transition-colors pt-0.5"
                >
                  <span>{audit.url}</span>
                  <RiExternalLinkLine className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => runAudit()}
              disabled={auditing}
              leadingIcon={auditing ? Loader2 : RefreshCw}
            >
              {auditing ? 'Auditing...' : 'Re-Run Audit'}
            </Button>

            <Button
              variant="secondary"
              size="small"
              onClick={copyPitchToClipboard}
              leadingIcon={copiedPitch ? RiCheckLine : RiFileCopyLine}
              className={copiedPitch ? 'text-emerald-400 border-emerald-500/40' : ''}
            >
              {copiedPitch ? 'Pitch Copied!' : 'Copy Pitch Report'}
            </Button>

            <Button
              variant="secondary"
              size="small"
              onClick={() => window.print()}
              leadingIcon={RiPrinterLine}
              title="Print or export client audit report to PDF"
            >
              Print / PDF
            </Button>

            {onOpenPitch && (
              <Button
                variant="primary"
                size="small"
                onClick={() => onOpenPitch(lead)}
                leadingIcon={RiSparklingLine}
              >
                Open Pitch Builder
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1">
        {/* Top 4 Lighthouse Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Performance */}
          <div className={`p-5 rounded-2xl bg-background-secondary-default border ${perfMeta.border} shadow-sm space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <RiSpeedUpLine className="h-4 w-4 text-cyan-400" />
                Performance
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${perfMeta.bg} ${perfMeta.text}`}>
                {perfMeta.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${perfMeta.text}`}>
                {perfScore}
              </span>
              <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
            <div className="pt-2 border-t border-separator-border/60 text-[11px] text-text-secondary flex justify-between">
              <span>Mobile Load:</span>
              <span className="font-semibold text-text-primary">{audit?.load_time_sec || '0.0'}s</span>
            </div>
          </div>

          {/* 2. Accessibility & ADA Lawsuit Risk */}
          <div className={`p-5 rounded-2xl bg-background-secondary-default border ${a11yMeta.border} shadow-sm space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <RiShieldCheckLine className="h-4 w-4 text-purple-400" />
                ADA & WCAG
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${a11yMeta.bg} ${a11yMeta.text}`}>
                {audit?.error_count > 0 ? `${audit.error_count} Violations` : 'Compliant'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${a11yMeta.text}`}>
                {a11yScore}
              </span>
              <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
            <div className="pt-2 border-t border-separator-border/60 text-[11px] text-text-secondary flex justify-between">
              <span>Title III Risk:</span>
              <span className={`font-semibold ${audit?.error_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {audit?.error_count > 5 ? 'High Lawsuit Risk' : audit?.error_count > 0 ? 'Moderate Risk' : 'Low Risk'}
              </span>
            </div>
          </div>

          {/* 3. SEO Health */}
          <div className={`p-5 rounded-2xl bg-background-secondary-default border ${seoMeta.border} shadow-sm space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <RiSearchEyeLine className="h-4 w-4 text-emerald-400" />
                SEO Health
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${seoMeta.bg} ${seoMeta.text}`}>
                {seoMeta.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${seoMeta.text}`}>
                {seoScore}
              </span>
              <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
            <div className="pt-2 border-t border-separator-border/60 text-[11px] text-text-secondary flex justify-between">
              <span>Mobile Viewport:</span>
              <span className="font-semibold text-text-primary">
                {audit?.seo?.has_viewport ? 'Optimized' : 'Missing (Zoom Bug)'}
              </span>
            </div>
          </div>

          {/* 4. Security & Best Practices */}
          <div className={`p-5 rounded-2xl bg-background-secondary-default border ${secMeta.border} shadow-sm space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <RiLockLine className="h-4 w-4 text-amber-400" />
                Security
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${secMeta.bg} ${secMeta.text}`}>
                {audit?.security?.is_https ? 'HTTPS Valid' : 'Insecure'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${secMeta.text}`}>
                {secScore}
              </span>
              <span className="text-xs text-text-tertiary">/ 100</span>
            </div>
            <div className="pt-2 border-t border-separator-border/60 text-[11px] text-text-secondary flex justify-between">
              <span>HSTS Preload:</span>
              <span className="font-semibold text-text-primary">
                {audit?.security?.hsts ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-separator-border gap-2">
          {[
            { id: 'overview', label: 'Executive Summary & Pitch', icon: RiSparklingLine },
            { id: 'accessibility', label: `ADA Violations (${audit?.accessibility_issues?.length || 0})`, icon: RiShieldCheckLine },
            { id: 'seo', label: 'SEO & Technical Checklist', icon: RiSearchEyeLine },
            { id: 'security', label: 'Security & Headers', icon: RiLockLine }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-accent-500 text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-accent-400' : 'opacity-60'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Executive Summary & Outreach Pitch */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Diagnostic Flaws */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl bg-background-secondary-default border border-separator-border space-y-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <RiAlertLine className="h-4 w-4 text-amber-400" />
                  Key Conversion Leaks Discovered
                </h3>
                <div className="space-y-3">
                  {audit?.flaws_summary?.length > 0 ? (
                    audit.flaws_summary.map((flaw, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-background-primary-default border border-separator-border flex items-start gap-3"
                      >
                        <RiErrorWarningLine className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-text-primary">{flaw}</p>
                          <p className="text-[11px] text-text-tertiary pt-0.5">
                            Critical factor in mobile lead drop-off and search engine ranking penalties.
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-400">
                      No severe architectural flaws detected on the target homepage.
                    </p>
                  )}
                </div>
              </div>

              {/* Speed Diagnostic Details */}
              <div className="p-6 rounded-2xl bg-background-secondary-default border border-separator-border space-y-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <RiSpeedUpLine className="h-4 w-4 text-cyan-400" />
                  Core Web Vitals & Loading Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border">
                    <span className="text-[10px] text-text-tertiary block">Mobile Load</span>
                    <span className="text-base font-bold text-text-primary">{audit?.load_time_sec}s</span>
                    <span className="text-[9px] text-text-tertiary block">Target &lt; 2.5s</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border">
                    <span className="text-[10px] text-text-tertiary block">TTFB</span>
                    <span className="text-base font-bold text-text-primary">{audit?.ttfb_ms}ms</span>
                    <span className="text-[9px] text-text-tertiary block">Server response</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border">
                    <span className="text-[10px] text-text-tertiary block">Payload Size</span>
                    <span className="text-base font-bold text-text-primary">{audit?.page_size_kb} KB</span>
                    <span className="text-[9px] text-text-tertiary block">HTML bundle</span>
                  </div>
                  <div className="p-3 rounded-xl bg-background-primary-default border border-separator-border">
                    <span className="text-[10px] text-text-tertiary block">Images Missing Alt</span>
                    <span className="text-base font-bold text-text-primary">{audit?.seo?.missing_alt_count || 0}</span>
                    <span className="text-[9px] text-text-tertiary block">of {audit?.seo?.total_images || 0} images</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Ready-to-Send Outreach Pitch Draft */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-background-secondary-default border border-separator-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <RiSparklingLine className="h-4 w-4 text-accent-400" />
                    Automated Outreach Pitch
                  </h3>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={copyPitchToClipboard}
                    leadingIcon={copiedPitch ? RiCheckLine : RiFileCopyLine}
                  >
                    {copiedPitch ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">
                      Subject Line:
                    </span>
                    <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border text-xs font-medium text-text-primary select-all">
                      {audit?.pitch_draft?.subject}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">
                      Body Copy:
                    </span>
                    <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed select-all max-h-[380px] overflow-y-auto">
                      {audit?.pitch_draft?.body}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ADA / WCAG Accessibility Issues */}
        {activeTab === 'accessibility' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Pa11y & axe-core Automated WCAG 2.1 AA Violations
                </h3>
                <p className="text-xs text-text-secondary pt-0.5">
                  Identified accessibility barriers that expose businesses to Americans with Disabilities Act (ADA) digital compliance claims:
                </p>
              </div>
              <Chip variant="subtle" color={audit?.error_count > 0 ? 'rose' : 'emerald'} size="md">
                {audit?.error_count || 0} Critical Violations
              </Chip>
            </div>

            <div className="space-y-3">
              {audit?.accessibility_issues?.length > 0 ? (
                audit.accessibility_issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${issue.type === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <code>{issue.code}</code>
                      </span>
                      <Chip variant="subtle" color={issue.type === 'error' ? 'rose' : 'amber'} size="sm">
                        {issue.type.toUpperCase()}
                      </Chip>
                    </div>
                    <p className="text-xs text-text-secondary">{issue.message}</p>
                    {issue.selector && (
                      <div className="text-[11px] text-text-tertiary font-mono bg-background-primary-default p-2 rounded border border-separator-border overflow-x-auto">
                        Selector: {issue.selector}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-text-tertiary bg-background-secondary-default rounded-xl border border-separator-border">
                  No automated WCAG 2.1 AA violations flagged on this page.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: SEO & Technical Checklist */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-background-secondary-default border border-separator-border space-y-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Google Search Appearance
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-separator-border/60">
                  <span className="text-text-secondary">Title Tag:</span>
                  <span className={`font-semibold ${audit?.seo?.title ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {audit?.seo?.title ? `${audit.seo.title_length} chars (Present)` : 'Missing'}
                  </span>
                </div>
                {audit?.seo?.title && (
                  <div className="p-2 rounded bg-background-primary-default text-text-secondary text-[11px] italic">
                    "{audit.seo.title}"
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 border-b border-separator-border/60">
                  <span className="text-text-secondary">Meta Description:</span>
                  <span className={`font-semibold ${audit?.seo?.has_meta_description ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {audit?.seo?.has_meta_description ? 'Present' : 'Missing'}
                  </span>
                </div>
                {audit?.seo?.meta_description && (
                  <div className="p-2 rounded bg-background-primary-default text-text-secondary text-[11px] italic">
                    "{audit.seo.meta_description}"
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-text-secondary">Mobile Viewport:</span>
                  <span className={`font-semibold ${audit?.seo?.has_viewport ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {audit?.seo?.has_viewport ? 'Configured' : 'Missing (Fails Mobile Friendly)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-background-secondary-default border border-separator-border space-y-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Headings & Structure
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-separator-border/60">
                  <span className="text-text-secondary">Primary &lt;h1&gt; Tag:</span>
                  <span className={`font-semibold ${audit?.seo?.h1_count === 1 ? 'text-emerald-400' : audit?.seo?.h1_count === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {audit?.seo?.h1_count === 1 ? 'Optimal (1 Tag)' : audit?.seo?.h1_count === 0 ? 'Missing (0 Tags)' : `${audit?.seo?.h1_count} Tags (Duplicate)`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-separator-border/60">
                  <span className="text-text-secondary">Image Alt Attributes:</span>
                  <span className={`font-semibold ${audit?.seo?.missing_alt_count === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {audit?.seo?.missing_alt_count === 0 ? 'All Images Tagged' : `${audit?.seo?.missing_alt_count} Missing Alt Tags`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-text-secondary">Canonical Tag:</span>
                  <span className={`font-semibold ${audit?.seo?.canonical ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                    {audit?.seo?.canonical ? 'Configured' : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Headers */}
        {activeTab === 'security' && (
          <div className="p-6 rounded-2xl bg-background-secondary-default border border-separator-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">
              Security Protocol & HTTP Response Headers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-background-primary-default border border-separator-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-primary block">HTTPS Transport</span>
                  <span className="text-[11px] text-text-tertiary">Encrypted connection in browser</span>
                </div>
                <Chip variant="subtle" color={audit?.security?.is_https ? 'emerald' : 'rose'} size="sm">
                  {audit?.security?.is_https ? 'Active' : 'Insecure'}
                </Chip>
              </div>

              <div className="p-3.5 rounded-xl bg-background-primary-default border border-separator-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-primary block">Strict-Transport-Security (HSTS)</span>
                  <span className="text-[11px] text-text-tertiary">Prevents downgrade attacks</span>
                </div>
                <Chip variant="subtle" color={audit?.security?.hsts ? 'emerald' : 'amber'} size="sm">
                  {audit?.security?.hsts ? 'Enabled' : 'Missing'}
                </Chip>
              </div>

              <div className="p-3.5 rounded-xl bg-background-primary-default border border-separator-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-primary block">X-Frame-Options</span>
                  <span className="text-[11px] text-text-tertiary">Clickjacking protection</span>
                </div>
                <Chip variant="subtle" color={audit?.security?.x_frame_options ? 'emerald' : 'amber'} size="sm">
                  {audit?.security?.x_frame_options ? 'Enabled' : 'Missing'}
                </Chip>
              </div>

              <div className="p-3.5 rounded-xl bg-background-primary-default border border-separator-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-text-primary block">Content-Security-Policy (CSP)</span>
                  <span className="text-[11px] text-text-tertiary">XSS injection mitigation</span>
                </div>
                <Chip variant="subtle" color={audit?.security?.csp ? 'emerald' : 'amber'} size="sm">
                  {audit?.security?.csp ? 'Enabled' : 'Missing'}
                </Chip>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
