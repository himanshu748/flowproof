import { CaseSnapshot, Outcome, PolicyDecision } from "./types";
import {
  measureWindow,
  healthSupported,
  assessEligibility,
} from "./observations";
import { compareRepair } from "./compare-repair";
export function chooseNextCheck(s: CaseSnapshot): PolicyDecision {
  const ws = s.observations
    .filter((w) => !s.repairAt || w.phase !== "exploratory")
    .sort(
      (a, b) =>
        (a.start?.timestamp || "").localeCompare(b.start?.timestamp || "") ||
        a.id.localeCompare(b.id),
    );
  const ids = ws
    .flatMap((w) => [w.id, w.start?.id, w.end?.id, w.context.healthEvidenceId])
    .filter((x): x is string => !!x);
  const decision = (
    ruleId: string,
    type: string,
    title: string,
    reason: string,
    outcome: Outcome,
    requiredFields: string[] = [],
  ): PolicyDecision => ({
    caseId: s.id,
    caseRevision: s.revision,
    engineVersion: "next-check-v1",
    outcome,
    nextAction: {
      type,
      title,
      ruleId,
      reason,
      requiredFields,
      evidenceIds: ids,
    },
    blockingReasons: ["R07", "R08", "R10"].includes(ruleId) ? [] : [reason],
    evidenceIds: ids,
  });
  if (
    ws.some((w) => measureWindow(w).reasons.some((r) => !r.includes("Missing")))
  )
    return decision(
      "R01",
      "review_meter_data",
      "Review the meter readings",
      "A reset, epoch boundary, or invalid reading blocks this observation.",
      "insufficient_evidence",
    );
  if (
    !ws.length ||
    ws.some(
      (w) =>
        !w.start ||
        !w.end ||
        w.start.totalMl === null ||
        w.end.totalMl === null,
    )
  )
    return decision(
      "R02",
      "supply_missing_reading",
      "Complete the missing reading",
      "The follow-up is incomplete. Add its end reading before comparing.",
      "insufficient_evidence",
      ["end reading"],
    );
  if (ws.some((w) => !healthSupported(w)))
    return decision(
      "R03",
      "check_meter_health",
      "Check the meter’s response",
      "We cannot distinguish low use from a meter problem yet. Record attributed health evidence covering the observation.",
      "insufficient_evidence",
      ["meter health evidence"],
    );
  if (
    s.repairAt &&
    ws.some(
      (w) =>
        w.context.supplyStatus === "interrupted" ||
        w.context.storageStatus === "changing",
    )
  )
    return decision(
      "R04",
      "confirm_operating_context",
      "Review changed supply conditions",
      "Supply or storage conditions changed. These observations are not comparable.",
      "not_comparable",
    );
  if (
    ws.some(
      (w) =>
        Object.values(w.context).includes("unknown") || !w.context.regimeId,
    )
  )
    return decision(
      "R05",
      "confirm_operating_context",
      "Confirm the cleaning schedule",
      "We know how much water moved. Confirm scheduled use and operating context before interpreting it.",
      "context_unresolved",
      ["operating context"],
    );
  if (s.repairAt) {
    const r = compareRepair(s);
    return decision(
      r.outcome === "insufficient_evidence" ? "R09" : "R10",
      r.outcome === "insufficient_evidence"
        ? "collect_comparison_evidence"
        : "review_comparison",
      r.outcome === "insufficient_evidence"
        ? "Collect follow-up evidence"
        : "Review the observed change",
      r.reasons.join(" ") ||
        "Compare the selected no-use periods and inspect the source readings.",
      r.outcome,
    );
  }
  const w = ws[ws.length - 1];
  if (!assessEligibility(w).eligible) {
    if (!s.safeQuietWindow)
      return decision(
        "R11",
        "request_inspection",
        "Request an authorized inspection",
        "There is no safe, naturally quiet interval. Keep essential water service available.",
        "context_unresolved",
      );
    return decision(
      "R06",
      "plan_no_use_observation",
      "Record a naturally quiet observation",
      "Cleaning or other use occurred here, or this interval is unsuitable. These readings establish consumption, not unexplained use.",
      "context_unresolved",
    );
  }
  const m = measureWindow(w);
  if (m.volumeL! > (2 * Number(w.resolutionMl)) / 1000)
    return decision(
      "R07",
      "request_inspection",
      "Request a maintenance inspection",
      "Water moved above the display allowance during a supported no-use check. An authorized person should inspect the cause.",
      "water_movement_observed",
    );
  return decision(
    "R08",
    "continue_monitoring",
    "Continue monitoring",
    "No movement above the meter’s display allowance was observed. This does not establish that the system is leak-free.",
    "no_movement_above_resolution",
  );
}
