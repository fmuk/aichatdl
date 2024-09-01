let debugLog = [];

const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

const log = message => {
  debugLog.push(`${new Date().toISOString()}: ${message}`);
  updateDebugLogDisplay();
};

const updateDebugLogDisplay = () => {
  const debugLogElement = document.getElementById('debugLog');
  debugLogElement.textContent = debugLog.join('\n');
  debugLogElement.scrollTop = debugLogElement.scrollHeight;
};

const getCurrentSite = () => {
  browserAPI.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const siteMap = {
        'chatgpt.com': 'chatgpt',
        'claude.ai': 'claude',
        'poe.com': 'poe'
      };
      const detectedSite = siteMap[url.hostname] || 'unknown';
      log(`Current detected site: ${detectedSite}`);
    } else {
      log('No active tab found');
    }
  });
};

document.addEventListener('DOMContentLoaded', getCurrentSite);

document.getElementById('extractBtn').addEventListener('click', () => {
  debugLog = [];
  log('Starting conversation extraction...');
  
  const format = document.querySelector('input[name="format"]:checked').value;
  log(`Selected format: ${format}`);

  browserAPI.tabs.query({active: true, currentWindow: true}, (tabs) => {
    log(`Current URL: ${tabs[0].url}`);
    browserAPI.tabs.sendMessage(tabs[0].id, {action: "extract", format}, response => {
      if (browserAPI.runtime.lastError) {
        log(`Error: ${browserAPI.runtime.lastError.message}`);
        if (browserAPI.runtime.lastError.message.includes("Cannot access contents of url") ||
            browserAPI.runtime.lastError.message.includes("Could not establish connection")) {
          log("Make sure you're on a chatgpt.com, claude.ai, or poe.com page and refresh if necessary.");
        }
      } else if (response) {
        response.logs?.forEach(logMessage => log(logMessage));
        if (response.error) {
          log(`Extraction failed: ${response.error}`);
        } else {
          log(`Extraction completed. ${response.messageCount} messages found.`);
          log(`Platform detected: ${response.platform}`);
          log(`Format used: ${format}`);
          log(response.downloadInitiated ? 'File download initiated.' : 'File download failed to start.');
        }
      } else {
        log('Extraction failed: No response from content script');
      }
    });
  });
});

document.getElementById('copyDebugBtn').addEventListener('click', () => {
  const logText = debugLog.join('\n');
  navigator.clipboard.writeText(logText)
    .then(() => log('Debug log copied to clipboard.'))
    .catch(err => log('Failed to copy debug log: ' + err));
});
