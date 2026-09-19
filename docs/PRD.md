# FlowProof
## Product requirements, design.md, backend specification, and build plan

**Tagline:** Find the next useful check. See what changed after the fix.

| Document field | Value |
|---|---|
| Owner | Himanshu Kumar, `himanshu748` |
| Version | 1.0 |
| Prepared | 18 September 2026 |
| Event | NextStep Hacks 2026, Earth Forward |
| Submission cutoff | **21 September 2026, 02:30 IST**, equivalent to 20 September, 21:00 UTC |
| Internal submission target | **20 September 2026, 20:00 IST** |
| Status | Approved direction; implementation specification, not a claim of a working product |
| Primary deliverable | A deployed web application with a complete, judge-accessible investigation |
| Planning assumption | One lead builder, with optional coding-agent assistance; no new hardware dependency |

> **Product thesis:** A suspicious meter reading is not a diagnosis, and a closed maintenance ticket is not evidence that water consumption fell. FlowProof connects readings, the next useful observation, a human inspection, and a transparent follow-up comparison.

This is the complete build contract. It includes product decisions, the visual design system, numerical rules, data and API contracts, security boundaries, acceptance tests, and a submission plan. Features described here are requirements or proposals unless explicitly identified as externally verified facts. All example facilities and measurements are synthetic.

## Contents

1. Product decision and positioning
2. Event requirements and build boundaries
3. Users, jobs, and validation assumptions
4. Scope and functional requirements
5. End-to-end journeys
6. Reading and observation contracts
7. Diagnostic policy: the next useful check
8. Repair comparison and numerical rules
9. design.md: visual and interaction specification
10. Backend architecture and repository structure
11. Database, APIs, and consistency
12. Security, privacy, and assistant boundaries
13. Scenarios, acceptance tests, and evaluation
14. Delivery sequence and release gates
15. Demonstration and submission package
16. Risks, decisions, and deferred work
17. Coding-agent handoff
18. Sources and provenance

---

## 1. Product decision and positioning

### 1.1 What we are building

FlowProof is a water-use investigation workspace for a small facility that can access a cumulative water meter. It helps an operator answer three questions:

1. What does this reading actually establish?
2. What is the next feasible observation that could resolve the uncertainty?
3. After someone reports a repair, what do comparable readings show?

The MVP works from **manually entered or CSV-imported cumulative meter readings**. It does not require a continuously connected sensor, a fourteen-day baseline, or access to an employer's operational systems.

The defining interaction is an evolving case. Adding a cleaning schedule should change the next recommended check. Missing a follow-up reading should prevent a positive repair result. Recording an inspection should update the evidence without rewriting the original readings.

### 1.2 Positioning

**Pitch:** “A water-waste detective for small facilities, from the first suspicious reading to the evidence after a repair.”

**Distinctive execution:** A bounded, inspectable investigation policy that asks for the next useful check, with a repair comparison that preserves unknowns.

**Not a novelty claim:** Leak detection, water-event management, and repair verification already exist commercially. FIDO publicly describes volumetric outcomes and leak-related analysis. FlowProof's proposed distinction is its small-facility workflow, sparse-reading entry point, and inspectable decisions, not the invention of leak detection. [S4]

The phrase “next useful check” is deliberate. The MVP does **not** prove that a check is mathematically optimal or the cheapest possible intervention. Its ordering is a documented product policy.

### 1.3 What success looks like

A judge can open the sample without logging in, identify an unresolved case, understand why the app requests another observation, enter that observation, and see a different evidence-backed recommendation. They can also inspect a reported repair that remains unverified because the necessary data is missing.

The main product metric is **completed evidence journeys**, not alerts generated. A completed journey links a reviewed reading interval, a human action, and a follow-up result, including an honest inconclusive result.

### 1.4 Design principles

- **Decisions before dashboards.** The next action is more prominent than a graph.
- **Observation before diagnosis.** Meter movement is not automatically labelled a confirmed leak.
- **Unknown is a real result.** Missing data is never substituted with zero use.
- **Human actions have a separate record.** A reported repair does not set the analytical outcome.
- **Every quantity is inspectable.** Show units, source readings, observation duration, and assumptions.

## 2. Event requirements and build boundaries

### 2.1 Verified event facts

The event theme is Earth Forward. Its six published judging dimensions are originality, theme adherence, completion, learning, design, and technology. No percentage weighting is assumed. The live Devpost schedule checked on 18 September gives the submission cutoff shown above. Some web caches still display earlier dates; use the live schedule rather than cached snippets. [S1, S2]

Prepare a **3 to 5 minute video**, repository access, a completed Devpost write-up, and a working application link. The submission prose requires a demonstration video, code access, and a live link where applicable. [S1]

Relevant eligibility excerpts are “13 to 24 years old as of August 21st, 2026”, “Groups may have up to 5 members”, and “Students only”. Verify the full rules before submission. [S2]

### 2.2 Build policy

Build this project freshly for the event and disclose any pre-existing scaffolding, dependencies, designs, or reused components. Preserve dated commits and a before/during work log. Do not rely on an assumption that an old finished project is automatically eligible.

Use the owner's domain experience as motivation, not as evidence of a deployment. Do not copy Temflo code, client data, credentials, logos, screenshots, or operational assets without explicit permission. No real facility partnership or pilot may be claimed unless it happened.

Earlier related planning used the working name AfterFlow. **This document replaces conflicting scope decisions for the current build.** In particular, cumulative readings replace the earlier interval-flow input contract; a long historical baseline and a public-network benchmark adapter are not MVP requirements. This is a planning decision, not a statement about the existence or state of any repository. [P1]

### 2.3 Explicit non-goals

No autonomous valve, pump, or equipment control. No exact underground-pipe localization. No water-potability, structural, or public-safety assessment. No carbon credits, carbon-saving estimates, tariffs, billing, marketplace, native mobile app, or fabricated customer traction. No hardware fabrication, satellite processing, multi-agent swarm, vector database, or mandatory paid API.

FlowProof is an investigation aid. Any physical inspection or repair belongs to the facility's authorized maintenance staff. It must never recommend interrupting essential water service to create a convenient test window.

## 3. Users, jobs, and validation assumptions

### 3.1 Primary user

A caretaker or facilities coordinator responsible for a small school building, hostel block, or similar separately metered area. They have legitimate meter access and can review normal water-use schedules.

**Job:** “When water use seems wrong, help me decide what to check and give maintenance a useful brief, without pretending the meter tells us everything.”

### 3.2 Secondary user

An authorized technician who receives a case brief and reports whether they found a problem and what they did. In the MVP, the coordinator records this report in the same workspace. Separate technician accounts, messaging, and public editing links are deferred.

**Job:** “Show me the relevant interval, known context, and unresolved questions. Do not hand me an unexplained risk score.”

### 3.3 Conditions required for a meaningful observation

These are assumptions to validate, not market facts:

| Assumption | Product response when it fails |
|---|---|
| A cumulative meter is accessible and its unit is known | Explain supported inputs; do not invent measurements |
| A safely observable, naturally quiet interval exists for the metered area | Request an inspection or better instrumentation instead of forcing no use |
| The operator can account for cleaning, irrigation, automatic filling, and other demand | Retain unresolved context; do not infer a leak |
| Supply availability and relevant storage behaviour can be described | Block a strong pre/post comparison when unknown or changed |
| The meter has adequate display resolution and can be trusted | Request a meter-quality check; preserve inconclusive results |

EPA's household guidance includes comparing a meter before and after two hours without water use. FlowProof adapts the observation pattern, not a validated campus-diagnostic protocol. Larger facilities, storage tanks, intermittent supply, and automatic equipment require additional context. [S3]

### 3.4 Lightweight validation

Ask one consenting facilities user to attempt three tasks: understand a suspicious interval, identify the next requested check, and explain why a reported repair is not yet verified. Record task completion, confusion, and permissioned feedback. No interview means the submission states “not yet tested with a facilities operator”; it does not substitute invented quotes.

## 4. Scope and functional requirements

### 4.1 P0: required for the hackathon MVP

| ID | Requirement | Acceptance condition |
|---|---|---|
| FP-01 | Isolated sample workspace | A new visitor can start, change, and reset a synthetic case without affecting another visitor |
| FP-02 | Cumulative reading input | Manual entry and bounded CSV preview/commit share the same validation and unit conversion |
| FP-03 | Observation windows | Start/end readings, duration, source, meter epoch, and operating context are inspectable |
| FP-04 | Evidence-aware case review | The app separates data problems, unresolved demand, and movement during a declared no-use interval |
| FP-05 | Next-check policy | A policy-generated action changes when relevant evidence changes; its rule and inputs are visible |
| FP-06 | Inspection and repair records | Human reports are timestamped, attributed, and retained separately from analysis |
| FP-07 | Follow-up comparison | Comparable pre/post windows produce a transparent result; insufficient evidence never produces success |
| FP-08 | Evidence receipt | Export a redacted HTML report and JSON snapshot with inputs, methods, and limitations |
| FP-09 | Responsive, accessible UI | Core journey works with keyboard, at 390px and 1440px, and with a chart-table alternative |
| FP-10 | Reproducible evaluation | Required scenario assertions, numerical tests, and two-session isolation tests run at the release commit |

