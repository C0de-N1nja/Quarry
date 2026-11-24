'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BusinessItem, SearchResult, TargetSpace } from '../types/quarry';

interface QuarryContextType {
  // Navigation & Workspace
  activeWorkspace: 'scanner' | 'leads';
  setActiveWorkspace: (ws: 'scanner' | 'leads') => void;

  // Scanner State
  regionInput: string;
  setRegionInput: (r: string) => void;
  category: string;
  setCategory: (c: string) => void;
  radiusKm: number;
  setRadiusKm: (r: number) => void;
  searchHistory: string[];
  deleteSearchHistoryItem: (item: string) => void;
  clearSearchHistory: () => void;

  // Data & Results
  searchResult: SearchResult | null;
  selectedId: string | number | null;
  selectedBusiness: BusinessItem | null;
  reviewedIds: Set<string | number>;
  targetSpace: TargetSpace;
  filterChip: 'all' | 'unreviewed' | 'no_website' | 'low_reviews';
  setFilterChip: (c: 'all' | 'unreviewed' | 'no_website' | 'low_reviews') => void;
  filterQuery: string;
  setFilterQuery: (q: string) => void;
  isScanning: boolean;

  // Actions
  runScan: (region?: string, cat?: string, rad?: number) => Promise<void>;
  selectBusiness: (id: string | number) => void;
  toggleReviewed: (id: string | number, e?: React.MouseEvent) => void;
  scanAdjacentSector: (dir: 'N' | 'S' | 'E' | 'W') => Promise<void>;
  lookupProfile: (input: string) => Promise<BusinessItem | null>;
  pushToLeads: (business: BusinessItem) => Promise<void>;
  updateStrategyNotes: (notes: string) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (text: string) => void;
  logOutreachEvent: (leadId: string | number, event: { channel: 'whatsapp' | 'email' | 'phone'; notes: string; adminEmail?: string }) => void;

  // Leads CRM state
  leads: BusinessItem[];
  leadsGroupBy: 'region' | 'category' | 'status' | 'flat';
  setLeadsGroupBy: (g: 'region' | 'category' | 'status' | 'flat') => void;
  leadsStatusFilter: string;
  setLeadsStatusFilter: (s: string) => void;
  leadsSearchQuery: string;
  setLeadsSearchQuery: (q: string) => void;

  // Modals
  isOutreachModalOpen: boolean;
  setIsOutreachModalOpen: (open: boolean) => void;
  isEmailSignatureModalOpen: boolean;
  setIsEmailSignatureModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  outreachChannel: 'whatsapp' | 'email';
  setOutreachChannel: (ch: 'whatsapp' | 'email') => void;

