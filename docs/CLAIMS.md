# Platter claims

Generated from [CONTRACT.md](../CONTRACT.md). Edit CONTRACT.md and run `node scripts/contract-docs.mjs write`.

## HTTP-001 — Authorized domain dispatch

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/http.ts`

## ACCESS-001 — Revocable agent keys that only draft

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/credentials.ts`

## PROP-001 — Approval binds the exact revision

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/commands.ts`

## PROP-002 — Sending freezes the offer

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/commands.ts`

## SIGN-001 — Verified-mailbox acceptance

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/signing.ts`

## SIGN-002 — Immutable acceptance with an integer-cent deposit

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/signing.ts`

## INV-001 — One retained deposit invoice per acceptance

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/invoices.ts`

## IMPORT-001 — Reviewed client CSV move-in with undo

Status: **done**.

Evidence: `tests/platter.test.mjs`, `src/platter/movein/index.ts`

## ERASE-001 — Bounded client erasure

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/archive.test.mjs`

## PORT-001 — Validated archives and restore

Status: **done**.

Evidence: `tests/archive.test.mjs`, `src/platter/archive-policy.mjs`

## MAIL-001 — Durable proposal mail with honest outcomes

Status: **done**.

Evidence: `src/platter/mail.ts`, `tests/mail.test.mjs`

## SITE-001 — Public run site and documentation

Status: **done**.

Evidence: `tests/site.test.mjs`, `scripts/verification/run.mjs`, `src/site/pages.ts`

## EDIT-001 — Branded drag-and-drop proposal editor

Status: **done**.

Evidence: `tests/site.test.mjs`, `tests/platter.test.mjs`, `tests/archive.test.mjs`, `tests/editor-budget.mjs`

## EDIT-002 — Proposal templates

Status: **partial**.

Gap: Personal templates and all five built-in starters ship with independent drafts, filled client and sender details, USD pricing tables and exact PDF and archive custody. Shared templates, team-limited folders and durable delivery defaults now ship, with editing rights and live audience checks proved by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”; the named role browser and CLI journeys prove 1440/390 controls and custody. Template payment choices now have explicit controls. New drafts independently copy card and ACH choices, a 30% deposit and net-15 milestone terms with collection off; later template edits affect only future drafts, and proposal edits leave the template unchanged. tests/platter.test.mjs — “EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries” proves these snapshots plus malformed, stale and unauthorized no-write refusals. tests/site.test.mjs — “FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths” proves payment choices beside 2, 5 and 9-day reminders and a 14-day expiry at 1440 and 390 pixels. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves retained choices and a usable restored template with collection off. Gap: general variables, recipient roles, full template-driven payment execution and multiple-recipient reminder execution remain. Versioned document blocks, brand kits, exact media references and the Client field-role binding now survive template starts and public CLI restore, proved by the named EDIT-001 lifecycle, browser and CLI journeys.

Evidence: `src/platter/templates.ts`, `src/platter/starter-templates.ts`, `src/platter/ui/templates.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-003 — Reusable content library

Status: **done**.

Gap: The shared library holds text sections, case studies, bios, testimonials, terms, validated images and videos, and USD pricing tables. Team folders, tags and case-insensitive search ship. Media and tables are saved from placed blocks in a proposal the library editor may edit, with explicit consent to its library audience; validated originals are retained independently. Pricing insertion targets a chosen package and recalculates integer-cent totals. Linked changes create unapproved draft revisions atomically, including negotiated drafts; detached copies, sent revisions and accepted content remain frozen. Manual changes permanently detach the affected copy. Usage lists retain only proposals the reader may already view and show copy mode, frozen state and last-change time. CT approval (24 October 2026, 04:45 UTC): a current proposal editor must explicitly consent at insertion to recipient display and future linked draft edits; usage grants no access beyond existing proposal visibility; sent and accepted content stays frozen. EDIT-002 and EDIT-005 inherit independent copied content, and EDIT-006 inherits consent and exact frozen media custody for future media capabilities.

Evidence: `tests/platter.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-004 — Variables from client, deal and CRM records

Status: **partial**.

Gap: Orbit refill requires its scoped contact-read API and a reference instance; the current Orbit public API exposes deal fields but no contact-read door. Connected-deal reads use the conservative owner or admin floor under the standing scope rule; scoped delegation and the Orbit provider boundary remain unproved. No full CRM qualification is claimed.

Evidence: `tests/platter.test.mjs`, `tests/site-documents.mjs`, `tests/archive.test.mjs`

## EDIT-005 — Word and PDF import and export

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/site-documents.mjs`, `tests/archive.test.mjs`

## EDIT-006 — Embedded rich media

Status: **done**.

Gap: Uploaded images and videos, ordered galleries, canonical YouTube, Vimeo, Loom and Wistia video frames, Calendly booking frames and Google Drive PDF previews ship. Uploaded originals stay with the proposal; external content retains its canonical URL and uploaded poster. CT approval (24 October 2026, 08:09 UTC): owner and admins control the audited external-content setting, off on fresh installs; only those roles change external blocks, and author consent stays in the revision. Viewers opt in on each page load. Before opt-in there are no provider requests, cookies or browser storage; frames use the exact allowlist, a sandbox, no referrer and CSP frame sources. The owner kill switch replaces external content with a plain placeholder naming its provider on the next load. Evidence: tests/platter.test.mjs — “EDIT-001 display media requires consent and live edit scope, stays private until placed and keeps exact bytes through copies and templates” proves consent, live authority, no-write refusals, invalid-host refusal, all provider URL canonicalization, audited setting changes, kill-switch refusal for members, frozen originals, PDF stills and actionable URI annotations. tests/site.test.mjs — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” proves native gallery and embed editing, video playback, decoded gallery images, the recorded before-consent and after-consent request log, absent provider cookies and browser storage, fresh consent after reload, booking and PDF frames, plain provider-named kill-switch placeholders, sandbox and no-referrer attributes, all PDF stills and links, no overflow and icon tooltips at 1440 and 390. tests/archive.test.mjs — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority” proves exact media bytes and frozen gallery, video, booking and PDF-preview custody through export and import. The 08:09 UTC approval requires blocked content to name its provider; the disabled Loom, Calendly and Google Drive placeholders are asserted at both widths. Admin changes and all other product-role denials, per-change audit rows, retained author consent and exact CSP origins are asserted in the named media HTTP journey. EDIT-002, EDIT-003 and EDIT-005 inherit these consent and frozen-media obligations for future media carriers.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-007 — Mobile client review

Status: **partial**.

Gap: Named EDIT-007 built-browser journeys at 1440 and 390 pixels complete invitation, mailbox verification, conditional package selection, adding an optional item and raising its quantity, comments and immutable acceptance of the selected total and deposit with keyboard-only client interaction and axe WCAG 2.2 AA scans at every step. Verification, comments and refusal pages preserve the reviewed package and optional items, and submission feedback receives keyboard focus. Package review uses a native fragment target to focus a named selection region containing the chosen package, optional-item quantities and exact USD total or deposit, including with application JavaScript disabled. Named EDIT-007 assertions expose current scope, grouped pricing and selection through browser accessibility APIs, correct an out-of-range quantity by keyboard, and download exact attachment bytes and the selected unsigned PDF before accepting. Gap: Stripe test-card payment (PAY-001 or PAY-002) and assistive-technology verification of the complete rich-content or payment journey remain; this slice does not establish full WCAG conformity.

Evidence: `src/platter/ui/client.ts`, `src/platter/ui/packages.ts`, `src/platter/ui/shared.ts`, `tests/site.test.mjs`, `tests/mobile-client-journey.mjs`

## EDIT-008 — Custom domain and branded client experience

Status: **missing**.

Gap: Client links use the installation origin with Platter styling.

Evidence: None recorded.

## EDIT-009 — Conditional content by package

Status: **done**.

Gap: Current scope or terms and document blocks obey package or optional-item visibility; the named EDIT-001 HTTP and 1440/390 browser journeys extend preview, selected PDF and accepted-document custody. Future variable and signed-PDF carriers still inherit.

Evidence: `src/platter/conditional.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-010 — Attachments and vendor documents

