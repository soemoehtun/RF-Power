// RF Power batch conversion engine compiled to WebAssembly.
// Build (requires Go toolchain):
//   GOOS=js GOARCH=wasm go build -o public/wasm/rfpower.wasm ./go
//   cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" public/wasm/wasm_exec.js
//
// Exposes window.rfConvertBatch(jsonRequest) -> jsonResponse
package main

import (
	"encoding/json"
	"fmt"
	"math"
	"syscall/js"
)

type batchRequest struct {
	Values    []string `json:"values"`
	FromUnit  string   `json:"fromUnit"`
	ToUnit    string   `json:"toUnit"`
}

type batchRow struct {
	Index  int     `json:"index"`
	Input  string  `json:"input"`
	Output string  `json:"output"`
	Watts  float64 `json:"watts"`
	Ok     bool    `json:"ok"`
	Error  string  `json:"error,omitempty"`
}

type batchResponse struct {
	Engine string     `json:"engine"`
	Rows   []batchRow `json:"rows"`
	Ok     int        `json:"ok"`
	Fail   int        `json:"fail"`
}

func formatLinear(v float64) string {
	if !isFinite(v) {
		return "0"
	}
	abs := math.Abs(v)
	if abs == 0 {
		return "0"
	}
	if abs < 1e-7 || abs >= 1e8 {
		return fmt.Sprintf("%.4e", v)
	}
	// Trim trailing zeros after up to 6 decimals.
	s := fmt.Sprintf("%.6f", v)
	// strip trailing 0s and optional decimal point
	i := len(s) - 1
	for i >= 0 && s[i] == '0' {
		i--
	}
	if i >= 0 && s[i] == '.' {
		i--
	}
	return s[:i+1]
}

func formatDb(v float64) string {
	if !isFinite(v) {
		return "0"
	}
	rounded := math.Round(v*1000) / 1000
	if rounded == math.Trunc(rounded) {
		return fmt.Sprintf("%.0f", rounded)
	}
	return fmt.Sprintf("%.3f", rounded)
}

func isFinite(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0)
}

func toWatts(value float64, unit string) (float64, error) {
	switch unit {
	case "W":
		if value <= 0 {
			return 0, fmt.Errorf("Power in Watts must be greater than 0.")
		}
		return value, nil
	case "mW":
		if value <= 0 {
			return 0, fmt.Errorf("Power in milliwatts must be greater than 0.")
		}
		return value / 1000, nil
	case "dBm":
		return math.Pow(10, (value-30)/10), nil
	case "dBW":
		return math.Pow(10, value/10), nil
	default:
		return 0, fmt.Errorf("Unsupported unit: %s", unit)
	}
}

func fromWatts(watts float64, unit string) (float64, error) {
	if !isFinite(watts) || watts <= 0 {
		return 0, fmt.Errorf("Invalid watts base value.")
	}
	switch unit {
	case "W":
		return watts, nil
	case "mW":
		return watts * 1000, nil
	case "dBm":
		return 10 * math.Log10(watts*1000), nil
	case "dBW":
		return 10 * math.Log10(watts), nil
	default:
		return 0, fmt.Errorf("Unsupported unit: %s", unit)
	}
}

func formatUnit(v float64, unit string) string {
	switch unit {
	case "dBm", "dBW":
		return formatDb(v)
	default:
		return formatLinear(v)
	}
}

func convertBatch(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return `{"engine":"go-wasm","rows":[],"ok":0,"fail":0,"error":"missing request"}`
	}

	var req batchRequest
	if err := json.Unmarshal([]byte(args[0].String()), &req); err != nil {
		return fmt.Sprintf(`{"engine":"go-wasm","rows":[],"ok":0,"fail":0,"error":%q}`, err.Error())
	}

	resp := batchResponse{
		Engine: "go-wasm",
		Rows:   make([]batchRow, 0, len(req.Values)),
	}

	for i, raw := range req.Values {
		row := batchRow{Index: i, Input: raw}
		trimmed := raw
		// trim spaces
		start, end := 0, len(trimmed)
		for start < end && (trimmed[start] == ' ' || trimmed[start] == '\t' || trimmed[start] == '\n' || trimmed[start] == '\r') {
			start++
		}
		for end > start && (trimmed[end-1] == ' ' || trimmed[end-1] == '\t' || trimmed[end-1] == '\n' || trimmed[end-1] == '\r') {
			end--
		}
		trimmed = trimmed[start:end]

		if trimmed == "" {
			row.Error = "Empty value"
			resp.Fail++
			resp.Rows = append(resp.Rows, row)
			continue
		}

		var num float64
		if _, err := fmt.Sscanf(trimmed, "%f", &num); err != nil {
			row.Error = "Invalid numeric value"
			resp.Fail++
			resp.Rows = append(resp.Rows, row)
			continue
		}
		if math.IsNaN(num) || math.IsInf(num, 0) {
			row.Error = "Invalid numeric value"
			resp.Fail++
			resp.Rows = append(resp.Rows, row)
			continue
		}

		watts, err := toWatts(num, req.FromUnit)
		if err != nil {
			row.Error = err.Error()
			resp.Fail++
			resp.Rows = append(resp.Rows, row)
			continue
		}

		out, err := fromWatts(watts, req.ToUnit)
		if err != nil {
			row.Error = err.Error()
			resp.Fail++
			resp.Rows = append(resp.Rows, row)
			continue
		}

		row.Ok = true
		row.Watts = watts
		row.Output = formatUnit(out, req.ToUnit)
		resp.Ok++
		resp.Rows = append(resp.Rows, row)
	}

	b, err := json.Marshal(resp)
	if err != nil {
		return `{"engine":"go-wasm","rows":[],"ok":0,"fail":0,"error":"marshal failed"}`
	}
	return string(b)
}

func main() {
	js.Global().Set("rfConvertBatch", js.FuncOf(convertBatch))
	js.Global().Set("rfPowerGoReady", js.ValueOf(true))
	// Keep the Go runtime alive.
	select {}
}
