'use client';

import React, { useState } from 'react';
import { useQuarry } from '@/context/QuarryContext';
import { BusinessAvatar } from '../scanner/BusinessAvatar';
import { PitchStudio } from '../scanner/PitchStudio';
import {
  Search,
  Filter,
  Layers,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Clock,
  Send,
  Calendar,
  CheckCircle,
  Tag,
  Star,
  ChevronDown,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { BusinessItem } from '@/types/quarry';

export function LeadsWorkspace() {
  const {
    leads,
    leadsGroupBy,
    setLeadsGroupBy,
    leadsStatusFilter,
    setLeadsStatusFilter,
    leadsSearchQuery,
    setLeadsSearchQuery,
    setActiveWorkspace,
    setIsOutreachModalOpen
  } = useQuarry();

  const [selectedLeadId, setSelectedLeadId] = useState<string | number | null>(
    leads.length > 0 ? leads[0].id : null
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [leadTags, setLeadTags] = useState<Record<string, string[]>>({});
  const [newTagInput, setNewTagInput] = useState<string>('');

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (leadsStatusFilter !== 'all' && l.status !== leadsStatusFilter) return false;
    if (leadsSearchQuery.trim()) {
      const q = leadsSearchQuery.toLowerCase();
      const matchName = l.business_name.toLowerCase().includes(q);
      const matchCity = (l.city || '').toLowerCase().includes(q);
      const matchCat = (l.category || '').toLowerCase().includes(q);
      if (!matchName && !matchCity && !matchCat) return false;
    }
    return true;
  });

  // Group leads based on leadsGroupBy switcher
  const groupedLeads: Record<string, BusinessItem[]> = {};
  if (leadsGroupBy === 'flat') {
    groupedLeads['All Saved Leads'] = filteredLeads;
  } else {
    filteredLeads.forEach(lead => {
      let key = 'Unassigned';
      if (leadsGroupBy === 'region') key = lead.city || 'Austin, TX';
      else if (leadsGroupBy === 'category') key = lead.category || 'General';
      else if (leadsGroupBy === 'status') {
        const s = lead.status || 'new';
        key = s.charAt(0).toUpperCase() + s.slice(1);
      }
      if (!groupedLeads[key]) groupedLeads[key] = [];
      groupedLeads[key].push(lead);
    });
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId) || (filteredLeads.length > 0 ? filteredLeads[0] : null);

  const handleAddTag = (leadId: string | number) => {
    if (!newTagInput.trim()) return;
    const key = String(leadId);
    setLeadTags(prev => ({
      ...prev,
      [key]: [...(prev[key] || ['High Priority']), newTagInput.trim()]
    }));
    setNewTagInput('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      {/* Top Bar for Leads CRM */}
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-[#111111] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveWorkspace('scanner')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[#0c0c0c] border border-[#1c1c1c] hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Radar Scanner</span>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Leads CRM & Pipeline</h1>
              <p className="text-[11px] text-[#7e7e7e] font-mono">{leads.length} qualified prospective clients</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8a8a8a] mr-2">Pipeline Engine Active</span>
            <a
              href="/api/export?format=csv"
              className="px-3 py-1.5 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md"
            >
              Export CSV
            </a>
          </div>
        </div>
      </header>

      {/* Main 12-Column Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar: Leads List (lg:col-span-4 xl:col-span-4) */}
        <section className="lg:col-span-4 xl:col-span-4 h-[calc(100vh-100px)] sticky top-[80px] flex flex-col bg-[#0c0c0c] border border-[#171717] rounded-3xl overflow-hidden shadow-xl">
          {/* Controls: Search + Status Filter Pills + Group By Switcher */}
          <div className="p-3 bg-[#0b0b0b] border-b border-[#141414] space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8a8a8a]" />
              <input
                type="text"
                value={leadsSearchQuery}
                onChange={(e) => setLeadsSearchQuery(e.target.value)}
                placeholder="Search leads by name, city, niche..."
                className="w-full bg-[#050505] border border-[#171717] focus:border-emerald-500/50 rounded-[12px] pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#7e7e7e] outline-none"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'new', label: 'New' },
                { id: 'messaged', label: 'Messaged' },
                { id: 'replied', label: 'Replied' },
                { id: 'won', label: 'Won' },
                { id: 'lost', label: 'Lost' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLeadsStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    leadsStatusFilter === s.id
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-[#050505] border border-[#171717] text-[#8a8a8a] hover:text-[#cfcfcf]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Group By Switcher: Region | Category | Status | Flat */}
            <div className="flex items-center justify-between pt-1 border-t border-[#141414]">
              <span className="text-[10px] uppercase font-mono tracking-[1.4px] text-[#7e7e7e] flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#8a8a8a]" /> Group By:
              </span>
              <div className="flex items-center gap-1 bg-[#050505] p-0.5 rounded-[10px] border border-[#171717]">
                {(['region', 'category', 'status', 'flat'] as const).map(grp => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setLeadsGroupBy(grp)}
                    className={`px-2 py-0.5 rounded-[8px] text-[10px] font-semibold uppercase transition-colors ${
                      leadsGroupBy === grp
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-[#7e7e7e] hover:text-[#cfcfcf]'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grouped Leads List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {Object.keys(groupedLeads).length > 0 ? (
              Object.entries(groupedLeads).map(([groupTitle, items]) => {
                const isCollapsed = collapsedGroups[groupTitle];
                return (
                  <div key={groupTitle} className="space-y-1">
                    {/* Collapsible Group Header */}
                    <div
                      onClick={() => toggleGroup(groupTitle)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#050505] border border-[#141414] text-xs font-bold text-white cursor-pointer select-none hover:bg-[#111111]"
                    >
                      <div className="flex items-center gap-1.5">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-[#7e7e7e]" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{groupTitle}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#171717] text-[#8a8a8a]">
                        {items.length}
                      </span>
                    </div>

                    {/* Group Items */}
                    {!isCollapsed && (
                      <div className="space-y-1 pl-1">
                        {items.map(lead => {
                          const isSelected = selectedLead?.id === lead.id;
                          const lastOutreach = (lead.outreach_history && lead.outreach_history[0]) || null;

                          return (
                            <div
                              key={lead.id}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-[#171717] border-emerald-500/40 shadow-lg'
                                  : 'bg-[#080808] border-[#141414] hover:border-[#1f1f1f]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <BusinessAvatar name={lead.business_name} size="sm" />
                                  <div>
                                    <h4 className="text-xs font-bold text-white tracking-tight truncate max-w-[170px]">
                                      {lead.business_name}
                                    </h4>
                                    <p className="text-[10px] text-[#7e7e7e]">
                                      {lead.category} · {lead.city || 'Austin'}
                                    </p>
                                  </div>
                                </div>

                                {/* Opportunity Score Badge */}
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                                  {lead.opportunity_score || 85}
                                </span>
                              </div>

                              {/* Anti-Duplicate UX: Last Contacted Channel & Date Badge */}
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#141414] text-[10px]">
                                {lastOutreach ? (
                                  <span className="font-mono text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    <Send className="w-2.5 h-2.5" />
                                    {lastOutreach.channel.toUpperCase()} · {lastOutreach.date}
                                  </span>
                                ) : (
                                  <span className="font-mono text-[#7e7e7e]">Not contacted yet</span>
                                )}
                                <span className="text-[#7e7e7e] font-mono">Added by Quarry</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-[#7e7e7e]">
                No leads found in this pipeline view.
              </div>
            )}
          </div>
        </section>

        {/* Right Inspector Canvas (lg:col-span-8 xl:col-span-8) */}
        <section className="lg:col-span-8 xl:col-span-8 space-y-4">
          {selectedLead ? (
            <>
              {/* Lead Inspector Header */}
              <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#141414]">
                  <div className="flex items-center gap-3">
                    <BusinessAvatar name={selectedLead.business_name} size="lg" />
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">{selectedLead.business_name}</h2>
                      <p className="text-xs text-[#8a8a8a]">{selectedLead.address || selectedLead.city}</p>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8a8a8a] font-semibold">Stage:</span>
                    <select
                      value={selectedLead.status || 'new'}
                      onChange={(e) => {
                        selectedLead.status = e.target.value;
                      }}
                      className="bg-[#050505] border border-[#1c1c1c] rounded-[12px] px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="new">New Lead</option>
                      <option value="messaged">Messaged</option>
                      <option value="replied">Replied</option>
                      <option value="won">Won Deal</option>
                      <option value="lost">Lost</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsOutreachModalOpen(true)}
                      className="px-3 py-1.5 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Log Outreach
                    </button>
                  </div>
                </div>

                {/* 4-Column Contact Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
                  <div className="bg-[#050505] border border-[#171717] p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-[#7e7e7e] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" /> Phone
                    </span>
                    <span className="text-xs font-mono text-white mt-1 block truncate">
                      {selectedLead.phone || 'No phone'}
                    </span>
                  </div>
                  <div className="bg-[#050505] border border-[#171717] p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-[#7e7e7e] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-sky-400" /> Email
                    </span>
                    <span className="text-xs font-mono text-white mt-1 block truncate">
                      {selectedLead.email || 'No email'}
                    </span>
                  </div>
                  <div className="bg-[#050505] border border-[#171717] p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-[#7e7e7e] flex items-center gap-1">
                      <Globe className="w-3 h-3 text-rose-400" /> Website
                    </span>
                    <span className="text-xs font-mono text-white mt-1 block truncate">
                      {selectedLead.website || <span className="text-rose-400">No Website</span>}
                    </span>
                  </div>
                  <div className="bg-[#050505] border border-[#171717] p-2.5 rounded-xl">
                    <span className="text-[10px] uppercase font-mono text-[#7e7e7e] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> Hours
                    </span>
                    <span className="text-xs font-mono text-white mt-1 block truncate">
                      {selectedLead.hours || 'Mon–Fri 8am–6pm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outreach Pitch Studio for This Lead */}
              <PitchStudio business={selectedLead} />

              {/* Outreach History Timeline & Notes Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Outreach Timeline */}
                <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl">
                  <h3 className="text-xs font-bold uppercase tracking-[1.4px] text-[#7e7e7e] mb-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Outreach History Timeline
                  </h3>
                  <div className="space-y-3">
                    {(selectedLead.outreach_history && selectedLead.outreach_history.length > 0) ? (
                      selectedLead.outreach_history.map(item => (
                        <div key={item.id} className="p-3 rounded-2xl bg-[#050505] border border-[#171717] text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-emerald-300 uppercase">{item.channel} Dispatched</span>
                            <span className="text-[#7e7e7e]">{item.date}</span>
                          </div>
                          <p className="text-[#cfcfcf]">{item.notes}</p>
                          {item.admin_email_used && (
                            <span className="text-[10px] font-mono text-sky-400 block">
                              Sender: {item.admin_email_used}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-[#7e7e7e] bg-[#050505] rounded-2xl border border-[#141414]">
                        Zero prior outreach logged. Use Pitch Studio above to dispatch.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags & Account Notes Editor */}
                <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-5 shadow-xl space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-[1.4px] text-[#7e7e7e] flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-sky-400" /> Account Tags & Notes
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(leadTags[String(selectedLead.id)] || ['Hot Lead', 'No Website Prospect', 'High Intent']).map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="Add tag (e.g. VIP, Callback)..."
                      className="flex-1 bg-[#050505] border border-[#171717] rounded-[10px] px-2.5 py-1 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(selectedLead.id)}
                      className="px-2.5 py-1 rounded-[10px] bg-[#171717] hover:bg-[#242424] text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>

                  {/* Notes Textarea */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#7e7e7e] block mb-1">
                      Internal Lead Notes:
                    </label>
                    <textarea
                      value={leadNotes[String(selectedLead.id)] || ''}
                      onChange={(e) => setLeadNotes(prev => ({ ...prev, [String(selectedLead.id)]: e.target.value }))}
                      rows={4}
                      placeholder="Enter internal meeting notes, gatekeeper details, callback commitments..."
                      className="w-full bg-[#050505] border border-[#171717] focus:border-emerald-500/50 rounded-2xl p-2.5 text-xs text-[#cfcfcf] outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0c0c0c] border border-[#171717] rounded-3xl p-12 text-center text-xs text-[#7e7e7e]">
              No lead selected. Select a card from the pipeline sidebar.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
