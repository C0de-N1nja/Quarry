import React from 'react';
import { 
  RiWhatsappLine, 
  RiMailLine, 
  RiCalendarCheckLine, 
  RiTrophyLine, 
  RiSearchLine,
  RiTimeLine,
  RiLoader4Line
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { getNextAction } from '@/utils/nextAction';
import { cx } from '@/utils/cx';

export default function NextActionButton({
  lead,
  onFindContact,
  onWhatsApp,
  onEmail,
  onFollowUp,
  onMarkWon,
  size = "small",
  isLoading = false,
  loadingText,
  className
}) {
  if (!lead) return null;

  const action = getNextAction(lead);

  if (action.type === 'none') {
    if (action.text) {
      return (
        <span 
          className={cx(
            "inline-flex items-center gap-1 text-[11px] font-mono text-text-tertiary px-2 py-0.5 rounded bg-background-secondary-default/50 border border-separator-border/40 select-none",
            className
          )}
          title={`Scheduled follow-up reminder: ${action.followUpDate || ''}`}
        >
          <RiTimeLine className="size-3 text-text-tertiary shrink-0" />
          <span>{action.text}</span>
        </span>
      );
    }
    return null;
  }

  const handleClick = (e) => {
    e?.stopPropagation();
    if (isLoading) return;
    switch (action.type) {
      case 'find_contact':
        onFindContact && onFindContact(lead);
        break;
      case 'whatsapp':
        onWhatsApp && onWhatsApp(lead);
        break;
      case 'email':
        onEmail && onEmail(lead);
        break;
      case 'follow_up':
        onFollowUp && onFollowUp(lead);
        break;
      case 'mark_won':
        onMarkWon && onMarkWon(lead);
        break;
      default:
        break;
    }
  };

  let icon = isLoading ? RiLoader4Line : RiSearchLine;
  let colorStyles = "border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-slate-950";

  if (action.type === 'whatsapp') {
    icon = isLoading ? RiLoader4Line : RiWhatsappLine;
    colorStyles = "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950 font-bold";
  } else if (action.type === 'email') {
    icon = isLoading ? RiLoader4Line : RiMailLine;
    colorStyles = "border-blue-500/50 text-blue-500 hover:bg-blue-500 hover:text-white font-medium";
  } else if (action.type === 'follow_up') {
    icon = isLoading ? RiLoader4Line : RiCalendarCheckLine;
    colorStyles = "border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-slate-950 font-medium";
  } else if (action.type === 'mark_won') {
    icon = isLoading ? RiLoader4Line : RiTrophyLine;
    colorStyles = "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent font-bold";
  }

  const label = isLoading && loadingText ? loadingText : action.label;

  return (
    <Button
      size={size}
      variant={action.type === 'mark_won' ? 'primary' : 'secondary'}
      leadingIcon={icon}
      onClick={handleClick}
      disabled={isLoading}
      className={cx("text-xs transition-all", colorStyles, className)}
      title={`Next action: ${label}`}
      aria-label={`Action: ${label} for ${lead.business_name || 'lead'}`}
    >
      {label}
    </Button>
  );
}
