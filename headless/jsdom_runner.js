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

const { JSDOM, VirtualConsole, ResourceLoader } = require("jsdom");
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

// Prometheus Metrics Integration
const promClient = require("prom-client");
const fs = require("fs");
const path = require("path");
const http = require("http");

// Only allow canvas value-change logs to surface
const isCanvasValueChangeLog = (args) => {
  if (!args || !args.length) return false;
  return args.some((val) => typeof val === "string" && val.includes("[canvas-watcher] value changed"));
};
const canvasLogFile = path.join(__dirname, "console_log.txt");
const appendCanvasLog = (args) => {
  try {
    const line = args.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" ");
    fs.appendFileSync(canvasLogFile, line + "\n");
  } catch (_) {
    // ignore logging failures
  }
};

["log", "info", "warn", "error", "debug"].forEach((method) => {
  const original = console[method] ? console[method].bind(console) : null;
  if (!original) return;
  console[method] = (...args) => {
    if (isCanvasValueChangeLog(args)) {
      original(...args);
      appendCanvasLog(args);
    }
  };
});

// Surface unexpected process-level failures
process.on("unhandledRejection", (reason) => {
  try {
    const msg = reason && reason.stack ? reason.stack : String(reason);
    // console.error("[jsdom-runner] UnhandledPromiseRejection:", msg);
  } catch (_) {
    // ignore logging failures
  }
});
process.on("uncaughtException", (err) => {
  try {
    const msg = err && err.stack ? err.stack : String(err);
    // console.error("[jsdom-runner] UncaughtException:", msg);
  } catch (_) {
    // ignore logging failures
  }
});

const PROM_PORT = 8077;
const STORE_PATH = path.join(__dirname, "metrics_store.json");
const servicesRegistry = new promClient.Registry();
const gauges = new Map();

// Helper to sanitize metric names
function sanitizeName(name, defaultVal = "value") {
  let clean = String(name || "").trim().replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  if (!clean) clean = defaultVal;
  if (/^\d/.test(clean)) clean = `m_${clean}`;
  return clean.toLowerCase();
}

function buildMetricName(canvasName, tag) {
  const tagPart = sanitizeName(tag, "value");
  const canvasPart = sanitizeName(canvasName, "canvas");
  return canvasPart ? `${canvasPart}_${tagPart}` : tagPart;
}

function getGauge(name, help) {
  if (!gauges.has(name)) {
    const gauge = new promClient.Gauge({
      name,
      help,
      registers: [servicesRegistry]
    });
    gauges.set(name, gauge);
  }
  return gauges.get(name);
}

// Load initial metrics from store
try {
  if (fs.existsSync(STORE_PATH)) {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    Object.values(data).forEach(page => {
      if (page.canvases) {
        Object.entries(page.canvases).forEach(([key, info]) => {
          const canvasName = info.canvasName || key;
          (info.tags || []).forEach(tagEntry => {
            const metricName = buildMetricName(canvasName, tagEntry.tag);
            const val = parseFloat(String(tagEntry.value).replace(",", "."));
            if (!isNaN(val)) {
              getGauge(metricName, `${canvasName} - ${tagEntry.tag}`).set(val);
            }
          });
        });
      }
    });
    // console.warn(`[prometheus] Initialized metrics from ${STORE_PATH}`);
  }
} catch (err) {
  // console.warn(`[prometheus] Failed to load metrics store: ${err.message}`);
}

// Start Prometheus Metrics Server
const metricsServer = http.createServer(async (req, res) => {
  if (req.url === "/metrics") {
    try {
      res.setHeader("Content-Type", servicesRegistry.contentType);
      res.end(await servicesRegistry.metrics());
    } catch (ex) {
      res.statusCode = 500;
      res.end(ex.message);
    }
  } else {
    res.statusCode = 404;
    res.end("Not Found");
  }
});

metricsServer.on("error", (err) => {
  // console.warn(`[prometheus] Server error: ${err.message}`);
});

metricsServer.listen(PROM_PORT, () => {
  // console.warn(`[prometheus] Server listening on port ${PROM_PORT}`);
});


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

