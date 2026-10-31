import {
  LookupResult,
  ScamReportInput,
  ScamReportResponse,
  MapResponse,
  MapHotspot,
  AlertsResponse,
  AlertItem,
  PlatformStats,
  IdentifierType,
} from '../types';
import {
  generateDefaultMockResult,
  MOCK_HOTSPOTS,
  MOCK_ALERTS,
  MOCK_STATS,
} from './mockData';

// Centralized API configuration
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Robust fetch helper with timeout and standardized JSON response handling
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Health check probe: checks GET /api/health with fallback to GET /health
 */
export async function checkBackendHealth(): Promise<{ status: string; is_live: boolean; message?: string }> {
  try {
    let res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, { method: 'GET' }, 2000);
    if (!res.ok) {
      res = await fetchWithTimeout(`${API_BASE_URL}/health`, { method: 'GET' }, 2000);
    }
    if (res.ok) {
      const data = await res.json();
      return { status: data.status || 'ok', is_live: true, message: data.message };
    }
    return { status: 'unreachable', is_live: false };
  } catch {
    return { status: 'offline', is_live: false };
  }
}

/**
 * Lookup identifier (phone, upi, url) via POST /api/lookup
 */
export async function lookupIdentifier(query: string, type?: IdentifierType | string): Promise<LookupResult> {
  const cleanQuery = query.trim();
  const endpoint = `${API_BASE_URL}/api/lookup`;

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: cleanQuery,
        type: type || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        query: data.query || cleanQuery,
        target_type: data.target_type || type || 'phone',
        normalized_value: data.normalized_value,
        verdict: data.verdict || 'NO_REPORTS',
        verification_status: data.verification_status || data.verdict,
        confidence_level: data.confidence_level || 'NONE',
        risk_level: data.risk_level || 'safe',
        risk_score: typeof data.risk_score === 'number' ? data.risk_score : 0,
        pattern_risk_score: typeof data.pattern_risk_score === 'number' ? data.pattern_risk_score : 0,
        pattern_summary: data.pattern_summary,
        recommended_action: data.recommended_action,
        risk_signals: data.risk_signals || [],
        report_count: data.report_count || 0,
        independent_report_count: data.independent_report_count ?? data.report_count ?? 0,
        distinct_areas: data.distinct_areas_count ?? data.distinct_areas ?? 0,
        distinct_areas_count: data.distinct_areas_count ?? 0,
        first_reported: data.first_reported,
        last_reported: data.last_reported,
        top_category: data.top_category,
        message: data.message,
        community_impact_message: data.community_impact_message,
        safety_guidance: data.safety_guidance || [],
        recent_reports: data.recent_reports || [],
        category_breakdown: data.top_category
          ? [{ name: data.top_category.replace(/_/g, ' '), count: data.report_count || 1 }]
          : [],
        business_name: data.verdict === 'VERIFIED_BUSINESS' ? 'Official National Helpline / Directory' : undefined,
        business_category: data.verdict === 'VERIFIED_BUSINESS' ? 'Banking & Public Safety' : undefined,
        verified_date: 'October 2026',
        is_mock: false,
      };
    }

    // Try GET fallback if POST returned 404 or method not allowed
    if (res.status === 404 || res.status === 405) {
      const getUrl = `${API_BASE_URL}/api/lookup?query=${encodeURIComponent(cleanQuery)}${type ? `&type=${encodeURIComponent(type)}` : ''}`;
      const getRes = await fetchWithTimeout(getUrl, { method: 'GET' });
      if (getRes.ok) {
        const data = await getRes.json();
        return {
          ...data,
          distinct_areas: data.distinct_areas_count ?? data.distinct_areas ?? 0,
          is_mock: false,
        };
      }
    }

    console.warn(`[ScamSentry API] Backend lookup returned HTTP ${res.status}. Using mock fallback.`);
    return generateDefaultMockResult(cleanQuery, (type as IdentifierType) || 'phone');
  } catch (err) {
    console.warn('[ScamSentry API] Backend offline or unreachable. Using mock fallback.', err);
    return generateDefaultMockResult(cleanQuery, (type as IdentifierType) || 'phone');
  }
}

