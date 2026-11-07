# Platter measured rebalance and shard limit

Product branch: cloud/sx-platter-ci-limit-1
Candidate: b384813c64c78665f189b5aa1f6b8f2c0fca79da
Base main: 4b7577be21b4266e06fd1858109a9b2ca482bcda

## Result

Published the measured composition and increased the shard job timeout from 15 to 17 minutes. The longest measured shard in successful Verify 42329924078 was runtime, job 128274077968, at 763 seconds. ceil((763 + 240) / 60) = 17 minutes, leaving 257 seconds (4m17s), versus 137 seconds under the previous 15-minute limit. The matrix remains eight shards. No further rebalancing pass was made.

The assignment described final save 2ca0bde5 as possibly documentation or lock only. Inspection instead found an important script correction: unsharded verification runs Drive once in the full business suite rather than once in runtime and again in that suite. This final correction was retained. Every matrix shard command is identical to the measured 31a16502 composition; the complete CI script equals 2ca0bde5. Only the measured workflow composition plus the timeout/comment was taken. Tests and assertions are unchanged; no tests were skipped or removed.

## Checks

Frozen pnpm installation passed. CI-script syntax, routing coverage, contract-docs check, edition source-lock check and diff whitespace checks passed. Routing check accounts for 118 literal business test names across ten disjoint groups and twelve archive test names across five groups, each exactly once, and retains complementary document browser filters. The final script also runs each full unsharded suite once. The unchanged test source and exact measured shard commands cover dynamically registered helpers beyond the literal-name census. No UI change, so no new screenshots were required. The hosted exact-SHA workflow runs all existing required checks.

Regenerated sources.lock.json last. Only verify.yml, scripts/verification/run.mjs and sources.lock.json changed. CONTRACT.md, ACCEPTANCE.md, docs/CLAIMS.md and all product/test sources retain current main bytes and judgments. No clause status changes. Core 15 done / 101 partial / 43 missing (159), Agent surface 0 / 0 / 4 (4), Full target 15 / 101 / 47 (163), before and after.

## Measured Verify 42329924078 durations

| Shard | Seconds |
| --- | ---: |
| runtime | 763 |
| browser_documents | 528 |
| browser_commercial | 607 |
| business_authoring | 718 |
| business_lifecycle | 463 |
| archive_custody | 571 |
| archive_restore | 502 |
| archive_media | 463 |

All measured shards succeeded. The candidate's push Verify 42332840634 completed successfully on the exact candidate SHA, attempt 1. All eight shard jobs and the aggregate succeeded. No dispatch or rerun was requested. No PR was required by the seed's instructions or opened; the fleet handles landing. No push to main was made. Product commits contain fleet author/committer identity and no trailers. Reports and receipts are outside the product repository and will publish only to evidence/sx-platter-ci-limit-1.

The complete plan is PLAN.md. Actual provider receipts, routing results, lock/contract checks, patch, identity audit and push result accompany this report.

## Candidate Verify 42332840634 durations

| Job | Seconds | Conclusion |
| --- | ---: | --- |
| plan | 5 | success |
| core | 43 | success |
| editor_budget | 0 | skipped |
| shards (runtime) | 685 | success |
| shards (browser_documents) | 520 | success |
| shards (archive_media) | 573 | success |
| shards (business_lifecycle) | 309 | success |
| shards (browser_commercial) | 440 | success |
| shards (business_authoring) | 905 | success |
| shards (archive_custody) | 557 | success |
| shards (archive_restore) | 622 | success |
| verify | 2 | success |

Exact-SHA provider status: completed/success. No failures, reruns, additional dispatches or blockers. Seven of ten GitHub calls used. The one watcher observed the provider at intervals of at least 300 seconds, then fetched job durations after the same interval. The candidate is ready for fleet review and landing; it has not been landed by this cloud task.

The longest candidate shard was shards (business_authoring) at 905 seconds; observed remaining job-limit margin was 115 seconds. The approved limit calculation remains based on the specified successful measured run, not another rebalance or adjustment pass.
