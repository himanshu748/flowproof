import "dotenv/config";
import { sql } from "../src/server/db/client";
await sql`DELETE FROM workspaces WHERE expires_at < now()`;
await sql`DELETE FROM idempotency WHERE created_at < now()-interval '14 days'`;
await sql`DELETE FROM rate_limits WHERE expires_at < now()`;
console.log("Expired workspace data removed.");
await sql.end();
