import asyncio
import json
import logging
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
store_lock = asyncio.Lock()


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


def build_metric_name(ip_prefix: str, canvas_name: str, tag: str) -> str:
    """Build metric name with IP prefix to distinguish different WebVisu instances"""
    tag_part = sanitize_name(tag, "value")
    canvas_part = sanitize_name(canvas_name, "canvas")
    ip_part = sanitize_name(ip_prefix, "unknown") if ip_prefix else "unknown"

    # Format: {ip}_{canvas}_{tag}
    return f"{ip_part}_{canvas_part}_{tag_part}"


def get_gauge(metric: str, description: str = "WebVisu value"):
    if metric not in gauges:
        # Using default registry like opc_PLS.py does with prom.Gauge()
        gauges[metric] = Gauge(metric, description)
        logger.info(f"Created new gauge: {metric}")
    return gauges[metric]


async def _read_store_file() -> Dict[str, Any]:
    if STORE_PATH.exists():
        try:
            content = await asyncio.to_thread(STORE_PATH.read_text)
            return json.loads(content)
        except Exception as exc:
            logger.warning("Failed to read metrics store: %s", exc)
    return {}


async def _write_store_file(data: Dict[str, Any]) -> None:
    try:
        serialized = json.dumps(data, indent=2)
        await asyncio.to_thread(STORE_PATH.write_text, serialized)
    except Exception as exc:
        logger.error("Failed to persist metrics store: %s", exc)


async def load_store() -> Dict[str, Any]:
    async with store_lock:
        return await _read_store_file()


async def save_store(data: Dict[str, Any]) -> None:
    async with store_lock:
        await _write_store_file(data)


async def record_metrics(page_url: str, canvas_name: str, canvas_id: str, sps_values: Any) -> None:
    """Record canvas config in the metrics store - values only go to Prometheus"""
    page = page_url or "unknown"
    async with store_lock:
        store = await _read_store_file()
        page_entry = store.setdefault(page, {"canvases": {}})
        key = canvas_name or canvas_id or f"canvas_{len(page_entry['canvases']) + 1}"

        # Store config only - keep existing config if present, just update lastSeen
        if key not in page_entry["canvases"]:
            page_entry["canvases"][key] = {
                "canvasId": canvas_id,
                "canvasName": canvas_name,
                "pageUrl": page_url,
            }

        # Store value positions for restoration (coordinates only, not values)
        # This allows re-highlighting the same positions after page refresh
        if sps_values and isinstance(sps_values, list):
            tracked_positions = []
            for entry in sps_values:
                if isinstance(entry, dict) and "x" in entry and "y" in entry:
                    tracked_positions.append({
                        "x": entry.get("x"),
                        "y": entry.get("y"),
                        "tag": entry.get("tag") or entry.get("label")
                    })
            if tracked_positions:
                page_entry["canvases"][key]["trackedPositions"] = tracked_positions

        # Always update lastSeen
        page_entry["canvases"][key]["lastSeen"] = time.time()
        await _write_store_file(store)


async def get_page_canvases(page_url: str):
    async with store_lock:
        store = await _read_store_file()
    entry = store.get(page_url) or {}
    canvases = entry.get("canvases", {})
    return list(canvases.values())


async def process_update(payload: Dict[str, Any]):
    canvas_id = payload.get("canvasId")
    canvas_name = (payload.get("canvasName") or payload.get("name") or "").strip() or canvas_id or "unknown"
    sps_values = payload.get("spsValues", [])
    page_url = payload.get("pageUrl") or payload.get("page") or ""
    ip_prefix = payload.get("ipPrefix") or "unknown"

    if not canvas_id:
        return {"status": "error", "error": "canvasId missing"}

    updated = []

    for entry in sps_values:
        try:
            tag = entry.get("tag") or entry.get("label")
            value_str = entry.get("value") or entry.get("val") or entry
            value = float(str(value_str).replace(",", "."))
            x = entry.get("x", 0)
            y = entry.get("y", 0)

            # Build unique metric name with IP prefix
            if tag and tag != "value":
                # Has a proper label - use it directly
                metric_name = build_metric_name(ip_prefix, canvas_name, tag)
                tag_display = tag
            else:
                # No label - use position to create unique metric name
                position_key = f"value_x{x}_y{y}"
                metric_name = build_metric_name(ip_prefix, canvas_name, position_key)
                tag_display = f"pos({x},{y})"

            gauge = get_gauge(metric_name, f"{ip_prefix} - {canvas_name} - {tag or 'unlabeled value'}")
            gauge.set(value)
            logger.info(f"Updated metric {metric_name} = {value}")
            updated.append({"tag": tag_display, "value": value, "metric": metric_name})
        except Exception as exc:
            logger.warning("Failed to process value entry %s: %s", entry, exc)

    await record_metrics(page_url, canvas_name, canvas_id, sps_values)
    logger.info("Canvas update: %s (%s) [%s] updated=%s", canvas_id, canvas_name, ip_prefix, len(updated))
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
        result = await process_update(entry)
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
    canvases = await get_page_canvases(page) if page else []
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
