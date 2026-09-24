# RF Power Calculator

> **Languages:** English · [Burmese (မြန်မာ)](#မြန်မာ)

An interactive, client-side **RF Power Calculator & Unit Converter** designed for RF engineers, telecommunications professionals, and amateur radio operators.

The application provides three integrated workflows inside a single page:

1. **Interactive Calculator** — Convert a single RF power value with real-time updates.
2. **Batch Import** — Convert thousands of rows from a CSV/XLSX file using a Go WASM engine (with a pure JavaScript fallback).
3. **Formulas & Theory** — Reference formulas, RF rules of thumb, and the offset between dBm and dBW.

Inspired by clean telecom engineering utility tools (e.g. [Cell-ID-Calculator](https://github.com/soemoehtun/Cell-ID-Calculator)).

---

## English

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

---

## မြန်မာ

### အကြမ်းဖော်ပြချက်

**RF Power Calculator** သည် RF အင်ဂျင်နီယာများ၊ တယ်လီကွန်ဒီကွန်နီကေးရှင်းပညာရှင်များနှင့် အမျိုးသားရေဒီယိုဝါသနာအသိုက်အဝန်းများအတွက် ရည်ရွယ်တည်ဆောက်ထားသော client-side RF Power Unit Converter ဖြစ်ပါသည်။

စာမျက်နှာတစ်ခုတည်းတွင် အလုပ်လုပ်ငန်းသုံးမီနူးကို ပေါင်းစပ်ထည့်သွင်းထားပါသည် −

1. **Interactive Calculator** − RF ပါဝါတန်တစ်ခုကို real-time ပြောင်းပါ။
2. **Batch Import** − CSV/XLSX ဖိုင်ထဲမှ အတန်းပေါင်းများစွာကို Go WASM engine ဖြင့် ပြောင်းပါ (JavaScript fallback ပါဝင်သည်)။
3. **Formulas & Theory** − ပြောင်းလဲမှုဖော်မြူလာများ၊ RF rule of thumb များနှင့် dBm နှင့် dBW အကြား ကွာခြားချက်ကို ကြည့်ရှုပါ။

### အင်္ဂါရပ်များ

**Interactive Calculator**
- **Watts (W)**, **Milliwatts (mW)**, **dBm**, **dBW** ယူနစ်များ အချင်းချင်း ပြောင်းနိုင်ပါသည်။
- စာလုံးတိုင်းရိုက်သွင်းတိုင်း real-time ပြန်လည်တွက်ချက်ပေးပြီး **Calculate** ခလုတ်ဖြင့် လည်း ကိုယ်တိုင်တွက်ချက်နိုင်ပါသည်။
- ထည့်သွင်းမှုကို သေချာစွာ စစ်ဆေးပေးသည် − ဗလာ၊ သုည၊ အပေါင်း၊ အနုတ်၊ နံပါတ်မဟုတ်သောတန်ဖိုး စသည်ကို ခွဲခြားပါသည်။
- dBm နှင့် dBW တွင် အနုတ်ကိန်းများ တရားဝင်ပါသည် (ဥပမာ −120 dBm၊ −30 dBW)။
- အင်ဂျင်နီယာအသုံးပြုမှုအတွက် နံပါတ်ဖော်မြူလာ − linear ယူနစ်များတွင် ၆ ဒသမကိန်းအထိ၊ decibel ယူနစ်များတွင် ၃ ဒသမကိန်းအထိ ပြသပေးပါသည်။
- `NaN` သို့မဟုတ် `Infinity` ကို ရလဒ်နေရာတွင် ဘယ်သောအခါမျှ မပြသပါ။

**Batch Import**
- CSV၊ XLSX၊ XLS သို့မဟုတ် TXT ဖိုင်များကို drag & drop သို့မဟုတ် browse ဖြင့် ထည့်သွင်းနိုင်သည်။
- sheet များနှင့် column header များကို အလိုအလျောက် ရှာဖွေပေးသည်။
- **ID / Name column** (Cell Name, Site ID စသဖြင့်) နှင့် **Power column** (Power, dBm, TxPower, mW စသဖြင့်) ကို အလိုအလျောက် ခန့်မှန်းပေးသည်။
- **Source Unit** နှင့် **Target Unit** ကို မည်အတွဲမဆို ရွေးချယ်နိုင်သည် (ဖြစ်နိုင်သော ပေါင်းစပ်မှု ၁၂ ခု အားလုံး အလုပ်လုပ်ပါသည်)။
- ပြောင်းလဲထားသော ပထမဆုံး ၁၂ တန်းကို OK / FAIL အခြေအနေဖြင့် ကြိုတင်ပြသပေးသည်။
- CSV ထုတ်ယူရာတွင် **ID column + Power (source) + Power (target)** ကိုသာ ထည့်သွင်းပါသည်။

**Formulas & Theory**
- စံနှုန်းအင်ဂျင်နီယာ notation ဖြင့် ပြောင်းလဲမှုဖော်မြူလာများ။
- RF Rule of Thumb များ (+3 dB၊ +10 dB၊ negative dBm)။

**UI / UX**
- Responsive အပြင်အဆင် (မိုဘိုင်း − အပြည့်အဝဖြန့်ကျဲမှု၊ Desktop − အလယ်မှာ card ပုံစံ)။
- Navy header၊ tab navigation နှင့် ဖုန်း status-bar အရောင်တို့ ပါဝင်သည်။
- Keyboard ဖြင့် အသုံးပြုနိုင်၊ ARIA labels ပါဝင်၊ အရောင်ပြိုင်ဆိုင်မှု မြင့်မားသည်။

### အသုံးပြုနည်း လမ်းညွှန်

#### ၁။ Interactive Calculator Tab

တစ်ခုတည်းသော တန်ဖိုးတစ်ခုကို မြန်မြန်ပြောင်းလိုသည့်အခါ ဤ tab ကို သုံးပါ။

1. **Calculator** tab ကို ဖွင့်ပါ (မူလတွင် ရွေးထားပြီး)။
2. **Input Unit** dropdown မှ ထည့်သွင်းမည့်တန်ဖိုး၏ ယူနစ်ကို ရွေးပါ (dBm, Watts, Milliwatts သို့မဟုတ် dBW)။
3. **Power Value** ကွက်လပ်တွင် ကိန်းဂဏန်းတန်ဖိုးကို ရိုက်ထည့်ပါ။
4. အောက်ပါ **Result** panel သည် ချက်ချင်း real-time update ဖြစ်ပြီး ယူနစ်အားလုံးကို မှန်ကန်သော အင်ဂျင်နီယာ notation ဖြင့် ပြသပေးသည်။

အကြံပြုချက်များ −
- `37 dBm` → `5.01187 W`, `5011.87 mW`, `7.000 dBW`။
- အနုတ် dBm များ တရားဝင်ပါသည် − `−30 dBm` → `0.001 mW` (1 µW)။
- `Watts` နှင့် `Milliwatts` သည် သုညထက် ကြီးရပါမည် (non-positive ကိန်းဂဏန်း၏ logarithm သည် undefined ဖြစ်သည်)။
- **Enter** ကိုနှိပ်ခြင်းဖြင့် ပြန်လည်တွက်ချက်မှုကို တိုက်ရိုက် လုပ်ဆောင်နိုင်ပါသည်။

#### ၂။ Batch Import Tab

တိုင်းတာမှုများ သို့မဟုတ် စီမံကိန်းတန်ဖိုးများ ပါသော spreadsheet တစ်ခု ရှိသည့်အခါ ဤ tab ကို သုံးပါ။

**အဆင့် ၁ − ဖိုင်ထည့်သွင်းခြင်း**
- ဖိုင်ကို dashed ဧရိယာပေါ်သို့ drag & drop လုပ်ပါ သို့မဟုတ် **browse files** ကို နှိပ်ပါ။
- ပံ့ပိုးသော format − `.csv`, `.xlsx`, `.xls`, `.txt`။
- Multi-sheet workbook များ ပံ့ပိုးပါသည်။ Dropdown မှ သက်ဆိုင်ရာ sheet ကို ရွေးပါ။

**အဆင့် ၂ − Column နှင့် ယူနစ် မြေပုံရာဇဝင်**
- **Name / ID Column** − တိုင်းတန်းတိုင်းကို တစ်ထီးတည်း ကိုယ်စားပြုသော column ကို ရွေးပါ (ဥပမာ `Cell Name`, `Site ID`)။ Export တွင် အသုံးပြုသည်။
- **Power Column** − RF ပါဝါတန်ဖိုးများ ပါသော column ကို ရွေးပါ။
- **Source Unit** − Power Column တွင်ပါသော တန်ဖိုးများ၏ ယူနစ်။ Column အမည်မှ ဖြစ်နိုင်လျှင် အလိုအလျောက် ရှာဖွေပေးသည်။
- **Target Unit** − ပြောင်းလိုသော ယူနစ်။

**အဆင့် ၃ − တွက်ချက်ခြင်း**
- **Calculate** ကို နှိပ်ပါ။ တိုင်းတန်းတိုင်းကို Go WASM engine (သို့မဟုတ် JS fallback) ဖြင့် ဆောင်ရွက်ပါသည်။
- ပြီးလျှင် preview ဇယားတွင် ပထမ ၁၂ ခုရလဒ်ကို OK / FAIL အခြေအနေဖြင့် ပြသပေးပါသည်။

**အဆင့် ၄ − CSV ထုတ်ယူခြင်း**
- **Export CSV** ကို နှိပ်ပါ။ ဖိုင်တွင် −
  1. ရွေးထားသော ID column (ဥပမာ `Cell Name`)
  2. `Power (source unit)` − မူလတန်ဖိုး
  3. `Power (target unit)` − ပြောင်းထားသောတန်ဖိုး

တို့ကိုသာ ထည့်သွင်းပါသည်။

**ထည့်သွင်းမှု ဥပမာ**

```text
Cell Name,Tx Power (dBm)
CELL_00001,37
CELL_00002,40
CELL_00003,-30
```

**ထုတ်ယူရရှိသော ဖိုင် ဥပမာ** (Source = dBm, Target = W)

```text
Cell Name,Power (dBm),Power (W)
CELL_00001,37,5.01187
CELL_00002,40,10
CELL_00003,-30,0.001
```

#### ၃။ Formulas & Theory Tab

ပြောင်းလဲမှုဖော်မြူလာများနှင့် +3 dB / +10 dB / negative dBm rule of thumb များကို ကြည့်ရှုရန် ရည်ရွယ်ထားသော static reference ဖြစ်ပါသည်။

### နည်းပညာ Stack

| အလွှာ | နည်းပညာ | မှတ်ချက် |
|---|---|---|
| UI Framework | **React 19 + TypeScript** | သယ်ဆောင်ရလွယ်စေရန် single-file component။ |
| Build Tool | **Vite 7** | မြန်ဆန်သော dev server နှင့် production bundling။ |
| Styling | **Tailwind CSS v4** | Class-based theming − ပြင်ပ CSS framework မလိုအပ်ပါ။ |
| Icons | **lucide-react** | အနည်းဆုံး icon dependency ဖြင့်။ |
| File Parsing | **xlsx (SheetJS)** | CSV / XLSX / XLS / TXT parser ကို browser တွင်းတွင် လုပ်ဆောင်သည်။ |
| Batch Engine | **Go 1.21+ → WebAssembly** | `GOOS=js GOARCH=wasm` ဖြင့် compile လုပ်ပြီး `window.rfConvertBatch` အဖြစ် expose လုပ်သည်။ |
| JS Fallback | **Pure TypeScript** | WASM module မရှိပါက အလိုအလျောက် အလုပ်လုပ်ပေးသည်။ |
| Bundling | **vite-plugin-singlefile** | အင်တာနက်မလိုအပ်သော ဖြန့်ဝေမှုအတွက် `dist/index.html` တစ်ဖိုင်ထဲ ထုပ်ပိုးပေးသည်။ |

Backend၊ database၊ telemetry၊ ပြင်ပ CDN များ မပါဝင်ပါ − app တစ်ခုလုံးကို browser တွင်းတွင် လုပ်ဆောင်သည်။

### ဗိသုကာ (Architecture)

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

#### ပြောင်းလဲမှု လုပ်ငန်းအဆင့် (Single Source of Truth)

Interactive သုံးသည်ဖြစ်စေ၊ Batch သုံးသည်ဖြစ်စေ − ပြောင်းလဲမှုအားလုံးကို အတိုင်းအတာယူနစ် Watts မှတစ်ဆင့် ဖြတ်ပါသည် −

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

ဤသို့ဖြစ်သောကြောင့် Go WASM engine နှင့် TypeScript fallback တို့မှ ရလဒ်များသည် တစ်ထပ်တည်းကျသည်။

#### Engine ရွေးချယ်မှု မူဝါဒ

`src/lib/rfPower.ts` ထဲမှ `ensureGoEngine()` ကို app စတင်ချိန်တွင် လုပ်ဆောင်သည် −

1. `<script src="/wasm/wasm_exec.js">` ကို မရှိသေးပါက inject လုပ်သည်။
2. `WebAssembly.instantiateStreaming(fetch("/wasm/rfpower.wasm"))` ဖြင့် Go engine ကို load သည်။
3. Go `main()` က `window.rfConvertBatch(json)` နှင့် `window.rfPowerGoReady = true` ကို register လုပ်သည်။
4. မည်သည့်အဆင့် မှာမဆို မအောင်မြင်ပါက (သို့မဟုတ် WASM ဖိုင်များ မရှိပါက) `convertBatch()` သည် JS implementation ကို အလိုအလျောက် သုံးပါသည်။

လက်ရှိ engine ကို Batch Import UI တွင် badge ဖြင့် ပြသသည် −

- **`Engine: Go WASM`** − အစိမ်းရင့်အရောင် badge − Go engine အလုပ်လုပ်နေသည်။
- **`Engine: JS fallback`** − အဝါရောင် badge − JavaScript engine အလုပ်လုပ်နေသည်။
- **`Engine: loading…`** − စစ်ဆေးနေဆဲ။

#### ဖိုင်ဖွဲ့စည်းပုံ

```
├── go/
│   └── main.go              # Go WASM conversion engine (toWatts / fromWatts)
├── public/
│   └── wasm/
│       ├── wasm_exec.js     # Go WASM JS runtime glue
│       └── rfpower.wasm     # Compiled Go engine (build script မှ ထုတ်ပေးသည်)
├── scripts/
│   └── build-wasm.sh        # go/main.go ကို WebAssembly သို့ compile လုပ်သည်
├── src/
│   ├── App.tsx              # Tabbed shell (Calculator / Batch / Formulas)
│   ├── main.tsx             # React root mount
│   ├── index.css            # Tailwind v4 entry + global page background
│   ├── components/
│   │   └── BatchImport.tsx  # Batch Import tab UI
│   ├── lib/
│   │   ├── rfPower.ts       # WASM loader၊ JS fallback၊ batch API
│   │   └── fileImport.ts    # xlsx parsing + CSV export helpers
│   └── utils/cn.ts          # class merging helper
├── DESIGN.md                # UI/UX design tokens
├── README.md                # ← ဤဖိုင်
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### ပြောင်းလဲမှု ဖော်မြူလာများ

ပြောင်းလဲမှုအားလုံးကို Watts မှတစ်ဆင့် ဖြတ်ပါသည် −

$$\text{User Input} \longrightarrow \text{Watts} \longrightarrow \{\text{W},\, \text{mW},\, \text{dBm},\, \text{dBW}\}$$

#### Input → Watts

| မူလ ယူနစ် | ဖော်မြူလာ | ကန့်သတ်ချက် |
|---|---|---|
| **W** | $\text{Watts} = V$ | $V > 0$ |
| **mW** | $\text{Watts} = \frac{V}{1000}$ | $V > 0$ |
| **dBm** | $\text{Watts} = 10^{\frac{V - 30}{10}}$ | ကန့်သတ်မရှိ (အနုတ်ကိန်း ခွင့်ပြု) |
| **dBW** | $\text{Watts} = 10^{\frac{V}{10}}$ | ကန့်သတ်မရှိ (အနုတ်ကိန်း ခွင့်ပြု) |

#### Watts → ပစ်မှတ် ယူနစ်

| ပစ်မှတ် ယူနစ် | ဖော်မြူလာ |
|---|---|
| **W** | $\text{Watts}$ |
| **mW** | $\text{Watts} \times 1000$ |
| **dBm** | $10 \cdot \log_{10}(\text{Watts} \times 1000)$ |
| **dBW** | $10 \cdot \log_{10}(\text{Watts})$ |

#### မပြောင်းသော ကိန်းတန်း

$$\text{dBm} - \text{dBW} \equiv 30\ \text{dB}$$

### လျင်မြန်စမ်းသပ် ကိစ္စရပ်များ

| # | မူလ | တန်ဖိုး | Watts | mW | dBm | dBW |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | dBm | 0 | $0.001$ | $1$ | $0$ | $-30$ |
| 2 | dBm | 30 | $1$ | $1000$ | $30$ | $0$ |
| 3 | dBm | 37 | $\approx 5.01187$ | $\approx 5011.87$ | $37$ | $7$ |
| 4 | dBW | 0 | $1$ | $1000$ | $30$ | $0$ |
| 5 | dBm | $-30$ | $0.000001$ | $0.001$ | $-30$ | $-60$ |

### စတင်အသုံးပြုခြင်း

**ကြိုတင်လိုအပ်ချက်များ**

- **Node.js 18+** နှင့် `npm`။
- **Go 1.21+** (WASM engine build လုပ်လိုပါက သာလိုအပ်သည်)။

**Install**

```bash
npm install
```

**Development Server**

```bash
npm run dev
```

`http://localhost:5173` ကို ဖွင့်ပါ။

**Production Build**

```bash
npm run build
```

Output − `dist/index.html` (single inlined file)။

Local preview −

```bash
npm run preview
```

### Go WASM Engine တည်ဆောက်ခြင်း

WASM engine သည် **optional** ဖြစ်သည် − ဤအဆင့်ကို ကျော်လွှားပါက app သည် JavaScript fallback ကို အလိုအလျောက် သုံးပါသည်။

```bash
# Project root မှ
bash scripts/build-wasm.sh
```

ဤသို့ ထုတ်ပေးသည် −

- `public/wasm/rfpower.wasm` − compiled WebAssembly module။
- `public/wasm/wasm_exec.js` − Go WASM JS runtime glue။

လက်ဖြင့် build လုပ်ခြင်း (အစားထိုး) −

```bash
GOOS=js GOARCH=wasm go build -o public/wasm/rfpower.wasm ./go
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" public/wasm/wasm_exec.js
```

Build ပြီးလျှင် `npm run build` ကို ထပ်မံ run ပါ − WASM ဖိုင်အသစ်များကို `dist/index.html` တွင် inline လုပ်ပေးပါမည်။

### Standalone အသုံးပြုမှု

`dist/index.html` သည် `vite-plugin-singlefile` ဖြင့် HTML + CSS + JS အားလုံးကို inline လုပ်ထားသော self-contained bundle ဖြစ်သည်။ သင်သည် −

- ဖိုင်ကို double-click လုပ်၍ browser တွင် တိုက်ရိုက်ဖွင့်နိုင်သည်။
- မည်သည့် static host (GitHub Pages, S3, internal share) သို့ upload လုပ်နိုင်သည်။
- အင်တာနက်မရှိသော အသုံးပြသူများထံ email ပို့နိုင်သည်။

Go WASM engine ကိုလည်း `dist/index.html` (base64 inline) မှ တူညီသော ဖိုင်မှ load ပါသည်။

### License

MIT
