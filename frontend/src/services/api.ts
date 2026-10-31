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
const DEFAULT_TIMEOUT = 3000;

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
    return { status: 'unreachable', is_live: false };
  } catch {
    return { status: 'offline', is_live: false };
  }
}

/**
 * Lookup identifier (phone, upi, url)
 */
export async function lookupIdentifier(query: string, type: IdentifierType): Promise<LookupResult> {
  const cleanQuery = query.trim();
  const url = `${API_BASE_URL}/lookup?query=${encodeURIComponent(cleanQuery)}&type=${encodeURIComponent(type)}`;

  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        is_mock: false,
      };
    }
    // If backend returned 404 or non-ok, fall back to mock logic
    console.warn(`[ScamSentry API] Backend lookup returned ${res.status}. Using mock fallback.`);
    return generateDefaultMockResult(cleanQuery, type);
  } catch {
    // Backend offline / timed out
    return generateDefaultMockResult(cleanQuery, type);
  }
}

/**
 * Submit anonymous scam report
 */
export async function submitScamReport(report: ScamReportInput): Promise<ScamReportResponse> {
  const url = `${API_BASE_URL}/reports`;

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

    const errData = await res.json().catch(() => ({}));
    return {
      status: 'error',
      message: errData.detail || 'Failed to submit report. Please try again.',
    };
  } catch {
    // Mock successful submission for standalone frontend operation / demo
    console.warn('[ScamSentry API] Backend offline. Recording report in local session mock storage.');
    
    // Save to local storage for demo persistence
    try {
      const existing = JSON.parse(localStorage.getItem('scamsentry_user_reports') || '[]');
      existing.unshift({
        ...report,
        report_id: `rep_${Date.now().toString().slice(-6)}`,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('scamsentry_user_reports', JSON.stringify(existing));
    } catch {
      // LocalStorage fallback
    }

    return {
      status: 'success',
      message: 'Report submitted successfully (Demo Mode)',
      report_id: `rep_${Date.now().toString().slice(-6)}`,
    };
  }
}

/**
 * Get map hotspots
 */
export async function getMapHotspots(days = 7, city?: string, category?: string): Promise<MapResponse> {
  const params = new URLSearchParams({ days: days.toString() });
  if (city) params.append('city', city);
  if (category) params.append('category', category);

  const url = `${API_BASE_URL}/map?${params.toString()}`;

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
    return {
      timeframe_days: days,
      total_incidents: MOCK_HOTSPOTS.reduce((acc, h) => acc + h.report_count, 0),
      hotspots: MOCK_HOTSPOTS,
      is_mock: true,
    };
  } catch {
    return {
      timeframe_days: days,
      total_incidents: MOCK_HOTSPOTS.reduce((acc, h) => acc + h.report_count, 0),
      hotspots: MOCK_HOTSPOTS,
      is_mock: true,
    };
  }
}

/**
 * Get unusual activity alerts
 */
export async function getAlerts(city?: string, limit = 10): Promise<AlertsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (city) params.append('city', city);

  const url = `${API_BASE_URL}/alerts?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return {
        alerts: data.alerts || [],
        is_mock: false,
      };
    }
    return {
      alerts: MOCK_ALERTS,
      is_mock: true,
    };
  } catch {
    return {
      alerts: MOCK_ALERTS,
      is_mock: true,
    };
  }
}

/**
 * Get platform summary statistics
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/stats`, { method: 'GET' }, 1000);
    if (res.ok) {
      return await res.json();
    }
    return MOCK_STATS;
  } catch {
    return MOCK_STATS;
  }
}
