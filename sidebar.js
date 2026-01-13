// AI Sidebar - Main JavaScript

// State
let conversationHistory = [];
let settings = {
  apiKey: '',
  model: 'pixtral-large-latest' // Vision-capable model
};
let pendingImages = []; // Array of Base64 image data (max 3)
let currentAbortController = null; // For canceling ongoing API requests
let isResponding = false; // Track if AI is currently responding

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messagesContainer = document.getElementById('messages');
const welcomeMessage = document.getElementById('welcomeMessage');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const modelSelect = document.getElementById('modelSelect');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const explainBtn = document.getElementById('explainBtn');
const translateBtn = document.getElementById('translateBtn');

const uploadImageBtn = document.getElementById('uploadImageBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreviews = document.getElementById('imagePreviews');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  await loadConversationHistory();
  setupEventListeners();
  setupMessageListener();
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['apiKey', 'model']);
    if (result.apiKey) {
      settings.apiKey = result.apiKey;
      apiKeyInput.value = result.apiKey;
    }
    if (result.model) {
      settings.model = result.model;
      modelSelect.value = result.model;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  settings.apiKey = apiKeyInput.value.trim();
  settings.model = modelSelect.value;
  
  try {
    await chrome.storage.local.set({
      apiKey: settings.apiKey,
      model: settings.model
    });
    closeSettings();
    showToast('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Failed to save settings', true);
  }
}

// Load conversation history
async function loadConversationHistory() {
  try {
    const result = await chrome.storage.local.get(['conversationHistory']);
    if (result.conversationHistory && result.conversationHistory.length > 0) {
      conversationHistory = result.conversationHistory;
      hideWelcome();
      renderMessages();
    }
  } catch (error) {
    console.error('Error loading conversation history:', error);
  }
}

// Save conversation history
async function saveConversationHistory() {
  try {
    await chrome.storage.local.set({ conversationHistory });
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Send message
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize textarea and update send button state
  messageInput.addEventListener('input', updateSendButtonState);
  
  // New chat
  newChatBtn.addEventListener('click', startNewChat);
  
  // Settings
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Quick actions
  summarizeBtn.addEventListener('click', () => handleQuickAction('summarize'));
  explainBtn.addEventListener('click', () => handleQuickAction('explain'));
  translateBtn.addEventListener('click', () => handleQuickAction('translate'));
  
  // Image upload
  uploadImageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', handleImageUpload);
  
  // Drag and drop for images
  setupDragAndDrop();
}

// Setup drag and drop functionality
function setupDragAndDrop() {
  const dropZone = document.querySelector('.sidebar-container');
  
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Highlight drop zone when dragging over
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    }, false);
  });
  
  // Handle dropped files
  dropZone.addEventListener('drop', handleDrop, false);
}

// Handle dropped files
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    handleDroppedFiles(files);
  }
}

