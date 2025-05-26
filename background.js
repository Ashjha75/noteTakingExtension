// Background script for improved handling of File System Access API in Chrome extensions

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openInNewTab") {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('newtab.html'),
      active: true
    });
  }
});

// Note: In MV3, service workers unload when idle
// We use this to keep alive important event listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});
