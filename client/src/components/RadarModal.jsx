import React, { useState, useEffect } from 'react';
import { 
  RiBroadcastLine, 
  RiSearchLine, 
  RiExternalLinkLine, 
  RiSparklingLine, 
  RiUserAddLine, 
  RiCheckLine, 
  RiFileCopyLine, 
  RiGlobalLine, 
  RiBriefcaseLine, 
  RiTimeLine, 
  RiPriceTag3Line, 
  RiRefreshLine, 
  RiArrowRightSLine, 
  RiArrowDownSLine, 
  RiTerminalBoxLine, 
  RiShieldCheckLine,
  RiCloseLine
} from '@remixicon/react';
import { Modal, ModalBody } from '@/components/base/modal/modal';
import { CloseButton } from '@/components/base/buttons/close-button';
import { Button } from '@/components/base/buttons/button';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/buttons/button-group';
import { Chip } from '@/components/base/badges/chip';

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
    <Modal
      isOpen={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      aria-label="International Gig & Intent Radar"
      className="p-0 gap-0 overflow-hidden flex flex-col max-h-[88vh] bg-background-primary-default border border-separator-border text-text-primary shadow-2xl rounded-3xl"
    >
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-separator-border flex items-center justify-between bg-background-secondary-default shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-500/15 text-accent-500 flex items-center justify-center border border-accent-500/30">
            <RiBroadcastLine className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">International Gig & Intent Radar</h2>
              <Chip variant="bold" color="blue">
                Zero-API-Key Live Scanner
              </Chip>
            </div>
            <p className="text-xs text-text-secondary">
              Live contract opportunities & hiring intent from HackerNews ("Who is hiring?") and WeWorkRemotely.
            </p>
          </div>
        </div>
        <CloseButton 
          size="md"
          onClick={onClose}
          aria-label="Close Radar"
        />
      </div>

      <ModalBody className="p-0 gap-0 flex-1 overflow-hidden flex flex-col bg-background-primary-default text-text-primary">

        {/* Filter & Search Bar */}
        <div className="px-6 py-3.5 border-b border-separator-border bg-background-secondary-default flex flex-wrap items-center justify-between gap-3">
          <form 
            onSubmit={(e) => { e.preventDefault(); fetchGigs(query, source); }}
            className="flex-1 min-w-[280px] flex items-center gap-2"
          >
            <div className="relative flex-1">
              <RiSearchLine className="h-4 w-4 absolute left-3 top-2.5 text-text-tertiary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tech stack, roles, or skills (e.g. 'node backend', 'api engineer')..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-background-tertiary-default border border-separator-border text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-500"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              size="sm"
            >
              <RiRefreshLine className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Scan Radar</span>
            </Button>
          </form>

          {/* Source Tabs */}
          <ButtonGroup size="small">
            <ButtonGroupItem
              size="small"
              selected={source === 'all'}
              onClick={() => setSource('all')}
            >
              All Feeds
            </ButtonGroupItem>
            <ButtonGroupItem
              size="small"
              selected={source === 'hn'}
              onClick={() => setSource('hn')}
            >
              HackerNews
            </ButtonGroupItem>
            <ButtonGroupItem
              size="small"
              selected={source === 'wwr'}
              onClick={() => setSource('wwr')}
            >
              WeWorkRemotely
            </ButtonGroupItem>
          </ButtonGroup>
        </div>

        {/* Quick Keyword Pills */}
        <div className="px-6 py-2 border-b border-separator-border bg-background-secondary-default flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-text-tertiary font-mono uppercase text-[9px] mr-1">Quick Filters:</span>
          {quickKeywords.map(kw => (
            <div
              key={kw}
              onClick={() => {
                setQuery(kw);
                fetchGigs(kw, source);
              }}
              className="cursor-pointer inline-flex"
            >
              <Chip
                variant="subtle"
                color={query === kw ? "blue" : "gray"}
                size="sm"
                className="hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {kw}
              </Chip>
            </div>
          ))}
        </div>
              {kw}
            </button>
          ))}
        </div>

        {/* Modal Body: Feed List + Proposal Drawer */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Gigs Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 divide-y divide-separator-border/40">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-text-tertiary gap-3">
                <RiRefreshLine className="h-8 w-8 animate-spin text-accent-500" />
                <p className="text-sm">Sweeping international feeds for Node & Backend contracts...</p>
              </div>
            ) : gigs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-text-tertiary gap-2">
                <RiBroadcastLine className="h-8 w-8 text-text-tertiary" />
                <p className="text-sm font-medium text-text-primary">No gigs matched your criteria</p>
                <p className="text-xs">Try searching for generic terms like "backend", "api", or "node".</p>
              </div>
            ) : (
              gigs.map((gig) => {
                const isExpanded = expandedId === gig.id;
                const isConverted = convertedIds.has(gig.id);
                return (
                  <div 
                    key={gig.id} 
                    className="pt-3.5 first:pt-0 group hover:bg-background-secondary-default/50 -mx-3 px-3 py-3 rounded-xl transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                            {gig.company}
                          </h3>
                          <Chip variant="subtle" color="blue" size="sm">
                            {gig.role}
                          </Chip>
                          <Chip variant="subtle" color={gig.source === 'HackerNews' ? 'amber' : 'emerald'} size="sm">
                            {gig.source}
                          </Chip>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
                          <span className="flex items-center gap-1">
                            <RiGlobalLine className="h-3 w-3 text-text-tertiary" />
                            {gig.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <RiTimeLine className="h-3 w-3 text-text-tertiary" />
                            {new Date(gig.posted_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Tech tags */}
                        {gig.tags && gig.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {gig.tags.map(t => (
                              <span key={t} className="px-2 py-0.5 text-[10px] font-mono rounded bg-background-tertiary-default text-text-secondary border border-separator-border">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Summary / Snippet */}
                        <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                          {isExpanded ? gig.raw_text : gig.summary}
                        </p>

                        {gig.raw_text && gig.raw_text.length > 240 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : gig.id)}
                            className="mt-1 text-[11px] text-accent-500 hover:underline flex items-center gap-0.5 p-0 h-auto"
                          >
                            <span>{isExpanded ? 'Show less' : 'Read full posting'}</span>
                            {isExpanded ? <RiArrowDownSLine className="h-3 w-3" /> : <RiArrowRightSLine className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <Button
                          onClick={() => handleGenerateProposal(gig)}
                          variant="primary"
                          size="sm"
                        >
                          <RiSparklingLine className="h-3 w-3" />
                          <span>1-Click Proposal</span>
                        </Button>

                        <Button
                          onClick={() => handleConvertToLead(gig)}
                          disabled={isConverted}
                          variant="secondary"
                          size="sm"
                        >
                          {isConverted ? (
                            <>
                              <RiCheckLine className="h-3 w-3 text-success-primary" />
                              <span>Added to Leads</span>
                            </>
                          ) : (
                            <>
                              <RiUserAddLine className="h-3 w-3 text-text-tertiary" />
                              <span>Convert to Lead</span>
                            </>
                          )}
                        </Button>

                        <a
                          href={gig.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent-500 transition-colors pt-1"
                        >
                          <span>Original Post</span>
                          <RiExternalLinkLine className="h-2.5 w-2.5" />
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
            <div className="w-full sm:w-[420px] border-l border-separator-border bg-background-secondary-default flex flex-col h-full animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-separator-border flex items-center justify-between bg-background-secondary-default">
                <div className="flex items-center gap-2">
                  <RiSparklingLine className="h-4 w-4 text-accent-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Tailored Proposal
                  </h4>
                </div>
                <CloseButton
                  onClick={() => setActiveProposal(null)}
                  size="sm"
                  aria-label="Close proposal preview"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Subject Line */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-text-tertiary uppercase">Subject Line</span>
                    <Button
                      onClick={() => copyToClipboard(activeProposal.subject, 'subject')}
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-accent-500 h-auto py-0.5 px-1.5"
                    >
                      {copiedField === 'subject' ? <RiCheckLine className="h-3 w-3 text-success-primary" /> : <RiFileCopyLine className="h-3 w-3" />}
                      <span>{copiedField === 'subject' ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background-primary-default border border-separator-border text-xs text-text-primary font-medium select-all">
                    {activeProposal.subject}
                  </div>
                </div>

                {/* Pitch Body */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-text-tertiary uppercase">Tailored Message</span>
                    <Button
                      onClick={() => copyToClipboard(activeProposal.body, 'body')}
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-accent-500 h-auto py-0.5 px-1.5"
                    >
                      {copiedField === 'body' ? <RiCheckLine className="h-3 w-3 text-success-primary" /> : <RiFileCopyLine className="h-3 w-3" />}
                      <span>{copiedField === 'body' ? 'Copied' : 'Copy Body'}</span>
                    </Button>
                  </div>
                  <textarea
                    readOnly
                    value={activeProposal.body}
                    rows={14}
                    className="w-full p-3 rounded-lg bg-background-primary-default border border-separator-border text-xs text-text-primary font-sans leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="p-4 border-t border-separator-border bg-background-secondary-default flex items-center justify-between">
                <span className="text-[10px] text-text-tertiary">Address Rehan's strengths directly</span>
                <Button
                  onClick={() => copyToClipboard(`${activeProposal.subject}\n\n${activeProposal.body}`, 'all')}
                  variant="primary"
                  size="sm"
                >
                  {copiedField === 'all' ? <RiCheckLine className="h-3.5 w-3.5" /> : <RiFileCopyLine className="h-3.5 w-3.5" />}
                  <span>{copiedField === 'all' ? 'All Copied!' : 'Copy Full Proposal'}</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </ModalBody>
    </Modal>
  );
}
