// Background service worker for handling extension lifecycle

chrome.runtime.onInstalled.addListener(() => {
  console.log('Clipponent extension installed!');
});

// Listen for messages from content scripts and relay to popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractComponent') {
    // Handle component extraction if needed
    sendResponse({ success: true });
  }
  
  // Relay component extraction data to popup
  if (request.action === 'componentExtracted') {
    // Forward the message to all extension views (popup, options, etc.)
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        console.log('No popup open to receive message');
      }
    });
    sendResponse({ success: true });
  }
  
  return true;
});