### 4.2 P1: only after P0 passes

One constrained language-model assistant that explains evidence and drafts the next-check brief; a real consenting-user usability session; an optional CSV export; additional real-data adapters with their own unit contracts.

The product remains fully usable without a model key. In template mode, describe it as a **rules-based investigation assistant**, not an LLM making autonomous scientific discoveries.

### 4.3 Cut order

Cut the language-model integration first, then decorative motion, extra charts, optional exports, and extra scenarios beyond the mandatory suite. Do not cut import validation, context handling, source labels, safe session isolation, numerical traceability, or the missing-reading repair test.

### 4.4 Release targets

These are targets to test, not achieved results:

| Area | Target |
|---|---|
| First experience | Open sample and see its next action within 30 seconds in a fresh-browser usability check |
| Core task | Complete the seeded investigation-to-report journey without setup or a model key |
| Numerical integrity | All reference calculations pass their explicit tolerances |
| Safety of claims | Zero positive repair results in mandatory missing-data, changed-supply, and suspect-meter scenarios |
| UI | No page-level horizontal overflow at 390px; all primary actions reachable by keyboard |
| Deployment | New sample sessions and report generation work in a clean deployed browser session |

## 5. End-to-end journeys

### 5.1 Main demonstration: movement, inspection, follow-up

**Scene A: an unresolved interval.** The synthetic “Hostel A” case shows 216 L across a two-hour interval. It is labelled consumption computed from synthetic readings, not confirmed waste. The app notices that the cleaning schedule is unknown and requests context.

**Scene B: the next action changes.** The operator records that cleaning occurred. The interval stays in the record, but it does not qualify as a no-use check. The policy asks for a new naturally quiet observation rather than closing the issue or diagnosing a leak.

**Scene C: stronger evidence.** The operator selects a complete, valid two-hour no-use observation with supplied context. Movement above the configured display-resolution allowance triggers a human-inspection recommendation. The finding remains suspected loss until a technician report identifies a fault.

**Scene D: repair is reported.** The operator records the technician's report and actual intervention time. The interface changes to “Follow-up needed”, not “Water saved”.

**Scene E: compare only what is comparable.** The sample replay exposes three eligible pre-repair and three eligible post-repair observations on distinct dates. The result shows the source readings and the change between sampled periods. A persistent “Simulated historical replay” label explains the time jumps.

Scene A's cleaning interval is **not** one of the eligible pre-repair windows in the comparison fixture.

### 5.2 Required negative journey: the missing endpoint

A second sample case has a reported repair but no follow-up end reading. FlowProof shows “Not enough evidence” and requests that reading. The chart leaves the gap visible. The report contains no positive reduction result, zero-filled point, or saved-water counter.

### 5.3 Judge changes the evidence

Provide a sample-only scenario control for the explicit facts `scheduledUse`, `supplyComparable`, and `meterHealth`. Changing a value creates a new case revision and reruns the real policy. It must not simply switch between screenshots or predetermined status labels.

Actual imported workspaces use the normal context form and retain its audit events. Simulation controls do not appear there.

### 5.4 Manual reading flow

Choose the meter, enter the displayed total and unit, select the observation time, confirm source and quality, preview the normalized value, then save. When a number is lower than the previous reading, explain the possible reset or data problem before permitting an acknowledged new meter epoch. Do not guess a rollover modulus.

### 5.5 Closing a case

The operator may close a case with a reason such as “inspection completed”, “legitimate use explained”, or “monitoring handed over”. Closing is a workflow event only. An inconclusive analytical result remains inconclusive in the closed case and its report.

## 6. Reading and observation contracts

### 6.1 Supported inputs

The MVP accepts **cumulative totals**, not instantaneous flow or per-interval usage. Supported source units are `L` and `m3`. Reject `L/min`, `m3/h`, billing currency, and unlabelled totals with a specific correction message.

A canonical CSV has these columns:

```csv
meter_id,timestamp,total,unit,quality
hostel-a,2026-09-10T02:00:00+05:30,100000.000,L,valid
hostel-a,2026-09-10T04:00:00+05:30,100216.000,L,valid
```

`timestamp` is the moment the total was observed, not upload time. An explicit UTC offset is required. `quality` is `valid`, `missing`, or `invalid`; `missing` requires an empty total. Preserve the facility's IANA timezone for display and local-window matching. Default to `Asia/Kolkata`, but never infer a timezone from an offset-free timestamp.

### 6.2 Numerical representation

Normalize totals to integer millilitres. Accept up to three fractional digits for litres and six for cubic metres. Use decimal-string parsing and `bigint` arithmetic, not binary floating-point parsing of the source total. Serialize integers as decimal strings in JSON and store them as PostgreSQL `bigint`.

For P0, normalized totals and meter display resolutions must be between zero and `1,000,000,000,000,000` mL, with resolution strictly positive. This explicit cap keeps any permitted millilitre difference below JavaScript's safe-integer limit when converting a derived ratio for charting. Keep subtraction exact before conversion. Display rounding never changes stored quantities or decisions.

Conversions: 1 L = 1,000 mL; 1 m3 = 1,000,000 mL. Derived rates use actual elapsed minutes between timestamps. Timestamps are stored in UTC. A local daypart is derived with the saved IANA timezone, not the server's timezone.

### 6.3 Validation and import behaviour

Limit an upload to **2 MiB**, **5,000 rows**, **5 meters**, and **90 calendar days** of data. Limit text cells to 500 characters and operator notes to 2,000 characters. These are chosen product limits, not provider limits.

Reject non-finite syntax, negative totals, scientific notation, excessive fractional precision, unknown units, malformed timestamps, unsupported meter IDs, and conflicting totals for an identical meter/timestamp. Identical duplicate rows are deduplicated and counted in the preview.

Preview reports accepted rows, rejected rows, warnings, conversions, and date span. Commit is allowed only after every rejected row is corrected or the user explicitly acknowledges exclusion; excluded row numbers remain in the source manifest. Never silently omit a bad row.

A decrease between otherwise valid cumulative totals is a **diagnostic reset/data warning**, not automatically a negative volume. Block any affected window. The user may record a reset/replacement boundary that starts a new `epoch_id`; no comparison crosses epochs. Never automatically repair a reading or infer a rollover.

Hash file bytes, mapping configuration, meter mapping, and parser version for import idempotency within a workspace. Repeated identical imports return the existing import. Corrected readings are append-only revisions with a `supersedes_id`; they invalidate dependent analysis without deleting history.

### 6.4 Sparse measurements are not continuous telemetry

Two valid cumulative endpoints can establish aggregate volume over their interval. They cannot establish the minute-by-minute shape of consumption. Missing intermediate samples do not necessarily invalidate the aggregate, and their absence must not be interpreted as zero use.

The MVP supports sparse observations. It does not apply an interval-sensor “90% sample coverage” rule to two manual readings. Instead, display **endpoint completeness**, **context completeness**, and **meter-health status** separately. An explicit reset or reliability problem inside the interval blocks interpretation until resolved.

### 6.5 Observation window

An observation references two valid readings from the same meter and epoch, plus a versioned context record:

| Field | Values / meaning |
|---|---|
| `phase` | `exploratory`, `pre_repair`, or `post_repair` |
| `start_reading_id`, `end_reading_id` | Exact source records, never inferred endpoints |
| `declared_no_use` | `yes`, `no`, `unknown` |
| `scheduled_use` | `none`, `present`, `unknown` |
| `automatic_use` | `none`, `present`, `unknown`; includes automatic filling and irrigation |
| `supply_status` | `available`, `interrupted`, `unknown` |
| `storage_status` | `stable`, `changing`, `not_applicable`, `unknown` |
| `meter_health` | `supported`, `suspect`, `unknown` |
| `health_evidence_id` | Operator report or other recorded evidence supporting normal meter response |
| `regime_id` | Operator-confirmed operating context used for comparison |
| `context_recorded_by`, `recorded_at` | Attribution and actual record time |

No-use checks default to 120 minutes. Eligible checks are 120 to 240 minutes. This upper bound and the resolution policy are MVP choices, not universal diagnostic standards. Shorter windows can show descriptive consumption but cannot produce the stronger no-use interpretation or comparison status.

