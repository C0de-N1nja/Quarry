import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Inbox, 
  RotateCw, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Bell, 
  Flame, 
  Sliders, 
  X,
  FileCode,
  ArrowRight
} from 'lucide-react';

export default function RescuerModal({ onClose, leads = [], onSelectLead, onPipelineUpdated }) {
  const [status, setStatus] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [selectedReply, setSelectedReply] = useState(null);
  const [scanMessage, setScanMessage] = useState(null);
  
  // Simulation State
  const [showSimulate, setShowSimulate] = useState(false);
  const [simLeadId, setSimLeadId] = useState(leads[0]?.id || '');
  const [simBody, setSimBody] = useState('Hi Rehan,\n\nThanks for reaching out! We saw your speed benchmark and would love to see the video breakdown for our website. Are you available for a brief call tomorrow afternoon?\n\nBest,\nOwner');
  const [simulating, setSimulating] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/rescuer/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await fetch('/api/rescuer/replies');
      const data = await res.json();
      if (data.success) {
        setReplies(data.replies);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchReplies();
  }, []);

  const handleScanNow = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/rescuer/scan-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScanMessage({
          type: 'success',
          text: `Scan complete! Scanned ${data.messagesInSpam || 0} messages in ${data.scannedFolder}. Rescued ${data.rescuedCount} client email(s) into INBOX!`
        });
        await fetchStatus();
        await fetchReplies();
        if (data.rescuedCount > 0 && onPipelineUpdated) {
          onPipelineUpdated();
        }
      } else {
        setScanMessage({
          type: 'error',
          text: data.error || 'Spam scan failed'
        });
      }
    } catch (err) {
      setScanMessage({ type: 'error', text: err.message });
    } finally {
      setScanning(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/rescuer/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleAutoMonitor = async () => {
    if (!status) return;
    try {
      const newEnabled = !status.enabled;
      const res = await fetch('/api/rescuer/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIntervalChange = async (e) => {
    const intervalMins = parseInt(e.target.value, 10);
    try {
      const res = await fetch('/api/rescuer/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMins })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateRescue = async () => {
    if (!simLeadId) return;
    setSimulating(true);
    try {
      const targetLead = leads.find(l => String(l.id) === String(simLeadId));
      const res = await fetch('/api/rescuer/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: simLeadId,
          senderEmail: `contact@${targetLead?.website?.replace(/^[a-z]+:\/\/(www\.)?/i, '').split('/')[0] || 'prospect.com'}`,
          senderName: targetLead?.business_name ? `${targetLead.business_name} Decision Maker` : 'Lead Contact',
          subject: `Re: Quick question regarding ${targetLead?.business_name || 'your services'}`,
          bodyText: simBody
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowSimulate(false);
        await fetchReplies();
        await fetchStatus();
        if (onPipelineUpdated) onPipelineUpdated();
        setScanMessage({
          type: 'success',
          text: `🎉 Simulated reply successfully created! Lead advanced to "Replied / In Discussion" on Kanban and follow-up sequence paused.`
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleDeleteReply = async (id) => {
    try {
      await fetch(`/api/rescuer/replies/${id}`, { method: 'DELETE' });
      setReplies(prev => prev.filter(r => r.id !== id));
      if (selectedReply?.id === id) setSelectedReply(null);
      await fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">🔥 High Intent</span>;
      case 'question':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">💬 Question / Inquiry</span>;
      case 'negative':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">⛔ Opt-Out</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-surface-3 text-gray-600 dark:text-gray-300 border border-border-subtle">Neutral</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-surface-1 rounded-2xl border border-border-subtle shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Gmail Spam Rescuer & Inbox Bridge
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Zero Deal Drop-Off
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-monitors [Gmail]/Spam, rescues client replies to INBOX for phone notifications & advances Kanban.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-surface-3 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action & Stats Ribbon */}
        <div className="px-6 py-3 border-b border-border-subtle bg-surface-2/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-2">
            {status?.configured ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected: {status.connectedAccount}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono">
                <AlertCircle className="h-3 w-3" />
                <span>IMAP Credentials Required in Settings</span>
              </span>
            )}

            {/* Background Polling Switch */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-border-subtle">
              <span className="text-gray-500 dark:text-gray-400">Auto-Scan:</span>
              <button
                onClick={handleToggleAutoMonitor}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  status?.enabled 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40' 
                    : 'bg-surface-3 text-gray-400 border-border-subtle'
                }`}
              >
                {status?.enabled ? 'Active (5m)' : 'Paused'}
              </button>
            </div>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing || !status?.configured}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
              title="Verify IMAP TLS authentication with imap.gmail.com"
            >
              <RotateCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test IMAP'}</span>
            </button>

            <button
              onClick={() => setShowSimulate(!showSimulate)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 transition-colors"
              title="Test the rescue pipeline using an existing lead"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simulate Reply</span>
            </button>

            <a
              href="/api/rescuer/export-filter"
              download="client_hunter_mailFilters.xml"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm shadow-emerald-600/30 transition-all"
              title="Download Gmail Filter XML (Never Send to Spam rule for all leads)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Gmail Filter XML</span>
            </a>

            <button
              onClick={handleScanNow}
              disabled={scanning || !status?.configured}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium shadow-sm shadow-brand/30 transition-all disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning Spam...' : '⚡ Scan & Rescue Now'}</span>
            </button>
          </div>
        </div>

        {/* Feedback / Alerts */}
        {scanMessage && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            scanMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-b border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-b border-rose-500/20'
          }`}>
            <span className="flex items-center gap-2">
              {scanMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{scanMessage.text}</span>
            </span>
            <button onClick={() => setScanMessage(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {testResult && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            testResult.success
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-b border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-b border-rose-500/20'
          }`}>
            <span>
              {testResult.success 
                ? `✅ ${testResult.message} (${testResult.mailboxCount} mailboxes verified)`
                : `❌ ${testResult.error}`}
            </span>
            <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Simulation Tray */}
        {showSimulate && (
          <div className="px-6 py-3 border-b border-border-subtle bg-surface-2/60 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Simulate Prospect Spam Reply</span>
              </h4>
              <button onClick={() => setShowSimulate(false)} className="text-gray-400 hover:text-gray-600 text-xs">
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Target Lead to Simulate:</label>
                <select
                  value={simLeadId}
                  onChange={(e) => setSimLeadId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-xs text-gray-900 dark:text-white"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.business_name} ({l.city || 'Remote'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-gray-500 mb-1">Simulated Reply Content:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-xs text-gray-900 dark:text-white"
                    placeholder="Enter prospect reply text..."
                  />
                  <button
                    onClick={handleSimulateRescue}
                    disabled={simulating}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0 transition-colors disabled:opacity-50"
                  >
                    {simulating ? 'Simulating...' : 'Trigger Rescue'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preventive Immunity Callout */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-amber-500/10 via-brand/5 to-emerald-500/10 border-b border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <FileCode className="h-3.5 w-3.5" />
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              <strong>Spam Immunity Rule:</strong> Download the XML filter above, then open <strong>Gmail Settings ➔ Filters ➔ Import filters</strong>. Gmail will permanently whitelabel your lead domains so they never trigger Spam!
            </span>
          </div>
        </div>

        {/* Rescued Replies List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-gray-500 dark:text-gray-400">
                Rescued Client Responses ({replies.length})
              </h3>
              {replies.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-600 font-mono">
                  {status?.stats?.positive || 0} Hot Deals
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {status?.lastScan ? `Last scanned: ${new Date(status.lastScan).toLocaleTimeString()}` : 'No scans yet'}
            </span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              <RotateCw className="h-5 w-5 animate-spin mr-2" />
              Loading rescued messages...
            </div>
          ) : replies.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border-subtle rounded-xl">
              <div className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center text-gray-400 mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                No Rescued Emails in Spam Yet
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mb-4">
                When prospects reply to your cold pitches and Gmail misclassifies them into [Gmail]/Spam, our IMAP bridge instantly moves them to your Primary INBOX so your phone rings!
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleScanNow}
                  disabled={!status?.configured}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors"
                >
                  ⚡ Scan Spam Now
                </button>
                <button
                  onClick={() => setShowSimulate(true)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
                >
                  ✨ Test with Simulation
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 rounded-xl bg-surface-2/60 hover:bg-surface-2 border border-border-subtle transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                        {reply.sender_name || reply.sender_email}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">
                        &lt;{reply.sender_email}&gt;
                      </span>
                      {getSentimentBadge(reply.sentiment)}
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                        <Bell className="h-2.5 w-2.5" />
                        <span>Moved to Primary INBOX</span>
                      </span>
                    </div>

                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {reply.subject || 'No Subject'}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 bg-surface-1/60 p-2 rounded-lg border border-border-subtle/50 font-sans">
                      {reply.body_preview || 'No message snippet available'}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                      <span>Rescued: {new Date(reply.rescued_at).toLocaleString()}</span>
                      {reply.business_name && (
                        <span>• Lead: <strong>{reply.business_name}</strong></span>
                      )}
                      <span>• Origin: <span className="font-mono text-[10px]">{reply.folder_origin}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {reply.lead_id && (
                      <button
                        onClick={() => {
                          const target = leads.find(l => l.id === reply.lead_id);
                          if (target && onSelectLead) {
                            onSelectLead(target);
                            onClose();
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-1 hover:bg-surface-3 border border-border-subtle text-brand transition-colors"
                        title="Open Lead in Kanban & Outreach Drawer"
                      >
                        <span>Open Lead</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-surface-1 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-surface-2/40 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>Automatic Kanban Pipeline Sync: Rescued leads are moved to <strong>"In Discussion"</strong> & follow-up sequence paused.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-700 dark:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
