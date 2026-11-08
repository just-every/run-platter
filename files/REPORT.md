# sx-platter-timing-1 — archive restore timing

Product repository: just-every/run-platter. Branch: `cloud/sx-platter-timing-1`.
Base: `7c0b92553438cdab1c78c31b6d7dcf6803a9371b`. Final candidate: `1e5ec5dc9db032ea1319d6bb65d506a93d38004b`.
No clause status changes, acceptance edits, generated view edits, releases, timeout increases, assertion removals, skipped tests or retries.

## Plan and resulting behavior

1. Measure the unchanged TEAM-001 journey three consecutive times with phase-only instrumentation.
2. Apply every current migration once with real Wrangler in a process-scoped fixture hook. Verify the entire ordered native ledger and native preflight, then dispose the proxy before copying state.
3. Give each archive journey independent checkout files and database files containing only migration-seeded data. Keep current-format, erasure-fence and first-release AUD cold destinations so native CLI database initialization remains covered. Every transfer still uses the public CLI and its full ledger/replay checks.
4. Add permanent phase diagnostics and run Verify’s archive_media command, the archive complement, and Verify’s typecheck. Regenerate/check the source lock last, publish through the fleet guard and run the measured journey three times on the committed final SHA.
5. Require the final exact-SHA hosted Verify, publish this separate non-secret evidence packet, and hand the branch back to the fleet. Publication scan and landing remain fleet-owned.

Only tests/archive.test.mjs, tests/archive-template.mjs and sources.lock.json changed. The empty template is never used as a shared writable database. No business archive, operator, session or journey-created fixture data is reused across journeys.

## Three consecutive hosted-like runs, before and after

Linux x86_64, Node v22.20.0, pnpm 10.12.4, CI=true, Wrangler metrics disabled. These are dedicated-cloud Linux runs, not three GitHub-hosted runs. Hosted exact-SHA Verify is recorded separately below.
The before runs use the recorded main source with timing-only instrumentation. The after runs use the final committed candidate. Each run starts a new Node test process and a fresh template.
Export/import are elapsed public CLI commands. Restore is the unchanged restored-door/assertion section. Total is Node TAP’s test duration; it includes the one-time template hook in these focused runs. The separately reported callback total excludes that hook. No shared setup cost is hidden.

| Run | Schema setup/template s | Export s | Import s | Restore assertions s | Total test s | Whole process s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Before 1 | 33.31 | 31.56 | 70.23 | 4.75 | 159.32 | 160.97 |
| Before 2 | 31.82 | 32.37 | 75.10 | 5.35 | 163.96 | 165.27 |
| Before 3 | 31.19 | 34.36 | 75.20 | 5.87 | 169.02 | 170.37 |
| After 1 | 32.38 | 32.55 | 47.57 | 4.98 | 137.55 | 138.91 |
| After 2 | 31.57 | 30.70 | 47.17 | 5.35 | 134.30 | 135.72 |
| After 3 | 30.94 | 31.10 | 45.58 | 4.72 | 131.98 | 133.37 |

Mean total test: 164.10 → 134.61 seconds (18.0% lower), including fresh template setup in every after run. Mean CLI import: 73.51 → 46.77 seconds (36.4% lower). Slowest measured after test leaves 42.45 seconds below the unchanged 180-second test budget.

In the full archive_media process, setup is paid once across all selected tests.
The complete archive_media command, including its business-comment journey, took 428.59 seconds against the existing 1,020-second job limit, leaving 591.41 seconds of local test-command margin (hosted installation time is separate). Its team restore test took 111.64 seconds.

## Assertion and migration preservation

- Archive registrations: 12 → 12; unchanged names and order.
- Existing explicit assertions: 842 → 842; every original assertion expression retained verbatim and in order. Ordered assertion SHA-256: `37c358c1521040f94b82abb10f070c7bd39280b39cf94756b9ecbd3457902279`.
- Existing public harness calls: 563 → 563; unchanged expressions and order.
- Team journey assertions: 137 → 137; restored section: 100 → 100, retained verbatim.
- Migration coverage: all 118 current SQL files are natively applied and their full ordered ledger is checked before each process snapshots. Every export/import retains native CLI preflight and replay. Cold destinations remain in three archive journeys.
- The new helper adds fixture-integrity assertions for the applied ledger, native preflight and preparation order. Test registration count and test-budget.json are unchanged.

## Validation and custody

