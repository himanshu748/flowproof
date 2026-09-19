# FlowProof

Find the next useful check. See what changed after the fix.

FlowProof is a temporary water-use investigation workspace. It accepts cumulative meter readings, keeps operating context explicit, and compares eligible observations after a reported repair. The core is deterministic and works without a model key.

Live app: https://flowproof-mu.vercel.app/

Demo: https://youtu.be/WrlLPeW0DG8

Submission: https://devpost.com/software/flowproof-17abxn

## Run locally

Requires Node.js 22.14+ and PostgreSQL 16+. The implementation was verified with PostgreSQL 16.14. Package versions are pinned in `package-lock.json`.

```sh
npm ci
createdb flowproof
cp .env.example .env
# Set SESSION_SECRET to a random 32-byte hex value:
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
# Paste that value into SESSION_SECRET in .env; never commit .env.
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:3010. `APP_ORIGIN` must exactly match the browser origin. This existing Cursor folder has a configured local `.env` and its own `flowproof_codex` database on the already-running local PostgreSQL service.

`npm run db:local` optionally starts a separate PostgreSQL cluster on port 55439 when the host permits it. Set the connection URL accordingly. This is optional; the Codex sandbox does not permit creating PostgreSQL shared memory.

## Try it

1. Explore a sample and open **Hostel A**.
2. Record cleaning as present. The policy requests a naturally quiet observation.
3. Use the explicitly labelled historical replay to reveal a quiet check, then a reported repair, then the follow-up observations.
4. Inspect the 1.70 L/min median change and 1.516667–1.883333 L/min observed-window range.
5. Open **Annex B** to see the missing-endpoint result remain inconclusive.
6. Create an evidence receipt and download its redacted HTML or JSON snapshot.

The sample is synthetic. Replay date jumps are not a live experiment. Lower sampled use does not establish repair causality or certified savings.

For your own non-confidential readings, start an uploaded workspace, create a meter, add or import readings, open an investigation, and add observation windows with attributed context. Health evidence is recorded separately and linked to each observation. Corrections retain the previous reading, and resetting a meter starts a new epoch.

```csv
meter_id,timestamp,total,unit,quality
YOUR_METER_ID,2026-09-10T02:00:00+05:30,100000,L,valid
YOUR_METER_ID,2026-09-10T04:00:00+05:30,100216,L,valid
```

CSV preview preserves errors and duplicate counts. Rejected rows require explicit exclusion acknowledgment. Missing totals stay null. Supported units are `L` and `m3`, with explicit-offset timestamps.

## Commands

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run evaluate
npm run build
npm run smoke
```

Integration tests create and drop only a dedicated `flowproof_test_<timestamp>` database on the local PostgreSQL server. The database role needs create-database permission. Browser tests require the dev server and Playwright Chromium. `npm run smoke` checks the running API and creates isolated temporary test workspaces. Override `SMOKE_ORIGIN` for another deployment; browser tests use `E2E_BASE_URL`.

## Architecture

Next.js App Router and Route Handlers, React, TypeScript, Tailwind, accessible Radix dialog primitive, PostgreSQL, Drizzle, Zod, Vitest, and Playwright. One shared pure domain engine owns units, eligibility, policy, comparison, and receipts.

Storage uses transaction-locked, revisioned workspace snapshots in PostgreSQL JSONB, plus separate sessions, idempotency records, rate counters, and immutable bigint reading records. This is a deliberate implementation simplification from the PRD's proposed fully normalized table layout. It is designed for the bounded temporary prototype, not concurrent multi-user facilities management.

Session cookies are HttpOnly, SameSite=Lax, and Secure in production. Only token hashes are stored. Retry-safe initial tokens are derived with HMAC-SHA-256 from a random request key and a server-only secret. Every unsafe request checks Origin. Mutations require idempotency keys; case mutations require If-Match. Reports are workspace-scoped immutable snapshots. Names and free-text notes are redacted from exports.

## Validation and release status

See `docs/VERIFICATION.md`, `docs/EVALUATION.md`, `docs/METHODS.md`, and `docs/BUILD_LOG.md`. The original recovered contract is in `docs/PRD.md`.

The app is deployed on Vercel with an isolated Neon free-plan database. Production HTTP smoke checks passed, and the hosted sample was checked in the in-app browser. The narrated demo is uploaded and the NextStep Hacks entry was submitted September 19, 2026. Validation includes 25 unit tests, nine database integration tests, and 40 synthetic scenarios. A facilities-user study remains future work. Standalone Playwright browser launch was blocked by the local macOS sandbox; in-app browser checks were performed separately.

## Deployment

Provide PostgreSQL, `DATABASE_URL`, `APP_ORIGIN`, and a strong stable `SESSION_SECRET`. Run migrations before starting the production build. Use an HTTPS origin; Secure cookies intentionally do not work over public HTTP. The normal production command is `next start` behind an HTTPS reverse proxy, with the appropriate host/port for the platform. No paid resources were provisioned.

Vercel runs `/api/cron/purge` daily at 03:00 UTC, authenticated with `CRON_SECRET`. Manual production verification returned 401 without authorization and 200 with authorization; the first scheduled execution has not yet been observed. `npm run purge` remains available for other hosts. Access expiry is enforced before deletion. On Vercel, the canonical origin is derived from `VERCEL_PROJECT_PRODUCTION_URL` unless `APP_ORIGIN` is explicitly set.
