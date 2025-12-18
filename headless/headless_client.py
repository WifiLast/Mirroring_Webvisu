#!/usr/bin/env python3
"""
Small helper client that drives the jsdom-based runner from Python to fetch
and render a Codesys WebVisu page. It shells out to `jsdom_runner.js`, passes a
JSON payload via stdin, and prints the structured JSON result to stdout.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Optional


def build_payload(url: str, return_dom: bool = False, keep_alive: bool = False) -> Dict[str, Any]:
    """
    Construct the JSON payload expected by jsdom_runner.js.
    """
    return {
        "url": url,
        # Enable canvas rendering so WebVisu canvases are available.
        "enableCanvasRendering": True,
        # Light-weight selectors to sanity check that the page loaded.
        "selectors": [
            {"name": "title", "selector": "title"},
            {"name": "first_canvas", "selector": "canvas"},
        ],
        # Basic structure preview.
        "returnStructure": True,
        "structureOptions": {"maxDepth": 2, "maxChildren": 6, "includeText": False},
        # Return full DOM only when explicitly requested.
        "returnDom": return_dom,
        # Give WebVisu time to finish loading.
        "waitForLoadMs": 8000,
        "postLoadDelayMs": 3000,
        # Use a Chrome-like user agent.
        "headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/114.0.0.0 Safari/537.36"
            )
        },
        # Keep the Node process alive (so the page keeps running) when requested.
        "keepAlive": keep_alive,
    }


def run_jsdom(url: str, return_dom: bool = False) -> Dict[str, Any]:
    """
    Execute the Node-based jsdom runner with the given URL.
    """
    runner_path = Path(__file__).with_name("jsdom_runner.js")
    if not runner_path.exists():
        raise FileNotFoundError(f"jsdom runner not found at {runner_path}")

    payload = build_payload(url, return_dom=return_dom)
    process = subprocess.run(
        ["node", str(runner_path)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=False,
    )

    if process.returncode != 0:
        stderr = process.stderr.strip()
        raise RuntimeError(f"jsdom runner failed (exit {process.returncode}): {stderr}")

    try:
        return json.loads(process.stdout)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Failed to parse jsdom output: {exc}") from exc


def launch_jsdom_keep_alive(url: str, return_dom: bool = False) -> subprocess.Popen:
    """
    Start the jsdom runner once and keep the page running until the user stops it.
    Stdout/stderr are inherited so logs/JSON flow directly to the console.
    """
    runner_path = Path(__file__).with_name("jsdom_runner.js")
    if not runner_path.exists():
        raise FileNotFoundError(f"jsdom runner not found at {runner_path}")

    payload = build_payload(url, return_dom=return_dom, keep_alive=True)
    process = subprocess.Popen(
        ["node", str(runner_path)],
        stdin=subprocess.PIPE,
        text=True,
    )
    if process.stdin is None:  # pragma: no cover - defensive
        raise RuntimeError("Failed to open stdin for jsdom runner")
    process.stdin.write(json.dumps(payload))
    process.stdin.close()
    return process


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Headless client that fetches a Codesys WebVisu page via jsdom.",
    )
    parser.add_argument(
        "--url",
        default="http://192.168.1.200:8080/webvisu/webvisu.htm",
        help="WebVisu URL to load (default: %(default)s)",
    )
    parser.add_argument(
        "--return-dom",
        action="store_true",
        help="Include the full serialized DOM in the output.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Render the page once and exit (default: keep the page running).",
    )
    args = parser.parse_args(argv)

    if args.once:
        try:
            result = run_jsdom(args.url, return_dom=args.return_dom)
            sys.stdout.write(json.dumps(result, indent=2))
            sys.stdout.write("\n")
            sys.stdout.flush()
        except Exception as exc:  # pragma: no cover - CLI path
            sys.stderr.write(f"Error: {exc}\n")
            return 1
        return 0

    try:
        process = launch_jsdom_keep_alive(args.url, return_dom=args.return_dom)
    except Exception as exc:  # pragma: no cover - CLI path
        sys.stderr.write(f"Error: {exc}\n")
        return 1

    sys.stderr.write("Page is running; press Ctrl+C to stop.\n")
    try:
        return process.wait()
    except KeyboardInterrupt:  # pragma: no cover - CLI path
        sys.stderr.write("Stopping...\n")
        process.terminate()
        try:
            return process.wait(timeout=5)
        except subprocess.TimeoutExpired:  # pragma: no cover - defensive
            process.kill()
            return process.wait()


if __name__ == "__main__":
    sys.exit(main())