- Three baseline focused runs: 3/3 passing. Three final-candidate focused runs: 3/3 passing.
- `CI=true WRANGLER_SEND_METRICS=false PLATTER_VERIFY_SHARD=archive_media pnpm verify:app`: passed: 4 archive journeys plus the collaboration journey (the raw TAP also counts 2 filtered file modules).
- Archive complement using Verify’s complementary name filter: 8/8 passing. Together these cover all 12 archive registrations exactly once.
- `pnpm typecheck`: passed. `node scripts/edition-authoring/cli.mjs lock` followed by `node scripts/edition-authoring/cli.mjs check`: passed. Syntax checks and git diff whitespace check: passed.
- Save push: `abf2ed4c807e7ee59c358638ea7c3dc6431bdc76` with [skip ci]. Final pushed head: `1e5ec5dc9db032ea1319d6bb65d506a93d38004b`. Fleet author/committer and all candidate trailers checked before both pushes, including all parents. No force push or published-history rewrite.
- Final Verify: run 42512950991, status=completed, conclusion=cancelled, exact head `1e5ec5dc9db032ea1319d6bb65d506a93d38004b`. https://github.com/just-every/run-platter/actions/runs/42512950991
- PR: not created; branch custody returns to the lane. No product acceptance/landing claim.

## Counts, clause status and blockers

Before/after: 12/12 archive tests, 842/842 existing explicit assertions, 137/137 team assertions, 100/100 team restore assertions, 563/563 public harness calls, 118/118 migrations. Clause status changes: none. CONTRACT.md, ACCEPTANCE.md and docs/CLAIMS.md untouched.
Blockers: Exact-SHA Verify 42512950991 completed as cancelled: business_authoring was cancelled after 17m17s and the required aggregate verify job failed. The archive_media, archive_custody and archive_restore jobs all succeeded. Business-authoring tests and CI repartitioning are outside the archive lease; the shipped briefs/RULES.md Round speed rule forbids dispatching or rerunning Verify for a SHA that already has a run. Lane action is required for an exact-SHA green Verify; no READY claim is made.

The packet contains the actual TAP logs, phase/coverage receipts, source/provenance receipts and push/CI receipts. Report transport is separate from product READY and does not establish acceptance or landing.

## Completed hosted Verify diagnosis

Run 42512950991, exact candidate 1e5ec5dc9db032ea1319d6bb65d506a93d38004b, concluded cancelled. No newer branch push superseded it: remote cloud/sx-platter-timing-1 remains 1e5ec5dc9db032ea1319d6bb65d506a93d38004b and remote main remains 7c0b92553438cdab1c78c31b6d7dcf6803a9371b.

| Job | ID | Conclusion | Elapsed seconds |
| --- | --- | --- | ---: |
| plan | 128829768785 | success | 4 |
| core | 128829796604 | success | 36 |
| editor_budget | 128829798487 | skipped | — |
| shards (business_lifecycle) | 128829963278 | success | 461 |
| shards (browser_commercial) | 128829963280 | success | 467 |
| shards (archive_custody) | 128829963304 | success | 571 |
| shards (business_authoring) | 128829963311 | cancelled | 1037 |
| shards (archive_media) | 128829963320 | success | 438 |
| shards (runtime) | 128829963330 | success | 818 |
| shards (browser_documents) | 128829963403 | success | 414 |
| shards (archive_restore) | 128829963441 | success | 663 |
| verify | 128834510156 | failure | 4 |

The target archive_media job succeeded in 438 seconds including setup, leaving 582 seconds against its unchanged 1,020-second job limit. Its actual Verify business or archive flow step succeeded in 415 seconds (19:03:16Z to 19:10:11Z). Both other archive shards, core, browser shards, runtime and business_lifecycle also succeeded.

The sole cancelled test partition was business_authoring, job 128829963311, during Verify business or archive flow (19:03:17Z to 19:20:10Z); the complete job lasted 1,037 seconds. The API records cancellation after the configured 17-minute budget; the job list does not state the cancellation cause. There is no failed assertion recorded in the job metadata for that partition. The aggregate verify job 128834510156 then failed its Require the plan and every shard step. Its failed-step archive was read once successfully with gh run view 42512950991 --repo just-every/run-platter --job 128834510156 --log-failed. The log confirms the aggregate result check exited 1 after a cancelled shard result. The selected excerpt omits the Actions-generated environment metadata block; the command, exit and total seven GitHub calls are recorded in github-call-receipt.json.

Business-authoring tests are unchanged by this branch and are outside the leased tests/archive.test.mjs and archive helpers. The standing exact-SHA Verify bar remains unmet. The shipped briefs/RULES.md Round speed instruction says: “Never dispatch or re-run Verify for a SHA that already has a run.” No rerun or empty/no-op trigger commit was made. The lane needs to resolve the cancelled business-authoring partition and obtain authorized exact-SHA green Verify.

Product work and all local evidence are pushed/preserved; report publication is separate from READY, acceptance and landing.
