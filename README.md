ExtractUI — Chrome Extension
Extract any UI component from any website. Copy clean HTML & CSS in seconds.
ExtractUI is a Chrome extension that lets you click on any element on any webpage and instantly extract its HTML structure and computed CSS — including child elements, pseudo-classes, media queries, and animations. Then clean it up with one AI-powered click.

✦ Features

Point & Click Extraction — Activate selection mode, hover any element, click to extract
Full CSS Capture — Grabs computed styles, pseudo-elements (:hover, ::before), media queries, keyframe animations, and child element styles
Live Stats Panel — See at a glance how many CSS properties, children, states, breakpoints, and animations were found
AI Code Cleaning — One-click cleanup via OpenAI removes redundant properties while preserving visual fidelity
Sidebar View — Results open in a smooth slide-in panel without leaving the page
Copy to Clipboard — Copy HTML or CSS independently with a single button


⚙ Installation
Since ExtractUI is not yet on the Chrome Web Store, install it manually:

Clone or download this repository

bash   git clone https://github.com/rejuandevelopr/ExtractUI.git

Open Chrome and go to chrome://extensions/
Enable Developer Mode (toggle in the top-right)
Click Load unpacked
Select the ExtractUI folder

The extension icon will appear in your Chrome toolbar.

🔑 API Key Setup (for AI Cleaning)
The "Clean with AI" feature uses the OpenAI API. To enable it:

Open config.js
Replace the empty string with your OpenAI API key:

js   const CONFIG = {
     OPENAI_API_KEY: 'your-key-here'
   };

Get a key at platform.openai.com


⚠️ Never commit your API key to a public repository. Add config.js to .gitignore or use a placeholder.


🚀 How to Use

Click the ExtractUI icon in your Chrome toolbar
Click Start Selection
Hover over any element on the page — it will highlight
Click the element to extract it
A sidebar slides in with the extracted HTML and CSS
Hit Clean with AI to remove redundant styles (requires API key)
Copy HTML or CSS individually and paste into your project
Use Reselect Element to pick a different component without closing the panel


🗂 Project Structure
ExtractUI/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker — message relay
├── content.js          # Injected into pages — handles element selection & extraction
├── content.css         # Scoped styles for the selection highlight overlay
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic — sidebar, AI cleaning, copy buttons
├── config.js           # API key config (do not commit with real key)
└── icons/              # Extension icons (16px, 48px, 128px)

🛠 Tech Stack

Vanilla JavaScript (no build step, no dependencies)
Chrome Extensions Manifest V3
OpenAI API (gpt-4o-mini) for AI code cleaning
CSS computed styles via window.getComputedStyle


📋 Permissions Used
PermissionReasonactiveTabAccess the current page to inject the selection scriptscriptingExecute content scripts for element picking
No data is stored. No analytics. Nothing leaves your browser except the optional OpenAI API call (which sends only the extracted HTML/CSS).

🔮 Roadmap

 Export as React component
 Tailwind CSS output mode
 Save extraction history locally
 Support for SVG and Canvas elements
 Chrome Web Store listing


👤 Author
S.M. Rejuanul Islam
Frontend Developer · GitHub

📄 License
MIT License — use it, fork it, build on it.
