// ==UserScript==
// @name         WebVisu Canvas Watcher
// @namespace    https://example.com/webvisu-canvas-watcher
// @version      0.4.0
// @description  Select multiple WebVisu canvases and push their value changes (including SPS variable data) to a backend endpoint.
// @author       You
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @connect      *
// ==/UserScript==

(function() {
  "use strict";

  // Access page window (for Tampermonkey's isolated scope)
  const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  const defaults = {
    backendUrl: "http://localhost:5002/api/canvas-update",
    eventUrl: "http://localhost:5002/events",
    pollingMs: 1000,
    sendSnapshot: false
  };

  const HOVER_CLASS = "wv-canvas-watcher-hover";
  const SELECTED_CLASS = "wv-canvas-watcher-selected";
  const BLOCKER_ID = "wv-canvas-watcher-blocker";

  const state = {
    backendUrl: GM_getValue("backendUrl", defaults.backendUrl),
    eventUrl: GM_getValue("eventUrl", defaults.eventUrl),
    pollingMs: GM_getValue("pollingMs", defaults.pollingMs),
    sendSnapshot: GM_getValue("sendSnapshot", defaults.sendSnapshot),
    canvasNames: GM_getValue("canvasNames", {}),
    watchers: [],
    selecting: false,
    hovered: null
  };

  const updateQueue = [];
  let updateTimer = null;

  function getBackendBase() {
    try {
      const url = new URL(state.backendUrl);
      return url.origin;
    } catch (e) {
      return (state.backendUrl || "").replace(/\/api\/canvas-update$/, "").replace(/\/$/, "");
    }
  }

  function getApiUrl(path) {
    const base = getBackendBase();
    if (!path.startsWith("/")) return `${base}/${path}`;
    return `${base}${path}`;
  }

  const log = () => {}; // disabled
  const warn = () => {}; // disabled

  // Inject the SPS value tracker if it doesn't exist
  function injectSPSValueTracker() {
    if (pageWindow.spsValueTracker) {
      log("spsValueTracker already exists, skipping injection");
      return;
    }

    const script = document.createElement('script');
    script.textContent = `
(function() {
  window.spsValueTracker = {
    lastReceivedValues: [],
    tagValuePairs: [],
    valueToTagMap: new Map(),
    canvasTextDraws: [],
    valueToCanvasMap: new Map(),
    tagToCanvasMap: new Map(),
    startTracking: function() {
      var tracker = this;
      var originalFillText = CanvasRenderingContext2D.prototype.fillText;
      var originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

      CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        tracker.recordCanvasDraw(this.canvas, text, x, y, 'fill');
        return originalFillText.apply(this, arguments);
      };

      CanvasRenderingContext2D.prototype.strokeText = function(text, x, y) {
        tracker.recordCanvasDraw(this.canvas, text, x, y, 'stroke');
        return originalStrokeText.apply(this, arguments);
      };

      console.log('[spsValueTracker] Canvas value tracking started');
    },
    recordCanvasDraw: function(canvas, text, x, y, type) {
      var timestamp = Date.now();
      var canvasId = canvas.id || 'canvas-' + this.getCanvasIndex(canvas);
      var textStr = String(text).trim();
      var draw = {
        canvasId: canvasId,
        text: textStr,
        x: Math.round(x),
        y: Math.round(y),
        type: type,
        timestamp: timestamp
      };
      this.canvasTextDraws.push(draw);

      // Match both short tags (AB123) and long descriptive labels (FAN001 - Description)
      var isLabel = /^[A-Z]{2,3}\\d{3,4}$/.test(textStr) || /^[A-Z]+\\d+\\s*-\\s*.+/.test(textStr);
      if (isLabel) {
        console.log('[spsValueTracker] Label drawn:', textStr, 'at', canvasId + ':' + draw.x + ':' + draw.y);
      }

      // Match numbers with optional units (%, h, Pa, etc.)
      // Pattern: optional minus, digits, optional decimal point and more digits, optional whitespace, optional unit
      var numericMatch = textStr.match(/^(-?\\d+\\.?\\d*|-?\\d*\\.\\d+)\\s*(%|h|Pa|°C|°F|bar|mbar|kPa|MPa|Hz|kW|MW|V|A|mA)?$/);
      var isNumeric = numericMatch !== null;
      var cleanValue = isNumeric ? numericMatch[1] : null;

      if (isNumeric && cleanValue && this.lastReceivedValues.indexOf(cleanValue) !== -1) {
        var key = canvasId + ':' + draw.x + ':' + draw.y;
        console.log('[spsValueTracker] Numeric value drawn:', textStr, '(clean:', cleanValue, ') at', key, '- searching for label...');

        var nearbyLabel = this.findNearbyLabel(canvasId, draw.x, draw.y, timestamp);

        this.valueToCanvasMap.set(key, {
          value: textStr,
          label: nearbyLabel,
          timestamp: timestamp
        });

        if (nearbyLabel) {
          console.log('[spsValueTracker] ✓ Value mapped:', nearbyLabel, '=', textStr, 'at', key);
        } else {
          console.log('[spsValueTracker] ✗ No label found for value:', textStr, 'at', key);
        }
      }

      if (this.canvasTextDraws.length > 200) {
        this.canvasTextDraws.shift();
      }
    },
    findNearbyLabel: function(canvasId, x, y, timestamp) {
      var maxHorizontalDist = 150;
      var maxVerticalDist = 50;
      var maxTimeDiff = 2000;
      var candidates = [];

      for (var i = this.canvasTextDraws.length - 1; i >= 0; i--) {
        var draw = this.canvasTextDraws[i];
        if (draw.canvasId !== canvasId) continue;
        if (timestamp - draw.timestamp > maxTimeDiff) break;

        // Match both short tags (AB123) and long descriptive labels (FAN001 - Description)
        var isLabel = /^[A-Z]{2,3}\\d{3,4}$/.test(draw.text) || /^[A-Z]+\\d+\\s*-\\s*.+/.test(draw.text);
        if (!isLabel) continue;

        var dx = draw.x - x;
        var dy = draw.y - y;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);

        if (absDx < maxHorizontalDist && absDy < maxVerticalDist) {
          var distance = Math.sqrt(dx * dx + dy * dy);
          var score = distance;

          if (dy < 0) {
            score = distance * 0.3;
          } else if (dy > 0) {
            score = distance * 2.0;
          }

          candidates.push({
            label: draw.text,
            distance: distance,
            score: score,
            dx: dx,
            dy: dy
          });
        }
      }

      if (candidates.length > 0) {
        candidates.sort(function(a, b) { return a.score - b.score; });
        return candidates[0].label;
      }
      return null;
    },
    getCanvasIndex: function(canvas) {
      var canvases = document.getElementsByTagName('canvas');
      for (var i = 0; i < canvases.length; i++) {
        if (canvases[i] === canvas) return i;
      }
      return -1;
    },
    updateReceivedValues: function(values) {
      this.lastReceivedValues = values;
    },
    updateTagValuePairs: function(pairs) {
      this.tagValuePairs = pairs;
      this.valueToTagMap.clear();
      for (var i = 0; i < pairs.length; i++) {
        this.valueToTagMap.set(pairs[i].value, pairs[i].tag);
      }
    },
    getCanvasLocation: function(value) {
      var results = [];
      this.valueToCanvasMap.forEach(function(data, key) {
        if (data.value === value) {
          results.push({location: key, label: data.label});
        }
      });
      return results;
    },
    getVariableInfo: function(tag) {
      var result = null;
      this.valueToCanvasMap.forEach(function(data, key) {
        if (data.label === tag) {
          result = {
            tag: tag,
            value: data.value,
            location: key,
            timestamp: data.timestamp
          };
        }
      });
      return result;
    },
    showMappings: function() {
      console.table(Array.from(this.valueToCanvasMap.entries()).map(function(e) {
        return {
          location: e[0],
          label: e[1].label || '(no label)',
          value: e[1].value
        };
      }));
    },
    showVariables: function() {
      var result = [];
      var labelsSeen = {};
      this.valueToCanvasMap.forEach(function(data, key) {
        if (data.label && !labelsSeen[data.label]) {
          labelsSeen[data.label] = true;
          result.push({
            variable: data.label,
            value: data.value,
            location: key
          });
        }
      });
      console.table(result);
    },
    showAllValues: function() {
      var result = [];
      this.valueToCanvasMap.forEach(function(data, key) {
        var coords = key.split(':');
        result.push({
          canvas: coords[0],
          x: coords[1],
          y: coords[2],
          label: data.label || '(unlabeled)',
          value: data.value
        });
      });
      console.table(result);
    }
  };

  if (typeof CanvasRenderingContext2D !== 'undefined') {
    window.spsValueTracker.startTracking();
  }
})();
`;
    document.documentElement.appendChild(script);
    log("SPS value tracker injected into page");
  }

  // Inject early, before webvisu initializes
  injectSPSValueTracker();

  function injectStyles() {
    const css = `
.${HOVER_CLASS} { outline: 2px dashed rgba(33,150,243,0.8) !important; outline-offset: 2px; }
.${SELECTED_CLASS} { outline: 2px solid rgba(255,87,34,0.9) !important; outline-offset: 2px; }
#${BLOCKER_ID} {
  position: fixed; top:0; left:0; width:100%; height:100%;
  z-index: 99998; background: rgba(0,0,0,0.03); cursor: crosshair;
}
`;
    if (typeof GM_addStyle === "function") GM_addStyle(css);
    else {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
  injectStyles();

  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
      hash &= 0xffffffff;
    }
    return (hash >>> 0).toString(16);
  }

  function pickCanvas() {
    if (state.selecting) return;

    const allCanvases = Array.from(document.querySelectorAll("canvas"));
    if (allCanvases.length === 0) {
      alert("No canvas elements found on this page.");
      return;
    }

    showCanvasPicker(allCanvases);
  }

  function getCanvasValues(canvas) {
    if (!pageWindow.spsValueTracker || !pageWindow.spsValueTracker.valueToCanvasMap) {
      log("spsValueTracker not available or no valueToCanvasMap");
      return [];
    }

    const canvasId = canvas.id || 'canvas-' + Array.from(document.querySelectorAll('canvas')).indexOf(canvas);
    const values = [];

    log("Getting values for canvasId:", canvasId, "Map size:", pageWindow.spsValueTracker.valueToCanvasMap.size);

    // Helper function to check if a canvas ID matches (handles WebVisu's dynamic IDs)
    const canvasIdMatches = (keyCanvasId) => {
      // Exact match
      if (keyCanvasId === canvasId) return true;

      // WebVisu canvas ID patterns:
      // - Stored keys: "cdsCanvas_1_12_2", "cdsCanvas_1_12_15" (shorter, during tracking)
      // - Current canvas: "cdsCanvas_1_32747" or "cdsCanvas_1_12_1_1_32747" (longer, after page switch)

      const canvasParts = canvasId.split('_');
      const keyParts = keyCanvasId.split('_');

      // Extract last numeric parts for comparison
      const canvasLastNum = canvasParts[canvasParts.length - 1];
      const keyLastNum = keyParts[keyParts.length - 1];
      const bothHaveNumericEnd = /^\d+$/.test(canvasLastNum) && /^\d+$/.test(keyLastNum);

      // Strategy 1: Check if keyCanvasId is a prefix of canvasId
      // e.g., "cdsCanvas_1_12_30" starts with "cdsCanvas_1_12_30_"
      if (canvasId.startsWith(keyCanvasId + '_')) return true;

      // Strategy 2: Check if canvasId is a prefix of keyCanvasId
      // e.g., "cdsCanvas_1_12_30" is prefix of "cdsCanvas_1_12_30_extra"
      if (keyCanvasId.startsWith(canvasId + '_')) return true;

      // Strategy 3: Match if they share first 3 parts AND same last number
      // e.g., "cdsCanvas_1_12_30" matches "cdsCanvas_1_12_..._30"
      // This handles: cdsCanvas_1_12_30 ↔ cdsCanvas_1_12_1_1_30
      if (canvasParts.length >= 4 && keyParts.length >= 4 && bothHaveNumericEnd && canvasLastNum === keyLastNum) {
        const canvasPrefix = canvasParts.slice(0, 3).join('_');
        const keyPrefix = keyParts.slice(0, 3).join('_');
        if (canvasPrefix === keyPrefix) return true;
      }

      // Strategy 4: Match if they share first 2 parts AND same last number
      // e.g., "cdsCanvas_1_30" matches "cdsCanvas_1_..._30"
      if (canvasParts.length >= 3 && keyParts.length >= 3 && bothHaveNumericEnd && canvasLastNum === keyLastNum) {
        const canvasBase = canvasParts.slice(0, 2).join('_');
        const keyBase = keyParts.slice(0, 2).join('_');
        if (canvasBase === keyBase) return true;
      }

      return false;
    };

    // Track the most recent value for each label (or location if unlabeled)
    const labelMap = new Map(); // key: label or "unlabeled:x:y", value: {data, timestamp}

    pageWindow.spsValueTracker.valueToCanvasMap.forEach((data, key) => {
      const keyParts = key.split(':');
      const keyCanvasId = keyParts[0];

      log("Checking key:", key, "against canvasId:", canvasId);

      if (canvasIdMatches(keyCanvasId)) {
        const x = keyParts[1];
        const y = keyParts[2];

        // Use label as key if available, otherwise use location
        const mapKey = data.label ? data.label : `unlabeled:${x}:${y}`;

        // Keep only the most recent value for each label/location
        if (!labelMap.has(mapKey) || labelMap.get(mapKey).timestamp < data.timestamp) {
          labelMap.set(mapKey, { data, timestamp: data.timestamp });
        }
      }
    });

    // Now extract unique current values
    labelMap.forEach(({data}) => {
      const display = data.label ? `${data.label}=${data.value}` : data.value;
      values.push(display);
      log("Added current value:", display);
    });

    log("Final values for", canvasId, ":", values);
    return values;
  }

  function extractSPSValues(canvas) {
    if (!pageWindow.spsValueTracker || !pageWindow.spsValueTracker.valueToCanvasMap) {
      return [];
    }

    const canvasId = canvas.id || 'canvas-' + Array.from(document.querySelectorAll('canvas')).indexOf(canvas);
    const values = [];

    // Helper function to check if a canvas ID matches (handles WebVisu's dynamic IDs)
    const canvasIdMatches = (keyCanvasId) => {
      // Exact match
      if (keyCanvasId === canvasId) return true;

      // WebVisu canvas ID patterns:
      // - Stored keys: "cdsCanvas_1_12_2", "cdsCanvas_1_12_15" (shorter, during tracking)
      // - Current canvas: "cdsCanvas_1_32747" or "cdsCanvas_1_12_1_1_32747" (longer, after page switch)

      const canvasParts = canvasId.split('_');
      const keyParts = keyCanvasId.split('_');

      // Extract last numeric parts for comparison
      const canvasLastNum = canvasParts[canvasParts.length - 1];
      const keyLastNum = keyParts[keyParts.length - 1];
      const bothHaveNumericEnd = /^\d+$/.test(canvasLastNum) && /^\d+$/.test(keyLastNum);

      // Strategy 1: Check if keyCanvasId is a prefix of canvasId
      // e.g., "cdsCanvas_1_12_30" starts with "cdsCanvas_1_12_30_"
      if (canvasId.startsWith(keyCanvasId + '_')) return true;

      // Strategy 2: Check if canvasId is a prefix of keyCanvasId
      // e.g., "cdsCanvas_1_12_30" is prefix of "cdsCanvas_1_12_30_extra"
      if (keyCanvasId.startsWith(canvasId + '_')) return true;

      // Strategy 3: Match if they share first 3 parts AND same last number
      // e.g., "cdsCanvas_1_12_30" matches "cdsCanvas_1_12_..._30"
      // This handles: cdsCanvas_1_12_30 ↔ cdsCanvas_1_12_1_1_30
      if (canvasParts.length >= 4 && keyParts.length >= 4 && bothHaveNumericEnd && canvasLastNum === keyLastNum) {
        const canvasPrefix = canvasParts.slice(0, 3).join('_');
        const keyPrefix = keyParts.slice(0, 3).join('_');
        if (canvasPrefix === keyPrefix) return true;
      }

      // Strategy 4: Match if they share first 2 parts AND same last number
      // e.g., "cdsCanvas_1_30" matches "cdsCanvas_1_..._30"
      if (canvasParts.length >= 3 && keyParts.length >= 3 && bothHaveNumericEnd && canvasLastNum === keyLastNum) {
        const canvasBase = canvasParts.slice(0, 2).join('_');
        const keyBase = keyParts.slice(0, 2).join('_');
        if (canvasBase === keyBase) return true;
      }

      return false;
    };

    // Track the most recent value for each label (or location if unlabeled)
    const labelMap = new Map(); // key: label or "unlabeled:x:y", value: {data, x, y, timestamp}

    pageWindow.spsValueTracker.valueToCanvasMap.forEach((data, key) => {
      const coords = key.split(':');
      const keyCanvasId = coords[0];

      if (canvasIdMatches(keyCanvasId)) {
        const x = parseInt(coords[1]);
        const y = parseInt(coords[2]);

        // Use label as key if available, otherwise use location
        const mapKey = data.label ? data.label : `unlabeled:${x}:${y}`;

        // Keep only the most recent value for each label/location
        if (!labelMap.has(mapKey) || labelMap.get(mapKey).timestamp < data.timestamp) {
          labelMap.set(mapKey, { data, x, y, timestamp: data.timestamp });
        }
      }
    });

    // Now extract unique current values
    labelMap.forEach(({data, x, y}) => {
      values.push({
        tag: data.label || null,
        value: data.value,
        x: x,
        y: y,
        timestamp: data.timestamp
      });
    });

    return values;
  }

  function getCanvasKey(canvas, fallbackIdx) {
    if (canvas.dataset.wvCanvasKey) return canvas.dataset.wvCanvasKey;
    const all = Array.from(document.querySelectorAll("canvas"));
    const idx = typeof fallbackIdx === "number" ? fallbackIdx : all.indexOf(canvas);
    const key = canvas.id || (idx >= 0 ? `canvas-${idx}` : `canvas-${Date.now()}`);
    canvas.dataset.wvCanvasKey = key;
    return key;
  }

  function saveCanvasName(canvas, name, fallbackIdx) {
    const trimmed = (name || "").trim();
    const key = getCanvasKey(canvas, fallbackIdx);
    if (trimmed) {
      state.canvasNames[key] = trimmed;
      canvas.setAttribute("data-name", trimmed);
    } else {
      delete state.canvasNames[key];
      canvas.removeAttribute("data-name");
    }
    GM_setValue("canvasNames", state.canvasNames);
    return trimmed;
  }

  function getCanvasName(canvas, fallbackIdx) {
    const key = getCanvasKey(canvas, fallbackIdx);
    const fromAttr = (canvas.getAttribute("data-name") || "").trim();
    const stored = (state.canvasNames[key] || "").trim();
    const resolved = fromAttr || stored;
    if (resolved && !fromAttr) {
      canvas.setAttribute("data-name", resolved);
    }
    return resolved;
  }

  function isCanvasWatched(canvas) {
    return state.watchers.some(w => w.canvas === canvas || (w.canvas && canvas && w.canvas.id && w.canvas.id === canvas.id));
  }

  function findCanvasForStored(stored) {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    return canvases.find(c => {
      const byId = stored.canvasId && c.id === stored.canvasId;
      const storedName = (stored.canvasName || "").trim();
      const matchName = storedName && getCanvasName(c) === storedName;
      const attrMatch = storedName && (c.getAttribute("data-name") || "").trim() === storedName;
      return byId || matchName || attrMatch;
    });
  }

  function showCanvasPicker(canvases) {
    state.selecting = true;
    const selectedCanvases = [];

    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background: white; border-radius: 8px;
      max-width: 600px; max-height: 80vh;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex; flex-direction: column;
    `;

    const header = document.createElement("div");
    header.style.cssText = "padding: 20px 20px 10px 20px; border-bottom: 1px solid #ddd;";

    const title = document.createElement("h2");
    title.textContent = `Select Canvas (${canvases.length} found)`;
    title.style.marginTop = "0";
    header.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = "Click to select multiple canvases. Press Done when finished.";
    subtitle.style.cssText = "margin: 8px 0 0 0; color: #666; font-size: 14px;";
    header.appendChild(subtitle);

    panel.appendChild(header);

    const scrollContainer = document.createElement("div");
    scrollContainer.style.cssText = "flex: 1; overflow-y: auto; padding: 10px 20px;";

    const list = document.createElement("div");
    const headerLabel = document.createElement("div");
    headerLabel.style.cssText = "font-size: 12px; color: #444; margin-bottom: 4px;";
    headerLabel.textContent = "Green items are already being watched.";
    list.appendChild(headerLabel);

    canvases.forEach((canvas, idx) => {
      const rect = canvas.getBoundingClientRect();
      const item = document.createElement("div");
      const alreadyWatched = isCanvasWatched(canvas);
      item.style.cssText = `
        padding: 12px; margin: 8px 0; border: 2px solid #ddd;
        border-radius: 4px; cursor: pointer; background: #f9f9f9;
        transition: all 0.2s;
      `;

      const id = canvas.id || `canvas-${idx}`;
      const zIndex = window.getComputedStyle(canvas).zIndex;
      const classes = canvas.className || "(no class)";
      getCanvasKey(canvas, idx);

      const spsValues = getCanvasValues(canvas);
      const spsValuesDetailed = extractSPSValues(canvas);

      let valuesHtml = '';
      if (spsValues.length > 0) {
        const valuesList = spsValues.slice(0, 5).join(', ');
        const moreCount = spsValues.length > 5 ? ` (+${spsValues.length - 5} more)` : '';
        valuesHtml = `<br><span style="color: #2196f3; font-weight: bold;">Latest Values: ${valuesList}${moreCount}</span>`;
      }

      // Get the most recent value (by timestamp) for this canvas
      let lastInterceptHtml = '';
      if (spsValuesDetailed.length > 0) {
        const mostRecent = spsValuesDetailed.reduce((prev, current) =>
          (current.timestamp > prev.timestamp) ? current : prev
        );
        const timeAgo = mostRecent.timestamp ? ` (${Math.round((Date.now() - mostRecent.timestamp) / 1000)}s ago)` : '';
        const labelText = mostRecent.tag ? `${mostRecent.tag} = ${mostRecent.value}` : mostRecent.value;
        lastInterceptHtml = `<br><span style="color: #ff5722; font-size: 12px;">Last Intercept: ${labelText}${timeAgo}</span>`;
      } else {
        lastInterceptHtml = `<br><span style="color: #999; font-size: 12px;">Last Intercept: (none detected yet)</span>`;
      }

      item.innerHTML = `
        <strong>Canvas #${idx}</strong><br>
        ID: ${id}<br>
        Size: ${canvas.width}×${canvas.height}px<br>
        Position: ${Math.round(rect.left)},${Math.round(rect.top)}<br>
        Z-Index: ${zIndex}<br>
        Classes: ${classes}${valuesHtml}${lastInterceptHtml}
      `;

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.placeholder = "Optional name (Prometheus label)";
      nameInput.value = getCanvasName(canvas, idx);
      nameInput.style.cssText = "width: 90%; margin-top: 6px; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px;";
      nameInput.oninput = () => {
        saveCanvasName(canvas, nameInput.value, idx);
      };

      item.onmouseenter = () => {
        if (!selectedCanvases.includes(canvas)) {
          item.style.background = "#e3f2fd";
          item.style.borderColor = "#2196f3";
        }
        canvas.classList.add(HOVER_CLASS);
      };

      item.onmouseleave = () => {
        if (!selectedCanvases.includes(canvas)) {
          item.style.background = "#f9f9f9";
          item.style.borderColor = "#ddd";
        }
        canvas.classList.remove(HOVER_CLASS);
      };

      item.onclick = () => {
        const idx = selectedCanvases.indexOf(canvas);
        if (idx === -1) {
          selectedCanvases.push(canvas);
          item.style.background = "#c8e6c9";
          item.style.borderColor = "#4caf50";
          canvas.classList.add(SELECTED_CLASS);
        } else {
          selectedCanvases.splice(idx, 1);
          item.style.background = "#f9f9f9";
          item.style.borderColor = "#ddd";
          canvas.classList.remove(SELECTED_CLASS);
        }
        updateDoneButton();
      };

      item.appendChild(nameInput);
      if (alreadyWatched) {
        selectedCanvases.push(canvas);
        item.style.background = "#c8e6c9";
        item.style.borderColor = "#4caf50";
        canvas.classList.add(SELECTED_CLASS);
      }
      list.appendChild(item);
    });

    scrollContainer.appendChild(list);
    panel.appendChild(scrollContainer);

    const footer = document.createElement("div");
    footer.style.cssText = `
      padding: 16px 20px;
      border-top: 1px solid #ddd;
      background: white;
      border-radius: 0 0 8px 8px;
    `;

    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = "display: flex; gap: 8px;";

    const doneBtn = document.createElement("button");
    doneBtn.textContent = `Done (0 selected)`;
    doneBtn.style.cssText = `
      flex: 1; padding: 8px 16px; cursor: pointer;
      background: #4caf50; color: white; border: none;
      border-radius: 4px; font-size: 14px;
    `;
    doneBtn.onclick = () => {
      closeModal();
      if (selectedCanvases.length > 0) {
        processSelectedCanvases(selectedCanvases);
      }
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      flex: 1; padding: 8px 16px; cursor: pointer;
      background: #f44336; color: white; border: none;
      border-radius: 4px; font-size: 14px;
    `;
    cancelBtn.onclick = closeModal;

    buttonContainer.appendChild(doneBtn);
    buttonContainer.appendChild(cancelBtn);
    footer.appendChild(buttonContainer);
    panel.appendChild(footer);

    function updateDoneButton() {
      doneBtn.textContent = `Done (${selectedCanvases.length} selected)`;
    }

    updateDoneButton();

    const originalClick = list.onclick;
    list.onclick = function(e) {
      if (originalClick) originalClick.call(this, e);
      updateDoneButton();
    };

    function closeModal() {
      canvases.forEach(c => {
        c.classList.remove(HOVER_CLASS);
        if (!state.watchers.find(w => w.canvas === c)) {
          c.classList.remove(SELECTED_CLASS);
        }
      });
      modal.remove();
      state.selecting = false;
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", onKeyDown);
      }
    }

    function onBackgroundClick(e) {
      if (e.target === modal) {
        closeModal();
        document.removeEventListener("keydown", onKeyDown);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    modal.addEventListener("click", onBackgroundClick);

    modal.appendChild(panel);
    document.body.appendChild(modal);
  }

  function processSelectedCanvases(canvases) {
    if (canvases.length === 0) return;

    console.log(`[Canvas Watcher] Processing ${canvases.length} selected canvas(es)`);

    // Watch entire canvas by default (no region selection confirmation)
    canvases.forEach(canvas => {
      console.log(`[Canvas Watcher] Adding watcher for canvas:`, canvas.id);
      addWatcher(canvas, null);
    });
  }

  function selectRegion(canvas) {
    warn("Click and drag on the canvas to select a region. Press Esc to cancel.");

    let dragRect = null;
    let dragStart = null;

    canvas.classList.add(HOVER_CLASS);

    function onMouseDown(e) {
      if (e.target !== canvas) return;
      dragStart = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!dragStart) return;

      if (!dragRect) {
        dragRect = document.createElement("div");
        dragRect.style.cssText = `
          position: fixed; border: 2px dashed rgba(255,87,34,0.9);
          background: rgba(255,87,34,0.08); z-index: 99999;
          pointer-events: none;
        `;
        document.body.appendChild(dragRect);
      }

      const x1 = Math.min(dragStart.x, e.clientX);
      const y1 = Math.min(dragStart.y, e.clientY);
      const x2 = Math.max(dragStart.x, e.clientX);
      const y2 = Math.max(dragStart.y, e.clientY);

      dragRect.style.left = x1 + "px";
      dragRect.style.top = y1 + "px";
      dragRect.style.width = x2 - x1 + "px";
      dragRect.style.height = y2 - y1 + "px";
    }

    function onMouseUp(e) {
      if (!dragStart) return;

      const rect = canvas.getBoundingClientRect();
      const x1 = Math.min(dragStart.x, e.clientX) - rect.left;
      const y1 = Math.min(dragStart.y, e.clientY) - rect.top;
      const x2 = Math.max(dragStart.x, e.clientX) - rect.left;
      const y2 = Math.max(dragStart.y, e.clientY) - rect.top;

      const region = {
        x: Math.max(0, Math.floor(x1)),
        y: Math.max(0, Math.floor(y1)),
        w: Math.min(canvas.width, Math.floor(x2 - x1)),
        h: Math.min(canvas.height, Math.floor(y2 - y1))
      };

      cleanup();

      if (region.w > 0 && region.h > 0) {
        addWatcher(canvas, region);
      } else {
        warn("Invalid region selected.");
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        cleanup();
        warn("Region selection cancelled.");
      }
    }

    function cleanup() {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKey, true);
      canvas.classList.remove(HOVER_CLASS);
      if (dragRect && dragRect.parentNode) dragRect.parentNode.removeChild(dragRect);
    }

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKey, true);
  }

  function addWatcher(canvas, region) {
    const id = canvas.id || `watched-canvas-${Date.now()}`;
    canvas.id = id;
    const canvasName = getCanvasName(canvas);

    const existing = state.watchers.find(w => w.canvas === canvas);
    if (existing) {
      log("Canvas already being watched:", id);
      return;
    }

    canvas.classList.add(SELECTED_CLASS);
    const watcher = {
      canvas,
      canvasName,
      region: region || null,
      lastHash: null,
      interval: null
    };
    state.watchers.push(watcher);
    log("Watching canvas:", id, "Polling:", state.pollingMs, "ms", region ? `Region: ${region.x},${region.y} ${region.w}x${region.h}` : "Full canvas");

    // Send initial update immediately
    console.log("[Canvas Watcher] Sending initial update for:", canvasName || id);
    tickWatcher(watcher);

    // Then start polling
    watcher.interval = setInterval(() => tickWatcher(watcher), state.pollingMs);
  }

  function stopWatcher(canvas) {
    if (canvas) {
      const idx = state.watchers.findIndex(w => w.canvas === canvas);
      if (idx !== -1) {
        const watcher = state.watchers[idx];
        if (watcher.interval) clearInterval(watcher.interval);
        if (watcher.canvas) watcher.canvas.classList.remove(SELECTED_CLASS);
        state.watchers.splice(idx, 1);
        log("Stopped watching canvas:", watcher.canvas.id);
      }
    } else {
      state.watchers.forEach(watcher => {
        if (watcher.interval) clearInterval(watcher.interval);
        if (watcher.canvas) watcher.canvas.classList.remove(SELECTED_CLASS);
      });
      state.watchers = [];
      log("Stopped watching all canvases");
    }
  }

  async function tickWatcher(watcher) {
    let { canvas, region, lastHash } = watcher;
    if (!canvas) {
      console.log("[Canvas Watcher] No canvas in watcher");
      return;
    }
    // If the canvas was replaced (e.g., after switching tabs/visus), try to re-bind by id.
    if (!document.contains(canvas) && canvas.id) {
      const replacement = document.getElementById(canvas.id);
      if (replacement && replacement !== canvas) {
        log("Rebinding watcher to new canvas element", canvas.id);
        watcher.canvas = replacement;
        canvas = replacement;
        canvas.classList.add(SELECTED_CLASS);
        if (watcher.canvasName) {
          canvas.setAttribute("data-name", watcher.canvasName);
        }
        watcher.lastHash = null; // force resend
      } else {
        return; // no canvas to watch right now
      }
    }
    let dataUrl;
    try {
      if (region) {
        const temp = document.createElement("canvas");
        temp.width = region.w;
        temp.height = region.h;
        const ctx = temp.getContext("2d");
        ctx.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
        dataUrl = temp.toDataURL("image/png");
      } else {
        dataUrl = canvas.toDataURL("image/png");
      }
    } catch (err) {
      warn("Failed to read canvas", err);
      return;
    }
    const hash = hashString(dataUrl);
    if (hash === lastHash) {
      console.log("[Canvas Watcher] Canvas hash unchanged, skipping update");
      return;
    }
    watcher.lastHash = hash;

    const spsValues = extractSPSValues(canvas);
    console.log(`[Canvas Watcher] Extracted ${spsValues.length} SPS values from canvas`);

    const canvasName = watcher.canvasName || getCanvasName(canvas);
    watcher.canvasName = canvasName;
    if (canvasName) {
      canvas.setAttribute("data-name", canvasName);
    }

    const payload = {
      canvasId: canvas.id,
      width: region ? region.w : canvas.width,
      height: region ? region.h : canvas.height,
      canvasName,
      pageUrl: window.location.href,
      hash,
      timestamp: new Date().toISOString()
    };
    if (region) payload.region = region;
    if (state.sendSnapshot) payload.snapshot = dataUrl;
    if (spsValues.length > 0) payload.spsValues = spsValues;

    console.log("[Canvas Watcher] Queueing update:", {
      canvasId: canvas.id,
      canvasName,
      spsValuesCount: spsValues.length,
      spsValues: spsValues
    });
    queueUpdate(payload);
  }

  function flushQueuedUpdates() {
    if (!updateQueue.length) {
      updateTimer = null;
      return;
    }
    const batch = updateQueue.splice(0, updateQueue.length);
    updateTimer = null;
    sendUpdate(batch);
  }

  function queueUpdate(payload) {
    updateQueue.push(payload);
    if (!updateTimer) {
      updateTimer = setTimeout(flushQueuedUpdates, 1000);
    }
  }

  function sendUpdate(payloadOrBatch) {
    const url = getApiUrl("/api/canvas-update");
    const data = Array.isArray(payloadOrBatch) ? { updates: payloadOrBatch } : payloadOrBatch;
    GM_xmlhttpRequest({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify(data),
      onload: function(response) {
        if (response.status >= 200 && response.status < 300) {
          const count = Array.isArray(data.updates) ? data.updates.length : 1;
          log("Sent update", count);
        } else {
          warn("Failed to send update", response.status, response.statusText);
        }
      },
      onerror: function(err) {
        warn("Failed to send update", err);
      }
    });
  }

  let lastEventSentAt = 0;
  function sendEvent(payload) {
    const now = Date.now();
    if (now - lastEventSentAt < 1000) {
      return; // throttle debug events to at most 1/sec
    }
    lastEventSentAt = now;
    GM_xmlhttpRequest({
      method: "POST",
      url: state.eventUrl,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify(payload),
      onerror: function(err) {
        warn("Failed to send event", err);
      }
    });
  }

  function restoreWatchersFromBackend() {
    const url = getApiUrl(`/api/metrics?page=${encodeURIComponent(window.location.href)}`);
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: function(response) {
        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            const canvases = data.canvases || [];
            canvases.forEach(stored => {
              const target = findCanvasForStored(stored);
              if (target) {
                if (stored.canvasName) saveCanvasName(target, stored.canvasName);
                addWatcher(target, null);
              }
            });
          } catch (err) {
            warn("Failed to parse metrics config", err);
          }
        }
      }
    });
  }

  function setBackendUrl() {
    const url = prompt("Backend URL for canvas updates:", state.backendUrl);
    if (!url) return;
    state.backendUrl = url;
    GM_setValue("backendUrl", url);
    log("Backend URL set to", url);
  }

  function setPolling() {
    const val = prompt("Polling interval (ms):", state.pollingMs);
    if (!val) return;
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n <= 0) return alert("Invalid interval");
    state.pollingMs = n;
    GM_setValue("pollingMs", n);
    log("Polling interval set to", n, "ms");

    if (state.watchers.length > 0) {
      const watchersToRestart = state.watchers.map(w => ({ canvas: w.canvas, region: w.region }));
      stopWatcher();
      watchersToRestart.forEach(w => addWatcher(w.canvas, w.region));
    }
  }

  function toggleSnapshot() {
    state.sendSnapshot = !state.sendSnapshot;
    GM_setValue("sendSnapshot", state.sendSnapshot);
    alert("Send snapshot payload: " + state.sendSnapshot);
  }

  function listWatchers() {
    if (state.watchers.length === 0) {
      alert("No canvases are currently being watched.");
      return;
    }

    const list = state.watchers.map((w, idx) => {
      const region = w.region ? ` [Region: ${w.region.x},${w.region.y} ${w.region.w}x${w.region.h}]` : " [Full canvas]";
      const spsValues = extractSPSValues(w.canvas);
      const valuesStr = spsValues.length > 0
        ? '\n   Values: ' + spsValues.map(v => v.tag ? `${v.tag}=${v.value}` : v.value).join(', ')
        : '\n   (no SPS values detected)';
      return `${idx + 1}. ${w.canvas.id}${region}${valuesStr}`;
    }).join("\n\n");

    alert(`Watching ${state.watchers.length} canvas(es):\n\n${list}`);
  }

  // --- WebVisu internal proxies (IM + Jc) to correlate raw values with canvas updates ---
  const proxyState = {
    proxiesInstalled: false,
    lastIM: null,
    lastParsed: null
  };

  function encodeArrayBuffer(ab) {
    try {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(ab)));
    } catch (e) {
      return null;
    }
  }

  function safeSerialize(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return null;
    }
  }

  function extractStrings(buf) {
    if (!(buf instanceof ArrayBuffer)) return { strings: [], pairs: [] };
    const b = new Uint8Array(buf);
    let cur = "";
    const strings = [];
    for (let i = 0; i < b.length; i++) {
      const ch = b[i];
      if (ch >= 32 && ch <= 126) cur += String.fromCharCode(ch);
      else {
        if (cur.length >= 3) strings.push(cur);
        cur = "";
      }
    }
    if (cur.length >= 3) strings.push(cur);
    const pairs = [];
    for (let i = 0; i < strings.length - 1; i++) {
      const tag = strings[i];
      const val = strings[i + 1];
      if (/^[A-Z]{2,3}\\d{3,4}/.test(tag) && /^-?[\\d.,]+/.test(val)) pairs.push({ tag, value: val });
    }
    return { strings: strings.slice(0, 100), pairs };
  }

  function installProxies() {
    if (proxyState.proxiesInstalled) return;
    if (!pageWindow.Vb || !pageWindow.Vb.prototype || !pageWindow.Xa || !pageWindow.Xa.prototype) return;

    try {
      const originalIM = pageWindow.Vb.prototype.IM;
      if (typeof originalIM === "function" && !pageWindow.Vb.prototype._wvPatchedIM) {
        pageWindow.Vb.prototype.IM = function() {
          try {
            // Check if XMLHttpRequest has completed and has data
            if (this.Ha && this.Ha.readyState === 4 && this.Ha.status === 200) {
              const raw = (pageWindow.r && pageWindow.r.lj && pageWindow.r.lj()) ? this.Ha.responseText : this.Ha.response;

              // Only process non-null responses
              if (raw !== null && raw !== undefined && raw !== "") {
                proxyState.lastIM = raw;
                pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:IM-raw", { detail: { raw } }));

                // Forward to backend for correlation (only if it's ArrayBuffer or substantial data)
                if (raw instanceof ArrayBuffer && raw.byteLength > 0) {
                  // Parse binary data to extract SPS values
                  const b = new Uint8Array(raw);

                  // Extract strings from binary data (printable ASCII chars)
                  var strings = [];
                  var currentString = "";
                  for (var k = 0; k < b.length; k++) {
                    if (b[k] >= 32 && b[k] <= 126) {
                      currentString += String.fromCharCode(b[k]);
                    } else {
                      if (currentString.length >= 4) {
                        strings.push(currentString);
                      }
                      currentString = "";
                    }
                  }
                  if (currentString.length >= 4) strings.push(currentString);

                  // Categorize strings
                  var numericStrings = [];
                  var variableTags = [];
                  for (var s = 0; s < strings.length; s++) {
                    var str = strings[s];
                    if (/^-?\d+\.?\d*$/.test(str) || /^-?\d*\.\d+$/.test(str)) {
                      numericStrings.push(str);
                    } else if (/^[A-Z]{2,3}\d{3,4}$/.test(str)) {
                      variableTags.push(str);
                    }
                  }

                  // Extract tag-value pairs (tag followed by numeric value)
                  var tagValuePairs = [];
                  for (var t = 0; t < strings.length - 1; t++) {
                    var currentStr = strings[t];
                    var nextStr = strings[t + 1];
                    if (/^[A-Z]{2,3}\d{3,4}$/.test(currentStr)) {
                      if (/^-?\d+\.?\d*$/.test(nextStr) || /^-?\d*\.\d+$/.test(nextStr)) {
                        tagValuePairs.push({
                          tag: currentStr,
                          value: nextStr
                        });
                      }
                    }
                  }

                  // Feed extracted data to spsValueTracker
                  if (pageWindow.spsValueTracker) {
                    if (tagValuePairs.length > 0) {
                      pageWindow.spsValueTracker.updateTagValuePairs(tagValuePairs);
                      log("Updated spsValueTracker with", tagValuePairs.length, "tag-value pairs");
                    }
                    if (numericStrings.length > 0) {
                      pageWindow.spsValueTracker.updateReceivedValues(numericStrings);
                      log("Updated spsValueTracker with", numericStrings.length, "numeric values");
                    }
                  }

                  const payload = {
                    kind: "IM",
                    rawType: "ArrayBuffer",
                    rawBase64: encodeArrayBuffer(raw),
                    byteLength: raw.byteLength,
                    timestamp: Date.now(),
                    parsedData: {
                      tagValuePairs: tagValuePairs,
                      numericStrings: numericStrings,
                      variableTags: variableTags
                    }
                  };
                  sendEvent(payload);
                  log("IM captured ArrayBuffer:", raw.byteLength, "bytes,", tagValuePairs.length, "tags,", numericStrings.length, "values");
                }
              }
            }
          } catch (err) {
            warn("IM proxy dispatch error", err);
          }
          return originalIM.apply(this, arguments);
        };
        pageWindow.Vb.prototype._wvPatchedIM = true;
        log("IM proxy installed");
      }

      const originalJc = pageWindow.Xa.prototype.Jc;
      if (typeof originalJc === "function" && !pageWindow.Xa.prototype._wvPatchedJc) {
        pageWindow.Xa.prototype.Jc = function(a, b) {
          try {
            const messageType = b && typeof b.type === "function" ? b.type() : null;
            const serialized = safeSerialize(b);
            pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:Jc-call", { detail: { target: a, message: b, messageType, lastIM: proxyState.lastIM } }));
            // Forward to backend for correlation
            const payload = {
              kind: "JC",
              messageType,
              message: serialized,
              lastIMType: proxyState.lastIM instanceof ArrayBuffer ? "ArrayBuffer" : typeof proxyState.lastIM,
              lastIMBase64: proxyState.lastIM instanceof ArrayBuffer ? encodeArrayBuffer(proxyState.lastIM) : null,
              canvasIds: Array.from(document.querySelectorAll("canvas")).map(c => c.id || "(no-id)"),
              timestamp: Date.now()
            };
            sendEvent(payload);
          } catch (err) {
            warn("Jc proxy dispatch error", err);
          }
          return originalJc.apply(this, arguments);
        };
        pageWindow.Xa.prototype._wvPatchedJc = true;
        log("Jc proxy installed");
      }

      // Wrap ac.Pb() to intercept the parsed response forwarding
      // This captures the processed data that IM sends to the higher-level state object
      if (pageWindow.Xa && pageWindow.Xa.prototype && pageWindow.Xa.prototype.Pb) {
        const originalPb = pageWindow.Xa.prototype.Pb;
        if (typeof originalPb === "function" && !pageWindow.Xa.prototype._wvPatchedPb) {
          pageWindow.Xa.prototype.Pb = function(parsedData) {
            try {
              // Store the parsed response data
              proxyState.lastParsed = parsedData;

              // Log the parsed data to console
              console.log('[Xa.Pb] Parsed data received:', {
                dataType: parsedData ? parsedData.constructor.name : 'null',
                data: parsedData,
                timestamp: Date.now()
              });

              // Dispatch event for debugging/monitoring
              pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:Pb-call", {
                detail: {
                  parsedData: parsedData,
                  dataType: parsedData ? parsedData.constructor.name : 'null',
                  timestamp: Date.now()
                }
              }));

              // Try to serialize and send to backend
              const serialized = safeSerialize(parsedData);
              if (serialized) {
                const payload = {
                  kind: "PB",
                  parsedData: serialized,
                  dataType: parsedData ? parsedData.constructor.name : 'null',
                  timestamp: Date.now()
                };
                sendEvent(payload);
              }
            } catch (err) {
              console.warn('[Xa.Pb] Error processing parsed data:', err);
            }
            return originalPb.apply(this, arguments);
          };
          pageWindow.Xa.prototype._wvPatchedPb = true;
          console.log('[Xa.Pb] Proxy installed successfully');
        }
      }

      proxyState.proxiesInstalled = true;
    } catch (err) {
      warn("Failed to install proxies", err);
    }
  }

  // Attempt installation until globals are ready.
  const proxyInterval = setInterval(() => {
    if (proxyState.proxiesInstalled) {
      clearInterval(proxyInterval);
      return;
    }
    installProxies();
  }, 500);

  // Basic listeners to surface data for debugging/correlation.
  pageWindow.addEventListener("wv:IM-raw", (ev) => {
    const raw = ev.detail && ev.detail.raw;
    if (raw instanceof ArrayBuffer) {
      log("wv:IM-raw ArrayBuffer", raw.byteLength, "bytes");

      // Show first few bytes in hex for debugging
      if (raw.byteLength > 0) {
        const view = new Uint8Array(raw);
        const hexPreview = Array.from(view.slice(0, 16))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        log("  First bytes:", hexPreview);
      }
    } else if (raw && raw !== null) {
      log("wv:IM-raw (non-ArrayBuffer):", typeof raw, raw);
    }
  });

  pageWindow.addEventListener("wv:Jc-call", (ev) => {
    const detail = ev.detail || {};
    log("wv:Jc-call", detail.messageType || "(unknown type)");

    // Show if we have lastIM data available
    if (detail.lastIM instanceof ArrayBuffer) {
      log("  with lastIM ArrayBuffer:", detail.lastIM.byteLength, "bytes");
    }
  });

  pageWindow.addEventListener("wv:Pb-call", (ev) => {
    const detail = ev.detail || {};
    log("wv:Pb-call - Parsed response forwarded:", detail.dataType || "(unknown type)");

    // Try to show structure of parsed data
    if (detail.parsedData) {
      try {
        const preview = JSON.stringify(detail.parsedData).substring(0, 200);
        log("  Data preview:", preview + (preview.length >= 200 ? "..." : ""));
      } catch (e) {
        log("  Data not JSON-serializable:", detail.dataType);
      }
    }
  });

  GM_registerMenuCommand("Select canvas to watch", pickCanvas);
  GM_registerMenuCommand("Stop watching all", () => stopWatcher());
  GM_registerMenuCommand("List watched canvases", listWatchers);
  GM_registerMenuCommand("Set backend URL", setBackendUrl);
  GM_registerMenuCommand("Set polling interval", setPolling);
  GM_registerMenuCommand("Toggle send snapshot", toggleSnapshot);

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(restoreWatchersFromBackend, 500);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(restoreWatchersFromBackend, 500));
  }

  log("Canvas Watcher loaded. Use Tampermonkey menu to select a canvas.");
})();