An unchanged meter is not automatically broken, but a heartbeat or a repeated zero alone does not prove correct measurement. For a positive repair comparison, require documented support that the meter responded during ordinary legitimate use within 24 hours of each observation, or an authorized meter-health report covering those observations. The app does not instruct the operator to waste water to manufacture this evidence.

## 7. Diagnostic policy: the next useful check

### 7.1 Separate workflow from evidence

Human workflow states:

```text
new -> investigating -> inspection_requested -> repair_reported -> follow_up -> closed
```

A case can return to `investigating` after new evidence, including after closure. Reopening requires an explicit event and does not erase the earlier closure.

Analytical outcomes are a separate enum:

```text
insufficient_evidence
context_unresolved
water_movement_observed
no_movement_above_resolution
observed_reduction
no_clear_reduction
not_comparable
```

Neither enum includes `leak_confirmed`. A technician may separately report `leak_found`, with a description and attribution. That report is human evidence, not an algorithmic diagnosis.

### 7.2 Policy output

Every policy run returns one primary next action, blocking reasons, supporting evidence IDs, and a public rule explanation. Persist the engine version, input revision, and input hash.

```typescript
type NextActionType =
  | 'review_meter_data'
  | 'supply_missing_reading'
  | 'confirm_operating_context'
  | 'plan_no_use_observation'
  | 'check_meter_health'
  | 'request_inspection'
  | 'collect_comparison_evidence'
  | 'review_comparison'
  | 'continue_monitoring';

type PolicyDecision = {
  caseId: string;
  caseRevision: number;
  engineVersion: 'next-check-v1';
  outcome: AnalysisOutcome;
  nextAction: {
    type: NextActionType;
    title: string;
    ruleId: string;
    reason: string;
    requiredFields: string[];
    evidenceIds: string[];
  };
  blockingReasons: string[];
  evidenceIds: string[];
};
```

`AnalysisOutcome` is the analytical enum in section 7.1. All application schemas live in one shared domain module; the frontend and backend must not create independent variants.

### 7.3 Decision order

Apply the following order to the relevant observation or comparison. Higher-priority unresolved blockers win. Within one priority, order by the affected observation start time, then stable ID.

| Rule | Condition | Primary action and analytical treatment |
|---|---|---|
| R01 | Unit, epoch, timestamp, or conflicting-reading problem | `review_meter_data`; insufficient evidence |
| R02 | Required endpoint is missing | `supply_missing_reading`; insufficient evidence |
| R03 | Meter health is suspect or unsupported for the requested interpretation | `check_meter_health`; descriptive totals may remain visible, but stronger claims are blocked |
| R04 | Supply or storage conditions changed across a requested comparison | `confirm_operating_context`; comparison is not comparable |
| R05 | Essential operating context is unknown | `confirm_operating_context`; context unresolved, with no leak inference |
| R06 | An initial interval includes legitimate/automatic use or lacks a usable no-use window | `plan_no_use_observation`; keep the original consumption record, with no leak inference |
| R07 | A pre-repair check is complete, eligible, and shows movement above resolution allowance | `request_inspection`; water movement observed |
| R08 | A pre-repair eligible check shows no movement above allowance | `continue_monitoring`; no movement above resolution, not “leak-free” |
| R09 | Repair is reported, but either eligible comparison group is incomplete | `collect_comparison_evidence`; insufficient evidence; name whether pre or post observations are missing |
| R10 | Repair is reported and eligible comparison groups exist | `review_comparison`; use section 8, never a language-model estimate |
| R11 | No safely observable no-use window exists | `request_inspection`; context unresolved; explain that the simple observation method is unsuitable |

Implementation detail: select the initial-investigation branch or repair-follow-up branch first. R07 and R08 apply only to the initial branch. R09 and R10 apply only to the follow-up branch. A missing pre-repair history cannot be repaired by pretending new observations occurred before the intervention; request available historical evidence or return an inconclusive comparison.

R11 is a feasibility override for R06. If a new observation cannot safely be made, do not repeatedly request it.

### 7.4 Why a recommendation was selected

The case shows a compact explanation such as:

> “Cleaning was recorded during this interval. These readings establish consumption, but not consumption without a known use. Record a naturally quiet observation or request an inspection when that is not feasible.”

An expandable policy panel shows `R06`, relevant facts, and evidence links. It does not expose or simulate private model reasoning. An execution trace lists actual tool calls and returned facts only.

Changing relevant context generates a new policy run. Display “Recommendation updated after context changed” and mark the prior recommendation superseded. Never remove the earlier decision from history.

### 7.5 Actions and human authority

An action has `recommended`, `requested`, `completed`, `cancelled`, or `superseded` status. Requesting an inspection is an **internal work item**, not an email, WhatsApp message, appointment, or equipment command. External communication is outside P0.

Completing a check requires its actual result or a reason it could not be completed. A button click alone cannot create a successful inspection, a repair, or a verified water reduction.

## 8. Repair comparison and numerical rules

### 8.1 What a pair of readings establishes

For cumulative totals `C_start` and `C_end` in litres and elapsed duration `T` in minutes:

```text
volume_litres = C_end - C_start
average_rate_lpm = volume_litres / T
```

Calculate the volume from exact integer-millilitre values. Require `T > 0`, valid endpoints, no unresolved internal reset, and the same epoch. A long interval establishes an interval average, not a constant flow pattern.

For the synthetic 100,000 L to 100,216 L example over 120 minutes:

```text
volume = 216 L
average rate = 1.8 L/min
```

### 8.2 Display-resolution allowance

Let `q` be the meter's declared display resolution in litres. P0 uses a conservative allowance of one display increment per endpoint:

```text
volume_low  = max(0, volume_litres - 2*q)
volume_high = volume_litres + 2*q
rate_low    = volume_low / T
rate_high   = volume_high / T
```

Only classify a no-use check as `water_movement_observed` when `volume_litres > 2*q` and all context and health gates pass. Otherwise use `no_movement_above_resolution`, never “zero leak risk”.

This is a **display-resolution allowance**, not a calibration certificate, a probabilistic confidence interval, or a model of every possible meter error. A suspect meter still blocks interpretation even when a displayed number clears the allowance.

If the meter is too coarse to resolve a useful observation within the 240-minute product limit, explain the limitation and recommend an authorized inspection or better measurement. Do not endlessly extend a check or claim that sub-resolution changes are certain.

### 8.3 Eligibility for a stronger pre/post comparison

All of the following must hold:

- At least **three eligible pre-repair observations on distinct local dates** and **three eligible post-repair observations on distinct local dates**.
- No observation overlaps another selected observation or crosses the actual repair timestamp. All pre observations end before the repair; all post observations start after it.
- Same meter, epoch, declared display resolution, and operator-confirmed operating regime.
- Each selected observation is 120 to 240 minutes, with all durations within 10% of the group's shortest duration.
- Local start times fit within a 30-minute circular clock range, including correct handling around midnight.
- Complete endpoints, no unresolved data warnings, supported meter health, declared no use, no scheduled or automatic use, available supply, and stable or non-applicable storage.

A user may inspect any descriptive pair, but a one-pair comparison returns `insufficient_evidence` for the stronger result. Unknown operating conditions produce `insufficient_evidence`; known changed conditions produce `not_comparable`.

Candidate selection is not manual cherry-picking: choose the three most recent eligible pre-repair observations ending within 14 days before the intervention and the first three eligible post-repair observations starting within 14 days after it. Evaluate cross-group comparability after selection. Show excluded observations and exclusion reasons. A group that fails comparability remains inconclusive; do not search arbitrary combinations for a positive result.

Later observations can trigger a new run using the same selection policy, with explicit supersession. The operator can view other windows descriptively, but cannot silently replace the policy-selected windows in an official receipt.

### 8.4 Comparison method

For selected pre rates `pre_i` and post rates `post_j`:

```text
rate_change = median(pre_i) - median(post_j)

observed_range_low  = min(pre_rate_low_i) - max(post_rate_high_j)
observed_range_high = max(pre_rate_high_i) - min(post_rate_low_j)
```

The range combines variation across the selected observations with the declared display-resolution allowance. Call it an **observed-window comparison range**. It is not a statistical confidence interval or a bound on future consumption.

Outcome selection:

| Outcome | Rule |
|---|---|
| `insufficient_evidence` | Missing history, endpoints, health evidence, or unknown essential context |
| `not_comparable` | Known changed supply, storage, regime, epoch, or incompatible observation timing |
| `observed_reduction` | All gates pass and `observed_range_low > 0` |
| `no_clear_reduction` | All gates pass, but the observed range includes zero or is negative |

Keep negative numbers in the comparison range. Do not clamp them to zero to make a weak comparison look positive. If post-use is higher, say so in descriptive copy while retaining the defined enum.

### 8.5 Mandatory reference fixture

All six observations are synthetic, 120 minutes long, with `q = 1 L`, supported meter health, the same regime, and otherwise eligible context:

