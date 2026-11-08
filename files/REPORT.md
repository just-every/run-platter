# sx-platter-f133fix1 — promoted SKU matching FIX

Repository: just-every/run-platter
Product branch: cloud/sx-platter-f133fix1
Product head: 3e61e44ae3423feae417173fef1640716a54a68f
Resolver base: 2c253ebbe384ea925ce9e49b19c2aae36fe6dd7b
Main merged/retained: c62b55101024f4d23e9fd1cc324df793e294411d
PR: none; this seed uses the fleet's branch lander.

BLOCKING A is fixed. Following catalog CSV import and explicit reviewed price promotion, both the direct Word upload and PandaDoc Word-template move-in now link SKU1–SKU5 to the five promoted priced catalog IDs and list only the unknown sixth row. Before the fix, both public doors linked zero and listed all six as unmatched. No other campaign, redesign, provider work, release or Base refresh was undertaken.

## Plan and execution

The complete saved plan is PLAN.md. Executed steps:

1. Configured the mandated fleet author/committer identities, refreshed the launcher, installed the decrypted-bundle Git helper, URL cleanup, push guard and preserved repository hooks. Read the launcher's AGENTS.md, the seed AGENTS.md, CONTRACT.md, acceptance views and the inline builder rules. Used the cloud runtime skill for environment and dependency handling.
2. Cloned only the declared write repository, with full history, created the named branch at the required resolver SHA and fetched the required main/resolver branches. `git merge --no-commit origin/main` reported already up to date; current main was already an ancestor. Took main's whole CONTRACT.md, generated view bytes and ID-MAP.json as explicitly required.
3. Added one composite regression assertion inside the existing EDIT-005 Word-import journey. It imports five catalog CSV rows, calls `business-import.promote-preview` and `business-import.promote`, uploads the PandaDoc-shaped Word quote through the authenticated direct document-import endpoint, then through reviewed PandaDoc move-in. Expected linked IDs come from the actual promotion result. The assertion compares both doors' exact linked IDs and unmatched row list. No old assertion, test, refusal or registration was removed, weakened or skipped.
4. Ran that assertion against unchanged resolver implementation and saved the expected failure in before-test.log. Both doors reported 0 linked and 6 unmatched.
5. Loaded `source_id` alongside priced catalog rows in both import doors. The shared `wordContent()` still deduplicates candidates by actual ID, then removes each promoted item's matching imported source from that candidate map. The promoted priced item remains the link target; an unrelated duplicate SKU remains a distinct candidate and is refused as ambiguous. Explicit unknown SKUs still cannot fall back to a different SKU with the same name. Source quantities/prices are retained by the existing conversion logic.
6. Ran the documented contract generator write/check, restored main's generated views, regenerated sources.lock.json last and passed its documented check. Committed scoped source/test/lock changes and main's authoritative CONTRACT.md source synchronization. Neither ACCEPTANCE.md nor docs/CLAIMS.md is changed by the fix commit; their main bytes are restored only in the local worktree for lander custody. ID-MAP.json has no diff against main. All source edits were committed before final touched-test and typecheck verification.
7. Passed the two touched public-door journeys and typecheck. Inspected every candidate commit, including side parents: ten commits use either fleet identity or the permitted owner's identity, with no surviving OpenAI/Codex co-author lines or disallowed trailer addresses. Fetched main again before push; it remained an ancestor. Pushed the first real commit through cloud-push.py successfully on attempt one, without force or a default-branch push. No publication scan was run, as the FIX brief directs; the fleet owns that scan.
8. Discovered the completed exact-SHA Verify run through REST. Its core failed-job archive confirms only the permitted generated-view check failure. The dependent final-job log was read once after the next 300-second interval and confirms only the required-dependency assertion failure. Final CI disposition and IDs are recorded below and in validation-receipt.json. The entire explicitly selected non-secret packet is published on the separate evidence ref, without changing the product head/index; its exact evidence head is in the terminal report.

## Actual proof and counts

| Proof | Before | After |
| --- | --- | --- |
| Direct Word upload, promoted SKU links | 0 of 5 | 5 of 5, each exact promoted priced ID |
| Direct unmatched list | all 6 quote rows | only Synthetic product 6 |
| PandaDoc Word-template move-in, promoted SKU links | 0 of 5 | 5 of 5, each exact promoted priced ID |
| PandaDoc unmatched quote rows | all 6 quote rows | only Synthetic product 6 |
| Static test registrations across tracked test sources | 186 | 186 |
| Added regression assertions / registrations | 0 / 0 | 1 / 0 |

