# Platter contract

Target edition: 17 October 2026. Platter is proposal-to-payment software for US service businesses, agencies and consultancies replacing PandaDoc, Proposify or Better Proposals, with the interactive pricing and payment collection buyers look for in Qwilr and Ignition. A firm writes a branded proposal from templates, a content library and a priced catalog, sends it from its own mailbox, sees who read what, follows up until a decision, negotiates exact revisions, collects an ESIGN-compliant signature and takes the deposit, milestones and recurring fees by card or ACH, with the deal, invoices and payments kept in step with the CRM and accounting system the firm already uses. Amounts are USD, sales tax follows US state rules, and payment and accounting connections are US services.

This is a target contract: the product Platter is being built towards, with each clause marked by how close the current code is. The first release (two GST-free AUD options, owner approval of an exact revision, mailbox-verified acceptance and one retained deposit CSV) is kept as the published clauses below; nothing it guarantees is weakened, and the AUD format is retired for new proposals by `PRICE-001` and `PRICE-008`. This documentation round changes no homepage, interface or runtime behavior. Source acquisition and command effects follow `SEED-COMMAND-CONTRACT.md`; acceptance journeys are listed in `ACCEPTANCE.md`.

Historical currency terminology throughout this contract: “first-release” and “legacy” AUD refer to records and archive formats preceding the USD currency migration of 19 October 2026 (`migrations/core/0017_currency.sql`). Those historical agreements retain their original currency; new proposals use USD.

## Product target

