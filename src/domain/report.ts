import { CaseSnapshot, ReceiptDTO } from "./types";
import { chooseNextCheck } from "./next-check";
import { compareRepair } from "./compare-repair";
export function buildReceipt(s: CaseSnapshot, generatedAt: string): ReceiptDTO {
  return {
    caseId: s.id,
    sourceMode: s.sourceMode,
    revision: s.revision,
    generatedAt,
    repairAt: s.repairAt,
    observations: s.observations.map((w) => ({
      ...w,
      label: w.id,
      context: { ...w.context, recordedBy: "Redacted" },
      healthEvidence: w.healthEvidence
        ? {
            ...w.healthEvidence,
            reportedBy: "Redacted",
            basis:
              "Attributed meter-health report covers this observation; free text redacted.",
          }
        : null,
    })),
    policy: chooseNextCheck(s),
    comparison: compareRepair(s),
    limitations: [
      "Synthetic readings are demonstrations, not measured facility savings.",
      "Sparse endpoints establish interval consumption, not continuous flow.",
      "Observed-window ranges are not statistical confidence intervals.",
      "Lower sampled use does not prove repair causality or that every leak is fixed.",
      "Private facility names and free-text notes are excluded.",
    ],
  };
}
export function escapeHtml(s: unknown) {
  return String(s ?? "—").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function receiptHtml(r: ReceiptDTO, hash: string, superseded: boolean) {
  const e = escapeHtml;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FlowProof evidence receipt</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:40px auto;padding:24px;color:#172b35}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:10px;border-bottom:1px solid #ccc;overflow-wrap:anywhere}code{overflow-wrap:anywhere}h1{font-size:32px}.banner{padding:14px;background:#e3f1f4}@media print{body{margin:0}}</style><div class="banner">${e(r.sourceMode)} evidence · ${superseded ? "Superseded — newer evidence exists" : "Immutable snapshot"}</div><h1>FlowProof · Evidence receipt</h1><p>Case ${e(r.caseId)} · revision ${r.revision} · ${e(r.generatedAt)}</p><h2>${e(r.comparison.outcome.replaceAll("_", " "))}</h2><p>${e(r.policy.nextAction.reason)}</p><p>Observed change: ${e(r.comparison.rateChangeLpm)} L/min. Observed-window range: ${e(r.comparison.observedRangeLowLpm)} to ${e(r.comparison.observedRangeHighLpm)} L/min.</p><p>Actual intervention: ${e(r.repairAt)}</p><table><thead><tr><th>Observation</th><th>Start / end time (explicit offset)</th><th>Raw totals / unit</th><th>Phase</th></tr></thead><tbody>${r.observations.map((w) => `<tr><td>${e(w.id)}</td><td>${e(w.start?.timestamp)}<br>${e(w.end?.timestamp)}</td><td>${e(w.start?.sourceTotal)} ${e(w.start?.unit)} → ${e(w.end?.sourceTotal)} ${e(w.end?.unit)}</td><td>${e(w.phase)}</td></tr>`).join("")}</tbody></table><h2>Method</h2><p>Volume = end − start. Rate = volume / elapsed minutes. Each endpoint contributes one display increment to the allowance. Change = median(pre) − median(post). Range = min(pre low) − max(post high) to max(pre high) − min(post low).</p><h2>Selection and recorded context</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${e(JSON.stringify({ selectedPre: r.comparison.selectedPre, selectedPost: r.comparison.selectedPost, excluded: r.comparison.excluded, context: r.observations.map((w) => ({ id: w.id, resolutionMl: w.resolutionMl, context: w.context, healthEvidence: w.healthEvidence })) }, null, 2))}</pre><h2>Limitations</h2><ul>${r.limitations.map((l) => `<li>${e(l)}</li>`).join("")}</ul><p>Policy: next-check-v1 · comparison-v1</p><p>Content SHA-256: <code>${e(hash)}</code></p></html>`;
}
