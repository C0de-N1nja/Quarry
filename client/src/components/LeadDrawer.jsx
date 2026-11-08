import React, { useState, useEffect } from 'react';
import { 
  RiFlashlightFill, RiFlashlightFill as Zap,
  RiMailLine, RiMailLine as Mail,
  RiTimeLine, RiTimeLine as Clock,
  RiSparklingLine, RiSparklingLine as Sparkles,
  RiShieldCheckLine, RiShieldCheckLine as ShieldCheck,
  RiExternalLinkLine, RiExternalLinkLine as ExternalLink,
  RiPhoneLine, RiPhoneLine as Phone,
  RiSendPlaneFill, RiSendPlaneFill as Send,
  RiFileCopyLine, RiFileCopyLine as Copy,
  RiDeleteBin6Line,
  RiRefreshLine, RiRefreshLine as RefreshCw,
  RiMessage3Line, RiMessage3Line as MessageSquare,
  RiUserSharedLine,
  RiCheckboxCircleLine, RiCheckboxCircleLine as CheckCircle2,
  RiCloseLine, RiCloseLine as X,
  RiSmartphoneLine, RiSmartphoneLine as Smartphone,
  RiAlertLine, RiAlertLine as AlertTriangle,
  RiErrorWarningLine, RiErrorWarningLine as AlertCircle,
  RiLoader4Line, RiLoader4Line as Loader2,
  RiGlobalLine, RiGlobalLine as Globe,
  RiLinkedinBoxFill, RiLinkedinBoxFill as Linkedin,
  RiTwitterXLine, RiTwitterXLine as Twitter,
  RiInstagramLine, RiInstagramLine as Instagram,
  RiFacebookBoxFill, RiFacebookBoxFill as Facebook,
  RiLayoutGridLine, RiLayoutGridLine as Layout,
  RiComputerLine, RiComputerLine as Monitor,
  RiCheckLine, RiCheckLine as Check,
  RiCameraLine, RiCameraLine as Camera,
  RiFileTextLine, RiFileTextLine as FileText,
  RiPrinterLine, RiPrinterLine as Printer,
  RiWhatsappLine, RiWhatsappLine as MessageCircle,
  RiVipCrownLine, RiVipCrownLine as Crown,
  RiSearchLine, RiSearchLine as Search,
  RiFingerprintLine,
  RiServerLine,
  RiLockLine,
  RiMailCheckLine,
  RiSpeedUpLine,
  RiArrowDownSLine
} from '@remixicon/react';
import { Drawer } from '@/components/base/drawer/drawer';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';
import AgentProgress from './boardui/AgentProgress';

