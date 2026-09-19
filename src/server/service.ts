import { randomBytes, randomUUID, createHash, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, sql } from "./db/client";
import { workspaces, sessions } from "./db/schema";
import {
  createState,
  observation,
  referenceRepairCase,
} from "../demo/scenarios";
import {
  WorkspaceState,
  CaseSnapshot,
  Reading,
  Context,
  ObservationInput,
} from "../domain/types";
import { chooseNextCheck } from "../domain/next-check";
import { compareRepair } from "../domain/compare-repair";
import { buildReceipt } from "../domain/report";
import { parseTotalMl } from "../domain/units";
import {
  contextSchema,
  eventSchema,
  readingSchema,
  timestamp,
} from "../domain/schemas";
import { parseCsv } from "../domain/import-csv";
import { z } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function createWorkspace(
  mode: "synthetic" | "uploaded",
  creationKey?: string,
) {
  const secret = process.env.SESSION_SECRET;
  if (creationKey && !secret)
    throw new ApiError(
      500,
      "SESSION_SECRET is required for retry-safe session creation",
    );
  const token = creationKey
    ? createHmac("sha256", secret!)
        .update("workspace:" + creationKey)
        .digest("hex")
    : randomBytes(32).toString("hex");
  return sql.begin(async (tx) => {
    if (creationKey) {
      await tx`SELECT pg_advisory_xact_lock(hashtext(${creationKey}))`;
      const existing =
        await tx`SELECT w.id,w.state FROM sessions s JOIN workspaces w ON w.id=s.workspace_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now()`;
      if (existing.length) {
        const state = existing[0].state as WorkspaceState;
        if (state.mode !== mode)
          throw new ApiError(
            409,
            "Creation key already used with a different mode",
          );
        return { token, id: existing[0].id as string, state };
      }
    }
    const id = randomUUID(),
      expiresAt = new Date(Date.now() + 14 * 86400000),
      state = createState(mode);
    await tx`INSERT INTO workspaces(id,mode,expires_at,state) VALUES(${id},${mode},${expiresAt.toISOString()},${JSON.stringify(state)}::jsonb)`;
    await tx`INSERT INTO sessions(token_hash,workspace_id,expires_at) VALUES(${hash(token)},${id},${expiresAt.toISOString()})`;
    return { token, id, state };
  });
}
export async function session(token: string | undefined) {
  if (!token)
    throw new ApiError(
      401,
      "Your temporary session has expired. Start a new isolated workspace.",
    );
  const rows = await db
    .select()
    .from(sessions)
    .innerJoin(workspaces, eq(sessions.workspaceId, workspaces.id))
    .where(eq(sessions.tokenHash, hash(token)));
  const row = rows[0];
  if (
    !row ||
    row.sessions.expiresAt.getTime() <= Date.now() ||
    row.workspaces.expiresAt.getTime() <= Date.now()
  )
    throw new ApiError(
      401,
      "Your temporary session has expired. Start a new isolated workspace.",
    );
  return row.workspaces;
}
export async function rateLimit(key: string, max: number) {
  const bucket = Math.floor(Date.now() / 60000);
  const result =
    await sql`INSERT INTO rate_limits(key,count,expires_at) VALUES(${key + ":" + bucket},1,now()+interval '2 minutes') ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`;
  if (result[0].count > max)
    throw new ApiError(
      429,
      "Too many requests. Please wait one minute and try again.",
    );
}
function getCase(state: WorkspaceState, id: string) {
  const s = state.cases.find((c) => c.id === id);
  if (!s) throw new ApiError(404, "Case not found.");
  return s;
}
export function present(state: WorkspaceState) {
  return {
    ...state,
    cases: state.cases.map((c) => ({
      ...c,
      policy: chooseNextCheck(c),
      comparison: compareRepair(c),
    })),
  };
}
function invalidate(s: CaseSnapshot) {
  s.revision++;
}
function syncReading(state: WorkspaceState, r: Reading) {
  if (state.readings.length >= 5000)
    throw new ApiError(422, "Workspace reading limit reached.");
  const existing = state.readings.find(
    (x) =>
      x.meterId === r.meterId &&
      Date.parse(x.timestamp) === Date.parse(r.timestamp) &&
      !state.readings.some((y) => y.supersedesId === x.id),
  );
  if (existing && !r.supersedesId) {
    if (existing.totalMl === r.totalMl && existing.quality === r.quality)
      return existing;
    throw new ApiError(
      409,
      "Conflicting reading: use an explicit correction revision.",
    );
  }
  state.readings.push(r);
  return r;
}
function refreshWindows(state: WorkspaceState, meterId: string) {
  for (const c of state.cases.filter((c) => c.meterId === meterId)) {
    for (const w of c.observations) {
      if (!w.start || !w.end) continue;
      const readings = state.readings
        .filter(
          (r) =>
            r.meterId === meterId &&
            r.quality === "valid" &&
            r.totalMl !== null &&
            Date.parse(r.timestamp) >= Date.parse(w.start!.timestamp) &&
            Date.parse(r.timestamp) <= Date.parse(w.end!.timestamp) &&
            !state.readings.some((x) => x.supersedesId === r.id),
        )
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      w.dataWarnings = readings.some(
        (r, i) =>
          i > 0 &&
          (r.epochId !== readings[i - 1].epochId ||
            BigInt(r.totalMl!) < BigInt(readings[i - 1].totalMl!)),
      )
        ? ["Internal reset or decreasing reading in this window"]
        : [];
    }
    invalidate(c);
  }
}
export async function mutate(
  workspaceId: string,
  key: string | undefined,
  payloadHash: string,
  operation: (state: WorkspaceState) => unknown,
) {
  if (!key || key.length > 200)
    throw new ApiError(400, "An Idempotency-Key is required.");
  return sql.begin(async (tx) => {
    const rows =
      await tx`SELECT state FROM workspaces WHERE id=${workspaceId} AND expires_at>now() FOR UPDATE`;
    if (!rows.length) throw new ApiError(401, "Session expired.");
    const prior =
      await tx`SELECT hash,response FROM idempotency WHERE scope=${workspaceId} AND key=${key}`;
    if (prior.length) {
      if (prior[0].hash !== payloadHash)
        throw new ApiError(
          409,
          "This retry key was already used for a different request.",
        );
      return prior[0].response;
    }
    const state = rows[0].state as WorkspaceState;
    const revisions = new Map(state.cases.map((c) => [c.id, c.revision]));
    const result = operation(state);
    for (const c of state.cases) {
      if (revisions.get(c.id) !== c.revision) {
        if (state.runs.length >= 100)
          throw new ApiError(422, "Analysis run limit reached");
        state.runs.push({
          id: randomUUID(),
          caseId: c.id,
          revision: c.revision,
          hash: hash(JSON.stringify(c)),
          policy: chooseNextCheck(c),
          comparison: compareRepair(c),
        });
      }
    }
    await tx`UPDATE workspaces SET state=${JSON.stringify(state)}::jsonb WHERE id=${workspaceId}`;
    for (const r of state.readings)
      await tx`INSERT INTO readings(id,workspace_id,meter_id,observed_at,total_ml,record) VALUES(${workspaceId + ":" + r.id},${workspaceId},${r.meterId},${r.timestamp},${r.totalMl},${JSON.stringify(r)}::jsonb) ON CONFLICT(id) DO NOTHING`;
    await tx`INSERT INTO idempotency(scope,key,hash,response) VALUES(${workspaceId},${key},${payloadHash},${JSON.stringify(result)}::jsonb)`;
    return result;
  });
}
export function operation(
  state: WorkspaceState,
  path: string[],
  body: unknown,
  match: string | null,
): unknown {
  const now = new Date().toISOString();
  if (path.join("/") === "demo/reset") {
    if (state.mode !== "synthetic")
      throw new ApiError(403, "Only sample workspaces can reset.");
    const previous = state.cases;
    const fresh = createState("synthetic");
    fresh.reports = state.reports;
    fresh.runs = state.runs;
    fresh.cases.forEach(
      (c) =>
        (c.revision = (previous.find((x) => x.id === c.id)?.revision || 0) + 1),
    );
    Object.assign(state, fresh);
    return present(state);
  }
  if (path[0] === "meters" && path.length === 1) {
    const input = z
      .object({
        name: z.string().min(1).max(100),
        timezone: z.string(),
        resolution: z.string(),
        unit: z.enum(["L", "m3"]),
      })
      .parse(body);
    try {
      new Intl.DateTimeFormat("en", { timeZone: input.timezone });
    } catch {
      throw new ApiError(422, "Use an IANA timezone such as Asia/Kolkata.");
    }
    if (state.meters.length >= 5)
      throw new ApiError(422, "Maximum five meters.");
    let resolutionMl: string;
    try {
      resolutionMl = parseTotalMl(input.resolution, input.unit).toString();
    } catch (e) {
      throw new ApiError(422, (e as Error).message);
    }
    if (resolutionMl === "0")
      throw new ApiError(422, "Display resolution must be positive.");
    const meter = {
      id: randomUUID(),
      name: input.name,
      timezone: input.timezone,
      resolutionMl,
      unit: input.unit,
      epochId: randomUUID(),
      healthEvidence: [],
    };
    state.meters.push(meter);
    return meter;
  }
  if (path[0] === "meters" && path[2] === "events") {
    const m = state.meters.find((m) => m.id === path[1]);
    if (!m) throw new ApiError(404, "Meter not found");
    const b = z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("health"),
          from: timestamp,
          to: timestamp,
          basis: z.string().min(1).max(2000),
          reportedBy: z.string().min(1).max(100),
        }),
        z.object({
          type: z.literal("reset"),
          at: timestamp,
          acknowledged: z.literal(true),
        }),
      ])
      .parse(body);
    if (b.type === "health") {
      if (b.to < b.from)
        throw new ApiError(422, "Health coverage ends before it starts.");
      const h = { id: randomUUID(), ...b };
      m.healthEvidence.push(h);
    } else {
      m.epochId = randomUUID();
      for (const c of state.cases.filter((c) => c.meterId === m.id))
        for (const w of c.observations)
          if (
            w.start &&
            w.end &&
            w.start.timestamp <= b.at &&
            w.end.timestamp >= b.at
          )
            w.dataWarnings.push("Acknowledged reset inside observation");
    }
    state.cases.filter((c) => c.meterId === m.id).forEach(invalidate);
    return m;
  }
  if (path[0] === "readings") {
    const input = readingSchema.parse(body);
    const meter = state.meters.find((m) => m.id === input.meterId);
    if (!meter) throw new ApiError(404, "Meter not found");
    const r: Reading = {
      ...input,
      id: randomUUID(),
      totalMl:
        input.quality === "missing"
          ? null
          : parseTotalMl(input.sourceTotal, input.unit).toString(),
      epochId: meter.epochId,
    };
    if (path[2] === "revisions") {
      const old = state.readings.find((r) => r.id === path[1]);
      if (!old || old.meterId !== meter.id)
        throw new ApiError(404, "Reading not found");
      z.object({ reason: z.string().min(1).max(2000) }).parse(body);
      r.supersedesId = old.id;
      r.epochId = old.epochId;
      for (const c of state.cases)
        for (const w of c.observations) {
          if (w.start?.id === old.id) w.start = r;
          if (w.end?.id === old.id) w.end = r;
        }
    }
    const saved = syncReading(state, r);
    refreshWindows(state, meter.id);
    return saved;
  }
  if (path.join("/") === "imports/preview") {
    if (state.imports.length >= 10)
      throw new ApiError(422, "Maximum ten imports.");
    const { csv } = z
      .object({ csv: z.string().max(2 * 1024 * 1024) })
      .parse(body);
    const identity = hash(
      csv +
        JSON.stringify(state.meters.map((m) => [m.id, m.epochId, m.unit])) +
        "csv-v1",
    );
    const prior = state.imports.find(
      (i) =>
        i.hash === identity &&
        (i.committed || Date.now() - Date.parse(i.createdAt) < 1800000),
    );
    if (prior) return prior;
    let parsed: ReturnType<typeof parseCsv>;
    try {
      parsed = parseCsv(csv, state.meters);
    } catch (e) {
      throw new ApiError(422, (e as Error).message);
    }
    const preview = {
      id: randomUUID(),
      hash: identity,
      createdAt: now,
      ...parsed,
    };
    state.imports.push(preview);
    return preview;
  }
  if (path.join("/") === "imports/commit") {
    const b = z
      .object({ previewId: z.string(), acknowledgeExclusions: z.boolean() })
      .parse(body);
    const preview = state.imports.find((p) => p.id === b.previewId);
    if (!preview) throw new ApiError(404, "Preview not found");
    if (preview.committed) return preview;
    if (Date.now() - Date.parse(preview.createdAt) > 1800000)
      throw new ApiError(409, "Preview expired. Preview the file again.");
    if (preview.errors.length && !b.acknowledgeExclusions)
      throw new ApiError(
        422,
        "Correct rejected rows or explicitly acknowledge their exclusion.",
      );
    for (const row of preview.rows)
      syncReading(state, { ...row, id: randomUUID() });
    preview.committed = true;
    preview.excludedRows = preview.errors.map((e) => e.row);
    for (const m of state.meters) refreshWindows(state, m.id);
    return preview;
  }
  if (path[0] === "cases" && path.length === 1) {
    const b = z
      .object({ meterId: z.string(), name: z.string().min(1).max(100) })
      .parse(body);
    if (!state.meters.some((m) => m.id === b.meterId))
      throw new ApiError(404, "Meter not found");
    if (state.cases.length >= 50)
      throw new ApiError(422, "Maximum fifty cases.");
    const s: CaseSnapshot = {
      id: randomUUID(),
      name: b.name,
      meterId: b.meterId,
      sourceMode: state.mode,
      revision: 1,
      workflow: "new",
      safeQuietWindow: true,
      repairAt: null,
      observations: [],
      events: [],
    };
    state.cases.push(s);
    return s;
  }
  if (path[0] !== "cases") throw new ApiError(404, "Unknown operation");
  const s = getCase(state, path[1]);
  if (match !== String(s.revision))
    throw new ApiError(
      409,
      `Evidence changed. Reload revision ${s.revision} before saving.`,
    );
  if (path[2] === "events") {
    const b = eventSchema.parse(body);
    if (b.type === "context") {
      const w = s.observations.find((w) => w.id === b.observationId);
      if (!w) throw new ApiError(404, "Observation not found");
      s.observationHistory ??= [];
      s.observationHistory.push(structuredClone(w));
      w.context = b.context;
      w.healthEvidence =
        state.meters
          .find((m) => m.id === s.meterId)
          ?.healthEvidence.find((h) => h.id === b.context.healthEvidenceId) ||
        null;
    } else if (b.type === "repair") {
      s.repairAt = b.actualRepairAt;
      s.workflow = "repair_reported";
    } else if (b.type === "inspection") {
      s.workflow = "investigating";
    } else if (b.type === "closure") s.workflow = "closed";
    else if (b.type === "reopening") s.workflow = "investigating";
    else if (b.type === "request_inspection")
      s.workflow = "inspection_requested";
    else if (b.type === "replay") {
      if (state.mode !== "synthetic")
        throw new ApiError(403, "Replay is sample-only.");
      if (s.meterId !== "hostel-a")
        throw new ApiError(
          422,
          "Historical replay belongs to the Hostel A sample.",
        );
      s.observationHistory ??= [];
      s.observationHistory.push(...structuredClone(s.observations));
      if (b.stage === "quiet") {
        if (!s.observations.some((w) => w.id === "observation-12"))
          s.observations.push(observation(12, 102000, 228, "pre_repair"));
        s.observations[0].context.scheduledUse = "present";
      }
      if (b.stage === "repair") {
        s.repairAt = "2026-09-13T12:00:00+05:30";
        s.workflow = "repair_reported";
      }
      if (b.stage === "comparison") {
        const ref = referenceRepairCase();
        s.repairAt = ref.repairAt;
        s.observations = [
          ...s.observations.filter((w) => w.phase === "exploratory"),
          ...ref.observations,
        ];
        s.workflow = "follow_up";
      }
    } else if (b.type === "scenario") {
      if (state.mode !== "synthetic")
        throw new ApiError(403, "Scenario controls are sample-only");
      for (const w of s.observations) {
        if (b.scheduledUse !== undefined)
          w.context.scheduledUse = b.scheduledUse;
        if (b.supplyComparable !== undefined && w.phase === "post_repair")
          w.context.supplyStatus = b.supplyComparable
            ? "available"
            : "interrupted";
        if (b.meterHealth !== undefined) w.context.meterHealth = b.meterHealth;
      }
      if (b.safeQuietWindow !== undefined)
        s.safeQuietWindow = b.safeQuietWindow;
    }
    s.events.push({
      id: randomUUID(),
      type: b.type,
      at:
        "actualRepairAt" in b
          ? b.actualRepairAt
          : "observedAt" in b
            ? b.observedAt
            : now,
      recordedAt: now,
      reportedBy: "reportedBy" in b ? b.reportedBy : "Workspace operator",
      notes:
        "notes" in b
          ? b.outcome + ": " + b.notes
          : "workDescription" in b
            ? b.workDescription
            : "reason" in b
              ? b.reason
              : JSON.stringify(b),
    });
    invalidate(s);
    return { ...s, policy: chooseNextCheck(s), comparison: compareRepair(s) };
  }
  if (path[2] === "observations") {
    const b = z
      .object({
        replacesId: z.string().optional(),
        startId: z.string(),
        endId: z.string().nullable(),
        phase: z.enum(["exploratory", "pre_repair", "post_repair"]),
        context: contextSchema,
      })
      .parse(body);
    const meter = state.meters.find((m) => m.id === s.meterId)!;
    const start = state.readings.find(
      (r) => r.id === b.startId && r.meterId === s.meterId,
    );
    const end =
      state.readings.find((r) => r.id === b.endId && r.meterId === s.meterId) ||
      null;
    if (!start || (b.endId && !end))
      throw new ApiError(404, "Source reading not found");
    const w: ObservationInput = {
      id: randomUUID(),
      label: start.timestamp,
      phase: b.phase,
      start,
      end,
      context: b.context as Context,
      resolutionMl: meter.resolutionMl,
      timezone: meter.timezone,
      healthEvidence:
        meter.healthEvidence.find((h) => h.id === b.context.healthEvidenceId) ||
        null,
      dataWarnings: [],
    };
    if (b.replacesId) {
      const index = s.observations.findIndex((x) => x.id === b.replacesId);
      if (index < 0) throw new ApiError(404, "Observation not found");
      s.observationHistory ??= [];
      s.observationHistory.push(s.observations[index]);
      s.observations[index] = w;
    } else s.observations.push(w);
    s.events.push({
      id: randomUUID(),
      type: "observation",
      at: now,
      recordedAt: now,
      reportedBy: b.context.recordedBy,
      notes: b.replacesId
        ? "Revised observation " + b.replacesId
        : "Added observation " + w.id,
    });
    refreshWindows(state, s.meterId);
    return w;
  }
  if (path[2] === "analyze") {
    if (state.runs.length >= 100)
      throw new ApiError(422, "Analysis run limit reached");
    const identity = hash(JSON.stringify(s));
    let run = state.runs.find((r) => r.hash === identity);
    if (!run) {
      run = {
        id: randomUUID(),
        caseId: s.id,
        revision: s.revision,
        hash: identity,
        policy: chooseNextCheck(s),
        comparison: compareRepair(s),
      };
      state.runs.push(run);
    }
    return run;
  }
  if (path[2] === "reports") {
    if (state.reports.length >= 100)
      throw new ApiError(422, "Report limit reached");
    const snapshot = buildReceipt(s, now);
    const report = {
      id: randomUUID(),
      caseId: s.id,
      revision: s.revision,
      createdAt: now,
      hash: hash(JSON.stringify(snapshot)),
      snapshot,
    };
    state.reports.push(report);
    return report;
  }
  throw new ApiError(404, "Unknown operation");
}
