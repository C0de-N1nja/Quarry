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
import { Avatar } from '@/components/base/avatar/avatar';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Select, SelectItem } from '@/components/base/select/select';
import { SearchField } from '@/components/base/search-field/search-field';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Button } from '@/components/base/buttons/button';
import { Pagination } from '@/components/base/pagination/pagination';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';
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
 * Stable avatar color selection matching BoardUI's official Avatar palette
 */
const AVATAR_COLORS = ['blue', 'lime', 'pink', 'neutral'];
function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Stage chip styling and text using BoardUI's semantic Chip & StatusDot tokens:
 * Discovered = neutral + dot, Audited/Enriched = cyan + green dot, Pitched = purple,
 * Sent = blue, Replied = lime bold, Won = lime bold solid, Archived = soft.
 */
function getStageBadge(lead, isOptedOut) {
  if (isOptedOut) {
    return {
      label: 'Opted out',
      chipColor: 'soft',
      variant: 'subtle',
      dotColor: null
    };
  }
  const status = (lead?.status || '').toLowerCase();
  switch (status) {
    case 'discovered':
      return {
        label: 'Discovered',
        chipColor: 'neutral',
        variant: 'subtle',
        dotColor: 'indigo'
      };
    case 'audited':
      return {
        label: 'Audited',
        chipColor: 'cyan',
        variant: 'subtle',
        dotColor: 'green'
      };
    case 'enriched':
      return {
        label: 'Enriched',
        chipColor: 'cyan',
        variant: 'subtle',
        dotColor: 'green'
      };
    case 'pitched':
      return {
        label: 'Pitched',
        chipColor: 'purple',
        variant: 'subtle',
        dotColor: 'indigo'
      };
    case 'sent':
      return {
        label: 'Sent',
        chipColor: 'blue',
        variant: 'subtle',
        dotColor: 'indigo'
      };
    case 'replied':
      return {
        label: 'Replied',
        chipColor: 'lime',
        variant: 'bold',
        dotColor: 'green'
      };
    case 'won':
      return {
        label: 'Won',
        chipColor: 'lime',
        variant: 'bold',
        dotColor: null
      };
    case 'archived':
      return {
        label: 'Archived',
        chipColor: 'soft',
        variant: 'subtle',
        dotColor: null
      };
    default:
      return {
        label: status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Discovered',
        chipColor: 'neutral',
        variant: 'subtle',
        dotColor: 'indigo'
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

      {/* Main BoardUI Table Container Card */}
      <section className="flex w-full flex-col rounded-2xl border border-separator-border bg-background-primary-default p-3 sm:p-5 shadow-xs">
        
        {/* Tier 1: BoardUI PillTabs + Gold Vault Chip + Action Groups */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-separator-border/60">
          
          {/* Authentic BoardUI PillTabList with sliding indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <PillTabList className="flex-wrap">
              <PillTab
                variant="gray"
                isSelected={activeFilter === 'all' && contactChannel === 'all' && focusTier === 'vault'}
                onSelect={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange('all');
                }}
              >
                <span>All</span>
                <span className="ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold bg-background-tertiary-default text-text-secondary">
                  {(stats?.totalLeads || totalCount || leads.length).toLocaleString()}
                </span>
              </PillTab>

              <PillTab
                variant="gray"
                isSelected={activeFilter === 'enriched'}
                onSelect={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange(activeFilter === 'enriched' ? 'all' : 'enriched');
                }}
              >
                <span>Ready to Pitch</span>
                <span className="ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold bg-status-lime-background text-status-lime-text">
                  {(stats?.enriched || 0).toLocaleString()}
                </span>
              </PillTab>

              <PillTab
                variant="gray"
                isSelected={activeFilter === 'no_website'}
                onSelect={() => {
                  if (onFocusTierChange) onFocusTierChange('vault');
                  if (onContactChannelChange) onContactChannelChange('all');
                  if (onFilterChange) onFilterChange(activeFilter === 'no_website' ? 'all' : 'no_website');
                }}
              >
                <span>No Website</span>
                <span className="ms-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold bg-status-rose-background text-status-rose-text">
                  {(stats?.noWebsite || 0).toLocaleString()}
                </span>
              </PillTab>
            </PillTabList>

            {/* Gold Vault Saved-Filter Chip (BoardUI Chip & Button design) */}
            <button
              type="button"
              onClick={() => {
                if (onFocusTierChange) onFocusTierChange(focusTier === 'gold' ? 'vault' : 'gold');
              }}
              className={cx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs button-press-motion",
                focusTier === 'gold'
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-500 ring-1 ring-amber-500/30"
                  : "border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover"
              )}
              title="Toggle Gold Vault high-intent prospects"
              aria-pressed={focusTier === 'gold'}
            >
              <RiStarLine className={cx("size-3.5", focusTier === 'gold' ? "fill-amber-500 text-amber-500" : "text-amber-500/70")} />
              <span>Gold Vault</span>
              <span className="font-mono text-[11px] opacity-80">({stats?.goldLeads || 0})</span>
            </button>
          </div>

          {/* Right Toolbar Actions: BoardUI Buttons and Dropdowns */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Run OSINT Button (BoardUI Secondary Button with Icon) */}
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiShieldCheckLine}
              onClick={() => {
                setOsintScopeChoice(selectedLeadIds.size > 0 ? 'selected' : 'filter');
                setIsOsintScopeModalOpen(true);
              }}
              title="Run OSINT intelligence pipeline with scope selector"
              className="cursor-pointer font-semibold shadow-xs"
            >
              Run OSINT
            </Button>

            {/* "More" Menu: Reset OSINT + Clean N Sites (BoardUI Dropdown) */}
            <Dropdown>
              <DropdownTrigger className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2lg border border-border-button-default bg-background-primary-default hover:bg-background-primary-hover text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer shadow-2xs button-press-motion">
                <span>More</span>
                <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
              </DropdownTrigger>
              <DropdownPopover aria-label="More actions" placement="bottom end" className="w-56 p-1 bg-background-primary-default border border-separator-border shadow-xl rounded-xl">
                <DropdownGroup>
                  <DropdownItem onSelect={() => setIsResetOsintConfirmOpen(true)} className="px-2.5 py-2 rounded-lg text-body-medium">
                    <RiRefreshLine className="size-4 text-text-secondary" />
                    <span>Reset OSINT</span>
                  </DropdownItem>
                  <DropdownItem onSelect={() => setIsCleanSitesConfirmOpen(true)} className="px-2.5 py-2 rounded-lg text-body-medium text-status-rose-text hover:bg-status-rose-background">
                    <RiDeleteBin6Line className="size-4 text-status-rose-text" />
                    <span>Clean {stats?.withWebsites || 0} sites</span>
                  </DropdownItem>
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>

            {/* "Import / Export" Menu (BoardUI Dropdown) */}
            <Dropdown>
              <DropdownTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2lg border border-border-button-default bg-background-primary-default hover:bg-background-primary-hover text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer shadow-2xs button-press-motion">
                <RiDownload2Line className="size-3.5 text-text-tertiary" />
                <span>Import / Export</span>
                <RiArrowDownSLine className="size-3.5 text-text-tertiary" />
              </DropdownTrigger>
              <DropdownPopover aria-label="Import and export options" placement="bottom end" className="w-52 p-1 bg-background-primary-default border border-separator-border shadow-xl rounded-xl">
                <DropdownGroup>
                  <DropdownItem onSelect={() => onOpenSearch && onOpenSearch('csv')} className="px-2.5 py-2 rounded-lg text-body-medium">
                    <RiUploadCloud2Line className="size-4 text-text-secondary" />
                    <span>Import CSV</span>
                  </DropdownItem>
                  <DropdownDivider className="border-separator-border" />
                  <DropdownItem onSelect={() => onExportExcel && onExportExcel('excel')} className="px-2.5 py-2 rounded-lg text-body-medium">
                    <RiDownload2Line className="size-4 text-text-secondary" />
                    <span>Export Excel (.xlsx)</span>
                  </DropdownItem>
                  <DropdownItem onSelect={() => onExportExcel && onExportExcel('csv')} className="px-2.5 py-2 rounded-lg text-body-medium">
                    <RiDownload2Line className="size-4 text-text-secondary" />
                    <span>Export CSV (.csv)</span>
                  </DropdownItem>
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
          </div>
        </div>

        {/* Tier 2: SearchField + BoardUI Select Dropdowns */}
        <div className="flex w-full flex-col items-start gap-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border/60">
          
          {/* BoardUI SearchField */}
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

          {/* BoardUI Select Filters: Niche, Channel, City */}
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
          <div className="my-2 flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-2lg bg-background-secondary-default border border-separator-border text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">
                {isAllMatchingSelected ? totalItems.toLocaleString() : selectedLeadIds.size} selected
              </span>

              {/* "Select all N matching" link when page selected and more exist */}
              {!isAllMatchingSelected && totalItems > displayedLeads.length && selectedLeadIds.size === displayedLeads.length && (
                <button
                  type="button"
                  onClick={() => setIsAllMatchingSelected(true)}
                  className="text-text-primary underline hover:text-text-secondary cursor-pointer font-medium ml-1"
                >
                  Select all {totalItems.toLocaleString()} matching
                </button>
              )}

              {isAllMatchingSelected && (
                <span className="text-text-tertiary text-[11px] font-mono">
                  (all {totalItems.toLocaleString()} matching filter selected)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiShieldCheckLine}
                onClick={() => {
                  setOsintScopeChoice('selected');
                  setIsOsintScopeModalOpen(true);
                }}
                className="text-xs"
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
                className="text-text-tertiary hover:text-text-primary text-xs"
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
            className="w-full table-fixed bui-table"
          >
            <TableHeader>
              {/* Checkbox Column */}
              <TableColumn id="select" className="w-11 px-2 py-3 text-center sticky top-0 z-20 bg-background-primary-default">
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
                className="w-[280px] px-4 py-3 sticky top-0 left-0 z-30 bg-background-primary-default border-r border-separator-border/60"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Company</span>
              </TableColumn>

              {/* Best Contact Column */}
              <TableColumn id="contact" className="w-[300px] px-4 py-3 sticky top-0 z-20 bg-background-primary-default">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Best Contact</span>
              </TableColumn>

              {/* Stage Column */}
              <TableColumn id="stage" className="w-[140px] px-4 py-3 sticky top-0 z-20 bg-background-primary-default">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Stage</span>
              </TableColumn>

              {/* Actions Column (Sticky Right) */}
              <TableColumn 
                id="actions" 
                className="w-[160px] px-4 py-3 text-right sticky top-0 right-0 z-30 bg-background-primary-default border-l border-separator-border/60"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Actions</span>
              </TableColumn>
            </TableHeader>

            <TableBody
              renderEmptyState={() => (
                <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default text-text-tertiary border border-separator-border">
                    <RiGlobalLine className="size-6" />
                  </div>
                  <div>
                    <p className="text-body-large font-bold text-text-primary">No prospects match your filters</p>
                    <p className="text-body-medium text-text-secondary mt-1">
                      Clear your search or find new leads to harvest prospects.
                    </p>
                  </div>
                  {onOpenSearch && (
                    <Button
                      size="small"
                      variant="primary"
                      leadingIcon={RiShieldCheckLine}
                      onClick={() => onOpenSearch('search')}
                      className="mt-2"
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

                if (hasEmail) {
                  bestContact = { 
                    type: 'email', 
                    value: lead.email, 
                    icon: RiMailLine,
                    iconColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  };
                  if (hasWhatsApp) otherContacts.push({ type: 'whatsapp', value: lead.whatsapp, icon: RiWhatsappLine, iconColor: 'text-emerald-500 hover:bg-emerald-500/10' });
                  if (hasPhone) otherContacts.push({ type: 'phone', value: lead.phone, icon: RiPhoneLine, iconColor: 'text-slate-500 hover:bg-slate-500/10' });
                } else if (hasWhatsApp) {
                  bestContact = { 
                    type: 'whatsapp', 
                    value: lead.whatsapp || lead.phone, 
                    icon: RiWhatsappLine,
                    iconColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  };
                  if (hasPhone && lead.phone !== lead.whatsapp) otherContacts.push({ type: 'phone', value: lead.phone, icon: RiPhoneLine, iconColor: 'text-slate-500 hover:bg-slate-500/10' });
                } else if (hasPhone) {
                  bestContact = { 
                    type: 'phone', 
                    value: lead.phone, 
                    icon: RiPhoneLine,
                    iconColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                  };
                }

                // Stage chip resolution with BoardUI Chip & StatusDot
                const stage = getStageBadge(lead, isOptedOut);
                const avatarColor = getAvatarColor(businessName);

                return (
                  <TableRow
                    key={lead.id}
                    id={String(lead.id)}
                    onClick={() => {
                      setFocusedIndex(index);
                      onOpenLeadDrawer && onOpenLeadDrawer(lead);
                    }}
                    className={cx(
                      "h-[60px] cursor-pointer transition-colors duration-150 border-s-[3px]",
                      "hover:bg-background-secondary-hover",
                      isSelected
                        ? "bg-background-tertiary-default/80 border-s-accent-500"
                        : "border-s-transparent",
                      isCurrentlyActive && "bg-background-tertiary-default/50 ring-1 ring-inset ring-separator-border",
                      isFocused && "ring-1 ring-inset ring-border-focus-ring"
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
                      className="w-[280px] px-4 py-2 sticky left-0 z-10 bg-background-primary-default border-r border-separator-border/60" 
                      onClick={() => onSelectLead && onSelectLead(lead)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Authentic BoardUI Avatar */}
                        <Avatar
                          size="sm"
                          color={avatarColor}
                          initials={getInitials(businessName)}
                          className="shrink-0 font-bold"
                        />

                        <div className="flex min-w-0 flex-col justify-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate text-body-medium font-semibold text-text-primary">
                              {businessName}
                            </span>
                            {/* BoardUI Chip "No website" badge ONLY for genuine no-website leads */}
                            {isNoWebsite && (
                              <Chip variant="bold" color="rose" className="shrink-0 text-[10px] py-0 px-1.5 font-bold">
                                No website
                              </Chip>
                            )}
                          </div>
                          {/* niche · city underneath with normalized niche casing */}
                          <p className="truncate text-caption-1-medium text-text-tertiary mt-0.5">
                            {niche}{city ? ` · ${city}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Best Contact Column (BoardUI contact channels) */}
                    <TableCell className="w-[300px] px-4 py-2" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex items-center gap-2 truncate">
                        {bestContact ? (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[210px] text-body-medium text-text-primary">
                              <span className={cx(
                                "flex size-5 items-center justify-center rounded-md shrink-0",
                                bestContact.iconColor
                              )}>
                                <bestContact.icon className="size-3.5" aria-hidden="true" />
                              </span>
                              <span className="truncate font-mono text-[11px] select-all font-medium">
                                {bestContact.value}
                              </span>
                            </div>
                            {otherContacts.length > 0 && (
                              <div className="flex items-center gap-1 shrink-0 ps-1.5 border-s border-separator-border/60">
                                {otherContacts.map((c, i) => (
                                  <span
                                    key={i}
                                    className={cx(
                                      "flex size-5 items-center justify-center rounded-md transition-colors",
                                      c.iconColor
                                    )}
                                    title={`${c.type}: ${c.value}`}
                                    aria-label={`${c.type} available`}
                                  >
                                    <c.icon className="size-3" />
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-caption-1-medium text-text-tertiary">No contact intel</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Stage Column (BoardUI Chip with StatusDot) */}
                    <TableCell className="w-[140px] px-4 py-2" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <Chip variant={stage.variant} color={stage.chipColor} className="gap-1.5 font-medium">
                        {stage.dotColor && <StatusDot color={stage.dotColor} />}
                        <span>{stage.label}</span>
                      </Chip>
                    </TableCell>

                    {/* Actions Column (Sticky Right, solid background, 1 Pitch + ⋯ Menu) */}
                    <TableCell 
                      className="w-[160px] px-4 py-2 text-right sticky right-0 z-10 bg-background-primary-default border-l border-separator-border/60"
                    >
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* 1 Visible Pitch Button (BoardUI Button) */}
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={isOptedOut}
                          onClick={() => {
                            if (isOptedOut) return;
                            onOpenLeadDrawer ? onOpenLeadDrawer({ ...lead, initialTab: 'osint' }) : onSelectLead(lead);
                          }}
                          className={cx(
                            "text-xs font-semibold px-2.5",
                            !isOptedOut && "border-accent-500/40 text-accent-600 dark:text-accent-400 hover:bg-accent-500 hover:text-white dark:hover:text-slate-950"
                          )}
                          title={isOptedOut ? "Lead opted out of outreach" : "Open pitch composer"}
                          aria-label={isOptedOut ? "Pitch disabled (opted out)" : `Pitch ${businessName}`}
                        >
                          Pitch
                        </Button>

                        {/* ⋯ Overflow Dropdown Menu (BoardUI Dropdown) */}
                        <Dropdown>
                          <DropdownTrigger 
                            className="size-8 flex items-center justify-center rounded-2lg border border-border-button-default bg-background-primary-default hover:bg-background-primary-hover text-foreground-icon-primary shadow-xs transition-colors cursor-pointer button-press-motion"
                            aria-label={`Actions for ${businessName}`}
                            title="More actions"
                          >
                            <RiMore2Fill className="size-4" aria-hidden="true" />
                          </DropdownTrigger>
                          <DropdownPopover aria-label="Row actions" placement="bottom end" className="w-56 p-1 bg-background-primary-default border border-separator-border shadow-xl rounded-xl">
                            <DropdownGroup>
                              <DropdownItem onSelect={() => onOpenLeadDrawer ? onOpenLeadDrawer(lead) : onSelectLead(lead)} className="px-2.5 py-2 rounded-lg text-body-medium">
                                <RiEditLine className="size-4 text-text-secondary" />
                                <span>Edit</span>
                              </DropdownItem>

                              <DropdownItem onSelect={() => onRunOsint && onRunOsint(lead.id)} className="px-2.5 py-2 rounded-lg text-body-medium">
                                <RiShieldCheckLine className="size-4 text-text-secondary" />
                                <span>Run OSINT for this lead</span>
                              </DropdownItem>

                              {lead.website && !isNoWebsite && (
                                <DropdownItem onSelect={() => onOpenAudit ? onOpenAudit(lead.id) : window.open(`/audit/${lead.id}`)} className="px-2.5 py-2 rounded-lg text-body-medium">
                                  <RiSpeedUpLine className="size-4 text-text-secondary" />
                                  <span>View Audit Report</span>
                                </DropdownItem>
                              )}

                              <DropdownItem onSelect={() => onArchiveLead && onArchiveLead(lead.id)} className="px-2.5 py-2 rounded-lg text-body-medium">
                                <RiArchiveLine className="size-4 text-text-secondary" />
                                <span>Archive</span>
                              </DropdownItem>

                              <DropdownDivider className="border-separator-border" />

                              <DropdownItem 
                                onSelect={() => setLeadToDelete(lead)} 
                                className="px-2.5 py-2 rounded-lg text-body-medium text-status-rose-text hover:bg-status-rose-background"
                              >
                                <RiDeleteBin6Line className="size-4 text-status-rose-text" />
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-separator-border px-2 pt-3.5 mt-2">
          {/* Showing X-Y of Z */}
          <div className="text-body-medium text-text-secondary font-medium">
            Showing <strong className="text-text-primary font-semibold">{startItem}-{endItem}</strong> of <strong className="text-text-primary font-semibold">{totalItems.toLocaleString()}</strong>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-body-medium text-text-secondary">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange && onPageSizeChange(e.target.value)}
                className="rounded-lg border border-border-button-default bg-background-primary-default px-2 py-1 text-xs font-mono text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-500 cursor-pointer shadow-xs"
                aria-label="Select page size"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* BoardUI Pagination Component */}
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
            className="w-full max-w-md rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiShieldCheckLine className="size-5 text-accent-500" />
                <h3 className="text-body-large font-bold text-text-primary">Run OSINT Investigation</h3>
              </div>
              <IconButton
                icon={RiCloseLine}
                size="small"
                variant="ghost"
                aria-label="Close"
                onClick={() => setIsOsintScopeModalOpen(false)}
              />
            </div>

            <p className="text-body-medium text-text-secondary">
              Select the prospect scope to harvest contact information, verify social accounts, and detect active websites:
            </p>

            <div className="space-y-2">
              {/* Scope Option 1: Selected */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-2lg border text-xs cursor-pointer transition-colors",
                  selectedLeadIds.size === 0 && "opacity-50 cursor-not-allowed",
                  osintScopeChoice === 'selected'
                    ? "border-accent-500 bg-accent-500/10 font-semibold text-text-primary ring-1 ring-accent-500/30"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
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
                    className="cursor-pointer accent-accent-500"
                  />
                  <span>Selected prospects</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({selectedLeadIds.size})</span>
              </label>

              {/* Scope Option 2: Current Filter */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-2lg border text-xs cursor-pointer transition-colors",
                  osintScopeChoice === 'filter'
                    ? "border-accent-500 bg-accent-500/10 font-semibold text-text-primary ring-1 ring-accent-500/30"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="osintScope"
                    value="filter"
                    checked={osintScopeChoice === 'filter'}
                    onChange={() => setOsintScopeChoice('filter')}
                    className="cursor-pointer accent-accent-500"
                  />
                  <span>Current filter slice</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({totalItems.toLocaleString()})</span>
              </label>

              {/* Scope Option 3: All Leads */}
              <label 
                className={cx(
                  "flex items-center justify-between p-3 rounded-2lg border text-xs cursor-pointer transition-colors",
                  osintScopeChoice === 'all'
                    ? "border-accent-500 bg-accent-500/10 font-semibold text-text-primary ring-1 ring-accent-500/30"
                    : "border-border-button-default bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="osintScope"
                    value="all"
                    checked={osintScopeChoice === 'all'}
                    onChange={() => setOsintScopeChoice('all')}
                    className="cursor-pointer accent-accent-500"
                  />
                  <span>All leads in database</span>
                </div>
                <span className="font-mono text-[11px] font-bold">({(stats?.totalLeads || totalItems).toLocaleString()})</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-separator-border">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsOsintScopeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={handleConfirmRunOsint}
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
          <div className="w-full max-w-sm rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-status-rose-text">
              <RiAlertLine className="size-5 shrink-0" />
              <h3 className="text-body-large font-bold text-text-primary">Delete Prospect</h3>
            </div>
            <p className="text-body-medium text-text-secondary">
              Are you sure you want to permanently delete <strong className="text-text-primary">{leadToDelete.business_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-separator-border">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setLeadToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={() => {
                  onDeleteLead && onDeleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }}
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
          <div className="w-full max-w-sm rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-status-rose-text">
              <RiAlertLine className="size-5 shrink-0" />
              <h3 className="text-body-large font-bold text-text-primary">Clean Sites Confirmation</h3>
            </div>
            <p className="text-body-medium text-text-secondary leading-relaxed">
              This action will permanently purge <strong className="text-text-primary font-bold">{stats?.withWebsites || 0}</strong> prospects that already possess verified active websites, retaining only genuine no-website targets.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-separator-border">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsCleanSitesConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={() => {
                  setIsCleanSitesConfirmOpen(false);
                  onCleanWebsites && onCleanWebsites();
                }}
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
          <div className="w-full max-w-sm rounded-2xl border border-separator-border bg-background-primary-default p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-status-yellow-text">
              <RiRefreshLine className="size-5 shrink-0" />
              <h3 className="text-body-large font-bold text-text-primary">Reset OSINT Data</h3>
            </div>
            <p className="text-body-medium text-text-secondary leading-relaxed">
              Are you sure you want to delete and reset all OSINT verification data for <strong className="text-text-primary font-bold">{activeNiche !== 'all' ? `collection "${activeNiche}"` : `all ${totalItems.toLocaleString()} prospects`}</strong>? This clears contact records and resets status to discovered.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-separator-border">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setIsResetOsintConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={() => {
                  setIsResetOsintConfirmOpen(false);
                  onResetOsint && onResetOsint(activeNiche);
                }}
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
