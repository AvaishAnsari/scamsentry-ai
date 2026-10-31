/**
 * ScamSentry AI Chrome Extension - Popup Controller
 *
 * Avaish's Universal Lookup API Integration:
 * - Method: POST
 * - Base URL: http://localhost:8000 (configurable)
 * - Endpoint: /api/lookup
 * - Request payload: { "query": "<currently_visited_url>" }
 * - Response fields: verdict, risk_score, risk_level, report_count, top_category
 *
 * Privacy-First: Inspects only the active tab upon popup click.
 * Minimal permissions: activeTab and storage. Zero history tracking.
 */

const DEFAULT_CONFIG = {
  backendUrl: 'http://localhost:8000',
  lookupEndpoint: '/api/lookup',
  webAppUrl: 'http://localhost:3000',
  forceMock: false,
};

let currentConfig = { ...DEFAULT_CONFIG };
let currentInspectedUrl = '';
let currentInspectedDomain = '';

// DOM Elements
const elements = {
  // Status & Settings
  statusPill: document.getElementById('backend-status-pill'),
  statusText: document.getElementById('backend-status-text'),
  toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
  settingsPanel: document.getElementById('settings-panel'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  backendUrlInput: document.getElementById('backend-url-input'),
  webappUrlInput: document.getElementById('webapp-url-input'),
  forceMockCheckbox: document.getElementById('force-mock-checkbox'),
  testConnBtn: document.getElementById('test-connection-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  testConnMsg: document.getElementById('test-connection-msg'),

  // Target URL
  recheckBtn: document.getElementById('recheck-btn'),
  securityIcon: document.getElementById('url-security-icon'),
  currentDomain: document.getElementById('current-domain'),
  currentFullUrl: document.getElementById('current-full-url'),

  // Dynamic States
  loadingState: document.getElementById('state-loading'),
  knownScamState: document.getElementById('state-known-scam'),
  suspiciousState: document.getElementById('state-suspicious'),
  noReportsState: document.getElementById('state-no-reports'),
  verifiedState: document.getElementById('state-verified'),
  errorState: document.getElementById('state-error'),
  errorDescText: document.getElementById('error-desc-text'),
  retryBtn: document.getElementById('retry-btn'),
  switchMockBtn: document.getElementById('switch-mock-btn'),
  internalState: document.getElementById('state-internal'),
  sourceIndicator: document.getElementById('source-indicator'),
  sourceText: document.getElementById('source-text'),

  // Known Scam Fields
  scamScore: document.getElementById('scam-score'),
  scamReportsCount: document.getElementById('scam-reports-count'),
  scamCategory: document.getElementById('scam-category'),
  scamRiskLevel: document.getElementById('scam-risk-level'),

  // Suspicious Fields
  suspiciousScore: document.getElementById('suspicious-score'),
  suspiciousReportsCount: document.getElementById('suspicious-reports-count'),
  suspiciousCategory: document.getElementById('suspicious-category'),
  suspiciousRiskLevel: document.getElementById('suspicious-risk-level'),

  // Verified Fields
  verifiedBusinessTitle: document.getElementById('verified-business-title'),
  verifiedBusinessDesc: document.getElementById('verified-business-desc'),

  // Actions
  openWebappBtn: document.getElementById('open-webapp-btn'),
  reportScamBtn: document.getElementById('report-scam-btn'),
  investigateWhyBtn: document.getElementById('investigate-why-btn'),
};

/**
 * Extension Startup
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfiguration();
  setupEventListeners();
  inspectActiveTab();
});

/**
 * Load configuration from Chrome storage
 */
async function loadConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl', 'lookupEndpoint', 'webAppUrl', 'forceMock'], (res) => {
      currentConfig.backendUrl = res.backendUrl || DEFAULT_CONFIG.backendUrl;
      currentConfig.lookupEndpoint = res.lookupEndpoint || DEFAULT_CONFIG.lookupEndpoint;
      currentConfig.webAppUrl = res.webAppUrl || DEFAULT_CONFIG.webAppUrl;
      currentConfig.forceMock = res.forceMock !== undefined ? res.forceMock : DEFAULT_CONFIG.forceMock;

      // Update settings UI
      elements.backendUrlInput.value = currentConfig.backendUrl;
      elements.webappUrlInput.value = currentConfig.webAppUrl;
      elements.forceMockCheckbox.checked = currentConfig.forceMock;

      resolve(currentConfig);
    });
  });
}