Status: **done**.

Evidence: `src/platter/attachments.ts`, `src/platter/attachment-commands.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-011 — Large-proposal performance budget

Status: **done**.

Evidence: `tests/editor-budget.mjs`, `.github/workflows/verify.yml`, `tests/platter.test.mjs`

## EDIT-012 — Duplicate a proposal for another client

Status: **done**.

Evidence: `src/platter/duplicate.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-013 — Documents without pricing

Status: **missing**.

Gap: Every proposal requires two priced options; there is no unpriced document type.

Evidence: None recorded.

## EDIT-014 — Client PDF download before signing

Status: **done**.

Evidence: `src/platter/documents/client-pdf.ts`, `src/platter/documents/offer-pdf.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-015 — Locked template sections

Status: **done**.

Gap: Independent rich-block and native section locks survive template starts, proposal copies and personal templates. Locked content and visibility stay fixed while members reorder blocks and edit unlocked neighbours. Template lock rights follow TEAM-001; proposal unlocks require the owner, an admin or a current team manager, are audited, and subsequent terms edits require legal approval.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-016 — Proposal search and folders

Status: **done**.

Gap: Proposal and agreement search combines literal case-insensitive content phrases, uploaded PDF text and existing metadata filters. Visible personal and shared templates search names, owner names, body text, media descriptions, pricing and PDF text, with owner, amount, age and folder filters for applicable template metadata; templates retain no client binding or proposal status. Uploaded PDF text uses the same immutable-file custody and permission checks as the original. Existing and restored files are indexed on demand within live proposal and template scope. Owner and admins create team-limited proposal folders and file documents under explicit audience confirmation; filing has its own version and never changes a frozen agreement. Folder membership restricts existing TEAM-001 visibility and grants no additional proposal access. Evidence: tests/platter.test.mjs — “EDIT-016 body phrase search returns exactly three of 500 proposals including an uploaded PDF with live folder permissions” now seeds exactly 500 proposals and asserts exactly three matches, two body matches and one uploaded PDF, in under one second; it also proves literal phrase handling, metadata and template filters, personal-template isolation, folder search and detail refusal for an outside member, live membership and revocation, and credential exclusion. This committed timing journey is also run directly on the exact candidate outside Verify. tests/site.test.mjs — “EDIT-016 / REPORT-001 desktop and phone pipeline filters, value sort, totals and clear filters use recorded proposal data” proves native folder creation, filing and filtering, template body matches, combined proposal filters, totals and CSV selection at 1440 and 390. tests/archive.test.mjs — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority” proves retained folder versions and working PDF-content search after restore. Proposal numbering has not shipped; its existing FOLLOW-002 tie-break obligation remains conditional.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## EDIT-017 — Client page in the client's language

Status: **missing**.

Gap: The client page and mail are English only.

Evidence: None recorded.

## EDIT-018 — Client-page preview before sending

Status: **done**.

Evidence: `src/platter/preview.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## CAT-001 — Service and product catalog

Status: **partial**.

Gap: Native USD catalog items retain name, description, SKU, unit, price, private cost, default recurrence, taxable flag, tax code and income account under the existing owner, admin and manager version guards. Selected image-free fixed-price CSV records become priced items only after a separate owner-only review bound to the exact records and pricing choices. Insertion requires explicit recurring term and start date and copies independent metadata into drafts, templates and sent revisions; ordinary editor saves preserve it. tests/platter.test.mjs — “TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals”, extended by tests or catalog-journey.mjs, proves 50 reviewed CSV records, explicit promotion, no-write role and stale refusals, private recurring costs, immutable sent prices and metadata, future defaults, one-off tax calculation and explicit refusal of taxed recurrence. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, extended by tests or catalog-browser.mjs, proves promotion, metadata controls and recurring insertion at 1440 and 390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves exact restored imported records, promotion provenance, defaults, template copies and sent snapshots without duplicate promotion. No imported metadata is charged automatically. Gap: native image editing and rendering, URL-image acceptance and QuickBooks Online, Xero, HubSpot and Salesforce item synchronization remain. Image acquisition requires a qualified Base image-GET egress door with validated public address pinning, original-host TLS, no redirects and 5-MiB image and 20-MiB batch bounds; the recorded POST-only 64-KiB relay does not qualify. Explicit image failure and apply without images remain. Recurring tax and provider tax execution remain held under PRICE-005. Candidate browser and public CLI restore validation are pending.

Evidence: `src/platter/catalog.ts`, `src/platter/catalog-import.ts`, `tests/platter.test.mjs`, `tests/catalog-journey.mjs`, `tests/site.test.mjs`, `tests/catalog-browser.mjs`, `tests/archive.test.mjs`

## PRICE-001 — USD pricing tables with line items

Status: **done**.

Evidence: `src/platter/pricing.ts`, `src/platter/ui/pricing.ts`, `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs`

## PRICE-002 — Packages and optional items the client chooses

Status: **done**.

Gap: Current packages, optional items, quantities, deposit and item- or package-conditioned sections; PRICE-005 or PRICE-007 or PRICE-003 inherit selection-driven tax and schedule amounts before shipping.

Evidence: `src/platter/selection.ts`, `src/platter/conditional.ts`, `src/platter/paper-acceptance.ts`, `src/platter/ui/paper.ts`, `src/platter/ui/packages.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs`

