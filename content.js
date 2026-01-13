// Content script for extracting page content

// Check if extension context is valid
function isExtensionValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Extract page content when requested
if (isExtensionValid()) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'extract-content') {
      try {
        const content = extractPageContent();
        sendResponse(content);
      } catch (e) {
        sendResponse({ title: '', url: '', content: '', selectedText: '' });
      }
    }
    return true;
  });
}

// Extract main content from the page
function extractPageContent() {
  // Get page metadata
  const title = document.title;
  const url = window.location.href;
  const description = document.querySelector('meta[name="description"]')?.content || '';
  
  // Try to get the main content
  let mainContent = '';
  
  // Priority selectors for main content
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content'
  ];
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = cleanText(element.innerText);
      break;
    }
  }
  
  // Fallback to body content if no main content found
  if (!mainContent) {
    mainContent = cleanText(document.body.innerText);
  }
  
  // Limit content length
  const maxLength = 8000;
  if (mainContent.length > maxLength) {
    mainContent = mainContent.substring(0, maxLength) + '...';
  }
  
  return {
    title,
    url,
    description,
    content: mainContent,
    selectedText: window.getSelection().toString()
  };
}

// Clean extracted text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

// Listen for selection changes to enable quick actions
document.addEventListener('mouseup', () => {
  if (!isExtensionValid()) return;
  
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    try {
      chrome.runtime.sendMessage({
        type: 'text-selected',
        text: selectedText
      });
    } catch (e) {
      // Extension context invalidated - silently ignore
    }
  }
});
