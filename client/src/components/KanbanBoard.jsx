import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RiCopperCoinLine, 
  RiTrophyLine, 
  RiShieldCheckLine, 
  RiKanbanView, 
  RiUserStarLine, 
  RiCoinsLine 
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { SearchField } from '@/components/base/search-field/search-field';
import { Button } from '@/components/base/buttons/button';
import { STAGE_CONFIG, normalizeStage, getNextStage } from '@shared/stages';
import BoardTicket from './boardui/BoardTicket';

const STAGES = STAGE_CONFIG;

function KanbanTicketSkeleton({ index }) {
  return (
    <div
      key={`kanban-skeleton-${index}`}
      className="p-3.5 rounded-xl border border-separator-border bg-background-primary-default shadow-xs space-y-2.5 animate-pulse select-none"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-3/4 rounded bg-background-tertiary-default/80 dark:bg-zinc-800" />
        <div className="size-4 rounded-full bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-16 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
        <div className="h-3 w-12 rounded bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
      </div>
      <div className="pt-2 border-t border-separator-border/40 flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-background-tertiary-default/50 dark:bg-zinc-800/50" />
        <div className="h-5 w-14 rounded-full bg-background-tertiary-default/60 dark:bg-zinc-800/60" />
      </div>
    </div>
  );
}

export default function KanbanBoard({ leads = [], isLoading = false, stats, onSelectLead, onStageChange, onRefresh }) {
  const [boardSearch, setBoardSearch] = useState('');
  const [expandedStages, setExpandedStages] = useState(new Set());
  const [dragOverStage, setDragOverStage] = useState(null);

  const filteredLeads = useMemo(() => {
    if (!boardSearch.trim()) return leads;
    const term = boardSearch.toLowerCase();
    return leads.filter(l => (
      (l.business_name && l.business_name.toLowerCase().includes(term)) ||
      (l.category && l.category.toLowerCase().includes(term)) ||
      (l.city && l.city.toLowerCase().includes(term)) ||
      (l.decision_maker_name && l.decision_maker_name.toLowerCase().includes(term))
    ));
  }, [leads, boardSearch]);

  const getLeadsForStage = (stage) => {
    return filteredLeads.filter(l => normalizeStage(l.status) === stage.id);
  };

  const getNextStageId = (currentStatus) => {
    const next = getNextStage(currentStatus);
    return next !== normalizeStage(currentStatus) ? next : null;
  };

  const handleStageDrop = async (leadId, targetStage) => {
    if (!leadId || !targetStage) return;
    try {
      await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStage })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update stage on drop', err);
    }
  };

  const handleQuickAdvance = async (e, lead) => {
    e?.stopPropagation();
    const next = getNextStageId(lead.status);
    if (!next) return;
    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to advance stage', err);
    }
  };

  const handleSaveDealValue = async (leadId, val) => {
    try {
      await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_value: val })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpandStage = (stageId) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  return (
    <div className="space-y-3.5">
      {/* Board Controls: Search & Filter */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="w-full max-w-xs">
          <SearchField
            value={boardSearch}
            onChange={setBoardSearch}
            placeholder="Filter board tickets..."
            size="small"
            shape="pill"
            aria-label="Filter board tickets"
          />
        </div>
        <Chip variant="subtle" color="neutral">
          Showing {filteredLeads.length} of {leads.length} leads
        </Chip>
      </div>

      {/* 6-Column Unified Kanban Board with comfortable column widths and drag-and-drop */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 items-start">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsForStage(stage);
          const stageValue = stageLeads.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0);
          const isExpanded = expandedStages.has(stage.id);
          const visibleLeads = isExpanded ? stageLeads : stageLeads.slice(0, 30);
          const isTargeted = dragOverStage === stage.id;

          return (
            <div 
              key={stage.id} 
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverStage(stage.id);
              }}
              onDragLeave={() => {
                if (dragOverStage === stage.id) setDragOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const leadId = e.dataTransfer.getData('text/plain');
                if (leadId) handleStageDrop(leadId, stage.id);
              }}
              className={`min-w-[185px] sm:min-w-[190px] xl:min-w-[200px] flex-1 max-w-[260px] bg-background-secondary-default/40 rounded-2xl border transition-all flex flex-col min-h-[580px] max-h-[80vh] shadow-2xs overflow-hidden ${
                isTargeted ? 'border-accent-500 ring-2 ring-accent-500/30 bg-accent-500/5' : 'border-separator-border'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-separator-border flex items-center justify-between bg-background-primary-default/90 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <StatusDot color={stage.dotColor} />
                  <div>
                    <h3 className="text-body-medium font-semibold text-text-primary">
                      {stage.label}
                    </h3>
                    <span className="text-caption-1-medium font-mono text-text-tertiary">
                      ${stageValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Chip variant="bold" color={stage.chipColor}>
                  {stageLeads.length}
                </Chip>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <KanbanTicketSkeleton key={`skeleton-ticket-${stage.id}-${idx}`} index={idx} />
                  ))
                ) : (
                  <AnimatePresence>
                    {stageLeads.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-32 flex flex-col items-center justify-center text-caption-1-medium text-text-tertiary border border-dashed border-separator-border rounded-xl p-2 text-center"
                      >
                        <RiKanbanView className="size-5 mb-1.5 opacity-40 text-text-secondary" />
                        <span>No leads in stage</span>
                      </motion.div>
                    ) : (
                      visibleLeads.map((lead) => (
                        <BoardTicket
                          key={lead.id}
                          lead={lead}
                          onSelect={onSelectLead}
                          onAdvance={handleQuickAdvance}
                          onSaveDealValue={handleSaveDealValue}
                        />
                      ))
                    )}
                  </AnimatePresence>
                )}

                {/* Show More toggle if stage has more than 30 cards */}
                {stageLeads.length > 30 && (
                  <div className="pt-2 text-center">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => toggleExpandStage(stage.id)}
                      className="w-full text-text-tertiary hover:text-text-primary"
                    >
                      {isExpanded ? 'Show top 30' : `Show all ${stageLeads.length} leads`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
