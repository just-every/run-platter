# sx-platter-ci-shape-2 — Platter Verify shard rebalance

Product state: PUSHED; final exact-SHA CI and hosted timing are unverified because the ten-invocation GitHub budget is exhausted.
Repository: just-every/run-platter
Branch: cloud/sx-platter-ci-shape-2
Final head: 5aa43601ddc3b37c5924638860ea41a6173148c8
Final base: 1e5ec5dc9db032ea1319d6bb65d506a93d38004b (initial base was 7c0b92553438cdab1c78c31b6d7dcf6803a9371b)
First candidate: ca0e2a18b2751698553e056eae9334355fcb5c80
PR: none; the brief returns the branch to the fleet lander.
Clause changes: none. No CONTRACT.md, generated views or clause status changed. No DONE claim.

## Change and full plan

See PLAN.md for the complete executed plan. The product diff contains only .github/workflows/verify.yml, scripts/verification/run.mjs and sources.lock.json. The lock changed only the corresponding workflow and planner entries.

The former business_authoring work is divided into business_authoring (EDIT/PRICE plus reporting) and business_sending (TEAM/SEND), with slower-observation weights of 480.374 and 471.591 seconds. Lifecycle groups are redistributed so there are still eight matrix jobs. The 17-minute hard limit, aggregate verify dependency list, build-once artifact handling, Ubuntu 24.04 and Chromium probing remain unchanged.

The first candidate passed exact-SHA Verify but its own hosted jobs took 10m02s–13m45s. That was insufficient for the requested approximately 11-minute target, so the final planner additionally overlaps at most two independent commands in each shard. Each Node command still executes its test files serially, each shard has at most one browser command, and core/default builds retain ordered dependencies and stop after a failure. Independent commands use fresh harnesses and archive CLI checkouts; the coordinator waits for all launched children and retains any nonzero result or signal/spawn failure. Heavy archive CLI commands never overlap with one another; lighter business commands may bypass a blocked archive command. Core/default dependencies remain serial. An intermediate local attempt with concurrent archive CLI builds timed out; that attempt is retained as intermediate evidence and is not credited to the final head. Main’s newer archive fixture optimizations were merged without changing its assertions.

There are exactly 186 named product/browser registrations before and after, each assigned once. Node reporter totals also include empty successful filtered-file records; these are not extra registrations. Test sources, assertions, default full-suite selection and Runtime/Base checks outside these registrations are unchanged. No test was deleted or skipped by this change.

## Historical measurement and assignment

Inputs: Verify 42501941877 (business_authoring job 128796576604, 561 seconds elapsed) and Verify 42504861947 attempt 1 (business_authoring job 128816388758, 981 seconds elapsed). Their authoring log records total approximately 540 and 954 seconds, including filtered file records. Estimates below use each named test’s slower observation, excluding those empty-file records. They are recorded test durations, not predicted wall times or p90. The historical archive_media TEAM-001 record is a failed 180-second timeout, so that observation is censored rather than a completed-test duration; the two authoring samples used for the primary split both completed successfully. historical-durations.json retains the TAP result for each record.

gh 2.46 rendered retrieved archives as empty output, but its ZIP cache retained the raw logs. The later run had a second attempt containing only archive_media; its first-attempt archive was explicitly retrieved. The packet selects only non-secret test names/durations and safe job metadata, not raw workflow log archives.

| Before shard | Registrations | Recorded serial work (seconds) |
| --- | ---: | ---: |
| runtime | 22 | 641.9 |
| browser_documents | 19 | 691.7 |
| browser_commercial | 20 | 653.4 |
| business_authoring | 56 | 952.0 |
| business_lifecycle | 54 | 572.9 |
| archive_custody | 4 | 482.1 |
| archive_restore | 6 | 729.5 |
| archive_media | 5 | 622.1 |

| Final shard | Registrations | Recorded serial work (seconds) |
| --- | ---: | ---: |
| runtime | 28 | 669.7 |
| browser_documents | 19 | 670.3 |
| browser_commercial | 21 | 664.4 |
| business_authoring | 38 | 667.5 |
| business_sending | 36 | 641.5 |
| archive_custody | 27 | 665.2 |
| archive_restore | 5 | 683.2 |
| archive_media | 12 | 683.7 |

The test-work range is 641.5–683.7 seconds, maximum/mean 1.023, before overlap. The final coordinator overlaps independent work instead of summing every command’s duration. Hosted resource contention may reduce that benefit; final CI timings must be measured, and p90 requires subsequent runs. The requested p90 target is not yet proven.

## Local validation