| Group | Date | Interval | Start total | End total | Volume | Average rate |
|---|---|---|---:|---:|---:|---:|
| Pre | 10 Sep 2026 | 02:00 to 04:00 IST | 100,000 L | 100,216 L | 216 L | 1.80 L/min |
| Pre | 11 Sep 2026 | 02:00 to 04:00 IST | 101,000 L | 101,204 L | 204 L | 1.70 L/min |
| Pre | 12 Sep 2026 | 02:00 to 04:00 IST | 102,000 L | 102,228 L | 228 L | 1.90 L/min |
| Post | 14 Sep 2026 | 02:00 to 04:00 IST | 104,000 L | 104,012 L | 12 L | 0.10 L/min |
| Post | 15 Sep 2026 | 02:00 to 04:00 IST | 105,000 L | 105,018 L | 18 L | 0.15 L/min |
| Post | 16 Sep 2026 | 02:00 to 04:00 IST | 106,000 L | 106,006 L | 6 L | 0.05 L/min |

The synthetic intervention occurred on 13 September at 12:00 IST. The increases between observation windows represent other ordinary usage, not missing zero-use intervals. The fixture must also contain explicit health-support evidence and context; the table alone does not establish eligibility.

Expected outputs:

```text
pre median                 = 1.80 L/min
post median                = 0.10 L/min
median rate change         = 1.70 L/min
observed-window range      = approximately 1.516667 to 1.883333 L/min
pre sampled volume         = 648 L over 360 minutes
post sampled volume        = 36 L over 360 minutes
outcome                    = observed_reduction
```

Show rates to two decimal places in the main interface and additional precision in the calculation drawer. Compare using unrounded values with documented test tolerances.

### 8.6 Environmental claims and projections

Use the label **“Observed change in comparable no-use periods.”** Clarify that the comparison is consistent with improvement but does not prove the repair caused it or that every leak is fixed.

Keep measured totals, observed rate change, and any hypothetical projection separate. P0 does not display annual savings or carbon savings. An optional explanatory daily projection may only appear in an expanded calculation section, never a hero metric. For example, 1.70 L/min sustained for 1,440 minutes would project to 2,448 L; continuity outside the observed periods is an assumption, not an observed outcome.

### 8.7 Receipt contents

An exported receipt includes case ID, source mode, generated time, analysis revision, algorithm versions, selected and excluded observations, raw endpoint values, units, actual intervention timestamp, recorded context, meter-health evidence, formulas, outcomes, and limitations. Private facility names and free-text notes are redacted by default.

Reports are immutable snapshots. A changed reading produces a new analysis and report, while the old report retains a visible “superseded” relationship. A content hash supports reproducibility; it does not make the report an independently certified environmental audit.

## 9. design.md: visual and interaction specification

### 9.1 Creative direction

**An operational field notebook with the precision of a measuring instrument.** The interface should feel calm, credible, and carefully typeset. Water is expressed through data and a restrained blue accent, not stock photography, floating droplets, or a green gradient.

The core visual motif is an **evidence spine**: a vertical sequence linking a reading, a question, an observation, an inspection, and a follow-up. Each node opens its actual source. This gives the app a recognizable identity without decorative complexity.

Working wordmark: **FlowProof**, in a strong sans-serif, paired with a simple outlined gauge/notebook icon assembled from ordinary UI icons. No generated logo or custom illustration is required for P0.

### 9.2 Semantic tokens

```css
:root {
  --canvas: #F6F5F1;
  --surface: #FFFFFF;
  --surface-muted: #EEEFEA;
  --ink: #172B35;
  --ink-muted: #52646D;
  --border-subtle: #D7DFDF;
  --control-border: #6B7C84;
  --accent: #155E75;
  --accent-soft: #E3F1F4;
  --positive: #176447;
  --positive-soft: #E6F3EB;
  --warning: #865411;
  --warning-soft: #FBF0D9;
  --unknown: #52646D;
  --unknown-soft: #ECF0F2;
  --danger: #A13232;
  --danger-soft: #FCEAEA;
  --focus: #0B6FA4;
  --radius-control: 8px;
  --radius-card: 14px;
  --radius-sheet: 18px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
}
```

Use semantic tokens, not scattered hardcoded values. `--border-subtle` is for decoration, not the sole visible boundary of an input. Validate actual foreground/background pairings in the implemented UI. Normal text must meet 4.5:1 and large text 3:1; applicable non-text controls and state indicators must also meet the relevant accessibility requirements. [S5]

### 9.3 Type, spacing, and surfaces

Use a single readable system sans-serif stack for P0, with tabular numerals for readings and a system monospace for IDs and formulas. No dependency on a downloaded font.

| Role | Size / line height | Usage |
|---|---|---|
| Product/page heading | 28px / 36px, semibold | One clear heading per page |
| Section heading | 20px / 28px, semibold | Case sections and modal titles |
| Primary measurement | 40px / 44px, semibold | At most one main measurement per view |
| Body | 16px / 24px | Instructions, explanations, and forms |
| Dense labels | 14px / 20px | Table labels, metadata, badges |
| Technical identifiers | 13px / 20px | Optional evidence details only |

Desktop page padding is 32px; mobile padding is 16px. Use borders and spacing to separate sections. Shadows are reserved for overlays. Do not wrap every label in a card or fill the screen with equal-sized metric boxes.

### 9.4 Information architecture

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Brief product entry and sample selection | “Explore a sample investigation” |
| `/cases` | Prioritized investigation list | Open the next unresolved case |
| `/cases/[id]` | Complete case workspace | The policy-selected next check |
| `/readings` | Meter readings and import | “Add reading” / “Import CSV” |
| `/reports/[id]` | Authenticated receipt snapshot | “Download HTML” / “Download JSON” |

A small “About this sample” drawer explains source mode, reset, methods, and limitations. No separate marketing site, account-settings centre, or metrics dashboard is required.

### 9.5 Desktop case composition

At 1440px, use a 208px left navigation rail and 32px content padding. Within the remaining area, give the case content roughly two-thirds of the width and the next-check/evidence panel the other third, with a 24px gap. Below 1100px, stack the right panel rather than compressing the chart and form.

The top strip contains the source badge, case ID, meter name, and workflow state. The heading says what is unresolved. The next action and reason must be visible without scrolling.

```text
[FlowProof] [Simulated historical replay]                 [Reset sample]

Cases       Hostel A: investigate overnight use
Readings    216 L observed from 02:00 to 04:00, not confirmed waste
Reports
            Consumption by observation       Next useful check
            [honest interval chart]          Confirm the cleaning schedule
                                             [Record context]
            Evidence spine                   [Why this check?]
            Reading -> Context -> Check      Known / unknown facts
            Inspection -> Follow-up          Source links
```

This is a text layout contract, not an image asset.

### 9.6 Screens and interactions

**Entry screen.** A compact explanation and two controls: “Explore a sample investigation” and “Start with your readings”. Show three specific product steps beneath them. No forced login before the sample. Starting an uploaded workspace explains that this is a temporary prototype workspace and that confidential data should not be uploaded.

**Case list.** Rows contain meter, unresolved question, last observed interval, evidence state, and next action. Order unresolved data-quality blockers first, then inspection requests, then follow-up work. Within a group, use latest updated time and stable ID. Do not rank by fabricated leak probability or extrapolated daily waste.

**Case workspace.** One primary action card, a compact consumption chart, evidence spine, and expandable explanations. A new result highlights the changed evidence node once and announces the update accessibly. Switching tabs must not hide the source-mode badge.

**Observation form.** Split into “Readings”, “Operating context”, and “Review”. Preserve entered values when validation fails. Every `unknown` option is explicit. Do not preselect “no use”, “stable supply”, or “healthy meter”. Show normalized units before save.

**Inspection/repair form.** Collect inspection time, outcome, what was observed, actual repair time where applicable, and who reported it. Never prefill “leak found” or “repair successful”. Recorded time and actual event time are distinct.

**Comparison view.** Show pre and post observations side by side, counts and eligibility reasons, the observed change, and the comparison range. A result that is not comparable foregrounds the reason instead of greying out an unexplained number.

**Receipt.** A clean, print-friendly single-column document. Include a legible source-mode banner, compact source table, formulas, and limitations. Avoid enormous blank space, navigation chrome, and confidential free-text notes.

### 9.7 Charts must match the input

Use interval bars or dots for average consumption by observation. A pair of cumulative endpoints does not justify a smooth minute-by-minute line. The cumulative-reading view uses actual timestamped points and can show a light connecting guide labelled as such, not inferred telemetry.

For repair comparison, use six plotted observation averages with ranges and an intervention separator. Gaps remain gaps. Known legitimate-use intervals use an annotation and are visibly excluded from the no-use comparison.

