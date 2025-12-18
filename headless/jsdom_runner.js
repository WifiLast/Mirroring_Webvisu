#!/usr/bin/env node
/**
 * Small bridge script that uses jsdom to hydrate a remote or local page and
 * returns structured information about selected DOM nodes via stdout.
 *
 * Input is a JSON document through stdin with the following shape:
 * {
 *   url: "https://example.com/product",
 *   html: "<html>...</html>",          // optional, bypasses fetching
 *   headers: {"User-Agent": "..."}     // optional fetch headers
 *   selectors: [{ name: "price", selector: ".price" }],
 *   evaluate: ["window.initPage();"],  // optional JS snippets executed in dom
 *   simulateMouseMovements: { count: 12, minDelayMs: 20, maxDelayMs: 120 } // optional pointer events
 * }
 *
 * Output is a JSON document that captures the extracted selector results.
 */
"use strict";

const { JSDOM, VirtualConsole } = require("jsdom");
const fetch = require("node-fetch");
const got = require("got");
const { CookieJar } = require("tough-cookie");
const https = require("https");
const XMLHttpRequest = require("xhr2");

let canvasModule = null;
let canvasModuleAvailable = false;
try {
  canvasModule = require("canvas");
  canvasModuleAvailable = Boolean(canvasModule);
} catch (err) {
  canvasModule = null;
  canvasModuleAvailable = false;
}

let glFactory = null;
let glModuleAvailable = false;
try {
  glFactory = require("gl");
  glModuleAvailable = typeof glFactory === "function";
} catch (err) {
  glFactory = null;
  glModuleAvailable = false;
}

const CANVAS_BACKING_SYMBOL = Symbol("canvasBackingStore");
const WEBGL_CONTEXT_SYMBOL = Symbol("webglContext");

// NOTE: Prototype freezing was removed as it causes issues with some websites
// that need to modify arrays/objects during page load (e.g., "Cannot assign to
// read only property 'length'"). Security is maintained through other measures.

const MAX_STRUCTURE_DEPTH = 5;
const MAX_STRUCTURE_CHILDREN = 10;
const MAX_SEARCH_MATCHES = 20;
const MAX_CONSOLE_LOGS = 200;

const defaultHeaders = Object.freeze({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Cache-Control": "no-cache",
  "DNT": "1",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
});

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function mergeHeaders(provided = {}) {
  return { ...defaultHeaders, ...provided };
}

