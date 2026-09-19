# Build log

## 19 September 2026

- Starting repository: `/Users/himanshujha/Projects/flowproof`, branch main, no commits and no implementation files. Cursor held the approved PRD in its local conversation storage. Recovered the original user specification into `docs/PRD.md`; did not copy other project conversations into this repository.
- Used the supplied section 9 design direction. No generated mockups, employer assets, or externally supplied facility data.
- Implemented the deterministic engine, manual reading and CSV paths, context/health evidence, observation revisions, human reports, sample replay, receipts, and temporary session backend.
- Initial tests caught an unpadded sample date; corrected the fixture. Database integration/browser checks caught JSON and Date serialization differences between Drizzle and direct postgres.js queries; made raw SQL values explicit strings and retained regression coverage.
- The first evaluation run incorrectly kept post-volume constant while scaling pre-volume in the intended no-change fixture. Corrected the generator so that the same per-window volume is used on both sides. Seeds and expected labels were unchanged. The subsequent 40-case run passed; this correction is disclosed rather than presenting the initial evaluation as clean.
- Local PostgreSQL cluster initialization was blocked by sandbox shared-memory restrictions. Created a dedicated `flowproof_codex` database on the already-running PostgreSQL 16.14 service.
- Playwright CLI wrapper did not expose an executable. The standalone Playwright test runner could not launch Chromium due to macOS Mach-port sandbox restrictions. Used Codex's in-app browser for the actual desktop/mobile journey and kept the automated suite for a normal local/CI environment.
- Initial newest Vitest used a native bundler binding unavailable here. Pinned compatible Vitest 4.1.11; final dependency audit reports no known vulnerabilities.
- Public deployment and submission are not performed. No paid services were provisioned and no messages were sent to third parties.
