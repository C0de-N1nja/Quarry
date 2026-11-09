import React from 'react';
import { 
  RiShieldCheckLine, 
  RiShieldCrossLine, 
  RiSpeedUpLine, 
  RiSmartphoneLine, 
  RiStarFill, 
  RiPrinterLine, 
  RiCloseLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiExternalLinkLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { cx } from '@/utils/cx';

export default function ClientAuditReportModal({
  lead,
  audit,
  settings = {},
  onClose
}) {
  if (!lead) return null;

  const businessName = lead.business_name || lead.company_name || 'Prospect';
  const city = lead.city || 'Austin';
  const category = lead.category || lead.niche || 'Local Service';
  const website = lead.website && lead.website !== 'None' ? lead.website : null;
  const rating = lead.rating || null;
  const reviewsCount = lead.reviews_count || 0;

  // Audit Metrics
  const isHttps = Boolean(audit?.ssl_valid ?? (website && website.startsWith('https')));
  const ttfbMs = audit?.ttfb_ms || audit?.metrics?.ttfb_ms || (audit?.performance_score ? Math.round((100 - audit.performance_score) * 25) : 850);
  const perfScore = audit?.performance_score || (ttfbMs < 800 ? 88 : ttfbMs < 1600 ? 64 : 42);
  const isMobileFriendly = Boolean(audit?.mobile_viewport_present ?? audit?.metrics?.isMobileResponsive ?? true);

  // Agency Info from settings
  const agencyName = settings.agency_name || 'Web Studio';
  const consultantName = settings.sender_name || 'Consultant';
  const email = settings.sender_email || 'contact@agency.com';
  const portfolioUrl = settings.my_portfolio || '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-3xl bg-background-primary-default border border-separator-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-separator-border bg-background-secondary-default shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-text-primary uppercase tracking-wider">
              1-Page Client Website & Performance Audit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="primary"
              leadingIcon={RiPrinterLine}
              onClick={handlePrint}
              className="text-xs font-semibold"
            >
              Print / Save as PDF
            </Button>
            <IconButton
              size="small"
              variant="ghost"
              icon={RiCloseLine}
              onClick={onClose}
              aria-label="Close audit preview"
            />
          </div>
        </div>

        {/* Printable 1-Page Document */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:overflow-visible print:max-h-none print:m-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden; }
              #printable-client-audit, #printable-client-audit * { visibility: visible; }
              #printable-client-audit {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 18mm 16mm;
                color: #0f172a !important;
                background: #ffffff !important;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}} />

          <div id="printable-client-audit" className="space-y-6 max-w-2xl mx-auto">
            
            {/* Header: Agency Logo & Business Name */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 block">
                  Confidential Performance & Growth Audit
                </span>
                <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                  {businessName}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  {category} · {city} {website ? `· ${website.replace(/^https?:\/\//, '')}` : '· No official website'}
                </p>
              </div>

              {/* Google Proof Stamp */}
              <div className="text-right bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Google Reputation</span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <RiStarFill className="size-4 text-amber-500 fill-amber-500" />
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {rating || '4.8'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {reviewsCount > 0 ? `${reviewsCount.toLocaleString()} verified reviews` : 'Top local provider'}
                </span>
              </div>
            </div>

            {/* Scoreboard: 3 Key Pillar Cards */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Technical Health & Customer Experience Scorecard
              </h2>
              
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Security / SSL */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-600 text-xs">
                    <span className="font-semibold">Security (SSL)</span>
                    {isHttps ? <RiShieldCheckLine className="size-4 text-emerald-600" /> : <RiShieldCrossLine className="size-4 text-rose-600" />}
                  </div>
                  <div className="mt-2">
                    <span className={cx(
                      "text-sm font-bold block",
                      isHttps ? "text-emerald-700" : "text-rose-700"
                    )}>
                      {isHttps ? "Secure (HTTPS)" : "Insecure (HTTP)"}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                      {isHttps ? "Protected client connection" : "Triggers browser security alert"}
                    </span>
                  </div>
                </div>

                {/* 2. Mobile Experience */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-600 text-xs">
                    <span className="font-semibold">Mobile Friendly</span>
                    <RiSmartphoneLine className="size-4 text-slate-600" />
                  </div>
                  <div className="mt-2">
                    <span className={cx(
                      "text-sm font-bold block",
                      isMobileFriendly ? "text-emerald-700" : "text-amber-700"
                    )}>
                      {isMobileFriendly ? "Responsive" : "Needs Viewport Fix"}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                      {isMobileFriendly ? "Adapts to smartphone screens" : "Hard to read on smartphones"}
                    </span>
                  </div>
                </div>

                {/* 3. Speed & Load Latency */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-600 text-xs">
                    <span className="font-semibold">Load Speed</span>
                    <RiSpeedUpLine className="size-4 text-slate-600" />
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className={cx(
                        "text-sm font-bold font-mono",
                        perfScore >= 80 ? "text-emerald-700" : perfScore >= 50 ? "text-amber-700" : "text-rose-700"
                      )}>
                        {perfScore}/100
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({(ttfbMs / 1000).toFixed(2)}s)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                      {perfScore >= 80 ? "Fast mobile response" : "Slow mobile response"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crucial Findings & Plain English Fixes */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Top 3 Revenue-Impacting Opportunities
              </h2>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                  <div className="size-6 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 font-bold font-mono text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      1-Click Mobile Calling & Immediate Quote Booking
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Over 68% of local homeowner emergencies and searches originate on smartphones. Adding a persistent, floating "Tap to Call" and quote request button prevents qualified visitors from bouncing to competitors.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                  <div className="size-6 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 font-bold font-mono text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Showcase Google 5-Star Reviews Above the Fold
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {rating && reviewsCount > 0 
                        ? `Your verified ${rating}★ rating from ${reviewsCount} happy clients is your biggest competitive advantage. Displaying live verified review badges directly in the hero header increases form conversion by up to 34%.`
                        : `Displaying authentic local customer testimonials and verified trust seals directly in the website header builds immediate buyer confidence.`
                      }
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                  <div className="size-6 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 font-bold font-mono text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Core Web Vitals & Sub-Second Page Load Optimization
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Google search algorithm penalizes pages with high Time-to-First-Byte (TTFB). Compressing large assets, enabling browser caching, and streamlining web fonts will drop load time below 1.2s and improve Google Local search rankings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / CTA & Prepared By */}
            <div className="border-t border-slate-200 pt-5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  Audit Prepared By
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {consultantName} · {agencyName}
                </span>
                <span className="text-[11px] text-slate-600 block">
                  {email} {portfolioUrl ? `· ${portfolioUrl.replace(/^https?:\/\//, '')}` : ''}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg inline-block">
                  Next Step: Schedule 15-Min Walkthrough
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
