import React, { useState } from 'react';
import KanbanBoard from './KanbanBoard';
import SplitView from './SplitView';
import BoardStatCards from './boardui/BoardStatCards';
import BoardLeadTable from './boardui/BoardLeadTable';
import { StatCards } from '@/components/application/dashboard/stat-cards';
import { RiCoinsFill, RiGlobalLine, RiShieldCheckLine, RiGroupFill } from '@remixicon/react';

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
  onRefresh
}) {
  const kpiStats = [
    {
      icon: RiCoinsFill,
      label: "Pipeline Value",
      value: `$${(((stats?.totalLeads || totalCount || leads.length) * 2250) || 2691000).toLocaleString()}`,
      delta: "+18.4%",
      deltaColor: "lime",
    },
    {
      icon: RiGlobalLine,
      label: "No-Website Targets",
      value: (stats?.noWebsite ?? 342).toLocaleString(),
      delta: "+24%",
      deltaColor: "lime",
    },
    {
      icon: RiShieldCheckLine,
      label: "Decision Makers Found",
      value: (stats?.hasOwner ?? 580).toLocaleString(),
      delta: "+12.8%",
      deltaColor: "lime",
    },
    {
      icon: RiGroupFill,
      label: "Total Prospect Vault",
      value: (totalCount || stats?.totalLeads || leads.length).toLocaleString(),
      delta: `${leads.length} in view`,
      deltaColor: "neutral",
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
      <StatCards stats={kpiStats} />
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
