import React from 'react';
import KanbanBoard from './KanbanBoard';
import SplitView from './SplitView';
import BoardLeadTable from './boardui/BoardLeadTable';

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
  onArchiveLead,
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
  activeCity = 'all',
  onCityChange,
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
  if (viewMode === 'kanban') {
    return (
      <div className="flex w-full flex-col">
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
      <div className="flex w-full flex-col">
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
    <div className="flex w-full flex-col">
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
        onArchiveLead={onArchiveLead}
        onOpenAutoPilot={onOpenAutoPilot}
        onOpenSearch={onOpenSearch}
        onExportExcel={onExportExcel}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        activeNiche={activeNiche}
        onNicheChange={onNicheChange}
        activeCity={activeCity}
        onCityChange={onCityChange}
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
