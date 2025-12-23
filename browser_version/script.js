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
    showOverlays: GM_getValue("showOverlays", true),
    canvasNames: GM_getValue("canvasNames", {}),
    watchers: [],
    selecting: false,
    hovered: null,
    storedConfig: null  // Stored config from backend for checking watched status
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

  function sameRegion(r1, r2) {
    if (!r1 && !r2) return true;
    if (!r1 || !r2) return false;
    return r1.x === r2.x && r1.y === r2.y && r1.w === r2.w && r1.h === r2.h;
  }

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
    currentZoom: window.devicePixelRatio,
    lastInnerWidth: window.innerWidth,
    lastOuterWidth: window.outerWidth,
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

      // Monitor zoom/scale changes and clear values when zoom changes
      window.addEventListener('resize', function() {
        tracker.checkZoomChange();
      });

      // Also monitor with visualViewport API if available (more reliable for zoom detection)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
          tracker.checkZoomChange();
        });
      }

      // Use MutationObserver to detect zoom changes via CSS transform
      var lastZoomLevel = tracker.getZoomLevel();
      setInterval(function() {
        var currentZoomLevel = tracker.getZoomLevel();
        if (Math.abs(currentZoomLevel - lastZoomLevel) > 0.01) {
          console.log('[spsValueTracker] Zoom changed from', lastZoomLevel, 'to', currentZoomLevel, '- clearing all tracked values');
          tracker.clearAllValues();
          lastZoomLevel = currentZoomLevel;
        }
      }, 500);

      console.log('[spsValueTracker] Canvas value tracking started');
    },
    getZoomLevel: function() {
      // Multiple methods to detect zoom level
      var devicePixelRatio = window.devicePixelRatio || 1;

      // Method 1: Using visualViewport (most reliable for page zoom)
      if (window.visualViewport) {
        return window.visualViewport.scale;
      }

      // Method 2: Using devicePixelRatio
      return devicePixelRatio;
    },
    checkZoomChange: function() {
      var newZoom = window.devicePixelRatio;
      var newInnerWidth = window.innerWidth;
      var newOuterWidth = window.outerWidth;

      // Check if devicePixelRatio changed OR if window dimensions changed significantly (indicating zoom)
      var dimensionChanged = Math.abs(newInnerWidth - this.lastInnerWidth) > 50;

      if (newZoom !== this.currentZoom || dimensionChanged) {
        console.log('[spsValueTracker] Zoom/resize detected - clearing all tracked values');
        this.clearAllValues();
        this.currentZoom = newZoom;
        this.lastInnerWidth = newInnerWidth;
        this.lastOuterWidth = newOuterWidth;
      }
    },
    clearAllValues: function() {
      this.canvasTextDraws = [];
      this.valueToCanvasMap.clear();
      this.tagToCanvasMap.clear();
      console.log('[spsValueTracker] All tracked values cleared');
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

      // Track numeric values if:
      // 1. They match a value we received from the server (this.lastReceivedValues), OR
      // 2. We have no received values yet (old visu fallback - track all numeric values)
      var shouldTrack = isNumeric && cleanValue && (
        this.lastReceivedValues.indexOf(cleanValue) !== -1 ||
        this.lastReceivedValues.length === 0
      );

      if (shouldTrack) {
        var key = canvasId + ':' + draw.x + ':' + draw.y;
        console.log('[spsValueTracker] Numeric value drawn:', textStr, '(clean:', cleanValue, ') at', key, '- searching for label...');

        var nearbyLabel = this.findNearbyLabel(canvasId, draw.x, draw.y, timestamp);

        // Update or add the value - this will replace old values at the same location
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

      // Clean up old draws to prevent memory bloat
      if (this.canvasTextDraws.length > 200) {
        this.canvasTextDraws.shift();
      }

      // Clean up old valueToCanvasMap entries (older than 60 seconds)
      // This cleanup is conservative to ensure values persist long enough to be captured
      var now = Date.now();
      var maxAge = 60000; // 60 seconds
      var keysToDelete = [];
      this.valueToCanvasMap.forEach(function(data, key) {
        if (now - data.timestamp > maxAge) {
          keysToDelete.push(key);
        }
      });
      for (var i = 0; i < keysToDelete.length; i++) {
        this.valueToCanvasMap.delete(keysToDelete[i]);
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

    console.log('[extractSPSValues] Map size:', pageWindow.spsValueTracker.valueToCanvasMap.size, 'for canvas:', canvasId);

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

  function isCanvasWatched(canvas, region) {
    // Check if currently being watched in memory
    const inMemory = state.watchers.some(w => {
      const canvasMatch = w.canvas === canvas || (w.canvas && canvas && w.canvas.id && w.canvas.id === canvas.id);
      if (!canvasMatch) return false;
      return sameRegion(w.region, region || null);
    });

    if (inMemory) return true;

    // Also check stored config (for cases where watchers haven't been restored yet)
    if (state.storedConfig && canvas && canvas.id) {
      const stored = state.storedConfig.find(c => c.canvasId === canvas.id);
      if (!stored) return false;

      const trackedPositions = stored.trackedPositions || [];
      if (!region) {
        // Checking if full canvas is watched - true if no tracked positions
        return trackedPositions.length === 0;
      }

      // Check if this specific region matches any tracked position
      return trackedPositions.some(pos => {
        // Calculate the region that would be created for this position
        const padX = 80;
        const padY = 30;
        const posRegion = {
          x: Math.max(0, Math.floor(pos.x - padX / 2)),
          y: Math.max(0, Math.floor(pos.y - padY / 2)),
          w: Math.min(canvas.width, Math.floor(padX)),
          h: Math.min(canvas.height, Math.floor(padY))
        };
        return sameRegion(posRegion, region);
      });
    }

    return false;
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

  function isOldWebvisu() {
    return !!(pageWindow.Db && pageWindow.Db.prototype && typeof pageWindow.Db.prototype.Tz === "function");
  }

  function showCanvasPicker(canvases) {
    state.selecting = true;
    const selectedItems = [];
    const useValueMode = isOldWebvisu();

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
    headerLabel.textContent = useValueMode
      ? "Click a value to watch that region (green = already watched)."
      : "Green items are already being watched.";
    list.appendChild(headerLabel);

    function regionForValue(canvas, v) {
      const padX = 80;
      const padY = 30;
      const x = Math.max(0, Math.floor(v.x - padX / 2));
      const y = Math.max(0, Math.floor(v.y - padY / 2));
      const w = Math.min(canvas.width - x, Math.floor(padX));
      const h = Math.min(canvas.height - y, Math.floor(padY));
      return { x, y, w, h, label: v.tag || null, value: v.value };
    }

    function timeAgo(ts) {
      if (!ts) return "";
      const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
      if (sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec / 60);
      return `${min}m ago`;
    }

    if (useValueMode) {
      const valueEntries = [];
      canvases.forEach((canvas, idx) => {
        const values = extractSPSValues(canvas);
        if (values.length === 0) {
          valueEntries.push({ canvas, canvasIdx: idx, value: null, region: null, label: null });
        } else {
          values.forEach((v, vIdx) => {
            valueEntries.push({
              canvas,
              canvasIdx: idx,
              valueIdx: vIdx,
              value: v,
              region: regionForValue(canvas, v),
              label: v.tag || v.value || null
            });
          });
        }
      });

      if (valueEntries.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No SPS values detected yet. Interact with the page to draw values, then reopen.";
        list.appendChild(empty);
      }

      valueEntries.forEach(entry => {
        const canvas = entry.canvas;
        const rect = canvas.getBoundingClientRect();
        const region = entry.region;
        const alreadyWatched = isCanvasWatched(canvas, region);
        const item = document.createElement("div");
        item.style.cssText = `
          padding: 12px; margin: 8px 0; border: 2px solid #ddd;
          border-radius: 4px; cursor: pointer; background: #f9f9f9;
          transition: all 0.2s;
        `;

        const id = canvas.id || `canvas-${entry.canvasIdx}`;
        const zIndex = window.getComputedStyle(canvas).zIndex;
        const classes = canvas.className || "(no class)";
        getCanvasKey(canvas, entry.canvasIdx);

        if (entry.value) {
          const v = entry.value;
          const label = v.tag ? `${v.tag} = ${v.value}` : v.value;
          item.innerHTML = `
            <strong>Value #${entry.valueIdx} on canvas #${entry.canvasIdx}</strong><br>
            ${label}<br>
            Pos: ${v.x},${v.y} • Region: ${region.x},${region.y} ${region.w}x${region.h}<br>
            Canvas ID: ${id} • Z-Index: ${zIndex}<br>
            Last seen: ${timeAgo(v.timestamp)}<br>
            Classes: ${classes}
          `;
        } else {
          item.innerHTML = `
            <strong>Canvas #${entry.canvasIdx}</strong><br>
            ID: ${id}<br>
            Size: ${canvas.width}×${canvas.height}px<br>
            Position: ${Math.round(rect.left)},${Math.round(rect.top)}<br>
            Z-Index: ${zIndex}<br>
            Classes: ${classes}
          `;
        }

        item.onmouseenter = () => {
          if (!selectedItems.includes(entry)) {
            item.style.background = "#e3f2fd";
            item.style.borderColor = "#2196f3";
          }
          canvas.classList.add(HOVER_CLASS);
        };

        item.onmouseleave = () => {
          if (!selectedItems.includes(entry)) {
            item.style.background = "#f9f9f9";
            item.style.borderColor = "#ddd";
          }
          canvas.classList.remove(HOVER_CLASS);
        };

        item.onclick = () => {
          const idx = selectedItems.indexOf(entry);
          if (idx === -1) {
            selectedItems.push(entry);
            item.style.background = "#c8e6c9";
            item.style.borderColor = "#4caf50";
            canvas.classList.add(SELECTED_CLASS);
          } else {
            selectedItems.splice(idx, 1);
            item.style.background = "#f9f9f9";
            item.style.borderColor = "#ddd";
            if (!isCanvasWatched(canvas)) {
              canvas.classList.remove(SELECTED_CLASS);
            }
          }
          updateDoneButton();
        };

        if (alreadyWatched) {
          selectedItems.push(entry);
          item.style.background = "#c8e6c9";
          item.style.borderColor = "#4caf50";
          canvas.classList.add(SELECTED_CLASS);
        }
        list.appendChild(item);
      });
    } else {
      canvases.forEach((canvas, idx) => {
        const rect = canvas.getBoundingClientRect();
        const item = document.createElement("div");
        const alreadyWatched = isCanvasWatched(canvas, null);
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
          if (!selectedItems.includes(canvas)) {
            item.style.background = "#e3f2fd";
            item.style.borderColor = "#2196f3";
          }
          canvas.classList.add(HOVER_CLASS);
        };

        item.onmouseleave = () => {
          if (!selectedItems.includes(canvas)) {
            item.style.background = "#f9f9f9";
            item.style.borderColor = "#ddd";
          }
          canvas.classList.remove(HOVER_CLASS);
        };

        item.onclick = () => {
          const idxSel = selectedItems.indexOf(canvas);
          if (idxSel === -1) {
            selectedItems.push(canvas);
            item.style.background = "#c8e6c9";
            item.style.borderColor = "#4caf50";
            canvas.classList.add(SELECTED_CLASS);
          } else {
            selectedItems.splice(idxSel, 1);
            item.style.background = "#f9f9f9";
            item.style.borderColor = "#ddd";
            canvas.classList.remove(SELECTED_CLASS);
          }
          updateDoneButton();
        };

        item.appendChild(nameInput);
        if (alreadyWatched) {
          selectedItems.push(canvas);
          item.style.background = "#c8e6c9";
          item.style.borderColor = "#4caf50";
          canvas.classList.add(SELECTED_CLASS);
        }
        list.appendChild(item);
      });
    }

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
      if (selectedItems.length > 0) {
        processSelectedItems(selectedItems, useValueMode);
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
      doneBtn.textContent = `Done (${selectedItems.length} selected)`;
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

  function processSelectedItems(items, useValueMode) {
    if (items.length === 0) return;

    console.log(`[Canvas Watcher] Processing ${items.length} selection(s)`);

    if (useValueMode) {
      items.forEach(entry => {
        const canvas = entry.canvas;
        if (!canvas) return;
        if (entry.region) {
          console.log(`[Canvas Watcher] Adding watcher for value ${entry.label || '(no-label)'} on canvas ${canvas.id || '(no-id)'}`);
          addWatcher(canvas, entry.region, entry.label || null);
        } else {
          addWatcher(canvas, null);
        }
      });
    } else {
      items.forEach(canvas => {
        console.log(`[Canvas Watcher] Adding watcher for canvas:`, canvas.id);
        addWatcher(canvas, null);
      });
    }
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

  function createRegionOverlay(canvas, region, watcher) {
    // Create a visual overlay to highlight the watched region
    if (!state.showOverlays) return null;

    const rect = canvas.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "wv-region-overlay";
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left + region.x}px;
      top: ${rect.top + region.y}px;
      width: ${region.w}px;
      height: ${region.h}px;
      border: 2px solid rgba(255,87,34,0.9);
      background: rgba(255,87,34,0.1);
      pointer-events: auto;
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    overlay.dataset.canvasId = canvas.id;
    overlay.dataset.region = JSON.stringify({x: region.x, y: region.y, w: region.w, h: region.h});

    // Add label display if there's a label
    if (watcher && watcher.label) {
      const label = document.createElement("div");
      label.className = "wv-region-label";
      label.textContent = watcher.label;
      label.style.cssText = `
        background: rgba(255,87,34,0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
        pointer-events: none;
      `;
      overlay.appendChild(label);
    }

    // Click handler to name/rename the region
    overlay.onclick = (e) => {
      e.stopPropagation();
      const currentLabel = watcher ? watcher.label : null;
      const newLabel = prompt("Enter a name for this region (used as metric label/tag):", currentLabel || "");

      if (newLabel !== null) {  // null means cancelled
        const trimmed = newLabel.trim();
        if (watcher) {
          watcher.label = trimmed || null;

          // Update the label display
          const labelDiv = overlay.querySelector('.wv-region-label');
          if (trimmed) {
            if (labelDiv) {
              labelDiv.textContent = trimmed;
            } else {
              const newLabelDiv = document.createElement("div");
              newLabelDiv.className = "wv-region-label";
              newLabelDiv.textContent = trimmed;
              newLabelDiv.style.cssText = `
                background: rgba(255,87,34,0.9);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: bold;
                pointer-events: none;
              `;
              overlay.appendChild(newLabelDiv);
            }
          } else if (labelDiv) {
            labelDiv.remove();
          }

          console.log(`[Canvas Watcher] Region label updated to: ${trimmed || '(none)'}`);

          // Send the label update to the backend
          sendLabelUpdate(canvas.id, region, trimmed || null);

          // Force an immediate update to send the new label
          watcher.lastHash = null;
          tickWatcher(watcher);
        }
      }
    };

    // Hover effect
    overlay.onmouseenter = () => {
      overlay.style.background = "rgba(255,87,34,0.2)";
      overlay.style.borderWidth = "3px";
    };
    overlay.onmouseleave = () => {
      overlay.style.background = "rgba(255,87,34,0.1)";
      overlay.style.borderWidth = "2px";
    };

    document.body.appendChild(overlay);
    return overlay;
  }

  function updateRegionOverlays() {
    // Update positions of all region overlays (in case canvas moved)
    document.querySelectorAll('.wv-region-overlay').forEach(overlay => {
      const canvasId = overlay.dataset.canvasId;
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        overlay.remove();
        return;
      }
      const region = JSON.parse(overlay.dataset.region);
      const rect = canvas.getBoundingClientRect();
      overlay.style.left = `${rect.left + region.x}px`;
      overlay.style.top = `${rect.top + region.y}px`;
    });
  }

  // Update overlays on scroll/resize
  window.addEventListener('scroll', updateRegionOverlays, true);
  window.addEventListener('resize', updateRegionOverlays);

  function addWatcher(canvas, region, label) {
    const id = canvas.id || `watched-canvas-${Date.now()}`;
    canvas.id = id;
    const canvasName = getCanvasName(canvas);

    const existing = state.watchers.find(w => (w.canvas === canvas || (w.canvas && canvas && w.canvas.id && w.canvas.id === canvas.id)) && sameRegion(w.region, region || null));
    if (existing) {
      log("Canvas/region already being watched:", id);
      return;
    }

    canvas.classList.add(SELECTED_CLASS);
    const watcher = {
      canvas,
      canvasName,
      region: region || null,
      label: label || null,
      lastHash: null,
      interval: null,
      overlay: null
    };

    // Create visual overlay for region watchers
    if (region) {
      watcher.overlay = createRegionOverlay(canvas, region, watcher);
    }

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
        if (watcher.overlay && watcher.overlay.parentNode) {
          watcher.overlay.parentNode.removeChild(watcher.overlay);
        }
        state.watchers.splice(idx, 1);
        log("Stopped watching canvas:", watcher.canvas.id);
      }
    } else {
      state.watchers.forEach(watcher => {
        if (watcher.interval) clearInterval(watcher.interval);
        if (watcher.canvas) watcher.canvas.classList.remove(SELECTED_CLASS);
        if (watcher.overlay && watcher.overlay.parentNode) {
          watcher.overlay.parentNode.removeChild(watcher.overlay);
        }
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

    // Extract IP from URL for metric prefix
    let ipPrefix = "unknown";
    try {
      const url = new URL(window.location.href);
      const hostname = url.hostname;
      // Check if hostname is an IP address (v4 or v6)
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        // IPv4 - replace dots with underscores for valid metric name
        ipPrefix = hostname.replace(/\./g, '_');
      } else if (/^\[?[0-9a-fA-F:]+\]?$/.test(hostname)) {
        // IPv6 - replace colons with underscores
        ipPrefix = hostname.replace(/[\[\]:]/g, '_');
      } else {
        // Hostname - sanitize for metric name
        ipPrefix = hostname.replace(/[^a-zA-Z0-9]/g, '_');
      }
    } catch (e) {
      console.warn("[Canvas Watcher] Could not extract IP from URL:", e);
    }

    const payload = {
      canvasId: canvas.id,
      width: region ? region.w : canvas.width,
      height: region ? region.h : canvas.height,
      canvasName,
      pageUrl: window.location.href,
      ipPrefix,
      hash,
      timestamp: new Date().toISOString()
    };
    if (region) payload.region = region;
    if (watcher.label) payload.label = watcher.label;
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

  function sendLabelUpdate(canvasId, region, label) {
    const url = getApiUrl("/api/update-label");
    const payload = {
      canvasId: canvasId,
      region: region,
      label: label,
      pageUrl: window.location.href,
      timestamp: new Date().toISOString()
    };

    console.log("[Canvas Watcher] Sending label update to backend:", payload);

    GM_xmlhttpRequest({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json"
      },
      data: JSON.stringify(payload),
      onload: function(response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("[Canvas Watcher] Label update successful");
        } else {
          console.warn("[Canvas Watcher] Failed to update label:", response.status, response.statusText);
        }
      },
      onerror: function(err) {
        console.warn("[Canvas Watcher] Failed to send label update:", err);
      }
    });
  }

  function restoreWatchersFromBackend() {
    const url = getApiUrl(`/api/metrics?page=${encodeURIComponent(window.location.href)}`);
    console.log("[Canvas Watcher] Restoring watchers from backend:", url);
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: function(response) {
        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            const canvases = data.canvases || [];
            console.log(`[Canvas Watcher] Found ${canvases.length} canvases to restore`);

            // Store config for checking watched status in picker
            state.storedConfig = canvases;

            canvases.forEach(stored => {
              const target = findCanvasForStored(stored);
              if (target) {
                console.log(`[Canvas Watcher] Restoring watcher for canvas: ${stored.canvasId}`);
                if (stored.canvasName) saveCanvasName(target, stored.canvasName);

                // Check if we have tracked positions (old visu mode with specific values)
                const trackedPositions = stored.trackedPositions || [];
                if (trackedPositions.length > 0) {
                  console.log(`[Canvas Watcher] Restoring ${trackedPositions.length} tracked positions`);
                  // Restore watchers for each tracked position
                  trackedPositions.forEach(pos => {
                    const padX = 80;
                    const padY = 30;
                    const region = {
                      x: Math.max(0, Math.floor(pos.x - padX / 2)),
                      y: Math.max(0, Math.floor(pos.y - padY / 2)),
                      w: Math.min(target.width, Math.floor(padX)),
                      h: Math.min(target.height, Math.floor(padY)),
                      label: pos.tag || null,
                      value: null
                    };
                    addWatcher(target, region, pos.tag || null);
                  });
                } else {
                  // Watch the full canvas - values will be tracked automatically
                  addWatcher(target, null);
                }

                // Apply selection class immediately for visual feedback
                target.classList.add(SELECTED_CLASS);
              } else {
                console.warn(`[Canvas Watcher] Could not find canvas for stored config:`, stored);
              }
            });
          } catch (err) {
            warn("Failed to parse metrics config", err);
          }
        } else {
          console.log(`[Canvas Watcher] No stored config found (${response.status})`);
        }
      },
      onerror: function(err) {
        console.log("[Canvas Watcher] Could not reach backend to restore watchers");
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

  function toggleOverlays() {
    state.showOverlays = !state.showOverlays;
    GM_setValue("showOverlays", state.showOverlays);

    // Show or hide existing overlays
    if (state.showOverlays) {
      // Recreate overlays for all region watchers
      state.watchers.forEach(watcher => {
        if (watcher.region && !watcher.overlay && watcher.canvas) {
          watcher.overlay = createRegionOverlay(watcher.canvas, watcher.region, watcher);
        }
      });
    } else {
      // Hide all overlays
      document.querySelectorAll('.wv-region-overlay').forEach(overlay => overlay.remove());
      state.watchers.forEach(watcher => {
        watcher.overlay = null;
      });
    }

    alert("Show region overlays: " + state.showOverlays);
  }

  function listWatchers() {
    if (state.watchers.length === 0) {
      alert("No canvases are currently being watched.");
      return;
    }

    const list = state.watchers.map((w, idx) => {
      const region = w.region ? ` [Region: ${w.region.x},${w.region.y} ${w.region.w}x${w.region.h}]` : " [Full canvas]";
      const label = w.label ? ` [Label: ${w.label}]` : "";
      const spsValues = extractSPSValues(w.canvas);
      const valuesStr = spsValues.length > 0
        ? '\n   Values: ' + spsValues.map(v => v.tag ? `${v.tag}=${v.value}` : v.value).join(', ')
        : '\n   (no SPS values detected)';
      return `${idx + 1}. ${w.canvas.id}${region}${label}${valuesStr}`;
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

  function getXhrResponse(xhr) {
    if (!xhr) return null;
    try {
      if (pageWindow.q && typeof pageWindow.q.bd === "function" && pageWindow.q.bd()) {
        return xhr.responseText;
      }
    } catch (e) {}
    try {
      if (pageWindow.r && typeof pageWindow.r.lj === "function" && pageWindow.r.lj()) {
        return xhr.responseText;
      }
    } catch (e) {}
    if ("response" in xhr) return xhr.response;
    return null;
  }

  function processRawPayload(raw, sourceLabel) {
    if (raw === null || raw === undefined || raw === "") return;

    proxyState.lastIM = raw;
    pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:IM-raw", { detail: { raw, source: sourceLabel } }));

    if (!(raw instanceof ArrayBuffer) || raw.byteLength === 0) return;

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
      source: sourceLabel,
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
    let patched = false;

    try {
      if (pageWindow.Vb && pageWindow.Vb.prototype) {
        const originalIM = pageWindow.Vb.prototype.IM;
        if (typeof originalIM === "function" && !pageWindow.Vb.prototype._wvPatchedIM) {
          pageWindow.Vb.prototype.IM = function() {
            try {
              if (this.Ha && this.Ha.readyState === 4 && this.Ha.status === 200) {
                const raw = getXhrResponse(this.Ha);
                processRawPayload(raw, "Vb.IM");
              }
            } catch (err) {
              warn("IM proxy dispatch error", err);
            }
            return originalIM.apply(this, arguments);
          };
          pageWindow.Vb.prototype._wvPatchedIM = true;
          patched = true;
          log("IM proxy installed");
        }
      }

      // Older eCockpit stack uses Db/Tz instead of Vb/IM
      if (pageWindow.Db && pageWindow.Db.prototype) {
        const originalTz = pageWindow.Db.prototype.Tz;
        if (typeof originalTz === "function" && !pageWindow.Db.prototype._wvPatchedTz) {
          pageWindow.Db.prototype.Tz = function() {
            try {
              if (this.oa && this.oa.readyState === 4 && (this.oa.status === 200 || this.oa.status === "OK")) {
                const raw = getXhrResponse(this.oa);
                processRawPayload(raw, "Db.Tz");
              }
            } catch (err) {
              warn("Tz proxy dispatch error", err);
            }
            return originalTz.apply(this, arguments);
          };
          pageWindow.Db.prototype._wvPatchedTz = true;
          patched = true;
          log("Tz proxy installed");
        }
      }

      if (pageWindow.Xa && pageWindow.Xa.prototype) {
        const originalJc = pageWindow.Xa.prototype.Jc;
        if (typeof originalJc === "function" && !pageWindow.Xa.prototype._wvPatchedJc) {
          pageWindow.Xa.prototype.Jc = function(a, b) {
            try {
              const messageType = b && typeof b.type === "function" ? b.type() : null;
              const serialized = safeSerialize(b);
              pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:Jc-call", { detail: { target: a, message: b, messageType, lastIM: proxyState.lastIM } }));
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
          patched = true;
          log("Jc proxy installed");
        }

        if (pageWindow.Xa.prototype.Pb) {
          const originalPb = pageWindow.Xa.prototype.Pb;
          if (typeof originalPb === "function" && !pageWindow.Xa.prototype._wvPatchedPb) {
            pageWindow.Xa.prototype.Pb = function(parsedData) {
              try {
                proxyState.lastParsed = parsedData;
                console.log('[Xa.Pb] Parsed data received:', {
                  dataType: parsedData ? parsedData.constructor.name : 'null',
                  data: parsedData,
                  timestamp: Date.now()
                });
                pageWindow.dispatchEvent(new pageWindow.CustomEvent("wv:Pb-call", {
                  detail: {
                    parsedData: parsedData,
                    dataType: parsedData ? parsedData.constructor.name : 'null',
                    timestamp: Date.now()
                  }
                }));
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
            patched = true;
            console.log('[Xa.Pb] Proxy installed successfully');
          }
        }
      }

      if (patched) {
        proxyState.proxiesInstalled = true;
      }
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
  GM_registerMenuCommand("Toggle region overlays", toggleOverlays);

  // Restore watchers with retry logic to handle delayed canvas creation
  function tryRestoreWatchers(attempts = 0) {
    const maxAttempts = 5;
    const delay = 1000; // 1 second between attempts

    console.log(`[Canvas Watcher] Attempting to restore watchers (attempt ${attempts + 1}/${maxAttempts})`);

    // Check if canvases exist
    const canvases = document.querySelectorAll("canvas");
    if (canvases.length === 0 && attempts < maxAttempts - 1) {
      console.log(`[Canvas Watcher] No canvases found yet, will retry in ${delay}ms`);
      setTimeout(() => tryRestoreWatchers(attempts + 1), delay);
      return;
    }

    console.log(`[Canvas Watcher] Found ${canvases.length} canvas elements, restoring watchers`);
    restoreWatchersFromBackend();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(() => tryRestoreWatchers(), 1000);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(() => tryRestoreWatchers(), 1000));
  }

  log("Canvas Watcher loaded. Use Tampermonkey menu to select a canvas.");
})();
