import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
const name = "flowproof_test_" + Date.now();
const admin = postgres("postgres://localhost:5432/postgres", { max: 1 });
let service: typeof import("../../src/server/service");
let db: typeof import("../../src/server/db/client");
beforeAll(async () => {
  await admin.unsafe(`CREATE DATABASE ${name}`);
  process.env.DATABASE_URL = `postgres://localhost:5432/${name}`;
  db = await import("../../src/server/db/client");
  await db.sql`CREATE TABLE workspaces(id text PRIMARY KEY,mode text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,state jsonb NOT NULL)`;
  await db.sql`CREATE TABLE sessions(token_hash text PRIMARY KEY,workspace_id text REFERENCES workspaces(id),expires_at timestamptz NOT NULL)`;
  await db.sql`CREATE TABLE idempotency(scope text,key text,hash text,response jsonb,created_at timestamptz DEFAULT now(),UNIQUE(scope,key))`;
  await db.sql`CREATE TABLE rate_limits(key text PRIMARY KEY,count int,expires_at timestamptz)`;
  await db.sql`CREATE TABLE readings(id text PRIMARY KEY,workspace_id text,meter_id text,observed_at timestamptz,total_ml bigint,record jsonb)`;
  service = await import("../../src/server/service");
});
afterAll(async () => {
  await db?.sql.end();
  await admin.unsafe(`DROP DATABASE ${name}`);
  await admin.end();
});
describe("PostgreSQL transactions and workspace authorization", () => {
  it("isolates two sessions and resets only the owner", async () => {
    const a = await service.createWorkspace("synthetic"),
      b = await service.createWorkspace("synthetic");
    expect(a.id).not.toBe(b.id);
    await service.mutate(a.id, randomUUID(), "edit", (s) =>
      service.operation(
        s,
        ["cases", "hostel-a", "events"],
        { type: "scenario", scheduledUse: "present" },
        "1",
      ),
    );
    expect((await service.session(a.token)).state.cases[0].revision).toBe(2);
    expect((await service.session(b.token)).state.cases[0].revision).toBe(1);
    await service.mutate(a.id, randomUUID(), "reset", (s) =>
      service.operation(s, ["demo", "reset"], {}, null),
    );
    expect((await service.session(b.token)).state.cases[0].revision).toBe(1);
  });
  it("returns original response for identical retries and rejects changed payloads", async () => {
    const a = await service.createWorkspace("synthetic"),
      key = randomUUID();
    const op = (s: Parameters<typeof service.operation>[0]) =>
      service.operation(
        s,
        ["cases", "hostel-a", "events"],
        { type: "scenario", scheduledUse: "present" },
        "1",
      );
    const first = await service.mutate(a.id, key, "same", op);
    expect(await service.mutate(a.id, key, "same", op)).toEqual(first);
    await expect(
      service.mutate(a.id, key, "different", op),
    ).rejects.toMatchObject({ status: 409 });
    expect((await service.session(a.token)).state.cases[0].events).toHaveLength(
      1,
    );
  });
  it("serializes concurrent edits and rejects stale revisions", async () => {
    const a = await service.createWorkspace("synthetic");
    const op = (s: Parameters<typeof service.operation>[0]) =>
      service.operation(
        s,
        ["cases", "hostel-a", "events"],
        { type: "scenario", scheduledUse: "none" },
        "1",
      );
    const result = await Promise.allSettled([
      service.mutate(a.id, randomUUID(), "a", op),
      service.mutate(a.id, randomUUID(), "b", op),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await service.session(a.token)).state.cases[0].revision).toBe(2);
  });
  it("rejects expired sessions before physical cleanup", async () => {
    const a = await service.createWorkspace("synthetic");
    await db.sql`UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=${service.hash(a.token)}`;
    await expect(service.session(a.token)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("does not expose other workspace objects or allow uploaded resets", async () => {
    const a = await service.createWorkspace("uploaded");
    await expect(
      service.mutate(a.id, randomUUID(), "reset", (s) =>
        service.operation(s, ["demo", "reset"], {}, null),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(() =>
      service.operation(
        a.state,
        ["cases", "hostel-a", "events"],
        { type: "closure", reason: "done" },
        "1",
      ),
    ).toThrow("Case not found");
  });
  it("preserves immutable redacted receipts after evidence changes", async () => {
    const a = await service.createWorkspace("synthetic");
    const report = await service.mutate(a.id, randomUUID(), "report", (s) =>
      service.operation(s, ["cases", "hostel-a", "reports"], {}, "1"),
    );
    await service.mutate(a.id, randomUUID(), "change", (s) =>
      service.operation(
        s,
        ["cases", "hostel-a", "events"],
        { type: "scenario", scheduledUse: "present" },
        "1",
      ),
    );
    const state = (await service.session(a.token)).state;
    expect(state.reports[0]).toEqual(report);
    expect(JSON.stringify(report)).not.toContain("Sample caretaker");
    expect(state.reports[0].revision).toBeLessThan(state.cases[0].revision);
  });
  it("keeps import exclusions and identical imports idempotent", async () => {
    const a = await service.createWorkspace("synthetic");
    const csv =
      "meter_id,timestamp,total,unit,quality\nhostel-a,2026-09-18T02:00:00+05:30,120000,L,valid\nhostel-a,2026-09-18T04:00:00+05:30,-2,L,valid";
    const preview = (await service.mutate(a.id, randomUUID(), "preview", (s) =>
      service.operation(s, ["imports", "preview"], { csv }, null),
    )) as { id: string };
    await expect(
      service.mutate(a.id, randomUUID(), "commit-no", (s) =>
        service.operation(
          s,
          ["imports", "commit"],
          { previewId: preview.id, acknowledgeExclusions: false },
          null,
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });
    await service.mutate(a.id, randomUUID(), "commit-yes", (s) =>
      service.operation(
        s,
        ["imports", "commit"],
        { previewId: preview.id, acknowledgeExclusions: true },
        null,
      ),
    );
    const again = (await service.mutate(a.id, randomUUID(), "preview2", (s) =>
      service.operation(s, ["imports", "preview"], { csv }, null),
    )) as { id: string };
    expect(again.id).toBe(preview.id);
    const state = (await service.session(a.token)).state;
    expect(state.imports[0].excludedRows).toEqual([3]);
    expect(
      state.readings.filter((r) => r.sourceTotal === "120000"),
    ).toHaveLength(1);
  });
  it("retries workspace creation without a new session", async () => {
    process.env.SESSION_SECRET = "integration-test-secret-only";
    const key = randomUUID();
    const a = await service.createWorkspace("synthetic", key),
      b = await service.createWorkspace("synthetic", key);
    expect(a.token).toBe(b.token);
    expect(a.id).toBe(b.id);
    await expect(
      service.createWorkspace("uploaded", key),
    ).rejects.toMatchObject({ status: 409 });
  });
});
