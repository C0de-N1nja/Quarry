import React, { useMemo, useState } from 'react';
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
  RiCheckDoubleLine
} from '@remixicon/react';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Avatar } from '@/components/base/avatar/avatar';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Select, SelectItem } from '@/components/base/select/select';
import { InputBase } from '@/components/base/input/input';
import { IconButton } from '@/components/base/buttons/icon-button';
import { Button } from '@/components/base/buttons/button';
import { Pagination } from '@/components/base/pagination/pagination';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip';
import { Focusable } from 'react-aria-components';
import { cx } from '@/utils/cx';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatCurrency(num) {
  const n = Number(num) || 2500;
  return `$${n.toLocaleString()}`;
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
  searchTerm = '',
  onSearchChange,
  currentPage = 1,
  onPageChange,
  pageSize = '50',
  onPageSizeChange,
}) {
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // Determine pagination bounds
  const numericPageSize = pageSize === 'all' ? leads.length || 50 : parseInt(pageSize, 10) || 50;
  const totalPages = Math.max(1, Math.ceil((totalCount || leads.length) / numericPageSize));

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

  const allPageIds = useMemo(() => leads.map(l => l.id), [leads]);
  const isAllSelected = leads.length > 0 && allPageIds.every(id => selectedLeadIds.has(id));
  const isPartiallySelected = leads.length > 0 && allPageIds.some(id => selectedLeadIds.has(id)) && !isAllSelected;

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

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Batch Actions Bar (Revealed when rows are selected) */}
      {selectedLeadIds.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-accent-300/40 bg-accent-50/70 dark:bg-accent-950/40 px-4 py-2.5 backdrop-blur-md transition-all animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-accent-600 text-caption-1-bold text-white">
              {selectedLeadIds.size}
            </span>
            <span className="text-body-medium font-medium text-text-primary">
              {selectedLeadIds.size === 1 ? '1 prospect selected' : `${selectedLeadIds.size} prospects selected`}
            </span>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="text-caption-1-regular text-text-tertiary underline hover:text-text-primary cursor-pointer ml-1"
            >
              Deselect all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={RiShieldCheckLine}
              onClick={() => onOpenOsintRun && onOpenOsintRun(Array.from(selectedLeadIds))}
            >
              Run OSINT ({selectedLeadIds.size})
            </Button>
            <Button
              size="sm"
              variant="primary"
              leadingIcon={RiFlashlightFill}
              onClick={() => onOpenAutoPilot && onOpenAutoPilot(Array.from(selectedLeadIds))}
            >
              Launch Auto-Pilot
            </Button>
          </div>
        </div>
      )}

      {/* Main BoardUI Table Card Container (Figma Node 3731:3201) */}
      <section className="flex w-full flex-col rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs sm:p-6">
        {/* Top Header & Toolbar Row */}
        <div className="flex w-full flex-col items-start gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border">
          {/* Left: Total Results Caption & Count */}
          <div className="flex flex-col justify-center">
            <p className="text-body-medium whitespace-nowrap text-text-tertiary">Total Results</p>
            <p className="text-title-2-medium whitespace-nowrap text-text-primary font-semibold">
              {(totalCount || leads.length).toLocaleString()} Prospects
            </p>
          </div>

          {/* Right: Filters & Controls */}
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

            {/* Pipeline Stage Filter */}
            <Select
              aria-label="Filter by pipeline stage"
              className="shrink-0"
              popoverClassName="min-w-44"
              selectedKey={activeFilter}
              onSelectionChange={(k) => onFilterChange && onFilterChange(String(k))}
            >
              <SelectItem id="all" textValue="All Stages">All Stages</SelectItem>
              <SelectItem id="no_website" textValue="No Website 🌐❌">No Website 🌐❌</SelectItem>
              <SelectItem id="discovered" textValue="Discovered">Discovered</SelectItem>
              <SelectItem id="enriched" textValue="Enriched">Enriched</SelectItem>
              <SelectItem id="pitched" textValue="Pitched">Pitched</SelectItem>
              <SelectItem id="sent" textValue="Sent">Sent ✓</SelectItem>
              <SelectItem id="replied" textValue="In Discussion">In Discussion</SelectItem>
              <SelectItem id="won" textValue="Won 🏆">Won 🏆</SelectItem>
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

            {/* Pill Search Input */}
            <InputBase
              aria-label="Search prospects"
              placeholder="Search prospects..."
              leadingIcon={RiSearchLine}
              value={searchTerm}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              fieldClassName="w-48 rounded-full bg-background-secondary-default text-body-medium"
            />

            {/* View Switcher: Split / Table / Kanban */}
            <SegmentedControl
              aria-label="View mode"
              selectedKeys={new Set([viewMode])}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next && onViewModeChange) onViewModeChange(next);
              }}
            >
              <SegmentedControlItem id="split">Split</SegmentedControlItem>
              <SegmentedControlItem id="table">Table</SegmentedControlItem>
              <SegmentedControlItem id="kanban">Kanban</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>

        {/* BoardUI Table Primitive Container */}
        <div className="mt-2 w-full overflow-x-auto">
          <Table aria-label="Prospects Vault" size="md" selectionMode="none" className="min-w-[1050px]">
            <TableHeader>
              {/* Checkbox Column */}
              <TableColumn id="select" className="w-12 px-3 py-3 text-center">
                <Checkbox
                  slot={null}
                  aria-label="Select all on this page"
                  isSelected={isAllSelected}
                  isIndeterminate={isPartiallySelected}
                  onChange={handleToggleSelectAll}
                />
              </TableColumn>

              {/* Company & Niche Column */}
              <TableColumn id="company" isRowHeader className="w-72 px-3 py-3">
                <span className="text-body-medium font-medium text-text-tertiary">Company & Niche</span>
              </TableColumn>

              {/* Website & Digital Audit */}
              <TableColumn id="website" className="w-48 px-3 py-3">
                <span className="text-body-medium font-medium text-text-tertiary">Website Audit</span>
              </TableColumn>

              {/* Verified Owner & Decision Maker */}
              <TableColumn id="decision_maker" className="w-56 px-3 py-3">
                <span className="text-body-medium font-medium text-text-tertiary">Decision Maker</span>
              </TableColumn>

              {/* Contact Channels */}
              <TableColumn id="contact" className="w-44 px-3 py-3">
                <span className="text-body-medium font-medium text-text-tertiary">Contact Channels</span>
              </TableColumn>

              {/* Pipeline Stage */}
              <TableColumn id="stage" className="w-40 px-3 py-3">
                <span className="text-body-medium font-medium text-text-tertiary">Pipeline Stage</span>
              </TableColumn>

              {/* Est. Deal Value */}
              <TableColumn id="value" className="w-32 px-3 py-3 text-right">
                <span className="text-body-medium font-medium text-text-tertiary">Est. Value</span>
              </TableColumn>

              {/* Actions */}
              <TableColumn id="actions" className="w-32 px-3 py-3 text-right">
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
                      size="sm"
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
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                const isCurrentlyActive = selectedLead?.id === lead.id;
                const businessName = lead.business_name || lead.company_name || 'Prospect';
                const category = lead.category || lead.niche || 'General';
                const hasWebsite = lead.website && lead.website.trim() !== '' && lead.website !== 'None';
                const hasOwner = lead.decision_maker_name && lead.decision_maker_name.trim() !== '';

                return (
                  <TableRow
                    key={lead.id}
                    id={String(lead.id)}
                    className={cx(
                      "cursor-pointer transition-colors duration-150 hover:bg-background-secondary-hover",
                      isSelected && "bg-accent-50/40 dark:bg-accent-950/30",
                      isCurrentlyActive && "ring-1 ring-inset ring-accent-500/50"
                    )}
                  >
                    {/* Checkbox Cell */}
                    <TableCell className="w-12 px-3 py-3.5 text-center">
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
                    <TableCell className="w-72 px-3 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={getInitials(businessName)}
                          size="md"
                          className={hasWebsite ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200" : "bg-accent-100 text-accent-800 dark:bg-accent-900/60 dark:text-accent-200"}
                        />
                        <div className="flex min-w-0 flex-col">
                          <p className="truncate text-body-medium font-medium text-text-primary group-hover:text-accent-600">
                            {businessName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="truncate text-caption-1-regular text-text-tertiary">
                              {category}
                            </span>
                            {(lead.city || lead.state) && (
                              <>
                                <span className="text-text-tertiary">•</span>
                                <span className="truncate text-caption-1-regular text-text-tertiary">
                                  {[lead.city, lead.state].filter(Boolean).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Website Audit Cell */}
                    <TableCell className="w-48 px-3 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      {!hasWebsite ? (
                        <Chip variant="bold" color="rose">
                          Verified: No Site
                        </Chip>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Chip variant="bold" color="lime">
                            Site Active
                          </Chip>
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-text-tertiary hover:text-text-primary transition-colors"
                            title={lead.website}
                          >
                            <RiExternalLinkLine className="size-4" />
                          </a>
                        </div>
                      )}
                    </TableCell>

                    {/* Decision Maker Cell */}
                    <TableCell className="w-56 px-3 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      {hasOwner ? (
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
                            <RiShieldCheckLine className="size-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-body-medium font-medium text-text-primary">
                              {lead.decision_maker_name}
                            </span>
                            <span className="truncate text-caption-1-regular text-text-tertiary">
                              {lead.decision_maker_title || 'Owner / Founder'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-caption-1-regular text-text-tertiary">
                          Not verified yet
                        </span>
                      )}
                    </TableCell>

                    {/* Contact Channels Cell */}
                    <TableCell className="w-44 px-3 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex flex-col gap-1">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-caption-1-regular font-mono text-text-secondary">
                            <RiPhoneLine className="size-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        ) : null}
                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-caption-1-regular text-text-secondary">
                            <RiMailLine className="size-3.5 text-text-tertiary shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        ) : null}
                        {!lead.phone && !lead.email && (
                          <span className="text-caption-1-regular text-text-tertiary">None listed</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Pipeline Stage Cell */}
                    <TableCell className="w-40 px-3 py-3.5" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <div className="flex items-center gap-2">
                        {lead.pipeline_stage === 'won' ? (
                          <Chip variant="bold" color="lime">🏆 Won</Chip>
                        ) : lead.pipeline_stage === 'sent' ? (
                          <Chip variant="bold" color="cyan">Sent ✓</Chip>
                        ) : lead.pipeline_stage === 'replied' ? (
                          <Chip variant="bold" color="yellow">In Discussion</Chip>
                        ) : lead.pipeline_stage === 'pitched' ? (
                          <Chip variant="subtle" color="yellow">Pitched</Chip>
                        ) : lead.pipeline_stage === 'enriched' ? (
                          <Chip variant="subtle" color="blue">Enriched</Chip>
                        ) : (
                          <Chip variant="subtle" color="gray">Discovered</Chip>
                        )}
                      </div>
                    </TableCell>

                    {/* Est. Value Cell */}
                    <TableCell className="w-32 px-3 py-3.5 text-right" onClick={() => onSelectLead && onSelectLead(lead)}>
                      <Chip variant="subtle" color="gray" className="tabular-nums">
                        {formatCurrency(lead.estimated_value)}
                      </Chip>
                    </TableCell>

                    {/* Row Action Buttons */}
                    <TableCell className="w-32 px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Open Drawer Action */}
                        <TooltipTrigger delay={200}>
                          <Focusable>
                            <IconButton
                              icon={RiEditLine}
                              size="small"
                              aria-label="View Prospect Dossier"
                              onClick={() => onOpenLeadDrawer ? onOpenLeadDrawer(lead) : onSelectLead(lead)}
                            />
                          </Focusable>
                          <Tooltip size="md">View Prospect Dossier</Tooltip>
                        </TooltipTrigger>

                        {/* Quick OSINT Action */}
                        <TooltipTrigger delay={200}>
                          <Focusable>
                            <IconButton
                              icon={RiShieldCheckLine}
                              size="small"
                              aria-label="Deep OSINT Investigation"
                              onClick={() => onOpenOsintRun && onOpenOsintRun([lead.id])}
                            />
                          </Focusable>
                          <Tooltip size="md">Deep OSINT Investigation</Tooltip>
                        </TooltipTrigger>

                        {/* Delete Action */}
                        {onDeleteLead && (
                          <TooltipTrigger delay={200}>
                            <Focusable>
                              <IconButton
                                icon={RiDeleteBin6Line}
                                size="small"
                                aria-label="Delete Prospect"
                                onClick={() => onDeleteLead(lead.id)}
                              />
                            </Focusable>
                            <Tooltip size="md">Delete Prospect</Tooltip>
                          </TooltipTrigger>
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
    </div>
  );
}
