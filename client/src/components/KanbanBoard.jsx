import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RiCopperCoinLine, 
  RiTrophyLine, 
  RiShieldCheckLine, 
  RiKanbanView, 
  RiUserStarLine, 
  RiCoinsLine,
  RiLoader4Line
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { SearchField } from '@/components/base/search-field/search-field';
import { Button } from '@/components/base/buttons/button';
import { STAGE_CONFIG, normalizeStage, getNextStage } from '@shared/stages';
import BoardTicket from './boardui/BoardTicket';
import WhatsAppModal from './boardui/WhatsAppModal';

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

export default function KanbanBoard({ 
  leads = [], 
  isLoading: initialLoading = false, 
  stats, 
  onSelectLead, 
  onStageChange, 
  onRefresh 
}) {
  const [boardSearch, setBoardSearch] = useState('');
  const [dragOverStage, setDragOverStage] = useState(null);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState(null);

  // Stage-specific leads state for accurate per-stage loading (up to 100 per column + load more)
  const [stageLeadsMap, setStageLeadsMap] = useState({});
  const [loadingStages, setLoadingStages] = useState({});

  const fetchStageLeads = useCallback(async (stageId, append = false) => {
    try {
      setLoadingStages(prev => ({ ...prev, [stageId]: true }));
      const currentLeads = append ? (stageLeadsMap[stageId]?.leads || []) : [];
      const offset = currentLeads.length;
      const res = await fetch(`/api/leads?status=${stageId}&limit=100&offset=${offset}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setStageLeadsMap(prev => ({
          ...prev,
          [stageId]: {
            leads: append ? [...currentLeads, ...(data.leads || [])] : (data.leads || []),
            total: typeof data.total === 'number' ? data.total : (data.leads?.length || 0)
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch leads for stage ${stageId}:`, err);
    } finally {
      setLoadingStages(prev => ({ ...prev, [stageId]: false }));
    }
  }, [stageLeadsMap]);

  const fetchAllStages = useCallback(() => {
    STAGES.forEach(stage => {
      fetchStageLeads(stage.id, false);
    });
  }, [fetchStageLeads]);

  // Initial fetch for each column on mount
  useEffect(() => {
    fetchAllStages();
  }, []);

  const handleLoadMore = (stageId) => {
    fetchStageLeads(stageId, true);
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
      fetchAllStages();
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
      fetchAllStages();
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
      fetchAllStages();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsApp = (lead) => {
    setWhatsAppModalLead(lead);
  };

  const handleEmail = (lead) => {
    if (!lead?.email) return;
    const subject = encodeURIComponent(`Question regarding ${lead.business_name || 'your business'}`);
    window.open(`mailto:${lead.email}?subject=${subject}`, '_blank');
  };

  const handleMarkWon = async (lead) => {
    try {
      await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'won' })
      });
      fetchAllStages();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to mark won', err);
    }
  };

  // Calculate loaded and total counts across stages
  const totalInDb = useMemo(() => {
    if (stats?.totalLeads) return stats.totalLeads;
    return STAGES.reduce((sum, s) => {
      const serverCount = stats?.[s.id];
      if (typeof serverCount === 'number') return sum + serverCount;
      return sum + (stageLeadsMap[s.id]?.total || 0);
    }, 0);
  }, [stats, stageLeadsMap]);

  const totalLoaded = useMemo(() => {
    return STAGES.reduce((sum, s) => {
      const stageLeads = stageLeadsMap[s.id]?.leads || leads.filter(l => normalizeStage(l.status) === s.id);
      return sum + stageLeads.length;
    }, 0);
  }, [stageLeadsMap, leads]);

  const searchTerm = boardSearch.trim().toLowerCase();

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
          Showing {totalLoaded} of {totalInDb || 1508} leads
        </Chip>
      </div>

      {/* 6-Column Unified Kanban Board with comfortable column widths and drag-and-drop */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 items-start">
        {STAGES.map((stage) => {
          // Get leads from per-stage state, fallback to filtered leads prop
          const rawStageLeads = stageLeadsMap[stage.id]?.leads || leads.filter(l => normalizeStage(l.status) === stage.id);
          const stageTotal = stats?.[stage.id] ?? stageLeadsMap[stage.id]?.total ?? rawStageLeads.length;
          
          const filteredLeads = searchTerm 
            ? rawStageLeads.filter(l => (
                (l.business_name && l.business_name.toLowerCase().includes(searchTerm)) ||
                (l.category && l.category.toLowerCase().includes(searchTerm)) ||
                (l.city && l.city.toLowerCase().includes(searchTerm)) ||
                (l.decision_maker_name && l.decision_maker_name.toLowerCase().includes(searchTerm))
              ))
            : rawStageLeads;

          const stageValue = rawStageLeads.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0);
          const isTargeted = dragOverStage === stage.id;
          const isStageLoading = loadingStages[stage.id] || (initialLoading && !stageLeadsMap[stage.id]);
          const hasMore = !searchTerm && rawStageLeads.length < stageTotal;
          const remainingCount = Math.max(0, stageTotal - rawStageLeads.length);

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
                  {stageTotal}
                </Chip>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {isStageLoading && rawStageLeads.length === 0 ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <KanbanTicketSkeleton key={`skeleton-ticket-${stage.id}-${idx}`} index={idx} />
                  ))
                ) : (
                  <AnimatePresence>
                    {filteredLeads.length === 0 ? (
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
                      filteredLeads.map((lead) => (
                        <BoardTicket
                          key={lead.id}
                          lead={lead}
                          onSelect={onSelectLead}
                          onAdvance={handleQuickAdvance}
                          onSaveDealValue={handleSaveDealValue}
                          onWhatsApp={handleWhatsApp}
                          onEmail={handleEmail}
                          onFindContact={onSelectLead}
                          onFollowUp={onSelectLead}
                          onMarkWon={handleMarkWon}
                        />
                      ))
                    )}
                  </AnimatePresence>
                )}

                {/* Load More Button when column has remaining leads */}
                {hasMore && (
                  <div className="pt-2 text-center">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleLoadMore(stage.id)}
                      disabled={loadingStages[stage.id]}
                      leadingIcon={loadingStages[stage.id] ? RiLoader4Line : undefined}
                      className="w-full text-text-tertiary hover:text-text-primary text-[11px]"
                    >
                      {loadingStages[stage.id] 
                        ? 'Loading...' 
                        : `Load more (${remainingCount} remaining)`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Outreach Modal */}
      {whatsAppModalLead && (
        <WhatsAppModal
          isOpen={Boolean(whatsAppModalLead)}
          lead={whatsAppModalLead}
          onClose={() => setWhatsAppModalLead(null)}
          onSuccess={() => {
            fetchAllStages();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}