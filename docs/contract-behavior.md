# Proposal behavior reference

Detailed product mappings, limits and lifecycle rules carried through the contract rewrite. The contract owns acceptance and current status.

## HTTP-001

Every proposal, client, import and invoice handler checks a native Base owner or member session, or a revocable owner-bound agent key, before it reads or writes. Browser mutations require the configured Origin and Host and refuse cross-site requests. Which role may take which action is `TEAM-001`, with approving and sending set by `APPROVE-003`; every refusal is a 403 with no write. Signed-out readers of `/app` are sent to sign-in, and unknown routes return real 404s.

## PROP-001

Every approval names one exact revision. Saving a new revision clears every approval the proposal holds, so a changed price, scope or term can never be sent on an earlier approval, and each approval is recorded with its approver, role, rule, revision and time. Who may approve and send, and which proposals need approval at all, is the approval policy of `APPROVE-003`. Its default, which every installation starts with and keeps until the owner changes it, is the first release's rule: every proposal needs approval, and only a person with the owner role approves. An agent’s binding decision carries commitment and follows the company’s policy within the sponsor’s role and grant. `APPROVE-001` and `APPROVE-003` decide which approvals apply; neither can remove the exact-revision binding.

## PROP-002

Sending freezes the approved revision: its scope, options and prices can no longer be edited in place. Anyone who may send the proposal under `APPROVE-003` can send a fresh invitation, which rotates the client link and clears any verification session without changing the offer, so it needs no new approval. A change after sending is a new revision under `NEG-001`, never an edit to what the client already holds.

## SIGN-001

A client invitation grants access only to its own frozen offer. Acceptance needs a mailbox verification code: six digits, single use, valid for 10 minutes, at most five attempts, one request a minute and ten codes per invitation. Verification grants acceptance authority only for that invitation and revision, through an HttpOnly, SameSite=Strict cookie scoped to the invitation path. The code stays the default identity check for every proposal; a firm that wants the incumbents' link-only acceptance chooses it explicitly per proposal or template under `SIGN-006`, and the certificate records the method.

## SIGN-002

Acceptance requires a verified mailbox, a typed full name, one offered option and explicit consent. One D1 transaction retains the exact approved snapshot, signer, consent text and time, and calculates the deposit in integer cents, rounding to the nearest cent. A second acceptance returns the first; nothing in the product edits an accepted agreement.

## INV-001

An owner exports the accepted deposit as an invoice record. A unique proposal-to-invoice binding makes concurrent and repeated exports return one retained invoice with one number, and the export can be downloaded again without creating another. Re-downloading never authorizes posting the same invoice to accounting twice; `ACCT-004` carries this one-invoice rule into live accounting sync. The first release writes a Xero-format CSV; the export rejects proposals that are not accepted. Spreadsheet formula characters in client-controlled cells are neutralized.

## IMPORT-001

The client CSV kit previews the exact source bytes without writing, and applies only the file whose fingerprint was reviewed. Base import-kit retains the original, its fingerprint, a journal and reversible native writes. Re-applying returns the same job. Undo restores the previous state and refuses when an imported client has changed or has dependent proposals.

## ERASE-001

An owner erases a client by typing the exact client name. Erasure is limited to clients with no proposals and no import history; agreements remain retained business records. Erasure writes a portability fence, so an older archive cannot restore the erased client and in-flight transfers are invalidated.

## PORT-001

RER archives preserve clients, proposals, revisions, approvals, immutable acceptances and deposit invoices. Credentials, sessions, client invitation links, verification state and mail do not travel. Restore requires an empty destination and valid integrity, and refuses an older archive without a newer erasure journal. Sent offers need fresh invitations after restore.

## MAIL-001

Local proposal and verification mail is captured without a provider. Hosted mail is queued durably in the same transaction as the action that sends it, claimed before contacting the configured sender, and records an uncertain outcome without a blind retry. Provider acceptance is shown as accepted by the provider, never as delivered; `SEND-002` adds delivery and bounce states.

## SITE-001

The public run site is built with `rer build --site`. Its homepage's Run Platter action opens `/run`, and `/docs` renders the repository's Markdown guides without JavaScript. The installed root stays the shared Lobby. Run-site deployment is guarded by `RUN_SITE_DEPLOY` and stays off until its gate.

## EDIT-001

A member builds a proposal from blocks: cover page, heading, rich text, image, video, columns, pricing table (`PRICE-001`), quote or testimonial, team bio, case study, terms, form field (`SIGN-007`), signature block and page break. Every signature block and field is assigned to one recipient, or in a template to one recipient role (`SIGN-011`). Blocks are added from a palette, reordered by drag or keyboard, duplicated and deleted with undo. A brand kit sets the logo, colors, fonts and a default cover. One document renders as a responsive web page for the client and as a paginated US Letter PDF (`EDIT-020`) with the same content, and members and approvers see that client page for an unsent revision through the preview of `EDIT-018`. Edits autosave under the version guard of `COLLAB-001`, and the editor meets the large-proposal performance budget of `EDIT-011`.

All added blocks and media extend EDIT-014’s exact-revision, selected-price and every-page unsigned PDF journey before shipping.

Implemented document semantics: the Client role binds each current form/signature block to the proposal’s invited client and is rebound when a person chooses the destination client for a duplicate or template start. SIGN-004 and SIGN-011 inherit additional participants and roles; SIGN-003, SIGN-005 and SIGN-007 retain their disclosure, adopted-signature, certificate, file-collection and downstream-value obligations. Display-media uploads require explicit consent and use separate scoped references; EDIT-006 inherits its external embeds and galleries without making ordinary attachments inline. A pricing block places an existing table; remove or reassign its placement before changing that package’s table count.

## EDIT-002

Owners, admins, managers and content editors publish templates (layout, blocks, default pricing tables, terms, payment methods (`PAY-001`), deposit and payment schedule (`PRICE-007`), reminder schedule and expiry period (`FOLLOW-006`), variables, and recipient roles with their assigned fields, signing order and pre-assigned recipients under `SIGN-011`) that members start proposals from; a proposal started from a template opens with the template's role slots to fill. Platter ships starter templates for US agencies, consultancies, IT managed services, creative studios and professional services. Any member who edits proposals can save one as a personal template they own; only the template roles of `TEAM-001` edit shared templates. Templates have owners, folders and access rules (`TEAM-001`), and changing a template never changes proposals already created from it.

Template defaults inherit EDIT-014’s PDF-download enable/disable setting and identical named PDF assertions before shipping.

## EDIT-003

A shared library holds sections, images, videos, case studies, team bios, testimonials, terms and pricing tables, with folders, tags and search. Owners, admins, managers and content editors create and edit library items, and every member who edits proposals inserts them (`TEAM-001`). A member inserts an item as a linked copy (updated when the library item changes, until the proposal is sent) or as a detached copy. Sent and accepted proposals never change when the library does. Each item shows where it is used and when it last changed.

The shared library holds text sections, case studies, bios, testimonials, terms, validated images and videos, and USD pricing tables. Team folders, tags and case-insensitive search ship. Media and tables are saved from placed blocks in a proposal the library editor may edit, with explicit consent to its library audience; validated originals are retained independently. Pricing insertion targets a chosen package and recalculates integer-cent totals. Linked changes create unapproved draft revisions atomically, including negotiated drafts; detached copies, sent revisions and accepted content remain frozen. Manual changes permanently detach the affected copy. Usage lists retain only proposals the reader may already view and show copy mode, frozen state and last-change time.

CT approval (24 October 2026, 04:45 UTC): a current proposal editor must explicitly consent at insertion to recipient display and future linked draft edits; usage grants no access beyond existing proposal visibility; sent and accepted content stays frozen. EDIT-002 and EDIT-005 inherit independent copied content, and EDIT-006 inherits consent and exact frozen media custody for future media capabilities.

## EDIT-004

Text and pricing can use variables: client company, contact name and title, address, deal name and amount, sender details, dates and custom fields, filled from Platter records or from the linked HubSpot, Salesforce or Orbit deal (`CRM-001` to `CRM-003`). Template role slots (`SIGN-012`) are filled the same way, from the client's contacts or the deal's contacts. A variable with no value is flagged in the editor, and sending is refused until each one is filled or deliberately cleared. The sent revision freezes the filled values.

Before shipping, extend EDIT-012 duplication assertions to refill every variable from the destination client and deal while leaving the source byte-identical.

## EDIT-005

A member uploads a Word (.docx) file, such as a template or document downloaded as Microsoft Word from PandaDoc, Proposify or Better Proposals, and gets editable blocks (`EDIT-001`) with headings, paragraphs, lists, tables and images kept. Incumbent merge tokens, such as PandaDoc's `[Client.Company]`, `[Client.FirstName]` and `[Sender.FirstName]`, become `EDIT-004` variables through a published mapping table; a token with no mapping becomes a custom variable and is listed. A table whose header row names price, quantity or SKU columns (a quote or pricing table) becomes a `PRICE-001` pricing table: a row whose SKU, or failing that its name, matches a `CAT-001` item becomes a priced line item linked to that item at the row's quantity and price, and a row that matches nothing becomes an unlinked line item at its own name and price and is listed as unmatched for the member to link or keep. Images that the source file dropped, such as those PandaDoc leaves out of quote tables in its Word downloads, are listed as missing, never invented. A .docx can instead be imported as content library items (`EDIT-003`): the file is split at each Heading 1, and each part becomes one item named by its heading. A PDF upload is never converted to editable blocks. It becomes fixed pages, kept byte-identical, that carry signature, initials, date and form fields (`SIGN-003`, `SIGN-007`); the member can append editor blocks after them, including a pricing table, and set a payment schedule (`PRICE-007`), so a fixed-page document can still take payment at acceptance. Any proposal exports to PDF (US Letter or A4) and to Word: headings become Word heading styles, each pricing table becomes a Word table with every line's name, quantity, unit price and total, and images are embedded. The signed agreement PDF is `SIGN-005`.

All imported blocks, fixed pages and media extend EDIT-014’s exact unsigned PDF assertions before shipping.

## EDIT-006

Proposals embed images and galleries, uploaded video, YouTube, Vimeo, Loom and Wistia video, a Dial or Calendly booking link and embedded PDFs. Embeds come from an allowlist with a content security policy, render on phones, and show a still and a link in the PDF export. Uploaded media is stored with the proposal and travels in archives (`PORT-002`).

Uploaded images and videos, ordered galleries, canonical YouTube, Vimeo, Loom and Wistia video frames, Calendly booking frames and Google Drive PDF previews ship. Uploaded originals stay with the proposal; external content retains its canonical URL and uploaded poster.

CT approval (24 October 2026, 08:09 UTC): owner and admins control the audited external-content setting, off on fresh installs; only those roles change external blocks, and author consent stays in the revision. Viewers opt in on each page load. Before opt-in there are no provider requests, cookies or browser storage; frames use the exact allowlist, a sandbox, no referrer and CSP frame sources. The owner kill switch replaces external content with a plain placeholder naming its provider on the next load.

EDIT-002, EDIT-003 and EDIT-005 inherit these consent and frozen-media obligations for future media carriers.

## EDIT-007

The client reads, chooses options, comments, signs and pays on a phone as well as on a desktop. The client page meets WCAG 2.2 AA, works with keyboard and screen reader, and needs no app or account.

## EDIT-008

An owner serves client links from their own domain, such as `proposals.example.com`, and sends from their own domain with SPF, DKIM and DMARC alignment checked before use. The client page, emails and PDF carry the firm's brand and no Platter branding.

## EDIT-009

A section can be shown only when a package, optional item or variable has a given value, so choosing the Premium package shows its deliverables and timeline. The accepted agreement and PDF contain exactly what the client saw for their selection. Today this applies to the scope and terms sections, each conditioned on one offered package or one optional item (`PRICE-002`), including the selected unsigned client PDF (`EDIT-014`). An optional-item condition shows its section only while the client's chosen package has that item added, at any allowed quantity; a package without the item never shows it. Each future capability inherits the same conditional visibility and exact-selection assertions before shipping: `EDIT-001` added sections, `EDIT-004` variables, `EDIT-005` added PDF carriers and `SIGN-005` signed agreement PDFs. Unconditional legacy content remains visible for every selection. Members check each selection's sections before sending in the `EDIT-018` preview.

