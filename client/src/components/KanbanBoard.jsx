import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, ArrowRight, CheckCircle2, Clock, 
  AlertCircle, Sparkles, Building, Globe, Phone, ExternalLink,
  ChevronRight, Award, Trophy, UserCheck, Filter, Search
} from 'lucide-react';
import { RiCopperCoinLine, RiTrophyLine, RiShieldCheckLine, RiKanbanView } from '@remixicon/react';
import BoardTicket from './boardui/BoardTicket';

const STAGES = [
  { id: 'discovered', label: '1. Discovered', color: 'border-blue-500/30 bg-blue-500/10 text-blue-500' },
  { id: 'enriched', label: '2. OSINT Enriched', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400', match: ['enriched'] },
  { id: 'pitched', label: '3. Pitched / Outreached', color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400', match: ['pitched', 'sent'] },
  { id: 'replied', label: '4. In Discussion', color: 'border-amber-500/30 bg-amber-500/10 text-amber-500', match: ['replied'] },
  { id: 'won', label: '5. Deal Won 🏆', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500', match: ['won'] }
];

export default function KanbanBoard({ leads = [], stats, onSelectLead, onStageChange, onRefresh }) {
  const [boardSearch, setBoardSearch] = useState('');

  const filteredLeads = leads.filter(l => {
    if (!boardSearch.trim()) return true;
    const term = boardSearch.toLowerCase();
    return (
      (l.business_name && l.business_name.toLowerCase().includes(term)) ||
      (l.category && l.category.toLowerCase().includes(term)) ||
      (l.city && l.city.toLowerCase().includes(term)) ||
      (l.decision_maker_name && l.decision_maker_name.toLowerCase().includes(term))
    );
  });

  const getLeadsForStage = (stage) => {
    if (stage.match) {
      return filteredLeads.filter(l => stage.match.includes(l.status));
    }
    return filteredLeads.filter(l => l.status === stage.id);
  };

  const getNextStageId = (currentStatus) => {
    if (currentStatus === 'discovered') return 'enriched';
    if (currentStatus === 'enriched') return 'pitched';
    if (currentStatus === 'pitched' || currentStatus === 'sent') return 'replied';
    if (currentStatus === 'replied') return 'won';
    return null;
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

  return (
    <div className="space-y-4">
      {/* BoardUI Metric Cards Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-surface-1 border border-border-subtle shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-lg shrink-0">
            <RiCopperCoinLine className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Total Pipeline Value</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              ${(stats?.totalPipelineValue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">In Negotiations</p>
            <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
              ${(stats?.activeNegotiationValue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <RiTrophyLine className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Won Revenue</p>
            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${(stats?.wonRevenue || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Active Deals</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {filteredLeads.length} Leads
            </p>
          </div>
        </div>
      </div>

      {/* Board Controls: Search & Filter */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            placeholder="Filter board tickets..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-1 border border-border-subtle text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-hidden focus:border-brand/60"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      {/* 5-Column Kanban Board with BoardUI styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsForStage(stage);
          const stageValue = stageLeads.reduce((acc, l) => acc + (l.deal_value || 1000), 0);

          return (
            <div 
              key={stage.id} 
              className="bg-surface-0/60 dark:bg-surface-0/40 rounded-xl border border-border-subtle flex flex-col min-h-[550px] max-h-[78vh] shadow-xs"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-surface-1/80 backdrop-blur-xs rounded-t-xl">
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>{stage.label}</span>
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500">
                    ${stageValue.toLocaleString()}
                  </span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${stage.color}`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container with Framer Motion */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {stageLeads.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-32 flex flex-col items-center justify-center text-[11px] text-gray-400 border border-dashed border-border-subtle/80 rounded-lg p-2 text-center"
                    >
                      <RiKanbanView className="h-5 w-5 mb-1 opacity-40" />
                      <span>No leads in stage</span>
                    </motion.div>
                  ) : (
                    stageLeads.map((lead) => (
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
