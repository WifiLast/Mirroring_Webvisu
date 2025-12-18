#!/usr/bin/env bash
set -euo pipefail

# Apply the jsdom patch using patch-package.
# Run from the repository root.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
HEADLESS_DIR="$ROOT_DIR/headless"
PATCH_DIR="$HEADLESS_DIR/patches"
PATCH_FILE="$PATCH_DIR/jsdom+13.2.0.patch"

if [[ ! -f "$PATCH_FILE" ]]; then
  echo "Patch file not found: $PATCH_FILE" >&2
  exit 1
fi

echo "Applying jsdom patch via patch-package..."
cd "$HEADLESS_DIR"
npx patch-package jsdom
echo "Done."