  // Theme (Dark / Light)
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const QuarryContext = createContext<QuarryContextType | undefined>(undefined);

// Generate synthesized Quarry details for a prospect
function enrichBusinessDetails(item: Partial<BusinessItem>): BusinessItem {
  const name = item.business_name || 'Local Business';
  const hasNoWeb = item.has_no_website === true || item.has_no_website === 1 || !item.website;
  const rating = Number(item.rating) || 4.2;
  const reviews = Number(item.reviews_count) || 12;

  // Calculate opportunity score (0–100)
  let oppScore = 50;
  if (hasNoWeb) oppScore += 30;
  if (reviews < 15) oppScore += 15;
  if (rating >= 4.0 && rating <= 4.8) oppScore += 5;
  oppScore = Math.min(99, Math.max(25, oppScore));

  const gaps: BusinessItem['gaps'] = [];
  if (hasNoWeb) {
    gaps.push({
      severity: 'critical',
      title: 'Missing Official Business Domain',
      description: 'Google Maps listing links nowhere or uses social/aggregator URL. Zero direct capture or search engine authority.'
    });
    gaps.push({
      severity: 'critical',
      title: 'Invisible to AI Discovery (ChatGPT / Perplexity)',
      description: 'Generative search engines cannot index services, resulting in automatic referral to local competitors.'
    });
  } else {
    gaps.push({
      severity: 'warning',
      title: 'Suboptimal Mobile Speed & Conversion CTAs',
      description: 'Desktop-focused layout with no direct tap-to-WhatsApp or online booking triggers on mobile screens.'
    });
  }

  if (reviews < 20) {
    gaps.push({
      severity: 'warning',
      title: 'Low Review Volume Velocity',
      description: 'Fewer than 20 Google reviews leaves ranking vulnerable to competitors running automated review campaigns.'
    });
  }

  gaps.push({
    severity: 'info',
    title: 'Missing Structured Schema Markup',
    description: 'LocalBusiness and Service schema missing, limiting rich snippet visibility in search engine result cards.'
  });

  return {
    id: item.id || Math.random().toString(36).substring(7),
    business_name: name,
    category: item.category || 'General Service',
    rating,
    reviews_count: reviews,
    phone: item.phone || '+1 (512) 555-0199',
    email: item.email || `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    website: item.website || (hasNoWeb ? null : `https://www.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`),
    has_no_website: hasNoWeb,
    website_status: hasNoWeb ? 'no_website' : 'has_website',
    address: item.address || 'Central Business District',
    city: item.city || 'Austin',
    latitude: item.latitude || item.lat || 30.2672 + (Math.random() - 0.5) * 0.08,
    longitude: item.longitude || item.lng || -97.7431 + (Math.random() - 0.5) * 0.08,
    opportunity_score: oppScore,
    is_reviewed: Boolean(item.is_reviewed),
    status: item.status || 'new',
    source: item.source || 'Google Maps',
    maturity: reviews > 50 ? 'Veteran' : (reviews > 15 ? 'Established' : 'New Listing'),
    hours: item.hours || 'Mon–Fri 8:00 AM – 6:00 PM',
    executive_summary: `${name} is an active local provider with strong ${rating}★ reputation across ${reviews} authentic Google reviews. However, the operation currently lacks dedicated digital funnel infrastructure, causing high-intent local requests to leak to higher-ranked competitors.`,
    pitch_angle: hasNoWeb
      ? 'Website Absence & AI Voice Search Displacement Angle (ChatGPT/Perplexity recommends competitors)'
      : 'Speed-to-Lead Conversion Engine & Automated WhatsApp Booking Flow',
    targets: ['Homeowners in affluent suburbs', 'Emergency callout clients', 'Commercial maintenance contracts'],
    products: ['Full Service Installation', 'Urgent Repairs & Diagnostics', 'Scheduled Maintenance Agreements'],
    problems: ['Uncaptured organic map searchers', 'Zero automated lead booking', 'Manual phone-only intake friction'],
    gaps,
    competitors: [
      { name: 'Apex Premier Solutions', rating: 4.8, reviews_count: 84, has_website: true },
      { name: 'Vanguard Local Experts', rating: 4.6, reviews_count: 42, has_website: true },
      { name: 'Metro Regional Care', rating: 4.1, reviews_count: 19, has_website: false },
    ],
    outreach_history: item.outreach_history || []
  };
}

export function QuarryProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeWorkspace, setActiveWorkspace] = useState<'scanner' | 'leads'>('scanner');
  const [regionInput, setRegionInput] = useState<string>('Austin, TX');
  const [category, setCategory] = useState<string>('Roofing');
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [searchHistory, setSearchHistory] = useState<string[]>(['Austin, TX', 'Round Rock, TX', 'Dallas, TX']);

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string | number>>(new Set());
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const [filterChip, setFilterChip] = useState<'all' | 'unreviewed' | 'no_website' | 'low_reviews'>('all');
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Target Space State
  const [targetSpace, setTargetSpace] = useState<TargetSpace>({
    regionLabel: 'Austin, TX',
    savedLeadsCount: 0,
    strategyNotes: 'Focus on high-ticket service trades with strong review velocity but zero official websites. Priority: WhatsApp/SMS voice search hook.',
    checklist: [
      { id: '1', text: 'Scan central commercial corridor', completed: true },
      { id: '2', text: 'Filter no-website prospects', completed: true },
      { id: '3', text: 'Audit top 3 local competitors', completed: true },
      { id: '4', text: 'Draft observation hooks in Pitch Studio', completed: false },
      { id: '5', text: 'Dispatch WhatsApp preview links', completed: false },
    ]
  });

  // Leads CRM State
  const [leads, setLeads] = useState<BusinessItem[]>([]);
  const [leadsGroupBy, setLeadsGroupBy] = useState<'region' | 'category' | 'status' | 'flat'>('status');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<string>('all');
  const [leadsSearchQuery, setLeadsSearchQuery] = useState<string>('');

  // Modals State
  const [isOutreachModalOpen, setIsOutreachModalOpen] = useState<boolean>(false);
  const [isEmailSignatureModalOpen, setIsEmailSignatureModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [outreachChannel, setOutreachChannel] = useState<'whatsapp' | 'email'>('whatsapp');

  // Theme initialization from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('quarry_theme') as 'dark' | 'light' | null;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(savedTheme);
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('quarry_theme', next);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(next);
      } catch {}
      return next;
    });
  }, []);

  // Load leads from Quarry API on mount
  const fetchQuarryLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?limit=100');
      if (res.ok) {
        const data = await res.json();
        const loadedLeads: BusinessItem[] = (data.leads || []).map((l: any) => enrichBusinessDetails({
          id: l.id,
          business_name: l.business_name,
          category: l.category,
          rating: l.rating,
          reviews_count: l.reviews_count,
          phone: l.phone,
          email: l.email,
          website: l.website,
          has_no_website: l.has_no_website === 1,
          address: l.address,
          city: l.city,
          latitude: l.latitude || l.lat,
          longitude: l.longitude || l.lng,
          status: l.status
        }));
        if (loadedLeads.length > 0) {
          setLeads(loadedLeads);
          setTargetSpace(prev => ({ ...prev, savedLeadsCount: loadedLeads.length }));
        }
      }
    } catch {
      // Backend not running or proxy offline; retain default state
    }
  }, []);

  // Run scan action (connects to Quarry API or synthesizes realistic regional batch)
  const runScan = useCallback(async (targetRegion?: string, targetCat?: string, rad?: number) => {
    const reg = targetRegion || regionInput;
    const cat = targetCat || category;
    const radius = rad || radiusKm;
    setIsScanning(true);

    // Save to search history (max 10 items, deduplicated)
    setSearchHistory(prev => {
      const next = [reg, ...prev.filter(h => h.toLowerCase() !== reg.toLowerCase())].slice(0, 10);
      try { localStorage.setItem('quarry_scan_history', JSON.stringify(next)); } catch {}
      return next;
    });

    try {
      // Attempt call to Quarry search endpoint
      const res = await fetch('/api/leads?limit=30');
      let businesses: BusinessItem[] = [];

      if (res.ok) {
        const data = await res.json();
        if (data.leads && data.leads.length > 0) {
          businesses = data.leads.map((l: any) => enrichBusinessDetails({
            id: l.id,
            business_name: l.business_name,
            category: l.category || cat,
            rating: l.rating,
            reviews_count: l.reviews_count,
            phone: l.phone,
            email: l.email,
            website: l.website,
            has_no_website: l.has_no_website === 1,
            address: l.address,
            city: l.city || reg.split(',')[0],
            latitude: l.latitude || l.lat,
            longitude: l.longitude || l.lng,
            status: l.status
          }));
        }
      }

      // If backend returns empty or offline, generate reproducible regional scan batch
      if (businesses.length === 0) {
        const prefixes = ['Lone Star', 'Austin Premier', 'Capitol City', 'Hill Country', 'Apex', 'Vanguard', 'Precision', 'Barton Creek'];
        const types = [cat, `${cat} Specialists`, `${cat} & Construction`, `${cat} Pros`];
        businesses = Array.from({ length: 14 }).map((_, i) => {
          const bName = `${prefixes[i % prefixes.length]} ${types[i % types.length]}`;
          const isNoWeb = i % 3 === 0 || i % 4 === 0;
          return enrichBusinessDetails({
            id: `scan-${i + 1}`,
            business_name: bName,
            category: cat,
            rating: Number((3.8 + (i * 0.1) % 1.2).toFixed(1)),
            reviews_count: 6 + (i * 7) % 65,
            phone: `+1 (512) 555-01${10 + i}`,
            email: isNoWeb ? undefined : `service@${bName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            website: isNoWeb ? null : `https://www.${bName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            has_no_website: isNoWeb,
            city: reg.split(',')[0].trim(),
            address: `${100 + i * 15} S Congress Ave, ${reg}`,
            latitude: 30.2672 + (Math.sin(i * 1.5) * 0.05),
            longitude: -97.7431 + (Math.cos(i * 1.5) * 0.05)
          });
        });
      }

      const total = businesses.length;
      const result: SearchResult = {
        regionLabel: reg,
        center: [30.2672, -97.7431],
        radiusKm: radius,
        businesses,
        total,
        reviewedCount: 0,
        leftCount: total
      };

      setSearchResult(result);
      if (businesses.length > 0) {
        setSelectedId(businesses[0].id);
      }
      setTargetSpace(prev => ({ ...prev, regionLabel: reg }));
    } catch {
      // Handled
    } finally {
      setIsScanning(false);
    }
  }, [regionInput, category, radiusKm]);

  // Startup behavior: loads most recent search from localStorage & auto-scans
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('quarry_scan_history');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSearchHistory(parsed);
          setRegionInput(parsed[0]);
          runScan(parsed[0]);
          fetchQuarryLeads();
          return;
        }
      }
    } catch {}
    runScan('Austin, TX');
    fetchQuarryLeads();
  }, [runScan, fetchQuarryLeads]);

  // Select business action (auto-marks as Reviewed per Anti-Duplicate UX)
  const selectBusiness = useCallback((id: string | number) => {
    setSelectedId(id);
    setReviewedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSearchResult(prev => {
      if (!prev) return null;
      const reviewed = prev.businesses.filter(b => b.id === id || reviewedIds.has(b.id)).length;
      return {
        ...prev,
        reviewedCount: reviewed,
        leftCount: Math.max(0, prev.total - reviewed)
      };
    });
  }, [reviewedIds]);

  // Toggle reviewed checkbox (stops propagation)
  const toggleReviewed = useCallback((id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReviewedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand zone (+N / +S / +E / +W)
  const scanAdjacentSector = useCallback(async (dir: 'N' | 'S' | 'E' | 'W') => {
    if (!searchResult) return;
    setIsScanning(true);

    const offsets: Record<string, [number, number]> = {
      N: [0.06, 0],
      S: [-0.06, 0],
      E: [0, 0.06],
      W: [0, -0.06]
    };
    const [dLat, dLng] = offsets[dir] || [0, 0];
    const newCenter: [number, number] = [searchResult.center[0] + dLat, searchResult.center[1] + dLng];

    // Synthesize expansion sector and deduplicate by lowercase business name
    const existingNames = new Set(searchResult.businesses.map(b => b.business_name.toLowerCase().trim()));
    const suffixes = ['North Corridor', 'South Line', 'East Side', 'West Valley', 'Parkway Sector'];

    const newSectorBusinesses: BusinessItem[] = Array.from({ length: 6 })
      .map((_, i) => {
        const bName = `${category} Masters ${suffixes[i % suffixes.length]} ${dir}${i + 1}`;
        return enrichBusinessDetails({
          id: `expand-${dir}-${Date.now()}-${i}`,
          business_name: bName,
          category,
          rating: Number((4.0 + (i * 0.15) % 0.9).toFixed(1)),
          reviews_count: 5 + i * 8,
          has_no_website: i % 2 === 0,
          city: regionInput.split(',')[0],
          latitude: newCenter[0] + (Math.sin(i) * 0.02),
          longitude: newCenter[1] + (Math.cos(i) * 0.02)
        });
      })
      .filter(b => !existingNames.has(b.business_name.toLowerCase().trim()));

    setSearchResult(prev => {
      if (!prev) return null;
      const combined = [...prev.businesses, ...newSectorBusinesses];
      return {
        ...prev,
        center: newCenter,
        businesses: combined,
        total: combined.length,
        leftCount: combined.length - reviewedIds.size
      };
    });

    setIsScanning(false);
  }, [searchResult, category, regionInput, reviewedIds]);

  // Lookup profile by Phone (7+ digits), URL, or Name
  const lookupProfile = useCallback(async (input: string): Promise<BusinessItem | null> => {
    const query = input.trim();
    if (!query) return null;

    // 1. Check local scanned list first for instant phone / name match
    if (searchResult) {
      const cleanPhone = query.replace(/\D/g, '');
      const match = searchResult.businesses.find(b => {
        if (cleanPhone.length >= 7 && b.phone && b.phone.replace(/\D/g, '').includes(cleanPhone)) return true;
        if (b.business_name.toLowerCase().includes(query.toLowerCase())) return true;
        if (b.website && b.website.toLowerCase().includes(query.toLowerCase())) return true;
        return false;
      });
      if (match) {
        selectBusiness(match.id);
        return match;
      }
    }

    // 2. Fallback: synthesize target prospect and insert into scanned list
    const isUrl = /^https?:\/\//i.test(query);
    const isPhone = /^\+?[\d\s()-]{7,}$/.test(query);
    const brandName = isUrl
      ? query.replace(/^https?:\/\/(?:www\.)?/, '').split('/')[0].split('.')[0]
      : (isPhone ? `Target Contact ${query.slice(-4)}` : query);

    const directLead = enrichBusinessDetails({
      id: `lookup-${Date.now()}`,
      business_name: brandName.charAt(0).toUpperCase() + brandName.slice(1),
      category,
      phone: isPhone ? query : undefined,
      website: isUrl ? query : null,
      has_no_website: !isUrl,
      city: regionInput.split(',')[0]
    });

    setSearchResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        businesses: [directLead, ...prev.businesses],
        total: prev.total + 1,
        leftCount: prev.leftCount + 1
      };
    });

    selectBusiness(directLead.id);
    return directLead;
  }, [searchResult, category, regionInput, selectBusiness]);

  // Push to Leads action (persists lead)
  const pushToLeads = useCallback(async (business: BusinessItem) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: business.business_name,
          category: business.category,
          phone: business.phone,
          website: business.website,
          rating: business.rating,
          reviews_count: business.reviews_count,
          address: business.address,
          city: business.city,
          status: 'new'
        })
      });
    } catch {}

    setLeads(prev => {
      if (prev.some(l => l.id === business.id || l.business_name.toLowerCase() === business.business_name.toLowerCase())) {
        return prev;
      }
      const updated = [business, ...prev];
      setTargetSpace(ts => ({ ...ts, savedLeadsCount: updated.length }));
      return updated;
    });
  }, []);

  // Update strategy notes
  const updateStrategyNotes = useCallback((notes: string) => {
    setTargetSpace(prev => ({ ...prev, strategyNotes: notes }));
  }, []);

  // Toggle checklist item
  const toggleChecklistItem = useCallback((id: string) => {
    setTargetSpace(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    }));
  }, []);

  // Add checklist item
  const addChecklistItem = useCallback((text: string) => {
    if (!text.trim()) return;
    setTargetSpace(prev => ({
      ...prev,
      checklist: [...prev.checklist, { id: Date.now().toString(), text, completed: false }]
    }));
  }, []);

  // Log outreach event
  const logOutreachEvent = useCallback((leadId: string | number, event: { channel: 'whatsapp' | 'email' | 'phone'; notes: string; adminEmail?: string }) => {
    const newEntry = {
      id: `outreach-${Date.now()}`,
      channel: event.channel,
      date: new Date().toISOString().split('T')[0],
      notes: event.notes,
      admin_email_used: event.adminEmail
    };

    setSearchResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        businesses: prev.businesses.map(b => b.id === leadId ? {
          ...b,
          status: 'messaged',
          outreach_history: [newEntry, ...(b.outreach_history || [])]
        } : b)
      };
    });

    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      status: 'messaged',
      outreach_history: [newEntry, ...(l.outreach_history || [])]
    } : l));
  }, []);

  const deleteSearchHistoryItem = useCallback((item: string) => {
    setSearchHistory(prev => {
      const next = prev.filter(h => h !== item);
      try { localStorage.setItem('quarry_scan_history', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try { localStorage.removeItem('quarry_scan_history'); } catch {}
  }, []);

  const selectedBusiness = searchResult?.businesses.find(b => b.id === selectedId) || null;

  return (
    <QuarryContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        regionInput,
        setRegionInput,
        category,
        setCategory,
        radiusKm,
        setRadiusKm,
        searchHistory,
        deleteSearchHistoryItem,
        clearSearchHistory,
        searchResult,
        selectedId,
        selectedBusiness,
        reviewedIds,
        targetSpace,
        filterChip,
        setFilterChip,
        filterQuery,
        setFilterQuery,
        isScanning,
        runScan,
        selectBusiness,
        toggleReviewed,
        scanAdjacentSector,
        lookupProfile,
        pushToLeads,
        updateStrategyNotes,
        toggleChecklistItem,
        addChecklistItem,
        logOutreachEvent,
        leads,
        leadsGroupBy,
        setLeadsGroupBy,
        leadsStatusFilter,
        setLeadsStatusFilter,
        leadsSearchQuery,
        setLeadsSearchQuery,
        isOutreachModalOpen,
        setIsOutreachModalOpen,
        isEmailSignatureModalOpen,
        setIsEmailSignatureModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        outreachChannel,
        setOutreachChannel,
        theme,
        toggleTheme
      }}
    >
      {children}
    </QuarryContext.Provider>
  );
}

export function useQuarry() {
  const context = useContext(QuarryContext);
  if (!context) {
    throw new Error('useQuarry must be used within an QuarryProvider');
  }
  return context;
}
