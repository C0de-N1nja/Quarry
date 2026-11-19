import React from 'react';
import SearchModal from '../SearchModal';

export default function FindProspectsPage({ 
  onViewSavedLeads, 
  onRefresh 
}) {
  return (
    <SearchModal
      isFullPage={true}
      initialTab="maps"
      onClose={onViewSavedLeads}
      onViewSavedLeads={onViewSavedLeads}
      onLeadCreated={() => {
        if (onRefresh) onRefresh();
      }}
    />
  );
}
