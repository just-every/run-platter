Old reference: `26bc99232f1d8c8a5ac7bbc2508c90c801f53d13`.
| Clause | Point | Outcome | Asserting test | Result |
| --- | --- | --- | --- | --- |
| HTTP-001 | 1 | Signed-out private read is refused. | `tests/platter.test.mjs:303` | asserted |
| HTTP-001 | 2 | Foreign-origin domain call is refused. | `tests/platter.test.mjs:2788` | asserted |
| HTTP-001 | 3 | Revoked key cannot read context. | `tests/platter.test.mjs:23` | asserted |
| HTTP-001 | 4 | Owner-only invoice/import attempts are refused without record changes. Expected statuses are checked by tests/harness.mjs, outside this clause’s cited evidence; the complete no-write outcome is not asserted here. | none | none |
| ACCESS-001 | 1 | A labelled key prepares a draft. | `tests/platter.test.mjs:22` | asserted |
| ACCESS-001 | 1 | Prepared proposal identifies its key. | `tests/platter.test.mjs:320` | asserted |
| ACCESS-001 | 2 | Company-policy decisions under held. No asserting line in the old cited evidence. | none | none |
| ACCESS-001 | 2 | all-autonomous policies. No asserting line in the old cited evidence. | none | none |
| ACCESS-001 | 3 | Revoked grant cannot read context. | `tests/platter.test.mjs:23` | asserted |
| PROP-001 | 1 | Stale approval. The expected-status assertions for these actions live in the uncited harness. | none | none |
| PROP-001 | 1 | send-after-edit refusal. The expected-status assertions for these actions live in the uncited harness. | none | none |
| PROP-001 | 1 | Editing clears applicable approval steps. | `tests/platter.test.mjs:2218` | asserted |
| PROP-001 | 2 | Two retained approvals identify revisions one and two. | `tests/platter.test.mjs:136` | asserted |
| PROP-001 | 2 | Every retained approval’s approver. No asserting line in the old cited evidence. | none | none |
| PROP-001 | 2 | role. No asserting line in the old cited evidence. | none | none |
| PROP-001 | 2 | rule. No asserting line in the old cited evidence. | none | none |
| PROP-001 | 2 | time are read together. No asserting line in the old cited evidence. | none | none |
| PROP-001 | 3 | Manager rule step is complete. | `tests/platter.test.mjs:2217` | asserted |
| PROP-002 | 1 | Fresh invitation rotates the earlier link. | `tests/platter.test.mjs:32` | asserted |
| PROP-002 | 1 | Old link is refused. | `tests/platter.test.mjs:33` | asserted |
| PROP-002 | 1 | Offer terms are unchanged. | `tests/platter.test.mjs:38` | asserted |
| PROP-002 | 1 | Frozen-offer revision refusal. The expected-status assertion is in tests/harness.mjs, outside the cited files. | none | none |
| SIGN-001 | 1 | Acceptance before verification is refused. | `tests/platter.test.mjs:46` | asserted |
| SIGN-001 | 2 | A mailbox code creates a verification cookie. | `tests/platter.test.mjs:17` | asserted |
| SIGN-001 | 2 | Reusing verification is refused. | `tests/platter.test.mjs:47` | asserted |
| SIGN-001 | 3 | Five wrong attempts and a later correct attempt are refused. | `tests/platter.test.mjs:57` | asserted |
| SIGN-001 | 4 | A previously valid unconsumed code is refused specifically after its expiry. The expiry case reuses an already-exhausted condition and submits an arbitrary code, so it does not isolate expiry. | none | none |
| SIGN-001 | 5 | Immediate second request is throttled. | `tests/platter.test.mjs:56` | asserted |
| SIGN-001 | 5 | Ten-code invitation ceiling. No asserting line in the old cited evidence. | none | none |
| SIGN-001 | 5 | exactly ten-minute lifetime. No asserting line in the old cited evidence. | none | none |
| SIGN-001 | 6 | Cookie path and SameSite/HttpOnly flags. Cookie presence alone does not assert these properties. | none | none |
| SIGN-001 | 6 | another revision’s denied authority. Cookie presence alone does not assert these properties. | none | none |
| SIGN-002 | 1 | Unknown option is refused. | `tests/platter.test.mjs:48` | asserted |
| SIGN-002 | 1 | Option-two acceptance succeeds. | `tests/platter.test.mjs:49` | asserted |
| SIGN-002 | 1 | Replay retains the first signer. | `tests/platter.test.mjs:51` | asserted |
| SIGN-002 | 1 | Retained total is 420000 cents. | `tests/platter.test.mjs:51` | asserted |
| SIGN-002 | 1 | Retained deposit is 105000 cents. | `tests/platter.test.mjs:51` | asserted |
| INV-001 | 1 | Unaccepted invoice export is refused. Expected-status assertion is in the uncited harness. | none | none |
| INV-001 | 1 | Concurrent exports have one id. | `tests/platter.test.mjs:52` | asserted |
| INV-001 | 1 | One invoice record exists. | `tests/platter.test.mjs:52` | asserted |
| INV-001 | 1 | CSV contains the deposit. | `tests/platter.test.mjs:53` | asserted |
| IMPORT-001 | 1 | Preview writes no clients. | `tests/platter.test.mjs:64` | asserted |
| IMPORT-001 | 2 | Changed-file apply refuses the reviewed fingerprint. Expected-status assertion lives in the uncited harness. | none | none |
| IMPORT-001 | 3 | Import completes and contains three clients. | `tests/platter.test.mjs:66` | asserted |
| IMPORT-001 | 3 | Journal returns original bytes. | `tests/platter.test.mjs:68` | asserted |
| IMPORT-001 | 3 | Replay returns the same job. | `tests/platter.test.mjs:78` | asserted |
| IMPORT-001 | 4 | Undo removes imported clients. | `tests/platter.test.mjs:79` | asserted |
| IMPORT-001 | 4 | Dependent client remains after refused undo. | `tests/platter.test.mjs:83` | asserted |
| IMPORT-001 | 4 | Changed imported client prevents undo. The cited journey does not assert this separate changed-client case. | none | none |
| ERASE-001 | 1 | Erased eligible client is absent. | `tests/platter.test.mjs:83` | asserted |
| ERASE-001 | 1 | Draft. | none | none |
| ERASE-001 | 1 | wrong-name refusals. Expected-status assertions are in the uncited harness. | none | none |
| ERASE-001 | 1 | Newer erasure journal keeps the client absent after restore. | `tests/archive.test.mjs:386` | asserted |
| PORT-001 | 2 | Populated and corrupt imports have the expected failure exit. | `tests/archive.test.mjs:27` | asserted |
| PORT-001 | 3 | Old archive refusal specifically identifies erasure. | `tests/archive.test.mjs:381` | asserted |
| MAIL-001 | 1 | Proposal and verification captures make no provider call. | `tests/mail.test.mjs:254` | asserted |
| MAIL-001 | 1 | Both captured messages retain their proposal id. | `tests/mail.test.mjs:243` | asserted |
| MAIL-001 | 1 | Both captured messages retain their recipient. | `tests/mail.test.mjs:243` | asserted |
| MAIL-001 | 2 | Mail claim is persisted before provider contact. | `tests/mail.test.mjs:324` | asserted |
| MAIL-001 | 2 | Offer is already sent in the same claim. | `tests/mail.test.mjs:325` | asserted |
| MAIL-001 | 3 | Timeout leaves uncertainty. | `tests/mail.test.mjs:370` | asserted |
| SITE-001 | 1 | Run Platter opens the run page. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. | none | none |
| SITE-001 | 2 | Markdown is readable with JavaScript disabled. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. | none | none |
| SITE-001 | 3 | Installed home is the Lobby. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. | none | none |
| EDIT-001 | 1 | Every palette block. | none | none |
| EDIT-001 | 1 | drag. | none | none |
| EDIT-001 | 1 | keyboard reorder. | none | none |
| EDIT-001 | 1 | brand. | none | none |
| EDIT-001 | 1 | reload. | none | none |
| EDIT-001 | 1 | same-order PDF at 1440. Assertions are in imported browser helpers. | none | none |
| EDIT-001 | 1 | not the old cited wrapper. | none | none |
| EDIT-001 | 1 | The same complete browser flow at 390. Assertions are in imported browser helpers. | none | none |
| EDIT-001 | 1 | not the old cited wrapper. | none | none |
| EDIT-001 | 1 | Performance proof on the same exact build as the editor browser flow. No assertion in the cited files binds the two receipts to the same candidate. | none | none |
| EDIT-003 | 1 | Linked draft changes while detached. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. | none | none |
| EDIT-003 | 1 | sent. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. | none | none |
| EDIT-003 | 1 | accepted copies do not. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. | none | none |
| EDIT-003 | 1 | Usage names exactly all three copies. No directly cited asserting line establishes the exact usage list. | none | none |
| EDIT-006 | 1 | Uploaded video. The browser helpers are not in the old Evidence set. | none | none |
| EDIT-006 | 1 | gallery render. The browser helpers are not in the old Evidence set. | none | none |
| EDIT-006 | 1 | play at 390. The browser helpers are not in the old Evidence set. | none | none |
| EDIT-006 | 1 | PDF has still images. The old cited wrappers do not assert every named carrier. | none | none |
| EDIT-006 | 1 | links. The old cited wrappers do not assert every named carrier. | none | none |
| EDIT-006 | 1 | Outside-allowlist embed refusal. A command status in a helper is not an asserting line in the cited file. | none | none |
| EDIT-009 | 1 | Standard excludes the conditional timeline from client and PDF. | `tests/platter.test.mjs:923` | asserted |
| EDIT-009 | 1 | Premium includes the conditional timeline. | `tests/platter.test.mjs:923` | asserted |
| EDIT-010 | 1 | Client downloads the original W-9 bytes. | `tests/platter.test.mjs:424` | asserted |
| EDIT-010 | 1 | Replacing defaults leaves the sent revision snapshot unchanged. | `tests/platter.test.mjs:433` | asserted |
| EDIT-011 | 1 | Editable within three seconds. | `tests/editor-budget.mjs:75` | asserted |
| EDIT-011 | 1 | Two hundred keystrokes have p95 no more than 100 ms. | `tests/editor-budget.mjs:76` | asserted |
| EDIT-011 | 1 | Drag drop-to-paint no more than 300 ms. | `tests/editor-budget.mjs:77` | asserted |
| EDIT-011 | 1 | Server-confirmed quantity no more than 500 ms. | `tests/editor-budget.mjs:78` | asserted |
| EDIT-011 | 1 | Phone LCP no more than 2.5 seconds. | `tests/editor-budget.mjs:79` | asserted |
| EDIT-011 | 1 | Exactly two hundred real key events. | `tests/editor-budget.mjs:48` | asserted |
| EDIT-011 | 1 | Forty actual PDF pages. | `tests/editor-budget.mjs:73` | asserted |
| EDIT-011 | 1 | Thirty original images in the PDF. | `tests/editor-budget.mjs:73` | asserted |
| EDIT-012 | 1 | Content, currency, deposit and attachment metadata are copied. | `tests/platter.test.mjs:827` | asserted |
| EDIT-012 | 1 | Destination variables. The original full-target combination is not asserted by its old cited files. | none | none |
| EDIT-012 | 1 | role slots. The original full-target combination is not asserted by its old cited files. | none | none |
| EDIT-012 | 1 | every payment. The original full-target combination is not asserted by its old cited files. | none | none |
| EDIT-012 | 1 | delivery setting are copied. The original full-target combination is not asserted by its old cited files. | none | none |
| EDIT-012 | 2 | Copy clears approvals, acceptance, invoice and invitation. | `tests/platter.test.mjs:829` | asserted |
| EDIT-012 | 2 | Copy has no question, suggestion, delivery, PDF or withdrawal history. | `tests/platter.test.mjs:829` | asserted |
| EDIT-012 | 2 | Copy has no mail or view audit. | `tests/platter.test.mjs:830` | asserted |
| EDIT-012 | 2 | Copy has no payment records. No explicit read of a populated source payment collection establishes this absence. | none | none |
| EDIT-012 | 3 | Mandatory. Expected refusal statuses are asserted in the uncited harness; the full role/variable combination is not read back. | none | none |
| EDIT-012 | 3 | optional approval copy branches. Expected refusal statuses are asserted in the uncited harness; the full role/variable combination is not read back. | none | none |
| EDIT-012 | 4 | Source accepted response remains byte-identical. | `tests/platter.test.mjs:833` | asserted |
| EDIT-012 | 5 | Inheritance of future record kinds is a scope boundary, retained in the Requirement. | none | moved |
| EDIT-021 | 1 | Every current lifecycle source remains unchanged. | `tests/platter.test.mjs:843` | asserted |
| EDIT-021 | 1 | An unsent negotiated draft is copied. | `tests/platter.test.mjs:846` | asserted |
| EDIT-021 | 2 | Copy starts as a draft. | `tests/platter.test.mjs:826` | asserted |
| EDIT-021 | 2 | Copy starts at revision one. | `tests/platter.test.mjs:826` | asserted |
| EDIT-021 | 2 | Copy identifies its new preparing person. | `tests/platter.test.mjs:826` | asserted |
| EDIT-021 | 2 | Copy identifies its new sales owner. | `tests/platter.test.mjs:826` | asserted |
| EDIT-021 | 2 | Copy expiry has no started clock. | `tests/platter.test.mjs:828` | asserted |
| EDIT-021 | 2 | Every lifecycle authority. Individual null fields do not prove an uninspected collection. | none | none |
| EDIT-021 | 2 | including payments. Individual null fields do not prove an uninspected collection. | none | none |
| EDIT-021 | 2 | is absent. Individual null fields do not prove an uninspected collection. | none | none |
| EDIT-021 | 3 | Stale refusal. Old key behavior has a hard-coded refusal, not the required policy matrix. | none | none |
| EDIT-021 | 3 | company-policy standard copy behavior. Old key behavior has a hard-coded refusal, not the required policy matrix. | none | none |
| EDIT-021 | 4 | Compiled copy form. The browser assertions are outside the old Evidence set. | none | none |
| EDIT-021 | 4 | independent source at 1440 and 390. The browser assertions are outside the old Evidence set. | none | none |
| EDIT-014 | 1 | Every PDF page is marked not signed at revision two. | `tests/platter.test.mjs:665` | asserted |
| EDIT-014 | 1 | PDF has the selected package and amounts. | `tests/platter.test.mjs:666` | asserted |
| EDIT-014 | 1 | Timeline records the download. | `tests/platter.test.mjs:669` | asserted |
| EDIT-014 | 1 | Disabled download route is refused. | `tests/platter.test.mjs:678` | asserted |
| EDIT-014 | 1 | Disabled download control is absent. | `tests/platter.test.mjs:680` | asserted |
| EDIT-015 | 1 | Terms editing through both editor and API is refused to sales. The compiled editor assertion is in an uncited imported browser helper. | none | none |
| EDIT-015 | 1 | Content editor cannot unlock. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. | none | none |
| EDIT-015 | 1 | admin unlock changes audit. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. | none | none |
| EDIT-015 | 1 | requires approval. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. | none | none |
| EDIT-016 | 1 | Body/PDF search returns exactly three fixture proposals. | `tests/platter.test.mjs:1174` | asserted |
| EDIT-016 | 1 | Search over five hundred completes within one second. | `tests/platter.test.mjs:1173` | asserted |
| EDIT-016 | 1 | Outside-team filed proposals are absent in search/folder. | `tests/platter.test.mjs:1195` | asserted |
| EDIT-018 | 1 | Desktop/phone compiled banner identifies exact revision. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. | none | none |
| EDIT-018 | 1 | recipient. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. | none | none |
| EDIT-018 | 2 | The full three-package tax/deposit/schedule/conditional selection equals the sent page. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. | none | none |
| EDIT-018 | 3 | Out-of-bounds quantity eleven is refused. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. | none | none |
| EDIT-018 | 4 | Only signer two’s assigned fields appear. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. | none | none |
| EDIT-022 | 1 | Preview controls are disabled. | `tests/platter.test.mjs:871` | asserted |
| EDIT-022 | 1 | Every direct client submission is refused. | `tests/platter.test.mjs:881` | asserted |
| EDIT-022 | 2 | Complete business state remains unchanged after interactions. | `tests/platter.test.mjs:886` | asserted |
| EDIT-022 | 2 | Only preview audit rows are added. | `tests/platter.test.mjs:877` | asserted |
| EDIT-022 | 3 | Pending approver follows an exact revision-one approval-request link. The old preview fixture uses owner/member links rather than the named full request flow. | none | none |
| EDIT-022 | 4 | Signed-out and client-only sessions cannot preview. | `tests/platter.test.mjs:894` | asserted |
| EDIT-022 | 4 | A person outside proposal scope sees no preview content. An HTTP status alone is not a no-content assertion. | none | none |
| EDIT-022 | 5 | Preview audit identifies its actor. | `tests/platter.test.mjs:876` | asserted |
| EDIT-022 | 5 | Preview audit identifies its subject. | `tests/platter.test.mjs:876` | asserted |
| EDIT-022 | 5 | Preview audit records server time. | `tests/platter.test.mjs:876` | asserted |
| EDIT-022 | 5 | Refusals add no audit row. | `tests/platter.test.mjs:886` | asserted |
| EDIT-022 | 5 | Exact preview audit survives public CLI restore. Archive assertions compare broader data. | none | none |
| EDIT-022 | 5 | this point’s specific preview outcome is not isolated in the old Evidence set. | none | none |
| PORT-001 | 1 | All record. The archive journey asserts many records but never compares the complete re-exported part manifest. | none | none |
| PORT-001 | 1 | attachment parts are identical after export/import/re-export. The archive journey asserts many records but never compares the complete re-exported part manifest. | none | none |
| EDIT-021 | 5 | Copied content, files and delivery settings survive restore exactly. | `tests/archive.test.mjs:284` | asserted |
| MAIL-001 | 3 | The timed-out mail is contacted only once after later dispatches. | `tests/mail.test.mjs:385` | asserted |
| PRICE-001 | 1 | Two tables retain their cent-exact subtotals. | `tests/platter.test.mjs:956` | asserted |
| PRICE-001 | 1 | Every pricing line retains its quantity. | `tests/platter.test.mjs:960` | asserted |
| PRICE-001 | 1 | Every pricing line retains its unit. | `tests/platter.test.mjs:960` | asserted |
| PRICE-001 | 1 | Every pricing line retains its unit price. | `tests/platter.test.mjs:960` | asserted |
| PRICE-001 | 1 | Malformed input writes no proposal. | `tests/platter.test.mjs:973` | asserted |
| PRICE-001 | 1 | Every malformed quantity. Expected status assertions are in the uncited harness. | none | none |
| PRICE-001 | 1 | price is refused with the named status. Expected status assertions are in the uncited harness. | none | none |
| PRICE-001 | 1 | Reloaded client contains the expected total and every line. | `tests/platter.test.mjs:983` | asserted |
| PRICE-001 | 1 | PDF contains cent-exact totals. | `tests/platter.test.mjs:987` | asserted |
| PRICE-002 | 1 | The middle selection has its server total. | `tests/platter.test.mjs:1017` | asserted |
| PRICE-002 | 1 | Quantity eleven is refused. | `tests/platter.test.mjs:1020` | asserted |
| PRICE-002 | 1 | Agreement and PDF both retain every field of the same middle-package quantity-four selection. The target requires equality across every carrier, not a single successful read or subset of money fields. | none | none |
| PRICE-003 | 1 | Client summary shows one-off, monthly and first-year values. | `tests/recurring-journey.mjs:14` | asserted |
| PRICE-003 | 1 | Acceptance retains matching scheduled amounts. | `tests/recurring-journey.mjs:79` | asserted |
| PRICE-004 | 1 | Ten percent at group scope plus $500 total discount matches the fixture. The cited discount cases assert different combinations, without the complete named group-plus-total case. | none | none |
| PRICE-004 | 1 | A twenty-percent discount triggers approval. | `tests/platter.test.mjs:2175` | asserted |
| PRICE-007 | 1 | The exact 30%-deposit/two-milestone/monthly/net-15 schedule is shown. The old evidence tests several schedule selections; the full named combination and both reads are not asserted together. | none | none |
| PRICE-007 | 1 | frozen at acceptance. The old evidence tests several schedule selections; the full named combination and both reads are not asserted together. | none | none |
| PRICE-007 | 2 | A template’s 30%-deposit/net-15 terms survive an independently edited 25% proposal. The copied payment-term fields are not all asserted in the old Evidence set. | none | none |
| PRICE-008 | 1 | Legacy agreement, deposit and invoices stay exact. | `tests/archive.test.mjs:448` | asserted |
| PRICE-008 | 1 | Restored agreement is labelled AUD. | `tests/archive.test.mjs:412` | asserted |
| PRICE-008 | 1 | New proposals and acceptance are USD. | `tests/archive.test.mjs:427` | asserted |
| COLLAB-002 | 1 | Mention creates email and chat notification. | `tests/mail.test.mjs:1359` | asserted |
| COLLAB-002 | 1 | Thread is resolved. | `tests/mail.test.mjs:1370` | asserted |
| COLLAB-002 | 1 | Assigned section retains its due date. | `tests/mail.test.mjs:1371` | asserted |
| COLLAB-002 | 1 | Client page and API omit internal comments. | `tests/mail.test.mjs:1393` | asserted |
| COLLAB-002 | 1 | PDF omits internal comments. | `tests/mail.test.mjs:1396` | asserted |
| COLLAB-003 | 1 | Three revisions retain their numbers. | `tests/platter.test.mjs:92` | asserted |
| COLLAB-003 | 1 | Compare highlights changed scope and price. | `tests/platter.test.mjs:95` | asserted |
| COLLAB-003 | 1 | Restore becomes unapproved revision four. | `tests/platter.test.mjs:103` | asserted |
| APPROVE-001 | 1 | Saved threshold rules are the manager-above-$25,000. The rule-save operation’s expected-status assertions are in the uncited harness. | none | none |
| APPROVE-001 | 1 | owner-above-15% configuration. The rule-save operation’s expected-status assertions are in the uncited harness. | none | none |
| APPROVE-001 | 2 | Both matching steps appear in order. | `tests/platter.test.mjs:2217` | asserted |
| APPROVE-001 | 2 | Editing clears both steps. | `tests/platter.test.mjs:2218` | asserted |
| APPROVE-001 | 3 | Both parallel completion orders. Each named branch must be asserted in a cited file; command execution alone does not read back every result. | none | none |
| APPROVE-001 | 3 | rejection. Each named branch must be asserted in a cited file; command execution alone does not read back every result. | none | none |
| APPROVE-001 | 3 | unnamed billing refusal. Each named branch must be asserted in a cited file; command execution alone does not read back every result. | none | none |
| APPROVE-001 | 3 | invalid sales-rule save. Each named branch must be asserted in a cited file; command execution alone does not read back every result. | none | none |
| APPROVE-003 | 1 | Unruled $3,000 sales send has no approval record. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 2 | Manager approves matching $30,000. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 2 | owning sales sends. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 3 | Every role. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 3 | outside-team refusal changes no record. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 4 | Each owner/admin/manager no-rule default selects exactly the eligible decider. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-003 | 5 | Only authorized policy edits persist with actor/time. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. | none | none |
| APPROVE-004 | 1 | An edit clears all completed steps. | `tests/platter.test.mjs:2218` | asserted |
| APPROVE-004 | 1 | Sending after edit is refused until the next approval. Expected-status assertion lives in the uncited harness. | none | none |
| APPROVE-004 | 2 | Highest optional-quantity maximum. Every computed fact is not read back at its decision. | none | none |
| APPROVE-004 | 2 | currency-preserving threshold facts. Every computed fact is not read back at its decision. | none | none |
| APPROVE-004 | 3 | First-draft legal comparison. No asserting line in the old cited evidence. | none | none |
| APPROVE-004 | 3 | sequence/id tie order. No asserting line in the old cited evidence. | none | none |
| APPROVE-004 | 4 | Parallel order. The exact rejection/readback branches are not all asserted in the old files. | none | none |
| APPROVE-004 | 4 | rejected-revision refusal. The exact rejection/readback branches are not all asserted in the old files. | none | none |
| APPROVE-004 | 5 | Company-policy commitment decisions after both agent. No asserting line in the old cited evidence. | none | none |
| APPROVE-004 | 5 | human revisions. No asserting line in the old cited evidence. | none | none |
| SEND-002 | 1 | Delivered. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 1 | deferred-then-delivered. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 1 | hard bounce each display their state. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 2 | Both signed-provider correlations. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 2 | replay. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 2 | terminal regression cases. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 3 | Queued/complained/uncertain remain distinct. The complete listed branch set needs asserting lines, rather than a provider callback status alone. | none | none |
| SEND-002 | 4 | Compiled delivery history at 1440 and 390. Browser assertions are outside the cited wrapper file. | none | none |
| SEND-012 | 1 | Hard bounce creates both sender notice. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 1 | separate follow-up. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 2 | Current sender correction rotates link/session. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 2 | preserves offer/client. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 2 | routes verification to corrected address. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 3 | Provider acceptance closes correction while uncertainty leaves it open. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 4 | Dismissal retains the entered reason. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 5 | Both desktop/phone correction. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-012 | 5 | exact open/resolved CLI restore. The complete combination is not established by a cited asserting line for each listed effect. | none | none |
| SEND-004 | 1 | Seven-day offer becomes expired. | `tests/platter.test.mjs:712` | asserted |
| SEND-004 | 1 | Expired page explains the state. | `tests/platter.test.mjs:713` | asserted |
| SEND-004 | 2 | Verified reopening permits acceptance on same session. | `tests/platter.test.mjs:720` | asserted |
| SEND-004 | 3 | Fourteen calendar days retain the DST-aware deadline. | `tests/platter.test.mjs:710` | asserted |
| SEND-004 | 4 | Accepted never expires. Every independent clock branch must have a readback assertion. | none | none |
| SEND-004 | 4 | reinvite keeps clock. Every independent clock branch must have a readback assertion. | none | none |
| SEND-004 | 4 | negotiation restarts period. Every independent clock branch must have a readback assertion. | none | none |
| SEND-004 | 5 | Expiry settings. The complete outcome is not isolated in the cited archive assertions. | none | none |
| SEND-004 | 5 | reopen requests survive restore without transport authority. The complete outcome is not isolated in the cited archive assertions. | none | none |
| SEND-013 | 1 | Every unsigned signer receives one warning. The additional recipient assertions live in tests/recipients-http.mjs, outside the old Evidence set. | none | none |
| SEND-013 | 1 | every signed signer receives none. The additional recipient assertions live in tests/recipients-http.mjs, outside the old Evidence set. | none | none |
| SEND-013 | 2 | Extension moves the warning date without stale delivery. No asserting line in the old cited evidence. | none | none |
| SEND-013 | 3 | Repeated processing gives one warning. No asserting line in the old cited evidence. | none | none |
| SEND-013 | 3 | uncertain transport stays held. No asserting line in the old cited evidence. | none | none |
| SEND-013 | 4 | All warning facts/settings restore without sending authority. No asserting line in the old cited evidence. | none | none |
| SEND-010 | 1 | Each signer/approver/viewer/CC/shared/replaced link refuses all proposal content. The full recipient proof lives in tests/recipients-http.mjs; an HTTP 410 alone cannot assert content absence. | none | none |
| SEND-010 | 2 | Every email/text reminder is cancelled. Each independent channel must be asserted after withdrawal. | none | none |
| SEND-010 | 2 | every unpaid payment link is refused. Each independent channel must be asserted after withdrawal. | none | none |
| SEND-010 | 3 | Questions. | none | none |
| SEND-010 | 3 | sales/correction follow-ups. | none | none |
| SEND-010 | 3 | expiry warnings all stop. Separate lifecycle assertions are required for each named work item. | none | none |
| SEND-010 | 4 | Out-of-scope sender withdrawal leaves no changes. A refusal status alone is insufficient for the no-effect outcome. | none | none |
| SEND-010 | 5 | Accepted agreement withdrawal is refused. Expected-status assertion lives in the uncited harness. | none | none |
| SEND-015 | 1 | Notice per recipient. The full recipient inventory is not asserted in the old cited set. | none | none |
| SEND-015 | 1 | no notice when disabled. The full recipient inventory is not asserted in the old cited set. | none | none |
| SEND-015 | 2 | Partially signed withdrawal retains the first signature as void. The assertion is in tests/recipients-http.mjs, not the old cited files. | none | none |
| SEND-015 | 3 | Timeline/audit actor/time/reason plus report counts/totals. The exact entered reason must be read back in both records. | none | none |
| SEND-015 | 4 | New revision works. Each recipient and previous authority must be checked after reissue. | none | none |
| SEND-015 | 4 | every old link remains refused. Each recipient and previous authority must be checked after reissue. | none | none |
| SEND-015 | 5 | Compiled 1440/390 screens. The old browser wrapper has no asserting line. | none | none |
| SEND-015 | 5 | read-only CLI history without authority. The old browser wrapper has no asserting line. | none | none |
| TRACK-001 | 1 | Desktop and phone view records retain the city. | `tests/platter.test.mjs:2637` | asserted |
| TRACK-001 | 1 | Desktop and phone view records retain the region. | `tests/platter.test.mjs:2637` | asserted |
| TRACK-001 | 1 | Desktop and phone view records retain the country. | `tests/platter.test.mjs:2637` | asserted |
| TRACK-001 | 1 | Desktop and phone view records retain device class. | `tests/platter.test.mjs:2637` | asserted |
| TRACK-001 | 1 | Desktop and phone view records retain verified state. | `tests/platter.test.mjs:2637` | asserted |
| TRACK-001 | 1 | Both recipient addresses are retained. | `tests/platter.test.mjs:2642` | asserted |
| TRACK-001 | 1 | Sender receives a return alert. | `tests/platter.test.mjs:2647` | asserted |
| TRACK-001 | 2 | Ten-minute revisit does not create a second alert. | `tests/platter.test.mjs:2634` | asserted |
| TRACK-001 | 2 | Fifty-five-minute return produces first/return pair at exact times. | `tests/platter.test.mjs:2638` | asserted |
| TRACK-004 | 1 | Client page discloses measurement. | `tests/platter.test.mjs:2661` | asserted |
| TRACK-004 | 1 | Stored view excludes full request IP. | `tests/platter.test.mjs:2662` | asserted |
| TRACK-004 | 1 | Removing hold permits old views to expire. | `tests/platter.test.mjs:2667` | asserted |
| TRACK-004 | 1 | Client network makes no third-party request. A full network-host absence assertion is not in the old cited files; a rendered page alone is insufficient. | none | none |
| FOLLOW-002 | 2 | Personal-owner time-zone boundaries. The existing queue uses installation time-zone fixtures. | none | none |
| FOLLOW-002 | 3 | Interim exact queue order is asserted. | `tests/followup-journey.mjs:42` | asserted |
| FOLLOW-002 | 4 | All equal-date/reason sent-time/proposal-number. Current stable-id behavior does not establish future proposal-number ties. | none | none |
| FOLLOW-002 | 4 | currency tie outcomes. Current stable-id behavior does not establish future proposal-number ties. | none | none |
| FOLLOW-009 | 2 | Notice leaves work open. All listed decisions require separate assertion lines. | none | none |
| FOLLOW-009 | 2 | reason-free dismissal is refused. All listed decisions require separate assertion lines. | none | none |
| FOLLOW-009 | 3 | Every creation/revision action. No asserting line in the old cited evidence. | none | none |
| FOLLOW-009 | 3 | explicit reopening retains the right due date. No asserting line in the old cited evidence. | none | none |
| FOLLOW-009 | 4 | Acceptance. | none | none |
| FOLLOW-009 | 4 | decline. | none | none |
| FOLLOW-009 | 4 | withdrawal. | none | none |
| FOLLOW-009 | 4 | unanswered question lifecycles reconcile. Checking one terminal case does not cover the full named branch set. | none | none |
| FOLLOW-009 | 5 | Every history field. No asserting line in the old cited evidence. | none | none |
| FOLLOW-009 | 5 | authority absence survives restore. No asserting line in the old cited evidence. | none | none |
| FOLLOW-010 | 1 | Due-filter totals equal fixture values. | `tests/platter.test.mjs:195` | asserted |
| FOLLOW-010 | 1 | Due-date order and count match fixture. | `tests/platter.test.mjs:194` | asserted |
| FOLLOW-010 | 2 | All sales/manager team-scope queues use the current owner. The full role-scope branch set is not asserted in the old evidence. | none | none |
| FOLLOW-010 | 3 | Compiled 1440 and 390 queue screens. Asserting browser helpers are not in the old cited Evidence set. | none | none |
| FOLLOW-004 | 1 | Client pricing question. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 1 | app answer. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 1 | exact notification. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 1 | queue removal. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 1 | retained agreement thread. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 2 | Scope/terms. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 2 | every unverified/stale/invalid-section refusal. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 3 | Member queue. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 3 | held-policy agent answer. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 4 | Every signed intake authority. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 4 | expiry. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 4 | replay. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 4 | no-second-notification outcome. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 5 | Compiled owner/client/queue/agreement at both widths. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| FOLLOW-004 | 6 | Answered/open CLI threads with genuine reply credentials excluded. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. | none | none |
| NEG-001 | 1 | Revision-one link is refused after replacement. | `tests/platter.test.mjs:125` | asserted |
| NEG-001 | 1 | Acceptance identifies revision two. | `tests/platter.test.mjs:132` | asserted |
| NEG-002 | 1 | Only accepted suggestion enters revision two. | `tests/platter.test.mjs:393` | asserted |
| NEG-002 | 1 | Rejected suggestion remains rejected. | `tests/platter.test.mjs:393` | asserted |
| SIGN-008 | 1 | Upload acceptance retains signer and date. | `tests/platter.test.mjs:564` | asserted |
| SIGN-008 | 1 | File download returns exact signed bytes. | `tests/platter.test.mjs:566` | asserted |
| SIGN-008 | 1 | Agreement visibly distinguishes upload. | `tests/platter.test.mjs:562` | asserted |
| SIGN-008 | 1 | Deposit export has expected amount. | `tests/platter.test.mjs:572` | asserted |
| PAY-002 | 1 | Required completion waits after declined card. | `tests/collection-browser.mjs:86` | asserted |
| PAY-002 | 1 | Successful deposit completes agreement. | `tests/collection-browser.mjs:95` | asserted |
| PAY-002 | 2 | Due completion stays accepted after decline. | `tests/collection-browser.mjs:86` | asserted |
| PAY-002 | 2 | Due-deposit amount remains outstanding after the declined payment. The cited browser assertion checks accepted state; a separate exact due-money readback is needed. | none | none |
| REPORT-001 | 1 | Each visible pipeline row has the expected status. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Each visible pipeline row has the expected owner. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Each visible pipeline row has the expected client. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Each visible pipeline row has the expected value. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Each visible pipeline row has the expected next action. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Each visible pipeline row has the expected age. | `tests/platter.test.mjs:190` | asserted |
| REPORT-001 | 1 | Count and total reconcile with the entire fixture. | `tests/platter.test.mjs:191` | asserted |
| REPORT-001 | 1 | Filter sets and sort order match fixture. | `tests/platter.test.mjs:208` | asserted |
| REPORT-001 | 2 | Every role’s full visible report set. The matrix includes unimplemented content/revenue specialist reports. | none | none |
| REPORT-001 | 3 | Edits retain sales ownership. | `tests/platter.test.mjs:220` | asserted |
| REPORT-001 | 3 | Agent drafts retain sponsor ownership. | `tests/platter.test.mjs:224` | asserted |
| REPORT-006 | 1 | Weekly win-rate report reaches two people with exact screen rows/figures and CSV. REPORT-002 win-rate does not exist; pipeline fallback does not assert it. | none | none |
| REPORT-006 | 3 | Once-only run. Every independent branch needs its own assertion. | none | none |
| REPORT-006 | 3 | inactive recipients. Every independent branch needs its own assertion. | none | none |
| REPORT-006 | 3 | uncertain delivery across downtime. Every independent branch needs its own assertion. | none | none |
| REPORT-006 | 4 | Schedules restore without transport. This part’s old Evidence set omits the archive assertion file. | none | none |
| TEAM-004 | 1 | Each current audit action retains its actor. | `tests/platter.test.mjs:280` | asserted |
| TEAM-004 | 1 | Each current audit action retains its actor role. | `tests/platter.test.mjs:280` | asserted |
| TEAM-004 | 1 | Each current audit action retains its subject. | `tests/platter.test.mjs:280` | asserted |
| TEAM-004 | 1 | Each current audit action retains server time. | `tests/platter.test.mjs:280` | asserted |
| TEAM-004 | 1 | Filtered CSV is exactly the ordered row fields. | `tests/platter.test.mjs:297` | asserted |
| TEAM-004 | 2 | Agent and verified client actor ids are distinct. | `tests/platter.test.mjs:281` | asserted |
| TEAM-004 | 2 | Unknown invitation actor stays unidentified. | `tests/platter.test.mjs:283` | asserted |
| TEAM-004 | 2 | Populated audit excludes credentials and input payloads. | `tests/platter.test.mjs:301` | asserted |
| TEAM-004 | 3 | Compiled admin/owner audit. The old browser Evidence file imports the assertion helpers rather than containing them. | none | none |
| TEAM-004 | 3 | unauthorized readers at 1440/390. The old browser Evidence file imports the assertion helpers rather than containing them. | none | none |
| TEAM-004 | 4 | Exact audit rows survive public CLI export. | `tests/archive.test.mjs:233` | asserted |
| TEAM-004 | 5 | Future capability inheritance is retained in Requirement. | none | moved |
| MOB-001 | 1 | Sales template/send/answer/queue. All browser asserting lines are outside the sole old cited wrapper. | none | none |
| MOB-001 | 1 | manager approval. All browser asserting lines are outside the sole old cited wrapper. | none | none |
| MOB-001 | 1 | sales refusal at 390. All browser asserting lines are outside the sole old cited wrapper. | none | none |
| AI-003 | 1 | MCP search. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 1 | schema. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 1 | draft/revision/status. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 1 | engagement. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 2 | One retained send request with unchanged business state before execution. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 3 | Held. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 3 | all-autonomous company-policy execution. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 3 | revoked/foreign-origin refusal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 4 | Stale revision. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 4 | dismissal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 4 | exact fulfillment. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 5 | Premature/unauthorized queue refusal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 5 | absence of credentials. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 6 | Compiled queue at both widths. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| AI-003 | 6 | exact credential-free CLI restore. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. | none | none |
| PORT-002 | 1 | Displayed document and brand survive restore. | `tests/archive.test.mjs:265` | asserted |
| PORT-002 | 1 | Every product record/attachment part is identical on re-export. Named subset comparisons do not establish a complete part inventory equality. | none | none |
| PORT-002 | 2 | Invitation credentials do not appear as archive rows. | `tests/archive.test.mjs:571` | asserted |
| PORT-002 | 2 | Every provider/agent/native/verification/mail credential kind is absent from the populated archive. Every named exclusion requires a mechanism assertion; one empty table is insufficient. | none | none |
| FOLLOW-002 | 1 | The complete seven-proposal target order is A,C,D,F,E,B,G. | `tests/followup-journey.mjs:48` | asserted |
| FOLLOW-009 | 1 | Completing C removes it from the queue. | `tests/followup-journey.mjs:81` | asserted |
| FOLLOW-009 | 1 | The entered call action, actor and time are retained. | `tests/followup-journey.mjs:105` | asserted |
| FOLLOW-009 | 1 | The separate bounce correction remains open. | `tests/followup-journey.mjs:83` | asserted |
| NEG-001 | 1 | Replacement client page shows old and changed prices. | `tests/platter.test.mjs:127` | asserted |
| NEG-001 | 1 | Replacement client page shows changed scope. | `tests/platter.test.mjs:127` | asserted |
| SIGN-002 | 1 | Replay retains option two: exact total remains 420000 rather than option one’s 240000. | `tests/platter.test.mjs:51` | asserted |
| SEND-001 | 1 | Google send reaches the provider once. | `tests/mail.test.mjs:628` | asserted |
| SEND-001 | 1 | Microsoft send reaches its provider once. | `tests/mail.test.mjs:635` | asserted |
| SEND-001 | 1 | Revoked/refused Google grant falls back visibly. | `tests/mail.test.mjs:694` | asserted |
| SEND-001 | 1 | Refused Microsoft grant falls back visibly. | `tests/mail.test.mjs:683` | asserted |
| SEND-001 | 2 | Verified alias is recorded as Google sender at the client-facing transport. | `tests/mail.test.mjs:581` | asserted |
| SEND-001 | 2 | Microsoft SMTP address is the message sender. | `tests/mail.test.mjs:585` | asserted |
| SEND-001 | 2 | Google attribution records the sending person. | `tests/mail.test.mjs:629` | asserted |
| SEND-001 | 2 | Google attribution records the Google route. | `tests/mail.test.mjs:629` | asserted |
| SEND-001 | 2 | Google attribution records the mailbox address. | `tests/mail.test.mjs:629` | asserted |
| SEND-001 | 2 | Google attribution records the actual outcome. | `tests/mail.test.mjs:629` | asserted |
| SEND-001 | 2 | Microsoft attribution records the Microsoft route. | `tests/mail.test.mjs:635` | asserted |
| SEND-001 | 2 | Microsoft attribution records the mailbox address. | `tests/mail.test.mjs:635` | asserted |
| SEND-001 | 2 | Microsoft attribution records the actual outcome. | `tests/mail.test.mjs:635` | asserted |
| SEND-001 | 2 | Timeline names sender and provider-accepted state. | `tests/mail.test.mjs:633` | asserted |
| SEND-001 | 2 | Audit retains actual actor and sender address. | `tests/mail.test.mjs:632` | asserted |
| SEND-001 | 3 | Every refused duplicate/unverified/no-SMTP connection preserves all bindings. | `tests/mail.test.mjs:620` | asserted |
| SEND-001 | 3 | Each attempted bad connection has its expected refusal. | `tests/mail.test.mjs:604` | asserted |
| SEND-001 | 4 | Role demotion causes no outbound provider request. | `tests/mail.test.mjs:678` | asserted |
| SEND-001 | 5 | Fallback records installation sender. | `tests/mail.test.mjs:685` | asserted |
| SEND-001 | 5 | Fallback connection visibly becomes broken. | `tests/mail.test.mjs:682` | asserted |
| SEND-001 | 5 | Fallback notice is visible. | `tests/mail.test.mjs:683` | asserted |
| SEND-011 | 1 | Both Google and Microsoft incoming replies retain exact text. | `tests/mail.test.mjs:653` | asserted |
| SEND-011 | 1 | Each reply appears on its proposal page. | `tests/mail.test.mjs:655` | asserted |
| SEND-011 | 1 | Neither proposal nor approval decision changes from reply. | `tests/mail.test.mjs:654` | asserted |
| SEND-011 | 2 | Automatic/bulk messages leave no record, notification, audit or state change. | `tests/mail.test.mjs:647` | asserted |
| SEND-011 | 3 | Reply cap notifies owner only once. | `tests/mail.test.mjs:671` | asserted |
| SEND-011 | 3 | Non-owner receives no cap notice. | `tests/mail.test.mjs:668` | asserted |
| SEND-011 | 4 | Inbound reply retains its claimed From. | `tests/mail.test.mjs:653` | asserted |
| SEND-011 | 4 | Inbound reply retains provider SPF result. | `tests/mail.test.mjs:653` | asserted |
| SEND-011 | 4 | Inbound reply retains provider DKIM result. | `tests/mail.test.mjs:653` | asserted |
| SEND-011 | 4 | Displayed From remains explicitly unproven. | `tests/mail.test.mjs:656` | asserted |
| REPORT-005 | 1 | Every filtered row and field equals the screen in order. | `tests/platter.test.mjs:591` | asserted |
| REPORT-005 | 1 | CSV count and exact currency total equal the fixture. | `tests/platter.test.mjs:592` | asserted |
| REPORT-005 | 2 | Other reports inherit the export boundary retained in the Requirement. | none | moved |
| REPORT-006 | 2 | Weekly run stays at 08:00 in its configured zone. | `tests/platter.test.mjs:623` | asserted |
| REPORT-006 | 2 | A daylight-saving transition changes the UTC instant by an hour. | `tests/platter.test.mjs:624` | asserted |
| REPORT-006 | 2 | Scheduled messages contain every screen row with run-time age. | `tests/platter.test.mjs:619` | asserted |
| REPORT-006 | 2 | Scheduled count and currency total match the screen. | `tests/platter.test.mjs:618` | asserted |
| EDIT-009 | 1 | Accepted Standard omits the timeline while Premium includes it in the immutable snapshot. | `tests/platter.test.mjs:934` | asserted |
| EDIT-009 | 2 | Variable-dependent visibility on every carrier is unproved; package-condition assertions do not establish this outcome. | none | none |
| SEND-003 | 1 | Each signer, CFO approver and viewer opens a separate link. The assertions are in tests/recipients-http.mjs, which the old Status Evidence does not cite. | none | none |
| SEND-003 | 1 | The viewer’s signing attempt is refused. The assertions are in tests/recipients-http.mjs, which the old Status Evidence does not cite. | none | none |
| SEND-003 | 1 | Removing the viewer revokes their link. The assertions are in tests/recipients-http.mjs, which the old Status Evidence does not cite. | none | none |
| SEND-003 | 1 | Stakeholder conversion sends no automatic invitation. | `tests/platter.test.mjs:2766` | asserted |
| SEND-003 | 1 | Stakeholder conversion creates no invitation authority. | `tests/platter.test.mjs:2767` | asserted |
| EDIT-014 | 1 | Each individual PDF page identifies the chosen package; aggregate PDF text does not assert this per-page outcome. | none | none |
| COLLAB-003 | 1 | Restored revision four cannot be sent until it is approved again; the expected-status assertion is in tests/harness.mjs, outside this clause’s old Evidence set. | none | none |
| SIGN-008 | 1 | The accepted-by-upload agreement is followed by a client-facing deposit request; owner invoice export and its CSV are asserted, while this outbound request is not. | none | none |
| TRACK-001 | 1 | The rendered proposal timeline shows city for both recipient views. API record assertions do not assert that rendered field; the cited browser file only imports tests/tracking-browser.mjs. | none | none |
| TRACK-001 | 1 | The rendered proposal timeline shows region for both recipient views. API record assertions do not assert that rendered field; the cited browser file only imports tests/tracking-browser.mjs. | none | none |
| TRACK-001 | 1 | The rendered proposal timeline shows country for both recipient views. API record assertions do not assert that rendered field; the cited browser file only imports tests/tracking-browser.mjs. | none | none |
| TRACK-001 | 1 | The rendered proposal timeline shows device class for both recipient views. API record assertions do not assert that rendered field; the cited browser file only imports tests/tracking-browser.mjs. | none | none |
| EDIT-005 | 1 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3060` | asserted |
| EDIT-005 | 2 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3062` | asserted |
| EDIT-005 | 3 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3070` | asserted |
| EDIT-019 | 1 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3092` | asserted |
| EDIT-019 | 2 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3098` | asserted |
| EDIT-019 | 3 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3100` | asserted |
| EDIT-020 | 1 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3118` | asserted |
| EDIT-020 | 2 | Main’s document import/export journey covers this carried part. | `tests/platter.test.mjs:3121` | asserted |