// Process dropped files
function handleDroppedFiles(files) {
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    showToast('Please drop image files only', true);
    return;
  }
  
  // Check how many more images we can add
  const remainingSlots = 3 - pendingImages.length;
  if (remainingSlots <= 0) {
    showToast('Maximum 3 images allowed', true);
    return;
  }
  
  const filesToProcess = imageFiles.slice(0, remainingSlots);
  
  filesToProcess.forEach(file => {
    // Check file size (max 20MB for Mistral)
    if (file.size > 20 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 20MB)`, true);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      pendingImages.push(event.target.result);
      renderImagePreviews();
      updateSendButtonState();
    };
    reader.readAsDataURL(file);
  });
  
  if (imageFiles.length > remainingSlots) {
    showToast(`Only ${remainingSlots} image(s) added (max 3 total)`, false);
  } else {
    showToast(`${filesToProcess.length} image(s) added`, false);
  }
  
  messageInput.focus();
}

// Update send button state and quick action buttons
function updateSendButtonState() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  // Disable send button if no content OR if AI is currently responding
  sendBtn.disabled = isResponding || (!messageInput.value.trim() && pendingImages.length === 0);
  
  // Disable quick action buttons while responding
  summarizeBtn.disabled = isResponding;
  explainBtn.disabled = isResponding;
  translateBtn.disabled = isResponding;
}

// Setup message listener for context menu actions
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'context-menu-action') {
      handleContextMenuAction(message.action, message.text);
    }
  });
}

// Handle context menu actions
function handleContextMenuAction(action, text) {
  let prompt = '';
  switch (action) {
    case 'ai-explain':
      prompt = `Please explain the following text in simple terms:\n\n"${text}"`;
      break;
    case 'ai-summarize':
      prompt = `Please summarize the following text:\n\n"${text}"`;
      break;
    case 'ai-translate':
      prompt = `Please translate the following text to English (or if it's already in English, translate to Chinese):\n\n"${text}"`;
      break;
  }
  if (prompt) {
    addUserMessage(prompt);
    sendToMistral(prompt);
  }
}


// Handle image upload (supports up to 3 images)
function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  
  // Check how many more images we can add
  const remainingSlots = 3 - pendingImages.length;
  if (remainingSlots <= 0) {
    showToast('Maximum 3 images allowed', true);
    imageInput.value = '';
    return;
  }
  
  const filesToProcess = files.slice(0, remainingSlots);
  
  filesToProcess.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name} is not an image`, true);
      return;
    }
    
    // Check file size (max 20MB for Mistral)
    if (file.size > 20 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 20MB)`, true);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      pendingImages.push(event.target.result);
      renderImagePreviews();
      updateSendButtonState();
    };
    reader.readAsDataURL(file);
  });
  
  if (files.length > remainingSlots) {
    showToast(`Only ${remainingSlots} image(s) added (max 3 total)`, false);
  }
  
  // Reset input so same file can be selected again
  imageInput.value = '';
  messageInput.focus();
}

