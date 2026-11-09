import React, { useMemo, useState, useEffect } from 'react';
import FloatingBatchDock from './FloatingBatchDock';
import {
  RiSearchLine,
  RiShieldCheckLine,
  RiGlobalLine,
  RiPhoneLine,
  RiMailLine,
  RiSparklingLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiExternalLinkLine,
  RiFlashlightFill,
  RiMore2Fill,
  RiLayoutMasonryLine,
  RiTableLine,
  RiLayoutColumnLine,
  RiCheckDoubleLine,
  RiFireLine,
  RiStarLine,
  RiRefreshLine,
  RiSpeedUpLine,
  RiCloseLine,
  RiMailCheckLine,
  RiTimeLine
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
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { PillTabList, PillTab } from '@/components/base/tabs/pill-tab';
import { cx } from '@/utils/cx';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
  onOpenAutoPilot,
  onOpenSearch,
  onExportExcel,
  viewMode = 'table',
  onViewModeChange,
  activeFilter = 'all',
  onFilterChange,
  activeNiche = 'all',
  onNicheChange,
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

  // Determine pagination bounds and cap DOM nodes to guarantee 60fps responsiveness
  const numericPageSize = pageSize === 'all' ? 100 : (parseInt(pageSize, 10) || 50);
  const totalPages = Math.max(1, Math.ceil((totalCount || leads.length) / numericPageSize));

  const displayedLeads = useMemo(() => {
    if (pageSize === 'all') return leads.slice(0, 100);
    const size = parseInt(pageSize, 10) || 50;
    return leads.slice(0, size);
  }, [leads, pageSize]);

  // Compute unique niches for the filter dropdown
  const nicheOptions = useMemo(() => {
    if (stats?.collections && stats.collections.length > 0) {
      return stats.collections.map(c => typeof c === 'string' ? c : c.niche || c.name);
    }
    const set = new Set();
    leads.forEach(l => {
      if (l.niche) set.add(l.niche);
      if (l.category) set.add(l.category);
    });
    return Array.from(set).slice(0, 20);
  }, [stats, leads]);

  const allPageIds = useMemo(() => displayedLeads.map(l => l.id), [displayedLeads]);
  const isAllSelected = displayedLeads.length > 0 && allPageIds.every(id => selectedLeadIds.has(id));
  const isPartiallySelected = displayedLeads.length > 0 && allPageIds.some(id => selectedLeadIds.has(id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(allPageIds));
    }
  };

  const handleToggleLead = (id, e) => {
    e?.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Keyboard navigation (J/K/Space/Enter/Esc/A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack keystrokes if the user is typing in an input/textarea/select
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
      } else if (e.key === 'a' || e.key === 'A') {
        if (focusedIndex >= 0 && displayedLeads[focusedIndex]?.website) {
          e.preventDefault();
          onOpenAudit && onOpenAudit(displayedLeads[focusedIndex].id);
        }
      } else if (e.key === 'Escape') {
        if (selectedLeadIds.size > 0) {
          e.preventDefault();
          setSelectedLeadIds(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedLeads, focusedIndex, selectedLeadIds, onOpenLeadDrawer, onOpenAudit]);

  return (
    <div className="flex w-full flex-col gap-4">

      {/* Main BoardUI Table Card Container (Figma Node 3731:3201) */}
      <section className="flex w-full flex-col rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs sm:p-6">
        
        {/* Tier 1: Quick Priority Segments (Pill Tabs) + Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-separator-border/60">
          <PillTabList className="flex-wrap">
            <PillTab
              variant="blue"
              isSelected={activeFilter === 'all' && contactChannel === 'all' && focusTier === 'vault'}
              onSelect={() => {
                if (onNicheChange) onNicheChange('all');
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onContactChannelChange) onContactChannelChange('all');
                if (onFilterChange) onFilterChange('all');
              }}
            >
              <span>All Prospects ({(totalCount || stats?.totalLeads || leads.length).toLocaleString()})</span>
            </PillTab>

            <PillTab
              variant="blue"
              icon={RiMailCheckLine}
              isSelected={contactChannel === 'has_email'}
              onSelect={() => {
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onContactChannelChange) onContactChannelChange(contactChannel === 'has_email' ? 'all' : 'has_email');
                if (onFilterChange) onFilterChange('all');
              }}
            >
              <span>Ready to Pitch ({stats?.enriched || 0})</span>
            </PillTab>

            <PillTab
              variant="blue"
              icon={RiFireLine}
              isSelected={activeFilter === 'no_website'}
              onSelect={() => {
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onContactChannelChange) onContactChannelChange('all');
                if (onFilterChange) onFilterChange(activeFilter === 'no_website' ? 'all' : 'no_website');
              }}
            >
              <span>No Website ({stats?.noWebsite || 0})</span>
            </PillTab>

            <PillTab
              variant="blue"
              icon={RiStarLine}
              isSelected={focusTier === 'gold'}
              onSelect={() => {
                if (onContactChannelChange) onContactChannelChange('all');
                if (onFocusTierChange) onFocusTierChange(focusTier === 'gold' ? 'vault' : 'gold');
              }}
            >
              <span>Gold Vault ({stats?.goldLeads || 0})</span>
            </PillTab>

            <PillTab
              variant="blue"
              icon={RiTimeLine}
              isSelected={activeFilter === 'pitched'}
              onSelect={() => {
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onContactChannelChange) onContactChannelChange('all');
                if (onFilterChange) onFilterChange(activeFilter === 'pitched' ? 'all' : 'pitched');
              }}
            >
              <span>Follow-Ups Due ({stats?.pitched || 0})</span>
            </PillTab>

            <PillTab
              variant="gray"
              isSelected={activeFilter === 'won'}
              onSelect={() => {
                if (onFocusTierChange) onFocusTierChange('vault');
                if (onContactChannelChange) onContactChannelChange('all');
                if (onFilterChange) onFilterChange(activeFilter === 'won' ? 'all' : 'won');
              }}
            >
              <span>Won ({stats?.won || 0})</span>
            </PillTab>
          </PillTabList>

          {/* Quick Dataset Actions: Run OSINT on current slice, Purge Sites, Reset */}
          <div className="flex items-center gap-2 shrink-0">
            {onCleanWebsites && stats && stats.withWebsites > 0 && (
              <Button
                size="small"
                variant="danger"
                onClick={onCleanWebsites}
                title="Purge prospects that already have verified websites"
              >
                Purge {stats.withWebsites} Sites
              </Button>
            )}

            {onResetOsint && (
              <Button
                size="small"
                variant="secondary"
                leadingIcon={RiRefreshLine}
                onClick={() => onResetOsint(activeNiche)}
                title="Reset OSINT cache for current slice"
              >
                Reset OSINT
              </Button>
            )}

            <Button
              size="small"
              variant="primary"
              leadingIcon={RiShieldCheckLine}
              onClick={() => onOpenOsintRun && onOpenOsintRun({
                leadIds: selectedLeadIds.size > 0 ? Array.from(selectedLeadIds) : null,
                category: activeNiche,
                filter: activeFilter,
                focusTier,
                contactChannel,
                searchTerm
              })}
            >
              Run OSINT ({selectedLeadIds.size > 0 ? selectedLeadIds.size : (totalCount || leads.length)})
            </Button>
          </div>
        </div>

        {/* Tier 2: Search, Filters & View Switcher Row */}
        <div className="flex w-full flex-col items-start gap-3 py-3 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border">
          {/* Left: Total Count and Search Field */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <SearchField
              aria-label="Search prospects"
              placeholder="Search business, phone, city..."
              value={searchTerm}
              onChange={(val) => onSearchChange && onSearchChange(val)}
              size="small"
              className="w-full sm:w-64"
            />
          </div>

          {/* Right: Select Dropdowns (Category and Channel) */}
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
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
                <SelectItem key={n} id={n} textValue={n}>{n}</SelectItem>
              ))}
            </Select>

            {/* Contact Channel Filter */}
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
              <SelectItem id="has_social" textValue="Social Profiles">Social Profiles</SelectItem>
              <SelectItem id="phone_only" textValue="Phone Only">Phone Only</SelectItem>
            </Select>
          </div>
        </div>

        {/* BoardUI Table Primitive Container */}
        <div className="mt-2 w-full overflow-x-auto">
          <Table aria-label="Prospects Vault" size="md" selectionMode="none" className="w-full min-w-[960px]">
            <TableHeader>
              {/* Checkbox Column */}
              <TableColumn id="select" className="w-10 px-2 py-3 text-center">
                <Checkbox
                  slot={null}
                  aria-label="Select all on this page"
                  isSelected={isAllSelected}
                  isIndeterminate={isPartiallySelected}
                  onChange={handleToggleSelectAll}
                />
              </TableColumn>

              {/* Company & Niche Column */}
              <TableColumn id="company" isRowHeader className="min-w-[260px] px-4 py-3.5">
                <span className="text-body-medium font-medium text-text-tertiary">Company & Niche</span>
              </TableColumn>

              {/* Website & Digital Audit */}
              <TableColumn id="website" className="w-48 px-4 py-3.5">
                <span className="text-body-medium font-medium text-text-tertiary">Website Audit</span>
              </TableColumn>

              {/* Contact Channels */}
              <TableColumn id="contact" className="w-64 px-4 py-3.5">
                <span className="text-body-medium font-medium text-text-tertiary">Contact Channels</span>
              </TableColumn>

              {/* Actions */}
              <TableColumn id="actions" className="w-32 px-4 py-3.5 text-right">
                <span className="text-body-medium font-medium text-text-tertiary">Actions</span>
              </TableColumn>
            </TableHeader>

            <TableBody
              renderEmptyState={() => (
                <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-background-secondary-default text-text-tertiary">
                    <RiGlobalLine className="size-6" />
                  </div>
                  <div>
                    <p className="text-title-3-semibold text-text-primary">No prospects match your filters</p>
                    <p className="text-body-regular text-text-secondary mt-1">
                      Clear your search or run the Google Maps crawler to harvest new targets.
                    </p>
                  </div>
                  {onOpenSearch && (
                    <Button
                      size="small"
                      variant="primary"
                      leadingIcon={RiFlashlightFill}
                      onClick={() => onOpenSearch('search')}
                      className="mt-2"
                    >
                      Discover Prospects Now
                    </Button>
                  )}
                </div>
              )}
            >
              {displayedLeads.map((lead, index) => {
                const isSelected = selectedLeadIds.has(lead.id);
                const isCurrentlyActive = selectedLead?.id === lead.id;
                const isFocused = focusedIndex === index;
                const businessName = lead.business_name || lead.company_name || 'Prospect';
                const category = lead.category || lead.niche || 'General';
                const hasWebsite = lead.website && lead.website.trim() !== '' && lead.website !== 'None';

                return (
                  <TableRow
                    key={lead.id}
                    id={String(lead.id)}
                    onClick={() => {
                      setFocusedIndex(index);
                      onOpenLeadDrawer && onOpenLeadDrawer(lead);
                    }}
                    className={cx(
                      "cursor-pointer transition-colors duration-150 hover:bg-background-secondary-hover",
                      isSelected && "bg-accent-50/40 dark:bg-accent-950/30",
                      isCurrentlyActive && "ring-1 ring-inset ring-accent-500/50",
                      isFocused && "ring-2 ring-inset ring-accent-500/80 bg-accent-50/20 dark:bg-accent-950/20"
                    )}
                  >
                    {/* Checkbox Cell */}
                    <TableCell className="w-10 px-2 py-3 text-center">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          slot={null}
                          aria-label={`Select ${businessName}`}
                          isSelected={isSelected}
                          onChange={() => handleToggleLead(lead.id)}
                        />
                      </div>
                    </TableCell>

                    {/* Company & Niche Cell */}
                    <TableCell className="min-w-[260px] px-4 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          initials={getInitials(businessName)}
                          size="sm"
                          className={hasWebsite ? "bg-background-tertiary-default text-text-secondary" : "bg-accent-500/15 text-accent-500 font-semibold"}
                        />
                        <div className="flex min-w-0 flex-col">
                          <p className="truncate text-body-small font-medium text-text-primary group-hover:text-accent-600">
                            {businessName}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="truncate text-[11px] text-text-tertiary">
                              {category}
                            </span>
                            {(lead.city || lead.state) && (
                              <>
                                <span className="text-text-tertiary text-[10px]">•</span>
                                <span className="truncate text-[11px] text-text-tertiary">
                                  {[lead.city, lead.state].filter(Boolean).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Website Audit Cell with BoardUI StatusDot + Chip */}
                    <TableCell className="w-48 px-4 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      {!hasWebsite ? (
                        <div className="flex items-center gap-1.5">
                          <StatusDot color="indigo" />
                          <Chip variant="bold" color="rose" size="sm">
                            No Website
                          </Chip>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <StatusDot color="green" />
                          <Chip variant="bold" color="lime" size="sm">
                            Site Active
                          </Chip>
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-text-tertiary hover:text-text-primary transition-colors ml-0.5"
                            title={lead.website}
                          >
                            <RiExternalLinkLine className="size-3.5" />
                          </a>
                        </div>
                      )}
                    </TableCell>

                    {/* Contact Channels Cell */}
                    <TableCell className="w-64 px-4 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex flex-col gap-0.5">
                        {lead.phone ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-text-secondary">
                            <RiPhoneLine className="size-3 text-text-tertiary shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        ) : null}
                        {lead.email ? (
                          <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                            <RiMailLine className="size-3 text-text-tertiary shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        ) : null}
                        {!lead.phone && !lead.email && (
                          <span className="text-[11px] text-text-tertiary">None listed</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Row Action Buttons */}
                    <TableCell className="w-32 px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          icon={RiEditLine}
                          size="small"
                          variant="ghost"
                          aria-label="View Prospect Dossier"
                          title="View Prospect Dossier"
                          onClick={() => onOpenLeadDrawer ? onOpenLeadDrawer(lead) : onSelectLead(lead)}
                        />

                        {lead.website && lead.has_no_website !== 1 && (
                          <IconButton
                            icon={RiSpeedUpLine}
                            size="small"
                            variant="ghost"
                            aria-label="Full Website Audit Report"
                            title="Open Full Website Audit Report (Speed, ADA, SEO)"
                            className="text-cyan-400 hover:text-cyan-300"
                            onClick={() => onOpenAudit ? onOpenAudit(lead.id) : window.open('/audit/' + lead.id)}
                          />
                        )}

                        <IconButton
                          icon={RiShieldCheckLine}
                          size="small"
                          variant="ghost"
                          aria-label="Deep OSINT Investigation"
                          title="Deep OSINT Investigation"
                          onClick={() => onOpenOsintRun && onOpenOsintRun({
                            leadIds: [lead.id],
                            category: lead.category || activeNiche,
                            filter: activeFilter,
                            focusTier,
                            contactChannel,
                            searchTerm
                          })}
                        />

                        {onDeleteLead && (
                          <IconButton
                            icon={RiDeleteBin6Line}
                            size="small"
                            variant="ghost"
                            aria-label="Delete Prospect"
                            title="Delete Prospect"
                            onClick={() => onDeleteLead(lead.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* BoardUI Pagination Footer (Figma Node 3731:3201 Footer) */}
        {totalPages > 1 && (
          <div className="border-t border-separator-border px-3 pt-4 mt-2">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={(p) => onPageChange && onPageChange(p)}
            />
          </div>
        )}
      </section>

      {/* Floating Batch Action Dock (Linear / Vercel-Style Speed Triage) */}
      <FloatingBatchDock
        selectedCount={selectedLeadIds.size}
        onClearSelection={() => setSelectedLeadIds(new Set())}
        onLaunchAutoPilot={() => onOpenAutoPilot && onOpenAutoPilot(Array.from(selectedLeadIds))}
        onRunOsint={() => onOpenOsintRun && onOpenOsintRun({
          leadIds: Array.from(selectedLeadIds),
          category: activeNiche,
          filter: activeFilter,
          focusTier,
          contactChannel,
          searchTerm
        })}
        onExportExcel={onExportExcel ? () => onExportExcel(Array.from(selectedLeadIds)) : undefined}
      />
    </div>
  );
}
