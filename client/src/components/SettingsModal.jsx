import React, { useState, useEffect } from 'react';
import { 
  X, Settings, ShieldCheck, CheckCircle2, AlertCircle, Loader2, 
  Key, Globe, Radio, ExternalLink, RefreshCw, Layers, Plus, 
  Trash2, Server, Mail, Check
} from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-2/40">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Settings, SMTP & Infrastructure</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-subtle bg-surface-2/60 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>General & Dispatcher</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pool')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pool'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-amber-500" />
            <span>Multi-Inbox Pool (300/Day)</span>
            {inboxPool?.accounts?.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                {inboxPool.accounts.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'general' ? (
          /* General & Fallback SMTP Form */
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Settings updated successfully!</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Cloudflare Public Tunnel Bridge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Cloudflare Public Tunnel Bridge</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Exposes port 5000 over HTTPS so international clients can open interactive mockups & audits on their phones.
                  </p>
                </div>

                {tunnel && tunnel.publicUrl && (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Tunnel Active</span>
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-surface-2 border border-border-subtle space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">
                      Active Public Base URL for Pitches (<code className="font-mono text-cyan-600 dark:text-cyan-400">{'{{mockup_url}}'}</code> & <code className="font-mono text-cyan-600 dark:text-cyan-400">{'{{report_url}}'}</code>)
                    </label>
                    <input
                      type="text"
                      value={settings.base_url || 'http://localhost:5000'}
                      onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                      placeholder="https://your-tunnel.trycloudflare.com or http://localhost:5000"
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="shrink-0 pt-4">
                    {tunnel && tunnel.isRunning ? (
                      <button
                        type="button"
                        disabled={tunnelLoading}
                        onClick={handleStopTunnel}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors"
                      >
                        {tunnelLoading ? 'Stopping...' : 'Stop Tunnel'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={tunnelLoading}
                        onClick={handleStartTunnel}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-600/20"
                      >
                        {tunnelLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                        <span>{tunnelLoading ? 'Connecting...' : 'Start Quick Tunnel'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {tunnel && tunnel.publicUrl && (
                  <div className="flex items-center justify-between text-[11px] bg-surface-1 p-2 rounded border border-border-subtle/80">
                    <span className="text-gray-500">Live Public Endpoint:</span>
                    <a
                      href={tunnel.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-600 dark:text-cyan-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <span>{tunnel.publicUrl}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Primary / Fallback SMTP Configuration */}
            <div className="space-y-3 pt-3 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                  <span>Primary / Fallback SMTP</span>
                </h3>
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || !settings.smtp_user}
                  className="text-xs text-brand hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {testingSmtp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                  <span>Test Connection</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'}`}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Port</label>
                  <input
                    type="text"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    placeholder="465"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">App Password</label>
                  <input
                    type="password"
                    value={settings.smtp_pass}
                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pitch Personalization */}
            <div className="space-y-3 pt-3 border-t border-border-subtle">
              <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider">
                Pitch Personalization
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={settings.sender_name}
                    onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                    placeholder="Rehan"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Your Portfolio / GitHub URL</label>
                  <input
                    type="text"
                    value={settings.my_portfolio}
                    onChange={(e) => setSettings({ ...settings, my_portfolio: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Anti-Spam Safety & Rate Limits */}
            <div className="space-y-3 pt-3 border-t border-border-subtle">
              <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider">
                Anti-Spam Deliverability Safeguards
              </h3>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Single Cap (Emails)</label>
                  <input
                    type="number"
                    value={settings.daily_send_limit}
                    onChange={(e) => setSettings({ ...settings, daily_send_limit: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Min Delay (Sec)</label>
                  <input
                    type="number"
                    value={settings.min_jitter_seconds}
                    onChange={(e) => setSettings({ ...settings, min_jitter_seconds: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1">Max Delay (Sec)</label>
                  <input
                    type="number"
                    value={settings.max_jitter_seconds}
                    onChange={(e) => setSettings({ ...settings, max_jitter_seconds: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border-subtle text-gray-900 dark:text-white font-mono focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Randomizes delay between each outgoing email to mimic natural human sending behavior and safeguard domain reputation.
              </p>
            </div>

            <div className="pt-3 border-t border-border-subtle flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        ) : (
          /* Multi-Inbox Rotation Pool Tab (300/Day Architecture) */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {inboxMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{inboxMsg}</span>
              </div>
            )}

            {inboxError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{inboxError}</span>
              </div>
            )}

            {/* Capacity Metrics Card */}
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    High-Volume Multi-Inbox Pool
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <span>{inboxPool?.totalDailyCapacity || 0} / 143</span>
                    <span className="text-xs font-normal text-gray-500">daily email target (1,000/week)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                    {inboxPool?.activeAccounts || 0} Inboxes Active
                  </span>
                </div>
              </div>

              {/* Progress bar towards 143 emails/day goal */}
              <div className="space-y-1">
                <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-linear-to-r from-amber-500 to-brand h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((inboxPool?.totalDailyCapacity || 0) / 143) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Dispatched Today: {inboxPool?.totalSentToday || 0}</span>
                  <span>Remaining Capacity: {inboxPool?.remainingCapacity || 0}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed border-t border-border-subtle/50 pt-2">
                💡 <span className="font-semibold text-gray-700 dark:text-gray-300">Deliverability Rule:</span> To send 1,000 emails/week (143/day) safely without burning inbox reputation, rotate across 3 to 4 sender inboxes capped at 35–50 emails/day each.
              </p>
            </div>

            {/* Inboxes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-brand" />
                  <span>Configured Senders ({inboxPool?.accounts?.length || 0})</span>
                </h3>
                {inboxLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </div>

              {(!inboxPool?.accounts || inboxPool.accounts.length === 0) ? (
                <div className="p-4 rounded-lg bg-surface-2/60 border border-border-subtle text-center text-gray-500 text-xs">
                  No dedicated pool inboxes added yet. The system will use your Primary SMTP from the General tab.
                </div>
              ) : (
                <div className="space-y-2">
                  {inboxPool.accounts.map((acc) => (
                    <div 
                      key={acc.id}
                      className="p-3 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${acc.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {acc.name} <span className="font-mono text-gray-500 text-[11px]">({acc.user})</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {acc.host}:{acc.port} • Sent Today: {acc.sent_today} / {acc.daily_limit}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleInbox(acc.id, acc.is_active)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${
                            acc.is_active 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20'
                          }`}
                        >
                          {acc.is_active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInbox(acc.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                          title="Remove inbox from pool"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Inbox Form */}
            <form onSubmit={handleAddInbox} className="p-4 rounded-xl bg-surface-2/60 border border-border-subtle space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-brand" />
                <span>Add Sending Account to Pool</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">Sender Name</label>
                  <input
                    type="text"
                    value={newInbox.name}
                    onChange={(e) => setNewInbox({ ...newInbox, name: e.target.value })}
                    placeholder="Rehan (Acquisition)"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">Email / User</label>
                  <input
                    type="email"
                    value={newInbox.user}
                    onChange={(e) => setNewInbox({ ...newInbox, user: e.target.value })}
                    placeholder="outreach1@yourdomain.com"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">App Password</label>
                  <input
                    type="password"
                    value={newInbox.pass}
                    onChange={(e) => setNewInbox({ ...newInbox, pass: e.target.value })}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">Daily Quota</label>
                  <input
                    type="number"
                    value={newInbox.daily_limit}
                    onChange={(e) => setNewInbox({ ...newInbox, daily_limit: e.target.value })}
                    placeholder="50"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">SMTP Host</label>
                  <input
                    type="text"
                    value={newInbox.host}
                    onChange={(e) => setNewInbox({ ...newInbox, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 mb-1 text-[11px]">SMTP Port</label>
                  <input
                    type="text"
                    value={newInbox.port}
                    onChange={(e) => setNewInbox({ ...newInbox, port: e.target.value })}
                    placeholder="465"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-gray-900 dark:text-white font-mono text-xs focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-brand/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add to Rotation Pool</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
