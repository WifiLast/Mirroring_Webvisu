#!/usr/bin/env python3
"""
Helper script to watch canvas value changes from the headless client.
Filters and displays only canvas-watcher messages from stderr.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Watch canvas value changes from a Codesys WebVisu page.",
    )
    parser.add_argument(
        "--url",
        default="http://192.168.1.200:8080/webvisu/webvisu.htm",
        help="WebVisu URL to load (default: %(default)s)",
    )
    args = parser.parse_args(argv)

    # Start the headless client
    runner_path = Path(__file__).with_name("headless_client.py")
    if not runner_path.exists():
        sys.stderr.write(f"Error: headless_client.py not found at {runner_path}\n")
        return 1

    sys.stderr.write(f"Starting canvas value watcher for {args.url}\n")
    sys.stderr.write("Canvas value changes will be printed below:\n")
    sys.stderr.write("-" * 80 + "\n")

    try:
        process = subprocess.Popen(
            [sys.executable, str(runner_path), "--url", args.url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
        )

        # Read initial JSON from stdout
        initial_line = process.stdout.readline() if process.stdout else None
        if initial_line:
            try:
                initial_data = json.loads(initial_line)
                sys.stderr.write(f"Initial data received. Console logs: {len(initial_data.get('consoleLogs', []))}\n")
                sys.stderr.write("-" * 80 + "\n")
            except json.JSONDecodeError:
                pass

        # Now read canvas-watcher messages from stderr
        if process.stderr:
            for line in process.stderr:
                line = line.strip()
                if not line or "Page is running" in line:
                    continue

                try:
                    log_entry = json.loads(line)
                    message = log_entry.get("message", "")

                    if "[canvas-watcher]" in message:
                        # Extract and format the canvas value change
                        if "value changed" in message:
                            args_list = log_entry.get("arguments", [])
                            if len(args_list) >= 2:
                                try:
                                    change_data = json.loads(args_list[1])
                                    location = change_data.get("location", "unknown")
                                    value = change_data.get("value", "")
                                    previous = change_data.get("previous")
                                    change_type = change_data.get("type", "")

                                    timestamp = log_entry.get("timestamp", "")
                                    print(f"[{timestamp}] {location} ({change_type})")
                                    if previous is not None:
                                        print(f"  CHANGED: '{previous}' -> '{value}'")
                                    else:
                                        print(f"  NEW VALUE: '{value}'")
                                    print()
                                    sys.stdout.flush()
                                except json.JSONDecodeError:
                                    # Fallback to simple message
                                    print(f"{log_entry.get('timestamp', '')}: {message}")
                                    sys.stdout.flush()
                        else:
                            # Other canvas-watcher messages (like installation status)
                            print(f"{log_entry.get('timestamp', '')}: {message}")
                            sys.stdout.flush()
                except json.JSONDecodeError:
                    # Not JSON, might be a regular message
                    if "[canvas-watcher]" in line:
                        print(line)
                        sys.stdout.flush()

    except KeyboardInterrupt:
        sys.stderr.write("\nStopping...\n")
        if process:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        return 0
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        return 1

    return process.wait() if process else 1


if __name__ == "__main__":
    sys.exit(main())