Every plot has units, local timezone, interval labels, a data-table alternative, and keyboard-accessible details. Tooltips are an enhancement, not the only way to see a value. No dual-axis chart, decorative area fills, animated water counters, or arbitrary confidence gauge.

### 9.8 Mobile, accessibility, and motion

At 390px, replace the rail with three bottom navigation items: Cases, Readings, and About. Put the next action before the chart. Evidence drawers become full-height sheets with close controls, focus containment, and focus restoration. No page-level horizontal scrolling.

Use at least 44px interactive targets as a product design target, visible keyboard focus, real form labels, meaningful headings, and status text in addition to colour. Announce saved readings and changed recommendations with a polite live region. Errors must identify the field and correction; do not rely on a toast.

Target WCAG 2.2 AA in implementation, without claiming certification. Test at 200% text zoom and with reduced motion. Normal transitions are 120 to 180ms; eliminate nonessential motion under `prefers-reduced-motion`. No infinite pulses or simulated agent “thinking” logs.

### 9.9 Required UI states and copy

| State | Required treatment / example |
|---|---|
| No readings | “Add two readings to measure use over an interval.” |
| Missing end reading | “The follow-up is incomplete. Add its end reading before comparing.” |
| Meter quality unknown | “We cannot distinguish low use from a meter problem yet.” |
| Scheduled use present | “Cleaning occurred here. This interval does not establish unexplained use.” |
| Repair reported | “Repair recorded. Follow-up observations are still needed.” |
| Reduction observed | “Lower use was observed in comparable no-use periods.” |
| Incompatible conditions | “Supply conditions changed. These observations are not comparable.” |
| No movement above allowance | “No movement above the meter's display allowance was observed.” |
| Assistant unavailable | “Showing the standard investigation explanation.” |
| Expired sample session | Explain expiry, offer a new isolated sample, never reveal another session's data |
| Server error | Preserve inputs; show request ID and a retry that cannot duplicate the action |

### 9.10 Design review gate

Before release, inspect the implemented entry, case, observation, comparison, and receipt views at 390px and 1440px. Check every negative state, long meter names, large totals, keyboard navigation, and content overflow. Use the actual generated report, not a screenshot mock. Visual polish is incomplete when only the happy path is styled.

## 10. Backend architecture and repository structure

### 10.1 Stack decision

Use one TypeScript application: **Next.js App Router, React, Tailwind CSS, shadcn/ui primitives, PostgreSQL, Drizzle, Zod, Vitest, and Playwright**. Use a small SVG-based observation plot or an already familiar chart library; do not introduce a visualization framework solely for one graph.

Use Next.js Route Handlers as the backend boundary. Pure domain functions own conversions, eligibility, policy, and comparisons. A server-only data-access layer owns authorization and storage. This follows Next.js's documented separation of authentication, session management, and secure data access. [S6]

Pin mutually compatible supported versions when creating the project and commit the lockfile. This document does not assume a particular newest patch version. Do not add a Python microservice, queue, Redis, container orchestration, or vector store to P0.

Deployment target: one web deployment plus one PostgreSQL database. Use an already authorized account. No cloud purchase, resource provisioning, or production configuration change is authorized by this PRD itself.

### 10.2 Data flow

```text
Browser
  -> session + origin + input validation
  -> workspace-scoped application service
  -> PostgreSQL transaction / immutable evidence snapshot
  -> pure reading, policy, and comparison functions
  -> minimal response object
  -> case UI or redacted report

Optional assistant
  -> permitted read-only evidence tools
  -> structured explanation
  -> schema and evidence-ID validation
  -> UI explanation only
```

Keep all numerical calculations on the shared deterministic engine path. The UI formats results; it does not implement a separate comparison algorithm. Client previews can call shared pure converters, but the server must validate and recompute before committing.

### 10.3 Proposed repository structure

These are files to create, not a claim about an existing repository.

```text
app/
  page.tsx
  cases/page.tsx
  cases/[id]/page.tsx
  readings/page.tsx
  reports/[id]/page.tsx
  api/...
src/
  domain/
    types.ts                 # Shared enums, DTOs, evidence and result shapes
    schemas.ts               # Zod schemas at every input boundary
    units.ts                 # Exact decimal strings <-> integer millilitres
    observations.ts          # Endpoint, epoch, duration, context eligibility
    next-check.ts            # Versioned diagnostic policy
    compare-repair.ts        # Selection, comparability, numerical results
    report.ts                # Redacted receipt DTO; no raw HTML from notes
  features/
    cases/                   # Queue, action card, evidence spine, case history
    readings/                # CSV preview and manual-entry components
    observations/            # Context and observation forms
    comparison/              # Pre/post plot, result and calculation details
    reports/                 # Print layout and export controls
  server/
    db/schema.ts
    db/client.ts
    session.ts
    authorization.ts
    rate-limit.ts
    services/imports.ts
    services/cases.ts
    services/analysis.ts
    services/reports.ts
    assistant.ts             # P1 only; template response remains available
  demo/
    scenarios.ts             # User-visible synthetic inputs and replay events
    replay.ts                # Clock/cursor exposes evidence, not fixed outcomes
scripts/
  evaluate.ts
  purge-expired.ts
  smoke-deployment.ts
tests/
  unit/
  integration/
  e2e/
  fixtures/
    reference-repair.json
    cases.ts                 # Typed reference-case and negative-case builders
    expected-outcomes.json   # Evaluator only; never an engine input
docs/
  PRD.md
  METHODS.md
  EVALUATION.md
  BUILD_LOG.md
  SUBMISSION.md
```

### 10.4 Pure function contracts

All referenced types are defined once in `src/domain/types.ts` and validated in `schemas.ts`.

```typescript
parseTotalMl(total: string, unit: 'L' | 'm3'): bigint
measureWindow(window: ObservationInput): WindowMeasurement
assessEligibility(window: ObservationInput): EligibilityResult
chooseNextCheck(snapshot: CaseSnapshot): PolicyDecision
compareRepair(snapshot: CaseSnapshot): RepairComparison
buildReceipt(snapshot: CaseSnapshot, result: RepairComparison): ReceiptDTO
```

`ObservationInput` contains exact source records, context, meter metadata, and the analysis boundary. `WindowMeasurement` returns volume, duration, rates, display allowances, and evidence IDs or explicit blocking reasons. `EligibilityResult` returns eligible/ineligible plus all reasons. `CaseSnapshot` is immutable and revisioned. `RepairComparison` contains outcome, selected/excluded observations, source IDs, method version, and nullable numerical fields. `ReceiptDTO` contains only explicitly shareable fields.

Every function is deterministic for a fixed snapshot and version. No function reads wall-clock time, network data, or hidden scenario labels. Callers pass the relevant analysis boundary explicitly.

### 10.5 Runtime configuration

Required: `DATABASE_URL`, `APP_ORIGIN`, and `NODE_ENV`. Optional P1: a server-only model provider key and model identifier selected from the provider's current documentation. Default assistant mode is `template`.

The repository includes `.env.example` without secrets, setup instructions, migration commands, seed commands, and a documented way to start without a model key. Never publish a provider key or database connection string in the client bundle.

## 11. Database, APIs, and consistency

### 11.1 Storage model

| Table | Essential fields and constraints |
|---|---|
| `workspaces` | `id`, `mode` (`synthetic` or `uploaded`), `created_at`, `expires_at`; one facility per workspace |
| `sessions` | `token_hash`, `workspace_id`, `expires_at`, quota counters; never store the raw session token |
| `meters` | `id`, `workspace_id`, name, timezone, `resolution_ml`, active epoch; workspace-scoped unique name |
| `imports` | `id`, `workspace_id`, source kind, content/mapping hash, parser version, rejected-row manifest |
| `readings` | meter/import IDs, observed UTC time, total mL or null, quality, epoch, source mode, `supersedes_id`; immutable |
| `cases` | workspace/meter IDs, workflow state, revision, created/updated time, optional closure reason |
| `observation_windows` | case ID, endpoint IDs, phase, context snapshot, context revision; no inferred endpoints |
| `actions` | case ID, originating run, action type/status, revision, requested/completed timestamps |
| `case_events` | case ID, actor/session ID, event type, event time, record time, validated payload, sequence number |
| `analysis_runs` | case ID/revision, engine versions, input hash, output JSON, generated time; immutable |
| `reports` | workspace/case/run IDs, redacted snapshot JSON, content hash, created time, supersedes relation |

Use `timestamptz` for observed and event times. Use database uniqueness and foreign keys for workspace/meter relationships and event sequence numbers. Store canonical integer-millilitre values as `bigint`. JSON API responses use strings for those fields.

Source readings are immutable. “Current reading” is the latest acknowledged revision in a supersession chain, not whichever conflicting row arrived last. A new reading revision marks dependent windows/runs stale. Existing reports stay unchanged and show that newer evidence exists.

