import React, { useState } from 'react';
import { 
  RiWhatsappLine, 
  RiFileCopyLine, 
  RiCheckLine, 
  RiSparklingLine,
  RiSpeedUpLine,
  RiQuestionLine,
  RiStarLine,
  RiUserSharedLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { toast } from '@/components/base/toast/toast';
import { STAGE_CONFIG, normalizeStage } from '@shared/stages';
import { 
  generateWhatsAppMessage, 
  getWhatsAppWebUrl, 
  normalizeWhatsAppPhone 
} from '@/utils/whatsappHelper';

export default function WhatsAppModal({ 
  isOpen, 
  onClose, 
  lead, 
  prototypeUrl,
  onSuccess
}) {
  if (!isOpen || !lead) return null;

  const phoneDigits = normalizeWhatsAppPhone(lead.phone, lead.country);
  const businessName = lead.business_name || 'Business Owner';

  const [currentLeadStatus, setCurrentLeadStatus] = useState(lead?.status ? normalizeStage(lead.status) : 'new');
  const [hasLaunchedWa, setHasLaunchedWa] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  const scripts = [
    {
      id: 'ai_search',
      title: 'AI Search & ChatGPT',
      icon: RiSparklingLine,
      color: 'indigo',
      badge: 'Modern AI Gap',
      text: generateWhatsAppMessage(lead, 'ai_search')
    },
    {
      id: 'competitor_leak',
      title: 'Competitor Customer Leak',
      icon: RiUserSharedLine,
      color: 'rose',
      badge: 'Revenue Alert',
      text: generateWhatsAppMessage(lead, 'competitor_leak')
    },
    {
      id: 'reputation',
      title: 'Trapped Google Reputation',
      icon: RiStarLine,
      color: 'amber',
      badge: 'For Rated Leads',
      text: generateWhatsAppMessage(lead, 'reputation')
    },
    {
      id: 'direct',
      title: 'Direct 30-Sec Inbound Hook',
      icon: RiQuestionLine,
      color: 'yellow',
      badge: 'Short & Punchy',
      text: generateWhatsAppMessage(lead, 'direct')
    },
    {
      id: 'speed_audit',
      title: 'Mobile Customer Drop-Off',
      icon: RiSpeedUpLine,
      color: 'emerald',
      badge: 'Has Website',
      text: generateWhatsAppMessage(lead, 'speed_audit')
    }
  ];

  const hasNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' ||
    /facebook\.com|instagram\.com|linkedin\.com|linktr\.ee/i.test(lead.website || '');
  const hasGoodRating = Number(lead.rating) >= 4.5 && Number(lead.reviews_count) >= 5;

  const defaultId = !hasNoWebsite ? 'speed_audit' : (hasGoodRating ? 'reputation' : 'ai_search');
  const [selectedScriptId, setSelectedScriptId] = useState(defaultId);
  const [copiedId, setCopiedId] = useState(null);

  const activeScript = scripts.find(s => s.id === selectedScriptId) || scripts[0];

  const handleCopy = (script) => {
    navigator.clipboard.writeText(script.text);
    setCopiedId(script.id);
    toast.success('WhatsApp message copied to clipboard!', {
      description: 'Ready to paste into WhatsApp Web or mobile chat'
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLaunchWhatsApp = () => {
    const waUrl = getWhatsAppWebUrl(lead.phone, activeScript.text, lead.country);
    window.open(waUrl, '_blank');
    setHasLaunchedWa(true);
    toast.info('Opening WhatsApp Web...', {
      description: `Message pre-filled for ${lead.phone || 'recipient'}. Press Enter in WhatsApp Web to send, then click "Mark as Messaged" if sent!`
    });
  };

  const handleManualStageToggle = async (newStage) => {
    setUpdatingStage(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStage })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLeadStatus(newStage);
        toast.success(`Pipeline status updated to "${newStage}"`);
        if (onSuccess) onSuccess({ ...lead, status: newStage });
      } else {
        toast.error('Failed to update stage');
      }
    } catch (e) {
      toast.error('Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleMarkMessaged = async () => {
    setUpdatingStage(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          note: `Pitch sent via WhatsApp (${activeScript.title})`
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLeadStatus('messaged');
        toast.success('Marked as Messaged! (+3d follow-up scheduled)');
        if (onSuccess && data.lead) onSuccess(data.lead);
      }
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStage(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      aria-label="Direct WhatsApp Outreach"
      className="p-0 overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-separator-border bg-background-secondary-default flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <RiWhatsappLine className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                WhatsApp Outreach Cockpit
              </h3>
              <Chip variant="subtle" color="emerald" size="sm">
                WhatsApp Direct
              </Chip>
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-0.5">
              Select or copy a tailored business-language message for {businessName}
            </p>
          </div>
        </div>

        {lead.phone && (
          <div className="flex flex-col items-end">
            <span className="font-mono text-caption-1-medium text-text-secondary bg-background-tertiary-default px-2.5 py-1 rounded-lg border border-separator-border">
              {lead.phone}
            </span>
            {phoneDigits && (
              <span className="text-[10px] font-mono text-text-tertiary mt-0.5">
                +{phoneDigits}
              </span>
            )}
          </div>
        )}
      </div>

      <ModalBody className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
        {/* Tip banner & Manual Status Notice */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-text-secondary flex items-start gap-2.5">
          <RiWhatsappLine className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-text-primary">Direct 1-Click WhatsApp Delivery: </span>
            Clicking &quot;Open WhatsApp Web&quot; navigates to WhatsApp Web with this message pre-filled. You press Enter to send. Status is not changed automatically—use the status toggle below once sent.
          </div>
        </div>

        {/* Manual Pipeline Stage Toggle Buttons */}
        <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary font-semibold">
              Pipeline Status (Manual Toggle)
            </span>
            {hasLaunchedWa && currentLeadStatus !== 'messaged' && (
              <Button
                size="small"
                variant="primary"
                leadingIcon={RiCheckLine}
                onClick={handleMarkMessaged}
                disabled={updatingStage}
                className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Mark as Messaged (+3d)
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STAGE_CONFIG.map((s) => {
              const isSelected = currentLeadStatus === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleManualStageToggle(s.id)}
                  disabled={updatingStage}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 font-bold shadow-2xs'
                      : 'bg-background-primary-default text-text-secondary border-separator-border hover:text-text-primary hover:border-text-secondary'
                  }`}
                >
                  <StatusDot color={isSelected ? s.color : 'neutral'} className="size-1.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Script Selection Cards */}
        <div className="space-y-3">
          <label className="text-caption-2-medium uppercase tracking-wider text-text-tertiary font-mono">
            Select Pitch Angle
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {scripts.map((script) => {
              const isSelected = script.id === selectedScriptId;
              const Icon = script.icon;
              return (
                <div
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/30'
                      : 'border-separator-border bg-background-secondary-default hover:bg-background-secondary-hover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-2 font-semibold text-text-primary text-body-small">
                      <Icon className={`size-4 ${isSelected ? 'text-emerald-500' : 'text-text-tertiary'}`} />
                      <span>{script.title}</span>
                    </span>
                    <Chip variant="subtle" color={script.color} size="sm">
                      {script.badge}
                    </Chip>
                  </div>
                  <p className="text-caption-1-regular text-text-secondary font-mono leading-relaxed bg-background-primary-default p-2.5 rounded-lg border border-separator-border select-text whitespace-pre-line">
                    {script.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="p-4 bg-background-secondary-default/50 border-t border-separator-border flex items-center justify-between gap-2">
        <Button
          size="small"
          variant="secondary"
          onClick={() => handleCopy(activeScript)}
          leadingIcon={copiedId === activeScript.id ? RiCheckLine : RiFileCopyLine}
        >
          {copiedId === activeScript.id ? 'Copied!' : 'Copy WhatsApp Message'}
        </Button>

        <div className="flex items-center gap-2">
          <Button size="small" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={handleLaunchWhatsApp}
            leadingIcon={RiWhatsappLine}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Open WhatsApp Web
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
