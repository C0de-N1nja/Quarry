import React, { useState, useEffect } from 'react';
import { 
  RiShieldCheckLine, 
  RiShieldAlertLine, 
  RiInboxLine, 
  RiRefreshLine, 
  RiDownloadLine, 
  RiSparklingLine, 
  RiCheckboxCircleLine, 
  RiErrorWarningLine, 
  RiDeleteBin6Line, 
  RiExternalLinkLine, 
  RiNotificationLine, 
  RiFireLine, 
  RiEqualizerLine, 
  RiFileCodeLine,
  RiArrowRightLine,
  RiCloseLine,
  RiArrowDownSLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { Switch } from '@/components/base/switch/switch';
import { Chip } from '@/components/base/badges/chip';

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
          text: `Simulated reply successfully created! Lead advanced to "Replied / In Discussion" on Kanban and follow-up sequence paused.`
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
        return <Chip variant="subtle" color="emerald" size="sm">High Intent</Chip>;
      case 'question':
        return <Chip variant="subtle" color="amber" size="sm">Question / Inquiry</Chip>;
      case 'negative':
        return <Chip variant="subtle" color="rose" size="sm">Opt-Out</Chip>;
      default:
        return <Chip variant="subtle" color="gray" size="sm">Neutral</Chip>;
    }
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      aria-label="Gmail Spam Rescuer and Inbox Bridge"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-separator-border flex items-center justify-between bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-500/15 text-accent-500 flex items-center justify-center border border-accent-500/30">
            <RiShieldCheckLine className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Gmail Spam Rescuer & Inbox Bridge
              </h2>
              <Chip variant="bold" color="red">
                Zero Deal Drop-Off
              </Chip>
            </div>
            <p className="text-xs text-text-secondary">
              Auto-monitors [Gmail]/Spam, rescues client replies to INBOX for phone notifications & advances Kanban.
            </p>
          </div>
        </div>

        <CloseButton
          size="md"
          onClick={onClose}
          aria-label="Close Modal"
        />
      </div>

      <ModalBody className="p-0 gap-0 flex-1 overflow-y-auto bg-background-primary-default text-text-primary">

        {/* Action & Stats Ribbon */}
        <div className="px-6 py-3 border-b border-separator-border bg-background-secondary-default flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-2">
            {status?.configured ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-primary/10 text-success-primary border border-success-primary/30 text-xs font-mono">
                <span className="h-2 w-2 rounded-full bg-success-primary animate-pulse" />
                <span>Connected: {status.connectedAccount}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-primary/10 text-warning-primary border border-warning-primary/30 text-xs font-mono">
                <RiErrorWarningLine className="h-3 w-3" />
                <span>IMAP Credentials Required in Settings</span>
              </span>
            )}

            {/* Background Polling Switch */}
            <div className="flex items-center pl-2 border-l border-separator-border">
              <Switch
                size="sm"
                isSelected={Boolean(status?.enabled)}
                onChange={handleToggleAutoMonitor}
              >
                <span className="text-text-tertiary text-xs">Auto-Scan (5m)</span>
              </Switch>
            </div>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiRefreshLine}
              onClick={handleTestConnection}
              disabled={testing || !status?.configured}
              title="Verify IMAP TLS authentication with imap.gmail.com"
            >
              {testing ? 'Testing...' : 'Test IMAP'}
            </Button>

            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiSparklingLine}
              onClick={() => setShowSimulate(!showSimulate)}
              title="Test the rescue pipeline using an existing lead"
            >
              Simulate Reply
            </Button>

            <a
              href="/api/rescuer/export-filter"
              download="client_hunter_mailFilters.xml"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-primary hover:bg-success-primary/90 text-white font-medium shadow-sm transition-all text-xs"
              title="Download Gmail Filter XML (Never Send to Spam rule for all leads)"
            >
              <RiDownloadLine className="h-3.5 w-3.5" />
              <span>Export Gmail Filter XML</span>
            </a>

            <Button
              variant="primary"
              size="small"
              leadingIcon={RiRefreshLine}
              onClick={handleScanNow}
              disabled={scanning || !status?.configured}
            >
              {scanning ? 'Scanning Spam...' : 'Scan & Rescue Now'}
            </Button>
          </div>
        </div>

        {/* Feedback / Alerts */}
        {scanMessage && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            scanMessage.type === 'success' 
              ? 'bg-success-primary/10 text-success-primary border-b border-success-primary/20' 
              : 'bg-danger-primary/10 text-danger-primary border-b border-danger-primary/20'
          }`}>
            <span className="flex items-center gap-2">
              {scanMessage.type === 'success' ? <RiCheckboxCircleLine className="h-4 w-4" /> : <RiErrorWarningLine className="h-4 w-4" />}
              <span>{scanMessage.text}</span>
            </span>
            <CloseButton size="sm" onClick={() => setScanMessage(null)} aria-label="Dismiss alert" />
          </div>
        )}

        {testResult && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            testResult.success
              ? 'bg-success-primary/10 text-success-primary border-b border-success-primary/20'
              : 'bg-danger-primary/10 text-danger-primary border-b border-danger-primary/20'
          }`}>
            <span>
              {testResult.success 
                ? `${testResult.message} (${testResult.mailboxCount} mailboxes verified)`
                : `Error: ${testResult.error}`}
            </span>
            <CloseButton size="sm" onClick={() => setTestResult(null)} aria-label="Dismiss result" />
          </div>
        )}

        {/* Simulation Tray */}
        {showSimulate && (
          <div className="px-6 py-3 border-b border-separator-border bg-background-secondary-default animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <RiSparklingLine className="h-3.5 w-3.5 text-accent-500" />
                <span>Simulate Prospect Spam Reply</span>
              </h4>
              <Button variant="link" size="small" onClick={() => setShowSimulate(false)} className="text-text-tertiary hover:text-text-secondary text-xs p-0 h-auto">
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-text-tertiary mb-1">Target Lead to Simulate:</label>
                <div className="relative flex items-center">
                  <select
                    value={simLeadId}
                    onChange={(e) => setSimLeadId(e.target.value)}
                    className="w-full appearance-none px-2.5 pr-7 py-1.5 rounded-lg bg-background-tertiary-default border border-separator-border text-xs text-text-primary cursor-pointer hover:border-accent-500/50 transition-colors"
                  >
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.business_name} ({l.city || 'Remote'})
                      </option>
                    ))}
                  </select>
                  <RiArrowDownSLine className="pointer-events-none absolute right-2 size-3.5 text-text-tertiary" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-text-tertiary mb-1">Simulated Reply Content:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-background-tertiary-default border border-separator-border text-xs text-text-primary"
                    placeholder="Enter prospect reply text..."
                  />
                  <Button
                    onClick={handleSimulateRescue}
                    disabled={simulating}
                    variant="primary"
                    size="small"
                  >
                    {simulating ? 'Simulating...' : 'Trigger Rescue'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preventive Immunity Callout */}
        <div className="px-6 py-2.5 bg-background-secondary-default border-b border-separator-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-accent-500/10 text-accent-500">
              <RiFileCodeLine className="h-3.5 w-3.5" />
            </span>
            <span className="text-text-secondary">
              <strong className="text-text-primary">Spam Immunity Rule:</strong> Download the XML filter above, then open <strong>Gmail Settings -&gt; Filters -&gt; Import filters</strong>. Gmail will permanently whitelabel your lead domains so they never trigger Spam!
            </span>
          </div>
        </div>

        {/* Rescued Replies List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase font-mono tracking-wider text-text-tertiary">
                Rescued Client Responses ({replies.length})
              </h3>
              {replies.length > 0 && (
                <Chip variant="subtle" color="emerald" size="sm">
                  {status?.stats?.positive || 0} Hot Deals
                </Chip>
              )}
            </div>
            <span className="text-[11px] text-text-tertiary">
              {status?.lastScan ? `Last scanned: ${new Date(status.lastScan).toLocaleTimeString()}` : 'No scans yet'}
            </span>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-text-tertiary">
              <RiRefreshLine className="h-5 w-5 animate-spin mr-2" />
              Loading rescued messages...
            </div>
          ) : replies.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-separator-border rounded-xl">
              <div className="h-12 w-12 rounded-full bg-background-secondary-default flex items-center justify-center text-text-tertiary mb-3">
                <RiInboxLine className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-text-primary mb-1">
                No Rescued Emails in Spam Yet
              </h4>
              <p className="text-xs text-text-secondary max-w-sm mb-4">
                When prospects reply to your cold pitches and Gmail misclassifies them into [Gmail]/Spam, our IMAP bridge instantly moves them to your Primary INBOX so your phone rings!
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleScanNow}
                  disabled={!status?.configured}
                  variant="primary"
                  size="small"
                >
                  Scan Spam Now
                </Button>
                <Button
                  onClick={() => setShowSimulate(true)}
                  variant="secondary"
                  size="small"
                >
                  Test with Simulation
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 rounded-xl bg-background-secondary-default hover:bg-background-tertiary-default border border-separator-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary truncate">
                        {reply.sender_name || reply.sender_email}
                      </span>
                      <span className="text-[11px] font-mono text-text-tertiary">
                        &lt;{reply.sender_email}&gt;
                      </span>
                      {getSentimentBadge(reply.sentiment)}
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-accent-500/10 text-accent-500 border border-accent-500/20 flex items-center gap-1">
                        <RiNotificationLine className="h-2.5 w-2.5" />
                        <span>Moved to Primary INBOX</span>
                      </span>
                    </div>

                    <div className="text-xs font-medium text-text-primary">
                      {reply.subject || 'No Subject'}
                    </div>

                    <div className="text-xs text-text-secondary line-clamp-2 bg-background-primary-default p-2 rounded-lg border border-separator-border font-sans">
                      {reply.body_preview || 'No message snippet available'}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-1">
                      <span>Rescued: {new Date(reply.rescued_at).toLocaleString()}</span>
                      {reply.business_name && (
                        <span>• Lead: <strong>{reply.business_name}</strong></span>
                      )}
                      <span>• Origin: <span className="font-mono text-[10px]">{reply.folder_origin}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {reply.lead_id && (
                      <Button
                        onClick={() => {
                          const target = leads.find(l => l.id === reply.lead_id);
                          if (target && onSelectLead) {
                            onSelectLead(target);
                            onClose();
                          }
                        }}
                        variant="secondary"
                        size="small"
                        trailingIcon={RiArrowRightLine}
                        title="Open Lead in Kanban & Outreach Drawer"
                      >
                        Open Lead
                      </Button>
                    )}

                    <Button
                      onClick={() => handleDeleteReply(reply.id)}
                      variant="ghost"
                      size="small"
                      leadingIcon={RiDeleteBin6Line}
                      iconOnly
                      aria-label="Delete record"
                      title="Delete record"
                      className="text-text-tertiary hover:text-danger-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>

      {/* Footer */}
      <ModalFooter className="px-6 py-3 border-t border-separator-border bg-background-secondary-default flex items-center justify-between text-xs text-text-secondary shrink-0">
        <div className="flex items-center gap-2">
          <RiFireLine className="h-4 w-4 text-warning-primary" />
          <span>Automatic Kanban Pipeline Sync: Rescued leads are moved to <strong>"In Discussion"</strong> & follow-up sequence paused.</span>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={onClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