/**
 * Submit anonymous scam report via POST /api/reports
 * Supports Quick Community Warning (Level 1) & Evidence/Detailed Report (Level 2)
 */
export async function submitScamReport(report: ScamReportInput): Promise<ScamReportResponse> {
  const url = `${API_BASE_URL}/api/reports`;

  // Map frontend input fields to backend report model
  const payload = {
    target_value: report.target_value.trim(),
    target_type: report.target_type || undefined,
    scam_category: report.scam_category,
    description: report.description?.trim() || undefined,
    city: report.city?.trim() || undefined,
    state: report.state?.trim() || undefined,
    pincode: report.pincode?.trim() || undefined,
    area_name: report.area_name?.trim() || undefined,
    evidence_url: report.evidence_url?.trim() || undefined,
    evidence_reference: report.evidence_reference?.trim() || (report.lost_amount ? `Lost ₹${report.lost_amount}` : undefined),
    latitude: report.latitude,
    longitude: report.longitude,
  };

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 201 || res.status === 200) {
      return {
        status: data.status === 'duplicate' ? 'duplicate' : 'success',
        message: data.message || 'Report logged as a community safety signal.',
        report_id: data.report_id || `rep_${Date.now()}`,
        normalized_target: data.normalized_target || payload.target_value,
        target_type: data.target_type || 'phone',
        verification_status: data.verification_status || 'UNDER_REVIEW',
        confidence_level: data.confidence_level || 'LOW',
        community_impact_message: data.community_impact_message,
        safety_guidance: data.safety_guidance || [],
      };
    }

    if (res.status === 429) {
      return {
        status: 'error',
        message: data.detail || 'Rate limit reached: Maximum 5 reports per hour. Please try again later.',
      };
    }

    return {
      status: 'error',
      message: data.detail || 'Failed to submit report. Please verify input fields.',
    };
  } catch (err) {
    console.warn('[ScamSentry API] Backend offline. Storing in local demo storage.', err);

    // Save to local storage for demo persistence when standalone
    try {
      const existing = JSON.parse(localStorage.getItem('scamsentry_user_reports') || '[]');
      const repId = `rep_${Date.now().toString().slice(-6)}`;
      existing.unshift({
        ...report,
        report_id: repId,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('scamsentry_user_reports', JSON.stringify(existing));
      return {
        status: 'success',
        message: 'Report submitted successfully (Demo Mode: Backend offline)',
        report_id: repId,
        verification_status: 'UNDER_REVIEW',
        confidence_level: 'LOW',
        community_impact_message: 'Your report contributes anonymously to ScamSentry community intelligence.',
        safety_guidance: [
          'Do not send money or approve collect requests.',
          'Contact your bank or UPI provider immediately to freeze references.',
          'Call 1930 to report cyber financial fraud.',
        ],
      };
    } catch {
      return {
        status: 'success',
        message: 'Report logged (Demo Mode)',
        report_id: `rep_${Date.now().toString().slice(-6)}`,
      };
    }
  }
}

/**
 * Get map hotspots via GET /api/map?days=7
 */
export async function getMapHotspots(days = 7, city?: string, category?: string): Promise<MapResponse> {
  const params = new URLSearchParams({ days: days.toString() });
  if (city) params.append('city', city);
  if (category) params.append('category', category);

  const url = `${API_BASE_URL}/api/map?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      const rawHotspots: any[] = data.hotspots || data.areas || [];

      // Transform and ensure all fields needed by map components exist
      const hotspots: MapHotspot[] = rawHotspots.map((h: any) => {
        const count = h.report_count || 0;
        const last24h = h.last_24h_count ?? Math.min(count, Math.max(1, Math.round(count * 0.25)));

        // Generate synthetic past 7-day sparkline if not present in backend
        const dailyCounts = h.daily_counts || [
          { day: 'Mon', count: Math.max(0, Math.round(count * 0.1)) },
          { day: 'Tue', count: Math.max(0, Math.round(count * 0.12)) },
          { day: 'Wed', count: Math.max(0, Math.round(count * 0.15)) },
          { day: 'Thu', count: Math.max(0, Math.round(count * 0.18)) },
          { day: 'Fri', count: Math.max(0, Math.round(count * 0.2)) },
          { day: 'Sat', count: Math.max(0, Math.round(count * 0.25)) },
          { day: 'Sun', count: last24h },
        ];

        const catBreakdown = h.categories_breakdown || [
          { category: (h.dominant_category || 'other').replace(/_/g, ' '), count: Math.round(count * 0.7) },
          { category: 'Other suspicion', count: Math.max(0, count - Math.round(count * 0.7)) },
        ];

        return {
          area: h.area || h.name || 'Unknown Area',
          city: h.city || 'Bengaluru',
          state: h.state || 'Karnataka',
          pincode: h.pincode || '560001',
          latitude: typeof h.latitude === 'number' ? h.latitude : 12.9716,
          longitude: typeof h.longitude === 'number' ? h.longitude : 77.5946,
          report_count: count,
          last_24h_count: last24h,
          dominant_category: (h.dominant_category || 'other').replace(/_/g, ' '),
          severity: (h.severity || h.risk_level || 'medium').toLowerCase(),
          daily_counts: dailyCounts,
          categories_breakdown: catBreakdown,
        };
      });

      return {
        timeframe_days: data.timeframe_days || days,
        total_incidents: data.total_incidents ?? (data.summary?.total_reports ?? hotspots.reduce((acc, h) => acc + h.report_count, 0)),
        hotspots,
        summary: data.summary,
        areas: data.areas,
        is_mock: false,
      };
    }

    console.warn(`[ScamSentry API] Map API returned HTTP ${res.status}. Falling back to demo dataset.`);
    return {
      timeframe_days: days,
      total_incidents: MOCK_HOTSPOTS.reduce((acc, h) => acc + h.report_count, 0),
      hotspots: MOCK_HOTSPOTS,
      is_mock: true,
    };
  } catch (err) {
    console.warn('[ScamSentry API] Backend offline for map. Falling back to demo dataset.', err);
    return {
      timeframe_days: days,
      total_incidents: MOCK_HOTSPOTS.reduce((acc, h) => acc + h.report_count, 0),
      hotspots: MOCK_HOTSPOTS,
      is_mock: true,
    };
  }
}

/**
 * Get unusual activity alerts via GET /api/alerts
 */
export async function getAlerts(city?: string, limit = 20): Promise<AlertsResponse> {
  const params = new URLSearchParams({ limit: limit.toString(), days: '7' });
  if (city) params.append('city', city);

  const url = `${API_BASE_URL}/api/alerts?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      const rawAlerts: any[] = data.alerts || [];

      // Normalize backend alert fields to match frontend AlertItem
      const alerts: AlertItem[] = rawAlerts.map((a: any, idx: number) => ({
        id: a.id || `alt_${a.alert_id || idx + 1}`,
        alert_id: a.alert_id,
        alert_type: a.anomaly_type || a.alert_type || 'SPIKE',
        anomaly_type: a.anomaly_type,
        title: a.title || 'Unusual Scam Activity Detected',
        region: a.region || a.affected_area || 'Regional Alert',
        affected_area: a.affected_area,
        pincode: a.pincode || (a.region?.match(/\b\d{6}\b/) ? a.region.match(/\b\d{6}\b/)![0] : undefined),
        severity: (a.severity || 'high').toLowerCase(),
        incident_count_last_24h: a.incident_count_last_24h || 0,
        surge_percentage: a.surge_percentage || '+150%',
        sample_indicators: a.sample_indicators || [],
        advice: a.advice || 'Verify caller identities independently and never share financial credentials.',
        description: a.explanation || a.description || 'Elevated scam reports detected exceeding baseline statistical thresholds.',
        explanation: a.explanation,
        detected_at: a.detected_at || a.created_at || new Date().toISOString(),
        created_at: a.created_at,
        top_category: a.top_category,
      }));

      return {
        alerts,
        summary: data.summary,
        is_mock: false,
      };
    }

    console.warn(`[ScamSentry API] Alerts API returned HTTP ${res.status}. Falling back to demo alerts.`);
    return {
      alerts: MOCK_ALERTS,
      is_mock: true,
    };
  } catch (err) {
    console.warn('[ScamSentry API] Backend offline for alerts. Falling back to demo alerts.', err);
    return {
      alerts: MOCK_ALERTS,
      is_mock: true,
    };
  }
}

