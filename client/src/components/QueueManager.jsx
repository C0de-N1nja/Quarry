import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Trash2, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function QueueManager({ onClose, onQueueUpdated }) {
  const [items, setItems] = useState([]);
  const [sentToday, setSentToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/outreach/outbox');
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setSentToday(data.sentToday);
        setDailyLimit(data.dailyLimit);
      }
    } catch (err) {
      setErrorMsg('Failed to fetch outbox queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
  }, []);

  const handleSendNow = async (id) => {
    setSendingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/outreach/send/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuccessMsg('Email dispatched successfully via SMTP!');
      await fetchOutbox();
      if (onQueueUpdated) onQueueUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Send failed');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this queued email?')) return;
    try {
      const res = await fetch(`/api/outreach/outbox/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchOutbox();
        if (onQueueUpdated) onQueueUpdated();
      }
    } catch (err) {
      setErrorMsg('Failed to delete item');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Pending Review</span>;
      case 'sending':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">Dispatching...</span>;
      case 'sent':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-2/40">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Outbox Queue & Anti-Spam Dispatcher</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOutbox} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Daily Sending Limit Meter */}
        <div className="px-6 py-3 bg-surface-2/70 border-b border-border-subtle flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Daily Anti-Spam Dispatch Quota: </span>
            <span className="font-semibold text-gray-900 dark:text-white font-mono">{sentToday} / {dailyLimit} sent today</span>
          </div>
          <div className="w-48 bg-surface-3 rounded-full h-2 overflow-hidden border border-border-subtle">
            <div 
              className={`h-full transition-all ${sentToday >= dailyLimit ? 'bg-rose-500' : 'bg-brand'}`} 
              style={{ width: `${Math.min(100, (sentToday / dailyLimit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

        {/* Outbox Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-xs">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Outbox queue is currently empty.</p>
              <p className="text-[11px] mt-1">Select any lead from the pipeline and click "Queue in Outbox" or "1-Click Send".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-surface-2 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>{item.recipient_name || 'Prospect'}</span>
                        <span className="font-mono text-gray-500 dark:text-gray-400 text-[11px]">({item.recipient_email})</span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 font-mono text-[11px] mt-0.5">
                        Subject: {item.subject}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleSendNow(item.id)}
                            disabled={sendingId === item.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-brand hover:bg-brand-hover text-white transition-colors"
                          >
                            {sendingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            <span>Send Now</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Cancel email"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {item.error_message && (
                    <div className="p-2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-mono">
                      Error: {item.error_message}
                    </div>
                  )}

                  {item.sent_at && (
                    <div className="text-[10px] text-gray-500 font-mono">
                      Sent timestamp: {item.sent_at}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
