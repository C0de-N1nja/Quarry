import React from 'react';
import { 
  RiFlashlightFill, 
  RiShieldCheckLine, 
  RiMailCheckLine, 
  RiDownloadLine,
  RiCloseLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Chip } from '@/components/base/badges/chip';
import { Kbd } from '@/components/base/kbd/kbd';

export default function FloatingBatchDock({
  selectedCount = 0,
  onClearSelection,
  onRunOsint,
  onVerifyEmails,
  onLaunchAutoPilot,
  onExportExcel,
  isProcessing = false
}) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 rounded-2xl border border-separator-border bg-background-primary-default/95 px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ring-1 ring-border-focus-ring/10 max-w-[95vw] overflow-x-auto"
      role="toolbar"
      aria-label="Batch Actions Toolbar"
    >
      {/* Selected Counter Chip */}
      <div className="flex items-center gap-2 shrink-0 pr-1 border-r border-separator-border">
        <Chip variant="bold" color="indigo" className="font-mono font-semibold">
          {selectedCount}
        </Chip>
        <span className="text-body-small font-medium text-text-primary hidden sm:inline">
          {selectedCount === 1 ? 'prospect selected' : 'prospects selected'}
        </span>
      </div>

      {/* Primary Batch Action: Auto-Pilot */}
      <Button
        size="small"
        variant="primary"
        leadingIcon={RiFlashlightFill}
        onClick={onLaunchAutoPilot}
        disabled={isProcessing}
        title="Launch 1-Click Multi-Stage Pipeline on selected prospects"
      >
        <span className="hidden sm:inline">Launch Auto-Pilot</span>
        <span className="sm:hidden">Auto-Pilot</span>
      </Button>

      {/* Batch OSINT Enrichment */}
      <Button
        size="small"
        variant="secondary"
        leadingIcon={RiShieldCheckLine}
        onClick={onRunOsint}
        disabled={isProcessing}
        title="Run OSINT & Social Enrichment on selected leads"
      >
        <span>OSINT</span>
      </Button>

      {/* Batch Email Verification */}
      {onVerifyEmails && (
        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiMailCheckLine}
          onClick={onVerifyEmails}
          disabled={isProcessing}
          className="hidden md:inline-flex"
          title="Verify email deliverability via MX & SMTP"
        >
          Verify
        </Button>
      )}

      {/* Export Batch */}
      {onExportExcel && (
        <Button
          size="small"
          variant="secondary"
          leadingIcon={RiDownloadLine}
          onClick={onExportExcel}
          disabled={isProcessing}
          className="hidden lg:inline-flex"
          title="Export selected rows to Excel"
        >
          Export
        </Button>
      )}

      {/* Deselect Action with Kbd shortcut hint */}
      <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-separator-border">
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1.5 px-2 py-1 text-caption-1-regular text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover rounded-lg transition-colors cursor-pointer"
          title="Clear selection (Esc)"
        >
          <span>Deselect</span>
          <Kbd className="hidden sm:inline-flex text-[10px]">Esc</Kbd>
        </button>
      </div>
    </div>
  );
}