## PRICE-003 — One-off and recurring fees

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/recurring-journey.mjs`, `tests/site-documents.mjs`, `tests/recurring-browser.mjs`

## PRICE-004 — Discounts

Status: **done**.

Gap: tests/platter.test.mjs — “PRICE-004 scoped discounts preserve exact selections, private margins, templates and public PDF and JSON custody” (group and fixed reductions, cent-exact totals, selections and frozen outputs); “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” (15% threshold and 20% routing); tests/site.test.mjs — “PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals”, calling pricingJourney in tests or pricing-journey.mjs (editor and approval summaries, controls and client totals at 1440 and 390); tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (custody)

Evidence: `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs`

## PRICE-005 — US sales tax

Status: **partial**.

Gap: Stripe Tax and AvaTax adapters, AvaTax commit on invoice issuance, recurring tax, exemption-certificate custody and accounting tax-code propagation remain unimplemented. Owner-only configuration is the conservative interim authority floor; scoped delegation is not claimed. The named native journeys prove the one-off path; no live provider, filing, exemption or accounting determination is claimed.

Evidence: `src/platter/taxes.ts`, `src/platter/selection.ts`, `tests/platter.test.mjs`, `tests/site-documents.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs`

## PRICE-006 — Internal cost and margin

Status: **partial**.

Gap: Version-bound internal unit costs now produce cent-exact line costs and line or package margins. Only owner, admin, manager and billing proposal views carry internalPricing; billing reads but does not edit proposals. Sales, content editor, viewer and agent responses omit it. The separate /api/platter/internal-pricing.pdf export requires those same read rights and proposal scope; public offer PDFs always use the public snapshot and contain no costs. tests/platter.test.mjs — “TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales or client data and public PDFs” proves the amounts, role or API or private-PDF boundaries, public-page or PDF exclusion, revisions, negotiation, restoration, duplication and personal templates. The named team browser journey proves manager cost editing and sales exclusion at 1440/390; the role CLI journey restores exact costs and templates. Optional-item and flat-package costs now ship with selected or base totals. tests/platter.test.mjs — “TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state” proves exact optional quantities, selected total margins, template or catalog carryover, unverified and cross-invitation refusal, and absence of private fields from the new mailbox-verified /p/<invitation>/data.json projection. The named role browser and CLI journeys prove 1440/390 total selectors, selected margins and exact custody. Gap: outbound webhook payload proof remains when AUTO-004 adds that door; no lifecycle webhook is currently sent. AUTO-004 inherits the cost-free public projection before its webhook capability ships.

Evidence: `src/platter/internal-pricing.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## PRICE-007 — Payment terms and schedules on the proposal

Status: **done**.

Gap: Percentage or fixed deposits, dated and event milestones, net 15 or net 30 terms and monthly retainers are informational offer terms. Owner, admins and scoped managers edit schedules; template starts and copies retain independent terms. Milestone percentages allocate the balance after the deposit with cumulative cent rounding. Monthly retainers are additional to the package price and use an explicit percentage of the selected package total, including chosen optional quantities. Sender-entered monthly dates clip to the last day of shorter months. Deposits are due at acceptance; net terms apply to milestones and retainers. The accepted calculated schedule freezes with the agreement. These terms create no automatic charge, invoice or outbound message; PAY-002, PAY-003, PAY-007, REPORT-004 and ACCT-007 inherit the exact frozen selected amounts before execution or reconciliation ships. Existing payment-term approval rules conservatively require review for structured schedules. Absent terms remain absent in legacy revision and acceptance snapshots; the new storage column is null without backfill.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs`

## PRICE-008 — First-release AUD agreements stay exact

Status: **done**.

Evidence: `migrations/core/0017_currency.sql`, `tests/archive.test.mjs`, `tests/site.test.mjs`

## COLLAB-001 — Real-time team editing

Status: **partial**.

Gap: Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence.

Evidence: `src/platter/commands.ts`, `tests/platter.test.mjs`

## COLLAB-002 — Internal comments, mentions and assignments

Status: **done**.

Evidence: `tests/mail.test.mjs`, `tests/site-documents.mjs`, `tests/archive.test.mjs`

## COLLAB-003 — Version history with compare and restore

Status: **done**.

Evidence: `src/platter/history.ts`, `src/platter/ui/history.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`

## APPROVE-001 — Approval rules and routing

Status: **done**.

Gap: tests/platter.test.mjs — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” proves the $30,000/20% manager-then-owner sequence, exact-revision clearing, skipped conditions, unknown or low-cost review, deposit and standard-term rules and template scopes and provenance. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves parallel named admin and billing approvals in either order, rejection, unnamed-billing refusal and invalid sales approvers. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves discount editing, clearing, manager then owner approval, send and client acceptance at 1440/390. The named thirty-proposal REPORT-001 fixture proves awaiting-approval filters or sorts or counts or totals; the named role CLI archive journey preserves every current condition, source template and exact decision. Current semantics: total thresholds compare gross value before discounts and maximum offered optional quantities; discount rules compare explicit scope percentages and effective line, group and package reductions, including fixed amounts; margin rules review missing costs and require all offered package and optional margins to meet the threshold with conservative optional cent rounding; payment-term rules compare the current deposit and optional exact standard terms. Current PRICE-004 scoped and fixed discounts inherit this evaluation, as proved by its named scoped discount journey. PRICE-007 schedules and net terms now require review under existing payment-term rules and clear revision approvals when changed, proved by the same condition journey. EDIT-002 future template fields inherit these rule and named-journey obligations before those fields ship.

Evidence: `tests/platter.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/platter.test.mjs`, `tests/archive.test.mjs`

## APPROVE-002 — Approval requests that reach the approver

Status: **partial**.

Gap: Nook and mobile push, automatic next-step request creation, integrated notification settings and request controls, complete trigger details and a chat-native decision interaction remain. Conservative default adopted pending ct approval: explicit audited consent; owner and admins configure verified chat destinations; approval details only to the matching active approver; every decision requires the existing member session and current revision and plan. Uncertain delivery is held without automatic retry. Future Nook, MOB-002, COLLAB-002 and SEND-005 carriers inherit these authority and custody obligations.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## APPROVE-003 — Who approves, who sends and what needs approval

Status: **done**.

Gap: One approval policy now covers all current preparation, template, duplication, negotiation, approval, sending and fresh-invitation doors. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves unruled sales sends with no approval record, manager amount approval, exact-revision invalidation, sales or content-editor or foreign-owner refusals, agent-origin approval after human edits, policy authority and audit, manager team scope, owner or admin or manager defaults, approval-required and approval-free copies, and sales negotiation. tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership” proves awaiting-approval filters, sorting, counts and totals under role visibility; tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves the sales and manager screens at 1440/390; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves policy and exact-revision custody.  tests/mail.test.mjs — “APPROVE-003 / TEAM-001 a sales sender owns bounce correction, foreign senders are refused, and every fresh invitation obeys the current approval policy” proves the matching active sender’s correction door, a foreign sender’s 403, and current-policy reapproval before a fresh corrected invitation. No acceptance point remains unproved for current doors; future doors named in the clause inherit this same policy before shipping.

Evidence: `tests/platter.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SEND-001 — Send from the firm's own mailbox

Status: **done**.