### 11.2 API contract

All routes except workspace creation require the session cookie. Authorize every referenced object on the server. Successful business results such as insufficient evidence return normal 200 responses, not 500 errors.

| Method and route | Input | Output / invariant |
|---|---|---|
| `POST /api/workspaces` | `mode`, optional sample scenario ID | Isolated workspace, session cookie, entry route |
| `POST /api/demo/reset` | Existing synthetic session, idempotency key | Resets only that workspace to a new revision; uploaded workspaces cannot use it |
| `POST /api/meters` | Name, IANA timezone, source unit, display resolution | Scoped meter and initial epoch; required before importing its readings |
| `GET /api/meters` | Owning session | Scoped meter summaries and metadata |
| `POST /api/meters/:id/events` | Reset acknowledgment or meter-health evidence, event time and source | Versioned meter evidence; invalidates dependent case runs when relevant |
| `GET /api/readings` | Meter ID, bounded date range, cursor | Scoped source readings with revision and quality labels |
| `GET /api/cases` | Cursor and bounded filters | Scoped case summaries and next cursor |
| `POST /api/cases` | Meter ID and initial reviewed interval | New case; no automatic confirmed-leak claim |
| `GET /api/cases/:id` | Case ID | Case snapshot, source labels, current revision |
| `POST /api/imports/preview` | CSV and meter mapping | Valid rows, row errors, warnings, normalization preview |
| `POST /api/imports/commit` | Preview ID and explicit exclusion acknowledgment | Import ID and counts; idempotent by normalized import identity |
| `POST /api/readings` | Meter, total/unit, timestamp, quality, source | Immutable normalized reading and updated affected revision |
| `POST /api/readings/:id/revisions` | Corrected reading and correction reason | New reading linked to the old record; old record retained |
| `POST /api/cases/:id/observations` | Endpoint IDs, phase, full context | Versioned observation and eligibility result |
| `POST /api/cases/:id/events` | Validated inspection, repair, context, reset, closure, or reopening event | Event ID and new case revision |
| `POST /api/cases/:id/actions/:actionId` | Allowed status transition and required result | Updated action with audit event |
| `POST /api/cases/:id/analyze` | Expected case revision | Stored policy/comparison run derived from that revision |
| `POST /api/cases/:id/reports` | Current run ID | Immutable redacted receipt |
| `GET /api/reports/:id` | `format=json` or `format=html` | Authorized snapshot; HTML escapes every dynamic field |
| `POST /api/cases/:id/explanation` | Current run ID; P1 only | Validated optional explanation, never an evidence mutation |

Meter creation is part of the uploaded-workspace entry flow. Once a meter has readings, its unit normalization contract and declared display resolution cannot be silently edited. A correction requires an explicit metadata/epoch event and invalidates affected analysis. Meter-health events include the covered observation period, the basis of the health report, and attribution; a boolean without supporting evidence is insufficient.

Event payloads must be discriminated schemas, not unrestricted JSON. Inspection events carry `observedAt`, `reportedBy`, `outcome`, and `notes`. Repair events carry `actualRepairAt`, `reportedBy`, `inspectionEventId` when available, and `workDescription`. Context updates identify the observation and its prior revision. Reset events identify the meter, boundary time, affected source readings, and acknowledgment. Closure/reopening events require a reason. All IDs must resolve inside the owning workspace.

An import preview expires after 30 minutes. A commit verifies that its mapping and source hash match the preview and that the workspace still owns it.

### 11.3 Revision and retry rules

Require `If-Match` with the latest case revision for case mutations. Stale clients receive 409 with the current revision and a safe reload instruction. Use a transaction to write the mutation, audit event, and revision increment together.

Require an `Idempotency-Key` on creation/mutation POSTs. Repeating the same key and payload in the same workspace returns the original result; reusing the key with a different payload returns 409. Store idempotency records for at least the session lifetime. This may be a small dedicated table created with the schema.

Compute an analysis identity from the case revision, selected evidence IDs/revisions, method versions, and configuration. Concurrent requests for the same identity return the same run. Publish a run as current only when its input revision is still current; otherwise retain it as a historical run.

### 11.4 Errors and bounds

```json
{
  "error": {
    "code": "READING_UNIT_UNSUPPORTED",
    "message": "Use a cumulative total in L or m3, not a flow rate.",
    "fieldErrors": {"unit": "L/min is not supported in this import."},
    "requestId": "request-reference"
  }
}
```

Use 400 malformed input, 401 expired/missing session, 404 for an unknown or inaccessible object, 409 revision/idempotency conflict, 413 oversized upload, 422 semantically invalid evidence, and 429 quota exceeded. Do not reveal whether another workspace owns a guessed object ID.

P0 limits per workspace: 5 meters, 50 cases, 5,000 active reading records, 10 imports, and 100 analysis runs. Set rate limits to 60 reads/minute and 10 mutations/minute per session; imports are limited to 3/minute. Workspace creation also needs a deployment-level abuse limit. Use durable counters or deployment controls, not only in-memory limits that reset across instances.

### 11.5 Performance and observability

Targets on the deployed reference environment: seeded-case interactions below 1 second after initial load; normal analysis below 1 second for the supported dataset; CSV preview below 3 seconds at the 5,000-row limit. Measure and record actual results, including cold starts. Do not market these as an SLA.

Record request ID, operation, duration, result code, source mode, case revision, and method version. Do not log raw readings, notes, credentials, or session tokens. Product events include workspace started, context completed, check requested, repair reported, comparison outcome, and receipt exported. Separate synthetic-demo activity from uploaded-data activity.

## 12. Security, privacy, and assistant boundaries

### 12.1 Temporary-session model

P0 uses isolated temporary workspaces, not a production multi-user facility-management service. Generate a cryptographically random 32-byte session token; store only its hash. Send the token in an HttpOnly cookie, Secure in production, with SameSite=Lax. Enforce a 14-day absolute expiry server-side. This temporary lifetime permits a multi-day observation journey; a fresh import can also review historical evidence immediately.

Check Origin on unsafe requests against `APP_ORIGIN`, reject cross-origin mutation requests, and retain normal authorization checks. Do not use possession of a guessed workspace ID as authority. Centralize session and object ownership checks in the data-access layer. [S6]

Disclose the prototype's temporary storage before accepting uploaded data. In P0, invite only non-confidential data. Schedule deletion of expired workspace data with a purge job; target deletion within 48 hours after expiry and record whether the job is actually enabled. Access expiry must be enforced even when cleanup is delayed. A fresh visitor always gets a new sample, never an abandoned user's workspace.

The public application should remain available through judging and for at least 14 days after the scheduled results date. This is an operational release requirement, not a promise that this document has deployed anything.

### 12.2 Input and export protections

Accept file bytes, not arbitrary user-supplied URLs. Reject unsupported uploads by content and schema. Escape HTML and render notes as plain text. Do not execute spreadsheet formula strings. Any optional CSV export must neutralize formula-leading cells. Use safe download headers and filenames.

Reports require the owning session. There is no public bearer-link sharing in P0. Users may deliberately download and share the redacted report. Redaction is explicit field selection, not a prompt asking a model to remove secrets.

### 12.3 Optional assistant contract

P1 may add a single read-only tool-using assistant with `get_case_evidence`, `get_policy_decision`, and `get_calculation_details`. Tool handlers enforce session scope. The assistant receives only normalized facts needed for the selected case, never all workspace data.

The response schema contains `summary`, `nextActionExplanation`, and `evidenceIds`. Validate every ID against the supplied evidence set. Quantities, statuses, and selected action IDs are rendered directly from deterministic DTOs rather than copied from model prose.

Limits: one explanation request at a time, at most four tool calls, an eight-second application timeout, and ten explanation requests per workspace per day. There is no repeated autonomous retry after a timeout. Missing key, timeout, invalid schema, or invented evidence ID returns the standard template without breaking the core journey.

Treat readings, notes, CSV text, and technician descriptions as untrusted content, not instructions. The assistant cannot change evidence, bypass eligibility, declare causality, confirm a leak, send a message, close a case, or operate equipment. Never present a template fallback as a successful model run.

## 13. Scenarios, acceptance tests, and evaluation

### 13.1 Required sample scenarios

| Scenario | Essential variation | Expected behaviour |
|---|---|---|
| A. Cleaning ambiguity | Initial consumption includes scheduled cleaning | Requests another suitable observation; does not infer leakage from that interval |
| B. Observed improvement | Section 8.5 reference inputs and complete context | Computes the specified rate change and comparison range |
| C. Missing follow-up | Post-repair endpoint missing | Insufficient evidence; requests the exact missing input |
| D. Supply changed | Lower readings after an interruption | Not comparable; no positive improvement claim |
| E. Meter reset | Cumulative counter decreases across a proposed window | Blocks that window and requests data/epoch review |
| F. Unresponsive meter | Repeated total after repair; meter health suspect | Insufficient evidence, not zero consumption or repair success |
| G. No clear improvement | Eligible pre/post values overlap | No clear reduction |
| H. No safe quiet window | Continuous essential demand | Requests authorized inspection instead of an unsuitable no-use test |

