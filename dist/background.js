// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  // Open the notes page in a new tab using the extension's own URL
  // Using regular tab which has better support for File System Access API
  chrome.tabs.create({ 
    url: chrome.runtime.getURL('notes.html'),
    active: true
  });
});

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openInNewTab") {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('notes.html'),
      active: true
    });
  }
});
