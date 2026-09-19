import {
  CaseSnapshot,
  Context,
  ObservationInput,
  WorkspaceState,
} from "../domain/types";
export const context = (day = 10): Context => ({
  declaredNoUse: "yes",
  scheduledUse: "none",
  automaticUse: "none",
  supplyStatus: "available",
  storageStatus: "stable",
  meterHealth: "supported",
  healthEvidenceId: "health-demo",
  regimeId: "hostel-term-time",
  recordedBy: "Sample caretaker",
  recordedAt: `2026-09-${String(day).padStart(2, "0")}T04:05:00+05:30`,
});
export function observation(
  day: number,
  start: number,
  volume: number,
  phase: ObservationInput["phase"],
): ObservationInput {
  return {
    id: `observation-${String(day).padStart(2, "0")}`,
    label: `${String(day).padStart(2, "0")} Sep · 02:00–04:00`,
    phase,
    start: {
      id: `reading-${String(day).padStart(2, "0")}-start`,
      meterId: "hostel-a",
      timestamp: `2026-09-${String(day).padStart(2, "0")}T02:00:00+05:30`,
      totalMl: String(start * 1000),
      unit: "L",
      sourceTotal: String(start),
      quality: "valid",
      epochId: "original",
    },
    end: {
      id: `reading-${String(day).padStart(2, "0")}-end`,
      meterId: "hostel-a",
      timestamp: `2026-09-${String(day).padStart(2, "0")}T04:00:00+05:30`,
      totalMl: String((start + volume) * 1000),
      unit: "L",
      sourceTotal: String(start + volume),
      quality: "valid",
      epochId: "original",
    },
    resolutionMl: "1000",
    timezone: "Asia/Kolkata",
    context: context(day),
    healthEvidence: {
      id: "health-demo",
      basis:
        "Synthetic authorized meter-health report: response observed during ordinary use; covers all replay observations.",
      reportedBy: "Sample technician",
      from: "2026-09-01T00:00:00+05:30",
      to: "2026-09-30T23:59:59+05:30",
    },
    dataWarnings: [],
  };
}
export function initialCase(): CaseSnapshot {
  const w = observation(9, 99000, 216, "exploratory");
  w.context.scheduledUse = "unknown";
  return {
    id: "hostel-a",
    name: "Hostel A",
    meterId: "hostel-a",
    sourceMode: "synthetic",
    revision: 1,
    workflow: "investigating",
    safeQuietWindow: true,
    repairAt: null,
    observations: [w],
    events: [],
  };
}
export function referenceRepairCase(): CaseSnapshot {
  return {
    ...initialCase(),
    repairAt: "2026-09-13T12:00:00+05:30",
    workflow: "follow_up",
    observations: [
      observation(10, 100000, 216, "pre_repair"),
      observation(11, 101000, 204, "pre_repair"),
      observation(12, 102000, 228, "pre_repair"),
      observation(14, 104000, 12, "post_repair"),
      observation(15, 105000, 18, "post_repair"),
      observation(16, 106000, 6, "post_repair"),
    ],
    events: [
      {
        id: "repair-demo",
        type: "repair",
        at: "2026-09-13T12:00:00+05:30",
        recordedAt: "2026-09-13T12:15:00+05:30",
        reportedBy: "Sample technician",
        notes: "Synthetic replay: cistern inlet valve replaced.",
      },
    ],
  };
}
export function createState(mode: "synthetic" | "uploaded"): WorkspaceState {
  const main = initialCase();
  const missing = referenceRepairCase();
  missing.id = "missing-follow-up";
  missing.name = "Annex B";
  missing.meterId = "annex-b";
  for (const w of missing.observations) {
    w.id = "annex-" + w.id;
    for (const r of [w.start, w.end])
      if (r) {
        r.id = "annex-" + r.id;
        r.meterId = "annex-b";
      }
  }
  missing.observations[5].end = null;
  const meters =
    mode === "synthetic"
      ? [
          {
            id: "hostel-a",
            name: "Hostel A · main meter",
            timezone: "Asia/Kolkata",
            resolutionMl: "1000",
            epochId: "original",
            unit: "L" as const,
            healthEvidence: [main.observations[0].healthEvidence!],
          },
          {
            id: "annex-b",
            name: "Annex B · main meter",
            timezone: "Asia/Kolkata",
            resolutionMl: "1000",
            epochId: "original",
            unit: "L" as const,
            healthEvidence: [main.observations[0].healthEvidence!],
          },
        ]
      : [];
  return {
    mode,
    meters,
    readings:
      mode === "synthetic"
        ? [
            ...main.observations,
            ...referenceRepairCase().observations,
            ...missing.observations,
          ]
            .flatMap((w) => [w.start, w.end])
            .filter((r): r is NonNullable<typeof r> => r !== null)
        : [],
    cases: mode === "synthetic" ? [main, missing] : [],
    imports: [],
    reports: [],
    runs: [],
  };
}
