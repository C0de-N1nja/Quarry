import React, { useMemo, useState, useEffect } from 'react';
import {
  RiShieldCheckLine,
  RiSpeedUpLine,
  RiGlobalLine,
  RiPhoneLine,
  RiMailLine,
  RiWhatsappLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiArchiveLine,
  RiRefreshLine,
  RiMore2Fill,
  RiStarLine,
  RiCheckDoubleLine,
  RiUploadCloud2Line,
  RiDownload2Line,
  RiArrowDownSLine,
  RiCloseLine,
  RiAlertLine
} from '@remixicon/react';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Select, SelectItem } from '@/components/base/select/select';
import { SearchField } from '@/components/base/search-field/search-field';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Button } from '@/components/base/buttons/button';
import { Pagination } from '@/components/base/pagination/pagination';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownGroup, DropdownItem, DropdownDivider } from '@/components/base/dropdown/dropdown';
import { isSocialOrAggregator } from '@/utils/is-social';
import { cx } from '@/utils/cx';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Stable avatar tint palette (6 tints: indigo, green, amber, blue, violet, rose)
 */
const AVATAR_TINTS = [
  { bg: 'var(--brand-tint-bg)', text: 'var(--brand-tint-text)', border: 'var(--brand-tint-border)' },
  { bg: 'var(--tint-success-bg)', text: 'var(--tint-success-text)', border: 'var(--tint-success-border)' },
  { bg: 'var(--tint-warning-bg)', text: 'var(--tint-warning-text)', border: 'var(--tint-warning-border)' },
  { bg: 'var(--tint-info-bg)', text: 'var(--tint-info-text)', border: 'var(--tint-info-border)' },
  { bg: 'var(--tint-violet-bg)', text: 'var(--tint-violet-text)', border: 'var(--tint-violet-border)' },
  { bg: 'var(--tint-rose-bg)', text: 'var(--tint-rose-text)', border: 'var(--tint-rose-border)' },
];

function getAvatarTint(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_TINTS.length;
  return AVATAR_TINTS[index];
}

/**
 * Stage chip styling and text:
 * Discovered = neutral, Audited = info, Enriched = info, Pitched = violet,
 * Sent = brand indigo, Replied = success, Won = success (stronger fill), Archived = neutral (muted).
 */
function getStageBadge(lead, isOptedOut) {
  if (isOptedOut) {
    return {
      label: 'Opted out',
      className: 'bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] border border-[var(--tint-neutral-border)]'
    };
  }
  const status = (lead?.status || '').toLowerCase();
  switch (status) {
    case 'discovered':
      return {
        label: 'Discovered',
        className: 'bg-[var(--tint-neutral-bg)] text-[var(--tint-neutral-text)] border border-[var(--tint-neutral-border)]'
      };
    case 'audited':
      return {
        label: 'Audited',
        className: 'bg-[var(--tint-info-bg)] text-[var(--tint-info-text)] border border-[var(--tint-info-border)]'
      };
    case 'enriched':
      return {
        label: 'Enriched',
        className: 'bg-[var(--tint-info-bg)] text-[var(--tint-info-text)] border border-[var(--tint-info-border)]'
      };
    case 'pitched':
      return {
        label: 'Pitched',
        className: 'bg-[var(--tint-violet-bg)] text-[var(--tint-violet-text)] border border-[var(--tint-violet-border)]'
      };
    case 'sent':
      return {
        label: 'Sent',
        className: 'bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)]'
      };
    case 'replied':
      return {
        label: 'Replied',
        className: 'bg-[var(--tint-success-bg)] text-[var(--tint-success-text)] border border-[var(--tint-success-border)]'
      };
    case 'won':
      return {
        label: 'Won',
        className: 'bg-[var(--solid-won-bg)] text-white border border-transparent font-bold shadow-xs'
      };
    case 'archived':
      return {
        label: 'Archived',
        className: 'bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] border border-[var(--tint-neutral-border)]'
      };
    default:
      return {
        label: status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Discovered',
        className: 'bg-[var(--tint-neutral-bg)] text-[var(--tint-neutral-text)] border border-[var(--tint-neutral-border)]'
      };
  }
}

/**
 * Normalizes niche casing in UI only (e.g. "Hvac" -> "HVAC", "plumber" -> "Plumber")
 */