Gap: OAuth authorization with state and PKCE, sealed refresh grants, current provider sending permission, verified Gmail primary or send-as addresses and Microsoft SMTP mail, one-member binding, and sending through the durable outbox now ship. CT ruling (22 October 2026, eaf743e) implemented for the outbound mailbox slice: the connected address may differ from sign-in; provider refusals visibly break the connection and fall back to the installation sender, while uncertain outbound attempts are held without fallback or retry. tests/mail.test.mjs — “SEND-001 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail” proves both providers, negative identity or scope or binding cases, send-time role checks including a demotion during refresh, client-facing From, timeline or audit attribution, revoked-grant fallback and timeout custody. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves both OAuth forms, sending, attribution, audit and broken or fallback screens at 1440/390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves sender-attribution custody and exclusion of OAuth attempts or refresh grants with reconnection required and no restore calls. Direct access-token connections remain an interim identity-only door limited to sign-in addresses; they require OAuth reconnection for mailbox sending. CT reply ruling (22 October 2026, 07:25 UTC) implemented: a sending member explicitly consents per invitation (audited); the client sees a notice before replying, and one plain-text reply whose claimed From is the exact invited address is recorded through a private current-invitation capability and signed Resend receiving event, with no attachments or automatic outgoing action. An emailed reply is a record, never an approval, signature or proposal state change. The claimed From and Resend receiving-server SPF or DKIM results are stored and shown; From is never treated as proven client identity, and missing provider results are labelled unavailable rather than inferred from message headers. Auto-Submitted automatic replies, Precedence bulk or list or junk, list mail and out-of-office messages are discarded without a record or notification and do not consume the capability. Replies are capped at one per invitation; reaching that cap creates one durable owner-only in-app notice, atomically with the reply, without outbound mail. Replies inherit the proposal View scope and stay in archives; reply capabilities do not. Agent keys receive no client reply text. The named SEND-001 mail journey proves Gmail and Microsoft client replies, wrong sender or signature or capability-body refusals, replay refusal, fresh-invitation rotation and withdrawal; the named role browser journey shows both replies at 1440/390 and the named TEAM-001 archive journey retains their text without authority. No SEND-001 acceptance point remains unproved for the current native doors. The ct-approved per-invitation reply cap is one; unlimited replies and native Gmail or Microsoft inbox synchronization are not claimed. FOLLOW-001 or FOLLOW-006 retain their own reminder-composer, multi-recipient, complete-inheritance and activation or restore-policy gaps; they do not widen mailbox authority. Future email reminder and reply doors inherit SEND-001’s provider-verified one-member binding, current sending permission, attribution, broken-state fallback and uncertain-attempt hold before shipping. The installation receiving route is not native Gmail or Microsoft inbox synchronization. No live provider acceptance or delivery is claimed; these journeys use network-edge fakes. The single-recipient reminder foundation is proved by tests/mail.test.mjs — “SEND-001 / FOLLOW-001 signed-mailbox scheduled reminders honor recipient quiet hours, caps and terminal decisions without retrying uncertain sends”, “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap”, and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”. These assert Gmail or Microsoft reminders and native answers from the connected address, installed-sender fallback, DST or quiet-hour delay, before-expiry timing, scheduled caps, every current terminal stop, concurrent claims, manual edited text or calendar limits, and no-call refusals after authority changes during refresh. The named role browser journey shows manual reminder records and verified opt-out at 1440/390; the named role CLI archive journey retains link-free settings or history while excluding execution authority and transport. FOLLOW-001 or FOLLOW-006 adopted rollout default pending ct (those clauses remain PARTIAL): existing and restored settings do not activate outbound reminders; a current sending person explicitly and auditably consents per proposal, supplies the recipient IANA zone, and can disable the schedule; restores require fresh authorization. No recipient zone is inferred.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs`

## SEND-002 — Delivery status and bounce handling

Status: **done**.

Evidence: `src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SEND-003 — Recipients, roles and sharing

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs`

## SEND-004 — Expiry and reopening

Status: **done**.

Evidence: `src/platter/expiry.ts`, `src/platter/expiry-time.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SEND-005 — Completion and activity notifications

Status: **partial**.

Gap: Decline and failed-payment events, personal Teams, Nook and push carriers, and settings controls with desktop and phone proof remain. Only explicitly consenting current scoped people receive generic events and protected links; view alerts additionally require current owner opt-in for that revision; preferences bind the exact proposal revision, direct Slack destinations must be verified for that person, and restoration does not activate sending. Existing APPROVE-002 and AUTO-003 consent and custody obligations remain.

Evidence: `tests/mail.test.mjs`, `tests/archive.test.mjs`

## SEND-006 — Editable subject, message and shared email templates

Status: **partial**.

Gap: Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Shared reminder-message defaults and proposal-template choices now ship, with owner or admin management, copied text, member locks and explicit supported-variable filling proved by tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority”. Loading a message is review only and disables the schedule until fresh authorization; recipient first names are sender-supplied and are not copied to other-client drafts. A selected message keeps its copied source version; current locks are rechecked on member edits. Only reminder mail uses these shared-message controls today. Gap: shared or default or locked templates and variable filling for other email events, editable invoice or expiry or withdrawal or completion messages and a complete agreement package remain.

