# Platter CI critical path: BLOCKED

Task: sx-platter-ci-critical-path-1  
Repository: just-every/run-platter  
Branch: cloud/sx-platter-ci-critical-path-1  
Pushed preservation head: 2ca0bde5b85e32134bb2b987debaaaf6ee79c193  
Base: 4b7577be21b4266e06fd1858109a9b2ca482bcda

## Outcome and blocker

The one measured rebalance completed Verify successfully, but misses the brief's critical-path target. Runtime took **763 seconds (12m43s)**; business_authoring took 718 seconds (11m58s). The mean of eight shards is 576.875 seconds (9m36.875s); longest/mean is 1.32264, meeting the 1.5 ratio. Core took 43 seconds. READY is not claimed.

The brief prohibits another composition pass. The mean is only 64.1% of the existing 900-second shard limit, below its approximately 85% remedy threshold, so these measurements do not prove that the time limit itself is at fault. No timeout or threshold was increased. A lane ruling authorizing another composition pass is needed to continue toward the under-12-minute target. The job was successful, with no failed assertion or infrastructure cancellation; no rerun was requested.

Measured Verify: https://github.com/just-every/run-platter/actions/runs/42329924078  
Measured SHA: 31a16502e6e3f1333d29bee7ce0096216adde95d  
Runtime job: 128274077968  
Authoring job: 128274078000

A final review found that the ordinary unsharded dispatcher would repeat the moved Drive test because it also runs the full business suite. Preservation commit 2ca0bde5b85e32134bb2b987debaaaf6ee79c193 separates the lifecycle browser command from the mixed CI runtime shard. This changes no command in any of the eight CI shards and is not a second rebalance. It restores exactly-once execution in ordinary verification too. Its meaningful local mapping and source-lock checks passed. It was pushed as an intermediate [skip ci] save; **there is no exact-SHA green Verify for this final save**. The earlier SHA's success is not attributed to it.

## Custody and scope

Before edits, five matching cloud/sx-platter-ci* refs were inspected. None had a commit in the two-hour custody window; the newest head was November 1. The exact refs, dates, method and check time are retained in custody-receipt.json. Main was fetched before and after the first product push and remained at the original base.

Only .github/workflows/verify.yml, its existing scripts/verification/run.mjs dispatcher, and regenerated sources.lock.json changed. All 84 tracked test files, product source, migrations, CONTRACT.md and generated acceptance/claims views remain unchanged. No permanent test was added, removed, renamed or weakened.

Both real commits were published through the fleet push guard immediately after their touched checks. Every candidate author, committer and trailer was checked before both pushes; both commits use fleet identity with no trailers. Both pushes succeeded on their first attempt. The final remote head was independently read and matches the clean product checkout. Main was never pushed; no PR was created.

## Changes

The core job checks generated contract documents, builds the application once for a full push Verify, builds the distinct hosted site once, and typechecks. The three browser shards download the same dist artifact, preserving hidden asset metadata. This removes the previous application-build copies in runtime and both document browser shards. The final aggregate now also requires core.

Runtime retains rer verify, including hosted-output, deployment-identity and hydration assertions. The ordinary unsharded dispatcher runs core, lifecycle browser tests, all document browser tests, all business tests and all archive tests exactly once. The dispatch-only editor budget job is unchanged and does not run on push.

The plan job, event entrypoints, one-full-run-per-commit reuse rules, concurrency group, fail-fast policy, eight matrix names and ubuntu-24.04 runner are unchanged. Existing shard timeout remains 15 minutes; new core timeout is 12 minutes. No work-graph-core job exists in this checkout; all actual invoked CI commands were inspected.

## Mapping and measured composition

MAPPING.md lists every test/journey before and after. mapping.json retains actual command lists, assignments and source blobs. A TypeScript AST inventory includes full nested-suite names, and the complete 61 measured lifecycle names equal the before-mapping. Every one of **182** unique test/journey callbacks occurs once per complete push Verify before and after. The ordinary unsharded path also has **182→182**, each once, as proven by fallback-check.json.

| Shard | Before test count | After test count |
| --- | ---: | ---: |
| runtime | 21 | 22 |
| browser_documents | 15 | 19 |
| browser_commercial | 18 | 18 |
| business_authoring | 53 | 56 |
| business_lifecycle | 61 | 52 |
| archive_custody | 4 | 4 |
| archive_restore | 5 | 6 |
| archive_media | 5 | 5 |
| Total | 182 | 182 |

