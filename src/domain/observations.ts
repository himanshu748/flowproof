import {
  ObservationInput,
  WindowMeasurement,
  EligibilityResult,
} from "./types";
import { MAX_ML, parseTimestamp } from "./units";
export function measureWindow(w: ObservationInput): WindowMeasurement {
  const reasons = [...w.dataWarnings];
  const evidenceIds = [w.start?.id, w.end?.id].filter((s): s is string => !!s);
  let durationMinutes: number | null = null;
  let volumeL: number | null = null;
  if (!w.start || !w.end || w.start.totalMl === null || w.end.totalMl === null)
    reasons.push("Missing endpoint reading");
  if (w.start && w.end) {
    if (w.start.quality === "invalid" || w.end.quality === "invalid")
      reasons.push("Endpoint quality is not valid");
    if (w.start.epochId !== w.end.epochId || w.start.meterId !== w.end.meterId)
      reasons.push("Meter or epoch boundary");
    try {
      durationMinutes =
        (Date.parse(parseTimestamp(w.end.timestamp)) -
          Date.parse(parseTimestamp(w.start.timestamp))) /
        60000;
      if (durationMinutes <= 0) reasons.push("End must be after start");
    } catch {
      reasons.push("Invalid timestamp");
    }
    if (w.start.totalMl !== null && w.end.totalMl !== null) {
      try {
        const a = BigInt(w.start.totalMl),
          b = BigInt(w.end.totalMl);
        if (a < 0n || b < 0n || a > MAX_ML || b > MAX_ML)
          reasons.push("Unsupported total");
        if (b < a)
          reasons.push("Cumulative total decreased: review reset or data");
        else volumeL = Number(b - a) / 1000;
      } catch {
        reasons.push("Invalid millilitre value");
      }
    }
  }
  let q = 0;
  try {
    const n = BigInt(w.resolutionMl);
    if (n <= 0n || n > MAX_ML) throw new Error();
    q = Number(n) / 1000;
  } catch {
    reasons.push("Invalid display resolution");
  }
  if (reasons.length || durationMinutes === null || volumeL === null)
    return {
      volumeL: null,
      durationMinutes,
      rateLpm: null,
      rateLow: null,
      rateHigh: null,
      reasons,
      evidenceIds,
    };
  return {
    volumeL,
    durationMinutes,
    rateLpm: volumeL / durationMinutes,
    rateLow: Math.max(0, volumeL - 2 * q) / durationMinutes,
    rateHigh: (volumeL + 2 * q) / durationMinutes,
    reasons,
    evidenceIds,
  };
}
export function healthSupported(w: ObservationInput) {
  const h = w.healthEvidence;
  return (
    w.context.meterHealth === "supported" &&
    !!h &&
    h.id === w.context.healthEvidenceId &&
    !!h.basis.trim() &&
    !!h.reportedBy.trim() &&
    !!w.start &&
    !!w.end &&
    Date.parse(h.from) <= Date.parse(w.start.timestamp) &&
    Date.parse(h.to) >= Date.parse(w.end.timestamp)
  );
}
export function assessEligibility(w: ObservationInput): EligibilityResult {
  const m = measureWindow(w),
    c = w.context;
  const reasons = [...m.reasons];
  if (
    m.durationMinutes !== null &&
    (m.durationMinutes < 120 || m.durationMinutes > 240)
  )
    reasons.push("Observation must be 120–240 minutes");
  if (!healthSupported(w))
    reasons.push("Meter-health evidence is missing or suspect");
  if (c.declaredNoUse !== "yes")
    reasons.push("No-use context is not confirmed");
  if (c.scheduledUse !== "none")
    reasons.push("Scheduled use is present or unknown");
  if (c.automaticUse !== "none")
    reasons.push("Automatic use is present or unknown");
  if (c.supplyStatus !== "available")
    reasons.push("Supply is interrupted or unknown");
  if (!["stable", "not_applicable"].includes(c.storageStatus))
    reasons.push("Storage is changing or unknown");
  if (!c.regimeId.trim() || !c.recordedBy.trim())
    reasons.push("Operating regime or attribution missing");
  return { eligible: reasons.length === 0, reasons };
}