## EDIT-010

A proposal carries attachments such as the firm's W-9, certificate of insurance, MSA or case-study PDFs. The firm stores its current W-9 and insurance certificate once and attaches them by default. Attachments are frozen with the sent revision and listed in the signed agreement package. Owner-only vendor settings keep immutable W-9 and insurance file versions; new proposals copy the current defaults. Owner/member people may upload arbitrary files or refresh current defaults on an unsent draft or approved proposal; either creates a new draft revision and clears approval. Existing revisions and sent offers never resolve a later default. Client links download only files in that exact sent revision, under the same invitation access as its offer; bytes are download-only and are not sent to an external provider. The immutable accepted snapshot retains file references with byte digests; the owner/client agreement package lists the same file versions, filenames and byte sizes. All original bytes and current defaults survive PORT-002 archives. SIGN-005 inherits the same list in its signed PDF package and TEAM-001 inherits scoped person authority before shipping.

## EDIT-011

The editor and client page stay fast on the proposals agencies actually send. The reference document is 40 US Letter pages with 30 images (2400-pixel JPEGs of about 500 KB each) and four pricing tables of 15 lines. Measured in Chromium at 1440 by 900 pixels with the CPU throttled 4× through the DevTools protocol (`Emulation.setCPUThrottlingRate`): the editor opens from navigation to editable (the first block accepts input) in at most 3 seconds; keystroke-to-paint latency over 200 keystrokes typed into a block on page 30 has a p95 of at most 100 ms; a drag reorder of a section completes, from drop to repainted order, in at most 300 ms; and a pricing-table quantity edit shows the server-confirmed total in at most 500 ms. The client page of the same proposal at 390 pixels with the same throttle reaches largest contentful paint in at most 2.5 seconds and loads images below the fold lazily. A measure over budget is a failing acceptance run.

## EDIT-012

A member duplicates any proposal (draft, sent, accepted or lost) into a new draft for the same or another client. The copy keeps blocks, pricing tables, attachments and settings (payment methods and schedule, reminder schedule and expiry period, `FOLLOW-006`), refills variables (`EDIT-004`) from the new client and deal, keeps the source's recipient roles as slots (`SIGN-011`) with only the template's pre-assigned members filled, and clears the other recipients, approvals, views, comments, signatures and payments. The copy is a new proposal that carries none of the source's approvals and needs approval only where the `APPROVE-003` policy requires it for its own revision; the source is never changed.

Current capability boundary (ct, 20 October 2026): DONE covers every proposal kind and field available today: draft, approved, sent, expired, withdrawn and accepted, including a displayed unsent negotiated revision. An owner or member duplicates for the same or another existing client; the copy preserves scope, terms, prices, original currency, deposit, attachment bytes, client-PDF setting and expiry configuration. It is a new draft at revision 1 owned by its preparing person, with no approvals, invitation authority, mail, views, comments, suggestions, signatures, invoice, payments or expiry transport state; the source remains unchanged. A days-based expiry copies calendar-day settings, not its previously calculated date; a fixed expiry date stays fixed. The default title appends " (copy)" and truncates the original title to fit 200 characters. EDIT-004 inherits refilling variables from the new client/deal; SIGN-011 inherits role slots with only template-preassigned members filled; FOLLOW-006 inherits payment/reminder/expiry settings; APPROVE-003 inherits both mandatory and optional approval cases. Each must extend the named EDIT-012 assertions before shipping. Any new document content, attachment or delivery/payment setting also inherits exact-copy coverage before shipping.

## EDIT-013

A firm sends and signs documents that carry no pricing table, such as a statement of work, NDA, master services agreement or change authorization, built in the editor or uploaded as a PDF with fields (`EDIT-019`). Approval, sending, tracking, reminders and signing work as for any proposal; the payment step, deposit, invoice and accounting sync are skipped, and the agreement records that no amount was agreed.

## EDIT-014

A recipient can download a PDF of the revision they are viewing before signing, so their procurement team can circulate it, unless the firm turns this off per proposal or template. The PDF carries the selection made so far, the revision number and "Not signed" on every page, and each download is on the timeline (`TRACK-001`). The signed agreement PDF remains `SIGN-005`.

Every document capability available today conforms: a mailbox-verified invited client downloads the exact sent revision with their selected package, optional items and quantities, currency and integer-cent deposit. Every US Letter page says "Not signed, revision N"; it is an unsigned offer, never a signed agreement PDF or certificate. The owner enables or disables downloads per proposal, without changing its content or approval; a disabled download is absent and the route returns 403. The TEAM-004 timeline records each successful download with client, revision, option and server time. Settings and download history travel in PORT-002 archives, while invitation credentials stay local. `EDIT-002` inherits the template default; `EDIT-001` and `EDIT-005` inherit all added blocks and media; `TRACK-001` inherits its engagement timeline. Each extends the same named PDF assertions before shipping; `PRICE-002` package, optional-item and quantity selections already meet them.

## EDIT-015

Template owners lock sections such as legal terms, warranties and payment terms. Members using the template can place and reorder a locked section but not edit it; owners, admins, managers and content editors lock and unlock sections in templates, and only the owner, an admin or a manager of the proposal's team unlocks one in a proposal (`TEAM-001`); and an unlock is recorded in the audit log (`TEAM-004`) and can trigger an approval rule (`APPROVE-001`). Locks are enforced on the server, not only in the editor.

## EDIT-016

Members search every proposal, template and agreement they may view under `TEAM-001` by title, client, contact, owner, status, amount, date and the full text of the content, including uploaded PDFs, and file proposals in folders with team access rules. Results and folders respect permissions on the server.

When proposal numbering ships, extend FOLLOW-002 with proposal-number tie-breaking after value and sent time, replacing its stable-id interim tie-break and extending the named journey.

## EDIT-017

Each recipient sees the client page, emails, disclosures (`SIGN-003`, `TRACK-004`), verification and signing steps in their language: at least English, Spanish, French, German and Portuguese, set per recipient or taken from the browser. The firm's own content is never machine-translated without the firm's approval (`AI-002`), and the certificate of completion (`SIGN-005`) records the language shown.

## EDIT-018

Before a revision is sent, anyone who may view the proposal under `TEAM-001`, including a collaborator, and every approver named on a pending approval step for it (`APPROVE-001`, `APPROVE-003`) opens a preview of that exact revision's client page as it will render after sending, with a width switch between desktop (1440 pixels) and phone (390 pixels). The preview is interactive as the client page is: choosing a package, toggling optional items and changing client-editable quantities (`PRICE-002`) recalculate the totals, discounts, sales tax (`PRICE-005`), deposit and payment schedule (`PRICE-007`) and show or hide conditional sections (`EDIT-009`) through the same server calculation the client page uses, and the same quantity limits apply. The member chooses the recipient or template role to view as (`SEND-003`, `SIGN-011`) and sees only that recipient's assigned fields and signing step, in that recipient's language (`EDIT-017`). Variables show their filled values, and an unfilled one is marked as `EDIT-004` would block it. An unsent negotiated revision of a sent proposal (`NEG-001`) is previewed the same way. A preview cannot be signed, accepted, paid, declined, commented on or submitted: those controls show but are disabled, and the matching requests made from a preview are refused (403). Opening or using a preview creates no revision, clears no approval, records no view or reading analytics (`TRACK-001` to `TRACK-003`), schedules no reminder, starts no expiry and sends no mail or text. A banner the client never sees marks the page as a preview, names the revision and the recipient viewed as, and links back to the editor. The preview is served on a member-only route under the member's own session: it is never reachable from a client link or a client session, and a client share token opens only the sent client page. An approval request (`APPROVE-002`) links to the preview of the exact revision awaiting approval, and an approval given after previewing binds that same revision (`PROP-001`).

## CAT-001

A catalog holds services and products with name, description, SKU, unit (hour, day, month, project or each), USD unit price, internal cost, default recurrence, taxable flag and tax code, income account, and images (uploaded, or fetched from a URL at import), which a pricing table set to show images displays on the item's line in the editor, the client page and the PDF. It imports from CSV with a reviewed preview (as `IMPORT-001`) and syncs from QuickBooks Online or Xero items and HubSpot or Salesforce products (`ACCT-001`, `ACCT-002`, `CRM-001`, `CRM-002`). Pricing tables add items from it; price changes never alter sent proposals.

## PRICE-001

A proposal has any number of pricing tables in USD, each with line items (name, description, quantity, unit, unit price), groups, subtotals and a grand total. All arithmetic is in integer cents with stated rounding, and totals are recomputed on the server. This replaces the first release's two GST-free AUD options for every new proposal; existing records keep their form under `PRICE-008`.

Each current package may carry any number of tables; its grand total is the sum of their subtotals. A package without tables keeps its explicitly entered fixed USD total. Quantities are positive thousandths of a named unit (0.001 to 1,000,000), unit prices are positive USD amounts with at most two decimal places, and each quantity × unit-price line rounds half up to the nearest cent before group, table and package summation. A package is between $0.01 and $10,000,000. Submitted subtotals and grand totals never override server arithmetic. Existing historical AUD proposals keep their original form. Tables, descriptions, quantities, units, prices, group subtotals and totals travel unchanged through exact-revision approval/send, member preview, comparison/restoration, duplication, negotiated drafts, the client page, selected unsigned PDF, acceptance and PORT-002 archives. Any PRICE-002 package can carry tables, and its selected optional items add to the table total; EDIT-001/EDIT-005 and SIGN-005 inherit their added document/PDF carriers before shipping.

## PRICE-002

A proposal offers any number of packages (good, better, best) and optional items the client can add or remove. Quantities can be client-editable within a minimum and maximum the firm sets. Totals, tax, deposit and the payment schedule update as the client chooses, and the agreement records exactly the selection signed. The sender and approvers try the same choices before sending in the `EDIT-018` preview, which uses the same calculation.

Expanded package, optional-item and quantity choices extend EDIT-014’s selected-price and deposit assertions before shipping.

Current-capability obligation: every capability available today conforms. A proposal offers one or more packages, each priced by a fixed USD amount or by `PRICE-001` tables, with any number of optional items. Each item has a USD unit price, a whole-number default quantity and inclusive minimum and maximum from 1 to 1,000,000, and is fixed or client-editable; items start unselected and each is chosen at most once. Switching packages starts a fresh optional-item selection on the server, including when JavaScript is unavailable. The server adds each selected quantity × unit price in integer cents to the package total, refuses a selected total over $10,000,000, and rounds the percentage deposit to the nearest cent, half up; that deposit is today's whole payment schedule, and no sales tax is calculated. The `EDIT-018` preview, the client page, the unsigned PDF (`EDIT-014`), typed acceptance and client-signed uploads (`SIGN-008`) use that one calculation, and a scope or terms section can depend on one package or one optional item (`EDIT-009`). `PRICE-005` (tax), `PRICE-007` (fixed deposits, milestones and net terms) and `PRICE-003` (recurring fees) inherit this obligation: before shipping, each makes its amounts follow the same package, optional-item and quantity selection in the preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

## PRICE-003

Line items can be one-off or recurring (weekly, monthly, quarterly or annual) with a term and start date. The proposal shows one-off total, recurring amount per interval and first-year value separately. Recurring lines drive the payment schedule (`PAY-003`) and renewal date (`RENEW-002`).

Before shipping, extend FOLLOW-002 value ordering with one-off total plus first-year recurring value, retaining exact currency labels and separate totals. Before shipping, one-off and recurring amounts on packages and optional items follow the client's `PRICE-002` selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

## PRICE-004

Discounts apply to a line, a group or the total, as a percentage or a fixed amount, optionally shown to the client and optionally expiring on a date. A discount over the threshold an admin sets routes the proposal for approval (`APPROVE-001`).

## PRICE-005

Each line is taxable or not under a tax code. Tax is calculated from the client's service or billing address by one of three methods the owner picks: owner-configured rates, Stripe Tax or Avalara AvaTax. Owner-configured rates are set per jurisdiction as state, county, city and special-district components with effective dates; Platter sums the components that apply to the address, computes tax on the taxable subtotal per jurisdiction in integer cents rounded half up, and freezes the rate used with the sent revision, so a later rate change never alters a sent quote. With Stripe Tax or AvaTax, Platter sends each line's amount, tax code and the addresses, applies the returned tax to the cent, and commits the AvaTax transaction when the invoice is issued. A tax-exempt client uploads an exemption or resale certificate, which is stored with the agreement. Tax shows as its own line and flows to invoices with the matching tax code (`ACCT-001`, `ACCT-002`). Platter calculates; filing returns stays with the tax service (see Honest boundaries).

