# Browser Version Overview

This folder contains a lightweight, browser-driven setup for mirroring WebVisu canvases into Prometheus. It has two pieces:

- `backend.py` – a Quart service that receives canvas updates, converts each tag/value into a Prometheus gauge, exposes metrics, and persists a small cache of canvases per page URL.
- `script.js` – a Tampermonkey userscript that lets you pick canvases in the browser, polls them for changes, and posts SPS/tag values plus page context back to the backend.

## backend.py (Prometheus bridge)
- Starts a Prometheus scrape endpoint on `PROM_PORT` (default 8077) using the default registry.
- Accepts `POST /api/canvas-update` (single payload or `{updates: [...]}` batch), creating gauges named `<canvas>_<tag>` and setting their values.
- Persists recently seen canvases and their tags in `metrics_store.json`, keyed by page URL, so the UI can auto-restore watches.
- Provides `GET /api/metrics?page=<url>` to return stored canvases for a page.
- `POST /events` logs non-IM debug events.

## script.js (browser userscript)
- Adds a picker overlay to select one or more `<canvas>` elements; allows optional custom names (used in metric names).
- Polls selected canvases, extracts SPS tag/value pairs, and batches updates to `/api/canvas-update` with the current `pageUrl`.
- On load, calls `/api/metrics` for the current page and auto-watches canvases that were previously stored.
- Uses Tampermonkey storage to remember backend URL, polling interval, and custom canvas names; exposes menu commands for configuration.
