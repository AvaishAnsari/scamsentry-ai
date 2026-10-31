// ScamSentry AI - Background Service Worker (Manifest V3)
// Privacy-First: Does not monitor web navigation or collect browsing history.

const DEFAULT_CONFIG = {
  backendUrl: 'http://localhost:8001',
  lookupEndpoint: '/api/lookup',
  webAppUrl: 'http://localhost:3000',
  forceMock: false,
};

// Initialize default configuration on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['backendUrl', 'lookupEndpoint', 'webAppUrl', 'forceMock'], (res) => {
    const toSet = {};
    if (!res.backendUrl) toSet.backendUrl = DEFAULT_CONFIG.backendUrl;
    if (!res.lookupEndpoint) toSet.lookupEndpoint = DEFAULT_CONFIG.lookupEndpoint;
    if (!res.webAppUrl) toSet.webAppUrl = DEFAULT_CONFIG.webAppUrl;
    if (res.forceMock === undefined) toSet.forceMock = DEFAULT_CONFIG.forceMock;

    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });

  console.log('[ScamSentry Extension] Configured for Avaish\'s universal lookup API at http://localhost:8001/api/lookup.');
});
