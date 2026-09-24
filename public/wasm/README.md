# Go WASM RF Power Engine

This folder holds the compiled Go WebAssembly batch conversion engine.

## Files

| File | Purpose |
|---|---|
| `rfpower.wasm` | Compiled Go engine (`go/main.go`) |
| `wasm_exec.js` | Go WASM JS runtime glue from the Go toolchain |

## Build

From the project root (requires [Go](https://go.dev/) 1.21+):

```bash
bash scripts/build-wasm.sh
```

Or manually:

```bash
mkdir -p public/wasm
GOOS=js GOARCH=wasm go build -o public/wasm/rfpower.wasm ./go
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" public/wasm/wasm_exec.js
# Older Go versions:
# cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" public/wasm/wasm_exec.js
```

## Runtime behaviour

The Batch Import tab calls `ensureGoEngine()` which:

1. Loads `/wasm/wasm_exec.js`
2. Instantiates `/wasm/rfpower.wasm`
3. Exposes `window.rfConvertBatch(json) → json`

If the WASM files are missing or fail to load, the app automatically falls back to a pure TypeScript implementation with the **same API and formulas** (`src/lib/rfPower.ts`), so the feature always works offline without Go installed.
