import { sql } from "@/src/server/db/client";
import { timingSafeEqual } from "node:crypto";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (
    !secret ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  await sql.begin(async (tx) => {
    await tx`DELETE FROM workspaces WHERE expires_at < now()`;
    await tx`DELETE FROM idempotency WHERE created_at < now()-interval '14 days'`;
    await tx`DELETE FROM rate_limits WHERE expires_at < now()`;
  });
  return Response.json({ purged: true });
}
