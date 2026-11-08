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