Evidence: `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SEND-007 — Replace an unsigned signer on a sent proposal

Status: **partial**.

Gap: Gap: The SIGN-004 HTTP and compiled-browser journeys now prove replacement at position 2, preserving earlier signatures and order, refusing duplicate participant mailboxes and retaining the replacement in the certificate. The owner-only configured-recipient authority default remains pending ct approval under SIGN-004 and SEND-003. SIGN-006’s government ID and explicitly selected link-only methods and their replacement journeys remain required. The single-recipient mailbox or SMS requirement and the configured-recipient mailbox requirement are retained; these proofs do not establish the full original journey. SEND-007 remains partial.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SEND-008 — Sending and reminders by text message

Status: **partial**.

Gap: CT ruling, 26 October 2026: APPROVE WITH RIDERS for the SMS product default; status remains partial. Before any proposal text, reminder, completion notice or identity code, retain explicit recipient assent identifying the recipient and normalized US mobile number, the sending firm, the permitted SMS purposes, the disclosure text or immutable disclosure version shown, the assent time and collection method, and the recipient evidence supporting any sender-recorded entry. Bind the operational consent to the exact proposal revision and invitation without retaining invitation credentials in history. SMS consent does not establish electronic-signature consent, approval or Send authority. A changed revision, rotated invitation or changed recipient requires a fresh exact binding supported by applicable consent; historical consent never grants authority by itself. Require a valid supplied recipient IANA time zone, apply FOLLOW-001 quiet hours using the zone’s rules for the dispatch date, and defer texts due during quiet hours. Missing or invalid consent or zone prevents dispatch. Recheck current invitation validity, proposal state, consent, suppression and live proposal-specific Send authority before sender-controlled dispatch, including deferred dispatch. STOP suppresses all SMS purposes to that number across invitations in the installation, and provider-level suppression is also honored. START, a new invitation and sender edits do not reactivate SMS. Restored records retain history but restore no SMS sending or verification authority and replay no queued transport. Uncertain provider outcomes remain held with no automatic retry; provider acceptance is not delivery. SIGN-006 inherits this policy for identity-code texts. This ruling approves policy only and certifies no implementation, carrier acceptance or legal compliance. Gap: Completion texts, sender controls with desktop and phone proof, installer integration, production sender qualification and safe recipient re-enablement remain. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps; none is certified by local fakes or this ruling. Recipient re-enablement requires a separately proven path with new recorded assent, provider eligibility, an explicit audited suppression change and fresh operational authority; START alone is insufficient. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders.

Evidence: `tests/mail.test.mjs`, `tests/archive.test.mjs`

## SEND-009 — Reusable public signing link

Status: **missing**.

Gap: Every proposal has one invited recipient; there is no public link or embeddable form.

Evidence: None recorded.

## SEND-010 — Withdraw a sent proposal

Status: **done**.

Evidence: `src/platter/withdrawal.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## TRACK-001 — View tracking and live open alerts

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/followup-journey.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs`

## TRACK-002 — Section-level reading analytics

Status: **partial**.

Gap: Opted-in client pages measure the most visible current section while the tab is visible, send same-origin cumulative readings, validate elapsed bounds, retain monotonic times and record valid package and optional-item selections per view. Named HTTP assertions prove 40-second pricing and 5-second scope readings and package choices; the desktop and phone journey proves actual first-party browser measurement. Gap: The committed exact-SHA scripted 40-second pricing and 5-second case-study session with the two-second tolerance, attachment-open attribution, complete toggle history and per-recipient summaries remain. FOLLOW-002 section-specific engagement reasons remain; its required original seven-proposal viewed ordering now passes. Owner-only access and explicit measurement consent await ct approval.

Evidence: `tests/platter.test.mjs`, `tests/tracking-details-browser.mjs`

## TRACK-003 — Forwarded stakeholder identification

Status: **partial**.

Gap: A forwarded viewer explicitly supplies a name and a different mailbox, consents to sharing, receives a bounded single-use code and verifies that mailbox. The owner sees the verified stakeholder and can explicitly record an approver recipient. This minimal SEND-003 door grants no invited-recipient signing authority and sends no new recipient invitation. Gap: Automatic new-device and new-network prompting remains; no fingerprint is stored. Full SEND-003 separate recipient invitations and operational approver delivery and decisions remain. Policy default adopted pending ct approval: explicit viewer identity-sharing consent, owner-only stakeholder visibility and conversion, and no automatic outbound invitation or signing authority.

Evidence: `tests/platter.test.mjs`, `tests/tracking-details-browser.mjs`

## TRACK-004 — Tracking disclosure and privacy limits

Status: **done**.

Evidence: `tests/platter.test.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs`

## FOLLOW-001 — Scheduled reminders to unsigned recipients

Status: **partial**.

Gap: Current single-recipient schedules and manual email reminders ship through sender forms, reminder.configure, reminder.send and the Worker cron. tests/mail.test.mjs — “FOLLOW-001 / FOLLOW-006 template and workspace delivery snapshots preview exact dates, send on those dates, remain editable without approval and never copy authority” proves copied schedules, March 1 send-preview dates and clock-advanced mail, editing a later scheduled message while retaining the first exact copy, off-schedule manual email and its 429 daily limit, and unchanged offer revision/approval. The existing three named reminder mail journeys prove recipient-zone quiet hours or DST, before-expiry timing, scheduled caps, every terminal stop, scoped authority, last-moment rechecks and uncertain holds. tests/site.test.mjs — “FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths” proves the sender composer, manual text or history, quiet-hour controls, dates and delivery timeline at 1440/390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves link-free settings or history custody without restored execution authority. Shared reminder-message defaults, per-proposal-template choices, locks and the five current sender or client or proposal variables now ship. tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority” proves owner or admin-only editing, default and template choices, explicit first-name input, missing-variable and locked-member no-write refusals, exact first or edited-second scheduled copies, review without activation, and no copied identity or authority. Existing browser and role CLI journeys additionally prove their 1440/390 controls and credential-free custody. Gap: multiple unsigned recipients (SEND-003 or SIGN-004) remain. Conservative activation or restore default remains adopted pending ct: only a person with current proposal Send authority explicitly and auditably activates each proposal, supplies the recipient IANA zone, and can disable it; upgrades, copies and restores never activate outbound schedules. No zone is inferred. Until ct approves this default the clause remains PARTIAL.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## FOLLOW-002 — Next-action follow-up queue by sales owner

Status: **done**.

Evidence: `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## FOLLOW-003 — Expiry and renewal notifications

Status: **partial**.

Gap: Renewal execution and the RENEW-002 offer, SEND-005 watchers and their channel preferences, sender settings screens, default-on activation without per-proposal consent, template inheritance and public proof for declined offers remain. The stored renewal defaults do not execute renewal notices. Conservative default adopted pending ct approval: an authorized sender must explicitly consent per proposal; notices go only to the recorded active sales owner; upgrades and restores never activate outbound work. Existing open manual follow-ups are preserved instead of overwritten. RENEW-002, SEND-005 and FOLLOW-006 inherit the matching authority, timing and custody obligations.

Evidence: `tests/mail.test.mjs`

## FOLLOW-004 — Client questions and comments

Status: **done**.

Evidence: `src/platter/questions.ts`, `src/platter/question-replies.ts`, `src/platter/ui/questions.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## FOLLOW-005 — Decline reasons and won or lost outcomes

Status: **partial**.

Gap: tests/platter.test.mjs — “FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval” (Budget decline, HubSpot Closed lost fake, link revocation, follow-up closure, reopen and reapproval, configured reasons, won override, exact consent and stage-only holds); “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership” (scoped reporting); tests/site.test.mjs — “FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision” (1440 and 390 screens); tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (exact custody without execution authority)

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## FOLLOW-006 — Default reminder schedule and expiry from the workspace and templates

Status: **partial**.

Gap: Current blank, starter, personal or shared template and agent drafting doors resolve independent reminder, expiry and warning workspace inherit and template override choices at creation; duplication copies the source’s edited delivery snapshot, never its lifecycle or execution authority. Existing proposals are unchanged by later workspace and template edits. tests/mail.test.mjs — “FOLLOW-001 / FOLLOW-006 template and workspace delivery snapshots preview exact dates, send on those dates, remain editable without approval and never copy authority” proves the exact 2/5/9 versus 3/7-day March fixture, expiry dates and clock-advanced mail, 4-day template edit and 45-day workspace isolation, owner and admin settings authority with sales and manager no-write refusals, shared-template sales refusal, mixed inheritance, current agent drafting, copied payment-method or reminder or expiry fields, manual 429, moved inherited warning and same revision without reapproval extension. tests/site.test.mjs — “FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths” proves workspace and template controls, pre-send dates, sent editing, actor and time timeline and inactive copies at 1440/390. tests/platter.test.mjs — “TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership” proves first-release upgrades leave existing proposals unchanged while future drafts copy on/2/5/9/before-3/cap-3/60-day or one-day settings without activation. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves inheritance or snapshot or history custody and fresh restore authorization. Gap: multiple-recipient execution (FOLLOW-001 and SEND-003), bulk creation (RENEW-001), public-link submissions (SEND-009), future payment execution defaults (PAY-003), and ct approval of the explicit per-proposal authorization, supplied recipient IANA zone and no activation on upgrade or restore default remain. These are this seed’s unimplemented foundations, not external account blockers. The clause remains PARTIAL.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs`

## FOLLOW-007 — Unattended CRM sync under a standing grant

Status: **missing**.

Gap: No standing-grant execution; ct must specify consent, scope and public-door assertions before implementation.

Evidence: None recorded.

## NEG-001 — Negotiated revisions after sending

Status: **done**.

Evidence: `src/platter/negotiation.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## NEG-002 — Client-suggested text edits

Status: **done**.

Evidence: `src/platter/suggestions.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SIGN-003 — ESIGN and UETA electronic signature

Status: **partial**.

Gap: Typed Client signature blocks retain explicit adoption with the accepted name and consent. Gap: consumer disclosure, withdrawal, drawn or uploaded signatures, initials and additional signer roles remain.

