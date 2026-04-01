let isSelectionMode = false;
let hoveredElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    startSelectionMode();
    sendResponse({ success: true });
  }
  return true;
});

function parseCSSDeclarations(cssText) {
  const declarations = [];
  let current = '';
  let depth = 0;

  for (let char of cssText) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    if (char === ';' && depth === 0) {
      if (current.trim()) {
        const colonIdx = current.indexOf(':');
        if (colonIdx > -1) {
          const prop = current.substring(0, colonIdx).trim();
          let value = current.substring(colonIdx + 1).trim();
          let priority = '';
          
          if (value.includes('!important')) {
            priority = 'important';
            value = value.replace(/\s*!important\s*$/, '').trim();
          }
          
          declarations.push({ prop, value, priority });
        }
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    const colonIdx = current.indexOf(':');
    if (colonIdx > -1) {
      const prop = current.substring(0, colonIdx).trim();
      let value = current.substring(colonIdx + 1).trim();
      let priority = '';
      
      if (value.includes('!important')) {
        priority = 'important';
        value = value.replace(/\s*!important\s*$/, '').trim();
      }
      
      declarations.push({ prop, value, priority });
    }
  }

  return declarations;
}

function startSelectionMode() {
  isSelectionMode = true;
  document.body.style.cursor = 'crosshair';
  
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  
  showInstructionOverlay();
}

function stopSelectionMode() {
  isSelectionMode = false;
  document.body.style.cursor = '';
  
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  
  removeInstructionOverlay();
  removeHighlight();
}

function handleMouseOver(e) {
  if (!isSelectionMode) return;
  e.preventDefault();
  e.stopPropagation();
  hoveredElement = e.target;
  highlightElement(hoveredElement);
}

function handleMouseOut(e) {
  if (!isSelectionMode) return;
  removeHighlight();
}

function handleClick(e) {
  if (!isSelectionMode) return;
  e.preventDefault();
  e.stopPropagation();
  
  if (hoveredElement) {
    extractComponent(hoveredElement);
    stopSelectionMode();
  }
}

function highlightElement(element) {
  removeHighlight();
  
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.id = 'clipponent-highlight';
  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 3px solid #667eea;
    background: rgba(102, 126, 234, 0.1);
    pointer-events: none;
    z-index: 999999;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
  `;
  document.body.appendChild(highlight);
}

function removeHighlight() {
  const highlight = document.getElementById('clipponent-highlight');
  if (highlight) highlight.remove();
}

function showInstructionOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'clipponent-instruction';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    z-index: 1000000;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  overlay.innerHTML = `
    🎯 Click any element to extract
    <button id="clipponent-cancel" style="
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    ">Cancel</button>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('clipponent-cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    stopSelectionMode();
  });
}

function removeInstructionOverlay() {
  const overlay = document.getElementById('clipponent-instruction');
  if (overlay) overlay.remove();
}

