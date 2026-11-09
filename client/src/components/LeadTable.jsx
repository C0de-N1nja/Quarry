import React, { useState } from 'react';
import KanbanBoard from './KanbanBoard';
import SplitView from './SplitView';
import BoardStatCards from './boardui/BoardStatCards';
import BoardLeadTable from './boardui/BoardLeadTable';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { RiGlobalLine } from '@remixicon/react';

export default function LeadTable({ 
  leads = [], 
  activeFilter = 'all', 
  onFilterChange, 
  searchTerm = '', 
  onSearchChange, 
  onSelectLead,
  selectedLead,
  onOpenLeadDrawer,
  onRunOsint, 
  onOpenOsintRun,
  onDeleteLead,
  onResolveWebsite,
  onOpenSearch,
  onOpenAutoPilot,
  onExportExcel,
  viewMode = 'table',
  onViewModeChange,
  stats,
  totalCount,
  pageSize = '50',
  onPageSizeChange,
  currentPage = 1,
  onPageChange,
  activeNiche = 'all',
  onNicheChange,
  contactChannel = 'all',
  onContactChannelChange,
  focusTier = 'vault',
  onFocusTierChange,
  onCleanWebsites,
  onPurgeAllLeads,
  onResetOsint,
  onOpenAudit,
  onRefresh
}) {
  const kpiStats = [
    {
      icon: RiGlobalLine,
      label: "No-Website Targets",
      value: (stats?.noWebsite ?? 0).toLocaleString(),
      delta: "+24%",
      deltaColor: "lime",
    },
  ];

  if (viewMode === 'kanban') {
    return (
      <div className="flex w-full flex-col gap-6">
        <BoardStatCards stats={stats} />
        <KanbanBoard
          leads={leads}
          stats={stats}
          onSelectLead={onOpenLeadDrawer || onSelectLead}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (viewMode === 'split') {
    return (
      <div className="flex w-full flex-col gap-6">
        <BoardStatCards stats={stats} />
        <SplitView
          leads={leads}
          selectedLead={selectedLead}
          onSelectLead={onSelectLead}
          onRefreshLead={onRefresh}
          onOpenOsintRun={onOpenOsintRun}
          onDeleteLead={onDeleteLead}
          onOpenAutoPilot={onOpenAutoPilot}
          onOpenLeadDrawer={onOpenLeadDrawer || onSelectLead}
          activeFilter={activeFilter}
          stats={stats}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <StatCards stats={kpiStats} columns={1} className="sm:max-w-sm" />
      <BoardLeadTable
        leads={leads}
        totalCount={totalCount}
        stats={stats}
        selectedLead={selectedLead}
        onSelectLead={onSelectLead}
        onOpenLeadDrawer={onOpenLeadDrawer}
        onRunOsint={onRunOsint}
        onOpenOsintRun={onOpenOsintRun}
        onDeleteLead={onDeleteLead}
        onOpenAutoPilot={onOpenAutoPilot}
        onOpenSearch={onOpenSearch}
        onExportExcel={onExportExcel}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        activeNiche={activeNiche}
        onNicheChange={onNicheChange}
        contactChannel={contactChannel}
        onContactChannelChange={onContactChannelChange}
        focusTier={focusTier}
        onFocusTierChange={onFocusTierChange}
        onCleanWebsites={onCleanWebsites}
        onResetOsint={onResetOsint}
        onOpenAudit={onOpenAudit}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
