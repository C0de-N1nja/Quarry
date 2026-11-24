'use client';

import React, { useState, useEffect } from 'react';
import { useQuarry } from '../context/QuarryContext';
import { BusinessItem } from '../types/quarry';
import { MessageSquare, Mail, Copy, Check, ExternalLink, Send, Sparkles } from 'lucide-react';

interface PitchStudioProps {
  business: BusinessItem;
}

export function PitchStudio({ business }: PitchStudioProps) {
  const {
    outreachChannel,
    setOutreachChannel,
    setIsOutreachModalOpen
  } = useQuarry();

  const [assetFocus, setAssetFocus] = useState<string>('Auto (Smart BI)');
  const [pitchStyle, setPitchStyle] = useState<number>(1);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  const assetFocusOptions = [
    'Auto (Smart BI)',
    'New Website',
    'Redesign & Scale',
    'E-Com/Online Sales',
    'Online Booking',
    'WhatsApp CRM',
    'Reviews & SEO'
  ];

  const styleCards = [
    { id: 1, title: 'Observation Hook', desc: 'Direct mention of their strong reviews vs missing digital funnel.' },
    { id: 2, title: 'Cold Intro + Value', desc: 'Compliment momentum and offer an interactive working showcase.' },
    { id: 3, title: 'Competitor Gap', desc: 'Show why AI / ChatGPT directs searchers to local competitors.' },
    { id: 4, title: 'Problem → Solution', desc: 'Speed-to-lead automated booking & WhatsApp capture.' },
    { id: 5, title: 'Ultra-Short Soft CTA', desc: 'Casual 2-minute question for busy owners on job sites.' }
  ];

  // Synthesize pitch dynamically based on channel, asset focus, and style hook
  useEffect(() => {
    const name = business.business_name;
    const cat = business.category;
    const city = business.city || 'Austin';
    const hasNoWeb = business.has_no_website === true || business.has_no_website === 1 || !business.website;
    const demoUrl = `https://quarry-showcase.vercel.app/${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`;

    if (outreachChannel === 'whatsapp') {
      setSubject(''); // No subject for WhatsApp
      if (pitchStyle === 1) {
        setBody(
`Hi ${name}, quick question regarding ${cat} services in ${city}.

I noticed your listing on Google Maps with ${business.rating}★ across ${business.reviews_count} reviews, but you don't have an official website attached to it.

A lot of local customers now ask ChatGPT or Google "who is the best ${cat} in ${city}?" These AI engines only recommend businesses with an active official site to crawl, so high-ticket jobs are automatically going to your local competitors.

We put together a clean 2-minute working preview for ${name}:
${demoUrl}

Would you be open to taking a quick look?`
        );
      } else if (pitchStyle === 2) {
        setBody(
`Hi ${name} team, noticed your great work and ${business.rating}★ reputation in ${city}.

We drafted a fast mobile-first showcase layout specifically for ${name} to help you capture direct quote requests:
${demoUrl}

Let me know if you would like me to adjust any of the services or phone details listed.`
        );
      } else if (pitchStyle === 3) {
        setBody(
`Hi ${name}, saw your profile while researching local ${cat} providers in ${city}.

Your competitors are actively investing in search rankings, while your business is losing uncaptured inquiries simply because Maps has no verified domain attached.

Here is the live mockup we put together for ${name}:
${demoUrl}

Worth a 2-minute look this week?`
        );
      } else if (pitchStyle === 4) {
        setBody(
`Hi ${name}, quick note about speed-to-lead in ${city}.

When local property owners search for ${cat}, over 70% book with the first contractor who provides an instant quote or WhatsApp channel.

We built a working prototype for ${name} that captures these inquiries automatically:
${demoUrl}

Take a look when you have a moment.`
        );
      } else {
        setBody(
`Hi there, did you get a second to view the working prototype we put together for ${name}?
${demoUrl}

If you already have a website on the way or aren't looking for more ${cat} jobs in ${city} right now, just let me know and I won't follow up again.`
        );
      }
    } else {
      // Email Mode
      if (pitchStyle === 1) {
        setSubject(`Quick question regarding ${name} (${cat} in ${city})`);
        setBody(
`Hi ${name} Team,

I came across your Google Maps listing for ${cat} in ${city} with ${business.rating}★ across ${business.reviews_count} verified reviews.

${hasNoWeb
  ? `I noticed there is currently no official domain attached to your listing. Today, AI assistants (like ChatGPT, Gemini, and Apple Intelligence) only recommend local contractors that have a real website to verify credentials and service areas. Without one, those searchers are routed directly to competing providers.`
  : `While your listing is active, your competitors are capturing the majority of organic search demand by deploying dedicated speed-to-lead booking funnels.`}

We assembled an interactive working showcase tailored to ${name}:
${demoUrl}

Would you be open to a 2-minute review to see how this could drive higher-margin projects to your calendar?

Best regards,
Quarry Outreach Team`
        );
      } else if (pitchStyle === 2) {
        setSubject(`Interactive layout built for ${name}`);
        setBody(
`Hi ${name},

Congratulations on building such a strong ${business.rating}★ reputation in ${city}.

We recently drafted a modern digital showcase and booking hub specifically branded for ${name}:
${demoUrl}

Everything is structured for maximum conversion on mobile devices and WhatsApp inquiries. Would love to send over the access credentials if you are interested.

Regards,
Outreach Desk`
        );
      } else if (pitchStyle === 3) {
        setSubject(`Local ${cat} competitive gap in ${city} - ${name}`);
        setBody(
`Hi ${name} Management,

In analyzing top-ranking ${cat} specialists in ${city}, your review ratings rank in the upper tier, yet competing firms are dominating voice and mobile organic queries.

We put together an actionable digital asset to bridge this gap:
${demoUrl}

Let me know if you would like to review the breakdown.

Sincerely,
Quarry Enterprise`
        );
      } else if (pitchStyle === 4) {
        setSubject(`Converting uncaptured ${cat} inquiries for ${name}`);
        setBody(
`Hi ${name},

Most local service businesses lose up to 40% of inbound calls because potential clients cannot find an immediate online quote form or WhatsApp button after hours.

We created a turnkey solution for ${name} demonstrating how to automate this flow:
${demoUrl}

Would you be open to taking a look?

Best,
The Quarry Team`
        );
      } else {
        setSubject(`Follow-up: 2-minute preview for ${name}`);
        setBody(
`Hi there,

Just following up briefly in case you were on a job site earlier. Did you have a moment to open the preview link we prepared for ${name}?

${demoUrl}

No pressure at all. If you are already booked out or not taking on new ${cat} contracts in ${city}, just let me know and I will close this file.

Best,
Outreach Team`
        );
      }
    }
  }, [business, outreachChannel, assetFocus, pitchStyle]);

  const handleCopy = () => {
    const fullText = outreachChannel === 'email' ? `Subject: ${subject}\n\n${body}` : body;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenApp = () => {
    if (outreachChannel === 'whatsapp') {
      const cleanPhone = (business.phone || '').replace(/\D/g, '');
      const encoded = encodeURIComponent(body);
      const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
    } else {
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(body);
      const mailto = `mailto:${business.email || ''}?subject=${encodedSubject}&body=${encodedBody}`;
      window.open(mailto, '_blank');
    }
  };

  return (
    <div className="bg-[#0b0b0b] border border-[#171717] rounded-3xl p-4 space-y-4">
      {/* Studio Header & Channel Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#141414] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight uppercase">Quarry Pitch Studio</h3>
            <p className="text-[10px] text-[#7e7e7e]">AI-Guided Cold Outreach & Positioning Engine</p>
          </div>
        </div>

        {/* Channel Toggle: WhatsApp (Emerald) vs Email (Sky) */}
        <div className="flex items-center p-0.5 rounded-[12px] bg-[#050505] border border-[#1c1c1c]">
          <button
            type="button"
            onClick={() => setOutreachChannel('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-semibold transition-all ${
              outreachChannel === 'whatsapp'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-[#8a8a8a] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp / Short</span>
          </button>
          <button
            type="button"
            onClick={() => setOutreachChannel('email')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[10px] text-xs font-semibold transition-all ${
              outreachChannel === 'email'
                ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300 shadow-sm'
                : 'text-[#8a8a8a] hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Format</span>
          </button>
        </div>
      </div>

      {/* Asset Focus Pills */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1.5">
          Asset Focus Angle:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {assetFocusOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAssetFocus(opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                assetFocus === opt
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                  : 'bg-[#050505] border border-[#171717] text-[#8a8a8a] hover:text-[#cfcfcf]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Top 5 Style Cards */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1.5">
          Top 5 Hook Styles:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
          {styleCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setPitchStyle(card.id)}
              className={`p-2 rounded-xl text-left border transition-all ${
                pitchStyle === card.id
                  ? 'bg-[#171717] border-emerald-500/50 shadow-sm'
                  : 'bg-[#050505] border-[#171717] hover:border-[#242424]'
              }`}
            >
              <span className={`text-[11px] font-bold block ${pitchStyle === card.id ? 'text-emerald-300' : 'text-white'}`}>
                {card.id}. {card.title}
              </span>
              <span className="text-[10px] text-[#7e7e7e] line-clamp-2 mt-0.5 leading-tight">
                {card.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editable Subject (Email mode only) */}
      {outreachChannel === 'email' && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e] block mb-1">
            Subject Line:
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#050505] border border-[#1c1c1c] focus:border-sky-500/50 rounded-[12px] px-3 py-1.5 text-xs text-white outline-none font-medium"
          />
        </div>
      )}

      {/* Editable Pitch Body Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[#7e7e7e]">
            {outreachChannel === 'whatsapp' ? 'WhatsApp Message Draft:' : 'Email Body Draft:'}
          </label>
          <span className="text-[10px] font-mono text-[#7e7e7e]">
            {body.length} characters · {body.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className="w-full bg-[#050505] border border-[#1c1c1c] focus:border-emerald-500/50 rounded-2xl p-3 text-xs text-[#cfcfcf] outline-none resize-none font-mono leading-relaxed"
        />
      </div>

      {/* Action Buttons: Copy, Open in App, Log Contacted */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#141414]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] bg-[#141414] hover:bg-[#1c1c1c] text-white text-xs font-semibold transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#8a8a8a]" />}
            <span>{isCopied ? 'Copied to Clipboard' : 'Copy Pitch'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenApp}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all ${
              outreachChannel === 'whatsapp'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in {outreachChannel === 'whatsapp' ? 'WhatsApp' : 'Mail App'}</span>
          </button>
        </div>

        {/* Log Contacted Button */}
        <button
          type="button"
          onClick={() => setIsOutreachModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-[12px] bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 text-xs font-semibold transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Log Contacted</span>
        </button>
      </div>
    </div>
  );
}
