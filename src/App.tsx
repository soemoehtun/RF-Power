import { useEffect, useId, useState } from "react";
import BatchImport from "./components/BatchImport";

type PowerUnit = "W" | "mW" | "dBm" | "dBW";
type ActiveTab = "calculator" | "batch" | "formulas";

interface ConversionResult {
  watts: number;
  milliwatts: number;
  dbm: number;
  dbw: number;
}

const units: Array<{ value: PowerUnit; label: string }> = [
  { value: "dBm", label: "dBm" },
  { value: "W", label: "Watts (W)" },
  { value: "mW", label: "Milliwatts (mW)" },
  { value: "dBW", label: "dBW" },
];

function formatNumber(value: number, targetUnit: PowerUnit): string {
  if (!Number.isFinite(value)) return "0";

  if (targetUnit === "dBm" || targetUnit === "dBW") {
    const rounded = Math.round(value * 1000) / 1000;
    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 3,
      maximumFractionDigits: 3,
      useGrouping: false,
    });
  }

  const absolute = Math.abs(value);
  if (absolute === 0) return "0";
  if (absolute < 1e-7 || absolute >= 1e8) return value.toExponential(4);

  return Number(value.toFixed(6)).toString();
}

function calculateFromWatts(watts: number): ConversionResult {
  return {
    watts,
    milliwatts: watts * 1000,
    dbm: 10 * Math.log10(watts * 1000),
    dbw: 10 * Math.log10(watts),
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("calculator");
  const [unit, setUnit] = useState<PowerUnit>("dBm");
  const [inputValue, setInputValue] = useState("37");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);

  const inputId = useId();
  const unitId = useId();

  const calculate = (rawValue: string, inputUnit: PowerUnit) => {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      setError("Please enter a power value.");
      setResult(null);
      return;
    }
    const numericValue = Number(trimmedValue);
    if (!Number.isFinite(numericValue)) {
      setError("Please enter a valid numeric value.");
      setResult(null);
      return;
    }
    if (inputUnit === "W" && numericValue <= 0) {
      setError("Power in Watts must be greater than 0.");
      setResult(null);
      return;
    }
    if (inputUnit === "mW" && numericValue <= 0) {
      setError("Power in milliwatts must be greater than 0.");
      setResult(null);
      return;
    }

    let watts: number;
    switch (inputUnit) {
      case "W":
        watts = numericValue;
        break;
      case "mW":
        watts = numericValue / 1000;
        break;
      case "dBm":
        watts = Math.pow(10, (numericValue - 30) / 10);
        break;
      case "dBW":
        watts = Math.pow(10, numericValue / 10);
        break;
    }
    setError("");
    setResult(calculateFromWatts(watts));
  };

  useEffect(() => {
    calculate(inputValue, unit);
  }, [inputValue, unit]);

  const handleClear = () => {
    setUnit("W");
    setInputValue("");
    setResult(null);
    setError("");
  };

  const outputRows: Array<{ label: string; value: string }> = [
    { label: "Watts (W):", value: result ? `${formatNumber(result.watts, "W")} W` : "\u2013" },
    { label: "Milliwatts (mW):", value: result ? `${formatNumber(result.milliwatts, "mW")} mW` : "\u2013" },
    { label: "dBm:", value: result ? `${formatNumber(result.dbm, "dBm")} dBm` : "\u2013" },
    { label: "dBW:", value: result ? `${formatNumber(result.dbw, "dBW")} dBW` : "\u2013" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans antialiased sm:bg-[#eceff2]">
      <div className="flex min-h-screen w-full flex-col sm:mx-auto sm:min-h-0 sm:max-w-2xl sm:py-10">
        <div className="flex min-h-screen w-full flex-col overflow-hidden bg-white sm:min-h-0 sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm">
          {/* Navy header — extends under the phone status bar / notch via the safe-area inset */}
          <div className="bg-[#0f2744] pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6">
            <div className="px-4 sm:px-7">
              <h1 className="text-xl font-bold text-white sm:text-[1.4rem]">RF Power Calculator</h1>
              <p className="mt-0.5 text-[13px] text-slate-300">
                Convert power between Watts (W), milliwatts (mW), dBm, and dBW.
              </p>
            </div>

            {/* Tabs — full-width navy bar with white underline on the active tab */}
            <nav className="mt-5 flex flex-wrap border-b border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("calculator")}
                className={
                  activeTab === "calculator"
                    ? "border-b-2 border-white px-5 py-2.5 text-sm font-semibold text-white"
                    : "border-b-2 border-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                }
              >
                Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("batch")}
                className={
                  activeTab === "batch"
                    ? "border-b-2 border-white px-5 py-2.5 text-sm font-semibold text-white"
                    : "border-b-2 border-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                }
              >
                Batch Import
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("formulas")}
                className={
                  activeTab === "formulas"
                    ? "border-b-2 border-white px-5 py-2.5 text-sm font-semibold text-white"
                    : "border-b-2 border-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                }
              >
                Formulas &amp; Theory
              </button>
            </nav>
          </div>

          {/* Body */}
          <div className="px-4 py-6 sm:px-7 sm:py-7">
            {activeTab === "calculator" && (
              <>
                <h2 className="text-[17px] font-bold text-slate-900">Calculator</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">Enter a power value and its unit to see all conversions</p>

                <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={unitId} className="mb-1.5 block text-[13px] font-medium text-slate-700">
                      Input Unit: <span className="text-red-500">*</span>
                    </label>
                    <select
                      id={unitId}
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as PowerUnit)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
                    >
                      {units.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-slate-700">
                      Power Value: <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={inputId}
                      type="number"
                      step="any"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") calculate(inputValue, unit);
                      }}
                      placeholder={unit === "dBm" ? "e.g. 37 or -30" : "Enter a value"}
                      className={`w-full rounded-md border px-3 py-2 font-mono text-sm text-slate-900 outline-none transition ${
                        error
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border-slate-300 focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
                      }`}
                    />
                  </div>

                  <p className="text-[12px] leading-5 text-slate-500 sm:col-span-2">
                    {unit === "dBm" && "Negative values are allowed (e.g. -30 dBm = 1 µW)."}
                    {unit === "dBW" && "Negative values are allowed (e.g. -30 dBW = 1 mW)."}
                    {unit === "W" && "Watts must be greater than 0."}
                    {unit === "mW" && "Milliwatts must be greater than 0."}
                  </p>

                  {error && (
                    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 sm:col-span-2">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => calculate(inputValue, unit)}
                    className="rounded-md border border-[#255a9a] bg-[#2c6bb3] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#225692] focus:outline-none focus:ring-2 focus:ring-[#2c6bb3]/30"
                  >
                    Calculate
                  </button>
                </div>

                <hr className="my-6 border-slate-200" />

                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Result</h2>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-1">
                  {result ? (
                    <dl className="divide-y divide-slate-200">
                      {outputRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                          <dt className="text-sm font-semibold text-slate-700">{row.label}</dt>
                          <dd className="text-right font-mono text-sm font-medium text-slate-900">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="py-3 font-mono text-lg text-slate-700">&ndash;</p>
                  )}
                </div>
              </>
            )}

            {activeTab === "batch" && <BatchImport />}

            {activeTab === "formulas" && (
              <>
                <h2 className="text-[17px] font-bold text-slate-900">Formulas &amp; Theory</h2>
                <p className="mt-0.5 text-[13px] text-slate-500">Watts is used as the internal base unit for every conversion</p>

                <hr className="my-6 border-slate-200" />

                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Conversion Formulas</h2>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
                  <ul className="space-y-1.5 font-mono text-[13px] leading-6 text-slate-800">
                    <li>mW = Watts &times; 1000</li>
                    <li>Watts = mW / 1000</li>
                    <li>dBm = 10 &times; log10(Watts &times; 1000)</li>
                    <li>
                      Watts = 10<sup>((dBm &minus; 30) / 10)</sup>
                    </li>
                    <li>dBW = 10 &times; log10(Watts)</li>
                    <li>
                      Watts = 10<sup>(dBW / 10)</sup>
                    </li>
                    <li>dBW = dBm &minus; 30</li>
                  </ul>
                </div>

                <h2 className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">Rules of Thumb</h2>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
                  <div className="space-y-2 text-[13px] leading-6 text-slate-700">
                    <p>
                      <strong>+3 dB</strong> approximately doubles power; &minus;3 dB halves it.
                    </p>
                    <p>
                      <strong>+10 dB</strong> multiplies power by 10; &minus;10 dB divides by 10.
                    </p>
                    <p>
                      <strong>Negative dBm</strong> values are normal for power below 1 mW (e.g. &minus;30 dBm = 1 &micro;W).
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
