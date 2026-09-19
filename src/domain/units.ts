export const MAX_ML = 1000000000000000n;
export function parseTotalMl(total: string, unit: string): bigint {
  if (unit !== "L" && unit !== "m3")
    throw new Error("Use a cumulative total in L or m3, not a flow rate.");
  const precision = unit === "L" ? 3 : 6;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`).test(total))
    throw new Error(
      `Enter a non-negative decimal with at most ${precision} fractional digits.`,
    );
  const [whole, fraction = ""] = total.split(".");
  const value =
    BigInt(whole) * 10n ** BigInt(precision) +
    BigInt(fraction.padEnd(precision, "0"));
  if (value > MAX_ML)
    throw new Error(
      "Total exceeds the supported 1,000,000,000,000,000 mL limit.",
    );
  return value;
}
export function parseTimestamp(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(
      "Use an ISO timestamp with seconds and an explicit UTC offset.",
    );
  const date = value.slice(0, 10);
  const [y, m, d] = date.split("-").map(Number);
  if (new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== date)
    throw new Error("That calendar date does not exist.");
  return new Date(value).toISOString();
}
export function localParts(timestamp: string, timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const v = (key: string) => p.find((x) => x.type === key)!.value;
  return {
    date: `${v("year")}-${v("month")}-${v("day")}`,
    minute: Number(v("hour")) * 60 + Number(v("minute")),
  };
}