The original lifecycle partition passed all 61 tests locally using Node 22.20.0 in 610.657 seconds. Independent, fresh-harness groups moved once:

| Group | Local leaf seconds | Destination |
| --- | ---: | --- |
| FOLLOW-005 reporting, 3 tests | 129.224 | business_authoring |
| AUTO-002 Drive, 1 test | 84.439 | runtime |
| APPROVE-*, 4 tests | 40.688 | browser_documents |
| AGENT-007 learning, 1 test | 26.806 | archive_restore |

All exact moved-group commands passed again. The illustrative model predicted a 614-second maximum, but hosted measurements supersede that estimate and reveal the remaining blocker. The model and its limitations remain in rebalance-receipt.json.

## Hosted measurements

Historical failed Verify 42304206419, attempt 2, used head cc98f13f9296e2def20086cbfb34e50ba48f08c2. Lifecycle was cancelled at 915 seconds, so its complete work is censored. Recorded total was 4,551 seconds and mean 568.875 seconds; longest/mean was 1.608. Candidate total is 4,615 seconds and mean 576.875 seconds. These runs have different product heads; the censored historical total is not an assertion of complete comparable work.

| Job | Before seconds | Measured rebalance seconds | Job ID |
| --- | ---: | ---: | --- |
| core | new build job | 43 | 128273885215 |
| shards (archive_custody) | 569.0 | 571 | 128274077998 |
| shards (archive_media) | 599.0 | 463 | 128274078030 |
| shards (archive_restore) | 477.0 | 502 | 128274078037 |
| shards (browser_commercial) | 602.0 | 607 | 128274078008 |
| shards (browser_documents) | 500.0 | 528 | 128274077927 |
| shards (business_authoring) | 419.0 | 718 | 128274078000 |
| shards (business_lifecycle) | 915.0 | 463 | 128274077960 |
| shards (runtime) | 470.0 | 763 | 128274077968 |

The runtime verification step itself took 722 seconds; total job setup/cleanup contributed about 41 seconds. The authoring verification step took 695 seconds. The core build/check step took 17 seconds in a 43-second job. Thus the remaining issue is verification work, rather than a slow Chromium installation or artifact transfer. See critical-step-timings.json and the complete raw job receipts.

Recent green main Verify 42301387270 at the base reused an earlier green push: plan and aggregate passed, shards were skipped. Its actual job data are retained, but it gives no full-suite timings. Thirty recent green main runs all finished within two minutes, consistent with reuse. No skipped main run is used as full-suite timing evidence.

## Local checks

- Original lifecycle: 61 passed, none failed/cancelled/skipped.
- Four exact moved-group commands: all passed.
- Core: generated-doc check, application build, distinct site build and TypeScript passed.
- Compiled SITE-001 browser smoke: passed with /usr/bin/chromium and --no-sandbox.
- Build transfer: 333 regular files retained identical hashes, including hidden .assetsignore.
- Hosted-output check: 161 assets and deployment-identity health passed.
- Hydration: existing root-page classification and setup redirect checks passed. Initial standalone resolution found a different preinstalled playwright-core browser; an external preload then selected /usr/bin/chromium without repository changes.
- Workflow invariants: unchanged plan, concurrency, entrypoints, runner, matrix and timeout; correct core/aggregate/artifact dependencies.
- Final fallback mapping: both push and ordinary full-run paths contain all 182 tests exactly once; eight CI command lists are unchanged from the measured candidate.
- Source lock regenerated last after the final fallback fix and its check passed. Of 950 source entries, only the workflow and dispatcher identities differ from main.
- Final product diff and both commit identities/trailers passed inspection; remote head equals the clean checkout.

## Clause judgments and return

No clause status changes. Core remains 15 done / 101 partial / 43 missing (159); Agent surface remains 0 / 0 / 4 (4); full target remains 15 / 101 / 47 (163). No product completion or landing claim is made.

PLAN.md records the full plan. Actual raw jobs, complete mapping, local logs, push receipts and terminal-receipt.json are included. One watcher used ten GitHub invocations, with more than 300 seconds between candidate-run requests. No workflow dispatch or failed-job rerun was used. The final [skip ci] save preserves the fallback correction after the measured target failed; it is not READY.

Report-only evidence is published separately to evidence/sx-platter-ci-critical-path-1. Evidence publication conveys neither acceptance nor landing. The lane should decide whether to authorize another composition pass; raising the timeout is not supported by these measurements.