A scenario consists of readings, context, human events, and the replay boundary. The engine never receives the expected label. Advancing the replay reveals more evidence; it does not hardcode the next analytical result.

### 13.2 Acceptance matrix

| Test | Required assertion |
|---|---|
| T01 | `1 m3` normalizes to `1000000` mL and `1.001 L` to `1001` mL |
| T02 | A 216 L difference across 120 minutes gives 1.8 L/min |
| T03 | Equivalent explicit-offset timestamps resolve to the same UTC instant |
| T04 | Missing endpoints never become zero-valued readings |
| T05 | Negative totals, rate units, excess precision, and timezone-free timestamps are rejected |
| T06 | A decreasing cumulative counter cannot produce a positive comparison across its boundary |
| T07 | Duplicate imports and duplicate mutation retries add no duplicate evidence or events |
| T08 | Explicit row exclusions remain visible in the import manifest |
| T09 | Unknown cleaning context requests context; supplied cleaning changes the recommendation |
| T10 | Unsupported meter health blocks strong no-use and repair interpretations |
| T11 | A two-reading sparse interval is not rejected merely because it lacks intermediate telemetry |
| T12 | Resolution allowance uses both endpoints; exactly `2*q` does not pass the movement threshold |
| T13 | Section 8.5 returns 1.70 L/min and the 1.516667 to 1.883333 range within 0.000001 |
| T14 | One eligible pre/post pair remains insufficient for the stronger comparison |
| T15 | Windows cannot straddle the repair or use observations outside their side of it |
| T16 | Changed supply/storage/regime returns not comparable |
| T17 | Zero or repeated totals with suspect meter health cannot yield observed reduction |
| T18 | Overlapping windows, non-distinct dates, mismatched timing, and epoch changes fail their gates |
| T19 | Candidate selection is reproducible and does not seek whichever combination makes savings positive |
| T20 | A reported repair or closed case does not mutate the analytical outcome |
| T21 | New evidence increments revision; old reports remain immutable and are marked superseded |
| T22 | A stale mutation returns 409 and a duplicate identical retry returns the original result |
| T23 | Workspace A cannot read or mutate any object belonging to Workspace B, including exports |
| T24 | HTML/script-like notes render as text; prompt-like notes cannot change policy |
| T25 | Sample reset affects only its session; uploaded workspaces cannot use sample reset |
| T26 | Expired sessions cannot access retained data, even before physical cleanup |
| T27 | Model absence, failure, or invalid evidence IDs leaves the deterministic workflow usable |
| T28 | Altering hidden scenario labels cannot change engine output |
| T29 | At 390px and 1440px, the complete journey has no clipping or page overflow |
| T30 | Keyboard, 200% zoom, reduced-motion, and chart-table paths work |
| T31 | Receipt totals reconcile with source readings, and sensitive notes are excluded |
| T32 | Fresh deployed-browser sample-to-report journey works without secrets or local state |

T27's model-failure branches become required if P1 assistant code is shipped. Template-only P0 still requires the no-model path.

### 13.3 Evaluation protocol

Create a seeded scenario generator with 20 development seeds and 20 separately fixed evaluation seeds. Vary volumes, display resolutions, context unknowns, interval lengths, timestamps, interruptions, and endpoint omissions. Keep expected truth in evaluator-only files.

Publish a table of expected versus actual outcomes, next-action agreement, invalid-window acceptance rate, unsupported positive-comparison count, and deterministic replay agreement. These are prototype scenario metrics, not real-world leak-detection accuracy.

The release gate is zero failures in the claim-safety assertions and all mandatory reference tests passing. Publish any other failed scenario. Do not change the held-out seeds or omit inconvenient cases after seeing results.

Compare the policy with a deliberately naive baseline that labels any positive interval usage a leak and any lower post-reading rate a successful repair. This comparison demonstrates handling of known confounders in the supplied scenarios; it does not establish superiority over commercial products.

### 13.4 Tests to write first

The following is a contract example for the planned tests, not a claim that application code already exists:

```typescript
import { describe, expect, it } from 'vitest';
import { parseTotalMl } from '../../src/domain/units';
import { compareRepair } from '../../src/domain/compare-repair';
import { referenceRepairCase, withMissingPostEndpoint } from '../fixtures/cases';

describe('FlowProof claim boundaries', () => {
  it('converts cumulative totals exactly', () => {
    expect(parseTotalMl('1', 'm3')).toBe(1000000n);
    expect(parseTotalMl('1.001', 'L')).toBe(1001n);
  });

  it('does not turn a missing follow-up into improvement', () => {
    const result = compareRepair(withMissingPostEndpoint(referenceRepairCase()));
    expect(result.outcome).toBe('insufficient_evidence');
    expect(result.rateChangeLpm).toBeNull();
  });

  it('reproduces the reference comparison', () => {
    const result = compareRepair(referenceRepairCase());
    expect(result.outcome).toBe('observed_reduction');
    expect(result.rateChangeLpm).toBeCloseTo(1.7, 6);
    expect(result.observedRangeLowLpm).toBeCloseTo(1.516666667, 6);
    expect(result.observedRangeHighLpm).toBeCloseTo(1.883333333, 6);
  });
});
```

Implement `referenceRepairCase()` from the full section 8.5 fixture including context and health evidence. Implement `withMissingPostEndpoint()` by removing a selected post-window endpoint, not by changing an expected label. Define nullable numeric fields exactly as shown in `RepairComparison`.

### 13.5 Evidence manifest

At release, record the commit, runtime and package versions, test commands and exit codes, dataset seeds/hashes, scenario results, deployment URL, and screenshots from the actual application. State which validations were not performed. A PRD, test file, or screenshot alone is not evidence that a test passed.

## 14. Delivery sequence and release gates

### 14.1 Execution order

This is the dependency order for the build, not an estimate of how quickly a future agent will finish. Implement one complete vertical slice before extending the scenario set. Each stage starts with its relevant failing tests, then the minimum implementation, then targeted verification and a small commit.

| Stage | Files / owner | Deliverable | Gate |
|---|---|---|---|
| B0. Contracts and foundation | Lead: shared types/schemas, app setup, database schema, lockfile | One source of truth for units, states, result shapes, and environment setup | Empty app builds; schema constraints and test runner work |
| B1. Readings and fixtures | Domain owner: `units.ts`, import service, fixtures | Exact conversions, source provenance, CSV preview, reference case | T01 to T08 pass |
| B2. Observation and policy | Domain owner: `observations.ts`, `next-check.ts` | Eligibility and a recommendation that changes with evidence | T09 to T12 and initial scenario policies pass |
| B3. Repair comparison | Domain owner: `compare-repair.ts`, evaluator | Reference calculation and negative comparison outcomes | T13 to T20 pass |
| B4. Persistence and isolation | Backend owner: session, authorization, services, routes | Retry-safe state changes and independent guest sessions | T21 to T26 pass |
| B5. Core UI | UI owner: case, observation, reading, comparison features | Sample-to-receipt journey using actual APIs and calculations | Complete journey works without a model |
| B6. Report and polish | UI/backend owners: receipt DTO, report service and layout | Redacted immutable export; all empty/error/unknown states | T29 to T31 pass |
| B7. Release verification | Lead/reviewer: evaluation, deployed smoke, source audit | Tested release commit and submission assets | T27, T28, T32 and full suite pass |
| B8. Optional assistant | Only after B7; `assistant.ts` and tool adapters | Evidence-grounded explanations with safe fallback | Model failure and injection cases pass again |

A solo builder performs these sequentially. Coding agents may work on independent domain, UI, and backend modules after B0, but one owner controls shared schemas and migrations. The UI may use shared fixtures temporarily; final acceptance must use the real API. Do not merge independent versions of the calculation logic.

### 14.2 Calendar checkpoints

| Date in IST | Planned checkpoint |
|---|---|
| 18 September | Lock scope and contracts; complete exact readings, the reference fixture, and policy/comparison tests |
| 19 September | Integrate storage and UI into the full journey; run isolation and negative scenarios |
| 20 September, before 16:00 | Deploy, evaluate the release candidate, fix blocking failures, capture screenshots |
| 20 September, before 20:00 | Record and upload the video, complete the project page, verify public links, submit |
| 21 September, 02:30 | Official submission cutoff, not the intended upload time |

The source dates reflect the live schedule checked for this document. Recheck the event before the final submission. [S2]

