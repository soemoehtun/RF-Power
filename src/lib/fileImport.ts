import * as XLSX from "xlsx";

export interface ParsedSheet {
  name: string;
  headers: string[];
  /** Each row is a map of header -> cell string value. */
  rows: Record<string, string>[];
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function sheetToParsed(name: string, sheet: XLSX.WorkSheet): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });

  if (!matrix.length) {
    return { name, headers: [], rows: [] };
  }

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((h, i) => {
    const label = cellToString(h).trim();
    return label || `Column ${i + 1}`;
  });

  // Ensure unique headers
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    const obj: Record<string, string> = {};
    let any = false;
    for (let c = 0; c < uniqueHeaders.length; c++) {
      const v = cellToString(line[c] ?? "").trim();
      obj[uniqueHeaders[c]] = v;
      if (v) any = true;
    }
    if (any) rows.push(obj);
  }

  return { name, headers: uniqueHeaders, rows };
}

export async function parseWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const sheets: ParsedSheet[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return sheetToParsed(name, sheet);
  }).filter((s) => s.headers.length > 0);

  if (!sheets.length) {
    throw new Error("No readable sheets or headers found in the file.");
  }

  return { fileName: file.name, sheets };
}

export function guessPowerColumn(headers: string[]): string {
  const patterns = [
    /^(rf[_\s-]?)?power$/i,
    /^power[_\s-]?(dbm|dbw|w|mw|value|level)?$/i,
    /^(tx|rx)[_\s-]?power$/i,
    /^p(out|in|wr)$/i,
    /^dbm$/i,
    /^dbw$/i,
    /^watts?$/i,
    /^milliwatts?$/i,
    /^mw$/i,
    /^value$/i,
  ];
  for (const re of patterns) {
    const hit = headers.find((h) => re.test(h.trim()));
    if (hit) return hit;
  }
  return headers[0] ?? "";
}

export function guessIdColumn(headers: string[], excludeColumn = ""): string {
  const patterns = [
    /^cell[_\s-]?name$/i,
    /^cell[_\s-]?id$/i,
    /^cell$/i,
    /^site[_\s-]?(name|id)$/i,
    /^site$/i,
    /^sector$/i,
    /^name$/i,
    /^id$/i,
  ];
  for (const re of patterns) {
    const hit = headers.find((h) => h !== excludeColumn && re.test(h.trim()));
    if (hit) return hit;
  }
  return headers.find((h) => h !== excludeColumn) ?? "";
}

export function guessUnitFromHeader(header: string): "W" | "mW" | "dBm" | "dBW" | null {
  const h = header.toLowerCase();
  if (/\bdbm\b/.test(h)) return "dBm";
  if (/\bdbw\b/.test(h)) return "dBW";
  if (/\bmw\b|milliwatt/.test(h)) return "mW";
  if (/\bwatt|\b\bw\b/.test(h)) return "W";
  return null;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map((c) => escape(c ?? "")).join(","));
  }
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
