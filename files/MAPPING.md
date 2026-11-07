# Complete test and journey mapping

One occurrence per full push Verify before and after. Nested suite names are included so filters use full test names. Each test callback retains all existing assertions; no assertion-bearing file changes.

| File:line | Test/journey | Before | After |
| --- | --- | --- | --- |
| tests/platter.test.mjs:21 | EDIT-017 Spanish mailbox journey preserves authority, verification limits, authored content and actual certificate language | business_authoring | business_authoring |
| tests/platter.test.mjs:100 | HTTP-001 complete authorized domain dispatch journey and native auth, CSRF, roles and revocable agent boundary | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:156 | PROP-001 / PROP-002 exact approvals, frozen offers and fresh invitations invalidate old authority | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:175 | email verification precedes acceptance, code is single-use, immutable option and deposit exported once | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:185 | SIGN-001 complete verified-mailbox acceptance journey | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:292 | money rejects malformed or unsafe prices and cannot export an unaccepted proposal | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:295 | Client CSV dry run, fingerprint custody, journal, replay and undo through HTTP | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:313 | import undo preserves clients with dependent proposals; owner erasure fences unused client | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:317 | COLLAB-003 every saved revision has an author/time, comparisons highlight changes, restore creates unapproved revision four | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:343 | NEG-001 negotiated offer requires exact approval, preserves the live offer until send, compares changes and accepts revision two | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:385 | FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership | business_lifecycle | business_authoring |
| tests/platter.test.mjs:448 | TEAM-004 current person, agent, invitation, signature, native, import and invoice actions have searchable/exportable actors and times | business_authoring | business_authoring |
| tests/platter.test.mjs:510 | AI-003 MCP client searches, drafts, reads engagement and queues exact revisions without authority to approve/send/sign/refund | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:765 | NEG-002 / TEAM-004 opt-in tracked terms edits accept one/reject one into revision two, preserve offer and require fresh approval | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:808 | EDIT-010 / TEAM-004 defaults and arbitrary files freeze with approval, download exact bytes and remain in the signed package after replacement | business_authoring | business_authoring |
| tests/platter.test.mjs:862 | MIG-006 imports 200 contacts across 60 companies with reviewed custody, resumable apply and complete undo | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:889 | MIG-006 / CAT-001 unchanged PandaDoc catalog and contact layouts preserve exact prices, packages, image bytes and explicit company associations | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:924 | MIG-006 reviewed mapper supports original incumbent CSVs and holds identity conflicts without merging | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:951 | SIGN-008 / TEAM-004 owner records a client-signed copy as accepted by upload, distinct from e-signature, then exports the deposit | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:991 | FOLLOW-005 / EDIT-016 / REPORT-005 / REPORT-006 / FOLLOW-002 / TEAM-004 pipeline exports to CSV as filtered and emails weekly to two named people with the screen figures | business_lifecycle | business_authoring |
| tests/platter.test.mjs:1057 | EDIT-014 / TEAM-004 exact unsigned revision PDF keeps selected prices and every page marked; disabling refuses download without a write | business_authoring | business_authoring |
| tests/platter.test.mjs:1105 | SEND-004 / SEND-013 / TEAM-004 calendar expiry warns unsigned only, supports same-link reopening and reissue, and never expires accepted agreements | business_authoring | business_authoring |
| tests/platter.test.mjs:1172 | SEND-010 / SEND-015 / FOLLOW-009 withdrawal revokes every current public door, preserves history, notifies optionally and reissues only with approval | business_authoring | business_authoring |
| tests/platter.test.mjs:1219 | EDIT-012 duplicate accepted content into an independent member-owned draft for another client without changing the source | archive_custody | archive_custody |
| tests/platter.test.mjs:1303 | EDIT-018 / EDIT-022 member-only exact-revision previews share selection math and never change business state | business_authoring | business_authoring |
| tests/platter.test.mjs:1422 | FOLLOW-002 / FOLLOW-009 / FOLLOW-010 sales queue orders current reasons and separates notification, logged completion, correction and withdrawal | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:1424 | EDIT-009 conditional sections match selected preview, client, PDF and immutable agreement; revisions, copies and negotiations retain rules | business_authoring | business_authoring |
| tests/platter.test.mjs:1472 | PRICE-001 / COLLAB-003 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / PROP-001 / TEAM-004 tables recompute twelve grouped lines, preserve every carrier and refuse malformed prices and quantities | business_authoring | business_authoring |
| tests/platter.test.mjs:1523 | PRICE-002 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / COLLAB-003 / PORT-002 arbitrary packages and bounded optional quantities share server totals and immutable selection | business_authoring | business_authoring |
| tests/platter.test.mjs:1639 | PRICE-002 / SIGN-008 / TEAM-004 signed-upload selections use sent prices, refuse invalid quantities without writes, and freeze the exact agreement and invoice | business_authoring | business_authoring |
| tests/platter.test.mjs:1683 | EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries | browser_documents | browser_documents |
| tests/platter.test.mjs:1685 | EDIT-016 body phrase search returns exactly three of 500 proposals including an uploaded PDF with live folder permissions | archive_restore | archive_restore |
| tests/platter.test.mjs:1726 | SEND-014 self-test mail uses only the active sign-in address, previews an unsent revision and atomically limits daily rehearsals without sending an offer | business_authoring | business_authoring |
| tests/platter.test.mjs:1809 | FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval | business_lifecycle | business_authoring |
| tests/platter.test.mjs:1975 | TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP | business_authoring | business_authoring |
| tests/platter.test.mjs:2187 | TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs | business_authoring | business_authoring |
| tests/platter.test.mjs:2240 | TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens | business_authoring | business_authoring |
| tests/platter.test.mjs:2278 | TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund | business_authoring | business_authoring |
| tests/platter.test.mjs:2360 | TEAM-007 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content | business_authoring | business_authoring |
| tests/platter.test.mjs:2411 | TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval | business_authoring | business_authoring |
| tests/platter.test.mjs:2470 | TEAM-006 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses | business_authoring | business_authoring |
| tests/platter.test.mjs:2552 | TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals | business_authoring | business_authoring |
| tests/platter.test.mjs:2582 | TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence | business_authoring | business_authoring |
| tests/platter.test.mjs:2701 | TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace | business_authoring | business_authoring |
| tests/platter.test.mjs:2725 | TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state | business_authoring | business_authoring |
| tests/platter.test.mjs:2753 | PRICE-004 scoped discounts preserve exact selections, private margins, templates and public PDF and JSON custody | business_authoring | business_authoring |
| tests/platter.test.mjs:2811 | APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied | business_lifecycle | browser_documents |
| tests/platter.test.mjs:2942 | TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership | business_authoring | business_authoring |
| tests/platter.test.mjs:2968 | EDIT-001 document revisions preserve ordered blocks and brand through preview, restore, copies, templates, negotiation and exact client PDF | business_authoring | business_authoring |
| tests/platter.test.mjs:3029 | EDIT-001 block saves enforce live proposal scope, stale versions, content bounds, safe brand values and locked terms | business_authoring | business_authoring |
| tests/platter.test.mjs:3066 | EDIT-001 display media requires consent and live edit scope, stays private until placed and keeps exact bytes through copies and templates | business_authoring | business_authoring |
| tests/platter.test.mjs:3148 | EDIT-001 Client-assigned required fields and typed signature blocks validate at signing and freeze exact values with the selected agreement | business_authoring | business_authoring |
| tests/platter.test.mjs:3174 | EDIT-001 new sections inherit verified questions and opt-in tracked edits without changing the sent document or bypassing review | business_authoring | business_authoring |
| tests/platter.test.mjs:3200 | EDIT-011 server-confirmed quantity edits retain document content, clear approval and enforce bounds, scope and exact version | business_authoring | business_authoring |
| tests/platter.test.mjs:3217 | EDIT-003 linked draft copies propagate atomically while detached, sent and accepted copies retain exact content | business_authoring | business_authoring |
| tests/platter.test.mjs:3257 | EDIT-003 insertion enforces live role, folder and proposal scope, consent, stale versions and locked terms without writes | business_authoring | business_authoring |
| tests/platter.test.mjs:3315 | deposit signatures survive declines, required acceptance waits for Stripe success and due acceptance stays complete | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3324 | card fees require admin confirmation, remain separate and exempt ACH and prohibited billing states | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3329 | proposal methods copy template overrides or workspace defaults and remain independent | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3331 | TRACK-001 opted-in views retain trusted coarse location, verification and device with quiet-period owner alerts | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3362 | TRACK-004 disclosure, bounded retention and explicit erasure respect holds and owner authority | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3384 | TRACK-001 measured views use trusted coarse locations, label identity, claim quiet-period alerts and preserve preview isolation | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3418 | TRACK-004 owner retention and erasure remove views and dependent engagement without changing proposal records | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3444 | TRACK-002 reading events retain monotonic section times and validated package choices on the exact view | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3518 | TRACK-003 forwarded viewers verify their own mailbox before owner conversion to an approver record without inherited signing authority | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3538 | PRICE-003 recurring fees keep exact schedules, first-year queue value and immutable selected documents | business_authoring | business_authoring |
| tests/platter.test.mjs:3545 | AUTO-004 scoped REST drafting, immutable owner keys and human-only authority | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3584 | AUTO-004 signed lifecycle webhooks retry, log, redact and stop on revocation | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3661 | AUTO-004 published route reference matches live methods and webhook schemas both ways | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3699 | AUTO-004 terminal proposal projections scoped status and analytics distinguish withdrawn and expired offers from live offers | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3727 | AUTO-004 negotiated lifecycle delivery receiver gets revised and approved events for each negotiated revision before it is sent | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3760 | AUTO-004 complete lifecycle receiver coverage receiver obtains all ten lifecycle types including every terminal outcome | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3796 | AUTO-004 independently documented authority each published method and route declares its independently expected scope | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3812 | SIGN-004 sequential and parallel recipient groups complete only after every signature | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:3818 | SEND-003 separately verified roles, removed viewers and unfilled template slots through HTTP | business_authoring | business_authoring |
| tests/platter.test.mjs:3819 | EDIT-004 linked deal variables refuse missing values, freeze the sent revision and refill destination copies | business_authoring | business_authoring |
| tests/platter.test.mjs:3866 | EDIT-005 Word import maps tokens and catalog quote rows, keeps editable blocks and splits Heading 1 library sections | business_authoring | business_authoring |
| tests/platter.test.mjs:3898 | EDIT-005 fixed PDF originals remain exact with a page-three signature and appended selected unsigned pricing | business_authoring | business_authoring |
| tests/platter.test.mjs:3922 | EDIT-005 Word and PDF exports retain heading styles, four exact table lines, two images and reading order | business_authoring | business_authoring |
| tests/platter.test.mjs:3937 | PRICE-005 owner tax follows selected quantities and discounts, freezes rates and refuses unsafe writes | business_authoring | business_authoring |
| tests/platter.test.mjs:4002 | AUTO-002 completed agreements archive exact PDFs once under explicit current Drive authority and reconcile uncertain writes without replay | business_lifecycle | runtime |
| tests/platter.test.mjs:4075 | MIG-003 and MIG-007 exported document move-in resumes across sessions, holds ambiguous report matches and guards originals and undo | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:4232 | CRM-001 reviewed HubSpot deal drafts retain exact prices and provenance and refuse changed source or authority without writes | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:4328 | ACCT-002 reviewed Xero deposits preserve exact money, authority, unique mappings and uncertain-write holds | business_lifecycle | business_lifecycle |
| tests/platter.test.mjs:4440 | AGENT-007 owner compares 200 distinct decided proposals at exact revisions without applying template or price changes | business_lifecycle | archive_restore |
| tests/demo.test.mjs:8 | the demo opens on a lived-in studio and a send completes as mocked success | business_lifecycle | business_lifecycle |
| tests/demo.test.mjs:27 | hosting preflight refuses incomplete account access before any build or deployment | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:33 | EDIT-017 Spanish invitation and mailbox code retain authored mail and consume localized code transport | business_authoring | business_authoring |
| tests/mail.test.mjs:59 | SEND-006 invitation, fresh link and negotiated send deliver edited text and retain exact link-free history atomically | business_authoring | business_authoring |
| tests/mail.test.mjs:108 | FOLLOW-004 verified client questions, native answers and one-use authenticated owner email replies | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:239 | client questions are limited per invitation, and a refused question stores nothing and mails no one | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:256 | MAIL-001 local proposal and verification mail are captured without provider contact | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:287 | MAIL-001 Managed relay sends proposal invitations and verification codes through its assigned endpoint | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:318 | MAIL-001 hosted mail commits and claims before provider acceptance; timeout is uncertain and never resent | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:425 | SEND-006 / SEND-002 / SEND-012 signed provider delivery, durable sender notice and actionable address correction | business_authoring | business_authoring |
| tests/mail.test.mjs:517 | SEND-002 / SEND-012 SendGrid signed correlation, queued state, uncertainty and logged dismissal | business_authoring | business_authoring |
| tests/mail.test.mjs:559 | APPROVE-003 / TEAM-001 a sales sender owns bounce correction, foreign senders are refused, and every fresh invitation obeys the current approval policy | business_lifecycle | browser_documents |
| tests/mail.test.mjs:588 | SEND-001 / SEND-011 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail | business_authoring | business_authoring |
| tests/mail.test.mjs:746 | SEND-001 / FOLLOW-001 signed-mailbox scheduled reminders honor recipient quiet hours, caps and terminal decisions without retrying uncertain sends | business_authoring | business_authoring |
| tests/mail.test.mjs:817 | FOLLOW-008 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:861 | SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh | business_authoring | business_authoring |
| tests/mail.test.mjs:903 | FOLLOW-001 / FOLLOW-006 / FOLLOW-011 template and workspace delivery snapshots preview exact dates, send on those dates, remain editable without approval and never copy authority | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:905 | FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:932 | APPROVE-002 explicit requests deliver exact revision previews by email and Slack, bind noted decisions and remind pending approvers once | business_lifecycle | browser_documents |
| tests/mail.test.mjs:1020 | APPROVE-002 notification consent, exact plan, active scope and uncertain delivery prevent unauthorized or repeated outbound requests | business_lifecycle | browser_documents |
| tests/mail.test.mjs:1082 | AUTO-003 signed events reach Slack channels and approval requests reach verified Teams direct chats with session protected links | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:1167 | FOLLOW-003 sender expiry notices create dated follow-ups independently of signer warnings and follow extensions, workspace defaults and terminal states | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:1207 | FOLLOW-003 saved settings stay inactive and queued expiry email rechecks revocation, settings, sender demotion and revision authority | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:1275 | SEND-008 explicit SMS consent, signed delivery callbacks, HELP and STOP preserve independent email reminders | business_authoring | business_authoring |
| tests/mail.test.mjs:1374 | SEND-008 quiet hours defer manual SMS and SEND-010 withdrawal atomically cancels queued texts without duplicate transport | business_authoring | business_authoring |
| tests/mail.test.mjs:1427 | SEND-008 rotated invitations, lost sender scope and uncertain SMS outcomes cannot replay sending authority | business_authoring | business_authoring |
| tests/mail.test.mjs:1533 | SEND-005 personal Slack and email preferences deliver client open, comment, signature and payment events once through scoped links | business_authoring | business_authoring |
| tests/mail.test.mjs:1616 | SEND-005 personal notification revocation and lost proposal scope suppress queued and future sends | business_authoring | business_authoring |
| tests/mail.test.mjs:1644 | SIGN-006 SMS verification limits wrong codes and SIGN-005 certificates retain the actual method and exact signed PDF hash | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:1732 | SEND-007 unsigned replacement preserves the frozen offer, revokes old authority and retains certificate custody through races | business_authoring | business_authoring |
| tests/mail.test.mjs:1734 | COLLAB-002 scoped colleagues comment, receive consented generic email and chat, resolve and assign without exposing internal threads to clients | archive_media | archive_media |
| tests/mail.test.mjs:1840 | SIGN-005 completion mail attaches the retained PDFs to both parties once, through installation and connected mailbox transports | business_lifecycle | business_lifecycle |
| tests/mail.test.mjs:1924 | PAY-005 confirmed deposit attempts notify both parties once and hold revoked, obsolete, uncertain or interrupted mail without replay | business_lifecycle | business_lifecycle |
| tests/archive.test.mjs:38 | FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences | archive_custody | archive_custody |
| tests/archive.test.mjs:438 | PORT-001 public CLI refuses corrupt and pre-erasure archives and retains accepted money through the later erasure journal | archive_restore | archive_restore |
| tests/archive.test.mjs:494 | PRICE-002 / EDIT-012 / REPORT-001 / PRICE-008 public CLI restores re-exported first-release AUD bytes and new proposals and acceptances use USD without conversion | archive_custody | archive_custody |
| tests/archive.test.mjs:549 | SEND-002 public CLI preserves bounce follow-ups and logged action without provider events or invitation credentials | browser_documents | browser_documents |
| tests/archive.test.mjs:583 | MIG-003, MIG-006 and MIG-007 public CLI archives imported business records, exported documents, original CSV and image bytes with undo custody | archive_restore | archive_restore |
| tests/archive.test.mjs:667 | SEND-006 public CLI retains real invitation text, excludes rehearsal content and preserves its test-send audit without invitation authority | archive_media | archive_media |
| tests/archive.test.mjs:786 | TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items | archive_media | archive_media |
| tests/archive.test.mjs:966 | APPROVE-002 / AUTO-003 / FOLLOW-003 public CLI retains notification business history without credentials, queued messages or restored outbound authority | archive_media | archive_media |
| tests/archive.test.mjs:1154 | EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority | archive_media | archive_media |
| tests/archive.test.mjs:1279 | PRICE-005 public CLI preserves business tax rates and frozen agreements without restoring signing authority | archive_custody | archive_custody |
| tests/archive.test.mjs:1334 | AUTO-002 public CLI retains exact document archive history and artifacts without restoring credentials or execution authority | archive_restore | archive_restore |
| tests/archive.test.mjs:1403 | PORT-002 / AUTO-002 populated product archive retains exact document archive history, content, money and mappings without execution authority | archive_restore | archive_restore |
| tests/site-lifecycle.mjs:14 | SITE-001 built homepage opens run instructions, Markdown docs work without JavaScript, installed root remains the Lobby | runtime | runtime |
| tests/site-lifecycle.mjs:64 | PRICE-008 legacy AUD agreement and new USD owner/client screens show exact currency at desktop and phone widths | runtime | runtime |
| tests/site-lifecycle.mjs:101 | NEG-001 desktop and phone negotiate, approve, send and accept the changed offer with client comparison | runtime | runtime |
| tests/site-lifecycle.mjs:147 | EDIT-016 / REPORT-001 desktop and phone pipeline filters, value sort, totals and clear filters use recorded proposal data | runtime | runtime |
| tests/site-lifecycle.mjs:207 | TEAM-004 owner searches audit actions and downloads the same filtered activity at desktop and phone widths | runtime | runtime |
| tests/site-lifecycle.mjs:235 | AI-003 desktop and phone owners review MCP requests, approve/send explicitly, and dismiss stale requests | runtime | runtime |
| tests/site-lifecycle.mjs:268 | NEG-002 desktop and phone client suggests two terms edits; firm accepts one, rejects one and sends revision two | runtime | runtime |
| tests/site-lifecycle.mjs:304 | SEND-002 desktop and phone show provider delivery and preserve bounce notice until explicit correction | runtime | runtime |
| tests/site-lifecycle.mjs:350 | SIGN-008 desktop and phone record a client-signed copy as accepted by upload and export its deposit | runtime | runtime |
| tests/site-lifecycle.mjs:381 | REPORT-005 / REPORT-006 desktop and phone export the filtered pipeline CSV and schedule weekly email in the installation time zone | runtime | runtime |
| tests/site-lifecycle.mjs:411 | SEND-004 expired offer requests reopening and owner extends same links at desktop and phone | runtime | runtime |
| tests/site-lifecycle.mjs:448 | MOB-001 / FOLLOW-004 invited client asks exact sent sections; owner queue answers and agreement retains threads on desktop and phone | runtime | runtime |
| tests/site-lifecycle.mjs:480 | FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision | runtime | runtime |
| tests/site-lifecycle.mjs:553 | MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting | runtime | runtime |
| tests/site-lifecycle.mjs:618 | SEND-006 desktop and phone rehearse to self, then edit invitations, fresh links and negotiated sends with exact retained history | runtime | runtime |
| tests/site-lifecycle.mjs:714 | FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths | runtime | runtime |
| tests/site-lifecycle.mjs:716 | SIGN-006 SMS-code verification and SIGN-005 signed downloads work in the compiled client at desktop and phone widths | runtime | runtime |
| tests/site-lifecycle.mjs:836 | SEND-007 desktop and phone replace the unsigned signer, refuse the old link, verify the COO and retain completion history | runtime | runtime |
| tests/site-lifecycle.mjs:838 | TRACK-001 / TRACK-004 owner consent, private alerts, client disclosure and erasure at desktop and phone widths | runtime | runtime |
| tests/site-lifecycle.mjs:842 | AUTO-004 compiled public API reference exposes scoped operations and signed event examples | runtime | runtime |
| tests/site-lifecycle.mjs:862 | SIGN-004 and SEND-003 owner recipient controls, own-field previews, ordered signing and viewer revocation | runtime | runtime |
| tests/site-documents.mjs:14 | EDIT-017 owner-selected Spanish invitation, verification, consent and completion preserve authored English through the compiled client | browser_documents | browser_documents |
| tests/site-documents.mjs:16 | COLLAB-003 desktop and phone compare revisions and restore an earlier draft requiring fresh approval | browser_documents | browser_documents |
| tests/site-documents.mjs:63 | EDIT-010 desktop and phone upload vendor defaults and MSA, download frozen bytes, replace defaults and accept the original package | browser_documents | browser_documents |
| tests/site-documents.mjs:96 | MIG-006 desktop and phone review original CSVs, finish imports, read records and journals, and undo | browser_commercial | browser_commercial |
| tests/site-documents.mjs:154 | EDIT-014 client selects and downloads revision 2 at desktop and phone; owner timeline and per-proposal disable remain authoritative | browser_documents | browser_documents |
| tests/site-documents.mjs:188 | EDIT-012 desktop and phone duplicate an accepted agreement for Beta Co and approve its separate draft | browser_documents | browser_documents |
| tests/site-documents.mjs:191 | EDIT-018 desktop and phone preview exact client content, switch widths and select without sending | browser_documents | browser_documents |
| tests/site-documents.mjs:247 | EDIT-009 desktop and phone configure, preview, select, download and accept conditional package sections | browser_documents | browser_documents |
| tests/site-documents.mjs:292 | EDIT-007 desktop and phone client reviews accessible pricing, corrects quantities, downloads attachments and PDF, verifies, comments and accepts by keyboard with WCAG 2.2 AA axe scans | browser_documents | browser_documents |
| tests/site-documents.mjs:297 | PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals | browser_commercial | browser_commercial |
| tests/site-documents.mjs:301 | MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads | browser_commercial | browser_commercial |
| tests/site-documents.mjs:305 | MOB-001 / EDIT-002 desktop and phone start all five starters, save, replace and start personal templates, preview and accept independent drafts | browser_commercial | browser_commercial |
| tests/site-documents.mjs:307 | MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths | browser_commercial | browser_commercial |
| tests/site-documents.mjs:533 | APPROVE-002 email preview and decision links work under a member session at desktop and phone widths | browser_commercial | browser_commercial |
| tests/site-documents.mjs:696 | APPROVE-002 owner requests, revokes and re-requests approval through native controls and records a noted outcome at desktop and phone widths | browser_commercial | browser_commercial |
| tests/site-documents.mjs:759 | EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths | browser_documents | browser_documents |
| tests/site-documents.mjs:761 | EDIT-003 linked and detached library insertion, frozen sending and scoped usage at desktop and phone widths | browser_documents | browser_documents |
| tests/site-documents.mjs:821 | deposit collection settings, retained signatures, required and due completion at desktop and phone widths | browser_commercial | browser_commercial |
| tests/site-documents.mjs:823 | COLLAB-002 internal comment, resolution and dated assignment work at desktop and phone widths | browser_documents | browser_documents |
| tests/site-documents.mjs:878 | PRICE-003 and PRICE-002 recurring line editing, preview, client selection and frozen agreement use the same amounts | browser_commercial | browser_commercial |
| tests/site-documents.mjs:883 | EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads | browser_documents | browser_documents |
| tests/site-documents.mjs:887 | REPORT-004 booked snapshots and independent receipt periods export and schedule the visible report | browser_commercial | browser_commercial |
| tests/site-documents.mjs:931 | PRICE-005 native owner-configured tax settings, selected quantities and frozen agreement | browser_commercial | browser_commercial |
| tests/site-documents.mjs:937 | CAT-001 reviewed CSV promotion and explicit recurring insertion preserve independent defaults | browser_documents | browser_documents |
| tests/site-documents.mjs:961 | AUTO-002 Settings authorizes Drive archiving and shows completed and held jobs with safe reconciliation | browser_commercial | browser_commercial |
| tests/site-documents.mjs:1037 | MIG-003 and MIG-007 owner uploads exported ZIPs, reviews report ambiguity, downloads read-only originals and undoes the move-in | browser_commercial | browser_commercial |
| tests/site-documents.mjs:1151 | CRM-001 native reviewed HubSpot deal creates an independent collection-off draft with exact priced rows | browser_commercial | browser_commercial |
| tests/site-documents.mjs:1203 | AUTO-003 Settings verifies and authorizes Slack channels and Teams direct approvals, inspects history and revokes consent | browser_commercial | browser_commercial |
| tests/site-documents.mjs:1282 | ACCT-002 Settings reviews the exact deposit and explicitly issues one Xero invoice | browser_commercial | browser_commercial |
| tests/site-documents.mjs:1283 | FOLLOW-003 sender Settings explicitly save, authorize, edit and revoke expiry email without activation on inspection | browser_commercial | browser_commercial |
| tests/site.test.mjs:9 | AGENT-007 compiled cohort recommendation and source revision inspection | browser_commercial | browser_commercial |

Ordinary unsharded verification also maps all 182 callbacks exactly once before and after. See fallback-check.json and fullRunBefore/fullRunAfter in mapping.json.