async function loadHtml({ url, html, headers, cookieJar }) {
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
    rejectUnauthorized: false, // allow self-signed
  });

  const jar = cookieJar || new CookieJar();

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
      agent: { https: httpsAgent },
      https: { rejectUnauthorized: false }, // allow self-signed certificates
      cookieJar: jar,  // Reuse jar so subsequent requests share cookies
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
      // console.warn(`Failed to execute snippet[${index}]: ${err.message}`);
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

  // Helper to make binary requests using native Node.js http/https
  const makeNativeBinaryRequest = async (url, body) => {
    const URL = require('url');
    const parsedUrl = new URL.URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : require('http');

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': Buffer.byteLength(body),
          'Origin': `${parsedUrl.protocol}//${parsedUrl.host}`,
          'User-Agent': defaultHeaders['User-Agent'],
        },
        rejectUnauthorized: false,
      };

      const req = protocol.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: Buffer.concat(chunks),
          });
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  };

  class LoggingXHR extends NativeXHR {
    constructor() {
      super();
      this._logEntry = {
        id: nextId(),
        type: "xhr",
        timestamp: new Date().toISOString(),
      };
      this._useNativeRequest = false;
      this._nativeRequestPending = false;

      this.addEventListener("loadend", () => {
        // Skip normal logging if we used native request
        if (this._useNativeRequest) {
          return;
        }

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

        // Dump failing binary responses for diagnostics
        if (
          entry.url &&
          entry.url.toLowerCase().includes("webvisuv3") &&
          entry.status >= 400 &&
          this.response
        ) {
          try {
            const buffer =
              this.response instanceof ArrayBuffer
                ? Buffer.from(this.response)
                : Buffer.from(String(this.response));
            process.stderr.write(
              JSON.stringify({
                type: "debug",
                topic: "webvisu-recv",
                url: entry.url,
                status: entry.status,
                length: buffer.length,
                hex: buffer.subarray(0, 256).toString("hex"),
              }) + "\n"
            );
          } catch (err) {
            // ignore logging errors
          }
        }
      });
    }

    open(method, url, async = true, user, password) {
      this._logEntry.method = method || "GET";
      let targetUrl = url;
      const isWebVisuBinary = url && url.toLowerCase().includes("webvisuv3");
      // Allow explicit override via payload.webVisuBinaryPath; otherwise preserve URL.
      if (isWebVisuBinary) {
        const override =
          (dom.window.__payloadWebVisuBinaryPath &&
            String(dom.window.__payloadWebVisuBinaryPath)) ||
          null;
        if (override) {
          targetUrl = override;
        } else if (targetUrl && targetUrl.toLowerCase().startsWith("webvisuv3")) {
          // Fallback: if relative and missing /webvisu/, try the root-level path used by older runtimes.
          targetUrl = `/WebVisuV3.bin`;
        }
      }
      this._logEntry.url = targetUrl;
      // Make relative URLs absolute
      if (targetUrl && !targetUrl.startsWith("http")) {
        const baseUrl =
          (this._logEntry && this._logEntry.baseURL) || dom.window.location.href;
        const fullUrl = new URL(targetUrl, baseUrl).href;
        super.open(method, fullUrl, async, user, password);
      } else {
        super.open(method, targetUrl, async, user, password);
      }
    }

    setRequestHeader(header, value) {
      if (!this._requestHeaders) this._requestHeaders = {};
      this._requestHeaders[header.toLowerCase()] = value;
      super.setRequestHeader(header, value);
    }

    send(body) {
      const isWebVisuBinary =
        this._logEntry && this._logEntry.url && this._logEntry.url.toLowerCase().includes("webvisuv3");

      if (body !== null && body !== undefined) {
        let bodyString;
        let bodyBuffer = null;
        if (typeof body === "string") {
          bodyString = body;
          if (isWebVisuBinary) {
            bodyBuffer = Buffer.from(bodyString, "utf8");
          }
        } else if (Buffer.isBuffer(body)) {
          bodyString = body.toString("utf8");
          bodyBuffer = body;
        } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          // Handle ArrayBuffer and TypedArray views
          const buffer = body instanceof ArrayBuffer ? body : body.buffer;
          bodyBuffer = Buffer.from(buffer);
          bodyString = bodyBuffer.toString("utf8");
        } else {
          try {
            bodyString = JSON.stringify(body);
          } catch (err) {
            bodyString = String(body);
          }
        }
        this._logEntry.requestBody = textSnippet(bodyString, 500);

        // Debug logging for WebVisu binary exchanges
        if (isWebVisuBinary) {
          try {
            const humanPayload = bodyBuffer ? bodyBuffer.toString("utf8") : String(bodyString || "");
            process.stderr.write(
              `[webvisu-send] url=${this._logEntry.url} length=${bodyBuffer ? bodyBuffer.length : (bodyString ? bodyString.length : 0)} payload="${humanPayload.replace(/\\s+/g, " ").trim()}"\n`
            );
          } catch (err) {
            // ignore logging errors
          }

          // Use native Node.js HTTP for WebVisu binary requests (xhr2 incompatible with PLC)
          this._useNativeRequest = true;
          this._nativeRequestPending = true;

          const fullUrl = this._logEntry.url.startsWith('http')
            ? this._logEntry.url
            : new URL(this._logEntry.url, dom.window.location.href).href;

          // Mirror browser headers for PLC compatibility
          const defaultHeaders = {
            "content-type": "application/octet-stream",
            "accept": "*/*",
            "accept-encoding": "gzip, deflate",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "connection": "keep-alive",
            "dnt": "1",
            "origin": dom.window.location.origin,
            "referer": dom.window.location.href,
          };
          const mergedHeaders = { ...defaultHeaders, ...(this._requestHeaders || {}) };

          makeNativeBinaryRequest(fullUrl, bodyBuffer || bodyString, mergedHeaders)
            .then((result) => {
              this._nativeRequestPending = false;

              // Populate XHR object with response
              Object.defineProperty(this, 'status', { value: result.status, writable: false, configurable: true });
              Object.defineProperty(this, 'statusText', { value: result.statusText, writable: false, configurable: true });
              Object.defineProperty(this, 'responseURL', { value: fullUrl, writable: false, configurable: true });

              // Convert Buffer to ArrayBuffer for proper WebVisu handling
              const arrayBuffer = result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + result.data.byteLength);
              Object.defineProperty(this, 'response', { value: arrayBuffer, writable: false, configurable: true });
              Object.defineProperty(this, 'responseType', { value: 'arraybuffer', writable: false, configurable: true });

              // Log the native request
              const entry = {
                ...this._logEntry,
                status: result.status,
                statusText: result.statusText,
                responseURL: fullUrl,
                responseType: 'arraybuffer',
                contentType: result.headers['content-type'],
              };
              logEntries.push(Object.freeze(entry));

              // Debug logging for response
              process.stderr.write(
                JSON.stringify({
                  type: "debug",
                  topic: "webvisu-recv",
                  url: fullUrl,
                  status: result.status,
                  length: result.data.length,
                  hex: result.data.subarray(0, 256).toString("hex"),
                }) + "\n"
              );
              // Extract SPS values (legacy e!Cockpit) from binary payload
              try {
                const parsed = parseWebVisuBinary(result.data);
                if (parsed && (parsed.tagValuePairs.length || parsed.numericStrings.length)) {
                  // Human-readable summary for quick inspection
                  const humanPairs = parsed.tagValuePairs
                    .slice(0, 20)
                    .map(({ tag, value }) => `${tag}=${value}`)
                    .join(", ");
                  if (humanPairs) {
                    process.stderr.write(
                      `[webvisu-parse] ${humanPairs}${parsed.tagValuePairs.length > 20 ? " ..." : ""}\n`
                    );
                  } else if (parsed.numericStrings.length) {
                    process.stderr.write(
                      `[webvisu-parse] values: ${parsed.numericStrings.slice(0, 20).join(", ")}${parsed.numericStrings.length > 20 ? " ..." : ""}\n`
                    );
                  }

                  process.stderr.write(
                    JSON.stringify({
                      type: "debug",
                      topic: "webvisu-parse",
                      url: fullUrl,
                      tagValuePairs: parsed.tagValuePairs.slice(0, 50),
                      numericCount: parsed.numericStrings.length,
                      tagsCount: parsed.variableTags.length,
                    }) + "\n"
                  );
                  if (dom.window && dom.window.spsValueTracker) {
                    try {
                      if (parsed.tagValuePairs.length) {
                        dom.window.spsValueTracker.updateTagValuePairs(parsed.tagValuePairs);
                      }
                      if (parsed.numericStrings.length) {
                        dom.window.spsValueTracker.updateReceivedValues(parsed.numericStrings);
                      }
                    } catch (_) {
                      // ignore tracker errors
                    }
                  }
                }
              } catch (parseErr) {
                process.stderr.write(
                  JSON.stringify({
                    type: "debug",
                    topic: "webvisu-parse-error",
                    url: fullUrl,
                    error: parseErr && parseErr.message ? parseErr.message : String(parseErr),
                  }) + "\n"
                );
              }

              // Trigger XHR state changes and events in proper order
              // readyState 2 = HEADERS_RECEIVED
              Object.defineProperty(this, 'readyState', { value: 2, writable: false, configurable: true });
              this.dispatchEvent(new dom.window.Event('readystatechange'));

              // readyState 3 = LOADING
              Object.defineProperty(this, 'readyState', { value: 3, writable: false, configurable: true });
              this.dispatchEvent(new dom.window.Event('readystatechange'));

              // readyState 4 = DONE
              Object.defineProperty(this, 'readyState', { value: 4, writable: false, configurable: true });
              this.dispatchEvent(new dom.window.Event('readystatechange'));

              // Trigger load events
              try {
                this.dispatchEvent(new dom.window.Event('load'));
                this.dispatchEvent(new dom.window.Event('loadend'));
              } catch (loadErr) {
                process.stderr.write(
                  JSON.stringify({
                    type: "debug",
                    topic: "webvisu-load-error",
                    url: fullUrl,
                    error: loadErr.message,
                    stack: loadErr.stack,
                  }) + "\n"
                );
              }
            })
            .catch((err) => {
              this._nativeRequestPending = false;

              // Log error
              const entry = {
                ...this._logEntry,
                error: err.message,
              };
              logEntries.push(Object.freeze(entry));

              process.stderr.write(
                JSON.stringify({
                  type: "debug",
                  topic: "webvisu-error",
                  url: fullUrl,
                  error: err.message,
                }) + "\n"
              );

              // Set readyState to 4 (DONE) and status to 0 (Network Error)
              Object.defineProperty(this, 'readyState', { value: 4, writable: false, configurable: true });
              Object.defineProperty(this, 'status', { value: 0, writable: false, configurable: true });
              Object.defineProperty(this, 'statusText', { value: '', writable: false, configurable: true });

              // Trigger final readystatechange
              this.dispatchEvent(new dom.window.Event('readystatechange'));

              // Trigger error event
              this.dispatchEvent(new dom.window.Event('error'));
              this.dispatchEvent(new dom.window.Event('loadend'));
            });

          return; // Don't call super.send()
        }
      }

      // For non-binary requests, use normal xhr2
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

