'use client';

import React, { useState } from 'react';
import { useQuarry } from '../context/QuarryContext';
import { ChevronDown, ChevronUp, BookmarkCheck, CheckSquare, Square, Plus, Save, Target } from 'lucide-react';

export function TargetSpaceCard() {
  const {
    targetSpace,
    updateStrategyNotes,
    toggleChecklistItem,
    addChecklistItem,
    setActiveWorkspace
  } = useQuarry();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notes, setNotes] = useState(targetSpace.strategyNotes);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveNotes = () => {
    updateStrategyNotes(notes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    addChecklistItem(newChecklistText);
    setNewChecklistText('');
  };

  const completedCount = targetSpace.checklist.filter(c => c.completed).length;

  return (
    <div className="w-full bg-[#050505] border-b border-[#141414] py-2 px-4">
      <div className="max-w-[1600px] mx-auto bg-[#0c0c0c] border border-[#171717] rounded-2xl overflow-hidden transition-all">
        {/* Collapsible Header Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between bg-[#0b0b0b] border-b border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight uppercase">Current Target Space:</span>
              <span className="text-xs font-semibold text-emerald-300">{targetSpace.regionLabel}</span>
            </div>

            {/* Saved Leads Count Badge linking to Leads CRM */}
            <button
              type="button"
              onClick={() => setActiveWorkspace('leads')}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono hover:bg-emerald-500/20 transition-colors"
            >
              <BookmarkCheck className="w-3 h-3" />
              <span>{targetSpace.savedLeadsCount} Saved Leads</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#7e7e7e] font-mono">
              Checklist: {completedCount}/{targetSpace.checklist.length} Completed
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-[#8a8a8a] hover:text-white hover:bg-[#171717] transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2-Column Interior (7/12 Strategy Notes + 5/12 Target Checklist) */}
        {!isCollapsed && (
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 7/12: Strategy Notes */}
            <div className="md:col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#8a8a8a]">
                  Campaign Strategy & Positioning Notes
                </label>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/25 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSaved ? 'Saved!' : 'Save Notes'}</span>
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Document trade pain points, outreach angles, pricing context, or local market observations..."
                className="w-full bg-[#050505] border border-[#171717] focus:border-emerald-500/50 rounded-[14px] p-2.5 text-xs text-[#cfcfcf] placeholder-[#7e7e7e] outline-none resize-none leading-relaxed"
              />
            </div>

            {/* 5/12: Interactive Target Checklist */}
            <div className="md:col-span-5 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-[#141414] pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#8a8a8a]">
                  Target Checklist
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {Math.round((completedCount / (targetSpace.checklist.length || 1)) * 100)}%
                </span>
              </div>

              {/* Checklist items */}
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {targetSpace.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#141414] cursor-pointer text-xs text-[#cfcfcf] select-none transition-colors"
                  >
                    {item.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-[#7e7e7e] shrink-0" />
                    )}
                    <span className={item.completed ? 'line-through text-[#7e7e7e]' : ''}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Checklist Item Form */}
              <form onSubmit={handleAddChecklistItem} className="flex items-center gap-1.5 mt-auto pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Add checklist step..."
                  className="flex-1 bg-[#050505] border border-[#171717] rounded-[10px] px-2.5 py-1 text-xs text-white placeholder-[#7e7e7e] outline-none"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-[10px] bg-[#171717] hover:bg-[#242424] text-[#cfcfcf] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