- PASS: syntax, git diff --check, typecheck, documented source-lock generation/check and an exhaustive before/after assignment audit. See coverage-receipt.json, shard-commands.json, typecheck.log and lock-receipt.json.
- PASS: scheduler behavior harness checks bounded overlap, complete execution after failure, signal/spawn failure propagation, serial core ordering, stopping dependent builds on failure and refusal of unknown shards. See scheduler-receipt.json. This external harness adds no committed tests or test-budget registrations.
- PASS: original authoring assignment on the base planner. See baseline-receipt.json.
- PASS: both first-candidate business shards: 442.834s and 444.364s locally. These were on ca0e2a1 and are not proof of the final head. See first-candidate-local-receipt.json and its logs.
- PASS: intermediate PLATTER_VERIFY_SHARD=business_authoring pnpm verify:app; 328.2s on e3914e429b4b0725ebb0c518f050713e2f7e1a52. These commands and test sources are unchanged in the final head, but these runs are not exact-final-SHA proof. See intermediate-local-business-receipt.json.
- PASS: intermediate PLATTER_VERIFY_SHARD=business_sending pnpm verify:app; 337.2s on e3914e429b4b0725ebb0c518f050713e2f7e1a52. These commands and test sources are unchanged in the final head, but these runs are not exact-final-SHA proof. See intermediate-local-business-receipt.json.
- INTERMEDIATE FAILURE: archive_restore on e3914e429b4b0725ebb0c518f050713e2f7e1a52 hit its 300-second test timeout while archive CLI commands overlapped and another shard shared this VM. The final scheduler serializes archive CLI commands. See intermediate-local-archives-receipt.json and intermediate-final-archive_restore.log.
- PASS: final PLATTER_VERIFY_SHARD=archive_restore pnpm verify:app; exit 0; 466.1s, Node v22.20.0. See local-archives-receipt.json and final-archive_restore.log.
- PASS: final PLATTER_VERIFY_SHARD=archive_media pnpm verify:app; exit 0; 392.2s, Node v22.20.0. See local-archives-receipt.json and final-archive_media.log.

First-candidate checks used the supplied toolchain’s installed Node v24.19.0 with pnpm 10.12.4. The final integration/type/scheduler/lock checks use the exact repository Node 22.20.0 pin; hosted Verify also uses 22.20.0. No UI/browser screenshots were required for this assignment-only change.

## First-candidate exact-SHA CI — not final-head proof

Run 42517570284: https://github.com/just-every/run-platter/actions/runs/42517570284
Head ca0e2a18b2751698553e056eae9334355fcb5c80: completed/success.
Both aggregate verify and all eight shards succeeded. See first-candidate-ci-receipt.json and first-candidate-jobs.json.

| First-candidate shard | Job ID | Elapsed |
| --- | --- | ---: |
| shards (business_authoring) | 128844041304 | 11m 51s |
| shards (browser_documents) | 128844041321 | 10m 58s |
| shards (archive_custody) | 128844041334 | 13m 05s |
| shards (browser_commercial) | 128844041338 | 10m 02s |
| shards (archive_restore) | 128844041380 | 12m 29s |
| shards (business_sending) | 128844041395 | 13m 44s |
| shards (runtime) | 128844041406 | 13m 45s |
| shards (archive_media) | 128844041424 | 12m 04s |

Maximum/mean hosted job duration was 1.123. Despite green CI, the maximum exceeded the timing target, motivating the final bounded-overlap change.

## Final CI, custody and remaining work

Final head 5aa43601ddc3b37c5924638860ea41a6173148c8 was pushed through cloud-push.py on the first attempt, as a normal fast-forward of this task’s published branch. All candidate commit identities, trailers and messages were inspected before each push; no trailers remain. A later fetch found main’s archive optimizations, which were merged in commit 5aa4360; source lock generation/check and assignment/scheduler/type checks were repeated. Main’s archive assertions are retained byte-for-byte, and the product diff relative to the fresh main is still only the three leased files. The final remote head and clean worktree were confirmed. See product-receipt.json.

The ten-command GitHub budget was fully spent: seven historical-log investigations, first-candidate run discovery, final status and job timings. One watcher was used and the final candidate’s CI was not queried. The first candidate’s green run is explicitly not credited to the final SHA. The fleet must discover final-head Verify, require completed/success, inspect its new per-shard times and monitor further runs for p90. See ci-receipt.json and github-calls.jsonl. The final disposition is PUSHED, not READY.

No missing account or policy ruling blocked implementation. Hosted timing and final exact-SHA CI remain unproved. The cloud cannot run the Mac publication scan; the fleet owns that gate and landing. No main/default branch was pushed, no release was performed, and no generated acceptance views were committed. The referenced speed-tests-ci Appendix A was not supplied; explicit shipped shape rules were retained.

The report, plan, historical observations, assignments and actual receipts/logs are published only on evidence/sx-platter-ci-shape-2. Product custody and evidence transport are separate; evidence is not proof of product readiness, acceptance or landing.
