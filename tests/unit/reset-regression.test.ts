import { describe, expect, it } from "vitest";
import { createState, referenceRepairCase } from "../../src/demo/scenarios";
import { operation } from "../../src/server/service";
import { compareRepair } from "../../src/domain/compare-repair";
import type { ImportPreview } from "../../src/domain/types";

function fixture() {
  const state = createState("synthetic");
  const c = referenceRepairCase();
  state.cases = [c];
  state.readings = c.observations.flatMap((w) => [w.start!, w.end!]);
  return { state, c };
}
function reset(state: ReturnType<typeof createState>) {
  operation(
    state,
    ["meters", "hostel-a", "events"],
    {
      type: "reset",
      at: "2026-09-16T03:00:00+05:30",
      acknowledged: true,
    },
    null,
  );
}

describe("reset evidence survives subsequent edits", () => {
  it.each(["manual", "import", "revision"])(
    "remains blocked after %s reading changes and serialization",
    (kind) => {
      const f = fixture();
      expect(compareRepair(f.c).outcome).toBe("observed_reduction");
      reset(f.state);
      expect(compareRepair(f.c).outcome).toBe("insufficient_evidence");
      const state = JSON.parse(JSON.stringify(f.state));
      if (kind === "import") {
        const preview = operation(
          state,
          ["imports", "preview"],
          {
            csv: "meter_id,timestamp,total,unit,quality\nhostel-a,2026-09-19T02:00:00+05:30,110000,L,valid",
          },
          null,
        ) as ImportPreview;
        operation(
          state,
          ["imports", "commit"],
          { previewId: preview.id, acknowledgeExclusions: false },
          null,
        );
      } else {
        const old = state.readings[0];
        operation(
          state,
          kind === "revision"
            ? ["readings", old.id, "revisions"]
            : ["readings"],
          {
            meterId: "hostel-a",
            timestamp:
              kind === "revision" ? old.timestamp : "2026-09-19T02:00:00+05:30",
            sourceTotal: kind === "revision" ? old.sourceTotal : "110000",
            unit: "L",
            quality: "valid",
            reason: "Checked transcription",
          },
          null,
        );
      }
      expect(state.meters[0].resetEvents).toHaveLength(1);
      expect(compareRepair(state.cases[0]).outcome).toBe(
        "insufficient_evidence",
      );
      expect(state.cases[0].observations[5].dataWarnings).toContain(
        "Acknowledged reset inside observation",
      );
    },
  );

  it("detects resets in observations created after the reset was recorded", () => {
    const { state, c } = fixture();
    const original = c.observations.pop()!;
    reset(state);
    operation(
      state,
      ["cases", c.id, "observations"],
      {
        startId: original.start!.id,
        endId: original.end!.id,
        phase: original.phase,
        context: original.context,
      },
      String(c.revision),
    );
    expect(c.observations.at(-1)!.dataWarnings).toContain(
      "Acknowledged reset inside observation",
    );
    expect(compareRepair(c).outcome).toBe("insufficient_evidence");
  });

  it("retains legacy reset evidence even without a stored timestamp", () => {
    const { state, c } = fixture();
    c.observations[5].dataWarnings.push(
      "Acknowledged reset inside observation",
    );
    operation(
      state,
      ["readings"],
      {
        meterId: "hostel-a",
        timestamp: "2026-09-19T02:00:00+05:30",
        sourceTotal: "110000",
        unit: "L",
        quality: "valid",
      },
      null,
    );
    expect(compareRepair(c).outcome).toBe("insufficient_evidence");
  });
});