// Render image previews
function renderImagePreviews() {
  imagePreviews.innerHTML = '';
  
  pendingImages.forEach((imageData, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';
    wrapper.innerHTML = `
      <img src="${imageData}" alt="Preview ${index + 1}">
      <button class="remove-image-btn" data-index="${index}" title="Remove image">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;
    
    // Add click handler for remove button
    wrapper.querySelector('.remove-image-btn').addEventListener('click', (e) => {
      removeImage(index);
    });
    
    imagePreviews.appendChild(wrapper);
  });
  
  imagePreviewContainer.style.display = pendingImages.length > 0 ? 'block' : 'none';
}

// Remove single image
function removeImage(index) {
  pendingImages.splice(index, 1);
  renderImagePreviews();
  updateSendButtonState();
}

// Clear all pending images
function clearPendingImages() {
  pendingImages = [];
  renderImagePreviews();
  updateSendButtonState();
}

// Handle quick actions
async function handleQuickAction(action) {
  if (!settings.apiKey) {
    openSettings();
    showToast('Please enter your Mistral API key first', true);
    return;
  }
  
  try {
    const pageContent = await getPageContent();
    let prompt = '';
    
    switch (action) {
      case 'summarize':
        prompt = `Please provide a concise summary of the following webpage content. Focus on the main points and key information.\n\nPage Title: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent:\n${pageContent.content}`;
        break;
      case 'explain':
        if (pageContent.selectedText) {
          prompt = `Please explain the following selected text in simple, easy-to-understand terms. Break it down step by step if needed:\n\n"${pageContent.selectedText}"`;
        } else {
          showToast('Please select text on the webpage first', true);
          return;
        }
        break;
      case 'translate':
        if (pageContent.selectedText) {
          prompt = `Please translate the following text. If it's in English, translate to Chinese. If it's in another language, translate to English. Provide both the translation and a brief explanation of the meaning:\n\n"${pageContent.selectedText}"`;
        } else {
          showToast('Please select text on the webpage first', true);
          return;
        }
        break;
    }
    
    if (prompt) {
      addUserMessage(prompt);
      sendToMistral(prompt);
    }
  } catch (error) {
    console.error('Error handling quick action:', error);
    showToast('Failed to get page content', true);
  }
}

// Get page content from content script
function getPageContent() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'get-page-content' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response || { title: '', url: '', content: '', selectedText: '' });
      }
    });
  });
}

// Send message
async function sendMessage() {
  // Prevent sending if AI is already responding
  if (isResponding) return;
  
  const text = messageInput.value.trim();
  const hasImages = pendingImages.length > 0;
  
  if (!text && !hasImages) return;
  
  if (!settings.apiKey) {
    openSettings();
    showToast('Please enter your Mistral API key first', true);
    return;
  }
  
  // Capture images before clearing
  const imagesToSend = [...pendingImages];
  
  messageInput.value = '';
  messageInput.style.height = 'auto';
  clearPendingImages();
  sendBtn.disabled = true;
  
  const defaultPrompt = imagesToSend.length > 1 
    ? 'Please analyze these images and describe what you see.'
    : 'Please describe and analyze this image in detail.';
  
  addUserMessage(text || 'Analyze ' + (imagesToSend.length > 1 ? 'these images' : 'this image'), imagesToSend);
  await sendToMistral(text || defaultPrompt, imagesToSend);
}

// Add user message to UI
function addUserMessage(text, images = []) {
  hideWelcome();
  
  const message = {
    role: 'user',
    content: text,
    images: images, // Array of images
    timestamp: new Date().toISOString()
  };
  
  conversationHistory.push(message);
  renderMessage(message);
  saveConversationHistory();
  scrollToBottom();
}

// Send to Mistral API
async function sendToMistral(userMessage, images = []) {
  // Set responding state
  isResponding = true;
  updateSendButtonState();
  
  // Show typing indicator
  const typingIndicator = createTypingIndicator();
  messagesContainer.appendChild(typingIndicator);
  scrollToBottom();
  
  try {
    // Build messages array for API
    const messages = [];
    
    // Add conversation history (excluding images for simplicity, except current)
    for (const msg of conversationHistory.slice(0, -1)) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Add current message with images if present
    if (images.length > 0) {
      const content = [
        {
          type: 'text',
          text: userMessage
        }
      ];
      
      // Add each image to content
      images.forEach(imageData => {
        content.push({
          type: 'image_url',
          image_url: imageData
        });
      });
      
      messages.push({
        role: 'user',
        content: content
      });
    } else {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }
    
    // Use vision model if image is present
    const modelToUse = images.length > 0 ? 'pixtral-large-latest' : settings.model;
    
    // Create abort controller for this request
    currentAbortController = new AbortController();
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        stream: true
      }),
      signal: currentAbortController.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }
    
    // Remove typing indicator
    typingIndicator.remove();
    
    // Create assistant message element for streaming
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    
    const messageElement = createMessageElement(assistantMessage);
    messagesContainer.appendChild(messageElement);
    const textElement = messageElement.querySelector('.message-text');
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              textElement.innerHTML = formatMessage(fullContent);
              scrollToBottom();
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }
    
    // Save complete message
    assistantMessage.content = fullContent;
    conversationHistory.push(assistantMessage);
    saveConversationHistory();
    
    // Reset responding state
    isResponding = false;
    updateSendButtonState();
    
  } catch (error) {
    // Silently ignore abort errors (user clicked New Chat)
    if (error.name === 'AbortError') {
      typingIndicator.remove();
      return;
    }
    
    console.error('Error calling Mistral API:', error);
    typingIndicator.remove();
    
    const errorMessage = {
      role: 'assistant',
      content: `Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`,
      timestamp: new Date().toISOString(),
      isError: true
    };
    
    renderMessage(errorMessage);
    
    // Reset responding state
    isResponding = false;
    updateSendButtonState();
  }
}

// Create message element
function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = `message ${message.role}`;
  
  const avatar = message.role === 'user' ? '👤' : '✨';
  const sender = message.role === 'user' ? 'You' : 'AI Assistant';
  const time = formatTime(message.timestamp);
  
  // Handle multiple images
  let imagesHtml = '';
  if (message.images && message.images.length > 0) {
    const imageElements = message.images.map((img, i) => 
      `<img class="message-image" src="${img}" alt="Image ${i + 1}" onclick="window.open(this.src, '_blank')">`
    ).join('');
    imagesHtml = `<div class="message-images">${imageElements}</div>`;
  } else if (message.image) {
    // Backward compatibility for old single image format
    imagesHtml = `<div class="message-images"><img class="message-image" src="${message.image}" alt="Uploaded image" onclick="window.open(this.src, '_blank')"></div>`;
  }
  
  // Check if user message is too long (more than 200 characters)
  const isLongMessage = message.role === 'user' && message.content && message.content.length > 200;
  const collapsibleClass = isLongMessage ? 'collapsible' : '';
  const expandBtnHtml = isLongMessage ? '<button class="expand-message-btn">Show more</button>' : '';
  
  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">${sender}</span>
        <span class="message-time">${time}</span>
      </div>
      ${imagesHtml}
      <div class="message-text ${collapsibleClass} ${message.isError ? 'error-message' : ''}">${formatMessage(message.content)}</div>
      ${expandBtnHtml}
    </div>
  `;
  
  // Add expand/collapse functionality
  if (isLongMessage) {
    const expandBtn = div.querySelector('.expand-message-btn');
    const textEl = div.querySelector('.message-text');
    expandBtn.addEventListener('click', () => {
      textEl.classList.toggle('expanded');
      expandBtn.textContent = textEl.classList.contains('expanded') ? 'Show less' : 'Show more';
    });
  }
  
  return div;
}

// Render single message
function renderMessage(message) {
  const messageElement = createMessageElement(message);
  messagesContainer.appendChild(messageElement);
}

// Render all messages
function renderMessages() {
  messagesContainer.innerHTML = '';
  conversationHistory.forEach(message => renderMessage(message));
  scrollToBottom();
}

// Create typing indicator
function createTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  return div;
}

// Format message content (comprehensive markdown)
function formatMessage(text) {
  if (!text) return '';
  
  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (must be done before other replacements)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block${lang ? ' language-' + lang : ''}"><code>${code.trim()}</code></pre>`;
  });
  
  // Inline code (must be before other inline replacements)
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  // Tables (must be done before headers and line breaks)
  html = html.replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
    // Parse header
    const headers = headerRow.split('|').slice(1, -1).map(h => h.trim());
    
    // Parse alignment from separator
    const alignments = separatorRow.split('|').slice(1, -1).map(sep => {
      sep = sep.trim();
      if (sep.startsWith(':') && sep.endsWith(':')) return 'center';
      if (sep.endsWith(':')) return 'right';
      return 'left';
    });
    
    // Parse body rows
    const rows = bodyRows.trim().split('\n').map(row => 
      row.split('|').slice(1, -1).map(cell => cell.trim())
    );
    
    // Build HTML table
    let tableHtml = '<table class="md-table"><thead><tr>';
    headers.forEach((h, i) => {
      tableHtml += `<th style="text-align:${alignments[i] || 'left'}">${h}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    rows.forEach(row => {
      tableHtml += '<tr>';
      row.forEach((cell, i) => {
        tableHtml += `<td style="text-align:${alignments[i] || 'left'}">${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    return tableHtml;
  });
  
  // Headers (must be done before line breaks)
  html = html.replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr">');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="md-li">$1</li>');
  
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-li-ordered">$1</li>');
  
  // Wrap consecutive list items in ul/ol
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
  html = html.replace(/((?:<li class="md-li-ordered">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');
  
  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Line breaks (do this last, skip if inside pre tags)
  html = html.replace(/\n/g, '<br>');
  
  // Clean up extra breaks after block elements
  html = html.replace(/<\/pre><br>/g, '</pre>');
  html = html.replace(/<\/h([1-4])><br>/g, '</h$1>');
  html = html.replace(/<\/ul><br>/g, '</ul>');
  html = html.replace(/<\/ol><br>/g, '</ol>');
  html = html.replace(/<\/table><br>/g, '</table>');
  html = html.replace(/<hr class="md-hr"><br>/g, '<hr class="md-hr">');
  
  return html;
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Start new chat
function startNewChat() {
  // Cancel any ongoing API request
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  // Reset responding state
  isResponding = false;
  
  conversationHistory = [];
  messagesContainer.innerHTML = '';
  clearPendingImages();
  showWelcome();
  saveConversationHistory();
  updateSendButtonState();
}

// Show/hide welcome message
function showWelcome() {
  welcomeMessage.style.display = 'flex';
}

function hideWelcome() {
  welcomeMessage.style.display = 'none';
}

// Settings panel
function openSettings() {
  settingsPanel.classList.add('active');
}

function closeSettings() {
  settingsPanel.classList.remove('active');
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Toast notification
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)'};
    color: white;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
