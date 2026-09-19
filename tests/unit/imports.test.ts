import { it, expect } from "vitest";
import { parseCsv } from "../../src/domain/import-csv";
import { createState } from "../../src/demo/scenarios";
import { buildReceipt, receiptHtml } from "../../src/domain/report";
import { initialCase } from "../../src/demo/scenarios";
const header = "meter_id,timestamp,total,unit,quality\n";
const meters = createState("synthetic").meters;
it("deduplicates equivalent readings, retains row errors and missing endpoints", () => {
  const r = parseCsv(
    header +
      "hostel-a,2026-09-10T02:00:00+05:30,100,L,valid\nhostel-a,2026-09-09T20:30:00Z,0.1,m3,valid\nhostel-a,2026-09-10T03:00:00+05:30,,L,missing\nhostel-a,2026-09-10T04:00:00+05:30,-5,L,valid",
    meters,
  );
  expect(r.rows).toHaveLength(2);
  expect(r.duplicates).toBe(1);
  expect(r.rows[1].totalMl).toBeNull();
  expect(r.errors[0].row).toBe(5);
});
it("rejects conflicting timestamps and unknown units", () => {
  const r = parseCsv(
    header +
      "hostel-a,2026-09-10T02:00:00Z,100,L,valid\nhostel-a,2026-09-10T02:00:00Z,101,L,valid\nhostel-a,2026-09-10T04:00:00Z,100,L/min,valid",
    meters,
  );
  expect(r.errors).toHaveLength(2);
});
it("flags counter decreases and rejects overlong uploads", () => {
  expect(
    parseCsv(
      header +
        "hostel-a,2026-09-10T02:00:00Z,100,L,valid\nhostel-a,2026-09-10T04:00:00Z,50,L,valid",
      meters,
    ).warnings,
  ).toHaveLength(1);
  expect(() => parseCsv("x".repeat(2100000), meters)).toThrow();
});
it("redacts notes and escapes untrusted strings in HTML", () => {
  const c = initialCase();
  c.name = "PRIVATE NAME";
  c.events.push({
    id: "1",
    type: "inspection",
    at: "2026-09-10T00:00:00Z",
    recordedAt: "2026-09-10T00:00:00Z",
    notes: "PRIVATE NOTE",
    reportedBy: "PRIVATE PERSON",
  });
  const r = buildReceipt(c, "2026-09-19T00:00:00Z");
  expect(JSON.stringify(r)).not.toContain("PRIVATE");
  r.caseId = "<script>alert(1)</script>";
  const html = receiptHtml(r, "hash", false);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
