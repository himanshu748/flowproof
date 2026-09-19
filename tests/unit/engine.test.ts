import { describe, it, expect } from "vitest";
import { parseTotalMl, parseTimestamp } from "../../src/domain/units";
import {
  measureWindow,
  assessEligibility,
} from "../../src/domain/observations";
import { compareRepair } from "../../src/domain/compare-repair";
import { chooseNextCheck } from "../../src/domain/next-check";
import { referenceRepairCase, initialCase } from "../../src/demo/scenarios";
describe("Exact measurements and claim boundaries", () => {
  it("parses decimal totals exactly", () => {
    expect(parseTotalMl("1", "m3")).toBe(1000000n);
    expect(parseTotalMl("1.001", "L")).toBe(1001n);
  });
  it("rejects unsupported numeric inputs", () => {
    for (const s of ["-1", "1e3", "NaN", "1.0001", "Infinity"])
      expect(() => parseTotalMl(s, "L")).toThrow();
    expect(() => parseTotalMl("1", "L/min")).toThrow();
    expect(() => parseTimestamp("2026-09-10T02:00:00")).toThrow();
  });
  it("normalizes offsets", () =>
    expect(parseTimestamp("2026-09-10T02:00:00+05:30")).toBe(
      parseTimestamp("2026-09-09T20:30:00Z"),
    ));
  it("measures sparse endpoints", () => {
    const w = referenceRepairCase().observations[0];
    expect(measureWindow(w).rateLpm).toBe(1.8);
    expect(assessEligibility(w).eligible).toBe(true);
  });
  it("reproduces the full reference fixture", () => {
    const r = compareRepair(referenceRepairCase());
    expect(r.outcome).toBe("observed_reduction");
    expect(r.rateChangeLpm).toBeCloseTo(1.7, 6);
    expect(r.observedRangeLowLpm).toBeCloseTo(1.516666667, 6);
    expect(r.observedRangeHighLpm).toBeCloseTo(1.883333333, 6);
    expect(r.preVolumeL).toBe(648);
    expect(r.postVolumeL).toBe(36);
  });
  it("missing follow-up is never zero", () => {
    const s = referenceRepairCase();
    s.observations[5].end = null;
    expect(compareRepair(s).rateChangeLpm).toBeNull();
    expect(chooseNextCheck(s).nextAction.ruleId).toBe("R02");
  });
  it("requires three distinct dates per group", () => {
    const s = referenceRepairCase();
    s.observations = s.observations.filter((_, i) => i === 0 || i === 3);
    expect(compareRepair(s).outcome).toBe("insufficient_evidence");
  });
  it("context changes the actual policy", () => {
    const s = initialCase();
    expect(chooseNextCheck(s).nextAction.ruleId).toBe("R05");
    s.observations[0].context.scheduledUse = "present";
    expect(chooseNextCheck(s).nextAction.ruleId).toBe("R06");
  });
  it("blocks suspect health, supply changes, resets", () => {
    for (const field of ["health", "supply", "reset"]) {
      const s = referenceRepairCase();
      if (field === "health") s.observations[5].context.meterHealth = "suspect";
      if (field === "supply")
        s.observations[5].context.supplyStatus = "interrupted";
      if (field === "reset") s.observations[5].end!.totalMl = "1";
      expect(compareRepair(s).rateChangeLpm).toBeNull();
    }
  });
  it("uses both endpoint allowances", () => {
    const s = initialCase();
    const w = s.observations[0];
    w.context.scheduledUse = "none";
    w.end!.totalMl = (BigInt(w.start!.totalMl!) + 2000n).toString();
    expect(chooseNextCheck(s).outcome).toBe("no_movement_above_resolution");
  });
  it("blocks incompatible timing, epochs, regime, and overlap", () => {
    for (const kind of ["timing", "epoch", "regime", "overlap"]) {
      const s = referenceRepairCase();
      const w = s.observations[5];
      if (kind === "timing") {
        w.start!.timestamp = "2026-09-16T07:00:00+05:30";
        w.end!.timestamp = "2026-09-16T09:00:00+05:30";
      }
      if (kind === "epoch") {
        w.start!.epochId = "replacement";
        w.end!.epochId = "replacement";
      }
      if (kind === "regime") w.context.regimeId = "different";
      if (kind === "overlap") {
        w.start!.timestamp = s.observations[4].start!.timestamp;
        w.end!.timestamp = s.observations[4].end!.timestamp;
      }
      expect(compareRepair(s).outcome).not.toBe("observed_reduction");
    }
  });
  it("does not change analytics when closed", () => {
    const s = referenceRepairCase();
    const before = compareRepair(s);
    s.workflow = "closed";
    expect(compareRepair(s)).toEqual(before);
  });
  it("requests inspection when a quiet check is unsafe", () => {
    const s = initialCase();
    s.observations[0].context.scheduledUse = "present";
    s.safeQuietWindow = false;
    expect(chooseNextCheck(s).nextAction.ruleId).toBe("R11");
  });
  it("does not publish a positive receipt while policy has unresolved extra evidence", () => {
    const s = referenceRepairCase();
    const extra = structuredClone(s.observations[5]);
    extra.id = "extra-missing";
    extra.end = null;
    s.observations.push(extra);
    expect(chooseNextCheck(s).outcome).toBe("insufficient_evidence");
    expect(compareRepair(s).rateChangeLpm).toBeNull();
  });
});
