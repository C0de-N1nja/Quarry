import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RiSearch2Line,
  RiFlashlightFill,
  RiFileUploadLine,
  RiDownloadLine,
  RiMailSendLine,
  RiSettings4Line,
  RiMoonClearLine,
  RiSunLine,
  RiLayoutGridLine,
  RiDashboardLine,
  RiKanbanView2,
  RiGlobalLine,
  RiBuildingLine,
  RiMapPinLine,
  RiPhoneLine,
  RiMailLine,
  RiCheckboxCircleLine,
  RiArrowRightLine
} from '@remixicon/react';
import { Modal, ModalBody } from '@/components/base/modal/modal';
import { SearchField } from '@/components/base/search-field/search-field';
import { Chip } from '@/components/base/badges/chip';
import { Kbd } from '@/components/base/kbd/kbd';
import { cx } from '@/utils/cx';

export default function CommandPalette({
  isOpen,
  onClose,
  leads = [],
  onSelectLead,
  onOpenAudit,
  onOpenAutoPilot,
  onOpenSearch,
  onOpenQueue,
  onOpenSettings,
  onExportExcel,
  onToggleTheme,
  theme,
  viewMode,
  onViewModeChange
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Static commands list
  const actions = useMemo(() => [
    {
      id: 'autopilot',
      category: 'Actions',
      title: 'Launch 1-Click Auto-Pilot',
      description: 'Run automated batch scraping, OSINT and outreach pipeline',
      icon: RiFlashlightFill,
      iconColor: 'text-accent-500',
      action: () => { onClose(); onOpenAutoPilot && onOpenAutoPilot(); }
    },
    {
      id: 'find-leads',
      category: 'Actions',
      title: 'Find Leads on Google Maps',
      description: 'Search local niches and extract no-website businesses',
      icon: RiSearch2Line,
      iconColor: 'text-indigo-500',
      action: () => { onClose(); onOpenSearch && onOpenSearch('search'); }
    },
    {
      id: 'import-csv',
      category: 'Actions',
      title: 'Import Prospects from CSV',
      description: 'Upload spreadsheet with business names and phone numbers',
      icon: RiFileUploadLine,
      iconColor: 'text-emerald-500',
      action: () => { onClose(); onOpenSearch && onOpenSearch('csv'); }
    },
    {
      id: 'delivery-queue',
      category: 'Actions',
      title: 'Open Delivery Outbox Queue',
      description: 'Inspect pending scheduled emails and campaign drips',
      icon: RiMailSendLine,
      iconColor: 'text-amber-500',
      action: () => { onClose(); onOpenQueue && onOpenQueue(); }
    },
    {
      id: 'export-excel',
      category: 'Actions',
      title: 'Export Leads to Excel (.xlsx)',
      description: 'Download full database with enriched OSINT contacts',
      icon: RiDownloadLine,
      iconColor: 'text-sky-500',
      action: () => { onClose(); onExportExcel && onExportExcel(); }
    },
    {
      id: 'toggle-theme',
      category: 'Preferences',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      description: 'Toggle between BoardUI light canvas and dark workspace',
      icon: theme === 'dark' ? RiSunLine : RiMoonClearLine,
      iconColor: theme === 'dark' ? 'text-amber-400' : 'text-indigo-400',
      action: () => { onClose(); onToggleTheme && onToggleTheme(); }
    },
    {
      id: 'settings',
      category: 'Preferences',
      title: 'Settings & SMTP Pool',
      description: 'Configure email providers, API keys and automation options',
      icon: RiSettings4Line,
      iconColor: 'text-neutral-400',
      action: () => { onClose(); onOpenSettings && onOpenSettings(); }
    },
    {
      id: 'view-split',
      category: 'Views',
      title: 'Switch to Fast Triage (Split View)',
      description: 'High-speed two-pane inspection and keyboard triage',
      icon: RiLayoutGridLine,
      iconColor: 'text-accent-500',
      action: () => { onClose(); onViewModeChange && onViewModeChange('split'); }
    },
    {
      id: 'view-table',
      category: 'Views',
      title: 'Switch to Leads Table View',
      description: 'Dense tabular overview with full pagination and bulk actions',
      icon: RiDashboardLine,
      iconColor: 'text-accent-500',
      action: () => { onClose(); onViewModeChange && onViewModeChange('table'); }
    },
    {
      id: 'view-kanban',
      category: 'Views',
      title: 'Switch to Kanban Pipeline',
      description: 'Visual deal stages from Discovered to Pitch Won',
      icon: RiKanbanView2,
      iconColor: 'text-accent-500',
      action: () => { onClose(); onViewModeChange && onViewModeChange('kanban'); }
    }
  ], [theme, onClose, onOpenAutoPilot, onOpenSearch, onOpenQueue, onExportExcel, onToggleTheme, onOpenSettings, onViewModeChange]);

  // Lead search results
  const matchingLeads = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return leads
      .filter(l => 
        (l.business_name && l.business_name.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.niche && l.niche.toLowerCase().includes(q)) ||
        (l.owner_name && l.owner_name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q))
      )
      .slice(0, 8)
      .map(l => ({
        id: `lead-${l.id}`,
        category: 'Leads',
        title: l.business_name,
        description: [l.city, l.niche || l.category, l.phone].filter(Boolean).join(' • '),
        icon: RiBuildingLine,
        iconColor: 'text-accent-600',
        badge: l.has_no_website ? 'No Website' : (l.website_audit_score ? `${l.website_audit_score}% Audit` : null),
        badgeColor: l.has_no_website ? 'rose' : 'indigo',
        action: () => { onClose(); onSelectLead && onSelectLead(l); }
      }));
  }, [leads, query, onClose, onSelectLead]);

  // Combined searchable items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase().trim();
    const matchedActions = actions.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.description.toLowerCase().includes(q)
    );
    return [...matchingLeads, ...matchedActions];
  }, [actions, matchingLeads, query]);

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl border border-separator-border bg-background-primary-default shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="p-3 border-b border-separator-border bg-background-secondary-default flex items-center gap-2">
          <RiSearch2Line className="size-5 text-text-tertiary shrink-0 ml-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, commands, views, or actions..."
            autoFocus
            className="flex-1 bg-transparent text-body-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Kbd className="text-[10px]">Esc</Kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <RiSearch2Line className="size-8 mx-auto text-text-tertiary mb-2 opacity-50" />
              <p className="text-body-small font-medium text-text-secondary">No matching leads or actions found</p>
              <p className="text-caption-1-regular text-text-tertiary mt-0.5">Try searching for a business name, city, or command</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cx(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                    isSelected 
                      ? "bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300 ring-1 ring-accent-500/30" 
                      : "text-text-primary hover:bg-background-secondary-hover"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cx(
                      "flex size-8 items-center justify-center rounded-lg shrink-0",
                      isSelected ? "bg-accent-600 text-white" : "bg-background-secondary-default text-text-secondary"
                    )}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-small font-medium tracking-tight truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Chip size="sm" variant="subtle" color={item.badgeColor || 'indigo'}>
                            {item.badge}
                          </Chip>
                        )}
                      </div>
                      <p className="text-caption-1-regular text-text-tertiary truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-caption-2-medium uppercase tracking-wider text-text-tertiary font-mono text-[10px]">
                      {item.category}
                    </span>
                    {isSelected && (
                      <RiArrowRightLine className="size-4 text-accent-500" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="px-4 py-2 border-t border-separator-border bg-background-secondary-default/50 flex items-center justify-between text-caption-2-regular text-text-tertiary font-mono text-[11px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd className="text-[10px]">↑</Kbd>
              <Kbd className="text-[10px]">↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[10px]">↵</Kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[10px]">Esc</Kbd>
              <span>close</span>
            </span>
          </div>
          <span>Quarry Quick Engine</span>
        </div>
      </div>
    </div>
  );
}
