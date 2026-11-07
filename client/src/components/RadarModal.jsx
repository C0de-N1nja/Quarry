import React, { useState, useEffect } from 'react';
import { 
  X, Radio, Search, ExternalLink, Sparkles, UserPlus, Check, Copy, 
  Globe, Briefcase, Clock, Tag, RefreshCw, ChevronRight, ChevronDown, 
  Terminal, ShieldCheck
} from 'lucide-react';

export default function RadarModal({ onClose, onLeadCreated }) {
  const [query, setQuery] = useState('node backend');
  const [source, setSource] = useState('all');
  const [gigs, setGigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeProposal, setActiveProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [convertedIds, setConvertedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const quickKeywords = ['Node.js', 'Express', 'Backend API', 'PostgreSQL', 'Full Stack', 'Contract'];

  const fetchGigs = async (searchQuery = query, searchSource = source) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/radar?query=${encodeURIComponent(searchQuery)}&source=${searchSource}&limit=30`);
      const data = await res.json();
      if (data.success) {
        setGigs(data.gigs || []);
      }
    } catch (err) {
      console.error('Failed to load radar gigs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, [source]);

  const handleGenerateProposal = async (gig) => {
    setProposalLoading(true);
    try {
      const res = await fetch('/api/radar/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gig })
      });
      const data = await res.json();
      if (data.success) {
        setActiveProposal({ ...data.proposal, gigId: gig.id });
      }
    } catch (err) {
      console.error('Failed to generate proposal', err);
    } finally {
      setProposalLoading(false);
    }
  };

  const handleConvertToLead = async (gig) => {
    try {
      const res = await fetch('/api/radar/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gig })
      });
      const data = await res.json();
      if (data.success) {
        setConvertedIds(prev => new Set([...prev, gig.id]));
        if (onLeadCreated) onLeadCreated(data.lead);
      }
    } catch (err) {
      console.error('Failed to convert gig to lead', err);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-border-subtle rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">International Gig & Intent Radar</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Zero-API-Key Live Scanner
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Live contract opportunities & hiring intent from HackerNews ("Who is hiring?") and WeWorkRemotely.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-surface-3 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-border-subtle bg-surface-1 flex flex-wrap items-center justify-between gap-3">
          <form 
            onSubmit={(e) => { e.preventDefault(); fetchGigs(query, source); }}
            className="flex-1 min-w-[280px] flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tech stack, roles, or skills (e.g. 'node backend', 'api engineer')..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border-subtle text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Scan Radar</span>
            </button>
          </form>

          {/* Source Tabs */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border-subtle text-xs">
            <button
              onClick={() => setSource('all')}
              className={`px-3 py-1 rounded-md transition-colors ${source === 'all' ? 'bg-surface-1 text-cyan-600 dark:text-cyan-400 shadow-sm font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              All Feeds
            </button>
            <button
              onClick={() => setSource('hn')}
              className={`px-3 py-1 rounded-md transition-colors ${source === 'hn' ? 'bg-surface-1 text-cyan-600 dark:text-cyan-400 shadow-sm font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              HackerNews
            </button>
            <button
              onClick={() => setSource('wwr')}
              className={`px-3 py-1 rounded-md transition-colors ${source === 'wwr' ? 'bg-surface-1 text-cyan-600 dark:text-cyan-400 shadow-sm font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              WeWorkRemotely
            </button>
          </div>
        </div>

        {/* Quick Keyword Pills */}
        <div className="px-6 py-2 border-b border-border-subtle/60 bg-surface-2/30 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-gray-400 font-mono uppercase text-[9px] mr-1">Quick Filters:</span>
          {quickKeywords.map(kw => (
            <button
              key={kw}
              onClick={() => {
                setQuery(kw);
                fetchGigs(kw, source);
              }}
              className="px-2.5 py-0.5 rounded-full bg-surface-2 hover:bg-surface-3 border border-border-subtle text-gray-600 dark:text-gray-300 transition-colors whitespace-nowrap"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* Modal Body: Feed List + Proposal Drawer */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Gigs Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 divide-y divide-border-subtle/40">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-sm">Sweeping international feeds for Node & Backend contracts...</p>
              </div>
            ) : gigs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Radio className="h-8 w-8 text-gray-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No gigs matched your criteria</p>
                <p className="text-xs">Try searching for generic terms like "backend", "api", or "node".</p>
              </div>
            ) : (
              gigs.map((gig) => {
                const isExpanded = expandedId === gig.id;
                const isConverted = convertedIds.has(gig.id);
                return (
                  <div 
                    key={gig.id} 
                    className="pt-3.5 first:pt-0 group hover:bg-surface-2/40 -mx-3 px-3 py-3 rounded-xl transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {gig.company}
                          </h3>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            {gig.role}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-md font-mono ${gig.source === 'HackerNews' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                            {gig.source}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-gray-400" />
                            {gig.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {new Date(gig.posted_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Tech tags */}
                        {gig.tags && gig.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {gig.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 text-[10px] font-mono rounded bg-surface-3 text-gray-700 dark:text-gray-300 border border-border-subtle">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Summary / Snippet */}
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                          {isExpanded ? gig.raw_text : gig.summary}
                        </p>

                        {gig.raw_text && gig.raw_text.length > 240 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : gig.id)}
                            className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
                          >
                            {isExpanded ? 'Show less' : 'Read full posting'}
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <button
                          onClick={() => handleGenerateProposal(gig)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-600/20 transition-all"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>1-Click Proposal</span>
                        </button>

                        <button
                          onClick={() => handleConvertToLead(gig)}
                          disabled={isConverted}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${isConverted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-surface-2 hover:bg-surface-3 border-border-subtle text-gray-700 dark:text-gray-200'}`}
                        >
                          {isConverted ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span>Added to Leads</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3 text-gray-400" />
                              <span>Convert to Lead</span>
                            </>
                          )}
                        </button>

                        <a
                          href={gig.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-cyan-500 transition-colors pt-1"
                        >
                          <span>Original Post</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Proposal Preview Drawer (Slide in on right if active) */}
          {activeProposal && (
            <div className="w-full sm:w-[420px] border-l border-border-subtle bg-surface-2/60 flex flex-col h-full animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                    Tailored Proposal
                  </h4>
                </div>
                <button
                  onClick={() => setActiveProposal(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Subject Line */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase">Subject Line</span>
                    <button
                      onClick={() => copyToClipboard(activeProposal.subject, 'subject')}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'subject' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedField === 'subject' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-1 border border-border-subtle text-xs text-gray-800 dark:text-gray-200 font-medium select-all">
                    {activeProposal.subject}
                  </div>
                </div>

                {/* Pitch Body */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase">Tailored Message</span>
                    <button
                      onClick={() => copyToClipboard(activeProposal.body, 'body')}
                      className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {copiedField === 'body' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedField === 'body' ? 'Copied' : 'Copy Body'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={activeProposal.body}
                    rows={14}
                    className="w-full p-3 rounded-lg bg-surface-1 border border-border-subtle text-xs text-gray-800 dark:text-gray-200 font-sans leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="p-4 border-t border-border-subtle bg-surface-1 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Address Rehan's strengths directly</span>
                <button
                  onClick={() => copyToClipboard(`${activeProposal.subject}\n\n${activeProposal.body}`, 'all')}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copiedField === 'all' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'all' ? 'All Copied!' : 'Copy Full Proposal'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