Evidence: `src/platter/signing.ts`, `tests/platter.test.mjs`

## SIGN-004 — Multiple signers, signing order and countersignature

Status: **partial**.

Gap: Policy default adopted under the standing scope rule, pending ct approval: only the current owner configures roles, sends or replaces configured recipient invitations and countersigns; each recipient verifies their own mailbox. Additional viewing links require explicit audited consent, including the exact framing origin when embedded. Restoring records restores no invitation or framing authority. Scoped non-owner sending and replacement remain outside this interim boundary, and provider-specific recipient checks remain SIGN-006 work. SIGN-004 stays PARTIAL until ct approves the authority default; no legal or provider qualification is claimed.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SIGN-005 — Signed agreement PDF and certificate of completion

Status: **partial**.

Gap: Two-signer completion, completion-email attachments, full agreement attachment packaging, IP-derived location and user-agent recording remain. Missing historical methods are never inferred; currently unrecorded location and user agent are labelled not recorded. This prerequisite remains PARTIAL.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SIGN-006 — Signer identity options

Status: **partial**.

Gap: CT ruling, 26 October 2026: APPROVE WITH RIDERS for the inherited SMS product default; status remains partial. SMS identity codes inherit SEND-008’s recorded recipient consent and exact revision and invitation binding, supplied recipient IANA zone and quiet hours, live sender authority, number-wide STOP, refusal of START reactivation, no restored authority and no automatic retry after uncertainty. Recipient code requests additionally require a current invitation and a still-valid authorized SMS configuration; they confer no staff Send permission. Consent to receive a code is distinct from consent to electronic records and intent to sign. STOP blocks identity-code texts as well as other SMS purposes. Missing consent, an invalid zone, suppression or uncertainty does not silently select another identity method or weaken an SMS requirement. Mailbox code remains the default when no identity choice was made, and the certificate records only the method actually used. This ruling approves policy only and certifies no signer identity, implementation or legal compliance. Gap: Government ID verification through Stripe Identity or Persona, link-only signing with forwarded-device and network escalation, multiple signer roles, sender method-selection controls and safe recipient SMS re-enablement remain. The full SIGN-001 code limits and exact verification binding remain required. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps inherited from SEND-008. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders.

Evidence: `tests/mail.test.mjs`, `tests/site.test.mjs`

## SIGN-007 — Fields collected at acceptance

Status: **partial**.

Gap: Client-assigned text, date and checkbox fields enforce required values at acceptance; typed signature blocks adopt the same acceptance name. Values freeze with the agreement and survive the public CLI. Evidence: tests/platter.test.mjs — “EDIT-001 Client-assigned required fields and typed signature blocks validate at signing and freeze exact values with the selected agreement”, tests/site.test.mjs — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” and tests/archive.test.mjs — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority”. Gap: recipient roles beyond Client, file collection, invoice or CRM propagation and certificate listing remain.

Evidence: `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## SIGN-008 — Acceptance on the client's own paper

Status: **done**.

Evidence: `src/platter/paper-acceptance.ts`, `src/platter/paper-record.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`

## SIGN-009 — Recipient delegation of signing

Status: **missing**.

Gap: One fixed client signer; no delegation.

Evidence: None recorded.

## SIGN-010 — In-person signing on the firm's device

Status: **missing**.

Gap: Signing happens only from the client's own emailed link.

Evidence: None recorded.

## SIGN-011 — Template recipient roles, field assignment and signing order

Status: **missing**.

Gap: No templates, recipient roles or field assignments; one client recipient per proposal.

Evidence: None recorded.

## PAY-001 — Stripe card and ACH collection in the proposal

Status: **partial**.

Gap: USD collection uses Stripe Payment Element only after explicit preparation consent and a verified current signature. Exact one-time amount authorization is audited before confirmation; the provider account, accepted revision, deposit, currency, method and billing-state quote stay bound. Card and bank details stay in Stripe frames. Unknown and prohibited billing states and ACH have no card fee. Collection starts only after signing, so unsigned withdrawal releases no Stripe client secret. Gap: Apple Pay and Google Pay test-wallet payments (Stripe reports no available wallet in the headless test browser; they need a device with a configured wallet) and a browser Financial Connections instant-verification journey remain unproved. Bank verification is proved only by the micro-deposit path driven through Stripe’s test API. PAY-003, PAY-005 and PAY-008 inherit exact account, amount, revision and explicit authorization binding; this one-time authorization grants no future charge.

Evidence: `tests/stripe-sandbox.mjs`, `tests/collection-browser.mjs`, `tests/instrument-scan.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`

## PAY-002 — Deposit or partial payment at acceptance

Status: **done**.

Gap: PAY-003, PAY-008 and PAY-009 inherit this same-session flow and must extend the named real-browser journey before shipping.

Evidence: `tests/collection-browser.mjs`, `tests/stripe-sandbox.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`

## PAY-003 — Milestone and recurring payment schedules

Status: **missing**.

Gap: PRICE-007 retains informational schedules; authorized milestone and recurring charge execution remains absent.

Evidence: None recorded.

## PAY-004 — Paid, pending, failed, refunded and disputed states

Status: **missing**.

Gap: No payment states.

Evidence: None recorded.

## PAY-005 — Failed-payment retries and notices

Status: **missing**.

Gap: No retries or notices.

Evidence: None recorded.

## PAY-006 — Refunds and disputes

Status: **partial**.

Gap: Owner, admin and billing can explicitly refund a verified existing Stripe deposit with a reason. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves Stripe-fake receipt, sales no-call refusal, exact accepted revision or account or currency binding, concurrent bounds, idempotent retries and durable uncertain holds. The compiled role journey proves billing screens at 1440/390 and the role archive journey preserves refunds without credentials. Current financial roles can verify a Stripe dispute against a linked deposit and explicitly submit the exact accepted snapshot, acceptance facts as recorded and a response note before its provider deadline. tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence” proves owner or admin or billing success, other-role no-call refusals, foreign-charge and deadline refusal, consent, idempotency, private-cost exclusion and exact retained PDF hashes. The named role browser and CLI journeys prove 1440/390 responses and restoration of exact evidence bytes without replay. CT ruling (22 October 2026, eaf743e): manual, explicitly authorized submission of available facts is approved as the interim, with preparation, authorization, submission and Stripe receipt kept distinct; the full pack submitted to Stripe stays the target. The bounded correction is proven by tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence”: retained acceptance-method facts and omitted-file names; exact preview or hash or amount or deadline authorization and its audit record; owner or admin or billing authority and other-role or agent no-call refusals; missing authorization, changed hash or note or retained amount and expired deadline no-call refusals; claim before provider I or O, explicit submit, byte-for-byte upload, concurrent exclusion and timeout replay hold; under-review-only receipt and provider won or lost states. A provider amount or deadline change discovered during the claimed preflight read holds the attempt before any upload. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves prepare, exact PDF review, authorization and submission at 1440/390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves exact packet or authorization or submission or hash custody, excluded credentials and restore or replay without provider calls. Gap: accounting credits, full SIGN-005 certificates or attachments, TRACK-001 view evidence and PAY-001 or PAY-002 authorization artifacts; uncertain refunds or submissions require provider reconciliation.

Evidence: `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## PAY-007 — Check, wire and ACH credit payments

