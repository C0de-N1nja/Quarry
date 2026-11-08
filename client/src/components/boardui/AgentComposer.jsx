import React, { useState } from 'react';
import { 
  RiSparklingFill, 
  RiSendPlaneFill, 
  RiFlashlightLine,
  RiFileCopyLine,
  RiCheckLine,
  RiRefreshLine,
  RiMagicLine,
  RiMessage3Line,
  RiEqualizerLine,
  RiArrowDownSLine,
  RiRobotLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { Chip } from '@/components/base/badges/chip';

export default function AgentComposer({
  onGenerate,
  onSend,
  isGenerating = false,
  isSending = false,
  initialPrompt = '',
  pitchText = '',
  onPitchTextChange,
  channel = 'email', // 'email', 'sms', 'dm'
  onChannelChange
}) {
  const [model, setModel] = useState('Gemini 2.5 Pro');
  const [pitchAngle, setPitchAngle] = useState('no_website_opportunity');
  const [copied, setCopied] = useState(false);

  const angles = [
    { id: 'no_website_opportunity', label: 'Missing Website Urgency' },
    { id: 'competitor_loss', label: 'Local Competitor Threat' },
    { id: 'social_first', label: 'Social-to-Direct Booking' },
    { id: 'free_mockup_offer', label: '100% Free Mockup Value Offer' }
  ];

  const handleCopy = () => {
    if (!pitchText) return;
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-separator-border bg-background-primary-default shadow-sm overflow-hidden transition-all text-text-primary">
      {/* Top Bar: Channel & Angle Pills */}
      <div className="p-2.5 border-b border-separator-border flex items-center justify-between gap-2 flex-wrap bg-background-secondary-default">
        <div className="flex items-center gap-1.5">
          {/* Channel Selector */}
          <ButtonGroup size="small">
            <ButtonGroupItem
              size="small"
              selected={channel === 'email'}
              onClick={() => onChannelChange && onChannelChange('email')}
            >
              Email Pitch
            </ButtonGroupItem>
            <ButtonGroupItem
              size="small"
              selected={channel === 'sms'}
              onClick={() => onChannelChange && onChannelChange('sms')}
            >
              SMS / WhatsApp
            </ButtonGroupItem>
          </ButtonGroup>

          {/* Model Badge */}
          <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background-tertiary-default border border-separator-border text-[11px] font-mono text-text-tertiary">
            <RiRobotLine className="h-3 w-3 text-accent-500" />
            <span>{model}</span>
          </div>
        </div>

        {/* Pitch Angle Pill Selector */}
        <div className="flex items-center gap-1.5">
          <div className="relative inline-flex items-center">
            <select
              value={pitchAngle}
              onChange={(e) => setPitchAngle(e.target.value)}
              className="appearance-none pl-2.5 pr-6 py-1 rounded-md bg-background-tertiary-default border border-separator-border text-xs text-text-primary outline-hidden font-medium cursor-pointer hover:border-accent-500/50 transition-colors"
            >
              {angles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <RiArrowDownSLine className="pointer-events-none absolute right-1.5 size-3.5 text-text-tertiary" />
          </div>

          {pitchText && (
            <IconButton
              size="small"
              icon={copied ? RiCheckLine : RiFileCopyLine}
              aria-label={copied ? "Copied" : "Copy to clipboard"}
              onClick={handleCopy}
              title="Copy to clipboard"
            />
          )}
        </div>
      </div>

      {/* Center: Pitch Content Editor */}
      <div className="p-3">
        <textarea
          rows={channel === 'sms' ? 3 : 8}
          value={pitchText}
          onChange={(e) => onPitchTextChange && onPitchTextChange(e.target.value)}
          placeholder="Click 'Generate Pitch' below to synthesize hyper-personalized cold outreach based on the lead's OSINT profile and decision maker name..."
          className="w-full p-2.5 rounded-lg bg-background-secondary-default border border-separator-border focus:border-accent-500 text-xs font-sans text-text-primary placeholder:text-text-tertiary outline-hidden resize-none leading-relaxed"
        />
      </div>

      {/* Bottom Action Footer */}
      <div className="p-2.5 border-t border-separator-border bg-background-secondary-default flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <RiSparklingFill className="h-3.5 w-3.5 text-accent-500" />
          <span>Tailored using real decision maker intelligence</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onGenerate && onGenerate(pitchAngle)}
            disabled={isGenerating}
            variant="secondary"
            size="small"
            leadingIcon={isGenerating ? RiRefreshLine : RiMagicLine}
          >
            {pitchText ? 'Regenerate' : 'Generate Pitch'}
          </Button>

          {pitchText && onSend && (
            <Button
              onClick={onSend}
              disabled={isSending}
              variant="primary"
              size="small"
              leadingIcon={isSending ? RiRefreshLine : RiSendPlaneFill}
            >
              Queue Outreach
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
