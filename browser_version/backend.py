import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict

from quart import Quart, jsonify, request
from prometheus_client import Gauge, start_http_server
import prometheus_client


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("webvisu-backend")

app = Quart(__name__)

# Prometheus config
PROM_PORT = int(8077)
STORE_PATH = Path(__file__).parent / "metrics_store.json"
# We create gauges dynamically per metric name (using default registry like opc_PLS.py)
gauges: Dict[str, Gauge] = {}


def clear_registry(prefix: str = "webvisu") -> None:
    """Clear metrics from registry that match the given prefix"""
    collectors = tuple(prometheus_client.REGISTRY._collector_to_names.keys())
    for collector in collectors:
        try:
            cache = str(collector)
            # Check if this is one of our metrics (not built-in)
            if cache.startswith("<prometheus_client"):
                cache_prefix = cache.split("_")[0].split(":")[1] if ":" in cache else ""
                if prefix in cache_prefix or cache_prefix == "":
                    # Try to unregister if it's a webvisu metric
                    try:
                        prometheus_client.REGISTRY.unregister(collector)
                        logger.info(f"Unregistered metric: {cache}")
                    except Exception as e:
                        logger.debug(f"Could not unregister {cache}: {e}")
        except Exception as e:
            logger.debug(f"Error processing collector: {e}")
            continue


def sanitize_name(name: str, default: str = "value") -> str:
    clean = re.sub(r"[^a-zA-Z0-9_]", "_", (name or "").strip())
    clean = re.sub(r"_+", "_", clean)
    if not clean:
        clean = default
    if clean[0].isdigit():
        clean = f"m_{clean}"
    return clean.lower()


def build_metric_name(canvas_name: str, tag: str) -> str:
    tag_part = sanitize_name(tag, "value")
    canvas_part = sanitize_name(canvas_name, "canvas")
    return f"{canvas_part}_{tag_part}" if canvas_part else tag_part


def get_gauge(metric: str, description: str = "WebVisu value"):
    if metric not in gauges:
        # Using default registry like opc_PLS.py does with prom.Gauge()
        gauges[metric] = Gauge(metric, description)
        logger.info(f"Created new gauge: {metric}")
    return gauges[metric]


def load_store() -> Dict[str, Any]:
    if STORE_PATH.exists():
        try:
            return json.loads(STORE_PATH.read_text())
        except Exception as exc:
            logger.warning("Failed to read metrics store: %s", exc)
    return {}


def save_store(data: Dict[str, Any]) -> None:
    try:
        STORE_PATH.write_text(json.dumps(data, indent=2))
    except Exception as exc:
        logger.error("Failed to persist metrics store: %s", exc)


def record_metrics(page_url: str, canvas_name: str, canvas_id: str, sps_values: Any) -> None:
    page = page_url or "unknown"
    store = load_store()
    page_entry = store.setdefault(page, {"canvases": {}})
    key = canvas_name or canvas_id or f"canvas_{len(page_entry['canvases']) + 1}"

    tags = []
    for entry in sps_values or []:
        tag = entry.get("tag") or entry.get("label") or "value"
        val = entry.get("value") or entry.get("val") or entry
        tags.append({"tag": tag, "value": val})

    page_entry["canvases"][key] = {
        "canvasId": canvas_id,
        "canvasName": canvas_name,
        "lastSeen": time.time(),
        "pageUrl": page_url,
        "tags": tags,
    }
    save_store(store)


def get_page_canvases(page_url: str):
    store = load_store()
    entry = store.get(page_url) or {}
    canvases = entry.get("canvases", {})
    return list(canvases.values())


def process_update(payload: Dict[str, Any]):
    canvas_id = payload.get("canvasId")
    canvas_name = (payload.get("canvasName") or payload.get("name") or "").strip() or canvas_id or "unknown"
    sps_values = payload.get("spsValues", [])
    page_url = payload.get("pageUrl") or payload.get("page") or ""

    if not canvas_id:
        return {"status": "error", "error": "canvasId missing"}

    updated = []
    for entry in sps_values:
        try:
            tag = entry.get("tag") or entry.get("label") or "value"
            value_str = entry.get("value") or entry.get("val") or entry
            value = float(str(value_str).replace(",", "."))
            metric_name = build_metric_name(canvas_name, tag)
            gauge = get_gauge(metric_name, f"{canvas_name} - {tag}")
            gauge.set(value)
            updated.append({"tag": tag, "value": value, "metric": metric_name})
        except Exception as exc:
            logger.warning("Failed to process value entry %s: %s", entry, exc)

    record_metrics(page_url, canvas_name, canvas_id, sps_values)
    logger.info("Canvas update: %s (%s) updated=%s", canvas_id, canvas_name, len(updated))
    return {"status": "ok", "updated": updated, "canvasId": canvas_id, "canvasName": canvas_name}


@app.route("/api/canvas-update", methods=["POST"])
async def canvas_update():
    logger.info("=== Received canvas update request ===")
    payload = await request.get_json(force=True)
    logger.info(f"Payload type: {type(payload)}")
    logger.info(f"Payload: {payload}")

    if isinstance(payload, list):
        updates = payload
    elif isinstance(payload, dict) and isinstance(payload.get("updates"), list):
        updates = payload.get("updates")
    else:
        updates = [payload]

    logger.info(f"Processing {len(updates)} updates")
    processed = []
    for entry in updates:
        if not isinstance(entry, dict):
            logger.warning("Skipping non-dict payload entry: %s", entry)
            continue
        result = process_update(entry)
        logger.info(f"Processed result: {result}")
        processed.append(result)

    logger.info(f"Total gauges registered: {len(gauges)}")
    return jsonify({"status": "ok", "results": processed})


@app.route("/events", methods=["POST"])
async def events():
    payload: Dict[str, Any] = await request.get_json(force=True)
    # Only log non-IM events to reduce noise
    if payload.get("kind") != "IM":
        logger.info("Event: %s", payload)
    return jsonify({"status": "ok"})


@app.route("/api/metrics", methods=["GET"])
async def metrics():
    page = request.args.get("page") or request.args.get("url") or ""
    canvases = get_page_canvases(page) if page else []
    return jsonify({"status": "ok", "page": page, "canvases": canvases})


if __name__ == "__main__":
    # Clear any existing metrics from registry (like opc_client_source.py does in clear_registry)
    logger.info("Clearing existing metrics from registry...")
    clear_registry(prefix="test")
    clear_registry(prefix="canvas")
    gauges.clear()
    logger.info("Registry cleared")

    # Insert test values BEFORE starting Prometheus server (like opc_PLS.py does)
    logger.info("Creating test metrics...")
    test_gauge = get_gauge("test_metric", "Test metric for Prometheus verification")
    test_gauge.set(42.0)

    test_temp = get_gauge("test_temperature", "Test temperature sensor")
    test_temp.set(23.5)

    test_status = get_gauge("test_system_status", "Test system status")
    test_status.set(1.0)

    logger.info("Test metrics created: test_metric=42.0, test_temperature=23.5, test_system_status=1.0")

    # Start Prometheus HTTP server AFTER creating gauges (like opc_PLS.py does on line 291)
    logger.info("Starting Prometheus metrics server on 0.0.0.0:%s", PROM_PORT)
    start_http_server(PROM_PORT)

    logger.info("Starting Quart app on 0.0.0.0:5002")
    app.run(host="0.0.0.0", port=5002, debug=True)
