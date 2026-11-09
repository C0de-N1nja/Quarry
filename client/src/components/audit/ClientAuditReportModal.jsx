import React from 'react';
import { 
  RiShieldCheckLine, 
  RiShieldCrossLine, 
  RiSpeedUpLine, 
  RiSmartphoneLine, 
  RiStarFill, 
  RiPrinterLine, 
  RiDownload2Line,
  RiExternalLinkLine,
  RiFilePdfLine
} from '@remixicon/react';
import { Modal, ModalBody } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';
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
  const seconds = (ttfbMs / 1000).toFixed(1);

  // Agency Info from settings
  const agencyName = settings.agency_name || 'Apex Web Studio';
  const consultantName = settings.sender_name || 'Muhammad Rehan';
  const email = settings.sender_email || 'contact@muhammadrehan.me';
  const portfolioUrl = settings.my_portfolio || '';

  const handleDownloadPdf = () => {
    try {
      const downloadUrl = `/api/leads/${lead.id}/audit-pdf`;
      window.location.href = downloadUrl;
      toast.success('Downloading 1-page PDF audit report...');
    } catch (err) {
      toast.error('Failed to trigger PDF download');
    }
  };

  const handlePrintWindow = () => {
    window.open(`/api/leads/${lead.id}/audit-report?print=true`, '_blank');
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      aria-label="Client Audit Report"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh] max-w-3xl bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* BoardUI Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <RiFilePdfLine className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              1-Page Client Website & Performance Audit
            </h2>
            <p className="text-[11px] text-text-secondary font-mono">
              Prepared for {businessName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Binary PDF Download */}
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiDownload2Line}
            onClick={handleDownloadPdf}
            className="text-xs font-semibold"
            title="Download true .pdf file directly to your system"
          >
            Download PDF
          </Button>

          {/* Standalone Print Tab */}
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiPrinterLine}
            onClick={handlePrintWindow}
            className="text-xs font-semibold"
            title="Open clean standalone print tab"
          >
            Print
          </Button>

          <CloseButton
            size="md"
            onClick={onClose}
            aria-label="Close audit preview"
          />
        </div>
      </div>

      {/* Modal Body: Single Responsive Sheet (Zero double scrollbars) */}
      <ModalBody className="p-4 sm:p-6 flex-1 overflow-y-auto bg-background-tertiary-default">
        {/* Executive A4 Sheet Container */}
        <div className="w-full bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          
          {/* Header Grid */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Confidential Technical & Growth Audit
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                {businessName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {category} · {city} {website ? `· ${website.replace(/^https?:\/\//, '')}` : '· No Official Website Detected'}
              </p>
            </div>

            {/* Google Reputation Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 text-left sm:text-right">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold block">Google Reputation</span>
              <div className="flex items-center sm:justify-end gap-1 mt-0.5">
                <RiStarFill className="size-4 text-amber-500 fill-amber-500" />
                <span className="text-lg font-bold font-mono text-slate-900">
                  {rating || '4.8'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block font-medium">
                {reviewsCount > 0 ? `${reviewsCount.toLocaleString()} verified customer reviews` : 'Verified local business'}
              </span>
            </div>
          </div>

          {/* 3-Column Scorecard (True Equal-Width Grid) */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
              Technical Health & Performance Scorecard
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Security */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                  <span>Security (SSL)</span>
                  {isHttps ? <RiShieldCheckLine className="size-4 text-emerald-600" /> : <RiShieldCrossLine className="size-4 text-rose-600" />}
                </div>
                <div className="mt-2">
                  <span className={cx(
                    "text-sm font-bold font-mono block",
                    isHttps ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {isHttps ? "Secure (HTTPS)" : "Insecure (HTTP)"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    {isHttps ? "Full TLS encryption active" : "Triggers browser security alert"}
                  </span>
                </div>
              </div>

              {/* Mobile Experience */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                  <span>Mobile Experience</span>
                  <RiSmartphoneLine className="size-4 text-slate-600" />
                </div>
                <div className="mt-2">
                  <span className={cx(
                    "text-sm font-bold font-mono block",
                    isMobileFriendly ? "text-emerald-700" : "text-amber-700"
                  )}>
                    {isMobileFriendly ? "Responsive" : "Needs Viewport Fix"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    {isMobileFriendly ? "Clean layout scaling on phones" : "Requires pinch-to-zoom"}
                  </span>
                </div>
              </div>

              {/* Speed */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                  <span>Page Load Speed</span>
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
                      ({seconds}s)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">
                    {perfScore >= 80 ? "Sub-second mobile response" : "Slow latency causes drop-off"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Crucial Opportunities */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-2.5">
              Top 3 Revenue-Impacting Opportunities
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    01
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs">
                    1-Click Mobile Calling & Immediate Quote Booking
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                  Over 68% of local homeowner service searches originate on smartphones. Adding a persistent, 1-click "Tap to Call" and quote request button prevents qualified visitors from bouncing to competitors.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    02
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs">
                    Showcase Google 5-Star Reviews Above the Fold
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                  {rating && reviewsCount > 0 
                    ? `Your verified ${rating} rating from ${reviewsCount} happy clients in ${city} is your strongest sales asset. Displaying verified review badges directly in the hero header increases form conversion by up to 34%.`
                    : `Displaying authentic local customer testimonials and verified trust seals directly in the website header builds immediate buyer confidence.`
                  }
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                    03
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs">
                    Sub-Second Mobile Page Speed Optimization
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                  Google search algorithm penalizes pages with high load latency. Compressing large assets, enabling browser caching, and streamlining web fonts will drop load time below 1.2s and improve Google Local search rankings.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Audit Prepared By
              </span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {consultantName} <span className="font-normal text-slate-400">·</span> {agencyName} <span className="font-normal text-slate-400">·</span> <span className="font-mono text-[11px] font-normal text-slate-600">{email}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md inline-block">
                Next Step: 15-Minute Strategy Review
              </span>
            </div>
          </div>

        </div>
      </ModalBody>
    </Modal>
  );
}
