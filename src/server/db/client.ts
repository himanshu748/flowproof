import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as {
  flowproofSql?: ReturnType<typeof postgres>;
};
export const sql =
  globalDb.flowproofSql ??
  postgres(process.env.DATABASE_URL || "postgres://localhost:55439/flowproof", {
    max: 5,
  });
if (process.env.NODE_ENV !== "production") globalDb.flowproofSql = sql;
export const db = drizzle(sql, { schema });
