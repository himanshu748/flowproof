import { randomUUID } from "node:crypto";
const origin = process.env.SMOKE_ORIGIN || "http://127.0.0.1:3010";
async function request(
  path: string,
  cookie = "",
  body?: unknown,
  revision?: number,
  key = randomUUID(),
) {
  const r = await fetch(origin + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
      ...(revision === undefined ? {} : { "If-Match": String(revision) }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    cookie: r.headers.get("set-cookie")?.split(";")[0] || cookie,
    data: await r.json(),
  };
}
function assert(ok: unknown, message: string) {
  if (!ok) throw new Error(message);
}
const key = randomUUID();
const a = await request(
  "workspaces",
  "",
  { mode: "synthetic" },
  undefined,
  key,
);
assert(a.status === 200, "Create workspace");
const retry = await request(
  "workspaces",
  "",
  { mode: "synthetic" },
  undefined,
  key,
);
assert(a.cookie === retry.cookie, "Workspace creation must be retry-safe");
const changed = await request(
  "cases/hostel-a/events",
  a.cookie,
  { type: "replay", stage: "comparison" },
  1,
);
assert(
  changed.data.comparison.rateChangeLpm === 1.7,
  "Reference repair result",
);
const report = await request("cases/hostel-a/reports", a.cookie, {}, 2);
assert(report.status === 200, "Create receipt");
const json = await request("reports/" + report.data.id, a.cookie);
assert(json.data.hash === report.data.hash, "Immutable export");
const html = await fetch(
  origin + "/api/reports/" + report.data.id + "?format=html",
  { headers: { Cookie: a.cookie } },
);
assert(
  html.status === 200 && (await html.text()).includes("Content SHA-256"),
  "HTML export",
);
const b = await request("workspaces", "", { mode: "uploaded" });
assert(
  (await request("reports/" + report.data.id, b.cookie)).status === 404,
  "Cross-workspace receipt blocked",
);
assert(
  (
    await request(
      "cases/hostel-a/events",
      b.cookie,
      { type: "closure", reason: "x" },
      2,
    )
  ).status === 404,
  "Cross-workspace mutation blocked",
);
const csrf = await fetch(origin + "/api/demo/reset", {
  method: "POST",
  headers: {
    Cookie: a.cookie,
    Origin: "https://untrusted.invalid",
    "Idempotency-Key": randomUUID(),
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert(csrf.status === 403, "Cross-origin mutation blocked");
const stale = await request(
  "cases/hostel-a/events",
  a.cookie,
  { type: "closure", reason: "old revision" },
  1,
);
assert(stale.status === 409, "Stale mutation rejected");
console.log(
  "HTTP smoke passed: retry-safe creation, reference calculation, JSON/HTML exports, cross-workspace reads/writes, origin guard, stale revision.",
);