async function loadHtml({ url, html, headers }) {
  if (html) {
    return html;
  }
  if (!url) {
    throw new Error("Either `url` or `html` must be provided");
  }

  // Use got instead of node-fetch for better TLS fingerprinting and HTTP/2 support
  const mergedHeaders = mergeHeaders(headers);

  // Chrome 143's TLS cipher suites (in order of preference)
  const chromeCiphers = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA',
    'AES128-GCM-SHA256',
    'AES256-GCM-SHA384',
    'AES128-SHA',
    'AES256-SHA',
  ].join(':');

  // Custom HTTPS agent to mimic Chrome's TLS fingerprint
  const httpsAgent = new https.Agent({
    ciphers: chromeCiphers,
    honorCipherOrder: true,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    ecdhCurve: 'X25519:prime256v1:secp384r1',  // Chrome's ECDH curves
    rejectUnauthorized: true,
  });

  try {
    const response = await got(url, {
      headers: mergedHeaders,
      http2: true,  // Enable HTTP/2 (Chrome uses HTTP/2)
      followRedirect: true,
      maxRedirects: 5,
      timeout: {
        request: 30000,  // 30 second timeout
      },
      retry: {
        limit: 0,  // No retries
      },
      agent: {
        https: httpsAgent,  // Use custom agent with Chrome-like TLS
      },
      cookieJar: new CookieJar(),  // Handle cookies properly
    });

    return response.body;
  } catch (error) {
    // Handle got-specific errors
    if (error.response) {
      const statusCode = error.response.statusCode;
      const body = error.response.body || '';

      // Detect Cloudflare challenge/block
      const isCloudflareChallenge = (
        statusCode === 403 &&
        (body.includes('Cloudflare') ||
         body.includes('cf-browser-verification') ||
         body.includes('cf_chl_opt') ||
         body.includes('cf-challenge-running') ||
         body.includes('Checking your browser'))
      );

      if (isCloudflareChallenge) {
        throw new Error(`CLOUDFLARE_CHALLENGE: Failed to fetch ${url}: 403 Forbidden - Cloudflare bot protection detected. Cookies may be expired or invalid.`);
      }

      throw new Error(`Failed to fetch ${url}: ${statusCode} ${error.response.statusMessage || 'Forbidden'}`);
    }
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

function executeSnippets(dom, snippets = []) {
  if (!Array.isArray(snippets)) {
    return;
  }
  const { window } = dom;
  snippets.forEach((code, index) => {
    if (typeof code !== "string") {
      return;
    }
    try {
      window.eval(code);
    } catch (err) {
      console.warn(`Failed to execute snippet[${index}]: ${err.message}`);
    }
  });
}

function extractSelectors(dom, selectors = []) {
  if (!Array.isArray(selectors)) {
    return [];
  }

  return selectors.map((entry, index) => {
    const name = entry && entry.name ? String(entry.name) : `selector_${index}`;
    const selector = entry && entry.selector ? String(entry.selector) : null;

    if (!selector) {
      return Object.freeze({
        name,
        selector: null,
        exists: false,
        textContent: null,
        html: null,
      });
    }

    const node = dom.window.document.querySelector(selector);
    return Object.freeze({
      name,
      selector,
      exists: Boolean(node),
      textContent: node ? node.textContent.trim() : null,
      html: node ? node.innerHTML : null,
    });
  });
}

function textSnippet(value = "", limit = 160) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

function describeNodePath(node) {
  const parts = [];
  let current = node;
  let safety = 0;
  while (current && current.nodeType === 1 && safety < 10) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${current.id}`;
      parts.unshift(part);
      break;
    }
    if (current.classList && current.classList.length) {
      part += `.${Array.from(current.classList).join(".")}`;
    }
    const parent = current.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(part);
    current = parent;
    safety += 1;
  }
  return parts.join(" > ");
}

function buildStructure(dom, options = {}) {
  const document = dom.window.document;
  const root = document.body || document.documentElement;
  if (!root) {
    return null;
  }
  const maxDepth = Math.min(options.maxDepth || 3, MAX_STRUCTURE_DEPTH);
  const maxChildren = Math.min(
    options.maxChildren || 6,
    MAX_STRUCTURE_CHILDREN
  );
  const includeText =
    typeof options.includeText === "boolean" ? options.includeText : true;

  const describeElement = (element, depth = 0) => {
    if (!element || depth > maxDepth) {
      return null;
    }
    const entry = {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Object.freeze(element.classList ? Array.from(element.classList) : []),
      path: describeNodePath(element),
    };
    if (includeText) {
      entry.text = textSnippet(element.textContent, 120);
    }
    if (depth < maxDepth) {
      entry.children = Object.freeze(
        Array.from(element.children)
          .slice(0, maxChildren)
          .map((child) => describeElement(child, depth + 1))
          .filter(Boolean)
      );
    }
    return Object.freeze(entry);
  };

  return describeElement(root, 0);
}

function searchDom(dom, queries = []) {
  if (!Array.isArray(queries) || !queries.length) {
    return [];
  }
  const document = dom.window.document;
  return queries.map((query, index) => {
    const name = query && query.name ? String(query.name) : `search_${index}`;
    const selector = query && query.selector ? String(query.selector) : null;
    const text = query && query.text ? String(query.text).toLowerCase() : null;
    let collection;
    if (selector) {
      try {
        collection = Array.from(document.querySelectorAll(selector));
      } catch (err) {
        collection = [];
      }
    } else {
      collection = Array.from(document.querySelectorAll("body *"));
    }
    const matches = [];
    collection.some((node) => {
      const snippet = textSnippet(node.textContent);
      if (!snippet) {
        return false;
      }
      if (!text || snippet.toLowerCase().includes(text)) {
        matches.push(Object.freeze({
          path: describeNodePath(node),
          textSnippet: snippet,
        }));
      }
      return matches.length >= MAX_SEARCH_MATCHES;
    });
    return Object.freeze({
      name,
      selector,
      text: query && query.text ? String(query.text) : null,
      matches: Object.freeze(matches),
    });
  });
}

function normaliseHeaders(headers) {
  const result = {};
  if (!headers) {
    return result;
  }
  if (typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      if (key) {
        result[String(key).toLowerCase()] = String(value);
      }
    });
    return result;
  }
  if (typeof headers === "object") {
    Object.keys(headers).forEach((key) => {
      result[key.toLowerCase()] = headers[key];
    });
  }
  return result;
}

function isStockData(url = "", contentType = "") {
  const loweredType = (contentType || "").toLowerCase();
  const loweredUrl = (url || "").toLowerCase();
  if (loweredType.includes("json") || loweredType.includes("csv")) {
    return true;
  }
  return loweredUrl.endsWith(".json") || loweredUrl.endsWith(".csv");
}

async function readResponsePreview(response) {
  try {
    const clone = response.clone();
    const text = await clone.text();
    return textSnippet(text, 2000);
  } catch (err) {
    return null;
  }
}

function instrumentFetch(dom, logEntries, nextId) {
  const nativeFetch = dom.window.fetch || fetch;
  dom.window.fetch = async function instrumentedFetch(resource, init = {}) {
    const requestInfo =
      typeof resource === "string" ? { url: resource } : resource || {};
    const url = requestInfo.url || resource || "";
    const method =
      (init && init.method) || requestInfo.method || "GET";

    const headers =
      init.headers && typeof init.headers.forEach === "function"
        ? normaliseHeaders(init.headers)
        : normaliseHeaders(requestInfo.headers);

    const entry = {
      id: nextId(),
      type: "fetch",
      method,
      url,
      requestHeaders: headers,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await nativeFetch(resource, init);
      const contentType = response.headers.get("content-type");
      const logItem = {
        ...entry,
        status: response.status,
        statusText: response.statusText,
        contentType,
      };
      if (isStockData(url, contentType)) {
        logItem.isStockData = true;
        logItem.responsePreview = await readResponsePreview(response);
      }
      logEntries.push(Object.freeze(logItem));
      return response;
    } catch (error) {
      logEntries.push(Object.freeze({
        ...entry,
        error: error.message,
      }));
      throw error;
    }
  };
}

function instrumentXHR(dom, logEntries, nextId) {
  const NativeXHR = dom.window.XMLHttpRequest;
  if (!NativeXHR) {
    return;
  }

  class LoggingXHR extends NativeXHR {
    constructor() {
      super();
      this._logEntry = {
        id: nextId(),
        type: "xhr",
        timestamp: new Date().toISOString(),
      };
      this.addEventListener("loadend", () => {
        const entry = {
          ...this._logEntry,
          status: this.status,
          statusText: this.statusText,
          responseURL: this.responseURL,
          responseType: this.responseType,
        };
        const contentType = this.getResponseHeader("content-type");
        if (contentType) {
          entry.contentType = contentType;
        }
        if (isStockData(this.responseURL, contentType)) {
          entry.isStockData = true;
          if (typeof this.responseText === "string") {
            entry.responsePreview = textSnippet(this.responseText, 2000);
          }
        }
        logEntries.push(Object.freeze(entry));
      });
    }

    open(method, url, async = true, user, password) {
      this._logEntry.method = method || "GET";
      this._logEntry.url = url;
      // Make relative URLs absolute for WebVisuV3.bin
      if (url && !url.startsWith('http') && url.includes('WebVisuV3.bin')) {
        const baseUrl = this._logEntry && this._logEntry.baseURL || dom.window.location.href;
        const fullUrl = new URL(url, baseUrl).href;
        super.open(method, fullUrl, async, user, password);
      } else {
        super.open(method, url, async, user, password);
      }
    }

    send(body) {
      if (body !== null && body !== undefined) {
        let bodyString;
        if (typeof body === "string") {
          bodyString = body;
        } else if (Buffer.isBuffer(body)) {
          bodyString = body.toString("utf8");
        } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          // Handle ArrayBuffer and TypedArray views
          const buffer = body instanceof ArrayBuffer ? body : body.buffer;
          bodyString = Buffer.from(buffer).toString("utf8");
        } else {
          try {
            bodyString = JSON.stringify(body);
          } catch (err) {
            bodyString = String(body);
          }
        }
        this._logEntry.requestBody = textSnippet(bodyString, 500);
      }
      super.send(body);
    }
  }

  dom.window.XMLHttpRequest = LoggingXHR;
}

function instrumentNetwork(dom) {
  const entries = [];
  let counter = 0;
  const nextId = () => {
    counter += 1;
    return counter;
  };
  instrumentFetch(dom, entries, nextId);
  instrumentXHR(dom, entries, nextId);
  return entries;
}

function serialiseConsoleArg(value) {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (value instanceof Error) {
    return value.stack || value.message || String(value);
  }
  const type = typeof value;
  if (type === "string") {
    return value;
  }
  if (type === "number" || type === "boolean" || type === "bigint") {
    return String(value);
  }
  if (type === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}

function createVirtualConsole(consoleLogs, liveOutput = false) {
  const virtualConsole = new VirtualConsole();
  let entryId = 0;

  const pushEntry = (entry) => {
    // In live output mode, only store canvas-watcher messages to reduce memory
    if (liveOutput && (!entry.message || !entry.message.includes("[canvas-watcher]"))) {
      // Still capture in logs but don't store non-canvas messages
      if (entry.message && entry.message.includes("[canvas-watcher]")) {
        consoleLogs.push(Object.freeze(entry));
        if (consoleLogs.length > MAX_CONSOLE_LOGS) {
          consoleLogs.shift();
        }
        // Print canvas-watcher messages to stderr
        process.stderr.write(JSON.stringify(entry) + "\n");
      }
      return;
    }
    consoleLogs.push(Object.freeze(entry));
    if (consoleLogs.length > MAX_CONSOLE_LOGS) {
      consoleLogs.shift();
    }
    // In live output mode, also print to stderr so it doesn't corrupt JSON output
    if (liveOutput && entry.message && entry.message.includes("[canvas-watcher]")) {
      process.stderr.write(JSON.stringify(entry) + "\n");
    }
  };

  const recordEvent = (eventName) => {
    virtualConsole.on(eventName, (...args) => {
      entryId += 1;
      const serialised = args.map((value) => serialiseConsoleArg(value));
      pushEntry({
        id: entryId,
        type: eventName,
        arguments: serialised,
        message: serialised.join(" "),
        timestamp: new Date().toISOString(),
      });
    });
  };

  ["log", "info", "warn", "error", "debug"].forEach(recordEvent);

  virtualConsole.on("jsdomError", (error) => {
    entryId += 1;
    pushEntry({
      id: entryId,
      type: "jsdomError",
      arguments: [serialiseConsoleArg(error)],
      message:
        (error && error.message) || serialiseConsoleArg(error),
      timestamp: new Date().toISOString(),
    });
  });

  // Do not forward virtual console output to Node's stdout; it corrupts JSON output.
  return virtualConsole;
}

function wantsCanvasRendering(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  if (payload.enableCanvasRendering) {
    return true;
  }
  return Array.isArray(payload.canvasSnapshots) && payload.canvasSnapshots.length > 0;
}

function injectCanvasValueWatcher(window) {
  if (!window || !window.CanvasRenderingContext2D || !window.CanvasRenderingContext2D.prototype) {
    return { installed: false, reason: "CanvasRenderingContext2D not available" };
  }
  const prototype = window.CanvasRenderingContext2D.prototype;
  if (prototype.__canvasValueWatcherInstalled) {
    return { installed: true, alreadyInstalled: true };
  }

  const originalFillText = prototype.fillText;
  const originalStrokeText = prototype.strokeText;
  if (typeof originalFillText !== "function" || typeof originalStrokeText !== "function") {
    return { installed: false, reason: "Canvas text functions unavailable" };
  }

  const lastValues = new Map();
  let canvasIdCounter = 0;

  const getCanvasId = (canvas) => {
    if (!canvas) {
      return "unknown-canvas";
    }
    if (!canvas.__canvasWatcherId) {
      const suffix = canvas.id ? canvas.id : `canvas-${canvasIdCounter + 1}`;
      canvas.__canvasWatcherId = suffix;
      canvasIdCounter += 1;
    }
    return canvas.__canvasWatcherId;
  };

  const handleDraw = (type, text, x, y, canvas) => {
    if (!canvas) {
      return;
    }
    const canvasId = getCanvasId(canvas);
    const value = text === undefined || text === null ? "" : String(text).trim();
    // Skip empty strings to reduce noise
    if (!value) {
      return;
    }
    const px = Number.isFinite(x) ? Math.round(x) : 0;
    const py = Number.isFinite(y) ? Math.round(y) : 0;
    const key = `${canvasId}:${px}:${py}`;
    const previous = lastValues.get(key);
    if (previous !== value) {
      lastValues.set(key, value);
      window.console.log("[canvas-watcher] value changed", {
        location: key,
        value,
        previous,
        type,
      });
    }
    // Don't log redrawn messages - they create too much noise
  };

  prototype.fillText = function patchedFillText(text, x, y, ...rest) {
    handleDraw("fillText", text, x, y, this && this.canvas);
    return originalFillText.apply(this, [text, x, y, ...rest]);
  };

  prototype.strokeText = function patchedStrokeText(text, x, y, ...rest) {
    handleDraw("strokeText", text, x, y, this && this.canvas);
    return originalStrokeText.apply(this, [text, x, y, ...rest]);
  };

  prototype.__canvasValueWatcherInstalled = true;
  return { installed: true };
}

function installCanvasSupport(window, options = {}) {
  const info = {
    requested: true,
    canvasModule: canvasModuleAvailable,
    glModule: glModuleAvailable,
    canvasEnabled: true,
    webglEnabled: false,
    warnings: [],
  };

  if (!canvasModuleAvailable || !canvasModule || typeof canvasModule.createCanvas !== "function") {
    info.warnings.push("node-canvas module is not installed; canvas rendering disabled");
    return info;
  }

  if (!window || !window.HTMLCanvasElement || !window.HTMLCanvasElement.prototype) {
    info.warnings.push("HTMLCanvasElement prototype is unavailable in jsdom window");
    return info;
  }

  const prototype = window.HTMLCanvasElement.prototype;
  if (prototype.__canvasPolyfillInstalled) {
    return prototype.__canvasPolyfillInstalled;
  }

  const { createCanvas, Image, ImageData } = canvasModule;

  const numericSize = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.floor(parsed);
  };

  const ensureBackingCanvas = (element) => {
    const width = numericSize(element.width, 300);
    const height = numericSize(element.height, 150);
    let backing = element[CANVAS_BACKING_SYMBOL];
    if (!backing) {
      backing = createCanvas(Math.max(width, 1), Math.max(height, 1));
      element[CANVAS_BACKING_SYMBOL] = backing;
    } else if (backing.width !== width || backing.height !== height) {
      backing.width = Math.max(width, 1);
      backing.height = Math.max(height, 1);
    }
    return backing;
  };

  const syncDimensions = (element) => {
    const backing = element[CANVAS_BACKING_SYMBOL];
    if (backing) {
      backing.width = Math.max(numericSize(element.width, 300), 1);
      backing.height = Math.max(numericSize(element.height, 150), 1);
    }
    const webglContext = element[WEBGL_CONTEXT_SYMBOL];
    if (webglContext && typeof webglContext.viewport === "function") {
      webglContext.viewport(
        0,
        0,
        Math.max(numericSize(element.width, 300), 1),
        Math.max(numericSize(element.height, 150), 1)
      );
    }
  };

  const originalGetContext = prototype.getContext;
  const enableWebgl = options.enableWebgl !== false;

  prototype.getContext = function patchedGetContext(type, ...rest) {
    const contextType = (type || "").toString().toLowerCase();
    if (contextType === "2d") {
      const backing = ensureBackingCanvas(this);
      const context = backing.getContext("2d", rest[0]);
      if (context && !context.canvas) {
        Object.defineProperty(context, "canvas", {
          configurable: true,
          enumerable: false,
          value: this,
        });
      }
      info.canvasEnabled = true;
      return context;
    }
    if ((contextType === "webgl" || contextType === "experimental-webgl") && enableWebgl) {
      if (!glModuleAvailable || typeof glFactory !== "function") {
        info.warnings.push("gl module is not installed; WebGL contexts disabled");
        return originalGetContext ? originalGetContext.call(this, type, ...rest) : null;
      }
      if (!this[WEBGL_CONTEXT_SYMBOL]) {
        const width = Math.max(numericSize(this.width, 300), 1);
        const height = Math.max(numericSize(this.height, 150), 1);
        const glOptions = {
          preserveDrawingBuffer: true,
          alpha: true,
          antialias: true,
          ...(rest[0] || {}),
        };
        this[WEBGL_CONTEXT_SYMBOL] = glFactory(width, height, glOptions);
        if (this[WEBGL_CONTEXT_SYMBOL] && !this[WEBGL_CONTEXT_SYMBOL].canvas) {
          this[WEBGL_CONTEXT_SYMBOL].canvas = this;
        }
      }
      info.webglEnabled = Boolean(this[WEBGL_CONTEXT_SYMBOL]);
      return this[WEBGL_CONTEXT_SYMBOL];
    }
    return originalGetContext ? originalGetContext.call(this, type, ...rest) : null;
  };

  const originalToDataURL = prototype.toDataURL;
  prototype.toDataURL = function patchedToDataURL(...args) {
    const backing = this[CANVAS_BACKING_SYMBOL];
    if (backing && typeof backing.toDataURL === "function") {
      return backing.toDataURL(...args);
    }
    const webglContext = this[WEBGL_CONTEXT_SYMBOL];
    if (webglContext && typeof webglContext.readPixels === "function") {
      const width = Math.max(numericSize(this.width, 300), 1);
      const height = Math.max(numericSize(this.height, 150), 1);
      const pixelBuffer = Buffer.alloc(width * height * 4);
      webglContext.readPixels(
        0,
        0,
        width,
        height,
        webglContext.RGBA,
        webglContext.UNSIGNED_BYTE,
        pixelBuffer
      );
      const conversionCanvas = createCanvas(width, height);
      const ctx = conversionCanvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);
      for (let row = 0; row < height; row += 1) {
        const sourceStart = (height - row - 1) * width * 4;
        const destStart = row * width * 4;
        imageData.data.set(
          pixelBuffer.subarray(sourceStart, sourceStart + width * 4),
          destStart
        );
      }
      ctx.putImageData(imageData, 0, 0);
      return conversionCanvas.toDataURL(args[0] || "image/png");
    }
    if (originalToDataURL) {
      return originalToDataURL.apply(this, args);
    }
    throw new Error("Canvas backing store is not available for toDataURL()");
  };

  ["width", "height"].forEach((prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
    const originalGetter = descriptor && descriptor.get;
    const originalSetter = descriptor && descriptor.set;
    Object.defineProperty(prototype, prop, {
      configurable: true,
      enumerable: true,
      get() {
        if (originalGetter) {
          return originalGetter.call(this);
        }
        return this[`__${prop}`] ?? (prop === "width" ? 300 : 150);
      },
      set(value) {
        if (originalSetter) {
          originalSetter.call(this, value);
        } else {
          this[`__${prop}`] = Number(value);
        }
        syncDimensions(this);
      },
    });
  });

  if (Image) {
    window.Image = Image;
  }
  if (ImageData) {
    window.ImageData = ImageData;
  }

  // Expose CanvasRenderingContext2D from node-canvas for the value watcher
  // Create a dummy canvas to get the constructor
  const dummyCanvas = createCanvas(1, 1);
  const dummyContext = dummyCanvas.getContext('2d');
  if (dummyContext && dummyContext.constructor) {
    window.CanvasRenderingContext2D = dummyContext.constructor;
  }

  prototype.__canvasPolyfillInstalled = info;
  return info;
}

function captureCanvasSnapshots(dom, snapshotRequests = []) {
  if (!Array.isArray(snapshotRequests) || snapshotRequests.length === 0) {
    return [];
  }
  const document = dom.window.document;
  const snapshots = [];
  snapshotRequests.forEach((entry, index) => {
    const name = entry && entry.name ? String(entry.name) : `canvas_${index}`;
    const selector = entry && entry.selector ? String(entry.selector) : null;
    if (!selector) {
      snapshots.push(
        Object.freeze({ name, selector, exists: false, error: "Missing selector" })
      );
      return;
    }
    let node;
    try {
      node = document.querySelector(selector);
    } catch (err) {
      snapshots.push(
        Object.freeze({
          name,
          selector,
          exists: false,
          error: err && err.message ? err.message : String(err),
        })
      );
      return;
    }
    if (!node) {
      snapshots.push(
        Object.freeze({ name, selector, exists: false, error: "Element not found" })
      );
      return;
    }
    const snapshot = {
      name,
      selector,
      exists: true,
      tag: node.tagName ? node.tagName.toLowerCase() : null,
      width: typeof node.width === "number" ? node.width : null,
      height: typeof node.height === "number" ? node.height : null,
    };
    if (typeof node.toDataURL === "function") {
      try {
        const mimeType = entry && entry.mimeType ? String(entry.mimeType) : "image/png";
        snapshot.dataUrl = node.toDataURL(mimeType);
      } catch (err) {
        snapshot.error = err && err.message ? err.message : String(err);
      }
    } else {
      snapshot.error = "Element does not support toDataURL";
    }
    snapshots.push(Object.freeze(snapshot));
  });
  return snapshots;
}

async function simulateMouseMovements(dom, options = {}) {
  if (!dom || !dom.window || typeof dom.window.MouseEvent !== "function") {
    return { simulated: 0, reason: "MouseEvent not available" };
  }
  const window = dom.window;
  const document = window.document;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const count = clamp(Number(options.count) || 8, 1, 100);
  const minDelay = Math.max(Number(options.minDelayMs) || 20, 0);
  const maxDelay = Math.max(Number(options.maxDelayMs) || 120, minDelay);

  const width =
    clamp(Number(options.viewportWidth) || window.innerWidth || 1280, 320, 3840);
  const height =
    clamp(Number(options.viewportHeight) || window.innerHeight || 800, 240, 2160);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const eventInit = { clientX: x, clientY: y, bubbles: true };
    ["pointermove", "mousemove"].forEach((type) => {
      window.dispatchEvent(new window.MouseEvent(type, eventInit));
      document.dispatchEvent(new window.MouseEvent(type, eventInit));
    });
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    if (delay > 0) {
      await wait(delay);
    }
  }
  return { simulated: count };
}

function waitForWindowLoad(dom, timeoutMs = 8000) {
  if (!dom || !dom.window) {
    return Promise.resolve({ waited: false, reason: "No window" });
  }
  const { window } = dom;
  return new Promise((resolve) => {
    const onLoad = () => {
      clearTimeout(timer);
      window.removeEventListener("load", onLoad);
      resolve({ waited: true, event: true });
    };

    // If the load event already fired, resolve immediately.
    if (window.document && window.document.readyState === "complete") {
      resolve({ waited: false, event: false });
      return;
    }

    window.addEventListener("load", onLoad);
    const timer = setTimeout(() => {
      window.removeEventListener("load", onLoad);
      resolve({ waited: true, event: false });
    }, Math.max(0, timeoutMs));
  });
}

async function renderPagePayload(payload = {}, index = 0) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Each page payload must be an object");
  }
  if (!payload.url && !payload.html) {
    throw new Error("Page payload must include a `url` or `html` field");
  }

  // runScripts: "outside-only", is probably not enough for all pages to work properly
  // { runScripts: "dangerously" } requires extended security considerations.
  const html = await loadHtml(payload);

  // SECURITY WARNING: Running scripts from untrusted sources is dangerous!
  // By default we now allow dangerous script execution to better mimic real browsers;
  // set payload.enableScriptExecution = false to opt out.
  const allowUnsafeScripts = payload.enableScriptExecution !== false;
  const runScripts = allowUnsafeScripts ? "dangerously" : "outside-only";

  const consoleLogs = [];
  const keepAliveLiveOutput = Boolean(payload.keepAlive);
  const virtualConsole = createVirtualConsole(consoleLogs, keepAliveLiveOutput);
  const canvasRequested = wantsCanvasRendering(payload);
  let canvasSupportInfo = null;

  const dom = new JSDOM(html, {
    url: payload.url || "https://example.test",
    pretendToBeVisual: true,
    runScripts: runScripts,
    resources: allowUnsafeScripts ? "usable" : undefined,
    virtualConsole,
    beforeParse(window) {
      // Make the environment look more like a real browser
      window.navigator.webdriver = false;
      Object.defineProperty(window.navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(window.navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      // Set a cookie to mimic browser behavior
      window.document.cookie = "OriginalDevicePixelRatio=1.25; path=/";
      // Replace jsdom's stub XMLHttpRequest with real xhr2 implementation
      window.XMLHttpRequest = XMLHttpRequest;
      if (canvasRequested) {
        canvasSupportInfo = installCanvasSupport(window, {
          enableWebgl: payload.enableWebglRendering !== false,
        });
        // Install canvas watcher after canvas support is set up
        // We defer the actual injection until after page loads when contexts are created
        window.__deferredCanvasWatcher = true;
      }
    }
  });

  // NOTE: We previously froze DOM window prototypes for security, but this
  // breaks normal operations that need to modify arrays/objects. Removed.

  const networkRequests = instrumentNetwork(dom);
  executeSnippets(dom, payload.evaluate);

  // Install canvas value watcher after scripts have a chance to set up contexts
  if (dom.window.__deferredCanvasWatcher) {
    const watcherStatus = injectCanvasValueWatcher(dom.window);
    if (watcherStatus.installed) {
      dom.window.console.log("[canvas-watcher] Canvas value watcher installed successfully");
    } else {
      dom.window.console.warn("[canvas-watcher] Failed to install:", watcherStatus.reason);
    }
  }

  // XHR debugging removed - only logging canvas-watcher messages now

  let mouseMoveInfo = null;
  if (payload.simulateMouseMovements) {
    const options =
      typeof payload.simulateMouseMovements === "object"
        ? payload.simulateMouseMovements
        : {};
    mouseMoveInfo = await simulateMouseMovements(dom, options);
  }

  const waitForLoadMs = Number.isFinite(payload.waitForLoadMs)
    ? payload.waitForLoadMs
    : 8000;
  if (waitForLoadMs > 0) {
    await waitForWindowLoad(dom, waitForLoadMs);
  }

  // Wait for page scripts to execute (for Cloudflare challenges, redirects, WebVisu initialization, etc.)
  // For WebVisu pages, we need to wait for the onload event and script execution
  const postLoadDelay =
    Number.isFinite(payload.postLoadDelayMs) && payload.postLoadDelayMs > 0
      ? payload.postLoadDelayMs
      : 3000; // Default 3 seconds for WebVisu
  if (postLoadDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, postLoadDelay));
  }

  const selectors = extractSelectors(dom, payload.selectors);
  const structure = payload.returnStructure
    ? buildStructure(dom, payload.structureOptions || {})
    : null;
  const searchResults = searchDom(dom, payload.searchQueries);
  const snapshotEntries = canvasRequested
    ? captureCanvasSnapshots(dom, payload.canvasSnapshots || [])
    : [];
  const contextId = Object.prototype.hasOwnProperty.call(payload, "contextId")
    ? payload.contextId
    : payload.id ?? index ?? null;
  const output = {
    contextId: contextId ?? null,
    meta: Object.freeze({
      url: payload.url || null,
      fetchedAt: new Date().toISOString(),
      selectorCount: selectors.length,
    }),
    items: Object.freeze(selectors),
    structure,
    searchResults: Object.freeze(searchResults),
    networkRequests: Object.freeze(networkRequests),
    consoleLogs: Object.freeze(consoleLogs.slice()),
  };
  if (canvasSupportInfo) {
    output.canvasSupport = Object.freeze(canvasSupportInfo);
  }
  if (snapshotEntries.length) {
    output.canvasSnapshots = Object.freeze(snapshotEntries);
  }
  if (mouseMoveInfo) {
    output.mouseMovements = Object.freeze(mouseMoveInfo);
  }
  if (payload.returnDom) {
    output.domHtml = dom.serialize();
  }
  return output;
}

async function main() {
  const rawInput = await readStdin();
  if (!rawInput) {
    throw new Error("Missing JSON payload via stdin");
  }

  let payload;
  try {
    payload = JSON.parse(rawInput);
  } catch (err) {
    throw new Error(`Invalid JSON payload: ${err.message}`);
  }
  const keepAlive = Boolean(payload && payload.keepAlive);

  const pagePayloads = Array.isArray(payload.pages) ? payload.pages : null;
  if (pagePayloads && pagePayloads.length) {
    const results = [];
    for (let index = 0; index < pagePayloads.length; index += 1) {
      const entry = pagePayloads[index];
      try {
        const rendered = await renderPagePayload(entry, index);
        results.push(Object.freeze(rendered));
      } catch (err) {
        const contextId =
          entry && Object.prototype.hasOwnProperty.call(entry, "contextId")
            ? entry.contextId
            : null;
        results.push(
          Object.freeze({
            contextId,
            url: entry && entry.url ? entry.url : null,
            error: err && err.message ? err.message : String(err),
          })
        );
      }
    }
    process.stdout.write(JSON.stringify(Object.freeze({ results })));
    process.stdout.write("\n");
    if (keepAlive) {
      setInterval(() => {}, 3600000);
    }
    return;
  }

  if (!payload.url && !payload.html) {
    throw new Error("Payload must include a `url` or `html` field");
  }

  const result = await renderPagePayload(payload, 0);
  process.stdout.write(JSON.stringify(Object.freeze(result)));
  process.stdout.write("\n");
  if (keepAlive) {
    // In keep-alive mode, continue to monitor console output
    // The virtual console is already set up to capture logs
    // We just need to keep the process running
    setInterval(() => {}, 3600000);
    return;
  }
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
});
