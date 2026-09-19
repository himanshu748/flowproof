import "dotenv/config";
import { sql } from "../src/server/db/client";
await sql`CREATE TABLE IF NOT EXISTS workspaces(id text PRIMARY KEY,mode text NOT NULL CHECK(mode IN ('synthetic','uploaded')),created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,state jsonb NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS idempotency(scope text NOT NULL,key text NOT NULL,hash text NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(scope,key))`;
await sql`CREATE TABLE IF NOT EXISTS rate_limits(key text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL)`;
await sql`CREATE TABLE IF NOT EXISTS readings(id text PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,meter_id text NOT NULL,observed_at timestamptz NOT NULL,total_ml bigint CHECK(total_ml>=0 AND total_ml<=1000000000000000),record jsonb NOT NULL)`;
console.log("Database migration complete.");
await sql.end();
