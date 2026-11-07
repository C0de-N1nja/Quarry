import React, { useState, useEffect } from 'react';
import { 
  X, Zap, ShieldCheck, Mail, Send, Copy, ExternalLink, 
  Smartphone, Clock, CheckCircle2, AlertTriangle, AlertCircle, 
  Loader2, Globe, Phone, Linkedin, Twitter, Instagram, Facebook,
  Layout, Sparkles, Monitor, MessageSquare, Check, RefreshCw,
  Camera, FileText, Printer, MessageCircle, Crown, Search
} from 'lucide-react';
import AgentProgress from './boardui/AgentProgress';

export default function LeadDrawer({ lead, onClose, onRefreshLead, onQueueUpdated }) {
  const [activeTab, setActiveTab] = useState(lead?.initialTab || 'pitch'); // 'osint', 'pitch', 'mockup', 'sequence'
  const [loading, setLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [manualOwnerName, setManualOwnerName] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Deep detail states
  const isNoWebsiteLead = lead?.has_no_website === 1 || !lead?.website;
  const showcaseNiche = lead?.showcase_niche || 'roofing';
  const prototypePath = isNoWebsiteLead ? `/showcase/${showcaseNiche}` : `/mockup/${lead?.id}`;

  const [detail, setDetail] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedAngle, setSelectedAngle] = useState(isNoWebsiteLead ? 'no_website_showcase' : 'speed_mobile');
  const [renderedPitch, setRenderedPitch] = useState({ subject: '', body: '' });
  const [smartSchedule, setSmartSchedule] = useState(null);

  // Category 4: Sequence & Stage States
  const [sequenceStep, setSequenceStep] = useState(lead?.sequence_step || 1);
  const [sequencePreview, setSequencePreview] = useState(null);
  const [selectedSequenceStep, setSelectedSequenceStep] = useState(2);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [currentLeadStatus, setCurrentLeadStatus] = useState(lead?.status || 'discovered');
  const [dealValue, setDealValue] = useState(lead?.deal_value || 1000);

  // Mockup states
  const [mockup, setMockup] = useState(null);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupStyle, setMockupStyle] = useState('modern');
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' or 'mobile'
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [phoneScanning, setPhoneScanning] = useState(false);
  const [holeheScanning, setHoleheScanning] = useState(false);

  // Fetch lead details and templates
  const fetchLeadDetail = async () => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMockup = async () => {
    try {
      const res = await fetch(`/api/mockup/${lead.id}`);
      const data = await res.json();
      if (data.success && data.mockup) {
        setMockup(data.mockup);
        if (data.mockup.template_style) setMockupStyle(data.mockup.template_style);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateMockup = async (style = mockupStyle) => {
    setMockupLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/mockup/${lead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_style: style })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setMockup(data.mockup);
      setMockupStyle(style);
      setIframeKey(Date.now());
      setActionMsg('Website prototype generated successfully!');
      setTimeout(() => setActionMsg(null), 3000);
      generatePreview(selectedAngle);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate mockup');
    } finally {
      setMockupLoading(false);
    }
  };

  const handleCopyMockupLink = () => {
    const url = `${window.location.origin}${prototypePath}`;
    navigator.clipboard.writeText(url);
    setActionMsg('Live prototype link copied to clipboard!');
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}${prototypePath}`;
    const phone = lead.phone ? lead.phone.replace(/[^\d]/g, '') : '';
    const text = encodeURIComponent(
      isNoWebsiteLead
        ? `Hi ${lead.business_name}, I saw your great reviews on Google Maps and noticed you don't have a website yet. I prepared a live preview reference for your business with an instant quote calculator: ${url}`
        : `Hi ${lead.business_name}, I saw your great reviews on Google Maps and built a fast mobile preview website for your business with an instant quote calculator: ${url}`
    );
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const generatePreview = async (angle) => {
    try {
      const res = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_angle: angle, lead_id: lead.id })
      });
      const data = await res.json();
      if (data.success) {
        setRenderedPitch({
          subject: data.rendered.subject,
          body: data.rendered.body
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSmartSchedule = async () => {
    try {
      const res = await fetch(`/api/outreach/smart-schedule/${lead.id}`);
      const data = await res.json();
      if (data.success) {
        setSmartSchedule(data.schedule);
      }
    } catch (err) {
      console.error('Failed to fetch smart schedule', err);
    }
  };

  const handleUpdateStage = async (newStatus, newDealValue = dealValue) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, deal_value: newDealValue })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentLeadStatus(newStatus);
        setDealValue(newDealValue);
        setActionMsg(`Pipeline stage updated to "${newStatus}"!`);
        if (onRefreshLead) onRefreshLead();
      }
    } catch (err) {
      console.error('Failed to update lead stage', err);
    }
  };

  const handleLoadSequencePreview = async (step) => {
    setSequenceLoading(true);
    setSelectedSequenceStep(step);
    try {
      const res = await fetch(`/api/sequence/preview/${lead.id}?step=${step}`);
      const data = await res.json();
      if (data.success) {
        setSequencePreview(data.preview);
      }
    } catch (err) {
      console.error('Failed to load sequence preview', err);
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleStageSequence = async (step = selectedSequenceStep) => {
    setSequenceLoading(true);
    try {
      const res = await fetch(`/api/sequence/stage/${lead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Step ${step} follow-up staged in Outbox!`);
        setSequenceStep(data.advancedToStep || step);
        await fetchLeadDetail();
        if (onRefreshLead) onRefreshLead();
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSequenceLoading(false);
    }
  };

  useEffect(() => {
    if (lead) {
      if (lead.initialTab) setActiveTab(lead.initialTab);
      fetchLeadDetail();
      fetchTemplates();
      generatePreview(selectedAngle);
      fetchMockup();
      fetchSmartSchedule();
    }
  }, [lead]);

  const handleAngleChange = (angle) => {
    setSelectedAngle(angle);
    generatePreview(angle);
  };

  const handleScanPhone = async () => {
    setPhoneScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/scan-phone`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(`Phone verified: ${data.intel.phone_type || 'Standard'} • ${data.intel.carrier || 'Active Carrier'}`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to scan phone intelligence');
    } finally {
      setPhoneScanning(false);
    }
  };

  const handleScanHolehe = async () => {
    setHoleheScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/scan-holehe`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(`Holehe scan complete: ${data.accounts?.length || 0} registered platforms found.`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to scan Holehe accounts');
    } finally {
      setHoleheScanning(false);
    }
  };

  // Re-run OSINT
  const handleRunOsint = async () => {
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/osint/${lead.id}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg('OSINT contact enrichment completed!');
      await fetchLeadDetail();
      generatePreview(selectedAngle);
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      setErrorMsg(err.message || 'OSINT enrichment failed');
    } finally {
      setLoading(false);
    }
  };

  // Run Owner Deep-OSINT (Person Pivot)
  const handleRunOwnerOsint = async () => {
    setOwnerLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/osint/owner/${lead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerName: manualOwnerName.trim() || undefined })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(`Owner Person Pivot completed: Found ${data.dossier?.owner_name || 'Owner Intel'}!`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
    } catch (err) {
      setErrorMsg(err.message || 'Owner OSINT enrichment failed');
    } finally {
      setOwnerLoading(false);
    }
  };

  // 1-Click Send via SMTP
  const handleSendViaSmtp = async () => {
    const emailToSend = detail?.contact?.email || lead.email;
    if (!emailToSend) {
      return setErrorMsg('Cannot send: No verified recipient email found for this lead');
    }

    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);

    try {
      const res = await fetch('/api/outreach/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          recipient_email: emailToSend,
          recipient_name: detail?.contact?.contact_name || lead.business_name,
          subject: renderedPitch.subject,
          body: renderedPitch.body,
          template_angle: selectedAngle
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to dispatch email');

      setActionMsg(`Email successfully dispatched via SMTP to ${emailToSend}!`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      if (onQueueUpdated) onQueueUpdated();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stage in Outbox Queue (supports smart timezone scheduling)
  const handleQueueInOutbox = async (useSmartSchedule = false) => {
    const emailToSend = detail?.contact?.email || lead.email;
    if (!emailToSend) {
      return setErrorMsg('Cannot queue: No recipient email found');
    }

    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);

    try {
      const scheduledAt = useSmartSchedule && smartSchedule ? smartSchedule.scheduled_at_utc : null;
      const res = await fetch('/api/outreach/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          recipient_email: emailToSend,
          recipient_name: detail?.contact?.contact_name || lead.business_name,
          subject: renderedPitch.subject,
          body: renderedPitch.body,
          template_angle: selectedAngle,
          scheduled_at: scheduledAt
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(
        scheduledAt 
          ? `🕒 Smart Scheduled for ${smartSchedule.human_local_time}!` 
          : 'Pitch queued in Outbox!'
      );
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      if (onQueueUpdated) onQueueUpdated();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopyPitch = () => {
    const fullText = `Subject: ${renderedPitch.subject}\n\n${renderedPitch.body}`;
    navigator.clipboard.writeText(fullText);
    setActionMsg('Pitch copied to clipboard!');
    setTimeout(() => setActionMsg(null), 2500);
  };

  // Open in Mail Client
  const handleOpenMailto = () => {
    const emailToSend = detail?.contact?.email || lead.email || '';
    const subject = encodeURIComponent(renderedPitch.subject);
    const body = encodeURIComponent(renderedPitch.body);
    window.location.href = `mailto:${emailToSend}?subject=${subject}&body=${body}`;
  };

  const currentLead = detail?.lead || lead;
  const contact = detail?.contact;

  let parsedHolehe = [];
  let parsedSocial = {};
  let parsedOsintEvidence = null;
  let parsedSocialProfiles = [];

  if (contact?.holehe_results) {
    if (Array.isArray(contact.holehe_results)) {
      parsedHolehe = contact.holehe_results;
    } else {
      try { parsedHolehe = JSON.parse(contact.holehe_results); } catch {}
    }
  } else if (currentLead?.holehe_results) {
    if (Array.isArray(currentLead.holehe_results)) {
      parsedHolehe = currentLead.holehe_results;
    } else {
      try { parsedHolehe = JSON.parse(currentLead.holehe_results); } catch {}
    }
  }
  if (contact?.social_links) {
    try { parsedSocial = JSON.parse(contact.social_links); } catch {}
  }
  if (currentLead?.osint_evidence) {
    try { parsedOsintEvidence = JSON.parse(currentLead.osint_evidence); } catch {}
  }
  if (currentLead?.social_profiles) {
    try { parsedSocialProfiles = JSON.parse(currentLead.social_profiles); } catch {}
  }
  let parsedGravatar = null;
  if (contact?.gravatar_data) {
    try { parsedGravatar = typeof contact.gravatar_data === 'string' ? JSON.parse(contact.gravatar_data) : contact.gravatar_data; } catch {}
  }
  let ownerDossier = null;
  if (parsedOsintEvidence?.owner_dossier) {
    try {
      ownerDossier = typeof parsedOsintEvidence.owner_dossier === 'string'
        ? JSON.parse(parsedOsintEvidence.owner_dossier)
        : parsedOsintEvidence.owner_dossier;
    } catch {}
  }
  const personalEmails = Array.isArray(ownerDossier?.personal_emails)
    ? ownerDossier.personal_emails
    : (typeof ownerDossier?.personal_emails === 'string' && ownerDossier.personal_emails ? [ownerDossier.personal_emails] : []);
  const workPermutations = Array.isArray(ownerDossier?.work_permutations)
    ? ownerDossier.work_permutations
    : (Array.isArray(ownerDossier?.work_email_permutations) ? ownerDossier.work_email_permutations : []);
  const personalSocials = (ownerDossier?.personal_socials && typeof ownerDossier.personal_socials === 'object')
    ? ownerDossier.personal_socials
    : {};
  const sherlockProfiles = Array.isArray(ownerDossier?.sherlock_profiles)
    ? ownerDossier.sherlock_profiles
    : [];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-surface-0/95 dark:bg-surface-0/95 backdrop-blur-xl border-l border-border-subtle shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-start justify-between bg-surface-1/60 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
                {currentLead.business_name}
              </h2>
              <select
                value={currentLeadStatus}
                onChange={(e) => handleUpdateStage(e.target.value)}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 uppercase focus:outline-none cursor-pointer"
              >
                <option value="discovered">Discovered</option>
                <option value="enriched">Enriched</option>
                <option value="pitched">Pitched</option>
                <option value="sent">Sent</option>
                <option value="replied">In Discussion</option>
                <option value="won">Deal Won 🏆</option>
              </select>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ${(dealValue || 1000).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
              <span>{currentLead.category || 'General'}</span>
              {currentLead.city && <span>• {currentLead.city}</span>}
              {currentLead.website && (
                <a
                  href={currentLead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline font-mono text-[11px]"
                >
                  <span className="truncate max-w-[150px]">{currentLead.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Phone Intelligence Pill & Opt-Out Indicator */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {currentLead.phone && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-2 border border-border-subtle text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <a href={`tel:${currentLead.phone}`} className="hover:underline">{currentLead.phone}</a>
                  {currentLead.phone_type ? (
                    <span className={`text-[10px] font-sans px-1.5 py-0.2 rounded font-medium ${
                      currentLead.phone_type.includes('Mobile')
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {currentLead.phone_type} {currentLead.carrier ? `• ${currentLead.carrier}` : ''}
                    </span>
                  ) : (
                    <button
                      onClick={handleScanPhone}
                      disabled={phoneScanning}
                      className="ml-1 text-[10px] text-brand hover:underline font-sans font-medium flex items-center gap-0.5 touch-manipulation cursor-pointer"
                      title="Scan phone line type via PhoneInfoga"
                    >
                      {phoneScanning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Smartphone className="h-2.5 w-2.5" />}
                      <span>Classify</span>
                    </button>
                  )}
                </div>
              )}
              {Boolean(currentLead.opted_out) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                  <AlertCircle className="h-3 w-3" />
                  <span>Opted-Out (RFC 8058)</span>
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-lg hover:bg-surface-2 touch-manipulation cursor-pointer shrink-0"
            title="Close Drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center overflow-x-auto no-scrollbar sm:grid sm:grid-cols-4 border-b border-border-subtle bg-surface-1 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`px-3 sm:px-0 py-3 text-center flex items-center justify-center gap-1 transition-colors whitespace-nowrap touch-manipulation cursor-pointer ${
              activeTab === 'pitch' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-2/60 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Pitch</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('sequence');
              if (!sequencePreview) handleLoadSequencePreview(Math.min((sequenceStep || 1) + 1, 3));
            }}
            className={`px-3 sm:px-0 py-3 text-center flex items-center justify-center gap-1 transition-colors whitespace-nowrap touch-manipulation cursor-pointer ${
              activeTab === 'sequence' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-surface-2/60 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Drip ({sequenceStep}/3)</span>
          </button>
          <button
            onClick={() => setActiveTab('mockup')}
            className={`px-3 sm:px-0 py-3 text-center flex items-center justify-center gap-1 transition-colors whitespace-nowrap touch-manipulation cursor-pointer ${
              activeTab === 'mockup' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 bg-surface-2/60 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Mockup {mockup ? '✓' : ''}</span>
          </button>
          <button
            onClick={() => setActiveTab('osint')}
            className={`px-3 sm:px-0 py-3 text-center flex items-center justify-center gap-1 transition-colors whitespace-nowrap touch-manipulation cursor-pointer ${
              activeTab === 'osint' ? 'text-gray-900 dark:text-white border-b-2 border-brand bg-surface-2/60 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>OSINT {contact?.email || currentLead.website_status ? '✓' : ''}</span>
          </button>
        </div>

      {/* Alerts */}
      {actionMsg && (
        <div className="mx-5 mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mx-5 mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: PITCH & OUTREACH */}
        {activeTab === 'pitch' && (
          <div className="space-y-4">
            {/* Sales Framework Angles */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Select Outreach Angle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { id: 'no_website_showcase', label: '🌐 No-Website Showcase', desc: 'Pre-built laptop prototype reference' },
                  { id: 'security_form_leak', label: '🛡️ Form & Security Leaks', desc: 'Missing HSTS & CRM auto-reply' },
                  { id: 'mockup_pitch', label: '🎨 Pre-Built Mockup', desc: 'Share live prototype' },
                  { id: 'speed_mobile', label: '⚡ Mobile Speed Flaw', desc: 'Bounce rates & mobile loss' },
                  { id: 'booking_leak', label: '📅 Booking / Lead Leak', desc: 'Static form drop-off' },
                  { id: 'tech_modernize', label: '🛠️ Modernize Backend', desc: 'Node.js & API revamp' },
                  { id: 'social_presence', label: '📱 Social-to-Web Bridge', desc: 'Convert social followers into web clients' }
                ].map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => handleAngleChange(angle.id)}
                    className={`p-2 text-left rounded-lg border transition-all text-xs ${
                      selectedAngle === angle.id
                        ? 'border-brand bg-brand/10 text-brand dark:text-white font-medium shadow-sm shadow-brand/20'
                        : 'border-border-subtle bg-surface-2/60 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-border-hover'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{angle.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{angle.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient / Outreach Channel Snapshot */}
            <div className="p-3 rounded-lg bg-surface-2 border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 font-mono text-[10px] uppercase block">Primary Outreach Channel:</span>
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  {contact?.email ? (
                    <>
                      <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{contact.contact_name || lead.business_name} ({contact.email})</span>
                    </>
                  ) : (contact?.whatsapp || currentLead?.whatsapp) ? (
                    <>
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>WhatsApp Direct Outreach ({contact?.phone || currentLead?.phone || 'Available'})</span>
                    </>
                  ) : currentLead?.phone ? (
                    <>
                      <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Direct Voice Call ({currentLead.phone})</span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">No contact discovered yet</span>
                  )}
                </span>
              </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {contact?.email_type === 'decision_maker' && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Verified Owner
                    </span>
                  )}
                  {(contact?.whatsapp || currentLead?.whatsapp) && (
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                  {/* Discovered Social Channel Direct Buttons */}
                  {parsedSocialProfiles && parsedSocialProfiles.length > 0 && parsedSocialProfiles.map((sp, idx) => (
                    <a
                      key={idx}
                      href={sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-surface-1 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 flex items-center gap-1 shadow-2xs transition-all"
                      title={`Open ${sp.platform}`}
                    >
                      {sp.platform === 'facebook' && <Facebook className="h-3 w-3 text-blue-500" />}
                      {sp.platform === 'instagram' && <Instagram className="h-3 w-3 text-pink-500" />}
                      {sp.platform === 'linkedin' && <Linkedin className="h-3 w-3 text-sky-500" />}
                      {sp.platform === 'twitter' && <Twitter className="h-3 w-3 text-gray-500" />}
                      <span className="capitalize">{sp.platform}</span>
                      <ExternalLink className="h-2 w-2 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>

            {/* Timezone-Aware Smart Delivery Window */}
            {smartSchedule && (
              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">Target Timezone:</span>
                      <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-surface-2 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {smartSchedule.timezone_label}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Next High-Converting B2B Window: <span className="text-indigo-600 dark:text-indigo-400 font-medium">{smartSchedule.human_local_time}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQueueInOutbox(true)}
                  disabled={loading || !contact?.email}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20"
                  title="Queue outreach to automatically dispatch at 9:30 AM local time"
                >
                  <Clock className="h-3 w-3" />
                  <span>Smart Schedule</span>
                </button>
              </div>
            )}

            {Boolean(currentLead.opted_out) && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Recipient Opted Out:</span> This contact unsubscribed via the RFC 8058 1-click header. Outbound pitches to this lead are paused to protect your sender domain reputation.
                </div>
              </div>
            )}

            {/* Editable Pitch Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Line</label>
              <input
                type="text"
                value={renderedPitch.subject}
                onChange={(e) => setRenderedPitch({ ...renderedPitch, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white font-mono"
              />
            </div>

            {/* Editable Pitch Body */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cold Email Body</label>
              <textarea
                rows={11}
                value={renderedPitch.body}
                onChange={(e) => setRenderedPitch({ ...renderedPitch, body: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg bg-surface-2 border border-border-subtle focus:border-brand focus:outline-none text-gray-900 dark:text-white font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>RFC 8058 1-Click Unsubscribe Header Injected</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400">Spintax Anti-Spam Active</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contact?.email ? (
                <button
                  onClick={handleSendViaSmtp}
                  disabled={loading || Boolean(currentLead.opted_out)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50 transition-colors shadow-sm shadow-brand/30 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>1-Click Send</span>
                </button>
              ) : (contact?.whatsapp || currentLead?.whatsapp) ? (
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm shadow-emerald-600/30 cursor-pointer"
                  title="Direct 1-click WhatsApp outreach"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp Pitch</span>
                </button>
              ) : currentLead?.phone ? (
                <a
                  href={`tel:${currentLead.phone}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
                  title={`Dial ${currentLead.phone}`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Line</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface-2 text-gray-400 border border-border-subtle opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>No Contact</span>
                </button>
              )}

              <button
                onClick={handleQueueInOutbox}
                disabled={loading || !contact?.email || Boolean(currentLead.opted_out)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 disabled:opacity-50 transition-colors"
                title={!contact?.email ? "Queueing requires email" : "Queue in Outbox"}
              >
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span>Queue in Outbox</span>
              </button>

              <button
                onClick={handleCopyPitch}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-gray-400" />
                <span>Copy Text</span>
              </button>

              {(contact?.whatsapp || currentLead?.whatsapp) ? (
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                  title="Open WhatsApp in new tab"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Open WhatsApp</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenMailto}
                  disabled={!contact?.email}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  <span>Open in Mail</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: MULTI-STEP FOLLOW-UP SEQUENCE (DRIP CADENCE) */}
        {activeTab === 'sequence' && (
          <div className="space-y-4">
            {/* Cadence Header */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span>3-Step Automated Follow-Up Drip Cadence</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">
                  Step {sequenceStep}/3
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
                Over 70% of high-ticket B2B deals close on the 1st or 2nd follow-up. This cadence keeps you top-of-mind with respectful, high-value touches without being spammy.
              </p>
            </div>

            {/* 3 Step Pipeline Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Step 1 */}
              <div className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                sequenceStep >= 1 ? 'border-brand/40 bg-brand/5' : 'border-border-subtle bg-surface-2'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand">Step 1</span>
                    <span className="text-[9px] font-mono text-gray-400">Day 1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Initial Value Pitch</h4>
                  <p className="text-[10px] text-gray-500">Full audit or live website prototype offer.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-500 font-medium">✓ Dispatched</span>
                </div>
              </div>

              {/* Step 2 */}
              <div 
                onClick={() => handleLoadSequencePreview(2)}
                className={`p-3 rounded-lg border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                  selectedSequenceStep === 2
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                    : sequenceStep >= 2
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border-subtle bg-surface-2 hover:border-indigo-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-500">Step 2</span>
                    <span className="text-[9px] font-mono text-gray-400">+4 Days</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">2-Sentence Bump</h4>
                  <p className="text-[10px] text-gray-500">Casual follow-up on original prototype/audit.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px]">
                  <span className={sequenceStep >= 2 ? 'text-emerald-500 font-medium' : 'text-indigo-500 font-medium'}>
                    {sequenceStep >= 2 ? '✓ Sent' : 'Preview Step 2 →'}
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div 
                onClick={() => handleLoadSequencePreview(3)}
                className={`p-3 rounded-lg border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                  selectedSequenceStep === 3
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                    : sequenceStep >= 3
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border-subtle bg-surface-2 hover:border-indigo-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-500">Step 3</span>
                    <span className="text-[9px] font-mono text-gray-400">+8 Days</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Polite Breakup</h4>
                  <p className="text-[10px] text-gray-500">Removes pressure & leaves portfolio URL.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px]">
                  <span className={sequenceStep >= 3 ? 'text-emerald-500 font-medium' : 'text-indigo-500 font-medium'}>
                    {sequenceStep >= 3 ? '✓ Sent' : 'Preview Step 3 →'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sequence Email Editor */}
            {sequenceLoading ? (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-xs">Synthesizing follow-up copy...</p>
              </div>
            ) : sequencePreview ? (
              <div className="space-y-3 p-4 rounded-xl bg-surface-2 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Follow-Up Copy: Step {selectedSequenceStep}</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    Recipient: {sequencePreview.recipient_email || 'No email set'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                  <input
                    type="text"
                    value={sequencePreview.subject}
                    onChange={(e) => setSequencePreview({ ...sequencePreview, subject: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Body</label>
                  <textarea
                    rows={9}
                    value={sequencePreview.body}
                    onChange={(e) => setSequencePreview({ ...sequencePreview, body: e.target.value })}
                    className="w-full p-3 text-xs rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono leading-relaxed focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${sequencePreview.subject}\n\n${sequencePreview.body}`);
                      setActionMsg('Follow-up copy copied to clipboard!');
                      setTimeout(() => setActionMsg(null), 2500);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                    <span>Copy Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStageSequence(selectedSequenceStep)}
                    disabled={sequenceLoading || !sequencePreview.recipient_email}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Stage Step {selectedSequenceStep} in Outbox</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}



        {/* TAB 3: OSINT INTELLIGENCE DOSSIER */}
        {activeTab === 'osint' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">OSINT Intelligence Dossier</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Automated social website verification & contact enrichment</p>
              </div>
              <button
                onClick={handleRunOsint}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                <span>{(contact || currentLead.website_status) ? 'Re-Run OSINT' : 'Run OSINT Enrichment'}</span>
              </button>
            </div>

            {/* Live Autonomous Agent Progress Runner */}
            {(loading || ownerLoading) && (
              <AgentProgress
                status="running"
                title={ownerLoading ? "Owner Deep-OSINT Agent (Person Pivot)" : "Autonomous OSINT Intelligence Agent"}
                currentStepIndex={ownerLoading ? 2 : 1}
                steps={ownerLoading ? [
                  { label: "Secretary of State & Licensing", desc: "Querying municipal & state registers" },
                  { label: "About Page & Masthead Extraction", desc: "Parsing verified officer names" },
                  { label: "Holehe & Account Verification", desc: "Checking registered social accounts" },
                  { label: "Dossier Synthesis", desc: "Compiling decision maker contacts" }
                ] : [
                  { label: "DNS & Domain Probe", desc: "Checking MX records and HTTP responsiveness" },
                  { label: "Social Linkage Map", desc: "Discovering Facebook, Instagram, WhatsApp" },
                  { label: "Phone Line Intelligence", desc: "PhoneInfoga carrier and line type check" },
                  { label: "Contact Deliverability", desc: "Verifying active email inbox and MX" }
                ]}
                logs={[
                  `[INIT] Starting pipeline for "${currentLead.business_name}" (${currentLead.city || 'Local'})`,
                  ownerLoading
                    ? `[AGENT] Probing licensing database and corporate officers for ${manualOwnerName || 'verified owner'}...`
                    : `[AGENT] Checking website status, DNS records, and discovering social footprints...`,
                  `[STREAM] Awaiting network enrichment payloads...`
                ]}
              />
            )}

            {/* 1. Website Verification Decision Card (Tri-State) */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              currentLead.website_status === 'no_website' 
                ? 'bg-emerald-500/5 border-emerald-500/25' 
                : currentLead.website_status === 'has_website'
                ? 'bg-rose-500/5 border-rose-500/25'
                : currentLead.website_status === 'uncertain'
                ? 'bg-amber-500/5 border-amber-500/25'
                : 'bg-surface-2 border-border-subtle'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {currentLead.website_status === 'no_website' ? (
                    <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  ) : currentLead.website_status === 'has_website' ? (
                    <span className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <Globe className="h-4 w-4" />
                    </span>
                  ) : currentLead.website_status === 'uncertain' ? (
                    <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-surface-3 text-gray-500">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Website Status</span>
                    <span className={`text-xs font-semibold ${
                      currentLead.website_status === 'no_website'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : currentLead.website_status === 'has_website'
                        ? 'text-rose-600 dark:text-rose-400'
                        : currentLead.website_status === 'uncertain'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {currentLead.website_status === 'no_website' && 'Verified: No Website Found ✓'}
                      {currentLead.website_status === 'has_website' && 'Verified: Active Website Found'}
                      {currentLead.website_status === 'uncertain' && 'Verification Inconclusive / Uncertain'}
                      {!currentLead.website_status && 'Unverified (Run OSINT to Verify)'}
                    </span>
                  </div>
                </div>

                {currentLead.website_status === 'no_website' && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Prime Outreach Prospect
                  </span>
                )}
                {currentLead.website_status === 'has_website' && (parsedOsintEvidence?.verified_site || currentLead.website) && (
                  <a
                    href={parsedOsintEvidence?.verified_site || currentLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline"
                  >
                    <span className="truncate max-w-[200px]">{(parsedOsintEvidence?.verified_site || currentLead.website).replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Explanatory Reason */}
              {parsedOsintEvidence?.reason && (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-surface-1/50 p-2.5 rounded-lg border border-border-subtle/40">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Evidence: </span>
                  {parsedOsintEvidence.reason}
                </p>
              )}

              {/* Audit Timestamp */}
              {parsedOsintEvidence?.checked_at && (
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                  <Clock className="h-3 w-3" />
                  <span>Verified on {new Date(parsedOsintEvidence.checked_at).toLocaleString()}</span>
                </div>
              )}

              {/* Candidate Domains Probed Trail */}
              {parsedOsintEvidence?.candidate_domains && parsedOsintEvidence.candidate_domains.length > 0 && (
                <div className="pt-2 border-t border-border-subtle/50 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Probed Domain Checks</span>
                  <div className="space-y-1">
                    {parsedOsintEvidence.candidate_domains.map((cd, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-1 border border-border-subtle/40">
                        <span className="font-mono text-gray-800 dark:text-gray-200 truncate max-w-[220px]">{cd.domain}</span>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                          <span className={`px-1.5 py-0.5 rounded ${cd.dns ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                            DNS {cd.dns ? '✓' : '✗'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${cd.http ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                            HTTP {cd.statusCode || 'Err'}
                          </span>
                          {cd.isParked && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Parked
                            </span>
                          )}
                          {cd.isTemplatePlaceholder && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Template
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Owner Deep-OSINT Dossier (Person Pivot) */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/5 to-surface-2 border border-amber-500/25 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Crown className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                        Owner Deep-OSINT (Person Pivot)
                      </h4>
                      {ownerDossier ? (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          {ownerDossier.confidence === 'high' ? 'High Confidence ✓' : 'Enriched'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">
                          Ready to Pivot
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Bypasses gatekeepers: hunts owner's direct cell phone, personal emails & private socials
                    </p>
                  </div>
                </div>

                {/* Hunt Owner Trigger */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Owner name (optional)"
                    value={manualOwnerName}
                    onChange={(e) => setManualOwnerName(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-surface-1 border border-border-subtle focus:border-amber-500/50 outline-none w-36 sm:w-44 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleRunOwnerOsint}
                    disabled={ownerLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs shadow-amber-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    {ownerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                    <span>{ownerLoading ? 'Hunting...' : (ownerDossier ? 'Re-Hunt Owner' : 'Hunt Owner')}</span>
                  </button>
                </div>
              </div>

              {/* Dossier Body */}
              {ownerDossier ? (
                <div className="space-y-3 pt-2 border-t border-amber-500/15">
                  {/* Identity Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-1/70 border border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">
                        {(ownerDossier.owner_name || 'O').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {ownerDossier.owner_name || 'Owner Discovered'}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            ({ownerDossier.owner_title || 'Owner / Principal'})
                          </span>
                        </div>
                        {ownerDossier.discovery_source && (
                          <span className="text-[10px] font-mono text-gray-400">
                            Source: {ownerDossier.discovery_source}
                          </span>
                        )}
                      </div>
                    </div>
                    {ownerDossier.primary_email && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Direct Inbox ✓
                      </span>
                    )}
                  </div>

                  {/* Direct Contact Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Direct Mobile / Cell Phone */}
                    <div className="p-2.5 rounded-lg bg-surface-1/70 border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-gray-400">Direct Mobile / Cell</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          ownerDossier.phone_type?.includes('Mobile')
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-surface-3 text-gray-500'
                        }`}>
                          {ownerDossier.phone_type || 'Landline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="font-mono font-medium text-gray-900 dark:text-white">
                          {ownerDossier.personal_mobile || contact?.phone || currentLead?.phone || 'No direct phone'}
                        </span>
                        {ownerDossier.phone_carrier && (
                          <span className="text-[10px] text-gray-400 font-mono truncate max-w-[100px]">
                            {ownerDossier.phone_carrier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Personal Email (@gmail, etc) */}
                    <div className="p-2.5 rounded-lg bg-surface-1/70 border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-gray-400">Personal Direct Email</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Personal Inbox
                        </span>
                      </div>
                      <div className="pt-0.5">
                        {personalEmails.length > 0 ? (
                          <div className="space-y-0.5">
                            {personalEmails.map((pem, idx) => (
                              <div key={idx} className="font-mono font-medium text-purple-600 dark:text-purple-400 truncate">
                                {pem}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500 text-[11px]">
                            {ownerDossier.primary_email || 'Searching personal web footprints...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Email Permutations Probed */}
                  {workPermutations.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-surface-1/70 border border-border-subtle space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="uppercase text-gray-400">Company Email Permutations</span>
                        {ownerDossier.verified_work_email && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            MX Active: {ownerDossier.verified_work_email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {workPermutations.map((perm, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              perm === ownerDossier.verified_work_email
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30'
                                : 'bg-surface-2 text-gray-600 dark:text-gray-400 border border-border-subtle'
                            }`}
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Social Profiles Found (LinkedIn, Personal FB, IG, Sherlock) */}
                  {(Object.keys(personalSocials).length > 0 || sherlockProfiles.length > 0) && (
                    <div className="p-2.5 rounded-lg bg-surface-1/70 border border-border-subtle space-y-1.5">
                      <span className="text-[10px] uppercase font-mono text-gray-400 block">Personal Social Footprint</span>
                      <div className="flex flex-wrap gap-1.5">
                        {personalSocials.linkedin && (
                          <a
                            href={personalSocials.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 border border-blue-500/20"
                          >
                            <Linkedin className="h-3 w-3" />
                            <span>Owner LinkedIn</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {personalSocials.facebook && (
                          <a
                            href={personalSocials.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-500/20 border border-indigo-500/20"
                          >
                            <Facebook className="h-3 w-3" />
                            <span>Personal FB</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {personalSocials.instagram && (
                          <a
                            href={personalSocials.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-medium hover:bg-pink-500/20 border border-pink-500/20"
                          >
                            <Instagram className="h-3 w-3" />
                            <span>Personal IG</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {sherlockProfiles.map((sp, idx) => (
                          <a
                            key={idx}
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-3 text-gray-700 dark:text-gray-300 text-xs font-mono hover:bg-surface-4 border border-border-subtle"
                          >
                            <span>{sp.platform}</span>
                            <ExternalLink className="h-2.5 w-2.5 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-surface-1/40 border border-dashed border-border-subtle text-center space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    No Person-Pivot Dossier generated yet.
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Click <strong>"Hunt Owner"</strong> above to extract the owner's identity, private mobile cell line, personal Gmail/Yahoo, and social footprints.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Discovered Social Profiles & Bio Links */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-brand" />
                  <span>Discovered Social Profiles & Bio Links</span>
                </p>
                <span className="text-[10px] font-mono text-gray-400">
                  {(parsedSocialProfiles?.length || 0) + (Object.keys(parsedSocial || {}).length > 0 && !parsedSocialProfiles?.length ? Object.keys(parsedSocial).length : 0)} found
                </span>
              </div>

              {/* Profiles Grid */}
              {((parsedSocialProfiles && parsedSocialProfiles.length > 0) || (parsedSocial && Object.keys(parsedSocial).length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedSocialProfiles && parsedSocialProfiles.length > 0 ? (
                    parsedSocialProfiles.map((p, idx) => (
                      <a
                        key={idx}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle hover:border-brand/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 rounded bg-surface-2 text-brand shrink-0">
                            {p.platform === 'facebook' && <Facebook className="h-3.5 w-3.5 text-indigo-500" />}
                            {p.platform === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                            {p.platform === 'linkedin' && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                            {p.platform === 'twitter' && <Twitter className="h-3.5 w-3.5 text-sky-500" />}
                            {p.platform !== 'facebook' && p.platform !== 'instagram' && p.platform !== 'linkedin' && p.platform !== 'twitter' && (
                              <Globe className="h-3.5 w-3.5 text-purple-500" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-gray-900 dark:text-white capitalize block truncate">
                              {p.platform}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate block">
                              {p.handle || (p.url ? String(p.url).replace(/^https?:\/\/(www\.)?/, '') : '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-brand shrink-0 ml-1" />
                      </a>
                    ))
                  ) : (
                    Object.entries(parsedSocial)
                      .filter(([network, url]) => url && typeof url === 'string' && !['personal_email', 'work_email'].includes(network))
                      .map(([network, url]) => (
                      <a
                        key={network}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle hover:border-brand/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 rounded bg-surface-2 text-brand shrink-0 capitalize">
                            {network === 'facebook' && <Facebook className="h-3.5 w-3.5 text-indigo-500" />}
                            {network === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                            {network === 'linkedin' && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                            {network === 'twitter' && <Twitter className="h-3.5 w-3.5 text-sky-500" />}
                            {network !== 'facebook' && network !== 'instagram' && network !== 'linkedin' && network !== 'twitter' && (
                              <Globe className="h-3.5 w-3.5 text-purple-500" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-gray-900 dark:text-white capitalize block truncate">
                              {network}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate block">
                              {String(url).replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-brand shrink-0 ml-1" />
                      </a>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No social profiles discovered yet.</p>
              )}

              {/* Bio Links Extracted */}
              {parsedOsintEvidence?.bio_links_extracted && parsedOsintEvidence.bio_links_extracted.length > 0 && (
                <div className="pt-2 border-t border-border-subtle/50 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Links Extracted From Bios</span>
                  <div className="space-y-1">
                    {parsedOsintEvidence.bio_links_extracted.map((bl, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded bg-surface-1 border border-border-subtle/40">
                        <span className="text-gray-500 truncate max-w-[200px]">{bl.sourceProfile || 'Bio'}:</span>
                        <a href={bl.url} target="_blank" rel="noopener noreferrer" className="font-mono text-brand hover:underline truncate max-w-[220px]">
                          {bl.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Decision Maker & Deliverability Card */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {contact?.avatar_url ? (
                    <img
                      src={contact.avatar_url}
                      alt={contact.contact_name || 'Owner'}
                      className="h-10 w-10 rounded-full object-cover border-2 border-brand/30 shadow-xs shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-surface-3 border border-border-subtle flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold text-sm shrink-0">
                      {(contact?.contact_name || currentLead.business_name || 'O').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {contact?.contact_name || 'Owner / Principal'}
                      </p>
                      {contact?.avatar_url && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Gravatar ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {contact?.contact_title || (parsedGravatar?.jobTitle ? `${parsedGravatar.jobTitle}${parsedGravatar.company ? ` at ${parsedGravatar.company}` : ''}` : 'Decision Maker')}
                    </p>
                  </div>
                </div>
                {contact?.email_type === 'decision_maker' && (
                  <span className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Direct Founder / Executive
                  </span>
                )}
              </div>

              {parsedGravatar?.aboutMe && (
                <div className="text-[11px] text-gray-600 dark:text-gray-300 bg-surface-1 p-2 rounded-lg border border-border-subtle/40 italic">
                  "{parsedGravatar.aboutMe}"
                </div>
              )}

              <div className="pt-2 border-t border-border-subtle/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Primary Email:</span>
                  <span className="font-mono text-gray-900 dark:text-white font-medium">{contact?.email || 'None discovered'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Domain MX Deliverability:</span>
                  <span className={contact?.is_mx_valid ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                    {contact?.is_mx_valid ? 'Active Mail Server (MX Valid ✓)' : (contact?.email ? 'Invalid MX / Non-deliverable' : 'Pending Verification')}
                  </span>
                </div>

                {(contact?.phone || currentLead?.phone) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Direct Phone:</span>
                    <span className="font-mono text-gray-900 dark:text-white font-medium">{contact?.phone || currentLead.phone}</span>
                  </div>
                )}
              </div>

              {/* 1-Click WhatsApp Quick Action */}
              {(currentLead.phone || contact?.phone) && (
                <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp Direct</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Chat on WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Phone & Carrier Intelligence (PhoneInfoga) */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  <span>Phone & Carrier Intelligence (PhoneInfoga)</span>
                </p>
                {currentLead.phone && (
                  <button
                    onClick={handleScanPhone}
                    disabled={phoneScanning}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface-3 hover:bg-surface-4 text-gray-700 dark:text-gray-200 border border-border-subtle transition-colors cursor-pointer"
                  >
                    {phoneScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span>{currentLead.phone_type ? 'Re-Scan Line' : 'Scan Carrier'}</span>
                  </button>
                )}
              </div>

              {currentLead.phone ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle space-y-1">
                    <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-mono block">Line Type</span>
                    <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                      <span>{currentLead.phone_type || 'Unclassified (Click Scan Carrier)'}</span>
                      {currentLead.phone_type?.includes('Mobile') && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          SMS Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">E.164: {currentLead.phone_e164 || currentLead.phone}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle space-y-1">
                    <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-mono block">Carrier / Provider</span>
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {currentLead.carrier || 'Pending PhoneInfoga scan'}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {currentLead.phone_type?.includes('Mobile') ? 'Suitable for WhatsApp / SMS follow-ups' : 'Commercial Voice Line'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No phone number associated with this prospect record.</p>
              )}
            </div>

            {/* 5. Holehe Verified Accounts */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-brand" />
                  <span>Holehe Account Verification</span>
                </p>
                {(contact?.email || currentLead.email) && (
                  <button
                    onClick={handleScanHolehe}
                    disabled={holeheScanning}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface-3 hover:bg-surface-4 text-gray-700 dark:text-gray-200 border border-border-subtle transition-colors cursor-pointer"
                  >
                    {holeheScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span>{parsedHolehe.length > 0 ? 'Re-Scan Accounts' : 'Scan Accounts'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Services registered with this email address (proves real active human inbox):
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedHolehe.length > 0 ? (
                  parsedHolehe.map((svc, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {svc} ✓
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">No external accounts verified via holehe</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INSTANT MOCKUP PROTOTYPE */}
        {activeTab === 'mockup' && (
          <div className="space-y-4">
            {/* Header & Style Picker */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>{isNoWebsiteLead ? 'Laptop Niche Showcase Prototype' : 'Instant Website Prototype'}</span>
                    </h3>
                    {isNoWebsiteLead ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Pre-Built Showcase: {showcaseNiche} ✓
                      </span>
                    ) : mockup ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Generated & Live ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Not Generated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isNoWebsiteLead 
                      ? 'Pre-built high-converting laptop prototype matched to business category for no-website leads'
                      : '1-Click landing page with interactive quote calculator and Google reviews'}
                  </p>
                </div>

                {/* Regenerate Button */}
                <button
                  onClick={() => handleGenerateMockup(mockupStyle)}
                  disabled={mockupLoading}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors shadow-sm shadow-purple-600/20"
                >
                  {mockupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span>{mockup ? 'Regenerate Mockup' : 'Generate Mockup'}</span>
                </button>
              </div>

              {/* Template Style Selector */}
              <div className="pt-2 border-t border-border-subtle/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Theme:</span>
                  {[
                    { id: 'modern', label: 'Dark Slate' },
                    { id: 'clean', label: 'Apple White' },
                    { id: 'contractor', label: 'Navy & Gold' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setMockupStyle(s.id);
                        handleGenerateMockup(s.id);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                        mockupStyle === s.id
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold'
                          : 'border-border-subtle bg-surface-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Device Frame Viewport Toggle */}
                <div className="flex items-center gap-1 bg-surface-1 p-0.5 rounded-lg border border-border-subtle text-xs">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      previewDevice === 'desktop'
                        ? 'bg-surface-3 text-gray-900 dark:text-white font-medium shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      previewDevice === 'mobile'
                        ? 'bg-surface-3 text-gray-900 dark:text-white font-medium shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Share Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href={prototypePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-purple-500" />
                <span>Open in Tab ↗</span>
              </a>

              <button
                onClick={handleCopyMockupLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-purple-500" />
                <span>Copy Demo Link</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                <span>WhatsApp Pitch</span>
              </button>

              <button
                onClick={() => {
                  const targetAngle = isNoWebsiteLead ? 'no_website_showcase' : 'mockup_pitch';
                  setSelectedAngle(targetAngle);
                  generatePreview(targetAngle);
                  setActiveTab('pitch');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-purple-500" />
                <span>Email Pitch →</span>
              </button>
            </div>

            {/* Interactive Preview Container */}
            <div className="p-3 rounded-xl bg-surface-2/60 border border-border-subtle flex flex-col items-center justify-center min-h-[500px]">
              {previewDevice === 'mobile' ? (
                /* Mobile Phone Shell Frame */
                <div className="w-[340px] h-[580px] bg-gray-900 rounded-[36px] border-4 border-gray-700 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col relative">
                  {/* Speaker Notch */}
                  <div className="w-full bg-gray-900 py-1 flex justify-center items-center">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full"></div>
                  </div>
                  <iframe
                    key={`mobile-${iframeKey}`}
                    src={prototypePath}
                    title="Mobile Prototype Preview"
                    className="w-full flex-1 border-0 bg-black"
                  />
                  {/* Home Bar */}
                  <div className="w-full bg-gray-900 py-1.5 flex justify-center items-center">
                    <div className="w-24 h-1 bg-gray-600 rounded-full"></div>
                  </div>
                </div>
              ) : (
                /* Desktop Browser Frame */
                <div className="w-full h-[540px] rounded-lg border border-border-subtle bg-surface-1 overflow-hidden flex flex-col shadow-inner">
                  {/* Browser Bar */}
                  <div className="px-3 py-2 bg-surface-3/80 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <div className="px-4 py-0.5 rounded-md bg-surface-1 border border-border-subtle text-[11px] font-mono text-gray-500 dark:text-gray-400 w-1/2 text-center truncate">
                      {window.location.origin}{prototypePath}
                    </div>
                    <div className="w-8"></div>
                  </div>
                  <iframe
                    key={`desktop-${iframeKey}`}
                    src={prototypePath}
                    title="Desktop Prototype Preview"
                    className="w-full flex-1 border-0"
                  />
                </div>
              )}
            </div>

            {/* Quick Pitch Snippet Helper */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle text-xs space-y-1.5">
              <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>💬</span>
                <span>Direct WhatsApp / SMS Outreach Script</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-mono text-[11px] bg-surface-1 p-2.5 rounded-lg border border-border-subtle">
                Hi {lead.business_name}, I saw your {lead.reviews_count || 'great'} reviews on Google Maps. Built a quick modern mobile preview site for you with an instant quote estimator: {window.location.origin}/mockup/{lead.id}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
