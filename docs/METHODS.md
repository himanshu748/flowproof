# Methods

Source contract: recovered `PRD.md`, sections 6–8. Engine versions: `next-check-v1`, `comparison-v1`, CSV parser `csv-v1`.

Cumulative decimal strings are normalized using bigint arithmetic to millilitres. L accepts three fractional digits; m3 accepts six. Values are capped at 10^15 mL. Source subtraction is exact before conversion to charting numbers. Timestamps must include an explicit offset. Missing readings are null, never zero.

Volume is end minus start. Average rate is volume divided by actual elapsed minutes. With display increment q litres, the two-endpoint allowance is ±2q litres, lower volume clipped at zero. This allowance is not a confidence interval or calibration assessment.

Eligibility requires 120–240 minutes, complete valid endpoints, same meter/epoch, declared no use, no scheduled or automatic use, available supply, stable/non-applicable storage, an operating regime, attribution, and supporting meter-health evidence covering the interval. Internal decreases and resets block observations. Ordinary sparse two-endpoint intervals are supported.

Comparison selects the three most recent eligible pre-repair windows within 14 days and first three eligible post-repair windows within 14 days. Each group needs distinct local dates. No selected window overlaps or straddles the intervention. Meter, epoch, resolution, regime, storage and timezone must match; elapsed durations differ by no more than 10%, and circular local start-time range is at most 30 minutes.

Median rate change = median(pre) − median(post).

Observed-window low = min(pre low rates) − max(post high rates).

Observed-window high = max(pre high rates) − min(post low rates).

Only a positive lower range endpoint produces `observed_reduction`; otherwise eligible comparisons produce `no_clear_reduction`. Missing/unknown evidence produces `insufficient_evidence`; changed operating conditions produce `not_comparable`. Human workflow closure and reported repairs do not overwrite analytical outcomes.

Reference calculation: 648 L over 360 sampled pre minutes and 36 L over 360 sampled post minutes. Medians: 1.80 and 0.10 L/min. Change: 1.70. Range: 1.516666667–1.883333333 L/min.

Results apply only to the sampled periods. They do not prove a repair caused the change, diagnose every leak, or quantify annual savings. There is no model-generated numerical inference.

Conservative case-level gate: unresolved missing, invalid, or unsupported non-exploratory evidence blocks a positive receipt even when three other eligible windows exist. Resolve or revise that evidence first; an extra unresolved observation cannot silently disappear from the claim.
