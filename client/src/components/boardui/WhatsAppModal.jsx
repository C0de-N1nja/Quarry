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

export default function WhatsAppModal({ 
  isOpen, 
  onClose, 
  lead, 
  prototypeUrl 
}) {
  if (!isOpen || !lead) return null;

  const rawPhone = lead.phone ? lead.phone.replace(/[^\d]/g, '') : '';
  const businessName = lead.business_name || 'Business Owner';
  const ownerName = lead.decision_maker_name || lead.owner_name || '';
  const greetingName = ownerName || businessName;

  const scripts = [
    {
      id: 'no_website_hook',
      title: 'No-Website Direct Hook',
      icon: RiSparklingLine,
      color: 'indigo',
      badge: 'Highest Reply Rate',
      text: `Hi ${greetingName}, I saw your high rating on Google Maps for ${businessName} in ${lead.city || 'your area'} and noticed you don't have an official website linked. Are you currently taking on new clients this month? Most local competitors capture bookings directly through search.`
    },
    {
      id: 'speed_audit_hook',
      title: 'Mobile Speed & Audit Hook',
      icon: RiSpeedUpLine,
      color: 'emerald',
      badge: 'Audit Focused',
      text: `Hi ${greetingName}, quick heads up — I ran a mobile audit on ${businessName} and noticed it takes several seconds to load on smartphones. Would you like me to send over a quick 2-minute breakdown of the fixes?`
    },
    {
      id: 'casual_one_liner',
      title: 'Casual 1-Liner (Low Pressure)',
      icon: RiQuestionLine,
      color: 'yellow',
      badge: 'Direct & Simple',
      text: `Hi ${greetingName}, quick question — are you currently taking new clients this month for ${businessName}? Had a quick observation regarding your local search visibility.`
    }
  ];

  const [selectedScriptId, setSelectedScriptId] = useState(scripts[0].id);
  const [copiedId, setCopiedId] = useState(null);

  const activeScript = scripts.find(s => s.id === selectedScriptId) || scripts[0];

  const handleCopy = (script) => {
    navigator.clipboard.writeText(script.text);
    setCopiedId(script.id);
    toast.success('WhatsApp script copied to clipboard!', {
      description: 'Ready to paste into WhatsApp or SMS'
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLaunchWhatsApp = () => {
    const encoded = encodeURIComponent(activeScript.text);
    const waUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    toast.info('Opening WhatsApp Web...', {
      description: `Sending pre-filled message to ${lead.phone || 'recipient'}`
    });
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
              Select a high-converting message template tailored for {businessName}
            </p>
          </div>
        </div>

        {lead.phone && (
          <span className="font-mono text-caption-1-medium text-text-secondary bg-background-tertiary-default px-2.5 py-1 rounded-lg border border-separator-border">
            {lead.phone}
          </span>
        )}
      </div>

      <ModalBody className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
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
                  <p className="text-caption-1-regular text-text-secondary font-mono leading-relaxed bg-background-primary-default p-2.5 rounded-lg border border-separator-border">
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
          {copiedId === activeScript.id ? 'Copied!' : 'Copy Script Text'}
        </Button>

        <div className="flex items-center gap-2">
          <Button size="small" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={handleLaunchWhatsApp}
            leadingIcon={RiExternalLinkLine}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Launch WhatsApp Web
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
