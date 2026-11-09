import React, { useState, useEffect } from 'react';
import { RiCheckLine, RiTimeLine, RiCloseLine } from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { CloseButton } from '@/components/base/buttons/close-button';
import Header from './components/Header';
import DashboardSidebar from './components/boardui/DashboardSidebar';
import LeadTable from './components/LeadTable';
import LeadDrawer from './components/LeadDrawer';
import SearchModal from './components/SearchModal';
import QueueManager from './components/QueueManager';
import SettingsModal from './components/SettingsModal';
import AutoPilotModal from './components/AutoPilotModal';
import OsintRunModal from './components/OsintRunModal';
import AuditPage from './components/audit/AuditPage';
import CommandPalette from './components/boardui/CommandPalette';
import KeyboardShortcutsModal from './components/boardui/KeyboardShortcutsModal';
import DailyFocusHero from './components/boardui/DailyFocusHero';
import OnboardingModal from './components/boardui/OnboardingModal';
import LiveJobsDrawer from './components/boardui/LiveJobsDrawer';
import { Toaster, toast } from '@/components/base/toast/toast';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam && ['dark', 'light'].includes(themeParam)) {
      return themeParam;
    }
    return localStorage.getItem('theme') || 'dark';
  });

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'no_website', 'discovered', etc.
  const [activeNiche, setActiveNiche] = useState('all'); // 'all' or collection name (e.g. 'Dental Clinic')
  const [contactChannel, setContactChannel] = useState('all'); // 'all', 'has_email', 'has_whatsapp', 'has_social', 'phone_only', 'social_all'
  const [focusTier, setFocusTier] = useState('vault'); // 'vault' (all leads), 'today', 'gold'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState('50'); // Default to 50 for instantaneous responsiveness
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);

  // Debounce search input to guarantee immediate, zero-lag typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [autoPilotSelectedLeads, setAutoPilotSelectedLeads] = useState(null);
  const [osintSelectedLeads, setOsintSelectedLeads] = useState(null);
  const [osintCategory, setOsintCategory] = useState('all');
  const [osintParams, setOsintParams] = useState(null);
  const [osintJobId, setOsintJobId] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'search', 'csv', 'queue', 'settings', 'autopilot', 'osint', 'drawer'
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['table', 'kanban', 'split'].includes(viewParam)) {
      return viewParam;
    }
    return localStorage.getItem('viewMode') || 'table';
  });
  const [toast, setToast] = useState(null); // { message, time, type }
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    return localStorage.getItem('quarry_onboarding_completed') !== 'true';
  });
  const [isLiveJobsOpen, setIsLiveJobsOpen] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for Command Palette, ? for Cheatsheet)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  const [auditLeadId, setAuditLeadId] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/audit/')) {
      const id = path.replace('/audit/', '');
      return id ? parseInt(id, 10) : null;
    }
    const params = new URLSearchParams(window.location.search);
    const auditParam = params.get('auditLeadId');
    return auditParam ? parseInt(auditParam, 10) : null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/audit/')) {
        const id = path.replace('/audit/', '');
        setAuditLeadId(id ? parseInt(id, 10) : null);
      } else {
        setAuditLeadId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenAudit = (leadId) => {
    setAuditLeadId(leadId);
    window.history.pushState({}, '', '/audit/' + leadId);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const [tunnel, setTunnel] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/settings/tunnel');
        const data = await res.json();
        if (data.success) {
          setTunnel(data.tunnel);
        }
      } catch (err) {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss toast notification after 7 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Deep-link to open LeadDrawer if ?leadId is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get('leadId');
    const tab = params.get('tab');
    const viewParam = params.get('view');
    if (viewParam && ['table', 'kanban', 'split'].includes(viewParam)) {
      setViewMode(viewParam);
    }
    if (leadId) {
      fetch(`/api/leads/${leadId}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.lead) {
            setSelectedLead({ ...data.lead, initialTab: tab || 'pitch' });
            setActiveModal('drawer');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchLeads = async () => {
    try {
      let url = `/api/leads?status=${activeFilter}&search=${encodeURIComponent(debouncedSearch)}`;
      if (activeNiche && activeNiche !== 'all') {
        url += `&category=${encodeURIComponent(activeNiche)}`;
      }
      if (contactChannel && contactChannel !== 'all') {
        url += `&contactChannel=${encodeURIComponent(contactChannel)}`;
      }
      if (focusTier === 'today') {
        url += '&batchMode=today';
      } else if (focusTier === 'gold') {
        url += '&tier=gold';
      }

      if (pageSize === 'all') {
        url += '&limit=200';
      } else {
        const lim = parseInt(pageSize, 10) || 50;
        const off = (currentPage - 1) * lim;
        url += `&limit=${lim}&offset=${off}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[App] fetchLeads returned status ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
        setTotalLeadsCount(data.total !== undefined ? data.total : (data.leads ? data.leads.length : 0));
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/leads/stats');
      if (!res.ok) {
        console.warn(`[App] fetchStats returned status ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  // Reset to page 1 when filter/niche/search/focus/contactChannel changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, debouncedSearch, activeNiche, focusTier, contactChannel, pageSize]);

  useEffect(() => {
    fetchLeads();
  }, [activeFilter, debouncedSearch, activeNiche, focusTier, contactChannel, pageSize, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [activeFilter, activeNiche, focusTier, contactChannel]);

  // Check for active background OSINT job on mount / page refresh
  useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const res = await fetch('/api/osint/active-job');
        if (res.ok) {
          const data = await res.json();
          if (data && data.active && data.jobId) {
            setOsintJobId(data.jobId);
            setActiveModal('osint');
          }
        }
      } catch (e) {
        // Silently ignore network checks
      }
    };
    checkActiveJob();
  }, []);

  // Run OSINT on single lead from row
  const handleRunOsint = async (leadId) => {
    try {
      const res = await fetch(`/api/osint/${leadId}?force=true`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchLeads();
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (selectedLead?.id === leadId) setSelectedLead(null);
        await fetchLeads();
        await fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Automatically find official website for lead
  const handleResolveWebsite = async (leadId) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/resolve-website`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchLeads();
      } else {
        alert(data.error || 'Could not automatically find website');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Export to Excel (.xlsx) or CSV
  const handleExportExcel = (format = 'excel') => {
    const filter = activeFilter || 'all';
    const url = `/api/export/${format}?filter=${encodeURIComponent(filter)}`;
    toast.success(`Exporting ${format.toUpperCase()} file...`, {
      description: `Downloading full prospect list filtered by "${filter}"`
    });
    window.location.href = url;
  };

  // 1-Click Clean Data (Purge leads with websites)
  const handleCleanWebsites = async () => {
    const withWebsitesCount = stats?.withWebsites || 0;
    if (!window.confirm(`Clean Data Action:\n\nThis will purge the ${withWebsitesCount} leads that already have websites and keep ONLY authentic no-website prospects.\n\nDo you want to proceed?`)) {
      return;
    }
    try {
      const res = await fetch('/api/leads/clean-websites', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || `Cleaned ${data.purgedCount} leads with websites. Retained ${data.remainingCount} no-website prospects!`);
        setActiveFilter('no_website'); // switch view to the clean no-website leads
        await fetchLeads();
        await fetchStats();
      } else {
        alert('Failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error('Failed to clean websites', err);
      alert('Failed to clean websites: ' + err.message);
    }
  };

  // 1-Click Complete Database Reset / Purge All Leads
  const handlePurgeAllLeads = async () => {
    if (!window.confirm("Complete Database Reset:\n\nAre you sure you want to delete ALL leads and pipeline data from the database? This will give you a 100% clean slate to test the scraper.")) {
      return;
    }
    try {
      const res = await fetch('/api/leads/purge-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'All leads completely deleted from database!');
        setActiveNiche('all');
        await fetchLeads();
        await fetchStats();
      } else {
        alert('Failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error('Failed to purge all leads', err);
      alert('Failed to purge all leads: ' + err.message);
    }
  };

  // 1-Click Reset OSINT Data (for all leads or specific collection)
  const handleResetOsint = async (category = 'all') => {
    const scopeLabel = category && category !== 'all' ? `collection "${category}"` : 'ALL leads in the database';
    if (!window.confirm(`Reset OSINT Data:\n\nAre you sure you want to delete and reset all OSINT verification and contact details for ${scopeLabel}?\n\nThis will clear all contacts/social profiles and return the leads to "discovered" status so you can re-run fresh.`)) {
      return;
    }
    try {
      const res = await fetch('/api/osint/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'OSINT data reset successfully!');
        await fetchLeads();
        await fetchStats();
      } else {
        alert('Failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error('Failed to reset OSINT', err);
      alert('Failed to reset OSINT: ' + err.message);
    }
  };

  // Dedicated Website Audit Page Route View
  if (auditLeadId) {
    return (
      <AuditPage
        leadId={auditLeadId}
        onBack={() => {
          setAuditLeadId(null);
          window.history.pushState({}, '', '/');
        }}
        onOpenPitch={(lead) => {
          setAuditLeadId(null);
          window.history.pushState({}, '', '/');
          setSelectedLead(lead);
          setActiveModal('drawer');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex font-sans transition-colors duration-200 antialiased overflow-x-hidden">
      {/* BoardUI Floating Sidebar */}
      <DashboardSidebar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        stats={stats}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSearch={(tab) => setActiveModal(tab === 'csv' ? 'csv' : 'search')}
        onOpenAutoPilot={(selectedLeads) => {
          setAutoPilotSelectedLeads(selectedLeads || null);
          setActiveModal('autopilot');
        }}
        onOpenQueue={() => setActiveModal('queue')}
        onOpenSettings={() => setActiveModal('settings')}
        onExportExcel={() => handleExportExcel('excel')}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        tunnel={tunnel}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header & Metrics */}
        <Header
          stats={stats}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSearch={(tab) => setActiveModal(tab === 'csv' ? 'csv' : 'search')}
          onOpenAutoPilot={(selectedLeads) => {
            setAutoPilotSelectedLeads(selectedLeads || null);
            setActiveModal('autopilot');
          }}
          onOpenQueue={() => setActiveModal('queue')}
          onOpenSettings={() => setActiveModal('settings')}
          onExportExcel={() => handleExportExcel('excel')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenLiveJobs={() => setIsLiveJobsOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-(--breakpoint-2xl) mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* Daily Outreach Focus Cockpit */}
        <DailyFocusHero
          stats={stats}
          leads={leads}
          onStartOutreachBatch={() => {
            setAutoPilotSelectedLeads(null);
            setActiveModal('autopilot');
          }}
          onOpenQueue={() => setActiveModal('queue')}
        />

        <LeadTable
          leads={leads}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectLead={setSelectedLead}
          onRunOsint={handleRunOsint}
          onOpenOsintRun={(opts, categoryOverride) => {
            if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
              setOsintSelectedLeads(opts.leadIds || null);
              setOsintCategory(opts.category || activeNiche);
              setOsintParams(opts);
            } else {
              setOsintSelectedLeads(opts || null);
              setOsintCategory(categoryOverride !== undefined ? categoryOverride : activeNiche);
              setOsintParams({
                filter: activeFilter,
                category: categoryOverride !== undefined ? categoryOverride : activeNiche,
                focusTier,
                contactChannel,
                searchTerm
              });
            }
            setOsintJobId(null);
            setActiveModal('osint');
          }}
          onDeleteLead={handleDeleteLead}
          onResolveWebsite={handleResolveWebsite}
          onOpenSearch={(tab) => setActiveModal(tab)}
          onOpenAutoPilot={(selectedLeads) => {
            setAutoPilotSelectedLeads(selectedLeads || null);
            setActiveModal('autopilot');
          }}
          onExportExcel={handleExportExcel}
          selectedLead={selectedLead}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onOpenLeadDrawer={(lead) => {
            setSelectedLead(lead);
            setActiveModal('drawer');
          }}
          stats={stats}
          totalCount={totalLeadsCount}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          activeNiche={activeNiche}
          onNicheChange={setActiveNiche}
          contactChannel={contactChannel}
          onContactChannelChange={setContactChannel}
          focusTier={focusTier}
          onFocusTierChange={setFocusTier}
          onCleanWebsites={handleCleanWebsites}
          onPurgeAllLeads={handlePurgeAllLeads}
          onResetOsint={handleResetOsint}
          onOpenAudit={handleOpenAudit}
          onRefresh={() => {
            fetchLeads();
            fetchStats();
          }}
        />
      </main>
      </div>

      {/* Lead Detail & Pitch Synthesis Drawer (Opens in table/kanban view or when explicitly requested in split view) */}
      {selectedLead && (viewMode !== 'split' || activeModal === 'drawer') && (
        <LeadDrawer
          lead={selectedLead}
          onOpenAudit={handleOpenAudit}
          onClose={() => {
            if (activeModal === 'drawer') {
              setActiveModal(null);
            } else {
              setSelectedLead(null);
            }
          }}
          onRefreshLead={() => {
            fetchLeads();
            fetchStats();
          }}
          onQueueUpdated={() => {
            fetchLeads();
            fetchStats();
          }}
        />
      )}

      {/* Search / CSV Ingestion Modal */}
      {(activeModal === 'search' || activeModal === 'csv') && (
        <SearchModal
          initialTab={activeModal === 'csv' ? 'csv' : 'maps'}
          onClose={() => setActiveModal(null)}
          onLeadCreated={(meta) => {
            setActiveFilter('all');
            setActiveNiche('all');
            setContactChannel('all');
            setFocusTier('vault');
            setSearchTerm('');
            setCurrentPage(1);
            fetchLeads();
            fetchStats();
            if (meta && meta.found !== undefined) {
              toast.success(`Harvested ${meta.found} places (${meta.inserted} fresh leads)!`, {
                description: `Keyword: "${meta.keyword || 'Target'}" in ${meta.time || 'few seconds'}`
              });
              setToast({
                message: `Harvested ${meta.found} authentic places (${meta.inserted} new leads) for "${meta.keyword || 'Target'}"!`,
                time: meta.time,
                type: 'success'
              });
            }
          }}
        />
      )}

      {/* Outbox Queue Modal */}
      {activeModal === 'queue' && (
        <QueueManager
          onClose={() => setActiveModal(null)}
          onQueueUpdated={() => {
            fetchLeads();
            fetchStats();
          }}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal onClose={() => setActiveModal(null)} />
      )}

      {/* Auto-Pilot 1-Click Batch Pipeline Modal */}
      {activeModal === 'autopilot' && (
        <AutoPilotModal
          preSelectedLeads={autoPilotSelectedLeads || []}
          initialFilter={activeFilter}
          onClose={() => {
            setActiveModal(null);
            setAutoPilotSelectedLeads(null);
          }}
          onPipelineUpdated={() => {
            fetchLeads();
            fetchStats();
          }}
          onOpenQueue={() => {
            setActiveModal('queue');
          }}
        />
      )}

      {/* Live Batch OSINT Telemetry Modal */}
      {activeModal === 'osint' && (
        <OsintRunModal
          jobId={osintJobId}
          targetLeadIds={osintSelectedLeads || []}
          filter={osintParams?.filter || activeFilter}
          category={osintCategory}
          focusTier={osintParams?.focusTier || focusTier}
          contactChannel={osintParams?.contactChannel || contactChannel}
          searchTerm={osintParams?.searchTerm || searchTerm}
          collections={stats?.collections || []}
          stats={stats}
          limit={pageSize === 'all' ? 5000 : (parseInt(pageSize, 10) || 100)}
          onClose={() => {
            setActiveModal(null);
            setOsintSelectedLeads(null);
            setOsintJobId(null);
            setOsintParams(null);
          }}
          onRunCompleted={() => {
            fetchLeads();
            fetchStats();
          }}
        />
      )}

      {/* Floating Real-Time Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-background-primary-default border border-separator-border shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-2 rounded-xl bg-status-lime-background text-status-lime-text shrink-0">
            <RiCheckLine className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption-1-semibold text-text-primary uppercase tracking-wider">
                Harvesting Completed
              </span>
              {toast.time && (
                <Chip variant="subtle" color="lime" className="gap-1 inline-flex items-center font-mono">
                  <RiTimeLine className="size-3" />
                  <span>{toast.time}</span>
                </Chip>
              )}
            </div>
            <p className="text-caption-1-regular text-text-secondary mt-1 leading-snug">
              {toast.message}
            </p>
          </div>
          <CloseButton size="sm" onClick={() => setToast(null)} aria-label="Dismiss Notification" />
        </div>
      )}
      {/* Global Universal Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        leads={leads}
        onSelectLead={(lead) => {
          setSelectedLead(lead);
          setActiveModal('drawer');
        }}
        onOpenAudit={(leadId) => handleOpenAudit(leadId)}
        onOpenAutoPilot={(selected) => {
          setAutoPilotSelectedLeads(selected || null);
          setActiveModal('autopilot');
        }}
        onOpenSearch={(tab) => setActiveModal(tab)}
        onOpenQueue={() => setActiveModal('queue')}
        onOpenSettings={() => setActiveModal('settings')}
        onExportExcel={() => handleExportExcel('excel')}
        onToggleTheme={toggleTheme}
        theme={theme}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Global Keyboard Shortcuts Cheatsheet (?) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Enterprise First-Run Interactive Onboarding Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onSkip={() => {
          localStorage.setItem('quarry_onboarding_completed', 'true');
          setIsOnboardingOpen(false);
        }}
        onComplete={({ keyword, city }) => {
          setIsOnboardingOpen(false);
          setActiveNiche(keyword);
          fetchLeads();
          fetchStats();
        }}
      />

      {/* Mission Control Background Worker & Live Jobs Center */}
      <LiveJobsDrawer
        isOpen={isLiveJobsOpen}
        onClose={() => setIsLiveJobsOpen(false)}
        stats={stats}
        onRefresh={() => {
          fetchLeads();
          fetchStats();
        }}
      />

      {/* Persistent Mission Control Bottom Pill */}
      <div className="fixed bottom-4 left-6 z-30 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-primary-default/90 border border-separator-border shadow-lg backdrop-blur-md font-mono text-[11px] text-text-tertiary hover:text-text-primary transition-all">
        <button
          onClick={() => setIsLiveJobsOpen(true)}
          className="flex items-center gap-2 cursor-pointer hover:text-accent-500"
          title="Open Mission Control Background Jobs Drawer"
        >
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-text-secondary">Mission Control</span>
          <span className="text-text-tertiary">| Fleet Ready</span>
        </button>
      </div>

      {/* Official BoardUI Toaster Stack */}
      <Toaster position="bottom-end" limit={4} />
    </div>
  );
}
