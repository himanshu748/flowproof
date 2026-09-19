import { CaseSnapshot, RepairComparison, ObservationInput } from "./types";
import {
  assessEligibility,
  measureWindow,
  healthSupported,
} from "./observations";
import { localParts } from "./units";
export function compareRepair(s: CaseSnapshot): RepairComparison {
  const r: RepairComparison = {
    outcome: "insufficient_evidence",
    methodVersion: "comparison-v1",
    selectedPre: [],
    selectedPost: [],
    excluded: [],
    reasons: [],
    rateChangeLpm: null,
    observedRangeLowLpm: null,
    observedRangeHighLpm: null,
    preMedianLpm: null,
    postMedianLpm: null,
    preVolumeL: null,
    postVolumeL: null,
    preMinutes: null,
    postMinutes: null,
  };
  if (!s.repairAt) {
    r.reasons = ["No repair has been reported."];
    return r;
  }
  const repair = Date.parse(s.repairAt),
    fortnight = 14 * 86400000;
  const pre: ObservationInput[] = [],
    post: ObservationInput[] = [];
  for (const w of s.observations) {
    const reasons = assessEligibility(w).reasons;
    const a = Date.parse(w.start?.timestamp || ""),
      b = Date.parse(w.end?.timestamp || "");
    if (w.phase === "exploratory")
      reasons.push("Exploratory interval is excluded");
    else if (
      w.phase === "pre_repair" &&
      !(b < repair && b >= repair - fortnight)
    )
      reasons.push("Pre observation must end within 14 days before repair");
    else if (
      w.phase === "post_repair" &&
      !(a > repair && a <= repair + fortnight)
    )
      reasons.push("Post observation must start within 14 days after repair");
    if (reasons.length) r.excluded.push({ id: w.id, reasons });
    else (w.phase === "pre_repair" ? pre : post).push(w);
  }
  pre.sort(
    (a, b) =>
      Date.parse(b.end!.timestamp) - Date.parse(a.end!.timestamp) ||
      a.id.localeCompare(b.id),
  );
  post.sort(
    (a, b) =>
      Date.parse(a.start!.timestamp) - Date.parse(b.start!.timestamp) ||
      a.id.localeCompare(b.id),
  );
  const p = pre.slice(0, 3),
    q = post.slice(0, 3);
  r.selectedPre = p.map((w) => w.id);
  r.selectedPost = q.map((w) => w.id);
  for (const w of [...pre.slice(3), ...post.slice(3)])
    r.excluded.push({
      id: w.id,
      reasons: ["Outside deterministic first/most-recent three selection"],
    });
  const unresolved = s.observations
    .filter((w) => w.phase !== "exploratory")
    .filter(
      (w) =>
        measureWindow(w).reasons.length > 0 ||
        !healthSupported(w) ||
        Object.values(w.context).includes("unknown"),
    );
  if (unresolved.length) {
    r.reasons = [
      "Resolve missing, invalid, or unsupported evidence before making a repair claim.",
      ...unresolved.flatMap((w) => assessEligibility(w).reasons),
    ];
    return r;
  }
  const changed = s.observations
    .filter((w) => w.phase !== "exploratory")
    .some(
      (w) =>
        w.context.supplyStatus === "interrupted" ||
        w.context.storageStatus === "changing",
    );
  if (changed) {
    r.outcome = "not_comparable";
    r.reasons = [
      "Supply or storage conditions changed. These observations are not comparable.",
    ];
    return r;
  }
  if (p.length < 3 || q.length < 3) {
    r.reasons = [
      `Need three eligible observations per group (${p.length} pre, ${q.length} post).`,
      ...r.excluded.flatMap((x) => x.reasons),
    ].filter((x, i, a) => a.indexOf(x) === i);
    return r;
  }
  const all = [...p, ...q],
    reasons: string[] = [];
  for (const group of [p, q])
    if (
      new Set(group.map((w) => localParts(w.start!.timestamp, w.timezone).date))
        .size < 3
    )
      reasons.push("Each group needs three distinct local dates");
  for (const getter of [
    (w: ObservationInput) => w.start!.meterId,
    (w: ObservationInput) => w.start!.epochId,
    (w: ObservationInput) => w.resolutionMl,
    (w: ObservationInput) => w.context.regimeId,
    (w: ObservationInput) => w.context.storageStatus,
    (w: ObservationInput) => w.timezone,
  ])
    if (new Set(all.map(getter)).size !== 1)
      reasons.push(
        "Meter, epoch, resolution, regime, storage, or timezone changed",
      );
  const ms = all.map(measureWindow),
    durations = ms.map((x) => x.durationMinutes!);
  if (Math.max(...durations) > Math.min(...durations) * 1.1)
    reasons.push("Observation durations differ by more than 10%");
  const minutes = all
    .map((w) => localParts(w.start!.timestamp, w.timezone).minute)
    .sort((a, b) => a - b);
  const gaps = minutes.map(
    (v, i) =>
      (i === minutes.length - 1 ? minutes[0] + 1440 : minutes[i + 1]) - v,
  );
  if (1440 - Math.max(...gaps) > 30)
    reasons.push("Local start times differ by more than 30 minutes");
  const ordered = [...all].sort(
    (a, b) => Date.parse(a.start!.timestamp) - Date.parse(b.start!.timestamp),
  );
  for (let i = 1; i < ordered.length; i++)
    if (
      Date.parse(ordered[i].start!.timestamp) <
      Date.parse(ordered[i - 1].end!.timestamp)
    )
      reasons.push("Selected observations overlap");
  if (reasons.length) {
    r.outcome = "not_comparable";
    r.reasons = [...new Set(reasons)];
    return r;
  }
  const pm = ms.slice(0, 3),
    qm = ms.slice(3);
  const median = (v: number[]) => v.sort((a, b) => a - b)[1];
  r.preMedianLpm = median(pm.map((x) => x.rateLpm!));
  r.postMedianLpm = median(qm.map((x) => x.rateLpm!));
  r.rateChangeLpm = r.preMedianLpm - r.postMedianLpm;
  r.observedRangeLowLpm =
    Math.min(...pm.map((x) => x.rateLow!)) -
    Math.max(...qm.map((x) => x.rateHigh!));
  r.observedRangeHighLpm =
    Math.max(...pm.map((x) => x.rateHigh!)) -
    Math.min(...qm.map((x) => x.rateLow!));
  r.preVolumeL = pm.reduce((n, x) => n + x.volumeL!, 0);
  r.postVolumeL = qm.reduce((n, x) => n + x.volumeL!, 0);
  r.preMinutes = pm.reduce((n, x) => n + x.durationMinutes!, 0);
  r.postMinutes = qm.reduce((n, x) => n + x.durationMinutes!, 0);
  r.outcome =
    r.observedRangeLowLpm > 0 ? "observed_reduction" : "no_clear_reduction";
  return r;
}
