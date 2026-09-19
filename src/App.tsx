import { useEffect, useId, useState } from "react";

type PowerUnit = "W" | "mW" | "dBm" | "dBW";
type ActiveTab = "calculator" | "formulas";

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

  const labelCell = "w-1/3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700";
  const valueCell = "border-t border-slate-200 px-3 py-2 text-right font-mono text-sm text-slate-900";

  return (
    <div className="min-h-screen bg-[#eceff2] font-sans antialiased">
      <div className="mx-auto flex max-w-3xl flex-col pt-8 pb-12 sm:pt-12">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* Navy header */}
          <div className="bg-[#0f2744] px-5 py-5 sm:px-7">
            <h1 className="text-xl font-bold text-white sm:text-[1.4rem]">RF Power Calculator</h1>
            <p className="mt-0.5 text-[13px] text-slate-300">
              Convert RF power between Watts (W), milliwatts (mW), dBm, and dBW.
            </p>

            {/* Tabs */}
            <nav className="-mb-6 -ml-2 -mr-5 mt-4 flex flex-wrap gap-1 sm:-mr-7 sm:-ml-3">
              <button
                type="button"
                onClick={() => setActiveTab("calculator")}
                className={
                  activeTab === "calculator"
                    ? "rounded-t bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
                    : "px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
                }
              >
                Calculator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("formulas")}
                className={
                  activeTab === "formulas"
                    ? "rounded-t bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
                    : "px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white"
                }
              >
                Formulas &amp; Theory
              </button>
            </nav>
          </div>

          {/* Body */}
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            {activeTab === "calculator" && (
              <>
                {/* Input block */}
                <div className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Input</h2>
                  </div>
                  <div className="space-y-5 p-4 sm:p-5">
                    <div>
                      <label htmlFor={unitId} className="mb-1.5 block text-sm font-medium text-slate-700">
                        Input Unit:
                      </label>
                      <select
                        id={unitId}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as PowerUnit)}
                        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
                      >
                        {units.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
                        Power Value:
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
                        className={`w-full rounded-sm border px-3 py-1.5 font-mono text-sm text-slate-900 outline-none transition ${
                          error
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-300 focus:border-[#2c6bb3] focus:ring-2 focus:ring-[#2c6bb3]/20"
                        }`}
                      />
                    </div>

                    <p className="text-[12px] text-slate-500">
                      {unit === "dBm" && "Negative values are allowed (e.g. -30 dBm = 1 µW)."}
                      {unit === "dBW" && "Negative values are allowed (e.g. -30 dBW = 1 mW)."}
                      {unit === "W" && "Watts must be greater than 0."}
                      {unit === "mW" && "Milliwatts must be greater than 0."}
                    </p>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={handleClear}
                        className="rounded-sm border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => calculate(inputValue, unit)}
                        className="rounded-sm border border-[#255a9a] bg-[#2c6bb3] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#225692] focus:outline-none focus:ring-2 focus:ring-[#2c6bb3]/30"
                      >
                        Calculate
                      </button>
                    </div>

                    {error && (
                      <div role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Output block */}
                <div className="mt-6 rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Output</h2>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {outputRows.map((row) => (
                        <tr key={row.label}>
                          <td className={labelCell}>{row.label}</td>
                          <td className={valueCell}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "formulas" && (
              <div className="space-y-5">
                <div className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Formulas</h2>
                  </div>
                  <div className="space-y-4 p-4 text-sm sm:p-5">
                    <p className="text-slate-600">Watts is used as the internal base unit for all conversions.</p>
                    <ul className="space-y-1.5 font-mono text-[13px] text-slate-800">
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
                </div>

                <div className="rounded-md border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-2.5">
                    <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Rules of Thumb</h2>
                  </div>
                  <div className="space-y-2 p-4 text-sm text-slate-700 sm:p-5">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