function parseWebVisuBinary(buffer) {
  if (!buffer || !buffer.byteLength) return null;
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let cur = "";
  const strings = [];
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    if (ch >= 32 && ch <= 126) {
      cur += String.fromCharCode(ch);
    } else {
      if (cur.length >= 3) strings.push(cur);
      cur = "";
    }
  }
  if (cur.length >= 3) strings.push(cur);

  const numericStrings = [];
  const variableTags = [];
  for (const str of strings) {
    if (/^-?\d+\.?\d*$/.test(str) || /^-?\d*\.\d+$/.test(str)) {
      numericStrings.push(str);
    } else if (/^[A-Z]{2,3}\d{3,4}$/.test(str)) {
      variableTags.push(str);
    }
  }

  const tagValuePairs = [];
  for (let i = 0; i < strings.length - 1; i++) {
    const tag = strings[i];
    const val = strings[i + 1];
    if (/^[A-Z]{2,3}\d{3,4}$/.test(tag) && (/^-?\d+\.?\d*$/.test(val) || /^-?\d*\.\d+$/.test(val))) {
      tagValuePairs.push({ tag, value: val });
    }
  }

  return {
    strings,
    numericStrings,
    variableTags,
    tagValuePairs,
  };
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
    if (!isCanvasValueChangeLog(entry.arguments)) {
      return;
    }
    consoleLogs.push(Object.freeze(entry));
    if (consoleLogs.length > MAX_CONSOLE_LOGS) {
      consoleLogs.shift();
    }
    if (liveOutput) {
      // Stream virtual console messages to stderr so stdout stays valid JSON
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

  // Forward virtual console to stdout when liveOutput is enabled;
  // otherwise keep it internal to avoid corrupting JSON output.
  // if (liveOutput) {
  //   virtualConsole.sendTo(console, { omitJSDOMErrors: false });
  // }

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

function loadCanvasNameMap() {
  const map = {};
  try {
    const storePath = path.join(__dirname, "metrics_store.json");
    if (!fs.existsSync(storePath)) {
      return map;
    }
    const raw = fs.readFileSync(storePath, "utf8");
    const store = JSON.parse(raw);
    Object.values(store || {}).forEach((entry) => {
      const canvases = entry && entry.canvases;
      if (canvases && typeof canvases === "object") {
        Object.values(canvases).forEach((canvasEntry) => {
          if (
            canvasEntry &&
            typeof canvasEntry === "object" &&
            canvasEntry.canvasId &&
            canvasEntry.canvasName
          ) {
            map[String(canvasEntry.canvasId)] = String(canvasEntry.canvasName);
          }
        });
      }
    });
  } catch (err) {
    // Ignore mapping errors; fall back to canvasId
  }
  return map;
}

// Legacy e!Cockpit WebVisu: inject value tracker similar to browser_version/script.js
function injectLegacyValueTracker(window) {
  if (window.spsValueTracker) {
    return;
  }
  const trackerScript = `
(function() {
  if (window.spsValueTracker) return;
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

      // console.log('[spsValueTracker] Canvas value tracking started');
    },
    recordCanvasDraw: function(canvas, text, x, y, type) {
      var timestamp = Date.now();
      var canvasId = canvas && canvas.id ? canvas.id : 'canvas-' + this.getCanvasIndex(canvas);
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

      var isLabel = /^[A-Z]{2,3}\\d{3,4}$/.test(textStr) || /^[A-Z]+\\d+\\s*-\\s*.+/.test(textStr);
      var numericMatch = textStr.match(/^(-?\\d+\\.?\\d*|-?\\d*\\.\\d+)\\s*(%|h|Pa|°C|°F|bar|mbar|kPa|MPa|Hz|kW|MW|V|A|mA)?$/);
      var isNumeric = numericMatch !== null;
      var cleanValue = isNumeric ? numericMatch[1] : null;

      if (isNumeric && cleanValue && this.lastReceivedValues.indexOf(cleanValue) !== -1) {
        var key = canvasId + ':' + draw.x + ':' + draw.y;
        var nearbyLabel = this.findNearbyLabel(canvasId, draw.x, draw.y, timestamp);
        this.valueToCanvasMap.set(key, {
          value: textStr,
          label: nearbyLabel,
          timestamp: timestamp
        });
        if (nearbyLabel) {
          this.tagToCanvasMap.set(nearbyLabel, key);
          // console.log('[spsValueTracker] Value mapped:', nearbyLabel, '=', textStr, 'at', key);
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

        var isLabel = /^[A-Z]{2,3}\\d{3,4}$/.test(draw.text) || /^[A-Z]+\\d+\\s*-\\s*.+/.test(draw.text);
        if (!isLabel) continue;

        var dx = draw.x - x;
        var dy = draw.y - y;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);

        if (absDx < maxHorizontalDist && absDy < maxVerticalDist) {
          var distance = Math.sqrt(dx * dx + dy * dy);
          var score = dy < 0 ? distance * 0.3 : dy > 0 ? distance * 2.0 : distance;
          candidates.push({ label: draw.text, score: score });
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
    }
  };

  if (typeof CanvasRenderingContext2D !== 'undefined') {
    window.spsValueTracker.startTracking();
  }
})();`;
  try {
    const doc = window.document;
    const root = doc && (doc.documentElement || doc.head || doc.body);
    if (root && doc && typeof doc.createElement === "function") {
      const scriptEl = doc.createElement("script");
      scriptEl.textContent = trackerScript;
      root.appendChild(scriptEl);
      return { injected: true };
    }
    // Fallback: directly evaluate if DOM root is not ready yet
    if (typeof window.eval === "function") {
      window.eval(trackerScript);
      return { injected: true, fallback: "eval" };
    }
    return { injected: false, reason: "No document root available for script injection" };
  } catch (err) {
    return { injected: false, reason: err && err.message ? err.message : String(err) };
  }
}

function injectCanvasValueWatcher(window, canvasNameMap = {}) {
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
    const canvasName = canvasNameMap[canvasId] || canvasId;
    const value = text === undefined || text === null ? "" : String(text).trim();
    // Skip empty strings to reduce noise
    if (!value) {
      return;
    }
    const px = Number.isFinite(x) ? Math.round(x) : 0;
    const py = Number.isFinite(y) ? Math.round(y) : 0;
    const key = `${canvasId}:${px}:${py}`;
    const previous = lastValues.get(key);

    // ALWAYS update metrics, even if value didn't change
    lastValues.set(key, value);

    // Update Prometheus Metric (if available)
    try {
      const valNum = parseFloat(String(value).replace(",", "."));
      if (!isNaN(valNum) && typeof getGauge === "function" && typeof buildMetricName === "function") {
        // Use 'value' as default tag to match previous behavior
        const mName = buildMetricName(canvasName, "value");
        getGauge(mName, `${canvasName} value`).set(valNum);
      }
    } catch (err) {
      // ignore update errors
    }

    // Only log when value changes to avoid spam
    if (previous !== value) {
      window.console.log("[canvas-watcher] value changed", {
        location: key,
        value,
        previous,
        type,
        canvasId,
        canvasName,
      });
    }
  };

  prototype.fillText = function patchedFillText(text, x, y, ...rest) {
    handleDraw("fillText", text, x, y, this && this.canvas);
    return originalFillText.apply(this, [text, x, y, ...rest]);
  };

  prototype.strokeText = function patchedStrokeText(text, x, y, ...rest) {
    handleDraw("strokeText", text, x, y, this && this.canvas);
    return originalStrokeText.apply(this, [text, x, y, ...rest]);
  };

  // Add a periodic canvas scanner to log all tracked values every 5 seconds
  const periodicLogger = setInterval(() => {
    const allValues = [];
    lastValues.forEach((value, key) => {
      const [canvasId] = key.split(':');
      const canvasName = canvasNameMap[canvasId] || canvasId;
      const numVal = parseFloat(String(value).replace(",", "."));
      if (!isNaN(numVal)) {
        allValues.push({
          location: key,
          canvasId,
          canvasName,
          value,
          numericValue: numVal
        });
      }
    });
    if (allValues.length > 0) {
      window.console.log(`[canvas-watcher] Periodic scan found ${allValues.length} numeric values:`, allValues);
    } else {
      window.console.log('[canvas-watcher] Periodic scan: No numeric values tracked yet');
    }
  }, 5000); // Log every 5 seconds

  prototype.__canvasValueWatcherInstalled = true;
  return { installed: true, periodicLogger };
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
  // Ensure the info object is mutable (avoid assigning to a frozen object)
  const result = { ...info };

  if (!canvasModuleAvailable || !canvasModule || typeof canvasModule.createCanvas !== "function") {
    result.warnings.push("node-canvas module is not installed; canvas rendering disabled");
    return result;
  }

  if (!window || !window.HTMLCanvasElement || !window.HTMLCanvasElement.prototype) {
    result.warnings.push("HTMLCanvasElement prototype is unavailable in jsdom window");
    return result;
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
      result.canvasEnabled = true;
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
      result.webglEnabled = Boolean(this[WEBGL_CONTEXT_SYMBOL]);
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
  return result;
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
  const sharedCookieJar = new CookieJar();
  const html = await loadHtml({ ...payload, cookieJar: sharedCookieJar });

  // SECURITY WARNING: Running scripts from untrusted sources is dangerous!
  // By default we now allow dangerous script execution to better mimic real browsers;
  // set payload.enableScriptExecution = false to opt out.
  const allowUnsafeScripts = payload.enableScriptExecution !== false;
  const runScripts = allowUnsafeScripts ? "dangerously" : "outside-only";

  const consoleLogs = [];
  const keepAliveLiveOutput = Boolean(payload.keepAlive);
  const virtualConsole = createVirtualConsole(consoleLogs, keepAliveLiveOutput);

  // Log but don't crash on jsdomError events
  virtualConsole.on("jsdomError", (error) => {
    const errorMsg = error && error.message ? error.message : String(error);

    // Suppress the specific "Cannot set properties of undefined (setting 'position')" error
    // This is a non-critical WebVisu UI positioning issue that doesn't affect data communication
    if (errorMsg.includes("Cannot set properties of undefined") && errorMsg.includes("position")) {
      if (keepAliveLiveOutput) {
        process.stderr.write(JSON.stringify({
          type: "suppressed-error",
          message: "Suppressed: Cannot set properties of undefined (setting 'position')",
          timestamp: new Date().toISOString()
        }) + "\n");
      }
      return; // Don't let this error propagate
    }

    // For other errors, log them but don't crash
    if (keepAliveLiveOutput) {
      process.stderr.write(JSON.stringify({
        type: "jsdom-error",
        message: errorMsg.substring(0, 500),
        timestamp: new Date().toISOString()
      }) + "\n");
    }

    // Don't let any jsdomError crash the process in keep-alive mode
    return;
  });
  const canvasRequested = wantsCanvasRendering(payload);
  let canvasSupportInfo = null;

  const dom = new JSDOM(html, {
    url: payload.url || "https://example.test",
    pretendToBeVisual: true,
    runScripts: runScripts,
    resources: new ResourceLoader({
      strictSSL: false,
      userAgent: payload.headers && payload.headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    }),
    cookieJar: sharedCookieJar,
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
      // Set cookies to mimic browser behavior expected by WebVisu
      window.document.cookie = "OriginalDevicePixelRatio=1.25; path=/";
      window.document.cookie = "DevicePixelRatioChanged=true; path=/";
      // Expose binary path override from payload to XHR layer
      if (payload && payload.webVisuBinaryPath) {
        window.__payloadWebVisuBinaryPath = payload.webVisuBinaryPath;
      }
      // Minimal crypto.subtle polyfill for legacy WebVisu auth flows
      // Minimal crypto.subtle polyfill for legacy WebVisu auth flows
      if (!window.crypto) {
        window.crypto = {};
      }
      if (!window.crypto.subtle) {
        window.crypto.subtle = {
          digest: async () => new ArrayBuffer(0),
          importKey: async () => ({}),
          encrypt: async () => new ArrayBuffer(0),
          decrypt: async () => new ArrayBuffer(0),
        };
      }
      // Patch legacy e!Cockpit image loader (Gb.prototype.Ol) to bypass real network fetches
      // Legacy image stub: Always enabled for old e!Cockpit WebVisu to prevent infinite retry loops
      if (window.Image) {
        const transparent = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
        const shimImage = (originalImg) => {
          const listeners = {};
          const img = originalImg || new window.Image();
          // Make naturalWidth/Height/complete writable to satisfy legacy runtimes and jsdom
          try {
            Object.defineProperty(img, "naturalWidth", { configurable: true, writable: true, value: img.naturalWidth || 0 });
            Object.defineProperty(img, "naturalHeight", { configurable: true, writable: true, value: img.naturalHeight || 0 });
            Object.defineProperty(img, "complete", { configurable: true, writable: true, value: false });
          } catch (_) {
            /* ignore */
          }
          const fire = (type) => {
            const evt = new window.Event(type);
            if (typeof img[`on${type}`] === "function") {
              try { img[`on${type}`](evt); } catch (_) { }
            }
            (listeners[type] || []).forEach((fn) => {
              try { fn(evt); } catch (_) { }
            });
          };
          const origAddEventListener = img.addEventListener ? img.addEventListener.bind(img) : null;
          img.addEventListener = function (type, handler) {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
            if (origAddEventListener) {
              try { origAddEventListener(type, handler); } catch (_) { }
            }
          };
          const origRemoveEventListener = img.removeEventListener ? img.removeEventListener.bind(img) : null;
          img.removeEventListener = function (type, handler) {
            if (!listeners[type]) return;
            listeners[type] = listeners[type].filter((h) => h !== handler);
            if (origRemoveEventListener) {
              try { origRemoveEventListener(type, handler); } catch (_) { }
            }
          };
          Object.defineProperty(img, "src", {
            configurable: true,
            enumerable: true,
            get() { return img.__src || ""; },
            set(value) {
              const urlStr = String(value || "");
              let absoluteUrl = urlStr;
              // Resolve relative URLs to absolute to match browser behavior
              if (urlStr && !urlStr.match(/^[a-z]+:/i)) {
                try {
                  absoluteUrl = new window.URL(urlStr, window.document.baseURI).href;
                } catch (_) {
                  absoluteUrl = urlStr;
                }
              }
              img.__src = absoluteUrl;
              // Set dimensions before firing load event
              if (!img.width || img.width === 0) img.width = 100;
              if (!img.height || img.height === 0) img.height = 100;
              try { img.naturalWidth = img.width; } catch (_) { }
              try { img.naturalHeight = img.height; } catch (_) { }
              img.complete = true;
              // Fire load event asynchronously to mimic real image loading
              setTimeout(() => fire("load"), 0);
            },
          });
          const originalSetAttribute = img.setAttribute ? img.setAttribute.bind(img) : null;
          img.setAttribute = function (name, value) {
            if (String(name).toLowerCase() === "src") {
              img.src = value;
              return;
            }
            if (originalSetAttribute) {
              return originalSetAttribute(name, value);
            }
          };
          // Initialize dimensions
          img.width = img.width || 100;
          img.height = img.height || 100;
          try { img.naturalWidth = img.naturalWidth || img.width || 100; } catch (_) { }
          try { img.naturalHeight = img.naturalHeight || img.height || 100; } catch (_) { }
          img.complete = false; // Will be set to true when src is assigned
          return img;
        };

        // Override global Image constructor to use shim
        const OriginalImage = window.Image;
        window.Image = function PatchedImage(width, height) {
          const img = new OriginalImage(width, height);
          return shimImage(img);
        };

        // Override document.createElement to use shim for images
        // This ensures that images created via createElement('img') are also stubbed
        // preventing network requests and potential infinite retry loops on failure
        const originalCreateElement = window.document.createElement;
        window.document.createElement = function (tagName, ...args) {
          const element = originalCreateElement.call(this, tagName, ...args);
          if (tagName && String(tagName).toLowerCase() === "img") {
            return shimImage(element);
          }
          return element;
        };

        // Patch Gb.prototype.Ol if present to use shim (for old e!Cockpit WebVisu)
        // Wait for Gb to be defined, then patch it
        const patchGb = () => {
          if (!window.Gb || !window.Gb.prototype) return false;
          if (window.Gb.prototype.__patchedSkipImages) return true;

          if (typeof window.Gb.prototype.Ol === "function") {
            window.Gb.prototype.Ol = function patchedOl(a, b) {
              // Create a shimmed image and immediately treat as loaded (no network)
              const shimmed = shimImage(new OriginalImage());
              this.od = shimmed;
              const c = this;
              shimmed.onload = function () {
                if (typeof c.Ev === "function") c.Ev();
              };
              shimmed.onerror = function () {
                if (typeof c.Ev === "function") c.Ev();
              };
              try {
                shimmed.src = b || transparent; // Skip loading actual image URLs
              } catch (err) {
                // If setting src fails, still notify load completion
                if (typeof shimmed.onload === "function") {
                  try { shimmed.onload(); } catch (_) { }
                }
              }
            };
            window.console.log("[jsdom-patch] Patched legacy e!Cockpit image loader (skipping image fetches)");
          }
          // Suppress legacy retry logging from cw() ("Triing to load the image ... again")
          if (window.Gb.prototype) {
            window.Gb.prototype.cw = function noopImageRetry() {
              // Mark as loaded/failed without scheduling retries or logging
              if (typeof this.$h === "function") {
                try { this.$h(3); } catch (_) { }
              }
            };
          }

          window.Gb.prototype.__patchedSkipImages = true;
          return true;
        };

        // Try to patch immediately and also after a delay
        // Keep trying until Gb appears to ensure the patch sticks
        const attemptPatch = () => {
          if (patchGb()) return;
          setTimeout(attemptPatch, 100);
        };
        attemptPatch();

        // Keep WebVisu polling alive by preventing focus/visibility checks from stopping it
        // Old e!Cockpit WebVisu may stop polling when it thinks the page is hidden/unfocused
        Object.defineProperty(window.document, 'hidden', {
          configurable: true,
          get: () => false
        });
        Object.defineProperty(window.document, 'visibilityState', {
          configurable: true,
          get: () => 'visible'
        });
        try {
          Object.defineProperty(window.document, 'hasFocus', {
            configurable: true,
            value: () => true
          });
        } catch (err) {
          // hasFocus might already be defined
        }

        // Prevent page from detecting it's in background
        window.addEventListener('blur', (e) => { e.stopImmediatePropagation(); }, true);
        window.addEventListener('visibilitychange', (e) => { e.stopImmediatePropagation(); }, true);

        // Ensure setInterval and setTimeout always execute (prevent throttling)
        // Old e!Cockpit WebVisu relies on timers for polling
        const originalSetInterval = window.setInterval;
        const originalSetTimeout = window.setTimeout;
        const originalClearInterval = window.clearInterval;
        const originalClearTimeout = window.clearTimeout;

        // Keep track of active intervals to prevent them from being cleared prematurely
        const activeIntervals = new Map();
        const activeTimeouts = new Map();

        window.setInterval = function (callback, delay, ...args) {
          if (typeof callback === "string") {
            const code = callback;
            callback = function () { window.eval(code); };
          }
          const id = originalSetInterval.call(window, function (...callbackArgs) {
            try {
              callback.apply(this, callbackArgs);
            } catch (err) {
              // Don't let errors in callbacks stop the interval
              window.console.error('[jsdom-patch] Interval callback error:', err.message);
            }
          }, delay, ...args);
          activeIntervals.set(id, { callback, delay });
          // Log ALL interval registration for WebVisu polling diagnostics
          window.console.log(`[jsdom-patch] setInterval registered: delay=${delay}ms, total active=${activeIntervals.size}`);
          return id;
        };

        // Track the last polling timer callback for auto-rescheduling
        let lastPollingCallback = null;
        let lastPollingArgs = null;
        let pollingTimerActive = false;
        let autoRescheduleTimer = null;

        window.setTimeout = function (callback, delay, ...args) {
          if (typeof callback === "string") {
            const code = callback;
            // Log that we are about to compile/run a string callback
            if (delay >= 90 && delay <= 110) {
              window.console.log(`[jsdom-patch] Preparing string callback for polling timer: "${code.substring(0, 50)}..."`);
            }
            callback = function () {
              try {
                window.eval(code);
              } catch (e) {
                window.console.error(`[jsdom-patch] Error executing string callback "${code.substring(0, 30)}...":`, e.message);
              }
            };
          }
          const isPollingTimer = delay === 100;

          // Capture polling timer callback for potential auto-rescheduling
          if (isPollingTimer) {
            lastPollingCallback = callback;
            lastPollingArgs = args;
            pollingTimerActive = true;
            window.console.log(`[jsdom-patch] Polling timer (${delay}ms) captured for auto-reschedule protection`);

            // Clear any existing auto-reschedule timer since a new one was scheduled
            if (autoRescheduleTimer) {
              originalClearTimeout.call(window, autoRescheduleTimer);
              autoRescheduleTimer = null;
            }
          }

          // Track ALL setTimeout calls with short delays (potential polling)
          if (delay > 0 && delay <= 5000) {
            window.console.log(`[jsdom-patch] setTimeout scheduled: delay=${delay}ms, active=${activeTimeouts.size + 1}`);
          }
          const id = originalSetTimeout.call(window, function (...callbackArgs) {
            activeTimeouts.delete(id);
            if (delay > 0 && delay <= 5000) {
              window.console.log(`[jsdom-patch] setTimeout FIRED: delay=${delay}ms, remaining=${activeTimeouts.size}`);
            }
            try {
              callback.apply(this, callbackArgs);
              if (delay > 0 && delay <= 5000) {
                window.console.log(`[jsdom-patch] setTimeout callback completed: delay=${delay}ms`);
              }

              // After polling timer completes, set up a watchdog to auto-reschedule if WebVisu doesn't
              if (isPollingTimer) {
                window.console.log(`[jsdom-patch] Polling timer completed. Setting up 300ms watchdog for auto-reschedule...`);
                autoRescheduleTimer = originalSetTimeout.call(window, () => {
                  if (pollingTimerActive && lastPollingCallback) {
                    window.console.warn(`[jsdom-patch] WebVisu didn't reschedule polling! Force-rescheduling now...`);
                    // Re-schedule the polling timer
                    window.setTimeout(lastPollingCallback, 100, ...lastPollingArgs);
                  }
                }, 300); // Wait 300ms - if no new polling timer scheduled, force one
              }
            } catch (err) {
              // Log timer errors for polling timers to help diagnose issues
              if (isPollingTimer) {
                window.console.error(`[jsdom-patch] Polling timer (${delay}ms) error:`, err.message);
              }
              // Suppress errors to keep WebVisu running
              // The "Image or Canvas expected" error occurs in legacy e!Cockpit but doesn't prevent polling
              // Don't throw - let execution continue so WebVisu can continue operating
            }
          }, delay, ...args);
          activeTimeouts.set(id, { callback, delay });
          return id;
        };

        window.clearInterval = function (id) {
          activeIntervals.delete(id);
          return originalClearInterval.call(window, id);
        };

        window.clearTimeout = function (id) {
          activeTimeouts.delete(id);
          return originalClearTimeout.call(window, id);
        };

        window.console.log("[jsdom-patch] Visibility and focus overrides installed to keep WebVisu polling active");
      }
      // Legacy value tracker for old e!Cockpit WebVisu
      // This tracks values drawn on canvas to help identify which tags correspond to which values
      if (true) {
        const trackerStatus = injectLegacyValueTracker(window);
        if (!trackerStatus.injected) {
          window.console.warn("[jsdom-patch] legacy value tracker injection failed:", trackerStatus.reason);
        } else {
          window.console.log("[jsdom-patch] legacy value tracker injected");
        }
      }
      // Legacy WebVisu compatibility: older runtimes sometimes call addEventListener on non-nodes.
      if (!Object.prototype.hasOwnProperty("addEventListener")) {
        try {
          Object.defineProperty(Object.prototype, "addEventListener", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: function noopAddEventListener() { return undefined; },
          });
        } catch (err) {
          // ignore if defineProperty fails
        }
      }

      // Prevent crashes from invalid appendChild calls in WebVisu: ignore non-Node children
      if (window.Node && window.Node.prototype && typeof window.Node.prototype.appendChild === "function") {
        const originalAppendChild = window.Node.prototype.appendChild;
        window.Node.prototype.appendChild = function patchedAppendChild(child) {
          if (!child || typeof child.nodeType !== "number") {
            return child;
          }
          return originalAppendChild.call(this, child);
        };
      }

      // Implement requestAnimationFrame for WebVisu rendering loop
      // WebVisu uses requestAnimationFrame to start its polling/rendering loop
      if (!window.requestAnimationFrame) {
        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = function (callback) {
          rafId++;
          const id = rafId;
          window.console.log(`[jsdom-patch] requestAnimationFrame called, id=${id}`);
          // Execute callback in next tick to mimic browser behavior
          const timerId = setTimeout(() => {
            rafCallbacks.delete(id);
            try {
              window.console.log(`[jsdom-patch] requestAnimationFrame callback executing, id=${id}`);
              callback(Date.now());
              window.console.log(`[jsdom-patch] requestAnimationFrame callback completed, id=${id}`);
            } catch (err) {
              window.console.error('[jsdom-patch] requestAnimationFrame callback error:', err.message);
            }
          }, 16); // ~60fps
          rafCallbacks.set(id, timerId);
          return id;
        };
        window.cancelAnimationFrame = function (id) {
          const timerId = rafCallbacks.get(id);
          if (timerId) {
            clearTimeout(timerId);
            rafCallbacks.delete(id);
            window.console.log(`[jsdom-patch] requestAnimationFrame cancelled, id=${id}`);
          }
        };
        window.console.log('[jsdom-patch] requestAnimationFrame polyfill installed');
      }

      // WORKAROUND: Force WebVisu polling to continue after initial load
      // Old e!Cockpit WebVisu stops scheduling timers after initial load for unknown reasons
      // We'll manually trigger the polling function to keep it alive
      setTimeout(() => {
        // Log what WebVisu objects are available
        window.console.log('[jsdom-patch] Inspecting window for WebVisu objects...');
        const webvisuKeys = [];
        for (const key in window) {
          if (key.toLowerCase().includes('webvisu') ||
              key.toLowerCase().includes('cds') ||
              key.toLowerCase().includes('webmi') ||
              key === 'Gb' ||
              (typeof window[key] === 'object' && window[key] !== null &&
               (window[key].update || window[key].poll || window[key].communication))) {
            webvisuKeys.push(key);
          }
        }
        window.console.log(`[jsdom-patch] Found potential WebVisu objects: ${webvisuKeys.join(', ')}`);

        // Inspect WebvisuInst structure to find polling function
        let pollingFn = null;
        if (window.WebvisuInst) {
          window.console.log('[jsdom-patch] Inspecting WebvisuInst...');
          const inst = window.WebvisuInst;

          // Log ALL properties to understand the minified structure
          const allProps = [];
          for (const prop in inst) {
            const type = typeof inst[prop];
            allProps.push(`${prop}:${type}`);
          }
          window.console.log(`[jsdom-patch] ALL WebvisuInst properties: ${allProps.slice(0, 30).join(', ')}...`);

          // Try common minified names first (eCockpit minifies everything)
          const candidateMethods = ['Qa', 'Pa', 'Ra', 'Sa', 'Ta', 'hb', 'nb', 'cyclic', 'update', 'tick'];
          for (const method of candidateMethods) {
            if (typeof inst[method] === 'function') {
              window.console.log(`[jsdom-patch] Found candidate: ${method}`);
            }
          }

          // Look for Db object (eCockpit uses Db.send for WebVisuV3.bin)
          if (inst.Db) {
            window.console.log(`[jsdom-patch] Found Db object, type: ${typeof inst.Db}`);
            if (typeof inst.Db.send === 'function') {
              window.console.log('[jsdom-patch] Found Db.send method');
            }
          }

          // Try the most likely candidates for the polling function
          if (typeof inst.Qa === 'function') {
            pollingFn = () => inst.Qa();
            window.console.log('[jsdom-patch] Using WebvisuInst.Qa()');
          } else if (typeof inst.Pa === 'function') {
            pollingFn = () => inst.Pa();
            window.console.log('[jsdom-patch] Using WebvisuInst.Pa()');
          } else if (typeof inst.cyclic === 'function') {
            pollingFn = () => inst.cyclic();
            window.console.log('[jsdom-patch] Using WebvisuInst.cyclic()');
          }
        }

        if (pollingFn) {
          window.console.log('[jsdom-patch] Setting up forced polling interval (100ms)');
          window.__forcedPollingInterval = setInterval(() => {
            try {
              pollingFn();
            } catch (err) {
              window.console.error('[jsdom-patch] Forced polling error:', err.message);
            }
          }, 100);
        } else {
          window.console.warn('[jsdom-patch] Could not find WebVisu polling function to force');
          window.console.warn('[jsdom-patch] Available keys: ' + webvisuKeys.join(', '));
        }
      }, 5000); // Wait 5 seconds for page to initialize

      // Filter noisy image-related warnings that clutter logs
      if (window.console && typeof window.console.warn === "function") {
        const originalWarn = window.console.warn.bind(window.console);
        window.console.warn = function patchedWarn(...args) {
          const message = args && args.length ? String(args[0]) : "";
          if (
            (message.includes("Imagepoolentry for") && message.includes("not found")) ||
            message.includes("Loading image ")
          ) {
            return;
          }
          return originalWarn(...args);
        };
      }

      // Patch common DOM methods that WebVisu uses to ensure they don't return undefined
      // WebVisu code crashes when trying to access .style on undefined elements
      const originalGetElementById = window.document.getElementById;
      window.document.getElementById = function (id) {
        const element = originalGetElementById.call(this, id);
        if (!element) {
          window.console.warn(`[jsdom-patch] getElementById("${id}") returned null - WebVisu may expect this element`);
        }
        return element;
      };

      const originalQuerySelector = window.document.querySelector;
      window.document.querySelector = function (selector) {
        const element = originalQuerySelector.call(this, selector);
        if (!element) {
          window.console.warn(`[jsdom-patch] querySelector("${selector}") returned null`);
        }
        return element;
      };

      // Patch HTMLElement to ensure style property is never undefined
      const OriginalElement = window.HTMLElement;
      if (OriginalElement && OriginalElement.prototype) {
        const styleDescriptor = Object.getOwnPropertyDescriptor(OriginalElement.prototype, 'style');
        if (styleDescriptor && styleDescriptor.get) {
          const originalGet = styleDescriptor.get;
          Object.defineProperty(OriginalElement.prototype, 'style', {
            ...styleDescriptor,
            get: function () {
              const style = originalGet.call(this);
              return style || {};
            }
          });
        }
      }

      if (canvasRequested) {
        canvasSupportInfo = installCanvasSupport(window, {
          enableWebgl: payload.enableWebglRendering !== false,
        });
        // Install canvas watcher after canvas support is set up
        // We defer the actual injection until after page loads when contexts are created
        window.__deferredCanvasWatcher = true;
      }
      // Ensure CanvasRenderingContext2D always exposes a canvas with a style object
      if (window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype) {
        if (!Object.getOwnPropertyDescriptor(window.CanvasRenderingContext2D.prototype, "canvas")) {
          Object.defineProperty(window.CanvasRenderingContext2D.prototype, "canvas", {
            configurable: true,
            enumerable: true,
            get() {
              if (!this.__canvas) {
                this.__canvas = { style: {} };
              } else if (!this.__canvas.style) {
                this.__canvas.style = {};
              }
              return this.__canvas;
            },
            set(value) {
              this.__canvas = value;
              if (this.__canvas && !this.__canvas.style) {
                this.__canvas.style = {};
              }
            },
          });
        }
      }
      // Fallback: ensure getContext("2d") returns an object with a canvas property
      const originalGetContext =
        window.HTMLCanvasElement &&
        window.HTMLCanvasElement.prototype &&
        window.HTMLCanvasElement.prototype.getContext;
      if (originalGetContext) {
        window.HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...rest) {
          const ctx = originalGetContext.call(this, type, ...rest);
          const wants2d = String(type).toLowerCase() === "2d";
          if (ctx) {
            if (!ctx.canvas) {
              try {
                Object.defineProperty(ctx, "canvas", {
                  configurable: true,
                  enumerable: false,
                  value: this,
                });
              } catch (err) {
                ctx.canvas = this; // fallback assignment
              }
            }
            return ctx;
          }
          if (wants2d) {
            // Minimal stub context with required properties
            const stub = {
              canvas: this,
              fillRect() { },
              clearRect() { },
              beginPath() { },
              moveTo() { },
              lineTo() { },
              stroke() { },
              fillText() { },
              strokeText() { },
              measureText() {
                return { width: 0 };
              },
              save() { },
              restore() { },
              translate() { },
              scale() { },
              rotate() { },
              rect() { },
              putImageData() { },
              getImageData() {
                return { data: [], width: this.width || 0, height: this.height || 0 };
              },
            };
            return stub;
          }
          return ctx;
        };
      }
    }
  });

  // Surface window-level errors that might otherwise be swallowed
  if (dom && dom.window && typeof dom.window.addEventListener === "function") {
    dom.window.addEventListener("error", (evt) => {
      try {
        const msg = evt && evt.error && evt.error.stack
          ? evt.error.stack
          : evt && evt.message
            ? evt.message
            : String(evt);
        dom.window.console.error("[jsdom-window-error]", msg);
      } catch (_) {
        // ignore logging failures
      }
    });
    dom.window.addEventListener("unhandledrejection", (evt) => {
      try {
        const reason = evt && evt.reason;
        const msg = reason && reason.stack ? reason.stack : String(reason);
        dom.window.console.warn("[jsdom-window-unhandledrejection]", msg);
      } catch (_) {
        // ignore logging failures
      }
    });
  }

  // NOTE: We previously froze DOM window prototypes for security, but this
  // breaks normal operations that need to modify arrays/objects. Removed.

  const networkRequests = instrumentNetwork(dom);
  executeSnippets(dom, payload.evaluate);

  // Install canvas value watcher after scripts have a chance to set up contexts
  if (dom.window.__deferredCanvasWatcher) {
    const canvasNameMap = loadCanvasNameMap();
    const watcherStatus = injectCanvasValueWatcher(dom.window, canvasNameMap);
    if (watcherStatus.installed) {
      dom.window.console.log("[canvas-watcher] Canvas value watcher installed successfully");
    } else {
      dom.window.console.warn("[canvas-watcher] Failed to install:", watcherStatus.reason);
    }
  }

  // XHR debugging removed - only logging canvas-watcher messages now

  let mouseMoveInfo = null;
  // Skip pointer simulation for legacy 2-canvas WebVisu to avoid IllegalArgument errors
  // Mouse movement simulation disabled to avoid legacy WebVisu errors
  mouseMoveInfo = { simulated: 0, reason: "Mouse simulation disabled" };

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
    networkRequests: Object.freeze(networkRequests.slice()),
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
  // Internal: Expose DOM state for persistent sessions
  Object.defineProperty(output, "_dom", { value: dom, enumerable: false });
  Object.defineProperty(output, "_virtualConsole", { value: virtualConsole, enumerable: false });
  return output;
}