| | |
| --- | --- |
| Category | Proposal software |
| Incumbents a buyer switches from | PandaDoc, Proposify, Better Proposals |
| Up-and-comers it must also beat | Qwilr, Ignition |
| First buyer | A US owner or sales lead at a service business, agency or consultancy with 1 to 50 staff, quoting in USD, collecting deposits by card or ACH through their own Stripe account, and running HubSpot, Salesforce or Orbit with QuickBooks Online or Xero |
| What switching means | Their templates, content library, products, contacts and open and signed documents arrive from PandaDoc, Proposify, Better Proposals, Qwilr or Ignition (by API where the buyer's plan has one, otherwise from the files any customer can export) with a list of what did not map; every daily job (write, price, approve, send, track, follow up, negotiate, sign, get paid, hand off, report) has a Platter equivalent; their CRM, accounting, mailbox, file store, chat and delivery tools plug in |

A buyer replacing an incumbent needs the whole job, so the target is the whole job:

- **Write.** A branded drag-and-drop editor with templates, a reusable content library, variables from the CRM, rich media, conditional content, attachments such as the firm's W-9, Word import with tokens and quote tables mapped, PDF pages for signing, Word and PDF export, a client PDF before signing, a preview of the client page before sending, duplicating, locked sections, search and folders, unpriced documents such as NDAs and SOWs, a custom domain, a phone-ready client page in the client's language, and a measured performance budget on large proposals (`EDIT-001` to `EDIT-018`).
- **Price.** A catalog, USD pricing tables with quantities and units, packages and optional items the client chooses, one-off and recurring fees, discounts, US sales tax, internal cost and margin, and payment terms with deposits and milestones (`CAT-001`, `PRICE-001` to `PRICE-008`).
- **Work as a team.** Live co-editing, internal comments, version history, approval rules by value, discount, margin and terms, one approval policy stating who approves, who sends and whether a proposal that matches no rule needs approval, and approval requests that reach the approver (`COLLAB-*`, `APPROVE-*`, `PROP-001`).
- **Send and track.** Sending from Gmail or Microsoft 365 or by text message, a reusable public signing link, an editable subject and message from shared email templates, delivery and bounce states, several recipients with roles, replacing a signer on a sent proposal, withdrawing a proposal sent in error, expiry, notifications, view and section-level analytics and forwarded stakeholders, with tracking disclosed (`SEND-*`, `TRACK-*`).
- **Follow up and negotiate.** Reminders and expiry with defaults set for the workspace and each template, manual reminders, an accountable next-action queue, expiry and renewal notices, client questions, decline reasons, negotiated revisions and client-suggested edits (`FOLLOW-*`, `NEG-*`).
- **Sign.** ESIGN and UETA signatures, several signers with order and countersignature, recipient roles, field assignments and signing order set once in a template, a signed PDF with certificate of completion, SMS and ID verification, fields collected at signing, acceptance on the client's own paper, delegation by the signer and in-person signing on the firm's device (`SIGN-001` to `SIGN-011`, `SEND-007`).
- **Get paid.** Stripe card and ACH collection in the proposal, deposits at acceptance, milestone and recurring schedules, net-terms invoices with a pay link and overdue tracking, payment states, retries, refunds, disputes, offline checks and wires, and PayPal, Square or Authorize.net for firms not on Stripe (`PAY-*`), synced to QuickBooks Online, Xero or Pantry with one invoice authority, each invoice created on its issue day, payout and fee clearing, and reconciliation (`ACCT-*`, `INV-001`).
- **Connect.** HubSpot, Salesforce, Orbit, Pipedrive and Zoho CRM sync; status-driven automations; document archiving to Google Drive, OneDrive, SharePoint, Box or Chest; Slack, Teams and Nook; a public API, webhooks, Zapier, Make and Crank; and handoff of the accepted scope to Asana, Trello, monday.com, ClickUp, Jira, Vector or Gauge (`CRM-*`, `AUTO-*`, `HAND-*`).
- **Renew, report and administer.** Bulk sends and renewals, pipeline, win-rate, content and revenue reports, roles with a stated permission matrix and teams, SSO and SCIM, several brands, an audit log and a security review pack for procurement (`RENEW-*`, `REPORT-*`, `TEAM-*`).
- **Move in and out, anywhere.** Importers for PandaDoc, Proposify, Better Proposals, Qwilr and Ignition, working from exported files when the buyer has no API access, that keep open proposals and payment schedules running, CSV move-in, complete archives and erasure, and phone and native apps (`MIG-*`, `IMPORT-001`, `PORT-*`, `PRIV-001`, `MOB-*`).
- **Agents beyond the category.** Drafts from discovery calls tested against the firm's real delivery costs, capacity and outcomes, questions and payment exceptions chased to resolution, and out-of-scope delivery turned into separately approved change orders (`AI-*`, `AGENT-*`).

### Neighboring products stay separate

Platter is one product. Where the market sells a neighboring product separately, Platter connects to it and does not rebuild it; when the neighbor is a Run Edit Run sibling, Platter links to that sibling first and to the US incumbent second.

| Job | Owned by | How Platter meets it |
| --- | --- | --- |
| Sales CRM: contacts, pipelines, sequences, forecasting | [Orbit](https://github.com/just-every/run-orbit) (or HubSpot, Salesforce, Pipedrive) | Two-way deal, contact and line-item sync and timeline events (`CRM-001` to `CRM-004`); Platter keeps only the clients and contacts proposals need |
| General ledger, bank feeds and books | [Pantry](https://github.com/just-every/run-pantry) (or QuickBooks Online, Xero) | Invoices, payments and refunds posted to one chosen invoice authority (`ACCT-001` to `ACCT-005`) |
| Standalone e-signature for any document | [Inkwell](https://github.com/just-every/run-inkwell) (or Docusign eSignature) | Platter signs its own proposals and agreements (`SIGN-*`); other documents go through Inkwell, and client-paper signatures are recorded (`SIGN-008`) |
| Contract lifecycle management and master-agreement redlining | [Locket](https://github.com/just-every/run-locket) (or Ironclad) | Client-suggested text edits on the proposal (`NEG-002`); MSAs and obligations are linked as attachments (`EDIT-010`) |
| Subscription and usage-based billing, dunning beyond the agreed schedule | [Nectar](https://github.com/just-every/run-nectar) (or Stripe Billing, Chargebee) | Platter runs the schedule the client accepted (`PAY-003`); metered or long-running subscription billing hands off through the API (`AUTO-004`) |
| Project delivery, time, staffing and margin | [Gauge](https://github.com/just-every/run-gauge) (or Harvest with Forecast, Kantata, Asana) | Accepted-scope handoff (`HAND-001`, `HAND-002`) and delivery actuals read by `AGENT-002` and `AGENT-006` |
| Work and project management | [Pegboard](https://github.com/just-every/run-pegboard) | Linked sibling; project management stays outside Platter |
| Meeting booking | [Dial](https://github.com/just-every/run-dial) (or Calendly) | Booking links embedded in proposals (`EDIT-006`) |
| File storage | [Chest](https://github.com/just-every/run-chest) (or Google Drive, SharePoint, Box) | Signed documents filed by `AUTO-002` |
| Team chat | [Nook](https://github.com/just-every/run-nook) (or Slack, Microsoft Teams) | Notifications and approval actions (`AUTO-003`, `APPROVE-002`) |
| Workflow automation across apps | [Crank](https://github.com/just-every/run-crank) (or Zapier, Make) | Triggers, actions, webhooks and API (`AUTO-004`, `AUTO-005`) |
| Workforce identity | [Auth](https://github.com/just-every/run-auth) (or Okta, Microsoft Entra ID) | SAML or OIDC sign-in and SCIM (`TEAM-002`) |
| Trade quotes, construction estimates and accounting engagement letters | [Glove](https://github.com/just-every/run-glove), [Plinth](https://github.com/just-every/run-plinth) and [Blotter](https://github.com/just-every/run-blotter) (or Jobber, Buildertrend, Karbon) | Not rebuilt: those vertical products quote inside their own job records; Platter is the horizontal proposal product for agencies, consultancies and professional services |

### How to read this contract

- **Published clauses** are the `- **ID — Title.**` bullets under [Published guarantees](#published-guarantees). They are what the first release already promised, kept and rewritten as named clauses.
- **Target clauses** are the `#### ID — Title.` headings under [Target clauses](#target-clauses), and **push-further clauses** are those under [Push further](#push-further). They are binding product requirements not yet delivered in full. A build round that delivers one turns it into a published bullet with the same ID; IDs never change.
- **Status** (in [Status](#status) and after each target clause) is `done`, `partial` or `missing`, judged from the code and tests at commit `21359a9fdff12a21d22d5f95cc96f91ffcc2e2aa` (21 October 2026). `done` means the behavior ships and a cited test exercises it; `partial` means some of it ships, or it ships without a test of the whole behavior; `missing` means there is no implementation. Status is a build-planning judgment, not acceptance.
- **Acceptance** is a journey or test through a public door: an HTTP route, the browser at 1440 and 390 pixels, the CLI, the MCP server, a native app or an import or export file. Fakes are allowed only at a paid or network edge (Stripe, Twilio, mail, CRM, accounting, storage and chat providers); a provider fake proves Platter's side only, never live provider behavior, which is proven in the provider's sandbox or test mode.

## Published guarantees

These clauses hold today and stay binding as the product grows. Where a target clause extends one, it names it.

### Access and authority

- **HTTP-001 — Authorized domain dispatch.** Every proposal, client, import and invoice handler checks a native Base owner or member session, or a revocable owner-bound agent key, before it reads or writes. Browser mutations require the configured Origin and Host and refuse cross-site requests. Which role may take which action is `TEAM-001`, with approving and sending set by `APPROVE-003`; every refusal is a 403 with no write. Signed-out readers of `/app` are sent to sign-in, and unknown routes return real 404s. **Acceptance evidence:** Through HTTP: read state signed out (401), post a mutation from a foreign Origin (403), call a domain command with a revoked agent key (401) and as a member for an owner-only action (403).
- **ACCESS-001 — Revocable agent keys that only draft.** An owner issues an agent key with a label and a 30-day expiry, stored only as a hash and bound to that owner's current account version. An agent key can read context and prepare or revise drafts, and nothing else: it cannot add clients, approve prices, send offers or export invoices. Revoking the key, or the owner losing the owner role, ends its access at once. Drafts an agent prepares are attributed to the key, and a draft prepared or last revised by an agent key always needs a person's approval before it is sent (`PROP-001`), even where the approval policy lets proposals that match no rule go without one (`APPROVE-003`). **Acceptance evidence:** Create a key, prepare a draft with it, try to approve and add a client with it (403), revoke it, and read context with it again (401).

### Approval, sending and acceptance

- **PROP-001 — Approval binds the exact revision.** Every approval names one exact revision. Saving a new revision clears every approval the proposal holds, so a changed price, scope or term can never be sent on an earlier approval, and each approval is recorded with its approver, role, rule, revision and time. Who may approve and send, and which proposals need approval at all, is the approval policy of `APPROVE-003`. Its default, which every installation starts with and keeps until the owner changes it, is the first release's rule: every proposal needs approval, and only a person with the owner role approves. A draft prepared or last revised by an agent key (`ACCESS-001`) always needs a person's approval, whatever the policy says. `APPROVE-001` and `APPROVE-003` decide which approvals apply; neither can remove the exact-revision binding. **Acceptance evidence:** Under the default policy: approve a stale revision (409), approve the current one as the owner, revise the price, try to send (409), approve the new revision and send; two approval records exist, each naming its revision. The same binding for a manager's approval under a rule is part of the `APPROVE-003` journey.
- **PROP-002 — Sending freezes the offer.** Sending freezes the approved revision: its scope, options and prices can no longer be edited in place. Anyone who may send the proposal under `APPROVE-003` (the owner, under the default policy) can send a fresh invitation, which rotates the client link and clears any verification session without changing the offer, so it needs no new approval. A change after sending is a new revision under `NEG-001`, never an edit to what the client already holds. **Acceptance evidence:** Send an approved proposal, try to revise it (409), send a fresh invitation and confirm the old link is refused and the offer unchanged.
- **SIGN-001 — Verified-mailbox acceptance.** A client invitation grants access only to its own frozen offer. Acceptance needs a mailbox verification code: six digits, single use, valid for 10 minutes, at most five attempts, one request a minute and ten codes per invitation. Verification grants acceptance authority only for that invitation and revision, through an HttpOnly, SameSite=Strict cookie scoped to the invitation path. The code stays the default identity check for every proposal; a firm that wants the incumbents' link-only acceptance chooses it explicitly per proposal or template under `SIGN-006`, and the certificate records the method. **Acceptance evidence:** Accept before verifying (401), verify, submit a code again (401), exhaust five wrong attempts and see the right code refused, expire a code and see it refused.
- **SIGN-002 — Immutable acceptance with an integer-cent deposit.** Acceptance requires a verified mailbox, a typed full name, one offered option and explicit consent. One D1 transaction retains the exact approved snapshot, signer, consent text and time, and calculates the deposit in integer cents, rounding to the nearest cent. A second acceptance returns the first; nothing in the product edits an accepted agreement. **Acceptance evidence:** Accept with an unknown option (400), accept option two with consent, accept again with another name and option, and read back the first acceptance with total 420000 and deposit 105000 cents.
- **INV-001 — One retained deposit invoice per acceptance.** An owner exports the accepted deposit as an invoice record. A unique proposal-to-invoice binding makes concurrent and repeated exports return one retained invoice with one number, and the export can be downloaded again without creating another. Re-downloading never authorizes posting the same invoice to accounting twice; `ACCT-004` carries this one-invoice rule into live accounting sync. The first release writes a Xero-format CSV; the export rejects proposals that are not accepted. Spreadsheet formula characters in client-controlled cells are neutralized. **Acceptance evidence:** Export an unaccepted proposal (409), export an accepted one twice concurrently and get one invoice, and download its CSV.

### Clients, erasure and archives

- **IMPORT-001 — Reviewed client CSV move-in with undo.** The client CSV kit previews the exact source bytes without writing, and applies only the file whose fingerprint was reviewed. Base import-kit retains the original, its fingerprint, a journal and reversible native writes. Re-applying returns the same job. Undo restores the previous state and refuses when an imported client has changed or has dependent proposals. **Acceptance evidence:** Preview `fixtures/clients.csv`, apply a changed file against the reviewed fingerprint (409), apply the reviewed file, read the journal, re-apply, undo, and see an undo refused once a proposal uses an imported client.
- **ERASE-001 — Bounded client erasure.** An owner erases a client by typing the exact client name. Erasure is limited to clients with no proposals and no import history; agreements remain retained business records. Erasure writes a portability fence, so an older archive cannot restore the erased client and in-flight transfers are invalidated. **Acceptance evidence:** Erase a client with a draft (409), erase with the wrong name (400), erase an unused client, then restore an older archive with the newer erasure journal and find the client absent.
- **PORT-001 — Validated archives and restore.** RER archives preserve clients, proposals, revisions, approvals, immutable acceptances and deposit invoices. Credentials, sessions, client invitation links, verification state and mail do not travel. Restore requires an empty destination and valid integrity, and refuses an older archive without a newer erasure journal. Sent offers need fresh invitations after restore. **Acceptance evidence:** Through the public CLI: export, import into an empty checkout and re-export identical parts, refuse a populated destination (4), refuse a damaged archive (1), and refuse an older archive after an erasure (4).

### Mail and the public site

- **MAIL-001 — Durable proposal mail with honest outcomes.** Local proposal and verification mail is captured without a provider. Hosted mail is queued durably in the same transaction as the action that sends it, claimed before contacting the configured sender, and records an uncertain outcome without a blind retry. Provider acceptance is shown as accepted by the provider, never as delivered; `SEND-002` adds delivery and bounce states. **Acceptance evidence:** A Workers journey with a provider fake at the network edge: send, see the row claimed before the call, return accepted, then return a timeout and see the row left uncertain and not resent.
- **SITE-001 — Public run site and documentation.** The public run site is built with `rer build --site`. Its homepage's Run Platter action opens `/run`, and `/docs` renders the repository's Markdown guides without JavaScript. The installed root stays the shared Lobby. Run-site deployment is guarded by `RUN_SITE_DEPLOY` and stays off until its gate. **Acceptance evidence:** Build the site, open `/` and follow Run Platter to `/run`, open `/docs` with JavaScript disabled, and open the installed `/` to see the Lobby.

## Target clauses

These clauses complete the category job alongside the published guarantees. Each states the behavior a buyer gets, its acceptance evidence and its current status.

### Authoring and branding

#### EDIT-001 — Branded drag-and-drop proposal editor.

A member builds a proposal from blocks: cover page, heading, rich text, image, video, columns, pricing table (`PRICE-001`), quote or testimonial, team bio, case study, terms, form field (`SIGN-007`), signature block and page break. Every signature block and field is assigned to one recipient, or in a template to one recipient role (`SIGN-011`). Blocks are added from a palette, reordered by drag or keyboard, duplicated and deleted with undo. A brand kit sets the logo, colors, fonts and a default cover. One document renders as a responsive web page for the client and as a paginated US Letter PDF (`EDIT-005`) with the same content, and members and approvers see that client page for an unsent revision through the preview of `EDIT-018`. Edits autosave under the version guard of `COLLAB-001`, and the editor meets the large-proposal performance budget of `EDIT-011`.

All added blocks and media extend EDIT-014’s exact-revision, selected-price and every-page unsigned PDF journey before shipping.

*Acceptance:* A browser journey at 1440 and 390 pixels builds a proposal from blank with every block type, reorders by drag and by keyboard, applies a brand kit, reloads and sees the same document, and exports a PDF whose pages carry the same blocks in order; the `EDIT-011` budget journey passes on the same build.

*Status:* partial. Only a title, scope and two-option form with fixed Platter styling; no block editor, layouts or brand kit. (`src/platter/ui/proposals.ts`, `src/platter/commands.ts`)

#### EDIT-002 — Proposal templates.

Owners, admins, managers and content editors publish templates (layout, blocks, default pricing tables, terms, payment methods (`PAY-001`), deposit and payment schedule (`PRICE-007`), reminder schedule and expiry period (`FOLLOW-006`), variables, and recipient roles with their assigned fields, signing order and pre-assigned recipients under `SIGN-011`) that members start proposals from; a proposal started from a template opens with the template's role slots to fill. Platter ships starter templates for US agencies, consultancies, IT managed services, creative studios and professional services. Any member who edits proposals can save one as a personal template they own; only the template roles of `TEAM-001` edit shared templates. Templates have owners, folders and access rules (`TEAM-001`), and changing a template never changes proposals already created from it.

Template defaults inherit EDIT-014’s PDF-download enable/disable setting and identical named PDF assertions before shipping.

*Acceptance:* Create a template with a pricing table and variables, start two proposals from it, edit the template, and confirm both proposals are unchanged while a third proposal picks up the edit. On a fresh installation the five starter templates (agency, consultancy, IT managed services, creative studio, professional services) are listed, and each starts a proposal with a pricing table and filled variables. Put a template in a folder limited to the Design team: a Design-team member lists and uses it, and a Sales-team member neither lists it nor starts from it (403). A sales member saves a proposal as a personal template and is recorded as its owner, and their edit of a shared template is refused (403). A proposal started from a template with recipient roles opens with those role slots, as the `SIGN-011` journey checks. A template set to offer card and ACH only, a 30% deposit with a net-15 milestone, reminders at 2, 5 and 9 days and a 14-day expiry starts a proposal carrying all of them, as the `PAY-001`, `PRICE-007` and `FOLLOW-006` journeys check, and editing them on that proposal leaves the template unchanged.

*Status:* partial. Owner/member people save and replace their own personal templates from a displayed USD revision and start independent unapproved drafts for a chosen client. Current content, pricing tables/packages/optional items, conditions, attachments, PDF-download setting, expiry configuration and suggestion opt-ins are retained; source identities, approvals, invitations and lifecycle history are not copied. Version and personal ownership guards, owner-bound MCP drafting, desktop/phone starts and public CLI custody are asserted. All five built-in starters (agency, consultancy, IT managed services, creative studio and professional services) now start independent drafts with USD pricing tables and client name/email and sender email filled at creation, including line descriptions. Starter prices and terms are examples to review; the IT starter is a one-off assessment/onboarding proposal. Starter definitions are versioned source content; customize the draft and save a personal copy. Named HTTP/MCP, 1440/390 browser, exact selected client PDF/acceptance and public CLI restore assertions cover them. Gap: shared templates and team folders, general variables, recipient roles, payment methods/schedules and reminder defaults remain. (`src/platter/templates.ts`, `src/platter/starter-templates.ts`, `src/platter/ui/templates.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### EDIT-003 — Reusable content library.

A shared library holds sections, images, videos, case studies, team bios, testimonials, terms and pricing tables, with folders, tags and search. Owners, admins, managers and content editors create and edit library items, and every member who edits proposals inserts them (`TEAM-001`). A member inserts an item as a linked copy (updated when the library item changes, until the proposal is sent) or as a detached copy. Sent and accepted proposals never change when the library does. Each item shows where it is used and when it last changed.

*Acceptance:* Insert a linked and a detached case study into a draft and a sent proposal, edit the library item, and see only the linked copy in the draft change; the item's usage list names all three.

*Status:* partial. Owners, admins, managers and content editors create and version-guard shared text sections, case studies, bios, testimonials and terms through library.save and /app/library; sales read them, while viewers, billing and agent keys have no library access. The TEAM-001 role HTTP journey asserts writes and no-write refusals for every role, and the named MOB-001 / TEAM-001 / APPROVE-003 browser journey edits a case study as a content editor and refuses sending at 1440/390. The named role CLI archive journey preserves library items. Gap: linked and detached insertion, usage lists, tags/search, images/video and pricing-table library items remain.

#### EDIT-004 — Variables from client, deal and CRM records.

Text and pricing can use variables: client company, contact name and title, address, deal name and amount, sender details, dates and custom fields, filled from Platter records or from the linked HubSpot, Salesforce or Orbit deal (`CRM-001` to `CRM-003`). Template role slots (`SIGN-011`) are filled the same way, from the client's contacts or the deal's contacts. A variable with no value is flagged in the editor, and sending is refused until each one is filled or deliberately cleared. The sent revision freezes the filled values.

Before shipping, extend EDIT-012 duplication assertions to refill every variable from the destination client and deal while leaving the source byte-identical.

*Acceptance:* Create a proposal from a HubSpot deal fake with a missing contact title, see the send refused naming that variable, fill it, send, change the deal in the fake, and see the sent proposal unchanged.

*Status:* missing. No variables or merge fields.

#### EDIT-005 — Word and PDF import and export.

A member uploads a Word (.docx) file, such as a template or document downloaded as Microsoft Word from PandaDoc, Proposify or Better Proposals, and gets editable blocks (`EDIT-001`) with headings, paragraphs, lists, tables and images kept. Incumbent merge tokens, such as PandaDoc's `[Client.Company]`, `[Client.FirstName]` and `[Sender.FirstName]`, become `EDIT-004` variables through a published mapping table; a token with no mapping becomes a custom variable and is listed. A table whose header row names price, quantity or SKU columns (a quote or pricing table) becomes a `PRICE-001` pricing table: a row whose SKU, or failing that its name, matches a `CAT-001` item becomes a priced line item linked to that item at the row's quantity and price, and a row that matches nothing becomes an unlinked line item at its own name and price and is listed as unmatched for the member to link or keep. Images that the source file dropped, such as those PandaDoc leaves out of quote tables in its Word downloads, are listed as missing, never invented. A .docx can instead be imported as content library items (`EDIT-003`): the file is split at each Heading 1, and each part becomes one item named by its heading. A PDF upload is never converted to editable blocks. It becomes fixed pages, kept byte-identical, that carry signature, initials, date and form fields (`SIGN-003`, `SIGN-007`); the member can append editor blocks after them, including a pricing table, and set a payment schedule (`PRICE-007`), so a fixed-page document can still take payment at acceptance. Any proposal exports to PDF (US Letter or A4) and to Word: headings become Word heading styles, each pricing table becomes a Word table with every line's name, quantity, unit price and total, and images are embedded. The signed agreement PDF is `SIGN-005`.

All imported blocks, fixed pages and media extend EDIT-014’s exact unsigned PDF assertions before shipping.

*Acceptance:* Import a catalog CSV, then upload a PandaDoc-shaped .docx template with headings, an image, `[Client.Company]` and `[Sender.FirstName]` tokens and a six-row quote table, five of whose SKUs are in the catalog and one of which is not: the result is a template whose blocks are editable, whose tokens are variables, and whose pricing table holds six priced line items, five linked to their catalog items and one listed as unmatched. Upload a .docx of 10 Heading 1 sections as library items and get 10 items named by those headings. Upload a PDF: its pages stay byte-identical and uneditable, a signature field is placed on page 3, and a pricing table appended after the last page totals the lines added. Export a proposal with three headings, a four-line pricing table and two images to .docx and PDF: the .docx has the three headings as Word heading styles, a Word table with each of the four lines' name, quantity, unit price and total, and both images embedded; the PDF has the same blocks in the same order.

*Status:* missing. No import or export of documents.

#### EDIT-006 — Embedded rich media.

Proposals embed images and galleries, uploaded video, YouTube, Vimeo, Loom and Wistia video, a Dial or Calendly booking link and embedded PDFs. Embeds come from an allowlist with a content security policy, render on phones, and show a still and a link in the PDF export. Uploaded media is stored with the proposal and travels in archives (`PORT-002`).

*Acceptance:* Add an uploaded video, a Loom link and a gallery, view on a 390-pixel phone and play the video, export the PDF and see stills with links, and try an embed from a host outside the allowlist (refused).

*Status:* missing. No media blocks.

#### EDIT-007 — Mobile client review.

The client reads, chooses options, comments, signs and pays on a phone as well as on a desktop. The client page meets WCAG 2.2 AA, works with keyboard and screen reader, and needs no app or account.

*Acceptance:* A browser journey at 390 pixels opens an invitation, verifies the mailbox, changes an optional item, comments, signs and pays with a Stripe test card; an axe scan reports no WCAG 2.2 AA violations and a keyboard-only run completes the same journey.

*Status:* partial. Named EDIT-007 built-browser journeys at 1440 and 390 pixels complete invitation, mailbox verification, conditional package selection, adding an optional item and raising its quantity (`PRICE-002`), comments and immutable acceptance of the selected total and deposit with keyboard-only client interaction and axe WCAG 2.2 AA scans at every step. Verification, comments and refusal pages preserve the reviewed package and optional items, and submission feedback receives keyboard focus. Package review uses a native fragment target to focus a named selection region containing the chosen package, optional-item quantities and exact USD total/deposit, including with application JavaScript disabled. Named EDIT-007 assertions expose current scope, grouped pricing and selection through browser accessibility APIs, correct an out-of-range quantity by keyboard, and download exact attachment bytes and the selected unsigned PDF before accepting. Gap: Stripe test-card payment (PAY-001/PAY-002) and assistive-technology verification of the complete rich-content/payment journey remain; this slice does not establish full WCAG conformity. (`src/platter/ui/client.ts`, `src/platter/ui/packages.ts`, `src/platter/ui/shared.ts`, `tests/site.test.mjs`, `tests/mobile-client-journey.mjs`)

#### EDIT-008 — Custom domain and branded client experience.

An owner serves client links from their own domain, such as `proposals.example.com`, and sends from their own domain with SPF, DKIM and DMARC alignment checked before use. The client page, emails and PDF carry the firm's brand and no Platter branding.

*Acceptance:* Configure a custom hostname and sending domain in a staging account, see the DNS checks pass, send, and open the client link on the custom domain with no Platter branding in page, email or PDF.

*Status:* missing. Client links use the installation origin with Platter styling.

#### EDIT-009 — Conditional content by package.

A section can be shown only when a package, optional item or variable has a given value, so choosing the Premium package shows its deliverables and timeline. The accepted agreement and PDF contain exactly what the client saw for their selection. Today this applies to the scope and terms sections, each conditioned on one offered package or one optional item (`PRICE-002`), including the selected unsigned client PDF (`EDIT-014`). An optional-item condition shows its section only while the client's chosen package has that item added, at any allowed quantity; a package without the item never shows it. Each future capability inherits the same conditional visibility and exact-selection assertions before shipping: `EDIT-001` added sections, `EDIT-004` variables, `EDIT-005` added PDF carriers and `SIGN-005` signed agreement PDFs. Unconditional legacy content remains visible for every selection. Members check each selection's sections before sending in the `EDIT-018` preview.

*Acceptance:* Make a timeline section depend on the Premium package, accept the Standard package and see the section absent from the agreement and PDF, then accept Premium on another copy and see it present.

*Status:* done. Current scope and terms can each depend on one offered package or optional item. Named EDIT-009 public HTTP/browser/PDF and CLI journeys cover selection, preview, agreement freezing and custody. (`src/platter/conditional.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### EDIT-010 — Attachments and vendor documents.

A proposal carries attachments such as the firm's W-9, certificate of insurance, MSA or case-study PDFs. The firm stores its current W-9 and insurance certificate once and attaches them by default. Attachments are frozen with the sent revision and listed in the signed agreement package. Owner-only vendor settings keep immutable W-9 and insurance file versions; new proposals copy the current defaults. Owner/member people may upload arbitrary files or refresh current defaults on an unsent draft or approved proposal; either creates a new draft revision and clears approval. Existing revisions and sent offers never resolve a later default. Client links download only files in that exact sent revision, under the same invitation access as its offer; bytes are download-only and are not sent to an external provider. The immutable accepted snapshot retains file references with byte digests; the owner/client agreement package lists the same file versions, filenames and byte sizes. All original bytes and current defaults survive PORT-002 archives. SIGN-005 inherits the same list in its signed PDF package and TEAM-001 inherits scoped person authority before shipping.

*Acceptance:* Upload a W-9 in settings, send a proposal, and as the client download the W-9; replace the W-9 in settings and see the sent proposal still carry the original.

*Status:* done. Named EDIT-010 HTTP, 1440/390 browser and CLI archive journeys prove both reusable defaults, arbitrary uploads, renewed approval, exact binary downloads, frozen replacement custody and accepted-package listing. (`src/platter/attachments.ts`, `src/platter/attachment-commands.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### EDIT-011 — Large-proposal performance budget.

The editor and client page stay fast on the proposals agencies actually send. The reference document is 40 US Letter pages with 30 images (2400-pixel JPEGs of about 500 KB each) and four pricing tables of 15 lines. Measured in Chromium at 1440 by 900 pixels with the CPU throttled 4× through the DevTools protocol (`Emulation.setCPUThrottlingRate`): the editor opens from navigation to editable (the first block accepts input) in at most 3 seconds; keystroke-to-paint latency over 200 keystrokes typed into a block on page 30 has a p95 of at most 100 ms; a drag reorder of a section completes, from drop to repainted order, in at most 300 ms; and a pricing-table quantity edit shows the server-confirmed total in at most 500 ms. The client page of the same proposal at 390 pixels with the same throttle reaches largest contentful paint in at most 2.5 seconds and loads images below the fold lazily. A measure over budget is a failing acceptance run.

*Acceptance:* A browser journey creates the reference proposal through the public API, applies the 4× throttle, opens it at 1440 pixels and records time to editable, the p95 of 200 keystroke-to-paint intervals (Event Timing API), one drag reorder and one quantity edit, then opens the client page at 390 pixels and records largest contentful paint; the run reports each measured value and fails if any exceeds its budget.

*Status:* missing. No block editor exists, so no budget is measured; no large-proposal fixture or timing journey.

#### EDIT-012 — Duplicate a proposal for another client.

A member duplicates any proposal (draft, sent, accepted or lost) into a new draft for the same or another client. The copy keeps blocks, pricing tables, attachments and settings (payment methods and schedule, reminder schedule and expiry period, `FOLLOW-006`), refills variables (`EDIT-004`) from the new client and deal, keeps the source's recipient roles as slots (`SIGN-011`) with only the template's pre-assigned members filled, and clears the other recipients, approvals, views, comments, signatures and payments. The copy is a new proposal that carries none of the source's approvals and needs approval only where the `APPROVE-003` policy requires it for its own revision; the source is never changed.

Current capability boundary (ct, 20 October 2026): DONE covers every proposal kind and field available today: draft, approved, sent, expired, withdrawn and accepted, including a displayed unsent negotiated revision. An owner or member duplicates for the same or another existing client; the copy preserves scope, terms, prices, original currency, deposit, attachment bytes, client-PDF setting and expiry configuration. It is a new draft at revision 1 owned by its preparing person, with no approvals, invitation authority, mail, views, comments, suggestions, signatures, invoice, payments or expiry transport state; the source remains unchanged. A days-based expiry copies calendar-day settings, not its previously calculated date; a fixed expiry date stays fixed. The default title appends " (copy)" and truncates the original title to fit 200 characters. EDIT-004 inherits refilling variables from the new client/deal; SIGN-011 inherits role slots with only template-preassigned members filled; FOLLOW-006 inherits payment/reminder/expiry settings; APPROVE-003 inherits both mandatory and optional approval cases. Each must extend the named EDIT-012 assertions before shipping. Any new document content, attachment or delivery/payment setting also inherits exact-copy coverage before shipping.

*Acceptance:* Duplicate an accepted proposal for Acme into a draft for Beta Co: blocks and prices match, variables show Beta's contact, the recipient role slots are present with only the pre-assigned countersigner filled, and there are no approvals, views or signatures; its payment methods, reminder schedule and expiry period equal Acme's proposal; with "approval required for every proposal" on, its send is refused (409) until approved, and with it off and no rule matching, the sales member who owns it sends it at once; Acme's agreement is byte-identical.

*Acceptance (current capabilities):* Current-capability acceptance: duplicate an accepted proposal for another client as a member, compare every current content/pricing/currency/deposit/attachment field and download the exact file bytes, confirm a new owner and draft revision 1 with no lifecycle authority or records, require owner approval before sending, and confirm the original agreement response is byte-identical. Duplicate every other current status, the same client and an unsent negotiated draft; each source remains unchanged. Verify copied PDF/expiry settings, an unstarted new expiry clock, stale-version refusal and agent refusal. At 1440 and 390 duplicate the accepted offer through the copy form, choose Beta Co, inspect the separate draft, approve and send it while the original stays accepted. Public CLI archive/restore retains the copied content, files and settings exactly. The variable/role/optional-approval cases above are mandatory before their named capabilities ship.

*Status:* done. Named EDIT-012 HTTP, built desktop/phone and public CLI archive journeys cover every current capability. Future capabilities inherit the full cases above. (`src/platter/duplicate.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### EDIT-013 — Documents without pricing.

A firm sends and signs documents that carry no pricing table, such as a statement of work, NDA, master services agreement or change authorization, built in the editor or uploaded as a PDF with fields (`EDIT-005`). Approval, sending, tracking, reminders and signing work as for any proposal; the payment step, deposit, invoice and accounting sync are skipped, and the agreement records that no amount was agreed.

*Acceptance:* Upload a two-page NDA PDF, place signature and date fields for two signers, approve and send, and sign as both: the agreement completes with its signed PDF and certificate, no payment step is shown, no invoice exists and the accounting fake receives no call.

*Status:* missing. Every proposal requires two priced options; there is no unpriced document type.

#### EDIT-014 — Client PDF download before signing.

A recipient can download a PDF of the revision they are viewing before signing, so their procurement team can circulate it, unless the firm turns this off per proposal or template. The PDF carries the selection made so far, the revision number and "Not signed" on every page, and each download is on the timeline (`TRACK-001`). The signed agreement PDF remains `SIGN-005`.

Every document capability available today conforms: a mailbox-verified invited client downloads the exact sent revision with their selected package, optional items and quantities, currency and integer-cent deposit. Every US Letter page says "Not signed, revision N"; it is an unsigned offer, never a signed agreement PDF or certificate. The owner enables or disables downloads per proposal, without changing its content or approval; a disabled download is absent and the route returns 403. The TEAM-004 timeline records each successful download with client, revision, option and server time. Settings and download history travel in PORT-002 archives, while invitation credentials stay local. `EDIT-002` inherits the template default; `EDIT-001` and `EDIT-005` inherit all added blocks and media; `TRACK-001` inherits its engagement timeline. Each extends the same named PDF assertions before shipping; `PRICE-002` package, optional-item and quantity selections already meet them.

*Acceptance:* As a verified client, choose a package and download the PDF: every page reads "Not signed, revision 2" and shows the chosen package, and the timeline lists the download; turn downloads off on another proposal and see no download action and the PDF route refused (403).

*Status:* done. Named EDIT-014 HTTP, 1440/390 browser and public CLI archive journeys assert exact revision and selected prices, every-page marking, Unicode and multipage content, owner setting, disabled/unauthorized/stale-link refusals, unchanged approval and offer, download timeline and archive custody. (`src/platter/documents/client-pdf.ts`, `src/platter/documents/offer-pdf.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### EDIT-015 — Locked template sections.

Template owners lock sections such as legal terms, warranties and payment terms. Members using the template can place and reorder a locked section but not edit it; owners, admins, managers and content editors lock and unlock sections in templates, and only the owner, an admin or a manager of the proposal's team unlocks one in a proposal (`TEAM-001`); and an unlock is recorded in the audit log (`TEAM-004`) and can trigger an approval rule (`APPROVE-001`). Locks are enforced on the server, not only in the editor.

*Acceptance:* Lock the terms section in a template; as a sales member try to edit it in the editor and through the API (both refused); as a content editor try to unlock it in a proposal (403); as an admin unlock it in one proposal and edit it, and see the unlock in the audit log and approval required before sending.

*Status:* partial. tests/platter.test.mjs — “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval” proves server refusals, lock preservation across copies/templates, scoped unlock, audit and legal review. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves sales editor refusal (403), content-editor unlock refusal, admin unlock/edit and required legal approval at 1440/390. The role CLI archive journey preserves exact locks and refuses restored unauthorized edits. Gap: locks cover the current native title/scope/terms/pricing/deposit sections; rich-section placement and reordering need EDIT-001.

#### EDIT-016 — Proposal search and folders.

Members search every proposal, template and agreement they may view under `TEAM-001` by title, client, contact, owner, status, amount, date and the full text of the content, including uploaded PDFs, and file proposals in folders with team access rules. Results and folders respect permissions on the server.

When proposal numbering ships, extend FOLLOW-002 with proposal-number tie-breaking after value and sent time, replacing its stable-id interim tie-break and extending the named journey.

*Acceptance:* Seed 500 proposals; search a phrase that appears only in the body of two proposals and one uploaded PDF and get exactly those three within one second; file proposals in a team folder and see a member outside the team find none of them by search or by folder.

*Status:* partial. Owner pipeline searches current proposal/agreement title, client name/email, recorded owner, status, scope, terms, package and pricing-line text using a case-insensitive literal phrase with whitespace collapsed (up to 200 characters). Search combines with existing field filters, sorting, currency totals, CSV export and scheduled reports. Gap: template and uploaded-PDF text search, folders, TEAM-001 member/team visibility and proposal numbering remain. (`src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`)

#### EDIT-017 — Client page in the client's language.

Each recipient sees the client page, emails, disclosures (`SIGN-003`, `TRACK-004`), verification and signing steps in their language: at least English, Spanish, French, German and Portuguese, set per recipient or taken from the browser. The firm's own content is never machine-translated without the firm's approval (`AI-002`), and the certificate of completion (`SIGN-005`) records the language shown.

*Acceptance:* Set a recipient to Spanish: the invitation email, client page controls, ESIGN disclosure, verification and signing steps are in Spanish, the string catalog check finds no untranslated English string on those screens, and the certificate records Spanish.

*Status:* missing. The client page and mail are English only.

#### EDIT-018 — Client-page preview before sending.

Before a revision is sent, anyone who may view the proposal under `TEAM-001`, including a collaborator, and every approver named on a pending approval step for it (`APPROVE-001`, `APPROVE-003`) opens a preview of that exact revision's client page as it will render after sending, with a width switch between desktop (1440 pixels) and phone (390 pixels). The preview is interactive as the client page is: choosing a package, toggling optional items and changing client-editable quantities (`PRICE-002`) recalculate the totals, discounts, sales tax (`PRICE-005`), deposit and payment schedule (`PRICE-007`) and show or hide conditional sections (`EDIT-009`) through the same server calculation the client page uses, and the same quantity limits apply. The member chooses the recipient or template role to view as (`SEND-003`, `SIGN-011`) and sees only that recipient's assigned fields and signing step, in that recipient's language (`EDIT-017`). Variables show their filled values, and an unfilled one is marked as `EDIT-004` would block it. An unsent negotiated revision of a sent proposal (`NEG-001`) is previewed the same way. A preview cannot be signed, accepted, paid, declined, commented on or submitted: those controls show but are disabled, and the matching requests made from a preview are refused (403). Opening or using a preview creates no revision, clears no approval, records no view or reading analytics (`TRACK-001` to `TRACK-003`), schedules no reminder, starts no expiry and sends no mail or text. A banner the client never sees marks the page as a preview, names the revision and the recipient viewed as, and links back to the editor. The preview is served on a member-only route under the member's own session: it is never reachable from a client link or a client session, and a client share token opens only the sent client page. An approval request (`APPROVE-002`) links to the preview of the exact revision awaiting approval, and an approval given after previewing binds that same revision (`PROP-001`).

*Acceptance:* Build a draft with three packages (Basic, Standard and Premium), an optional item, a client-editable quantity limited to 1 to 10, a timeline section shown only for Premium, sales tax, a 30% deposit and two signers, each with their own fields. Open the preview at 1440 and 390 pixels: both widths render the client page under the preview banner naming revision 1. Choose Premium, add the optional item and set the quantity to 4: the totals, tax, deposit and payment schedule update and the Premium timeline section appears; after approval and sending, the same choices on the client page show the same amounts to the cent and the same sections. Setting the quantity to 11 in the preview is refused, as on the client page. View as signer 2: only signer 2's fields show, and sign, accept and pay requests from the preview are refused (403). Afterwards the revision number and approvals are unchanged, and the proposal timeline, the tracking store, the reminder schedule, the mail fake and the SMS fake hold nothing from the preview. Submit the draft for approval: the manager named on the pending step opens the preview from the link in the approval request (`APPROVE-002`) and sees revision 1. A member outside the proposal's team is refused (403). Requesting the preview route without a member session, including from the client's verified session after sending, returns 401 with none of the proposal.

Current-capability obligation: every capability available today conforms: scope, terms, USD packages with optional items and quantities (`PRICE-002`) or historical AUD options with nearest-cent deposits, attachments, PDF controls, questions and opt-in text suggestions on the exact unsent draft or negotiated revision. Preview uses existing owner/member visibility; it grants no client invitation authority. EDIT-001/EDIT-005 inherit added content, PRICE-005/PRICE-007 tax and schedules on the PRICE-002 selection, EDIT-009 conditional sections, EDIT-004 variables, SEND-003/SIGN-011 recipient roles and fields, EDIT-017 language, TEAM-001 scoped member visibility, APPROVE-001/APPROVE-002/APPROVE-003 pending approver access and exact revision links, and TRACK-001–TRACK-003/FOLLOW-001/SEND-008 the absence of preview analytics, reminders and texts. FOLLOW-005, SIGN-003/SIGN-004/SIGN-007 and PAY-001/PAY-003/PAY-008 inherit disabled decline, signature and payment controls and direct-request refusals. Each must extend this same named journey before shipping; all full-target acceptance cases above remain mandatory then. Every later content, provider, record kind or public door inherits these preview obligations before shipping.

*Acceptance (current capabilities):* Named EDIT-018 public HTTP and built browser journeys at 1440 and 390 open exact draft, approved and negotiated revisions as owner/member, switch the client viewport, select both fixed options through the same server calculation as acceptance, compare actual sent content and accepted total/deposit, refuse invalid selections and stale revisions, and show disabled client submissions with direct preview requests refused (403). Signed-out and client-only sessions receive 401 with no content. Preview interactions preserve the complete public business state, including revision, approval, mail, expiry and client authority; TEAM-004 records only the member preview action, actor, subject and server time. Refusals add no audit row, and PORT-002 preserves the preview audit through the public CLI.

*Status:* done. Named public HTTP and compiled desktop/phone journeys assert all current capabilities; full-target cases are inherited by the clauses above. (`src/platter/preview.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

### Catalog and pricing

#### CAT-001 — Service and product catalog.

A catalog holds services and products with name, description, SKU, unit (hour, day, month, project or each), USD unit price, internal cost, default recurrence, taxable flag and tax code, income account, and images (uploaded, or fetched from a URL at import), which a pricing table set to show images displays on the item's line in the editor, the client page and the PDF. It imports from CSV with a reviewed preview (as `IMPORT-001`) and syncs from QuickBooks Online or Xero items and HubSpot or Salesforce products (`ACCT-001`, `ACCT-002`, `CRM-001`, `CRM-002`). Pricing tables add items from it; price changes never alter sent proposals.

*Acceptance:* Import 50 items from CSV with a preview, one row with an image URL served by a file-host fake, sync items from a QuickBooks Online fake, add two items to a pricing table set to show images and see the imported image on its line in the editor, the client page and the PDF, change an item's price, and see the sent proposal unchanged and a new draft use the new price.

*Status:* partial. Native USD catalog items now support name/description/SKU/unit/price/private cost, owner/admin/manager versioned editing and reviewed insertion into independent drafts. tests/platter.test.mjs — “TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals” proves no-write role refusals, private cost copying, immutable sent prices, stale-price refusal and new draft pricing. The named role browser and CLI journeys prove 1440/390 controls and exact custody. Imported catalog metadata and image originals remain review-only records; no imported metadata is charged automatically. Gap: recurrence, tax/account metadata, native image editing/rendering and provider item synchronization remain.

#### PRICE-001 — USD pricing tables with line items.

A proposal has any number of pricing tables in USD, each with line items (name, description, quantity, unit, unit price), groups, subtotals and a grand total. All arithmetic is in integer cents with stated rounding, and totals are recomputed on the server. This replaces the first release's two GST-free AUD options for every new proposal; existing records keep their form under `PRICE-008`.

Each current package may carry any number of tables; its grand total is the sum of their subtotals. A package without tables keeps its explicitly entered fixed USD total. Quantities are positive thousandths of a named unit (0.001 to 1,000,000), unit prices are positive USD amounts with at most two decimal places, and each quantity × unit-price line rounds half up to the nearest cent before group, table and package summation. A package is between $0.01 and $10,000,000. Submitted subtotals and grand totals never override server arithmetic. Existing historical AUD proposals keep their original form. Tables, descriptions, quantities, units, prices, group subtotals and totals travel unchanged through exact-revision approval/send, member preview, comparison/restoration, duplication, negotiated drafts, the client page, selected unsigned PDF, acceptance and PORT-002 archives. Any PRICE-002 package can carry tables, and its selected optional items add to the table total; EDIT-001/EDIT-005 and SIGN-005 inherit their added document/PDF carriers before shipping.

*Acceptance:* Build two tables with 12 lines, quantities and units, and see the server totals match a cent-exact fixture; send malformed quantities and prices (400); reload and see identical totals in the client page and the PDF.

*Status:* done. Named PRICE-001 public HTTP, built-browser journeys at 1440/390 and public CLI archive/restore assertions cover twelve lines in two grouped tables, exact rounding and totals, invalid-input refusals, every current content carrier and frozen acceptance. (`src/platter/pricing.ts`, `src/platter/ui/pricing.ts`, `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs`)

#### PRICE-002 — Packages and optional items the client chooses.

A proposal offers any number of packages (good, better, best) and optional items the client can add or remove. Quantities can be client-editable within a minimum and maximum the firm sets. Totals, tax, deposit and the payment schedule update as the client chooses, and the agreement records exactly the selection signed. The sender and approvers try the same choices before sending in the `EDIT-018` preview, which uses the same calculation.

Expanded package, optional-item and quantity choices extend EDIT-014’s selected-price and deposit assertions before shipping.

Current-capability obligation: every capability available today conforms. A proposal offers one or more packages, each priced by a fixed USD amount or by `PRICE-001` tables, with any number of optional items. Each item has a USD unit price, a whole-number default quantity and inclusive minimum and maximum from 1 to 1,000,000, and is fixed or client-editable; items start unselected and each is chosen at most once. Switching packages starts a fresh optional-item selection on the server, including when JavaScript is unavailable. The server adds each selected quantity × unit price in integer cents to the package total, refuses a selected total over $10,000,000, and rounds the percentage deposit to the nearest cent, half up; that deposit is today's whole payment schedule, and no sales tax is calculated. The `EDIT-018` preview, the client page, the unsigned PDF (`EDIT-014`), typed acceptance and client-signed uploads (`SIGN-008`) use that one calculation, and a scope or terms section can depend on one package or one optional item (`EDIT-009`). `PRICE-005` (tax), `PRICE-007` (fixed deposits, milestones and net terms) and `PRICE-003` (recurring fees) inherit this obligation: before shipping, each makes its amounts follow the same package, optional-item and quantity selection in the preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

*Acceptance:* Offer three packages and two optional items with an editable quantity between 1 and 10; as the client choose the middle package, add one item and set quantity 4; the server totals, agreement and PDF all show that selection; quantity 11 is refused.

*Status:* done. Named PRICE-002 HTTP, 1440/390 browser and public CLI archive journeys cover three packages, two optional items, middle-package selection with quantity four, quantity-eleven refusal, server totals, the every-page unsigned PDF and the immutable agreement; add/remove, invalid and duplicate items; the preview's same calculation with preview acceptance refused (403) and no writes; package- and optional-item-conditioned sections chosen in the editor and shown in preview, client page, PDF and agreement only for their selection; tables on any package; comparison/restoration, duplication and negotiated-offer custody; client-signed uploads recording the same selection with sent prices, agreement, deposit invoice and original bytes; and archive restore. Selection-driven tax and schedule amounts are inherited by `PRICE-005`, `PRICE-007` and `PRICE-003`. (`src/platter/pricing.ts`, `src/platter/selection.ts`, `src/platter/conditional.ts`, `src/platter/ui/packages.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs`)

#### PRICE-003 — One-off and recurring fees.

Line items can be one-off or recurring (weekly, monthly, quarterly or annual) with a term and start date. The proposal shows one-off total, recurring amount per interval and first-year value separately. Recurring lines drive the payment schedule (`PAY-003`) and renewal date (`RENEW-002`).

Before shipping, extend FOLLOW-002 value ordering with one-off total plus first-year recurring value, retaining exact currency labels and separate totals. Before shipping, one-off and recurring amounts on packages and optional items follow the client's `PRICE-002` selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

*Acceptance:* Add a $2,500 one-off setup and a $1,200 monthly retainer for 12 months; the client page shows one-off $2,500, $1,200 a month and first-year value $16,900; acceptance creates a matching schedule.

*Status:* missing. One-off totals only.

#### PRICE-004 — Discounts.

Discounts apply to a line, a group or the total, as a percentage or a fixed amount, optionally shown to the client and optionally expiring on a date. A discount over the threshold an admin sets routes the proposal for approval (`APPROVE-001`).

*Acceptance:* Apply 10% to a group and $500 off the total, see cent-exact totals; set an approval threshold of 15% and see a 20% discount require approval before sending.

*Status:* partial. Visible package percentage discounts now recompute cent-exact base and optional-selection prices, deposits and private line/package margins; templates, duplication, negotiation, JSON and PDFs retain the frozen discount. tests/platter.test.mjs — “PRICE-004 / APPROVE-001 visible package discounts preserve exact optional totals, private margins, templates and public PDF/JSON custody” proves money, privacy, malformed-input no-write refusals and deterministic cent allocation. APPROVE-001’s named condition journey and the role browser journey prove the 15% threshold and 20% manager/owner route. Gap: line/group discounts, fixed amounts, optional concealment and discount expiry remain. Those fields inherit APPROVE-001 evaluation before they ship.

#### PRICE-005 — US sales tax.

Each line is taxable or not under a tax code. Tax is calculated from the client's service or billing address by one of three methods the owner picks: owner-configured rates, Stripe Tax or Avalara AvaTax. Owner-configured rates are set per jurisdiction as state, county, city and special-district components with effective dates; Platter sums the components that apply to the address, computes tax on the taxable subtotal per jurisdiction in integer cents rounded half up, and freezes the rate used with the sent revision, so a later rate change never alters a sent quote. With Stripe Tax or AvaTax, Platter sends each line's amount, tax code and the addresses, applies the returned tax to the cent, and commits the AvaTax transaction when the invoice is issued. A tax-exempt client uploads an exemption or resale certificate, which is stored with the agreement. Tax shows as its own line and flows to invoices with the matching tax code (`ACCT-001`, `ACCT-002`). Platter calculates; filing returns stays with the tax service (see Honest boundaries).

Before shipping, tax follows the client's `PRICE-002` package, optional-item and quantity selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys.

*Acceptance:* With owner-configured rates for Austin, Texas (state 6.25%, city 1% and transit authority 1%, 8.25% in all), quote a $1,000.00 taxable line and a $500.00 non-taxable line to an Austin client and see $82.50 tax as its own line, and the same quote to a Portland, Oregon client with $0.00 tax; give the city rate a new value with a future effective date and see the sent quote unchanged. Run the same two quotes through a Stripe Tax fake and an Avalara AvaTax fake: each fake's request carries the line tax codes and addresses, the returned tax is applied to the cent, and the AvaTax transaction is committed when the invoice is issued. Mark a client exempt with a certificate and see zero tax; sync the invoice and see the tax code in the QuickBooks Online fake.

*Status:* missing. No tax handling beyond a fixed GST-free export.

#### PRICE-006 — Internal cost and margin.

Line items carry internal cost (from the catalog or entered), and the editor shows margin per line, per package and in total. Cost and margin are visible only to the roles `TEAM-001` allows (owner, admin, manager and billing) and never appear in the client page, PDF, client API or webhooks.

*Acceptance:* Price a package with costs, see margin per line and total as an owner, then load the client page, PDF, client API response and webhook payload and find no cost or margin; a sales role without cost access sees none either.

*Status:* partial. Version-bound internal unit costs now produce cent-exact line costs and line/package margins. Only owner, admin, manager and billing proposal views carry internalPricing; billing reads but does not edit proposals. Sales, content editor, viewer and agent responses omit it. The separate /api/platter/internal-pricing.pdf export requires those same read rights and proposal scope; public offer PDFs always use the public snapshot and contain no costs. tests/platter.test.mjs — “TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs” proves the amounts, role/API/private-PDF boundaries, public-page/PDF exclusion, revisions, negotiation, restoration, duplication and personal templates. The named team browser journey proves manager cost editing and sales exclusion at 1440/390; the role CLI journey restores exact costs and templates. Optional-item and flat-package costs now ship with selected/base totals. tests/platter.test.mjs — “TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state” proves exact optional quantities, selected total margins, template/catalog carryover, unverified and cross-invitation refusal, and absence of private fields from the new mailbox-verified /p/<invitation>/data.json projection. The named role browser and CLI journeys prove 1440/390 total selectors, selected margins and exact custody. Gap: outbound webhook payload proof remains when AUTO-004 adds that door; no lifecycle webhook is currently sent. AUTO-004 inherits the cost-free public projection before its webhook capability ships.

#### PRICE-007 — Payment terms and schedules on the proposal.

Payment terms are part of the offer: a deposit as a percentage or fixed amount, milestones by date or by event (such as design approval), net 15 or net 30 invoices, and recurring charges. A proposal's terms are copied from its template (`EDIT-002`) when it is created, and the sender changes them per proposal before sending without changing the template. The client sees the schedule before signing, and the accepted schedule is frozen with the agreement and drives `PAY-002` and `PAY-003`. Before shipping, every schedule amount follows the client's `PRICE-002` package, optional-item and quantity selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys; today's percentage deposit already does.

*Acceptance:* Set a 30% deposit, two milestones and a monthly retainer on net 15 terms; as the client see the schedule with dates and amounts; accept and read the same frozen schedule back. Start a proposal from a template whose terms are a 30% deposit and a net-15 milestone: the proposal opens with those terms; change its deposit to 25% and the template still holds 30%.

*Status:* partial. One deposit percentage only; no fixed deposits, milestones, net terms or schedule. (`src/platter/commands.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs`)

#### PRICE-008 — First-release AUD agreements stay exact.

Amounts carry an explicit currency. When an installation moves to USD pricing, proposals and agreements created under the first release keep their AUD, GST-free form, totals, deposit and invoice CSV exactly, labeled with their currency, and are never converted. New proposals use USD; revising or restoring an existing proposal retains its currency. The additive migration labels first-release rows AUD without rewriting their immutable snapshot strings or retained invoice bytes, including when restored from a pre-currency archive. Currency metadata applies to proposal, revision, acceptance and invoice records. USD deposit CSVs use `No Tax` because Platter does not yet calculate sales tax (`PRICE-005`); this is not a tax-exemption determination or evidence of successful accounting import (`ACCT-005`).

*Acceptance:* Restore a first-release archive with an accepted AUD proposal into a target build, and see the agreement, deposit and CSV byte-identical and labeled AUD while new proposals are USD.

*Status:* done. Named PRICE-008 CLI journey restores a genuine pre-currency archive, compares all legacy proposal/revision/acceptance/invoice fields byte-exact apart from additive AUD metadata, and accepts/exports a new USD proposal; named browser journey checks legacy AUD and new USD owner/client screens at 1440 and 390. (`migrations/core/0017_currency.sql`, `tests/archive.test.mjs`, `tests/site.test.mjs`)

### Collaboration and approvals

#### COLLAB-001 — Real-time team editing.

Several members edit one draft at the same time and see each other's cursors and changes live. Concurrent text edits merge; a conflicting structural edit, such as editing a deleted block, is shown with a restore option and never resolved silently. Pricing edits are checked on the server.

*Acceptance:* A two-browser journey: two members type in the same section and see the same text within one second; one deletes a block the other is editing and the second is offered restore.

*Status:* partial. Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

#### COLLAB-002 — Internal comments, mentions and assignments.

Members leave internal comments on any block, mention a colleague, and assign a section to someone with a due date. Mentions and assignments notify by email and chat (`AUTO-003`). Internal comments are never visible to the client and never appear in the PDF or client API.

*Acceptance:* Comment on a pricing table mentioning a colleague, who gets a notification and resolves it; assign a section; the client page, PDF and client API show no internal comment.

*Status:* missing. No internal comments.

#### COLLAB-003 — Version history with compare and restore.

Every saved revision is listed with author and time. A member compares any two revisions, with text, line-item and price changes highlighted, and restores an earlier draft revision as a new revision that needs approval again. This covers every field and priced option the product supports today. `PRICE-001` inherits comparison of each added line-item field before it ships; `EDIT-001` and `PRICE-007` inherit comparison and restoration of their added document and payment-term fields. Restore retains the proposal identity, creates the next revision under the current actor and time, preserves earlier snapshots, clears current approval and is refused for sent or accepted offers.

*Acceptance:* Make three revisions, compare the first and third and see the changed price and text, restore the first as revision four and see approval required.

*Status:* done. Named COLLAB-003 HTTP and 1440/390 browser journeys exercise saved authors and times, text/option/price comparisons and restoration into an unapproved fourth revision. (`src/platter/history.ts`, `src/platter/ui/history.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`)

#### APPROVE-001 — Approval rules and routing.

Admins set approval rules by total value, discount, margin, payment terms, edited legal terms or template, and route each to named people or an approver role (owner, admin or manager, as `APPROVE-003` sets), in sequence or in parallel. A named person must hold the owner, admin, manager or billing role; a rule naming a sales member, content editor or viewer is refused when saved (400), and a named billing user approves only the steps that name them (`TEAM-001`). A rule applies to all proposals or to chosen templates, and a step whose condition does not hold for the current revision is skipped, as with the incumbents' conditional approvals. Whether a proposal that matches no rule needs approval at all is the `APPROVE-003` policy setting. `PROP-001`'s exact-revision binding applies to every approver.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with awaiting approval, including filters, sorting, counts and totals under its visibility rules.

*Acceptance:* Set rules: over $25,000 needs a manager, a discount over 15% needs the owner. A $30,000 proposal with 20% discount needs both in order; editing after the first approval clears both. A parallel rule routes edited legal terms to a named admin (counsel) and a named billing user (finance) at once: it completes only when both approve, in either order, and one rejection stops it; a second billing user not named in the rule is refused (403), and saving a rule that names a sales member is refused (400).

*Status:* done. tests/platter.test.mjs — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” proves the $30,000/20% manager-then-owner sequence, exact-revision clearing, skipped conditions, unknown/low-cost review, deposit/standard-term rules and template scopes/provenance. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves parallel named admin/billing approvals in either order, rejection, unnamed-billing refusal and invalid sales approvers. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves discount editing, clearing, manager/owner approval, send and client acceptance at 1440/390. The named thirty-proposal REPORT-001 fixture proves awaiting-approval filters/sorts/counts/totals; the named role CLI archive journey preserves every current condition, source template and exact decision. Current semantics: total thresholds compare gross value before discounts and maximum offered optional quantities; discount rules compare package percentages; margin rules review missing costs and require all offered package/optional margins to meet the threshold with conservative optional cent rounding; payment-term rules compare the current deposit and optional exact standard terms. PRICE-004 line/group/fixed/expiry discounts, PRICE-007 schedules/net terms and EDIT-002 future template fields inherit these rule and named-journey obligations before those fields ship.

#### APPROVE-002 — Approval requests that reach the approver.

An approval request reaches the approver by email, Slack, Microsoft Teams, Nook or mobile push, with a summary of what triggered the rule and a link to the client-page preview of the exact revision awaiting approval (`EDIT-018`). The approver approves or rejects with a note from the request, including on a phone (`MOB-001`). Overdue requests remind the approver and the requester sees who holds it.

*Acceptance:* Submit a proposal that needs approval: the Slack fake's request and the email each carry a link that opens the `EDIT-018` preview of the revision awaiting approval, under the approver's session. Approve it from the Slack fake's action, reject another from email with a note, and see an overdue reminder after the set delay.

*Status:* missing. No approval notifications.

#### APPROVE-003 — Who approves, who sends and what needs approval.

One approval policy governs every proposal, negotiated revision (`NEG-001`), duplicate (`EDIT-012`), drafted proposal (`AI-001`), move-in reissue (`MIG-005`), public signing link (`SEND-009`) and approval made from a phone (`MOB-001`), using the roles of `TEAM-001`. **Who approves:** the owner, admins and managers, each only for an approval step whose rule names them or their role (`APPROVE-001`), and a manager only for proposals owned by their team; a billing user only for a step whose rule names them personally, such as finance approving payment terms; sales members, content editors, viewers and agent keys never approve, nor does a billing user on a step that does not name them (403, no write). **Who sends:** the owner and admins send any proposal, managers send their team's, and sales members send their own, including proposals shared with them as a collaborator (`TEAM-001`); sending includes fresh invitations (`PROP-002`), revisions (`NEG-001`), signer replacements (`SEND-007`) and withdrawal (`SEND-010`); content editors, viewers, billing users and agent keys never send (403). **What needs approval:** a proposal needs approval when an `APPROVE-001` rule matches its current revision. The owner or an admin sets "approval required for every proposal": when it is on, a proposal that matches no rule needs approval from the policy's default approver (the owner, or the admin or manager role the owner names); when it is off, a proposal that matches no rule is sent by anyone who may send it, with no approval record, as with an incumbent template that carries no approval workflow. A draft prepared or last revised by an agent key always needs approval from an approver role, whatever the setting. A new installation starts with the setting on and the owner as default approver, which is the first release's behavior (`PROP-001`). **Binding:** every approval that applies binds the exact revision (`PROP-001`); an edit clears all of them and the rules are evaluated again against the new revision. Only the owner and admins change the policy, and each change is in the audit log (`TEAM-004`).

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with awaiting approval, including filters, sorting, counts and totals under its visibility rules.

Before shipping, extend EDIT-012 duplication assertions for approval-required copies (409 until approval) and copies matching no rule when approval is off (the owning sales member sends immediately).

*Acceptance:* With a rule "over $25,000 needs a manager" and "approval required for every proposal" off: a sales member sends a $3,000 proposal that matches no rule, and the send succeeds with no approval record and no 409. A $30,000 proposal is approved by a manager and sent by the sales member who owns it. Editing it after that approval clears the manager's approval, and its send returns 409 until a manager approves the new revision. A sales member's attempt to approve it returns 403. A $3,000 draft prepared by an agent key is refused at send (409) until a manager approves it. A content editor's send returns 403, and a sales member's send of another member's proposal returns 403. Switch "approval required for every proposal" on: the unruled $3,000 send is refused (409) until the owner approves it. A sales member's attempt to change the policy returns 403, and the owner's change appears in the audit log with actor and time. A manager's approval of a proposal whose sales owner is outside their teams returns 403. The owner names the manager role as default approver: the unruled $3,000 proposal is approved by a manager of its team and sent; the owner then names the admin role instead, and on the next unruled proposal a manager's approval returns 403 while an admin's succeeds.

Current rule semantics: total-value thresholds compare integer cents in the rule’s currency against the highest offered package including all optional quantities at their permitted maximum; currencies are never converted. Edited legal terms compare against the first draft. An agent’s original preparation remains approval-bound after a human revision. A policy or rule change reevaluates approval eligibility against the current revision; it never changes a sent offer’s content. A matching revision is rejected until revised after any rejection. Rule order uses the saved sequence then the stable rule id; parallel approvers within one rule may act in either order.

*Status:* done. One approval policy now covers all current preparation, template, duplication, negotiation, approval, sending and fresh-invitation doors. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves unruled sales sends with no approval record, manager amount approval, exact-revision invalidation, sales/content-editor/foreign-owner refusals, agent-origin approval after human edits, policy authority and audit, manager team scope, owner/admin/manager defaults, approval-required and approval-free copies, and sales negotiation. tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership” proves awaiting-approval filters, sorting, counts and totals under role visibility; tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves the sales and manager screens at 1440/390; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves policy and exact-revision custody.  tests/mail.test.mjs — “APPROVE-003 / TEAM-001 a sales sender owns bounce correction, foreign senders are refused, and every fresh invitation obeys the current approval policy” proves the matching active sender’s correction door, a foreign sender’s 403, and current-policy reapproval before a fresh corrected invitation. No acceptance point remains unproved for current doors; future doors named in the clause inherit this same policy before shipping.

### Sending and delivery

#### SEND-001 — Send from the firm's own mailbox.

A member connects Gmail or Google Workspace (OAuth `gmail.send`) or Microsoft 365 or Outlook (Graph `Mail.Send`) and sends proposals, reminders and replies as themselves. Replies thread back to the proposal. Tokens follow `SEC-001`. Without a connected mailbox, mail goes through the installation's branded sender (`EDIT-008`).

*Acceptance:* Connect Gmail and Microsoft 365 fakes, send a proposal from each, reply from the client side, and see each reply on the proposal timeline; revoke the token and see sending fall back with a visible notice.

*Status:* partial. Google and Microsoft mailbox identity checks and encrypted own-mailbox connections ship, proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Gap: provider OAuth refresh, sending and inbound replies through those mailboxes and visible fallback remain. Conservative default pending ct approval: the verified mailbox must match the member’s sign-in address.

#### SEND-002 — Delivery status and bounce handling.

Each send shows queued, accepted by provider, delivered, deferred, bounced or complained from signed provider webhooks. A bounce notifies the sender and opens a follow-up (`FOLLOW-002`) to correct the address. Provider acceptance is never shown as delivery.

Today this covers the installation's signed-event providers, Resend and SendGrid. Cloudflare mail displays “Delivery events unavailable with this mail transport”; no signed HTTP event intake is claimed for it. Any transport that gains signed events, including future mailbox, recipient and SMS doors (`SEND-001`, `SEND-003`, `SEND-008`), inherits this obligation before shipping. Delivery means the provider reported recipient mail-server acceptance, never human receipt. Signed callbacks must correlate the provider message (or SendGrid's signed delivery id) and exact recipient; duplicate callbacks do not repeat work, and a terminal state cannot regress to queued, accepted or deferred.

Under today's owner-only sending policy (`APPROVE-003`), the sending owner receives a durable in-app bounce notice and a separate open address-correction follow-up. Reading the notice does not close the follow-up. Only that active owner corrects the invitation address and explicitly sends a fresh invitation, rotating the old link and verification session under `PROP-002`, without changing client identity or the frozen offer. Verification codes go to the corrected invitation address. Provider acceptance of the correction closes the follow-up; an uncertain outcome keeps it open. The owner may instead dismiss it with a logged reason. Notices and logged follow-up actions survive `PORT-002` archives; mail bodies, links, attempt history and provider receipts remain excluded under `PORT-001`.

*Acceptance:* Send three proposals through the installation's mail-provider fake that reports delivered, deferred then delivered, and hard bounce; see each state, the bounce notification and the follow-up item. Signed Resend and SendGrid public HTTP journeys assert correlation, replay refusal, complaint, queued and uncertain states, owner authority, reading without closing, explicit address correction and logged dismissal. Browser journeys at 1440 and 390 exercise the delivery history and correction; a public CLI journey restores both open and resolved bounce follow-ups. These fakes prove Platter's handling, not live provider delivery.

*Status:* done. (`src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### SEND-003 — Recipients, roles and sharing.

A proposal has any number of recipients with a role: signer, client-side approver, viewer or CC. A proposal created from a template starts with the template's role slots, fields and order (`SIGN-011`), and sending is refused (409) while a signer, approver or countersigner slot is unfilled. Each recipient has their own link and verification. Before sending, the sender previews the client page as each recipient (`EDIT-018`). The firm can also share by link (with verification) or embed the proposal on its site. Removing a recipient revokes their link, and withdrawing the proposal revokes every link at once (`SEND-010`). Replacing a signer on a sent proposal is `SEND-007`, and a signer delegating is `SIGN-009`.

Every recipient role and shared link extends SEND-010 revocation and its named all-recipient 410, notice and no-content assertions before shipping.

*Acceptance:* Add a signer, a CFO approver and a viewer; each opens their own link; the viewer cannot sign; remove the viewer and see their link refused.

*Status:* missing. One client recipient per proposal.

#### SEND-004 — Expiry and reopening.

A proposal expires a set number of days after it is sent (its expiry period, copied from its template or the workspace defaults under `FOLLOW-006`), or on a date the sender picks, or never when the sender removes it; the client page shows the expiry date. When the warning is on, each unsigned signer gets the `SEND-006` expiry notice the set number of days before expiry. The sender changes the expiry before and after sending. After expiry the client sees an expired page and can ask the firm to reopen it; the owner extends or reissues. An accepted agreement never expires.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with expired, including filters, sorting, counts and totals under its visibility rules.

Every capability available today conforms. The owner sets calendar days, an explicit YYYY-MM-DD date, or no expiry on a draft or sent offer. The installation time zone is UTC until set; the zone is copied at expiry configuration and first send, and an existing deadline keeps its stored zone until changed. The deadline is the start of the expiry date, with calendar-day arithmetic and daylight saving honored. An older sent offer with no retained send timestamp refuses a days-based setting (409), explains why on the owner offer, and offers an explicit date or negotiated reissue; creation time is never treated as send time. A fresh invitation keeps its first-send date and expiry; an approved negotiated revision sent under NEG-001 starts the period again. A fixed, honestly labeled automatic warning is queued once for the current unsigned signer at the start of its warning date; uncertain provider attempts are never resent blindly. Accepted agreements never expire. Verified clients request reopening; the owner extends/removes expiry on the same links or approves and sends a new negotiated revision. Requests, settings and warning facts survive PORT-002 without credentials or transport mail. TEAM-004 audits configuration, requests and warnings.

`FOLLOW-006` inherits workspace/template defaults, `SEND-006` editable expiry notices and `SIGN-004` every unsigned recipient, each extending this same named calendar, warning and reopening journey before shipping.

*Acceptance:* Send with a 7-day expiry, advance the clock and see the client page expired with a reopen request, extend it, and accept. Send another proposal on 1 March with a 14-day expiry period and the warning on 1 day before: the client page shows 15 March, each unsigned signer's expiry notice reaches the mail fake on 14 March and the signed one gets none, and on 15 March the page is expired; extending it to 22 March reopens the same links.

*Status:* done. Named SEND-004 and REPORT-001 HTTP/Worker, 1440/390 browser and CLI archive journeys assert calendar days and explicit dates, exact DST boundaries, one warning only for unsigned offers, same-link extension and accepted immutability, negotiated reissue, owner-only controls, expired reporting and custody. (`src/platter/expiry.ts`, `src/platter/expiry-time.ts`, `src/platter/ui/expiry.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### SEND-005 — Completion and activity notifications.

The sender and watchers are notified when a proposal is first viewed, commented on, signed, declined, paid or fails payment, by email, Slack, Microsoft Teams, Nook or push, under per-person preferences that choose the events and channels for each person.

*Acceptance:* Watch a proposal with Slack and email on; open, comment, sign and pay as the client; see four notifications in each channel fake with links back to the proposal. A second watcher who turned view notifications off and chose email only gets three emails and no Slack message.

*Status:* missing. No notifications to the sender.

#### SEND-006 — Editable subject, message and shared email templates.

Every send, reminder (`FOLLOW-001`), fresh invitation (`PROP-002`), revision send (`NEG-001`), signer replacement (`SEND-007`) and net-terms invoice (`PAY-008`) shows the email before it goes, with an editable subject and personal message. Admins keep shared email templates per event (send, reminder, expiry notice, invoice, completion) with variables from `EDIT-004` such as `{client.first_name}`, `{client.company}`, `{proposal.title}`, `{sender.name}` and `{proposal.expires_on}`; they set the default template per event and per proposal template, and can lock a template so members pick it but do not edit it. A variable with no value blocks the send as in `EDIT-004`. A scheduled reminder uses the template the sender chose, and the sender can edit its text before it goes. The exact subject and body sent, after filling, are kept on the proposal timeline with recipient and time and in the agreement package. The verification code email (`SIGN-001`) keeps fixed wording. Before sending, anyone who may edit or send the proposal sends a test to themselves: the filled subject, prefixed "[Test]", and body go only to the member's own sign-in address, never to a recipient, and the message's proposal link opens the `EDIT-018` preview under a member session instead of a client link. A test send needs no approval, freezes nothing, creates no revision, records no view, schedules no reminder, is never put in the agreement package, and is listed on the proposal timeline as a test send; it is limited to 10 per member per proposal per day (429).

Editable expiry notices extend SEND-004’s named unsigned-warning, exact-date and one-claim assertions before shipping.

Add an editable withdrawal notice template to SEND-010, with its exact subject/body and per-recipient assertions before shipping.

*Acceptance:* Save a template with subject "Proposal for {client.company}" and a body starting "Hi {client.first_name},"; send with it to Dana at Acme: the mail fake and the timeline both hold the subject "Proposal for Acme" and the body "Hi Dana," exactly. Edit the text of the scheduled second reminder: the first reminder in the mail fake carries the template text and the second carries the edited text. Send with an unfilled variable (refused, naming it); as a member edit a locked template's text (refused). On an unapproved draft, send a test to me: the mail fake holds exactly one message, to the member's own address, with the subject "[Test] Proposal for Acme"; its link opens the preview with the member's session and returns 401 without one; the proposal is still an unapproved draft at the same revision, with no tracking record, no reminder scheduled and no client link; a request that names another address for the test is refused (400), and the eleventh test that day is refused (429).

*Status:* partial. Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Gap: shared/default/locked templates, filled variables, editable reminder/invoice/expiry/withdrawal/completion messages and a complete agreement package remain. (`src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### SEND-007 — Replace an unsigned signer on a sent proposal.

When the client says someone else signs ("our COO signs, not me"), the sender replaces a recipient who has not signed on a sent proposal, with a reason. The offer, its revision and its approvals are unchanged and no re-approval is needed. The replaced recipient's link and verification session are revoked at once; the new signer gets their own link and identity check (`SIGN-001`, `SIGN-006`), the same place in the signing order (`SIGN-004`) and the message of `SEND-006`. The replacement (who, by whom, when and why) is on the timeline and in the certificate of completion (`SIGN-005`). A recipient who has signed can never be replaced, and nothing is replaced on an accepted agreement.

Replacing a recipient preserves SEND-010 revocation: withdrawal leaves replaced and current invitation links refused; extend its named assertions before shipping.

*Acceptance:* Send revision 2 with the client CEO as signer and replace the CEO with the COO: the proposal is still revision 2 with its original approval and no new approval request; the CEO's link is refused; the COO verifies and signs; the certificate lists the replacement with reason and time. On another proposal sign as the CEO, then try to replace the CEO (409).

*Status:* missing. One client recipient fixed at sending; a fresh invitation (`PROP-002`) rotates the link but cannot change who receives it.

#### SEND-008 — Sending and reminders by text message.

A sender delivers the proposal link, reminders and completion notices by text message to a US mobile number through Twilio, alongside or instead of email. Texts go from a registered A2P 10DLC number or toll-free number, record the recipient's consent, honor STOP and HELP under carrier rules and the TCPA, respect the quiet hours of `FOLLOW-001`, and appear on the timeline with their delivery status.

SMS reminders are cancelled atomically by SEND-010 withdrawal; extend its named clock-advance and recipient-notice assertions before shipping.

*Acceptance:* With a Twilio fake: send a proposal by text and see the message with its link on the timeline with the delivery callback state; reply STOP and see later reminders by text suppressed while email reminders continue; a text reminder due at 6 am in the recipient's time zone waits until quiet hours end.

*Status:* missing. Email only; no SMS.

#### SEND-009 — Reusable public signing link.

A template can be published as a reusable public link or site embed, like PandaDoc Forms: any visitor enters their name, email and company and the template's form fields (`SIGN-007`), chooses optional items, verifies their mailbox (`SIGN-001`) and signs (`SIGN-003`) as the template role the firm marks as the public signer, while the template's other roles, such as a pre-assigned countersigner, keep their assignment (`SIGN-011`); each submission creates its own proposal and agreement from the template revision that was approved for publishing under `APPROVE-003`. The visitor cannot change prices or terms. The firm sets a submission cap and an expiry for the link itself; each submission's proposal takes the template's reminder schedule and expiry period, counted from the submission (`FOLLOW-006`). The firm can require its countersignature (`SIGN-004`) before an agreement completes, and can disable the link at once. Submissions reach the CRM (`CRM-001` to `CRM-004`), follow-up (`FOLLOW-002`), payment (`PAY-002`) and reports like any proposal.

*Acceptance:* Publish a template with a $500.00 deposit as a public link and submit it as two visitors: two separate agreements exist, each with its own signer, field values, certificate and deposit; a request that changes a line price is refused (400); with countersignature required, neither completes until the owner countersigns; disable the link and see the next visit refused (410); edit the template and see the link refused until the new revision is approved for publishing.

*Status:* missing. Every proposal has one invited recipient; there is no public link or embeddable form.

#### SEND-010 — Withdraw a sent proposal.

Anyone who may send a proposal under `APPROVE-003` withdraws it, with a reason, when it was sent in error or the deal is off. Withdrawal revokes every recipient's link and verification session at once (signers, approvers, viewers and CC, and links shared under `SEND-003`), cancels scheduled reminders by email and text (`FOLLOW-001`, `SEND-008`), voids its unpaid payment links (`PAY-001`) and closes its follow-ups (`FOLLOW-002`). A recipient opening a revoked link sees a withdrawn page with the firm's contact details and none of the proposal. Each recipient gets a notice using the `SEND-006` withdrawal template unless the sender turns the notice off. A proposal one signer has already signed can still be withdrawn before the agreement completes; that signer is told, and their signature stays in history marked void. A completed agreement is never withdrawn (409); it ends under its own terms. A withdrawn proposal is read-only, and the firm sends it again only as a new revision (`NEG-001`) under the approval policy, with new links. The withdrawal (who, when and why) is on the timeline and in the audit log (`TEAM-004`), and marking a proposal lost (`FOLLOW-005`) withdraws it the same way.

Current capability boundary (ct, 20 October 2026): DONE covers the current single invited mailbox and owner-only sending policy. The owner withdraws with a non-empty reason, with notice on unless explicitly turned off. The withdrawn offer is read-only; old invitation, verification, PDF and attachment doors return a proposal-free 410 page with the withdrawing firm's contact address. Open client questions and bounce follow-ups close, expiry warnings stop, and the actor, time and reason remain in proposal history and the audit log. A new NEG-001 revision requires approval before reissue; old withdrawn links remain refused. SEND-003 and SEND-007 inherit revocation of every current or replaced recipient and sharing link; FOLLOW-001 and SEND-008 inherit cancellation of email/text reminders; PAY-001 inherits voiding unpaid payment links; FOLLOW-002 inherits follow-up closure; SIGN-004 inherits notification and retained void signatures after partial signing; FOLLOW-005 inherits the same withdrawal with notice off by default for a lost outcome; SEND-006 inherits the editable withdrawal notice template. Each capability must extend the named SEND-010 public-door assertions before it ships.

*Acceptance:* Send a proposal to a signer, a CFO approver, a viewer and a CC, with reminders scheduled and a deposit payment link, and withdraw it with the reason "Sent to the wrong client": all four links show the withdrawn page with none of the proposal and the client API returns 410 for each; no reminder goes when the clock passes its time; the payment link is refused; the mail fake holds one withdrawal notice per recipient; the timeline and audit log record actor, time and reason. A sales member's withdrawal of another member's proposal is refused (403). Withdraw a two-signer proposal after the first signer signed: the second signer's link is refused and the first signature shows as void. Withdrawing an accepted agreement is refused (409). Revise the withdrawn proposal into revision 2, approve and send it: its new links work and the revision 1 links stay refused.

*Acceptance (current capabilities):* Current-capability acceptance: send to the one invited signer, verify, ask a question, set an expiry warning, and withdraw with "Sent to the wrong client". Every old client door returns 410 with no proposal content; the notice is captured once, questions leave the open queue, and the clock produces no warning. Timeline and audit retain actor, time and reason; pipeline filters/counts/totals include withdrawn. A member cannot withdraw (403), withdrawn mutations are refused (409), notice off sends no mail, and an accepted agreement cannot be withdrawn (409). Prepare revision 2, require approval, reissue and accept it; revision 1 stays 410. At 1440 and 390 use the send, withdrawal, revoked-client, audit, pipeline and revision-reissue screens. Public CLI restore preserves withdrawal history and the read-only state without invitation authority. The multi-recipient, partial-signature, reminder, payment-link and templated-notice cases above are mandatory before their named capabilities ship.

*Status:* done. Named SEND-010 HTTP, built desktop/phone and public CLI journeys assert every current obligation. Future capabilities inherit the full cases above. (`src/platter/withdrawal.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

### Engagement tracking

#### TRACK-001 — View tracking and live open alerts.

Platter records each verified or unverified view of a client link with time, recipient, approximate location and device class, and alerts the sender on first open and on a return visit after a quiet period the owner sets (30 minutes by default). The proposal shows a view timeline.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with viewed, including filters, sorting, counts and totals under its visibility rules.

The engagement timeline inherits EDIT-014’s successful PDF-download events and identical named assertions before shipping.

FOLLOW-002 inherits real viewed/unopened queue reasons and the original seven-proposal A, C, D, F, E, B, G ordering before tracking ships; extend its named public-door journey.

*Acceptance:* Open the proposal as two recipients on desktop and phone; the sender gets an alert and the timeline lists both views with device class and approximate location (city, region and country from the request address through an IP-location fixture: Austin, Texas, United States for the first and Portland, Oregon, United States for the second). With a 30-minute quiet period, the first recipient's return visit 10 minutes later raises no alert and a visit 45 minutes after that raises one return-visit alert.

*Status:* missing. No view tracking.

#### TRACK-002 — Section-level reading analytics.

For each view, Platter measures time spent on each section and on pricing, which packages and items were toggled, and which attachments were opened, and summarizes engagement per recipient.

FOLLOW-002 inherits section-engagement queue reasons and its original seven-proposal ordering before shipping; extend its named journey.

*Acceptance:* Run a scripted client session spending 40 seconds on pricing and 5 on the case study; the analytics show those times within 2 seconds and the toggled options.

*Status:* missing. No reading analytics.

#### TRACK-003 — Forwarded stakeholder identification.

When a link is opened by someone other than its recipient (a new device and network after a forward), Platter asks the viewer to identify themselves and verify their mailbox. The sender sees a new stakeholder with name and email, and can add them as a recipient.

*Acceptance:* Forward a link to a second mailbox, open it there, identify and verify, and see a new stakeholder on the proposal that the sender converts into an approver.

*Status:* missing. No forwarding detection.

#### TRACK-004 — Tracking disclosure and privacy limits.

The client page discloses that views are measured. Platter uses no third-party trackers, stores IP addresses only as truncated locations, and keeps engagement data for a retention period the owner sets. Engagement data is included in erasure (`PRIV-001`) and in exports.

*Acceptance:* Open the client page and see the disclosure; inspect network requests for third-party hosts (none); read a stored view and find no full IP address; set 90-day retention and see older views removed.

*Status:* missing. No tracking, so no disclosure or retention controls.

### Follow-up and negotiation

#### FOLLOW-001 — Scheduled reminders to unsigned recipients.

Each proposal has a reminder schedule: on or off, days after sending (for example 2, 5 and 9), days before expiry (for example 3) and a cap. It is copied from the proposal's template or the workspace defaults when the proposal is created (`FOLLOW-006`), and the sender changes it before and after sending. Scheduled reminders go to each unsigned recipient in the recipient's time zone outside quiet hours (8 pm to 8 am by default; the owner sets them). A reminder due inside quiet hours waits until they end. Reminders stop on acceptance, decline, expiry or the recipient's opt-out, and never exceed the cap the owner sets. Each reminder carries the subject and message of `SEND-006`, and every reminder is on the timeline. Whether scheduled reminders are on or off, anyone who may send the proposal under `APPROVE-003` sends a reminder by hand at any time to any unsigned recipient, with the editable `SEND-006` reminder message; a manual email reminder goes at once, a manual text reminder waits for quiet hours to end (`SEND-008`), each is on the timeline, manual reminders do not count toward the cap, and each recipient gets at most one manual reminder per calendar day in their time zone (a second is refused, 429).

SEND-010 withdrawal cancels all scheduled email and text reminders; extend its named clock-advance assertions before shipping.

*Acceptance:* Send to a recipient in Pacific time with reminders at 2, 5 and 9 days, quiet hours 8 pm to 8 am and a cap of 2, and advance the clock: two reminders arrive, each between 8 am and 8 pm Pacific (one due at 6 am Pacific arrives at 8 am), and the 9-day reminder is not sent because of the cap; on another proposal, accept after the first reminder and see no second; opt out and see none. On a sent proposal with two unsigned recipients and reminders off, send a manual reminder to the first with an edited message: exactly one reminder, with the edited text, reaches the mail fake and the timeline; a second manual reminder to the first the same day is refused (429), one to the second recipient goes, and one to the first the next day goes. A proposal created with no reminder settings of its own carries the `FOLLOW-006` defaults, as that journey checks.

*Status:* missing. No reminders.

#### FOLLOW-002 — Next-action follow-up queue by sales owner.

Every open proposal has a sales owner, a next action and a due date. Each sales owner's queue, and a manager's view of the team, lists follow-ups in one stated order. First come overdue items (due before today in the owner's time zone), oldest due date first; then items due today; then upcoming items by due date. Within the same due date, the reason ranks: bounced email (`SEND-002`), then a client question waiting (`FOLLOW-004`), then a failed or overdue payment (`PAY-005`, `PAY-008`), then expiring within 3 days (`SEND-004`), then viewed but not signed (`TRACK-001`, `TRACK-002`), then unopened. Ties within one reason sort by proposal value (one-off total plus first-year recurring value), highest first, then by earliest sent time, then by proposal number, so the order is fully determined. A follow-up stays open until the owner completes it with a logged action, the client acts, or it is dismissed with a reason; a notification alone never closes it.

This capability extends the `REPORT-001` dashboard and its named public-door fixture with due follow-ups, including filters, sorting, counts and totals under its visibility rules.

SEND-010 withdrawal closes every open follow-up; extend its named queue assertions before shipping.

*Acceptance (inherited by TRACK-001 and TRACK-002):* With the clock at 10 March, seed seven proposals for one owner: A $8,000 viewed, due 9 March; B $40,000 unopened, due 10 March; C $5,000 bounced, due 10 March; D $12,000 question waiting, due 10 March; E $20,000 viewed, due 10 March; F $30,000 viewed, due 10 March; G $9,000 unopened, due 12 March. The queue reads exactly A, C, D, F, E, B, G. Completing C with a logged call removes it; B's follow-up stays open after its notification is sent; dismissing E without a reason is refused (400).

Every capability available today conforms. Sales actions use REPORT-001's recorded, stable sales owner, retaining its honest "Not recorded" legacy label without inferring an identity. The owner sees and filters the queue until TEAM-001 adds sales and manager team scopes. Each open draft, approved or sent proposal starts with its workflow next action and a due date equal to its creation day in the installation time zone; an explicit schedule saves a calendar date, reopens the sales action and retains the action history. A new revision starts a new action. Acceptance and SEND-010 withdrawal close the sales action. Completing or dismissing it retains who, when and the logged action or required reason; notification alone leaves it open. General completion never resolves SEND-002 corrections or FOLLOW-004 question threads: the sending owner retains correction authority, and unanswered questions remain in their question inbox until answered.

Until personal zones exist, due dates and "today" use the installation's IANA time zone. Until tracking exists, every engagement label reads "Engagement unavailable" and all such proposals share one reason rank, without inferred unopened/viewed states. Current reasons are bounce, waiting question, future expiry deadlines from today through three calendar days ahead inclusive, then unavailable engagement. Equal-date/reason ties use the highest current one-off option in integer cents (face amounts, no exchange conversion), then earliest recorded first-send time (missing last), then stable proposal id until proposal numbers exist. Totals stay separate by currency. TEAM-001 inherits personal zones, sales and manager team visibility; TRACK-001/TRACK-002 inherit viewed/unopened reasons and the original seven-proposal ordering above; PAY-005/PAY-008 inherit failed/overdue payment reasons and closure; FOLLOW-005 inherits declined/lost closure; PRICE-003 inherits first-year recurring valuation; EDIT-016 inherits proposal-number ties when numbering ships. Each extends this named journey before shipping. REPORT-001 now includes inclusive due-today/overdue filtering, due-date sorting, counts, totals and saved-report/CSV output. PORT-002 retains schedules, resolutions and action history without mail or invitation authority.

*Acceptance (current capabilities):* With the clock at 10 March, create the same seven amounts and due dates above, using a real bounce business record for C and a verified question for D. With engagement unavailable the exact order is A, C, D, B, F, E, G; the original viewed/unopened order is inherited above. Complete C with a logged call and retain its separate bounce correction; notify B and retain its open action; refuse a reason-free dismissal of E (400). Assert default actions, owner filtering, exact totals, expiry precedence, time-zone dates, deterministic sent-time/id ties, explicit reopening, acceptance and withdrawal closure, member/agent refusal, and logged actor/time/action custody. Extend REPORT-001's 30-proposal fixture with due filters, next action, sorting, counts and totals; exercise real screens at 1440/390 and restore open/completed actions through the public CLI.

*Status:* done. Named FOLLOW-002 HTTP, REPORT-001 fixture, built desktop/phone and public CLI journeys assert current queue reasons, dates, ordering, reporting, authority and durable lifecycle. Named future clauses inherit their new capabilities before shipping. (`src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### FOLLOW-003 — Expiry and renewal notifications.

The sender (the proposal's sales owner, and its watchers under `SEND-005`) is told before a sent, unaccepted proposal expires and before an accepted agreement's term ends or renews. These are notices to the firm, separate from `SEND-004`'s expiry warning to unsigned signers, and each has its own setting: the sender's expiry notice is on by default 3 days before expiry, the renewal notice is on by default 30 days before the term ends, and the signer warning is on by default 1 day before expiry (`FOLLOW-006`). The owner or an admin changes each lead time or turns either notice off for the workspace (`TEAM-001`), and the sender changes them per proposal like the other delivery settings of `FOLLOW-006`. Each notice goes by the sender's channels under `SEND-005` and opens a follow-up (`FOLLOW-002`) due on the notice day; a renewal notice offers `RENEW-002`. A proposal accepted, declined or withdrawn before the notice day gets no expiry notice, and a changed expiry date moves the notice with it.

*Acceptance:* With the workspace defaults (sender expiry notice 3 days before, renewal notice 30 days before, signer warning 1 day before), send a proposal on 1 March with a 14-day expiry, so it expires on 15 March: the sender's expiry notice and a follow-up due 12 March arrive on 12 March and not before, and each unsigned signer's warning reaches the mail fake on 14 March. Extend that proposal to 22 March before 12 March: the sender's notice moves to 19 March. Accept a second proposal on 1 March 2026 with a 12-month term ending 28 February 2027: the renewal notice and a follow-up offering `RENEW-002` arrive on 29 January 2027. Turn the sender's expiry notice off for the workspace and send a third proposal on 1 March with a 14-day expiry: no sender notice arrives on 12 March, while the signer warning still reaches the mail fake on 14 March. A fourth proposal accepted on 10 March with expiry on 15 March gets no expiry notice. A sales member's change to the workspace lead times is refused (403).

*Status:* missing. No expiry or renewal notices.

#### FOLLOW-004 — Client questions and comments.

A client asks a question or comments on any section from the proposal page. The firm answers in the same thread, by email reply or from the app; the client is notified. Open questions show on the proposal and in the queue until answered, and the thread is kept with the agreement.

Every capability available today conforms. The mailbox-verified invited client comments on scope, pricing or terms on the exact current sent revision, including while acceptance is expired. The active owner answers from the app, and answers queue a notification to that question's verified client mailbox. Questions and answers retain their revision and remain in the agreement and PORT-002 archive. Until FOLLOW-002 supplies the follow-up queue, the owner-only open-question queue is on Proposals; an answer removes its question. Agents cannot answer. EDIT-001/EDIT-002 inherit added sections, TEAM-001 inherits scoped person roles and FOLLOW-002 inherits the question queue before shipping, each extending this same named journey.

Email replies use a configured Resend receiving domain and signed email.received webhook, followed by fetching the real received message from Resend. The notice goes only to the active owner mailbox and carries a per-thread, one-use opaque Reply-To capability, valid for seven days. Acceptance requires the provider signature, the capability and the exact current active-owner From mailbox together. Capabilities are hashed at rest, sealed in queued transport, excluded from archives and never returned in app state. Expired, replayed, rotated and wrong-owner replies are refused. Re-noticing rotates the capability, and an app answer spends outstanding capabilities. The full plain-text reply, including quoted text, becomes the answer; a body containing a reply capability is refused. Attachments are refused. Other mail transports and unconfigured installations honestly instruct the owner to answer in the app; SEND-001 inherits additional authenticated inbound providers before shipping.

*Acceptance:* As the verified client comment on pricing; the owner answers from the app; the client receives the exact answer; the question leaves the queue; the accepted agreement lists the thread. Repeat scope and terms, refusing unverified, stale-revision and invalid-section writes. Assert member queue and agent answer refusal. Through signed Resend HTTP intake and a real adapter at its network edge, assert exact thread/owner resolution, client notification, invalid signature, wrong sender, expiry, rotation, owner change and replay refusal with no second answer or notification. Exercise owner/client/queue/agreement at 1440 and 390. Export and restore answered and open threads through the public CLI, excluding genuine issued reply capabilities.

*Status:* done. Named FOLLOW-004 HTTP, signed-mail, desktop/phone and CLI journeys cover every current section, owner answer doors, notification, queue removal, agreement history and credential-free custody. (`src/platter/questions.ts`, `src/platter/question-replies.ts`, `src/platter/ui/questions.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### FOLLOW-005 — Decline reasons and won or lost outcomes.

A client can decline with a reason. The firm marks a proposal won or lost with a reason from its own list, and can reopen a lost one as a new revision. A decline stops signing and payment on every recipient link, and marking a proposal lost withdraws it as `SEND-010` does, with the notice off by default. Outcomes sync to the CRM (`CRM-001` to `CRM-003`) and feed reporting (`REPORT-002`).

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with declined, including filters, sorting, counts and totals under its visibility rules.

Marking lost invokes SEND-010 withdrawal with recipient notice off by default; extend its named revocation and notice-off assertions before shipping.

Before shipping, extend FOLLOW-002 with declined/lost closure and the named queue assertions, retaining SEND-010 revocation semantics.

*Acceptance:* Decline as the client with the reason Budget, see the proposal lost and the HubSpot deal fake moved to Closed lost; mark another sent proposal lost and see each of its recipient links show the withdrawn page; reopen the declined one as a new revision and send.

*Status:* partial. Mailbox-verified clients decline an unsigned offer with a reason; owners mark it lost with no recipient notice by default. Both use SEND-010 revocation and FOLLOW-002 closure, retain revision/actor/time/reason, feed REPORT-001 filters/sorts/counts/totals and reopen through NEG-001 with fresh approval. Gap: CRM outcome sync, configurable reason lists and explicit won overrides remain. (`src/platter/withdrawal.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### FOLLOW-006 — Default reminder schedule and expiry from the workspace and templates.

The owner or an admin sets the workspace defaults (the workspace settings right of `TEAM-001`): a reminder schedule (on or off, days after sending, days before expiry and the cap of `FOLLOW-001`) and an expiry period in days counted from sending, with an optional warning to unsigned signers a set number of days before expiry (`SEND-004`). A fresh installation starts with reminders on at 2, 5 and 9 days after sending and 3 days before expiry with a cap of 3, and an expiry period of 60 days with the warning on 1 day before; a workspace upgraded from the first release gets the same defaults for proposals created after the upgrade. A template (`EDIT-002`) can set its own reminder schedule, expiry period and warning, each overriding the workspace default, or leave either to follow the workspace. Every new proposal copies these settings when it is created: from its template where the template sets them, otherwise from the workspace. That holds whether a member starts it from a template or from blank (`EDIT-002`), creates it in bulk (`RENEW-001`), a visitor submits a public link (`SEND-009`, where the expiry counts from the submission) or it is drafted (`AI-001`); a duplicate (`EDIT-012`) takes the source proposal's settings. Because the settings are copied, a later change to the template or to the workspace defaults never alters a proposal already created. The send screen shows the reminder dates and expiry date the proposal will get, and the sender changes either before sending; anyone who may send the proposal under `APPROVE-003` changes them on a sent proposal, and a changed expiry keeps the reopen rules of `SEND-004`. These are delivery settings, not offer terms: changing them creates no revision and needs no new approval. Every change, with who made it, is on the timeline.

Before shipping, workspace and template expiry defaults extend SEND-004’s named calendar, warning and reopening assertions.

Before shipping, extend EDIT-012 duplication assertions to copy every source payment method, schedule, reminder and expiry setting without copying lifecycle state.

*Acceptance:* Set the workspace defaults to reminders at 3 and 7 days after sending and expiry after 30 days. Create a template that overrides them with reminders at 2, 5 and 9 days and expiry after 14 days. Create one proposal from the template and one from blank and send both on 1 March: the template proposal carries reminders on 3, 6 and 10 March and expires on 15 March, and the blank proposal carries reminders on 4 and 8 March and expires on 31 March, as the send screen showed before sending and the mail fake confirms as the clock advances. Change the template's reminders to 4 days: the proposal already created keeps 2, 5 and 9, and a new proposal from the template gets 4. Change the workspace expiry to 45 days: the blank proposal still expires on 31 March. On the sent template proposal, turn reminders off and send a manual reminder (`FOLLOW-001`): exactly one reminder reaches the mail fake and the timeline, and a second manual reminder to the same recipient the same day is refused (429). Extend the template proposal's expiry to 22 March and confirm no new revision or approval is created. A proposal duplicated from the template proposal (`EDIT-012`), a bulk-created proposal (`RENEW-001`), a public-link submission (`SEND-009`) and a drafted proposal (`AI-001`) from the same template each carry the template's 2, 5 and 9 days and 14-day expiry. A sales member's and a manager's change to the workspace defaults are refused (403, the defaults unchanged), and an admin's change is saved; a sales member's change to a shared template's expiry is refused (403).

*Status:* partial. Owner/admin workspace defaults now store on/off, after-send and before-expiry reminder days, cap, expiry period, warning lead and payment-method choices. Fresh and upgraded future drafts use the clause’s specified 2/5/9-day and 3-days-before-expiry reminder configuration, cap 3, and a real 60-day expiry with one-day warning; existing proposals are not backfilled. New blank and starter drafts copy the configuration, and personal templates/duplicates retain their saved snapshots. TEAM-001’s role HTTP journey proves owner/admin changes, sales/manager and other-role refusals with no write, and inheritance; tests/templates-http.mjs asserts the initial 60-day/one-day values. The named team browser journey changes defaults as an admin at 1440/390; the role CLI journey restores settings and snapshots. Gap: scheduled reminders themselves (FOLLOW-001), explicit per-template inherit/override controls for every field, per-proposal reminder editing/dates/timeline, and future bulk/public/drafting doors remain.

#### NEG-001 — Negotiated revisions after sending.

After sending, the firm can make a new revision in answer to the client. The revision follows the approval rules and policy again (`APPROVE-001`, `APPROVE-003`); sending it retires the earlier client link, and the client sees what changed since the version they saw. Acceptance always binds the exact current sent revision, and every earlier version stays in history. An unsent negotiation is stored separately from the live offer: the old invitation remains usable until the approved replacement is sent. If the client accepts the live offer first, that agreement wins and the unsent negotiation cannot be sent; its saved revisions remain in history. Editing the negotiated draft creates another revision and clears its approval. The current default approval policy remains owner approval for every negotiated revision; `APPROVE-001` and `APPROVE-003` inherit this path when their rule and role capabilities ship.

*Acceptance:* Send revision 1, revise the price, approve and send revision 2; the revision 1 link is refused; the client page shows the price change; acceptance records revision 2.

*Status:* done. Named NEG-001 HTTP, 1440/390 browser and CLI archive journeys prove pending drafts, exact approval, atomic replacement, client comparison, revision-bound acceptance and retained history. (`src/platter/negotiation.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### NEG-002 — Client-suggested text edits.

Where the firm allows it, a client suggests edits to text sections (not prices) as tracked suggestions. The firm accepts or rejects each one; accepted suggestions form a new revision under `NEG-001`. Contract lifecycle redlining of master agreements belongs to Locket (see Neighboring products). Scope and terms are the text sections currently supported; a person enables each section separately on the exact sent revision, off by default. The invited client verifies their mailbox before submitting an original-text/replacement pair; the original must occur exactly once. Decisions retain the source revision, client, time, original and replacement, reviewer, decision and resulting revision. Owner/member people review; agents cannot enable or decide. Accepting an edit creates an unapproved negotiated revision without changing the live offer, and later accepted edits clear approval again. TEAM-001 inherits scoped person authority; EDIT-001 and EDIT-002 inherit this opt-in tracked-suggestion behavior for their new text sections before shipping.

*Acceptance:* Allow suggestions on the terms section, suggest two edits as the client, accept one and reject one, and see revision 2 contain only the accepted edit.

*Status:* done. Named NEG-002 HTTP, 1440/390 browser and CLI archive journeys assert opt-in, verified tracked edits, accept/reject, unchanged live offer/prices, fresh approval and revision 2 containing only the accepted edit. (`src/platter/suggestions.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

### E-signature

#### SIGN-003 — ESIGN and UETA electronic signature.

Signing meets the federal ESIGN Act and state UETA: each signer is shown the electronic records disclosure and consents before signing, can withdraw consent and ask for paper, and adopts a typed, drawn or uploaded signature. Signature, initials and date fields can be placed anywhere, each assigned to one signer or, in a template, one recipient role (`SIGN-011`), and a signer sees and fills only their own fields. Intent to sign is explicit, and the signed record is retained and reproducible.

*Acceptance:* Sign as a client who reads the disclosure and consents, draws a signature and initials three fields; a second client withdraws consent and the firm is told; a third client uploads a PNG of their signature and adopts it; the signed record reproduces the same document and each adopted signature.

*Status:* partial. A typed name and consent are stored; no ESIGN consumer disclosure, consent withdrawal, drawn signature, initials or signature fields. (`src/platter/signing.ts`, `tests/platter.test.mjs`)

#### SIGN-004 — Multiple signers, signing order and countersignature.

A proposal can require several signers on the client side and a countersignature from the firm, in a set order or in parallel groups. A template sets the order and groups for its roles, and they are copied into each proposal created from it (`SIGN-011`); changing the template later never changes a proposal's order. Each signer verifies separately; the agreement completes when the last required signature lands, and each party is told. A signer can be replaced by the sender (`SEND-007`) or, where allowed, delegate (`SIGN-009`) without changing the order.

Before shipping, multiple signers extend SEND-004’s named warning journey so every unsigned signer receives the warning and each signed signer receives none.

SEND-010 withdrawal before completion notifies every signer, revokes remaining links and retains prior signatures marked void; extend its named partial-signature assertions before shipping.

*Acceptance:* Require client CEO then CFO, then the firm's owner; the CFO cannot sign before the CEO; after all three the agreement is complete and each party gets the completion email. On another proposal, put two client signers in one parallel group followed by the firm's countersignature: the two sign in either order, the firm cannot countersign before both have signed, and the agreement completes after the countersignature.

*Status:* missing. One client signer only.

#### SIGN-005 — Signed agreement PDF and certificate of completion.

On completion, Platter produces the signed agreement PDF and a certificate of completion listing each signer, verification method, consent, IP-derived location, user agent, timestamps and the SHA-256 hash of the document. Both parties can download them, they are emailed to each party, and the PDF is archived (`AUTO-002`).

*Acceptance:* Complete a two-signer agreement, download the PDF and certificate as each party, recompute the SHA-256 and see it match the certificate, and find both attached to the completion email.

*Status:* partial. An immutable accepted snapshot with signer and time; no PDF, certificate, document hash or completion email. (`src/platter/signing.ts`, `src/platter/ui/client.ts`, `tests/platter.test.mjs`)

#### SIGN-006 — Signer identity options.

Per proposal, the firm chooses the identity check for each signer: mailbox code (`SIGN-001`, the default), link only, a text-message code to a US mobile number through Twilio, or government ID verification through Stripe Identity or Persona. Link only matches the incumbents' default for low-risk documents: possession of the personal link delivered to that recipient's mailbox is the check, it must be chosen explicitly per proposal or template, and a link opened on a new device and network after a forward (`TRACK-003`) still asks for the mailbox code before it can sign. The method used is recorded in the certificate.

*Acceptance:* Require SMS for one signer and ID verification for another with Twilio and Stripe Identity fakes; wrong SMS codes are limited as in `SIGN-001`; the certificate names each method. On another proposal choose link only: the recipient signs from their link without a code and the certificate reads "email link only"; the same link opened from a second device and network after a forward asks for the mailbox code; a proposal with no choice made still requires the code.

*Status:* partial. Mailbox code only; no SMS code or ID verification. (`src/platter/signing.ts`, `tests/platter.test.mjs`)

#### SIGN-007 — Fields collected at acceptance.

The firm places fields the client fills at acceptance, each assigned to one recipient or template role (`SIGN-011`) so only that person fills it: PO number, billing contact, billing and service address, project start date, checkboxes, custom text and file uploads, such as a purchase order PDF or a certificate of insurance (PDF, PNG or JPEG up to 25 MB each). Required fields block signing; values freeze into the agreement and flow to invoices and the CRM, and uploaded files are kept byte-identical in the agreement package (`SIGN-005`) and listed on the certificate of completion.

*Acceptance:* Require a PO number, a billing address and a PO PDF upload, try to sign without them (refused), fill them and upload the PDF, sign, and see the values in the agreement, the QuickBooks Online invoice fake and the HubSpot deal fake; the uploaded PDF in the agreement package has the same SHA-256 as the file uploaded, and the certificate lists it. A 30 MB upload and an .exe upload are refused.

*Status:* missing. Only name, option and consent are collected.

#### SIGN-008 — Acceptance on the client's own paper.

When a client signs through their own procurement or signing system, the owner uploads the signed copy, records who signed and when, and attests to it. The agreement is marked accepted by upload, distinct from Platter e-signature, and payments and handoff proceed as for any acceptance.

Until `TEAM-001` adds the admin role, only the owner records an acceptance by upload, and only for a sent proposal's current sent, approved revision; the owner chooses the one offered option the client signed, and its total and integer-cent deposit are calculated and frozen as in `SIGN-002`. The signed date is the calendar date written on the paper (`YYYY-MM-DD`, no time zone), never later than the current date in UTC+14; the acceptance time is when the owner recorded it. The owner's attestation is stored as the acceptance's consent text. Every screen labels the agreement "Accepted by upload: signed outside Platter. Platter did not verify this signature." and never shows the client's mailbox as the signer's; Platter e-signatures show their own method. The uploaded file, at most 10 MB, is kept immutably with the agreement in any format the owner uploads (no format or signature check is claimed) and is only ever served as a download (`Content-Disposition: attachment`, `nosniff`); owners and members download it, agents never do, and the client invitation page shows the accepted-by-upload record without serving the file. Recording discards a pending `NEG-001` draft as an e-signed acceptance does, a later client acceptance attempt returns the recorded acceptance, and a recorded acceptance is never replaced. Today the deposit request is the owner's deposit invoice export, which proceeds exactly as for any acceptance; `PAY-001`, `PAY-002`, `PAY-008`, `HAND-001` and `HAND-002` treat an acceptance by upload as an acceptance before they ship.

*Acceptance:* Upload a client-signed PDF for a sent proposal, record signer and date, and see the agreement marked accepted by upload with the file, followed by the deposit request.

*Status:* done. `tests/platter.test.mjs` and `tests/site.test.mjs` (named SIGN-008 journeys) record the signed copy through HTTP and at 1440 and 390 pixels, refuse members, stale versions, unsent proposals, missing attestation, missing or over-10 MB files and future or invalid dates, read back the exact bytes, label the method distinctly from an e-signed acceptance, keep the file off the client page and export the $1,050.00 deposit.

#### SIGN-009 — Recipient delegation of signing.

Where the firm turns delegation on for a proposal or template, a signer who is not the right person delegates from their own link to a named person with email (and a mobile number when that signer's check is SMS). The delegate must pass the identity check set for that signer (`SIGN-006`) before seeing the agreement; the delegator's link is revoked; the sender is notified and can undo the delegation before the delegate signs. Delegation never changes the offer, revision, approvals or signing order, is refused once the delegator has signed or when delegation is off, and is recorded in the certificate of completion (`SIGN-005`).

*Acceptance:* With delegation off, try to delegate from the CEO's link (refused); turn it on and delegate to the COO: the CEO's link is refused and the sender is notified; the COO verifies and signs, and the certificate shows the CEO delegated to the COO with the time; on another proposal sign as the CEO and then try to delegate (409).

*Status:* missing. One fixed client signer; no delegation.

#### SIGN-010 — In-person signing on the firm's device.

A sender hosts a signing session on their own signed-in phone, tablet or computer for clients who are present, as incumbents offer for walk-in clients. The sender starts the session from the proposal and hands the device over; each signer in signing order (`SIGN-004`) confirms their name, reads the electronic records disclosure and consents (`SIGN-003`), fills the fields assigned to them (`SIGN-007`) and signs. Between signers the device returns to a hand-back screen, and the sender's own pages stay locked until the sender signs in again. The firm can require a code sent to each signer's mobile or mailbox in the session (`SIGN-006`). The certificate of completion (`SIGN-005`) records each signature as "in person, hosted by" the sender, with time and device, and each signer gets the completed copy by email.

*Acceptance:* As a sales member at 390 pixels, host an in-person session for two client signers in order: each reads the disclosure, consents and signs; the screen returns to the hand-back screen between them and the sender's queue cannot be opened without signing in again; the certificate names the in-person method and the host; both signers receive the completed copy in the mail fake; the remote link for the same signer then shows the proposal as already signed. With the SMS option on, a wrong code in the session is limited as in `SIGN-001`.

*Status:* missing. Signing happens only from the client's own emailed link.

#### SIGN-011 — Template recipient roles, field assignment and signing order.

A template (`EDIT-002`) holds recipient roles, each with a name the firm chooses (such as Client, Client CFO or Countersigner) and a kind: signer, client-side approver, viewer or CC (`SEND-003`), or firm countersigner (`SIGN-004`). Every signature, initials, date and form field (`SIGN-003`, `SIGN-007`) and every signature block (`EDIT-001`) is assigned to exactly one role, and a template with a signature, initials, date or required field assigned to no role cannot be published (400). The template sets the signing order, including parallel groups (`SIGN-004`), and the identity check for each role (`SIGN-006`). A role can be pre-assigned to a member, such as the owner as countersigner, or to a fixed contact, who is then added to every proposal created from the template. Every proposal created from a template shows each role as a slot, whether a member starts it (`EDIT-002`), duplicates it (`EDIT-012`), creates it in bulk (`RENEW-001`), a visitor submits a public link (`SEND-009`) or it is drafted (`AI-001`). The member fills each slot from the client's contacts or the linked CRM deal's contacts (`EDIT-004`, `CRM-001` to `CRM-004`), with a deal contact whose CRM role or label matches the role name offered first, and the role's fields and place in the order arrive assigned to whoever fills the slot. Sending is refused (409), naming the role, while any signer, approver or countersigner role is unfilled. The proposal copies the template's roles, fields and order when it is created, so a later change to the template never alters a proposal already created; on one proposal the member may add or remove roles and change the order before sending. Template roles read from PandaDoc's API at move-in become these roles with their order, field assignments and pre-assigned recipients (`MIG-001`).

Before shipping, extend EDIT-012 duplication assertions to preserve all role slots and only template-preassigned members, clearing all other recipients.

*Acceptance:* Build a template with three roles: Client signer (signature, date and a required PO number field), Client CFO (approver) and Firm countersigner pre-assigned to the owner (signature), ordered signer, then CFO, then countersigner; publishing it with one more signature field assigned to no role is refused (400). Create a proposal from it: exactly three role slots appear, the countersigner already filled by the owner. Link a HubSpot deal fake with three contacts, one of them labeled Client CFO in HubSpot: the Client CFO slot offers that contact first, ahead of the other two. Fill the signer from one of the deal's contacts and leave the CFO empty: send is refused (409) naming Client CFO. Fill the CFO and send: the signer's page shows exactly the signature, date and PO number fields; the CFO's approval is refused before the signer signs; the owner's countersignature is refused until the CFO approves, and the agreement completes on it. Change the template's order to CFO first: the proposal already created keeps signer, CFO, countersigner, and a new proposal from the template gets the new order. Duplicate the sent proposal (`EDIT-012`): the copy has the three slots with only the owner filled. With a PandaDoc API fake returning a template with two roles, Client and Sender, each with assigned fields and an order, the imported template carries the same two roles, field assignments and order (`MIG-001`).

*Status:* missing. No templates, recipient roles or field assignments; one client recipient per proposal.

### Payments

#### PAY-001 — Stripe card and ACH collection in the proposal.

The owner or an admin (`TEAM-001`) connects the firm's own Stripe account. The client pays inside the proposal by card, Apple Pay, Google Pay or ACH bank debit, with bank verification through Stripe Financial Connections or micro-deposits. The ACH debit authorization text is shown and stored with the agreement. Card and bank numbers never touch Platter. The methods a proposal offers are copied when it is created from its template (`EDIT-002`), or from the workspace's default methods when the template sets none, and the sender changes them per proposal before sending; the owner or an admin sets the workspace defaults and whether to pass through a fee where allowed.

SEND-010 withdrawal voids all unpaid payment links; extend its named refused-payment-link assertions before shipping.

*Acceptance:* In Stripe test mode, connect an account, accept and pay a deposit by test card, by Apple Pay and Google Pay test wallets, and by test ACH; see the authorization text retained; inspect the database and logs for card or bank numbers (none). Turn on a 3% card fee after confirming it is allowed: the card total shows the fee as its own line, ACH shows none, and a client whose billing state the firm marked as not allowing surcharges sees no fee. With workspace default methods of card, wallets and ACH, a template offering card and ACH only starts a proposal whose client page offers card and ACH and no wallets, and a blank proposal offers all three; turning ACH off on that one proposal leaves the template unchanged.

*Status:* missing. No payment collection.

#### PAY-002 — Deposit or partial payment at acceptance.

Accept and pay is one flow: after signing, the client pays the deposit or first payment in the same session. The firm chooses whether acceptance completes only once the payment succeeds or whether signing completes the agreement with the payment due. Agreement and payment states stay separate, so a failed payment never undoes a signature.

*Acceptance:* With payment required, sign and decline the test card: the agreement waits for payment; pay and see it complete. With payment due, sign, fail the payment and see the agreement accepted with the deposit due.

*Status:* partial. The deposit is calculated and exported, never collected. (`src/platter/signing.ts`, `src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### PAY-003 — Milestone and recurring payment schedules.

The accepted schedule (`PRICE-007`) is executed: milestones are charged or invoiced on their date or when the owner marks the event done, each amount's invoice being created on that issue day and never earlier (`ACCT-007`), and recurring fees are charged on their interval against the payment method the client authorized, or sent as net-terms invoices with a pay link and overdue tracking (`PAY-008`). The client can update the payment method from a link.

*Acceptance:* Accept a deposit, a charged milestone, a net-30 milestone and a monthly retainer; mark milestone one done and see it charged; mark the net-30 milestone done and see an invoice issued, not a charge, followed by the `PAY-008` journey; advance the clock a month and see the retainer charged; update the payment method from the client link.

*Status:* missing. No schedules.

#### PAY-004 — Paid, pending, failed, refunded and disputed states.

Each payment shows scheduled, processing, succeeded, failed, refunded, partially refunded or disputed from signed Stripe webhooks, processed once per event ID. ACH payments stay processing until Stripe reports success, typically up to four business days. A payment is paid only on provider evidence, and the owner sees amounts due, paid and overdue per agreement.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with paid, including filters, sorting, counts and totals under its visibility rules.

*Acceptance:* Replay Stripe test events out of order and twice: the state ends correct with one record per event; an ACH payment stays processing until the success event; the agreement shows due, paid and overdue totals.

*Status:* missing. No payment states.

#### PAY-005 — Failed-payment retries and notices.

When a payment fails, the client and firm are told with the reason; Platter retries on an owner-set schedule only where the client's authorization allows it, and stops a retry once the amount is paid by any route. Each attempt is on the timeline.

Before shipping, extend FOLLOW-002 with failed-payment reasons, prescribed reason precedence and client-payment closure in its named queue journey.

*Acceptance:* Fail a milestone charge; both parties are notified; a retry runs after the set delay; pay by check (`PAY-007`) before the next retry and see it canceled.

*Status:* missing. No retries or notices.

#### PAY-006 — Refunds and disputes.

The owner, an admin or a billing user (`TEAM-001`) refunds a payment in full or in part with a reason, and the refund syncs to accounting. When a client disputes a card payment, Platter shows the dispute, its deadline and an evidence pack (signed agreement, certificate, views and payment authorization) that the owner, an admin or a billing user submits to Stripe.

*Acceptance:* As a billing user refund half of a deposit and see the credit in the QuickBooks Online fake; a sales member's refund is refused (403); open a test dispute and submit the evidence pack to the Stripe fake before its deadline.

*Status:* partial. Owner, admin and billing can explicitly refund a verified existing Stripe deposit with a reason. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves Stripe-fake receipt, sales no-call refusal, exact accepted revision/account/currency binding, concurrent bounds, idempotent retries and durable uncertain holds. The compiled role journey proves billing screens at 1440/390 and the role archive journey preserves refunds without credentials. Current financial roles can verify a Stripe dispute against a linked deposit and explicitly submit the exact accepted snapshot, typed acceptance facts and a response note before its provider deadline. tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence” proves owner/admin/billing success, other-role no-call refusals, foreign-charge and deadline refusal, consent, idempotency, private-cost exclusion and exact retained PDF hashes. The named role browser and CLI journeys prove 1440/390 responses and restoration of exact evidence bytes without replay. Conservative default pending ct approval: evidence submission is manual and requires explicit audited consent; unavailable certificate, analytics, attachments and checkout authorization artifacts are clearly identified, never fabricated. Gap: accounting credits, full SIGN-005 certificates/attachments, TRACK-001 view evidence and PAY-001/PAY-002 authorization artifacts; uncertain refunds/submissions require provider reconciliation.

#### PAY-007 — Check, wire and ACH credit payments.

US clients often pay by check, wire or ACH credit. Invoices show remittance details, and the owner, an admin or a billing user (`TEAM-001`) records an offline payment with method, reference and date. It reconciles against the schedule and accounting like any other payment.

*Acceptance:* As a billing user record a check with its number against a milestone and see it paid, synced to QuickBooks Online, and removed from the overdue list.

*Status:* partial. Owner, admin and billing record received check, wire and ACH credit payments with reference and receipt date; tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves the role boundary and all three methods. The role archive journey preserves exact records. Gap: milestone and schedule reconciliation, accounting synchronization, remittance details and overdue removal.

#### PAY-008 — Net-terms invoices with a pay link and overdue tracking.

When a scheduled amount is on net terms (net 15, net 30 or a custom number of days), Platter issues an invoice when its date arrives or its milestone is marked done, with its due date counted from that issue day and never created earlier (`ACCT-007`): an email to the billing contact (`SIGN-007`) with the invoice number, amount, due date, a PDF invoice and a pay link, using the invoice template of `SEND-006`. The pay link opens a page where the client pays by card or ACH (`PAY-001`, `PAY-009`) or reads remittance details for check and wire (`PAY-007`). An unpaid invoice is due through its due date and turns overdue the next day in the firm's time zone: it counts in the agreement's overdue total (`PAY-004`), opens a follow-up in the owner's queue (`FOLLOW-002`) and sends overdue reminders on the owner's schedule. A payment from the link is processing until the provider reports success and paid only on that evidence. When the accounting system is the invoice authority (`ACCT-004`), the invoice sent is the one in QuickBooks Online, Xero or Pantry, never a second one.

Before shipping, extend FOLLOW-002 with overdue-payment reasons, prescribed reason precedence and paid-event closure in its named queue journey.

*Acceptance:* Accept a proposal with a $6,000.00 milestone on net 30 and mark it done on 1 March: the mail fake holds one invoice email with amount $6,000.00, due date 31 March, a PDF and a pay link. On 31 March it is due, not overdue. Advance to 1 April: it is overdue in the agreement's `PAY-004` totals and in the owner's `FOLLOW-002` queue, and an overdue reminder is sent. Pay by Stripe test ACH from the link: it shows processing, then paid after the success event, the follow-up closes, and exactly one invoice exists locally and in the QuickBooks Online fake.

*Status:* missing. No invoices are sent to the client; the only invoice is the owner's deposit CSV export.

#### PAY-009 — PayPal, Square and Authorize.net collection.

A firm that does not take payment through Stripe connects its own PayPal, Square or Authorize.net account instead, and the client pays the deposit, milestones and net-terms invoices inside the proposal by card, or by PayPal or Venmo where PayPal is connected. Payment states, retries, refunds and accounting sync work as for Stripe (`PAY-002` to `PAY-008`, `ACCT-001` to `ACCT-006`), with each processor's signed webhooks or notifications processed once per event. Where a processor cannot charge a stored method for a schedule, Platter sends a pay link for each scheduled amount and says so when the firm connects it. Card numbers never touch Platter.

*Acceptance:* With PayPal, Square and Authorize.net sandbox fakes: connect each in turn, accept and pay a deposit, refund half of it, replay each webhook twice, and see the same payment states and QuickBooks Online fake records as the Stripe journey with one record per event; inspect the database and logs for card numbers (none).

*Status:* missing. No payment processors are connected.

### Accounting sync

#### ACCT-001 — QuickBooks Online invoices and payments.

The owner or an admin connects QuickBooks Online. On acceptance, Platter creates or matches the customer and creates the deposit invoice; each milestone and recurring invoice is created on its issue day under `ACCT-007`, never at acceptance. Every invoice carries items, tax codes and the income accounts set in the catalog, and Platter records Stripe and offline payments, refunds and fees against them, with Stripe payouts and fees posted through a clearing account (`ACCT-006`). Invoices paid in QuickBooks Online, including through QuickBooks Payments, are read back as paid.

*Acceptance:* With a QuickBooks Online sandbox fake: accept a proposal with a deposit and a net-30 milestone and see one customer and only the deposit invoice, with the right tax code; pay the deposit by Stripe and see the payment applied in full with its fee posted as in `ACCT-006`; mark the milestone done and see its invoice appear dated that day; pay that invoice in QuickBooks and see it paid in Platter.

*Status:* missing. No QuickBooks connection.

#### ACCT-002 — Xero invoices and payments.

The owner or an admin connects a USD Xero organization. Platter creates or matches the contact, raises the deposit invoice at acceptance and each milestone and recurring invoice on its issue day (`ACCT-007`), with items, tax rates and accounts, and records payments and refunds, with paid status read back from Xero.

*Acceptance:* With a Xero API fake: accept a proposal with a deposit and a net-30 milestone, and see the contact and only the deposit invoice; pay by Stripe and see the payment applied; mark the milestone done and see its invoice appear dated that day; pay it in Xero and see it paid in Platter.

*Status:* partial. A currency-tagged Xero-format deposit CSV only; no API sync, schedules or payments. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### ACCT-003 — Pantry invoices and payments.

For firms on [Pantry](https://github.com/just-every/run-pantry), Platter posts customers, invoices and payments the same way as `ACCT-001`, each invoice on its `ACCT-007` issue day, and reads back paid status.

*Acceptance:* Run the `ACCT-001` journey against a Pantry instance and see the same customer, invoices and payments, with only the deposit invoice present until the milestone is marked done.

*Status:* missing. No Pantry connection.

#### ACCT-004 — One invoice authority and reconciliation.

The owner chooses one invoice authority per installation: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry. Each scheduled amount maps to exactly one invoice and one external ID, created on its issue day under `ACCT-007`, so retries, reconnects and replays never create a second and none is created early. A reconciliation view lists each scheduled amount with its invoice, payments, provider events and accounting status, and flags mismatches.

*Acceptance:* Accept, disconnect and reconnect QuickBooks, replay the sync twice and see one invoice per amount; edit the amount in the fake and see a mismatch flagged in reconciliation.

*Status:* partial. A unique local binding prevents duplicate exports; there is no authority choice, provider ID or payment matching. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### ACCT-005 — Invoice and payment export files.

Without a live connection, the owner exports invoices, payments and schedules as QuickBooks Online and Xero import files in USD, retained once per invoice as in `INV-001`.

*Acceptance:* Export the deposit and two milestones in QuickBooks and Xero formats and import them into each sandbox without errors; exporting again returns the same retained files.

*Status:* partial. A currency-tagged Xero deposit CSV only; no QuickBooks files, sandbox-verified USD imports, payment or schedule export. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### ACCT-006 — Stripe payouts, fees and clearing in accounting.

Stripe pays out net of fees, so a firm's bank deposit never equals its invoices. Platter posts each Stripe payment gross against its invoice into a clearing account the owner picks (such as "Stripe clearing" in QuickBooks Online or Xero), posts Stripe's processing fees to the owner's fee expense account, and records each payout as one transfer from clearing to the bank account for the payout's net amount, so the bank feed matches one deposit per payout and the clearing account returns to zero. Refunds, dispute amounts and dispute fees post through the same clearing account. The same posting applies to the processors of `PAY-009`.

*Acceptance:* In a QuickBooks Online fake and a Xero fake: take card payments of $1,000.00 and $500.00 with fees of $29.30 and $14.80 and one payout of $1,455.90; see both invoices paid in full, $44.10 in the fee expense account, one $1,455.90 transfer to the bank account and the clearing account at $0.00; refund $100.00 and see clearing and the bank match the next payout.

*Status:* missing. No payment or accounting connection, so no payout or fee posting.

#### ACCT-007 — Invoices created on their issue day, never ahead.

One timing rule holds for every invoice authority (`ACCT-004`: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry). The deposit invoice is created at acceptance. A milestone invoice is created on its issue day: its date for a dated milestone, or the day it is marked done for an event milestone. Each recurring amount's invoice is created on its billing date, one per period. A net-terms invoice's due date is counted from its issue day (`PAY-008`), and a charged amount's invoice is created when the charge is made and marked paid only on the provider's success evidence (`PAY-003`). No invoice is created ahead of its issue day, so the accounting system's open invoices and A/R aging hold only amounts already issued, and a milestone that slips moves its issue day with nothing to void. Future amounts show in the agreement's schedule (`PAY-004`) as scheduled, not invoiced. The invoice emailed to the client under `PAY-008` is the authority's own invoice, never a second one. `ACCT-001`, `ACCT-002`, `ACCT-003` and `PAY-003` follow this rule.

*Acceptance:* With QuickBooks Online as the invoice authority, accept a proposal with a $2,000.00 deposit, a $6,000.00 net-30 event milestone and a $1,500.00 monthly retainer starting 1 April: the QuickBooks Online fake holds only the deposit invoice. Mark the milestone done on 1 March: the fake now holds one milestone invoice dated 1 March and due 31 March, and that invoice is the one emailed under `PAY-008`. On 1 April exactly one retainer invoice appears, and on 1 May a second. Run the same journey with Xero, Pantry and Platter's own Stripe invoices as the authority and see the same invoices on the same days.

*Status:* missing. No invoices are created for scheduled amounts; the only invoice is the owner's deposit CSV export after acceptance.

### CRM sync

#### CRM-001 — HubSpot two-way deal sync.

The owner or an admin connects HubSpot. A member starts a proposal from a deal (or from a HubSpot CRM card), with company, contacts, deal fields and line items pulled in. Platter writes back status, amount, line items, the proposal link and timeline events (sent, viewed, signed, paid), and moves the deal stage according to rules the admin sets.

*Acceptance:* With a HubSpot API fake: create a proposal from a deal with two line items, send, view and sign; see the deal's line items, amount, stage Closed won and four timeline events. Open the Platter CRM card on another deal in the fake, start a proposal from it, and see the proposal linked to that deal with its company, contacts and line items filled, and the card listing the proposal with its status.

*Status:* missing. No HubSpot connection.

#### CRM-002 — Salesforce two-way opportunity sync.

The owner or an admin connects Salesforce. Proposals start from an opportunity with account, contacts and price-book products, and Platter writes back opportunity line items, amount, stage, the proposal link and activity, under the same rules as `CRM-001`.

*Acceptance:* With a Salesforce API fake: create from an opportunity with price-book products, accept, and see opportunity products, amount and stage updated and the activity logged.

*Status:* missing. No Salesforce connection.

#### CRM-003 — Orbit two-way deal sync.

For firms on [Orbit](https://github.com/just-every/run-orbit), Platter syncs deals, contacts and line items both ways as in `CRM-001`.

*Acceptance:* Run the `CRM-001` journey against an Orbit instance.

*Status:* missing. No Orbit connection.

#### CRM-004 — Pipedrive and Zoho CRM sync.

Platter syncs deals, persons and products with Pipedrive and Zoho CRM as in `CRM-001`.

*Acceptance:* Run the `CRM-001` journey against Pipedrive and Zoho CRM fakes.

*Status:* missing. No Pipedrive or Zoho connection.

### Automation and integrations

#### AUTO-001 — Status-driven automations.

Admins set rules on proposal events (sent, viewed, commented, signed, paid, declined, expired): update the CRM, archive documents, create invoices, notify a channel, create a delivery project or start a follow-up. Each run is logged with its outcome and can be retried by hand; a failed step is visible and never silently dropped.

*Acceptance:* Set a rule on signed that archives the PDF, posts to Slack and creates an Asana project; sign; see three logged successes; break the Slack fake and see a failed step with a manual retry.

*Status:* missing. No automations.

#### AUTO-002 — Completed documents archived to file storage.

Signed PDFs, certificates and attachments are filed to Google Drive, Microsoft OneDrive or SharePoint, Box or [Chest](https://github.com/just-every/run-chest) in a folder per client, named by a pattern the admin sets.

*Acceptance:* Connect a Google Drive fake, complete an agreement and see the PDF and certificate in the client's folder with the configured name.

*Status:* missing. No document archiving.

#### AUTO-003 — Team chat notifications.

Proposal events, approvals and follow-ups post to Slack, Microsoft Teams or [Nook](https://github.com/just-every/run-nook) channels and direct messages, with links back and approval actions where `APPROVE-002` allows.

*Acceptance:* Route signed events to a Slack channel and approvals to a Teams direct message; sign and request approval; see both with working links.

*Status:* missing. No chat notifications.

#### AUTO-004 — Public REST API and webhooks.

A documented REST API creates proposals from templates, fills variables, reads status, analytics and payments, and lists agreements, under scoped API keys. Its documentation is an OpenAPI description served at a public route and rendered as a reference page, listing every public route with its scopes and every webhook event with its payload schema and an example. Signed webhooks deliver every lifecycle event, with retries and a delivery log.

*Acceptance:* Create a proposal from a template through the API with a scoped key, send it, receive signed webhooks for sent and signed, verify their signatures, and see a key without write scope refused. Fetch the published OpenAPI description and reference page: the route table the server registers and the documented routes match both ways (no undocumented public route, no documented route the server lacks), each documented route names its scope, and every webhook event type Platter emits is documented with an example that validates against its schema.

*Status:* partial. A session and agent command API only; no documented public API, scoped API keys or signed lifecycle webhooks. (`src/platter/http.ts`, `tests/platter.test.mjs`)

#### AUTO-005 — Zapier, Make and Crank apps.

Published Zapier and Make apps and a [Crank](https://github.com/just-every/run-crank) connector expose Platter's triggers (proposal sent, viewed, signed, paid) and actions (create proposal from template, add client).

*Acceptance:* Run a Zap in Zapier's test environment that creates a proposal from a form submission and fires on signed; run a Make scenario in Make's test environment that fires on paid and adds a client; run the same trigger and action against a Crank instance; each trigger fires once per event.

*Status:* missing. No automation-platform apps.

#### HAND-001 — Accepted-scope handoff to delivery tools.

On acceptance, Platter creates a project in Asana, Trello, monday.com, ClickUp, Jira or [Vector](https://github.com/just-every/run-vector) from the accepted scope: one task or section per accepted line item, with dates from the schedule and the agreement linked. The handoff records the external project ID and never runs twice.

*Acceptance:* Accept a proposal with four line items and an Asana fake connected; see one project with four tasks and the agreement link; replay the event and see no second project.

*Status:* missing. No delivery handoff.

#### HAND-002 — Handoff to Gauge with budget and rates.

For firms on [Gauge](https://github.com/just-every/run-gauge) or Harvest with Forecast, the accepted scope becomes a project with budget, roles, rates, milestones and billing schedule, so delivery tracks against what was sold. Gauge's actuals return to Platter for `AGENT-002` and `AGENT-006`.

*Acceptance:* Accept a proposal and see a Gauge project with budget hours, rates and milestones matching the agreement.

*Status:* missing. No Gauge handoff.

### Renewals and bulk sending

#### RENEW-001 — Bulk proposal creation and sending.

A member creates proposals for a list of clients (a CSV, a CRM list or every client with an agreement ending this quarter) from one template, with per-client variables and prices and the template's role slots (`SIGN-011`) filled per client from CSV columns or CRM contacts; a client whose signer role stays unfilled is held as an exception like a missing variable. Each proposal takes the template's reminder schedule and expiry period, or the workspace defaults where the template sets none (`FOLLOW-006`). The owner reviews a sample and the list of exceptions, approves the batch, and Platter sends at a set pace with one result per client.

*Acceptance:* Create 40 proposals from a template with a Client signer role and a pre-assigned countersigner, using a CSV in which three rows miss a variable and two have no signer contact; the five are held as exceptions naming the variable or role; approve the batch and see 35 sent at the set pace, each with its own link and timeline, its signer filled from the CSV and the owner as countersigner.

*Status:* missing. No bulk sending.

#### RENEW-002 — Renewal proposals from accepted agreements.

Before an agreement's term ends, Platter prepares a renewal from it with the same scope, an optional price increase the owner sets (percentage or amount), and the notice period stated in the agreement. It follows the `APPROVE-003` approval policy as any revision does. Evergreen agreements show their renewal and cancellation terms to the client before signing.

*Acceptance:* Accept a 12-month retainer; 45 days before term end a renewal draft with a 5% increase is waiting for approval; approve, send and accept it, and see a new schedule start when the old one ends.

*Status:* missing. No renewals.

### Reporting

#### REPORT-001 — Proposal pipeline dashboard.

A dashboard shows proposals by status (draft, awaiting approval, sent, viewed, accepted, paid, declined, expired) with value, owner, client, age and next action, filterable and sortable by each. This obligation covers every current workflow state (draft, approved, sent, accepted and withdrawn); `APPROVE-001` and `APPROVE-003` inherit awaiting approval, `TRACK-001` viewed, `PAY-004` paid, `FOLLOW-005` declined and `SEND-004` expired before those capabilities ship, with the same named fixture proof. The pipeline now uses TEAM-001 proposal visibility: owner/admin all, manager and viewer team scope, sales own/collaborator scope; content editor and billing pipeline access is refused until their content and revenue reports exist. A new proposal records its preparing person as its stable sales owner; an agent draft records the key owner. Later revisions never transfer ownership. Legacy rows whose sales owner was not recorded stay labelled "Not recorded", with no inference from a preparer string. Value is the highest offered option before acceptance and the exact selected total afterwards, in integer cents; currencies are totalled separately and value sorting groups by currency before amount, with no conversion. Age is the number of completed 24-hour days since creation. Next actions are approve revision, send approved offer, await client decision, export deposit invoice, deposit invoice exported, or prepare a new revision for a withdrawn offer, according to the current recorded state; `FOLLOW-002` inherits due follow-ups. Numeric filters include both bounds; equal sort keys use title then proposal id. Every filter applies before counts and totals.

*Acceptance:* Seed 30 proposals across statuses and owners, filter by owner and status, sort by value, and see the totals match a fixture.

*Status:* done. Named REPORT-001 public HTTP fixture of 30 proposals, 1440/390 browser journey and legacy CLI archive journey assert current states, owners, every field filter/sort, exact totals, separate currencies, authority and durable ownership. Future status capabilities inherit the same proof. (`src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### REPORT-002 — Win rate and sales performance.

Reports show win rate, time to sign, time to pay, average deal value and lost reasons by owner, template, service, client segment and period.

*Acceptance:* From a fixture of 100 decided proposals, see win rate, median time to sign, median time to pay, average deal value and lost-reason counts by owner, template, service, client segment and quarter, each matching the fixture's hand-computed values.

*Status:* missing. No conversion reporting.

#### REPORT-003 — Content and pricing performance.

Reports show which templates, library items, packages and optional items appear in won and lost proposals, how long clients read them (`TRACK-002`), and which packages clients choose.

*Acceptance:* In the `REPORT-002` fixture of 100 decided proposals, template Agency retainer is used on 40 proposals of which 18 are won; package Growth is offered on 30 and chosen on 12; optional item Rush delivery is offered on 25 and chosen on 6; and library item Acme case study appears in 20 proposals, 12 won and 8 lost, with `TRACK-002` reading times whose median is 95 seconds. The report shows Agency retainer at a 45.0% win rate, Growth at 40.0% take-up, Rush delivery at 24.0% take-up, and Acme case study in 12 won and 8 lost proposals with a median reading time of 1 min 35 s; every other template, package, optional item and library item row equals the fixture's hand-computed values.

*Status:* missing. No content analytics.

#### REPORT-004 — Booked, billed and collected revenue.

Reports show signed value, one-off and recurring (MRR and first-year value), invoiced, collected and overdue amounts by period and owner, reconciled with payments and accounting (`ACCT-004`).

*Acceptance:* Accept and pay a fixture of agreements and see booked, invoiced, collected and overdue totals match payments and the QuickBooks Online fake.

*Status:* missing. No revenue reporting.

#### REPORT-005 — Report export and scheduled delivery.

Any report exports to CSV and can be emailed on a schedule to named people.

Done when every report that exists today conforms: the `REPORT-001` pipeline. `REPORT-002`, `REPORT-003` and `REPORT-004` each add CSV export and scheduled email of their report, under the same rules, before they ship. The CSV holds the rows exactly as filtered and sorted on screen (title, client, owner, status, next action, currency, value as a decimal of the integer cents, age in completed days), then one total row per currency. Until `TEAM-001` adds the admin role, only the owner exports a report or creates and stops a schedule. A schedule saves the screen's filters and sort and runs daily, or weekly on a chosen weekday, at a whole hour in the installation's time zone (an IANA name the owner sets; UTC until set); the run follows daylight saving changes, takes the first occurrence of a repeated hour and the first instant after a skipped hour, and is checked every 15 minutes, so it runs at the first check at or after its time. It goes to one to ten named people who are active people of this installation, never an outside address; naming a member is the owner's explicit share of those figures, and anyone no longer active at run time is skipped and the run says so. Each run is claimed once, so overlapping checks never send it twice, and a run missed while the Worker was down runs once at the next check. The email repeats the screen's count, per-currency totals and rows in the screen's money format, as of the run time, followed by the CSV. Its outcome is labelled honestly per recipient: captured locally (no email sent), queued, accepted by provider, or provider result uncertain and not resent; Platter never claims delivery of report email. Schedules archive with the business records; report email stays local like proposal mail.

*Acceptance:* Schedule the weekly win-rate report to two people and export the pipeline to CSV; the email arrives with the same figures as the screen. Until `REPORT-002` ships the win-rate report, the journey schedules the weekly `REPORT-001` pipeline report, in a set installation time zone across a daylight saving change.

*Status:* done. `tests/platter.test.mjs` (named REPORT-005 journey) exports the filtered pipeline CSV and matches it to the screen, refuses members, outside addresses, empty recipient lists, bad hours, filters and time zones, sets America/New_York, fires the Worker's scheduled handler before and at the time and again at the same time, and receives one email per person with the same count, totals and rows as the `/app` screen, keeps 8 a.m. New York time across the daylight saving change, skips a deactivated person and stops the schedule; `tests/site.test.mjs` exports the CSV, sets the time zone and schedules and stops a weekly report at 1440 and 390 pixels.

### Team administration

#### TEAM-001 — Roles and permissions.

Every member has one role: owner, admin, manager, sales, content editor, viewer or billing. Members belong to one or more teams, and a manager manages the teams they are in. In the table, "Team" means proposals whose sales owner is in one of the person's teams, plus their own; "Own" means proposals whose sales owner they are, plus proposals shared with them as a collaborator; "All" means every proposal in the workspace. A collaborator can open, comment on and edit the one proposal shared with them, and sends it only when their role sends. The rights are exactly these, and every one is enforced on the server: an action outside them is refused (403) with no write, and a list or search omits what the person may not view.

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
| View reports (`REPORT-001` to `REPORT-005`) | All | All | Team | Own | Content reports only (`REPORT-003`) | Team | Revenue reports only (`REPORT-004`) |
| View and export the audit log (`TEAM-004`) | Yes | Yes | No | No | No | No | No |

Template and library folders can also be limited to teams (`EDIT-002`, `EDIT-003`): such a folder is listed and used only by members of those teams, admins and the owner. On upgrade, the first release's owner stays the owner and its members become sales members in no team, so each sees only their own proposals until the owner places them in teams. Agent keys are not a role and keep the draft-only rights of `ACCESS-001`.

Before this capability ships, it extends the `REPORT-001` dashboard and its named public-door fixture with the report rights matrix, including filters, sorting, counts and totals under its visibility rules.

Before shipping, extend FOLLOW-002 with personal time zones, sales-owner queues and manager access only to people in one of their teams, in its named journey.

*Acceptance:* The matrix journey runs the `TEAM-001` rights table cell by cell: for each right and each role it calls the action's public route (HTTP, and the browser where the right is a screen) and expects success with the write, or 403 with no write, and list and search routes return exactly the proposals the View row allows. These cells are also pinned by name. (1) A sales member lists and opens another sales member's proposal: it is absent from the list and opening it is refused (403); once the other member shares it with them as a collaborator it lists, opens and edits, and they send it. (2) A manager opens a proposal whose sales owner is outside their teams (403) and one whose sales owner is in their team (200). (3) A sales member's view of a pricing table in the editor, the team API and the PDF export carries no cost or margin field, while a manager's does (`PRICE-006`). (4) A content editor edits a library item (200) and sends a proposal (403). (5) A billing user refunds part of a deposit (200, and the refund reaches the Stripe fake), and a sales member's refund is refused (403, no Stripe call). (6) A sales member disconnects QuickBooks Online (403, the connection unchanged), and an admin disconnects it (200). (7) A sales member and a manager change the workspace reminder and expiry defaults (403, the defaults unchanged), and an admin changes them (200). After an upgrade from a first-release database, the former member holds the sales role and sees only their own proposals.

*Status:* partial. Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read/edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts/sorting/totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, ownership/deletion controls and full content/revenue report capabilities. Collaborator grants currently preserve role limits; the relationship between the collaborator sentence and No/Team cells needs ct clarification. Catalog edit/insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates/team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. Conservative invitation default pending ct approval: the inviter’s native/product version, allowed role and team authority must still hold at acceptance; a fresh authorized reissue rotates old links. Folder audience changes require explicit audited consent. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google/Microsoft mailbox connections now ship; the QuickBooks admin/sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Conservative default pending ct approval: a connected mailbox must match the member’s sign-in address; SEND-001 inherits OAuth refresh and actual mailbox sending before completion. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder/expiry/payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001/FOLLOW-006 work. These are foundations in this seed, not account blockers.

#### TEAM-002 — Single sign-on and SCIM provisioning.

Members sign in through SAML or OIDC from [Auth](https://github.com/just-every/run-auth), Okta, Microsoft Entra ID or Google Workspace, and are created, updated and removed through SCIM with role mapping. Removing a member ends their sessions and keeps their proposals with a new owner.

*Acceptance:* Sign in through an Okta fake with SAML, provision and deprovision through SCIM, and see sessions ended and proposals reassigned.

*Status:* missing. No SSO or SCIM.

#### TEAM-003 — Multiple brands and workspaces.

A firm runs several brands or business units, each with its own brand kit, domain, templates, library, catalog, Stripe account and accounting connection, with members in one or more.

*Acceptance:* Create two brands with separate Stripe and QuickBooks fakes; a proposal from brand B uses B's brand, domain and Stripe account, and B's members cannot see A's library.

*Status:* missing. One workspace and brand.

#### TEAM-004 — Audit log.

Every action by people, agents and integrations (edits, approvals, sends, views, signatures, payments, refunds, setting and permission changes) is logged with actor, time and subject, searchable by admins and exportable to CSV. This applies to every capability that exists today: successful client and proposal commands, revision restore and negotiation, tracked text suggestions and review, vendor-document settings and proposal file upload/refresh/download, agent-key management, client invitation views and verification/acceptance, client-import preview/apply/journal/undo, invoice export/download, and native Base authentication, setup, settings and permission actions. The owner and product admins search and export CSV; other roles are refused (403), as proved by the TEAM-001 role journey as well as the original audit journey. Rows retain an opaque actor record id and role (agent key id for agents), action, subject record id and server epoch-millisecond time. Unverified invitation views identify an unknown person, never the named client; verified client actions identify the client record. Credentials, codes, command payloads, IP addresses, devices and invitation tokens are never copied into the log. Exact actor/action/subject filters combine with case-insensitive literal search and inclusive epoch-millisecond time bounds; CSV returns the same ordered filtered rows. Audit rows travel in the business archive. Logging starts on upgrade; earlier history is not invented. Refused actions write nothing, preserving `HTTP-001`.

Every future capability must extend this audit journey before shipping: document and pricing actions (`EDIT-001`–`EDIT-018`, `CAT-001`, `PRICE-001`–`PRICE-007`), approval and team settings (`APPROVE-001`–`APPROVE-003`, `TEAM-001`–`TEAM-003`), recipient/notification/follow-up and tracking actions (`SEND-001`–`SEND-010`, `FOLLOW-001`–`FOLLOW-006`, `TRACK-001`–`TRACK-004`), signature/payment actions (`SIGN-003`–`SIGN-011`, `PAY-001`–`PAY-009`), integration actions (`CRM-001`–`CRM-004`, `ACCT-001`–`ACCT-007`, `AUTO-001`–`AUTO-005`, `HAND-001`–`HAND-002`), renewals, report delivery, migration, privacy and agent actions (`RENEW-001`–`RENEW-002`, `REPORT-002`–`REPORT-005`, `MIG-001`–`MIG-007`, `PRIV-001`, `AI-001`–`AI-004`, `AGENT-001`–`AGENT-009`).

*Acceptance:* Perform every currently supported kind of action through HTTP and see each in the log with its actor, subject and server time; exact filters, literal search and inclusive bounds return the matching rows, and CSV exports those same rows. Exercise person, agent, unidentified invitation and verified client actors; confirm refused actions write nothing and secrets/payloads are absent. Search and download in the real app at 1440 and 390 pixels; member and signed-out audit access is refused. Export and restore through the public CLI and see audit rows preserved exactly. Each future capability named above inherits the same assertion before shipping.

*Status:* done. Named TEAM-004 HTTP, browser and CLI archive journeys assert every current action kind and audit custody. (`src/platter/audit.ts`, `src/platter/auth-audit.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### TEAM-005 — Security review pack for procurement.

A buyer's procurement or IT team gets what they ask an incumbent for. A security page states each control Platter implements (encryption and credential custody `SEC-001`, access control `TEAM-001` and `TEAM-002`, audit `TEAM-004`, erasure `PRIV-001`, archives and restore `PORT-001`), each linked to the clause and test that prove it. The pack also holds a subprocessor list, a data processing addendum, and completed standard questionnaires (CAIQ Lite and SIG Lite). For Run Edit Run's hosted service it includes the current SOC 2 Type II report, delivered under NDA on request. For a self-hosted installation, the pack states which controls the installer's own Cloudflare account carries.

*Acceptance:* Open the security page: every control statement links to a clause whose status is done, and none links to a partial or missing clause; download the subprocessor list and DPA; request the SOC 2 report, accept the NDA and receive the report for the current period; a questionnaire answer naming a control links to the same clause as the page.

*Status:* missing. No security page, questionnaire answers, DPA, subprocessor list or audit report.

### Migration from incumbents

#### MIG-001 — PandaDoc move-in.

A PandaDoc customer on any plan moves in without API access, because PandaDoc gives Business and Starter accounts only its Sandbox API and keeps the Production API for approved Enterprise accounts. Through the self-serve route of `MIG-007`, the buyer uploads PandaDoc's bulk download zips (PDFs in the account's folder tree, with the eSignature certificate pages on completed documents, exported in batches of 200 to 300 and without attachments) and PandaDoc's catalog CSV (Name, SKU, Type, SKUs_in_bundle, Category, Price, Cost, Currency, Description, Images, Billing_frequency and custom-field columns). The mapping: completed documents with a certificate become retained, read-only agreements keeping the original PDF and certificate byte-identical with their SHA-256 recorded; open documents (draft, sent or viewed) become fixed-page drafts from their PDF (`EDIT-005`), or editable drafts where the buyer also uploads the document's Word download, and either can be reissued under `MIG-005`; the folder tree becomes Platter folders (`EDIT-016`); catalog rows become catalog items (`CAT-001`) with each URL in the Images column fetched as the item's image, bundles become packages, and non-USD rows are listed rather than converted; each template's body comes from its Word download (in PandaDoc, open the template and choose File, then Download, then Microsoft Word, offered on Starter, Business and Enterprise plans once the account owner allows Word downloads), converted to editable blocks with PandaDoc tokens such as `[Client.Company]` and `[Sender.FirstName]` mapped to variables (`EDIT-004`) and each quote or pricing table turned into a `PRICE-001` pricing table whose rows are matched to the imported catalog by SKU or name, with unmatched rows listed (`EDIT-005`); content library items, which PandaDoc does not let customers download, come across by inserting them into one PandaDoc document, downloading that document as Word and importing it as library items split at each Heading 1 (`EDIT-005`); a template the buyer has only as a PDF arrives as fixed pages listed as "Word download needed for editing"; contacts come from the connected CRM (`CRM-001` to `CRM-004`) or a contacts CSV, including the file PandaDoc support provides on request (`MIG-006`), because PandaDoc has no self-serve contact export. Where the buyer has the Production API, Platter also reads document statuses, recipients, template roles, fields, tokens, pricing-table items and folder metadata to enrich what the files carry; each template role becomes a `SIGN-011` role with its signing order, its field assignments and any pre-assigned recipient. PandaDoc's template details response holds no body text, so a template found through the API is listed as "convert from Word download" with its roles and tokens kept, and its body arrives only from its Word file. Without the Production API, the import report states what arrived (signed agreements with certificates, open documents as drafts, folders, catalog, converted template and library bodies, and contacts from the CRM or CSV) and lists as unmapped what the files cannot carry: attachments, template roles, pricing-table formulas, images PandaDoc leaves out of quote tables in Word downloads, comments, view analytics and audit events beyond the certificate. Everything runs under `IMPORT-001`'s preview, journal and undo.

*Acceptance:* With fixtures in PandaDoc's real export shapes, namely two bulk zips (250 and 40 PDFs) with a three-level folder tree, completed documents carrying certificate pages and open documents without, a catalog CSV with the export columns, a bundle row and a custom-field column, and a template details JSON response with roles and tokens and no body: preview and apply with no API key, and see completed documents as retained agreements whose PDFs and certificates are byte-identical with matching SHA-256, open documents as drafts, folders matching the tree, catalog items and the bundle package matching the CSV with each row's Images URL fetched from a file-host fake as the item's image, and a report listing what arrived and each unmapped kind. Then connect a PandaDoc API fake returning the template details response: the template is listed as "convert from Word download" with its roles and tokens; once its Word download is converted, the template carries the response's two roles with their signing order and pre-assigned recipient, and each field the response lists is added assigned to its role. Upload its Word download, a .docx with headings, an image, `[Client.Company]` tokens and a six-row quote table with five SKUs in the imported catalog CSV and one unknown: the result is a template with editable blocks, the tokens as variables and a pricing table of six priced line items, five linked to catalog items and one listed as unmatched. Upload, as library items, the Word download of one PandaDoc document holding 10 inserted library items, and get 10 items. Upload another template only as a PDF and see fixed pages listed as "Word download needed for editing". Uploading the same zip again adds nothing; undo the import.

*Status:* missing. No PandaDoc import.

#### MIG-002 — Proposify move-in.

Platter imports Proposify templates, content library sections, fee tables, clients and proposals through the Proposify API where the buyer has it (Proposify offers its API on the Business plan, enabled by its Customer Success team), with signed proposals as read-only agreements and open ones as drafts. Without API access, the buyer uses the `MIG-007` route: proposal PDFs downloaded from Proposify, with signed ones kept as retained agreements with their signature page byte-identical and open ones as drafts for reissue; Proposify's documents report exported as CSV for status, value, client and dates, matched to each PDF; clients and catalog items by CSV (`MIG-006`) or from the CRM; and templates and library sections, which Proposify offers no Word download for, arriving as fixed pages from the PDF of a proposal made from each one (`EDIT-005`) and listed in the report as "rebuild in the editor", never converted. A template or section that the API returns without its content is treated the same way. Either way the import report states what arrived and lists what did not map, under `IMPORT-001`'s preview, journal and undo.

*Acceptance:* Run the `MIG-001` journey against a Proposify API fake; then, with no API, import 30 Proposify PDFs and a documents report CSV and see each PDF matched to its report row with status, value and client, signed ones retained byte-identical, open ones as drafts, and the unmapped list stated; a template supplied as a Proposify PDF arrives as fixed pages listed as "rebuild in the editor", with no Word conversion offered.

*Status:* missing. No Proposify import.

#### MIG-003 — Better Proposals move-in.

Platter imports Better Proposals templates, content, contacts and proposals through its API where the buyer's plan includes API access, and otherwise through the `MIG-007` route from downloaded proposal PDFs and CSV files, under the same preview, journal and undo and with the same report of what did not map.

*Acceptance:* Run the `MIG-001` journey against a Better Proposals API fake, then run the no-API journey of `MIG-002` with Better Proposals PDFs and a contacts CSV.

*Status:* missing. No Better Proposals import.

#### MIG-004 — Qwilr and Ignition move-in.

Platter imports Qwilr pages, templates and quotes through its API where the buyer's plan has it enabled, and otherwise from Qwilr PDF exports through `MIG-007`; it imports Ignition clients, services, proposals and billing schedules from Ignition's exports. Both run under the same preview, journal and undo.

*Acceptance:* Run the `MIG-001` journey against a Qwilr API fake and against Qwilr PDF exports with no API, and against an Ignition export fixture including one active billing schedule.

*Status:* missing. No Qwilr or Ignition import.

#### MIG-005 — Open proposals and payment schedules continue.

At move-in, proposals sent but not signed in the old tool can be reissued from Platter with a new link, and signed agreements with active Stripe schedules or subscriptions are adopted by their Stripe IDs, so no client is charged twice and no scheduled payment is missed. A reissued proposal links to the imported original and is listed for the buyer to void in the old tool. An open document that arrived only as a PDF is reissued as fixed pages (`EDIT-005`): the original pages unchanged, with signature, initials and date fields placed where the PDF's signature block was detected or where the member puts them, and with no interactive pricing, optional items or payment collection unless the member appends a pricing table and sets a payment schedule before approval. The import report and the reissue screen say this and offer the Word route: an open document whose Word download was also uploaded is reissued as an editable proposal with live pricing tables (`PRICE-001`).

*Acceptance:* Import an Ignition agreement with an active Stripe subscription fake, adopt it, advance a month and see exactly one charge recorded against the imported agreement. Import a PandaDoc document that was sent but not signed and reissue it: it follows the `APPROVE-003` approval policy, the client gets a new Platter link, the new proposal links to the imported original, and the original is listed as "void in PandaDoc".

*Status:* missing. No in-flight migration.

#### MIG-006 — Clients, contacts and catalog CSV move-in.

The CSV kit imports companies, contacts with titles and phone numbers, billing and service addresses, tax-exempt status and catalog items, with the preview, fingerprint, journal and undo of `IMPORT-001`. It reads the incumbents' own contact and catalog CSV layouts (including PandaDoc's catalog CSV and the contact file PandaDoc support provides) as well as Platter's.

Current owner-only imports use published layout presets and a reviewed delimiter/column mapper for differing or undocumented exports, leaving original files unchanged. Company associations use explicit source IDs or reviewed exact label-to-ID associations, never inferred merges. Existing IDs and exact email conflicts are held with diagnostics; exports lacking IDs get identities scoped to the exact file and row. The fingerprint binds CSV bytes, mappings, associations, acquired image bytes and any explicit omission confirmation. Original files, every source column, journals, native records and undo custody survive `PORT-002` archives. Unchanged legacy client imports and their journals remain available.

Catalog metadata preserves decimal strings (PandaDoc price/cost through five decimal places), currency, price type/range, recurrence, category paths, resolved SKU/quantity bundles, images and arbitrary custom fields. Unmapped columns and non-USD rows are reported, never discarded or converted. Imported metadata neither calculates charges nor certifies tax exemptions; `CAT-001`, `PRICE-001`, `PRICE-003` and `MIG-001`..`MIG-004` inherit its lossless custody when they consume these records. Image acquisition uses credential-free HTTPS, validated public A/AAAA answers, connection to the validated literal IP without another DNS resolution, hostname-verified TLS, no redirects, PNG/JPEG/GIF/WebP byte-type checks and 5 MiB per-image / 20 MiB per-import limits. Unfetched URLs are listed as metadata and block apply unless the owner explicitly confirms importing that file without them; this decision is fingerprint-bound and the records say `not-fetched`. A runtime without hostname verification never bypasses TLS or claims image acquisition; such an installation remains partial for image fetching.

*Acceptance:* Import a CSV of 200 contacts across 60 companies with addresses and exemptions, and 50 catalog items, preview, apply and undo; import PandaDoc's catalog CSV layout unchanged and see the same items as `MIG-001`. Named public HTTP journeys assert original catalog/contact layouts, reviewed mappings for differing exports, titles/phones/addresses/exemptions, exact prices, bundles, recurrence/custom fields, file-host-edge image bytes, explicit image omission, conflicts, owner authority, resumable apply and dependent-record undo protection. Browser journeys at 1440 and 390 finish preview/apply/journal/undo and explicit omission; the public CLI restores records and original CSV/image bytes with working undo. A real pinned-workerd probe fetched a public PNG and rejected a mismatching TLS hostname; provider fakes establish Platter's handling, not hosted provider certification.

*Status:* partial. (`src/platter/movein/business-import.ts`, `src/platter/business-records.ts`, `src/platter/ui/business-import.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

The DoH-checked, literal-IP-pinned path with original-hostname startTls, redirect refusal and explicit acquisition failure is proven in local pinned workerd, including a negative TLS probe. Cloudflare edge behavior is not yet proven (workerd #6903). No bypass or fallback is used; the owner can still explicitly apply without images. Gap: image URLs fetched through Base's egress relay.

#### MIG-007 — Move-in from exported files without API access.

For every incumbent, a buyer without API access moves in from the files the incumbent lets any customer export: document PDFs (one at a time or in bulk zips, across several uploads into one import), catalog and contact CSVs, and report CSVs. Platter detects signed documents by their signature certificate or signature page and keeps them as retained, read-only agreements with the original file byte-identical and its SHA-256 recorded; matches each PDF to report rows by title, client and date and holds ambiguous matches for the buyer to review; converts template and library files to editable blocks (`EDIT-005`); and resumes an interrupted upload without duplicating anything. Every import ends with a report of what arrived, what is held for review and what did not map, under `IMPORT-001`'s preview, journal and undo.

*Acceptance:* Import three zips in two sessions with an interrupted upload between them and one PDF present in two zips: there is one agreement per document and nothing is duplicated; an ambiguous report row is held for review until the buyer picks its PDF; the report's counts of arrived, held and unmapped items match the fixture; undo removes everything the import wrote.

*Status:* missing. No document import; only the client CSV kit exists.

### Mobile

#### MOB-001 — Team app on a phone.

On a phone browser, a sales member creates a proposal from a template, sends it, answers a client question and checks the follow-up queue, and an approver role approves a request under the `APPROVE-003` policy.

*Acceptance:* A browser journey at 390 pixels completes each of those actions, the sends and answers as a sales member and the approval as a manager; the same approval attempted by the sales member is refused (403).

*Status:* done. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” completes template creation, sales sending, a verified client question and sales answer, sales follow-up management, personal-template reuse, manager approval and the sales approval refusal (403), at both 390 and 1440 pixels. All acceptance actions are proven through the compiled production routes.

#### MOB-002 — iOS and Android apps with push notifications.

Native iOS and Android apps give members the follow-up queue, proposal status, client questions, approvals and payments, with push notifications for views, questions, signatures, payments and approval requests.

*Acceptance:* On iOS and Android test devices, sign in, receive a push when the client views and signs, approve a request, and answer a question.

*Status:* missing. No native apps or push.

### AI assistance

#### AI-001 — Drafts from meeting notes, transcripts and email.

A member pastes notes, uploads a transcript or picks an email thread or a recorded Zoom, Google Meet or Microsoft Teams call, and Platter drafts a proposal from the firm's templates, library and catalog, starting from the template's role slots (`SIGN-011`) with the people named in the source offered for each slot, and with the template's reminder schedule and expiry period (`FOLLOW-006`). Each drafted section cites the source line it came from. The draft is sent only by a person who may send it, under the `APPROVE-003` policy like any proposal; a draft an agent key prepared always needs a person's approval (`PROP-001`).

*Acceptance:* Draft from a fixture transcript; every section cites a transcript line; prices come only from catalog items; under the default policy the draft needs approval before sending, and the same draft prepared through an agent key is refused at send (409) until a manager or the owner approves it even with "approval required for every proposal" off.

*Status:* partial. External agents can post structured drafts; there is no ingestion of notes, transcripts or email and no in-product drafting. (`src/platter/http.ts`, `tests/platter.test.mjs`)

#### AI-002 — Writing assistant in the editor.

In the editor a member asks to rewrite, shorten, adjust tone, summarize or translate a block; the suggestion appears as a change to accept or reject, and never edits pricing.

*Acceptance:* Ask to shorten a section, see a suggested change, accept it, and see a request to change a price refused.

*Status:* missing. No writing assistant.

#### AI-003 — MCP server for AI assistants.

An MCP server lets Claude, ChatGPT and other assistants search proposals, read status and engagement, draft from templates and request sending, under scoped, revocable keys. Assistants can request but never approve, send, sign or refund. Every capability available today conforms: the stateless Streamable HTTP endpoint `/api/platter/agent/mcp` uses existing owner-bound, draft-only agent keys (`ACCESS-001`), with their current expiry, immediate revocation and account-version binding. Tools search proposals and existing clients, read current offer/status and recorded delivery/acceptance, prepare or version-guard a structured draft, and queue an exact draft/approved revision for the owner. View and reading analytics are honestly unavailable, and provider acceptance is never claimed as delivery or reading. `EDIT-002` inherits drafting from templates and `TRACK-001`/`TRACK-002` inherit engagement tools and their same named MCP journey before shipping. `TEAM-001` inherits its visibility rules before shipping. No template, tracking or role capability is simulated.

An owner send request is a retained request, never authorization: it changes no offer, approval or mail. Repeating an active request for the same key, proposal and revision returns the same row. A later revision makes it visibly stale. The owner opens Agent access, reviews the proposal, explicitly approves and sends it under the standing policy, and may mark a request fulfilled only after that exact revision is sent or accepted; the owner may dismiss a request without sending. Other roles cannot read or resolve the queue. Requests and their opaque key provenance travel in archives; keys do not. MCP tool actions extend `TEAM-004`'s audit journey.

*Acceptance:* Connect an MCP client with an existing scoped key; initialize and list schemas; search existing clients/proposals, prepare and revise a draft, read status and the honestly labeled engagement fields, request sending and see one retained owner request on replay, with no approval, offer or mail change. Approve/send/sign/refund tool calls are refused, as are revoked keys and foreign origins. Edit a requested revision and see the stale request; the owner dismisses it, approves and explicitly sends the current revision, then marks only that revision's request fulfilled. A premature fulfillment is refused (409), members cannot read/resolve the queue (403), and invitation credentials are absent from tool responses. Exercise the real queue at 1440 and 390 pixels; export and restore requests and resolutions through the public CLI with credentials excluded. `EDIT-002`, `TRACK-001`, `TRACK-002` and `TEAM-001` extend this journey before shipping.

*Status:* done. Named AI-003 HTTP MCP client, browser queue and CLI archive journeys assert all current tools, request boundaries, immediate revocation and custody. (`src/platter/mcp.ts`, `src/platter/send-requests.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`)

#### AI-004 — Explainable price suggestions.

For each line item, Platter suggests a price range from the firm's own accepted and lost proposals for the same catalog item and client segment, with the sample size and examples shown. The member decides; suggestions are never applied silently.

*Acceptance:* From a fixture history, see a suggested range with sample size and three linked examples, and see the price unchanged until the member applies it.

*Status:* missing. No price suggestions.

### Privacy, security and portability

#### PRIV-001 — Erasure across contacts, tracking and synced systems.

An owner handles a US privacy request (CCPA/CPRA or similar): erase a contact's personal data, viewing data and comments from proposals that are not retained agreements, and record which retained agreements keep it as business records. Synced CRMs and file stores are listed with what to erase there.

*Acceptance:* Erase a contact who viewed two drafts and signed one agreement; their views and draft data are gone, the agreement remains with a retention note, and the receipt lists the HubSpot fake record to erase.

*Status:* partial. Only unused client records can be erased; no contacts, tracking data or notice to synced systems. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

#### PORT-002 — Complete product archive.

Archives and restore cover everything in the product: templates, library, catalog, media, signed PDFs and certificates, payment and invoice records, reports' source data and integration mappings, under `PORT-001`'s rules. Provider credentials never travel. Every record kind supported today must round-trip, including clients, draft/sent/accepted proposals, revisions, approval history, immutable acceptances, retained invoice files and client-import originals, journal and provenance. `EDIT-002`, `EDIT-003`, `CAT-001`, `EDIT-006`, `EDIT-010`, `SIGN-005`, `PAY-001` to `PAY-009`, `REPORT-001` to `REPORT-005`, `CRM-001` to `CRM-004`, `AUTO-001` to `AUTO-004` and `SEC-001` inherit archive/restore coverage of their new record kinds and credential exclusion before shipping. No provider connection exists today; agent keys, native sessions, client invitations, verification state and mail stay local under `PORT-001`.

*Acceptance:* Export an installation with every record kind, restore into an empty one, and re-export identical parts; no provider token appears in the archive.

*Status:* done. Named PORT-001 / PORT-002 public CLI journey populates every current business record kind, restores identical archive parts and public state/import custody/invoice files, and proves private credentials stay local. Future record kinds inherit this proof before they ship. (`tests/archive.test.mjs`, `src/platter/archive-policy.mjs`)

#### SEC-001 — Provider credential custody.

OAuth tokens and API keys for Stripe, CRMs, accounting, mail and storage are encrypted at rest, scoped to the least access each connection needs, never shown again after setup, excluded from archives and logs, and revocable from settings, with a visible state when a connection breaks. Only the owner and admins connect or disconnect the workspace's payment, accounting, CRM, file storage, chat and SSO providers; each member who sends connects only their own mailbox (`SEND-001`), as `TEAM-001` sets.

*Acceptance:* Connect each provider fake, inspect the database and logs for tokens in clear (none), revoke one connection and see its state change and its jobs stop; a sales member's attempt to disconnect QuickBooks Online is refused (403).

*Status:* partial. Stripe, QuickBooks, HubSpot, Salesforce, Drive, Slack, Google and Microsoft tokens are sealed with purpose-separated AES-GCM, omitted from API/UI/log fields and excluded from archives. tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens” proves connection authority, plaintext absence and disconnect; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves metadata restoration requires reconnection. Gap: SSO provider credentials, OAuth refresh and job-stop assertions for future synchronization jobs.

## Push further

These clauses take the job past today's up-and-comers. Qwilr drafts from meeting notes and Ignition suggests prices; Platter's agents also test a draft against what delivery actually costs, chase every open question and payment exception to a resolution, and turn scope creep into a change the client approves separately. Each says what the agent does, on which data, and under what human control. Agents act through the same doors as people and hold no authority to approve prices, send, sign, refund or write off (`AGENT-009`, `ACCESS-001`).

#### AGENT-001 — Discovery call to priced draft.

The agent reads discovery call transcripts (Zoom, Google Meet, Microsoft Teams or an uploaded recording), the email thread, CRM deal notes and the firm's past winning proposals, and drafts the scope with two or three priced packages from the catalog. Every requirement, assumption and exclusion cites its source. The agent flags what the client asked that the firm does not offer. A member edits, and because an agent prepared it the draft always needs a person's approval from an approver role before it is sent (`PROP-001`, `APPROVE-003`).

*Acceptance:* From a fixture call and email thread, the draft's every scope line cites a source, every price is a catalog item, an unmatched request is flagged, and sending is refused until approval.

*Status:* partial. Agents can submit drafts that the owner must approve; there is no transcript ingestion, catalog matching or citations. (`src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs`)

#### AGENT-002 — Scope and price tested against delivery reality.

Before approval, the agent tests the draft against the firm's actual delivery data: hours and costs on similar past projects from Gauge, Harvest or QuickBooks Online job costing, team capacity in the proposed dates from Gauge or Forecast, and past win rates and margins for similar proposals. It shows an assumptions table (hours per line, blended cost, utilization, contingency), the expected margin range and the capacity conflict, if any. It suggests changes but never changes a price or date itself; the owner accepts or rejects each.

*Acceptance:* With Gauge and QuickBooks fixtures where similar projects overran by 30%, the agent shows the margin falling below the firm's floor, cites the projects, flags a capacity conflict in week 3, and the price stays unchanged until the owner applies a suggestion.

*Status:* missing. No delivery cost, capacity or outcome data is read.

#### AGENT-003 — Client questions chased to resolution.

The agent watches client questions, comments and email replies, drafts precise answers that cite the proposal, library and agreement terms, and prepares a revision when an answer changes scope or price (`NEG-001`). Each question stays open until answered and acknowledged or until the proposal is decided. The proposal's sales owner approves every message, and the revision is sent only after approval under `APPROVE-003`; contact frequency and stop rules are the owner's.

*Acceptance:* Ask three questions as the client, one of which needs a price change; the agent drafts two answers and a revision; no answer reaches the client until the proposal's sales owner approves it, and the revision is refused at send (409) until a manager or the owner approves it; the queue shows each question until it is acknowledged.

*Status:* missing. No question tracking or agent.

#### AGENT-004 — Engagement-driven follow-up.

The agent decides the next action for each open proposal from views, section reading, questions and CRM activity, and drafts a follow-up that refers to what the client actually read ("you spent time on the retainer option"). The sales owner sends, edits or skips each, or pre-approves templated nudges within a cap; nothing is sent outside the owner's limits.

*Acceptance:* Two clients read different sections; the agent drafts two different follow-ups that name those sections; with a cap of two nudges, a third is refused.

*Status:* missing. No engagement data or follow-up agent.

#### AGENT-005 — Payment exceptions closed without duplicate invoices.

The agent compares accepted schedules, Stripe events and accounting invoices, and finds failed, duplicate, partial, unmatched or disputed amounts. For each it explains the cause, drafts the client follow-up or the accounting correction, and proposes refunds or write-offs. The owner approves every refund, write-off and message; a payment is settled only on provider evidence, and the agent verifies reconciliation after each fix.

*Acceptance:* Seed a duplicate invoice, a failed ACH debit and an unmatched check; the agent opens three exceptions with causes; after the owner approves the fixes, reconciliation shows no mismatch and no second invoice exists.

*Status:* partial. Duplicate local exports are prevented; there is no provider event matching, exception queue or agent. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### AGENT-006 — Out-of-scope delivery turned into a change order.

The agent reads delivery actuals and change requests from Gauge, Asana, Jira, Vector or email, compares them with the accepted inclusions and exclusions, and prepares a separately priced change order linked to the original agreement. The delivery lead confirms the scope difference, an approver role approves the price under `APPROVE-003` (an agent-prepared change order always needs approval), and the client accepts and pays the change order on its own. The original agreement and its history never change.

*Acceptance:* With a Gauge fixture showing 40 hours on a feature listed as excluded, the agent prepares a change order citing the exclusion and hours; after confirmation and approval the client accepts and pays it; the original agreement is byte-identical.

*Status:* missing. No delivery signals or change orders.

#### AGENT-007 — Win and loss learning for templates and pricing.

After proposals are decided, the agent finds which sections, packages, prices, discounts and timings go with wins and losses, with sample sizes, and proposes edits to templates, the library or catalog prices as suggestions. An admin accepts or rejects each; nothing in the library changes silently.

*Acceptance:* From a fixture of 200 decided proposals where a three-package layout wins more often, the agent proposes the template change with the sample size, and the template is unchanged until an admin accepts it.

*Status:* missing. No outcome analysis.

#### AGENT-008 — Renewal preparation from delivered results.

Ahead of a renewal (`RENEW-002`), the agent assembles what was delivered (from Gauge or the delivery tool), usage and outcomes, suggests a scope and price for the renewal with the reasoning, and drafts the renewal proposal for approval.

*Acceptance:* For a retainer that used 20% more hours than sold, the agent drafts a renewal with a larger package, cites the hours, and waits for approval.

*Status:* missing. No renewal agent.

#### AGENT-009 — Agent authority ledger and limits.

Every agent action is logged with the data it read, what it produced, the model used and who approved it. Agents can draft, analyze and request, and can never approve prices, send, sign, refund or write off. The owner sets a monthly model budget and can pause any agent at once.

*Acceptance:* Run each agent once; the ledger lists inputs, outputs and approvals for each; an agent's attempt to send or refund is refused; pausing an agent stops its next run; exceeding the budget stops runs with a notice.

*Status:* partial. Agent keys are limited to drafting and are revocable; there is no per-action ledger, source citations, budget or pause control. (`src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs`)

## Honest boundaries

What Platter does not do, and how a US buyer gets it:

- **Moving or holding money.** Platter never holds client funds, operates card or ACH networks, extends credit or stores card or bank numbers. Payments run through the firm's own Stripe, PayPal, Square or Authorize.net account (`PAY-001`, `PAY-009`); firms that take payment through QuickBooks Payments take it on the accounting invoice, and Platter reads the paid state back (`ACCT-001`). Card surcharging and fee pass-through are offered only where the firm confirms card-network rules and state law allow them.
- **Filing sales tax.** Platter calculates and shows sales tax and records exemption certificates (`PRICE-005`); registering, filing and remitting returns stays with Stripe Tax, Avalara or the firm's accountant.
- **Notarization and qualified trust services.** Platter provides ESIGN and UETA signatures with SMS and ID verification options (`SIGN-003`, `SIGN-006`). Remote online notarization goes through a notary platform such as Proof, and documents that require wet signatures by law (such as some real-estate and family-law instruments) are out of scope.
- **Legal advice.** Platter records consent, intent and audit evidence; whether a given agreement is enforceable is for the firm's counsel.
- **The full CRM, ledger, signing, CLM, billing and delivery products.** Work and project management also has its separate sibling [Pegboard](https://github.com/just-every/run-pegboard). These are separate products with their own buyers (see Neighboring products). Platter syncs with them and never becomes them.
- **Currencies and tax regimes outside the US.** New proposals are USD with US sales tax. First-release AUD agreements remain exact (`PRICE-008`); other currencies and VAT or GST are outside this target.
- **Live provider proof.** Local journeys use fakes at provider edges. Hosting, mail delivery, Stripe, CRM and accounting connections require the installer's own accounts and are proven in each provider's sandbox before a release claims them.

## Scope mapping

How the approved scope for Platter (category, incumbents, missing items and push-further aim) maps to clauses.

| Approved scope item | Clauses |
| --- | --- |
| Branded drag-and-drop proposal editor with templates, reusable content and service libraries, images, video and PDF/Word import and export | `EDIT-001` to `EDIT-018`, `CAT-001` |
| Interactive USD pricing tables with optional items, packages, quantities, recurring fees, discounts and configurable US sales tax, replacing the two-option GST-free AUD format | `PRICE-001` to `PRICE-008`, `CAT-001` |
| Tracked sending with view and section-level engagement analytics, reminders, expiry, comments and negotiated revisions | `SEND-001` to `SEND-010`, `TRACK-001` to `TRACK-004`, `FOLLOW-001` to `FOLLOW-006`, `NEG-001`, `NEG-002` |
| Legally binding e-signature (ESIGN/UETA) with audit trail and a downloadable signed agreement, plus multi-signer support | `SIGN-001` to `SIGN-011`, `SEND-007` |
| Stripe card and ACH collection of deposits, milestone and recurring payments at acceptance, synced to QuickBooks Online and Xero | `PAY-001` to `PAY-009`, `ACCT-001` to `ACCT-007`, `INV-001` |
| Two-way HubSpot, Salesforce and Orbit deal sync with line items, plus pipeline and win-rate reporting | `CRM-001` to `CRM-004`, `REPORT-001` to `REPORT-005` |
| Import and migration from each named incumbent and up-and-comer | `MIG-001` to `MIG-007`, `IMPORT-001` |
| Roles, approvals, mobile, follow-up and the integrations the category runs on | `TEAM-*`, `APPROVE-*`, `MOB-*`, `FOLLOW-*`, `AUTO-*`, `HAND-*`, `SEND-001` |
| Push further: drafts from discovery calls tested against delivery costs, capacity and past win and margin outcomes with assumptions visible | `AGENT-001`, `AGENT-002`, `AGENT-007`, `AI-001`, `AI-004` |
| Push further: client questions and payment exceptions chased to resolution | `AGENT-003`, `AGENT-004`, `AGENT-005` |
| Push further: out-of-scope delivery signals turned into separately approved change orders | `AGENT-006`, `HAND-002` |

## Homepage claims

The homepage (`src/site/landing/`, built 20 Oct 2026 from the owner-approved page-s1) shows the product this contract builds toward (owner, 17 Oct 2026: the homepage may make claims not yet real for core features). Every capability claim it makes is listed here with its clauses and how far the code is: **code** (a code path backs it), **partly** (some of it is in code, named), or **contract, not yet in code**. Status follows the Status table below. The page's people, firms and figures are sample data for one October; brand names are plain text, never logos or partnerships.

| Section | Claim on the page | Clauses | Status | Code |
| --- | --- | --- | --- | --- |
| 01 Hero | Branded proposals from your templates and catalog | EDIT-001, EDIT-002, CAT-001 | partly | `src/platter/ui/proposals.ts` (title, scope, two options); `src/platter/movein/business-import.ts` (imported catalog metadata); templates: contract, not yet in code |
| 01 Hero | Sent from your own mailbox | SEND-001 | contract, not yet in code | mail goes through the installation's sender (`src/platter/mail.ts`) |
| 01 Hero | Shows what each client read | TRACK-001, TRACK-002 | contract, not yet in code |  |
| 01 Hero | Collects the signature and deposit together | SIGN-001, SIGN-003, PAY-001, PAY-002 | partly | `src/platter/signing.ts` (mailbox-verified acceptance, typed name, deposit calculated); collection: contract, not yet in code |
| 01 Hero | Good / Better / Best packages, add-ons, Austin sales tax, 50% deposit | PRICE-001, PRICE-002, PRICE-005, PRICE-007 | partly | `src/platter/selection.ts`, `src/platter/pricing.ts` (packages, add-ons and percentage deposit; PRICE-001 and PRICE-002 done); sales tax: contract, not yet in code |
| 01 Hero | HubSpot deal won, QuickBooks invoice paid | CRM-001, ACCT-001 | contract, not yet in code |  |
| 01 Hero, 13 | 100% free, open source alternative to PandaDoc, Proposify and Better Proposals; MIT licensed | MIG-001, MIG-002, MIG-003 | code (licence); move-in: contract | `LICENSE` (MIT), `src/site/run.json` |
| 01 Hero, 13 | Run Platter (the one-line start) | SITE-001 | code | `src/site/pages.ts`, `src/site/run.json`, `tests/site.test.mjs` |
| 02 Firms | Sent, read, back and forth, signed, first payment, per proposal | SEND-001, TRACK-001, NEG-001, SIGN-003, PAY-001, PAY-002, PAY-004 | partly | `src/platter/negotiation.ts` (revisions after sending, NEG-001 done); reading and payments: contract |
| 03 Draft | The agent drafts a priced proposal from a Zoom call, each line cited | AGENT-001, AI-001 | partly | `src/platter/http.ts`, `src/platter/commands.ts` (agents post drafts the owner approves); transcript ingestion: contract |
| 03 Draft | Draft agents only draft; a person sends | ACCESS-001, PROP-001 | code | `src/platter/credentials.ts`, `src/platter/commands.ts` |
| 03 Draft | Lines from the catalog; items not in it left out | CAT-001, PRICE-001 | partly | `src/platter/business-records.ts` (imported catalog); pricing-table insertion: contract |
| 03 Draft | Checked against Gauge: margin against the floor | AGENT-002, PRICE-006, HAND-002 | contract, not yet in code |  |
| 04 Build | Template, content library, brand kit, fields, locked sections | EDIT-001, EDIT-002, EDIT-003, EDIT-004, EDIT-015 | partly | `src/platter/ui/proposals.ts` (fixed styling); templates, library, fields, locks: contract |
| 04 Build | The client sets the guest count; options they can add | PRICE-002, PRICE-001 | code | `src/platter/selection.ts`, `src/platter/ui/packages.ts`, `tests/packages-journey.mjs` (client-editable quantities and optional items; PRICE-001 and PRICE-002 done) |
| 04 Build | Delaware sales tax $0.00 | PRICE-005 | contract, not yet in code |  |
| 04 Build | Reminders, cancelled once signed; expiry | FOLLOW-001, FOLLOW-006, SEND-004 | partly | `src/platter/expiry.ts` (SEND-004 done); reminders: contract |
| 04 Build | "Views of this page are measured." on the client page | TRACK-004 | contract, not yet in code |  |
| 05 Send | Delivery status, bounce shown, resent to the right address | SEND-002 | code | `src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs` |
| 05 Send | Reading time per section | TRACK-002 | contract, not yet in code |  |
| 05 Send | The agent drafts follow-ups from what each client read; Alicia sends | AGENT-004, FOLLOW-002 | partly | `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts` (follow-up queue by sales owner, FOLLOW-002 done); drafts from reading data: contract |
| 05 Send | The resend uses the address on Tom's HubSpot contact | CRM-001 | contract, not yet in code |  |
| 05 Send | Retainers: $1,200.00/mo × 12, $650.00/mo × 6 | PRICE-003, PAY-003 | contract, not yet in code |  |
| 06 Revise | Clients ask on the page; the firm replies | FOLLOW-004 | code | `src/platter/questions.ts`, `src/platter/question-replies.ts`, `tests/mail.test.mjs` |
| 06 Revise | Rev 2 with every change marked; the rev 1 link retired | NEG-001, COLLAB-003, PROP-002 | code | `src/platter/negotiation.ts`, `src/platter/history.ts`, `src/platter/commands.ts` |
| 06 Revise | Signed on her phone | EDIT-007, SIGN-001 | partly | `src/platter/ui/client.ts`, `tests/mobile-client-journey.mjs` (390-pixel keyboard client journey to acceptance; EDIT-007 partial); Stripe payment and assistive-technology checks: contract |
| 07 Sign | Two client signers in order, each with a mailbox code | SIGN-001, SIGN-004 | partly | `src/platter/signing.ts` (one verified signer); signing order: contract |
| 07 Sign | ESIGN consent, drawn and typed signatures | SIGN-003 | partly | `src/platter/signing.ts` (typed name and consent) |
| 07 Sign | Certificate of completion with document hash | SIGN-005 | partly | `src/platter/signing.ts` (immutable accepted snapshot); PDF and certificate: contract |
| 07 Sign | Emailed to all, filed to Google Drive, Salesforce Closed Won | AUTO-002, CRM-002 | contract, not yet in code |  |
| 08 Books | Stripe ACH deposit, fee and payout cleared in QuickBooks Online, balance $0.00 | PAY-001, ACCT-001, ACCT-006 | contract, not yet in code |  |
| 08 Books | One invoice per amount, created on its issue day; net 15 | ACCT-004, ACCT-007, PAY-008 | partly | `src/platter/invoices.ts` (one retained deposit invoice per acceptance, INV-001) |
| 09 Payments | Card declined, the client told why, ACH from the same invoice link | PAY-004, PAY-005 | contract, not yet in code |  |
| 09 Payments | The agent's exception card with evidence; Owen sends | AGENT-005, AGENT-009 | partly | `src/platter/invoices.ts` (no duplicate exports), `src/platter/credentials.ts` |
| 09 Payments | Reconciled: 1 amount, 1 invoice, 2 attempts, 0 mismatches | ACCT-004 | partly | `src/platter/invoices.ts` |
| 11 Change | Out-of-scope request priced as its own change order; the original agreement unchanged | AGENT-006, PROP-002 | partly | `src/platter/commands.ts` (sent revisions are frozen); change orders: contract |
| 11 Change | Asana project made at signing, one task per accepted line | HAND-001 | contract, not yet in code |  |
| 11 Change | Paid by card that afternoon | PAY-001 | contract, not yet in code |  |
| 12 Move-in | PandaDoc Word templates become editable pages; tokens become fields; rows matched to the catalog | MIG-001, MIG-007, EDIT-005, EDIT-004, CAT-001 | contract, not yet in code | only the client CSV move-in exists (`src/platter/movein/index.ts`, IMPORT-001) |
| 12 Move-in | Catalog CSV with bundles as packages; bulk PDFs kept with their certificates | MIG-001, CAT-001 | partly | `src/platter/movein/business-import.ts` (catalog metadata import) |
| 12 Move-in | Also moves in from Proposify, Better Proposals, Qwilr and Ignition | MIG-002, MIG-003, MIG-004 | contract, not yet in code |  |

## Status

Judged from the code and tests at commit `4500747451af58a65a2acbb1e9849d6a0ef18f52` (22 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 12 | 0 | 0 | 12 |
| Target and push further | 25 | 33 | 70 | 128 |
| All | 37 | 33 | 70 | 140 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HTTP-001` | Authorized domain dispatch | published | done | `tests/platter.test.mjs`, `src/platter/http.ts` |  |
| `ACCESS-001` | Revocable agent keys that only draft | published | done | `tests/platter.test.mjs`, `src/platter/credentials.ts` |  |
| `PROP-001` | Approval binds the exact revision | published | done | `tests/platter.test.mjs`, `src/platter/commands.ts` |  |
| `PROP-002` | Sending freezes the offer | published | done | `tests/platter.test.mjs`, `src/platter/commands.ts` |  |
| `SIGN-001` | Verified-mailbox acceptance | published | done | `tests/platter.test.mjs`, `src/platter/signing.ts` |  |
| `SIGN-002` | Immutable acceptance with an integer-cent deposit | published | done | `tests/platter.test.mjs`, `src/platter/signing.ts` |  |
| `INV-001` | One retained deposit invoice per acceptance | published | done | `tests/platter.test.mjs`, `src/platter/invoices.ts` |  |
| `IMPORT-001` | Reviewed client CSV move-in with undo | published | done | `tests/platter.test.mjs`, `src/platter/movein/index.ts` |  |
| `ERASE-001` | Bounded client erasure | published | done | `tests/platter.test.mjs`, `tests/archive.test.mjs` |  |
| `PORT-001` | Validated archives and restore | published | done | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` |  |
| `MAIL-001` | Durable proposal mail with honest outcomes | published | done | `src/platter/mail.ts`, `tests/mail.test.mjs` |  |
| `SITE-001` | Public run site and documentation | published | done | `tests/site.test.mjs`, `scripts/verification/run.mjs`, `src/site/pages.ts` |  |
| `EDIT-001` | Branded drag-and-drop proposal editor | target | partial | `src/platter/ui/proposals.ts`, `src/platter/commands.ts` | Only a title, scope and two-option form with fixed Platter styling; no block editor, layouts or brand kit. |
| `EDIT-002` | Proposal templates | target | partial | `src/platter/templates.ts`, `src/platter/starter-templates.ts`, `src/platter/ui/templates.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Personal templates and all five built-in starters ship with independent drafts, filled client/sender details, USD pricing tables and exact PDF/archive custody. Shared templates, team-limited folders and durable delivery defaults now ship, with editing rights and live audience checks proved by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”; the named role browser and CLI journeys prove 1440/390 controls and custody. Gap: general variables, recipient roles, per-template reminder/payment overrides and their execution remain. |
| `EDIT-003` | Reusable content library | target | partial | `src/platter/library.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Owners, admins, managers and content editors create and version-guard shared text sections, case studies, bios, testimonials and terms through library.save and /app/library; sales read them, while viewers, billing and agent keys have no library access. The TEAM-001 role HTTP journey asserts writes and no-write refusals for every role, and the named MOB-001 / TEAM-001 / APPROVE-003 browser journey edits a case study as a content editor and refuses sending at 1440/390. The named role CLI archive journey preserves library items. Gap: linked and detached insertion, usage lists, tags/search, images/video and pricing-table library items remain. |
| `EDIT-004` | Variables from client, deal and CRM records | target | missing |  | No variables or merge fields. |
| `EDIT-005` | Word and PDF import and export | target | missing |  | No import or export of documents. |
| `EDIT-006` | Embedded rich media | target | missing |  | No media blocks. |
| `EDIT-007` | Mobile client review | target | partial | `src/platter/ui/client.ts`, `src/platter/ui/packages.ts`, `src/platter/ui/shared.ts`, `tests/site.test.mjs`, `tests/mobile-client-journey.mjs` | Named EDIT-007 built-browser journeys at 1440 and 390 pixels complete invitation, mailbox verification, conditional package selection, adding an optional item and raising its quantity, comments and immutable acceptance of the selected total and deposit with keyboard-only client interaction and axe WCAG 2.2 AA scans at every step. Verification, comments and refusal pages preserve the reviewed package and optional items, and submission feedback receives keyboard focus. Package review uses a native fragment target to focus a named selection region containing the chosen package, optional-item quantities and exact USD total/deposit, including with application JavaScript disabled. Named EDIT-007 assertions expose current scope, grouped pricing and selection through browser accessibility APIs, correct an out-of-range quantity by keyboard, and download exact attachment bytes and the selected unsigned PDF before accepting. Gap: Stripe test-card payment (PAY-001/PAY-002) and assistive-technology verification of the complete rich-content/payment journey remain; this slice does not establish full WCAG conformity. |
| `EDIT-008` | Custom domain and branded client experience | target | missing |  | Client links use the installation origin with Platter styling. |
| `EDIT-009` | Conditional content by package | target | done | `src/platter/conditional.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Current scope/terms by package or optional item, preview, selected PDF and accepted snapshot; future carriers inherit before shipping. |
| `EDIT-010` | Attachments and vendor documents | target | done | `src/platter/attachments.ts`, `src/platter/attachment-commands.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-011` | Large-proposal performance budget | target | missing |  | No block editor exists, so no budget is measured; no large-proposal fixture or timing journey. |
| `EDIT-012` | Duplicate a proposal for another client | target | done | `src/platter/duplicate.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-013` | Documents without pricing | target | missing |  | Every proposal requires two priced options; there is no unpriced document type. |
| `EDIT-014` | Client PDF download before signing | target | done | `src/platter/documents/client-pdf.ts`, `src/platter/documents/offer-pdf.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-015` | Locked template sections | target | partial | `src/platter/section-locks.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | tests/platter.test.mjs — “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval” proves server refusals, lock preservation across copies/templates, scoped unlock, audit and legal review. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves sales editor refusal (403), content-editor unlock refusal, admin unlock/edit and required legal approval at 1440/390. The role CLI archive journey preserves exact locks and refuses restored unauthorized edits. Gap: locks cover the current native title/scope/terms/pricing/deposit sections; rich-section placement and reordering need EDIT-001. |
| `EDIT-016` | Proposal search and folders | target | partial | `src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` | Owner pipeline searches current proposal/agreement title, client name/email, recorded owner, status, scope, terms, package and pricing-line text using a case-insensitive literal phrase with whitespace collapsed (up to 200 characters). Search combines with existing field filters, sorting, currency totals, CSV export and scheduled reports. Gap: template and uploaded-PDF text search, folders, TEAM-001 member/team visibility and proposal numbering remain. |
| `EDIT-017` | Client page in the client's language | target | missing |  | The client page and mail are English only. |
| `EDIT-018` | Client-page preview before sending | target | done | `src/platter/preview.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `CAT-001` | Service and product catalog | target | partial | `src/platter/catalog.ts`, `src/platter/movein/business-import.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Native USD catalog items now support name/description/SKU/unit/price/private cost, owner/admin/manager versioned editing and reviewed insertion into independent drafts. tests/platter.test.mjs — “TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals” proves no-write role refusals, private cost copying, immutable sent prices, stale-price refusal and new draft pricing. The named role browser and CLI journeys prove 1440/390 controls and exact custody. Imported catalog metadata and image originals remain review-only records; no imported metadata is charged automatically. Gap: recurrence, tax/account metadata, native image editing/rendering and provider item synchronization remain. |
| `PRICE-001` | USD pricing tables with line items | target | done | `src/platter/pricing.ts`, `src/platter/ui/pricing.ts`, `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs` |  |
| `PRICE-002` | Packages and optional items the client chooses | target | done | `src/platter/selection.ts`, `src/platter/conditional.ts`, `src/platter/paper-acceptance.ts`, `src/platter/ui/paper.ts`, `src/platter/ui/packages.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs` | Current packages, optional items, quantities, deposit and item- or package-conditioned sections; PRICE-005/PRICE-007/PRICE-003 inherit selection-driven tax and schedule amounts before shipping. |
| `PRICE-003` | One-off and recurring fees | target | missing |  | One-off totals only. |
| `PRICE-004` | Discounts | target | partial | `src/platter/discounts.ts`, `src/platter/pricing.ts`, `src/platter/selection.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Visible package percentage discounts now recompute cent-exact base and optional-selection prices, deposits and private line/package margins; templates, duplication, negotiation, JSON and PDFs retain the frozen discount. tests/platter.test.mjs — “PRICE-004 / APPROVE-001 visible package discounts preserve exact optional totals, private margins, templates and public PDF/JSON custody” proves money, privacy, malformed-input no-write refusals and deterministic cent allocation. APPROVE-001’s named condition journey and the role browser journey prove the 15% threshold and 20% manager/owner route. Gap: line/group discounts, fixed amounts, optional concealment and discount expiry remain. Those fields inherit APPROVE-001 evaluation before they ship. |
| `PRICE-005` | US sales tax | target | missing |  | No tax handling beyond a fixed GST-free export. |
| `PRICE-006` | Internal cost and margin | target | partial | `src/platter/internal-pricing.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Version-bound internal unit costs now produce cent-exact line costs and line/package margins. Only owner, admin, manager and billing proposal views carry internalPricing; billing reads but does not edit proposals. Sales, content editor, viewer and agent responses omit it. The separate /api/platter/internal-pricing.pdf export requires those same read rights and proposal scope; public offer PDFs always use the public snapshot and contain no costs. tests/platter.test.mjs — “TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs” proves the amounts, role/API/private-PDF boundaries, public-page/PDF exclusion, revisions, negotiation, restoration, duplication and personal templates. The named team browser journey proves manager cost editing and sales exclusion at 1440/390; the role CLI journey restores exact costs and templates. Optional-item and flat-package costs now ship with selected/base totals. tests/platter.test.mjs — “TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state” proves exact optional quantities, selected total margins, template/catalog carryover, unverified and cross-invitation refusal, and absence of private fields from the new mailbox-verified /p/<invitation>/data.json projection. The named role browser and CLI journeys prove 1440/390 total selectors, selected margins and exact custody. Gap: outbound webhook payload proof remains when AUTO-004 adds that door; no lifecycle webhook is currently sent. AUTO-004 inherits the cost-free public projection before its webhook capability ships. |
| `PRICE-007` | Payment terms and schedules on the proposal | target | partial | `src/platter/commands.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs` | One deposit percentage only; no fixed deposits, milestones, net terms or schedule. |
| `PRICE-008` | First-release AUD agreements stay exact | target | done | `migrations/core/0017_currency.sql`, `tests/archive.test.mjs`, `tests/site.test.mjs` |  |
| `COLLAB-001` | Real-time team editing | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence. |
| `COLLAB-002` | Internal comments, mentions and assignments | target | missing |  | No internal comments. |
| `COLLAB-003` | Version history with compare and restore | target | done | `src/platter/history.ts`, `src/platter/ui/history.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` |  |
| `APPROVE-001` | Approval rules and routing | target | done | `tests/platter.test.mjs` — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” (conditions, scope, sequence and edit clearing); `tests/platter.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” (parallel/rejection/role refusals); `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (1440/390); `tests/platter.test.mjs` — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership” (awaiting approval); `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (custody) | tests/platter.test.mjs — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” proves the $30,000/20% manager-then-owner sequence, exact-revision clearing, skipped conditions, unknown/low-cost review, deposit/standard-term rules and template scopes/provenance. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves parallel named admin/billing approvals in either order, rejection, unnamed-billing refusal and invalid sales approvers. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves discount editing, clearing, manager/owner approval, send and client acceptance at 1440/390. The named thirty-proposal REPORT-001 fixture proves awaiting-approval filters/sorts/counts/totals; the named role CLI archive journey preserves every current condition, source template and exact decision. Current semantics: total thresholds compare gross value before discounts and maximum offered optional quantities; discount rules compare package percentages; margin rules review missing costs and require all offered package/optional margins to meet the threshold with conservative optional cent rounding; payment-term rules compare the current deposit and optional exact standard terms. PRICE-004 line/group/fixed/expiry discounts, PRICE-007 schedules/net terms and EDIT-002 future template fields inherit these rule and named-journey obligations before those fields ship. |
| `APPROVE-002` | Approval requests that reach the approver | target | missing |  | No approval notifications. |
| `APPROVE-003` | Who approves, who sends and what needs approval | target | done | `tests/platter.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” (off/on, scopes, agents, defaults and refusals); `tests/platter.test.mjs` — “TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace” (admin/audit); `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (1440/390); `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (custody) | One approval policy now covers all current preparation, template, duplication, negotiation, approval, sending and fresh-invitation doors. tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” proves unruled sales sends with no approval record, manager amount approval, exact-revision invalidation, sales/content-editor/foreign-owner refusals, agent-origin approval after human edits, policy authority and audit, manager team scope, owner/admin/manager defaults, approval-required and approval-free copies, and sales negotiation. tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership” proves awaiting-approval filters, sorting, counts and totals under role visibility; tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves the sales and manager screens at 1440/390; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves policy and exact-revision custody.  tests/mail.test.mjs — “APPROVE-003 / TEAM-001 a sales sender owns bounce correction, foreign senders are refused, and every fresh invitation obeys the current approval policy” proves the matching active sender’s correction door, a foreign sender’s 403, and current-policy reapproval before a fresh corrected invitation. No acceptance point remains unproved for current doors; future doors named in the clause inherit this same policy before shipping. |
| `SEND-001` | Send from the firm's own mailbox | target | partial | `src/platter/connections.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Google and Microsoft mailbox identity checks and encrypted own-mailbox connections ship, proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Gap: provider OAuth refresh, sending and inbound replies through those mailboxes and visible fallback remain. Conservative default pending ct approval: the verified mailbox must match the member’s sign-in address. |
| `SEND-002` | Delivery status and bounce handling | target | done | `src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `SEND-003` | Recipients, roles and sharing | target | missing |  | One client recipient per proposal. |
| `SEND-004` | Expiry and reopening | target | done | `src/platter/expiry.ts`, `src/platter/expiry-time.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `SEND-005` | Completion and activity notifications | target | missing |  | No notifications to the sender. |
| `SEND-006` | Editable subject, message and shared email templates | target | partial | `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Gap: shared/default/locked templates, filled variables, editable reminder/invoice/expiry/withdrawal/completion messages and a complete agreement package remain. |
| `SEND-007` | Replace an unsigned signer on a sent proposal | target | missing |  | One client recipient fixed at sending; a fresh invitation (`PROP-002`) rotates the link but cannot change who receives it. |
| `SEND-008` | Sending and reminders by text message | target | missing |  | Email only; no SMS. |
| `SEND-009` | Reusable public signing link | target | missing |  | Every proposal has one invited recipient; there is no public link or embeddable form. |
| `SEND-010` | Withdraw a sent proposal | target | done | `src/platter/withdrawal.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `TRACK-001` | View tracking and live open alerts | target | missing |  | No view tracking. |
| `TRACK-002` | Section-level reading analytics | target | missing |  | No reading analytics. |
| `TRACK-003` | Forwarded stakeholder identification | target | missing |  | No forwarding detection. |
| `TRACK-004` | Tracking disclosure and privacy limits | target | missing |  | No tracking, so no disclosure or retention controls. |
| `FOLLOW-001` | Scheduled reminders to unsigned recipients | target | missing |  | No reminders. |
| `FOLLOW-002` | Next-action follow-up queue by sales owner | target | done | `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `FOLLOW-003` | Expiry and renewal notifications | target | missing |  | No expiry or renewal notices. |
| `FOLLOW-004` | Client questions and comments | target | done | `src/platter/questions.ts`, `src/platter/question-replies.ts`, `src/platter/ui/questions.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `FOLLOW-005` | Decline reasons and won or lost outcomes | target | partial | `src/platter/withdrawal.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Mailbox-verified clients decline an unsigned offer with a reason; owners mark it lost with no recipient notice by default. Both use SEND-010 revocation and FOLLOW-002 closure, retain revision/actor/time/reason, feed REPORT-001 filters/sorts/counts/totals and reopen through NEG-001 with fresh approval. Gap: CRM outcome sync, configurable reason lists and explicit won overrides remain. |
| `FOLLOW-006` | Default reminder schedule and expiry from the workspace and templates | target | partial | `src/platter/workspace.ts`, `tests/platter.test.mjs`, `tests/templates-http.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Owner/admin workspace defaults now store on/off, after-send and before-expiry reminder days, cap, expiry period, warning lead and payment-method choices. Fresh and upgraded future drafts use the clause’s specified 2/5/9-day and 3-days-before-expiry reminder configuration, cap 3, and a real 60-day expiry with one-day warning; existing proposals are not backfilled. New blank and starter drafts copy the configuration, and personal templates/duplicates retain their saved snapshots. TEAM-001’s role HTTP journey proves owner/admin changes, sales/manager and other-role refusals with no write, and inheritance; tests/templates-http.mjs asserts the initial 60-day/one-day values. The named team browser journey changes defaults as an admin at 1440/390; the role CLI journey restores settings and snapshots. Gap: scheduled reminders themselves (FOLLOW-001), explicit per-template inherit/override controls for every field, per-proposal reminder editing/dates/timeline, and future bulk/public/drafting doors remain. |
| `NEG-001` | Negotiated revisions after sending | target | done | `src/platter/negotiation.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `NEG-002` | Client-suggested text edits | target | done | `src/platter/suggestions.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `SIGN-003` | ESIGN and UETA electronic signature | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | A typed name and consent are stored; no ESIGN consumer disclosure, consent withdrawal, drawn signature, initials or signature fields. |
| `SIGN-004` | Multiple signers, signing order and countersignature | target | missing |  | One client signer only. |
| `SIGN-005` | Signed agreement PDF and certificate of completion | target | partial | `src/platter/signing.ts`, `src/platter/ui/client.ts`, `tests/platter.test.mjs` | An immutable accepted snapshot with signer and time; no PDF, certificate, document hash or completion email. |
| `SIGN-006` | Signer identity options | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | Mailbox code only; no SMS code or ID verification. |
| `SIGN-007` | Fields collected at acceptance | target | missing |  | Only name, option and consent are collected. |
| `SIGN-008` | Acceptance on the client's own paper | target | done | `src/platter/paper-acceptance.ts`, `src/platter/paper-record.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` |  |
| `SIGN-009` | Recipient delegation of signing | target | missing |  | One fixed client signer; no delegation. |
| `SIGN-010` | In-person signing on the firm's device | target | missing |  | Signing happens only from the client's own emailed link. |
| `SIGN-011` | Template recipient roles, field assignment and signing order | target | missing |  | No templates, recipient roles or field assignments; one client recipient per proposal. |
| `PAY-001` | Stripe card and ACH collection in the proposal | target | missing |  | No payment collection. |
| `PAY-002` | Deposit or partial payment at acceptance | target | partial | `src/platter/signing.ts`, `src/platter/invoices.ts`, `tests/platter.test.mjs` | The deposit is calculated and exported, never collected. |
| `PAY-003` | Milestone and recurring payment schedules | target | missing |  | No schedules. |
| `PAY-004` | Paid, pending, failed, refunded and disputed states | target | missing |  | No payment states. |
| `PAY-005` | Failed-payment retries and notices | target | missing |  | No retries or notices. |
| `PAY-006` | Refunds and disputes | target | partial | `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Owner, admin and billing can explicitly refund a verified existing Stripe deposit with a reason. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves Stripe-fake receipt, sales no-call refusal, exact accepted revision/account/currency binding, concurrent bounds, idempotent retries and durable uncertain holds. The compiled role journey proves billing screens at 1440/390 and the role archive journey preserves refunds without credentials. Current financial roles can verify a Stripe dispute against a linked deposit and explicitly submit the exact accepted snapshot, typed acceptance facts and a response note before its provider deadline. tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence” proves owner/admin/billing success, other-role no-call refusals, foreign-charge and deadline refusal, consent, idempotency, private-cost exclusion and exact retained PDF hashes. The named role browser and CLI journeys prove 1440/390 responses and restoration of exact evidence bytes without replay. Conservative default pending ct approval: evidence submission is manual and requires explicit audited consent; unavailable certificate, analytics, attachments and checkout authorization artifacts are clearly identified, never fabricated. Gap: accounting credits, full SIGN-005 certificates/attachments, TRACK-001 view evidence and PAY-001/PAY-002 authorization artifacts; uncertain refunds/submissions require provider reconciliation. |
| `PAY-007` | Check, wire and ACH credit payments | target | partial | `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Owner, admin and billing record received check, wire and ACH credit payments with reference and receipt date; tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves the role boundary and all three methods. The role archive journey preserves exact records. Gap: milestone and schedule reconciliation, accounting synchronization, remittance details and overdue removal. |
| `PAY-008` | Net-terms invoices with a pay link and overdue tracking | target | missing |  | No invoices are sent to the client; the only invoice is the owner's deposit CSV export. |
| `PAY-009` | PayPal, Square and Authorize.net collection | target | missing |  | No payment processors are connected. |
| `ACCT-001` | QuickBooks Online invoices and payments | target | missing |  | No QuickBooks connection. |
| `ACCT-002` | Xero invoices and payments | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | A currency-tagged Xero-format deposit CSV only; no API sync, schedules or payments. |
| `ACCT-003` | Pantry invoices and payments | target | missing |  | No Pantry connection. |
| `ACCT-004` | One invoice authority and reconciliation | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | A unique local binding prevents duplicate exports; there is no authority choice, provider ID or payment matching. |
| `ACCT-005` | Invoice and payment export files | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | A currency-tagged Xero deposit CSV only; no QuickBooks files, sandbox-verified USD imports, payment or schedule export. |
| `ACCT-006` | Stripe payouts, fees and clearing in accounting | target | missing |  | No payment or accounting connection, so no payout or fee posting. |
| `ACCT-007` | Invoices created on their issue day, never ahead | target | missing |  | No invoices are created for scheduled amounts; the only invoice is the owner's deposit CSV export after acceptance. |
| `CRM-001` | HubSpot two-way deal sync | target | missing |  | No HubSpot connection. |
| `CRM-002` | Salesforce two-way opportunity sync | target | missing |  | No Salesforce connection. |
| `CRM-003` | Orbit two-way deal sync | target | missing |  | No Orbit connection. |
| `CRM-004` | Pipedrive and Zoho CRM sync | target | missing |  | No Pipedrive or Zoho connection. |
| `AUTO-001` | Status-driven automations | target | missing |  | No automations. |
| `AUTO-002` | Completed documents archived to file storage | target | missing |  | No document archiving. |
| `AUTO-003` | Team chat notifications | target | missing |  | No chat notifications. |
| `AUTO-004` | Public REST API and webhooks | target | partial | `src/platter/http.ts`, `tests/platter.test.mjs` | A session and agent command API only; no documented public API, scoped API keys or signed lifecycle webhooks. |
| `AUTO-005` | Zapier, Make and Crank apps | target | missing |  | No automation-platform apps. |
| `HAND-001` | Accepted-scope handoff to delivery tools | target | missing |  | No delivery handoff. |
| `HAND-002` | Handoff to Gauge with budget and rates | target | missing |  | No Gauge handoff. |
| `RENEW-001` | Bulk proposal creation and sending | target | missing |  | No bulk sending. |
| `RENEW-002` | Renewal proposals from accepted agreements | target | missing |  | No renewals. |
| `REPORT-001` | Proposal pipeline dashboard | target | done | `src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `REPORT-002` | Win rate and sales performance | target | missing |  | No conversion reporting. |
| `REPORT-003` | Content and pricing performance | target | missing |  | No content analytics. |
| `REPORT-004` | Booked, billed and collected revenue | target | missing |  | No revenue reporting. |
| `REPORT-005` | Report export and scheduled delivery | target | done | `src/platter/reports/schedules.ts`, `src/platter/reports/pipeline-csv.ts`, `src/platter/reports/zone.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` |  |
| `TEAM-001` | Roles and permissions | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read/edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts/sorting/totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, ownership/deletion controls and full content/revenue report capabilities. Collaborator grants currently preserve role limits; the relationship between the collaborator sentence and No/Team cells needs ct clarification. Catalog edit/insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates/team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. Conservative invitation default pending ct approval: the inviter’s native/product version, allowed role and team authority must still hold at acceptance; a fresh authorized reissue rotates old links. Folder audience changes require explicit audited consent. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google/Microsoft mailbox connections now ship; the QuickBooks admin/sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Conservative default pending ct approval: a connected mailbox must match the member’s sign-in address; SEND-001 inherits OAuth refresh and actual mailbox sending before completion. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder/expiry/payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001/FOLLOW-006 work. These are foundations in this seed, not account blockers. |
| `TEAM-002` | Single sign-on and SCIM provisioning | target | missing |  | No SSO or SCIM. |
| `TEAM-003` | Multiple brands and workspaces | target | missing |  | One workspace and brand. |
| `TEAM-004` | Audit log | target | done | `src/platter/audit.ts`, `src/platter/auth-audit.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `TEAM-005` | Security review pack for procurement | target | missing |  | No security page, questionnaire answers, DPA, subprocessor list or audit report. |
| `MIG-001` | PandaDoc move-in | target | missing |  | No PandaDoc import. |
| `MIG-002` | Proposify move-in | target | missing |  | No Proposify import. |
| `MIG-003` | Better Proposals move-in | target | missing |  | No Better Proposals import. |
| `MIG-004` | Qwilr and Ignition move-in | target | missing |  | No Qwilr or Ignition import. |
| `MIG-005` | Open proposals and payment schedules continue | target | missing |  | No in-flight migration. |
| `MIG-006` | Clients, contacts and catalog CSV move-in | target | partial | `src/platter/movein/business-import.ts`, `src/platter/business-records.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | image URLs fetched through Base's egress relay |
| `MIG-007` | Move-in from exported files without API access | target | missing |  | No document import; only the client CSV kit exists. |
| `MOB-001` | Team app on a phone | target | done | `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (sales templates/send/answer/follow-up/reuse, manager approval and sales 403, at 390/1440) | tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” completes template creation, sales sending, a verified client question and sales answer, sales follow-up management, personal-template reuse, manager approval and the sales approval refusal (403), at both 390 and 1440 pixels. All acceptance actions are proven through the compiled production routes. |
| `MOB-002` | iOS and Android apps with push notifications | target | missing |  | No native apps or push. |
| `AI-001` | Drafts from meeting notes, transcripts and email | target | partial | `src/platter/http.ts`, `tests/platter.test.mjs` | External agents can post structured drafts; there is no ingestion of notes, transcripts or email and no in-product drafting. |
| `AI-002` | Writing assistant in the editor | target | missing |  | No writing assistant. |
| `AI-003` | MCP server for AI assistants | target | done | `src/platter/mcp.ts`, `src/platter/send-requests.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `AI-004` | Explainable price suggestions | target | missing |  | No price suggestions. |
| `PRIV-001` | Erasure across contacts, tracking and synced systems | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Only unused client records can be erased; no contacts, tracking data or notice to synced systems. |
| `PORT-002` | Complete product archive | target | done | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` |  |
| `SEC-001` | Provider credential custody | target | partial | `src/platter/connections.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Stripe, QuickBooks, HubSpot, Salesforce, Drive, Slack, Google and Microsoft tokens are sealed with purpose-separated AES-GCM, omitted from API/UI/log fields and excluded from archives. tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens” proves connection authority, plaintext absence and disconnect; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves metadata restoration requires reconnection. Gap: SSO provider credentials, OAuth refresh and job-stop assertions for future synchronization jobs. |
| `AGENT-001` | Discovery call to priced draft | push-further | partial | `src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs` | Agents can submit drafts that the owner must approve; there is no transcript ingestion, catalog matching or citations. |
| `AGENT-002` | Scope and price tested against delivery reality | push-further | missing |  | No delivery cost, capacity or outcome data is read. |
| `AGENT-003` | Client questions chased to resolution | push-further | missing |  | No question tracking or agent. |
| `AGENT-004` | Engagement-driven follow-up | push-further | missing |  | No engagement data or follow-up agent. |
| `AGENT-005` | Payment exceptions closed without duplicate invoices | push-further | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | Duplicate local exports are prevented; there is no provider event matching, exception queue or agent. |
| `AGENT-006` | Out-of-scope delivery turned into a change order | push-further | missing |  | No delivery signals or change orders. |
| `AGENT-007` | Win and loss learning for templates and pricing | push-further | missing |  | No outcome analysis. |
| `AGENT-008` | Renewal preparation from delivered results | push-further | missing |  | No renewal agent. |
| `AGENT-009` | Agent authority ledger and limits | push-further | partial | `src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs` | Agent keys are limited to drafting and are revocable; there is no per-action ledger, source citations, budget or pause control. |
