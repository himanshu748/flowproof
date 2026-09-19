export type Outcome =
  | "insufficient_evidence"
  | "context_unresolved"
  | "water_movement_observed"
  | "no_movement_above_resolution"
  | "observed_reduction"
  | "no_clear_reduction"
  | "not_comparable";
export type Reading = {
  id: string;
  meterId: string;
  timestamp: string;
  totalMl: string | null;
  unit: "L" | "m3";
  sourceTotal: string;
  quality: "valid" | "missing" | "invalid";
  epochId: string;
  supersedesId?: string;
};
export type Context = {
  declaredNoUse: "yes" | "no" | "unknown";
  scheduledUse: "none" | "present" | "unknown";
  automaticUse: "none" | "present" | "unknown";
  supplyStatus: "available" | "interrupted" | "unknown";
  storageStatus: "stable" | "changing" | "not_applicable" | "unknown";
  meterHealth: "supported" | "suspect" | "unknown";
  healthEvidenceId: string | null;
  regimeId: string;
  recordedBy: string;
  recordedAt: string;
};
export type HealthEvidence = {
  id: string;
  basis: string;
  reportedBy: string;
  from: string;
  to: string;
};
export type ObservationInput = {
  id: string;
  label: string;
  phase: "exploratory" | "pre_repair" | "post_repair";
  start: Reading | null;
  end: Reading | null;
  resolutionMl: string;
  timezone: string;
  context: Context;
  healthEvidence: HealthEvidence | null;
  dataWarnings: string[];
};
export type CaseEvent = {
  id: string;
  type: string;
  at: string;
  recordedAt: string;
  reportedBy: string;
  notes: string;
};
export type CaseSnapshot = {
  id: string;
  name: string;
  meterId: string;
  sourceMode: "synthetic" | "uploaded";
  revision: number;
  workflow:
    | "new"
    | "investigating"
    | "inspection_requested"
    | "repair_reported"
    | "follow_up"
    | "closed";
  safeQuietWindow: boolean;
  repairAt: string | null;
  observations: ObservationInput[];
  events: CaseEvent[];
  observationHistory?: ObservationInput[];
};
export type WindowMeasurement = {
  volumeL: number | null;
  durationMinutes: number | null;
  rateLpm: number | null;
  rateLow: number | null;
  rateHigh: number | null;
  reasons: string[];
  evidenceIds: string[];
};
export type EligibilityResult = { eligible: boolean; reasons: string[] };
export type RepairComparison = {
  outcome: Outcome;
  methodVersion: "comparison-v1";
  selectedPre: string[];
  selectedPost: string[];
  excluded: { id: string; reasons: string[] }[];
  reasons: string[];
  rateChangeLpm: number | null;
  observedRangeLowLpm: number | null;
  observedRangeHighLpm: number | null;
  preMedianLpm: number | null;
  postMedianLpm: number | null;
  preVolumeL: number | null;
  postVolumeL: number | null;
  preMinutes: number | null;
  postMinutes: number | null;
};
export type PolicyDecision = {
  caseId: string;
  caseRevision: number;
  engineVersion: "next-check-v1";
  outcome: Outcome;
  nextAction: {
    type: string;
    title: string;
    ruleId: string;
    reason: string;
    requiredFields: string[];
    evidenceIds: string[];
  };
  blockingReasons: string[];
  evidenceIds: string[];
};
export type Meter = {
  id: string;
  name: string;
  timezone: string;
  resolutionMl: string;
  epochId: string;
  unit: "L" | "m3";
  healthEvidence: HealthEvidence[];
  resetEvents?: { id: string; at: string; recordedAt: string }[];
};
export type ImportPreview = {
  id: string;
  hash: string;
  createdAt: string;
  rows: Reading[];
  errors: { row: number; message: string }[];
  duplicates: number;
  warnings: string[];
  spanDays: number;
  committed?: boolean;
  excludedRows?: number[];
};
export type WorkspaceState = {
  mode: "synthetic" | "uploaded";
  meters: Meter[];
  readings: Reading[];
  cases: CaseSnapshot[];
  imports: ImportPreview[];
  reports: StoredReport[];
  runs: {
    id: string;
    caseId: string;
    revision: number;
    hash: string;
    policy: PolicyDecision;
    comparison: RepairComparison;
  }[];
};
export type ReceiptDTO = {
  caseId: string;
  sourceMode: string;
  revision: number;
  generatedAt: string;
  repairAt: string | null;
  observations: ObservationInput[];
  policy: PolicyDecision;
  comparison: RepairComparison;
  limitations: string[];
};
export type StoredReport = {
  id: string;
  caseId: string;
  revision: number;
  createdAt: string;
  hash: string;
  snapshot: ReceiptDTO;
};
