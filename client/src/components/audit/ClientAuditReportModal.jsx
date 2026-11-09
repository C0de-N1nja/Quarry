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

  const handleDownloadPdf = () => {
    try {
      const downloadUrl = `/api/leads/${lead.id}/audit-pdf`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${businessName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Audit_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Downloading 1-page client PDF audit report...');
    } catch (err) {
      toast.error('Failed to trigger PDF download');
    }
  };

  const handlePrintWindow = () => {
    // Open dedicated standalone printable route in new tab
    window.open(`/api/leads/${lead.id}/audit-report?print=true`, '_blank');
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      aria-label="Client Audit Report"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh] max-w-4xl bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
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
            title="Open clean standalone print tab (zero blank page guarantee)"
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

      {/* Modal Body: Embedded Live Audit Sheet Preview */}
      <ModalBody className="p-0 flex-1 overflow-hidden bg-background-tertiary-default flex flex-col min-h-[560px]">
        {/* Banner with download info */}
        <div className="px-5 py-2.5 bg-background-secondary-default border-b border-separator-border flex items-center justify-between text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            Live Client Presentation Preview (A4 Single-Page Format)
          </span>
          <button
            type="button"
            onClick={() => window.open(`/api/leads/${lead.id}/audit-report`, '_blank')}
            className="text-[11px] text-accent-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            Open in new tab <RiExternalLinkLine className="size-3" />
          </button>
        </div>

        {/* Live Iframe Preview Rendering Standalone Clean HTML */}
        <div className="flex-1 w-full bg-slate-100 p-3 sm:p-5 overflow-auto flex justify-center">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden flex flex-col h-[700px]">
            <iframe
              title={`Audit Report for ${businessName}`}
              src={`/api/leads/${lead.id}/audit-report`}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
