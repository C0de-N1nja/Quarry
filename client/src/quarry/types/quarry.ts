export interface BusinessItem {
  id: string | number;
  business_name: string;
  category: string;
  rating: number;
  reviews_count: number;
  phone?: string;
  email?: string;
  website?: string | null;
  has_no_website?: number | boolean | null;
  website_status?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  opportunity_score?: number;
  is_reviewed?: boolean;
  status?: string;
  source?: string;
  maturity?: 'New Listing' | 'Established' | 'Veteran';
  hours?: string;
  facebook_url?: string;
  instagram_url?: string;
  executive_summary?: string;
  pitch_angle?: string;
  targets?: string[];
  products?: string[];
  problems?: string[];
  gaps?: {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  }[];
  competitors?: {
    name: string;
    rating: number;
    reviews_count: number;
    has_website: boolean;
  }[];
  outreach_history?: {
    id: string;
    channel: 'whatsapp' | 'email' | 'phone';
    date: string;
    notes: string;
    admin_email_used?: string;
  }[];
}

export interface TargetSpace {
  regionLabel: string;
  savedLeadsCount: number;
  strategyNotes: string;
  checklist: {
    id: string;
    text: string;
    completed: boolean;
  }[];
}

export interface SearchResult {
  regionLabel: string;
  center: [number, number];
  radiusKm: number;
  businesses: BusinessItem[];
  total: number;
  reviewedCount: number;
  leftCount: number;
}
