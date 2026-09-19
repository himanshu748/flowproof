import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import expected from "../tests/fixtures/expected-outcomes.json";
import { referenceRepairCase } from "../src/demo/scenarios";
import { compareRepair } from "../src/domain/compare-repair";
import { chooseNextCheck } from "../src/domain/next-check";
import { assessEligibility, measureWindow } from "../src/domain/observations";
function generate(seed: number) {
  const s = referenceRepairCase();
  const scale = 1 + (seed % 5) / 10;
  for (const w of s.observations) {
    const diff = BigInt(w.end!.totalMl!) - BigInt(w.start!.totalMl!);
    w.end!.totalMl = (
      BigInt(w.start!.totalMl!) + BigInt(Math.round(Number(diff) * scale))
    ).toString();
    w.end!.sourceTotal = String(Number(w.end!.totalMl) / 1000);
    w.resolutionMl = String(1000 + (seed % 3) * 500);
  }
  switch (seed % 8) {
    case 1:
      s.observations[5].end = null;
      break;
    case 2:
      s.observations[5].context.supplyStatus = "interrupted";
      break;
    case 3:
      s.observations[5].context.meterHealth = "suspect";
      s.observations[5].end!.totalMl = s.observations[5].start!.totalMl;
      break;
    case 4:
      for (let i = 3; i < 6; i++)
        s.observations[i].end!.totalMl = (
          BigInt(s.observations[i].start!.totalMl!) +
          (BigInt(s.observations[i - 3].end!.totalMl!) -
            BigInt(s.observations[i - 3].start!.totalMl!))
        ).toString();
      break;
    case 5:
      s.observations[5].end!.totalMl = "1000";
      break;
    case 6:
      s.observations[5].context.automaticUse = "unknown";
      break;
    case 7:
      s.observations = s.observations.filter((_, i) => i === 0 || i === 3);
      break;
  }
  return s;
}
const results = [
  ...expected.developmentSeeds.map((seed) => ({ seed, split: "development" })),
  ...expected.evaluationSeeds.map((seed) => ({ seed, split: "evaluation" })),
].map(({ seed, split }) => {
  const s = generate(seed),
    r = compareRepair(s),
    p = chooseNextCheck(s),
    key = String(seed % 8) as keyof typeof expected.outcomes;
  const pre = s.observations
    .filter((w) => w.phase === "pre_repair")
    .map(measureWindow)
    .map((m) => m.rateLpm ?? 0);
  const post = s.observations
    .filter((w) => w.phase === "post_repair")
    .map(measureWindow)
    .map((m) => m.rateLpm ?? 0);
  const naive =
    pre.reduce((a, b) => a + b, 0) / pre.length >
    post.reduce((a, b) => a + b, 0) / post.length;
  return {
    seed,
    split,
    expected: expected.outcomes[key],
    actual: r.outcome,
    expectedRule: expected.rules[key],
    actualRule: p.nextAction.ruleId,
    passed:
      r.outcome === expected.outcomes[key] &&
      p.nextAction.ruleId === expected.rules[key],
    unsupportedPositive:
      r.outcome === "observed_reduction" &&
      expected.outcomes[key] !== "observed_reduction",
    naiveUnsupportedPositive:
      naive && expected.outcomes[key] !== "observed_reduction",
    deterministic:
      JSON.stringify(r) === JSON.stringify(compareRepair(structuredClone(s))),
    invalidSelected: s.observations
      .filter((w) => [...r.selectedPre, ...r.selectedPost].includes(w.id))
      .some((w) => !assessEligibility(w).eligible),
  };
});
const summary = {
  generatedAt: new Date().toISOString(),
  datasetHash: createHash("sha256")
    .update(JSON.stringify(expected))
    .digest("hex"),
  cases: results.length,
  passed: results.filter((r) => r.passed).length,
  unsupportedPositive: results.filter((r) => r.unsupportedPositive).length,
  naiveUnsupportedPositive: results.filter((r) => r.naiveUnsupportedPositive)
    .length,
  invalidWindowAcceptance: results.filter((r) => r.invalidSelected).length,
  deterministicReplay: results.filter((r) => r.deterministic).length,
};
writeFileSync(
  "docs/evaluation-results.json",
  JSON.stringify({ summary, results }, null, 2) + "\n",
);
writeFileSync(
  "docs/EVALUATION.md",
  `# Synthetic policy evaluation\n\nRun: ${summary.generatedAt}\n\n${summary.passed}/${summary.cases} outcome and next-action assertions passed. Unsupported positive comparisons: ${summary.unsupportedPositive}. Invalid selected windows: ${summary.invalidWindowAcceptance}. Deterministic replays: ${summary.deterministicReplay}/${summary.cases}.\n\nNaive lower-average baseline produced ${summary.naiveUnsupportedPositive} unsupported positive results. This is a confounder suite, not a real-world accuracy benchmark or comparison with commercial tools.\n\nSeeds were fixed before executing this evaluator; development and evaluation sets are separate. Both sets are generated from the same documented scenario families; they are not independent field validation.\n\nDataset configuration SHA-256: ${summary.datasetHash}\n\n| Split | Seed | Expected | Actual | Expected rule | Actual rule | Pass |\n|---|---:|---|---|---|---|---|\n${results.map((r) => `| ${r.split} | ${r.seed} | ${r.expected} | ${r.actual} | ${r.expectedRule} | ${r.actualRule} | ${r.passed} |`).join("\n")}\n`,
);
console.log(summary);
if (
  results.some(
    (r) =>
      !r.passed ||
      r.unsupportedPositive ||
      r.invalidSelected ||
      !r.deterministic,
  )
)
  process.exitCode = 1;