### 14.3 Required project commands

Provide these scripts in `package.json`, with matching documentation. They are required implementation outputs, not commands that were executed while writing this PRD.

```bash
npm ci
npm run db:migrate
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run evaluate
npm run build
```

Integration tests must use a dedicated disposable test database, not development or production data. Browser tests must seed independent workspaces and clean up only their own fixtures. Evaluation writes machine-readable results and a human-readable summary.

### 14.4 Completion gate

The project is ready to submit only when its public deployment, source, demonstration, methods, and recorded test results agree. There must be no buttons that simulate a successful backend action, no sample that leaks into an uploaded-data report, and no claim that a document's proposed targets were measured outcomes.

## 15. Demonstration and submission package

### 15.1 Four-minute video plan

| Time | What the viewer sees |
|---|---|
| 0:00 to 0:20 | The operator's problem and persistent synthetic-data disclosure |
| 0:20 to 1:00 | A suspicious interval; cleaning context changes the requested check |
| 1:00 to 1:40 | An eligible no-use observation and evidence-linked inspection request |
| 1:40 to 2:10 | A technician report and repair record; follow-up remains required |
| 2:10 to 2:50 | Historical replay reveals eligible comparison windows and the reproducible result |
| 2:50 to 3:20 | Missing-endpoint or changed-supply case correctly refuses a positive result |
| 3:20 to 3:45 | The source receipt, calculation details, and actual evaluation results |
| 3:45 to 4:00 | One real implementation lesson and the limitations of the current prototype |

Do not imply that multiple days passed live during the recording. The replay control and observation dates should make the timeline obvious.

### 15.2 Project-page narrative

**Inspiration:** Explain the practical gap between seeing abnormal operational data and knowing which observation to collect next. Prior operational-dashboard experience can motivate the question, with no implication of client endorsement.

**What it does:** Describe the reading-to-investigation-to-follow-up journey, including its inconclusive outcomes.

**How it was built:** Describe actual implemented components and the deterministic/model boundary. Include the cumulative-total contract and why a smooth telemetry plot would be misleading.

**Challenges:** Discuss genuine implementation difficulties such as resets, sparse inputs, comparable windows, and distinguishing human reports from numerical outcomes.

**What was learned:** Use actual experiments and test failures. Do not invent a learning story before building.

**Limitations:** Synthetic evaluation unless actual data was used with permission; no calibrated leak probability, exact localization, causal repair proof, or certified environmental audit.

### 15.3 Submission assets

- Public or judge-accessible repository, deployed application, and a 3 to 5 minute video.
- README with setup, supported input examples, test commands, and known limitations.
- `METHODS.md`, actual `EVALUATION.md`, dated `BUILD_LOG.md`, source/licence notes, and a release commit.
- Actual application screenshots of the main case, missing-evidence state, comparison, and receipt.

Map the submission story to the six published judging dimensions through demonstrated behaviour, not a self-assigned score. The event's general requirements do not imply that a particular implementation is guaranteed to place. [S1]

## 16. Risks, decisions, and deferred work

| Risk | Mitigation / decision |
|---|---|
| Product looks like a generic dashboard | Put the changing next-check recommendation and its evidence at the centre |
| Most accessible data is sparse | Start with cumulative readings; do not require hourly sensor exports |
| No-use assumptions are wrong | Explicit context, supply/storage questions, and an inconclusive path |
| A stuck meter looks like a repaired leak | Independent meter-health evidence; missing or suspect data blocks a positive result |
| Too few comparable observations | Show a descriptive exploratory comparison without the stronger outcome |
| Data depends on an employer | Use original synthetic fixtures or properly permissioned data |
| The assistant invents certainty | Deterministic calculations and statuses; bounded explanations only |
| Build scope expands | Preserve P0; cut the assistant and extra integrations first |
| Deployment access or budget is unavailable | Prove a local build early; use an authorized hosting path; disclose a deployment blocker instead of faking a live link |
| Current competitors cannot be inspected | Do not claim a rank, win probability, or absence of similar projects |

After the event, worthwhile extensions include authenticated long-lived facility workspaces, real operator validation, richer meter reliability models, and a separately specified adapter for interval-flow telemetry. Each needs its own data contract and validation; none should be partially hidden inside P0.

The next research question is whether real operators find the requested checks feasible and whether those checks reduce wasted investigation effort. This PRD does not assume that question has already been answered.

## 17. Coding-agent handoff

Copy the following together with this file into the coding workspace. Naming a document without supplying it is not sufficient.

```text
Build FlowProof from the attached FLOWPROOF_PRD.md as the product, design,
backend, numerical, security, and acceptance-test contract.

First inspect the actual repository. Do not assume proposed paths exist.
Preserve unrelated work and record the starting commit. Create a fresh project
only when there is no existing implementation to extend. Check current official
framework documentation, choose compatible supported package versions, and
commit the lockfile.

Implement P0 in the dependency order in section 14. Define shared schemas first.
Write and run failing tests for units, observations, policy, comparison, and
workspace isolation before implementing their behaviour. Build one real vertical
slice from readings through a receipt before adding optional features.

Use cumulative totals in L or m3, normalized exactly to integer millilitres.
Do not reuse an interval-flow schema or require fourteen days of baseline data.
Do not interpolate missing endpoints. Respect meter epochs, operating context,
meter-health gates, comparison selection, and the distinction between a human
repair report and an analytical outcome.

Build the interface from section 9, with actual API-backed state transitions.
Keep the next useful check above the chart. Display persistent source-mode labels.
Do not render sparse readings as continuous sensor telemetry. Include empty,
error, unknown, stale, expired-session, and superseded-report states.

The core must work without a model key. The optional assistant can explain
permitted evidence but cannot change measurements, eligibility, selected actions,
results, or equipment. Never simulate a successful model call.

Run the actual commands and save their results at the release commit. Publish
honest evaluation outcomes, including failures. Confirm the deployed journey in a
fresh browser. Do not mark tests passed merely because test files exist.

Do not use employer assets, confidential data, fake testimonials, invented field
pilots, fabricated water savings, or unsupported win probabilities. Do not buy
services, provision paid resources, contact people, operate equipment, register,
or submit on the owner's behalf without appropriate authorization.

Deliver source, working deployment where authorized, methods, real evaluation,
screenshots, and a concise release summary listing remaining limitations.
```

## 18. Sources and provenance

Source facts and proposed product decisions are separate. References below support the event facts, the basic meter-observation pattern, prior art, and selected implementation/accessibility guidance. They do not validate FlowProof's proposed numerical policy or establish field effectiveness.

**[S1] NextStep Hacks 2026 overview, rubric, and submission requirements.** Official overview: `https://nextstep2026.devpost.com/`. Live Devpost connector calls `get_hackathon_overview` and `get_submission_requirements` checked on 18 September 2026; rubric also checked in the current research. Use the prose requirements when structured deliverable flags conflict with that prose. The web index still exposed an old event-date snapshot.

**[S2] NextStep exact schedule and formal rules.** Official rules: `https://nextstep2026.devpost.com/rules`. Live connector `get_key_dates` checked 18 September 2026, returning `submissions_end_at=2026-09-20T21:00:00Z`; `get_hackathon_rules` checked the same day. The IST conversion is 21 September, 02:30. Event-period/reuse language should be read in full before submission.

**[S3] US EPA WaterSense, Fix a Leak Week.** `https://www.epa.gov/watersense/fix-leak-week`. Consulted 18 September 2026. Supports the household before/after two-hour no-use meter observation. It does not validate FlowProof's campus assumptions, resolution allowance, sample-count rules, or repair-comparison method.

**[S4] FIDO, FIDO AI.** `https://fido.tech/fido-ai/`. Consulted 18 September 2026 as primary-source commercial prior art. Product claims are the vendor's descriptions, not independently tested findings about competitor performance.

**[S5] W3C WAI, Understanding WCAG 2.2 contrast and target-size criteria.** `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html` and `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum`. Consulted 18 September 2026. FlowProof's 44px interaction target is its own design target, not a claim that every WCAG 2.2 AA target must be 44px.

**[S6] Next.js, authentication and authorization guidance.** `https://nextjs.org/docs/app/guides/authentication`. Consulted 18 September 2026. Supports centralizing secure authorization checks and returning minimal data. Pin actual framework versions and consult their corresponding documentation when implementing.

**[P1] Earlier internal planning.** Library document `NEXTSTEP_AFTERFLOW_PRD.md`, version 1.0, dated 16 September 2026. Used for continuity and failure-case lessons only. This FlowProof document overrides conflicting earlier plans; neither specification is evidence of implementation.

---

**Final product test:** Can an operator see what is known, understand what is still missing, take a useful next step, and inspect the evidence after an intervention? Every P0 feature should serve that journey.