Before shipping, tax follows the client's `PRICE-002` package, optional-item and quantity selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

## PRICE-006

Line items carry internal cost (from the catalog or entered), and the editor shows margin per line, per package and in total. Cost and margin are visible only to the roles `TEAM-001` allows (owner, admin, manager and billing) and never appear in the client page, PDF, client API or webhooks.

## PRICE-007

Payment terms are part of the offer: a deposit as a percentage or fixed amount, milestones by date or by event (such as design approval), net 15 or net 30 invoices, and recurring charges. A proposal's terms are copied from its template (`EDIT-002`) when it is created, and the sender changes them per proposal before sending without changing the template. The client sees the schedule before signing, and the accepted schedule is frozen with the agreement and drives `PAY-002` and `PAY-003`. Before shipping, every schedule amount follows the client's `PRICE-002` package, optional-item and quantity selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys; today's percentage deposit already does.

## PRICE-008

Amounts carry an explicit currency. When an installation moves to USD pricing, proposals and agreements created under the first release keep their AUD, GST-free form, totals, deposit and invoice CSV exactly, labeled with their currency, and are never converted. New proposals use USD; revising or restoring an existing proposal retains its currency. The additive migration labels first-release rows AUD without rewriting their immutable snapshot strings or retained invoice bytes, including when restored from a pre-currency archive. Currency metadata applies to proposal, revision, acceptance and invoice records. USD deposit CSVs use `No Tax` because Platter does not yet calculate sales tax (`PRICE-005`); this is not a tax-exemption determination or evidence of successful accounting import (`ACCT-005`).

## COLLAB-001

Several members edit one draft at the same time and see each other's cursors and changes live. Concurrent text edits merge; a conflicting structural edit, such as editing a deleted block, is shown with a restore option and never resolved silently. Pricing edits are checked on the server.

## COLLAB-002

Members leave internal comments on any block, mention a colleague, and assign a section to someone with a due date. Mentions and assignments notify by email and chat (`AUTO-003`). Internal comments are never visible to the client and never appear in the PDF or client API.

## COLLAB-003

Every saved revision is listed with author and time. A member compares any two revisions, with text, line-item and price changes highlighted, and restores an earlier draft revision as a new revision that needs approval again. This covers every field and priced option the product supports today. `PRICE-001` inherits comparison of each added line-item field before it ships; `EDIT-001` and `PRICE-007` inherit comparison and restoration of their added document and payment-term fields. Restore retains the proposal identity, creates the next revision under the current actor and time, preserves earlier snapshots, clears current approval and is refused for sent or accepted offers.

## APPROVE-001

Admins set approval rules by total value, discount, margin, payment terms, edited legal terms or template, and route each to named people or an approver role (owner, admin or manager, as `APPROVE-003` sets), in sequence or in parallel. A named person must hold the owner, admin, manager or billing role; a rule naming a sales member, content editor or viewer is refused when saved (400), and a named billing user approves only the steps that name them (`TEAM-001`). A rule applies to all proposals or to chosen templates, and a step whose condition does not hold for the current revision is skipped, as with the incumbents' conditional approvals. Whether a proposal that matches no rule needs approval at all is the `APPROVE-003` policy setting. `PROP-001`'s exact-revision binding applies to every approver.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with awaiting approval, including filters, sorting, counts and totals under its visibility rules.

## APPROVE-002

An approval request reaches the approver by email, Slack, Microsoft Teams, Nook or mobile push, with a summary of what triggered the rule and a link to the client-page preview of the exact revision awaiting approval (`EDIT-018`). The approver approves or rejects with a note from the request, including on a phone (`MOB-001`). Overdue requests remind the approver and the requester sees who holds it.

## APPROVE-003

One approval policy governs every proposal, negotiated revision (`NEG-001`), duplicate (`EDIT-012`), drafted proposal (`AI-001`), move-in reissue (`MIG-005`), public signing link (`SEND-009`) and approval made from a phone (`MOB-001`), using the roles of `TEAM-001`. **Who approves:** the owner, admins and managers, each only for an approval step whose rule names them or their role (`APPROVE-001`), and a manager only for proposals owned by their team; a billing user only for a step whose rule names them personally, such as finance approving payment terms; sales members, content editors, viewers and agent keys never approve, nor does a billing user on a step that does not name them (403, no write). **Who sends:** the owner and admins send any proposal, managers send their team's, and sales members send their own, including proposals shared with them as a collaborator (`TEAM-001`); sending includes fresh invitations (`PROP-002`), revisions (`NEG-001`), signer replacements (`SEND-007`) and withdrawal (`SEND-010`); content editors, viewers, billing users and agent keys never send (403). **What needs approval:** a proposal needs approval when an `APPROVE-001` rule matches its current revision. The owner or an admin sets "approval required for every proposal": when it is on, a proposal that matches no rule needs approval from the policy's default approver (the owner, or the admin or manager role the owner names); when it is off, a proposal that matches no rule is sent by anyone who may send it, with no approval record, as with an incumbent template that carries no approval workflow. A draft prepared or last revised by an agent key always needs approval from an approver role, whatever the setting. A new installation starts with the setting on and the owner as default approver, which is the first release's behavior (`PROP-001`). **Binding:** every approval that applies binds the exact revision (`PROP-001`); an edit clears all of them and the rules are evaluated again against the new revision. Only the owner and admins change the policy, and each change is in the audit log (`TEAM-004`).

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with awaiting approval, including filters, sorting, counts and totals under its visibility rules.

Before shipping, extend EDIT-012 duplication assertions for approval-required copies (409 until approval) and copies matching no rule when approval is off (the owning sales member sends immediately).

## SEND-001

A member connects Gmail or Google Workspace (OAuth `gmail.send`) or Microsoft 365 or Outlook (Graph `Mail.Send`) and sends proposals, reminders and replies as themselves. Replies thread back to the proposal. Tokens follow `SEC-001`. Without a connected mailbox, mail goes through the installation's branded sender (`EDIT-008`).

A member's own mailbox is one they sign in to at the provider and whose sending address the provider verifies: for Google, the account's verified address or a Gmail send-as alias the provider reports as verified; for Microsoft, the signed-in user's own SMTP mail address, never a sign-in name alone. It need not match the member's Platter sign-in address. Each mailbox address is bound to one member: an address that is another active member's sign-in address or is already connected by another member is refused, and only the member who connected it sends through it. Sending through it requires, at that moment, that the member is active and holds both the own-mailbox right of TEAM-001 and the right to send that message under its own clause (APPROVE-003 for proposals), and that the provider grant is current, carries the send permission and still verifies the address; a member without the sending right is refused (403, nothing sent). When only the mailbox fails, nothing is sent from it: the message goes through the installation's sender with a visible notice to the member, and the connection shows its broken state (SEC-001). The client sees the connected address as the sender. The proposal timeline and the audit log (TEAM-004) record, for every message, the member and whether their mailbox (with its address) or the installation's sender sent it, and its outcome as accepted by the provider, never as delivered (MAIL-001, SEND-002).

Client reply custody (ct, 22 October 2026, 07:25 UTC): an emailed reply is a record, never an approval, signature or state change on the proposal. Store and show the sender’s claimed From address and Resend’s receiving-server SPF/DKIM results; From is never proven client identity. Drop auto-replies and bulk mail (Auto-Submitted, Precedence and out-of-office) without any record or notification. Cap replies per invitation and tell the owner once when the cap is reached. The current cap is one, with one durable owner-only in-app notice.

## SEND-002

Each send shows queued, accepted by provider, delivered, deferred, bounced or complained from signed provider webhooks. A bounce notifies the sender and opens a follow-up (`FOLLOW-002`) to correct the address. Provider acceptance is never shown as delivery.

Today this covers the installation's signed-event providers, Resend and SendGrid. Cloudflare mail displays “Delivery events unavailable with this mail transport”; no signed HTTP event intake is claimed for it. Any transport that gains signed events, including future mailbox, recipient and SMS doors (`SEND-001`, `SEND-003`, `SEND-008`), inherits this obligation before shipping. Delivery means the provider reported recipient mail-server acceptance, never human receipt. Signed callbacks must correlate the provider message (or SendGrid's signed delivery id) and exact recipient; duplicate callbacks do not repeat work, and a terminal state cannot regress to queued, accepted or deferred.

Under today's owner-only sending policy (`APPROVE-003`), the sending owner receives a durable in-app bounce notice and a separate open address-correction follow-up. Reading the notice does not close the follow-up. Only that active owner corrects the invitation address and explicitly sends a fresh invitation, rotating the old link and verification session under `PROP-002`, without changing client identity or the frozen offer. Verification codes go to the corrected invitation address. Provider acceptance of the correction closes the follow-up; an uncertain outcome keeps it open. The owner may instead dismiss it with a logged reason. Notices and logged follow-up actions survive `PORT-002` archives; mail bodies, links, attempt history and provider receipts remain excluded under `PORT-001`.

## SEND-003

A proposal has any number of recipients with a role: signer, client-side approver, viewer or CC. A proposal created from a template starts with the template's role slots, fields and order (`SIGN-011`), and sending is refused (409) while a signer, approver or countersigner slot is unfilled. Each recipient has their own link and verification. Before sending, the sender previews the client page as each recipient (`EDIT-018`). The firm can also share by link (with verification) or embed the proposal on its site. Removing a recipient revokes their link, and withdrawing the proposal revokes every link at once (`SEND-010`). Replacing a signer on a sent proposal is `SEND-007`, and a signer delegating is `SIGN-009`.

Every recipient role and shared link extends SEND-010 revocation and its named all-recipient 410, notice and no-content assertions before shipping.

## SEND-004

A proposal expires a set number of days after it is sent (its expiry period, copied from its template or the workspace defaults under `FOLLOW-006`), or on a date the sender picks, or never when the sender removes it; the client page shows the expiry date. When the warning is on, each unsigned signer gets the `SEND-006` expiry notice the set number of days before expiry. The sender changes the expiry before and after sending. After expiry the client sees an expired page and can ask the firm to reopen it; the owner extends or reissues. An accepted agreement never expires.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with expired, including filters, sorting, counts and totals under its visibility rules.

Every capability available today conforms. The owner sets calendar days, an explicit YYYY-MM-DD date, or no expiry on a draft or sent offer. The installation time zone is UTC until set; the zone is copied at expiry configuration and first send, and an existing deadline keeps its stored zone until changed. The deadline is the start of the expiry date, with calendar-day arithmetic and daylight saving honored. An older sent offer with no retained send timestamp refuses a days-based setting (409), explains why on the owner offer, and offers an explicit date or negotiated reissue; creation time is never treated as send time. A fresh invitation keeps its first-send date and expiry; an approved negotiated revision sent under NEG-001 starts the period again. A fixed, honestly labeled automatic warning is queued once for the current unsigned signer at the start of its warning date; uncertain provider attempts are never resent blindly. Accepted agreements never expire. Verified clients request reopening; the owner extends/removes expiry on the same links or approves and sends a new negotiated revision. Requests, settings and warning facts survive PORT-002 without credentials or transport mail. TEAM-004 audits configuration, requests and warnings.

`FOLLOW-006` inherits workspace/template defaults, `SEND-006` editable expiry notices and `SIGN-004` every unsigned recipient, each extending this same named calendar, warning and reopening journey before shipping.

## SEND-005

The sender and watchers are notified when a proposal is first viewed, commented on, signed, declined, paid or fails payment, by email, Slack, Microsoft Teams, Nook or push, under per-person preferences that choose the events and channels for each person.

## SEND-006