function normalizeNiche(niche = '') {
  if (!niche) return 'General';
  const acronyms = {
    hvac: 'HVAC',
    seo: 'SEO',
    ada: 'ADA',
    cpr: 'CPR',
    atm: 'ATM',
    llc: 'LLC',
    cpa: 'CPA',
    md: 'MD',
    dds: 'DDS'
  };

  return niche
    .split(/[\s_-]+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (acronyms[lower]) return acronyms[lower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export default function BoardLeadTable({
  leads = [],
  totalCount = 0,
  stats,
  selectedLead,
  onSelectLead,
  onOpenLeadDrawer,
  onRunOsint,
  onOpenOsintRun,
  onDeleteLead,
  onArchiveLead,
  onOpenSearch,
  onExportExcel,
  activeFilter = 'all',
  onFilterChange,
  activeNiche = 'all',
  onNicheChange,
  activeCity = 'all',
  onCityChange,
  contactChannel = 'all',
  onContactChannelChange,
  focusTier = 'vault',
  onFocusTierChange,
  onCleanWebsites,
  onResetOsint,
  onOpenAudit,
  searchTerm = '',
  onSearchChange,
  currentPage = 1,
  onPageChange,
  pageSize = '50',
  onPageSizeChange,
}) {
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);

  // Dialog States
  const [isOsintScopeModalOpen, setIsOsintScopeModalOpen] = useState(false);
  const [osintScopeChoice, setOsintScopeChoice] = useState('filter'); // 'selected', 'filter', 'all'
  const [leadToDelete, setLeadToDelete] = useState(null); // single lead to delete
  const [isCleanSitesConfirmOpen, setIsCleanSitesConfirmOpen] = useState(false);
  const [isResetOsintConfirmOpen, setIsResetOsintConfirmOpen] = useState(false);

  // Pagination calculations
  const numericPageSize = parseInt(pageSize, 10) || 50;
  const totalItems = totalCount || leads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / numericPageSize));

  const displayedLeads = useMemo(() => {
    return leads.slice(0, numericPageSize);
  }, [leads, numericPageSize]);

  // Unique Niches
  const nicheOptions = useMemo(() => {
    if (stats?.collections && stats.collections.length > 0) {
      return stats.collections.map(c => typeof c === 'string' ? c : c.niche || c.name);
    }
    const set = new Set();
    leads.forEach(l => {
      if (l.category) set.add(l.category);
      if (l.niche) set.add(l.niche);
    });
    return Array.from(set).slice(0, 25);
  }, [stats, leads]);

  // Unique Cities
  const cityOptions = useMemo(() => {
    if (stats?.cities && stats.cities.length > 0) {
      return stats.cities.map(c => typeof c === 'string' ? c : c.name || c.city);
    }
    const set = new Set();
    leads.forEach(l => {
      if (l.city && l.city.trim()) set.add(l.city.trim());
    });
    return Array.from(set).slice(0, 25);
  }, [stats, leads]);

  const allPageIds = useMemo(() => displayedLeads.map(l => l.id), [displayedLeads]);
  const isAllPageSelected = displayedLeads.length > 0 && allPageIds.every(id => selectedLeadIds.has(id));
  const isPartiallySelected = displayedLeads.length > 0 && allPageIds.some(id => selectedLeadIds.has(id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected || isAllMatchingSelected) {
      setSelectedLeadIds(new Set());
      setIsAllMatchingSelected(false);
    } else {
      setSelectedLeadIds(new Set(allPageIds));
      setIsAllMatchingSelected(false);
    }
  };

  const handleToggleLead = (id, e) => {
    e?.stopPropagation();
    setIsAllMatchingSelected(false);
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
    setIsAllMatchingSelected(false);
  };

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isInput) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(displayedLeads.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === ' ' || e.key === 'x') {
        if (focusedIndex >= 0 && displayedLeads[focusedIndex]) {
          e.preventDefault();
          handleToggleLead(displayedLeads[focusedIndex].id);
        }
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && displayedLeads[focusedIndex]) {
          e.preventDefault();
          onOpenLeadDrawer && onOpenLeadDrawer(displayedLeads[focusedIndex]);
        }
      } else if (e.key === 'Escape') {
        if (selectedLeadIds.size > 0 || isAllMatchingSelected) {
          e.preventDefault();
          handleClearSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedLeads, focusedIndex, selectedLeadIds, isAllMatchingSelected, onOpenLeadDrawer]);

  // Scope OSINT Submission
  const handleConfirmRunOsint = () => {
    setIsOsintScopeModalOpen(false);
    if (!onOpenOsintRun) return;

    if (osintScopeChoice === 'selected') {
      onOpenOsintRun({
        leadIds: Array.from(selectedLeadIds),
        category: activeNiche,
        filter: activeFilter,
        focusTier,
        contactChannel,
        searchTerm
      });
    } else if (osintScopeChoice === 'all') {
      onOpenOsintRun({
        leadIds: null,
        category: 'all',
        filter: 'all',
        focusTier: 'vault',
        contactChannel: 'all',
        searchTerm: ''
      }, 'all');
    } else {
      // current filter
      onOpenOsintRun({
        leadIds: null,
        category: activeNiche,
        filter: activeFilter,
        focusTier,
        contactChannel,
        city: activeCity,
        searchTerm
      });
    }
  };

  // Bulk Archive
  const handleBulkArchive = async () => {
    if (!onArchiveLead) return;
    const count = isAllMatchingSelected ? totalItems : selectedLeadIds.size;
    if (!window.confirm(`Archive ${count} selected prospects?`)) return;

    const idsToArchive = Array.from(selectedLeadIds);
    for (const id of idsToArchive) {
      await onArchiveLead(id);
    }
    handleClearSelection();
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * numericPageSize + 1;
  const endItem = Math.min(totalItems, currentPage * numericPageSize);

  return (
    <div className="flex w-full flex-col gap-3">

      {/* Main Table Container Card */}
      <section className="flex w-full flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:p-5 shadow-xs">
        
        {/* Tier 1: Tabs + Saved-filter Chip + Action Groups */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--card-border)]">
          
          {/* Tabs: All, Ready to Pitch, No Website + Gold Vault saved-filter chip */}
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-1 border-b-2 border-transparent" aria-label="Lead triage tabs">
              {/* Tab: All */}
              <button
                type="button"
                onClick={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange('all');
                }}
                className={cx(
                  "inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 rounded-lg",
                  activeFilter === 'all' && contactChannel === 'all' && focusTier === 'vault'
                    ? "text-[var(--brand-solid)] border-b-2 border-[var(--brand-solid)] -mb-[1px]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-2 border-transparent -mb-[1px]"
                )}
                aria-current={activeFilter === 'all' && contactChannel === 'all' && focusTier === 'vault' ? 'page' : undefined}
              >
                <span>All</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)]">
                  {(stats?.totalLeads || totalCount || leads.length).toLocaleString()}
                </span>
              </button>

              {/* Tab: Ready to Pitch */}
              <button
                type="button"
                onClick={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange(activeFilter === 'enriched' ? 'all' : 'enriched');
                }}
                className={cx(
                  "inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 rounded-lg",
                  activeFilter === 'enriched'
                    ? "text-[var(--brand-solid)] border-b-2 border-[var(--brand-solid)] -mb-[1px]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-2 border-transparent -mb-[1px]"
                )}
                aria-current={activeFilter === 'enriched' ? 'page' : undefined}
              >
                <span>Ready to Pitch</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)]">
                  {(stats?.enriched || 0).toLocaleString()}
                </span>
              </button>

              {/* Tab: No Website */}
              <button
                type="button"
                onClick={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange(activeFilter === 'no_website' ? 'all' : 'no_website');
                }}
                className={cx(
                  "inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer relative",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 rounded-lg",
                  activeFilter === 'no_website'
                    ? "text-[var(--brand-solid)] border-b-2 border-[var(--brand-solid)] -mb-[1px]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-2 border-transparent -mb-[1px]"
                )}
                aria-current={activeFilter === 'no_website' ? 'page' : undefined}
              >
                <span>No Website</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)]">
                  {(stats?.noWebsite || 0).toLocaleString()}
                </span>
              </button>
            </nav>

            {/* Gold Vault Saved-Filter Chip (Warning tint with star icon) */}
            <button
              type="button"
              onClick={() => {
                if (onFocusTierChange) onFocusTierChange(focusTier === 'gold' ? 'vault' : 'gold');
              }}
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
                focusTier === 'gold'
                  ? "bg-[var(--tint-warning-bg)] border-[var(--tint-warning-border)] text-[var(--tint-warning-text)] ring-1 ring-[var(--tint-warning-border)] shadow-2xs"
                  : "bg-[var(--tint-warning-bg)]/60 border-[var(--tint-warning-border)]/80 text-[var(--tint-warning-text)] hover:bg-[var(--tint-warning-bg)]"
              )}
              title="Toggle Gold Vault high-intent prospects"
              aria-pressed={focusTier === 'gold'}
            >
              <RiStarLine className="size-3.5 fill-current text-[var(--tint-warning-text)]" aria-hidden="true" />
              <span>Gold Vault</span>
              <span className="font-mono text-[11px] opacity-90">({stats?.goldLeads || 0})</span>
            </button>
          </div>

          {/* Right Toolbar Actions: Secondary Run OSINT (indigo tint), More Menu, Import/Export Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* ONE Run OSINT Button (Secondary indigo tint button) */}
            <button
              type="button"
              onClick={() => {
                setOsintScopeChoice(selectedLeadIds.size > 0 ? 'selected' : 'filter');
                setIsOsintScopeModalOpen(true);
              }}
              title="Run OSINT intelligence pipeline with scope selector"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)] hover:opacity-90 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 transition-colors"
            >
              <RiShieldCheckLine className="size-3.5" aria-hidden="true" />
              <span>Run OSINT</span>
            </button>

            {/* "More" Menu: Reset OSINT + Clean N Sites (Neutral outline) */}
            <Dropdown>
              <DropdownTrigger className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                <span>More</span>
                <RiArrowDownSLine className="size-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
              </DropdownTrigger>
              <DropdownPopover aria-label="More actions" placement="bottom end" className="w-56 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl rounded-xl p-1">
                <DropdownGroup>
                  <DropdownItem onSelect={() => setIsResetOsintConfirmOpen(true)} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                    <RiRefreshLine className="size-4 text-[var(--text-secondary)]" />
                    <span>Reset OSINT</span>
                  </DropdownItem>
                  <DropdownItem onSelect={() => setIsCleanSitesConfirmOpen(true)} className="rounded-lg hover:bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] text-xs">
                    <RiDeleteBin6Line className="size-4 text-[var(--tint-danger-text)]" />
                    <span>Clean {stats?.withWebsites || 0} sites</span>
                  </DropdownItem>
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>

            {/* "Import / Export" Menu (Neutral outline) */}
            <Dropdown>
              <DropdownTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                <RiDownload2Line className="size-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
                <span>Import / Export</span>
                <RiArrowDownSLine className="size-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
              </DropdownTrigger>
              <DropdownPopover aria-label="Import and export options" placement="bottom end" className="w-52 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl rounded-xl p-1">
                <DropdownGroup>
                  <DropdownItem onSelect={() => onOpenSearch && onOpenSearch('csv')} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                    <RiUploadCloud2Line className="size-4 text-[var(--text-secondary)]" />
                    <span>Import CSV</span>
                  </DropdownItem>
                  <DropdownDivider className="border-[var(--card-border)]" />
                  <DropdownItem onSelect={() => onExportExcel && onExportExcel('excel')} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                    <RiDownload2Line className="size-4 text-[var(--text-secondary)]" />
                    <span>Export Excel (.xlsx)</span>
                  </DropdownItem>
                  <DropdownItem onSelect={() => onExportExcel && onExportExcel('csv')} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                    <RiDownload2Line className="size-4 text-[var(--text-secondary)]" />
                    <span>Export CSV (.csv)</span>
                  </DropdownItem>
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
          </div>
        </div>

        {/* Tier 2: Search + Niche, Channel & City Filters */}
        <div className="flex w-full flex-col items-start gap-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--card-border)]">
          
          {/* Search Field */}
          <div className="w-full sm:w-72">
            <SearchField
              aria-label="Search prospects"
              placeholder="Search business, phone, city..."
              value={searchTerm}
              onChange={(val) => onSearchChange && onSearchChange(val)}
              size="small"
              className="w-full"
            />
          </div>

          {/* Filter Dropdowns: Niche, Channel, City */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            
            {/* Niche Filter */}
            <Select
              aria-label="Filter by niche"
              className="shrink-0"
              popoverClassName="min-w-44"
              selectedKey={activeNiche}
              onSelectionChange={(k) => onNicheChange && onNicheChange(String(k))}
            >
              <SelectItem id="all" textValue="All Niches">All Niches</SelectItem>
              {nicheOptions.map((n) => (
                <SelectItem key={n} id={n} textValue={normalizeNiche(n)}>
                  {normalizeNiche(n)}
                </SelectItem>
              ))}
            </Select>

            {/* Channel Filter */}
            <Select
              aria-label="Filter by channel"
              className="shrink-0"
              popoverClassName="min-w-40"
              selectedKey={contactChannel}
              onSelectionChange={(k) => onContactChannelChange && onContactChannelChange(String(k))}
            >
              <SelectItem id="all" textValue="All Channels">All Channels</SelectItem>
              <SelectItem id="has_email" textValue="Has Email">Has Email</SelectItem>
              <SelectItem id="has_whatsapp" textValue="WhatsApp Verified">WhatsApp Verified</SelectItem>
              <SelectItem id="phone_only" textValue="Phone Only">Phone Only</SelectItem>
            </Select>

            {/* City Filter */}
            <Select
              aria-label="Filter by city"
              className="shrink-0"
              popoverClassName="min-w-40"
              selectedKey={activeCity}
              onSelectionChange={(k) => onCityChange && onCityChange(String(k))}
            >
              <SelectItem id="all" textValue="All Cities">All Cities</SelectItem>
              {cityOptions.map((c) => (
                <SelectItem key={c} id={c} textValue={c}>{c}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Bulk Action Header Bar (when 1+ rows selected) */}
        {(selectedLeadIds.size > 0 || isAllMatchingSelected) && (
          <div className="my-2 flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--tint-neutral-bg)] border border-[var(--card-border)] text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                {isAllMatchingSelected ? totalItems.toLocaleString() : selectedLeadIds.size} selected
              </span>

              {/* "Select all N matching" link when page selected and more exist */}
              {!isAllMatchingSelected && totalItems > displayedLeads.length && selectedLeadIds.size === displayedLeads.length && (
                <button
                  type="button"
                  onClick={() => setIsAllMatchingSelected(true)}
                  className="text-[var(--brand-solid)] underline hover:text-[var(--brand-solid-hover)] cursor-pointer font-medium ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
                >
                  Select all {totalItems.toLocaleString()} matching
                </button>
              )}

              {isAllMatchingSelected && (
                <span className="text-[var(--text-secondary)] text-[11px] font-mono">
                  (all {totalItems.toLocaleString()} matching filter selected)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                leadingIcon={RiShieldCheckLine}
                onClick={() => {
                  setOsintScopeChoice('selected');
                  setIsOsintScopeModalOpen(true);
                }}
                className="bg-[var(--brand-tint-bg)] text-[var(--brand-tint-text)] border border-[var(--brand-tint-border)] hover:bg-[var(--brand-tint-bg)]/80 font-medium px-2.5 py-1 rounded-lg text-xs"
              >
                Run OSINT
              </Button>

              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiCheckDoubleLine}
                onClick={() => {
                  const firstId = Array.from(selectedLeadIds)[0];
                  const targetLead = leads.find(l => l.id === firstId);
                  if (targetLead && onOpenLeadDrawer) onOpenLeadDrawer(targetLead);
                }}
                className="text-xs"
              >
                Pitch
              </Button>

              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiArchiveLine}
                onClick={handleBulkArchive}
                className="text-xs"
              >
                Archive
              </Button>

              <Button
                size="small"
                variant="ghost"
                onClick={handleClearSelection}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* BoardUI Triage Table */}
        <div className="mt-2 w-full overflow-x-hidden">
          <Table 
            aria-label="Prospects Triage Table" 
            size="md" 
            selectionMode="none" 
            className="w-full table-fixed"
          >
            <TableHeader>
              {/* Checkbox Column */}
              <TableColumn id="select" className="w-11 px-2 py-3 text-center sticky top-0 z-20 bg-[var(--card-bg)]">
                <Checkbox
                  slot={null}
                  aria-label="Select all on this page"
                  isSelected={isAllPageSelected || isAllMatchingSelected}
                  isIndeterminate={isPartiallySelected && !isAllMatchingSelected}
                  onChange={handleToggleSelectAllPage}
                />
              </TableColumn>

              {/* Company Column (Sticky Left) */}
              <TableColumn 
                id="company" 
                isRowHeader 
                className="w-[280px] px-4 py-3 sticky top-0 left-0 z-30 bg-[var(--card-bg)] border-r border-[var(--card-border)]"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Company</span>
              </TableColumn>

              {/* Best Contact Column */}
              <TableColumn id="contact" className="w-[300px] px-4 py-3 sticky top-0 z-20 bg-[var(--card-bg)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Best Contact</span>
              </TableColumn>

              {/* Stage Column */}
              <TableColumn id="stage" className="w-[130px] px-4 py-3 sticky top-0 z-20 bg-[var(--card-bg)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Stage</span>
              </TableColumn>

              {/* Actions Column (Sticky Right) */}
              <TableColumn 
                id="actions" 
                className="w-[160px] px-4 py-3 text-right sticky top-0 right-0 z-30 bg-[var(--card-bg)] border-l border-[var(--card-border)]"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Actions</span>
              </TableColumn>
            </TableHeader>

            <TableBody
              renderEmptyState={() => (
                <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] border border-[var(--tint-neutral-border)]">
                    <RiGlobalLine className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No prospects match your filters</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Clear your search or find new leads to harvest prospects.
                    </p>
                  </div>
                  {onOpenSearch && (
                    <Button
                      size="small"
                      leadingIcon={RiShieldCheckLine}
                      onClick={() => onOpenSearch('search')}
                      className="mt-2 bg-[var(--brand-solid)] hover:bg-[var(--brand-solid-hover)] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      Find Leads
                    </Button>
                  )}
                </div>
              )}
            >
              {displayedLeads.map((lead, index) => {
                const isSelected = selectedLeadIds.has(lead.id) || isAllMatchingSelected;
                const isCurrentlyActive = selectedLead?.id === lead.id;
                const isFocused = focusedIndex === index;
                const businessName = lead.business_name || lead.company_name || 'Prospect';
                const niche = normalizeNiche(lead.category || lead.niche);
                const city = lead.city || lead.state || '';
                
                // Authentic no-website check
                const isNoWebsite = lead.has_no_website === 1 || !lead.website || lead.website === 'None' || isSocialOrAggregator(lead.website);
                const isOptedOut = lead.opted_out === 1 || lead.status === 'opted_out';

                // Best contact resolution: Email > WhatsApp > Phone
                const hasEmail = Boolean(lead.email && lead.email.trim() !== '');
                const hasWhatsApp = Boolean(lead.whatsapp && lead.whatsapp.trim() !== '');
                const hasPhone = Boolean(lead.phone && lead.phone.trim() !== '');

                let bestContact = null;
                const otherContacts = [];

                // Best contact icon coloring: email = info blue, WhatsApp = success green, phone = neutral slate
                if (hasEmail) {
                  bestContact = { 
                    type: 'email', 
                    value: lead.email, 
                    icon: RiMailLine, 
                    iconColor: 'text-[var(--tint-info-text)]' 
                  };
                  if (hasWhatsApp) otherContacts.push({ type: 'whatsapp', value: lead.whatsapp, icon: RiWhatsappLine, iconColor: 'text-[var(--tint-success-text)]' });
                  if (hasPhone) otherContacts.push({ type: 'phone', value: lead.phone, icon: RiPhoneLine, iconColor: 'text-[var(--tint-neutral-text)]' });
                } else if (hasWhatsApp) {
                  bestContact = { 
                    type: 'whatsapp', 
                    value: lead.whatsapp || lead.phone, 
                    icon: RiWhatsappLine, 
                    iconColor: 'text-[var(--tint-success-text)]' 
                  };
                  if (hasPhone && lead.phone !== lead.whatsapp) otherContacts.push({ type: 'phone', value: lead.phone, icon: RiPhoneLine, iconColor: 'text-[var(--tint-neutral-text)]' });
                } else if (hasPhone) {
                  bestContact = { 
                    type: 'phone', 
                    value: lead.phone, 
                    icon: RiPhoneLine, 
                    iconColor: 'text-[var(--tint-neutral-text)]' 
                  };
                }

                // Stage chip resolution with semantic colors
                const stage = getStageBadge(lead, isOptedOut);
                const avatarTint = getAvatarTint(businessName);

                return (
                  <TableRow
                    key={lead.id}
                    id={String(lead.id)}
                    onClick={() => {
                      setFocusedIndex(index);
                      onOpenLeadDrawer && onOpenLeadDrawer(lead);
                    }}
                    className={cx(
                      "h-[60px] cursor-pointer transition-colors duration-150 border-l-[3px]",
                      "hover:bg-[var(--row-hover-bg)]",
                      isSelected
                        ? "bg-[var(--row-selected-bg)] border-l-[var(--brand-solid)]"
                        : "border-l-transparent",
                      isCurrentlyActive && "bg-[var(--row-selected-bg)]/60",
                      isFocused && "ring-1 ring-inset ring-[var(--focus-ring)]"
                    )}
                  >
                    {/* Checkbox Cell */}
                    <TableCell className="w-11 px-2 py-3 text-center">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          slot={null}
                          aria-label={`Select ${businessName}`}
                          isSelected={isSelected}
                          onChange={() => handleToggleLead(lead.id)}
                        />
                      </div>
                    </TableCell>

                    {/* Company Column (Sticky Left, solid background) */}
                    <TableCell 
                      className="w-[280px] px-4 py-2 sticky left-0 z-10 bg-[var(--card-bg)] border-r border-[var(--card-border)]" 
                      onClick={() => onSelectLead && onSelectLead(lead)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Company Avatar with soft stable tint and matching text */}
                        <div 
                          style={{
                            backgroundColor: avatarTint.bg,
                            color: avatarTint.text,
                            borderColor: avatarTint.border,
                          }}
                          className="size-8 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 select-none shadow-2xs"
                        >
                          {getInitials(businessName)}
                        </div>

                        <div className="flex min-w-0 flex-col justify-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                              {businessName}
                            </span>
                            {/* Danger Tint "No website" badge ONLY for no-website leads */}
                            {isNoWebsite && (
                              <span className="shrink-0 text-[10px] py-0.5 px-1.5 font-bold rounded-md bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] border border-[var(--tint-danger-border)]">
                                No website
                              </span>
                            )}
                          </div>
                          {/* niche · city underneath with normalized niche casing */}
                          <p className="truncate text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {niche}{city ? ` · ${city}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Best Contact Column (One single line) */}
                    <TableCell className="w-[300px] px-4 py-2" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex items-center gap-2 truncate">
                        {bestContact ? (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[210px] text-xs text-[var(--text-primary)]">
                              <bestContact.icon className={cx("size-3.5 shrink-0", bestContact.iconColor)} aria-hidden="true" />
                              <span className="truncate font-mono text-[11px] select-all">{bestContact.value}</span>
                            </div>
                            {otherContacts.length > 0 && (
                              <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-[var(--card-border)]">
                                {otherContacts.map((c, i) => (
                                  <c.icon 
                                    key={i} 
                                    className={cx("size-3 shrink-0 transition-opacity hover:opacity-80", c.iconColor)} 
                                    title={`${c.type}: ${c.value}`} 
                                    aria-label={`${c.type} available`} 
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-[var(--text-secondary)]">No contact intel</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Stage Column (One color per stage) */}
                    <TableCell className="w-[130px] px-4 py-2" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <span className={cx(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium",
                        stage.className
                      )}>
                        {stage.label}
                      </span>
                    </TableCell>

                    {/* Actions Column (Sticky Right, solid background, 1 Pitch + ⋯ Menu) */}
                    <TableCell 
                      className="w-[160px] px-4 py-2 text-right sticky right-0 z-10 bg-[var(--card-bg)] border-l border-[var(--card-border)]"
                    >
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* 1 Visible Pitch Button: Outlined in indigo, filled indigo on hover */}
                        <button
                          type="button"
                          disabled={isOptedOut}
                          onClick={() => {
                            if (isOptedOut) return;
                            onOpenLeadDrawer ? onOpenLeadDrawer({ ...lead, initialTab: 'pitch' }) : onSelectLead(lead);
                          }}
                          className={cx(
                            "px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
                            isOptedOut
                              ? "bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] border-[var(--card-border)] opacity-50 cursor-not-allowed"
                              : "border-[var(--brand-solid)] text-[var(--brand-solid)] bg-transparent hover:bg-[var(--brand-solid)] hover:text-white"
                          )}
                          title={isOptedOut ? "Lead opted out of outreach" : "Open pitch composer"}
                          aria-label={isOptedOut ? "Pitch disabled (opted out)" : `Pitch ${businessName}`}
                        >
                          Pitch
                        </button>

                        {/* ⋯ Overflow Menu */}
                        <Dropdown>
                          <DropdownTrigger 
                            className="size-7 flex items-center justify-center rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                            aria-label={`Actions for ${businessName}`}
                            title="More actions"
                          >
                            <RiMore2Fill className="size-4" aria-hidden="true" />
                          </DropdownTrigger>
                          <DropdownPopover aria-label="Row actions" placement="bottom end" className="w-56 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl rounded-xl p-1">
                            <DropdownGroup>
                              <DropdownItem onSelect={() => onOpenLeadDrawer ? onOpenLeadDrawer(lead) : onSelectLead(lead)} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                                <RiEditLine className="size-4 text-[var(--text-secondary)]" />
                                <span>Edit</span>
                              </DropdownItem>

                              <DropdownItem onSelect={() => onRunOsint && onRunOsint(lead.id)} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                                <RiShieldCheckLine className="size-4 text-[var(--text-secondary)]" />
                                <span>Run OSINT for this lead</span>
                              </DropdownItem>

                              {lead.website && !isNoWebsite && (
                                <DropdownItem onSelect={() => onOpenAudit ? onOpenAudit(lead.id) : window.open(`/audit/${lead.id}`)} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                                  <RiSpeedUpLine className="size-4 text-[var(--text-secondary)]" />
                                  <span>View Audit Report</span>
                                </DropdownItem>
                              )}

                              <DropdownItem onSelect={() => onArchiveLead && onArchiveLead(lead.id)} className="rounded-lg hover:bg-[var(--tint-neutral-bg)] text-[var(--text-primary)] text-xs">
                                <RiArchiveLine className="size-4 text-[var(--text-secondary)]" />
                                <span>Archive</span>
                              </DropdownItem>

                              <DropdownDivider className="border-[var(--card-border)]" />

                              <DropdownItem 
                                onSelect={() => setLeadToDelete(lead)} 
                                className="rounded-lg hover:bg-[var(--tint-danger-bg)] text-[var(--tint-danger-text)] text-xs"
                              >
                                <RiDeleteBin6Line className="size-4 text-[var(--tint-danger-text)]" />
                                <span>Delete</span>
                              </DropdownItem>
                            </DropdownGroup>
                          </DropdownPopover>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--card-border)] px-2 pt-3.5 mt-2">
          {/* Showing X-Y of Z */}
          <div className="text-xs text-[var(--text-secondary)] font-medium">
            Showing <strong className="text-[var(--text-primary)] font-semibold">{startItem}-{endItem}</strong> of <strong className="text-[var(--text-primary)] font-semibold">{totalItems.toLocaleString()}</strong>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange && onPageSizeChange(e.target.value)}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] cursor-pointer"
                aria-label="Select page size"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={(p) => onPageChange && onPageChange(p)}
              />
            )}
          </div>
        </div>
      </section>

      {/* ONE Run OSINT Scope Selector Modal */}
      {isOsintScopeModalOpen && (
        <div 
          onClick={() => setIsOsintScopeModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiShieldCheckLine className="size-5 text-[var(--brand-solid)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Run OSINT Investigation</h3>
              </div>
              <IconButton
                icon={RiCloseLine}
                size="small"
                variant="ghost"
                aria-label="Close"
                onClick={() => setIsOsintScopeModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              />
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Select the prospect scope to harvest contact information, verify social accounts, and detect active websites:
            </p>

            <div className="space-y-2">
              {/* Scope Option 1: Selected */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors",
                  selectedLeadIds.size === 0 && "opacity-50 cursor-not-allowed",
                  osintScopeChoice === 'selected'
                    ? "border-[var(--brand-solid)] bg-[var(--brand-tint-bg)] font-semibold text-[var(--brand-tint-text)]"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="osintScope"
                    value="selected"
                    disabled={selectedLeadIds.size === 0}
                    checked={osintScopeChoice === 'selected'}
                    onChange={() => setOsintScopeChoice('selected')}
                    className="cursor-pointer accent-[var(--brand-solid)]"
                  />
                  <span>Selected prospects</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({selectedLeadIds.size})</span>
              </label>

              {/* Scope Option 2: Current Filter */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors",
                  osintScopeChoice === 'filter'
                    ? "border-[var(--brand-solid)] bg-[var(--brand-tint-bg)] font-semibold text-[var(--brand-tint-text)]"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="osintScope"
                    value="filter"
                    checked={osintScopeChoice === 'filter'}
                    onChange={() => setOsintScopeChoice('filter')}
                    className="cursor-pointer accent-[var(--brand-solid)]"
                  />
                  <span>Current filter slice</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({totalItems.toLocaleString()})</span>
              </label>

              {/* Scope Option 3: All Leads */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors",
                  osintScopeChoice === 'all'
                    ? "border-[var(--brand-solid)] bg-[var(--brand-tint-bg)] font-semibold text-[var(--brand-tint-text)]"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:bg-[var(--tint-neutral-bg)]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="osintScope"
                    value="all"
                    checked={osintScopeChoice === 'all'}
                    onChange={() => setOsintScopeChoice('all')}
                    className="cursor-pointer accent-[var(--brand-solid)]"
                  />
                  <span>All leads in database</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({(stats?.totalLeads || totalItems).toLocaleString()})</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsOsintScopeModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="small"
                onClick={handleConfirmRunOsint}
                className="bg-[var(--brand-solid)] hover:bg-[var(--brand-solid-hover)] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs"
              >
                Confirm & Run
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Lead Delete Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-[var(--tint-danger-text)]">
              <RiAlertLine className="size-5 shrink-0" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Prospect</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Are you sure you want to permanently delete <strong className="text-[var(--text-primary)]">{leadToDelete.business_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setLeadToDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="small"
                onClick={() => {
                  onDeleteLead && onDeleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }}
                className="bg-[var(--tint-danger-text)] hover:opacity-90 text-white border-transparent text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Sites Confirmation Modal */}
      {isCleanSitesConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-[var(--tint-danger-text)]">
              <RiAlertLine className="size-5 shrink-0" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Clean Sites Confirmation</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This action will permanently purge <strong className="text-[var(--text-primary)] font-bold">{stats?.withWebsites || 0}</strong> prospects that already possess verified active websites, retaining only genuine no-website targets.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsCleanSitesConfirmOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIsCleanSitesConfirmOpen(false);
                  onCleanWebsites && onCleanWebsites();
                }}
                className="bg-[var(--tint-danger-text)] hover:opacity-90 text-white border-transparent text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                Clean {stats?.withWebsites || 0} Sites
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset OSINT Confirmation Modal */}
      {isResetOsintConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-[var(--tint-warning-text)]">
              <RiRefreshLine className="size-5 shrink-0" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Reset OSINT Data</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete and reset all OSINT verification data for <strong className="text-[var(--text-primary)] font-bold">{activeNiche !== 'all' ? `collection "${activeNiche}"` : `all ${totalItems.toLocaleString()} prospects`}</strong>? This clears contact records and resets status to discovered.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsResetOsintConfirmOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIsResetOsintConfirmOpen(false);
                  onResetOsint && onResetOsint(activeNiche);
                }}
                className="bg-[var(--tint-warning-text)] hover:opacity-90 text-white border-transparent text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                Reset OSINT
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
