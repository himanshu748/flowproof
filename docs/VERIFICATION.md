# Verification record

19 September 2026. This records executed checks, not a claim that every PRD release gate is complete.

| Check | Result |
|---|---|
| TypeScript typecheck | Passed |
| ESLint | Passed |
| Unit suite | 18 passed |
| PostgreSQL integration suite | 8 passed, dedicated disposable database |
| Synthetic evaluation | 40/40 outcome and next-action assertions passed |
| Unsupported positive comparisons in evaluation | 0 |
| Invalid selected windows in evaluation | 0 |
| Deterministic evaluation replay | 40/40 |
| Next.js production build | Passed |
| HTTP smoke | Passed: retry-safe session creation, reference comparison, HTML/JSON exports, scoped report access, scoped mutation, Origin guard, stale revision |
| Dependency audit | 0 known vulnerabilities |
| Standalone Playwright | Blocked before test execution by macOS sandbox Chromium Mach-port permission; not reported as passing |

## In-app browser verification

Performed against the actual local app at http://127.0.0.1:3010 using Codex's browser:

- Entered a fresh isolated synthetic workspace and opened Hostel A.
- Saved cleaning context; observed R05 change to R06.
- Revealed a quiet observation; observed inspection recommendation R07.
- Revealed a reported repair; observed incomplete-comparison recommendation R09.
- Revealed six eligible comparison windows; confirmed 1.70 L/min, pre 648 L / 360 minutes and post 36 L / 360 minutes.
- Changed supply to interrupted; observed `not_comparable` with no positive metric. Restoring comparable supply restored the calculated comparison.
- Changed meter health to suspect; observed `insufficient_evidence` and a meter-health check. Restored supported health and the computed result returned.
- Opened Annex B; its missing endpoint remained visibly missing and its result stayed inconclusive.
- Created a receipt and requested its HTML download. Server returned 200; HTTP smoke independently validated HTML and JSON content.
- Inspected the real case layout at 1440×1000 and 390×844. At 390px, document scroll width equalled viewport width (390). Next check appears before the chart.
- Opened and closed a modal with Escape; focus returned to the About control. Keyboard arrow navigation is implemented for the case tabs.
- Created a separate uploaded workspace, created a meter, and saved 1000.001 L; exact displayed total persisted.

Screenshots were inspected through the in-app browser during these checks. They are not fabricated marketing mockups. No screenshot files are claimed as exported artifacts in this repository.

## Remaining release gates

- No public web deployment or fresh public-browser smoke test has been performed.
- Standalone automated browser suite must run on a host/CI environment that permits Chromium launch. The committed specs remain reproducible there.
- Full 200% zoom, assistive-technology audit, and performance targets have not been measured. Reduced-motion CSS and keyboard primitives are implemented, not certified.
- Cleanup command exists, but a scheduled retention job is not enabled.
- No facilities-user validation, real-site water results, submission video, or event submission has been performed.
- Storage uses transactional workspace snapshots and separate immutable bigint readings rather than every proposed normalized PRD table. Pagination and a full multi-user workflow are not implemented.

These limitations prevent claiming the full PRD's B7/public-release gate as passed.
