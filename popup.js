const selectBtn = document.getElementById('selectBtn');
const status = document.getElementById('status');
const initialView = document.getElementById('initialView');
const extractedView = document.getElementById('extractedView');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebar');
const reselectBtn = document.getElementById('reselectBtn');

let currentHTML = '';
let currentCSS = '';

function showStatus(message, type = 'info') {
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      status.classList.add('hidden');
    }, 3000);
  }
}

// Open sidebar
function openSidebar() {
  extractedView.classList.add('active');
  sidebarOverlay.classList.add('active');
}

// Close sidebar
function closeSidebar() {
  extractedView.classList.remove('active');
  sidebarOverlay.classList.remove('active');
}

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar button
closeSidebarBtn.addEventListener('click', closeSidebar);

selectBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      showStatus('Cannot access this page', 'error');
      return;
    }

    // Send message to content script to activate selection mode
    chrome.tabs.sendMessage(tab.id, { action: 'startSelection' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Please refresh the page and try again', 'error');
        return;
      }

      if (response && response.success) {
        showStatus('Selection mode active! Click any element', 'success');
      }
    });
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'componentExtracted') {
    displayExtractedComponent(request.data);
    sendResponse({ success: true });
  }
  return true;
});

function displayExtractedComponent(data) {
  currentHTML = data.html;
  currentCSS = data.css;

  // Get elements
  const htmlCode = document.getElementById('htmlCode');
  const cssCode = document.getElementById('cssCode');
  const statsBadges = document.getElementById('statsBadges');
  const enhancedLabel = document.getElementById('enhancedLabel');

  // Update code blocks
  htmlCode.textContent = currentHTML;
  cssCode.textContent = currentCSS;

  // Generate stats badges
  const stats = data.stats;
  let badgesHTML = '';

  if (stats.mainStyles > 0) {
    badgesHTML += `<span class="badge">🎯 ${stats.mainStyles} CSS Props</span>`;
  }
  if (stats.childStyles > 0) {
    badgesHTML += `<span class="badge">👶 ${stats.childStyles} Children</span>`;
  }
  if (stats.pseudoElements > 0) {
    badgesHTML += `<span class="badge">✨ ${stats.pseudoElements} Pseudo-elements</span>`;
  }
  if (stats.pseudoClasses > 0) {
    badgesHTML += `<span class="badge">🎨 ${stats.pseudoClasses} States</span>`;
  }
  if (stats.mediaQueries > 0) {
    badgesHTML += `<span class="badge">📱 ${stats.mediaQueries} Breakpoints</span>`;
  }
  if (stats.keyframes > 0) {
    badgesHTML += `<span class="badge">🎬 ${stats.keyframes} Animations</span>`;
  }

  statsBadges.innerHTML = badgesHTML;

  // Show enhanced label if there are advanced features
  if (stats.childStyles + stats.pseudoElements + stats.pseudoClasses + stats.mediaQueries + stats.keyframes > 0) {
    enhancedLabel.classList.remove('hidden');
  } else {
    enhancedLabel.classList.add('hidden');
  }

  // Open sidebar with smooth animation
  openSidebar();

  // Setup buttons after sidebar is visible
  setupCopyButtons();
  setupAIButton();
  setupReselectButton();
}

function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    // Remove old listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
      const target = e.target.getAttribute('data-target');
      const content = target === 'htmlCode' ? currentHTML : currentCSS;

      navigator.clipboard.writeText(content).then(() => {
        e.target.textContent = '✓ Copied';
        e.target.classList.add('copied');

        setTimeout(() => {
          e.target.textContent = 'Copy';
          e.target.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

function setupAIButton() {
  const cleanAIBtn = document.getElementById('cleanAIBtn');
  
  // Remove old listener by cloning
  const newBtn = cleanAIBtn.cloneNode(true);
  cleanAIBtn.parentNode.replaceChild(newBtn, cleanAIBtn);

  newBtn.addEventListener('click', async () => {
    newBtn.disabled = true;
    newBtn.style.opacity = '0.5';
    newBtn.innerHTML = '<span>⏳</span><span>Cleaning...</span>';

    try {
      const apiKey = CONFIG.OPENAI_API_KEY;

      if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        throw new Error('OpenAI API key not configured. Please add your API key in config.js');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a frontend development expert. Clean and optimize HTML/CSS code by removing unnecessary properties while keeping the visual design intact. Return ONLY the cleaned code in markdown format with ```html and ```css blocks.'
            },
            {
              role: 'user',
              content: `Clean this code:\n\nHTML:\n${currentHTML}\n\nCSS:\n${currentCSS}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const cleanedCode = data.choices[0].message.content;

      // Parse cleaned code
      const htmlMatch = cleanedCode.match(/```html\n([\s\S]*?)```/);
      const cssMatch = cleanedCode.match(/```css\n([\s\S]*?)```/);

      const htmlCode = document.getElementById('htmlCode');
      const cssCode = document.getElementById('cssCode');

      if (htmlMatch && htmlMatch[1]) {
        currentHTML = htmlMatch[1].trim();
        htmlCode.textContent = currentHTML;
      }

      if (cssMatch && cssMatch[1]) {
        currentCSS = cssMatch[1].trim();
        cssCode.textContent = currentCSS;
      }

      newBtn.innerHTML = '<span>✓</span><span>Cleaned!</span>';
      newBtn.style.background = '#1E6F4E';

      setTimeout(() => {
        newBtn.innerHTML = '<span>✨</span><span>Clean with AI</span>';
        newBtn.style.background = '';
        newBtn.disabled = false;
        newBtn.style.opacity = '1';
      }, 2000);

    } catch (error) {
      alert(`Error: ${error.message}`);
      newBtn.innerHTML = '<span>✨</span><span>Clean with AI</span>';
      newBtn.disabled = false;
      newBtn.style.opacity = '1';
    }
  });
}

function setupReselectButton() {
  const newBtn = reselectBtn.cloneNode(true);
  reselectBtn.parentNode.replaceChild(newBtn, reselectBtn);

  newBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        alert('Cannot access this page');
        return;
      }

      // Keep sidebar open, just activate selection mode again
      chrome.tabs.sendMessage(tab.id, { action: 'startSelection' }, (response) => {
        if (chrome.runtime.lastError) {
          alert('Please refresh the page and try again');
          return;
        }

        if (response && response.success) {
          // Show temporary feedback
          newBtn.innerHTML = '<span>✓</span><span>Selection Active</span>';
          newBtn.style.background = '#1E6F4E';
          
          setTimeout(() => {
            newBtn.innerHTML = '<span>🎯</span><span>Reselect Element</span>';
            newBtn.style.background = '';
          }, 2000);
        }
      });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
}