Every send, reminder (`FOLLOW-001`), fresh invitation (`PROP-002`), revision send (`NEG-001`), signer replacement (`SEND-007`) and net-terms invoice (`PAY-008`) shows the email before it goes, with an editable subject and personal message. Admins keep shared email templates per event (send, reminder, expiry notice, invoice, completion) with variables from `EDIT-004` such as `{client.first_name}`, `{client.company}`, `{proposal.title}`, `{sender.name}` and `{proposal.expires_on}`; they set the default template per event and per proposal template, and can lock a template so members pick it but do not edit it. A variable with no value blocks the send as in `EDIT-004`. A scheduled reminder uses the template the sender chose, and the sender can edit its text before it goes. The exact subject and body sent, after filling, are kept on the proposal timeline with recipient and time and in the agreement package. The verification code email (`SIGN-001`) keeps fixed wording. Before sending, anyone who may edit or send the proposal sends a test to themselves: the filled subject, prefixed "[Test]", and body go only to the member's own sign-in address, never to a recipient, and the message's proposal link opens the `EDIT-018` preview under a member session instead of a client link. A test send needs no approval, freezes nothing, creates no revision, records no view, schedules no reminder, is never put in the agreement package, and is listed on the proposal timeline as a test send; it is limited to 10 per member per proposal per day (429).

Editable expiry notices extend SEND-004’s named unsigned-warning, exact-date and one-claim assertions before shipping.

Add an editable withdrawal notice template to SEND-010, with its exact subject/body and per-recipient assertions before shipping.

## SEND-007

When the client says someone else signs ("our COO signs, not me"), the sender replaces a recipient who has not signed on a sent proposal, with a reason. The offer, its revision and its approvals are unchanged and no re-approval is needed. The replaced recipient's link and verification session are revoked at once; the new signer gets their own link and identity check (`SIGN-001`, `SIGN-006`), the same place in the signing order (`SIGN-004`) and the message of `SEND-006`. The replacement (who, by whom, when and why) is on the timeline and in the certificate of completion (`SIGN-005`). A recipient who has signed can never be replaced, and nothing is replaced on an accepted agreement.

Replacing a recipient preserves SEND-010 revocation: withdrawal leaves replaced and current invitation links refused; extend its named assertions before shipping.

## SEND-008

A sender delivers the proposal link, reminders and completion notices by text message to a US mobile number through Twilio, alongside or instead of email. Texts go from a registered A2P 10DLC number or toll-free number, record the recipient's consent, honor STOP and HELP under carrier rules and the TCPA, respect the quiet hours of `FOLLOW-001`, and appear on the timeline with their delivery status.

SMS reminders are cancelled atomically by SEND-010 withdrawal; extend its named clock-advance and recipient-notice assertions before shipping.

## SEND-009

A template can be published as a reusable public link or site embed, like PandaDoc Forms: any visitor enters their name, email and company and the template's form fields (`SIGN-007`), chooses optional items, verifies their mailbox (`SIGN-001`) and signs (`SIGN-003`) as the template role the firm marks as the public signer, while the template's other roles, such as a pre-assigned countersigner, keep their assignment (`SIGN-011`); each submission creates its own proposal and agreement from the template revision that was approved for publishing under `APPROVE-003`. The visitor cannot change prices or terms. The firm sets a submission cap and an expiry for the link itself; each submission's proposal takes the template's reminder schedule and expiry period, counted from the submission (`FOLLOW-006`). The firm can require its countersignature (`SIGN-004`) before an agreement completes, and can disable the link at once. Submissions reach the CRM (`CRM-001` to `CRM-004`), follow-up (`FOLLOW-002`), payment (`PAY-002`) and reports like any proposal.

## SEND-010

Anyone who may send a proposal under `APPROVE-003` withdraws it, with a reason, when it was sent in error or the deal is off. Withdrawal revokes every recipient's link and verification session at once (signers, approvers, viewers and CC, and links shared under `SEND-003`), cancels scheduled reminders by email and text (`FOLLOW-001`, `SEND-008`), voids its unpaid payment links (`PAY-001`) and closes its follow-ups (`FOLLOW-002`). A recipient opening a revoked link sees a withdrawn page with the firm's contact details and none of the proposal. Each recipient gets a notice using the `SEND-006` withdrawal template unless the sender turns the notice off. A proposal one signer has already signed can still be withdrawn before the agreement completes; that signer is told, and their signature stays in history marked void. A completed agreement is never withdrawn (409); it ends under its own terms. A withdrawn proposal is read-only, and the firm sends it again only as a new revision (`NEG-001`) under the approval policy, with new links. The withdrawal (who, when and why) is on the timeline and in the audit log (`TEAM-004`), and marking a proposal lost (`FOLLOW-005`) withdraws it the same way.

Current capability boundary (ct, 20 October 2026): DONE covers the current single invited mailbox and owner-only sending policy. The owner withdraws with a non-empty reason, with notice on unless explicitly turned off. The withdrawn offer is read-only; old invitation, verification, PDF and attachment doors return a proposal-free 410 page with the withdrawing firm's contact address. Open client questions and bounce follow-ups close, expiry warnings stop, and the actor, time and reason remain in proposal history and the audit log. A new NEG-001 revision requires approval before reissue; old withdrawn links remain refused. SEND-003 and SEND-007 inherit revocation of every current or replaced recipient and sharing link; FOLLOW-001 and SEND-008 inherit cancellation of email/text reminders; PAY-001 inherits voiding unpaid payment links; FOLLOW-002 inherits follow-up closure; SIGN-004 inherits notification and retained void signatures after partial signing; FOLLOW-005 inherits the same withdrawal with notice off by default for a lost outcome; SEND-006 inherits the editable withdrawal notice template. Each capability must extend the named SEND-010 public-door assertions before it ships.

## TRACK-001

Platter records each verified or unverified view of a client link with time, recipient, approximate location and device class, and alerts the sender on first open and on a return visit after a quiet period the owner sets (30 minutes by default). The proposal shows a view timeline.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with viewed, including filters, sorting, counts and totals under its visibility rules.

The engagement timeline inherits EDIT-014’s successful PDF-download events and identical named assertions before shipping.

FOLLOW-002 inherits real viewed/unopened queue reasons and the original seven-proposal A, C, D, F, E, B, G ordering before tracking ships; extend its named public-door journey.

Tracking and alerts are off until the owner explicitly opts in; only the owner reads recipient, verification, device and coarse location detail. Current senders receive generic live in-app notices after a fresh access check. Retention defaults to 90 days and the owner can choose 1 through 365 days. Explicit per-proposal erasure and retention honor holds. Only trusted edge city, region and country are stored, never request addresses; measurement pages suppress external embeds. Exports retain business history but exclude tracking authority, and restores require fresh consent. Erasure invalidates older archive checkpoints.

## TRACK-002

For each view, Platter measures time spent on each section and on pricing, which packages and items were toggled, and which attachments were opened, and summarizes engagement per recipient.

FOLLOW-002 inherits section-engagement queue reasons and its original seven-proposal ordering before shipping; extend its named journey.

## TRACK-003

When a link is opened by someone other than its recipient (a new device and network after a forward), Platter asks the viewer to identify themselves and verify their mailbox. The sender sees a new stakeholder with name and email, and can add them as a recipient.

## TRACK-004

The client page discloses that views are measured. Platter uses no third-party trackers, stores IP addresses only as truncated locations, and keeps engagement data for a retention period the owner sets. Engagement data is included in erasure (`PRIV-001`) and in exports.

The current owner-consent, private-detail and trusted-edge rules are TRACK-001 under RL-22. Retention defaults to 90 days; the owner selects 1 through 365 days. Explicit per-proposal erasure and retention honor holds. Measurement pages suppress external embeds. Exports retain business history but exclude tracking authority, restores require fresh consent, and erasure invalidates older archive checkpoints.

## FOLLOW-001

Each proposal has a reminder schedule: on or off, days after sending (for example 2, 5 and 9), days before expiry (for example 3) and a cap. It is copied from the proposal's template or the workspace defaults when the proposal is created (`FOLLOW-006`), and the sender changes it before and after sending. Scheduled reminders go to each unsigned recipient in the recipient's time zone outside quiet hours (8 pm to 8 am by default; the owner sets them). A reminder due inside quiet hours waits until they end. Reminders stop on acceptance, decline, expiry or the recipient's opt-out, and never exceed the cap the owner sets. Each reminder carries the subject and message of `SEND-006`, and every reminder is on the timeline. Whether scheduled reminders are on or off, anyone who may send the proposal under `APPROVE-003` sends a reminder by hand at any time to any unsigned recipient, with the editable `SEND-006` reminder message; a manual email reminder goes at once, a manual text reminder waits for quiet hours to end (`SEND-008`), each is on the timeline, manual reminders do not count toward the cap, and each recipient gets at most one manual reminder per calendar day in their time zone (a second is refused, 429).

SEND-010 withdrawal cancels all scheduled email and text reminders; extend its named clock-advance assertions before shipping.

## FOLLOW-002

