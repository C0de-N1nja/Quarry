import React, { useState } from 'react';
import { 
  RiWhatsappLine, 
  RiFileCopyLine, 
  RiCheckLine, 
  RiExternalLinkLine,
  RiSparklingLine,
  RiSpeedUpLine,
  RiQuestionLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';
import { 
  generateWhatsAppMessage, 
  getWhatsAppWebUrl, 
  getUniversalWhatsAppUrl, 
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

  const scripts = [
    {
      id: 'no_website',
      title: 'No-Website Direct Hook',
      icon: RiSparklingLine,
      color: 'indigo',
      badge: 'Highest Reply Rate',
      text: generateWhatsAppMessage(lead, 'no_website')
    },
    {
      id: 'speed_audit',
      title: 'Mobile Speed & Audit Hook',
      icon: RiSpeedUpLine,
      color: 'emerald',
      badge: 'Audit Focused',
      text: generateWhatsAppMessage(lead, 'speed_audit')
    },
    {
      id: 'casual',
      title: 'Casual 1-Liner (Low Pressure)',
      icon: RiQuestionLine,
      color: 'yellow',
      badge: 'Direct & Simple',
      text: generateWhatsAppMessage(lead, 'casual')
    }
  ];

  const [selectedScriptId, setSelectedScriptId] = useState(scripts[0].id);
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

  const handleLaunchWhatsApp = async () => {
    const waUrl = getWhatsAppWebUrl(lead.phone, activeScript.text, lead.country);
    window.open(waUrl, '_blank');
    toast.info('Opening WhatsApp Web...', {
      description: `Message pre-filled for ${lead.phone || 'recipient'}. Just press Enter to send!`
    });

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
      if (data.success && data.lead) {
        if (onSuccess) onSuccess(data.lead);
      }
    } catch (e) {
      console.error('Failed to auto-update stage to messaged', e);
    }

    onClose();
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
              Select or copy a tailored outreach message for {businessName}
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
        {/* Tip banner */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-text-secondary flex items-start gap-2.5">
          <RiWhatsappLine className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-text-primary">Direct 1-Click WhatsApp Delivery: </span>
            When you click &quot;Open WhatsApp Web&quot;, Quarry navigates directly to WhatsApp Web with this message pre-filled. You only need to press Enter to send.
          </div>
        </div>

        {/* Script Selection Cards */}
        <div className="space-y-3">
          <label className="text-caption-2-medium uppercase tracking-wider text-text-tertiary font-mono">
            Select Pitch Hook
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
                  <p className="text-caption-1-regular text-text-secondary font-mono leading-relaxed bg-background-primary-default p-2.5 rounded-lg border border-separator-border select-text">
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
            Cancel
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
