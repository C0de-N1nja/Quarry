import React, { useState, useEffect } from 'react';
import { 
  RiSettings3Line, 
  RiMailSendLine,
  RiShieldCheckLine, 
  RiCheckboxCircleLine, 
  RiErrorWarningLine, 
  RiLoader4Line, 
  RiKey2Line, 
  RiGlobalLine, 
  RiExternalLinkLine, 
  RiRefreshLine, 
  RiAddLine, 
  RiDeleteBin6Line, 
  RiServerLine, 
  RiCheckLine,
  RiCloseLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Switch } from '@/components/base/switch/switch';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';

export default function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'pool'
  const [settings, setSettings] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_secure: 'true',
    smtp_user: '',
    smtp_pass: '',
    sender_name: 'Rehan',
    sender_email: '',
    my_portfolio: 'https://github.com',
    daily_send_limit: '30',
    min_jitter_seconds: '45',
    max_jitter_seconds: '90',
    base_url: 'http://localhost:5000'
  });

  const [loading, setLoading] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Tunnel state
  const [tunnel, setTunnel] = useState(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  // Multi-Inbox Pool State
  const [inboxPool, setInboxPool] = useState(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [newInbox, setNewInbox] = useState({
    name: '',
    host: 'smtp.gmail.com',
    port: '465',
    secure: 1,
    user: '',
    pass: '',
    daily_limit: '50'
  });
  const [inboxMsg, setInboxMsg] = useState(null);
  const [inboxError, setInboxError] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchTunnel();
    fetchInboxPool();
  }, []);

  const fetchInboxPool = async () => {
    try {
      setInboxLoading(true);
      const res = await fetch('/api/settings/inboxes');
      const data = await res.json();
      if (data.success && data.pool) {
        setInboxPool(data.pool);
      }
    } catch (err) {
      console.error('Failed to fetch inbox pool', err);
    } finally {
      setInboxLoading(false);
    }
  };

  const handleAddInbox = async (e) => {
    e.preventDefault();
    setInboxError(null);
    setInboxMsg(null);
    if (!newInbox.user || !newInbox.pass) {
      setInboxError('Email username and app password are required');
      return;
    }
    try {
      const res = await fetch('/api/settings/inboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInbox)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setInboxMsg('Sending account added to rotation pool!');
      setNewInbox({
        name: '',
        host: 'smtp.gmail.com',
        port: '465',
        secure: 1,
        user: '',
        pass: '',
        daily_limit: '50'
      });
      await fetchInboxPool();
      setTimeout(() => setInboxMsg(null), 3000);
    } catch (err) {
      setInboxError(err.message || 'Failed to add inbox');
    }
  };

  const handleToggleInbox = async (id, currentStatus) => {
    try {
      await fetch(`/api/settings/inboxes/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      await fetchInboxPool();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInbox = async (id) => {
    if (!window.confirm('Remove this inbox from the sending pool?')) return;
    try {
      await fetch(`/api/settings/inboxes/${id}`, { method: 'DELETE' });
      await fetchInboxPool();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTunnel = async () => {
    try {
      const res = await fetch('/api/settings/tunnel');
      const data = await res.json();
      if (data.success) {
        setTunnel(data.tunnel);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTunnel = async () => {
    setTunnelLoading(true);
    try {
      const res = await fetch('/api/settings/tunnel/start', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTunnel(data.tunnel);
        await fetchSettings();
      }
    } catch (err) {
      console.error('Failed to start tunnel', err);
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setTunnelLoading(true);
    try {
      const res = await fetch('/api/settings/tunnel/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTunnel(data.tunnel);
        await fetchSettings();
      }
    } catch (err) {
      console.error('Failed to stop tunnel', err);
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setTestResult(null);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const res = await fetch('/api/settings/test-smtp', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="lg"
      aria-label="Settings, SMTP and Infrastructure"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-separator-border bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-2">
          <RiSettings3Line className="h-4 w-4 text-accent-500" />
          <h2 className="text-sm font-semibold text-text-primary">Settings, SMTP & Infrastructure</h2>
        </div>
        <CloseButton
          size="md"
          onClick={onClose}
          aria-label="Close Settings"
        />
      </div>

      {/* Tab Switcher using BoardUI PillTabs */}
      <div className="px-6 py-2.5 border-b border-separator-border bg-background-secondary-default shrink-0">
        <PillTabList className="w-full flex gap-1">
          <PillTab
            variant="blue"
            icon={RiSettings3Line}
            isSelected={activeTab === 'general'}
            onSelect={() => setActiveTab('general')}
          >
            General & Dispatcher
          </PillTab>
          <PillTab
            variant="blue"
            icon={RiMailSendLine}
            isSelected={activeTab === 'pool'}
            onSelect={() => setActiveTab('pool')}
          >
            Multi-Inbox Pool ({inboxPool?.accounts?.length || 0})
          </PillTab>
        </PillTabList>
      </div>

      <ModalBody className="p-0 gap-0 flex-1 overflow-y-auto bg-background-primary-default text-text-primary">
        {activeTab === 'general' ? (
          /* General & Fallback SMTP Form */
          <form id="settings-general-form" onSubmit={handleSave} className="p-6 space-y-6 text-xs">
            {saveSuccess && (
              <div className="p-3 bg-success-primary/10 border border-success-primary/30 rounded-lg text-success-primary flex items-center gap-2">
                <RiCheckboxCircleLine className="h-4 w-4 shrink-0" />
                <span>Settings updated successfully!</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-danger-primary/10 border border-danger-primary/30 rounded-lg text-danger-primary flex items-center gap-2">
                <RiErrorWarningLine className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Cloudflare Public Tunnel Bridge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <RiGlobalLine className="h-3.5 w-3.5 text-accent-500" />
                    <span>Cloudflare Public Tunnel Bridge</span>
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Exposes port 5000 over HTTPS so international clients can open interactive mockups & audits on their phones.
                  </p>
                </div>

                {tunnel && tunnel.publicUrl && (
                  <Chip variant="subtle" color="emerald" size="sm" className="gap-1 inline-flex items-center shrink-0">
                    <StatusDot color="green" />
                    <span>Tunnel Active</span>
                  </Chip>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-background-secondary-default border border-separator-border space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-text-secondary mb-1.5 text-[11px] font-medium">
                      Active Public Base URL for Pitches (<code className="font-mono text-accent-500">{'{{mockup_url}}'}</code> & <code className="font-mono text-accent-500">{'{{report_url}}'}</code>)
                    </label>
                    <input
                      type="text"
                      value={settings.base_url || 'http://localhost:5000'}
                      onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                      placeholder="https://your-tunnel.trycloudflare.com or http://localhost:5000"
                      className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="shrink-0">
                    {tunnel && tunnel.isRunning ? (
                      <Button
                        variant="danger"
                        size="medium"
                        disabled={tunnelLoading}
                        onClick={handleStopTunnel}
                      >
                        {tunnelLoading ? 'Stopping...' : 'Stop Tunnel'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="medium"
                        leadingIcon={tunnelLoading ? RiRefreshLine : RiGlobalLine}
                        disabled={tunnelLoading}
                        onClick={handleStartTunnel}
                      >
                        {tunnelLoading ? 'Connecting...' : 'Start Quick Tunnel'}
                      </Button>
                    )}
                  </div>
                </div>

                {tunnel && tunnel.publicUrl && (
                  <div className="flex items-center justify-between text-[11px] bg-background-tertiary-default p-2.5 rounded-xl border border-separator-border">
                    <span className="text-text-tertiary font-mono">Live Public Endpoint:</span>
                    <a
                      href={tunnel.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-500 hover:underline font-mono flex items-center gap-1"
                    >
                      <span>{tunnel.publicUrl}</span>
                      <RiExternalLinkLine className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Primary / Fallback SMTP Configuration */}
            <div className="space-y-3 pt-3 border-t border-separator-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <RiShieldCheckLine className="h-3.5 w-3.5 text-accent-500" />
                  <span>Primary / Fallback SMTP</span>
                </h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !settings.smtp_user}
                  className="p-0 h-auto text-xs"
                >
                  {testingSmtp ? <RiLoader4Line className="h-3 w-3 animate-spin" /> : <RiKey2Line className="h-3 w-3" />}
                  <span>Test Connection</span>
                </Button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${testResult.success ? 'bg-success-primary/10 border-success-primary/30 text-success-primary' : 'bg-danger-primary/10 border-danger-primary/30 text-danger-primary'}`}>
                  {testResult.success ? <RiCheckboxCircleLine className="h-4 w-4 shrink-0" /> : <RiErrorWarningLine className="h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Port</label>
                  <input
                    type="text"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    placeholder="465"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">App Password</label>
                  <input
                    type="password"
                    value={settings.smtp_pass}
                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pitch Personalization */}
            <div className="space-y-3 pt-3 border-t border-separator-border">
              <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider">
                Pitch Personalization
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Your Full Name</label>
                  <input
                    type="text"
                    value={settings.sender_name}
                    onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                    placeholder="Rehan"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Your Portfolio / GitHub URL</label>
                  <input
                    type="text"
                    value={settings.my_portfolio}
                    onChange={(e) => setSettings({ ...settings, my_portfolio: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Anti-Spam Safety & Rate Limits */}
            <div className="space-y-3 pt-3 border-t border-separator-border">
              <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider">
                Anti-Spam Deliverability Safeguards
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Single Cap (Emails)</label>
                  <input
                    type="number"
                    value={settings.daily_send_limit}
                    onChange={(e) => setSettings({ ...settings, daily_send_limit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Min Delay (Sec)</label>
                  <input
                    type="number"
                    value={settings.min_jitter_seconds}
                    onChange={(e) => setSettings({ ...settings, min_jitter_seconds: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption-1-medium text-text-secondary mb-1.5">Max Delay (Sec)</label>
                  <input
                    type="number"
                    value={settings.max_jitter_seconds}
                    onChange={(e) => setSettings({ ...settings, max_jitter_seconds: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <p className="text-[11px] text-text-tertiary">
                Randomizes delay between each outgoing email to mimic natural human sending behavior and safeguard domain reputation.
              </p>
            </div>
          </form>
        ) : (
          /* Multi-Inbox Rotation Pool Tab (300/Day Architecture) */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {inboxMsg && (
              <div className="p-3 bg-success-primary/10 border border-success-primary/30 rounded-lg text-success-primary flex items-center gap-2">
                <RiCheckboxCircleLine className="h-4 w-4 shrink-0" />
                <span>{inboxMsg}</span>
              </div>
            )}

            {inboxError && (
              <div className="p-3 bg-danger-primary/10 border border-danger-primary/30 rounded-lg text-danger-primary flex items-center gap-2">
                <RiErrorWarningLine className="h-4 w-4 shrink-0" />
                <span>{inboxError}</span>
              </div>
            )}

            {/* Capacity Metrics Card */}
            <div className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                    High-Volume Multi-Inbox Pool
                  </div>
                  <div className="text-base font-bold text-text-primary mt-0.5 flex items-center gap-2">
                    <span>{inboxPool?.totalDailyCapacity || 0} / 143</span>
                    <span className="text-xs font-normal text-text-tertiary">daily email target (1,000/week)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-500/10 text-accent-500 border border-accent-500/20">
                    {inboxPool?.activeAccounts || 0} Inboxes Active
                  </span>
                </div>
              </div>

              {/* Progress bar towards 143 emails/day goal */}
              <div className="space-y-1">
                <div className="w-full bg-background-tertiary-default rounded-full h-2 overflow-hidden border border-separator-border">
                  <div 
                    className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((inboxPool?.totalDailyCapacity || 0) / 143) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-tertiary">
                  <span>Dispatched Today: {inboxPool?.totalSentToday || 0}</span>
                  <span>Remaining Capacity: {inboxPool?.remainingCapacity || 0}</span>
                </div>
              </div>

              <p className="text-[11px] text-text-secondary leading-relaxed border-t border-separator-border/50 pt-2">
                <span className="font-semibold text-text-primary">Deliverability Rule:</span> To send 1,000 emails/week (143/day) safely without burning inbox reputation, rotate across 3 to 4 sender inboxes capped at 35–50 emails/day each.
              </p>
            </div>

            {/* Inboxes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <RiServerLine className="h-3.5 w-3.5 text-accent-500" />
                  <span>Configured Senders ({inboxPool?.accounts?.length || 0})</span>
                </h3>
                {inboxLoading && <RiLoader4Line className="h-3.5 w-3.5 animate-spin text-text-tertiary" />}
              </div>

              {(!inboxPool?.accounts || inboxPool.accounts.length === 0) ? (
                <div className="p-4 rounded-lg bg-background-secondary-default border border-separator-border text-center text-text-tertiary text-xs">
                  No dedicated pool inboxes added yet. The system will use your Primary SMTP from the General tab.
                </div>
              ) : (
                <div className="space-y-2">
                  {inboxPool.accounts.map((acc) => (
                    <div 
                      key={acc.id}
                      className="p-3 rounded-lg bg-background-secondary-default border border-separator-border flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${acc.is_active ? 'bg-success-primary' : 'bg-background-tertiary-default'}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary truncate">
                            {acc.name} <span className="font-mono text-text-tertiary text-[11px]">({acc.user})</span>
                          </div>
                          <div className="text-[10px] text-text-tertiary font-mono">
                            {acc.host}:{acc.port} • Sent Today: {acc.sent_today} / {acc.daily_limit}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Switch
                          size="sm"
                          isSelected={Boolean(acc.is_active)}
                          onChange={() => handleToggleInbox(acc.id, acc.is_active)}
                          aria-label="Toggle inbox active state"
                        >
                          <span className="text-[11px] text-text-secondary font-medium">
                            {acc.is_active ? 'Active' : 'Paused'}
                          </span>
                        </Switch>
                        <IconButton
                          size="small"
                          icon={RiDeleteBin6Line}
                          aria-label="Remove inbox from pool"
                          onClick={() => handleDeleteInbox(acc.id)}
                          title="Remove inbox from pool"
                          className="text-text-tertiary hover:text-danger-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Inbox Form */}
            <form onSubmit={handleAddInbox} className="p-4 rounded-xl bg-background-secondary-default border border-separator-border space-y-3">
              <h3 className="font-semibold text-text-primary text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                <RiAddLine className="h-3.5 w-3.5 text-accent-500" />
                <span>Add Sending Account to Pool</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">Sender Name</label>
                  <input
                    type="text"
                    value={newInbox.name}
                    onChange={(e) => setNewInbox({ ...newInbox, name: e.target.value })}
                    placeholder="Rehan (Acquisition)"
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">Email / User</label>
                  <input
                    type="email"
                    value={newInbox.user}
                    onChange={(e) => setNewInbox({ ...newInbox, user: e.target.value })}
                    placeholder="outreach1@yourdomain.com"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">App Password</label>
                  <input
                    type="password"
                    value={newInbox.pass}
                    onChange={(e) => setNewInbox({ ...newInbox, pass: e.target.value })}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">Daily Quota</label>
                  <input
                    type="number"
                    value={newInbox.daily_limit}
                    onChange={(e) => setNewInbox({ ...newInbox, daily_limit: e.target.value })}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">SMTP Host</label>
                  <input
                    type="text"
                    value={newInbox.host}
                    onChange={(e) => setNewInbox({ ...newInbox, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 text-[11px]">SMTP Port</label>
                  <input
                    type="text"
                    value={newInbox.port}
                    onChange={(e) => setNewInbox({ ...newInbox, port: e.target.value })}
                    placeholder="465"
                    className="w-full px-3 py-2 rounded-xl bg-background-tertiary-default border border-separator-border text-text-primary font-mono text-xs focus:border-accent-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="medium"
                  leadingIcon={RiAddLine}
                >
                  Add to Rotation Pool
                </Button>
              </div>
            </form>
          </div>
        )}
      </ModalBody>

      {/* Pinned BoardUI Modal Footer */}
      <ModalFooter className="px-6 py-3 border-t border-separator-border bg-background-secondary-default flex justify-end gap-2 shrink-0">
        <Button
          variant="secondary"
          size="medium"
          onClick={onClose}
        >
          Close
        </Button>
        {activeTab === 'general' && (
          <Button
            variant="primary"
            size="medium"
            type="submit"
            form="settings-general-form"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
