import {
  LookupResult,
  ScamReportInput,
  ScamReportResponse,
  MapResponse,
  AlertsResponse,
  PlatformStats,
  IdentifierType,
} from '../types';
import {
  generateDefaultMockResult,
  MOCK_HOTSPOTS,
  MOCK_ALERTS,
  MOCK_STATS,
} from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT = 3500;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Health check probe
 */
export async function checkBackendHealth(): Promise<{ status: string; is_live: boolean }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`, { method: 'GET' }, 1500);
    if (res.ok) {
      const data = await res.json();
      return { status: data.status || 'ok', is_live: true };
    }
    // Try /api/health
    const resApi = await fetchWithTimeout(`${API_BASE_URL}/api/health`, { method: 'GET' }, 1500);
    if (resApi.ok) {
      const data = await resApi.json();
      return { status: data.status || 'ok', is_live: true };
    }
    return { status: 'unreachable', is_live: false };
  } catch {
    return { status: 'offline', is_live: false };
  }
}

/**
 * Standard Universal Lookup for phone, upi, or url
 * Connects to Avaish's POST /api/lookup endpoint
 */
export async function lookupIdentifier(query: string, type: IdentifierType): Promise<LookupResult> {
  const cleanQuery = query.trim();

  // Primary: Avaish's universal POST /api/lookup
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        target_value: cleanQuery,
        target_type: data.target_type || type,
        is_mock: false,
      };
    }
  } catch {
    // try fallback route below
  }

  // Fallback GET /lookup?query=...
  try {
    const fallbackUrl = `${API_BASE_URL}/lookup?query=${encodeURIComponent(cleanQuery)}&type=${encodeURIComponent(type)}`;
    const res = await fetchWithTimeout(fallbackUrl, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        target_value: cleanQuery,
        target_type: type,
        is_mock: false,
      };
    }
  } catch {
    // Backend offline / unreachable
  }

  console.warn(`[ScamSentry API] Backend lookup unavailable for "${cleanQuery}". Using mock fallback.`);
  return generateDefaultMockResult(cleanQuery, type);
}

/**
 * Investigation Mode Lookup
 * Queries Avaish's POST /api/lookup with { query: url } and safely surfaces
 * explainable evidence items and connection graph data (or defaults if backend omits them).
 */
export async function investigateIdentifier(query: string, type: IdentifierType = 'url'): Promise<LookupResult> {
  const cleanQuery = query.trim();

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        query: cleanQuery,
        target_value: cleanQuery,
        target_type: data.target_type || type,
        verdict: data.verdict || 'NO_REPORTS',
        risk_score: typeof data.risk_score === 'number' ? data.risk_score : 0,
        risk_level: data.risk_level || 'LOW',
        report_count: typeof data.report_count === 'number' ? data.report_count : 0,
        top_category: data.top_category || 'other',
        last_checked: data.last_checked || 'Just now',
        confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
        evidence_source: data.evidence_source || (data.report_count > 0 ? 'ScamSentry Community & Analysis Engine' : undefined),
        evidence_items: Array.isArray(data.evidence_items) ? data.evidence_items : [],
        related_indicators: Array.isArray(data.related_indicators) ? data.related_indicators : [],
        is_mock: false,
      };
    }
  } catch {
    // Backend offline / timed out
  }

  console.warn(`[ScamSentry API] Backend offline for investigation on "${cleanQuery}". Using rich demo mock data.`);
  return generateDefaultMockResult(cleanQuery, type);
}

/**
 * Submit anonymous scam report
 * Strictly returns error if backend cannot be reached - never falsely claims success.
 */
export async function submitScamReport(report: ScamReportInput): Promise<ScamReportResponse> {
  // Try /api/reports first, then fallback to /reports
  const endpoints = [`${API_BASE_URL}/api/reports`, `${API_BASE_URL}/reports`];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          status: 'success',
          message: data.message || 'Report submitted successfully',
          report_id: data.report_id || `rep_${Date.now()}`,
        };
      }

      if (res.status === 400 || res.status === 422) {
        const errData = await res.json().catch(() => ({}));
        return {
          status: 'error',
          message: errData.detail || errData.message || 'Validation failed. Please check your report details.',
        };
      }
    } catch {
      // try next endpoint or report network failure below
    }
  }

  // Backend is unreachable - report accurate failure to user
  console.error(`[ScamSentry API] Failed to submit report: Backend server at ${API_BASE_URL} is unreachable.`);
  return {
    status: 'error',
    message: `Unable to connect to ScamSentry backend at ${API_BASE_URL}. Your report was not submitted. Please check that the backend service is running and try again.`,
  };
}

/**
 * Get map hotspots
 */
export async function getMapHotspots(days = 7, city?: string, category?: string): Promise<MapResponse> {
  const params = new URLSearchParams({ days: days.toString() });
  if (city) params.append('city', city);
  if (category) params.append('category', category);

  const endpoints = [
    `${API_BASE_URL}/api/map?${params.toString()}`,
    `${API_BASE_URL}/map?${params.toString()}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return {
          timeframe_days: data.timeframe_days || days,
          total_incidents: data.total_incidents || (data.hotspots ? data.hotspots.reduce((acc: number, h: any) => acc + (h.report_count || 0), 0) : 0),
          hotspots: data.hotspots || [],
          is_mock: false,
        };
      }
    } catch {
      // continue to next endpoint or fallback
    }
  }

  return {
    timeframe_days: days,
    total_incidents: MOCK_HOTSPOTS.reduce((acc, h) => acc + h.report_count, 0),
    hotspots: MOCK_HOTSPOTS,
    is_mock: true,
  };
}

/**
 * Get unusual activity alerts
 */
export async function getAlerts(city?: string, limit = 10): Promise<AlertsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (city) params.append('city', city);

  const endpoints = [
    `${API_BASE_URL}/api/alerts?${params.toString()}`,
    `${API_BASE_URL}/alerts?${params.toString()}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return {
          alerts: data.alerts || [],
          is_mock: false,
        };
      }
    } catch {
      // continue to fallback
    }
  }

  return {
    alerts: MOCK_ALERTS,
    is_mock: true,
  };
}

/**
 * Get platform summary statistics
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const endpoints = [
    `${API_BASE_URL}/api/stats`,
    `${API_BASE_URL}/stats`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, { method: 'GET' }, 1000);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // continue
    }
  }

  return MOCK_STATS;
}
