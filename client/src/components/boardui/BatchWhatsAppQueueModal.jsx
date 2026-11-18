import React, { useState, useEffect } from 'react';
import { 
  RiWhatsappLine, 
  RiCloseLine, 
  RiCheckLine, 
  RiArrowRightLine, 
  RiArrowLeftLine, 
  RiFileCopyLine, 
  RiFlashlightFill,
  RiStarFill,
  RiMapPinLine,
  RiBuildingLine,
  RiShieldCheckLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { toast } from '@/components/base/toast/toast';
import { STAGE_CONFIG, normalizeStage } from '@shared/stages';
import { 
  generateSequenceMessage, 
  getWhatsAppWebUrl, 
  normalizeWhatsAppPhone, 
  WHATSAPP_HOOKS,
  SEQUENCE_STEPS 
} from '@/utils/whatsappHelper';

export default function BatchWhatsAppQueueModal({
  isOpen,
  onClose,
  selectedLeads = [],
  onUpdateLeadStage,
  onRefresh
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedHook, setSelectedHook] = useState('auto');
  const [selectedStep, setSelectedStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Guard if list changes
  useEffect(() => {
    if (currentIndex >= selectedLeads.length) {
      setCurrentIndex(Math.max(0, selectedLeads.length - 1));
    }
  }, [selectedLeads.length]);

  const currentLead = selectedLeads[currentIndex] || null;

  useEffect(() => {
    if (currentLead) {
      const msg = generateSequenceMessage(currentLead, selectedStep, selectedHook);
      setCustomText(msg);
      setSelectedStep(currentLead.sequence_step || 1);
    }
  }, [currentLead?.id, selectedHook, selectedStep]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in textarea
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        if (e.key === 'Escape') onClose();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleLaunchWhatsApp();
      } else if (e.key === 'Enter' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleMarkMessagedAndNext();
      } else if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, selectedLeads, currentLead, customText]);

  if (!isOpen || selectedLeads.length === 0 || !currentLead) return null;

  const phone = currentLead.phone || currentLead.whatsapp || '';
  const phoneDigits = normalizeWhatsAppPhone(phone, currentLead.country);
  const progressPercent = Math.round(((currentIndex + 1) / selectedLeads.length) * 100);

  const handleNext = () => {
    if (currentIndex < selectedLeads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    toast.success('WhatsApp message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchWhatsApp = () => {
    if (!phone) {
      toast.error('No phone number recorded for this lead');
      return;
    }
    const waUrl = getWhatsAppWebUrl(phone, customText, currentLead.country);
    window.open(waUrl, '_blank');
    toast.info('Opening WhatsApp Web...', {
      description: `Pre-filled for ${currentLead.business_name}. Press Enter in WhatsApp to send, then press [Enter] here to advance!`
    });
  };

  const handleMarkMessagedAndNext = async () => {
    setIsUpdating(true);
    try {
      await fetch(`/api/leads/${currentLead.id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          note: `Batch Queue: Dispatched Step ${selectedStep}`
        })
      });
      if (onUpdateLeadStage) onUpdateLeadStage(currentLead.id, 'messaged');
      toast.success(`Marked ${currentLead.business_name} as Messaged (+3d follow-up)`);

      if (currentIndex < selectedLeads.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        toast.success('Batch WhatsApp queue completed!');
        if (onRefresh) onRefresh();
        onClose();
      }
    } catch (e) {
      toast.error('Failed to update stage');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      aria-label="Batch WhatsApp Queue Runner"
      className="p-0 overflow-hidden"
    >
      {/* Top Header with Progress Bar */}
      <div className="p-4 sm:p-5 border-b border-separator-border bg-background-secondary-default flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <RiFlashlightFill className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                Batch WhatsApp Campaign Runner
              </h3>
              <Chip variant="subtle" color="emerald" size="sm">
                Rapid Queue
              </Chip>
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-0.5">
              Lead {currentIndex + 1} of {selectedLeads.length} ({progressPercent}% completed)
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Hint Pill */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-text-tertiary bg-background-primary-default px-2.5 py-1 rounded-lg border border-separator-border">
          <span>[Space] Launch</span>
          <span>•</span>
          <span>[Enter] Mark & Next</span>
          <span>•</span>
          <span>[→] Skip</span>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-separator-border/40 h-1">
        <div 
          className="bg-emerald-500 h-1 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ModalBody className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Current Lead Profile Card */}
        <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-text-primary">
                {currentLead.business_name}
              </h2>
              {currentLead.rating > 0 && (
                <Chip variant="subtle" color="amber" size="sm" className="gap-1 font-mono">
                  <RiStarFill className="size-3 text-amber-500" />
                  <span>{currentLead.rating} ({currentLead.reviews_count || 0})</span>
                </Chip>
              )}
              {currentLead.has_no_website === 1 && (
                <Chip variant="subtle" color="rose" size="sm">
                  No Website
                </Chip>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
              <span className="flex items-center gap-1">
                <RiBuildingLine className="size-3" />
                {currentLead.category || 'General Service'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <RiMapPinLine className="size-3" />
                {currentLead.city || 'Local Area'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="font-mono text-sm font-bold text-text-primary">
              {phone || 'No phone'}
            </span>
            {phoneDigits && (
              <span className="text-[11px] font-mono text-emerald-400">
                +{phoneDigits}
              </span>
            )}
          </div>
        </div>

        {/* 3-Step Sequence Stepper */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block font-semibold">
            Outreach Cadence Step
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SEQUENCE_STEPS.map((s) => {
              const isSelected = selectedStep === s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setSelectedStep(s.step)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 text-blue-400 font-bold shadow-2xs'
                      : 'bg-background-secondary-default border-separator-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>{s.title}</span>
                    <span className="text-[10px] font-mono opacity-80">{s.cadence}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hook Angle Selector (For Step 1) */}
        {selectedStep === 1 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block font-semibold">
              Select Business Hook Angle
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {WHATSAPP_HOOKS.map((hook) => (
                <button
                  key={hook.id}
                  type="button"
                  onClick={() => setSelectedHook(hook.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    selectedHook === hook.id
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'
                      : 'bg-background-secondary-default border-separator-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {hook.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Preview Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <label className="font-mono uppercase text-text-tertiary text-[10px]">
              Pre-filled Message ({customText.length} chars)
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 cursor-pointer"
            >
              {copied ? <RiCheckLine className="size-3 text-emerald-400" /> : <RiFileCopyLine className="size-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full text-xs font-sans p-3 rounded-xl bg-background-secondary-default text-text-primary border border-separator-border focus:border-text-primary focus:outline-none resize-none leading-relaxed transition-colors font-mono"
          />
        </div>
      </ModalBody>

      {/* Footer Navigation & Actions */}
      <ModalFooter className="p-4 bg-background-secondary-default/50 border-t border-separator-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={RiArrowLeftLine}
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            Prev
          </Button>
          <Button
            size="small"
            variant="secondary"
            trailingIcon={RiArrowRightLine}
            onClick={handleNext}
            disabled={currentIndex === selectedLeads.length - 1}
          >
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="small"
            variant="primary"
            onClick={handleLaunchWhatsApp}
            leadingIcon={RiWhatsappLine}
            disabled={!phone}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            title="Open WhatsApp Web in new tab (Spacebar)"
          >
            Open in WhatsApp
          </Button>

          <Button
            size="small"
            variant="primary"
            onClick={handleMarkMessagedAndNext}
            disabled={isUpdating}
            leadingIcon={RiCheckLine}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            title="Mark as Messaged and jump to next lead in queue (Enter)"
          >
            {currentIndex === selectedLeads.length - 1 ? 'Mark & Finish' : 'Mark Messaged & Next'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
