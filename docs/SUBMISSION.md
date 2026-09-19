# FlowProof

Find the next useful water-use check, then see what changed after a repair.

## Inspiration

Saving water is a must. A caretaker who sees a meter move overnight still has to work out what happened: cleaning, a tank filling, ordinary use, or a fault. A pair of readings alone cannot answer that question.

FlowProof helps turn those readings into an investigation. It keeps the missing context visible, suggests the next useful check, and compares suitable observations after a reported repair.

## What it does

Start with cumulative meter readings entered by hand or uploaded as CSV. Record the conditions around an observation, including scheduled use, supply, storage, and meter health. FlowProof then suggests a check based on the evidence available.

After a repair, it compares eligible observations before and after the intervention. Each result has source readings, selection rules, and a downloadable receipt. Missing readings and meter resets can block a conclusion. The sample journey is clearly labelled synthetic.

In that sample, the median rate drops from 1.80 to 0.10 litres per minute across selected two-hour observations. That is a demonstration of the calculation. It is not a measured water-saving claim, and it does not prove the repair caused the change.

## How it was built

The application uses Next.js, React, TypeScript, PostgreSQL, Drizzle, and Zod. A deterministic domain engine handles exact cumulative totals, observation eligibility, next-check decisions, repair comparisons, and receipts. It needs no model API key to run.

Totals are converted to integer millilitres before subtraction. Database transactions serialize workspace changes, revisions catch stale edits, and idempotency keys make retries safe. Temporary sessions isolate investigations. Receipts preserve the evidence as it stood when they were created, while later changes mark them superseded.

Cursor and Codex assisted development. FlowProof did not exist before August 21, 2026. The requirements, implementation, verification, and demo were developed during the hackathon period. The demo uses Deepgram Aura-2 Thalia narration over real application captures.

## Challenges

The hardest part was deciding when the evidence supports a comparison. Supply changes, missing endpoints, meter resolution, and different operating conditions can make an attractive number misleading.

A review also found a reset-handling bug: a later reading could clear a reset warning and restore a positive comparison. The fix retains dated reset evidence and checks it again whenever readings or observations change. Regression tests cover imports, corrections, and observations added after the reset.

## What the build taught us

Sparse endpoints tell us how much water passed during an interval. They do not establish continuous leakage. Missing data must stay missing, and a reported repair must remain separate from a measured change.

The reset regression also showed why a successful sample journey is insufficient. Tests need sequences of edits, imports, and corrections that challenge an earlier conclusion.

## What works now

The live application supports manual readings, CSV previews, contextual observations, reported repairs, gated comparisons, and HTML/JSON receipts. Verification includes 25 unit tests, nine database integration tests, and 40 synthetic evaluation cases. The synthetic suite checks defined scenarios; it is not a field accuracy benchmark.

## What's next

Test the workflow with a caretaker using non-confidential readings. Measure whether the suggested checks help them resolve uncertainty, reduce unnecessary inspections, and collect useful follow-up evidence. Any future water-saving claim should come from a documented field evaluation.

## Try FlowProof

- Live app: https://flowproof-mu.vercel.app/
- Source: https://github.com/himanshu748/flowproof
- Demo: https://youtu.be/WrlLPeW0DG8
