#!/usr/bin/env python3
"""
Async client that drives the jsdom-based runner from Python to fetch
and render a Codesys WebVisu page. It uses asyncio to manage the subprocess
and exchange data via stdin/stdout.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
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


class HeadlessClient:
    """
    Async wrapper around the jsdom execution.
    """

    def __init__(self, runner_path: Optional[Path] = None):
        if runner_path is None:
            self.runner_path = Path(__file__).with_name("jsdom_runner.js")
        else:
            self.runner_path = runner_path
        
        if not self.runner_path.exists():
            raise FileNotFoundError(f"jsdom runner not found at {self.runner_path}")
            
        self.process: Optional[asyncio.subprocess.Process] = None

    async def start(self):
        """
        Start the node subprocess.
        """
        self.process = await asyncio.create_subprocess_exec(
            "node",
            str(self.runner_path),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=sys.stderr,  # Pass stderr through for logs
        )

    async def send_command(self, payload: Dict[str, Any]):
        """
        Send a JSON command to the running process.
        """
        if not self.process or not self.process.stdin:
            raise RuntimeError("Process not running or stdin not available")
        
        data = json.dumps(payload) + "\n"
        self.process.stdin.write(data.encode("utf-8"))
        await self.process.stdin.drain()

    async def read_response(self) -> Dict[str, Any]:
        """
        Read a JSON response line from the process.
        """
        if not self.process or not self.process.stdout:
            raise RuntimeError("Process not running or stdout not available")
            
        line = await self.process.stdout.readline()
        if not line:
            raise RuntimeError("Process output ended unexpectedly")
            
        try:
            return json.loads(line.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Failed to parse response: {line.decode('utf-8')[:200]}...") from exc

    async def stop(self):
        """
        Terminate the process.
        """
        if self.process:
            try:
                self.process.terminate()
                await self.process.wait()
            except ProcessLookupError:
                pass
            finally:
                self.process = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()


async def run_once(url: str, return_dom: bool = False):
    """
    Run a single fetch and return the result.
    """
    client = HeadlessClient()
    async with client:
        payload = build_payload(url, return_dom=return_dom, keep_alive=False)
        await client.send_command(payload)
        response = await client.read_response()
        print(json.dumps(response, indent=2))


async def run_continuous(url: str, return_dom: bool = False):
    """
    Run in keep-alive mode to demonstrate data exchange capability.
    """
    client = HeadlessClient()
    async with client:
        # Initial load
        sys.stderr.write(f"Loading {url}...\n")
        payload = build_payload(url, return_dom=return_dom, keep_alive=True)
        await client.send_command(payload)
        
        response = await client.read_response()
        sys.stderr.write("Initial Load Complete.\n")
        print(json.dumps(response, indent=2))
        
        # Here we could exchange more data if the runner supports it
        # For now, we just wait for user interrupt
        sys.stderr.write("Press Ctrl+C to stop...\n")
        while True:
            await asyncio.sleep(1)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Async Headless client for Codesys WebVisu.",
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
    args = parser.parse_args()

    try:
        if args.once:
            asyncio.run(run_once(args.url, args.return_dom))
        else:
            asyncio.run(run_continuous(args.url, args.return_dom))
    except KeyboardInterrupt:
        sys.stderr.write("\nStopping...\n")
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
