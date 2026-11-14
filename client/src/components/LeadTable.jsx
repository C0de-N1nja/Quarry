import React from 'react';
import KanbanBoard from './KanbanBoard';
import SplitView from './SplitView';
import BoardLeadTable from './boardui/BoardLeadTable';

export default function LeadTable({ 
  leads = [], 
  isLoading = false,
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
  activeCountry = 'all',
  onCountryChange,
  activeCity = 'all',
  onCityChange,
  contactChannel = 'all',
  onContactChannelChange,
  ratingFilter = 'all',
  onRatingFilterChange,
  reviewsFilter = 'all',
  onReviewsFilterChange,
  noteFilter = 'all',
  onNoteFilterChange,
  onResetAllFilters,
  focusTier = 'vault',
  onFocusTierChange,
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
          isLoading={isLoading}
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
          isLoading={isLoading}
          selectedLead={selectedLead}
          onSelectLead={onSelectLead}
          onRefreshLead={onRefresh}
          onOpenOsintRun={onOpenOsintRun}
          onDeleteLead={onDeleteLead}
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
        isLoading={isLoading}
        totalCount={totalCount}
        stats={stats}
        selectedLead={selectedLead}
        onSelectLead={onSelectLead}
        onOpenLeadDrawer={onOpenLeadDrawer}
        onRunOsint={onRunOsint}
        onOpenOsintRun={onOpenOsintRun}
        onDeleteLead={onDeleteLead}
        onArchiveLead={onArchiveLead}
        onRefresh={onRefresh}
        onOpenSearch={onOpenSearch}
        onExportExcel={onExportExcel}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        activeNiche={activeNiche}
        onNicheChange={onNicheChange}
        activeCountry={activeCountry}
        onCountryChange={onCountryChange}
        activeCity={activeCity}
        onCityChange={onCityChange}
        contactChannel={contactChannel}
        onContactChannelChange={onContactChannelChange}
        ratingFilter={ratingFilter}
        onRatingFilterChange={onRatingFilterChange}
        reviewsFilter={reviewsFilter}
        onReviewsFilterChange={onReviewsFilterChange}
        noteFilter={noteFilter}
        onNoteFilterChange={onNoteFilterChange}
        onResetAllFilters={onResetAllFilters}
        focusTier={focusTier}
        onFocusTierChange={onFocusTierChange}
        onResetOsint={onResetOsint}
        onResolveWebsite={onResolveWebsite}
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
