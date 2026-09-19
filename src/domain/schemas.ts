import { z } from "zod";
import { parseTimestamp, parseTotalMl } from "./units";
export const timestamp = z.string().transform((v, c) => {
  try {
    return parseTimestamp(v);
  } catch (e) {
    c.addIssue({ code: "custom", message: (e as Error).message });
    return z.NEVER;
  }
});
export const contextSchema = z.object({
  declaredNoUse: z.enum(["yes", "no", "unknown"]),
  scheduledUse: z.enum(["none", "present", "unknown"]),
  automaticUse: z.enum(["none", "present", "unknown"]),
  supplyStatus: z.enum(["available", "interrupted", "unknown"]),
  storageStatus: z.enum(["stable", "changing", "not_applicable", "unknown"]),
  meterHealth: z.enum(["supported", "suspect", "unknown"]),
  healthEvidenceId: z.string().nullable(),
  regimeId: z.string().max(100),
  recordedBy: z.string().min(1).max(100),
  recordedAt: timestamp,
});
export const readingSchema = z
  .object({
    meterId: z.string().min(1),
    timestamp,
    sourceTotal: z.string().max(30),
    unit: z.enum(["L", "m3"]),
    quality: z.enum(["valid", "missing", "invalid"]),
  })
  .superRefine((v, c) => {
    if (v.quality === "missing") {
      if (v.sourceTotal !== "")
        c.addIssue({
          code: "custom",
          message: "Missing readings must have an empty total.",
        });
      return;
    }
    try {
      parseTotalMl(v.sourceTotal, v.unit);
    } catch (e) {
      c.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("context"),
    observationId: z.string(),
    context: contextSchema,
  }),
  z.object({
    type: z.literal("inspection"),
    observedAt: timestamp,
    reportedBy: z.string().min(1).max(100),
    outcome: z.enum(["leak_found", "no_fault_found", "inconclusive"]),
    notes: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal("repair"),
    actualRepairAt: timestamp,
    reportedBy: z.string().min(1).max(100),
    workDescription: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.enum(["closure", "reopening"]),
    reason: z.string().min(1).max(2000),
  }),
  z.object({ type: z.literal("request_inspection") }),
  z.object({
    type: z.literal("replay"),
    stage: z.enum(["quiet", "repair", "comparison"]),
  }),
  z.object({
    type: z.literal("scenario"),
    scheduledUse: z.enum(["none", "present", "unknown"]).optional(),
    supplyComparable: z.boolean().optional(),
    meterHealth: z.enum(["supported", "suspect", "unknown"]).optional(),
    safeQuietWindow: z.boolean().optional(),
  }),
]);
