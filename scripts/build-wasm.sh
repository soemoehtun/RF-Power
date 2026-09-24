#!/usr/bin/env bash
# Build the Go RF power batch engine to WebAssembly.
# Requires a Go toolchain (1.21+ recommended).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/wasm"
mkdir -p "$OUT_DIR"

echo "→ Building go/main.go → public/wasm/rfpower.wasm"
(
  cd "$ROOT"
  GOOS=js GOARCH=wasm go build -o "$OUT_DIR/rfpower.wasm" ./go
)

# Copy the Go WASM JS glue (path differs slightly across Go versions).
GOROOT="$(go env GOROOT)"
if [[ -f "$GOROOT/lib/wasm/wasm_exec.js" ]]; then
  cp "$GOROOT/lib/wasm/wasm_exec.js" "$OUT_DIR/wasm_exec.js"
elif [[ -f "$GOROOT/misc/wasm/wasm_exec.js" ]]; then
  cp "$GOROOT/misc/wasm/wasm_exec.js" "$OUT_DIR/wasm_exec.js"
else
  echo "⚠ Could not locate wasm_exec.js under GOROOT=$GOROOT"
  echo "  The app will still run using the pure JS conversion fallback."
  exit 0
fi

echo "✓ WASM engine ready:"
ls -la "$OUT_DIR"