Every open proposal has a sales owner, a next action and a due date. Each sales owner's queue, and a manager's view of the team, lists follow-ups in one stated order. First come overdue items (due before today in the owner's time zone), oldest due date first; then items due today; then upcoming items by due date. Within the same due date, the reason ranks: bounced email (`SEND-002`), then a client question waiting (`FOLLOW-004`), then a failed or overdue payment (`PAY-005`, `PAY-008`), then expiring within 3 days (`SEND-004`), then viewed but not signed (`TRACK-001`, `TRACK-002`), then unopened. Ties within one reason sort by proposal value (one-off total plus first-year recurring value), highest first, then by earliest sent time, then by proposal number, so the order is fully determined. A follow-up stays open until the owner completes it with a logged action, the client acts, or it is dismissed with a reason; a notification alone never closes it.

This capability extends the `REPORT-001` dashboard and its named public-door fixture with due follow-ups, including filters, sorting, counts and totals under its visibility rules.

SEND-010 withdrawal closes every open follow-up; extend its named queue assertions before shipping.

*Acceptance (inherited by TRACK-001 and TRACK-002):* With the clock at 10 March, seed seven proposals for one owner: A $8,000 viewed, due 9 March; B $40,000 unopened, due 10 March; C $5,000 bounced, due 10 March; D $12,000 question waiting, due 10 March; E $20,000 viewed, due 10 March; F $30,000 viewed, due 10 March; G $9,000 unopened, due 12 March. The queue reads exactly A, C, D, F, E, B, G. Completing C with a logged call removes it; B's follow-up stays open after its notification is sent; dismissing E without a reason is refused (400).

Every capability available today conforms. Sales actions use REPORT-001's recorded, stable sales owner, retaining its honest "Not recorded" legacy label without inferring an identity. The owner sees and filters the queue until TEAM-001 adds sales and manager team scopes. Each open draft, approved or sent proposal starts with its workflow next action and a due date equal to its creation day in the installation time zone; an explicit schedule saves a calendar date, reopens the sales action and retains the action history. A new revision starts a new action. Acceptance and SEND-010 withdrawal close the sales action. Completing or dismissing it retains who, when and the logged action or required reason; notification alone leaves it open. General completion never resolves SEND-002 corrections or FOLLOW-004 question threads: the sending owner retains correction authority, and unanswered questions remain in their question inbox until answered.

Until personal zones exist, due dates and "today" use the installation's IANA time zone. Until tracking exists, every engagement label reads "Engagement unavailable" and all such proposals share one reason rank, without inferred unopened/viewed states. Current reasons are bounce, waiting question, future expiry deadlines from today through three calendar days ahead inclusive, then unavailable engagement. Equal-date/reason ties use the highest current one-off option in integer cents (face amounts, no exchange conversion), then earliest recorded first-send time (missing last), then stable proposal id until proposal numbers exist. Totals stay separate by currency. TEAM-001 inherits personal zones, sales and manager team visibility; TRACK-001/TRACK-002 inherit viewed/unopened reasons and the original seven-proposal ordering above; PAY-005/PAY-008 inherit failed/overdue payment reasons and closure; FOLLOW-005 inherits declined/lost closure; PRICE-003 inherits first-year recurring valuation; EDIT-016 inherits proposal-number ties when numbering ships. Each extends this named journey before shipping. REPORT-001 now includes inclusive due-today/overdue filtering, due-date sorting, counts, totals and saved-report/CSV output. PORT-002 retains schedules, resolutions and action history without mail or invitation authority.

*Acceptance (current capabilities):* With the clock at 10 March, create the same seven amounts and due dates above, using a real bounce business record for C and a verified question for D. With engagement unavailable the exact order is A, C, D, B, F, E, G; the original viewed/unopened order is inherited above. Complete C with a logged call and retain its separate bounce correction; notify B and retain its open action; refuse a reason-free dismissal of E (400). Assert default actions, owner filtering, exact totals, expiry precedence, time-zone dates, deterministic sent-time/id ties, explicit reopening, acceptance and withdrawal closure, member/agent refusal, and logged actor/time/action custody. Extend REPORT-001's 30-proposal fixture with due filters, next action, sorting, counts and totals; exercise real screens at 1440/390 and restore open/completed actions through the public CLI.

## FOLLOW-003

The sender (the proposal's sales owner, and its watchers under `SEND-005`) is told before a sent, unaccepted proposal expires and before an accepted agreement's term ends or renews. These are notices to the firm, separate from `SEND-013`'s expiry warning to unsigned signers, and each has its own setting: the sender's expiry notice is on by default 3 days before expiry, the renewal notice is on by default 30 days before the term ends, and the signer warning is on by default 1 day before expiry (`FOLLOW-006`). The owner or an admin changes each lead time or turns either notice off for the workspace (`TEAM-001`), and the sender changes them per proposal like the other delivery settings of `FOLLOW-006`. Each notice goes by the sender's channels under `SEND-005` and opens a follow-up (`FOLLOW-002`) due on the notice day; a renewal notice offers `RENEW-002`. A proposal accepted, declined or withdrawn before the notice day gets no expiry notice, and a changed expiry date moves the notice with it.

## FOLLOW-004

A client asks a question or comments on any section from the proposal page. The firm answers in the same thread, by email reply or from the app; the client is notified. Open questions show on the proposal and in the queue until answered, and the thread is kept with the agreement.

Every capability available today conforms. The mailbox-verified invited client comments on scope, pricing or terms on the exact current sent revision, including while acceptance is expired. The active owner answers from the app, and answers queue a notification to that question's verified client mailbox. Questions and answers retain their revision and remain in the agreement and PORT-002 archive. Until FOLLOW-002 supplies the follow-up queue, the owner-only open-question queue is on Proposals; an answer removes its question. Agents cannot answer. EDIT-001/EDIT-002 inherit added sections, TEAM-001 inherits scoped person roles and FOLLOW-002 inherits the question queue before shipping, each extending this same named journey.

Email replies use a configured Resend receiving domain and signed email.received webhook, followed by fetching the real received message from Resend. The notice goes only to the active owner mailbox and carries a per-thread, one-use opaque Reply-To capability, valid for seven days. Acceptance requires the provider signature, the capability and the exact current active-owner From mailbox together. Capabilities are hashed at rest, sealed in queued transport, excluded from archives and never returned in app state. Expired, replayed, rotated and wrong-owner replies are refused. Re-noticing rotates the capability, and an app answer spends outstanding capabilities. The full plain-text reply, including quoted text, becomes the answer; a body containing a reply capability is refused. Attachments are refused. Other mail transports and unconfigured installations honestly instruct the owner to answer in the app; SEND-001 inherits additional authenticated inbound providers before shipping.

## FOLLOW-005

A client can decline with a reason. The firm marks a proposal won or lost with a reason from its own list, and can reopen a lost one as a new revision. A decline stops signing and payment on every recipient link, and marking a proposal lost withdraws it as `SEND-010` does, with the notice off by default. Outcomes sync to the CRM (`CRM-001` to `CRM-003`) and feed reporting (`REPORT-002`).

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with declined, including filters, sorting, counts and totals under its visibility rules.

Marking lost invokes SEND-010 withdrawal with recipient notice off by default; extend its named revocation and notice-off assertions before shipping.

Before shipping, extend FOLLOW-002 with declined/lost closure and the named queue assertions, retaining SEND-010 revocation semantics.

## FOLLOW-006

The owner or an admin sets the workspace defaults (the workspace settings right of `TEAM-001`): a reminder schedule (on or off, days after sending, days before expiry and the cap of `FOLLOW-001`) and an expiry period in days counted from sending, with an optional warning to unsigned signers a set number of days before expiry (`SEND-004`). A fresh installation starts with reminders on at 2, 5 and 9 days after sending and 3 days before expiry with a cap of 3, and an expiry period of 60 days with the warning on 1 day before; a workspace upgraded from the first release gets the same defaults for proposals created after the upgrade. A template (`EDIT-002`) can set its own reminder schedule, expiry period and warning, each overriding the workspace default, or leave either to follow the workspace. Every new proposal copies these settings when it is created: from its template where the template sets them, otherwise from the workspace. That holds whether a member starts it from a template or from blank (`EDIT-002`), creates it in bulk (`RENEW-001`), a visitor submits a public link (`SEND-009`, where the expiry counts from the submission) or it is drafted (`AI-001`); a duplicate (`EDIT-012`) takes the source proposal's settings. Because the settings are copied, a later change to the template or to the workspace defaults never alters a proposal already created. The send screen shows the reminder dates and expiry date the proposal will get, and the sender changes either before sending; anyone who may send the proposal under `APPROVE-003` changes them on a sent proposal, and a changed expiry keeps the reopen rules of `SEND-004`. These are delivery settings, not offer terms: changing them creates no revision and needs no new approval. Every change, with who made it, is on the timeline.

Before shipping, workspace and template expiry defaults extend SEND-004’s named calendar, warning and reopening assertions.

Before shipping, extend EDIT-012 duplication assertions to copy every source payment method, schedule, reminder and expiry setting without copying lifecycle state.

## FOLLOW-007

Outcome synchronization beyond FOLLOW-005’s one exact revision, destination and stage field map uses server-computed classes and the company’s policy within the sponsor’s current role and grant. External synchronization carries external; a binding outcome also carries commitment.

## NEG-001

After sending, the firm can make a new revision in answer to the client. The revision follows the approval rules and policy again (`APPROVE-001`, `APPROVE-003`); sending it retires the earlier client link, and the client sees what changed since the version they saw. Acceptance always binds the exact current sent revision, and every earlier version stays in history. An unsent negotiation is stored separately from the live offer: the old invitation remains usable until the approved replacement is sent. If the client accepts the live offer first, that agreement wins and the unsent negotiation cannot be sent; its saved revisions remain in history. Editing the negotiated draft creates another revision and clears its approval. The current default approval policy remains owner approval for every negotiated revision; `APPROVE-001` and `APPROVE-003` inherit this path when their rule and role capabilities ship.

## NEG-002

Where the firm allows it, a client suggests edits to text sections (not prices) as tracked suggestions. The firm accepts or rejects each one; accepted suggestions form a new revision under `NEG-001`. Contract lifecycle redlining of master agreements belongs to Locket (see Neighboring products). Scope and terms are the text sections currently supported; a person enables each section separately on the exact sent revision, off by default. The invited client verifies their mailbox before submitting an original-text/replacement pair; the original must occur exactly once. Decisions retain the source revision, client, time, original and replacement, reviewer, decision and resulting revision. Owner/member people review; agents cannot enable or decide. Accepting an edit creates an unapproved negotiated revision without changing the live offer, and later accepted edits clear approval again. TEAM-001 inherits scoped person authority; EDIT-001 and EDIT-002 inherit this opt-in tracked-suggestion behavior for their new text sections before shipping.

## SIGN-003

Signing meets the federal ESIGN Act and state UETA: each signer is shown the electronic records disclosure and consents before signing, can withdraw consent and ask for paper, and adopts a typed, drawn or uploaded signature. Signature, initials and date fields can be placed anywhere, each assigned to one signer or, in a template, one recipient role (`SIGN-011`), and a signer sees and fills only their own fields. Intent to sign is explicit, and the signed record is retained and reproducible.

## SIGN-004

A proposal can require several signers on the client side and a countersignature from the firm, in a set order or in parallel groups. A template sets the order and groups for its roles, and they are copied into each proposal created from it (`SIGN-011`); changing the template later never changes a proposal's order. Each signer verifies separately; the agreement completes when the last required signature lands, and each party is told. A signer can be replaced by the sender (`SEND-007`) or, where allowed, delegate (`SIGN-009`) without changing the order.

Before shipping, multiple signers extend SEND-004’s named warning journey so every unsigned signer receives the warning and each signed signer receives none.

SEND-010 withdrawal before completion notifies every signer, revokes remaining links and retains prior signatures marked void; extend its named partial-signature assertions before shipping.

## SIGN-005

On completion, Platter produces the signed agreement PDF and a certificate of completion listing each signer, verification method, consent, IP-derived location, user agent, timestamps and the SHA-256 hash of the document. Both parties can download them, they are emailed to each party, and the PDF is archived (`AUTO-002`).

## SIGN-006

Per proposal, the firm chooses the identity check for each signer: mailbox code (`SIGN-001`, the default), link only, a text-message code to a US mobile number through Twilio, or government ID verification through Stripe Identity or Persona. Link only matches the incumbents' default for low-risk documents: possession of the personal link delivered to that recipient's mailbox is the check, it must be chosen explicitly per proposal or template, and a link opened on a new device and network after a forward (`TRACK-003`) still asks for the mailbox code before it can sign. The method used is recorded in the certificate.

## SIGN-007

The firm places fields the client fills at acceptance, each assigned to one recipient or template role (`SIGN-011`) so only that person fills it: PO number, billing contact, billing and service address, project start date, checkboxes, custom text and file uploads, such as a purchase order PDF or a certificate of insurance (PDF, PNG or JPEG up to 25 MB each). Required fields block signing; values freeze into the agreement and flow to invoices and the CRM, and uploaded files are kept byte-identical in the agreement package (`SIGN-005`) and listed on the certificate of completion.

## SIGN-008

When a client signs through their own procurement or signing system, the owner uploads the signed copy, records who signed and when, and attests to it. The agreement is marked accepted by upload, distinct from Platter e-signature, and payments and handoff proceed as for any acceptance.

Until `TEAM-001` adds the admin role, only the owner records an acceptance by upload, and only for a sent proposal's current sent, approved revision; the owner chooses the one offered option the client signed, and its total and integer-cent deposit are calculated and frozen as in `SIGN-002`. The signed date is the calendar date written on the paper (`YYYY-MM-DD`, no time zone), never later than the current date in UTC+14; the acceptance time is when the owner recorded it. The owner's attestation is stored as the acceptance's consent text. Every screen labels the agreement "Accepted by upload: signed outside Platter. Platter did not verify this signature." and never shows the client's mailbox as the signer's; Platter e-signatures show their own method. The uploaded file, at most 10 MB, is kept immutably with the agreement in any format the owner uploads (no format or signature check is claimed) and is only ever served as a download (`Content-Disposition: attachment`, `nosniff`); owners and members download it, agents never do, and the client invitation page shows the accepted-by-upload record without serving the file. Recording discards a pending `NEG-001` draft as an e-signed acceptance does, a later client acceptance attempt returns the recorded acceptance, and a recorded acceptance is never replaced. Today the deposit request is the owner's deposit invoice export, which proceeds exactly as for any acceptance; `PAY-001`, `PAY-002`, `PAY-008`, `HAND-001` and `HAND-002` treat an acceptance by upload as an acceptance before they ship.

## SIGN-009

Where the firm turns delegation on for a proposal or template, a signer who is not the right person delegates from their own link to a named person with email (and a mobile number when that signer's check is SMS). The delegate must pass the identity check set for that signer (`SIGN-006`) before seeing the agreement; the delegator's link is revoked; the sender is notified and can undo the delegation before the delegate signs. Delegation never changes the offer, revision, approvals or signing order, is refused once the delegator has signed or when delegation is off, and is recorded in the certificate of completion (`SIGN-005`).

## SIGN-010

A sender hosts a signing session on their own signed-in phone, tablet or computer for clients who are present, as incumbents offer for walk-in clients. The sender starts the session from the proposal and hands the device over; each signer in signing order (`SIGN-004`) confirms their name, reads the electronic records disclosure and consents (`SIGN-003`), fills the fields assigned to them (`SIGN-007`) and signs. Between signers the device returns to a hand-back screen, and the sender's own pages stay locked until the sender signs in again. The firm can require a code sent to each signer's mobile or mailbox in the session (`SIGN-006`). The certificate of completion (`SIGN-005`) records each signature as "in person, hosted by" the sender, with time and device, and each signer gets the completed copy by email.

## SIGN-011

A template (`EDIT-002`) holds recipient roles, each with a name the firm chooses (such as Client, Client CFO or Countersigner) and a kind: signer, client-side approver, viewer or CC (`SEND-003`), or firm countersigner (`SIGN-004`). Every signature, initials, date and form field (`SIGN-003`, `SIGN-007`) and every signature block (`EDIT-001`) is assigned to exactly one role, and a template with a signature, initials, date or required field assigned to no role cannot be published (400). The template sets the signing order, including parallel groups (`SIGN-004`), and the identity check for each role (`SIGN-006`). A role can be pre-assigned to a member, such as the owner as countersigner, or to a fixed contact, who is then added to every proposal created from the template. Every proposal created from a template shows each role as a slot, whether a member starts it (`EDIT-002`), duplicates it (`EDIT-012`), creates it in bulk (`RENEW-001`), a visitor submits a public link (`SEND-009`) or it is drafted (`AI-001`). The member fills each slot from the client's contacts or the linked CRM deal's contacts (`EDIT-004`, `CRM-001` to `CRM-004`), with a deal contact whose CRM role or label matches the role name offered first, and the role's fields and place in the order arrive assigned to whoever fills the slot. Sending is refused (409), naming the role, while any signer, approver or countersigner role is unfilled. The proposal copies the template's roles, fields and order when it is created, so a later change to the template never alters a proposal already created; on one proposal the member may add or remove roles and change the order before sending. Template roles read from PandaDoc's API at move-in become these roles with their order, field assignments and pre-assigned recipients (`MIG-001`).

Before shipping, extend EDIT-012 duplication assertions to preserve all role slots and only template-preassigned members, clearing all other recipients.

## PAY-001

The owner or an admin (`TEAM-001`) connects the firm's own Stripe account. The client pays inside the proposal by card, Apple Pay, Google Pay or ACH bank debit, with bank verification through Stripe Financial Connections or micro-deposits. The ACH debit authorization text is shown and stored with the agreement. Card and bank numbers never touch Platter. The methods a proposal offers are copied when it is created from its template (`EDIT-002`), or from the workspace's default methods when the template sets none, and the sender changes them per proposal before sending; the owner or an admin sets the workspace defaults and whether to pass through a fee where allowed.

SEND-010 withdrawal voids all unpaid payment links; extend its named refused-payment-link assertions before shipping.

## PAY-002

Accept and pay is one flow: after signing, the client pays the deposit or first payment in the same session. The firm chooses whether acceptance completes only once the payment succeeds or whether signing completes the agreement with the payment due. Agreement and payment states stay separate, so a failed payment never undoes a signature.

## PAY-003

The accepted schedule (`PRICE-007`) is executed: milestones are charged or invoiced on their date or when the owner marks the event done, each amount's invoice being created on that issue day and never earlier (`ACCT-007`), and recurring fees are charged on their interval against the payment method the client authorized, or sent as net-terms invoices with a pay link and overdue tracking (`PAY-008`). The client can update the payment method from a link.

## PAY-004

Each payment shows scheduled, processing, succeeded, failed, refunded, partially refunded or disputed from signed Stripe webhooks, processed once per event ID. ACH payments stay processing until Stripe reports success, typically up to four business days. A payment is paid only on provider evidence, and the owner sees amounts due, paid and overdue per agreement.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with paid, including filters, sorting, counts and totals under its visibility rules.

## PAY-005

When a payment fails, the client and firm are told with the reason; Platter retries on an owner-set schedule only where the client's authorization allows it, and stops a retry once the amount is paid by any route. Each attempt is on the timeline.

Before shipping, extend FOLLOW-002 with failed-payment reasons, prescribed reason precedence and client-payment closure in its named queue journey.

## PAY-006

The owner, an admin or a billing user (`TEAM-001`) refunds a payment in full or in part with a reason, and the refund syncs to accounting. When a client disputes a card payment, Platter shows the dispute, its deadline and an evidence pack (signed agreement, certificate, views and payment authorization) that the owner, an admin or a billing user submits to Stripe.

A dispute response has four separately recorded steps, and Platter never reports a later step from an earlier one. Preparation: Platter builds the packet only from its own retained records for the verified deposit: the exact accepted snapshot and the acceptance as recorded (mailbox-code verified under `SIGN-001` and `SIGN-002`, or an owner-attested upload under `SIGN-008`, stated as such), the verified charge and amount, and the person's response note. The packet itself names every target artifact Platter does not yet hold (the `SIGN-005` certificate, `TRACK-001` views, `PAY-001` and `PAY-002` payment authorization) and every retained file it does not include; nothing is inferred, upgraded or fabricated. Authorization: the owner, an admin or a billing user reviews that exact packet and explicitly authorizes sending it; the authorization names the dispute, its amount and provider deadline and the packet's SHA-256, and is in the audit log (`TEAM-004`); other roles are refused (403) with no provider call. An agent submission carries external and commitment and company policy decides within the sponsor’s financial role and grant. Submission: only an authorized packet is sent, byte for byte and once; the request is claimed before any provider call, uses provider idempotency and is never repeated after an uncertain outcome (`MAIL-001`); nothing is submitted automatically, every provider evidence update states whether it submits, and a passed deadline or changed disputed amount refuses it. Receipt: Submitted is shown only when Stripe confirms it holds the response (the dispute is under review); an uncertain outcome stays held for reconciliation against Stripe; won or lost comes only from Stripe's dispute state (`PAY-004`). Submitted bytes and hash stay unchanged and travel in archives without credentials (`PORT-002`).

## PAY-007

US clients often pay by check, wire or ACH credit. Invoices show remittance details, and the owner, an admin or a billing user (`TEAM-001`) records an offline payment with method, reference and date. It reconciles against the schedule and accounting like any other payment.

## PAY-008

When a scheduled amount is on net terms (net 15, net 30 or a custom number of days), Platter issues an invoice when its date arrives or its milestone is marked done, with its due date counted from that issue day and never created earlier (`ACCT-007`): an email to the billing contact (`SIGN-007`) with the invoice number, amount, due date, a PDF invoice and a pay link, using the invoice template of `SEND-006`. The pay link opens a page where the client pays by card or ACH (`PAY-001`, `PAY-009`) or reads remittance details for check and wire (`PAY-007`). An unpaid invoice is due through its due date and turns overdue the next day in the firm's time zone: it counts in the agreement's overdue total (`PAY-004`), opens a follow-up in the owner's queue (`FOLLOW-002`) and sends overdue reminders on the owner's schedule. A payment from the link is processing until the provider reports success and paid only on that evidence. When the accounting system is the invoice authority (`ACCT-004`), the invoice sent is the one in QuickBooks Online, Xero or Pantry, never a second one.

Before shipping, extend FOLLOW-002 with overdue-payment reasons, prescribed reason precedence and paid-event closure in its named queue journey.

## PAY-009

A firm that does not take payment through Stripe connects its own PayPal, Square or Authorize.net account instead, and the client pays the deposit, milestones and net-terms invoices inside the proposal by card, or by PayPal or Venmo where PayPal is connected. Payment states, retries, refunds and accounting sync work as for Stripe (`PAY-002` to `PAY-008`, `ACCT-001` to `ACCT-006`), with each processor's signed webhooks or notifications processed once per event. Where a processor cannot charge a stored method for a schedule, Platter sends a pay link for each scheduled amount and says so when the firm connects it. Card numbers never touch Platter.

## ACCT-001

The owner or an admin connects QuickBooks Online. On acceptance, Platter creates or matches the customer and creates the deposit invoice; each milestone and recurring invoice is created on its issue day under `ACCT-007`, never at acceptance. Every invoice carries items, tax codes and the income accounts set in the catalog, and Platter records Stripe and offline payments, refunds and fees against them, with Stripe payouts and fees posted through a clearing account (`ACCT-006`). Invoices paid in QuickBooks Online, including through QuickBooks Payments, are read back as paid.

## ACCT-002

The owner or an admin connects a USD Xero organization. Platter creates or matches the contact, raises the deposit invoice at acceptance and each milestone and recurring invoice on its issue day (`ACCT-007`), with items, tax rates and accounts, and records payments and refunds, with paid status read back from Xero.

## ACCT-003

For firms on [Pantry](https://github.com/just-every/run-pantry), Platter posts customers, invoices and payments the same way as `ACCT-001`, each invoice on its `ACCT-007` issue day, and reads back paid status.

## ACCT-004

The owner chooses one invoice authority per installation: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry. Each scheduled amount maps to exactly one invoice and one external ID, created on its issue day under `ACCT-007`, so retries, reconnects and replays never create a second and none is created early. A reconciliation view lists each scheduled amount with its invoice, payments, provider events and accounting status, and flags mismatches.

## ACCT-005

Without a live connection, the owner exports invoices, payments and schedules as QuickBooks Online and Xero import files in USD, retained once per invoice as in `INV-001`.

## ACCT-006

Stripe pays out net of fees, so a firm's bank deposit never equals its invoices. Platter posts each Stripe payment gross against its invoice into a clearing account the owner picks (such as "Stripe clearing" in QuickBooks Online or Xero), posts Stripe's processing fees to the owner's fee expense account, and records each payout as one transfer from clearing to the bank account for the payout's net amount, so the bank feed matches one deposit per payout and the clearing account returns to zero. Refunds, dispute amounts and dispute fees post through the same clearing account. The same posting applies to the processors of `PAY-009`.

## ACCT-007

One timing rule holds for every invoice authority (`ACCT-004`: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry). The deposit invoice is created at acceptance. A milestone invoice is created on its issue day: its date for a dated milestone, or the day it is marked done for an event milestone. Each recurring amount's invoice is created on its billing date, one per period. A net-terms invoice's due date is counted from its issue day (`PAY-008`), and a charged amount's invoice is created when the charge is made and marked paid only on the provider's success evidence (`PAY-003`). No invoice is created ahead of its issue day, so the accounting system's open invoices and A/R aging hold only amounts already issued, and a milestone that slips moves its issue day with nothing to void. Future amounts show in the agreement's schedule (`PAY-004`) as scheduled, not invoiced. The invoice emailed to the client under `PAY-008` is the authority's own invoice, never a second one. `ACCT-001`, `ACCT-002`, `ACCT-003` and `PAY-003` follow this rule.

## CRM-001

The owner or an admin connects HubSpot. A member starts a proposal from a deal (or from a HubSpot CRM card), with company, contacts, deal fields and line items pulled in. Platter writes back status, amount, line items, the proposal link and timeline events (sent, viewed, signed, paid), and moves the deal stage according to rules the admin sets.

## CRM-002

The owner or an admin connects Salesforce. Proposals start from an opportunity with account, contacts and price-book products, and Platter writes back opportunity line items, amount, stage, the proposal link and activity, under the same rules as `CRM-001`.

## CRM-003

For firms on [Orbit](https://github.com/just-every/run-orbit), Platter syncs deals, contacts and line items both ways as in `CRM-001`.

## CRM-004

Platter syncs deals, persons and products with Pipedrive and Zoho CRM as in `CRM-001`.

## AUTO-001

Admins set rules on proposal events (sent, viewed, commented, signed, paid, declined, expired): update the CRM, archive documents, create invoices, notify a channel, create a delivery project or start a follow-up. Each run is logged with its outcome and can be retried by hand; a failed step is visible and never silently dropped.

## AUTO-002

Signed PDFs, certificates and attachments are filed to Google Drive, Microsoft OneDrive or SharePoint, Box or [Chest](https://github.com/just-every/run-chest) in a folder per client, named by a pattern the admin sets.

## AUTO-003

Proposal events, approvals and follow-ups post to Slack, Microsoft Teams or [Nook](https://github.com/just-every/run-nook) channels and direct messages, with links back and approval actions where `APPROVE-002` allows.

## AUTO-004

*Cites:* PORT-002, PRICE-006, SEC-001.

A documented REST API creates proposals from templates, fills variables, reads status, analytics and payments, and lists agreements, under scoped API keys. Its documentation is an OpenAPI description served at a public route and rendered as a reference page, listing every public route with its scopes and every webhook event with its payload schema and an example. Signed webhooks deliver every lifecycle event, with retries and a delivery log.

## AUTO-005

Published Zapier and Make apps and a [Crank](https://github.com/just-every/run-crank) connector expose Platter's triggers (proposal sent, viewed, signed, paid) and actions (create proposal from template, add client).

## HAND-001

On acceptance, Platter creates a project in Asana, Trello, monday.com, ClickUp, Jira or [Vector](https://github.com/just-every/run-vector) from the accepted scope: one task or section per accepted line item, with dates from the schedule and the agreement linked. The handoff records the external project ID and never runs twice.

## HAND-002

For firms on [Gauge](https://github.com/just-every/run-gauge) or Harvest with Forecast, the accepted scope becomes a project with budget, roles, rates, milestones and billing schedule, so delivery tracks against what was sold. Gauge's actuals return to Platter for `AGENT-002` and `AGENT-006`.

## RENEW-001

A member creates proposals for a list of clients (a CSV, a CRM list or every client with an agreement ending this quarter) from one template, with per-client variables and prices and the template's role slots (`SIGN-012`) filled per client from CSV columns or CRM contacts; a client whose signer role stays unfilled is held as an exception like a missing variable. Each proposal takes the template's reminder schedule and expiry period, or the workspace defaults where the template sets none (`FOLLOW-006`). The owner reviews a sample and the list of exceptions, approves the batch, and Platter sends at a set pace with one result per client.

## RENEW-002

Before an agreement's term ends, Platter prepares a renewal from it with the same scope, an optional price increase the owner sets (percentage or amount), and the notice period stated in the agreement. It follows the `APPROVE-003` approval policy as any revision does. Evergreen agreements show their renewal and cancellation terms to the client before signing.

## REPORT-001

A dashboard shows proposals by status (draft, awaiting approval, sent, viewed, accepted, paid, declined, expired) with value, owner, client, age and next action, filterable and sortable by each. This obligation covers every current workflow state (draft, approved, sent, accepted and withdrawn); `APPROVE-001` and `APPROVE-003` inherit awaiting approval, `TRACK-001` viewed, `PAY-004` paid, `FOLLOW-005` declined and `SEND-004` expired before those capabilities ship, with the same named fixture proof. The pipeline now uses TEAM-001 proposal visibility: owner/admin all, manager and viewer team scope, sales own/collaborator scope; content editor and billing pipeline access is refused until their content and revenue reports exist. A new proposal records its preparing person as its stable sales owner; an agent draft records the key owner. Later revisions never transfer ownership. Legacy rows whose sales owner was not recorded stay labelled "Not recorded", with no inference from a preparer string. Value is the highest offered option before acceptance and the exact selected total afterwards, in integer cents; currencies are totalled separately and value sorting groups by currency before amount, with no conversion. Age is the number of completed 24-hour days since creation. Next actions are approve revision, send approved offer, await client decision, export deposit invoice, deposit invoice exported, or prepare a new revision for a withdrawn offer, according to the current recorded state; `FOLLOW-002` inherits due follow-ups. Numeric filters include both bounds; equal sort keys use title then proposal id. Every filter applies before counts and totals.

## REPORT-002

Reports show win rate, time to sign, time to pay, average deal value and lost reasons by owner, template, service, client segment and period.

## REPORT-003

Reports show which templates, library items, packages and optional items appear in won and lost proposals, how long clients read them (`TRACK-002`), and which packages clients choose.

## REPORT-004

Reports show signed value, one-off and recurring (MRR and first-year value), invoiced, collected and overdue amounts by period and owner, reconciled with payments and accounting (`ACCT-004`).

## REPORT-005

Every report exports CSV with exactly its screen-filtered and sorted rows (title, client, owner, status, next action, currency, decimal value from integer cents and age in completed days), followed by one total row per currency. This covers the pipeline and its recorded-revenue view; new win-rate, content and revenue reports inherit it. Export authority follows TEAM-001. Scheduled delivery of this CSV is REPORT-006.

## REPORT-006

A schedule saves the screen’s filters and sort and runs daily, or weekly on a chosen weekday, at a whole hour in the installation’s IANA time zone (UTC until set). It follows daylight saving changes, taking the first occurrence of a repeated hour and the first instant after a skipped hour. Checks every 15 minutes run it at the first check at or after its time. The owner or admin names one to ten active installation people; this is an explicit share of the figures, and an inactive recipient is skipped with a visible run result. Overlapping checks claim one run; downtime recovery runs a missed occurrence once. The email repeats the screen’s count, per-currency totals and rows in its money format as of the run time, then the REPORT-005 CSV. Per-recipient outcomes are local capture, queued, provider acceptance or uncertainty without resend; provider acceptance is not delivery. Schedules travel with business records; report mail stays local.

## TEAM-001

Every member has one role: owner, admin, manager, sales, content editor, viewer or billing. Members belong to one or more teams, and a manager manages the teams they are in. In the table, "Team" means proposals whose sales owner is in one of the person's teams, plus proposals whose sales owner they are; "Own" means proposals whose sales owner they are, plus proposals shared with them as a collaborator; "All" means every proposal in the workspace. Sharing grants one proposal, never role authority. A share also places that proposal in a manager's or viewer's View scope and in a manager's Edit scope when its sales owner is outside their teams, so every collaborator can open it and comment on it (`COLLAB-002`) and a collaborator whose role edits proposals can edit it. A share never changes a No cell and never widens any other row: managers send, share, approve (`APPROVE-003`) and unlock (`EDIT-015`) only their teams' proposals; sales members send and share proposals shared with them because their Own cells include them; content editors, viewers and billing users never send. Removing a share, or changing the person's role or teams, ends the access it gave at once, including for a write already under way. The rights are exactly these, and every one is enforced on the server: an action outside them is refused (403) with no write, and a list or search omits what the person may not view. Every door that lists, searches, reports, previews, downloads or opens proposals applies this same View scope; a scheduled report reaches only the active people the owner or an admin names (`REPORT-006`).

| Right | Owner | Admin | Manager | Sales | Content editor | Viewer | Billing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View proposals and agreements | All | All | Team | Own | Own | Team | All |
| Edit proposals | All | All | Team | Own | Own | No | No |
| Send, send a fresh invitation, send a revision, replace a signer or withdraw (`APPROVE-003`, `SEND-010`) | All | All | Team | Own | No | No | No |
| Share a proposal with another member as a collaborator | All | All | Team | Own | No | No | No |
| Approve a step whose rule names them or their role (`APPROVE-001`, `APPROVE-003`) | All | All | Team | No | No | No | Only steps naming them personally |
| Create and edit shared templates and template folders (`EDIT-002`) | Yes | Yes | Yes | No | Yes | No | No |
| Save a proposal as a personal template | Yes | Yes | Yes | Yes | Yes | No | No |
| Create and edit library items (`EDIT-003`) | Yes | Yes | Yes | No | Yes | No | No |
| Lock and unlock sections in a template (`EDIT-015`) | Yes | Yes | Yes | No | Yes | No | No |
| Unlock a locked section in one proposal (`EDIT-015`) | All | All | Team | No | No | No | No |
| Create and edit catalog items and prices (`CAT-001`) | Yes | Yes | Yes | No | No | No | No |
| See internal cost and margin (`PRICE-006`) | Yes | Yes | Yes | No | No | No | Yes |
| Record check, wire and ACH credit payments (`PAY-007`) | Yes | Yes | No | No | No | No | Yes |
| Refund and respond to disputes (`PAY-006`) | Yes | Yes | No | No | No | No | Yes |
| Connect and disconnect payment, accounting, CRM, file storage, chat and SSO providers (`SEC-001`) | Yes | Yes | No | No | No | No | No |
| Connect their own mailbox (`SEND-001`) | Yes | Yes | Yes | Yes | No | No | Yes |
| Invite members and change roles | Any role | Any role except owner and admin | Sales, content editor and viewer, into their own teams | No | No | No | No |
| Change the approval policy, approval rules and workspace settings, including the default reminder schedule, expiry period and payment methods (`APPROVE-001`, `APPROVE-003`, `FOLLOW-006`, `PAY-001`) | Yes | Yes | No | No | No | No | No |
| Issue and revoke agent keys (`ACCESS-001`) | Yes | No | No | No | No | No | No |
| Transfer ownership and delete the workspace | Yes | No | No | No | No | No | No |
| View reports (`REPORT-001` to `REPORT-006`) | All | All | Team | Own | Content reports only (`REPORT-003`) | Team | Revenue reports only (`REPORT-004`) |
| View and export the audit log (`TEAM-004`) | Yes | Yes | No | No | No | No | No |

Template and library folders can also be limited to teams (`EDIT-002`, `EDIT-003`): such a folder is listed and used only by members of those teams, admins and the owner. On upgrade, the first release's owner stays the owner and its members become sales members in no team, so each sees only their own proposals until the owner places them in teams. An agent is not a role: its effective rights are the sponsor’s actual role intersected with its grant (`ACCESS-001`); server-computed classes and company policy decide its calls.

Invitations follow the "Invite members and change roles" row. An invitation is one pending grant of one role and the listed teams (a manager lists one or more of their own teams) to one email address, and grants nothing until the person proves control of that address by native mailbox verification. Acceptance applies exactly that role and those teams in one transaction, and only while the issuer could still issue the same grant: the issuer is active, still holds a role that allows it and, for a manager, still belongs to every listed team; and the grant is the address's current one, not revoked and not past the expiry recorded when it was issued. Otherwise acceptance is refused (403) and gives no session, role, team or proposal access, and the person is told to ask for a fresh invitation. A change to the issuer that leaves that authority intact, such as their time zone, does not invalidate the grant. Reissuing, by anyone who could issue the new grant now, replaces the grant and refuses every earlier link for that address, used or not; revoking a pending invitation does the same. Native invitation routes cannot bypass a grant's role and team selection. An invitation never grants collaborator access to a proposal or changes any folder's audience.

A team-limited folder's audience is judged at each read and write. Widening who can list or use a folder or an item — adding or clearing a folder's teams, moving a template or library item into a folder with a wider audience or out of a team-limited folder into the workspace, or first sharing a personal template — needs the editor's explicit consent to the resulting audience, shown before saving, and is recorded in the audit log (`TEAM-004`). Joining or leaving a team changes what that member sees under these same rules and is governed by the membership and invitation rights above, not by folder consent.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with the report rights matrix, including filters, sorting, counts and totals under its visibility rules.

Before shipping, extend FOLLOW-002 with personal time zones, sales-owner queues and manager access only to people in one of their teams, in its named journey.

## TEAM-002

Members sign in through SAML or OIDC from [Auth](https://github.com/just-every/run-auth), Okta, Microsoft Entra ID or Google Workspace, and are created, updated and removed through SCIM with role mapping. Removing a member ends their sessions and keeps their proposals with a new owner.

## TEAM-003

A firm runs several brands or business units, each with its own brand kit, domain, templates, library, catalog, Stripe account and accounting connection, with members in one or more.

## TEAM-004

Every action by people, agents and integrations (edits, approvals, sends, views, signatures, payments, refunds, setting and permission changes) is logged with actor, time and subject, searchable by admins and exportable to CSV. This applies to every capability that exists today: successful client and proposal commands, revision restore and negotiation, tracked text suggestions and review, vendor-document settings and proposal file upload/refresh/download, agent-key management, client invitation views and verification/acceptance, client-import preview/apply/journal/undo, invoice export/download, and native Base authentication, setup, settings and permission actions. The owner and product admins search and export CSV; other roles are refused (403), as proved by the TEAM-001 role journey as well as the original audit journey. Rows retain an opaque actor record id and role (agent key id for agents), action, subject record id and server epoch-millisecond time. Unverified invitation views identify an unknown person, never the named client; verified client actions identify the client record. Credentials, codes, command payloads, IP addresses, devices and invitation tokens are never copied into the log. Exact actor/action/subject filters combine with case-insensitive literal search and inclusive epoch-millisecond time bounds; CSV returns the same ordered filtered rows. Audit rows travel in the business archive. Logging starts on upgrade; earlier history is not invented. Refused actions write nothing, preserving `HTTP-001`.

Every future capability must extend this audit journey before shipping: document and pricing actions (`EDIT-001`–`EDIT-018`, `CAT-001`, `PRICE-001`–`PRICE-007`), approval and team settings (`APPROVE-001`–`APPROVE-003`, `TEAM-001`–`TEAM-003`), recipient/notification/follow-up and tracking actions (`SEND-001`–`SEND-010`, `FOLLOW-001`–`FOLLOW-006`, `TRACK-001`–`TRACK-004`), signature/payment actions (`SIGN-003`–`SIGN-011`, `PAY-001`–`PAY-009`), integration actions (`CRM-001`–`CRM-004`, `ACCT-001`–`ACCT-007`, `AUTO-001`–`AUTO-005`, `HAND-001`–`HAND-002`), renewals, report delivery, migration, privacy and agent actions (`RENEW-001`–`RENEW-002`, `REPORT-002`–`REPORT-006`, `MIG-001`–`MIG-007`, `PRIV-001`, `AI-001`–`AI-004`, `AGENT-001`–`AGENT-009`).

## TEAM-005

A buyer's procurement or IT team gets what they ask an incumbent for. A security page states each control Platter implements (encryption and credential custody `SEC-001`, access control `TEAM-001` and `TEAM-002`, audit `TEAM-004`, erasure `PRIV-001`, archives and restore `PORT-001`), each linked to the clause and test that prove it. The pack also holds a subprocessor list, a data processing addendum, and completed standard questionnaires (CAIQ Lite and SIG Lite). For Run Edit Run's hosted service it includes the current SOC 2 Type II report, delivered under NDA on request. For a self-hosted installation, the pack states which controls the installer's own Cloudflare account carries.

## MIG-001

A PandaDoc customer on any plan moves in without API access, because PandaDoc gives Business and Starter accounts only its Sandbox API and keeps the Production API for approved Enterprise accounts. Through the self-serve route of `MIG-007`, the buyer uploads PandaDoc's bulk download zips (PDFs in the account's folder tree, with the eSignature certificate pages on completed documents, exported in batches of 200 to 300 and without attachments) and PandaDoc's catalog CSV (Name, SKU, Type, SKUs_in_bundle, Category, Price, Cost, Currency, Description, Images, Billing_frequency and custom-field columns). The mapping: completed documents with a certificate become retained, read-only agreements keeping the original PDF and certificate byte-identical with their SHA-256 recorded; open documents (draft, sent or viewed) become fixed-page drafts from their PDF (`EDIT-019`), or editable drafts where the buyer also uploads the document's Word download, and either can be reissued under `MIG-005`; the folder tree becomes Platter folders (`EDIT-016`); catalog rows become catalog items (`CAT-001`) with each URL in the Images column fetched as the item's image, bundles become packages, and non-USD rows are listed rather than converted; each template's body comes from its Word download (in PandaDoc, open the template and choose File, then Download, then Microsoft Word, offered on Starter, Business and Enterprise plans once the account owner allows Word downloads), converted to editable blocks with PandaDoc tokens such as `[Client.Company]` and `[Sender.FirstName]` mapped to variables (`EDIT-004`) and each quote or pricing table turned into a `PRICE-001` pricing table whose rows are matched to the imported catalog by SKU or name, with unmatched rows listed (`EDIT-005`); content library items, which PandaDoc does not let customers download, come across by inserting them into one PandaDoc document, downloading that document as Word and importing it as library items split at each Heading 1 (`EDIT-005`); a template the buyer has only as a PDF arrives as fixed pages listed as "Word download needed for editing"; contacts come from the connected CRM (`CRM-001` to `CRM-004`) or a contacts CSV, including the file PandaDoc support provides on request (`MIG-006`), because PandaDoc has no self-serve contact export. Where the buyer has the Production API, Platter also reads document statuses, recipients, template roles, fields, tokens, pricing-table items and folder metadata to enrich what the files carry; each template role becomes a `SIGN-011` role with its signing order, its field assignments and any pre-assigned recipient. PandaDoc's template details response holds no body text, so a template found through the API is listed as "convert from Word download" with its roles and tokens kept, and its body arrives only from its Word file. Without the Production API, the import report states what arrived (signed agreements with certificates, open documents as drafts, folders, catalog, converted template and library bodies, and contacts from the CRM or CSV) and lists as unmapped what the files cannot carry: attachments, template roles, pricing-table formulas, images PandaDoc leaves out of quote tables in Word downloads, comments, view analytics and audit events beyond the certificate. Everything runs under `IMPORT-001`'s preview, journal and undo.

## MIG-002

Platter imports Proposify templates, content library sections, fee tables, clients and proposals through the Proposify API where the buyer has it (Proposify offers its API on the Business plan, enabled by its Customer Success team), with signed proposals as read-only agreements and open ones as drafts. Without API access, the buyer uses the `MIG-007` route: proposal PDFs downloaded from Proposify, with signed ones kept as retained agreements with their signature page byte-identical and open ones as drafts for reissue; Proposify's documents report exported as CSV for status, value, client and dates, matched to each PDF; clients and catalog items by CSV (`MIG-006`) or from the CRM; and templates and library sections, which Proposify offers no Word download for, arriving as fixed pages from the PDF of a proposal made from each one (`EDIT-005`) and listed in the report as "rebuild in the editor", never converted. A template or section that the API returns without its content is treated the same way. Either way the import report states what arrived and lists what did not map, under `IMPORT-001`'s preview, journal and undo.

## MIG-003

Platter imports Better Proposals templates, content, contacts and proposals through its API where the buyer's plan includes API access, and otherwise through the `MIG-007` route from downloaded proposal PDFs and CSV files, under the same preview, journal and undo and with the same report of what did not map.

## MIG-004

Platter imports Qwilr pages, templates and quotes through its API where the buyer's plan has it enabled, and otherwise from Qwilr PDF exports through `MIG-007`; it imports Ignition clients, services, proposals and billing schedules from Ignition's exports. Both run under the same preview, journal and undo.

## MIG-005

At move-in, proposals sent but not signed in the old tool can be reissued from Platter with a new link, and signed agreements with active Stripe schedules or subscriptions are adopted by their Stripe IDs, so no client is charged twice and no scheduled payment is missed. A reissued proposal links to the imported original and is listed for the buyer to void in the old tool. An open document that arrived only as a PDF is reissued as fixed pages (`EDIT-019`): the original pages unchanged, with signature, initials and date fields placed where the PDF's signature block was detected or where the member puts them, and with no interactive pricing, optional items or payment collection unless the member appends a pricing table and sets a payment schedule before approval. The import report and the reissue screen say this and offer the Word route: an open document whose Word download was also uploaded is reissued as an editable proposal with live pricing tables (`PRICE-001`).

## MIG-006

The CSV kit imports companies, contacts with titles and phone numbers, billing and service addresses, tax-exempt status and catalog items, with the preview, fingerprint, journal and undo of `IMPORT-001`. It reads the incumbents' own contact and catalog CSV layouts (including PandaDoc's catalog CSV and the contact file PandaDoc support provides) as well as Platter's.

Current owner-only imports use published layout presets and a reviewed delimiter/column mapper for differing or undocumented exports, leaving original files unchanged. Company associations use explicit source IDs or reviewed exact label-to-ID associations, never inferred merges. Existing IDs and exact email conflicts are held with diagnostics; exports lacking IDs get identities scoped to the exact file and row. The fingerprint binds CSV bytes, mappings, associations, acquired image bytes and any explicit omission confirmation. Original files, every source column, journals, native records and undo custody survive `PORT-002` archives. Unchanged legacy client imports and their journals remain available.

Catalog metadata preserves decimal strings (PandaDoc price/cost through five decimal places), currency, price type/range, recurrence, category paths, resolved SKU/quantity bundles, images and arbitrary custom fields. Unmapped columns and non-USD rows are reported, never discarded or converted. Imported metadata neither calculates charges nor certifies tax exemptions; `CAT-001`, `PRICE-001`, `PRICE-003` and `MIG-001`..`MIG-004` inherit its lossless custody when they consume these records. Image acquisition uses credential-free HTTPS, validated public A/AAAA answers, connection to the validated literal IP without another DNS resolution, hostname-verified TLS, no redirects, PNG/JPEG/GIF/WebP byte-type checks and 5 MiB per-image / 20 MiB per-import limits. Unfetched URLs are listed as metadata and block apply unless the owner explicitly confirms importing that file without them; this decision is fingerprint-bound and the records say `not-fetched`. A runtime without hostname verification never bypasses TLS or claims image acquisition; such an installation remains partial for image fetching.

## MIG-007

For every incumbent, a buyer without API access moves in from the files the incumbent lets any customer export: document PDFs (one at a time or in bulk zips, across several uploads into one import), catalog and contact CSVs, and report CSVs. Platter detects signed documents by their signature certificate or signature page and keeps them as retained, read-only agreements with the original file byte-identical and its SHA-256 recorded; matches each PDF to report rows by title, client and date and holds ambiguous matches for the buyer to review; converts template and library files to editable blocks (`EDIT-005`); and resumes an interrupted upload without duplicating anything. Every import ends with a report of what arrived, what is held for review and what did not map, under `IMPORT-001`'s preview, journal and undo.

## MOB-001

On a phone browser, a sales member creates a proposal from a template, sends it, answers a client question and checks the follow-up queue, and an approver role approves a request under the `APPROVE-003` policy.

## MOB-002

Native iOS and Android apps give members the follow-up queue, proposal status, client questions, approvals and payments, with push notifications for views, questions, signatures, payments and approval requests.

## AI-001

A member pastes notes, uploads a transcript or picks an email thread or a recorded Zoom, Google Meet or Microsoft Teams call, and Platter drafts a proposal from the firm's templates, library and catalog, starting from the template's role slots (`SIGN-012`) with the people named in the source offered for each slot, and with the template's reminder schedule and expiry period (`FOLLOW-006`). Each drafted section cites the source line it came from. Sending follows `APPROVE-003` proposal authority; an agent’s call carries external and commitment and follows company policy within the sponsor’s role and grant (`PROP-001`).

## AI-002

In the editor a member asks to rewrite, shorten, adjust tone, summarize or translate a block; the suggestion appears as a change to accept or reject, and never edits pricing.

## AI-004

For each line item, Platter suggests a price range from the firm's own accepted and lost proposals for the same catalog item and client segment, with the sample size and examples shown. The member decides; suggestions are never applied silently.

## PRIV-001

An owner handles a US privacy request (CCPA/CPRA or similar): erase a contact's personal data, viewing data and comments from proposals that are not retained agreements, and record which retained agreements keep it as business records. Synced CRMs and file stores are listed with what to erase there.

## PORT-002

Archives and restore cover everything in the product: templates, library, catalog, media, signed PDFs and certificates, payment and invoice records, reports' source data and integration mappings, under `PORT-001`'s rules. Provider credentials never travel. Every record kind supported today must round-trip, including clients, draft/sent/accepted proposals, revisions, approval history, immutable acceptances, retained invoice files and client-import originals, journal and provenance. `EDIT-002`, `EDIT-003`, `CAT-001`, `EDIT-006`, `EDIT-010`, `SIGN-005`, `PAY-001` to `PAY-009`, `REPORT-001` to `REPORT-006`, `CRM-001` to `CRM-004`, `AUTO-001` to `AUTO-004` and `SEC-001` inherit archive/restore coverage of their new record kinds and credential exclusion before shipping. Provider connection metadata now round-trips while encrypted credentials stay local; agent keys, native sessions, client invitations, verification state and mail stay local under `PORT-001`.

## SEC-001

OAuth tokens and API keys for Stripe, CRMs, accounting, mail and storage are encrypted at rest, scoped to the least access each connection needs, never shown again after setup, excluded from archives and logs, and revocable from settings, with a visible state when a connection breaks. Only the owner and admins connect or disconnect the workspace's payment, accounting, CRM, file storage, chat and SSO providers; each member who sends connects only their own mailbox (`SEND-001`), as `TEAM-001` sets.

## ACCESS-001

The legacy preparation key is labelled and stored as a hash, expires after thirty days and binds the issuing owner’s current account version. Its migration to person-sponsored policy grants is required by the contract; its historical limited actions are recorded in CHANGELOG.

## AI-003

The legacy stateless Streamable HTTP door uses the existing proposal context, draft and retained-send-request actions. Requests bind key, proposal and revision; replay returns one request, revision changes mark it stale, and fulfillment follows the exact sent revision. This is compatibility behavior pending the policy-class registry in the contract.
