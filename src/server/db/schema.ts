import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { WorkspaceState } from "../../domain/types";
export const workspaces = pgTable("workspaces", {
  id: text().primaryKey(),
  mode: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  state: jsonb().$type<WorkspaceState>().notNull(),
});
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const requests = pgTable(
  "idempotency",
  {
    scope: text().notNull(),
    key: text().notNull(),
    hash: text().notNull(),
    response: jsonb().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("idempotency_scope_key").on(t.scope, t.key)],
);
export const limits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const evidenceReadings = pgTable("readings", {
  id: text().primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  meterId: text("meter_id").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  totalMl: bigint("total_ml", { mode: "bigint" }),
  record: jsonb().notNull(),
});
