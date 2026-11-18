import React, { useState, useEffect } from 'react';
import { 
  RiTimeLine, 
  RiPhoneLine, 
  RiWhatsappLine, 
  RiMailLine, 
  RiBookmarkLine,
  RiCheckLine,
  RiSendPlaneLine,
  RiUserSharedLine,
  RiRefreshLine
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { toast } from '@/components/base/toast/toast';

const CALL_OUTCOMES = [
  'Spoke with Owner',
  'Left Voicemail',
  'Gatekeeper Blocked',
  'Call Back Later',
  'Wrong Number'
];

export default function ActivityLogCard({ leadId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = () => {
    if (!leadId) return;
    setLoading(true);
    fetch(`/api/leads/${leadId}/activities`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setActivities(d.activities || []);
      })
      .catch(err => console.error('Failed to load activities', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivities();
  }, [leadId]);

  const handleLogCall = async (outcome) => {
    if (!leadId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call',
          channel: 'phone',
          title: `Phone Call: ${outcome}`,
          details: noteText || `Call logged: ${outcome}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        setNoteText('');
        toast.success(`Logged call: "${outcome}"`);
      } else {
        toast.error('Failed to log call');
      }
    } catch (e) {
      toast.error('Failed to log call');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCustomNote = async (e) => {
    e?.preventDefault();
    if (!noteText.trim() || !leadId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          channel: 'manual',
          title: 'Manual Activity Note',
          details: noteText.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        setNoteText('');
        toast.success('Activity note logged');
      } else {
        toast.error('Failed to log activity');
      }
    } catch (e) {
      toast.error('Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type, channel) => {
    if (channel === 'whatsapp' || type === 'whatsapp') {
      return <RiWhatsappLine className="size-3.5 text-emerald-400" />;
    }
    if (channel === 'email' || type === 'email') {
      return <RiMailLine className="size-3.5 text-blue-400" />;
    }
    if (channel === 'phone' || type === 'call') {
      return <RiPhoneLine className="size-3.5 text-amber-400" />;
    }
    if (type === 'stage_change') {
      return <RiCheckLine className="size-3.5 text-indigo-400" />;
    }
    return <RiBookmarkLine className="size-3.5 text-text-tertiary" />;
  };

  return (
    <section className="rounded-2xl border border-separator-border bg-background-primary-default p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiTimeLine className="size-4 text-blue-500" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
            Activity & Interaction History
          </h2>
          <Chip variant="subtle" color="blue" size="sm">
            {activities.length} Touches
          </Chip>
        </div>
        <button
          type="button"
          onClick={fetchActivities}
          className="text-text-tertiary hover:text-text-primary text-[11px] font-mono flex items-center gap-1 cursor-pointer"
        >
          <RiRefreshLine className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Call Log Outcome Buttons */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase text-text-tertiary block font-semibold">
          Quick Call Logger
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CALL_OUTCOMES.map((outcome) => (
            <button
              key={outcome}
              type="button"
              disabled={submitting}
              onClick={() => handleLogCall(outcome)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-separator-border bg-background-secondary-default text-text-secondary hover:text-text-primary hover:border-text-secondary transition-all cursor-pointer flex items-center gap-1"
            >
              <RiPhoneLine className="size-3 text-text-tertiary" />
              <span>{outcome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Freeform Interaction Logger Input */}
      <form onSubmit={handleAddCustomNote} className="flex gap-2">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add call notes, client objections, or interaction summary..."
          className="flex-1 h-9 px-3 rounded-xl bg-background-secondary-default text-text-primary border border-separator-border text-xs focus:border-text-primary focus:outline-none transition-colors"
        />
        <Button
          type="submit"
          size="small"
          variant="secondary"
          disabled={!noteText.trim() || submitting}
          leadingIcon={RiSendPlaneLine}
        >
          Log Touch
        </Button>
      </form>

      {/* Activity Timeline Feed */}
      <div className="space-y-2 pt-2 border-t border-separator-border/60">
        {activities.length === 0 ? (
          <p className="text-xs text-text-tertiary italic text-center py-3">
            No activity logged yet. Touches, WhatsApp dispatches, and calls will appear here.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded-xl bg-background-secondary-default border border-separator-border/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="size-6 rounded-lg bg-background-primary-default border border-separator-border flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(act.type, act.channel)}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-text-primary truncate">
                      {act.title}
                    </p>
                    {act.details && (
                      <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-2">
                        {act.details}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono text-text-tertiary whitespace-nowrap shrink-0">
                  {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