/**
 * Wire event handlers
 */
function setupEventListeners() {
  // Settings toggle
  elements.toggleSettingsBtn.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('hidden');
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    elements.settingsPanel.classList.add('hidden');
  });

  // Save Settings
  elements.saveSettingsBtn.addEventListener('click', () => {
    const backendUrl = elements.backendUrlInput.value.trim() || DEFAULT_CONFIG.backendUrl;
    const webAppUrl = elements.webappUrlInput.value.trim() || DEFAULT_CONFIG.webAppUrl;
    const forceMock = elements.forceMockCheckbox.checked;

    currentConfig = {
      ...currentConfig,
      backendUrl,
      webAppUrl,
      forceMock,
    };

    chrome.storage.local.set(currentConfig, () => {
      elements.settingsPanel.classList.add('hidden');
      checkUrlRisk(currentInspectedUrl || currentInspectedDomain);
    });
  });

  // Test Connection to Avaish's backend
  elements.testConnBtn.addEventListener('click', async () => {
    const baseUrl = elements.backendUrlInput.value.trim() || DEFAULT_CONFIG.backendUrl;
    elements.testConnBtn.disabled = true;
    elements.testConnBtn.innerText = 'Testing...';
    elements.testConnMsg.classList.remove('hidden', 'success', 'error');

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      
      // Attempt probe to /health or /api/lookup
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(async () => {
        // If /health isn't mapped, test POST /api/lookup directly with probe
        return fetch(`${baseUrl}${currentConfig.lookupEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'https://test-connection.org' }),
          signal: controller.signal,
        });
      });
      clearTimeout(id);

      if (res && (res.ok || res.status === 200 || res.status === 404)) {
        elements.testConnMsg.innerText = `✓ Backend reachable at ${baseUrl} (HTTP ${res.status})`;
        elements.testConnMsg.classList.add('success');
      } else {
        elements.testConnMsg.innerText = `✗ Server responded with HTTP ${res ? res.status : 'ERR'}`;
        elements.testConnMsg.classList.add('error');
      }
    } catch {
      elements.testConnMsg.innerText = `✗ Unreachable at ${baseUrl}. Ensure backend is running.`;
      elements.testConnMsg.classList.add('error');
    } finally {
      elements.testConnBtn.disabled = false;
      elements.testConnBtn.innerText = 'Test API Health';
    }
  });

  // Re-check action
  elements.recheckBtn.addEventListener('click', () => {
    if (currentInspectedUrl) {
      checkUrlRisk(currentInspectedUrl);
    } else {
      inspectActiveTab();
    }
  });

  // Retry from error card
  elements.retryBtn.addEventListener('click', () => {
    if (currentInspectedUrl) {
      checkUrlRisk(currentInspectedUrl);
    }
  });

  // Switch to Mock mode from error card
  elements.switchMockBtn.addEventListener('click', () => {
    currentConfig.forceMock = true;
    elements.forceMockCheckbox.checked = true;
    chrome.storage.local.set({ forceMock: true }, () => {
      checkUrlRisk(currentInspectedUrl);
    });
  });

  // Investigate Why (Deep Investigation Mode)
  if (elements.investigateWhyBtn) {
    elements.investigateWhyBtn.addEventListener('click', () => {
      const target = currentInspectedUrl || currentInspectedDomain || '';
      const dest = `${currentConfig.webAppUrl}/investigate?url=${encodeURIComponent(target)}`;
      chrome.tabs.create({ url: dest });
    });
  }

  // Open Webapp
  elements.openWebappBtn.addEventListener('click', () => {
    const target = currentInspectedUrl || currentInspectedDomain || '';
    const dest = `${currentConfig.webAppUrl}/check?type=url&q=${encodeURIComponent(target)}`;
    chrome.tabs.create({ url: dest });
  });

  // Report Scam
  elements.reportScamBtn.addEventListener('click', () => {
    const target = currentInspectedUrl || currentInspectedDomain || '';
    const dest = `${currentConfig.webAppUrl}/report?type=url&val=${encodeURIComponent(target)}`;
    chrome.tabs.create({ url: dest });
  });

  // Quick preset test links
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetUrl = btn.getAttribute('data-url');
      if (presetUrl) {
        currentInspectedUrl = presetUrl;
        try {
          const u = new URL(presetUrl);
          currentInspectedDomain = u.hostname;
        } catch {
          currentInspectedDomain = presetUrl;
        }
        updateUrlDisplay(currentInspectedUrl, currentInspectedDomain);
        checkUrlRisk(presetUrl);
      }
    });
  });
}

/**
 * Inspect the active tab URL using minimal activeTab permission
 */
function inspectActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0].url) {
      showInternalState();
      return;
    }

    const rawUrl = tabs[0].url;
    currentInspectedUrl = rawUrl;

    // Filter out browser internal / privileged pages
    if (
      rawUrl.startsWith('chrome://') ||
      rawUrl.startsWith('chrome-extension://') ||
      rawUrl.startsWith('about:') ||
      rawUrl.startsWith('edge://') ||
      rawUrl.startsWith('file://')
    ) {
      updateUrlDisplay(rawUrl, 'Internal Browser Resource');
      showInternalState();
      return;
    }

    try {
      const urlObj = new URL(rawUrl);
      currentInspectedDomain = urlObj.hostname;
      updateUrlDisplay(rawUrl, currentInspectedDomain);
      checkUrlRisk(rawUrl);
    } catch {
      updateUrlDisplay(rawUrl, rawUrl);
      checkUrlRisk(rawUrl);
    }
  });
}

/**
 * Update UI for current active URL
 */
function updateUrlDisplay(fullUrl, domain) {
  elements.currentDomain.innerText = domain;
  elements.currentFullUrl.innerText = fullUrl;

  if (fullUrl.startsWith('https://')) {
    elements.securityIcon.innerText = '🔒';
    elements.securityIcon.title = 'Encrypted HTTPS connection';
  } else if (fullUrl.startsWith('http://')) {
    elements.securityIcon.innerText = '⚠️';
    elements.securityIcon.title = 'Unencrypted HTTP connection';
  } else {
    elements.securityIcon.innerText = '🧭';
    elements.securityIcon.title = 'Browser internal resource';
  }
}

/**
 * Check URL against Avaish's Universal Lookup API
 * POST http://localhost:8000/api/lookup
 * Body: { "query": "https://example.com" }
 */
async function checkUrlRisk(urlToCheck) {
  hideAllStates();
  elements.loadingState.classList.remove('hidden');

  const cleanUrl = urlToCheck.trim();

  // If user selected Mock Mode for offline development
  if (currentConfig.forceMock) {
    setTimeout(() => {
      const mockResult = evaluateDevMock(cleanUrl);
      updateStatusBadge(false, 'Dev Mock Mode');
      renderVerdict(mockResult, true);
    }, 250);
    return;
  }

  // Real API call to Avaish's backend
  const endpointUrl = `${currentConfig.backendUrl}${currentConfig.lookupEndpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: cleanUrl,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      updateStatusBadge(true, `Live API (${new URL(currentConfig.backendUrl).port || '8001'})`);
      const normalized = normalizeBackendResponse(data, cleanUrl);
      renderVerdict(normalized, false);
      return;
    }

    // Backend returned non-200 error code
    console.warn(`[ScamSentry Extension] Backend returned HTTP ${response.status}`);
    showErrorState(`Backend at ${endpointUrl} returned HTTP ${response.status}.`);
  } catch (err) {
    // Backend offline / network failed
    console.info(`[ScamSentry Extension] Could not reach backend at ${endpointUrl}`, err);
    updateStatusBadge(false, 'Backend Offline');
    showErrorState(`Unable to connect to ScamSentry backend at ${endpointUrl}.`);
  }
}

/**
 * Standardize backend payload into frontend verdict structure
 * Handles: verdict, risk_score, risk_level, report_count, top_category
 */
function normalizeBackendResponse(data, originalQuery) {
  let verdict = (data.verdict || '').toUpperCase();

  // If verdict wasn't explicitly returned, deduce from risk_level / risk_score
  if (!verdict) {
    const score = Number(data.risk_score || 0);
    const count = Number(data.report_count || 0);
    const level = (data.risk_level || '').toLowerCase();

    if (level === 'high' || score >= 60 || count >= 10) {
      verdict = 'KNOWN_SCAM';
    } else if (level === 'suspicious' || level === 'medium' || (score >= 20 && score < 60) || count >= 2) {
      verdict = 'SUSPICIOUS';
    } else if (level === 'verified' || data.verified_source) {
      verdict = 'VERIFIED_BUSINESS';
    } else {
      verdict = 'NO_REPORTS';
    }
  }

  return {
    query: data.query || originalQuery,
    verdict: verdict,
    risk_score: data.risk_score !== undefined ? data.risk_score : (verdict === 'KNOWN_SCAM' ? 95 : verdict === 'SUSPICIOUS' ? 45 : 0),
    risk_level: data.risk_level || (verdict === 'KNOWN_SCAM' ? 'high' : verdict === 'SUSPICIOUS' ? 'medium' : 'unverified'),
    report_count: data.report_count !== undefined ? data.report_count : (verdict === 'KNOWN_SCAM' ? 24 : 0),
    top_category: data.top_category || (verdict === 'KNOWN_SCAM' ? 'Phishing / Fake KYC' : verdict === 'SUSPICIOUS' ? 'Urgent threat link' : 'None'),
    verified_source: data.verified_source || '',
    business_name: data.business_name || '',
    is_mock: false,
  };
}

/**
 * Clearly Separated Mock Engine for Offline Development Only
 * Strictly enforces: "Treats NO_REPORTS as No reports found—not guaranteed safe."
 */
function evaluateDevMock(url) {
  const lower = url.toLowerCase();

  // Simulated Known Scam Links
  if (
    lower.includes('sbi-kyc') ||
    lower.includes('phish') ||
    lower.includes('scam') ||
    lower.includes('fake-login') ||
    lower.includes('telegram-task') ||
    lower.includes('free-lottery')
  ) {
    return {
      query: url,
      verdict: 'KNOWN_SCAM',
      risk_score: 95,
      risk_level: 'high',
      report_count: 43,
      top_category: 'Phishing credential theft / Fake KYC',
      is_mock: true,
    };
  }

  // Simulated Suspicious Links
  if (
    lower.includes('bescom') ||
    lower.includes('bill-due') ||
    lower.includes('urgent') ||
    lower.includes('fast-loan') ||
    lower.endsWith('.xyz') ||
    lower.endsWith('.top')
  ) {
    return {
      query: url,
      verdict: 'SUSPICIOUS',
      risk_score: 52,
      risk_level: 'medium',
      report_count: 7,
      top_category: 'Electricity bill urgency / Unofficial domain',
      is_mock: true,
    };
  }

  // Simulated Verified Corporate/Gov Entities
  if (
    lower.includes('sbi.co.in') ||
    lower.includes('hdfcbank.com') ||
    lower.includes('icicibank.com') ||
    lower.includes('cybercrime.gov.in') ||
    lower.endsWith('.gov.in')
  ) {
    return {
      query: url,
      verdict: 'VERIFIED_BUSINESS',
      risk_score: 0,
      risk_level: 'low',
      report_count: 0,
      top_category: 'Banking / Public Utility',
      verified_source: 'Official Regulatory Directory',
      business_name: lower.includes('sbi.co.in') ? 'State Bank of India (Official)' : 'Verified Official Organization',
      is_mock: true,
    };
  }

  // Default: NO_REPORTS (Must NOT claim safe!)
  return {
    query: url,
    verdict: 'NO_REPORTS',
    risk_score: 0,
    risk_level: 'unverified',
    report_count: 0,
    top_category: 'None',
    is_mock: true,
  };
}

/**
 * Render the received verdict
 */
function renderVerdict(result, isMock) {
  hideAllStates();

  const verdict = result.verdict || 'NO_REPORTS';

  // Render Source Strip
  elements.sourceIndicator.classList.remove('hidden', 'live', 'mock');
  if (isMock) {
    elements.sourceIndicator.classList.add('mock');
    elements.sourceText.innerText = 'Development Mock Mode (Simulated Response)';
  } else {
    elements.sourceIndicator.classList.add('live');
    elements.sourceText.innerText = `Verified by Live Backend (${currentConfig.backendUrl}/api/lookup)`;
  }

  switch (verdict) {
    case 'KNOWN_SCAM':
      elements.scamScore.innerText = result.risk_score !== undefined ? result.risk_score : 95;
      elements.scamReportsCount.innerText = result.report_count !== undefined ? result.report_count : '--';
      elements.scamCategory.innerText = result.top_category || 'Phishing / Fraud';
      elements.scamRiskLevel.innerText = `${(result.risk_level || 'High').toUpperCase()} RISK`;
      elements.knownScamState.classList.remove('hidden');
      break;

    case 'SUSPICIOUS':
      elements.suspiciousScore.innerText = result.risk_score !== undefined ? result.risk_score : 50;
      elements.suspiciousReportsCount.innerText = result.report_count !== undefined ? result.report_count : '--';
      elements.suspiciousCategory.innerText = result.top_category || 'Suspicious Signals';
      elements.suspiciousRiskLevel.innerText = `${(result.risk_level || 'Medium').toUpperCase()} RISK`;
      elements.suspiciousState.classList.remove('hidden');
      break;

    case 'VERIFIED_BUSINESS':
      elements.verifiedBusinessTitle.innerText = result.business_name || 'Official Enterprise Entity';
      elements.verifiedBusinessDesc.innerText = result.verified_source
        ? `Matched Source: ${result.verified_source}`
        : 'Matches published official directory of verified institutions.';
      elements.verifiedState.classList.remove('hidden');
      break;

    case 'NO_REPORTS':
    default:
      // Neutral - never claim safe
      elements.noReportsState.classList.remove('hidden');
      break;
  }
}

/**
 * Show error / unavailable backend state
 */
function showErrorState(description) {
  hideAllStates();
  elements.errorDescText.innerText = description;
  elements.errorState.classList.remove('hidden');
}

/**
 * Hide all state cards
 */
function hideAllStates() {
  elements.loadingState.classList.add('hidden');
  elements.knownScamState.classList.add('hidden');
  elements.suspiciousState.classList.add('hidden');
  elements.noReportsState.classList.add('hidden');
  elements.verifiedState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.internalState.classList.add('hidden');
  elements.sourceIndicator.classList.add('hidden');
}

/**
 * Show internal browser resource state
 */
function showInternalState() {
  hideAllStates();
  elements.internalState.classList.remove('hidden');
}

/**
 * Update top-right status pill
 */
function updateStatusBadge(isLive, label) {
  elements.statusPill.className = `status-pill ${isLive ? 'status-live' : 'status-demo'}`;
  elements.statusText.innerText = label;
}
