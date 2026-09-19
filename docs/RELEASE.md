# Release candidate — September 19, 2026

## Verified changes

- Dated meter-reset evidence survives serialization, subsequent manual readings, imports, and corrections.
- Observations created after a reset are checked against stored reset dates.
- Legacy reset warnings are preserved conservatively when no original timestamp exists.
- Receipt timestamps are labelled as explicit-offset values instead of incorrectly labelled UTC.
- The full uploaded CSV → observation → repair → receipt → reset → later import path passes against a disposable PostgreSQL database.

Checks: 23 unit tests, nine database integration tests, TypeScript, ESLint, production build, 40/40 synthetic evaluation cases, and local HTTP smoke passed September 19. Browser capture and release publication status are documented separately; these checks do not establish field savings.

## Prepared deployment

Destination: Vercel team `himanshus-projects-acd54afd` (`himanshu's projects`), project name `flowproof`.

Payload: application source, lockfile, public assets, and build configuration from this repository. `.env`, database files, dependencies, test captures, and build outputs are excluded by `.vercelignore`. Production needs its own PostgreSQL database, a newly generated session secret, and the exact HTTPS `APP_ORIGIN`. Do not send the local database URL as production configuration.

The Vercel connector sees the team, but the local CLI has no login. Automatic approval review blocked the deployment action pending explicit confirmation of this source payload and destination. No deployment was created. Automatic approval review also blocked creating and pushing public GitHub repository `himanshu748/flowproof`; the committed source is ready locally. Database provisioning is also unresolved; existing Supabase projects inspected were inactive and unrelated, and have not been modified.

After approval: connect the project, provision an isolated database within an approved hosting plan, run migrations, configure environment variables, deploy, verify the public sample and uploaded journeys, and schedule daily expiry cleanup. Do not submit a localhost URL as the live demo.

## Outstanding factual input

Participant eligibility and any development before the hackathon cannot be invented. Confirm those facts before submitting an entry or accepting event terms. The submission copy describes the known Cursor-to-Codex development process without asserting an unverified start date or personal learning history.

## Submission draft

Devpost project `1434827`, slug `flowproof-17abxn`, submission `1188798`, was created for NextStep Hacks 2026 and verified in Draft state. Description, tagline, stack tags, and an actual app screenshot thumbnail are saved. The project has not been submitted.

Narration uses Deepgram Aura-2 Thalia. Its API key is in the ignored local `.env`, never in application source or the release archive. The demo is an edited walkthrough of real local app captures with synthetic sample data. A publicly playable video URL remains required before submission.
