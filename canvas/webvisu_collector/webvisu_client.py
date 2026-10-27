"""
WebVisu -> Prometheus collector (Ersatz fuer opc_client.py, wenn der OPC-UA-Server der SPS haengt).

Die CODESYS-WebVisu der SPS wird in einem unsichtbaren (headless) Edge/Chrome geoeffnet, genau wie
in einem normalen Browser. Ein kleines Skript im Browser merkt sich jeden Text, den die WebVisu auf
das Canvas zeichnet, mit seiner Position. Jede Metrik in webvisu_clients.json ist ein Visu-Element
(Rechteck in Projekt-Koordinaten, ueber feste Beschriftungen auf die Seite umgerechnet) oder ein
Punkt auf der Seite; der Text dort wird als Zahl gelesen und unter `gauge_name` fuer Prometheus
bereitgestellt (Port 8023). Weitere Seiten (`pages`) werden in derselben Sitzung per Klick besucht.

Keine Python-Pakete noetig (nur Standardbibliothek), nur ein installierter Edge oder Chrome.
Nur lesend: es werden keine Eingaben an die SPS geschickt, ausser den konfigurierten Klicks
(Seitenwechsel in der Visu). Beschreibung und Inbetriebnahme: README.md im selben Ordner.
"""

import sys

if sys.version_info < (3, 8):
    sys.exit(f"webvisu_client.py braucht Python 3.8 oder neuer (gefunden: {sys.version.split()[0]})")

import argparse
import base64
import html
import json
import logging
import os
import re
import shutil
import socket
import struct
import subprocess
import tempfile
import threading
import time
import urllib.request
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"
HTTP_PORT = 8023
CONFIG_PATH = Path(__file__).with_name("webvisu_clients.json")
# Standortabhaengige Einstellungen (SPS-Adresse, Ports, Prometheus); siehe README
SETTINGS_PATH = Path(__file__).with_name("einstellungen.json")

BROWSER_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

CDP_TIMEOUT_SECONDS = 15.0
NAVIGATE_TIMEOUT_SECONDS = 60.0
BROWSER_START_TIMEOUT_SECONDS = 30.0
# Ist die Startseite so lange nicht lesbar (SPS antwortet nicht, falsche Seite, WebVisu-Fehler),
# wird sie neu geladen; danach jeweils doppelt so lange warten, hoechstens MAX (schont die SPS)
NOT_READY_RELOAD_SECONDS = 120.0
MAX_NOT_READY_RELOAD_SECONDS = 1800.0
# Kurze Aussetzer (z. B. waehrend die Visu neu zeichnet) so lange mit den letzten Werten ueberbruecken
HOLD_SECONDS = 15.0
# Browser vorsorglich einmal am Tag neu starten (raeumt Speicher im Browser auf)
BROWSER_RESTART_SECONDS = 24 * 3600.0
# So lange nach dem Laden der Seite warten, bevor `clicks` ausgefuehrt werden
CLICK_START_DELAY_SECONDS = 5.0
CLICK_STEP_DELAY_SECONDS = 2.0
# So lange auf ein Klickziel (Text) warten, bis die Visu es gezeichnet hat
CLICK_TARGET_TIMEOUT_SECONDS = 30.0
# Anmeldung an der Visu (login_file): so lange auf ein Bedienelement (Knopf, Dialog, Taste) warten, bis die Visu es gezeichnet hat
LOGIN_TARGET_TIMEOUT_SECONDS = 90.0
# Nach dem Bestaetigen der SPS so lange Zeit geben, dann die Seite neu zeichnen lassen
LOGIN_SETTLE_SECONDS = 20.0
# Nach so vielen gescheiterten Anmeldungen hintereinander nicht mehr versuchen (ein Benutzer koennte gesperrt werden)
LOGIN_MAX_ATTEMPTS = 2
LOGIN_RETRY_AFTER_SECONDS = 1800.0  # nach dem Aufgeben so lange warten, dann wieder versuchen
# Pause nach jedem Klick bei der Anmeldung: die SPS arbeitet die Klicks einzeln ab und antwortet langsam
LOGIN_CLICK_DELAY_SECONDS = 1.0
# Die Bildschirmtastatur der Visu ist eine zweite Visu: ihre Tasten liegen auf Canvases cdsCanvas_2_<id>
KEYBOARD_CANVAS_PREFIX = "cdsCanvas_2_"
# --check: so lange hoechstens auf die lesbare Startseite warten
CHECK_LOAD_TIMEOUT_SECONDS = 180.0
# Erster Besuch der weiteren Seiten: Seite i nach (i + 1) * diesem Abstand nach dem Start
FIRST_VISIT_SPACING_SECONDS = 120.0
# Laden, Anmeldung und Start-Klicks der Sitzungen nacheinander: Die Anmeldung gilt SPS-weit (parallele
# Anmeldungen wuerden sich gegenseitig abmelden) und die SPS soll nicht vier Seitenladungen auf einmal bekommen
NAVIGATION_LOCK = threading.Lock()
# Im Betrieb dauerhaft offene Sitzungen: nur eine fragt gerade die SPS ab (Reihum). Die uebrigen laufen mit
# poll_delay_ms (Ruhe, nur Lebenszeichen); wer an der Reihe ist, fragt mit TURN_POLL_DELAY_MS und zeichnet neu
TURN_LOCK = threading.Lock()
TURN_POLL_DELAY_MS = 500
TURN_SETTLE_SECONDS = 1.5
# Jede Seite der Visu zeigt die Uhrzeit der SPS (hh:mm:ss). Aendert sie sich laenger als diese Zeit nicht, wird die
# Seite nicht mehr aktualisiert (haengende Sitzung): Sitzung gilt als gestoert und wird neu geladen
CLOCK_RE = re.compile(r"^\d{1,2}:\d{2}:\d{2}$")
CLOCK_STALE_MIN_SECONDS = 90.0
CLOCK_STALE_POLL_FACTOR = 8
INITIAL_RESTART_DELAY_SECONDS = 10.0
MAX_RESTART_DELAY_SECONDS = 300.0
# Toleranz in Pixeln, wenn ein Punkt knapp neben einem Text liegt
DEFAULT_TOLERANCE_PX = 4
# Groesste erlaubte Abweichung der Beschriftungen von der Umrechnung Projekt -> Bildschirm
CALIBRATION_MAX_ERROR_PX = 8
# So lange nach einem Seitenwechsel zurueck zur Startseite hoechstens warten
HOME_TIMEOUT_SECONDS = 60.0
# Werte einer besuchten Seite gelten so viele Besuchsintervalle lang (danach keine Ausgabe mehr)
PAGE_VALUE_LIFETIME_INTERVALS = 2.5

NUMBER_RE = re.compile(r"[-+]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?")


logging.basicConfig(level=logging.WARNING, format=LOG_FORMAT)


# --------------------------------------------------------------------------------------------
# Skript, das im Browser vor webvisu.js laeuft
# --------------------------------------------------------------------------------------------

HOOK_JS = r"""
(() => {
  if (window.__wv) { return; }
  const W = window.__wv = { texts: [], seq: 0, ok: 0, err: 0, lastOk: 0, lastErr: '', errAt: 0, errText: '', visuErrors: 0 };

  // Fehler der WebVisu selbst (Verbindung verloren, zu viele Clients, Lizenz ...). Die WebVisu
  // schreibt sie ueber ihren Logger in die Konsole und startet sich danach neu, laesst die alten
  // Element-Canvases aber stehen. Alles, was vor dem Fehler gezeichnet wurde, gilt danach als
  // veraltet (errAt); erst neu gezeichnete Texte werden wieder gelesen.
  const visuError = (msg) => { W.errAt = Date.now(); W.errText = String(msg).slice(0, 200); W.visuErrors++; };
  const CE = console.error, CW = console.warn, CI = console.info;
  console.error = function (...a) { visuError(a.join(' ')); return CE.apply(this, a); };
  console.warn = function (...a) {
    if (/Webvisualization is stopped/i.test(a.join(' '))) { visuError(a.join(' ')); }
    return CW.apply(this, a);
  };
  console.info = function (...a) {
    if (/Will restart in/i.test(a.join(' '))) { visuError(a.join(' ')); }
    return CI.apply(this, a);
  };
  const canvasIds = new WeakMap();
  let canvasCounter = 0;
  const canvasId = (c) => {
    if (!canvasIds.has(c)) { canvasIds.set(c, c.id || ('canvas' + (++canvasCounter))); }
    return canvasIds.get(c);
  };

  // Rechteck in Canvas-Pixeln (Transformation des Kontexts angewendet). Die WebVisu zeichnet viele
  // Elemente, bevor ihr Canvas in der Seite haengt; die Seitenposition wird deshalb erst beim
  // Auslesen (snapshot) aus der aktuellen Lage des Canvas berechnet.
  const toLocal = (ctx, x0, y0, x1, y1) => {
    const m = ctx.getTransform();
    const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const toPage = (c, b) => {
    if (!c.isConnected) { return null; }
    const r = c.getBoundingClientRect();
    if (!r.width || !r.height || !c.width || !c.height) { return null; }
    const sx = r.width / c.width, sy = r.height / c.height;
    return [r.left + b[0] * sx, r.top + b[1] * sy, r.left + b[2] * sx, r.top + b[3] * sy];
  };
  const visible = (c) => {
    for (let el = c; el && el.nodeType === 1; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') { return false; }
    }
    return true;
  };

  const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const inter = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);

  const record = (ctx, text, x, y) => {
    try {
      const raw = text === undefined || text === null ? '' : String(text);
      const s = raw.trim();
      if (!s || !ctx.canvas) { return; }
      const w = ctx.measureText(raw).width;
      const fm = /(\d+(?:\.\d+)?)px/.exec(ctx.font || '');
      const fs = fm ? parseFloat(fm[1]) : 12;
      let x0 = x;
      const al = ctx.textAlign;
      if (al === 'center') { x0 = x - w / 2; } else if (al === 'right' || al === 'end') { x0 = x - w; }
      let y0;
      const bl = ctx.textBaseline;
      if (bl === 'top' || bl === 'hanging') { y0 = y; }
      else if (bl === 'middle') { y0 = y - fs / 2; }
      else if (bl === 'bottom' || bl === 'ideographic') { y0 = y - fs; }
      else { y0 = y - fs * 0.8; }
      add(ctx.canvas, s, toLocal(ctx, x0, y0, x0 + w, y0 + fs));
    } catch (e) { }
  };

  const add = (c, text, box) => {
    // Was an derselben Stelle stand, ist jetzt ueberschrieben
    const a = area(box);
    W.texts = W.texts.filter(e => e.c !== c || inter(e.box, box) < 0.5 * Math.min(area(e.box), a || 1));
    W.texts.push({ id: ++W.seq, text, box, c, t: Date.now() });
    if (W.texts.length > 5000) { W.texts.splice(0, W.texts.length - 5000); }
  };

  // Aeltere WebVisu-Versionen zeichnen in ein Puffer-Canvas und kopieren es dann ins sichtbare:
  // die Texte des Puffers mitnehmen
  const copyTexts = (ctx, src, a) => {
    let sx = 0, sy = 0, sw = src.width, sh = src.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; }
    else if (a.length === 4) { [dx, dy, dw, dh] = a; }
    else if (a.length === 8) { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    else { return; }
    if (!sw || !sh) { return; }
    const kx = dw / sw, ky = dh / sh;
    for (const e of W.texts.filter(t => t.c === src)) {
      const b = e.box;
      if (b[2] < sx || b[0] > sx + sw || b[3] < sy || b[1] > sy + sh) { continue; }
      add(ctx.canvas, e.text, toLocal(ctx, dx + (b[0] - sx) * kx, dy + (b[1] - sy) * ky,
                                           dx + (b[2] - sx) * kx, dy + (b[3] - sy) * ky));
    }
  };

  // Flaechen, die neu gemalt werden, loeschen die Texte darunter
  const erase = (ctx, x, y, w, h) => {
    try {
      const c = ctx.canvas;
      if (!c) { return; }
      const box = toLocal(ctx, x, y, x + w, y + h);
      W.texts = W.texts.filter(e => e.c !== c || inter(e.box, box) < 0.9 * area(e.box));
    } catch (e) { }
  };

  const P = CanvasRenderingContext2D.prototype;
  const fillText = P.fillText, strokeText = P.strokeText, fillRect = P.fillRect, clearRect = P.clearRect;
  const drawImage = P.drawImage;
  P.drawImage = function (img, ...a) {
    try { if (img instanceof HTMLCanvasElement && img !== this.canvas) { copyTexts(this, img, a); } } catch (e) { }
    return drawImage.call(this, img, ...a);
  };
  P.fillText = function (t, x, y, ...r) { record(this, t, x, y); return fillText.call(this, t, x, y, ...r); };
  P.strokeText = function (t, x, y, ...r) { record(this, t, x, y); return strokeText.call(this, t, x, y, ...r); };
  P.fillRect = function (x, y, w, h) { erase(this, x, y, w, h); return fillRect.call(this, x, y, w, h); };
  P.clearRect = function (x, y, w, h) { erase(this, x, y, w, h); return clearRect.call(this, x, y, w, h); };

  // Lebenszeichen: Antworten der SPS auf die WebVisu-Anfragen
  const isVisu = (u) => /webvisuv3\.bin/i.test(String(u || ''));
  const XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u, ...r) { this.__wvUrl = u; return XO.call(this, m, u, ...r); };
  // Optional jede Anfrage an die SPS verzoegern (window.__wvPollDelay ms): die WebVisu fragt erst
  // nach der Antwort wieder an, die SPS bekommt also entsprechend seltener Anfragen
  const delay = () => Math.max(0, Number(window.__wvPollDelay) || 0);
  // Offene Anfragen (zur Diagnose: haengt die SPS an einer Antwort oder fragt die WebVisu nicht mehr?)
  W.pending = new Map(); W.sent = 0; W.lastSend = 0;
  XMLHttpRequest.prototype.send = function (...a) {
    if (isVisu(this.__wvUrl)) {
      const key = ++W.sent;
      W.lastSend = Date.now();
      W.pending.set(key, Date.now());
      this.addEventListener('loadend', () => {
        W.pending.delete(key);
        if (this.status === 200) { W.ok++; W.lastOk = Date.now(); }
        else { W.err++; W.lastErr = 'HTTP ' + this.status; }
      });
      if (delay()) {
        setTimeout(() => { try { XS.apply(this, a); } catch (e) { W.err++; W.lastErr = String(e); } }, delay());
        return;
      }
    }
    return XS.apply(this, a);
  };
  if (window.fetch) {
    const F = window.fetch;
    window.fetch = function (input, init) {
      const u = typeof input === 'string' ? input : (input && input.url);
      if (!isVisu(u)) { return F.call(this, input, init); }
      const go = () => {
        const key = ++W.sent;
        W.lastSend = Date.now();
        W.pending.set(key, Date.now());
        const p = F.call(window, input, init);
        p.then(r => { W.pending.delete(key); if (r.ok) { W.ok++; W.lastOk = Date.now(); } else { W.err++; W.lastErr = 'HTTP ' + r.status; } },
               e => { W.pending.delete(key); W.err++; W.lastErr = String(e); });
        return p;
      };
      return delay() ? new Promise(res => setTimeout(() => res(go()), delay())) : go();
    };
  }

  W.snapshot = () => {
    const now = Date.now();
    // Texte von Canvases, die laenger nicht mehr in der Seite haengen (Seitenwechsel), vergessen
    W.texts = W.texts.filter(e => e.c.isConnected || now - e.t < 60000);
    const texts = [];
    for (const e of W.texts) {
      const box = toPage(e.c, e.box);
      if (box && visible(e.c)) { texts.push({ id: e.id, text: e.text, box, canvas: canvasId(e.c), t: e.t }); }
    }
    return JSON.stringify({
      now, ok: W.ok, err: W.err, lastOk: W.lastOk, lastErr: W.lastErr,
      errAt: W.errAt, errText: W.errText, visuErrors: W.visuErrors,
      sent: W.sent, lastSend: W.lastSend, pending: W.pending.size,
      oldestPending: W.pending.size ? Math.min(...W.pending.values()) : 0,
      delay: Number(window.__wvPollDelay) || 0,
      width: window.innerWidth, height: window.innerHeight, texts,
    });
  };
})();
"""