export default function LeadDrawer({ lead, onClose, onRefreshLead, onQueueUpdated, onOpenAudit }) {
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
  const [whatsappVerifying, setWhatsappVerifying] = useState(false);
  const [blackbirdScanning, setBlackbirdScanning] = useState(false);
  const [harvesterScanning, setHarvesterScanning] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [socialResolveLoading, setSocialResolveLoading] = useState(false);
  const [socialResolveReport, setSocialResolveReport] = useState(null);

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

  const handleVerifyWhatsApp = async () => {
    setWhatsappVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/verify-whatsapp`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.whatsapp?.is_whatsapp_registered) {
        setActionMsg(`WhatsApp verified: Active account${data.whatsapp.is_business ? ' (Business)' : ''}`);
      } else {
        setActionMsg(`WhatsApp status: ${data.whatsapp?.phone_e164 || 'Ready for outreach'}`);
      }
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify WhatsApp');
    } finally {
      setWhatsappVerifying(false);
    }
  };

  const handleScanBlackbird = async () => {
    setBlackbirdScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/scan-blackbird`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(`Blackbird scan complete: ${data.blackbird?.total_found || 0} social accounts discovered.`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to scan Blackbird accounts');
    } finally {
      setBlackbirdScanning(false);
    }
  };

  const handleScanHarvester = async () => {
    setHarvesterScanning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/scan-harvester`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setActionMsg(`theHarvester recon complete: ${data.harvester?.subdomains_count || 0} subdomains and ${data.harvester?.emails_count || 0} emails discovered.`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to scan domain with theHarvester');
    } finally {
      setHarvesterScanning(false);
    }
  };

  const handleVerifyEmail = async () => {
    setEmailVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/verify-email`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const status = data.emailVerification?.reachability || 'verified';
      setActionMsg(`Email verification complete: ${status.toUpperCase()} (${data.emailVerification?.mx_accepts_mail ? 'MX Valid' : 'No MX'}).`);
      await fetchLeadDetail();
      if (onRefreshLead) onRefreshLead();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify email deliverability');
    } finally {
      setEmailVerifying(false);
    }
  };

  // Re-run OSINT
  const handleRunOsint = async () => {
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/osint/${lead.id}?force=true`, { method: 'POST' });
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

  // Run Social Account Resolution from email address
  const handleResolveSocials = async () => {
    const ownerDossier = parsedOsintEvidence?.owner_dossier;
    const targetEmail = ownerDossier?.primary_email || detail?.contact?.email || lead.email;
    if (!targetEmail) {
      return setErrorMsg('No email address available to resolve social accounts');
    }
    setSocialResolveLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/osint/social-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          leadId: lead.id,
          groundTruth: {
            owner_name: ownerDossier?.owner_name || detail?.contact?.contact_name,
            business_name: lead.business_name,
            website: lead.website,
            city: lead.city
          }
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSocialResolveReport(data.report);
      setActionMsg(`Social Resolution: ${data.report.matches.length} matches, ${data.report.registered_platforms.length} platforms detected.`);
    } catch (err) {
      setErrorMsg(err.message || 'Social Account Resolution failed');
    } finally {
      setSocialResolveLoading(false);
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
          ? `Smart Scheduled for ${smartSchedule.human_local_time}!` 
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
  const blackbirdAccounts = Array.isArray(parsedOsintEvidence?.blackbird_results?.accounts)
    ? parsedOsintEvidence.blackbird_results.accounts
    : (Array.isArray(ownerDossier?.blackbird_profiles) ? ownerDossier.blackbird_profiles : []);
  const whatsAppIntel = parsedOsintEvidence?.whatsapp_intel || ownerDossier?.whatsapp || null;
  const isWhatsAppVerified = !!(whatsAppIntel?.is_whatsapp_registered || contact?.whatsapp);
  const harvesterIntel = parsedOsintEvidence?.harvester_intel || null;
  const harvesterSubdomains = Array.isArray(harvesterIntel?.subdomains) ? harvesterIntel.subdomains : [];
  const harvesterEmails = Array.isArray(harvesterIntel?.emails) ? harvesterIntel.emails : [];

  let emailIntel = null;
  if (contact?.email_intel) {
    try { emailIntel = typeof contact.email_intel === 'string' ? JSON.parse(contact.email_intel) : contact.email_intel; } catch {}
  }
  const emailDeliverability = contact?.email_deliverability || emailIntel?.reachability || null;
  const isEmailDeliverable = emailDeliverability === 'safe' || emailIntel?.is_deliverable;

  let auditSummary = null;
  if (currentLead?.audit_summary) {
    try {
      auditSummary = typeof currentLead.audit_summary === 'string' ? JSON.parse(currentLead.audit_summary) : currentLead.audit_summary;
    } catch {}
  }

  // Pipeline Dependency DAG & Gating States
  const hasDomain = Boolean(currentLead.website && !isNoWebsiteLead);
  const hasPhone = Boolean(currentLead.phone || contact?.phone);
  const hasOwner = Boolean(contact?.contact_name || ownerDossier?.owner_name);
  const hasEmail = Boolean(contact?.email || currentLead.email);
  const hasHandle = Boolean((contact?.email && contact.email.includes('@')) || hasOwner);
  const hasVerifiedChannel = Boolean(contact?.is_mx_valid || isWhatsAppVerified || hasPhone);

  const pipelineSteps = [
    {
      id: 'domain',
      label: 'Domain / Web',
      status: hasDomain ? (harvesterSubdomains.length > 0 ? 'completed' : 'ready') : (isNoWebsiteLead ? 'completed' : 'ready')
    },
    {
      id: 'phone',
      label: 'Phone Intel',
      status: !hasPhone ? 'locked' : (currentLead.phone_type && currentLead.phone_type !== 'unknown' ? 'completed' : 'ready')
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      status: !hasPhone ? 'locked' : (isWhatsAppVerified ? 'completed' : 'ready')
    },
    {
      id: 'owner',
      label: 'Decision Maker',
      status: hasOwner ? 'completed' : 'ready'
    },
    {
      id: 'email',
      label: 'Email & Inboxes',
      status: !hasEmail ? 'locked' : (parsedHolehe.length > 0 ? 'completed' : 'ready')
    },
    {
      id: 'deliverability',
      label: 'Email Deliverability',
      status: !hasEmail ? 'locked' : (emailDeliverability ? 'completed' : 'ready')
    },
    {
      id: 'social',
      label: 'Social Footprint',
      status: !hasHandle ? 'locked' : (blackbirdAccounts.length > 0 ? 'completed' : 'ready')
    },
    {
      id: 'outreach',
      label: 'Pitch Ready',
      status: (renderedPitch?.subject && hasVerifiedChannel) ? 'completed' : (hasVerifiedChannel ? 'ready' : 'locked')
    }
  ];

  const completedStepsCount = pipelineSteps.filter(s => s.status === 'completed').length;
  const readinessPercent = Math.round((completedStepsCount / pipelineSteps.length) * 100);
  const readinessColor = readinessPercent >= 75 ? 'lime' : readinessPercent >= 50 ? 'indigo' : 'yellow';

  return (
    <Drawer
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      placement="end"
      size="lg"
      aria-label="Lead Dossier and Pitch Synthesis"
      className="p-0 gap-0 overflow-hidden flex flex-col h-full bg-background-primary-default border-l border-separator-border text-text-primary shadow-2xl"
    >
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-separator-border flex items-start justify-between bg-background-secondary-default gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-semibold text-text-primary tracking-tight truncate max-w-[200px] sm:max-w-none">
              {currentLead.business_name}
            </h2>
            <div className="relative inline-flex items-center">
              <select
                value={currentLeadStatus}
                onChange={(e) => handleUpdateStage(e.target.value)}
                className="appearance-none text-[10px] font-mono font-medium pl-2 pr-5 py-0.5 rounded-full bg-background-tertiary-default text-text-primary border border-separator-border uppercase focus:outline-none cursor-pointer hover:border-accent-500/50 transition-colors"
              >
                <option value="discovered">Discovered</option>
                <option value="enriched">Enriched</option>
                <option value="pitched">Pitched</option>
                <option value="sent">Sent</option>
                <option value="replied">In Discussion</option>
                <option value="won">Deal Won</option>
              </select>
              <RiArrowDownSLine className="pointer-events-none absolute right-1 size-3 text-text-tertiary" />
            </div>
            <Chip variant="bold" color="lime">
              ${(dealValue || 1000).toLocaleString()}
            </Chip>
            <Chip 
              variant="bold" 
              color={readinessColor} 
              className="font-mono text-[10px]" 
              title={`${completedStepsCount} of ${pipelineSteps.length} pipeline steps verified`}
            >
              {readinessPercent}% Pitch Ready
            </Chip>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-secondary mt-1 flex-wrap">
            <span>{currentLead.category || 'General'}</span>
            {currentLead.city && <span>• {currentLead.city}</span>}
            {currentLead.website && (
              <a
                href={currentLead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent-500 hover:underline font-mono text-[11px]"
              >
                <span className="truncate max-w-[150px]">{currentLead.website.replace(/^https?:\/\//, '')}</span>
                <RiExternalLinkLine className="size-3" />
              </a>
            )}
          </div>

          {/* Phone Intelligence Pill & Opt-Out Indicator */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {currentLead.phone && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background-tertiary-default border border-separator-border text-text-secondary font-mono text-[11px]">
                <RiPhoneLine className="size-3 text-foreground-icon-secondary" />
                <a href={`tel:${currentLead.phone}`} className="hover:underline">{currentLead.phone}</a>
                {currentLead.phone_type && currentLead.phone_type !== 'unknown' ? (
                  <Chip variant="subtle" color={currentLead.phone_type.includes('Mobile') ? "emerald" : "blue"} size="sm">
                    {currentLead.phone_type} {currentLead.carrier && currentLead.carrier !== 'unknown' ? `• ${currentLead.carrier}` : ''}
                  </Chip>
                ) : (
                  <Button
                    onClick={handleScanPhone}
                    disabled={phoneScanning}
                    variant="link"
                    size="small"
                    leadingIcon={phoneScanning ? Loader2 : Smartphone}
                    className="p-0 h-auto text-[10px] text-accent-500 font-sans font-medium"
                    title="Scan phone line type via PhoneInfoga"
                  >
                    Classify
                  </Button>
                )}
              </div>
            )}
            {Boolean(currentLead.opted_out) && (
              <Chip variant="subtle" color="rose" size="sm">
                <AlertCircle className="h-3 w-3" />
                <span>Opted-Out (RFC 8058)</span>
              </Chip>
            )}
          </div>
        </div>
        <CloseButton 
          size="md"
          onClick={onClose} 
          aria-label="Close Dossier"
        />
      </div>

      {/* Tabs Bar using BoardUI PillTabList */}
      <div className="px-4 py-2 border-b border-separator-border bg-background-secondary-default shrink-0">
        <PillTabList className="w-full flex justify-between sm:justify-start gap-1 overflow-x-auto no-scrollbar">
          <PillTab
            variant="blue"
            icon={RiMailLine}
            isSelected={activeTab === 'pitch'}
            onSelect={() => setActiveTab('pitch')}
          >
            Pitch
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiTimeLine}
            isSelected={activeTab === 'sequence'}
            onSelect={() => {
              setActiveTab('sequence');
              if (!sequencePreview) handleLoadSequencePreview(Math.min((sequenceStep || 1) + 1, 3));
            }}
          >
            Drip ({sequenceStep}/3)
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiSparklingLine}
            isSelected={activeTab === 'mockup'}
            onSelect={() => setActiveTab('mockup')}
          >
            Mockup {mockup ? '(Ready)' : ''}
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiShieldCheckLine}
            isSelected={activeTab === 'osint'}
            onSelect={() => setActiveTab('osint')}
          >
            OSINT {contact?.email || currentLead.website_status ? '(Verified)' : ''}
          </PillTab>
        </PillTabList>
      </div>

      {/* Pipeline Dependency Flow Tracker */}
      <div className="px-4 py-2 bg-background-primary-default border-b border-separator-border/60 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 text-[11px] font-sans min-w-max">
          <span className="text-[10px] uppercase font-mono tracking-wider text-text-tertiary mr-1 font-semibold">
            Pipeline:
          </span>
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              {idx > 0 && <span className="text-text-tertiary/40">›</span>}
              <div 
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  step.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : step.status === 'ready'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-background-tertiary-default text-text-tertiary/60 border border-separator-border/40'
                }`}
                title={
                  step.status === 'completed' 
                    ? `${step.label}: Verified & Complete` 
                    : step.status === 'ready' 
                    ? `${step.label}: Prerequisites Met (Ready to Run)` 
                    : `${step.label}: Locked (Prerequisites pending)`
                }
              >
                {step.status === 'completed' ? (
                  <Check className="size-2.5 text-emerald-400" />
                ) : step.status === 'ready' ? (
                  <RiFlashlightFill className="size-2.5 text-blue-400" />
                ) : (
                  <RiLockLine className="size-2.5 opacity-60" />
                )}
                <span>{step.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
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
              <label className="block text-xs font-mono uppercase tracking-wider text-text-tertiary mb-2">
                Select Outreach Angle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { id: 'no_website_showcase', label: 'No-Website Showcase', desc: 'Pre-built laptop prototype reference' },
                  { id: 'security_form_leak', label: 'Form & Security Leaks', desc: 'Missing HSTS & CRM auto-reply' },
                  { id: 'mockup_pitch', label: 'Pre-Built Mockup', desc: 'Share live prototype' },
                  { id: 'speed_mobile', label: 'Mobile Speed Flaw', desc: 'Bounce rates & mobile loss' },
                  { id: 'booking_leak', label: 'Booking / Lead Leak', desc: 'Static form drop-off' },
                  { id: 'tech_modernize', label: 'Modernize Backend', desc: 'Node.js & API revamp' },
                  { id: 'social_presence', label: 'Social-to-Web Bridge', desc: 'Convert social followers into web clients' }
                ].map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => handleAngleChange(angle.id)}
                    className={`p-2.5 text-left rounded-xl border transition-all text-xs cursor-pointer ${
                      selectedAngle === angle.id
                        ? 'border-accent-500 bg-accent-500/10 text-accent-500 font-medium shadow-sm'
                        : 'border-separator-border bg-background-secondary-default text-text-secondary hover:text-text-primary hover:border-border-button-hover'
                    }`}
                  >
                    <div className="font-semibold text-text-primary">{angle.label}</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">{angle.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient / Outreach Channel Snapshot */}
            <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div>
                <span className="text-text-tertiary font-mono text-[10px] uppercase block">Primary Outreach Channel:</span>
                <span className="font-semibold text-text-primary flex items-center gap-1.5 mt-0.5">
                  {contact?.email ? (
                    <>
                      <Mail className="h-3.5 w-3.5 text-accent-500 shrink-0" />
                      <span>{contact.contact_name || lead.business_name} ({contact.email})</span>
                    </>
                  ) : (contact?.whatsapp || currentLead?.whatsapp) ? (
                    <>
                      <MessageCircle className="h-3.5 w-3.5 text-success-primary shrink-0" />
                      <span>WhatsApp Direct Outreach ({contact?.phone || currentLead?.phone || 'Available'})</span>
                    </>
                  ) : currentLead?.phone ? (
                    <>
                      <Phone className="h-3.5 w-3.5 text-success-primary shrink-0" />
                      <span>Direct Voice Call ({currentLead.phone})</span>
                    </>
                  ) : (
                    <span className="text-text-tertiary italic">No contact discovered yet</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {contact?.email_type === 'decision_maker' && (
                  <Chip variant="subtle" color="emerald" size="sm">
                    Verified Owner
                  </Chip>
                )}
                {(contact?.whatsapp || currentLead?.whatsapp) && (
                  <Button
                    type="button"
                    onClick={handleShareWhatsApp}
                    variant="whatsapp"
                    size="small"
                    leadingIcon={MessageCircle}
                  >
                    WhatsApp
                  </Button>
                )}
                {/* Discovered Social Channel Direct Buttons */}
                {parsedSocialProfiles && parsedSocialProfiles.length > 0 && parsedSocialProfiles.map((sp, idx) => {
                  const plat = sp.platform?.toLowerCase();
                  const icon = plat === 'facebook' ? Facebook 
                    : plat === 'instagram' ? Instagram 
                    : plat === 'linkedin' ? Linkedin 
                    : Twitter;
                  const variant = plat === 'facebook' ? 'facebook' 
                    : plat === 'instagram' ? 'instagram' 
                    : plat === 'linkedin' ? 'linkedin' 
                    : 'twitter';

                  return (
                    <ButtonLink
                      key={idx}
                      href={sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant={variant}
                      leadingIcon={icon}
                      trailingIcon={ExternalLink}
                      title={`Open ${sp.platform}`}
                    >
                      <span className="capitalize">{sp.platform}</span>
                    </ButtonLink>
                  );
                })}
              </div>
            </div>

            {/* Timezone-Aware Smart Delivery Window */}
            {smartSchedule && (
              <div className="p-3.5 rounded-xl bg-accent-500/5 border border-accent-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-accent-500/10 text-accent-500 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">Target Timezone:</span>
                      <Chip variant="subtle" color="blue" size="sm">
                        {smartSchedule.timezone_label}
                      </Chip>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Next High-Converting B2B Window: <span className="text-accent-500 font-medium">{smartSchedule.human_local_time}</span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => handleQueueInOutbox(true)}
                  disabled={loading || !contact?.email}
                  variant="primary"
                  size="small"
                  leadingIcon={Clock}
                  className="shrink-0"
                  title="Queue outreach to automatically dispatch at 9:30 AM local time"
                >
                  Smart Schedule
                </Button>
              </div>
            )}

            {Boolean(currentLead.opted_out) && (
              <div className="p-3 rounded-xl bg-danger-primary/10 border border-danger-primary/30 text-danger-primary text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <span className="font-semibold">Recipient Opted Out:</span> This contact unsubscribed via the RFC 8058 1-click header. Outbound pitches to this lead are paused to protect your sender domain reputation.
                </div>
              </div>
            )}

            {/* Editable Pitch Subject */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Subject Line</label>
              <input
                type="text"
                value={renderedPitch.subject}
                onChange={(e) => setRenderedPitch({ ...renderedPitch, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background-secondary-default border border-separator-border focus:border-accent-500 focus:outline-none text-text-primary font-mono"
              />
            </div>

            {/* Editable Pitch Body */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Cold Email Body</label>
              <textarea
                rows={11}
                value={renderedPitch.body}
                onChange={(e) => setRenderedPitch({ ...renderedPitch, body: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background-secondary-default border border-separator-border focus:border-accent-500 focus:outline-none text-text-primary font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1">
                <span className="flex items-center gap-1 text-success-primary font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>RFC 8058 1-Click Unsubscribe Header Injected</span>
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">Spintax Anti-Spam Active</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-separator-border grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contact?.email ? (
                <Button
                  onClick={handleSendViaSmtp}
                  disabled={loading || Boolean(currentLead.opted_out)}
                  variant="primary"
                  size="small"
                  leadingIcon={loading ? Loader2 : Send}
                >
                  1-Click Send
                </Button>
              ) : (contact?.whatsapp || currentLead?.whatsapp) ? (
                <Button
                  onClick={handleShareWhatsApp}
                  variant="whatsapp"
                  size="small"
                  leadingIcon={MessageCircle}
                  title="Direct 1-click WhatsApp outreach"
                >
                  WhatsApp Pitch
                </Button>
              ) : currentLead?.phone ? (
                <ButtonLink
                  href={`tel:${currentLead.phone}`}
                  variant="phone"
                  size="small"
                  leadingIcon={Phone}
                  title={`Dial ${currentLead.phone}`}
                >
                  Call Line
                </ButtonLink>
              ) : (
                <Button
                  disabled
                  variant="secondary"
                  size="small"
                  leadingIcon={Send}
                >
                  No Contact
                </Button>
              )}

              <Button
                onClick={handleQueueInOutbox}
                disabled={loading || !contact?.email || Boolean(currentLead.opted_out)}
                variant="secondary"
                size="small"
                leadingIcon={Mail}
                title={!contact?.email ? "Queueing requires email" : "Queue in Outbox"}
              >
                Queue in Outbox
              </Button>

              <Button
                onClick={handleCopyPitch}
                variant="secondary"
                size="small"
                leadingIcon={Copy}
              >
                Copy Text
              </Button>

              {(contact?.whatsapp || currentLead?.whatsapp) ? (
                <Button
                  onClick={handleShareWhatsApp}
                  variant="whatsapp"
                  size="small"
                  leadingIcon={MessageCircle}
                  title="Open WhatsApp in new tab"
                >
                  Open WhatsApp
                </Button>
              ) : (
                <Button
                  onClick={handleOpenMailto}
                  disabled={!contact?.email}
                  variant="secondary"
                  size="small"
                  leadingIcon={ExternalLink}
                >
                  Open in Mail
                </Button>
              )}
            </div>
          </div>
        )}

        {/* TAB: MULTI-STEP FOLLOW-UP SEQUENCE (DRIP CADENCE) */}
        {activeTab === 'sequence' && (
          <div className="space-y-4">
            {/* Cadence Header */}
            <div className="p-3.5 rounded-xl bg-accent-500/10 border border-accent-500/20 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-accent-500" />
                  <span>3-Step Automated Follow-Up Drip Cadence</span>
                </span>
                <Chip variant="subtle" color="indigo" size="sm">
                  Step {sequenceStep}/3
                </Chip>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Over 70% of high-ticket B2B deals close on the 1st or 2nd follow-up. This cadence keeps you top-of-mind with respectful, high-value touches without being spammy.
              </p>
            </div>

            {/* 3 Step Pipeline Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Step 1 */}
              <div className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                sequenceStep >= 1 ? 'border-accent-500/40 bg-accent-500/5' : 'border-separator-border bg-background-secondary-default'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-accent-500">Step 1</span>
                    <span className="text-[9px] font-mono text-text-tertiary">Day 1</span>
                  </div>
                  <h4 className="font-semibold text-text-primary text-xs mb-1">Initial Value Pitch</h4>
                  <p className="text-[10px] text-text-tertiary">Full audit or live website prototype offer.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-separator-border flex items-center justify-between text-[10px]">
                  <Chip variant="subtle" color="emerald" size="sm">Dispatched</Chip>
                </div>
              </div>

              {/* Step 2 */}
              <div 
                onClick={() => handleLoadSequencePreview(2)}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                  selectedSequenceStep === 2
                    ? 'border-accent-500 bg-accent-500/10 shadow-sm'
                    : sequenceStep >= 2
                    ? 'border-success-primary/40 bg-success-primary/5'
                    : 'border-separator-border bg-background-secondary-default hover:border-accent-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-accent-500">Step 2</span>
                    <span className="text-[9px] font-mono text-text-tertiary">+4 Days</span>
                  </div>
                  <h4 className="font-semibold text-text-primary text-xs mb-1">2-Sentence Bump</h4>
                  <p className="text-[10px] text-text-tertiary">Casual follow-up on original prototype/audit.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-separator-border flex items-center justify-between text-[10px]">
                  <Chip variant="subtle" color={sequenceStep >= 2 ? "emerald" : "indigo"} size="sm">
                    {sequenceStep >= 2 ? 'Sent' : 'Preview Step 2'}
                  </Chip>
                </div>
              </div>

              {/* Step 3 */}
              <div 
                onClick={() => handleLoadSequencePreview(3)}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between cursor-pointer transition-all ${
                  selectedSequenceStep === 3
                    ? 'border-accent-500 bg-accent-500/10 shadow-sm'
                    : sequenceStep >= 3
                    ? 'border-success-primary/40 bg-success-primary/5'
                    : 'border-separator-border bg-background-secondary-default hover:border-accent-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-accent-500">Step 3</span>
                    <span className="text-[9px] font-mono text-text-tertiary">+8 Days</span>
                  </div>
                  <h4 className="font-semibold text-text-primary text-xs mb-1">Polite Breakup</h4>
                  <p className="text-[10px] text-text-tertiary">Removes pressure & leaves portfolio URL.</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-separator-border flex items-center justify-between text-[10px]">
                  <Chip variant="subtle" color={sequenceStep >= 3 ? "emerald" : "indigo"} size="sm">
                    {sequenceStep >= 3 ? 'Sent' : 'Preview Step 3'}
                  </Chip>
                </div>
              </div>
            </div>

            {/* Sequence Email Editor */}
            {sequenceLoading ? (
              <div className="h-48 flex flex-col items-center justify-center text-text-tertiary gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
                <p className="text-xs">Synthesizing follow-up copy...</p>
              </div>
            ) : sequencePreview ? (
              <div className="space-y-3 p-4 rounded-xl bg-background-secondary-default border border-separator-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent-500" />
                    <span>Follow-Up Copy: Step {selectedSequenceStep}</span>
                  </span>
                  <span className="text-[10px] font-mono text-text-tertiary">
                    Recipient: {sequencePreview.recipient_email || 'No email set'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">Subject</label>
                  <input
                    type="text"
                    value={sequencePreview.subject}
                    onChange={(e) => setSequencePreview({ ...sequencePreview, subject: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-background-primary-default border border-separator-border text-text-primary font-mono focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">Body</label>
                  <textarea
                    rows={9}
                    value={sequencePreview.body}
                    onChange={(e) => setSequencePreview({ ...sequencePreview, body: e.target.value })}
                    className="w-full p-3 text-xs rounded-lg bg-background-primary-default border border-separator-border text-text-primary font-mono leading-relaxed focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${sequencePreview.subject}\n\n${sequencePreview.body}`);
                      setActionMsg('Follow-up copy copied to clipboard!');
                      setTimeout(() => setActionMsg(null), 2500);
                    }}
                    variant="secondary"
                    size="small"
                    leadingIcon={Copy}
                  >
                    Copy Text
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleStageSequence(selectedSequenceStep)}
                    disabled={sequenceLoading || !sequencePreview.recipient_email}
                    variant="primary"
                    size="small"
                    leadingIcon={Mail}
                  >
                    Stage Step {selectedSequenceStep} in Outbox
                  </Button>
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
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">OSINT Intelligence Dossier</h3>
                <p className="text-[11px] text-text-secondary mt-0.5">Automated social website verification & contact enrichment</p>
              </div>
              <Button
                onClick={handleRunOsint}
                disabled={loading}
                variant="primary"
                size="small"
                leadingIcon={loading ? Loader2 : ShieldCheck}
              >
                {(contact || currentLead.website_status) ? 'Re-Run OSINT' : 'Run OSINT Enrichment'}
              </Button>
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
                ? 'bg-success-primary/5 border-success-primary/25' 
                : currentLead.website_status === 'has_website'
                ? 'bg-danger-primary/5 border-danger-primary/25'
                : currentLead.website_status === 'uncertain'
                ? 'bg-warning-primary/5 border-warning-primary/25'
                : 'bg-background-secondary-default border-separator-border'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {currentLead.website_status === 'no_website' ? (
                    <span className="p-1.5 rounded-lg bg-success-primary/15 text-success-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  ) : currentLead.website_status === 'has_website' ? (
                    <span className="p-1.5 rounded-lg bg-danger-primary/15 text-danger-primary">
                      <Globe className="h-4 w-4" />
                    </span>
                  ) : currentLead.website_status === 'uncertain' ? (
                    <span className="p-1.5 rounded-lg bg-warning-primary/15 text-warning-primary">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-background-tertiary-default text-text-tertiary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block">Website Status</span>
                    <span className={`text-xs font-semibold ${
                      currentLead.website_status === 'no_website'
                        ? 'text-success-primary'
                        : currentLead.website_status === 'has_website'
                        ? 'text-danger-primary'
                        : currentLead.website_status === 'uncertain'
                        ? 'text-warning-primary'
                        : 'text-text-secondary'
                    }`}>
                      {currentLead.website_status === 'no_website' && 'Verified: No Website Found'}
                      {currentLead.website_status === 'has_website' && 'Verified: Active Website Found'}
                      {currentLead.website_status === 'uncertain' && 'Verification Inconclusive / Uncertain'}
                      {!currentLead.website_status && 'Unverified (Run OSINT to Verify)'}
                    </span>
                  </div>
                </div>

                {currentLead.website_status === 'no_website' && (
                  <Chip variant="subtle" color="emerald" size="sm">
                    Prime Outreach Prospect
                  </Chip>
                )}
                {currentLead.website_status === 'has_website' && (parsedOsintEvidence?.verified_site || currentLead.website) && (
                  <a
                    href={parsedOsintEvidence?.verified_site || currentLead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-accent-500 hover:underline"
                  >
                    <span className="truncate max-w-[200px]">{(parsedOsintEvidence?.verified_site || currentLead.website).replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Explanatory Reason */}
              {parsedOsintEvidence?.reason && (
                <p className="text-xs text-text-secondary leading-relaxed bg-background-primary-default/50 p-2.5 rounded-lg border border-separator-border/60">
                  <span className="font-semibold text-text-primary">Evidence: </span>
                  {parsedOsintEvidence.reason}
                </p>
              )}

              {/* Audit Timestamp */}
              {parsedOsintEvidence?.checked_at && (
                <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono">
                  <Clock className="h-3 w-3" />
                  <span>Verified on {new Date(parsedOsintEvidence.checked_at).toLocaleString()}</span>
                </div>
              )}

              {/* Candidate Domains Probed Trail */}
              {parsedOsintEvidence?.candidate_domains && parsedOsintEvidence.candidate_domains.length > 0 && (
                <div className="pt-2 border-t border-separator-border/60 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block">Probed Domain Checks</span>
                  <div className="space-y-1">
                    {parsedOsintEvidence.candidate_domains.map((cd, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background-primary-default border border-separator-border/60">
                        <span className="font-mono text-text-primary truncate max-w-[220px]">{cd.domain}</span>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                          <Chip variant="subtle" color={cd.dns ? "emerald" : "gray"} size="sm">
                            DNS {cd.dns ? 'Active' : 'Missing'}
                          </Chip>
                          <Chip variant="subtle" color={cd.http ? "emerald" : "rose"} size="sm">
                            HTTP {cd.statusCode || 'Err'}
                          </Chip>
                          {cd.isParked && (
                            <Chip variant="subtle" color="amber" size="sm">
                              Parked
                            </Chip>
                          )}
                          {cd.isTemplatePlaceholder && (
                            <Chip variant="subtle" color="amber" size="sm">
                              Template
                            </Chip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Owner Deep-OSINT Dossier (Person Pivot) */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-warning-primary/25 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-warning-primary/15 text-warning-primary">
                    <Crown className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-text-primary">
                        Owner Deep-OSINT (Person Pivot)
                      </h4>
                      {ownerDossier ? (
                        <Chip variant="subtle" color="amber" size="sm">
                          {ownerDossier.confidence === 'high' ? 'High Confidence Verified' : 'Enriched'}
                        </Chip>
                      ) : (
                        <Chip variant="subtle" color="gray" size="sm">
                          Ready to Pivot
                        </Chip>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary">
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
                    className="px-2.5 py-1 text-xs rounded-lg bg-background-primary-default border border-separator-border focus:border-accent-500 outline-none w-36 sm:w-44 text-text-primary placeholder:text-text-tertiary font-mono"
                  />
                  <Button
                    onClick={handleRunOwnerOsint}
                    disabled={ownerLoading}
                    variant="primary"
                    size="small"
                    leadingIcon={ownerLoading ? Loader2 : Crown}
                  >
                    {ownerLoading ? 'Hunting...' : (ownerDossier ? 'Re-Hunt Owner' : 'Hunt Owner')}
                  </Button>
                </div>
              </div>

              {/* Dossier Body */}
              {ownerDossier ? (
                <div className="space-y-3 pt-2 border-t border-separator-border">
                  {/* Identity Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background-primary-default border border-separator-border">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-warning-primary/15 border border-warning-primary/30 flex items-center justify-center text-warning-primary font-bold text-xs shrink-0">
                        {(ownerDossier.owner_name || 'O').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">
                            {ownerDossier.owner_name || 'Owner Discovered'}
                          </span>
                          <span className="text-[10px] text-text-secondary">
                            ({ownerDossier.owner_title || 'Owner / Principal'})
                          </span>
                        </div>
                        {ownerDossier.discovery_source && (
                          <span className="text-[10px] font-mono text-text-tertiary">
                            Source: {ownerDossier.discovery_source}
                          </span>
                        )}
                      </div>
                    </div>
                    {ownerDossier.primary_email && (
                      <Chip variant="subtle" color="emerald" size="sm">
                        Direct Inbox Verified
                      </Chip>
                    )}
                  </div>

                  {/* Direct Contact Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Direct Mobile / Cell Phone */}
                    <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-text-tertiary">Direct Mobile / Cell</span>
                        <Chip variant="subtle" color={ownerDossier.phone_type?.includes('Mobile') ? "emerald" : "gray"} size="sm">
                          {ownerDossier.phone_type || 'Landline'}
                        </Chip>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="font-mono font-medium text-text-primary">
                          {ownerDossier.personal_mobile || contact?.phone || currentLead?.phone || 'No direct phone'}
                        </span>
                        {ownerDossier.phone_carrier && (
                          <span className="text-[10px] text-text-tertiary font-mono truncate max-w-[100px]">
                            {ownerDossier.phone_carrier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Personal Email (@gmail, etc) */}
                    <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-text-tertiary">Personal Direct Email</span>
                        <Chip variant="subtle" color="purple" size="sm">
                          Personal Inbox
                        </Chip>
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
                          <span className="font-mono text-text-tertiary text-[11px]">
                            {ownerDossier.primary_email || 'Searching personal web footprints...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Email Permutations Probed */}
                  {workPermutations.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="uppercase text-text-tertiary">Company Email Permutations</span>
                        {ownerDossier.verified_work_email && (
                          <span className="text-success-primary font-bold">
                            MX Active: {ownerDossier.verified_work_email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {workPermutations.map((perm, idx) => (
                          <Chip
                            key={idx}
                            variant="subtle"
                            color={perm === ownerDossier.verified_work_email ? "emerald" : "gray"}
                            size="sm"
                          >
                            {perm}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Social Profiles Found (LinkedIn, Personal FB, IG, Sherlock) */}
                  {(Object.keys(personalSocials).length > 0 || sherlockProfiles.length > 0) && (
                    <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1.5">
                      <span className="text-[10px] uppercase font-mono text-text-tertiary block">Personal Social Footprint</span>
                      <div className="flex flex-wrap gap-1.5">
                        {personalSocials.linkedin && (
                          <ButtonLink
                            href={personalSocials.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            variant="linkedin"
                            leadingIcon={Linkedin}
                            trailingIcon={ExternalLink}
                          >
                            Owner LinkedIn
                          </ButtonLink>
                        )}
                        {personalSocials.facebook && (
                          <ButtonLink
                            href={personalSocials.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            variant="facebook"
                            leadingIcon={Facebook}
                            trailingIcon={ExternalLink}
                          >
                            Personal FB
                          </ButtonLink>
                        )}
                        {personalSocials.instagram && (
                          <ButtonLink
                            href={personalSocials.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="xs"
                            variant="instagram"
                            leadingIcon={Instagram}
                            trailingIcon={ExternalLink}
                          >
                            Personal IG
                          </ButtonLink>
                        )}
                        {sherlockProfiles.map((sp, idx) => (
                          <a
                            key={idx}
                            href={sp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background-tertiary-default text-text-secondary text-xs font-mono hover:text-text-primary border border-separator-border"
                          >
                            <span>{sp.platform}</span>
                            <ExternalLink className="h-2.5 w-2.5 text-text-tertiary" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email Social Account Resolution (Multi-Factor Attribution) */}
                  <div className="p-3 rounded-lg bg-background-primary-default border border-separator-border space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-accent-500" />
                        <span className="text-[11px] font-bold text-text-primary uppercase font-mono tracking-wider">
                          Social Account Resolution (Email Pivot)
                        </span>
                      </div>
                      <Button
                        onClick={handleResolveSocials}
                        disabled={socialResolveLoading}
                        variant="primary"
                        size="small"
                        leadingIcon={socialResolveLoading ? Loader2 : Search}
                      >
                        {socialResolveLoading ? 'Resolving...' : 'Resolve Accounts'}
                      </Button>
                    </div>

                    <p className="text-[11px] text-text-secondary">
                      Probes platforms (GitHub, Reddit, Gravatar, X, LinkedIn) for accounts registered to <strong>{ownerDossier?.primary_email || detail?.contact?.email || lead.email || 'target email'}</strong> and verifies attribution.
                    </p>

                    {socialResolveReport && (
                      <div className="space-y-2 pt-2 border-t border-separator-border">
                        {/* Registered Platforms Detected via Holehe */}
                        {socialResolveReport.registered_platforms?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-mono text-text-tertiary mr-1">Registered:</span>
                            {socialResolveReport.registered_platforms.map((plat, idx) => (
                              <Chip key={idx} variant="subtle" color="blue" size="sm">
                                {plat}
                              </Chip>
                            ))}
                          </div>
                        )}

                        {/* Confirmed Matches */}
                        {socialResolveReport.matches?.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono uppercase font-bold text-success-primary block">
                              Confirmed & Probable Matches ({socialResolveReport.matches.length}):
                            </span>
                            {socialResolveReport.matches.map((m, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-background-secondary-default border border-separator-border flex items-start justify-between gap-2 text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-text-primary">{m.platform}</span>
                                    <span className="font-mono text-text-tertiary text-[11px]">@{m.handle}</span>
                                    <Chip
                                      variant="subtle"
                                      color={m.verdict === 'CONFIRMED_MATCH' ? "emerald" : "amber"}
                                      size="sm"
                                    >
                                      {m.confidence_score}% {m.verdict === 'CONFIRMED_MATCH' ? 'CONFIRMED' : 'PROBABLE'}
                                    </Chip>
                                  </div>
                                  {m.display_name && (
                                    <div className="text-[11px] text-text-secondary">Name: {m.display_name}</div>
                                  )}
                                  {m.evidence?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                      {m.evidence.map((ev, eIdx) => (
                                        <span key={eIdx} className="text-[9px] font-mono px-1 py-0.2 rounded bg-background-tertiary-default text-text-tertiary" title={ev.detail}>
                                          {ev.factor}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {m.profile_url && (
                                  <a href={m.profile_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-background-tertiary-default text-text-tertiary hover:text-text-primary shrink-0">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] font-mono text-text-tertiary p-2 rounded bg-background-secondary-default text-center">
                            No high-confidence matches found yet.
                          </div>
                        )}

                        {/* Ambiguous Gated Results */}
                        {socialResolveReport.ambiguous?.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                              Flagged Ambiguous Hits (Gated - Not Assumed):
                            </span>
                            <div className="space-y-1">
                              {socialResolveReport.ambiguous.map((amb, idx) => (
                                <div key={idx} className="p-1.5 rounded-lg bg-background-secondary-default border border-separator-border flex items-center justify-between text-[11px]">
                                  <span className="font-mono text-text-tertiary">{amb.platform} (@{amb.handle})</span>
                                  <Chip variant="subtle" color="amber" size="sm">
                                    Ambiguous ({amb.confidence_score}%)
                                  </Chip>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-background-primary-default/40 border border-dashed border-separator-border text-center space-y-1">
                  <p className="text-xs text-text-secondary">
                    No Person-Pivot Dossier generated yet.
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    Click <strong>"Hunt Owner"</strong> above to extract the owner's identity, private mobile cell line, personal Gmail/Yahoo, and social footprints.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Discovered Social Profiles & Bio Links */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-accent-500" />
                  <span>Discovered Social Profiles & Bio Links</span>
                </p>
                <span className="text-[10px] font-mono text-text-tertiary">
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
                        className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border hover:border-accent-500/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 rounded-lg bg-background-secondary-default text-accent-500 shrink-0">
                            {p.platform === 'facebook' && <Facebook className="h-3.5 w-3.5 text-indigo-500" />}
                            {p.platform === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                            {p.platform === 'linkedin' && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                            {p.platform === 'twitter' && <Twitter className="h-3.5 w-3.5 text-sky-500" />}
                            {p.platform !== 'facebook' && p.platform !== 'instagram' && p.platform !== 'linkedin' && p.platform !== 'twitter' && (
                              <Globe className="h-3.5 w-3.5 text-purple-500" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-text-primary capitalize block truncate">
                              {p.platform}
                            </span>
                            <span className="text-[10px] text-text-tertiary truncate block">
                              {p.handle || (p.url ? String(p.url).replace(/^https?:\/\/(www\.)?/, '') : '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-text-tertiary group-hover:text-accent-500 shrink-0 ml-1" />
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
                        className="p-2.5 rounded-xl bg-background-primary-default border border-separator-border hover:border-accent-500/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 rounded-lg bg-background-secondary-default text-accent-500 shrink-0 capitalize">
                            {network === 'facebook' && <Facebook className="h-3.5 w-3.5 text-indigo-500" />}
                            {network === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                            {network === 'linkedin' && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                            {network === 'twitter' && <Twitter className="h-3.5 w-3.5 text-sky-500" />}
                            {network !== 'facebook' && network !== 'instagram' && network !== 'linkedin' && network !== 'twitter' && (
                              <Globe className="h-3.5 w-3.5 text-purple-500" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-text-primary capitalize block truncate">
                              {network}
                            </span>
                            <span className="text-[10px] text-text-tertiary truncate block">
                              {String(url).replace(/^https?:\/\/(www\.)?/, '')}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-text-tertiary group-hover:text-accent-500 shrink-0 ml-1" />
                      </a>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-tertiary italic">No social profiles discovered yet.</p>
              )}

              {/* Bio Links Extracted */}
              {parsedOsintEvidence?.bio_links_extracted && parsedOsintEvidence.bio_links_extracted.length > 0 && (
                <div className="pt-2 border-t border-separator-border/60 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary block">Links Extracted From Bios</span>
                  <div className="space-y-1">
                    {parsedOsintEvidence.bio_links_extracted.map((bl, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-background-primary-default border border-separator-border/60">
                        <span className="text-text-secondary truncate max-w-[200px]">{bl.sourceProfile || 'Bio'}:</span>
                        <a href={bl.url} target="_blank" rel="noopener noreferrer" className="font-mono text-accent-500 hover:underline truncate max-w-[220px]">
                          {bl.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Decision Maker & Deliverability Card */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {contact?.avatar_url ? (
                    <img
                      src={contact.avatar_url}
                      alt={contact.contact_name || 'Owner'}
                      className="h-10 w-10 rounded-full object-cover border-2 border-accent-500/30 shadow-2xs shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-background-tertiary-default border border-separator-border flex items-center justify-center text-text-secondary font-semibold text-sm shrink-0">
                      {(contact?.contact_name || currentLead.business_name || 'O').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {contact?.contact_name || 'Owner / Principal'}
                      </p>
                      {contact?.avatar_url && (
                        <Chip variant="subtle" color="emerald" size="sm">
                          Gravatar Linked
                        </Chip>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">
                      {contact?.contact_title || (parsedGravatar?.jobTitle ? `${parsedGravatar.jobTitle}${parsedGravatar.company ? ` at ${parsedGravatar.company}` : ''}` : 'Decision Maker')}
                    </p>
                  </div>
                </div>
                {contact?.email_type === 'decision_maker' && (
                  <Chip variant="subtle" color="emerald" size="sm">
                    Direct Founder / Executive
                  </Chip>
                )}
              </div>

              {parsedGravatar?.aboutMe && (
                <div className="text-[11px] text-text-secondary bg-background-primary-default p-2 rounded-lg border border-separator-border/60 italic">
                  "{parsedGravatar.aboutMe}"
                </div>
              )}

              <div className="pt-2 border-t border-separator-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Primary Email:</span>
                  <span className="font-mono text-text-primary font-medium">{contact?.email || 'None discovered'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Domain MX Deliverability:</span>
                  <span className={contact?.is_mx_valid ? 'text-success-primary font-medium' : 'text-danger-primary font-medium'}>
                    {contact?.is_mx_valid ? 'Active Mail Server (MX Valid)' : (contact?.email ? 'Invalid MX / Non-deliverable' : 'Pending Verification')}
                  </span>
                </div>

                {(contact?.phone || currentLead?.phone) && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Direct Phone:</span>
                    <span className="font-mono text-text-primary font-medium">{contact?.phone || currentLead.phone}</span>
                  </div>
                )}
              </div>

              {/* 1-Click WhatsApp Quick Action & WhatsLookup Verification */}
              {(currentLead.phone || contact?.phone) && (
                <div className="pt-2 border-t border-separator-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-success-primary font-medium">
                      <RiWhatsappLine className="h-3.5 w-3.5 text-emerald-400" />
                      <span>WhatsApp Intel</span>
                    </div>
                    {isWhatsAppVerified ? (
                      <Chip variant="subtle" color="emerald" size="sm">
                        {whatsAppIntel?.is_business ? 'Business Verified' : 'Registered / Active'}
                      </Chip>
                    ) : (
                      <Chip variant="subtle" color="gray" size="sm">
                        Unverified
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      onClick={handleVerifyWhatsApp}
                      disabled={whatsappVerifying}
                      variant="secondary"
                      size="small"
                      leadingIcon={whatsappVerifying ? Loader2 : RefreshCw}
                    >
                      {isWhatsAppVerified ? 'Re-Verify (WhatsLookup)' : 'Verify (WhatsLookup)'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleShareWhatsApp}
                      variant="whatsapp"
                      size="small"
                      leadingIcon={ExternalLink}
                    >
                      Chat on WhatsApp
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Phone & Carrier Intelligence (PhoneInfoga) */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-success-primary" />
                  <span>Phone & Carrier Intelligence (PhoneInfoga)</span>
                </p>
                {currentLead.phone && (
                  <Button
                    onClick={handleScanPhone}
                    disabled={phoneScanning}
                    variant="secondary"
                    size="small"
                    leadingIcon={phoneScanning ? Loader2 : RefreshCw}
                  >
                    {currentLead.phone_type ? 'Re-Scan Line' : 'Scan Carrier'}
                  </Button>
                )}
              </div>

              {currentLead.phone ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                    <span className="text-text-secondary text-[10px] uppercase font-mono block">Line Type</span>
                    <div className="flex items-center gap-1.5 font-medium text-text-primary">
                      <span>{currentLead.phone_type || 'Unclassified (Click Scan Carrier)'}</span>
                      {currentLead.phone_type?.includes('Mobile') && (
                        <Chip variant="subtle" color="emerald" size="sm">
                          SMS Ready
                        </Chip>
                      )}
                    </div>
                    <p className="text-[10px] text-text-tertiary font-mono">E.164: {currentLead.phone_e164 || currentLead.phone}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border space-y-1">
                    <span className="text-text-secondary text-[10px] uppercase font-mono block">Carrier / Provider</span>
                    <div className="font-medium text-text-primary truncate">
                      {currentLead.carrier || 'Pending PhoneInfoga scan'}
                    </div>
                    <p className="text-[10px] text-text-tertiary">
                      {currentLead.phone_type?.includes('Mobile') ? 'Suitable for WhatsApp / SMS follow-ups' : 'Commercial Voice Line'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-tertiary italic">No phone number associated with this prospect record.</p>
              )}
            </div>

            {/* 5. Holehe Verified Accounts */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-accent-500" />
                  <span>Holehe Account Verification</span>
                </p>
                {hasEmail ? (
                  <Button
                    onClick={handleScanHolehe}
                    disabled={holeheScanning}
                    variant="secondary"
                    size="small"
                    leadingIcon={holeheScanning ? Loader2 : RefreshCw}
                  >
                    {parsedHolehe.length > 0 ? 'Re-Scan Accounts' : 'Scan Accounts'}
                  </Button>
                ) : (
                  <Button
                    disabled={true}
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLockLine}
                    title="Locked: Discover or enter decision-maker email first"
                  >
                    Locked (Needs Email)
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                Services registered with this email address (proves real active human inbox):
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedHolehe.length > 0 ? (
                  parsedHolehe.map((svc, idx) => (
                    <Chip key={idx} variant="subtle" color="emerald" size="sm">
                      {svc}
                    </Chip>
                  ))
                ) : (
                  <span className="text-xs text-text-tertiary italic">No external accounts verified via holehe</span>
                )}
              </div>
            </div>

            {/* 6. Reacher Email Deliverability (check-if-email-exists Rust Engine) */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiMailCheckLine className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-text-primary">
                    Email Deliverability (check-if-email-exists)
                  </span>
                  {emailDeliverability ? (
                    <Chip
                      variant="subtle"
                      color={
                        emailDeliverability === 'safe'
                          ? 'emerald'
                          : emailDeliverability === 'risky'
                          ? 'amber'
                          : 'rose'
                      }
                      size="sm"
                    >
                      {emailDeliverability === 'safe'
                        ? 'Safe (Deliverable)'
                        : emailDeliverability === 'risky'
                        ? 'Risky (Catch-All / Filtered)'
                        : 'Invalid / Dead Mailbox'}
                    </Chip>
                  ) : !hasEmail ? (
                    <Chip variant="subtle" color="gray" size="sm">
                      Needs Email (Locked)
                    </Chip>
                  ) : null}
                </div>
                {hasEmail ? (
                  <Button
                    onClick={handleVerifyEmail}
                    disabled={emailVerifying}
                    variant="secondary"
                    size="small"
                    leadingIcon={emailVerifying ? Loader2 : RefreshCw}
                  >
                    {emailDeliverability ? 'Re-Verify Email' : 'Verify Deliverability'}
                  </Button>
                ) : (
                  <Button
                    disabled={true}
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLockLine}
                    title="Locked: Discover or enter decision-maker email first"
                  >
                    Locked (Needs Email)
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                Rust-powered SMTP handshake, MX validation, catch-all detection, and burner email check without sending mail:
              </p>
              {emailIntel ? (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip variant="subtle" color={emailIntel.mx_accepts_mail ? 'emerald' : 'rose'} size="sm">
                      {emailIntel.mx_accepts_mail ? 'MX Valid' : 'No MX Records'}
                    </Chip>
                    {emailIntel.is_deliverable && (
                      <Chip variant="subtle" color="emerald" size="sm">
                        SMTP 250 Deliverable
                      </Chip>
                    )}
                    {emailIntel.is_catch_all && (
                      <Chip variant="subtle" color="amber" size="sm">
                        Catch-All Server
                      </Chip>
                    )}
                    {emailIntel.is_disposable && (
                      <Chip variant="subtle" color="rose" size="sm">
                        Disposable / Burner Email
                      </Chip>
                    )}
                    {emailIntel.is_role_account && (
                      <Chip variant="subtle" color="blue" size="sm">
                        Role / Alias Account
                      </Chip>
                    )}
                    <span className="text-[10px] text-text-tertiary">
                      Verified via {emailIntel.verified_via || 'Rust Engine'}
                    </span>
                  </div>
                  {emailIntel.mx_records?.length > 0 && (
                    <div className="text-[10px] text-text-tertiary truncate">
                      Primary MX: <code className="text-text-secondary">{emailIntel.mx_records[0]}</code>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-text-tertiary italic">
                  No email deliverability check executed yet (Click 'Verify Deliverability')
                </span>
              )}
            </div>

            {/* 7. Blackbird OSINT Footprint (574+ Networks) */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiFingerprintLine className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-text-primary">
                    Blackbird Social Footprint (574+ Networks)
                  </span>
                  {blackbirdAccounts.length > 0 && (
                    <Chip variant="subtle" color="emerald" size="sm">
                      {blackbirdAccounts.length} Discovered
                    </Chip>
                  )}
                </div>
                {hasHandle ? (
                  <Button
                    onClick={handleScanBlackbird}
                    disabled={blackbirdScanning}
                    variant="secondary"
                    size="small"
                    leadingIcon={blackbirdScanning ? Loader2 : RefreshCw}
                  >
                    {blackbirdAccounts.length > 0 ? 'Re-Scan Blackbird' : 'Scan Blackbird'}
                  </Button>
                ) : (
                  <Button
                    disabled={true}
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLockLine}
                    title="Locked: Owner name or email handle required to derive candidate username"
                  >
                    Locked (Needs Handle)
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                Autonomous multi-network enumeration of owner personal accounts across 574+ social and tech platforms:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {blackbirdAccounts.length > 0 ? (
                  blackbirdAccounts.map((acc, idx) => (
                    <a
                      key={idx}
                      href={acc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background-primary-default border border-separator-border hover:border-purple-500/50 text-[11px] font-medium text-text-primary hover:text-purple-400 transition-colors"
                    >
                      <span>{acc.platform}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  ))
                ) : (
                  <span className="text-xs text-text-tertiary italic">
                    No Blackbird profiles scanned yet (Click 'Scan Blackbird' to enumerate)
                  </span>
                )}
              </div>
            </div>

            {/* 8. theHarvester Domain & Infrastructure Recon */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiServerLine className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-text-primary">
                    theHarvester Domain Infrastructure
                  </span>
                  {harvesterSubdomains.length > 0 ? (
                    <Chip variant="subtle" color="cyan" size="sm">
                      {harvesterSubdomains.length} Subdomains
                    </Chip>
                  ) : !hasDomain ? (
                    <Chip variant="subtle" color="gray" size="sm">
                      No Domain (Locked)
                    </Chip>
                  ) : null}
                </div>
                {hasDomain ? (
                  <Button
                    onClick={handleScanHarvester}
                    disabled={harvesterScanning}
                    variant="secondary"
                    size="small"
                    leadingIcon={harvesterScanning ? Loader2 : RefreshCw}
                  >
                    {harvesterSubdomains.length > 0 ? 'Re-Run theHarvester' : 'Run theHarvester'}
                  </Button>
                ) : (
                  <Button
                    disabled={true}
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLockLine}
                    title="Locked: Prospect has no custom domain to enumerate"
                  >
                    Locked (Needs Domain)
                  </Button>
                )}
              </div>
                <p className="text-[11px] text-text-secondary">
                  Passive certificate transparency and DNS enumeration for target domain infrastructure:
                </p>
                {harvesterSubdomains.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {harvesterSubdomains.map((sub, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-background-primary-default border border-separator-border text-[11px] font-mono text-cyan-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                    {harvesterEmails.length > 0 && (
                      <div className="pt-2 border-t border-separator-border/60">
                        <span className="text-[10px] uppercase font-mono text-text-tertiary block mb-1">
                          Passive Domain Inboxes
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {harvesterEmails.map((em, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-background-primary-default border border-separator-border text-[11px] font-mono text-text-primary">
                              {em}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-text-tertiary italic">
                    No passive domain recon executed yet (Click 'Run theHarvester')
                  </span>
                )}
              </div>

            {/* 9. Comprehensive Website Health, Speed & ADA Audit */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RiSpeedUpLine className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-text-primary">
                    Website Health & Core Web Vitals Audit
                  </span>
                  {auditSummary ? (
                    <Chip variant="subtle" color={auditSummary.overall_score >= 80 ? 'emerald' : auditSummary.overall_score >= 50 ? 'amber' : 'rose'} size="sm">
                      Score: {auditSummary.overall_score}/100
                    </Chip>
                  ) : !hasDomain ? (
                    <Chip variant="subtle" color="gray" size="sm">
                      No Website (Locked)
                    </Chip>
                  ) : null}
                </div>
                {hasDomain ? (
                  <Button
                    onClick={() => {
                      if (onOpenAudit) onOpenAudit(currentLead.id);
                      else window.location.href = `/audit/${currentLead.id}`;
                    }}
                    variant="primary"
                    size="small"
                    leadingIcon={RiSpeedUpLine}
                  >
                    Open Full Audit Page ↗
                  </Button>
                ) : (
                  <Button
                    disabled={true}
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLockLine}
                    title="Locked: Lead has no custom website to audit"
                  >
                    Locked (No Website)
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                Deep multi-factor audit powered by Google Lighthouse metrics, Pa11y WCAG 2.1 ADA compliance tests, and search engine technical diagnostics:
              </p>
              {auditSummary ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip variant="subtle" color="cyan" size="sm">
                      Performance: {auditSummary.performance_score}/100
                    </Chip>
                    <Chip variant="subtle" color={auditSummary.violations_count > 0 ? 'rose' : 'emerald'} size="sm">
                      ADA Violations: {auditSummary.violations_count}
                    </Chip>
                    <Chip variant="subtle" color="purple" size="sm">
                      SEO Score: {auditSummary.seo_score}/100
                    </Chip>
                    <span className="text-[10px] text-text-tertiary">
                      Load Time: {auditSummary.load_time_ms ? `${(auditSummary.load_time_ms / 1000).toFixed(1)}s` : 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-text-tertiary italic">
                  No full website audit report generated yet (Click 'Open Full Audit Page' to run live)
                </span>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: INSTANT MOCKUP PROTOTYPE */}
        {activeTab === 'mockup' && (
          <div className="space-y-4">
            {/* Header & Style Picker */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span>{isNoWebsiteLead ? 'Laptop Niche Showcase Prototype' : 'Instant Website Prototype'}</span>
                    </h3>
                    {isNoWebsiteLead ? (
                      <Chip variant="subtle" color="purple" size="sm">
                        Pre-Built Showcase: {showcaseNiche}
                      </Chip>
                    ) : mockup ? (
                      <Chip variant="subtle" color="emerald" size="sm">
                        Generated and Live
                      </Chip>
                    ) : (
                      <Chip variant="subtle" color="amber" size="sm">
                        Not Generated
                      </Chip>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {isNoWebsiteLead 
                      ? 'Pre-built high-converting laptop prototype matched to business category for no-website leads'
                      : '1-Click landing page with interactive quote calculator and Google reviews'}
                  </p>
                </div>

                {/* Regenerate Button */}
                <Button
                  onClick={() => handleGenerateMockup(mockupStyle)}
                  disabled={mockupLoading}
                  variant="primary"
                  size="small"
                  leadingIcon={mockupLoading ? Loader2 : RefreshCw}
                >
                  {mockup ? 'Regenerate Mockup' : 'Generate Mockup'}
                </Button>
              </div>

              {/* Template Style Selector */}
              <div className="pt-2 border-t border-separator-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-text-tertiary">Theme:</span>
                  <ButtonGroup size="small">
                    {[
                      { id: 'modern', label: 'Dark Slate' },
                      { id: 'clean', label: 'Apple White' },
                      { id: 'contractor', label: 'Navy & Gold' }
                    ].map((s) => (
                      <ButtonGroupItem
                        key={s.id}
                        size="small"
                        selected={mockupStyle === s.id}
                        onClick={() => {
                          setMockupStyle(s.id);
                          handleGenerateMockup(s.id);
                        }}
                      >
                        {s.label}
                      </ButtonGroupItem>
                    ))}
                  </ButtonGroup>
                </div>

                {/* Device Frame Viewport Toggle */}
                <ButtonGroup size="small">
                  <ButtonGroupItem
                    size="small"
                    selected={previewDevice === 'desktop'}
                    onClick={() => setPreviewDevice('desktop')}
                    leadingIcon={Monitor}
                  >
                    Desktop
                  </ButtonGroupItem>
                  <ButtonGroupItem
                    size="small"
                    selected={previewDevice === 'mobile'}
                    onClick={() => setPreviewDevice('mobile')}
                    leadingIcon={Smartphone}
                  >
                    Mobile
                  </ButtonGroupItem>
                </ButtonGroup>
              </div>
            </div>

            {/* Quick Share Action Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href={prototypePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={ExternalLink}
                  className="w-full justify-center"
                >
                  Open in Tab
                </Button>
              </a>

              <Button
                onClick={handleCopyMockupLink}
                variant="secondary"
                size="small"
                leadingIcon={Copy}
                className="w-full justify-center"
              >
                Copy Demo Link
              </Button>

              <Button
                onClick={handleShareWhatsApp}
                variant="whatsapp"
                size="small"
                leadingIcon={MessageSquare}
                className="w-full justify-center"
              >
                WhatsApp Pitch
              </Button>

              <Button
                onClick={() => {
                  const targetAngle = isNoWebsiteLead ? 'no_website_showcase' : 'mockup_pitch';
                  setSelectedAngle(targetAngle);
                  generatePreview(targetAngle);
                  setActiveTab('pitch');
                }}
                variant="primary"
                size="small"
                leadingIcon={Mail}
                className="w-full justify-center"
              >
                Email Pitch
              </Button>
            </div>

            {/* Interactive Preview Container */}
            <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border flex flex-col items-center justify-center min-h-[500px]">
              {previewDevice === 'mobile' ? (
                /* Mobile Phone Shell Frame */
                <div className="w-[340px] h-[580px] bg-background-primary-default rounded-[36px] border-4 border-separator-border shadow-2xl overflow-hidden flex flex-col relative">
                  {/* Speaker Notch */}
                  <div className="w-full bg-background-primary-default py-1 flex justify-center items-center">
                    <div className="w-16 h-1.5 bg-background-tertiary-default rounded-full"></div>
                  </div>
                  <iframe
                    key={`mobile-${iframeKey}`}
                    src={prototypePath}
                    title="Mobile Prototype Preview"
                    className="w-full flex-1 border-0 bg-black"
                  />
                  {/* Home Bar */}
                  <div className="w-full bg-background-primary-default py-1.5 flex justify-center items-center">
                    <div className="w-24 h-1 bg-background-tertiary-default rounded-full"></div>
                  </div>
                </div>
              ) : (
                /* Desktop Browser Frame */
                <div className="w-full h-[540px] rounded-lg border border-separator-border bg-background-primary-default overflow-hidden flex flex-col shadow-inner">
                  {/* Browser Bar */}
                  <div className="px-3 py-2 bg-background-tertiary-default border-b border-separator-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-danger-primary/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-warning-primary/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-success-primary/80"></div>
                    </div>
                    <div className="px-4 py-0.5 rounded-md bg-background-primary-default border border-separator-border text-[11px] font-mono text-text-tertiary w-1/2 text-center truncate">
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
            <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border text-xs space-y-1.5">
              <div className="font-semibold text-text-primary flex items-center gap-1.5">
                <RiMessage3Line className="size-4 text-accent-500" />
                <span>Direct WhatsApp / SMS Outreach Script</span>
              </div>
              <p className="text-text-secondary font-mono text-[11px] bg-background-primary-default p-2.5 rounded-lg border border-separator-border">
                Hi {lead.business_name}, I saw your {lead.reviews_count || 'great'} reviews on Google Maps. Built a quick modern mobile preview site for you with an instant quote estimator: {window.location.origin}/mockup/{lead.id}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Dock (BoardUI 1-Click Operations) */}
      <div className="p-3 border-t border-separator-border bg-background-secondary-default/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {currentLead.website && onOpenAudit && (
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiGlobalLine}
              onClick={() => onOpenAudit(currentLead.id)}
              title="Open full Website Health, ADA & SEO Audit page"
            >
              Audit Site
            </Button>
          )}
          {hasEmail && (
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiCheckboxCircleLine}
              onClick={handleVerifyEmail}
              disabled={emailVerifying}
              title="Verify email deliverability via MX & SMTP"
            >
              {emailVerifying ? 'Verifying...' : 'Verify Email'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="primary"
            leadingIcon={RiSendPlaneFill}
            onClick={() => handleQueueInOutbox(false)}
            disabled={loading || !hasEmail}
            title={hasEmail ? "Queue pitch into Outbox for dispatch" : "Cannot queue: No recipient email discovered"}
          >
            Queue Pitch
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
