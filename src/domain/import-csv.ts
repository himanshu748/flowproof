import { Reading, Meter } from "./types";
import { parseTimestamp, parseTotalMl } from "./units";
export function parseCsv(text: string, meters: Meter[]) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("CSV must be at most 2 MiB.");
  const records: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length)
        throw new Error("Malformed CSV quoting");
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x !== "")) records.push(row);
      row = [];
      cell = "";
    } else cell += ch;
    if (cell.length > 500)
      throw new Error("CSV cells must be at most 500 characters.");
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  row.push(cell);
  if (row.some((x) => x !== "")) records.push(row);
  if (records.length > 5001) throw new Error("Import at most 5,000 rows.");
  const header = records.shift();
  if (
    header?.join(",").replace(/^\uFEFF/, "") !==
    "meter_id,timestamp,total,unit,quality"
  )
    throw new Error("Use columns: meter_id,timestamp,total,unit,quality");
  const rows: Reading[] = [],
    errors: { row: number; message: string }[] = [],
    warnings: string[] = [];
  let duplicates = 0;
  const seen = new Map<string, Reading>();
  for (const [i, r] of records.entries()) {
    try {
      if (r.length !== 5) throw new Error("Expected five cells");
      const [meterId, timestamp, total, unit, quality] = r;
      const meter = meters.find((m) => m.id === meterId);
      if (!meter) throw new Error("Create or select the matching meter first.");
      if (!["valid", "missing", "invalid"].includes(quality))
        throw new Error("Quality must be valid, missing, or invalid");
      if (!["L", "m3"].includes(unit))
        throw new Error("Use cumulative totals in L or m3");
      if (quality === "missing" && total !== "")
        throw new Error("Missing readings require an empty total");
      const value: Reading = {
        id: `csv-${i + 2}`,
        meterId,
        timestamp: parseTimestamp(timestamp),
        totalMl:
          quality === "missing" ? null : parseTotalMl(total, unit).toString(),
        unit: unit as "L" | "m3",
        sourceTotal: total,
        quality: quality as Reading["quality"],
        epochId: meter.epochId,
      };
      const key = meterId + value.timestamp,
        previous = seen.get(key);
      if (previous) {
        if (
          previous.totalMl !== value.totalMl ||
          previous.quality !== value.quality
        )
          throw new Error("Conflicting totals at the same meter/timestamp");
        duplicates++;
        continue;
      }
      seen.set(key, value);
      rows.push(value);
    } catch (e) {
      errors.push({ row: i + 2, message: (e as Error).message });
    }
  }
  if (new Set(rows.map((r) => r.meterId)).size > 5)
    throw new Error("Import at most five meters");
  const times = rows.map((r) => Date.parse(r.timestamp));
  const spanDays = times.length
    ? (Math.max(...times) - Math.min(...times)) / 86400000
    : 0;
  if (spanDays > 90) throw new Error("Import at most 90 days of readings");
  for (const meter of meters) {
    const sorted = rows
      .filter(
        (r) =>
          r.meterId === meter.id && r.totalMl !== null && r.quality === "valid",
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (let i = 1; i < sorted.length; i++)
      if (BigInt(sorted[i].totalMl!) < BigInt(sorted[i - 1].totalMl!))
        warnings.push(
          `Counter decrease at ${sorted[i].timestamp}; affected windows require reset/data review.`,
        );
  }
  return { rows, errors, duplicates, warnings, spanDays };
}
