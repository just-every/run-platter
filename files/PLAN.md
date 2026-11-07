# Plan: sx-platter-ci-critical-path-1

1. Establish fleet identity, decrypted-bundle Git authentication, preserved repository hooks, and separate report transport.
2. Check matching cloud/sx-platter-ci* refs before edits. Compare commit timestamps against the two-hour custody window; stop for a live writer.
3. Read current-main Verify, its dispatcher, package entrypoints, and repository landing/source-lock instructions. Inspect failed run 42304206419 and a recent green main Verify once each.
4. Measure the current lifecycle partition locally on the exact pinned Node runtime. Preserve its actual per-test timings. Derive one rebalance from those timings and the hosted job durations; retain at most eight shard jobs, all assertions and journeys exactly once.
5. Centralize product/site builds and non-browser checks in one core job; transfer compiled output to dependent jobs so browser partitions consume one build. Preserve plan, concurrency, fail-fast policy, ubuntu-24.04, default full verification, hosted-output and hydration checks.
6. Produce a complete before/after test/journey assignment table using the actual dispatcher commands and TypeScript AST names, checking equal occurrence counts and unchanged assertion-bearing source files. Validate YAML and dependency/artifact wiring.
7. Run touched checks and newly moved groups, regenerate the documented source lock last, and run its check. Commit only allowed workflow/dispatcher/lock files with fleet identity and active hooks.
8. Inspect every candidate identity and trailer, push the named product branch through the cloud push guard, discover exact-SHA Verify via REST, then poll at most once per 300 seconds within the ten-invocation GitHub budget. Never dispatch another Verify. A single failed-job rerun is allowed only with infrastructure evidence and remaining budget.
9. Record exact product provenance, check results, counts, unchanged clause judgments, CI run/job IDs and durations. Publish explicitly selected non-secret reports/receipts to evidence/sx-platter-ci-critical-path-1, independently of product readiness, and return the lane POST.

## Actual stop

The measured rebalance passed Verify but runtime took 763s, exceeding the brief's 720s target. One pass is exhausted; mean 576.875s is below the timeout remedy threshold. No second rebalance or timeout increase was performed. A final meaningful fallback correction preserves ordinary full-run exactly-once behavior without changing CI composition; it was checked, source-locked and pushed with [skip ci]. The final status is BLOCKED pending a lane ruling.