/**
 * Get platform summary statistics (synthesized from live backend or mock)
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const mapData = await getMapHotspots(7);
    if (!mapData.is_mock && mapData.hotspots.length > 0) {
      const topCat = mapData.hotspots[0]?.dominant_category || 'Digital Arrest';
      const topArea = mapData.summary?.highest_activity_area || mapData.hotspots[0]?.area || 'Bengaluru';
      return {
        reports_last_7_days: mapData.total_incidents,
        newly_flagged_identifiers: mapData.hotspots.length * 3,
        top_reported_scam: topCat,
        most_active_area: topArea,
      };
    }
    return MOCK_STATS;
  } catch {
    return MOCK_STATS;
  }
}

/**
 * Investigation Mode Lookup
 * Queries POST /api/lookup and safely surfaces explainable evidence items
 * and connection graph data (or safe defaults if backend omits them).
 */
export async function investigateIdentifier(query: string, type: IdentifierType = 'url'): Promise<LookupResult> {
  const cleanQuery = query.trim();

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery, type: type || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        query: data.query || cleanQuery,
        target_type: data.target_type || type,
        normalized_value: data.normalized_value,
        verdict: data.verdict || 'NO_REPORTS',
        verification_status: data.verification_status || data.verdict,
        confidence_level: data.confidence_level || 'NONE',
        risk_level: data.risk_level || 'safe',
        risk_score: typeof data.risk_score === 'number' ? data.risk_score : 0,
        pattern_risk_score: data.pattern_risk_score,
        pattern_summary: data.pattern_summary,
        recommended_action: data.recommended_action,
        risk_signals: data.risk_signals || [],
        report_count: typeof data.report_count === 'number' ? data.report_count : 0,
        top_category: data.top_category,
        message: data.message,
        community_impact_message: data.community_impact_message,
        safety_guidance: data.safety_guidance || [],
        recent_reports: data.recent_reports || [],
        last_checked: data.last_checked || 'Just now',
        confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
        evidence_source: data.evidence_source || (data.report_count > 0 ? 'ScamSentry Community & Analysis Engine' : undefined),
        evidence_items: Array.isArray(data.evidence_items)
          ? data.evidence_items.map((ev: any, idx: number) => {
              if (typeof ev === 'string') {
                let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'info';
                const lower = ev.toLowerCase();
                if (lower.includes('high') || lower.includes('impersonat') || lower.includes('spike') || lower.includes('phishing')) {
                  severity = 'high';
                } else if (lower.includes('medium') || lower.includes('keyword') || lower.includes('hyphen')) {
                  severity = 'medium';
                }
                return {
                  id: `ev-${idx}`,
                  type: 'indicator' as const,
                  title: 'Evidence Signal',
                  description: ev,
                  source: lower.includes('pattern') || lower.includes('heuristic') || lower.includes('brand') || lower.includes('keyword') || lower.includes('hyphen')
                    ? 'Pattern Heuristics'
                    : 'Community Reports',
                  confidence: 0.9,
                  severity,
                  explanation: ev,
                };
              }
              return ev;
            })
          : [],
        related_indicators: Array.isArray(data.related_indicators)
          ? data.related_indicators.map((ri: any, idx: number) => {
              if (typeof ri === 'string') {
                return {
                  id: `ri-${idx}`,
                  type: (ri.includes('@') ? 'upi' : /^\+?\d+$/.test(ri) ? 'phone' : 'url') as any,
                  label: 'Linked Entity',
                  value: ri,
                  relationship: 'Associated with incident report',
                  risk_level: 'suspicious' as const,
                };
              }
              return ri;
            })
          : [],
        is_mock: false,
      };
    }
  } catch {
    // Backend offline / timed out
  }

  console.warn(`[ScamSentry API] Backend offline for investigation on "${cleanQuery}". Using rich demo mock data.`);
  return generateDefaultMockResult(cleanQuery, type);
}
