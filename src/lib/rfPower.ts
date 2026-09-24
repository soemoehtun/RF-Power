export type PowerUnit = "W" | "mW" | "dBm" | "dBW";

export interface BatchRow {
  index: number;
  input: string;
  output: string;
  watts: number;
  ok: boolean;
  error?: string;
}

export interface BatchResponse {
  engine: "go-wasm" | "js-fallback";
  rows: BatchRow[];
  ok: number;
  fail: number;
  error?: string;
}

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

function formatLinear(v: number): string {
  if (!isFiniteNumber(v)) return "0";
  const abs = Math.abs(v);
  if (abs === 0) return "0";
  if (abs < 1e-7 || abs >= 1e8) return v.toExponential(4);
  return Number(v.toFixed(6)).toString();
}

function formatDb(v: number): string {
  if (!isFiniteNumber(v)) return "0";
  const rounded = Math.round(v * 1000) / 1000;
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
    useGrouping: false,
  });
}

function formatUnit(v: number, unit: PowerUnit): string {
  return unit === "dBm" || unit === "dBW" ? formatDb(v) : formatLinear(v);
}

function toWatts(value: number, unit: PowerUnit): number {
  switch (unit) {
    case "W":
      if (value <= 0) throw new Error("Power in Watts must be greater than 0.");
      return value;
    case "mW":
      if (value <= 0) throw new Error("Power in milliwatts must be greater than 0.");
      return value / 1000;
    case "dBm":
      return Math.pow(10, (value - 30) / 10);
    case "dBW":
      return Math.pow(10, value / 10);
  }
}

function fromWatts(watts: number, unit: PowerUnit): number {
  if (!isFiniteNumber(watts) || watts <= 0) throw new Error("Invalid watts base value.");
  switch (unit) {
    case "W":
      return watts;
    case "mW":
      return watts * 1000;
    case "dBm":
      return 10 * Math.log10(watts * 1000);
    case "dBW":
      return 10 * Math.log10(watts);
  }
}

/** Pure JS implementation mirroring the Go WASM engine API. */
export function convertBatchJs(
  values: string[],
  fromUnit: PowerUnit,
  toUnit: PowerUnit,
): BatchResponse {
  const rows: BatchRow[] = [];
  let ok = 0;
  let fail = 0;

  values.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      rows.push({ index, input: raw, output: "", watts: 0, ok: false, error: "Empty value" });
      fail++;
      return;
    }
    const num = Number(trimmed);
    if (!isFiniteNumber(num)) {
      rows.push({ index, input: raw, output: "", watts: 0, ok: false, error: "Invalid numeric value" });
      fail++;
      return;
    }
    try {
      const watts = toWatts(num, fromUnit);
      const out = fromWatts(watts, toUnit);
      rows.push({ index, input: raw, output: formatUnit(out, toUnit), watts, ok: true });
      ok++;
    } catch (e) {
      rows.push({
        index,
        input: raw,
        output: "",
        watts: 0,
        ok: false,
        error: e instanceof Error ? e.message : "Conversion failed",
      });
      fail++;
    }
  });

  return { engine: "js-fallback", rows, ok, fail };
}

declare global {
  interface Window {
    Go?: new () => { importObject: WebAssembly.Imports; run: (instance: WebAssembly.Instance) => Promise<void> };
    rfConvertBatch?: (json: string) => string;
    rfPowerGoReady?: boolean;
  }
}

let goReadyPromise: Promise<boolean> | null = null;

/**
 * Attempt to load the Go WASM conversion engine.
 * Returns true if the Go engine is available, false if we must use the JS fallback.
 * Safe to call multiple times — the load is memoized.
 */
export function ensureGoEngine(): Promise<boolean> {
  if (goReadyPromise) return goReadyPromise;

  goReadyPromise = (async () => {
    if (typeof window === "undefined") return false;
    if (window.rfPowerGoReady && typeof window.rfConvertBatch === "function") return true;

    try {
      // Load the Go WASM runtime glue (provided by the Go toolchain).
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-rf-wasm-exec]');
        if (existing) {
          if (window.Go) resolve();
          else existing.addEventListener("load", () => resolve());
          return;
        }
        const script = document.createElement("script");
        script.src = "/wasm/wasm_exec.js";
        script.async = true;
        script.dataset.rfWasmExec = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load wasm_exec.js"));
        document.head.appendChild(script);
      });

      if (!window.Go) return false;

      const go = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch("/wasm/rfpower.wasm"), go.importObject);
      // Run keeps the Go runtime alive; do not await.
      void go.run(result.instance);

      // Wait briefly for the Go main() to register the global.
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        if (window.rfPowerGoReady && typeof window.rfConvertBatch === "function") return true;
        await new Promise((r) => setTimeout(r, 20));
      }
      return typeof window.rfConvertBatch === "function";
    } catch {
      return false;
    }
  })();

  return goReadyPromise;
}

const SUPPORTED_UNITS: PowerUnit[] = ["W", "mW", "dBm", "dBW"];

/** Convert a batch of values using Go WASM when available, otherwise the JS fallback. */
export async function convertBatch(
  values: string[],
  fromUnit: PowerUnit,
  toUnit: PowerUnit,
): Promise<BatchResponse> {
  if (!SUPPORTED_UNITS.includes(fromUnit)) {
    throw new Error(`Unsupported source unit: ${fromUnit}`);
  }
  if (!SUPPORTED_UNITS.includes(toUnit)) {
    throw new Error(`Unsupported target unit: ${toUnit}`);
  }

  const goReady = await ensureGoEngine();
  if (goReady && typeof window.rfConvertBatch === "function") {
    try {
      const raw = window.rfConvertBatch(JSON.stringify({ values, fromUnit, toUnit }));
      const parsed = JSON.parse(raw) as BatchResponse;
      if (parsed && Array.isArray(parsed.rows)) {
        return { ...parsed, engine: "go-wasm" };
      }
    } catch {
      // fall through to JS
    }
  }
  return convertBatchJs(values, fromUnit, toUnit);
}

/** Dev-only sanity check that exercises every supported unit combination. */
export function __smokeTestAllUnits(): boolean {
  const pairs: Array<[PowerUnit, PowerUnit]> = [
    ["W", "mW"],
    ["W", "dBm"],
    ["W", "dBW"],
    ["mW", "W"],
    ["mW", "dBm"],
    ["mW", "dBW"],
    ["dBm", "W"],
    ["dBm", "mW"],
    ["dBm", "dBW"],
    ["dBW", "W"],
    ["dBW", "mW"],
    ["dBW", "dBm"],
  ];
  for (const [a, b] of pairs) {
    const r = convertBatchJs(["10"], a, b);
    if (r.fail !== 0) return false;
  }
  return true;
}
