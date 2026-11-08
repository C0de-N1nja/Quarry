import React, { useState, useEffect } from 'react';
import { 
  RiMailLine, 
  RiSendPlaneLine, 
  RiDeleteBinLine, 
  RiRefreshLine, 
  RiCheckLine, 
  RiAlertLine, 
  RiTimeLine,
  RiInboxArchiveLine
} from '@remixicon/react';
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';

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
        setItems(data.items || []);
        setSentToday(data.sentToday || 0);
        setDailyLimit(data.dailyLimit || 30);
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
        return (
          <Chip variant="caption" color="yellow" className="gap-1 inline-flex items-center">
            <StatusDot color="yellow" />
            <span>Pending Review</span>
          </Chip>
        );
      case 'sending':
        return (
          <Chip variant="caption" color="blue" className="gap-1 inline-flex items-center animate-pulse">
            <StatusDot color="indigo" />
            <span>Dispatching...</span>
          </Chip>
        );
      case 'sent':
        return (
          <Chip variant="caption" color="lime" className="gap-1 inline-flex items-center">
            <StatusDot color="green" />
            <span>Sent</span>
          </Chip>
        );
      case 'failed':
        return (
          <Chip variant="caption" color="rose" className="gap-1 inline-flex items-center">
            <RiAlertLine className="size-3" />
            <span>Failed</span>
          </Chip>
        );
      default:
        return <Chip variant="caption" color="neutral">{status}</Chip>;
    }
  };

  return (
    <Modal
      isOpen={true}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      aria-label="Outbox Queue and Anti-Spam Dispatcher"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-separator-border px-6 py-4 bg-background-secondary-default/40">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-status-blue-background text-status-blue-text">
            <RiMailLine className="size-5" />
          </div>
          <div>
            <h2 className="text-body-medium font-semibold text-text-primary">
              Outbox Queue & Anti-Spam Dispatcher
            </h2>
            <p className="text-caption-1-regular text-text-tertiary">
              Manage scheduled outreach emails, rate limits, and live dispatch logs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="ghost"
            leadingIcon={RiRefreshLine}
            onClick={fetchOutbox}
            disabled={loading}
            iconOnly
            aria-label="Refresh Queue"
            title="Refresh Queue"
          />
          <CloseButton size="md" onClick={onClose} aria-label="Close Outbox" />
        </div>
      </div>

      <ModalBody className="p-0">
        {/* Daily Sending Limit Meter */}
        <div className="px-6 py-3.5 bg-background-secondary-default/50 border-b border-separator-border flex items-center justify-between text-caption-1-regular gap-4">
          <div>
            <span className="text-text-tertiary">Daily Anti-Spam Dispatch Quota: </span>
            <span className="font-semibold text-text-primary font-mono">{sentToday} / {dailyLimit} sent today</span>
          </div>
          <div className="w-48 bg-background-primary-default rounded-full h-2 overflow-hidden border border-separator-border">
            <div 
              className={`h-full transition-all ${sentToday >= dailyLimit ? 'bg-status-rose-text' : 'bg-status-blue-text'}`} 
              style={{ width: `${Math.min(100, (sentToday / dailyLimit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-status-rose-background/50 border border-status-rose-background text-status-rose-text text-caption-1-medium flex items-center gap-2">
            <RiAlertLine className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-status-lime-background/50 border border-status-lime-background text-status-lime-text text-caption-1-medium flex items-center gap-2">
            <RiCheckLine className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Outbox Items List */}
        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <RiInboxArchiveLine className="size-10 mx-auto mb-2 opacity-40 text-text-secondary" />
              <p className="text-body-medium font-medium text-text-secondary">Outbox queue is currently empty</p>
              <p className="text-caption-1-regular text-text-tertiary mt-1">
                Select any lead from the pipeline and click "Queue in Outbox" or "1-Click Send".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-background-secondary-default/60 border border-separator-border space-y-2 text-caption-1-regular">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary flex items-center gap-2 flex-wrap">
                        <span>{item.recipient_name || 'Prospect'}</span>
                        <span className="font-mono text-text-tertiary text-caption-1-regular">({item.recipient_email})</span>
                      </div>
                      <div className="text-text-secondary font-mono text-caption-1-regular mt-0.5 truncate">
                        Subject: {item.subject}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(item.status)}
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size="xs"
                            variant="primary"
                            leadingIcon={RiSendPlaneLine}
                            onClick={() => handleSendNow(item.id)}
                            disabled={sendingId === item.id}
                          >
                            Send Now
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            leadingIcon={RiDeleteBinLine}
                            iconOnly
                            aria-label="Cancel email"
                            onClick={() => handleDelete(item.id)}
                            title="Cancel email"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {item.error_message && (
                    <div className="p-2 rounded-lg bg-status-rose-background/50 text-status-rose-text text-caption-1-medium font-mono">
                      Error: {item.error_message}
                    </div>
                  )}

                  {item.sent_at && (
                    <div className="text-caption-1-regular text-text-tertiary font-mono">
                      Sent timestamp: {item.sent_at}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="border-t border-separator-border px-6 py-3 bg-background-secondary-default/30 flex items-center justify-between">
        <Chip variant="subtle" color="neutral">
          {items.length} Queued Items
        </Chip>
        <Button size="small" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
