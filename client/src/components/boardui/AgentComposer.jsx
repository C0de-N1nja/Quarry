import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Send, Copy, Check, RefreshCw, Wand2, 
  MessageSquare, Sliders, ChevronDown, Bot
} from 'lucide-react';
import { RiSparklingFill, RiSendPlaneFill, RiFlashlightLine } from '@remixicon/react';

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
    <div className="rounded-xl border border-border-subtle bg-surface-1/95 dark:bg-surface-1/90 shadow-dropdown overflow-hidden transition-all">
      {/* Top Bar: Channel & Angle Pills */}
      <div className="p-2.5 border-b border-border-subtle/80 flex items-center justify-between gap-2 flex-wrap bg-surface-2/40">
        <div className="flex items-center gap-1.5">
          {/* Channel Selector */}
          <div className="flex p-0.5 rounded-lg bg-surface-2 border border-border-subtle">
            <button
              onClick={() => onChannelChange && onChannelChange('email')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                channel === 'email' 
                  ? 'bg-brand text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Email Pitch
            </button>
            <button
              onClick={() => onChannelChange && onChannelChange('sms')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                channel === 'sms' 
                  ? 'bg-brand text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              SMS / WhatsApp
            </button>
          </div>

          {/* Model Badge */}
          <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-2 border border-border-subtle text-[11px] font-mono text-gray-500">
            <Bot className="h-3 w-3 text-brand" />
            <span>{model}</span>
          </div>
        </div>

        {/* Pitch Angle Pill Selector */}
        <div className="flex items-center gap-1">
          <select
            value={pitchAngle}
            onChange={(e) => setPitchAngle(e.target.value)}
            className="px-2 py-1 rounded-md bg-surface-2 border border-border-subtle text-xs text-gray-800 dark:text-gray-200 outline-hidden font-medium"
          >
            {angles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          {pitchText && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-gray-600 dark:text-gray-300 border border-border-subtle transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
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
          className="w-full p-2.5 rounded-lg bg-surface-2/60 border border-border-subtle focus:border-brand/60 text-xs font-sans text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-hidden resize-none leading-relaxed"
        />
      </div>

      {/* Bottom Action Footer */}
      <div className="p-2.5 border-t border-border-subtle bg-surface-2/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <RiSparklingFill className="h-3.5 w-3.5 text-brand" />
          <span>Tailored using real decision maker intelligence</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onGenerate && onGenerate(pitchAngle)}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-800 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
            ) : (
              <Wand2 className="h-3.5 w-3.5 text-brand" />
            )}
            <span>{pitchText ? 'Regenerate' : 'Generate Pitch'}</span>
          </button>

          {pitchText && onSend && (
            <button
              onClick={onSend}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RiSendPlaneFill className="h-3.5 w-3.5" />
              )}
              <span>Queue Outreach</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
