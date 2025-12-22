#!/usr/bin/env python3
"""
Async client that drives the jsdom-based runner from Python to fetch
and render one or more Codesys WebVisu pages. It uses asyncio to manage
subprocesses and exchange data via stdin/stdout. Multiple WebVisus share
one runner process to stay memory-efficient; each gets its own contextId
to avoid jsdom prototype sharing surprises.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from urllib.parse import urlparse


def build_payload(
    url: str,
    return_dom: bool = False,
    keep_alive: bool = False,
    context_id: Optional[str] = None,
    metrics_prefix: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Construct the JSON payload expected by jsdom_runner.js.
    """
    payload = {
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
    if context_id:
        payload["contextId"] = context_id
    if metrics_prefix:
        payload["metricsPrefix"] = metrics_prefix
    return payload


def derive_metrics_prefix(url: str, fallback: Optional[str] = None) -> Optional[str]:
    """
    Use the host portion of the URL as a stable metrics prefix so Prometheus
    entries are clearly separated per WebVisu. Falls back to the provided value.
    """
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        if host:
            return host
    except Exception:
        pass
    return fallback


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
        self._write_lock = asyncio.Lock()

    async def start(self):
        """
        Start the node subprocess.
        """
        self.process = await asyncio.create_subprocess_exec(
            "node",
            str(self.runner_path),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

    async def send_command(self, payload: Dict[str, Any]):
        """
        Send a JSON command to the running process.
        """
        if not self.process or not self.process.stdin:
            raise RuntimeError("Process not running or stdin not available")
        
        data = json.dumps(payload) + "\n"
        async with self._write_lock:
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

    async def iter_stderr(self):
        """Async iterator for stderr lines."""
        if not self.process or not self.process.stderr:
            return
        while True:
            line = await self.process.stderr.readline()
            if not line:
                break
            yield line.decode("utf-8")

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


async def _process_stderr(client: HeadlessClient, prefix: str) -> None:
    """
    Stream stderr lines with a prefix to avoid pipe back-pressure.
    """
    async for line in client.iter_stderr():
        line = line.strip()
        if not line:
            continue
        sys.stderr.write(f"[{prefix}] {line}\n")
        sys.stderr.flush()


async def _drain_stdout(client: HeadlessClient, prefix: str) -> None:
    """
    Continuously read stdout responses to prevent blocking when running in keep-alive mode.
    """
    while True:
        try:
            await client.read_response()
        except (RuntimeError, asyncio.CancelledError):
            break
        except Exception as exc:
            sys.stderr.write(f"[{prefix}] stdout error: {exc}\n")
            break


async def _keep_alive_pinger(client: HeadlessClient, prefix: str, context_id: Optional[str] = None) -> None:
    """
    Periodically send minimal pointer movement to keep the page alive.
    """
    while True:
        await asyncio.sleep(5)
        try:
            await client.send_command(
                {
                    "contextId": context_id,
                    "simulateMouseMovements": {
                        "count": 1,
                        "minDelayMs": 10,
                        "maxDelayMs": 20,
                    }
                }
            )
        except asyncio.CancelledError:
            break
        except Exception as exc:
            sys.stderr.write(f"[{prefix}] keep-alive stopped: {exc}\n")
            break


async def run_once(url: str, return_dom: bool = False, context_id: Optional[str] = None):
    """
    Run a single fetch and return the result.
    """
    client = HeadlessClient()
    async with client:
        metrics_prefix = derive_metrics_prefix(url, context_id)
        payload = build_payload(
            url,
            return_dom=return_dom,
            keep_alive=False,
            context_id=context_id,
            metrics_prefix=metrics_prefix,
        )
        await client.send_command(payload)
        response = await client.read_response()
        # Don't print response to avoid large output
        sys.stderr.write(f"Response status: {response.get('status', 'unknown')}\n")


async def run_keepalive(url: str, return_dom: bool = False, prefix: Optional[str] = None):
    """
    Run in keep-alive mode to demonstrate data exchange capability.
    The Node.js runner handles Prometheus metrics internally.
    """
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    prefix = prefix or url

    client = HeadlessClient()
    async with client:
        stderr_task = asyncio.create_task(_process_stderr(client, prefix))

        sys.stderr.write(f"[{prefix}] Loading...\n")
        metrics_prefix = derive_metrics_prefix(url, prefix)
        payload = build_payload(
            url,
            return_dom=return_dom,
            keep_alive=True,
            context_id=prefix,
            metrics_prefix=metrics_prefix,
        )
        await client.send_command(payload)

        try:
            response = await client.read_response()
            sys.stderr.write(f"[{prefix}] Initial load complete - status: {response.get('status', 'unknown')}\n")
            # Don't print response to avoid large output

            stdout_task = asyncio.create_task(_drain_stdout(client, prefix))
            keep_alive_task = asyncio.create_task(_keep_alive_pinger(client, prefix, context_id=prefix))

            sys.stderr.write(f"[{prefix}] Press Ctrl+C to stop...\n")
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        except KeyboardInterrupt:
            pass
        finally:
            stderr_task.cancel()
            if "stdout_task" in locals():
                stdout_task.cancel()
            if "keep_alive_task" in locals():
                keep_alive_task.cancel()

            await asyncio.gather(stderr_task, return_exceptions=True)
            if "stdout_task" in locals():
                await asyncio.gather(stdout_task, return_exceptions=True)
            if "keep_alive_task" in locals():
                await asyncio.gather(keep_alive_task, return_exceptions=True)


async def run_multi(urls: Iterable[str], return_dom: bool = False, once: bool = False):
    """
    Drive several WebVisus concurrently using a single jsdom_runner process.
    Each WebVisu gets its own contextId; keep-alive pings are dispatched with
    that context to avoid jsdom's shared class definitions leaking between pages.
    """
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    client = HeadlessClient()

    # Build a single multi-page payload so the runner starts all jsdom instances together.
    pages_payload = []
    context_ids: list[str] = []
    for idx, url in enumerate(urls, start=1):
        ctx = f"webvisu-{idx}"
        context_ids.append(ctx)
        metrics_prefix = derive_metrics_prefix(url, ctx)
        pages_payload.append(
            build_payload(
                url,
                return_dom=return_dom,
                keep_alive=not once,
                context_id=ctx,
                metrics_prefix=metrics_prefix,
            )
        )

    async with client:
        stderr_task = asyncio.create_task(_process_stderr(client, "multi"))

        try:
            sys.stderr.write("[multi] Loading pages...\n")
            await client.send_command({"pages": pages_payload})
            response = await client.read_response()
            page_results = response.get("pages") if isinstance(response, dict) else None
            if not page_results:
                sys.stderr.write("[multi] No pages returned; aborting.\n")
                return

            for res in page_results:
                ctx = res.get("contextId")
                sys.stderr.write(f"[{ctx}] Loaded - status: {res.get('status', 'unknown')}\n")

            if once:
                # Don't print response to avoid large output
                sys.stderr.write(f"[multi] All {len(page_results)} pages loaded successfully\n")
                return

            # In keep-alive mode, only print summary
            sys.stderr.write(f"[multi] All {len(page_results)} pages loaded successfully\n")

            keep_alive_tasks = [
                asyncio.create_task(_keep_alive_pinger(client, prefix=ctx, context_id=ctx))
                for ctx in context_ids
            ]

            stdout_task = asyncio.create_task(_drain_stdout(client, "multi"))
            sys.stderr.write("[multi] Press Ctrl+C to stop...\n")
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
        except KeyboardInterrupt:
            pass
        finally:
            stderr_task.cancel()
            await asyncio.gather(stderr_task, return_exceptions=True)

            if "stdout_task" in locals():
                stdout_task.cancel()
                await asyncio.gather(stdout_task, return_exceptions=True)
            if "keep_alive_tasks" in locals():
                for task in keep_alive_tasks:
                    task.cancel()
                await asyncio.gather(*keep_alive_tasks, return_exceptions=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Async Headless client for Codesys WebVisu.",
    )
    parser.add_argument(
        "--url",
        action="append",
        default=None,
        help="WebVisu URL to load (repeatable; default: http://192.168.1.200:8080/webvisu/webvisu.htm)",
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

    # Handle default URL when no --url is provided
    if args.url is None:
        args.url = ["http://192.168.1.200:8080/webvisu/webvisu.htm"]

    try:
        if len(args.url) > 1:
            asyncio.run(run_multi(args.url, args.return_dom, once=args.once))
        elif args.once:
            asyncio.run(run_once(args.url[0], args.return_dom))
        else:
            asyncio.run(run_keepalive(args.url[0], args.return_dom))
    except KeyboardInterrupt:
        sys.stderr.write("\nStopping...\n")
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
