// Background service worker for AI Sidebar extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ai-explain',
    title: 'Explain with AI',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-summarize',
    title: 'Summarize with AI',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'ai-translate',
    title: 'Translate with AI',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText) {
    // Open side panel first
    chrome.sidePanel.open({ windowId: tab.windowId });
    
    // Send the selected text and action to the sidebar
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'context-menu-action',
        action: info.menuItemId,
        text: info.selectionText
      });
    }, 500);
  }
});

// Listen for messages from content script or sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-page-content') {
    // Forward request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'extract-content' }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep channel open for async response
  }
});
