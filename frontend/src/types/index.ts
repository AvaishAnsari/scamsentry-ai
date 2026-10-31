export type IdentifierType = 'phone' | 'upi' | 'url' | 'email';

export type ScamCategory =
  | 'digital_arrest'
  | 'fake_kyc'
  | 'upi_refund'
  | 'upi_fraud'
  | 'loan_app'
  | 'loan_scam'
  | 'fake_job'
  | 'electricity_bill'
  | 'phishing'
  | 'investment_fraud'
  | 'otp_fraud'
  | 'impersonation'
  | 'fake_customer_care'
  | 'lottery'
  | 'other';

export type Verdict = 'KNOWN_SCAM' | 'SUSPICIOUS' | 'UNDER_REVIEW' | 'NO_REPORTS' | 'VERIFIED_BUSINESS';

export type RiskLevel = 'safe' | 'low' | 'suspicious' | 'high' | 'verified';

export type VerificationStatus = 'NO_REPORTS' | 'UNDER_REVIEW' | 'SUSPICIOUS' | 'HIGH_RISK' | 'VERIFIED_BUSINESS';

export type ConfidenceLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskSignal {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | string;
  message: string;
  confidence?: 'high' | 'medium' | 'low' | string;
}

export interface RecentReportSummary {
  category: ScamCategory | string;
  description?: string;
  city?: string;
  reported_at?: string;
}

export interface LookupResult {
  query: string;
  target_type: IdentifierType | string;
  normalized_value?: string;
  verdict: Verdict;
  verification_status?: VerificationStatus | string;
  confidence_level?: ConfidenceLevel | string;
  risk_level: RiskLevel;
  risk_score: number;
  pattern_risk_score?: number;
  pattern_summary?: string;
  recommended_action?: string;
  risk_signals?: RiskSignal[];
  report_count: number;
  independent_report_count?: number;
  distinct_areas?: number;
  distinct_areas_count?: number;
  first_reported?: string;
  last_reported?: string;
  top_category?: string;
  message?: string;
  community_impact_message?: string;
  safety_guidance?: string[];
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
}

export interface ScamReportInput {
  target_type?: IdentifierType | string;
  target_value: string;
  scam_category: ScamCategory | string;
  description?: string;
  city?: string;
  state?: string;
  pincode?: string;
  area_name?: string;
  channel?: 'phone_call' | 'whatsapp' | 'sms' | 'email' | 'other';
  occurred_on?: 'today' | 'yesterday' | 'earlier';
  lost_money?: boolean;
  lost_amount?: string;
  latitude?: number;
  longitude?: number;
  evidence_url?: string;
  evidence_reference?: string;
}

export interface ScamReportResponse {
  status: 'success' | 'duplicate' | 'error';
  message: string;
  report_id?: string;
  normalized_target?: string;
  target_type?: string;
  verification_status?: string;
  confidence_level?: string;
  community_impact_message?: string;
  safety_guidance?: string[];
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
  last_24h_count?: number;
  dominant_category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none' | string;
  daily_counts?: { day: string; count: number }[];
  categories_breakdown?: { category: string; count: number }[];
}

export interface MapResponse {
  timeframe_days: number;
  total_incidents: number;
  hotspots: MapHotspot[];
  summary?: {
    total_reports: number;
    total_active_areas: number;
    highest_activity_area?: string;
    requested_days: number;
  };
  areas?: any[];
  is_mock?: boolean;
}

export type AlertType = 'SPIKE' | 'NEW_SCAM_TYPE' | 'IDENTIFIER_SURGE' | string;
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | string;

export interface AlertItem {
  id: string;
  alert_id?: number;
  alert_type: AlertType;
  anomaly_type?: string;
  title: string;
  region: string;
  affected_area?: string;
  pincode?: string;
  severity: AlertSeverity;
  incident_count_last_24h: number;
  surge_percentage?: string;
  sample_indicators?: string[];
  advice: string;
  detected_at: string;
  created_at?: string;
  top_category?: string;
  description?: string;
  explanation?: string;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  summary?: {
    total_alerts: number;
    critical_alerts: number;
    high_alerts: number;
  };
  is_mock?: boolean;
}

export interface PlatformStats {
  reports_last_7_days: number;
  newly_flagged_identifiers: number;
  top_reported_scam: string;
  most_active_area: string;
}