The registration count uses TypeScript AST call counting for every tracked tests/*.mjs source, including registrations in the browser helper modules. No registration sits in a loop. Existing verify/assert scripts were untouched. Cap remains 200. test-counts.json contains the per-file before/after counts and method; the existing EDIT journey's registration carries the added assertion.

Commands and results:

- Before: `node --test --test-concurrency=1 --test-name-pattern='^EDIT-005 Word import maps' tests/platter.test.mjs` — expected failure, one failed test, both paths 0/6.
- After, committed product head: `node --test --test-concurrency=1 --test-name-pattern='^EDIT-005 Word import maps|^MIG-001 reviewed PandaDoc' tests/platter.test.mjs` — two passed, zero failed. EDIT journey 6.55 seconds; MIG journey 38.09 seconds; total 46.18 seconds.
- The unchanged MIG journey also passes its unrelated duplicate-SKU refusal, no fallback for explicit unknown SKU, exact six source price/quantity lines, image/token preservation, ten library headings, fixed PDF original, preview fingerprint/replay/undo, and retained bulk/certificate/folder/reissue checks. These were already in the touched journey; no new tests were added for them.
- `pnpm typecheck` — exit 0. The mandated toolchain shim selected pnpm 10.12.4; the VM's Node 24.19.0 is newer than the declared 22.20.0 and was retained by that shim. CI uses the repository's exact Node 22.20.0 pin.
- `node src/base/contract-docs.mjs write` and `node src/base/contract-docs.mjs check` — exit 0 using main's whole authoritative source.
- `node scripts/edition-authoring/cli.mjs lock` then `node scripts/edition-authoring/cli.mjs check` — exit 0 after the final product edits, with main's required generated view bytes restored. The complete actual check output is source-lock-check.log.
- Exact committed view check — exit 1, only `ACCEPTANCE.md: generated content differs` and `docs/CLAIMS.md: generated content differs`. The original resolver commits carry generated partial-MIG views, whereas this FIX is explicitly required to retain main's source judgments and not commit either view. The lander regenerates those two views and the lock from the final source. committed-contract-check.log records this permitted exception without modifying any generated file in the fix commit.
- Full local verify, UI screenshots, provider runs and publication scan — not run. Scope is matching logic; the public HTTP regression exercises both changed doors. No UI source changed. No additional migration qualification or live-provider proof is claimed.

## Clause custody and claims

No Status, Gap or Evidence cell was independently judged or hand-edited. The final CONTRACT.md is byte-identical to main c62b5510. EDIT-005 remains DONE. Main's MIG-001 source remains MISSING pending its lane's independent gate, while the existing builder claim stays PARTIAL for the exported-file slice. The resolver had authored a PARTIAL MIG-001 source row; taking main's whole source as explicitly required removes that row's unpublished judgment. This is source synchronization, not a newly judged product demotion or a claim of full migration qualification.

Main and final source counts: 15 DONE, 102 PARTIAL, 46 MISSING, 163 total. Resolver source counts: 15 DONE, 103 PARTIAL, 45 MISSING, 163 total. No acceptance point, Status/Gap/Evidence judgment or unrelated legacy prose was authored in this FIX. ID-MAP.json is byte-identical to main and untouched by the fix commit. The lander retains authority over acceptance status and regenerated views.

CLAIM EDIT-005 DONE points=1,2,3 tests=tests/platter.test.mjs#EDIT-005 Word import maps tokens and catalog quote rows, keeps editable blocks and splits Heading 1 library sections
CLAIM MIG-001 PARTIAL points=3,4,5,6 tests=tests/platter.test.mjs#MIG-001 reviewed PandaDoc Word and fixed PDF content retains exact originals, catalog links and dependency-safe undo

DEFAULT MIG-001: Preserve the existing partial exported-file slice; make no new provider, delegation, source-price, recipient or signature-authority inference.
GAP MIG-001: Full migration qualification, API enrichment/roles/assigned fields, automatic bulk draft creation, native bundle promotion, qualified URL image acquisition and existing authority prerequisites remain outside this blocking-only FIX.

## Exact-SHA CI disposition

Verify run: 42498610142 — https://github.com/just-every/run-platter/actions/runs/42498610142
Head: 3e61e44ae3423feae417173fef1640716a54a68f
GitHub conclusion: completed / failure.

The completed core job 128786293517 log reports only these two failing checks:

- ACCEPTANCE.md: generated content differs; run contract-docs write.
- docs/CLAIMS.md: generated content differs; run contract-docs write.

The plan and installation passed. Core stops at the first generator check; artifact upload and shards skip. Aggregate job 128786403071 fails the dependency requirement as expected. This is the cloud brief's explicit generated-view-only READY exception, not a claim that the workflow itself was successful. The lander writes both views from main's authoritative CONTRACT.md, regenerates the lock and verifies its final exact SHA before landing. No product check failure was observed locally.

ci-discovery.json, ci-jobs.json and the two failed-job logs contain the actual GitHub evidence. The GitHub Actions environment rendering is omitted from log receipts; all failure output is retained. github-calls.json records the actual API/archive commands and timing. There is one watcher, queries/readouts are at least 300 seconds apart, and each failed job archive is read only once. No workflow is dispatched or retried. Total calls at completion: 4 of 10.

No remaining product blocker is identified for BLOCKING A. No full PandaDoc migration qualification is claimed. READY is conditional on the expressly documented view exception; independent publication and frozen-rubric gate custody stays with the fleet.

## Product and evidence custody

Product push succeeded at 3e61e44ae3423feae417173fef1640716a54a68f on cloud/sx-platter-f133fix1. The packet resides outside the clone at /home/agent/rer-consolidation/work/sx-platter-f133fix1/packet/. product-push.log is the actual sanitized guard receipt; it omits only credential fingerprint/age metadata. validation-receipt.json records commands, exits, counts, provenance and CI. candidate-messages.log and identity-review.log preserve the complete candidate identity/trailer inspection, with no credentials or environment dumps.

Evidence is report-only and publishes exclusively to refs/heads/evidence/sx-platter-f133fix1. Its ref/head is returned separately in the final message. Evidence publication is not product acceptance, READY or landing. No inbox or state file was read or written; the final POST line relays the result to the lane.