# --------------------------------------------------------------------------------------------
# Minimaler WebSocket-Client fuer das DevTools-Protokoll (nur Standardbibliothek)
# --------------------------------------------------------------------------------------------

class WebSocket:
    def __init__(self, url, timeout=CDP_TIMEOUT_SECONDS):
        parts = urlsplit(url)
        self.sock = socket.create_connection((parts.hostname, parts.port), timeout=timeout)
        self.sock.settimeout(timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        path = parts.path + (f"?{parts.query}" if parts.query else "")
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {parts.hostname}:{parts.port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(request.encode())
        self._buffer = b""
        header = self._read_until(b"\r\n\r\n")
        if b" 101 " not in header.split(b"\r\n", 1)[0]:
            raise ConnectionError(f"WebSocket handshake failed: {header[:200]!r}")

    def _read_until(self, marker):
        while marker not in self._buffer:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("connection closed")
            self._buffer += chunk
        head, self._buffer = self._buffer.split(marker, 1)
        return head

    def _read_exact(self, size):
        chunks = [self._buffer[:size]]
        have = len(chunks[0])
        self._buffer = self._buffer[size:]
        while have < size:
            chunk = self.sock.recv(max(65536, size - have))
            if not chunk:
                raise ConnectionError("connection closed")
            if have + len(chunk) > size:
                self._buffer = chunk[size - have:]
                chunk = chunk[:size - have]
            chunks.append(chunk)
            have += len(chunk)
        return b"".join(chunks)

    def _send_frame(self, opcode, payload):
        header = bytearray([0x80 | opcode])
        length = len(payload)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header += struct.pack("!H", length)
        else:
            header.append(0x80 | 127)
            header += struct.pack("!Q", length)
        mask = os.urandom(4)
        header += mask
        repeated = (mask * (length // 4 + 1))[:length]
        masked = (int.from_bytes(payload, "big") ^ int.from_bytes(repeated, "big")).to_bytes(length, "big") if length else b""
        self.sock.sendall(bytes(header) + masked)

    def send(self, text):
        self._send_frame(0x1, text.encode("utf-8"))

    def recv(self):
        message = []
        while True:
            b1, b2 = self._read_exact(2)
            opcode = b1 & 0x0F
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self._read_exact(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self._read_exact(8))[0]
            if b2 & 0x80:
                mask = self._read_exact(4)
                data = bytes(c ^ mask[i % 4] for i, c in enumerate(self._read_exact(length)))
            else:
                data = self._read_exact(length)
            if opcode == 0x8:
                raise ConnectionError("websocket closed by browser")
            if opcode == 0x9:
                self._send_frame(0xA, data)
                continue
            if opcode == 0xA:
                continue
            message.append(data)
            if b1 & 0x80:
                return b"".join(message).decode("utf-8")

    def close(self):
        try:
            self._send_frame(0x8, b"")
        except OSError:
            pass
        try:
            self.sock.close()
        except OSError:
            pass


class CdpSession:
    """DevTools-Verbindung zu einem Tab. Synchron: Befehl senden, auf Antwort warten."""

    def __init__(self, ws_url):
        self.ws = WebSocket(ws_url)
        self.next_id = 0

    def call(self, method, params=None, timeout=CDP_TIMEOUT_SECONDS):
        self.next_id += 1
        msg_id = self.next_id
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            # Frist auch dann einhalten, wenn der Browser laufend andere Ereignisse schickt
            if remaining <= 0:
                raise TimeoutError(f"{method}: no reply within {timeout:.0f}s")
            self.ws.sock.settimeout(max(0.1, remaining))
            try:
                reply = json.loads(self.ws.recv())
            except socket.timeout:
                raise TimeoutError(f"{method}: no reply within {timeout:.0f}s") from None
            if reply.get("id") != msg_id:
                continue  # Ereignisse ignorieren
            if "error" in reply:
                raise RuntimeError(f"{method}: {reply['error'].get('message')}")
            return reply.get("result", {})

    def evaluate(self, expression, timeout=CDP_TIMEOUT_SECONDS):
        result = self.call(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True},
            timeout=timeout,
        )
        if "exceptionDetails" in result:
            raise RuntimeError(f"JS error: {result['exceptionDetails'].get('text')}")
        return result.get("result", {}).get("value")

    def close(self):
        self.ws.close()


# --------------------------------------------------------------------------------------------
# Browser
# --------------------------------------------------------------------------------------------

def kill_children_on_exit():
    """
    Windows: diesen Prozess in ein Job-Objekt mit KILL_ON_JOB_CLOSE legen. Alle Browser-Prozesse
    erben den Job und werden beendet, sobald der Collector endet - auch bei Absturz oder
    Taskkill. Sonst bliebe Edge stehen und belegte weiter eine WebVisu-Sitzung der SPS.
    """
    if os.name != "nt":
        return None
    import ctypes
    from ctypes import wintypes

    class BasicLimits(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", ctypes.c_int64),
            ("PerJobUserTimeLimit", ctypes.c_int64),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class IoCounters(ctypes.Structure):
        _fields_ = [(name, ctypes.c_uint64) for name in (
            "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
            "ReadTransferCount", "WriteTransferCount", "OtherTransferCount",
        )]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", BasicLimits),
            ("IoInfo", IoCounters),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateJobObjectW.restype = wintypes.HANDLE
    kernel32.GetCurrentProcess.restype = wintypes.HANDLE
    kernel32.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    job = kernel32.CreateJobObjectW(None, None)
    info = ExtendedLimits()
    info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    ok = job and kernel32.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info))
    ok = ok and kernel32.AssignProcessToJobObject(job, kernel32.GetCurrentProcess())
    if not ok:
        logging.warning("Job-Objekt nicht moeglich (Fehler %s) - Edge muss beim Beenden ggf. von Hand "
                        "geschlossen werden", ctypes.get_last_error())
    return job  # Handle bis Prozessende offen halten


def find_browser(configured=None):
    candidates = [configured] if configured else []
    candidates += [os.environ.get("WEBVISU_BROWSER")] + BROWSER_CANDIDATES
    for path in candidates:
        if path and Path(path).is_file():
            return path
    for name in ("msedge", "chrome", "chromium", "google-chrome"):
        found = shutil.which(name)
        if found:
            return found
    raise FileNotFoundError("Kein Edge/Chrome gefunden - Pfad als \"browser\" in webvisu_clients.json angeben")


class HeadlessBrowser:
    def __init__(self, browser_path, viewport, headless=True):
        self.browser_path = browser_path
        self.viewport = viewport
        self.headless = headless
        self.process = None
        self.profile_dir = None
        self.port = None

    @staticmethod
    def remove_stale_profiles():
        """
        Profile frueherer Laeufe (nach hartem Beenden) loeschen. Ein laufender Edge haelt die Datei
        `lockfile` im Profil offen; solche Profile (z. B. vom Dienst neben --discover) bleiben stehen.
        """
        for path in Path(tempfile.gettempdir()).glob("webvisu_edge_*"):
            try:
                (path / "lockfile").unlink(missing_ok=True)
            except OSError:
                continue
            shutil.rmtree(path, ignore_errors=True)

    def start(self):
        self.profile_dir = tempfile.mkdtemp(prefix="webvisu_edge_")
        width, height = self.viewport
        args = [
            self.browser_path,
            "--remote-debugging-port=0",
            f"--user-data-dir={self.profile_dir}",
            f"--window-size={width},{height}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-sync",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-features=IntensiveWakeUpThrottling,msEdgeSidebarV2,EdgeCollections",
            "--ignore-certificate-errors",
            "--mute-audio",
            "about:blank",
        ]
        if self.headless:
            args.insert(1, "--headless=new")
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if self.headless else 0
        self.process = subprocess.Popen(
            args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=creationflags,
        )

        port_file = Path(self.profile_dir) / "DevToolsActivePort"
        deadline = time.monotonic() + BROWSER_START_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError(f"Browser beendet sich sofort (Exit-Code {self.process.returncode})")
            try:
                self.port = int(port_file.read_text().splitlines()[0])
                break
            except (FileNotFoundError, IndexError, ValueError):
                time.sleep(0.2)
        else:
            raise TimeoutError("Browser hat den DevTools-Port nicht geoeffnet")

    def page_ws_url(self):
        deadline = time.monotonic() + BROWSER_START_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/list", timeout=5) as resp:
                    targets = json.loads(resp.read())
                for target in targets:
                    if target.get("type") == "page" and target.get("webSocketDebuggerUrl"):
                        return target["webSocketDebuggerUrl"]
            except OSError:
                pass
            time.sleep(0.3)
        raise TimeoutError("Kein Browser-Tab gefunden")

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
        self.process = None
        if self.profile_dir:
            shutil.rmtree(self.profile_dir, ignore_errors=True)
            self.profile_dir = None


# --------------------------------------------------------------------------------------------
# Konfiguration
# --------------------------------------------------------------------------------------------

@dataclass
class MetricConfig:
    gauge_name: str
    # Position des Werts; ohne x/y wird der Wert ueber `label` gesucht
    x: float = None
    y: float = None
    # Beschriftung neben dem Wert. Mit x/y: Wert gilt nur, wenn genau diese Beschriftung daneben
    # steht (Schutz gegen falsche Seite / verschobenes Layout). Ohne x/y: Wert neben dieser
    # Beschriftung nehmen.
    label: str = ""
    # Wo die Beschriftung steht: "left" (links in derselben Zeile) oder "above" (darueber)
    label_pos: str = "left"
    tolerance: float = DEFAULT_TOLERANCE_PX
    # Text -> Zahl, z. B. {"EIN": 1, "AUS": 0}; sonst wird die erste Zahl im Text genommen
    map: dict = field(default_factory=dict)
    scale: float = 1.0
    offset: float = 0.0
    # Rechteck des Visu-Elements [x, y, Breite, Hoehe] in Projekt-Koordinaten (aus CODESYS);
    # wird ueber die `anchors` der Seite auf Bildschirm-Pixel umgerechnet
    rect: tuple = None


@dataclass
class AnchorConfig:
    """Feste Beschriftung der Seite mit ihrer Lage im CODESYS-Projekt, zur Kalibrierung."""
    text: str
    x: float
    y: float
    # Welche Kante des Texts bei x liegt: "center", "left" oder "right" (Textausrichtung im Element)
    align: str = "center"


@dataclass
class PageConfig:
    name: str
    # Klickfolge von der Startseite aus: [x, y] oder {"text": "Setup"} (Text auf der Seite anklicken)
    clicks: list = field(default_factory=list)
    back_clicks: list = field(default_factory=list)  # eigener Rueckweg statt home_clicks
    expect_text: list = field(default_factory=list)
    anchors: list = field(default_factory=list)
    metrics: list = field(default_factory=list)
    # Wie oft die Seite besucht wird (s) und wie lange hoechstens auf vollstaendige Werte gewartet wird
    every: float = 900.0
    settle: float = 12.0


@dataclass
class ControllerConfig:
    name: str
    url: str
    viewport: tuple = (1280, 1024)
    read_interval: float = 2.0
    # Klickfolge nach dem Laden, um zur richtigen Visu-Seite zu kommen: [[x, y], ...]
    clicks: list = field(default_factory=list)
    # Texte, die auf der Seite stehen muessen; sonst ist es die falsche Seite -> keine Werte
    expect_text: list = field(default_factory=list)
    browser: str = ""
    metrics: list = field(default_factory=list)
    anchors: list = field(default_factory=list)
    # Weitere Seiten, die abwechselnd in derselben Sitzung gelesen werden
    pages: list = field(default_factory=list)
    # Klickfolge zurueck zur Startseite nach dem Besuch einer Seite (leer: Seite neu laden)
    home_clicks: list = field(default_factory=list)
    # Anfragen des Browsers an die SPS um so viele ms verzoegern (entlastet die SPS, Werte
    # kommen entsprechend seltener). 0 = wie im normalen Browser. poll_delay_ms im Ruhebetrieb auf
    # der Startseite, nav_delay_ms beim Laden und bei Seitenwechseln (brauchen viele Anfragen)
    poll_delay_ms: int = 0
    turns: bool = False  # Reihum-Abfrage mit den anderen Sitzungen (siehe TURN_LOCK)
    nav_delay_ms: int = 0
    # Datei mit {"username": ..., "password": ...}: nach jedem Laden der Visu anmelden (leer: kein Login).
    # Relativ zum Ordner dieses Skripts; steht in einstellungen.json als login_datei
    login_file: str = ""


def _clicks_from_list(raw, where):
    clicks = []
    for c in raw:
        if isinstance(c, dict) and "text" in c:
            # index: welcher von mehreren gleichen Texten (oben links zuerst); ohne index muss er eindeutig sein
            # then: Text, der nach dem Klick erscheinen muss, bevor der naechste Klick folgt
            clicks.append(("text", str(c["text"]), int(c["index"]) if "index" in c else None, c.get("then")))
        elif isinstance(c, (list, tuple)) and len(c) == 2:
            clicks.append(("xy", float(c[0]), float(c[1]), None))
        else:
            raise ValueError(f"{where}: Klick {c!r} muss [x, y] oder {{\"text\": ...}} sein")
    return clicks


def _metrics_from_list(raw, where, has_anchors):
    metrics = []
    for m in raw:
        has_xy = "x" in m and "y" in m
        rect = m.get("rect")
        if not has_xy and not m.get("label") and not rect:
            raise ValueError(f"{where}/{m.get('gauge_name')}: x/y, rect oder label angeben")
        if rect and not has_anchors:
            raise ValueError(f"{where}/{m.get('gauge_name')}: rect braucht anchors auf der Seite")
        if m.get("label_pos", "left") not in ("left", "above"):
            raise ValueError(f"{where}/{m.get('gauge_name')}: label_pos muss left oder above sein")
        metrics.append(MetricConfig(
            gauge_name=m["gauge_name"],
            x=float(m["x"]) if has_xy else None,
            y=float(m["y"]) if has_xy else None,
            label=str(m.get("label", "")),
            label_pos=m.get("label_pos", "left"),
            tolerance=float(m.get("tolerance", DEFAULT_TOLERANCE_PX)),
            map={str(k).strip().upper(): float(v) for k, v in m.get("map", {}).items()},
            scale=float(m.get("scale", 1.0)),
            offset=float(m.get("offset", 0.0)),
            rect=tuple(float(v) for v in rect) if rect else None,
        ))
    return metrics


def _anchors_from_list(raw, where):
    anchors = [AnchorConfig(text=str(a["text"]), x=float(a["x"]), y=float(a["y"]), align=a.get("align", "center"))
               for a in raw]
    if anchors and len(anchors) < 2:
        raise ValueError(f"{where}: mindestens 2 anchors noetig")
    for a in anchors:
        if a.align not in ("center", "left", "right"):
            raise ValueError(f"{where}: anchor {a.text!r}: align muss center, left oder right sein")
    return anchors


def controller_config_from_dict(entry):
    name = entry.get("name")
    anchors = _anchors_from_list(entry.get("anchors", []), name)
    pages = []
    for p in entry.get("pages", []):
        where = f"{name}/{p.get('name')}"
        page_anchors = _anchors_from_list(p.get("anchors", []), where)
        pages.append(PageConfig(
            name=p["name"],
            clicks=_clicks_from_list(p.get("clicks", []), where),
            back_clicks=_clicks_from_list(p.get("back_clicks", []), where),
            expect_text=[str(t) for t in p.get("expect_text", [])],
            anchors=page_anchors,
            metrics=_metrics_from_list(p.get("metrics", []), where, bool(page_anchors)),
            every=float(p.get("every", 900)),
            settle=float(p.get("settle", 12)),
        ))
    if pages and not entry.get("expect_text"):
        raise ValueError(f"{name}: mit pages muss expect_text gesetzt sein (Erkennung der Startseite)")
    viewport = entry.get("viewport", [1280, 1024])
    return ControllerConfig(
        name=entry["name"],
        url=entry["url"],
        viewport=(int(viewport[0]), int(viewport[1])),
        read_interval=float(entry.get("read_interval", 2.0)),
        clicks=_clicks_from_list(entry.get("clicks", []), name),
        expect_text=[str(t) for t in entry.get("expect_text", [])],
        browser=entry.get("browser", ""),
        metrics=_metrics_from_list(entry.get("metrics", []), name, bool(anchors)),
        anchors=anchors,
        pages=pages,
        home_clicks=_clicks_from_list(entry.get("home_clicks", []), f"{name}/home_clicks"),
        poll_delay_ms=int(entry.get("poll_delay_ms", 0)),
        turns=bool(entry.get("turns", False)),
        nav_delay_ms=int(entry.get("nav_delay_ms", 0)),
        login_file=str(entry.get("login_file", "")),
    )


def home_page(config):
    """Die Startseite (Werte der obersten Ebene der Konfiguration) als Seite."""
    return PageConfig(name="Start", clicks=config.clicks, expect_text=config.expect_text,
                      anchors=config.anchors, metrics=config.metrics)


def load_configs(path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(f"{path} muss eine JSON-Liste enthalten")
    return [controller_config_from_dict(entry) for entry in raw]


# --------------------------------------------------------------------------------------------
# Werte aus den gezeichneten Texten
# --------------------------------------------------------------------------------------------

def text_at(texts, x, y, tolerance):
    """Neuester Text, dessen Rechteck den Punkt (mit Toleranz) enthaelt."""
    best = None
    for entry in texts:
        x0, y0, x1, y1 = entry["box"]
        if x0 - tolerance <= x <= x1 + tolerance and y0 - tolerance <= y <= y1 + tolerance:
            if best is None or entry["id"] > best["id"]:
                best = entry
    return best


def _row_overlap(a, b):
    """Anteil der senkrechten Ueberlappung zweier Rechtecke (bezogen auf das niedrigere)."""
    overlap = min(a[3], b[3]) - max(a[1], b[1])
    return overlap / max(1.0, min(a[3] - a[1], b[3] - b[1]))


def _col_overlap(a, b):
    overlap = min(a[2], b[2]) - max(a[0], b[0])
    return overlap / max(1.0, min(a[2] - a[0], b[2] - b[0]))


def neighbour(texts, entry, direction):
    """Naechster Text links/rechts (gleiche Zeile) bzw. darueber/darunter (gleiche Spalte)."""
    box = entry["box"]
    best, best_gap = None, None
    for other in texts:
        if other is entry:
            continue
        b = other["box"]
        if direction in ("left", "right"):
            if _row_overlap(box, b) < 0.5:
                continue
            gap = box[0] - b[2] if direction == "left" else b[0] - box[2]
        else:
            if _col_overlap(box, b) < 0.3:
                continue
            gap = box[1] - b[3] if direction == "above" else b[1] - box[3]
        if gap < -2:
            continue
        if best is None or gap < best_gap:
            best, best_gap = other, gap
    return best


def same_text(a, b):
    return " ".join(a.split()).upper() == " ".join(b.split()).upper()


def load_login(path):
    """(Benutzername, Passwort) aus der Login-Datei. Die Werte werden nie ausgegeben oder protokolliert."""
    name = Path(path).name
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except OSError as exc:
        raise ValueError(f"Login-Datei {name}: {exc.strerror or exc}") from None
    except ValueError as exc:
        raise ValueError(f"Login-Datei {name} ist kein gueltiges JSON ({exc})") from None
    user, password = str(data.get("username", "")), str(data.get("password", ""))
    if not user:
        raise ValueError(f"Login-Datei {name}: username ist leer - Zugangsdaten eintragen")
    return user, password


def resolve_login_file(value):
    """Pfad der Login-Datei: absolut oder relativ zum Ordner dieses Skripts."""
    path = Path(value)
    return str(path if path.is_absolute() else Path(__file__).with_name(value))


# In der Seite: Eingabefelder des Anmeldedialogs finden. Jedes Visu-Element ist ein Canvas; die Ids sind
# NICHT eindeutig (der Ok-Knopf des Dialogs teilt sich die Id mit einem Symbol der Seite), darum nur nach
# Lage: der Rahmen ist das kleinste Canvas, das beide Beschriftungen enthaelt, die Felder liegen darin
# rechts neben der jeweiligen Beschriftung in derselben Zeile.
LOGIN_FIELDS_JS = """(lu, lp) => {
  const all = [...document.querySelectorAll('canvas')].map(c => { const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height }; }).filter(r => r.w > 0 && r.h > 0);
  const centre = b => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  const inside = (r, p) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;
  const cu = centre(lu), cp = centre(lp);
  const frame = all.filter(r => inside(r, cu) && inside(r, cp)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  if (!frame) { return null; }
  const field = (label, c) => all.filter(r => r.x >= frame.x - 1 && r.y >= frame.y - 1
      && r.x + r.w <= frame.x + frame.w + 1 && r.y + r.h <= frame.y + frame.h + 1
      && r.x >= label[2] - 5 && r.w >= 100 && r.h <= 40 && c[1] >= r.y && c[1] <= r.y + r.h).sort((a, b) => a.x - b.x)[0];
  const u = field(lu, cu), p = field(lp, cp);
  return (u && p) ? { user: [u.x, u.y, u.w, u.h], pass: [p.x, p.y, p.w, p.h] } : null;
}"""


def _fit_axis(pairs):
    """Gerade Seite = a * Projekt + b durch (Projekt, Seite)-Paare (kleinste Quadrate)."""
    n = len(pairs)
    mx = sum(d for d, _ in pairs) / n
    my = sum(p for _, p in pairs) / n
    sxx = sum((d - mx) ** 2 for d, _ in pairs)
    if n < 2 or max(d for d, _ in pairs) - min(d for d, _ in pairs) < 40:
        return None
    a = sum((d - mx) * (p - my) for d, p in pairs) / sxx
    return a, my - a * mx


def calibrate(texts, anchors):
    """
    Umrechnung Projekt-Koordinaten -> Bildschirm-Pixel aus festen Beschriftungen der Seite.
    Gibt ((ax, bx), (ay, by)) und "" zurueck, oder None und den Grund.
    """
    xs, ys, problems = [], [], []
    for anchor in anchors:
        hits = [t for t in texts if same_text(t["text"], anchor.text)]
        if len(hits) != 1:
            problems.append(f"{anchor.text!r} {'fehlt' if not hits else f'{len(hits)}x'}")
            continue
        x0, y0, x1, y1 = hits[0]["box"]
        px = {"center": (x0 + x1) / 2, "left": x0, "right": x1}[anchor.align]
        xs.append((anchor.x, px))
        ys.append((anchor.y, (y0 + y1) / 2))
    if problems:
        return None, "Beschriftung " + ", ".join(problems)
    fx, fy = _fit_axis(xs), _fit_axis(ys)
    if fx is None or fy is None:
        return None, "Beschriftungen liegen zu dicht beieinander"
    if not (0.2 < fx[0] < 5 and 0.2 < fy[0] < 5):
        return None, f"unplausibler Massstab ({fx[0]:.2f} / {fy[0]:.2f})"
    err = max([abs(fx[0] * d + fx[1] - p) for d, p in xs] + [abs(fy[0] * d + fy[1] - p) for d, p in ys])
    if err > CALIBRATION_MAX_ERROR_PX:
        return None, f"Beschriftungen passen nicht zum Projekt (Abweichung {err:.0f} px)"
    return (fx, fy), ""


def page_rect(calib, rect, tolerance):
    (ax, bx), (ay, by) = calib
    x, y, w, h = rect
    return (ax * x + bx - tolerance, ay * y + by - tolerance,
            ax * (x + w) + bx + tolerance, ay * (y + h) + by + tolerance)


def find_value(texts, metric, calib=None):
    """
    Text fuer eine Metrik. Gibt (Eintrag, Grund) zurueck; Eintrag None, wenn kein sicherer Wert da ist.
    """
    if metric.rect is not None:
        if calib is None:
            return None, "Seite nicht kalibriert"
        x0, y0, x1, y1 = page_rect(calib, metric.rect, metric.tolerance)
        inside = [t for t in texts
                  if x0 <= (t["box"][0] + t["box"][2]) / 2 <= x1 and y0 <= (t["box"][1] + t["box"][3]) / 2 <= y1]
        # Nur reine Werte (Zahl mit Einheit, TRUE/FALSE) oder Texte aus `map`: eine Beschriftung wie
        # "TT004 - Istwert", die ins Rechteck ragt, darf nie als Wert 4 gelesen werden
        inside = [t for t in inside if VALUE_TEXT_RE.match(t["text"]) or t["text"].strip().upper() in metric.map]
        if not inside:
            return None, f"kein Wert im Element bei ({(x0 + x1) / 2:.0f}, {(y0 + y1) / 2:.0f})"
        entry = max(inside, key=lambda t: t["id"])
        if metric.label:
            found = neighbour(texts, entry, metric.label_pos)
            if found is None or not same_text(found["text"], metric.label):
                return None, f"Beschriftung {metric.label!r} fehlt"
        return entry, ""

    if metric.x is None:
        labels = [t for t in texts if same_text(t["text"], metric.label)]
        if not labels:
            return None, f"Beschriftung {metric.label!r} nicht gefunden"
        if len(labels) > 1:
            return None, f"Beschriftung {metric.label!r} {len(labels)}x auf der Seite - x/y angeben"
        entry = neighbour(texts, labels[0], "right" if metric.label_pos == "left" else "below")
        if entry is None:
            return None, f"kein Text {'rechts neben' if metric.label_pos == 'left' else 'unter'} {metric.label!r}"
        return entry, ""

    entry = text_at(texts, metric.x, metric.y, metric.tolerance)
    if entry is None:
        return None, f"kein Text bei ({metric.x:.0f}, {metric.y:.0f})"
    if metric.label:
        found = neighbour(texts, entry, metric.label_pos)
        if found is None or not same_text(found["text"], metric.label):
            return None, (f"Beschriftung {metric.label!r} fehlt "
                          f"(gefunden: {found['text'] if found else 'nichts'!r})")
    return entry, ""


BOOL_TEXTS = {"TRUE": 1.0, "FALSE": 0.0}
# Text, der nur ein Wert ist (Zahl mit optionaler Einheit oder TRUE/FALSE) - fuer --discover
VALUE_TEXT_RE = re.compile(r"^\s*(?:[-+]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?\s*[^\d\s]{0,6}|TRUE|FALSE)\s*$", re.IGNORECASE)


def parse_value(text, metric):
    key = text.strip().upper()
    if key in metric.map:
        return metric.map[key]
    if key in BOOL_TEXTS:
        return BOOL_TEXTS[key]
    match = NUMBER_RE.search(text)
    if not match:
        return None
    return float(match.group(0).replace(",", ".")) * metric.scale + metric.offset


# --------------------------------------------------------------------------------------------
# Prometheus-Ausgabe (Text-Format, ohne prometheus_client)
# --------------------------------------------------------------------------------------------

METRIC_NAME_RE = re.compile(r"^[a-zA-Z_:][a-zA-Z0-9_:]*$")


class MetricStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._values = {}   # controller -> {gauge_name: value}
        self._status = {}   # controller -> {status_metric: value}

    def update(self, controller, values, status):
        with self._lock:
            self._values[controller] = dict(values)
            self._status[controller] = dict(status)

    def render(self):
        lines = []
        with self._lock:
            values = {}
            for per_controller in self._values.values():
                values.update(per_controller)
            for name in sorted(values):
                lines.append(f"# TYPE {name} gauge")
                lines.append(f"{name} {values[name]!r}")
            status_names = sorted({n for s in self._status.values() for n in s})
            for name in status_names:
                lines.append(f"# TYPE {name} gauge")
                for controller in sorted(self._status):
                    if name in self._status[controller]:
                        label = controller.replace("\\", "\\\\").replace('"', '\\"')
                        lines.append(f'{name}{{controller="{label}"}} {self._status[controller][name]!r}')
        return ("\n".join(lines) + "\n").encode("utf-8")


def start_http_server(store, port):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.split("?")[0] not in ("/metrics", "/"):
                self.send_error(404)
                return
            body = store.render()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    class ExclusiveServer(ThreadingHTTPServer):
        # Unter Windows erlaubt SO_REUSEADDR, einen belegten Port ein zweites Mal zu binden; zwei
        # Collectoren wuerden dann abwechselnd abgefragt. Deshalb exklusiv binden.
        allow_reuse_address = os.name != "nt"

        def server_bind(self):
            if os.name == "nt":
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            super().server_bind()

    class DualStackServer(ExclusiveServer):
        # IPv4 und IPv6: "localhost" wird unter Windows zuerst als ::1 versucht; ohne IPv6 dauert
        # jede Abfrage ueber localhost bis zu 2 s
        address_family = socket.AF_INET6

        def server_bind(self):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            super().server_bind()

    try:
        server = DualStackServer(("::", port), Handler)
    except OSError as exc:
        if getattr(exc, "winerror", None) == 10048 or exc.errno in (98, 10048):
            raise OSError(f"Port {port} ist schon belegt - laeuft der Collector bereits?") from None
        server = ExclusiveServer(("0.0.0.0", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


# --------------------------------------------------------------------------------------------
# Eine WebVisu
# --------------------------------------------------------------------------------------------

def page_clock(snap):
    """Uhrzeit der Visu (Sekunden seit Mitternacht) aus dem obersten hh:mm:ss-Text der Seite, sonst None."""
    hits = sorted((t for t in (snap or {}).get("texts", []) if CLOCK_RE.match(t["text"].strip())),
                  key=lambda t: (round(t["box"][1]), t["box"][0]))
    if not hits:
        return None
    h, m, sec = (int(x) for x in hits[0]["text"].strip().split(":"))
    return h * 3600 + m * 60 + sec


class WebVisuController:
    def __init__(self, config, store, stop_event, debug=False, headless=True):
        self.config = config
        self.store = store
        self.stop_event = stop_event
        self.debug = debug
        self.headless = headless
        self.logger = logging.getLogger(config.name)
        self.browser = None
        self.session = None
        self.loaded_at = 0.0
        self.clicks_done = False
        self.failures = 0
        self.last_values = {}
        self.missing_warned = set()
        self.poll_delay_active = 0
        self.page_values = {}  # gauge_name -> (Wert, Zeitpunkt) der weiteren Seiten
        self.clicks_performed = 0
        self.since_ms = 0
        self.ready_since_load = False
        self.last_home = None  # (Werte der Startseite, Zeitpunkt) fuer HOLD_SECONDS
        self.next_visit = {}
        self.login_done = not config.login_file  # je Seitenladen einmal; nach dem Neuladen ist die Sitzung der SPS neu
        self.navigation_locked = False
        self.turn_held = False
        self.clock = None  # (Uhrzeit der Visu, Zeitpunkt der letzten Aenderung)
        self.login_last_try = 0.0
        self.login_attempts = 0  # gescheiterte Anmeldungen hintereinander
        self.login_gave_up = False

    # --- Lebenszyklus ---

    def open(self):
        self.browser = HeadlessBrowser(find_browser(self.config.browser), self.config.viewport, self.headless)
        self.browser.start()
        self.session = CdpSession(self.browser.page_ws_url())
        width, height = self.config.viewport
        self.session.call("Emulation.setDeviceMetricsOverride", {
            "width": width, "height": height, "deviceScaleFactor": 1, "mobile": False,
        })
        self.session.call("Emulation.setFocusEmulationEnabled", {"enabled": True})
        self.session.call("Page.enable")  # noetig, damit das Skript vor webvisu.js eingebunden wird
        # Schon das Laden der Visu laeuft gedrosselt (nav_delay_ms)
        self.session.call("Page.addScriptToEvaluateOnNewDocument",
                          {"source": f"window.__wvPollDelay = {int(self.config.nav_delay_ms)};"})
        self.session.call("Page.addScriptToEvaluateOnNewDocument", {"source": HOOK_JS})
        self.load_page()

    def load_page(self):
        result = self.session.call("Page.navigate", {"url": self.config.url}, timeout=NAVIGATE_TIMEOUT_SECONDS)
        if result.get("errorText"):
            raise ConnectionError(f"{self.config.url}: {result['errorText']}")
        self.loaded_at = time.monotonic()
        self.clicks_done = not self.config.clicks
        self.login_done = not self.config.login_file
        self.poll_delay_active = self.config.nav_delay_ms  # so vom Skript beim Laden gesetzt
        self.ready_since_load = False
        # Browser-Zeit (ms), ab der gezeichnete Texte der Startseite gelten; nach dem Laden alle
        self.since_ms = 0
        self.logger.info("Seite geladen: %s", self.config.url)

    def close(self):
        if self.session:
            try:
                self.session.close()
            except Exception:
                pass
            self.session = None
        if self.browser:
            self.browser.stop()
            self.browser = None

    def run_clicks(self):
        self.perform_clicks(self.config.clicks)
        self.clicks_done = True

    def perform_clicks(self, clicks, since=0):
        """
        Klickfolge ausfuehren. Klickziele per Text werden auf der aktuellen Seite gesucht. Hat ein
        Klick `then`, wird gewartet, bis dieser Text erscheint (gezeichnet nach `since`, Browser-Zeit
        in ms): Erst dann hat die SPS den Klick verarbeitet. Sonst landet der naechste Klick u. U. noch
        in der vorigen Ansicht, wenn dort an derselben Stelle ein gleich beschrifteter Button liegt.
        """
        self.clicks_performed = 0
        for click in clicks:
            then = click[3]
            if click[0] == "text":
                _, text, index, _ = click
                # Warten, bis die Visu das Ziel gezeichnet hat (die SPS kann langsam antworten)
                deadline = time.monotonic() + CLICK_TARGET_TIMEOUT_SECONDS
                while True:
                    snap = self.snapshot()
                    hits = sorted((t for t in (snap or {}).get("texts", []) if same_text(t["text"], text)),
                                  key=lambda t: (round(t["box"][1]), t["box"][0]))
                    if len(hits) > (index or 0) and not (index is None and len(hits) > 1):
                        break
                    if time.monotonic() >= deadline or self.stop_event.wait(1.0):
                        raise LookupError(f"Klickziel {text!r} " + ("nicht gefunden" if not hits else f"{len(hits)}x auf der Seite"))
                x0, y0, x1, y1 = hits[index or 0]["box"]
                x, y = (x0 + x1) / 2, (y0 + y1) / 2
            else:
                _, x, y, _ = click
            self.click(x, y)
            self.clicks_performed += 1
            if self.stop_event.wait(CLICK_STEP_DELAY_SECONDS):
                return
            if then:
                deadline = time.monotonic() + CLICK_TARGET_TIMEOUT_SECONDS
                while True:
                    snap = self.snapshot()
                    if any(same_text(t["text"], then) and t["t"] >= max(since, snap.get("errAt") or 0)
                           for t in (snap or {}).get("texts", [])):
                        break
                    if time.monotonic() >= deadline or self.stop_event.wait(1.0):
                        label = click[1] if click[0] == "text" else f"({click[1]:.0f}, {click[2]:.0f})"
                        raise LookupError(f"nach Klick {label!r} erscheint {then!r} nicht")

    def click(self, x, y):
        for kind in ("mouseMoved", "mousePressed", "mouseReleased"):
            params = {"type": kind, "x": x, "y": y, "button": "left", "clickCount": 1}
            if kind == "mouseMoved":
                params["button"] = "none"
            self.session.call("Input.dispatchMouseEvent", params)
            time.sleep(0.05)

    def set_poll_delay(self, delay_ms):
        """
        Anfragen an die SPS verzoegern: poll_delay_ms im Ruhebetrieb auf der Startseite,
        nav_delay_ms beim Laden und bei Seitenwechseln (die brauchen viele Anfragen hintereinander).
        """
        if delay_ms != self.poll_delay_active:
            self.session.evaluate(f"window.__wvPollDelay = {int(delay_ms)}")
            self.poll_delay_active = delay_ms

    def snapshot(self):
        """Texte der Seite; None, solange die Seite (neu) laedt. Zeitueberschreitung wird weitergereicht."""
        try:
            raw = self.session.evaluate("window.__wv ? window.__wv.snapshot() : null")
            return json.loads(raw) if raw is not None else None
        except (RuntimeError, ValueError):
            # z. B. "Execution context was destroyed" waehrend eines Neuladens
            return None

    # --- Anmeldung ---

    def texts(self, canvas_prefix=None, outside_prefix=None):
        """Texte der Seite, optional nur von Canvases mit diesem Praefix bzw. ohne dieses Praefix."""
        texts = (self.snapshot() or {}).get("texts", [])
        if canvas_prefix:
            texts = [t for t in texts if t["canvas"].startswith(canvas_prefix)]
        if outside_prefix:
            texts = [t for t in texts if not t["canvas"].startswith(outside_prefix)]
        return texts

    def find_exact(self, wanted, canvas_prefix=None, outside_prefix=None, shallowest=False):
        """Text mit genau dieser Schreibweise (Gross-/Kleinschreibung zaehlt: 'm' und 'M' sind verschiedene Tasten)."""
        wanted = wanted if isinstance(wanted, (tuple, list)) else (wanted,)
        hits = [t for t in self.texts(canvas_prefix, outside_prefix) if t["text"] in wanted]
        if shallowest:  # oberste Ebene zuerst: cdsCanvas_1_7 vor cdsCanvas_1_12_6
            hits.sort(key=lambda t: t["canvas"].count("_"))
        return hits[0] if hits else None

    def wait_for(self, pick, error, timeout=LOGIN_TARGET_TIMEOUT_SECONDS):
        """Warten, bis pick() etwas liefert (nicht None); sonst LookupError(error)."""
        deadline = time.monotonic() + timeout
        while True:
            found = pick()
            if found is not None:
                return found
            if time.monotonic() >= deadline or self.stop_event.wait(0.5):
                raise LookupError(error)

    def login_click(self, x, y):
        """Klick bei der Anmeldung, danach LOGIN_CLICK_DELAY_SECONDS Pause."""
        self.click(x, y)
        self.stop_event.wait(LOGIN_CLICK_DELAY_SECONDS)

    def click_text(self, entry):
        x0, y0, x1, y1 = entry["box"]
        self.login_click((x0 + x1) / 2, (y0 + y1) / 2)

    def type_keys(self, text):
        """Text mit der Bildschirmtastatur der Visu eingeben. Eine Taste wird ueber ihre aktuelle Beschriftung gefunden;
        steht das Zeichen nicht auf der gezeigten Ebene, erst Shift druecken. Fehlermeldungen nennen nie das Zeichen."""
        for number, char in enumerate(text, start=1):
            key = self.find_exact(char, KEYBOARD_CANVAS_PREFIX)
            if key is None:
                shift = self.find_exact("Shift", KEYBOARD_CANVAS_PREFIX)
                if shift is None:
                    raise LookupError("Anmeldung: Taste 'Shift' der Bildschirmtastatur nicht gefunden")
                self.click_text(shift)
                key = self.wait_for(lambda: self.find_exact(char, KEYBOARD_CANVAS_PREFIX),
                                    f"Anmeldung: Zeichen {number} liegt auf keiner Ebene der Bildschirmtastatur", timeout=8.0)
            self.click_text(key)

    def redraw_page(self):
        """Visu komplett neu zeichnen lassen: Fenstergroesse kurz aendern (die Visu legt sich dann neu aus)."""
        width, height = self.config.viewport
        for w in (width + 2, width):
            self.session.call("Emulation.setDeviceMetricsOverride",
                              {"width": w, "height": height, "deviceScaleFactor": 1, "mobile": False})
            self.stop_event.wait(1.5)

    def login_now(self):
        """
        Wie von Hand anmelden: Knopf 'Login', im Dialog Benutzername und Passwort mit der Bildschirmtastatur
        der Visu eingeben (jeweils mit deren OK bestaetigen), dann 'Ok' im Dialog. Die Visu nimmt keine
        Tastaturereignisse an, darum werden Tasten angeklickt. Geklickt wird nur dieser Dialog.
        Erfolg = der Dialog schliesst sich. Danach LOGIN_SETTLE_SECONDS warten (die SPS braucht etwas, bis die
        Seite den Zustand zeigt) und die Seite neu zeichnen lassen.
        """
        user, password = load_login(self.config.login_file)
        # Der Knopf links oben heisst "Login" (abgemeldet) bzw. "Logout" (angemeldet). Die Anmeldung bleibt in der SPS auch fuer neue
        # Browser-Sitzungen stehen: dann ist schon alles erledigt.
        state = self.wait_for(lambda: "Login" if self.find_exact("Login", shallowest=True)
                              else ("Logout" if self.find_exact("Logout", shallowest=True) else None),
                              "Anmeldung: weder Knopf 'Login' noch 'Logout' gefunden")
        if state == "Logout":
            # Die Visu zeigt den Anmeldezustand der SPS (gilt fuer alle Clients), bedienen darf aber nur die Sitzung, die sich selbst
            # angemeldet hat (sonst bleibt z. B. "Select" wirkungslos). Darum erst abmelden, dann in dieser Sitzung selbst anmelden.
            self.logger.info("Anmeldung: die Visu zeigt schon 'Logout' (von einer anderen Sitzung angemeldet) - erst abmelden")
            self.click_text(self.find_exact("Logout", shallowest=True))
            self.wait_for(lambda: self.find_exact("Login", shallowest=True),
                          "Anmeldung: nach 'Logout' erscheint der Knopf 'Login' nicht", timeout=60.0)
        button = self.find_exact("Login", shallowest=True)
        self.click_text(button)
        dialog = lambda: self.find_exact(("User name:", "Benutzername:"))
        try:
            user_label = self.wait_for(dialog, "", timeout=30.0)
        except LookupError:
            # Klick von der langsamen SPS nicht verarbeitet: den Knopf einmal erneut anklicken (spart das Neuladen der Seite)
            button = self.find_exact("Login", shallowest=True)
            if button:
                self.logger.info("Anmeldung: der Dialog oeffnet sich nicht - 'Login' noch einmal anklicken")
                self.click_text(button)
            user_label = self.wait_for(dialog, "Anmeldung: der Anmeldedialog oeffnet sich nicht", timeout=60.0)
        pass_label = self.wait_for(lambda: self.find_exact(("Password:", "Passwort:")),
                                   "Anmeldung: der Anmeldedialog hat kein Passwortfeld")
        fields = self.session.evaluate("JSON.stringify((" + LOGIN_FIELDS_JS + ")(..." +
                                       json.dumps([user_label["box"], pass_label["box"]]) + "))")
        fields = json.loads(fields) if fields else None
        if not fields:
            raise LookupError("Anmeldung: Eingabefelder im Anmeldedialog nicht gefunden")
        for field, value in ((fields["user"], user), (fields["pass"], password)):
            self.login_click(field[0] + field[2] / 2, field[1] + field[3] / 2)
            self.wait_for(lambda: self.find_exact("OK", KEYBOARD_CANVAS_PREFIX), "Anmeldung: die Bildschirmtastatur erscheint nicht")
            self.type_keys(value)
            self.click_text(self.find_exact("OK", KEYBOARD_CANVAS_PREFIX))
            closed = lambda: True if not self.texts(KEYBOARD_CANVAS_PREFIX) else None
            try:
                self.wait_for(closed, "", timeout=25.0)
            except LookupError:
                # Die SPS antwortet langsam: das OK der Tastatur einmal wiederholen (harmlos, bestaetigt nur die Eingabe)
                self.click_text(self.find_exact("OK", KEYBOARD_CANVAS_PREFIX))
                self.wait_for(closed, "Anmeldung: die Bildschirmtastatur schliesst sich nicht (auch nicht nach 60 s)", timeout=35.0)
        # Das OK der Tastatur ist weg; uebrig bleibt der Ok-Knopf des Dialogs
        ok = self.wait_for(lambda: self.find_exact("Ok", outside_prefix=KEYBOARD_CANVAS_PREFIX),
                           "Anmeldung: Knopf 'Ok' im Anmeldedialog nicht gefunden")
        self.click_text(ok)
        self.wait_for(lambda: True if not self.find_exact(("User name:", "Benutzername:")) else None,
                      "Anmeldung: der Dialog bleibt nach Ok offen (Benutzername oder Passwort falsch?)", timeout=15.0)
        self.logger.info("Anmeldung: Dialog geschlossen, warte %.0fs", LOGIN_SETTLE_SECONDS)
        self.stop_event.wait(LOGIN_SETTLE_SECONDS)
        snap = self.snapshot()
        self.since_ms = snap["now"] if snap else 0  # danach gelten nur Texte, die beim Neuzeichnen kommen
        self.redraw_page()
        self.login_done = True

    def ensure_login(self):
        """Dienst: je Seitenladen hoechstens ein Versuch. Scheitert die Anmeldung, laeuft der Collector ohne sie weiter
        (die Werte der Startseite brauchen keine); nach LOGIN_MAX_ATTEMPTS Fehlschlaegen hintereinander wird nicht mehr
        versucht, damit eine falsche Eingabe den Benutzer nicht sperrt."""
        if self.login_done:
            return
        self.login_done = True
        if self.login_attempts >= LOGIN_MAX_ATTEMPTS and time.monotonic() - self.login_last_try > LOGIN_RETRY_AFTER_SECONDS:
            self.login_attempts = 0  # lange genug gewartet (kein Sperren durch schnelle Wiederholung): neu versuchen
            self.login_gave_up = False
        if self.login_attempts >= LOGIN_MAX_ATTEMPTS:
            if not self.login_gave_up:
                self.login_gave_up = True
                self.logger.error("Anmeldung nach %d gescheiterten Versuchen aufgegeben (Zugangsdaten pruefen, "
                                  "dann den Collector neu starten); es laeuft ohne Anmeldung weiter", LOGIN_MAX_ATTEMPTS)
            return
        self.login_attempts += 1
        self.login_last_try = time.monotonic()
        try:
            self.login_now()
            self.login_attempts = 0
            self.logger.info("Anmeldung durchgefuehrt")
        except Exception as exc:
            self.login_done = True
            self.logger.warning("Anmeldung gescheitert (Versuch %d von %d): %s", self.login_attempts, LOGIN_MAX_ATTEMPTS, exc)

    # --- Schleife ---

    def acquire_navigation(self):
        while not self.stop_event.is_set():
            if NAVIGATION_LOCK.acquire(timeout=1.0):
                self.navigation_locked = True
                return

    def release_navigation(self):
        if self.navigation_locked:
            self.navigation_locked = False
            NAVIGATION_LOCK.release()

    def run_forever(self):
        while not self.stop_event.is_set():
            try:
                self.acquire_navigation()
                self.open()
                self.poll_loop()
            except Exception as exc:
                self.failures += 1
                delay = min(MAX_RESTART_DELAY_SECONDS, INITIAL_RESTART_DELAY_SECONDS * 2 ** (self.failures - 1))
                self.logger.warning("%s; Neustart in %.0fs", exc, delay)
                self.publish({}, up=0, snap=None)
            finally:
                self.release_navigation()
                self.end_turn()
                self.close()
            if self.failures:
                self.stop_event.wait(delay)

    def poll_loop(self):
        home = home_page(self.config)
        start = time.monotonic()
        # Erster Besuch der weiteren Seiten gestaffelt nach dem Start, damit die SPS nicht alle
        # Seitenwechsel auf einmal bekommt
        self.next_visit = {p.name: start + FIRST_VISIT_SPACING_SECONDS * (i + 1)
                           for i, p in enumerate(self.config.pages)}
        not_ready_since = start
        reload_wait = NOT_READY_RELOAD_SECONDS
        while not self.stop_event.is_set():
            now = time.monotonic()
            if now - start > BROWSER_RESTART_SECONDS:
                self.logger.info("Browser wird planmaessig neu gestartet")
                return
            if (not self.login_done or not self.clicks_done) and now - self.loaded_at >= CLICK_START_DELAY_SECONDS:
                self.publish({}, up=0, snap=self.snapshot())  # waehrend der Anmeldung keine (alten) Werte melden
                if not self.navigation_locked:  # Neuladen im Betrieb: wieder in die Reihe stellen
                    self.acquire_navigation()
                if not self.login_done:
                    self.ensure_login()
                if not self.clicks_done:
                    self.run_clicks()
                self.release_navigation()
                continue

            if self.config.turns and self.ready_since_load and self.clicks_done and not NAVIGATION_LOCK.locked():
                self.take_turn()  # nicht, solange eine andere Sitzung anmeldet/navigiert (die SPS ist dann ausgelastet)
            snap = self.snapshot()
            up, reason = self.check_health(snap)
            if up and self.clicks_done:
                up, reason = self.check_clock(snap, now)
            values = {}
            if up and self.clicks_done:
                values, reason = self.read_page(home, snap, self.since_ms)
                if home.metrics and not values:
                    up = 0
                    reason = reason or "keine der konfigurierten Positionen enthaelt eine Zahl"
            elif up:
                up, reason = 0, "Klickfolge nach dem Laden laeuft noch"

            if up:
                self.last_home = (values, now)
                self.ready_since_load = True
                self.failures = 0  # erst wenn lesbar: sonst wuerde eine Sitzung, die nie ankommt, jede Minute neu laden
                not_ready_since = None
                reload_wait = NOT_READY_RELOAD_SECONDS
            else:
                not_ready_since = not_ready_since or now
                # Kurze Aussetzer mit den letzten Werten ueberbruecken
                if self.last_home and now - self.last_home[1] <= HOLD_SECONDS:
                    values = self.last_home[0]
            # Schnellere Navigations-Drosselung nur, bis die Startseite nach dem Laden einmal lesbar
            # war; danach auch bei Stoerungen langsam (eine haengende WebVisu soll die SPS nicht
            # mit Anfragen belasten)
            if not self.turn_held:
                self.set_poll_delay(self.config.poll_delay_ms if self.ready_since_load else self.config.nav_delay_ms)
            self.publish(values, up=up, snap=snap)
            if self.debug:
                self.print_debug(values, up, reason)

            if not up and now - not_ready_since > reload_wait:
                self.logger.warning("Startseite seit %.0fs nicht lesbar (%s) - Seite wird neu geladen, "
                                    "naechster Versuch fruehestens nach %.0fs", now - not_ready_since,
                                    reason, min(MAX_NOT_READY_RELOAD_SECONDS, reload_wait * 2))
                reload_wait = min(MAX_NOT_READY_RELOAD_SECONDS, reload_wait * 2)
                not_ready_since = time.monotonic()
                self.load_page()

            due = [p for p in self.config.pages if self.next_visit[p.name] <= now]
            if up and due:
                self.visit(due[0], home)

            self.end_turn()
            self.stop_event.wait(self.config.read_interval)

    def check_clock(self, snap, now):
        """Die Uhr der Visu muss weiterlaufen; steht sie, wird die Seite nicht aktualisiert."""
        clock = page_clock(snap)
        if clock is None:
            return 1, "ok"
        if self.clock is None or clock != self.clock[0]:
            self.clock = (clock, now)
            return 1, "ok"
        limit = max(CLOCK_STALE_MIN_SECONDS, CLOCK_STALE_POLL_FACTOR * self.config.poll_delay_ms / 1000.0)
        if now - self.clock[1] > limit:
            return 0, f"Uhr der Visu steht seit {now - self.clock[1]:.0f}s auf {clock // 3600:02d}:{clock % 3600 // 60:02d}:{clock % 60:02d} - Seite wird nicht aktualisiert"
        return 1, "ok"

    def take_turn(self):
        """Warten, bis keine andere Sitzung fragt; dann schnell abfragen und die Seite neu zeichnen lassen."""
        while not self.stop_event.is_set() and not self.turn_held:
            if TURN_LOCK.acquire(timeout=1.0):
                self.turn_held = True
        if self.turn_held:
            self.set_poll_delay(TURN_POLL_DELAY_MS)
            self.redraw_page()
            self.stop_event.wait(TURN_SETTLE_SECONDS)

    def end_turn(self):
        if self.turn_held:
            self.set_poll_delay(self.config.poll_delay_ms)
            self.turn_held = False
            TURN_LOCK.release()

    def visit(self, page, home):
        """Seite per Klick oeffnen, Werte lesen und zur Startseite zurueckkehren."""
        started = time.monotonic()
        values, reason = {}, ""
        self.clicks_performed = 0
        try:
            self.set_poll_delay(self.config.nav_delay_ms)
            snap = self.snapshot()
            # Nur Texte zaehlen, die nach dem ersten Klick gezeichnet wurden
            since = snap["now"] if snap else 0
            self.perform_clicks(page.clicks, since)
            deadline = time.monotonic() + page.settle
            while not self.stop_event.is_set():
                snap = self.snapshot()
                up, reason = self.check_health(snap, page)
                if up:
                    values, reason = self.read_page(page, snap, since, warn=False)
                    if len(values) == len(page.metrics):
                        break
                if time.monotonic() >= deadline:
                    break
                self.stop_event.wait(1.0)
        except Exception as exc:
            reason = str(exc)
        finally:
            # Ist schon der erste Klick gescheitert, steht der Browser noch auf der Startseite
            if self.clicks_performed:
                self.go_home(home, page.back_clicks)

        now = time.monotonic()
        for name, value in values.items():
            self.page_values[name] = (value, now)
        complete = len(values) == len(page.metrics)
        # Bei Problemen frueher wieder versuchen, aber nicht oefter als alle 5 min
        self.next_visit[page.name] = now + (page.every if complete else min(page.every, 300.0))
        level = logging.INFO if complete else logging.WARNING
        self.logger.log(level, "Seite %s: %d/%d Werte in %.0fs%s", page.name, len(values),
                        len(page.metrics), now - started, "" if complete else f" - {reason}")
        if self.debug:
            stamp = time.strftime("%H:%M:%S")
            print(f"[{stamp}] {self.config.name}: Seite {page.name}: {len(values)}/{len(page.metrics)} Werte"
                  + ("" if complete else f" - {reason}"), flush=True)
            for name, value in values.items():
                print(f"[{stamp}] {self.config.name}:   {name} = {value}", flush=True)
        return values, reason

    def go_home(self, home, back_clicks=None):
        """Zurueck zur Startseite; klappt das nicht, Seite neu laden (laeuft dann wie nach dem Start)."""
        reason = "kein Rueckweg konfiguriert"
        try:
            clicks = back_clicks or self.config.home_clicks
            if clicks:
                snap = self.snapshot()
                since = snap["now"] if snap else 0
                self.perform_clicks(clicks, since)
                deadline = time.monotonic() + HOME_TIMEOUT_SECONDS
                while not self.stop_event.is_set() and time.monotonic() < deadline:
                    snap = self.snapshot()
                    up, reason = self.check_health(snap, home)
                    if up:
                        # Erst zurueck, wenn die Startseite neu gezeichnet und wieder lesbar ist
                        values, reason = self.read_page(home, snap, since, warn=False)
                        if values or (not home.metrics and not reason):
                            self.since_ms = since
                            return
                    self.stop_event.wait(1.0)
            self.logger.warning("Startseite nicht erreicht (%s) - Seite wird neu geladen", reason)
        except Exception as exc:
            self.logger.warning("Rueckweg zur Startseite: %s - Seite wird neu geladen", exc)
        self.load_page()

    @staticmethod
    def last_ok_age(snap):
        if not snap or not snap.get("lastOk"):
            return None
        return (snap["now"] - snap["lastOk"]) / 1000.0

    def check_health(self, snap, page=None):
        if snap is None:
            return 0, "WebVisu-Skript noch nicht geladen"
        age = self.last_ok_age(snap)
        if age is None:
            return 0, "noch keine Antwort der SPS"
        max_age = max(15.0, 5 * self.config.read_interval, 6 * self.config.poll_delay_ms / 1000.0)
        if age > max_age:
            detail = snap.get("lastErr") or "keine Fehlermeldung"
            if snap.get("pending"):
                detail += f"; {snap['pending']} Anfrage(n) offen, aelteste seit {(snap['now'] - snap['oldestPending']) / 1000:.0f}s - SPS antwortet nicht"
            elif snap.get("lastSend"):
                detail += f"; keine offene Anfrage, letzte gesendet vor {(snap['now'] - snap['lastSend']) / 1000:.0f}s - WebVisu fragt nicht mehr"
            if snap.get("visuErrors"):
                detail += f"; WebVisu-Meldung: {snap.get('errText')}"
            return 0, f"letzte Antwort der SPS vor {age:.0f}s ({detail})"
        expect = page.expect_text if page is not None else self.config.expect_text
        if expect:
            present = {t["text"] for t in snap["texts"]}
            missing = [t for t in expect if not any(t in p for p in present)]
            if missing:
                return 0, f"falsche Seite? Text fehlt: {missing}"
        return 1, "ok"

    def read_page(self, page, snap, since=0, warn=True):
        """
        Werte einer Seite. Gibt ({gauge_name: Wert}, Grund fuer fehlende Werte) zurueck.
        Gelesen werden nur Texte, die nach `since` (Browser-Zeit in ms, z. B. Seitenwechsel) und
        nach dem letzten Fehler der WebVisu gezeichnet wurden: Reste vorheriger Seiten und eine
        nach einem Fehler stehengebliebene Anzeige zaehlen nicht.
        """
        oldest = max(since, snap.get("errAt") or 0)
        texts = [t for t in snap["texts"] if t["t"] >= oldest]
        calib = None
        if page.anchors:
            calib, reason = calibrate(texts, page.anchors)
            if calib is None:
                return {}, f"Kalibrierung: {reason}"
        values, reasons = {}, []
        for metric in page.metrics:
            entry, reason = find_value(texts, metric, calib)
            value = parse_value(entry["text"], metric) if entry else None
            if value is None:
                reason = reason or f"keine Zahl im Text {entry['text']!r}"
                reasons.append(f"{metric.gauge_name}: {reason}")
                if warn and metric.gauge_name not in self.missing_warned:
                    self.missing_warned.add(metric.gauge_name)
                    self.logger.warning("%s: kein Wert - %s", metric.gauge_name, reason)
                continue
            self.missing_warned.discard(metric.gauge_name)
            values[metric.gauge_name] = value
        return values, "; ".join(reasons[:3])

    def publish(self, values, up, snap):
        values = dict(values)
        now = time.monotonic()
        # Werte der weiteren Seiten nur, solange auch die Startseite Werte liefert
        if values or (up and not self.config.metrics):
            for page in self.config.pages:
                lifetime = PAGE_VALUE_LIFETIME_INTERVALS * page.every
                for metric in page.metrics:
                    cached = self.page_values.get(metric.gauge_name)
                    if cached and now - cached[1] <= lifetime:
                        values[metric.gauge_name] = cached[0]
        configured = len(self.config.metrics) + sum(len(p.metrics) for p in self.config.pages)
        status = {
            "webvisu_collector_up": float(up),
            "webvisu_collector_values": float(len(values)),
            "webvisu_collector_configured_values": float(configured),
        }
        if snap and snap.get("lastOk"):
            status["webvisu_collector_last_response_timestamp_seconds"] = snap["lastOk"] / 1000.0
        if self.clock is not None:
            status["webvisu_collector_page_clock_seconds"] = float(self.clock[0])  # Uhrzeit der Visu (s seit 0 Uhr)
            status["webvisu_collector_page_clock_age_seconds"] = now - self.clock[1]  # seit der letzten Aenderung
        if snap:
            status["webvisu_collector_texts_on_page"] = float(len(snap["texts"]))
            # Anfragen der WebVisu an die SPS seit dem Laden der Seite (Mass fuer die Last an der SPS)
            status["webvisu_collector_plc_requests_since_load"] = float(snap["ok"] + snap["err"])
            # Fehler der WebVisu (Verbindung verloren, Neustart) seit dem Laden der Seite
            status["webvisu_collector_visu_errors_since_load"] = float(snap.get("visuErrors") or 0)
        self.store.update(self.config.name, values, status)

    def print_debug(self, values, up, reason):
        changed = {k: v for k, v in values.items() if self.last_values.get(k) != v}
        self.last_values = values
        stamp = time.strftime("%H:%M:%S")
        if not up:
            print(f"[{stamp}] {self.config.name}: nicht bereit - {reason}", flush=True)
        for name, value in changed.items():
            print(f"[{stamp}] {self.config.name}: {name} = {value}", flush=True)


# --------------------------------------------------------------------------------------------
# Discover: alle Texte der Seite mit Position + Screenshot, als Grundlage fuer die Konfiguration
# --------------------------------------------------------------------------------------------

def discover(config, out_dir, wait_seconds, headless=True, page_name=None):
    store = MetricStore()
    controller = WebVisuController(config, store, threading.Event(), headless=headless)
    page = home_page(config)
    if page_name:
        page = next((p for p in config.pages if p.name == page_name), None)
        if page is None:
            print(f"Seite {page_name!r} steht nicht in pages von {config.name}")
            return 1
    out_dir.mkdir(parents=True, exist_ok=True)

    def wait_until_readable(target, since, seconds):
        """Warten, bis die Seite erkannt und (falls konfiguriert) vollstaendig lesbar ist."""
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            snap = controller.snapshot()
            up, _ = controller.check_health(snap, target)
            if up and (target.anchors or target.metrics):
                values, reason = controller.read_page(target, snap, since, warn=False)
                if len(values) == len(target.metrics) and not reason:
                    return
            elif up and snap and snap["texts"]:
                return
            time.sleep(1.0)

    try:
        controller.open()
        print(f"Lade {config.url} (bis {wait_seconds:.0f}s) ...", flush=True)
        time.sleep(CLICK_START_DELAY_SECONDS)
        if config.login_file:
            print("Anmeldung ...", flush=True)
            try:
                controller.login_now()
                print("Anmeldung: Dialog geschlossen", flush=True)
            except Exception as exc:
                print(f"FEHLER Anmeldung: {exc}", flush=True)
        if config.clicks:
            print(f"Klicks: {config.clicks}", flush=True)
            controller.run_clicks()
        wait_until_readable(home_page(config), 0, max(0.0, wait_seconds - CLICK_START_DELAY_SECONDS))
        if page_name:
            print(f"Seite {page.name}: Klicks {[c[1] if c[0] == 'text' else c[1:3] for c in page.clicks]}", flush=True)
            snap = controller.snapshot()
            since = snap["now"] if snap else 0
            controller.perform_clicks(page.clicks, since)
            wait_until_readable(page, since, page.settle)
        else:
            since = 0
        snap = controller.snapshot()
        shot = controller.session.call("Page.captureScreenshot", {"format": "png"}, timeout=60)
    finally:
        controller.close()

    if not snap:
        print("WebVisu-Skript nicht gefunden - ist die URL richtig?")
        return 1
    if not snap.get("lastOk"):
        print("WARNUNG: keine Antwort der SPS auf WebVisuV3.bin erhalten.")
    if page.anchors or page.metrics:
        check_page(controller, page, snap, since)

    png = base64.b64decode(shot["data"])
    (out_dir / "screenshot.png").write_bytes(png)
    texts = sorted(snap["texts"], key=lambda t: (round(t["box"][1] / 5), t["box"][0]))
    for number, t in enumerate(texts, start=1):
        t["nr"] = number
        t["is_value"] = bool(VALUE_TEXT_RE.match(t["text"]))
    # Beschriftung je Wert: naechster Nicht-Wert-Text links, sonst darueber
    for t in texts:
        if not t["is_value"]:
            continue
        for pos in ("left", "above"):
            found = neighbour(texts, t, pos)
            if found is not None and not found["is_value"]:
                t["label"], t["label_pos"] = found["text"], pos
                break
    (out_dir / "texts.json").write_text(json.dumps(texts, indent=2, ensure_ascii=False), encoding="utf-8")

    draft = []
    for t in texts:
        if not t["is_value"]:
            continue
        x0, y0, x1, y1 = t["box"]
        item = {"gauge_name": f"TODO_{t['nr']}", "x": round((x0 + x1) / 2), "y": round((y0 + y1) / 2)}
        if t.get("label"):
            item["label"] = t["label"]
            if t["label_pos"] != "left":
                item["label_pos"] = t["label_pos"]
        item["_text"] = t["text"]
        draft.append(item)
    (out_dir / "metrics_draft.json").write_text(json.dumps(draft, indent=2, ensure_ascii=False), encoding="utf-8")
    (out_dir / "discover.html").write_text(discover_html(config, snap, texts), encoding="utf-8")

    print(f"{len(texts)} Texte, davon {len(draft)} Werte. SPS-Antworten: {snap['ok']}, Fehler: {snap['err']}")
    for t in texts:
        x0, y0, x1, y1 = t["box"]
        label = f"   <- Beschriftung {t['label']!r} ({t['label_pos']})" if t.get("label") else ""
        print(f"  #{t['nr']:<4} x={(x0 + x1) / 2:7.1f} y={(y0 + y1) / 2:7.1f}  {t['text']}{label}")
    print(f"\nErgebnis in {out_dir}: discover.html (Bild mit Nummern), metrics_draft.json, texts.json")
    return 0


def check_page(controller, page, snap, since=0):
    """Pruefausgabe fuer --discover: Kalibrierung und jeder Wert der Seite, nach denselben Regeln wie im Betrieb."""
    print(f"\n--- Pruefung Seite {page.name} ---")
    up, reason = controller.check_health(snap, page)
    print(f"Seite erkannt: {'ja' if up else 'NEIN - ' + reason}")
    if snap.get("visuErrors"):
        print(f"WebVisu-Fehler seit dem Laden: {snap['visuErrors']}, zuletzt: {snap.get('errText')}")
    texts = [t for t in snap["texts"] if t["t"] >= max(since, snap.get("errAt") or 0)]
    calib = None
    if page.anchors:
        calib, reason = calibrate(texts, page.anchors)
        if calib is None:
            print(f"Kalibrierung: FEHLER - {reason}")
        else:
            (ax, bx), (ay, by) = calib
            print(f"Kalibrierung: ok (x = {ax:.3f}*X + {bx:.1f}, y = {ay:.3f}*Y + {by:.1f})")
    found = 0
    for metric in page.metrics:
        entry, reason = find_value(texts, metric, calib)
        value = parse_value(entry["text"], metric) if entry else None
        found += value is not None
        shown = f"{value!r:>12}  (Text {entry['text']!r})" if value is not None else f"{'-':>12}  {reason or entry['text']}"
        print(f"  {metric.gauge_name:40} {shown}")
    print(f"{found}/{len(page.metrics)} Werte gefunden")


def run_check(config, headless=True):
    """
    --check: eine Sitzung wie im Betrieb (gleiche Drosselung, gleiche Klickfolgen): Startseite lesen,
    jede Seite aus `pages` besuchen und zurueckkehren. Exit-Code 0 nur, wenn alle Werte gelesen wurden.
    """
    controller = WebVisuController(config, MetricStore(), threading.Event(), headless=headless)
    home = home_page(config)
    results = []

    def report(name, values, metrics, reason):
        complete = len(values) == len(metrics)
        print(f"{'OK    ' if complete else 'FEHLER'} {name}: {len(values)}/{len(metrics)} Werte"
              + ("" if complete else f" - {reason}"), flush=True)
        for metric in metrics:
            shown = values.get(metric.gauge_name)
            print(f"         {metric.gauge_name:40} {'-' if shown is None else shown}")
        results.append(complete)

    try:
        controller.open()
        print(f"Lade {config.url} ...", flush=True)
        if config.login_file:
            print("Anmeldung (Dialog, Bildschirmtastatur, danach 20 s warten) ...", flush=True)
            try:
                controller.login_now()
                print("OK     Anmeldung: Dialog geschlossen, Seite neu gezeichnet", flush=True)
            except Exception as exc:
                print(f"FEHLER Anmeldung: {exc}", flush=True)
                results.append(False)
        if config.clicks:
            print("Start-Klicks ...", flush=True)
            controller.run_clicks()
        deadline = time.monotonic() + CHECK_LOAD_TIMEOUT_SECONDS
        values, reason = {}, "Startseite nicht erkannt"
        while time.monotonic() < deadline:
            snap = controller.snapshot()
            up, reason = controller.check_health(snap)
            if up:
                values, reason = controller.read_page(home, snap, 0, warn=False)
                if len(values) == len(home.metrics) and not reason:
                    break
            time.sleep(2.0)
        report("Startseite", values, home.metrics, reason)
        if len(values) < len(home.metrics):
            check_diagnose(controller, snap)
        if values:
            controller.ready_since_load = True
            controller.set_poll_delay(config.poll_delay_ms)
            for page in config.pages:
                print(f"... Seite {page.name}", flush=True)
                values, reason = controller.visit(page, home)
                report(page.name, values, page.metrics, reason)
        else:
            print("Startseite nicht lesbar - Seitenbesuche uebersprungen", flush=True)
            results.append(False)
    except Exception as exc:
        print(f"FEHLER {exc}", flush=True)
        results.append(False)
    finally:
        controller.close()
    total = len(config.metrics) + sum(len(p.metrics) for p in config.pages)
    if results and all(results):
        print(f"\nERGEBNIS: OK - alle {total} Werte gelesen", flush=True)
        return 0
    print(f"\nERGEBNIS: FEHLER - nicht alle {total} Werte gelesen", flush=True)
    return 1


def run_login_test(config, headless=True):
    """--login-test: nur anmelden (Dialog, Bildschirmtastatur, Wartezeit, Neuzeichnen) und einen Screenshot speichern."""
    if not config.login_file:
        print("Kein Login konfiguriert: login_datei in einstellungen.json (oder login_file in webvisu_clients.json) eintragen")
        return 1
    controller = WebVisuController(config, MetricStore(), threading.Event(), headless=headless)
    result = 1
    try:
        controller.open()
        print(f"Lade {config.url} ...", flush=True)
        print(f"Anmeldung (danach {LOGIN_SETTLE_SECONDS:.0f} s warten, dann Seite neu zeichnen) ...", flush=True)
        controller.login_now()
        controller.stop_event.wait(3.0)
        print("OK     Dialog geschlossen. Screenshot: login_ergebnis.png (die Anzeige der Visu kann der Anmeldung hinterherhinken)")
        result = 0
    except Exception as exc:
        print(f"FEHLER {exc}", flush=True)
    finally:
        try:
            shot = controller.session.call("Page.captureScreenshot", {"format": "png"}, timeout=60)
            Path(__file__).with_name("login_ergebnis.png" if result == 0 else "login_fehler.png").write_bytes(
                base64.b64decode(shot["data"]))
            if result:
                print("Screenshot: login_fehler.png")
        except Exception as exc:
            print(f"(kein Screenshot: {exc})")
        controller.close()
    return result


def check_diagnose(controller, snap):
    """Zustand der WebVisu ausgeben und Screenshot speichern, wenn --check die Startseite nicht liest."""
    print("         --- Diagnose ---", flush=True)
    if not snap:
        print("         WebVisu-Skript nicht geladen (Seite laedt nicht oder falsche URL)")
    else:
        age = lambda ts: f"vor {(snap['now'] - ts) / 1000:.0f}s" if ts else "nie"
        print(f"         Anfragen gesendet: {snap.get('sent')}, Antworten ok: {snap['ok']}, Fehler: {snap['err']}"
              f" ({snap.get('lastErr') or '-'})")
        print(f"         letzte Antwort {age(snap.get('lastOk'))}, letzte Anfrage {age(snap.get('lastSend'))}, "
              f"offen: {snap.get('pending')}" + (f" (aelteste {age(snap.get('oldestPending'))})" if snap.get('pending') else ""))
        print(f"         Verzoegerung je Anfrage: {snap.get('delay')} ms; WebVisu-Meldungen: {snap.get('visuErrors')}"
              f" ({snap.get('errText') or '-'})")
        texts = [t["text"] for t in sorted(snap["texts"], key=lambda t: (t["box"][1], t["box"][0]))]
        print(f"         {len(texts)} Texte auf der Seite: {texts[:25]}")
    try:
        shot = controller.session.call("Page.captureScreenshot", {"format": "png"}, timeout=60)
        path = Path(__file__).with_name("check_fehler.png")
        path.write_bytes(base64.b64decode(shot["data"]))
        print(f"         Screenshot: {path}")
    except Exception as exc:
        print(f"         (kein Screenshot: {exc})")


def load_settings(path):
    """einstellungen.json lesen (fehlt sie, gelten die Werte aus webvisu_clients.json)."""
    if not path.exists():
        return {}
    try:
        settings = json.loads(path.read_text(encoding="utf-8-sig"))
    except ValueError as exc:
        raise ValueError(f"kein gueltiges JSON ({exc}); Windows-Pfade mit / oder \\\\ schreiben") from None
    if not isinstance(settings, dict):
        raise ValueError(f"{path} muss ein JSON-Objekt sein")
    return settings


def apply_settings(configs, settings):
    """SPS-Adresse und Login-Datei aus den Einstellungen in alle Konfigurationen uebernehmen (eine SPS, eine
    Sitzung je Eintrag)."""
    url = settings.get("sps_webvisu_url")
    for config in configs:
        if url:
            config.url = url
        if "login_datei" in settings:  # leer = kein Login
            config.login_file = str(settings["login_datei"] or "")
    for config in configs:  # Pfad der Login-Datei aufloesen (auch fuer --discover)
        if config.login_file:
            config.login_file = resolve_login_file(config.login_file)


def discover_html(config, snap, texts):
    boxes = []
    rows = []
    for t in texts:
        x0, y0, x1, y1 = t["box"]
        numeric = t["is_value"]
        color = "#d00" if numeric else "#06c"
        boxes.append(
            f'<div class="b" style="left:{x0:.0f}px;top:{y0:.0f}px;width:{max(2, x1 - x0):.0f}px;'
            f'height:{max(2, y1 - y0):.0f}px;border-color:{color}" title="#{t["nr"]}: {html.escape(t["text"])}">'
            f'<span style="background:{color}">{t["nr"]}</span></div>'
        )
        rows.append(
            f'<tr><td>{t["nr"]}</td><td>{(x0 + x1) / 2:.0f}</td><td>{(y0 + y1) / 2:.0f}</td>'
            f'<td>{html.escape(t["text"])}</td><td>{"Wert" if numeric else ""}</td>'
            f'<td>{html.escape(t.get("label", ""))}</td></tr>'
        )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>WebVisu {html.escape(config.name)}</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 16px; }}
.wrap {{ position: relative; width: {snap['width']}px; height: {snap['height']}px; border: 1px solid #999; }}
.wrap img {{ position: absolute; left: 0; top: 0; }}
.b {{ position: absolute; border: 1px solid; box-sizing: border-box; }}
.b span {{ position: absolute; left: -1px; top: -13px; color: #fff; font-size: 10px; padding: 0 2px; }}
table {{ border-collapse: collapse; margin-top: 16px; }}
td, th {{ border: 1px solid #ccc; padding: 2px 6px; font-size: 13px; }}
</style></head><body>
<h2>{html.escape(config.name)} &ndash; {html.escape(config.url)}</h2>
<p>Rot = Wert, blau = sonstiger Text (Beschriftung). x/y = Mittelpunkt, so in <code>metrics</code> eintragen
(Fenstergr&ouml;&szlig;e {snap['width']}&times;{snap['height']} muss gleich bleiben).</p>
<div class="wrap"><img src="screenshot.png">{''.join(boxes)}</div>
<table><tr><th>Nr</th><th>x</th><th>y</th><th>Text</th><th></th><th>Beschriftung</th></tr>{''.join(rows)}</table>
</body></html>
"""


# --------------------------------------------------------------------------------------------
# Start
# --------------------------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="CODESYS WebVisu -> Prometheus collector")
    parser.add_argument("--config", type=Path, default=CONFIG_PATH, help="Konfiguration (Standard: webvisu_clients.json)")
    parser.add_argument("--settings", type=Path, default=SETTINGS_PATH,
                        help="Einstellungen (Standard: einstellungen.json, falls vorhanden)")
    parser.add_argument("--port", type=int, default=None,
                        help=f"Prometheus-Port (Standard: collector_port aus den Einstellungen, sonst {HTTP_PORT})")
    parser.add_argument("--check", action="store_true",
                        help="Pruefen: alle Seiten einmal lesen wie im Betrieb, Exit-Code 0 wenn alle Werte da")
    parser.add_argument("--login-test", action="store_true",
                        help="Nur anmelden (login_datei) und Screenshot login_ergebnis.png speichern; Exit-Code 0 wenn der Dialog schliesst")
    parser.add_argument("--delay", type=int, default=None,
                        help="Zur Diagnose: poll_delay_ms und nav_delay_ms auf diesen Wert setzen (z. B. 0)")
    parser.add_argument("--debug", action="store_true", help="Jede Wertaenderung ausgeben")
    parser.add_argument("--show", action="store_true", help="Browser sichtbar starten (zur Kontrolle)")
    parser.add_argument("--discover", metavar="NAME_ODER_URL",
                        help="Alle Texte einer WebVisu mit Position auflisten und Screenshot speichern")
    parser.add_argument("--wait", type=float, default=90.0,
                        help="--discover: hoechstens so lange auf die Startseite warten, in s (Standard 90)")
    parser.add_argument("--viewport", default=None, help="Fenstergroesse fuer --discover mit URL, z. B. 1280x1024")
    parser.add_argument("--page", default=None,
                        help="mit --discover: diese Seite aus pages ansteuern und pruefen")
    return parser.parse_args()


def main():
    # In eine Datei umgeleitete Ausgabe (Dienst, Log) darf an Sonderzeichen aus der Visu nicht scheitern
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="backslashreplace")
        except (AttributeError, ValueError):
            pass
    args = parse_args()
    if args.debug:
        logging.getLogger().setLevel(logging.INFO)
    job = kill_children_on_exit()  # noqa: F841 - muss bis Prozessende leben
    HeadlessBrowser.remove_stale_profiles()
    try:
        settings = load_settings(args.settings)
    except (OSError, ValueError) as exc:
        print(f"Einstellungen {args.settings}: {exc}")
        return 1
    if args.port is None:
        args.port = int(settings.get("collector_port", HTTP_PORT))

    if args.discover:
        configs = load_configs(args.config) if args.config.exists() else []
        apply_settings(configs, settings)
        config = next((c for c in configs if c.name == args.discover), None)
        if config is None:
            if "://" not in args.discover:
                print(f"{args.discover} steht nicht in {args.config} und ist keine URL")
                return 1
            config = ControllerConfig(name=urlsplit(args.discover).hostname or "webvisu", url=args.discover)
        if args.viewport:
            width, height = args.viewport.lower().split("x")
            config.viewport = (int(width), int(height))
        suffix = config.name + (f"_{args.page}" if args.page else "")
        out_dir = Path(__file__).with_name(f"discover_{re.sub(r'[^A-Za-z0-9_.-]', '_', suffix)}")
        return discover(config, out_dir, args.wait, headless=not args.show, page_name=args.page)

    configs = load_configs(args.config)
    apply_settings(configs, settings)
    if args.delay is not None:
        for config in configs:
            config.poll_delay_ms = config.nav_delay_ms = args.delay
    for config in configs:
        names =[m.gauge_name for m in config.metrics] + [m.gauge_name for p in config.pages for m in p.metrics]
        bad = [n for n in names if not METRIC_NAME_RE.match(n)]
        if bad:
            print(f"{config.name}: ungueltige Metriknamen {bad}")
            return 1
        dupes = sorted({n for n in names if names.count(n) > 1})
        if dupes:
            print(f"{config.name}: Metriknamen doppelt {dupes}")
            return 1

    for config in configs:
        if config.login_file:
            config.login_file = resolve_login_file(config.login_file)
            try:
                load_login(config.login_file)  # Datei vorhanden und ausgefuellt? (nur pruefen, nichts ausgeben)
            except ValueError as exc:
                print(f"{config.name}: {exc}")
                return 1

    if args.login_test:
        return max(run_login_test(config, headless=not args.show) for config in configs)

    if args.check:
        return max(run_check(config, headless=not args.show) for config in configs)

    store = MetricStore()
    try:
        start_http_server(store, args.port)
    except OSError as exc:
        print(exc)
        return 1
    print(f"Prometheus-Endpunkt: http://localhost:{args.port}/metrics", flush=True)

    stop_event = threading.Event()
    threads = []
    for config in configs:
        controller = WebVisuController(config, store, stop_event, debug=args.debug, headless=not args.show)
        thread = threading.Thread(target=controller.run_forever, name=config.name, daemon=True)
        thread.start()
        threads.append((thread, controller))

    try:
        while any(t.is_alive() for t, _ in threads):
            time.sleep(1)
    except KeyboardInterrupt:
        print("Beende ...", flush=True)
    finally:
        stop_event.set()
        for thread, controller in threads:
            thread.join(timeout=15)
            controller.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
