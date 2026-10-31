export type IdentifierType = 'phone' | 'upi' | 'url';

export type ScamCategory =
  | 'digital_arrest'
  | 'fake_kyc'
  | 'upi_refund'
  | 'loan_app'
  | 'fake_job'
  | 'electricity_bill'
  | 'impersonation'
  | 'lottery'
  | 'other';

export type Verdict = 'KNOWN_SCAM' | 'SUSPICIOUS' | 'NO_REPORTS' | 'VERIFIED_BUSINESS';

export type RiskLevel = 'safe' | 'suspicious' | 'high' | 'verified';

export interface RecentReportSummary {
  category: ScamCategory | string;
  description: string;
  city: string;
  reported_at: string;
}

export interface EvidenceItem {
  id: string;
  type: 'indicator' | 'domain_pattern' | 'brand_impersonation' | 'related_phone' | 'related_upi' | 'related_url' | 'other';
  title: string;
  description: string;
  source: string;
  confidence?: number; // 0 - 100 percentage
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  explanation: string;
}

export interface RelatedIndicator {
  id: string;
  type: 'phone' | 'upi' | 'url' | 'category' | 'impersonated_brand' | 'brand' | 'domain';
  label: string;
  value: string;
  relationship: string;
  risk_level?: 'high' | 'suspicious' | 'safe' | 'unknown';
}

export interface LookupResult {
  query: string;
  target_value?: string;
  target_type: IdentifierType;
  verdict: Verdict;
  risk_level: 'safe' | 'suspicious' | 'high' | 'verified';
  risk_score: number;
  report_count: number;
  distinct_areas?: number;
  first_reported?: string;
  last_reported?: string;
  top_category?: string;
  category_breakdown?: {
    name: string;
    count: number;
  }[];
  recent_reports?: RecentReportSummary[];
  // For links
  domain_registered_days_ago?: number;
  redirects_count?: number;
  // For verified business
  verified_source?: string;
  business_name?: string;
  business_category?: string;
  verified_date?: string;
  is_mock?: boolean;
  // Optional Investigation Mode fields
  last_checked?: string;
  evidence_items?: EvidenceItem[];
  related_indicators?: RelatedIndicator[];
  confidence?: number;
  evidence_source?: string;
}

export interface ScamReportInput {
  target_type: IdentifierType;
  target_value: string;
  scam_category: ScamCategory;
  description: string;
  city: string;
  state: string;
  pincode?: string;
  channel?: 'phone_call' | 'whatsapp' | 'sms' | 'email' | 'other';
  occurred_on?: 'today' | 'yesterday' | 'earlier';
  lost_money?: boolean;
  lost_amount?: string;
  latitude?: number;
  longitude?: number;
}

export interface ScamReportResponse {
  status: 'success' | 'error';
  message: string;
  report_id?: string;
  detail?: string;
}

export interface MapHotspot {
  area: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  report_count: number;
  last_24h_count: number;
  dominant_category: string;
  severity: 'high' | 'medium' | 'low';
  daily_counts?: { day: string; count: number }[];
  categories_breakdown?: { category: string; count: number }[];
}

export interface MapResponse {
  timeframe_days: number;
  total_incidents: number;
  hotspots: MapHotspot[];
  is_mock?: boolean;
}

export type AlertType = 'SPIKE' | 'NEW_SCAM_TYPE';
export type AlertSeverity = 'critical' | 'high' | 'medium';

export interface AlertItem {
  id: string;
  alert_type: AlertType;
  title: string;
  region: string;
  pincode?: string;
  severity: AlertSeverity;
  incident_count_last_24h: number;
  surge_percentage?: string;
  sample_indicators?: string[];
  advice: string;
  detected_at: string;
  top_category?: string;
  description?: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  is_mock?: boolean;
}

export interface PlatformStats {
  reports_last_7_days: number;
  newly_flagged_identifiers: number;
  top_reported_scam: string;
  most_active_area: string;
}