Status: **partial**.

Gap: Owner, admin and billing record received check, wire and ACH credit payments with reference and receipt date; tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves the role boundary and all three methods. The role archive journey preserves exact records. Gap: milestone and schedule reconciliation, accounting synchronization, remittance details and overdue removal.

Evidence: `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## PAY-008 — Net-terms invoices with a pay link and overdue tracking

Status: **missing**.

Gap: No invoices are sent to the client; the only invoice is the owner's deposit CSV export.

Evidence: None recorded.

## PAY-009 — PayPal, Square and Authorize.net collection

Status: **missing**.

Gap: No payment processors are connected.

Evidence: None recorded.

## ACCT-001 — QuickBooks Online invoices and payments

Status: **missing**.

Gap: No QuickBooks connection.

Evidence: None recorded.

## ACCT-002 — Xero invoices and payments

Status: **partial**.

Gap: A currency-tagged Xero-format deposit CSV only; no API sync, schedules or payments.

Evidence: `src/platter/invoices.ts`, `tests/platter.test.mjs`

## ACCT-003 — Pantry invoices and payments

Status: **missing**.

Gap: No Pantry connection.

Evidence: None recorded.

## ACCT-004 — One invoice authority and reconciliation

Status: **partial**.

Gap: A unique local binding prevents duplicate exports; there is no authority choice, provider ID or payment matching.

Evidence: `src/platter/invoices.ts`, `tests/platter.test.mjs`

## ACCT-005 — Invoice and payment export files

Status: **partial**.

Gap: A currency-tagged Xero deposit CSV only; no QuickBooks files, sandbox-verified USD imports, payment or schedule export.

Evidence: `src/platter/invoices.ts`, `tests/platter.test.mjs`

## ACCT-006 — Stripe payouts, fees and clearing in accounting

Status: **missing**.

Gap: No payment or accounting connection, so no payout or fee posting.

Evidence: None recorded.

## ACCT-007 — Invoices created on their issue day, never ahead

Status: **missing**.

Gap: No invoices are created for scheduled amounts; the only invoice is the owner's deposit CSV export after acceptance.

Evidence: None recorded.

## CRM-001 — HubSpot two-way deal sync

Status: **missing**.

Gap: No HubSpot connection.

Evidence: None recorded.

## CRM-002 — Salesforce two-way opportunity sync

Status: **missing**.

Gap: No Salesforce connection.

Evidence: None recorded.

## CRM-003 — Orbit two-way deal sync

Status: **missing**.

Gap: No Orbit connection.

Evidence: None recorded.

## CRM-004 — Pipedrive and Zoho CRM sync

Status: **missing**.

Gap: No Pipedrive or Zoho connection.

Evidence: None recorded.

## AUTO-001 — Status-driven automations

Status: **missing**.

Gap: No automations.

Evidence: None recorded.

## AUTO-002 — Completed documents archived to file storage

Status: **missing**.

Gap: No document archiving.

Evidence: None recorded.

## AUTO-003 — Team chat notifications

Status: **partial**.

Gap: Nook, broader proposal events, channel settings screens and chat-native approval interactions remain. Conservative default adopted pending ct approval: only owner and admins authorize destinations; channel events contain generic event text and a session-protected link, never proposal content; approval details use a verified direct recipient. Restored routes require explicit reconnection and new consent. Future Nook and COLLAB-002 event sources inherit these obligations.

Evidence: `tests/mail.test.mjs`

## AUTO-004 — Public REST API and webhooks

Status: **partial**.

Gap: The ct demotion remains in force pending fresh acceptance of the corrected public status and analytics, negotiated revision events, all ten receiver deliveries and independently expected documented scopes. Exact-candidate Verify and guarded landing receipts remain pending; AUTO-004 must remain partial until ct accepts.

Evidence: `src/platter/api/index.ts`, `src/platter/api/webhooks.ts`, `tests/platter.test.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs`

## AUTO-005 — Zapier, Make and Crank apps

Status: **missing**.

Gap: No automation-platform apps.

Evidence: None recorded.

## HAND-001 — Accepted-scope handoff to delivery tools

Status: **missing**.

Gap: No delivery handoff.

Evidence: None recorded.

## HAND-002 — Handoff to Gauge with budget and rates

Status: **missing**.

Gap: No Gauge handoff.

Evidence: None recorded.

## RENEW-001 — Bulk proposal creation and sending

Status: **missing**.

Gap: No bulk sending.

Evidence: None recorded.

## RENEW-002 — Renewal proposals from accepted agreements

Status: **missing**.

Gap: No renewals.

Evidence: None recorded.

## REPORT-001 — Proposal pipeline dashboard

Status: **done**.

Evidence: `src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## REPORT-002 — Win rate and sales performance

Status: **missing**.

Gap: No conversion reporting.

Evidence: None recorded.

## REPORT-003 — Content and pricing performance

Status: **missing**.

Gap: No content analytics.

Evidence: None recorded.

## REPORT-004 — Booked, billed and collected revenue

Status: **partial**.

Gap: The recorded-revenue pipeline shows booked signed value, booked one-off and first-year values from immutable accepted PRICE-003 fee snapshots, explicitly received payments, confirmed refunds, net received, unconfirmed refunds and exported deposit CSV value, separately by currency and recorded sales owner. Independent inclusive date ranges select bookings by UTC acceptance date and collections by the recorded receipt date. A row remains when either selected booking or selected receipt exists; booking values outside their range are zero. Refunds reduce the selected receipts. Linked receipts without a recorded receipt date appear only without receipt-date bounds; no provider payment date is inferred. Exported deposit CSV value follows the booking period and is never labelled a paid provider invoice. Owner, admin and billing see all; manager and viewer see teams; sales sees own; content editors and agents receive no revenue facts. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves the $2,500 setup plus $1,200 monthly agreement, $16,900 first-year value for both twelve and twenty-four installments, separate quarters with hand-computed filtered totals, inclusive dates, historical currency isolation, each role, immutable acceptance retries, invalid-filter no-write refusals, matching CSV and once-only scheduled email. tests/site.test.mjs — “REPORT-004 booked snapshots and independent receipt periods export and schedule the visible report” proves native date, owner and currency controls, visible values, matching CSV and saved schedule filters, with the changed screen at 1440 and 390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves identical restored filtered and all-period rows, totals, CSV and schedule filters. Gap: MRR, provider invoiced and overdue amounts, accounting reconciliation with the QuickBooks fake, and charge and invoice execution remain. The assigned native reporting points do not establish live-provider proof or clear the existing real-key holds.