async function main() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let pageState = null;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let payload;
    try {
      payload = JSON.parse(line);
    } catch (err) {
      process.stderr.write(`Invalid JSON payload: ${err.message}\n`);
      continue;
    }

    // Support 'exit' command
    if (payload.exit) {
      process.exit(0);
    }

    if (!pageState) {
      // INITIALIZATION
      try {
        if (payload.pages) {
          throw new Error("Multi-page payload not supported in continuous stream mode");
        }

        // This function will now return output with hidden _dom property
        const result = await renderPagePayload(payload);

        // Save state if keepAlive is requested
        if (payload.keepAlive) {
          pageState = {
            dom: result._dom,
            virtualConsole: result._virtualConsole
          };

          // CRITICAL: Keep the Node.js event loop alive so JSDOM timers continue to run
          // WebVisu uses setInterval internally to poll the server, but JSDOM timers
          // don't keep the process alive by themselves. We need this heartbeat.
          const keepAliveTimer = setInterval(() => {
            // This timer keeps the event loop active, allowing JSDOM's internal
            // WebVisu timers to continue executing and making XHR requests
          }, 30000); // 30 second heartbeat
          pageState.keepAliveTimer = keepAliveTimer;
        }

        // Output result (Properties _dom and _virtualConsole are not enumerable)
        process.stdout.write(JSON.stringify(result) + "\n");

        if (!payload.keepAlive) {
          process.exit(0);
        }

      } catch (err) {
        process.stdout.write(JSON.stringify({ error: err.message }) + "\n");
        // If initialization fails, we probably should exit or let them try again?
        // Let's stay alive to allow retry or inspection
      }
    } else {
      // COMMAND PROCESSING
      try {
        const dom = pageState.dom;
        const output = { contextId: payload.contextId || null };
        let actionTaken = false;

        if (payload.selectors) {
          output.items = extractSelectors(dom, payload.selectors);
          actionTaken = true;
        }

        if (payload.searchQueries) {
          output.searchResults = searchDom(dom, payload.searchQueries);
          actionTaken = true;
        }

        if (payload.evaluate) {
          executeSnippets(dom, payload.evaluate);
          output.evaluated = true;
          actionTaken = true;
        }

        if (payload.simulateMouseMovements) {
          //output.mouseMovements = await simulateMouseMovements(dom, payload.simulateMouseMovements);
          actionTaken = true;
        }

        // If they just want a snapshot of the current state
        if (!actionTaken && payload.returnStructure) {
          output.structure = buildStructure(dom, payload.structureOptions || {});
        }

        process.stdout.write(JSON.stringify(output) + "\n");
      } catch (err) {
        process.stdout.write(JSON.stringify({ error: err.message }) + "\n");
      }
    }
  }
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
});
