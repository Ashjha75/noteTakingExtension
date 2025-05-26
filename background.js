// Background script for Dark Notes with Google Drive support

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openInNewTab") {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('newtab.html'),
      active: true
    });
  }
  
  // Google Drive auth request
  if (message.action === "authenticateGoogleDrive") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, token: token });
      }
    });
    return true; // Required for async sendResponse
  }
});

// Note: In MV3, service workers unload when idle
// We use this to keep alive important event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('Dark Notes with Google Drive installed/updated');
  
  // Optional: Check for Google OAuth client ID
  const manifest = chrome.runtime.getManifest();
  if (manifest.oauth2 && manifest.oauth2.client_id.includes('YOUR_CLIENT_ID')) {
    console.warn('Google Drive integration requires a valid OAuth client ID. Please update the manifest.json file.');
  }
});