function extractComponent(element) {
  const html = element.outerHTML;
  const primarySelector = generateSelector(element);
  const extractedCSS = extractAllStylesheetRules(element);
  
  extractedCSS.keyframes = collectUsedKeyframes(extractedCSS, element);
  
  let fullCSS = '';

  if (Object.keys(extractedCSS.mainStyles).length > 0) {
    const mainString = Object.entries(extractedCSS.mainStyles)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join('\n');
    fullCSS += `${primarySelector} {\n${mainString}\n}`;
  }

  Object.entries(extractedCSS.childStyles).forEach(([selector, props]) => {
    const childString = Object.entries(props)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join('\n');
    fullCSS += `\n\n${selector} {\n${childString}\n}`;
  });

  Object.entries(extractedCSS.pseudoElements).forEach(([pseudo, props]) => {
    const pseudoString = Object.entries(props)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join('\n');
    fullCSS += `\n\n${primarySelector}${pseudo} {\n${pseudoString}\n}`;
  });

  Object.entries(extractedCSS.pseudoClasses).forEach(([pseudoClass, props]) => {
    const pseudoString = Object.entries(props)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join('\n');
    fullCSS += `\n\n${primarySelector}${pseudoClass} {\n${pseudoString}\n}`;
  });

  Object.entries(extractedCSS.mediaQueries).forEach(([mediaQuery, props]) => {
    const breakpointString = Object.entries(props)
      .map(([prop, val]) => `    ${prop}: ${val};`)
      .join('\n');
    fullCSS += `\n\n@media ${mediaQuery} {\n  ${primarySelector} {\n${breakpointString}\n  }\n}`;
  });

  if (extractedCSS.keyframes && extractedCSS.keyframes.length > 0) {
    extractedCSS.keyframes.forEach(keyframeData => {
      const keyframeString = Object.entries(keyframeData.rules)
        .map(([key, props]) => {
          const propsString = Object.entries(props)
            .map(([prop, val]) => `    ${prop}: ${val};`)
            .join('\n');
          return `  ${key} {\n${propsString}\n  }`;
        })
        .join('\n');
      fullCSS += `\n\n@keyframes ${keyframeData.name} {\n${keyframeString}\n}`;
    });
  }

  // Try to send message to popup extension pages
  try {
    chrome.runtime.sendMessage({
      action: 'componentExtracted',
      data: {
        html: formatHTML(html),
        css: fullCSS,
        stats: {
          mainStyles: Object.keys(extractedCSS.mainStyles).length,
          childStyles: Object.keys(extractedCSS.childStyles).length,
          pseudoElements: Object.keys(extractedCSS.pseudoElements).length,
          pseudoClasses: Object.keys(extractedCSS.pseudoClasses).length,
          mediaQueries: Object.keys(extractedCSS.mediaQueries).length,
          keyframes: extractedCSS.keyframes.length
        }
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Could not send to popup:', chrome.runtime.lastError.message);
      } else {
        console.log('Data sent to popup successfully');
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function extractAllStylesheetRules(rootElement) {
  const result = {
    mainStyles: {},
    childStyles: {},
    pseudoElements: {},
    pseudoClasses: {},
    mediaQueries: {},
    keyframes: []
  };

  const stylesheets = Array.from(document.styleSheets);
  const processedKeyframes = new Set();
  const allElements = [rootElement, ...rootElement.querySelectorAll('*')];

  stylesheets.forEach(sheet => {
    try {
      processStylesheet(sheet, allElements, rootElement, result, processedKeyframes);
    } catch (e) {}
  });

  return result;
}

function processStylesheet(sheet, allElements, rootElement, result, processedKeyframes) {
  const rules = Array.from(sheet.cssRules || sheet.rules || []);

  rules.forEach(rule => {
    if (rule.type === CSSRule.STYLE_RULE) {
      processStyleRule(rule, allElements, rootElement, result);
    } else if (rule.type === CSSRule.MEDIA_RULE) {
      processMediaRule(rule, allElements, rootElement, result);
    } else if (rule.type === CSSRule.KEYFRAMES_RULE) {
      processKeyframesRule(rule, result, processedKeyframes, rootElement);
    }
  });
}

function processStyleRule(rule, allElements, rootElement, result) {
  const selectorText = rule.selectorText;
  if (!selectorText || isGenericSelector(selectorText)) return;

  const pseudoElementMatch = selectorText.match(/::(before|after)|:(before|after)/);
  if (pseudoElementMatch) {
    const baseSelector = selectorText.replace(/::(before|after)|:(before|after)/g, '').trim();
    try {
      if (rootElement.matches(baseSelector) && !isGenericSelector(baseSelector)) {
        const pseudoKey = pseudoElementMatch[0].startsWith('::') ? pseudoElementMatch[0] : '::' + pseudoElementMatch[1];
        if (!result.pseudoElements[pseudoKey]) {
          result.pseudoElements[pseudoKey] = {};
        }
        mergeStyles(result.pseudoElements[pseudoKey], rule.style, rootElement);
      }
    } catch (e) {}
    return;
  }

  const pseudoClassMatch = selectorText.match(/:(hover|active|focus|focus-within|visited|disabled|checked)/);
  if (pseudoClassMatch) {
    const baseSelector = selectorText.replace(/:(hover|active|focus|focus-within|visited|disabled|checked)/g, '').trim();
    try {
      if (rootElement.matches(baseSelector) && !isGenericSelector(baseSelector)) {
        const pseudoKey = pseudoClassMatch[0];
        if (!result.pseudoClasses[pseudoKey]) {
          result.pseudoClasses[pseudoKey] = {};
        }
        mergeStyles(result.pseudoClasses[pseudoKey], rule.style, rootElement);
      }
    } catch (e) {}
    return;
  }

  allElements.forEach(element => {
    try {
      if (element.matches(selectorText)) {
        if (element === rootElement) {
          mergeStyles(result.mainStyles, rule.style, rootElement);
        } else {
          const childSelector = generateSelectorForChild(element, rootElement);
          if (!result.childStyles[childSelector]) {
            result.childStyles[childSelector] = {};
          }
          mergeStyles(result.childStyles[childSelector], rule.style, element);
        }
      }
    } catch (e) {}
  });
}

function isGenericSelector(selector) {
  const trimmed = selector.trim();
  if (trimmed === '*' || trimmed === 'body' || trimmed === 'html') return true;
  
  const genericTags = /^(div|span|p|a|button|input|textarea|select|ul|li|h[1-6]|section|article|nav|header|footer|main)$/i;
  if (genericTags.test(trimmed)) return true;
  
  if (trimmed.startsWith('body ') || trimmed.startsWith('html ') || 
      trimmed.startsWith('body>') || trimmed.startsWith('html>')) return true;
  
  if (/^\[.+\]$/.test(trimmed)) return true;
  
  return false;
}

function processMediaRule(mediaRule, allElements, rootElement, result) {
  const mediaQuery = mediaRule.conditionText || mediaRule.media.mediaText;
  const mediaRules = Array.from(mediaRule.cssRules || []);

  mediaRules.forEach(rule => {
    if (rule.type === CSSRule.STYLE_RULE) {
      const selectorText = rule.selectorText;
      if (isGenericSelector(selectorText)) return;

      try {
        if (rootElement.matches(selectorText)) {
          if (!result.mediaQueries[mediaQuery]) {
            result.mediaQueries[mediaQuery] = {};
          }
          mergeStyles(result.mediaQueries[mediaQuery], rule.style, rootElement);
        }
      } catch (e) {}
    }
  });
}

function processKeyframesRule(rule, result, processedKeyframes, rootElement) {
  if (!processedKeyframes.has(rule.name)) {
    processedKeyframes.add(rule.name);
  }
}

function collectUsedKeyframes(extractedCSS, rootElement) {
  const usedKeyframes = new Set();
  
  const checkForAnimations = (styles) => {
    Object.entries(styles).forEach(([prop, value]) => {
      if (prop === 'animation' || prop === 'animation-name') {
        const names = value.split(',').map(v => v.trim().split(/\s+/)[0]);
        names.forEach(name => {
          if (name && name !== 'none') {
            usedKeyframes.add(name);
          }
        });
      }
    });
  };
  
  checkForAnimations(extractedCSS.mainStyles);
  Object.values(extractedCSS.childStyles).forEach(checkForAnimations);
  Object.values(extractedCSS.pseudoElements).forEach(checkForAnimations);
  Object.values(extractedCSS.pseudoClasses).forEach(checkForAnimations);
  Object.values(extractedCSS.mediaQueries).forEach(checkForAnimations);
  
  const keyframes = [];
  usedKeyframes.forEach(animationName => {
    const keyframe = extractKeyframe(animationName, rootElement);
    if (keyframe) {
      keyframes.push(keyframe);
    }
  });
  
  return keyframes;
}

function extractKeyframe(animationName, rootElement) {
  const stylesheets = Array.from(document.styleSheets);
  
  for (const sheet of stylesheets) {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      
      for (const rule of rules) {
        if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === animationName) {
          const keyframeRules = Array.from(rule.cssRules);
          const keyframeData = {};
          
          keyframeRules.forEach(kfRule => {
            const keyText = kfRule.keyText;
            const cssText = kfRule.style.cssText;
            
            if (cssText) {
              const declarations = parseCSSDeclarations(cssText);
              const styles = {};
              
              declarations.forEach(({ prop, value, priority }) => {
                if (value.includes('var(')) {
                  value = resolveCSSVariables(value, rootElement);
                }
                styles[prop] = priority ? `${value} !important` : value;
              });
              
              keyframeData[keyText] = styles;
            }
          });
          
          return {
            name: animationName,
            rules: keyframeData
          };
        }
      }
    } catch (e) {}
  }
  
  return null;
}

function mergeStyles(target, styleDeclaration, element) {
  const cssText = styleDeclaration.cssText;
  if (!cssText) return;

  const declarations = parseCSSDeclarations(cssText);
  
  declarations.forEach(({ prop, value, priority }) => {
    if (value.includes('var(')) {
      value = resolveCSSVariables(value, element);
    }

    target[prop] = priority ? `${value} !important` : value;
  });
}

function resolveCSSVariables(value, element) {
  const computed = window.getComputedStyle(element);

  return value.replace(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/g, (match, varName, fallback) => {
    const resolvedValue = computed.getPropertyValue(varName).trim();
    return resolvedValue || fallback || match;
  });
}

function generateSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      return `.${classes[0]}`;
    }
  }

  let selector = element.tagName.toLowerCase();

  if (element.parentElement) {
    const siblings = Array.from(element.parentElement.children);
    const index = siblings.indexOf(element) + 1;
    selector += `:nth-child(${index})`;
  }

  return selector;
}

function generateSelectorForChild(element, root) {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c => c);
    if (classes.length > 0) {
      return `.${classes[0]}`;
    }
  }

  let path = [];
  let current = element;

  while (current && current !== root && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector = `.${classes[0]}`;
      }
    }

    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        el => el.tagName === current.tagName
      );

      if (siblings.length > 1 && !selector.startsWith('.')) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  const rootSelector = generateSelector(root);
  return `${rootSelector} ${path.join(' ')}`;
}

function formatHTML(html) {
  return html
    .replace(/></g, '>\n<')
    .replace(/(<\w[^>]*>)/g, '\n$1')
    .trim();
}