Evidence: `src/platter/reports/recorded-revenue.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## REPORT-005 — Report export and scheduled delivery

Status: **done**.

Evidence: `src/platter/reports/schedules.ts`, `src/platter/reports/pipeline-csv.ts`, `src/platter/reports/zone.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`

## TEAM-001 — Roles and permissions

Status: **partial**.

Gap: Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read or edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts or sorting or totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, workspace deletion and full content or revenue report capabilities. Base’s native issuer-version check still rejects a pending invitation after a native role promotion even when the issuer retains grant authority (a public /auth/operator/role then /auth/confirm probe returns 400, no session); product time-zone or team additions are preserved, but native-version preservation needs a supported Base change or explicit review of credential rebinding. The native security guard is retained. CT ruling (22 October 2026, eaf743e) implemented: a share grants one proposal, never role authority. Cell (8) is proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”; the named role browser journey covers the out-of-team manager without Send, Approve or Unlock controls at 1440/390. Catalog edit or insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates or team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. CT ruling (22 October 2026, eaf743e) implemented: current grant authority, exact native invitation binding, cancellation and expiry, and explicit consent for wider folder or item audiences. Cell (9) is proved by tests/platter.test.mjs — “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”; cell (10) by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content” and the named role browser journey at 1440/390. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google or Microsoft mailbox connections now ship; the QuickBooks admin or sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Mailbox connections follow SEND-001's ct-approved provider-verified one-member binding: OAuth mailboxes may differ from sign-in, refresh before sending, and attribute the selected sender. Its legacy access-token door remains identity-only. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder or expiry or payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001 or FOLLOW-006 work. Native ownership handoff is proved with fresh email-link authority, denied non-owner writes, revoked old-owner sessions or agent keys and retained proposals in tests/platter.test.mjs — “TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace”. tests/platter.test.mjs — “TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership” proves the actual additive migration and scoped old-member reads. The recorded-revenue pipeline view now enforces all current revenue-report role cells, with hand-computed payment or refund totals and matching CSV or scheduled mail. Full content reports and remaining revenue features remain foundations in this seed, not account blockers. Current reminder policy and execution rights are additionally proved by tests/mail.test.mjs — “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap” and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”: only owner or admin change quiet hours, sending follows live proposal or team scope, and role or invitation changes during provider I or O refuse the reminder without a provider send or fallback. The existing delegated-invitation journey now reproduces the native issuer-version blocker through /auth/operator/role and /auth/confirm: an authorized manager promoted to native admin still yields 400 and no session, product role or team on the old invitation. This needs a supported Base change; credential versions are never rebound here.

Evidence: `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs`

## TEAM-002 — Single sign-on and SCIM provisioning

Status: **missing**.

Gap: No SSO or SCIM.

Evidence: None recorded.

## TEAM-003 — Multiple brands and workspaces

Status: **missing**.

Gap: One workspace and brand.

Evidence: None recorded.

## TEAM-004 — Audit log

Status: **done**.

Evidence: `src/platter/audit.ts`, `src/platter/auth-audit.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## TEAM-005 — Security review pack for procurement

Status: **missing**.

Gap: No security page, questionnaire answers, DPA, subprocessor list or audit report.

Evidence: None recorded.

## MIG-001 — PandaDoc move-in

Status: **missing**.

Gap: No PandaDoc import.

Evidence: None recorded.

## MIG-002 — Proposify move-in

Status: **missing**.

Gap: No Proposify import.

Evidence: None recorded.

## MIG-003 — Better Proposals move-in

Status: **missing**.

Gap: No Better Proposals import.

Evidence: None recorded.

## MIG-004 — Qwilr and Ignition move-in

Status: **missing**.

Gap: No Qwilr or Ignition import.

Evidence: None recorded.

## MIG-005 — Open proposals and payment schedules continue

Status: **missing**.

Gap: No in-flight migration.

Evidence: None recorded.

## MIG-006 — Clients, contacts and catalog CSV move-in

Status: **partial**.

Gap: image URLs fetched through Base's egress relay

Evidence: `src/platter/movein/business-import.ts`, `src/platter/business-records.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## MIG-007 — Move-in from exported files without API access

Status: **missing**.

Gap: No document import; only the client CSV kit exists.

Evidence: None recorded.

## MOB-001 — Team app on a phone

Status: **done**.

Gap: tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” completes template creation, sales sending, a verified client question and sales answer, sales follow-up management, personal-template reuse, manager approval and the sales approval refusal (403), at both 390 and 1440 pixels. All acceptance actions are proven through the compiled production routes.

Evidence: `tests/site.test.mjs`

## MOB-002 — iOS and Android apps with push notifications

Status: **missing**.

Gap: No native apps or push.

Evidence: None recorded.

## AI-001 — Drafts from meeting notes, transcripts and email

Status: **partial**.

Gap: External agents can post structured drafts; there is no ingestion of notes, transcripts or email and no in-product drafting.

Evidence: `src/platter/http.ts`, `tests/platter.test.mjs`

## AI-002 — Writing assistant in the editor

Status: **missing**.

Gap: No writing assistant.

Evidence: None recorded.

## AI-003 — MCP server for AI assistants

Status: **done**.

Evidence: `src/platter/mcp.ts`, `src/platter/send-requests.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## AI-004 — Explainable price suggestions

Status: **missing**.

Gap: No price suggestions.

Evidence: None recorded.

## PRIV-001 — Erasure across contacts, tracking and synced systems

Status: **partial**.

Gap: Only unused client records can be erased; no contacts, tracking data or notice to synced systems.

Evidence: `src/platter/commands.ts`, `tests/platter.test.mjs`

## PORT-002 — Complete product archive

Status: **done**.

Evidence: `tests/archive.test.mjs`, `src/platter/archive-policy.mjs`

## SEC-001 — Provider credential custody

Status: **partial**.

Gap: Stripe, QuickBooks, HubSpot, Salesforce, Drive, Slack, Google and Microsoft tokens are sealed with purpose-separated AES-GCM, omitted from API or UI or log fields and excluded from archives. tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens” proves connection authority, plaintext absence and disconnect; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves metadata restoration requires reconnection. Gap: SSO provider credentials, per-provider least-scope verification, OAuth refresh, visible breakage state and job-stop assertions for future synchronization jobs.

Evidence: `src/platter/connections.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`

## AGENT-001 — Discovery call to priced draft

Status: **partial**.

Gap: Agents can submit drafts that the owner must approve; there is no transcript ingestion, catalog matching or citations.

Evidence: `src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs`

## AGENT-002 — Scope and price tested against delivery reality

Status: **missing**.

Gap: No delivery cost, capacity or outcome data is read.

Evidence: None recorded.

## AGENT-003 — Client questions chased to resolution

Status: **missing**.

Gap: No question tracking or agent.

Evidence: None recorded.

## AGENT-004 — Engagement-driven follow-up

Status: **missing**.

Gap: No engagement data or follow-up agent.

Evidence: None recorded.

## AGENT-005 — Payment exceptions closed without duplicate invoices

Status: **partial**.

Gap: Duplicate local exports are prevented; there is no provider event matching, exception queue or agent.

Evidence: `src/platter/invoices.ts`, `tests/platter.test.mjs`

## AGENT-006 — Out-of-scope delivery turned into a change order

Status: **missing**.

Gap: No delivery signals or change orders.

Evidence: None recorded.

## AGENT-007 — Win and loss learning for templates and pricing

Status: **missing**.

Gap: No outcome analysis.

Evidence: None recorded.

## AGENT-008 — Renewal preparation from delivered results

Status: **missing**.

Gap: No renewal agent.

Evidence: None recorded.

## AGENT-009 — Agent authority ledger and limits

Status: **partial**.

Gap: Agent keys are limited to drafting and are revocable; there is no per-action ledger, source citations, budget or pause control.

Evidence: `src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs`
