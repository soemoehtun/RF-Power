import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PowerUnit } from "../lib/rfPower";
import { convertBatch, ensureGoEngine, type BatchRow } from "../lib/rfPower";
import {
  downloadCsv,
  guessIdColumn,
  guessPowerColumn,
  guessUnitFromHeader,
  parseWorkbookFile,
  type ParsedWorkbook,
} from "../lib/fileImport";

const UNIT_OPTIONS: Array<{ value: PowerUnit; label: string }> = [
  { value: "dBm", label: "dBm" },
  { value: "W", label: "Watts (W)" },
  { value: "mW", label: "Milliwatts (mW)" },
  { value: "dBW", label: "dBW" },
];

type EngineStatus = "loading" | "go-wasm" | "js-fallback";

export default function BatchImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [idColumn, setIdColumn] = useState("");
  const [powerColumn, setPowerColumn] = useState("");
  const [fromUnit, setFromUnit] = useState<PowerUnit>("dBm");
  const [toUnit, setToUnit] = useState<PowerUnit>("W");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BatchRow[] | null>(null);
  const [engine, setEngine] = useState<EngineStatus>("loading");
  const [stats, setStats] = useState<{ ok: number; fail: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureGoEngine().then((ok) => {
      if (!cancelled) setEngine(ok ? "go-wasm" : "js-fallback");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSheet = useMemo(() => {
    if (!workbook) return null;
    return workbook.sheets.find((s) => s.name === sheetName) ?? workbook.sheets[0] ?? null;
  }, [workbook, sheetName]);

  const headers = activeSheet?.headers ?? [];

  const applyWorkbook = useCallback((wb: ParsedWorkbook) => {
    setWorkbook(wb);
    const first = wb.sheets[0];
    setSheetName(first?.name ?? "");
    const guessedCol = guessPowerColumn(first?.headers ?? []);
    setPowerColumn(guessedCol);
    setIdColumn(guessIdColumn(first?.headers ?? [], guessedCol));
    const guessedUnit = guessUnitFromHeader(guessedCol);
    if (guessedUnit) setFromUnit(guessedUnit);
    setResults(null);
    setStats(null);
    setError("");
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const file = files && files[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!/\.(csv|xlsx|xls|txt)$/.test(name)) {
        setError("Please upload a CSV or Excel file (.csv, .xlsx, .xls, .txt).");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const wb = await parseWorkbookFile(file);
        applyWorkbook(wb);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read file.");
        setWorkbook(null);
      } finally {
        setBusy(false);
      }
    },
    [applyWorkbook],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleCalculate = async () => {
    if (!activeSheet) {
      setError("Please import a file first.");
      return;
    }
    if (!powerColumn) {
      setError("Please select the power column to convert.");
      return;
    }
    if (!UNIT_OPTIONS.some((o) => o.value === fromUnit)) {
      setError(`Unsupported source unit: ${fromUnit}`);
      return;
    }
    if (!UNIT_OPTIONS.some((o) => o.value === toUnit)) {
      setError(`Unsupported target unit: ${toUnit}`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const values = activeSheet.rows.map((r) => r[powerColumn] ?? "");
      const response = await convertBatch(values, fromUnit, toUnit);
      setResults(response.rows);
      setStats({ ok: response.ok, fail: response.fail });
      setEngine(response.engine === "go-wasm" ? "go-wasm" : "js-fallback");
      if (response.ok === 0 && response.fail > 0) {
        setError("No rows converted successfully. Check the power column and source unit.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch conversion failed.");
      setResults(null);
      setStats(null);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    if (!activeSheet || !results) {
      setError("Calculate results before exporting.");
      return;
    }

    // Export only: identifier column + source power value + converted target power value.
    const exportHeaders = [
      ...(idColumn ? [idColumn] : []),
      `Power (${fromUnit})`,
      `Power (${toUnit})`,
    ];

    const exportRows = activeSheet.rows.map((row, i) => {
      const r = results[i];
      return [
        ...(idColumn ? [row[idColumn] ?? ""] : []),
        r?.input ?? row[powerColumn] ?? "",
        r?.ok ? r.output : "",
      ];
    });

    const base = (workbook?.fileName ?? "rf-power").replace(/\.[^.]+$/, "");
    downloadCsv(`${base}_converted_to_${toUnit}.csv`, exportHeaders, exportRows);
  };

  const handleClear = () => {
    setWorkbook(null);
    setSheetName("");
    setIdColumn("");
    setPowerColumn("");
    setFromUnit("dBm");
    setToUnit("W");
    setResults(null);
    setStats(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewRows = useMemo(() => {
    if (!results || !activeSheet) return [];
    return results.slice(0, 12).map((r, i) => ({
      row: activeSheet.rows[i],
      result: r,
    }));
  }, [results, activeSheet]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-slate-900">Batch Import</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Import CSV / Excel, map the power column, convert units, and export results
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            engine === "go-wasm"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : engine === "js-fallback"
                ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
          title="Conversion engine used for batch processing"
        >
          {engine === "go-wasm" && "Engine: Go WASM"}
          {engine === "js-fallback" && "Engine: JS fallback"}
          {engine === "loading" && "Engine: loading…"}
        </span>
      </div>

      {/* Import */}
      <div className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">Import File</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">Drag and drop a CSV or Excel workbook (.csv, .xlsx, .xls)</p>

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={`mt-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
            dragging
              ? "border-[#2c6bb3] bg-blue-50"
              : "border-slate-300 bg-slate-50/60 hover:border-slate-400"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" />
            <path d="M9 15l3 3 3-3" />
          </svg>
          <p className="mt-2 text-sm font-medium text-slate-700">Drag &amp; drop your data file here</p>
          <p className="mt-1 text-[12px] text-slate-500">
            or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-semibold text-[#2c6bb3] hover:underline"
            >
              browse files
            </button>{" "}
            (.csv, .xlsx, .xls, .txt)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {workbook && (
            <p className="mt-3 text-[12px] font-medium text-emerald-700">
              Loaded: {workbook.fileName} · {workbook.sheets.length} sheet
              {workbook.sheets.length === 1 ? "" : "s"} · {activeSheet?.rows.length ?? 0} rows
            </p>
          )}
        </div>
      </div>

      <hr className="my-6 border-slate-200" />

      {/* Mapping */}
      <h3 className="text-sm font-bold text-slate-900">Column Mapping &amp; Units</h3>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Choose the sheet, power column, source unit, and the unit you want to convert to
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Sheet: <span className="text-red-500">*</span>
          </label>
          <select
            value={sheetName}
            disabled={!workbook}
            onChange={(e) => {
              setSheetName(e.target.value);
              const sheet = workbook?.sheets.find((s) => s.name === e.target.value);
              const guessed = guessPowerColumn(sheet?.headers ?? []);
              setPowerColumn(guessed);
              setIdColumn(guessIdColumn(sheet?.headers ?? [], guessed));
              const u = guessUnitFromHeader(guessed);
              if (u) setFromUnit(u);
              setResults(null);
              setStats(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
          >
            {!workbook && <option value="">Import a file first…</option>}
            {workbook?.sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.rows.length} rows)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Name / ID Column:</label>
          <select
            value={idColumn}
            disabled={!headers.length}
            onChange={(e) => setIdColumn(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
          >
            <option value="">(none)</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Power Column: <span className="text-red-500">*</span>
          </label>
          <select
            value={powerColumn}
            disabled={!headers.length}
            onChange={(e) => {
              setPowerColumn(e.target.value);
              const u = guessUnitFromHeader(e.target.value);
              if (u) setFromUnit(u);
              setResults(null);
              setStats(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
          >
            {!headers.length && <option value="">No columns available</option>}
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Source Unit: <span className="text-red-500">*</span>
          </label>
          <select
            value={fromUnit}
            onChange={(e) => {
              setFromUnit(e.target.value as PowerUnit);
              setResults(null);
              setStats(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Target Unit: <span className="text-red-500">*</span>
          </label>
          <select
            value={toUnit}
            onChange={(e) => {
              setToUnit(e.target.value as PowerUnit);
              setResults(null);
              setStats(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={busy}
          className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => void handleCalculate()}
          disabled={busy || !workbook}
          className="rounded-md border border-[#255a9a] bg-[#2c6bb3] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#225692] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2c6bb3]/30"
        >
          {busy ? "Working…" : "Calculate"}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!results || busy}
          className="rounded-md border border-emerald-700 bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          Export CSV
        </button>
      </div>

      {stats && (
        <>
          <hr className="my-6 border-slate-200" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Result Preview</h3>
            <p className="text-[12px] text-slate-500">
              Converted <span className="font-semibold text-emerald-700">{stats.ok}</span>
              {stats.fail > 0 && (
                <>
                  {" "}
                  · Failed <span className="font-semibold text-red-600">{stats.fail}</span>
                </>
              )}
              {" "}
              · showing first {previewRows.length} of {results?.length ?? 0}
            </p>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 font-semibold">#</th>
                  {idColumn && <th className="border-b border-slate-200 px-3 py-2 font-semibold">{idColumn}</th>}
                  <th className="border-b border-slate-200 px-3 py-2 font-semibold">Power ({fromUnit})</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-semibold">Power ({toUnit})</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ row, result: r }) => (
                  <tr key={r.index} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{r.index + 1}</td>
                    {idColumn && (
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{row?.[idColumn] || "—"}</td>
                    )}
                    <td className="border-b border-slate-100 px-3 py-2 font-mono text-slate-800">{r.input || "—"}</td>
                    <td className="border-b border-slate-100 px-3 py-2 font-mono font-medium text-slate-900">
                      {r.ok ? r.output : "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      {r.ok ? (
                        <span className="text-[12px] font-semibold text-emerald-700">OK</span>
                      ) : (
                        <span className="text-[12px] font-semibold text-red-600" title={r.error}>
                          FAIL{r.error ? `: ${r.error}` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
