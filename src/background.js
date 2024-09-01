const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

const SUPPORTED_URLS = ['chatgpt.com', 'claude.ai', 'poe.com'];

// Listen for tab updates
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (SUPPORTED_URLS.some(url => tab.url.includes(url))) {
      browserAPI.action.enable(tabId);
    } else {
      browserAPI.action.disable(tabId);
    }
  }
});

// Listen for messages from popup.js
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    browserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {action: "extract", format: request.format}, function(response) {
        sendResponse(response);
      });
    });
    return true;  // Indicates that we will send a response asynchronously
  } else if (request.action === "detectPlatform") {
    browserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {action: "detectPlatform"}, function(response) {
        sendResponse(response);
      });
    });
    return true;  // Indicates that we will send a response asynchronously
  }
});
