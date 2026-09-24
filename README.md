# RF Power Calculator

An interactive, client-side **RF Power Calculator & Unit Converter** designed for RF engineers, telecommunications professionals, and amateur radio operators.

The application provides three integrated workflows inside a single page:

1. **Interactive Calculator** — Convert a single RF power value with real-time updates.
2. **Batch Import** — Convert thousands of rows from a CSV/XLSX file using a Go WASM engine (with a pure JavaScript fallback).
3. **Formulas & Theory** — Reference formulas, RF rules of thumb, and the offset between dBm and dBW.

Inspired by clean telecom engineering utility tools (e.g. [Cell-ID-Calculator](https://github.com/soemoehtun/Cell-ID-Calculator)).

---


### Features

**Interactive Calculator**
- Convert between **Watts (W)**, **Milliwatts (mW)**, **dBm**, and **dBW** with any source/target combination.
- Real-time recalculation on every keystroke, with a manual **Calculate** button for explicit runs.
- Strict input validation: distinguishes empty, zero, positive, negative, and non-numeric values.
- Negative values are fully supported for dBm and dBW (e.g. −120 dBm, −30 dBW).
- Engineering-friendly number formatting with up to 6 decimals for linear units and up to 3 for decibel units.
- Guaranteed to never display `NaN` or `Infinity` in the result panel.

**Batch Import**
- Drag & drop or browse CSV, XLSX, XLS, or TXT files.
- Auto-detects sheets and column headers.
- Auto-guesses the **ID / Name column** (Cell Name, Site ID, etc.) and the **Power column** (Power, dBm, TxPower, mW…).
- Choose any **Source Unit** and any **Target Unit** (all 12 combinations supported).
- Live preview of the first 12 converted rows with status indicators.
- Export a clean CSV containing only the selected **ID column + Power (source) + Power (target)**.

**Formulas & Theory**
- Conversion formulas presented in standard engineering notation.
- RF Rules of Thumb (+3 dB, +10 dB, negative dBm meaning).

**UI / UX**
- Responsive layout (mobile: full-bleed, desktop: centered card on a neutral canvas).
- Navy header with a tabbed navigation ribbon and a navy-fill status-bar on phones.
- Accessible: keyboard operable, ARIA labels, high-contrast palette.

### User Guide

#### 1. Interactive Calculator Tab

Use this tab when you need a single, quick conversion.

1. Open the **Calculator** tab (selected by default).
2. Pick the **Input Unit** that matches the value you're entering (dBm, Watts, Milliwatts, or dBW).
3. Type the numeric value in the **Power Value** field.
4. The **Result** panel below updates instantly — every supported unit is shown with the correct engineering notation.

Tips:
- `37 dBm` → `5.01187 W`, `5011.87 mW`, `7.000 dBW`.
- Negative dBm values are valid: `−30 dBm` → `0.001 mW` (1 µW).
- `Watts` and `Milliwatts` must be strictly greater than zero (logarithm of non-positive is undefined).
- Press **Enter** in the Power Value field to trigger an explicit recalculation.

#### 2. Batch Import Tab

Use this tab when you have a spreadsheet of measurements or planning values.

**Step 1 — Import your file**
- Drag and drop the file onto the dashed area, or click **browse files**.
- Supported formats: `.csv`, `.xlsx`, `.xls`, `.txt`.
- Multi-sheet workbooks are supported; pick the relevant sheet from the dropdown.

**Step 2 — Map columns and units**
- **Name / ID Column** — Choose the column that uniquely identifies each row (e.g. `Cell Name`, `Site ID`). Used in the export.
- **Power Column** — Choose the column containing the RF power values to convert.
- **Source Unit** — The unit of the values in the Power Column. Auto-detected when possible from the column name.
- **Target Unit** — The unit you want to convert each row into.

**Step 3 — Calculate**
- Click **Calculate**. Every row is processed by the Go WASM engine (or the JS fallback).
- A preview table shows the first 12 results with OK / FAIL status and any error messages.

**Step 4 — Export CSV**
- Click **Export CSV**. The download contains only:
  1. The selected ID column (e.g. `Cell Name`)
  2. `Power (source unit)` — the original value
  3. `Power (target unit)` — the converted value

**Example Input**

```text
Cell Name,Tx Power (dBm)
CELL_00001,37
CELL_00002,40
CELL_00003,-30
```

**Example Export** (Source = dBm, Target = W)

```text
Cell Name,Power (dBm),Power (W)
CELL_00001,37,5.01187
CELL_00002,40,10
CELL_00003,-30,0.001
```

#### 3. Formulas & Theory Tab

A static reference covering the conversion formulas and the +3 dB / +10 dB / negative dBm rules of thumb.

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| UI Framework | **React 19 + TypeScript** | Single-file component for portability. |
| Build Tool | **Vite 7** | Fast dev server and production bundling. |
| Styling | **Tailwind CSS v4** | Class-based theming, no external CSS frameworks. |
| Icons | **lucide-react** | Minimal icon dependency. |
| File Parsing | **xlsx (SheetJS)** | CSV / XLSX / XLS / TXT parser running entirely in the browser. |
| Batch Engine | **Go 1.21+ → WebAssembly** | Compiled via `GOOS=js GOARCH=wasm`; exposed as `window.rfConvertBatch`. |
| JS Fallback | **Pure TypeScript** | Identical API and formulas; activates automatically if the WASM module is missing or fails to load. |
| Bundling | **vite-plugin-singlefile** | Produces a single inlined `dist/index.html` for offline distribution. |

No backend, no database, no telemetry, no external CDN — the entire app runs in the browser.

### Architecture

```
+-----------------------------------------------------+
|  React UI (src/App.tsx, src/components/BatchImport.tsx) |
+-----------------------------------------------------+
                       |
+----------------------+-----------------------+
|                                             |
v                                             v
+-----------------+                  +-------------------------+
| Interactive Tab |                  | BatchImport Tab         |
| (live single-row)|                 +-------------------------+
| convertBatchJs() |                              |
+-----------------+                              v
                                          +-------------------+
                                          |  File Parser      |
                                          |  (xlsx/CSV)       |
                                          +-------------------+
                                                  |
                                                  v
                                          +-------------------+
                                          |  ensureGoEngine() |
                                          |  (loads WASM)     |
                                          +-------------------+
                                                  |
                                          +-------------------+
                                          |  convertBatch()   |  ---- JS fallback if WASM unavailable
                                          |  (TS facade)      |
                                          +-------------------+
                                                  |
                                          +-------------------+
                                          | Go WASM (or JS)   |
                                          | toWatts -> fromWatts
                                          | W / mW / dBm / dBW|
                                          +-------------------+
                                                  |
                                                  v
                                          +-------------------+
                                          |  Preview + CSV    |
                                          |  Export (Blob)    |
                                          +-------------------+
```

#### Conversion Pipeline (Single Source of Truth)

Every conversion — interactive or batch — flows through Watts as the internal base unit:

```
User Input
    │
    ▼
toWatts(value, fromUnit)
    │
    ▼
fromWatts(watts, toUnit)
    │
    ▼
Formatted Output
```

This guarantees identical results between the Go WASM engine and the TypeScript fallback, with no rounding drift between units.

#### Engine Selection Strategy

`ensureGoEngine()` in `src/lib/rfPower.ts` runs at app startup:

1. Injects `<script src="/wasm/wasm_exec.js">` if not already present.
2. `WebAssembly.instantiateStreaming(fetch("/wasm/rfpower.wasm"))` loads the Go engine.
3. The Go `main()` registers `window.rfConvertBatch(json)` and `window.rfPowerGoReady = true`.
4. If any step fails (or the WASM files don't exist), `convertBatch()` transparently uses the JS implementation.

The active engine is displayed as a badge in the Batch Import UI:

- **`Engine: Go WASM`** — green badge, Go engine active.
- **`Engine: JS fallback`** — amber badge, JavaScript engine active.
- **`Engine: loading…`** — initial state.

#### File Layout

```
├── go/
│   └── main.go              # Go WASM conversion engine (toWatts / fromWatts)
├── public/
│   └── wasm/
│       ├── wasm_exec.js     # Go WASM JS runtime glue
│       └── rfpower.wasm     # Compiled Go engine (generated by build script)
├── scripts/
│   └── build-wasm.sh        # Compiles go/main.go to WebAssembly
├── src/
│   ├── App.tsx              # Tabbed shell (Calculator / Batch / Formulas)
│   ├── main.tsx             # React root mount
│   ├── index.css            # Tailwind v4 entry + global page background
│   ├── components/
│   │   └── BatchImport.tsx  # Batch Import tab UI
│   ├── lib/
│   │   ├── rfPower.ts       # WASM loader, JS fallback, batch API
│   │   └── fileImport.ts    # xlsx parsing + CSV export helpers
│   └── utils/cn.ts          # class merging helper
├── DESIGN.md                # UI/UX design tokens
├── README.md                # ← you are here
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Conversion Formulas

Every conversion flows through Watts:

$$\text{User Input} \longrightarrow \text{Watts} \longrightarrow \{\text{W},\, \text{mW},\, \text{dBm},\, \text{dBW}\}$$

#### Input → Watts

| Source Unit | Formula | Constraint |
|---|---|---|
| **W** | $\text{Watts} = V$ | $V > 0$ |
| **mW** | $\text{Watts} = \frac{V}{1000}$ | $V > 0$ |
| **dBm** | $\text{Watts} = 10^{\frac{V - 30}{10}}$ | none (negatives allowed) |
| **dBW** | $\text{Watts} = 10^{\frac{V}{10}}$ | none (negatives allowed) |

#### Watts → Target Unit

| Target Unit | Formula |
|---|---|
| **W** | $\text{Watts}$ |
| **mW** | $\text{Watts} \times 1000$ |
| **dBm** | $10 \cdot \log_{10}(\text{Watts} \times 1000)$ |
| **dBW** | $10 \cdot \log_{10}(\text{Watts})$ |

#### Invariant

$$\text{dBm} - \text{dBW} \equiv 30\ \text{dB}$$

### Quick Reference Test Cases

| # | Source | Value | Watts | mW | dBm | dBW |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | dBm | 0 | $0.001$ | $1$ | $0$ | $-30$ |
| 2 | dBm | 30 | $1$ | $1000$ | $30$ | $0$ |
| 3 | dBm | 37 | $\approx 5.01187$ | $\approx 5011.87$ | $37$ | $7$ |
| 4 | dBW | 0 | $1$ | $1000$ | $30$ | $0$ |
| 5 | dBm | $-30$ | $0.000001$ | $0.001$ | $-30$ | $-60$ |

### Getting Started

**Prerequisites**

- **Node.js 18+** and `npm`.
- **Go 1.21+** (only required if you want to build the WASM engine).

**Installation**

```bash
npm install
```

**Development Server**

```bash
npm run dev
```

Open `http://localhost:5173`.

**Production Build**

```bash
npm run build
```

Output: `dist/index.html` (single inlined file).

Preview locally:

```bash
npm run preview
```

### Building the Go WASM Engine

The WASM engine is **optional** — if you skip this step the app automatically uses the JavaScript fallback.

```bash
# From the project root
bash scripts/build-wasm.sh
```

This produces:

- `public/wasm/rfpower.wasm` — compiled WebAssembly module.
- `public/wasm/wasm_exec.js` — Go WASM JS runtime glue.

Manual build (equivalent):

```bash
GOOS=js GOARCH=wasm go build -o public/wasm/rfpower.wasm ./go
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" public/wasm/wasm_exec.js
```

After rebuilding, re-run `npm run build` so the new WASM files are inlined into `dist/index.html`.

### Standalone Usage

`dist/index.html` is a completely self-contained bundle (HTML + CSS + JS inlined by `vite-plugin-singlefile`). You can:

- Double-click the file to open it directly in any browser.
- Upload it to any static host (GitHub Pages, S3, internal share).
- Email it to colleagues for offline use.

The Go WASM engine is loaded from the same `dist/index.html` blob (inlined as base64 by `vite-plugin-singlefile`).

### License

MIT
