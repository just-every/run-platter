# Platter target product contract

Platter is proposal-to-payment software for US service businesses, agencies and consultancies replacing PandaDoc, Proposify or Better Proposals, with the interactive pricing and payment collection buyers look for in Qwilr and Ignition. A firm writes a branded proposal from templates, a content library and a priced catalog, sends it from its own mailbox, sees who read what, follows up until a decision, negotiates exact revisions, collects an ESIGN-compliant signature and takes the deposit, milestones and recurring fees by card or ACH, with the deal, invoices and payments kept in step with the CRM and accounting system the firm already uses. Amounts are USD, sales tax follows US state rules, and payment and accounting connections are US services.

## Product target

| | |
| --- | --- |
| Category | Proposal software |
| Incumbents a buyer switches from | PandaDoc, Proposify, Better Proposals |
| Up-and-comers it must also beat | Qwilr, Ignition |
| First buyer | A US owner or sales lead at a service business, agency or consultancy with 1 to 50 staff, quoting in USD, collecting deposits by card or ACH through their own Stripe account, and running HubSpot, Salesforce or Orbit with QuickBooks Online or Xero |

The primary journey: write and price a proposal, approve its exact revision, send, follow up and negotiate, sign, collect payment, reconcile, hand off delivery and renew.

A buyer replacing an incumbent needs the whole job, so the target is the whole job:

- **Write.** A branded drag-and-drop editor with templates, a reusable content library, variables from the CRM, rich media, conditional content, attachments such as the firm's W-9, Word import with tokens and quote tables mapped, PDF pages for signing, Word and PDF export, a client PDF before signing, a preview of the client page before sending, duplicating, locked sections, search and folders, unpriced documents such as NDAs and SOWs, a custom domain, a phone-ready client page in the client's language, and a measured performance budget on large proposals (`EDIT-001` to `EDIT-022`).
- **Price.** A catalog, USD pricing tables with quantities and units, packages and optional items the client chooses, one-off and recurring fees, discounts, US sales tax, internal cost and margin, and payment terms with deposits and milestones (`CAT-001`, `PRICE-001` to `PRICE-008`).
- **Work as a team.** Live co-editing, internal comments, version history, approval rules by value, discount, margin and terms, one approval policy stating who approves, who sends and whether a proposal that matches no rule needs approval, and approval requests that reach the approver (`COLLAB-*`, `APPROVE-*`, `PROP-001`).
- **Send and track.** Sending from Gmail or Microsoft 365 or by text message, a reusable public signing link, an editable subject and message from shared email templates, delivery and bounce states, several recipients with roles, replacing a signer on a sent proposal, withdrawing a proposal sent in error, expiry, notifications, view and section-level analytics and forwarded stakeholders, with tracking disclosed (`SEND-*`, `TRACK-*`).
- **Follow up and negotiate.** Reminders and expiry with defaults set for the workspace and each template, manual reminders, an accountable next-action queue, expiry and renewal notices, client questions, decline reasons, negotiated revisions and client-suggested edits (`FOLLOW-*`, `NEG-*`).
- **Sign.** ESIGN and UETA signatures, several signers with order and countersignature, recipient roles, field assignments and signing order set once in a template, a signed PDF with certificate of completion, SMS and ID verification, fields collected at signing, acceptance on the client's own paper, delegation by the signer and in-person signing on the firm's device (`SIGN-001` to `SIGN-012`, `SEND-007`).
- **Get paid.** Stripe card and ACH collection in the proposal, deposits at acceptance, milestone and recurring schedules, net-terms invoices with a pay link and overdue tracking, payment states, retries, refunds, disputes, offline checks and wires, and PayPal, Square or Authorize.net for firms not on Stripe (`PAY-*`), synced to QuickBooks Online, Xero or Pantry with one invoice authority, each invoice created on its issue day, payout and fee clearing, and reconciliation (`ACCT-*`, `INV-001`).
- **Connect.** HubSpot, Salesforce, Orbit, Pipedrive and Zoho CRM sync; status-driven automations; document archiving to Google Drive, OneDrive, SharePoint, Box or Chest; Slack, Teams and Nook; a public API, webhooks, Zapier, Make and Crank; and handoff of the accepted scope to Asana, Trello, monday.com, ClickUp, Jira, Vector or Gauge (`CRM-*`, `AUTO-*`, `HAND-*`).
- **Renew, report and administer.** Bulk sends and renewals, pipeline, win-rate, content and revenue reports, roles with a stated permission matrix and teams, SSO and SCIM, several brands, an audit log and a security review pack for procurement (`RENEW-*`, `REPORT-*`, `TEAM-*`).
- **Move in and out, anywhere.** Importers for PandaDoc, Proposify, Better Proposals, Qwilr and Ignition, working from exported files when the buyer has no API access, that keep open proposals and payment schedules running, CSV move-in, complete archives and erasure, and phone and native apps (`MIG-*`, `IMPORT-001`, `PORT-*`, `PRIV-001`, `MOB-*`).
- **Agents beyond the category.** Drafts from discovery calls tested against the firm's real delivery costs, capacity and outcomes, questions and payment exceptions chased to resolution, and out-of-scope delivery turned into change orders carrying commitment under company policy (`AI-*`, `AGENT-*`).

## How to read this contract

- This follows the RER contract standard.
- Core, Agent surface and Later are reported separately.
- Done means every acceptance point has recorded proof on the exact candidate.
- Field proof is visible and does not block local completion.
- ACCEPTANCE.md and docs/CLAIMS.md are generated from this file.

## Door rules

- **D-1.** Every added content kind or client door preserves exact-revision custody through unsigned preview/download, immutable signed agreement, recipient revocation and archived business records; adding a carrier never restores prior invitation or transport authority.

## Shared duties (Base)

| Base duty | Duty | Delta clauses | Base journey |
| --- | --- | --- | --- |
| BASE-ACCESS-001 | Sign-in | none | not run |
| BASE-ACCESS-002 | Sessions | HTTP-001 | not run |
| BASE-ACCESS-003 | Public endpoints | none | not run |
| BASE-ACCESS-004 | Server-side authorisation | HTTP-001, TEAM-001, TEAM-006, TEAM-007 | not run |
| BASE-INPUT-001 | Validation | SEND-009 | not run |
| BASE-INPUT-002 | HTML | EDIT-001, EDIT-006 | not run |
| BASE-INPUT-003 | Uploads | EDIT-001, EDIT-003, EDIT-006, EDIT-010, SIGN-008, MIG-006 | not run |
| BASE-SECRET-001 | No leakage | SEND-001, SEND-011, PORT-002, SEC-001 | not run |
| BASE-SECRET-002 | Startup | none | not run |
| BASE-DATA-001 | Export and import | IMPORT-001, ERASE-001, PORT-001, EDIT-010, MIG-006, PORT-002, SEC-001 | not run |
| BASE-DATA-002 | Retention | none | not run |
| BASE-DATA-003 | Erasure | ERASE-001, TRACK-004, PRIV-001 | not run |
| BASE-DATA-004 | Outbound flows | none | not run |
| BASE-DATA-005 | Independence | none | not run |
| BASE-PUBLIC-001 | Privacy | SITE-001, EDIT-006, SEND-009, TRACK-001, TRACK-004 | not run |
| BASE-PUBLIC-002 | Origins | HTTP-001, EDIT-008, SEND-003, SEND-009 | not run |
| BASE-PUBLIC-003 | Accessibility | none | not run |
| BASE-OPS-001 | Health | none | not run |
| BASE-OPS-002 | Migrations | none | not run |
| BASE-OPS-003 | Idempotency | MAIL-001, SEND-002, SEND-012, PAY-006, AUTO-004 | not run |
| BASE-OPS-004 | Failure is visible | MAIL-001 | not run |
| BASE-OPS-005 | Audit | TEAM-004 | not run |
| BASE-ROLE-001 | Roles through every door | HTTP-001, PROP-002, EDIT-003, EDIT-014, EDIT-015, EDIT-016, EDIT-022, COLLAB-002, APPROVE-001, SEND-001, SEND-011, SEND-003, SEND-005, SEND-008, SEND-010, FOLLOW-010, FOLLOW-003, FOLLOW-011, AUTO-004, REPORT-001, REPORT-006, TEAM-001, TEAM-006, TEAM-007, TEAM-002, SEC-001 | not run |
| BASE-AUDIT-001 | Searchable, durable audit | EDIT-022, SEND-015, TEAM-004 | not run |
| BASE-BACKUP-001 | Independent backup, restore and rollback | PORT-001 | not run |
| BASE-DATA-006 | Erasure respects retention and legal hold | ERASE-001, PRIV-001 | not run |
| BASE-SIGNIN-001 | Standards-based SSO and lifecycle | TEAM-006, TEAM-002 | not run |
| BASE-SIGNIN-002 | Native multi-factor authentication | none | not run |
| BASE-INSTALL-001 | Free self-host and removal | none | not run |
| BASE-MAIL-001 | Truthful mail outcomes | MAIL-001, EDIT-008, COLLAB-002, SEND-001, SEND-011, SEND-002, SEND-012, SEND-005, SEND-008, TRACK-001, FOLLOW-003, FOLLOW-004, REPORT-006 | not run |
| BASE-ACCESSIBILITY-001 | One accessibility bar | EDIT-001, EDIT-007, MOB-001, MOB-002 | not run |
| BASE-DOCS-001 | On-site docs from one contract | SITE-001 | not run |
| BASE-AGENT-001 | One MCP door per seed | AI-003 | not run |
| BASE-AGENT-002 | The seed's jobs are tools, through the UI's own actions | AI-001, AI-002, AI-003, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-001 | not run |
| BASE-AGENT-003 | Records are resources | SURFACE-001 | not run |
| BASE-AGENT-004 | Business identity and short-lived, audience-bound tokens | ACCESS-001 | not run |
| BASE-AGENT-005 | An agent acts as a person in a role, never more | HTTP-001, ACCESS-001, FOLLOW-007, AI-003, SURFACE-004 | not run |
| BASE-AGENT-006 | Every action declares its risk class | FOLLOW-007, NEG-002, PAY-006, AI-001, AI-002, AI-003, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002 | not run |
| BASE-AGENT-007 | The company's policy decides, at one chokepoint | ACCESS-001, PROP-001, APPROVE-003, APPROVE-004, FOLLOW-004, FOLLOW-007, NEG-002, SIGN-008, PAY-006, TEAM-007, AI-001, AI-002, AI-003, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002, SURFACE-003, SURFACE-004 | not run |
| BASE-AGENT-008 | Truthful attribution | ACCESS-001, PROP-001, APPROVE-003, AI-001, AI-002, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-003, SURFACE-004 | not run |
| BASE-AGENT-009 | Every agent action is audited with its class and decision | TEAM-004, AGENT-009, SURFACE-004 | not run |
| BASE-AGENT-010 | Agents can follow changes | none | not run |
| BASE-AGENT-011 | Limits are policy, and Pause stops everything | AGENT-009 | not run |
| BASE-AGENT-012 | Writes are idempotent and conflict-safe | AI-003, SURFACE-003 | not run |
| BASE-AGENT-013 | Manifest, docs and the conformance journey | SURFACE-001, SURFACE-004 | not run |

## Published clauses

- `HTTP-001`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ACCESS-004, BASE-PUBLIC-002, BASE-ROLE-001, BASE-AGENT-005
- `ACCESS-001`: *Tier:* Core · *Cites:* BASE-AGENT-004, BASE-AGENT-005, BASE-AGENT-007, BASE-AGENT-008
- `PROP-001`: *Tier:* Core · *Cites:* BASE-AGENT-007, BASE-AGENT-008
- `PROP-002`: *Tier:* Core · *Cites:* BASE-ROLE-001
- `SIGN-001`: *Tier:* Core · *Rules:* D-1
- `SIGN-002`: *Tier:* Core · *Rules:* D-1
- `INV-001`: *Tier:* Core
- `IMPORT-001`: *Tier:* Core · *Cites:* BASE-DATA-001
- `ERASE-001`: *Tier:* Core · *Cites:* BASE-DATA-003, BASE-DATA-006, BASE-DATA-001
- `PORT-001`: *Tier:* Core · *Cites:* BASE-DATA-001, BASE-BACKUP-001
- `MAIL-001`: *Tier:* Core · *Cites:* BASE-MAIL-001, BASE-OPS-003, BASE-OPS-004
- `SITE-001`: *Tier:* Core · *Cites:* BASE-DOCS-001, BASE-PUBLIC-001

### Access and authority

#### HTTP-001 — Authorized domain dispatch

**Requirement.** The proposal, client, import and invoice doors use TEAM-001 rights and APPROVE-003 proposal authority. Session, origin and agent-authority guarantees belong to the cited Base duties; their conformance journey state is recorded in Shared duties. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#http-001).

**Acceptance.**
1. A member attempts an owner-only invoice export and import: neither changes records.

#### ACCESS-001 — Proposal preparation grants

**Requirement.** A person grants proposal context and preparation access. Proposal preparation and revision carry standard; client creation carries standard; sending carries external and commitment; price approval and signatures carry commitment; invoice export carries standard. The company policy decides these calls, within the sponsor’s proposal rights. The legacy-key migration details are in [proposal behavior](docs/contract-behavior.md#access-001).

**Acceptance.**
1. Create a labelled grant and prepare a proposal attributed to it.
2. Under a held company policy, a commitment-class price approval waits for the named person and client creation follows its standard rule; under the all-autonomous company policy, each permitted call runs.
3. Revoke the grant and read context again: access is refused.

### Approval, sending and acceptance

#### PROP-001 — Approval binds the exact revision

**Requirement.** Every proposal approval binds one exact revision. Revised scope, price or terms clear prior approvals. APPROVE-001 and APPROVE-003 choose the applicable proposal approval steps. An agent’s binding decision carries commitment and follows company policy. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#prop-001).

**Acceptance.**
1. Under the held proposal policy, a stale approval is refused; approve the current revision, revise its price and attempt to send: sending waits for the new revision’s approval.
2. After approving the new revision and sending, two retained approval records identify their respective revisions, approvers, roles, rules and times.
3. A manager’s approval under a matching rule binds the same exact revision.

#### PROP-002 — Sending freezes the offer

**Requirement.** Sending freezes the approved revision: its scope, options and prices can no longer be edited in place. Anyone who may send the proposal under `APPROVE-003` can send a fresh invitation, which rotates the client link and clears any verification session without changing the offer, so it needs no new approval. A change after sending is a new revision under `NEG-001`, never an edit to what the client already holds. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#prop-002).

**Acceptance.**
1. Send an approved proposal, try to revise it (409), send a fresh invitation and confirm the old link is refused and the offer unchanged.

#### SIGN-001 — Verified-mailbox acceptance

**Requirement.** A client invitation grants only its frozen offer. Mailbox verification is the initial signing method; the firm can explicitly choose SIGN-006 alternatives. Verification binds the invitation and revision. [Proposal behavior](docs/contract-behavior.md#sign-001) states code and cookie limits.

**Acceptance.**
1. Acceptance before mailbox verification is refused.
2. A valid six-digit mailbox code verifies its invitation; reusing it is refused.
3. Five wrong attempts exhaust a code, including a later correct attempt.
4. An expired code is refused.
5. Requests are limited to one per minute and ten per invitation; codes expire after ten minutes.
6. The verification cookie is private to its invitation, HttpOnly and SameSite Strict; another revision gains no authority.

#### SIGN-002 — Immutable acceptance with an integer-cent deposit

**Requirement.** Acceptance requires a verified mailbox, a typed full name, one offered option and explicit consent. Acceptance atomically retains the exact approved snapshot, signer, consent text and time, and calculates the deposit in integer cents, rounding to the nearest cent. A second acceptance returns the first; nothing in the product edits an accepted agreement. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-002).

**Acceptance.**
1. Accept with an unknown option (400), accept option two with consent, accept again with another name and option, and read back the first acceptance with total 420000 and deposit 105000 cents.

#### INV-001 — One retained deposit invoice per acceptance

**Requirement.** An owner exports the accepted deposit as an invoice record. A unique proposal-to-invoice binding makes concurrent and repeated exports return one retained invoice with one number, and the export can be downloaded again without creating another. Re-downloading never authorizes posting the same invoice to accounting twice; `ACCT-004` carries this one-invoice rule into live accounting sync. The first release writes a Xero-format CSV; the export rejects proposals that are not accepted. Spreadsheet formula characters in client-controlled cells are neutralized. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#inv-001).

**Acceptance.**
1. Export an unaccepted proposal (409), export an accepted one twice concurrently and get one invoice, and download its CSV.

### Clients, erasure and archives

#### IMPORT-001 — Reviewed client CSV move-in with undo

**Requirement.** A reviewed client CSV becomes native clients through the Base import door. Client dependencies prevent unsafe undo. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#import-001).

**Acceptance.**
1. Preview the client fixture without writing clients.
2. Applying changed bytes against the reviewed fingerprint is refused.
3. Apply the reviewed bytes, read their original and journal, and replay: the same import job is returned.
4. Undo restores the previous clients; a changed imported client or one with dependent proposals prevents undo.

#### ERASE-001 — Bounded client erasure

**Requirement.** An owner erases a client by typing the exact client name. Erasure is limited to clients with no proposals and no import history; agreements remain retained business records. Erasure writes a portability fence, so an older archive cannot restore the erased client and in-flight transfers are invalidated. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#erase-001).

**Acceptance.**
1. Erase a client with a draft (409), erase with the wrong name (400), erase an unused client, then restore an older archive with the newer erasure journal and find the client absent.

#### PORT-001 — Validated archives and restore

**Requirement.** The Platter archive carries clients, proposals, revisions, approvals, immutable acceptances and deposit invoices. It carries no credentials, sessions, invitation links, verification authority or mail. Sent offers require fresh invitations after restore. The generic archive conformance journey belongs to BASE-DATA-001 in Shared duties. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#port-001).

**Acceptance.**
1. Inspect a populated archive: it retains clients, proposal revisions, approvals, immutable acceptances, deposit-invoice records and their original attachment bytes.
2. A populated destination and a damaged archive are refused.
3. An older archive after erasure is refused without the newer erasure journal.

### Mail and the public site

#### MAIL-001 — Durable proposal mail with honest outcomes

**Requirement.** Proposal and verification mail share the offer transaction. Local development captures these messages. The seed’s delivery and bounce outcomes are SEND-002. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mail-001).

**Acceptance.**
1. Send a proposal and request mailbox verification locally: both messages are captured without a provider request.
2. With a mail-provider fake, the proposal and mail row exist and are claimed before provider contact.
3. A provider timeout leaves the message uncertain; processing again sends no duplicate.

#### SITE-001 — Public run site and documentation

**Requirement.** The public run site’s Run Platter action opens the runnable product. Its guides work without JavaScript; the installed home remains the shared Lobby. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#site-001).

**Acceptance.**
1. Build the public site and follow Run Platter to the run page.
2. Open the guides without JavaScript and read their Markdown content.
3. Open the installed home and see the Lobby.

## Target clauses

### Authoring and branding

#### EDIT-001 — Branded drag-and-drop proposal editor

*Tier:* Core · *Cites:* BASE-INPUT-002, BASE-INPUT-003, BASE-ACCESSIBILITY-001 · *Rules:* D-1

**Requirement.** A member builds a proposal from blocks: cover page, heading, rich text, image, video, columns, pricing table (`PRICE-001`), quote or testimonial, team bio, case study, terms, form field (`SIGN-007`), signature block and page break. Every signature block and field is assigned to one recipient, or in a template to one recipient role (`SIGN-011`). Blocks are added from a palette, reordered by drag or keyboard, duplicated and deleted with undo. A brand kit sets the logo, colors, fonts and a default cover. One document renders as a responsive web page for the client and as a paginated US Letter PDF (`EDIT-020`) with the same content, and members and approvers see that client page for an unsent revision through the preview of `EDIT-018`. Edits autosave under the version guard of `COLLAB-001`, and the editor meets the large-proposal performance budget of `EDIT-011`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-001).

**Acceptance.**
1. A browser journey at 1440 and 390 pixels builds a proposal from blank with every block type, reorders by drag and by keyboard, applies a brand kit, reloads and sees the same document, and exports a PDF whose pages carry the same blocks in order; the `EDIT-011` budget journey passes on the same build.

#### EDIT-002 — Proposal templates

*Tier:* Core · *Rules:* D-1

**Requirement.** Owners, admins, managers and content editors publish templates (layout, blocks, default pricing tables, terms, payment methods (`PAY-001`), deposit and payment schedule (`PRICE-007`), reminder schedule and expiry period (`FOLLOW-006`), variables, and recipient roles with their assigned fields, signing order and pre-assigned recipients under `SIGN-011`) that members start proposals from; a proposal started from a template opens with the template's role slots to fill. Platter ships starter templates for US agencies, consultancies, IT managed services, creative studios and professional services. Any member who edits proposals can save one as a personal template they own; only the template roles of `TEAM-001` edit shared templates. Templates have owners, folders and access rules (`TEAM-001`), and changing a template never changes proposals already created from it. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-002).

**Acceptance.**
1. Create a template with a pricing table and variables, start two proposals from it, edit the template, and confirm both proposals are unchanged while a third proposal picks up the edit.
2. On a fresh installation the five starter templates (agency, consultancy, IT managed services, creative studio, professional services) are listed, and each starts a proposal with a pricing table and filled variables.
3. Put a template in a folder limited to the Design team: a Design-team member lists and uses it, and a Sales-team member neither lists it nor starts from it (403).
4. A sales member saves a proposal as a personal template and is recorded as its owner, and their edit of a shared template is refused (403).
5. A proposal started from a template with recipient roles opens with those role slots, as the `SIGN-011` journey checks.
6. A template set to offer card and ACH only, a 30% deposit with a net-15 milestone, reminders at 2, 5 and 9 days and a 14-day expiry starts a proposal carrying all of them, as the `PAY-001`, `PRICE-007` and `FOLLOW-006` journeys check, and editing them on that proposal leaves the template unchanged.

#### EDIT-003 — Reusable content library

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-INPUT-003 · *Rules:* D-1

**Requirement.** A shared library holds sections, images, videos, case studies, team bios, testimonials, terms and pricing tables, with folders, tags and search. Owners, admins, managers and content editors create and edit library items, and every member who edits proposals inserts them (`TEAM-001`). A member inserts an item as a linked copy (updated when the library item changes, until the proposal is sent) or as a detached copy. Sent and accepted proposals never change when the library does. Each item shows where it is used and when it last changed. Under RL-23, the current proposal editor explicitly consents at insertion to recipient display and future linked draft edits. Usage grants no access beyond existing proposal visibility. EDIT-002 and EDIT-005 inherit independent copied content; EDIT-006 inherits consent and exact frozen media custody for future media capabilities. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-003).

**Acceptance.**
1. Insert a linked and a detached case study into a draft and a sent proposal, edit the library item, and see only the linked copy in the draft change; the item's usage list names all three.

#### EDIT-004 — Variables from client, deal and CRM records

*Tier:* Core · *Rules:* D-1

**Requirement.** Text and pricing can use variables: client company, contact name and title, address, deal name and amount, sender details, dates and custom fields, filled from Platter records or from the linked HubSpot, Salesforce or Orbit deal (`CRM-001` to `CRM-003`). Template role slots (`SIGN-012`) are filled the same way, from the client's contacts or the deal's contacts. A variable with no value is flagged in the editor, and sending is refused until each one is filled or deliberately cleared. The sent revision freezes the filled values. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-004).

**Acceptance.**
1. Create a proposal from a HubSpot deal fake with a missing contact title, see the send refused naming that variable, fill it, send, change the deal in the fake, and see the sent proposal unchanged.

#### EDIT-005 — Word and PDF import and export

*Tier:* Core · *Rules:* D-1

**Requirement.** Word imports become editable proposal blocks with headings, paragraphs, lists, tables and images. Published token mappings create variables; unmapped tokens become listed custom variables. Quote tables match catalog items by SKU then name, retaining quantity and price; unmatched rows and missing images are listed. Word library imports split at each Heading 1. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-005).

**Acceptance.**
1. Import a PandaDoc-shaped Word template with headings, an image, company and sender tokens and six quote rows: the blocks are editable, tokens are variables, five SKU matches are linked and the unknown row is listed.
2. Unmapped tokens become named custom variables; missing source images are reported rather than invented.
3. Import ten Heading 1 sections as library content: ten items carry those headings.

#### EDIT-019 — Fixed PDF pages with signing fields

*Tier:* Core · *From:* EDIT-005 · *Rules:* D-1

**Requirement.** An imported PDF keeps its original pages, with signing, initials, date and form fields. Editor blocks and a pricing table can follow the fixed pages, and the document can collect its scheduled payment.

**Acceptance.**
1. Upload a PDF: its original pages remain byte-identical and uneditable.
2. Place a signature field on page 3; append pricing after the last page and verify its added lines total correctly.
3. Fixed pages and added blocks retain the exact-revision unsigned-download behavior of EDIT-014.

#### EDIT-020 — Word and PDF exports

*Tier:* Core · *From:* EDIT-005 · *Rules:* D-1

**Requirement.** Proposals export to US Letter or A4 PDF and Word. The signed agreement PDF remains SIGN-005.

**Acceptance.**
1. Export three headings, a four-line pricing table and two images to Word: headings use Word heading styles, the table carries every name, quantity, unit price and total, and both images are embedded.
2. The PDF contains the same blocks in the same order.

#### EDIT-006 — Embedded rich media

*Tier:* Core · *Cites:* BASE-INPUT-002, BASE-INPUT-003, BASE-PUBLIC-001 · *Rules:* D-1

**Requirement.** Proposals embed images and galleries, uploaded video, YouTube, Vimeo, Loom and Wistia video, a Dial or Calendly booking link and embedded PDFs. Embeds come from an allowlist with a content security policy, render on phones, and show a still and a link in the PDF export. Uploaded media is stored with the proposal and travels in archives (`PORT-002`). Under RL-24, the audited external-content control is off on fresh installs; only owners and admins change it or external blocks, and author consent stays in the revision. Viewers opt in on every page load, with no provider requests, cookies or browser storage before consent. The owner kill switch replaces external content with a plain placeholder naming its provider on the next load. EDIT-002, EDIT-003 and EDIT-005 inherit these consent and frozen-media obligations for future media carriers. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-006).

**Acceptance.**
1. Add an uploaded video, a Loom link and a gallery, view on a 390-pixel phone and play the video, export the PDF and see stills with links, and try an embed from a host outside the allowlist (refused).

#### EDIT-007 — Mobile client review

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001 · *Rules:* D-1 · *Register:* R-4, R-5

**Requirement.** The client reads, chooses options, comments, signs and pays on a phone as well as on a desktop. Clients need no app or product account. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-007).

**Acceptance.**
1. A browser journey at 390 pixels opens an invitation, verifies the mailbox, changes an optional item, comments, signs and pays with a Stripe test card; the Base accessibility journey passes on the same client flow.

#### EDIT-008 — Custom domain and branded client experience

*Tier:* Core · *Cites:* BASE-PUBLIC-002, BASE-MAIL-001 · *Rules:* D-1 · *Register:* R-10

**Requirement.** An owner serves client links from their own domain, such as `proposals.example.com`, and sends from their own domain with SPF, DKIM and DMARC alignment checked before use. The client page, emails and PDF carry the firm's brand and no Platter branding. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-008).

**Acceptance.**
1. Configure a hostname and sending domain through official-schema provider fakes: DNS checks pass, and the resulting client page, email and PDF contain the firm’s brand and no Platter branding.

#### EDIT-009 — Conditional content by package

*Tier:* Core · *Rules:* D-1

**Requirement.** Sections can depend on a package, optional item or variable value. Each selection’s client page, unsigned and signed PDFs and immutable agreement contain exactly its visible sections. Optional-item conditions require that the chosen package contains and selects that item at an allowed quantity; unconditional content remains visible. Members compare selections in EDIT-018. Detailed condition custody is in [proposal behavior](docs/contract-behavior.md#edit-009).

**Acceptance.**
1. Make a timeline section depend on the Premium package, accept the Standard package and see the section absent from the agreement and PDF, then accept Premium on another copy and see it present.

2. A variable-dependent section follows the filled variable on preview, client page, agreement and PDF.

#### EDIT-010 — Attachments and vendor documents

*Tier:* Core · *Cites:* BASE-INPUT-003, BASE-DATA-001 · *Rules:* D-1

**Requirement.** A proposal carries attachments such as the firm's W-9, certificate of insurance, MSA or case-study PDFs. The firm stores its current W-9 and insurance certificate once and attaches them by default. Attachments are frozen with the sent revision and listed in the signed agreement package. Owner-only vendor settings keep immutable W-9 and insurance file versions; new proposals copy the current defaults. Owner/member people may upload arbitrary files or refresh current defaults on an unsent draft or approved proposal; either creates a new draft revision and clears approval. Existing revisions and sent offers never resolve a later default. Client links download only files in that exact sent revision, under the same invitation access as its offer; bytes are download-only and are not sent to an external provider. The immutable accepted snapshot retains file references with byte digests; the owner/client agreement package lists the same file versions, filenames and byte sizes. All original bytes and current defaults survive PORT-002 archives. SIGN-005 inherits the same list in its signed PDF package and TEAM-001 inherits scoped person authority before shipping. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-010).

**Acceptance.**
1. Upload a W-9 in settings, send a proposal, and as the client download the W-9; replace the W-9 in settings and see the sent proposal still carry the original.

#### EDIT-011 — Large-proposal performance budget

*Tier:* Core · *Rules:* D-1

**Requirement.** The editor and client page stay fast on the proposals agencies actually send. The reference document is 40 US Letter pages with 30 images (2400-pixel JPEGs of about 500 KB each) and four pricing tables of 15 lines. Measured in Chromium at 1440 by 900 pixels with the CPU throttled 4×: the editor opens from navigation to editable (the first block accepts input) in at most 3 seconds; keystroke-to-paint latency over 200 keystrokes typed into a block on page 30 has a p95 of at most 100 ms; a drag reorder of a section completes, from drop to repainted order, in at most 300 ms; and a pricing-table quantity edit shows the server-confirmed total in at most 500 ms. The client page of the same proposal at 390 pixels with the same throttle reaches largest contentful paint in at most 2.5 seconds and loads images below the fold lazily. A measure over budget is a failing acceptance run. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-011).

**Acceptance.**
1. A browser journey creates the reference proposal through the public API, applies the 4× throttle, opens it at 1440 pixels and records time to editable, the p95 of 200 keystroke-to-paint intervals (Event Timing API), one drag reorder and one quantity edit, then opens the client page at 390 pixels and records largest contentful paint; the run reports each measured value and fails if any exceeds its budget.

#### EDIT-012 — Duplicate a proposal for another client

*Tier:* Core · *Rules:* D-1

**Requirement.** A person duplicates any draft, sent, accepted or lost proposal for the same or another client. The source remains unchanged; the copy is an independent new draft, with destination variables and recipient slots. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-012).

**Acceptance.**
1. Duplicate Acme’s accepted proposal for Beta: content, prices, files and delivery/payment settings match, variables show Beta and only template-preassigned recipient slots remain filled.
2. The new draft contains no approvals, views, comments, signatures or payments.
3. With approval required for all proposals, sending waits for approval; with it off and no matching rule, the owning sales member sends.
4. Acme’s agreement remains byte-identical.

#### EDIT-021 — Duplicate lifecycle and file custody

*Tier:* Core · *From:* EDIT-012 · *Rules:* D-1

**Requirement.** Copies preserve the source’s original currency, integer-cent deposit, exact attachment bytes, PDF setting and expiry configuration. A copied days-based period starts a new clock; an absolute date stays absolute. Title and record mechanics are in [proposal behavior](docs/contract-behavior.md#edit-012).

**Acceptance.**
1. Duplicate draft, approved, sent, expired, withdrawn and accepted proposals and an unsent negotiation, for both the same and another existing client; every source remains unchanged.
2. Each copy starts at draft revision 1 owned by its preparer, with no invitation, mail, suggestion, invoice, expiry-transport or other lifecycle authority.
3. Stale copy requests are refused; an agent’s copy follows standard company policy within its sponsor’s rights.
4. At desktop and phone widths, copy through the form, choose Beta, inspect the separate draft, approve and send while the source remains accepted.
5. Archive and restore the copy’s files, content and settings exactly.

#### EDIT-013 — Documents without pricing

*Tier:* Core · *Rules:* D-1

**Requirement.** A firm sends and signs documents that carry no pricing table, such as a statement of work, NDA, master services agreement or change authorization, built in the editor or uploaded as a PDF with fields (`EDIT-019`). Approval, sending, tracking, reminders and signing work as for any proposal; the payment step, deposit, invoice and accounting sync are skipped, and the agreement records that no amount was agreed. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-013).

**Acceptance.**
1. Upload a two-page NDA PDF, place signature and date fields for two signers, approve and send, and sign as both: the agreement completes with its signed PDF and certificate, no payment step is shown, no invoice exists and the accounting fake receives no call.

#### EDIT-014 — Client PDF download before signing

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Rules:* D-1

**Requirement.** A recipient can download a PDF of the revision they are viewing before signing, so their procurement team can circulate it, unless the firm turns this off per proposal or template. The PDF carries the selection made so far, the revision number and "Not signed" on every page, and each download is on the timeline (`TRACK-001`). The signed agreement PDF remains `SIGN-005`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-014).

**Acceptance.**
1. As a verified client, choose a package and download the PDF: every page reads "Not signed, revision 2" and shows the chosen package, and the timeline lists the download; turn downloads off on another proposal and see no download action and the PDF route refused (403).

#### EDIT-015 — Locked template sections

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Rules:* D-1

**Requirement.** Template owners lock sections such as legal terms, warranties and payment terms. Members using the template can place and reorder a locked section but not edit it; owners, admins, managers and content editors lock and unlock sections in templates, and only the owner, an admin or a manager of the proposal's team unlocks one in a proposal (`TEAM-001`); and an unlock is recorded in the audit log (`TEAM-004`) and can trigger an approval rule (`APPROVE-001`). Locks are enforced on the server, not only in the editor. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-015).

**Acceptance.**
1. Lock the terms section in a template; as a sales member try to edit it in the editor and through the API (both refused); as a content editor try to unlock it in a proposal (403); as an admin unlock it in one proposal and edit it, and see the unlock in the audit log and approval required before sending.

#### EDIT-016 — Proposal search and folders

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Rules:* D-1

**Requirement.** Members search every proposal, template and agreement they may view under `TEAM-001` by title, client, contact, owner, status, amount, date and the full text of the content, including uploaded PDFs, and file proposals in folders with team access rules. Results and folders respect permissions on the server. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-016).

**Acceptance.**
1. Seed 500 proposals; search a phrase that appears only in the body of two proposals and one uploaded PDF and get exactly those three within one second; file proposals in a team folder and see a member outside the team find none of them by search or by folder.

#### EDIT-017 — Client page in the client's language

*Tier:* Core · *Rules:* D-1

**Requirement.** Each recipient sees the client page, emails, disclosures (`SIGN-003`, `TRACK-004`), verification and signing steps in their language: at least English, Spanish, French, German and Portuguese, set per recipient or taken from the browser. An agent’s translation edit carries standard and follows the company policy (`AI-002`), and the certificate of completion (`SIGN-005`) records the language shown. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-017).

**Acceptance.**
1. Set a recipient to Spanish: the invitation email, client page controls, ESIGN disclosure, verification and signing steps are in Spanish, the string catalog check finds no untranslated English string on those screens, and the certificate records Spanish.

#### EDIT-018 — Client-page preview before sending

*Tier:* Core · *Rules:* D-1

**Requirement.** Before sending, viewers, collaborators and pending approvers preview the exact revision’s client page at desktop and phone widths. The recipient-role selection and language match the client, with filled variables or the same missing-variable warning. Draft and unsent negotiated revisions use the same preview. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-018).

**Acceptance.**
1. Preview a draft at 1440 and 390: the banner identifies revision 1, recipient and return to editor.
2. With Basic, Standard and Premium, an optional item, quantity bounded 1–10, Premium-only timeline, tax, 30% deposit and two signers, choose Premium, its extra item and quantity 4: totals, tax, deposit, schedule and sections match the subsequently sent client page to the cent.
3. Quantity 11 is refused in both preview and sent page.
4. Viewing as signer 2 shows only signer 2’s fields.

#### EDIT-022 — Preview isolation and exact approval link

*Tier:* Core · *From:* EDIT-018 · *Cites:* BASE-ROLE-001, BASE-AUDIT-001 · *Rules:* D-1

**Requirement.** Preview interactions create no client or business lifecycle effects. Approval requests open the exact revision awaiting the decision. These obligations apply to every content, provider, record kind and public door as it arrives.

**Acceptance.**
1. Signing, acceptance, payment, decline, comments and other submissions are visibly disabled; direct preview submissions are refused.
2. After previewing, revision and approvals are unchanged, and timeline, tracking, reminders, expiry, mail and text contain no preview activity; only the member-preview audit is retained.
3. The pending manager opens the approval-request preview of revision 1; their approval binds it.
4. A person outside proposal scope is refused; signed-out and client-only sessions see no private preview.
5. Preview audit records retain actor, subject and server time through archive; refusals add no preview audit.

### Catalog and pricing

#### CAT-001 — Service and product catalog

*Tier:* Core

**Requirement.** A catalog holds services and products with name, description, SKU, unit (hour, day, month, project or each), USD unit price, internal cost, default recurrence, taxable flag and tax code, income account, and images (uploaded, or fetched from a URL at import), which a pricing table set to show images displays on the item's line in the editor, the client page and the PDF. It imports from CSV with a reviewed preview (as `IMPORT-001`) and syncs from QuickBooks Online or Xero items and HubSpot or Salesforce products (`ACCT-001`, `ACCT-002`, `CRM-001`, `CRM-002`). Pricing tables add items from it; price changes never alter sent proposals. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#cat-001).

**Acceptance.**
1. Import 50 items from CSV with a preview, one row with an image URL served by a file-host fake, sync items from a QuickBooks Online fake, add two items to a pricing table set to show images and see the imported image on its line in the editor, the client page and the PDF, change an item's price, and see the sent proposal unchanged and a new draft use the new price.

#### PRICE-001 — USD pricing tables with line items

*Tier:* Core · *Rules:* D-1

**Requirement.** A proposal has any number of pricing tables in USD, each with line items (name, description, quantity, unit, unit price), groups, subtotals and a grand total. All arithmetic is in integer cents with stated rounding, and totals are recomputed on the server. This replaces the first release's two GST-free AUD options for every new proposal; existing records keep their form under `PRICE-008`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-001).

**Acceptance.**
1. Build two tables with 12 lines, quantities and units, and see the server totals match a cent-exact fixture; send malformed quantities and prices (400); reload and see identical totals in the client page and the PDF.

#### PRICE-002 — Packages and optional items the client chooses

*Tier:* Core · *Rules:* D-1

**Requirement.** A proposal offers any number of packages (good, better, best) and optional items the client can add or remove. Quantities can be client-editable within a minimum and maximum the firm sets. Totals, tax, deposit and the payment schedule update as the client chooses, and the agreement records exactly the selection signed. The sender and approvers try the same choices before sending in the `EDIT-018` preview, which uses the same calculation. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-002).

**Acceptance.**
1. Offer three packages and two optional items with an editable quantity between 1 and 10; as the client choose the middle package, add one item and set quantity 4; the server totals, agreement and PDF all show that selection; quantity 11 is refused.

#### PRICE-003 — One-off and recurring fees

*Tier:* Core · *Rules:* D-1

**Requirement.** Line items can be one-off or recurring (weekly, monthly, quarterly or annual) with a term and start date. The proposal shows one-off total, recurring amount per interval and first-year value separately. Recurring lines drive the payment schedule (`PAY-003`) and renewal date (`RENEW-002`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-003).

**Acceptance.**
1. Add a $2,500 one-off setup and a $1,200 monthly retainer for 12 months; the client page shows one-off $2,500, $1,200 a month and first-year value $16,900; acceptance creates a matching schedule.

#### PRICE-004 — Discounts

*Tier:* Core · *Rules:* D-1

**Requirement.** Discounts apply to a line, a group or the total, as a percentage or a fixed amount, optionally shown to the client and optionally expiring on a date. A discount over the threshold an admin sets routes the proposal for approval (`APPROVE-001`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-004).

**Acceptance.**
1. Apply 10% to a group and $500 off the total, see cent-exact totals; set an approval threshold of 15% and see a 20% discount require approval before sending.

#### PRICE-005 — US sales tax

*Tier:* Core · *Rules:* D-1

**Requirement.** Each line is taxable or not under a tax code. Tax is calculated from the client's service or billing address by one of three methods the owner picks: owner-configured rates, Stripe Tax or Avalara AvaTax. Owner-configured rates are set per jurisdiction as state, county, city and special-district components with effective dates; Platter sums the components that apply to the address, computes tax on the taxable subtotal per jurisdiction in integer cents rounded half up, and freezes the rate used with the sent revision, so a later rate change never alters a sent quote. With Stripe Tax or AvaTax, Platter sends each line's amount, tax code and the addresses, applies the returned tax to the cent, and commits the AvaTax transaction when the invoice is issued. A tax-exempt client uploads an exemption or resale certificate, which is stored with the agreement. Tax shows as its own line and flows to invoices with the matching tax code (`ACCT-001`, `ACCT-002`). Platter calculates; filing returns stays with the tax service (see Honest boundaries). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-005).

**Acceptance.**
1. With owner-configured rates for Austin, Texas (state 6.25%, city 1% and transit authority 1%, 8.25% in all), quote a $1,000.00 taxable line and a $500.00 non-taxable line to an Austin client and see $82.50 tax as its own line, and the same quote to a Portland, Oregon client with $0.00 tax; give the city rate a new value with a future effective date and see the sent quote unchanged.
2. Run the same two quotes through a Stripe Tax fake and an Avalara AvaTax fake: each fake's request carries the line tax codes and addresses, the returned tax is applied to the cent, and the AvaTax transaction is committed when the invoice is issued.
3. Mark a client exempt with a certificate and see zero tax; sync the invoice and see the tax code in the QuickBooks Online fake.

#### PRICE-006 — Internal cost and margin

*Tier:* Core · *Rules:* D-1

**Requirement.** Line items carry internal cost (from the catalog or entered), and the editor shows margin per line, per package and in total. Cost and margin are visible only to the roles `TEAM-001` allows (owner, admin, manager and billing) and never appear in the client page, PDF, client API or webhooks. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-006).

**Acceptance.**
1. Price a package with costs, see margin per line and total as an owner, then load the client page, PDF, client API response and webhook payload and find no cost or margin; a sales role without cost access sees none either.

#### PRICE-007 — Payment terms and schedules on the proposal

*Tier:* Core · *Rules:* D-1

**Requirement.** Payment terms are part of the offer: a deposit as a percentage or fixed amount, milestones by date or by event (such as design approval), net 15 or net 30 invoices, and recurring charges. A proposal's terms are copied from its template (`EDIT-002`) when it is created, and the sender changes them per proposal before sending without changing the template. The client sees the schedule before signing, and the accepted schedule is frozen with the agreement and drives `PAY-002` and `PAY-003`. Before shipping, every schedule amount follows the client's `PRICE-002` package, optional-item and quantity selection in the `EDIT-018` preview, client page, PDF and frozen agreement, extending the named PRICE-002 journeys; today's percentage deposit already does. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-007).

**Acceptance.**
1. Set a 30% deposit, two milestones and a monthly retainer on net 15 terms; as the client see the schedule with dates and amounts; accept and read the same frozen schedule back.
2. Start a proposal from a template whose terms are a 30% deposit and a net-15 milestone: the proposal opens with those terms; change its deposit to 25% and the template still holds 30%.

#### PRICE-008 — First-release AUD agreements stay exact

*Tier:* Core · *Rules:* D-1

**Requirement.** Amounts carry an explicit currency. When an installation moves to USD pricing, proposals and agreements created under the first release keep their AUD, GST-free form, totals, deposit and invoice CSV exactly, labeled with their currency, and are never converted. New proposals use USD; revising or restoring an existing proposal retains its currency. The additive migration labels first-release rows AUD without rewriting their immutable snapshot strings or retained invoice bytes, including when restored from a pre-currency archive. Currency metadata applies to proposal, revision, acceptance and invoice records. USD deposit CSVs use `No Tax` because Platter does not yet calculate sales tax (`PRICE-005`); this is not a tax-exemption determination or evidence of successful accounting import (`ACCT-005`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#price-008).

**Acceptance.**
1. Restore a first-release archive with an accepted AUD proposal into a target build, and see the agreement, deposit and CSV byte-identical and labeled AUD while new proposals are USD.

### Collaboration and approvals

#### COLLAB-001 — Real-time team editing

*Tier:* Core

**Requirement.** Several members edit one draft at the same time and see each other's cursors and changes live. Concurrent text edits merge; a conflicting structural edit, such as editing a deleted block, is shown with a restore option and never resolved silently. Pricing edits are checked on the server. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#collab-001).

**Acceptance.**
1. A two-browser journey: two members type in the same section and see the same text within one second; one deletes a block the other is editing and the second is offered restore.

#### COLLAB-002 — Internal comments, mentions and assignments

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-MAIL-001

**Requirement.** Members leave internal comments on any block, mention a colleague, and assign a section to someone with a due date. Mentions and assignments notify by email and chat (`AUTO-003`). Internal comments are never visible to the client and never appear in the PDF or client API. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#collab-002).

**Acceptance.**
1. Comment on a pricing table mentioning a colleague, who gets a notification and resolves it; assign a section; the client page, PDF and client API show no internal comment.

#### COLLAB-003 — Version history with compare and restore

*Tier:* Core

**Requirement.** Every saved revision is listed with author and time. A member compares any two revisions, with text, line-item and price changes highlighted, and restores an earlier draft revision as a new revision that needs approval again. This covers every field and priced option the product supports today. `PRICE-001` inherits comparison of each added line-item field before it ships; `EDIT-001` and `PRICE-007` inherit comparison and restoration of their added document and payment-term fields. Restore retains the proposal identity, creates the next revision under the current actor and time, preserves earlier snapshots, clears current approval and is refused for sent or accepted offers. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#collab-003).

**Acceptance.**
1. Make three revisions, compare the first and third and see the changed price and text, restore the first as revision four and see approval required.

#### APPROVE-001 — Approval rules and routing

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** Admins set approval rules by total value, discount, margin, payment terms, edited legal terms or template, and route each to named people or an approver role (owner, admin or manager, as `APPROVE-003` sets), in sequence or in parallel. A named person must hold the owner, admin, manager or billing role; a rule naming a sales member, content editor or viewer is refused when saved (400), and a named billing user approves only the steps that name them (`TEAM-001`). A rule applies to all proposals or to chosen templates, and a step whose condition does not hold for the current revision is skipped, as with the incumbents' conditional approvals. Whether a proposal that matches no rule needs approval at all is the `APPROVE-003` policy setting. `PROP-001`'s exact-revision binding applies to every approver. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#approve-001).

**Acceptance.**
1. Set rules: over $25,000 needs a manager, a discount over 15% needs the owner.
2. A $30,000 proposal with 20% discount needs both in order; editing after the first approval clears both.
3. A parallel rule routes edited legal terms to a named admin (counsel) and a named billing user (finance) at once: it completes only when both approve, in either order, and one rejection stops it; a second billing user not named in the rule is refused (403), and saving a rule that names a sales member is refused (400).

#### APPROVE-002 — Approval requests that reach the approver

*Tier:* Core

**Requirement.** An approval request reaches the approver by email, Slack, Microsoft Teams, Nook or mobile push, with a summary of what triggered the rule and a link to the client-page preview of the exact revision awaiting approval (`EDIT-018`). The approver approves or rejects with a note from the request, including on a phone (`MOB-001`). Overdue requests remind the approver and the requester sees who holds it. The ct-approved notification boundary requires owner/admin-verified destination consent, generic channel text with protected links, private detail only to eligible direct approvers, current session/revision/plan decisions, uncertain delivery held and restored routes inactive (RL-20). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#approve-002).

**Acceptance.**
1. Submit a proposal that needs approval: the Slack fake's request and the email each carry a link that opens the `EDIT-018` preview of the revision awaiting approval, under the approver's session.
2. Approve it from the Slack fake's action, reject another from email with a note, and see an overdue reminder after the set delay.

#### APPROVE-003 — Who approves, who sends and what needs approval

*Tier:* Core · *Cites:* BASE-AGENT-007, BASE-AGENT-008

**Requirement.** One proposal approval policy applies to originals, negotiations, copies, drafted proposals, import reissues, public-link templates and phone decisions. The TEAM-001 matrix defines eligible people and proposal scope. Agent binding decisions carry commitment, while sending carries external and commitment; the company’s policy decides their calls. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#approve-003).

**Acceptance.**
1. With value above $25,000 routed to managers and no-rule approval off, the owning sales member sends an unruled $3,000 proposal without an approval record.
2. A manager approves the $30,000 proposal, and the owning sales member sends it.
3. Sales approval and content-editor sending are refused, as are sending another sales member’s proposal and a manager deciding outside their team.
4. Turn no-rule approval on: the unruled proposal waits for the selected owner, admin or manager role; changing that role changes who may decide.
5. Only owner/admin change the proposal policy; the change retains actor and time.

#### APPROVE-004 — Approval reevaluation on the exact revision

*Tier:* Core · *From:* APPROVE-003 · *Cites:* BASE-AGENT-007

**Requirement.** An edit clears all approvals and reevaluates the rules. Rule and policy changes reevaluate eligibility without changing sent content. Currency and sequence mechanics are in [proposal behavior](docs/contract-behavior.md#approve-003).

**Acceptance.**
1. Edit a manager-approved proposal: its approval clears and sending waits for a new decision.
2. Total-value rules use the highest package with optional quantities at their allowed maximum in integer cents; currencies are not converted.
3. Edited-terms conditions compare with the first draft; saved rule sequence and stable identity determine order.
4. Parallel approvers act in either order; a rejection prevents sending until revision.
5. An agent-prepared proposal’s commitment decision follows the company’s policy after human revisions as well as before them.

### Sending and delivery

#### SEND-001 — Send from the firm's own mailbox

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-SECRET-001, BASE-MAIL-001 · *Rules:* D-1 · *Register:* R-1

**Requirement.** A member connects Gmail/Google Workspace or Microsoft 365/Outlook and sends proposals, reminders and replies from their verified mailbox. The mailbox may differ from the Platter sign-in address. Without a usable mailbox, the installation’s branded sender is used with a visible notice. [Mailbox behavior](docs/contract-behavior.md#send-001) records provider scopes and address verification.

**Acceptance.**
1. Connect each provider fake, send as that mailbox and revoke its grant: the next send uses the installation sender with a visible broken-connection notice.
2. A provider-verified Google alias or Microsoft SMTP address differing from sign-in appears as sender to the client and in timeline and audit.
3. An address owned or connected by another active member, an unverified Google address and a Microsoft account lacking an SMTP address are refused without storage.
4. After the member loses send authority, no mailbox message leaves.
5. Provider refusal changes the next send’s route and records the installation sender.

#### SEND-011 — Inbound client reply custody

*Tier:* Core · *From:* SEND-001 · *Cites:* BASE-ROLE-001, BASE-SECRET-001, BASE-MAIL-001 · *Rules:* D-1

**Requirement.** Replies thread to their proposal without authorizing an approval, signature or proposal state change. The claimed sender and receiving provider’s authentication results remain labelled as claims, never verified client identity.

**Acceptance.**
1. Reply from the client side after sends through both mailbox fakes: each reply appears on the proposal timeline.
2. Automatic and bulk replies create neither a record nor a notification.
3. The per-invitation reply cap produces one durable owner notice when reached.
4. Reply history retains the claimed sender and receiving-server authentication results.

#### SEND-002 — Delivery status and bounce handling

*Tier:* Core · *Cites:* BASE-MAIL-001, BASE-OPS-003 · *Rules:* D-1

**Requirement.** Each proposal send displays signed provider states: queued, provider accepted, delivered, deferred, bounced and complained. Correlation and transport details are in [delivery behavior](docs/contract-behavior.md#send-002). Transports without signed events label that limitation.

**Acceptance.**
1. Through the mail-provider fake, delivered, deferred-then-delivered and hard-bounce sends show their respective states.
2. Resend and SendGrid callbacks correlate exact provider message and recipient; replay creates no duplicate and terminal states do not regress.
3. Queued, complained and uncertain states remain distinct.
4. At desktop and phone widths, read delivery history.

#### SEND-012 — Bounce correction follow-up

*Tier:* Core · *From:* SEND-002 · *Cites:* BASE-MAIL-001, BASE-OPS-003 · *Rules:* D-1

**Requirement.** A bounce notifies its sender and creates a separate address-correction follow-up. Reading the notice leaves the correction open. Correction rotates invitation authority without changing client identity or the frozen offer.

**Acceptance.**
1. The mail fake’s hard bounce produces both sender notice and follow-up.
2. Only the current authorized sending person corrects the invitation; an explicit fresh send invalidates the earlier link and verification and sends codes to the corrected address.
3. Provider acceptance of the correction closes its follow-up; uncertainty leaves it open.
4. Dismissal requires a logged reason.
5. Desktop/phone journeys exercise correction; archive restores open and resolved corrections without mail or invitation credentials.

#### SEND-003 — Recipients, roles and sharing

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-PUBLIC-002 · *Rules:* D-1

**Requirement.** A proposal has any number of recipients with a role: signer, client-side approver, viewer or CC. A proposal created from a template starts with the template's role slots, fields and order (`SIGN-011`), and sending is refused (409) while a signer, approver or countersigner slot is unfilled. Each recipient has their own link and verification. Before sending, the sender previews the client page as each recipient (`EDIT-018`). The firm can also share by link (with verification) or embed the proposal on its site. Removing a recipient revokes their link, and withdrawing the proposal revokes every link at once (`SEND-010`). Replacing a signer on a sent proposal is `SEND-007`, and a signer delegating is `SIGN-009`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-003). The current native owner alone manages recipient roles, explicitly sends invitations or creates additional mailbox-bound viewing links, and authorizes an exact framing origin. Stakeholder conversion, copies and restores grant no invitation authority and never invite automatically. This native-owner authority floor is RL-21; full template-role management remains SIGN-011 and provider-specific recipient checks remain SIGN-006.

**Acceptance.**
1. Add a signer, a CFO approver and a viewer; each opens their own link; the viewer cannot sign; remove the viewer and see their link refused.

#### SEND-004 — Expiry and reopening

*Tier:* Core · *Rules:* D-1

**Requirement.** The sender chooses an expiry period from sending, an absolute date or no expiry. The client sees the date. Calendar arithmetic follows the stored IANA zone and daylight saving. Changes follow [expiry behavior](docs/contract-behavior.md#send-004), never an invented send timestamp.

**Acceptance.**
1. Send with seven-day expiry, advance to its date and read the expired page.
2. The verified client requests reopening; extending to a later date reopens the same links and permits acceptance.
3. On a 1 March send with fourteen days, the page shows 15 March and expires at its stored-zone boundary.
4. An accepted agreement never expires; a fresh invitation keeps its first-send clock and a sent negotiated revision starts a new period.
5. Expiry changes and reopen requests survive archive without transport authority.

#### SEND-013 — Unsigned-recipient expiry warnings

*Tier:* Core · *From:* SEND-004 · *Rules:* D-1

**Requirement.** The sender can enable a warning a chosen number of days before expiry. Its template follows SEND-006. SIGN-004 applies it to every unsigned recipient.

**Acceptance.**
1. For 15 March expiry and a one-day warning, each unsigned signer gets the warning on 14 March and no signed signer gets one.
2. Extending expiry to 22 March moves the warning to its new date.
3. Repeated processing produces one warning; uncertain transport remains held.
4. Settings and warning facts survive archive without sending authority.

#### SEND-005 — Completion and activity notifications

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-MAIL-001 · *Rules:* D-1

**Requirement.** The sender and watchers are notified when a proposal is first viewed, commented on, signed, declined, paid or fails payment, by email, Slack, Microsoft Teams, Nook or push, under per-person preferences that choose the events and channels for each person. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-005).

**Acceptance.**
1. Watch a proposal with Slack and email on; open, comment, sign and pay as the client; see four notifications in each channel fake with links back to the proposal.
2. A second watcher who turned view notifications off and chose email only gets three emails and no Slack message.

#### SEND-006 — Editable subject, message and shared email templates

*Tier:* Core · *Rules:* D-1

**Requirement.** Proposal send, reminder, reinvitation, revision, replacement, invoice and completion messages use editable subjects and personal text. Shared templates declare event/proposal defaults, variables and locks. Filled subject/body, recipient and time remain on timeline and in the agreement. Verification code wording stays fixed. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-006).

**Acceptance.**
1. Send the shared template to Dana at Acme: mail and timeline contain exactly “Proposal for Acme” and “Hi Dana,”.
2. The first reminder uses template text; editing the scheduled second reminder changes only its sent text.
3. An unfilled variable prevents sending and names that variable; an ordinary member cannot edit locked wording.

#### SEND-014 — Private rehearsal email

*Tier:* Core · *From:* SEND-006 · *Rules:* D-1

**Requirement.** A proposal editor or sender rehearses email only to their active sign-in mailbox. Its proposal link opens the member-only preview. It is labelled as a test and never enters the agreement package.

**Acceptance.**
1. On an unapproved draft, a rehearsal produces one message to the sender’s own address with the test subject prefix.
2. Its preview link works with the member session and refuses a signed-out reader.
3. No revision, approval, tracking, reminder or client-link authority changes; the timeline labels the test.
4. A supplied alternative recipient is refused; the eleventh daily rehearsal for that member/proposal is refused.

#### SEND-007 — Replace an unsigned signer on a sent proposal

*Tier:* Core · *Rules:* D-1

**Requirement.** When the client says someone else signs ("our COO signs, not me"), the sender replaces a recipient who has not signed on a sent proposal, with a reason. The offer, its revision and its approvals are unchanged and no re-approval is needed. The replaced recipient's link and verification session are revoked at once; the new signer gets their own link and identity check (`SIGN-001`, `SIGN-006`), the same place in the signing order (`SIGN-004`) and the message of `SEND-006`. The replacement (who, by whom, when and why) is on the timeline and in the certificate of completion (`SIGN-005`). A recipient who has signed can never be replaced, and nothing is replaced on an accepted agreement. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-007).

**Acceptance.**
1. Send revision 2 with the client CEO as signer and replace the CEO with the COO: the proposal is still revision 2 with its original approval and no new approval request; the CEO's link is refused; the COO verifies and signs; the certificate lists the replacement with reason and time.
2. On another proposal sign as the CEO, then try to replace the CEO (409).

#### SEND-008 — Sending and reminders by text message

*Tier:* Core · *Cites:* BASE-MAIL-001, BASE-ROLE-001 · *Rules:* D-1 · *Register:* R-3

**Requirement.** A sender delivers the proposal link, reminders and completion notices by text message to a US mobile number through Twilio, alongside or instead of email. Texts go from a registered A2P 10DLC number or toll-free number, record the recipient's consent, honor STOP and HELP under carrier rules and the TCPA, respect the quiet hours of `FOLLOW-001`, and appear on the timeline with their delivery status. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-008).

**Acceptance.**
1. With a Twilio fake: send a proposal by text and see the message with its link on the timeline with the delivery callback state; reply STOP and see later reminders by text suppressed while email reminders continue; a text reminder due at 6 am in the recipient's time zone waits until quiet hours end.
2. Acceptance rider: Assert the recorded assent fields and exact revision and invitation binding; missing consent, invalid zone, changed binding, revoked Send authority and number-wide suppression refuse dispatch without provider calls.
3. Exercise quiet-hour deferral across daylight-saving transitions and recheck authority and suppression when deferred work becomes due.
4. STOP on one invitation suppresses every SMS purpose to the same number on another invitation while independently permitted email reminders continue; START does not reactivate sending.
5. Public CLI restore retains exact history and suppression but restores no sending authority and replays no transport.
6. An uncertain provider outcome remains held through repeated processing with no automatic retry.
7. Assert actual timeline message content without credential-bearing links, distinct provider acceptance and delivery states, existing HELP behavior, and atomic withdrawal cancellation.

#### SEND-009 — Reusable public signing link

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-PUBLIC-002, BASE-INPUT-001 · *Rules:* D-1

**Requirement.** A template can be published as a reusable public link or site embed, like PandaDoc Forms: any visitor enters their name, email and company and the template's form fields (`SIGN-007`), chooses optional items, verifies their mailbox (`SIGN-001`) and signs (`SIGN-003`) as the template role the firm marks as the public signer, while the template's other roles, such as a pre-assigned countersigner, keep their assignment (`SIGN-011`); each submission creates its own proposal and agreement from the template revision that was approved for publishing under `APPROVE-003`. The visitor cannot change prices or terms. The firm sets a submission cap and an expiry for the link itself; each submission's proposal takes the template's reminder schedule and expiry period, counted from the submission (`FOLLOW-006`). The firm can require its countersignature (`SIGN-004`) before an agreement completes, and can disable the link at once. Submissions reach the CRM (`CRM-001` to `CRM-004`), follow-up (`FOLLOW-002`), payment (`PAY-002`) and reports like any proposal. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-009).

**Acceptance.**
1. Publish a template with a $500.00 deposit as a public link and submit it as two visitors: two separate agreements exist, each with its own signer, field values, certificate and deposit; a request that changes a line price is refused (400); with countersignature required, neither completes until the owner countersigns; disable the link and see the next visit refused (410); edit the template and see the link refused until the new revision is approved for publishing.

#### SEND-010 — Withdraw a sent proposal

*Tier:* Core · *Cites:* BASE-ROLE-001 · *Rules:* D-1

**Requirement.** An authorized sender withdraws a sent proposal with a reason. It becomes read-only and every signer, client approver, viewer, CC, shared or replaced link and verification session is revoked. Recipients see a withdrawn page with the firm’s contact details and no proposal content. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#send-010).

**Acceptance.**
1. Send to signer, CFO approver, viewer and CC with reminders and a deposit link; withdraw with “Sent to the wrong client”: all four links and client APIs refuse content.
2. No scheduled email or text reminder runs after withdrawal, and every unpaid payment link is refused.
3. Open questions and sales/correction follow-ups close; expiry warnings stop.
4. A sender outside proposal scope cannot withdraw it.
5. An accepted agreement cannot be withdrawn.

#### SEND-015 — Withdrawal receipt and approved reissue

*Tier:* Core · *From:* SEND-010 · *Cites:* BASE-AUDIT-001 · *Rules:* D-1

**Requirement.** Withdrawal retains who acted, when and why in timeline and audit. Each recipient is notified unless the sender turns notice off. Partial signatures stay in history marked void. Reissue creates an approved new revision, never reactivates old authority.

**Acceptance.**
1. The mail fake holds one withdrawal notice per recipient; with notice off it holds none.
2. After the first of two signatures, withdrawal refuses the second signer and retains the first as void.
3. Timeline and audit retain actor, time and reason; reports include withdrawn counts and totals.
4. Prepare revision 2, approve and send: new links work while revision 1 remains refused.
5. Desktop/phone journeys exercise sender, withdrawn-client, audit, report and reissue screens; archive preserves read-only history without invitation authority.

### Engagement tracking

#### TRACK-001 — View tracking and live open alerts

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-MAIL-001

**Requirement.** Platter records each verified or unverified view of a client link with time, recipient, approximate location and device class, and alerts the sender on first open and on a return visit after a quiet period the owner sets (30 minutes by default). The proposal shows a view timeline. Under RL-22, tracking and alerts stay off until the owner explicitly opts in. Only the owner reads recipient, verification, device and coarse location detail; current senders receive generic live in-app notices after a fresh access check. Locations come only from trusted edge city, region and country, never request addresses. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-001).

**Acceptance.**
1. Open the proposal as two recipients on desktop and phone; the sender gets an alert and the timeline lists both views with device class and approximate location (city, region and country from the request address through an IP-location fixture: Austin, Texas, United States for the first and Portland, Oregon, United States for the second).
2. With a 30-minute quiet period, the first recipient's return visit 10 minutes later raises no alert and a visit 45 minutes after that raises one return-visit alert.

#### TRACK-002 — Section-level reading analytics

*Tier:* Core

**Requirement.** For each view, Platter measures time spent on each section and on pricing, which packages and items were toggled, and which attachments were opened, and summarizes engagement per recipient. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-002).

**Acceptance.**
1. Run a scripted client session spending 40 seconds on pricing and 5 on the case study; the analytics show those times within 2 seconds and the toggled options.

#### TRACK-003 — Forwarded stakeholder identification

*Tier:* Core

**Requirement.** When a link is opened by someone other than its recipient (a new device and network after a forward), Platter asks the viewer to identify themselves and verify their mailbox. The sender sees a new stakeholder with name and email, and can add them as a recipient. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-003).

**Acceptance.**
1. Forward a link to a second mailbox, open it there, identify and verify, and see a new stakeholder on the proposal that the sender converts into an approver.

#### TRACK-004 — Tracking disclosure and privacy limits

*Tier:* Core · *Cites:* BASE-PUBLIC-001, BASE-DATA-003

**Requirement.** The client page discloses that views are measured.  Engagement data is included in erasure (`PRIV-001`) and in exports. Stored locations are truncated; engagement retention is owner-selected and engagement joins erasure and exports. RL-22 requires owner opt-in under TRACK-001, a 90-day retention default selectable from 1 through 365 days, and holds honored by retention and explicit per-proposal erasure. Measurement pages suppress external embeds. Exports retain business history but exclude tracking authority; restores require fresh consent. Erasure invalidates older archive checkpoints. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-004).

**Acceptance.**
1. Open the client page and see the disclosure; inspect network requests for third-party hosts (none); read a stored view and find no full IP address; set 90-day retention and see older views removed.

### Follow-up and negotiation

#### FOLLOW-001 — Scheduled reminders to unsigned recipients

*Tier:* Core

**Requirement.** The sender chooses scheduled reminders after sending or before expiry and a cap. Settings inherit FOLLOW-006 snapshots. RL-101 requires explicit auditable current-Send authorization per proposal and an explicitly supplied recipient IANA zone; edits, revisions or sender demotion invalidate it. Opt-out and terminal stops persist independently. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-001).

**Acceptance.**
1. For Pacific recipients, days 2,5,9 with cap two produce exactly two reminders outside owner-chosen quiet hours; one due at 6 am waits until 8 am.
2. Acceptance, decline, expiry, withdrawal and opt-out stop dispatch; no upgrade/copy/restore activates authority.
3. Messages use SEND-006 text and each attempt appears on the timeline.
4. The same authority and time-zone rules cover multiple unsigned recipients and every creation door.

#### FOLLOW-008 — Manual unsigned-recipient reminders

*Tier:* Core · *From:* FOLLOW-001

**Requirement.** A current sender can manually remind any unsigned recipient whether scheduled reminders are enabled or not. Manual reminders do not consume the scheduled cap; the per-recipient calendar-day limit follows their explicitly supplied zone.

**Acceptance.**
1. With schedules off and two unsigned recipients, an edited manual reminder to the first reaches mail and timeline exactly once.
2. A second to that recipient that day is refused; one to the other recipient and another to the first next day succeed.
3. Email dispatches immediately; text waits for the recipient’s quiet hours under SEND-008.

#### FOLLOW-002 — Next-action follow-up queue by sales owner

*Tier:* Core

**Requirement.** Each sales owner’s queue and the manager’s team view order overdue dates first, then today, then upcoming. Within a date the reason order is bounce, unanswered question, failed/overdue payment, expiry within three days, viewed unsigned, then unopened. Ties use highest one-off plus first-year recurring value, earliest send and proposal number. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-002).

**Acceptance.**
1. At 10 March, seed A $8,000 viewed due 9 March; B $40,000 unopened, C $5,000 bounced, D $12,000 question, E $20,000 viewed and F $30,000 viewed due today; G $9,000 unopened due 12 March: the exact order is A,C,D,F,E,B,G.
2. Personal IANA zones determine overdue/today boundaries.
3. With engagement unavailable, disclose it and retain the interim exact order A,C,D,B,F,E,G without inferring views.
4. Equal-date/reason ties and currency-separated totals follow [queue behavior](docs/contract-behavior.md#follow-002).

#### FOLLOW-009 — Follow-up lifecycle and action history

*Tier:* Core · *From:* FOLLOW-002

**Requirement.** Each open proposal has a stable sales owner, next action and due date. Completion records an action; dismissal records a reason. A notice alone never resolves work.

**Acceptance.**
1. Complete C with a logged call: it leaves the queue while its separate bounce correction remains open.
2. Notify B: its follow-up remains open; dismiss E without a reason: the dismissal is refused.
3. Creation and revision start the required action; explicit scheduling can reopen it.
4. Acceptance, decline and withdrawal close the action; unanswered question threads remain until answered.
5. History retains actor, time, action and reason through archive; notification transport and invitations do not return.

#### FOLLOW-010 — Follow-up reporting and team visibility

*Tier:* Core · *From:* FOLLOW-002 · *Cites:* BASE-ROLE-001

**Requirement.** Follow-ups extend the pipeline with due-date filters and sorts, exact visible counts and totals. Legacy sales ownership stays “Not recorded” where absent.

**Acceptance.**
1. Extend the thirty-proposal pipeline fixture: due-today and overdue filters, next action, sorting, counts and totals match the visible fixture.
2. Owner filters and team/own scopes match the current sales owner and manager team.
3. Desktop and phone screens show the same queue and totals.

#### FOLLOW-003 — Expiry and renewal notifications

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-MAIL-001

**Requirement.** The sender (the proposal's sales owner, and its watchers under `SEND-005`) is told before a sent, unaccepted proposal expires and before an accepted agreement's term ends or renews. These are notices to the firm, separate from `SEND-013`'s expiry warning to unsigned signers, and each has its own setting: the sender's expiry notice is on by default 3 days before expiry, the renewal notice is on by default 30 days before the term ends, and the signer warning is on by default 1 day before expiry (`FOLLOW-006`). The owner or an admin changes each lead time or turns either notice off for the workspace (`TEAM-001`), and the sender changes them per proposal like the other delivery settings of `FOLLOW-006`. Each notice goes by the sender's channels under `SEND-005` and opens a follow-up (`FOLLOW-002`) due on the notice day; a renewal notice offers `RENEW-002`. A proposal accepted, declined or withdrawn before the notice day gets no expiry notice, and a changed expiry date moves the notice with it. RL-102 keeps interim activation limited to the current recorded active sales owner with live proposal and channel authority. Terminal decisions suppress expiry notices, date changes move them, upgrades/restores grant no authority, and manual follow-ups are preserved. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-003).

**Acceptance.**
1. With the workspace defaults (sender expiry notice 3 days before, renewal notice 30 days before, signer warning 1 day before), send a proposal on 1 March with a 14-day expiry, so it expires on 15 March: the sender's expiry notice and a follow-up due 12 March arrive on 12 March and not before, and each unsigned signer's warning reaches the mail fake on 14 March.
2. Extend that proposal to 22 March before 12 March: the sender's notice moves to 19 March.
3. Accept a second proposal on 1 March 2026 with a 12-month term ending 28 February 2027: the renewal notice and a follow-up offering `RENEW-002` arrive on 29 January 2027.
4. Turn the sender's expiry notice off for the workspace and send a third proposal on 1 March with a 14-day expiry: no sender notice arrives on 12 March, while the signer warning still reaches the mail fake on 14 March.
5. A fourth proposal accepted on 10 March with expiry on 15 March gets no expiry notice.
6. A sales member's change to the workspace lead times is refused (403).

#### FOLLOW-004 — Client questions and comments

*Tier:* Core · *Cites:* BASE-AGENT-007, BASE-MAIL-001

**Requirement.** A client asks a question or comments on any section from the proposal page. The firm answers in the same thread, by email reply or from the app; the client is notified. Open questions show on the proposal and in the queue until answered, and the thread is kept with the agreement. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-004).

**Acceptance.**
1. As the verified client comment on pricing; the owner answers from the app; the client receives the exact answer; the question leaves the queue; the accepted agreement lists the thread.
2. Repeat scope and terms, refusing unverified, stale-revision and invalid-section writes.
3. Assert the member queue’s scoped refusal. Under the held company policy, an agent answer carrying external waits for the named person; under all-autonomous company policy a permitted answer runs.
4. Through signed Resend HTTP intake and a real adapter at its network edge, assert exact thread/owner resolution, client notification, invalid signature, wrong sender, expiry, rotation, owner change and replay refusal with no second answer or notification.
5. Exercise owner/client/queue/agreement at 1440 and 390.
6. Export and restore answered and open threads through the public CLI, excluding genuine issued reply capabilities.

#### FOLLOW-005 — Decline reasons and won or lost outcomes

*Tier:* Core

**Requirement.** A client can decline with a reason. The firm marks a proposal won or lost with a reason from its own list, and can reopen a lost one as a new revision. A decline stops signing and payment on every recipient link, and marking a proposal lost withdraws it as `SEND-010` does, with the notice off by default. Outcomes sync to the CRM (`CRM-001` to `CRM-003`) and feed reporting (`REPORT-002`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-005).

**Acceptance.**
1. Decline as the client with the reason Budget, see the proposal lost and the HubSpot deal fake moved to Closed lost; mark another sent proposal lost and see each of its recipient links show the withdrawn page; reopen the declined one as a new revision and send.

#### FOLLOW-006 — Default reminder schedule and expiry from the workspace and templates

*Tier:* Core

**Requirement.** Owner/admin workspace defaults and per-template overrides set reminder days/cap, expiry period and signer-warning lead time. New proposals copy a settings snapshot; later workspace or template edits do not alter it. FOLLOW-001 owns execution authority under RL-101 and FOLLOW-003 owns internal notice authority under RL-102. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-006).

**Acceptance.**
1. Set workspace reminders to days 3 and 7 with thirty-day expiry; a template overrides to days 2,5,9 and fourteen-day expiry.
2. Send both on 1 March: the template reminders are 3,6,10 March with 15 March expiry; blank-proposal reminders are 4,8 March with 31 March expiry; preview and dispatch match.
3. Change template reminders to day 4 and workspace expiry to forty-five days: existing snapshots remain unchanged while new proposals use the new values.
4. Workspace changes by sales or managers and shared-template expiry changes by sales are refused; admin workspace changes persist.

#### FOLLOW-011 — Delivery snapshots across proposal creation

*Tier:* Core · *From:* FOLLOW-006 · *Cites:* BASE-ROLE-001

**Requirement.** Blank/template, bulk, public-link and drafted proposals inherit settings; copies inherit the source snapshot. Fresh installations and upgrades store the specified default settings without granting execution authority. [Delivery settings](docs/contract-behavior.md#follow-006) records their values.

**Acceptance.**
1. Copies, bulk creation, public submission and AI drafting from the template retain days 2,5,9 and fourteen-day expiry; public-link expiry starts at submission.
2. An authorized sender can change a sent proposal’s settings without revising offer terms or requiring another offer approval.
3. Turning scheduled reminders off still allows the once-per-recipient-per-day manual reminder.
4. Each change retains its actor on the timeline; edits, revisions and sender demotion invalidate earlier execution authorization.
5. Upgrade, copy and restore carry settings but start inactive; recipient opt-out and terminal stops remain across revisions.
6. Execution activation uses current proposal Send authority and an explicitly supplied recipient zone, never an inferred one.

#### FOLLOW-007 — Unattended CRM synchronization with a scoped grant

*Tier:* Core · *Cites:* BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007

**Requirement.** Unattended outcome synchronization uses a revocable scoped CRM grant, separate from FOLLOW-005’s explicit consent to one exact revision, destination and stage field map. An agent synchronization call carries external and follows company policy. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#follow-007).

**Acceptance.**
1. Unattended outcome synchronization uses a revocable scoped grant separate from FOLLOW-005’s consent to one exact revision, destination and stage field map.

#### NEG-001 — Negotiated revisions after sending

*Tier:* Core · *Rules:* D-1

**Requirement.** After sending, the firm can make a new revision in answer to the client. The revision follows the approval rules and policy again (`APPROVE-001`, `APPROVE-003`); sending it retires the earlier client link, and the client sees what changed since the version they saw. Acceptance always binds the exact current sent revision, and every earlier version stays in history. An unsent negotiation is stored separately from the live offer: the old invitation remains usable until the approved replacement is sent. If the client accepts the live offer first, that agreement wins and the unsent negotiation cannot be sent; its saved revisions remain in history. Editing the negotiated draft creates another revision and clears its approval. The current default approval policy remains owner approval for every negotiated revision; `APPROVE-001` and `APPROVE-003` inherit this path when their rule and role capabilities ship. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#neg-001).

**Acceptance.**
1. Send revision 1, revise the price, approve and send revision 2; the revision 1 link is refused; the client page shows the price change; acceptance records revision 2.

#### NEG-002 — Client-suggested text edits

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** Where the firm allows it, a client suggests edits to text sections (not prices) as tracked suggestions. The firm accepts or rejects each one; accepted suggestions form a new revision under `NEG-001`. Contract lifecycle redlining of master agreements belongs to Locket (see Neighboring products). Scope and terms are the text sections currently supported; a person enables each section separately on the exact sent revision, off by default. The invited client verifies their mailbox before submitting an original-text/replacement pair; the original must occur exactly once. Decisions retain the source revision, client, time, original and replacement, reviewer, decision and resulting revision. Owner/member people review; agent enablement carries standard and a binding decision carries commitment, each following company policy. Accepting an edit creates an unapproved negotiated revision without changing the live offer, and later accepted edits clear approval again. TEAM-001 inherits scoped person authority; EDIT-001 and EDIT-002 inherit this opt-in tracked-suggestion behavior for their new text sections before shipping. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#neg-002).

**Acceptance.**
1. Allow suggestions on the terms section, suggest two edits as the client, accept one and reject one, and see revision 2 contain only the accepted edit.

### E-signature

#### SIGN-003 — ESIGN and UETA electronic signature

*Tier:* Core · *Rules:* D-1

**Requirement.** Signing meets the federal ESIGN Act and state UETA: each signer is shown the electronic records disclosure and consents before signing, can withdraw consent and ask for paper, and adopts a typed, drawn or uploaded signature. Signature, initials and date fields can be placed anywhere, each assigned to one signer or, in a template, one recipient role (`SIGN-011`), and a signer sees and fills only their own fields. Intent to sign is explicit, and the signed record is retained and reproducible. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-003).

**Acceptance.**
1. Sign as a client who reads the disclosure and consents, draws a signature and initials three fields; a second client withdraws consent and the firm is told; a third client uploads a PNG of their signature and adopts it; the signed record reproduces the same document and each adopted signature.

#### SIGN-004 — Multiple signers, signing order and countersignature

*Tier:* Core · *Rules:* D-1

**Requirement.** A proposal can require several signers on the client side and a countersignature from the firm, in a set order or in parallel groups. A template sets the order and groups for its roles, and they are copied into each proposal created from it (`SIGN-011`); changing the template later never changes a proposal's order. Each signer verifies separately; the agreement completes when the last required signature lands, and each party is told. A signer can be replaced by the sender (`SEND-007`) or, where allowed, delegate (`SIGN-009`) without changing the order. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-004).

**Acceptance.**
1. Require client CEO then CFO, then the firm's owner; the CFO cannot sign before the CEO; after all three the agreement is complete and each party gets the completion email.
2. On another proposal, put two client signers in one parallel group followed by the firm's countersignature: the two sign in either order, the firm cannot countersign before both have signed, and the agreement completes after the countersignature.

#### SIGN-005 — Signed agreement PDF and certificate of completion

*Tier:* Core · *Rules:* D-1

**Requirement.** On completion, Platter produces the signed agreement PDF and a certificate of completion listing each signer, verification method, consent, IP-derived location, user agent, timestamps and the SHA-256 hash of the document. Both parties can download them, they are emailed to each party, and the PDF is archived (`AUTO-002`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-005).

**Acceptance.**
1. Complete a two-signer agreement, download the PDF and certificate as each party, recompute the SHA-256 and see it match the certificate, and find both attached to the completion email.

#### SIGN-006 — Signer identity options

*Tier:* Core · *Rules:* D-1 · *Register:* R-3

**Requirement.** Per proposal, the firm chooses the identity check for each signer: mailbox code (`SIGN-001`, the default), link only, a text-message code to a US mobile number through Twilio, or government ID verification through Stripe Identity or Persona. Link only matches the incumbents' default for low-risk documents: possession of the personal link delivered to that recipient's mailbox is the check, it must be chosen explicitly per proposal or template, and a link opened on a new device and network after a forward (`TRACK-003`) still asks for the mailbox code before it can sign. The method used is recorded in the certificate. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-006).

**Acceptance.**
1. Require SMS for one signer and ID verification for another with Twilio and Stripe Identity fakes; wrong SMS codes are limited as in `SIGN-001`; the certificate names each method.
2. On another proposal choose link only: the recipient signs from their link without a code and the certificate reads "email link only"; the same link opened from a second device and network after a forward asks for the mailbox code; a proposal with no choice made still requires the code.
3. Acceptance rider: Apply SEND-008’s consent, zone, suppression, restore and uncertainty assertions to identity-code requests.
4. Refuse stale invitations and invalidated SMS configurations without provider calls.
5. Exercise every SIGN-001 code limit, exact invitation and revision binding, quiet-hour deferral and current-authority checks.
6. STOP blocks code delivery; START does not reactivate it, and no refusal silently downgrades the selected identity method.
7. Record the actual completed method in the certificate without inferring missing historical evidence.

#### SIGN-007 — Fields collected at acceptance

*Tier:* Core · *Rules:* D-1

**Requirement.** The firm places fields the client fills at acceptance, each assigned to one recipient or template role (`SIGN-011`) so only that person fills it: PO number, billing contact, billing and service address, project start date, checkboxes, custom text and file uploads, such as a purchase order PDF or a certificate of insurance (PDF, PNG or JPEG up to 25 MB each). Required fields block signing; values freeze into the agreement and flow to invoices and the CRM, and uploaded files are kept byte-identical in the agreement package (`SIGN-005`) and listed on the certificate of completion. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-007).

**Acceptance.**
1. Require a PO number, a billing address and a PO PDF upload, try to sign without them (refused), fill them and upload the PDF, sign, and see the values in the agreement, the QuickBooks Online invoice fake and the HubSpot deal fake; the uploaded PDF in the agreement package has the same SHA-256 as the file uploaded, and the certificate lists it.
2. A 30 MB upload and an .exe upload are refused.

#### SIGN-008 — Acceptance on the client's own paper

*Tier:* Core · *Cites:* BASE-INPUT-003, BASE-AGENT-007 · *Rules:* D-1

**Requirement.** When a client signs through their own procurement or signing system, the owner uploads the signed copy, records who signed and when, and attests to it. The agreement is marked accepted by upload, distinct from Platter e-signature, and payments and handoff proceed as for any acceptance. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-008).

**Acceptance.**
1. Upload a client-signed PDF for a sent proposal, record signer and date, and see the agreement marked accepted by upload with the file, followed by the deposit request.

#### SIGN-009 — Recipient delegation of signing

*Tier:* Core · *Rules:* D-1

**Requirement.** Where the firm turns delegation on for a proposal or template, a signer who is not the right person delegates from their own link to a named person with email (and a mobile number when that signer's check is SMS). The delegate must pass the identity check set for that signer (`SIGN-006`) before seeing the agreement; the delegator's link is revoked; the sender is notified and can undo the delegation before the delegate signs. Delegation never changes the offer, revision, approvals or signing order, is refused once the delegator has signed or when delegation is off, and is recorded in the certificate of completion (`SIGN-005`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-009).

**Acceptance.**
1. With delegation off, try to delegate from the CEO's link (refused); turn it on and delegate to the COO: the CEO's link is refused and the sender is notified; the COO verifies and signs, and the certificate shows the CEO delegated to the COO with the time; on another proposal sign as the CEO and then try to delegate (409).

#### SIGN-010 — In-person signing on the firm's device

*Tier:* Core · *Rules:* D-1

**Requirement.** A sender hosts a signing session on their own signed-in phone, tablet or computer for clients who are present, as incumbents offer for walk-in clients. The sender starts the session from the proposal and hands the device over; each signer in signing order (`SIGN-004`) confirms their name, reads the electronic records disclosure and consents (`SIGN-003`), fills the fields assigned to them (`SIGN-007`) and signs. Between signers the device returns to a hand-back screen, and the sender's own pages stay locked until the sender signs in again. The firm can require a code sent to each signer's mobile or mailbox in the session (`SIGN-006`). The certificate of completion (`SIGN-005`) records each signature as "in person, hosted by" the sender, with time and device, and each signer gets the completed copy by email. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-010).

**Acceptance.**
1. As a sales member at 390 pixels, host an in-person session for two client signers in order: each reads the disclosure, consents and signs; the screen returns to the hand-back screen between them and the sender's queue cannot be opened without signing in again; the certificate names the in-person method and the host; both signers receive the completed copy in the mail fake; the remote link for the same signer then shows the proposal as already signed.
2. With the SMS option on, a wrong code in the session is limited as in `SIGN-001`.

#### SIGN-011 — Template recipient roles, field assignment and signing order

*Tier:* Core · *Rules:* D-1

**Requirement.** Templates define named signer, client approver, viewer, CC and firm-countersigner roles, each with assigned fields, order/parallel group and identity check. Every signature, initials, date and required form field has exactly one role; missing assignment prevents publication. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sign-011).

**Acceptance.**
1. Create Client signer, Client CFO approver and owner-preassigned countersigner, with signature/date/PO fields. An unassigned extra signature prevents publication.
2. Start a proposal: exactly three slots exist and the owner’s slot is filled.
3. The HubSpot contact labelled Client CFO is offered first for that slot; an unfilled required role prevents sending and names the role.
4. Filled recipient fields and signing order match their template role; the CFO cannot act before the signer and the owner cannot countersign before the CFO.
5. A completed countersignature completes the agreement.

#### SIGN-012 — Recipient-role snapshots across creation

*Tier:* Core · *From:* SIGN-011 · *Rules:* D-1

**Requirement.** Every template start, duplicate, bulk proposal, public submission and AI draft copies its role/field/order snapshot. A person can edit its roles and order before sending without changing the template or earlier proposals.

**Acceptance.**
1. Change the template to CFO-first: the existing proposal keeps signer/CFO/countersigner and the next start uses CFO-first.
2. Duplicate the sent proposal: all three slots remain with only the template-preassigned owner filled.
3. Each other creation door keeps the same role-slot assignment behavior.
4. A PandaDoc API template with Client/Sender roles imports the same fields, order and preassigned recipients.

### Payments

#### PAY-001 — Stripe card and ACH collection in the proposal

*Tier:* Core · *Rules:* D-1

**Requirement.** The owner or an admin (`TEAM-001`) connects the firm's own Stripe account. The client pays inside the proposal by card, Apple Pay, Google Pay or ACH bank debit, with bank verification through Stripe Financial Connections or micro-deposits. The ACH debit authorization text is shown and stored with the agreement. Card and bank numbers never touch Platter. The methods a proposal offers are copied when it is created from its template (`EDIT-002`), or from the workspace's default methods when the template sets none, and the sender changes them per proposal before sending; the owner or an admin sets the workspace defaults and whether to pass through a fee where allowed. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-001).

**Acceptance.**
1. In Stripe test mode, connect an account, accept and pay a deposit by test card, by Apple Pay and Google Pay test wallets, and by test ACH; see the authorization text retained; inspect the database and logs for card or bank numbers (none).
2. Turn on a 3% card fee after confirming it is allowed: the card total shows the fee as its own line, ACH shows none, and a client whose billing state the firm marked as not allowing surcharges sees no fee.
3. With workspace default methods of card, wallets and ACH, a template offering card and ACH only starts a proposal whose client page offers card and ACH and no wallets, and a blank proposal offers all three; turning ACH off on that one proposal leaves the template unchanged.

#### PAY-002 — Deposit or partial payment at acceptance

*Tier:* Core · *Rules:* D-1

**Requirement.** Accept and pay is one flow: after signing, the client pays the deposit or first payment in the same session. The firm chooses whether acceptance completes only once the payment succeeds or whether signing completes the agreement with the payment due. Agreement and payment states stay separate, so a failed payment never undoes a signature. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-002).

**Acceptance.**
1. With payment required, sign and decline the test card: the agreement waits for payment; pay and see it complete.
2. With payment due, sign, fail the payment and see the agreement accepted with the deposit due.

#### PAY-003 — Milestone and recurring payment schedules

*Tier:* Core · *Rules:* D-1

**Requirement.** The accepted schedule (`PRICE-007`) is executed: milestones are charged or invoiced on their date or when the owner marks the event done, each amount's invoice being created on that issue day and never earlier (`ACCT-007`), and recurring fees are charged on their interval against the payment method the client authorized, or sent as net-terms invoices with a pay link and overdue tracking (`PAY-008`). The client can update the payment method from a link. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-003).

**Acceptance.**
1. Accept a deposit, a charged milestone, a net-30 milestone and a monthly retainer; mark milestone one done and see it charged; mark the net-30 milestone done and see an invoice issued, not a charge, followed by the `PAY-008` journey; advance the clock a month and see the retainer charged; update the payment method from the client link.

#### PAY-004 — Paid, pending, failed, refunded and disputed states

*Tier:* Core · *Rules:* D-1

**Requirement.** Each payment shows scheduled, processing, succeeded, failed, refunded, partially refunded or disputed from signed Stripe webhooks, processed once per event ID. ACH payments stay processing until Stripe reports success, typically up to four business days. A payment is paid only on provider evidence, and the owner sees amounts due, paid and overdue per agreement. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-004).

**Acceptance.**
1. Replay Stripe test events out of order and twice: the state ends correct with one record per event; an ACH payment stays processing until the success event; the agreement shows due, paid and overdue totals.

#### PAY-005 — Failed-payment retries and notices

*Tier:* Core · *Rules:* D-1

**Requirement.** When a payment fails, the client and firm are told with the reason; Platter retries on an owner-set schedule only where the client's authorization allows it, and stops a retry once the amount is paid by any route. Each attempt is on the timeline. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-005).

**Acceptance.**
1. Fail a milestone charge; both parties are notified; a retry runs after the set delay; pay by check (`PAY-007`) before the next retry and see it canceled.

#### PAY-006 — Refunds and disputes

*Tier:* Core · *Cites:* BASE-AGENT-006, BASE-AGENT-007, BASE-OPS-003 · *Rules:* D-1

**Requirement.** The owner, an admin or a billing user (`TEAM-001`) refunds a payment in full or in part with a reason, and the refund syncs to accounting. Agent refunds carry money and dispute submissions carry external and commitment; company policy decides within the sponsor’s financial role and grant. When a client disputes a card payment, Platter shows the dispute, its deadline and an evidence pack (signed agreement, certificate, views and payment authorization) that the owner, an admin or a billing user submits to Stripe. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-006).

**Acceptance.**
1. As a billing user refund half of a deposit and see the credit in the QuickBooks Online fake; a sales member's refund is refused (403); open a test dispute and submit the evidence pack to the Stripe fake before its deadline.
2. A billing user previews the exact packet with their note and its SHA-256, authorizes that hash, and the Stripe fake receives exactly those bytes once with an explicit submit; a submission naming another hash, after the deadline, after the disputed amount changed, or without authorization is refused with no provider call, and manager, sales, content editor and viewer attempts are refused without a provider call; under the held company policy an agent submission carrying external and commitment waits for its named approver.
3. A dispute on an agreement accepted by attested upload yields a packet that states the attested upload and makes no mailbox-verification claim.
4. Every packet names the target evidence it does not include.
5. A provider timeout leaves the submission held for reconciliation; repeating the request makes no provider call; Submitted appears only after Stripe reports the dispute under review.

#### PAY-007 — Check, wire and ACH credit payments

*Tier:* Core · *Rules:* D-1

**Requirement.** US clients often pay by check, wire or ACH credit. Invoices show remittance details, and the owner, an admin or a billing user (`TEAM-001`) records an offline payment with method, reference and date. It reconciles against the schedule and accounting like any other payment. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-007).

**Acceptance.**
1. As a billing user record a check with its number against a milestone and see it paid, synced to QuickBooks Online, and removed from the overdue list.

#### PAY-008 — Net-terms invoices with a pay link and overdue tracking

*Tier:* Core · *Rules:* D-1

**Requirement.** When a scheduled amount is on net terms (net 15, net 30 or a custom number of days), Platter issues an invoice when its date arrives or its milestone is marked done, with its due date counted from that issue day and never created earlier (`ACCT-007`): an email to the billing contact (`SIGN-007`) with the invoice number, amount, due date, a PDF invoice and a pay link, using the invoice template of `SEND-006`. The pay link opens a page where the client pays by card or ACH (`PAY-001`, `PAY-009`) or reads remittance details for check and wire (`PAY-007`). An unpaid invoice is due through its due date and turns overdue the next day in the firm's time zone: it counts in the agreement's overdue total (`PAY-004`), opens a follow-up in the owner's queue (`FOLLOW-002`) and sends overdue reminders on the owner's schedule. A payment from the link is processing until the provider reports success and paid only on that evidence. When the accounting system is the invoice authority (`ACCT-004`), the invoice sent is the one in QuickBooks Online, Xero or Pantry, never a second one. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-008).

**Acceptance.**
1. Accept a proposal with a $6,000.00 milestone on net 30 and mark it done on 1 March: the mail fake holds one invoice email with amount $6,000.00, due date 31 March, a PDF and a pay link.
2. On 31 March it is due, not overdue.
3. Advance to 1 April: it is overdue in the agreement's `PAY-004` totals and in the owner's `FOLLOW-002` queue, and an overdue reminder is sent.
4. Pay by Stripe test ACH from the link: it shows processing, then paid after the success event, the follow-up closes, and exactly one invoice exists locally and in the QuickBooks Online fake.

#### PAY-009 — PayPal, Square and Authorize.net collection

*Tier:* Core · *Rules:* D-1

**Requirement.** A firm that does not take payment through Stripe connects its own PayPal, Square or Authorize.net account instead, and the client pays the deposit, milestones and net-terms invoices inside the proposal by card, or by PayPal or Venmo where PayPal is connected. Payment states, retries, refunds and accounting sync work as for Stripe (`PAY-002` to `PAY-008`, `ACCT-001` to `ACCT-006`), with each processor's signed webhooks or notifications processed once per event. Where a processor cannot charge a stored method for a schedule, Platter sends a pay link for each scheduled amount and says so when the firm connects it. Card numbers never touch Platter. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-009).

**Acceptance.**
1. With PayPal, Square and Authorize.net sandbox fakes: connect each in turn, accept and pay a deposit, refund half of it, replay each webhook twice, and see the same payment states and QuickBooks Online fake records as the Stripe journey with one record per event; inspect the database and logs for card numbers (none).

### Accounting sync

#### ACCT-001 — QuickBooks Online invoices and payments

*Tier:* Core · *Register:* R-2

**Requirement.** The owner or an admin connects QuickBooks Online. On acceptance, Platter creates or matches the customer and creates the deposit invoice; each milestone and recurring invoice is created on its issue day under `ACCT-007`, never at acceptance. Every invoice carries items, tax codes and the income accounts set in the catalog, and Platter records Stripe and offline payments, refunds and fees against them, with Stripe payouts and fees posted through a clearing account (`ACCT-006`). Invoices paid in QuickBooks Online, including through QuickBooks Payments, are read back as paid. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-001).

**Acceptance.**
1. With a QuickBooks Online sandbox fake: accept a proposal with a deposit and a net-30 milestone and see one customer and only the deposit invoice, with the right tax code; pay the deposit by Stripe and see the payment applied in full with its fee posted as in `ACCT-006`; mark the milestone done and see its invoice appear dated that day; pay that invoice in QuickBooks and see it paid in Platter.

#### ACCT-002 — Xero invoices and payments

*Tier:* Core · *Register:* R-2

**Requirement.** The owner or an admin connects a USD Xero organization. Platter creates or matches the contact, raises the deposit invoice at acceptance and each milestone and recurring invoice on its issue day (`ACCT-007`), with items, tax rates and accounts, and records payments and refunds, with paid status read back from Xero. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-002).

**Acceptance.**
1. With a Xero API fake: accept a proposal with a deposit and a net-30 milestone, and see the contact and only the deposit invoice; pay by Stripe and see the payment applied; mark the milestone done and see its invoice appear dated that day; pay it in Xero and see it paid in Platter.

#### ACCT-003 — Pantry invoices and payments

*Tier:* Core

**Requirement.** For firms on [Pantry](https://github.com/just-every/run-pantry), Platter posts customers, invoices and payments the same way as `ACCT-001`, each invoice on its `ACCT-007` issue day, and reads back paid status. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-003).

**Acceptance.**
1. Run the `ACCT-001` journey against a Pantry instance and see the same customer, invoices and payments, with only the deposit invoice present until the milestone is marked done.

#### ACCT-004 — One invoice authority and reconciliation

*Tier:* Core

**Requirement.** The owner chooses one invoice authority per installation: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry. Each scheduled amount maps to exactly one invoice and one external ID, created on its issue day under `ACCT-007`, so retries, reconnects and replays never create a second and none is created early. A reconciliation view lists each scheduled amount with its invoice, payments, provider events and accounting status, and flags mismatches. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-004).

**Acceptance.**
1. Accept, disconnect and reconnect QuickBooks, replay the sync twice and see one invoice per amount; edit the amount in the fake and see a mismatch flagged in reconciliation.

#### ACCT-005 — Invoice and payment export files

*Tier:* Core

**Requirement.** Without a live connection, the owner exports invoices, payments and schedules as QuickBooks Online and Xero import files in USD, retained once per invoice as in `INV-001`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-005).

**Acceptance.**
1. Export the deposit and two milestones in QuickBooks and Xero formats and import them into each sandbox without errors; exporting again returns the same retained files.

#### ACCT-006 — Stripe payouts, fees and clearing in accounting

*Tier:* Core

**Requirement.** Stripe pays out net of fees, so a firm's bank deposit never equals its invoices. Platter posts each Stripe payment gross against its invoice into a clearing account the owner picks (such as "Stripe clearing" in QuickBooks Online or Xero), posts Stripe's processing fees to the owner's fee expense account, and records each payout as one transfer from clearing to the bank account for the payout's net amount, so the bank feed matches one deposit per payout and the clearing account returns to zero. Refunds, dispute amounts and dispute fees post through the same clearing account. The same posting applies to the processors of `PAY-009`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-006).

**Acceptance.**
1. In a QuickBooks Online fake and a Xero fake: take card payments of $1,000.00 and $500.00 with fees of $29.30 and $14.80 and one payout of $1,455.90; see both invoices paid in full, $44.10 in the fee expense account, one $1,455.90 transfer to the bank account and the clearing account at $0.00; refund $100.00 and see clearing and the bank match the next payout.

#### ACCT-007 — Invoices created on their issue day, never ahead

*Tier:* Core

**Requirement.** One timing rule holds for every invoice authority (`ACCT-004`: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry). The deposit invoice is created at acceptance. A milestone invoice is created on its issue day: its date for a dated milestone, or the day it is marked done for an event milestone. Each recurring amount's invoice is created on its billing date, one per period. A net-terms invoice's due date is counted from its issue day (`PAY-008`), and a charged amount's invoice is created when the charge is made and marked paid only on the provider's success evidence (`PAY-003`). No invoice is created ahead of its issue day, so the accounting system's open invoices and A/R aging hold only amounts already issued, and a milestone that slips moves its issue day with nothing to void. Future amounts show in the agreement's schedule (`PAY-004`) as scheduled, not invoiced. The invoice emailed to the client under `PAY-008` is the authority's own invoice, never a second one. `ACCT-001`, `ACCT-002`, `ACCT-003` and `PAY-003` follow this rule. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#acct-007).

**Acceptance.**
1. With QuickBooks Online as the invoice authority, accept a proposal with a $2,000.00 deposit, a $6,000.00 net-30 event milestone and a $1,500.00 monthly retainer starting 1 April: the QuickBooks Online fake holds only the deposit invoice.
2. Mark the milestone done on 1 March: the fake now holds one milestone invoice dated 1 March and due 31 March, and that invoice is the one emailed under `PAY-008`.
3. On 1 April exactly one retainer invoice appears, and on 1 May a second.
4. Run the same journey with Xero, Pantry and Platter's own Stripe invoices as the authority and see the same invoices on the same days.

### CRM sync

#### CRM-001 — HubSpot two-way deal sync

*Tier:* Core · *Register:* R-2

**Requirement.** The owner or an admin connects HubSpot. A member starts a proposal from a deal (or from a HubSpot CRM card), with company, contacts, deal fields and line items pulled in. Platter writes back status, amount, line items, the proposal link and timeline events (sent, viewed, signed, paid), and moves the deal stage according to rules the admin sets. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#crm-001).

**Acceptance.**
1. With a HubSpot API fake: create a proposal from a deal with two line items, send, view and sign; see the deal's line items, amount, stage Closed won and four timeline events.
2. Open the Platter CRM card on another deal in the fake, start a proposal from it, and see the proposal linked to that deal with its company, contacts and line items filled, and the card listing the proposal with its status.

#### CRM-002 — Salesforce two-way opportunity sync

*Tier:* Core · *Register:* R-2

**Requirement.** The owner or an admin connects Salesforce. Proposals start from an opportunity with account, contacts and price-book products, and Platter writes back opportunity line items, amount, stage, the proposal link and activity, under the same rules as `CRM-001`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#crm-002).

**Acceptance.**
1. With a Salesforce API fake: create from an opportunity with price-book products, accept, and see opportunity products, amount and stage updated and the activity logged.

#### CRM-003 — Orbit two-way deal sync

*Tier:* Core

**Requirement.** For firms on [Orbit](https://github.com/just-every/run-orbit), Platter syncs deals, contacts and line items both ways as in `CRM-001`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#crm-003).

**Acceptance.**
1. Run the `CRM-001` journey against an Orbit instance.

#### CRM-004 — Pipedrive and Zoho CRM sync

*Tier:* Core

**Requirement.** Platter syncs deals, persons and products with Pipedrive and Zoho CRM as in `CRM-001`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#crm-004).

**Acceptance.**
1. Run the `CRM-001` journey against Pipedrive and Zoho CRM fakes.

### Automation and integrations

#### AUTO-001 — Status-driven automations

*Tier:* Core

**Requirement.** Admins set rules on proposal events (sent, viewed, commented, signed, paid, declined, expired): update the CRM, archive documents, create invoices, notify a channel, create a delivery project or start a follow-up. Each run is logged with its outcome and can be retried by hand; a failed step is visible and never silently dropped. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-001).

**Acceptance.**
1. Set a rule on signed that archives the PDF, posts to Slack and creates an Asana project; sign; see three logged successes; break the Slack fake and see a failed step with a manual retry.

#### AUTO-002 — Completed documents archived to file storage

*Tier:* Core · *Register:* R-2

**Requirement.** Signed PDFs, certificates and attachments are filed to Google Drive, Microsoft OneDrive or SharePoint, Box or [Chest](https://github.com/just-every/run-chest) in a folder per client, named by a pattern the admin sets. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-002).

**Acceptance.**
1. Connect a Google Drive fake, complete an agreement and see the PDF and certificate in the client's folder with the configured name.

#### AUTO-003 — Team chat notifications

*Tier:* Core · *Register:* R-2

**Requirement.** Proposal events, approvals and follow-ups post to Slack, Microsoft Teams or [Nook](https://github.com/just-every/run-nook) channels and direct messages, with links back and approval actions where `APPROVE-002` allows. The ct-approved notification boundary requires owner/admin-verified destination consent, generic channel text with protected links, private detail only to eligible direct approvers, current session/revision/plan decisions, uncertain delivery held and restored routes inactive (RL-20). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-003).

**Acceptance.**
1. Route signed events to a Slack channel and approvals to a Teams direct message; sign and request approval; see both with working links.

#### AUTO-004 — Public REST API and webhooks

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-OPS-003

**Requirement.** A documented, scoped API creates proposals from templates, fills their variables, reads proposal status, analytics and payments, and lists agreements. Signed lifecycle webhooks retry failed delivery and expose a delivery log. The published API reference describes every public route’s scope and each webhook event’s payload schema and example. Archive custody, private cost exclusion and connection security follow PORT-002, PRICE-006 and SEC-001. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-004).

**Acceptance.**
1. Create a proposal from a template through the API with a scoped key, send it, receive signed webhooks for sent and signed, verify their signatures, and see a key without write scope refused.
2. Fetch the published OpenAPI description and reference page: the route table the server registers and the documented routes match both ways (no undocumented public route, no documented route the server lacks), each documented route names its scope, and every webhook event type Platter emits is documented with an example that validates against its schema.

#### AUTO-005 — Zapier, Make and Crank apps

*Tier:* Core

**Requirement.** Published Zapier and Make apps and a [Crank](https://github.com/just-every/run-crank) connector expose Platter's triggers (proposal sent, viewed, signed, paid) and actions (create proposal from template, add client). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-005).

**Acceptance.**
1. Run a Zap in Zapier's test environment that creates a proposal from a form submission and fires on signed; run a Make scenario in Make's test environment that fires on paid and adds a client; run the same trigger and action against a Crank instance; each trigger fires once per event.

#### HAND-001 — Accepted-scope handoff to delivery tools

*Tier:* Core

**Requirement.** On acceptance, Platter creates a project in Asana, Trello, monday.com, ClickUp, Jira or [Vector](https://github.com/just-every/run-vector) from the accepted scope: one task or section per accepted line item, with dates from the schedule and the agreement linked. The handoff records the external project ID and never runs twice. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#hand-001).

**Acceptance.**
1. Accept a proposal with four line items and an Asana fake connected; see one project with four tasks and the agreement link; replay the event and see no second project.

#### HAND-002 — Handoff to Gauge with budget and rates

*Tier:* Core

**Requirement.** For firms on [Gauge](https://github.com/just-every/run-gauge) or Harvest with Forecast, the accepted scope becomes a project with budget, roles, rates, milestones and billing schedule, so delivery tracks against what was sold. Gauge's actuals return to Platter for `AGENT-002` and `AGENT-006`. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#hand-002).

**Acceptance.**
1. Accept a proposal and see a Gauge project with budget hours, rates and milestones matching the agreement.

### Renewals and bulk sending

#### RENEW-001 — Bulk proposal creation and sending

*Tier:* Core

**Requirement.** A member creates proposals for a list of clients (a CSV, a CRM list or every client with an agreement ending this quarter) from one template, with per-client variables and prices and the template's role slots (`SIGN-012`) filled per client from CSV columns or CRM contacts; a client whose signer role stays unfilled is held as an exception like a missing variable. Each proposal takes the template's reminder schedule and expiry period, or the workspace defaults where the template sets none (`FOLLOW-006`). The owner reviews a sample and the list of exceptions, approves the batch, and Platter sends at a set pace with one result per client. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#renew-001).

**Acceptance.**
1. Create 40 proposals from a template with a Client signer role and a pre-assigned countersigner, using a CSV in which three rows miss a variable and two have no signer contact; the five are held as exceptions naming the variable or role; approve the batch and see 35 sent at the set pace, each with its own link and timeline, its signer filled from the CSV and the owner as countersigner.

#### RENEW-002 — Renewal proposals from accepted agreements

*Tier:* Core

**Requirement.** Before an agreement's term ends, Platter prepares a renewal from it with the same scope, an optional price increase the owner sets (percentage or amount), and the notice period stated in the agreement. It follows the `APPROVE-003` approval policy as any revision does. Evergreen agreements show their renewal and cancellation terms to the client before signing. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#renew-002).

**Acceptance.**
1. Accept a 12-month retainer; 45 days before term end a renewal draft with a 5% increase is waiting for approval; approve, send and accept it, and see a new schedule start when the old one ends.

### Reporting

#### REPORT-001 — Proposal pipeline dashboard

*Tier:* Core · *Cites:* BASE-ROLE-001

**Requirement.** The pipeline lists draft, awaiting approval, sent, viewed, accepted, paid, declined and expired proposals, including withdrawn, by value, sales owner, client, age and next action, filterable and sortable by each. Counts and separate currency totals follow the visible filtered rows. Legacy missing owners remain “Not recorded”. Valuation, age and tie rules are in [pipeline behavior](docs/contract-behavior.md#report-001).

**Acceptance.**
1. Seed thirty proposals across statuses and owners; each field’s filters/sorts and the totals equal the hand-computed fixture.
2. Owner/admin see all, managers/viewers their teams and sales owned/shared proposals; content and revenue specialists use only their report rights.
3. Edits keep the original sales owner, including the sponsor of an agent-prepared proposal.

#### REPORT-002 — Win rate and sales performance

*Tier:* Core

**Requirement.** Reports show win rate, time to sign, time to pay, average deal value and lost reasons by owner, template, service, client segment and period. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#report-002).

**Acceptance.**
1. From a fixture of 100 decided proposals, see win rate, median time to sign, median time to pay, average deal value and lost-reason counts by owner, template, service, client segment and quarter, each matching the fixture's hand-computed values.

#### REPORT-003 — Content and pricing performance

*Tier:* Core

**Requirement.** Reports show which templates, library items, packages and optional items appear in won and lost proposals, how long clients read them (`TRACK-002`), and which packages clients choose. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#report-003).

**Acceptance.**
1. In the `REPORT-002` fixture of 100 decided proposals, template Agency retainer is used on 40 proposals of which 18 are won; package Growth is offered on 30 and chosen on 12; optional item Rush delivery is offered on 25 and chosen on 6; and library item Acme case study appears in 20 proposals, 12 won and 8 lost, with `TRACK-002` reading times whose median is 95 seconds.
2. The report shows Agency retainer at a 45.0% win rate, Growth at 40.0% take-up, Rush delivery at 24.0% take-up, and Acme case study in 12 won and 8 lost proposals with a median reading time of 1 min 35 s; every other template, package, optional item and library item row equals the fixture's hand-computed values.

#### REPORT-004 — Booked, billed and collected revenue

*Tier:* Core

**Requirement.** Reports show signed value, one-off and recurring (MRR and first-year value), invoiced, collected and overdue amounts by period and owner, reconciled with payments and accounting (`ACCT-004`). Agent report reads carry standard and follow company policy within the sponsor’s report role and grant. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#report-004).

**Acceptance.**
1. Accept and pay a fixture of agreements and see booked, invoiced, collected and overdue totals match payments and the QuickBooks Online fake.

#### REPORT-005 — Report export and scheduled delivery

*Tier:* Core

**Requirement.** Every report exports its currently filtered and sorted rows and per-currency totals to CSV. Column and money encoding details are in [report behavior](docs/contract-behavior.md#report-005).

**Acceptance.**
1. Export the pipeline: every screen row, count and per-currency total matches CSV in the same order.

#### REPORT-006 — Scheduled report delivery

*Tier:* Core · *From:* REPORT-005 · *Cites:* BASE-MAIL-001, BASE-ROLE-001

**Requirement.** Authorized people schedule reports daily or weekly to one to ten named active people, preserving filters and sort. The installation’s IANA zone and daylight-saving rules govern runs; [report behavior](docs/contract-behavior.md#report-005) defines time and recipient handling.

**Acceptance.**
1. Schedule weekly win rate to two people: both messages contain the same screen figures and CSV.
2. Run the pipeline schedule across a daylight-saving transition with exact run-time data.
3. Repeated checks and downtime recovery produce one run; inactive recipients are visibly skipped and uncertain transport is not resent.
4. Schedules survive archive without email transport.

### Team administration

#### TEAM-001 — Roles and permissions

*Tier:* Core · *Cites:* BASE-ROLE-001, BASE-ACCESS-004

**Requirement.** Members hold owner, admin, manager, sales, content editor, viewer or billing roles and belong to teams. The matrix defines proposal jobs: All is workspace-wide, Team follows the sales owner’s teams plus own, and Own includes owned and explicitly shared proposals. A collaborator share grants one proposal’s View and permitted Edit rights, without changing a No cell or widening other rights. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#team-001).

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
| Issue and revoke agent grants (`ACCESS-001`) | Yes | No | No | No | No | No | No |
| Transfer ownership and delete the workspace | Yes | No | No | No | No | No | No |
| View reports (`REPORT-001` to `REPORT-005`) | All | All | Team | Own | Content reports only (`REPORT-003`) | Team | Revenue reports only (`REPORT-004`) |
| View and export the audit log (`TEAM-004`) | Yes | Yes | No | No | No | No | No |

**Acceptance.**
1. Run every matrix cell through its public door: allowed jobs succeed; disallowed jobs change no record or provider state; lists/searches equal the permitted proposal set.
2. Sales can open/edit/send a collaborator proposal; managers can edit a shared out-of-team proposal but cannot send, share onward, approve or unlock it; viewers can read but cannot edit.
3. Removing a share removes it from lists and refuses the next read/edit.
4. The upgrade retains the owner and places legacy members in sales with no teams and only their own proposals.
5. Cost/margin visibility and refund/provider/default-setting rights match each matrix role.

#### TEAM-006 — Scoped membership invitations

*Tier:* Core · *From:* TEAM-001 · *Cites:* BASE-ROLE-001, BASE-ACCESS-004, BASE-SIGNIN-001

**Requirement.** An invitation offers one email address a role and teams within the issuer’s current authority. It gives no account, session, team or proposal authority before native mailbox verification. The exact grant is accepted atomically only while current, unexpired, unrevoked and still issuable by its active issuer.

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
| Issue and revoke agent grants (`ACCESS-001`) | Yes | No | No | No | No | No | No |
| Transfer ownership and delete the workspace | Yes | No | No | No | No | No | No |
| View reports (`REPORT-001` to `REPORT-005`) | All | All | Team | Own | Content reports only (`REPORT-003`) | Team | Revenue reports only (`REPORT-004`) |
| View and export the audit log (`TEAM-004`) | Yes | Yes | No | No | No | No | No |

**Acceptance.**
1. A manager invites a sales member into their own team; mailbox verification applies exactly that role and team.
2. Reissue with another permitted role/team invalidates all prior links, used or unused; the new link applies only the new grant.
3. Expiry, revocation or loss of issuer authority refuse acceptance without session, role or team changes; a later native invitation cannot apply a revoked grant.
4. Changing the issuer’s time zone alone leaves a still-authorized grant usable.
5. A manager’s raw native invitation cannot bypass selected role/team bounds and creates no account.
6. An invitation grants neither collaborator access nor a wider folder audience.

#### TEAM-007 — Team folder audiences

*Tier:* Core · *From:* TEAM-001 · *Cites:* BASE-ROLE-001, BASE-ACCESS-004, BASE-AGENT-007

**Requirement.** Team-limited template and library folders are visible and usable only to their teams, owner and admins. An audience expansion is shown before saving and requires the editor’s explicit audience decision; the company policy decides an agent’s access-class call, with direction and affected people.

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
| Issue and revoke agent grants (`ACCESS-001`) | Yes | No | No | No | No | No | No |
| Transfer ownership and delete the workspace | Yes | No | No | No | No | No | No |
| View reports (`REPORT-001` to `REPORT-005`) | All | All | Team | Own | Content reports only (`REPORT-003`) | Team | Revenue reports only (`REPORT-004`) |
| View and export the audit log (`TEAM-004`) | Yes | Yes | No | No | No | No | No |

**Acceptance.**
1. Moving a team-limited library item or template to a wider folder or workspace, clearing folder teams or first sharing a personal template without the required audience decision is refused with no write.
2. After that decision, the move and audience are recorded in audit, and the item is visible to exactly its new audience.
3. Joining or leaving a team follows TEAM-006 membership authority and changes visibility, without using folder consent to grant membership.

#### TEAM-002 — Single sign-on and SCIM provisioning

*Tier:* Core · *Cites:* BASE-SIGNIN-001, BASE-ROLE-001 · *Register:* R-8

**Requirement.** Sign-in through Auth, Okta, Entra or Google Workspace maps provider roles to the proposal matrix. Deprovisioned members’ proposals are assigned a new sales owner. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#team-002).

**Acceptance.**
1. With run-auth’s standards fixture, admit a SAML member, provision/update/deprovision through SCIM and observe proposal reassignment under the mapped role.

#### TEAM-003 — Multiple brands and workspaces

*Tier:* Core

**Requirement.** A firm runs several brands or business units, each with its own brand kit, domain, templates, library, catalog, Stripe account and accounting connection, with members in one or more. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#team-003).

**Acceptance.**
1. Create two brands with separate Stripe and QuickBooks fakes; a proposal from brand B uses B's brand, domain and Stripe account, and B's members cannot see A's library.

#### TEAM-004 — Audit log

*Tier:* Core · *Cites:* BASE-AUDIT-001, BASE-AGENT-009, BASE-OPS-005

**Requirement.** Platter audit subjects include proposal revisions, approvals, sends, client invitations, signatures, payments, refunds, provider settings and membership. Unknown invitation viewers remain unknown; verified client actions identify the client record. Proposal-specific fields and filters are in [audit behavior](docs/contract-behavior.md#team-004).

**Acceptance.**
1. Perform every proposal job through its public door: actor, subject and server time are retained; exact filters, literal search and inclusive bounds return matching rows and the CSV contains those same ordered rows.
2. Person, agent, unknown invitation and verified client records remain distinct; command payloads, credentials and invitation secrets are absent.
3. Owner/admin can search and download at 1440 and 390; other roles and signed-out readers cannot.
4. Archive and restore preserve the proposal audit exactly.

#### TEAM-005 — Security review pack for procurement

*Tier:* Core · *Register:* R-7

**Requirement.** A buyer's procurement or IT team gets what they ask an incumbent for. A security page states each control Platter implements (encryption and credential custody `SEC-001`, access control `TEAM-001` and `TEAM-002`, audit `TEAM-004`, erasure `PRIV-001`, archives and restore `PORT-001`), each linked to the clause and test that prove it. The pack also holds a subprocessor list, a data processing addendum, and completed standard questionnaires (CAIQ Lite and SIG Lite). The hosted report is field proof R-7. For a self-hosted installation, the pack states which controls the installer's own Cloudflare account carries. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#team-005).

**Acceptance.**
1. Open the security page: every control statement links to a clause whose status is done, and none links to a partial or missing clause; download the subprocessor list and DPA; a questionnaire answer naming a control links to the same clause as the page.

### Migration from incumbents

#### MIG-001 — PandaDoc move-in

*Tier:* Core · *Rules:* D-1

**Requirement.** A PandaDoc customer on any plan moves in without API access, because PandaDoc gives Business and Starter accounts only its Sandbox API and keeps the Production API for approved Enterprise accounts. The full mapping and custody rules in [proposal behavior](docs/contract-behavior.md#mig-001) apply to every import and resulting record.

**Acceptance.**
1. With fixtures in PandaDoc's real export shapes, namely two bulk zips (250 and 40 PDFs) with a three-level folder tree, completed documents carrying certificate pages and open documents without, a catalog CSV with the export columns, a bundle row and a custom-field column, and a template details JSON response with roles and tokens and no body: preview and apply with no API key, and see completed documents as retained agreements whose PDFs and certificates are byte-identical with matching SHA-256, open documents as drafts, folders matching the tree, catalog items and the bundle package matching the CSV with each row's Images URL fetched from a file-host fake as the item's image, and a report listing what arrived and each unmapped kind.
2. Then connect a PandaDoc API fake returning the template details response: the template is listed as "convert from Word download" with its roles and tokens; once its Word download is converted, the template carries the response's two roles with their signing order and pre-assigned recipient, and each field the response lists is added assigned to its role.
3. Upload its Word download, a .docx with headings, an image, `[Client.Company]` tokens and a six-row quote table with five SKUs in the imported catalog CSV and one unknown: the result is a template with editable blocks, the tokens as variables and a pricing table of six priced line items, five linked to catalog items and one listed as unmatched.
4. Upload, as library items, the Word download of one PandaDoc document holding 10 inserted library items, and get 10 items.
5. Upload another template only as a PDF and see fixed pages listed as "Word download needed for editing".
6. Uploading the same zip again adds nothing; undo the import.

#### MIG-002 — Proposify move-in

*Tier:* Core · *Rules:* D-1

**Requirement.** Platter imports Proposify templates, content library sections, fee tables, clients and proposals through the Proposify API where the buyer has it (Proposify offers its API on the Business plan, enabled by its Customer Success team), with signed proposals as read-only agreements and open ones as drafts. Without API access, the buyer uses the `MIG-007` route: proposal PDFs downloaded from Proposify, with signed ones kept as retained agreements with their signature page byte-identical and open ones as drafts for reissue; Proposify's documents report exported as CSV for status, value, client and dates, matched to each PDF; clients and catalog items by CSV (`MIG-006`) or from the CRM; and templates and library sections, which Proposify offers no Word download for, arriving as fixed pages from the PDF of a proposal made from each one (`EDIT-005`) and listed in the report as "rebuild in the editor", never converted. A template or section that the API returns without its content is treated the same way. Either way the import report states what arrived and lists what did not map, under `IMPORT-001`'s preview, journal and undo. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-002).

**Acceptance.**
1. Run the `MIG-001` journey against a Proposify API fake; then, with no API, import 30 Proposify PDFs and a documents report CSV and see each PDF matched to its report row with status, value and client, signed ones retained byte-identical, open ones as drafts, and the unmapped list stated; a template supplied as a Proposify PDF arrives as fixed pages listed as "rebuild in the editor", with no Word conversion offered.

#### MIG-003 — Better Proposals move-in

*Tier:* Core · *Rules:* D-1

**Requirement.** Platter imports Better Proposals templates, content, contacts and proposals through its API where the buyer's plan includes API access, and otherwise through the `MIG-007` route from downloaded proposal PDFs and CSV files, under the same preview, journal and undo and with the same report of what did not map. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-003).

**Acceptance.**
1. Run the `MIG-001` journey against a Better Proposals API fake, then run the no-API journey of `MIG-002` with Better Proposals PDFs and a contacts CSV.

#### MIG-004 — Qwilr and Ignition move-in

*Tier:* Core · *Rules:* D-1

**Requirement.** Platter imports Qwilr pages, templates and quotes through its API where the buyer's plan has it enabled, and otherwise from Qwilr PDF exports through `MIG-007`; it imports Ignition clients, services, proposals and billing schedules from Ignition's exports. Both run under the same preview, journal and undo. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-004).

**Acceptance.**
1. Run the `MIG-001` journey against a Qwilr API fake and against Qwilr PDF exports with no API, and against an Ignition export fixture including one active billing schedule.

#### MIG-005 — Open proposals and payment schedules continue

*Tier:* Core · *Rules:* D-1

**Requirement.** At move-in, proposals sent but not signed in the old tool can be reissued from Platter with a new link, and signed agreements with active Stripe schedules or subscriptions are adopted by their Stripe IDs, so no client is charged twice and no scheduled payment is missed. A reissued proposal links to the imported original and is listed for the buyer to void in the old tool. An open document that arrived only as a PDF is reissued as fixed pages (`EDIT-019`): the original pages unchanged, with signature, initials and date fields placed where the PDF's signature block was detected or where the member puts them, and with no interactive pricing, optional items or payment collection unless the member appends a pricing table and sets a payment schedule before approval. The import report and the reissue screen say this and offer the Word route: an open document whose Word download was also uploaded is reissued as an editable proposal with live pricing tables (`PRICE-001`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-005).

**Acceptance.**
1. Import an Ignition agreement with an active Stripe subscription fake, adopt it, advance a month and see exactly one charge recorded against the imported agreement.
2. Import a PandaDoc document that was sent but not signed and reissue it: it follows the `APPROVE-003` approval policy, the client gets a new Platter link, the new proposal links to the imported original, and the original is listed as "void in PandaDoc".

#### MIG-006 — Clients, contacts and catalog CSV move-in

*Tier:* Core · *Cites:* BASE-DATA-001, BASE-INPUT-003 · *Rules:* D-1

**Requirement.** The CSV kit imports companies, contacts with titles and phone numbers, billing and service addresses, tax-exempt status and catalog items, with the preview, fingerprint, journal and undo of `IMPORT-001`. It reads the incumbents' own contact and catalog CSV layouts (including PandaDoc's catalog CSV and the contact file PandaDoc support provides) as well as Platter's. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-006).

**Acceptance.**
1. Import a CSV of 200 contacts across 60 companies with addresses and exemptions, and 50 catalog items, preview, apply and undo; import PandaDoc's catalog CSV layout unchanged and see the same items as `MIG-001`.
2. Named public HTTP journeys assert original catalog/contact layouts, reviewed mappings for differing exports, titles/phones/addresses/exemptions, exact prices, bundles, recurrence/custom fields, file-host-edge image bytes, explicit image omission, conflicts, owner authority, resumable apply and dependent-record undo protection.
3. Browser journeys at 1440 and 390 finish preview/apply/journal/undo and explicit omission; the public CLI restores records and original CSV/image bytes with working undo.
4. Import an image from a public source: the retained PNG bytes match the source, and a mismatching TLS hostname is refused. Provider fakes demonstrate Platter’s handling without certifying a hosted provider.

#### MIG-007 — Move-in from exported files without API access

*Tier:* Core · *Rules:* D-1

**Requirement.** For every incumbent, a buyer without API access moves in from the files the incumbent lets any customer export: document PDFs (one at a time or in bulk zips, across several uploads into one import), catalog and contact CSVs, and report CSVs. Platter detects signed documents by their signature certificate or signature page and keeps them as retained, read-only agreements with the original file byte-identical and its SHA-256 recorded; matches each PDF to report rows by title, client and date and holds ambiguous matches for the buyer to review; converts template and library files to editable blocks (`EDIT-005`); and resumes an interrupted upload without duplicating anything. Every import ends with a report of what arrived, what is held for review and what did not map, under `IMPORT-001`'s preview, journal and undo. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mig-007).

**Acceptance.**
1. Import three zips in two sessions with an interrupted upload between them and one PDF present in two zips: there is one agreement per document and nothing is duplicated; an ambiguous report row is held for review until the buyer picks its PDF; the report's counts of arrived, held and unmapped items match the fixture; undo removes everything the import wrote.

### Mobile

#### MOB-001 — Team app on a phone

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001 · *Register:* R-4, R-5

**Requirement.** On a phone browser, a sales member creates a proposal from a template, sends it, answers a client question and checks the follow-up queue, and an approver role approves a request under the `APPROVE-003` policy. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mob-001).

**Acceptance.**
1. A browser journey at 390 pixels completes each of those actions, the sends and answers as a sales member and the approval as a manager; the same approval attempted by the sales member is refused (403).

#### MOB-002 — iOS and Android apps with push notifications

*Tier:* Core · *Cites:* BASE-ACCESSIBILITY-001 · *Register:* R-4, R-5, R-6

**Requirement.** Native iOS and Android apps give members the follow-up queue, proposal status, client questions, approvals and payments, with push notifications for views, questions, signatures, payments and approval requests. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#mob-002).

**Acceptance.**
1. On iOS and Android test devices, sign in, receive a push when the client views and signs, approve a request, and answer a question.

### AI assistance

#### AI-001 — Drafts from meeting notes, transcripts and email

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** A person selects notes, transcripts, email or Zoom/Meet/Teams recordings. Platter drafts from the firm’s template, library and catalog, with recipient-role suggestions and delivery settings; every section cites its source. Drafting carries standard and external sending with binding offer terms carries external and commitment, decided by company policy. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#ai-001).

**Acceptance.**
1. From the transcript fixture, every section cites a line, all prices are catalog items, source people are suggested for role slots and template delivery settings are retained.
2. Under the held company policy, external and commitment sending waits for the named approver; under all-autonomous policy, permitted sending runs.

#### AI-002 — Writing assistant in the editor

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The editor offers rewrite, shorten, tone, summary and translation of text blocks, without modifying pricing. Applying an agent’s text edit carries standard; the company policy decides it. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#ai-002).

**Acceptance.**
1. Ask to shorten a block: its suggested change is visible.
2. Under the held company policy, the person accepts the standard-class text change; a price-edit request through this text-only action is refused.

#### AI-003 — MCP server for AI assistants

*Tier:* Core · *Cites:* BASE-AGENT-001, BASE-AGENT-002, BASE-AGENT-005, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-012 · *Register:* R-9

**Requirement.** MCP offers proposal search, status/engagement, template drafting, revision and sending requests to assistants. Preparation carries standard; sending carries external and commitment; signing/approval carries commitment; refunds carry money. Company policy decides calls instead of a tool-name filter. Retained send requests and stale-revision behavior remain proposal features, with the legacy implementation described in [MCP behavior](docs/contract-behavior.md#ai-003).

**Acceptance.**
1. Connect, list schemas, search clients/proposals, prepare/revise a draft, and read status and honestly labelled engagement.
2. Replay a send request for the same grant/proposal/revision: one request is retained and no offer, approval or mail changes before the company policy permits execution.
3. Under the held policy, external sending and commitment decisions wait for the named person; under all-autonomous policy, permitted calls run. Revoked credentials and foreign origins are refused.
4. Edit a requested revision: its request becomes stale; dismissal and fulfillment retain their exact revision.
5. Premature fulfillment and an unauthorized person’s queue decision are refused; tool results exclude invitation credentials.
6. Use the queue at desktop/phone widths and archive requests and resolutions without credentials.

#### AI-004 — Explainable price suggestions

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** Price suggestions use the firm’s accepted/lost proposals for the same catalog item and client segment, with sample size and examples. Applying an agent’s price change carries standard and later binding the offer carries commitment; company policy decides. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#ai-004).

**Acceptance.**
1. From fixture history, the suggested range shows its sample size and three linked examples.
2. Under the held policy, the standard-class price edit remains unchanged until its reviewer applies the suggestion.

### Privacy, security and portability

#### PRIV-001 — Erasure across contacts, tracking and synced systems

*Tier:* Core · *Cites:* BASE-DATA-003, BASE-DATA-006

**Requirement.** A US privacy request covers contact details, engagement and draft discussions, while retained agreements identify their business-record exception. The receipt names affected CRM and file-store records the operator must erase there. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#priv-001).

**Acceptance.**
1. Erase a contact with two draft views and one signed agreement: draft data and views are gone, the agreement has a retention note, and the receipt lists the HubSpot fixture’s record.

#### PORT-002 — Complete product archive

*Tier:* Core · *Cites:* BASE-DATA-001, BASE-SECRET-001

**Requirement.** The archive includes every Platter record kind: templates, library, catalog, media, signed PDFs/certificates, payment/invoice records, report source data and integration mappings. Connection metadata travels; connection credentials and public invitation authority stay local. Each added record kind joins the same archive obligation. BASE-DATA-001 owns the shared archive conformance journey, whose state is recorded in Shared duties. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#port-002).

**Acceptance.**
1. Inspect a populated product archive: it includes templates, library items, catalog, media, signed PDFs and certificates, payment/invoice records, report source data and integration mappings with their retained bytes.
2. Inspect that populated archive: no provider token, agent key, native session, invitation, verification state or mail is carried.

#### SEC-001 — Provider credential custody

*Tier:* Core · *Cites:* BASE-SECRET-001, BASE-ROLE-001, BASE-DATA-001

**Requirement.** Platter provider connections cover payments, CRM, accounting, mail, file storage, chat and SSO. Owner/admin manage workspace connections; senders manage only their own mailbox. Broken connections show an actionable state. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#sec-001).

**Acceptance.**
1. Connect every provider fake and inspect storage/logs: no clear token is present.
2. Revoke one connection: its state changes and its jobs stop.
3. Sales cannot disconnect QuickBooks; owner/admin can.

### Agent surface

**Specialist: proposal coordinator.** It carries a service firm from discovery and catalog-priced proposals through decisions, signing, collection, delivery handoff and renewal.

Inherits BASE-AGENT-001 to BASE-AGENT-013. The company’s policy decides every call.

**How Platter computes each class.**

- standard: reversible draft, text, pricing, queue and internal-record changes, measured in proposals, rows or items.
- external: mail, SMS, public links, provider synchronization and delivery handoffs reach an outside recipient; facts give recipient count and known, new or public counterparty. Exposing an attachment to an outside recipient counts too.
- money: collection, refund, write-off or invoice charge changes what is paid or charged; facts include exact integer-cent amount, currency and payee.
- commitment: sending a binding offer, approving its exact terms, signing or accepting scope binds the firm; facts include proposal value and counterparty.
- accounts: creating a provider account or paid resource, distinguished from using an existing verified connection; facts name the provider.
- gated: a provider’s hosted consent, card entry, identity verification or personal acceptance step; facts name provider and step. A company-authorized API route is classified on its actual route.
- access: a grant, member, team, recipient authority or persistent folder audience changes; facts include affected people and whether authority widens or narrows.
- security: provider credentials, sign-in configuration and protective domain settings change; facts name the setting.
- destructive: client erasure or replacement of retained destination records cannot be undone in the product; facts count affected records.
- sensitive: a W-9, identity, bank, card or regulated personal record is touched; facts count records and name their kind. Ordinary business contact text alone adds no sensitive class.
- live: changing a running automation or connector changes service behavior; facts name that service.
| Tool | Does | Core clauses | Risk class | Today |
| --- | --- | --- | --- | --- |
| `platter.proposals.read` | Authorized domain dispatch | HTTP-001, AI-003 | standard | legacy read_proposal |
| `platter.grants.create` | Proposal preparation grants | ACCESS-001 | access | legacy action; MCP parity unproved |
| `platter.approvals.decide` | Approval binds the exact revision | PROP-001, APPROVE-003, APPROVE-004 | commitment | legacy action; MCP parity unproved |
| `platter.proposals.send` | Sending freezes the offer | PROP-002 | external or commitment | legacy action; MCP parity unproved |
| `platter.signing.verify` | Verified-mailbox acceptance | SIGN-001 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.signing.manage_accept` | Immutable acceptance with an integer-cent deposit | SIGN-002 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.invoices.export` | One retained deposit invoice per acceptance | INV-001 | standard | legacy action; MCP parity unproved |
| `platter.imports.apply` | Reviewed client CSV move-in with undo | IMPORT-001 | standard | legacy action; MCP parity unproved |
| `platter.clients.manage_erase` | Bounded client erasure | ERASE-001 | destructive or sensitive | legacy action; MCP parity unproved |
| `platter.archives.restore` | Validated archives and restore | PORT-001 | destructive or sensitive | legacy action; MCP parity unproved |
| `platter.mail.read` | Durable proposal mail with honest outcomes | MAIL-001 | standard | legacy action; MCP parity unproved |
| `platter.documents.update` | Branded drag-and-drop proposal editor | EDIT-001 | standard | legacy action; MCP parity unproved |
| `platter.templates.start` | Proposal templates | EDIT-002 | standard | legacy prepare_from_template |
| `platter.library.insert` | Reusable content library | EDIT-003 | standard | legacy action; MCP parity unproved |
| `platter.variables.fill` | Variables from client, deal and CRM records | EDIT-004 | standard | legacy action; MCP parity unproved |
| `platter.imports.manage_word` | Word and PDF import and export | EDIT-005 | standard | legacy action; MCP parity unproved |
| `platter.documents.export` | Word and PDF exports | EDIT-020 | standard | legacy action; MCP parity unproved |
| `platter.imports.manage_pdf` | Fixed PDF pages with signing fields | EDIT-019 | standard | legacy action; MCP parity unproved |
| `platter.media.insert` | Embedded rich media | EDIT-006 | standard | legacy action; MCP parity unproved |
| `platter.domains.configure` | Custom domain and branded client experience | EDIT-008 | accounts or gated or security | legacy action; MCP parity unproved |
| `platter.conditions.update` | Conditional content by package | EDIT-009 | standard | legacy action; MCP parity unproved |
| `platter.attachments.update` | Attachments and vendor documents | EDIT-010 | standard or sensitive | legacy action; MCP parity unproved |
| `platter.documents.measure` | Large-proposal performance budget | EDIT-011 | standard | legacy action; MCP parity unproved |
| `platter.proposals.duplicate` | Duplicate a proposal for another client | EDIT-012, EDIT-021 | standard | legacy proposal.duplicate |
| `platter.documents.prepare` | Documents without pricing | EDIT-013 | standard | legacy action; MCP parity unproved |
| `platter.pdf.download` | Client PDF download before signing | EDIT-014 | standard | legacy action; MCP parity unproved |
| `platter.sections.unlock` | Locked template sections | EDIT-015 | standard | legacy action; MCP parity unproved |
| `platter.proposals.search` | Proposal search and folders | EDIT-016 | standard | legacy search_proposals |
| `platter.language.set` | Client page in the client's language | EDIT-017 | standard | legacy action; MCP parity unproved |
| `platter.previews.read` | Client-page preview before sending | EDIT-018, EDIT-022 | standard | legacy action; MCP parity unproved |
| `platter.cat.manage_service_and_product_catalog` | Service and product catalog | CAT-001 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_usd_pricing_tables_with_line_items` | USD pricing tables with line items | PRICE-001 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_packages_and_optional_items_the_client_chooses` | Packages and optional items the client chooses | PRICE-002 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_one_off_and_recurring_fees` | One-off and recurring fees | PRICE-003 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_discounts` | Discounts | PRICE-004 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_us_sales_tax` | US sales tax | PRICE-005 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_internal_cost_and_margin` | Internal cost and margin | PRICE-006 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_payment_terms_and_schedules_on_the_proposal` | Payment terms and schedules on the proposal | PRICE-007 | standard | legacy action; MCP parity unproved |
| `platter.price.manage_first_release_aud_agreements_stay_exact` | First-release AUD agreements stay exact | PRICE-008 | standard | legacy action; MCP parity unproved |
| `platter.collab.manage_real_time_team_editing` | Real-time team editing | COLLAB-001 | standard | legacy action; MCP parity unproved |
| `platter.collab.manage_internal_comments_mentions_and_assignments` | Internal comments, mentions and assignments | COLLAB-002 | standard | legacy action; MCP parity unproved |
| `platter.collab.manage_version_history_with_compare_and_restore` | Version history with compare and restore | COLLAB-003 | standard | legacy action; MCP parity unproved |
| `platter.rules.update` | Approval rules and routing | APPROVE-001 | standard | legacy action; MCP parity unproved |
| `platter.approve.manage_approval_requests_that_reach_the_approver` | Approval requests that reach the approver | APPROVE-002 | standard | legacy action; MCP parity unproved |
| `platter.mailboxes.connect` | Send from the firm's own mailbox | SEND-001 | accounts or gated or security | legacy action; MCP parity unproved |
| `platter.replies.read` | Inbound client reply custody | SEND-011 | external or commitment | legacy action; MCP parity unproved |
| `platter.delivery.read` | Delivery status and bounce handling | SEND-002 | external or commitment | legacy action; MCP parity unproved |
| `platter.bounces.resolve` | Bounce correction follow-up | SEND-012 | external or commitment | legacy action; MCP parity unproved |
| `platter.recipients.update` | Recipients, roles and sharing | SEND-003 | external or commitment | legacy action; MCP parity unproved |
| `platter.expiry.update` | Expiry and reopening | SEND-004 | external or commitment | legacy action; MCP parity unproved |
| `platter.warnings.run` | Unsigned-recipient expiry warnings | SEND-013 | external or commitment | legacy action; MCP parity unproved |
| `platter.notifications.configure` | Completion and activity notifications | SEND-005 | external or commitment | legacy action; MCP parity unproved |
| `platter.messages.update` | Editable subject, message and shared email templates | SEND-006 | external or commitment | legacy action; MCP parity unproved |
| `platter.mail.manage_rehearse` | Private rehearsal email | SEND-014 | external or commitment | legacy action; MCP parity unproved |
| `platter.signers.manage_replace` | Replace an unsigned signer on a sent proposal | SEND-007 | external or commitment | legacy action; MCP parity unproved |
| `platter.sms.send` | Sending and reminders by text message | SEND-008 | external or commitment | legacy action; MCP parity unproved |
| `platter.publiclinks.publish` | Reusable public signing link | SEND-009 | external or commitment | legacy action; MCP parity unproved |
| `platter.proposals.manage_withdraw` | Withdraw a sent proposal | SEND-010 | external or commitment | legacy action; MCP parity unproved |
| `platter.proposals.reissue` | Withdrawal receipt and approved reissue | SEND-015 | external or commitment | legacy action; MCP parity unproved |
| `platter.track.manage_view_tracking_and_live_open_alerts` | View tracking and live open alerts | TRACK-001 | standard | legacy action; MCP parity unproved |
| `platter.track.manage_section_level_reading_analytics` | Section-level reading analytics | TRACK-002 | standard | legacy action; MCP parity unproved |
| `platter.track.manage_forwarded_stakeholder_identification` | Forwarded stakeholder identification | TRACK-003 | standard | legacy action; MCP parity unproved |
| `platter.track.manage_tracking_disclosure_and_privacy_limits` | Tracking disclosure and privacy limits | TRACK-004 | standard | legacy action; MCP parity unproved |
| `platter.reminders.schedule` | Scheduled reminders to unsigned recipients | FOLLOW-001 | standard or external | legacy action; MCP parity unproved |
| `platter.reminders.send` | Manual unsigned-recipient reminders | FOLLOW-008 | standard or external | legacy action; MCP parity unproved |
| `platter.followups.list` | Next-action follow-up queue by sales owner | FOLLOW-002 | standard | legacy action; MCP parity unproved |
| `platter.followups.manage_report` | Follow-up reporting and team visibility | FOLLOW-010 | standard | legacy action; MCP parity unproved |
| `platter.followups.resolve` | Follow-up lifecycle and action history | FOLLOW-009 | standard | legacy action; MCP parity unproved |
| `platter.notices.configure` | Expiry and renewal notifications | FOLLOW-003 | standard or external | legacy action; MCP parity unproved |
| `platter.questions.answer` | Client questions and comments | FOLLOW-004 | standard or external | legacy action; MCP parity unproved |
| `platter.outcomes.record` | Decline reasons and won or lost outcomes | FOLLOW-005 | standard or external | legacy action; MCP parity unproved |
| `platter.deliverydefaults.update` | Default reminder schedule and expiry from the workspace and templates | FOLLOW-006, FOLLOW-011 | standard | legacy action; MCP parity unproved |
| `platter.crm.manage_sync` | Unattended CRM synchronization with a scoped grant | FOLLOW-007 | standard or external | legacy action; MCP parity unproved |
| `platter.neg.manage_negotiated_revisions_after_sending` | Negotiated revisions after sending | NEG-001 | standard | legacy action; MCP parity unproved |
| `platter.neg.manage_client_suggested_text_edits` | Client-suggested text edits | NEG-002 | standard | legacy action; MCP parity unproved |
| `platter.sign.manage_esign_and_ueta_electronic_signature` | ESIGN and UETA electronic signature | SIGN-003 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_multiple_signers_signing_order_and_countersignature` | Multiple signers, signing order and countersignature | SIGN-004 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_signed_agreement_pdf_and_certificate_of_completion` | Signed agreement PDF and certificate of completion | SIGN-005 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_signer_identity_options` | Signer identity options | SIGN-006 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_fields_collected_at_acceptance` | Fields collected at acceptance | SIGN-007 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_acceptance_on_the_client_s_own_paper` | Acceptance on the client's own paper | SIGN-008 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_recipient_delegation_of_signing` | Recipient delegation of signing | SIGN-009 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_in_person_signing_on_the_firm_s_device` | In-person signing on the firm's device | SIGN-010 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_template_recipient_roles_field_assignment_and_signing_order` | Template recipient roles, field assignment and signing order | SIGN-011 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.sign.manage_recipient_role_snapshots_across_creation` | Recipient-role snapshots across creation | SIGN-012 | external or commitment or gated or sensitive | legacy action; MCP parity unproved |
| `platter.pay.manage_stripe_card_and_ach_collection_in_the_proposal` | Stripe card and ACH collection in the proposal | PAY-001 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_deposit_or_partial_payment_at_acceptance` | Deposit or partial payment at acceptance | PAY-002 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_milestone_and_recurring_payment_schedules` | Milestone and recurring payment schedules | PAY-003 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_paid_pending_failed_refunded_and_disputed_states` | Paid, pending, failed, refunded and disputed states | PAY-004 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_failed_payment_retries_and_notices` | Failed-payment retries and notices | PAY-005 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_refunds_and_disputes` | Refunds and disputes | PAY-006 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_check_wire_and_ach_credit_payments` | Check, wire and ACH credit payments | PAY-007 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_net_terms_invoices_with_a_pay_link_and_overdue_tracking` | Net-terms invoices with a pay link and overdue tracking | PAY-008 | external or money | legacy action; MCP parity unproved |
| `platter.pay.manage_paypal_square_and_authorize_net_collection` | PayPal, Square and Authorize.net collection | PAY-009 | external or money | legacy action; MCP parity unproved |
| `platter.acct.manage_quickbooks_online_invoices_and_payments` | QuickBooks Online invoices and payments | ACCT-001 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_xero_invoices_and_payments` | Xero invoices and payments | ACCT-002 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_pantry_invoices_and_payments` | Pantry invoices and payments | ACCT-003 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_one_invoice_authority_and_reconciliation` | One invoice authority and reconciliation | ACCT-004 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_invoice_and_payment_export_files` | Invoice and payment export files | ACCT-005 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_stripe_payouts_fees_and_clearing_in_accounting` | Stripe payouts, fees and clearing in accounting | ACCT-006 | standard or external | legacy action; MCP parity unproved |
| `platter.acct.manage_invoices_created_on_their_issue_day_never_ahead` | Invoices created on their issue day, never ahead | ACCT-007 | standard or external | legacy action; MCP parity unproved |
| `platter.crm.manage_hubspot_two_way_deal_sync` | HubSpot two-way deal sync | CRM-001 | standard or external | legacy action; MCP parity unproved |
| `platter.crm.manage_salesforce_two_way_opportunity_sync` | Salesforce two-way opportunity sync | CRM-002 | standard or external | legacy action; MCP parity unproved |
| `platter.crm.manage_orbit_two_way_deal_sync` | Orbit two-way deal sync | CRM-003 | standard or external | legacy action; MCP parity unproved |
| `platter.crm.manage_pipedrive_and_zoho_crm_sync` | Pipedrive and Zoho CRM sync | CRM-004 | standard or external | legacy action; MCP parity unproved |
| `platter.auto.manage_status_driven_automations` | Status-driven automations | AUTO-001 | external or live | legacy action; MCP parity unproved |
| `platter.auto.manage_completed_documents_archived_to_file_storage` | Completed documents archived to file storage | AUTO-002 | standard or external | legacy action; MCP parity unproved |
| `platter.auto.manage_team_chat_notifications` | Team chat notifications | AUTO-003 | standard or external | legacy action; MCP parity unproved |
| `platter.auto.manage_public_rest_api_and_webhooks` | Public REST API and webhooks | AUTO-004 | standard or external | legacy action; MCP parity unproved |
| `platter.auto.manage_zapier_make_and_crank_apps` | Zapier, Make and Crank apps | AUTO-005 | external or live | legacy action; MCP parity unproved |
| `platter.hand.manage_accepted_scope_handoff_to_delivery_tools` | Accepted-scope handoff to delivery tools | HAND-001 | standard or external | legacy action; MCP parity unproved |
| `platter.hand.manage_handoff_to_gauge_with_budget_and_rates` | Handoff to Gauge with budget and rates | HAND-002 | standard or external | legacy action; MCP parity unproved |
| `platter.renew.manage_bulk_proposal_creation_and_sending` | Bulk proposal creation and sending | RENEW-001 | standard | legacy action; MCP parity unproved |
| `platter.renew.manage_renewal_proposals_from_accepted_agreements` | Renewal proposals from accepted agreements | RENEW-002 | standard | legacy action; MCP parity unproved |
| `platter.report.manage_proposal_pipeline_dashboard` | Proposal pipeline dashboard | REPORT-001 | standard | legacy action; MCP parity unproved |
| `platter.report.manage_win_rate_and_sales_performance` | Win rate and sales performance | REPORT-002 | standard | legacy action; MCP parity unproved |
| `platter.report.manage_content_and_pricing_performance` | Content and pricing performance | REPORT-003 | standard | legacy action; MCP parity unproved |
| `platter.report.manage_booked_billed_and_collected_revenue` | Booked, billed and collected revenue | REPORT-004 | standard | legacy action; MCP parity unproved |
| `platter.report.manage_report_export_and_scheduled_delivery` | Report export and scheduled delivery | REPORT-005 | standard | legacy action; MCP parity unproved |
| `platter.report.scheduled_report_delivery` | Scheduled report delivery | REPORT-006 | standard | legacy action; MCP parity unproved |
| `platter.members.update` | Roles and permissions | TEAM-001 | access | legacy action; MCP parity unproved |
| `platter.audiences.update` | Team folder audiences | TEAM-007 | access | legacy action; MCP parity unproved |
| `platter.members.invite` | Scoped membership invitations | TEAM-006 | access | legacy action; MCP parity unproved |
| `platter.identity.configure` | Single sign-on and SCIM provisioning | TEAM-002 | gated or access or security | legacy action; MCP parity unproved |
| `platter.brands.update` | Multiple brands and workspaces | TEAM-003 | standard | legacy action; MCP parity unproved |
| `platter.audit.search` | Audit log | TEAM-004 | standard | legacy action; MCP parity unproved |
| `platter.securitypack.read` | Security review pack for procurement | TEAM-005 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_pandadoc_move_in` | PandaDoc move-in | MIG-001 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_proposify_move_in` | Proposify move-in | MIG-002 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_better_proposals_move_in` | Better Proposals move-in | MIG-003 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_qwilr_and_ignition_move_in` | Qwilr and Ignition move-in | MIG-004 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_open_proposals_and_payment_schedules_continue` | Open proposals and payment schedules continue | MIG-005 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_clients_contacts_and_catalog_csv_move_in` | Clients, contacts and catalog CSV move-in | MIG-006 | standard | legacy action; MCP parity unproved |
| `platter.mig.manage_move_in_from_exported_files_without_api_access` | Move-in from exported files without API access | MIG-007 | standard | legacy action; MCP parity unproved |
| `platter.drafts.prepare` | Drafts from meeting notes, transcripts and email | AI-001 | standard or sensitive | legacy prepare_proposal |
| `platter.text.rewrite` | Writing assistant in the editor | AI-002 | standard | legacy action; MCP parity unproved |
| `platter.prices.suggest` | Explainable price suggestions | AI-004 | standard | legacy action; MCP parity unproved |
| `platter.priv.manage_erasure_across_contacts_tracking_and_synced_systems` | Erasure across contacts, tracking and synced systems | PRIV-001 | standard | legacy action; MCP parity unproved |
| `platter.archives.export` | Complete product archive | PORT-002 | standard or sensitive | legacy action; MCP parity unproved |
| `platter.connections.update` | Provider credential custody | SEC-001 | accounts or gated or security | legacy action; MCP parity unproved |
| `platter.agent.manage_discovery_call_to_priced_draft` | Discovery call to priced draft | AGENT-001 | standard or external or commitment | legacy action; MCP parity unproved |
| `platter.agent.manage_scope_and_price_tested_against_delivery_reality` | Scope and price tested against delivery reality | AGENT-002 | standard | legacy action; MCP parity unproved |
| `platter.agent.manage_client_questions_chased_to_resolution` | Client questions chased to resolution | AGENT-003 | external or commitment | legacy action; MCP parity unproved |
| `platter.agent.manage_engagement_driven_follow_up` | Engagement-driven follow-up | AGENT-004 | external | legacy action; MCP parity unproved |
| `platter.agent.manage_payment_exceptions_closed_without_duplicate_invoices` | Payment exceptions closed without duplicate invoices | AGENT-005 | external or money | legacy action; MCP parity unproved |
| `platter.agent.manage_out_of_scope_delivery_turned_into_a_change_order` | Out-of-scope delivery turned into a change order | AGENT-006 | external or money or commitment | legacy action; MCP parity unproved |
| `platter.agent.manage_win_and_loss_learning_for_templates_and_pricing` | Win and loss learning for templates and pricing | AGENT-007 | standard | legacy action; MCP parity unproved |
| `platter.agent.manage_renewal_preparation_from_delivered_results` | Renewal preparation from delivered results | AGENT-008 | standard or commitment | legacy action; MCP parity unproved |
| `platter.agent.manage_agent_authority_ledger_and_limits` | Agent authority ledger and limits | AGENT-009 | standard | legacy action; MCP parity unproved |
**Resources.** `platter://proposals/{id}`, `platter://proposals/{id}/revisions/{revision}`, `platter://templates/{id}`, `platter://library/{id}`, `platter://catalog/{id}`, `platter://clients/{id}`, `platter://agreements/{id}`, `platter://invoices/{id}`, `platter://payments/{id}`, `platter://followups/{id}`, `platter://reports/{id}`, `platter://audit/{id}`, `platter://imports/{id}`, `platter://files/{id}`, `platter://members/{id}`, `platter://folders/{id}`, `platter://connections/{id}`, `platter://grants/{id}`, `platter://proposals/{id}/recipients/{recipient}`, `platter://proposals/{id}/questions/{question}`, `platter://proposals/{id}/signatures/{signature}`.
**Events.** `client.changed`, `template.changed`, `library.changed`, `catalog.changed`, `proposal.changed`, `approval.decided`, `proposal.sent`, `recipient.changed`, `question.changed`, `signature.recorded`, `agreement.completed`, `invoice.changed`, `payment.changed`, `followup.changed`, `report.changed`, `import.completed`, `connection.changed`, `member.changed`, `folder.changed`, `archive.requested`, `policy.adopted`.
**Prompts.** Discovery-to-proposal (AI-001, AGENT-001), delivery-fit review (AGENT-002), question resolution (AGENT-003), collection reconciliation (AGENT-005), change order (AGENT-006) and renewal (AGENT-008).
**Not tools, and why.** SITE-001: public documentation and installation fact; EDIT-007: the client’s interactive phone screen; MOB-001: the person’s phone browser; its proposal actions are tools; MOB-002: device-only native clients; server jobs remain tools. Provider-hosted personal checkout and identity screens remain the provider’s interactive screen; preparation/status jobs are tools.
**Limits.** Request bodies are bounded at 150,000 bytes, draft scope at 10,000 characters, search queries at 200 characters and search results at 100 records per kind. File type and size limits are in the product reference. These are per-request capacity bounds; business thresholds, contact limits and provider spend caps are company policy.
**Handoffs.** Listens for `crm.deal.changed`, `delivery.actuals.changed` and `provider.payment.changed` connector envelopes. Emits `agreement.completed` for Gauge or the chosen delivery tool, `invoice.changed` for Pantry or the chosen accounting authority, and `archive.requested` for Chest or the chosen file store, each with the native record URI.

#### SURFACE-001 — Proposal registry and role parity

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-002, BASE-AGENT-003, BASE-AGENT-013

**Requirement.** The proposal registry covers exactly the Core jobs and non-tool reasons in this area.

**Acceptance.**
1. Every tool’s Core-clause mapping equals this table, including underlying phone jobs.
2. Each tool returns the native action’s proposal state, error and event type.
3. The registry documents every listed record URI, event and specialist prompt.

#### SURFACE-002 — Proposal classes from business facts

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-006, BASE-AGENT-007

**Requirement.** Proposal classifiers use the saved revision, recipient, provider and affected records to apply the class computations above.

**Acceptance.**
1. Drafts, text, internal pricing and follow-up edits compute standard with item counts.
2. Outside mail, SMS, public links, exposed attachments, CRM/accounting sync and handoffs compute external with recipient count and known/new/public counterparty.
3. Collection, refunds and write-offs compute money with exact amount, currency and payee.
4. Binding offers, scope sign-offs, approval and signatures compute commitment with value and counterparty.
5. New provider accounts compute accounts; the same provider’s hosted personal consent/card/identity step computes gated with provider and step.
6. Role, team, grant and audience changes compute access with people and direction; credential and protective-setting changes compute security.
7. Irreversible erasure/restore replacement computes destructive with item count; W-9/identity/bank/card records add sensitive with record count and kind.
8. Running automation/connector changes compute live with service identity; an argument or record-text claim cannot change any computed class.

#### SURFACE-003 — Exact proposal decisions and custody

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-007, BASE-AGENT-008, BASE-AGENT-012

**Requirement.** The company-policy journey uses Platter’s exact revision and immutable-agreement semantics.

**Acceptance.**
1. A changed draft invalidates the saved pending proposal decision; the same revision executes once after the company-policy decision permits it.
2. Under the held policy, the named person’s proposal approval is shown separately from the agent’s preparation.
3. Under all-autonomous policy a permitted agent offer/signature decision carries its own commitment attribution.
4. A restored proposal or schedule gains no earlier recipient, provider or execution authority.

#### SURFACE-004 — A seeded service-firm week through MCP

*Tier:* Agent surface · *From:* new · *Cites:* BASE-AGENT-005, BASE-AGENT-007, BASE-AGENT-008, BASE-AGENT-009, BASE-AGENT-013

**Requirement.** A stranger specialist given only the installation URL runs the proposal coordinator’s week through MCP under two complete company policies.

**Acceptance.**
1. Under all-autonomous policy, draft from a discovery call, prepare sourced packages, send the binding proposal, resolve a client question, record the client’s signing/payment outcome, hand accepted scope to Gauge and reconcile the invoice; no call waits for a person or is refused by policy.
2. Run the same week under the held policy: standard calls enter review and each other declared class waits for the named approver, then completes once granted.
3. Counts, amounts, saved revisions, messages, signed agreement and accounting records equal the week’s hand-computed fixture.
4. Before the company policy is complete, the first call changes no proposal and returns the setup question; an all-class answer covers every declared class.
5. Every run preserves truthful preparer/decider attribution and the same role scope as the sponsoring person.

## Push further

### Push further

#### AGENT-001 — Discovery call to priced draft

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The proposal specialist reads discovery transcripts from Zoom, Meet, Teams or uploaded recordings, email, CRM notes and prior winning proposals. It drafts catalog-priced packages, sourcing each requirement, assumption and exclusion and flagging unsupported requests. Preparation carries standard and sending carries external and commitment, decided by company policy.

**Acceptance.**
1. The call/email fixture yields two or three packages whose scope lines cite sources and whose prices are catalog items.
2. An unmatched request is flagged; under the held policy, external and commitment sending waits for the named approver.

#### AGENT-002 — Scope and price tested against delivery reality

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The specialist compares a draft with similar projects’ hours/costs from Gauge, Harvest or QuickBooks job costing, Gauge/Forecast capacity, win rates and margins. Its assumptions table states hours, blended cost, utilization and contingency. Price/date edits carry standard; company policy decides application.

**Acceptance.**
1. With projects that overran by 30%, show the expected margin range below the firm’s floor, cite those projects and flag week-three capacity conflict.
2. Under the held policy, standard-class price and date edits remain unchanged until the owner applies the suggestion.

#### AGENT-003 — Client questions chased to resolution

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The specialist watches proposal questions, comments and replies, drafts answers citing proposal/library/terms, and prepares revisions for price or scope changes. Answers stay open until answered and acknowledged or the proposal is decided. Outbound answers carry external and a revised binding offer adds commitment; company policy decides frequency, stops and execution.

**Acceptance.**
1. For three questions, one changing price, draft two sourced answers and one revision.
2. Under the held company policy, the sales owner approves external answers and the named approver decides the external and commitment revised offer before sending.
3. Each question remains visible until acknowledgement.

#### AGENT-004 — Engagement-driven follow-up

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The specialist chooses next actions from recorded views, section reading, questions and CRM activity and drafts follow-ups referring to sections actually read. Outbound nudges carry external, with recipient counts; company policy sets execution and contact limits.

**Acceptance.**
1. Two clients reading different sections produce different sourced follow-ups.
2. Under the company policy with a two-recipient external-nudge cap, the third nudge is refused.

#### AGENT-005 — Payment exceptions closed without duplicate invoices

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The specialist reconciles accepted schedules, Stripe events and accounting invoices to identify failed, duplicate, partial, unmatched and disputed amounts. It explains causes and prepares corrections. Refunds/write-offs carry money and outbound contact carries external; company policy decides execution. Settlement relies on provider evidence and each fix is reconciled.

**Acceptance.**
1. A duplicate invoice, failed ACH and unmatched check produce three exceptions with causes.
2. Under the held policy, after the owner approves the money and external fixes, reconciliation shows no mismatch and no second invoice exists.

#### AGENT-006 — Out-of-scope delivery turned into a change order

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** The specialist compares Gauge, Asana, Jira, Vector or email delivery actuals and change requests with accepted inclusions/exclusions. It prepares a separately priced change order linked to the agreement. Scope sign-off and binding offer carry commitment; sending adds external, payment adds money. Company policy decides agent execution; the client decides the separate agreement.

**Acceptance.**
1. For forty excluded feature hours in the Gauge fixture, the change order cites the exclusion and hours.
2. Under the held policy, the delivery lead confirms the commitment-class scope and the named approver decides the external and commitment offer; the client accepts and pays it.
3. The original agreement and history stay byte-identical.

#### AGENT-007 — Win and loss learning for templates and pricing

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** From decided proposals, the specialist relates sections, packages, prices, discounts and timing to wins/losses with sample sizes. Applying template/library/catalog edits carries standard; company policy decides.

**Acceptance.**
1. From 200 decided proposals where three packages win more often, show the proposed template change and its sample size.
2. Under the held policy, the standard-class template change waits until the admin accepts it.

#### AGENT-008 — Renewal preparation from delivered results

*Tier:* Core · *Cites:* BASE-AGENT-002, BASE-AGENT-006, BASE-AGENT-007, BASE-AGENT-008

**Requirement.** Before renewal, the specialist assembles Gauge or delivery-tool actuals, usage and outcomes, then drafts a reasoned renewal scope and price. Drafting carries standard and the binding renewal carries commitment; company policy decides.

**Acceptance.**
1. A retainer using 20% more hours yields a sourced larger renewal package.
2. Under the held company policy, the commitment-class renewal waits for its named approver.

#### AGENT-009 — Agent authority ledger and limits

*Tier:* Core · *Cites:* BASE-AGENT-009, BASE-AGENT-011

**Requirement.** The proposal ledger adds source records, outputs and model identity to the Base agent audit. BASE-AGENT-011 owns Pause and provider-budget enforcement; its conformance journey state is recorded in Shared duties.

**Acceptance.**
1. Run each proposal agent: its ledger identifies the proposal source records it read, its outputs and the model used.

## Field proof register

| ID | Proof | Clauses | State | Date | Receipt |
| --- | --- | --- | --- | --- | --- |
| R-1 | Real Google Workspace and Microsoft 365 mailbox qualification | SEND-001 | not run | | |
| R-2 | Real CRM, accounting, file-store and chat tenant qualification | CRM-001, CRM-002, ACCT-001, ACCT-002, AUTO-002, AUTO-003 | not run | | |
| R-3 | Carrier acceptance, A2P 10DLC or toll-free verification and SMS legal review | SEND-008, SIGN-006 | not run | | |
| R-4 | Human screen-reader review | EDIT-007, MOB-001, MOB-002 | not run | | |
| R-5 | Accessibility VPAT | EDIT-007, MOB-001, MOB-002 | not run | | |
| R-6 | iOS and Android store approvals | MOB-002 | not run | | |
| R-7 | Hosted SOC 2 Type II report for the current period | TEAM-005 | not run | | |
| R-8 | Real Okta, Entra and Google Workspace tenant qualification | TEAM-002 | not run | | |
| R-9 | Claude, ChatGPT, Codex and Copilot client interoperability receipts | AI-003 | not run | | |
| R-10 | Real custom-domain and sending-domain DNS acceptance | EDIT-008 | not run | | |

## Boundaries

What Platter does not do, and how a US buyer gets it:

- **Moving or holding money.** Platter never holds client funds, operates card or ACH networks, extends credit or stores card or bank numbers. Payments run through the firm's own Stripe, PayPal, Square or Authorize.net account (`PAY-001`, `PAY-009`); firms that take payment through QuickBooks Payments take it on the accounting invoice, and Platter reads the paid state back (`ACCT-001`). Card surcharging and fee pass-through are offered only where the firm confirms card-network rules and state law allow them.
- **Filing sales tax.** Platter calculates and shows sales tax and records exemption certificates (`PRICE-005`); registering, filing and remitting returns stays with Stripe Tax, Avalara or the firm's accountant.
- **Notarization and qualified trust services.** Platter provides ESIGN and UETA signatures with SMS and ID verification options (`SIGN-003`, `SIGN-006`). Remote online notarization goes through a notary platform such as Proof, and documents that require wet signatures by law (such as some real-estate and family-law instruments) are out of scope.
- **Legal advice.** Platter records consent, intent and audit evidence; whether a given agreement is enforceable is for the firm's counsel.
- **The full CRM, ledger, signing, CLM, billing and delivery products.** Work and project management also has its separate sibling [Pegboard](https://github.com/just-every/run-pegboard). These are separate products with their own buyers (see Neighboring products). Platter syncs with them and never becomes them.
- **Currencies and tax regimes outside the US.** New proposals are USD with US sales tax. First-release AUD agreements remain exact (`PRICE-008`); other currencies and VAT or GST are outside this target.
- **Live provider proof.** Local journeys use fakes at provider edges. Hosting, mail delivery, Stripe, CRM and accounting connections require the installer's own accounts and are proven in each provider's sandbox before a release claims them.

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

## Homepage claims

| # | Claim | Clauses |
| --- | --- | --- |
| 1 | Branded proposals from your templates and catalog | EDIT-001, EDIT-002, CAT-001 |
| 2 | Sent from your own mailbox | SEND-001, SEND-011 |
| 3 | Shows what each client read | TRACK-001, TRACK-002 |
| 4 | Collects the signature and deposit together | SIGN-001, SIGN-003, PAY-001, PAY-002 |
| 5 | Good / Better / Best packages, add-ons, Austin sales tax, 50% deposit | PRICE-001, PRICE-002, PRICE-005, PRICE-007 |
| 6 | HubSpot deal won, QuickBooks invoice paid | CRM-001, ACCT-001 |
| 7 | 100% free, open source alternative to PandaDoc, Proposify and Better Proposals; MIT licensed | MIG-001, MIG-002, MIG-003 |
| 8 | Run Platter (the one-line start) | SITE-001 |
| 9 | Sent, read, back and forth, signed, first payment, per proposal | SEND-001, SEND-011, TRACK-001, NEG-001, SIGN-003, PAY-001, PAY-002, PAY-004 |
| 10 | The agent drafts a priced proposal from a Zoom call, each line cited | AGENT-001, AI-001 |
| 11 | Proposal agents use the company’s class policy for drafting and sending | ACCESS-001, PROP-001 |
| 12 | Lines from the catalog; items not in it left out | CAT-001, PRICE-001 |
| 13 | Checked against Gauge: margin against the floor | AGENT-002, PRICE-006, HAND-002 |
| 14 | Template, content library, brand kit, fields, locked sections | EDIT-001, EDIT-002, EDIT-003, EDIT-004, EDIT-015 |
| 15 | The client sets the guest count; options they can add | PRICE-002, PRICE-001 |
| 16 | Delaware sales tax $0.00 | PRICE-005 |
| 17 | Reminders, cancelled once signed; expiry | FOLLOW-001, FOLLOW-008, FOLLOW-006, FOLLOW-011, SEND-004, SEND-013 |
| 18 | "Views of this page are measured." on the client page | TRACK-004 |
| 19 | Delivery status, bounce shown, resent to the right address | SEND-002, SEND-012 |
| 20 | Reading time per section | TRACK-002 |
| 21 | The agent drafts from recorded client reading; outbound follow-ups carry external and company policy decides | AGENT-004, FOLLOW-002, FOLLOW-010, FOLLOW-009 |
| 22 | The resend uses the address on Tom's HubSpot contact | CRM-001 |
| 23 | Retainers: $1,200.00/mo × 12, $650.00/mo × 6 | PRICE-003, PAY-003 |
| 24 | Clients ask on the page; the firm replies | FOLLOW-004 |
| 25 | Rev 2 with every change marked; the rev 1 link retired | NEG-001, COLLAB-003, PROP-002 |
| 26 | Signed on her phone | EDIT-007, SIGN-001 |
| 27 | Two client signers in order, each with a mailbox code | SIGN-001, SIGN-004 |
| 28 | ESIGN consent, drawn and typed signatures | SIGN-003 |
| 29 | Certificate of completion with document hash | SIGN-005 |
| 30 | Emailed to all, filed to Google Drive, Salesforce Closed Won | AUTO-002, CRM-002 |
| 31 | Stripe ACH deposit, fee and payout cleared in QuickBooks Online, balance $0.00 | PAY-001, ACCT-001, ACCT-006 |
| 32 | One invoice per amount, created on its issue day; net 15 | ACCT-004, ACCT-007, PAY-008 |
| 33 | Card declined, the client told why, ACH from the same invoice link | PAY-004, PAY-005 |
| 34 | The agent’s exception card carries evidence; money and outbound corrections follow company policy | AGENT-005, AGENT-009 |
| 35 | Reconciled: 1 amount, 1 invoice, 2 attempts, 0 mismatches | ACCT-004 |
| 36 | Out-of-scope request priced as its own change order; the original agreement unchanged | AGENT-006, PROP-002 |
| 37 | Asana project made at signing, one task per accepted line | HAND-001 |
| 38 | Paid by card that afternoon | PAY-001 |
| 39 | PandaDoc Word templates become editable pages; tokens become fields; rows matched to the catalog | MIG-001, MIG-007, EDIT-005, EDIT-020, EDIT-019, EDIT-004, CAT-001 |
| 40 | Catalog CSV with bundles as packages; bulk PDFs kept with their certificates | MIG-001, CAT-001 |
| 41 | Planned move-in support for Proposify, Better Proposals, Qwilr and Ignition | MIG-002, MIG-003, MIG-004 |

## Status

Judged from the code and tests at commit `8f4ff0320aaafd58b41dabcf9e39bc60db7dc646` (29 October 2026). The landing candidate retains these exact source and test bytes; its full SHA and Verify receipt are recorded in the handoff. FOLLOW-002 retains main’s partial judgment; replayed boundary, tie-order and production-auth tests add evidence pending a fresh ct judgment. Existing ct judgments and demotions are retained. SEND-008 is a builder completion claim pending guarded landing and ct judgment. EDIT-009 is a builder completion claim with independently filled West and East variable conditions, pending exact-candidate Verify and guarded landing. Field proof register R-3 remains not run and SIGN-006 retains its real-key hold. APPROVE-001 now retains additional saved-rule, parallel-decision and archive assertions; its current partial judgment is preserved rather than accepting the older candidate completion claim.

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 1 | 11 | 0 | 12 |
| Target and push further | 14 | 89 | 48 | 151 |
| All | 15 | 100 | 48 | 163 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HTTP-001` | Authorized domain dispatch | published | partial | `tests/platter.test.mjs` — “HTTP-001 complete authorized domain dispatch journey and native auth, CSRF, roles and revocable agent boundary”: a collection-off mailbox-verified agreement, retained deposit invoice, populated import journal and valid owner-reviewed CSV; explicit member 403 responses for invoice.export, import.preview and import.apply; complete owner-visible state and journal equality plus independent stored client, proposal, revision, approval, acceptance, invoice and import-job equality after each refusal, including identical invoice download content. The same reviewed CSV then succeeds for the owner. | Delivered: Role-bound owner-only invoice/import commands are refused through the harness, whose command helper checks the response. Missing “HTTP-001 complete authorized domain dispatch journey”: Member invoice export and import are refused with the complete proposal/client/invoice state read back unchanged. |
| `ACCESS-001` | Proposal preparation grants | published | partial | `tests/platter.test.mjs` — “HTTP-001 complete authorized domain dispatch journey and native auth, CSRF, roles and revocable agent boundary”; “AI-003 MCP client searches, drafts, reads engagement and queues exact revisions without authority to approve/send/sign/refund”; `src/platter/credentials.ts` | Delivered: A labelled key prepares an attributed draft and revocation ends context access. Missing “ACCESS-001 complete proposal preparation grants journey”: The same permitted sponsor/grant workflow runs under held and all-autonomous company policies with computed classes. |
| `PROP-001` | Approval binds the exact revision | published | partial | `tests/platter.test.mjs` — “PROP-001 / PROP-002 exact approvals, frozen offers and fresh invitations invalidate old authority”; “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied”; `src/platter/commands.ts` | Delivered: Exact revisions govern stale approval, edit invalidation and manager decisions; command helpers check refusals. Missing “PROP-001 complete approval binds the exact revision journey”: The held-policy revision journey reads the complete retained approver, role, rule and time history after the second approval and send. |
| `PROP-002` | Sending freezes the offer | published | partial | `tests/platter.test.mjs` — “PROP-001 / PROP-002 exact approvals, frozen offers and fresh invitations invalidate old authority”; `src/platter/commands.ts` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SIGN-001` | Verified-mailbox acceptance | published | partial | `tests/platter.test.mjs` — “email verification precedes acceptance, code is single-use, immutable option and deposit exported once”; “code attempt limits, resend throttling and revision-bound sessions”; `src/platter/signing.ts` | Delivered: Verification precedes acceptance, a used or exhausted code is refused and resend throttling is exercised. Missing “SIGN-001 complete verified-mailbox acceptance journey”: An unconsumed valid code expires independently of attempt exhaustion; the invitation ceiling and revision-bound cookie security are exercised through a complete verification journey. |
| `SIGN-002` | Immutable acceptance with an integer-cent deposit | published | partial | `tests/platter.test.mjs` — “email verification precedes acceptance, code is single-use, immutable option and deposit exported once”; `src/platter/signing.ts` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `INV-001` | One retained deposit invoice per acceptance | published | partial | `tests/platter.test.mjs` — “money rejects malformed or unsafe prices and cannot export an unaccepted proposal”; “email verification precedes acceptance, code is single-use, immutable option and deposit exported once”; `src/platter/invoices.ts` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `IMPORT-001` | Reviewed client CSV move-in with undo | published | partial | `tests/platter.test.mjs` — “Client CSV dry run, fingerprint custody, journal, replay and undo through HTTP”; “import undo preserves clients with dependent proposals; owner erasure fences unused client”; `src/platter/movein/index.ts` | Delivered: Preview writes nothing, a changed fingerprint is refused, original bytes and replayed job identity are retained, and dependent proposals prevent undo. Missing “IMPORT-001 complete reviewed client csv move-in with undo journey”: Undo is also exercised after an imported client is independently edited, retaining the intervening edit and dependent records. |
| `ERASE-001` | Bounded client erasure | published | partial | `tests/platter.test.mjs` — “import undo preserves clients with dependent proposals; owner erasure fences unused client”; `tests/archive.test.mjs` — “PORT-001 public CLI refuses corrupt and pre-erasure archives and retains accepted money through the later erasure journal” | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `PORT-001` | Validated archives and restore | published | partial | `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences”; “PORT-001 public CLI refuses corrupt and pre-erasure archives and retains accepted money through the later erasure journal”; `src/platter/archive-policy.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `MAIL-001` | Durable proposal mail with honest outcomes | published | done | `src/platter/mail.ts`; `tests/mail.test.mjs` — “MAIL-001 local proposal and verification mail are captured without provider contact”; “MAIL-001 hosted mail commits and claims before provider acceptance; timeout is uncertain and never resent” |  |
| `SITE-001` | Public run site and documentation | published | partial | `tests/site.test.mjs` — “SITE-001 built homepage opens run instructions, Markdown docs work without JavaScript, installed root remains the Lobby” (registered through tests/site-lifecycle.mjs); `scripts/verification/run.mjs`; `src/site/pages.ts` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `EDIT-001` | Branded drag-and-drop proposal editor | target | partial | `tests/site.test.mjs` — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” (registered through tests/site-documents.mjs); `tests/platter.test.mjs`; `tests/archive.test.mjs`; `tests/editor-budget.mjs` — “Forty-page reference proposal with 4x CPU editor and phone client budgets” | Delivered: The document journey builds all block types, applies branding, reorders by keyboard/drag, reloads and compares real PDF order; the separate budget runner defines the reference measurements but has no completed passing run. Missing “EDIT-001 complete branded drag-and-drop proposal editor journey”: The editor and throttled reference-performance journeys have a single recorded acceptance receipt on the same built candidate; the budget job is separate from push Verify. |
| `EDIT-002` | Proposal templates | target | partial | `src/platter/templates.ts`, `src/platter/starter-templates.ts`, `src/platter/ui/templates.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Personal templates and all five built-in starters ship with independent drafts, filled client and sender details, USD pricing tables and exact PDF and archive custody. Shared templates, team-limited folders and durable delivery defaults now ship, with editing rights and live audience checks proved by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”; the named role browser and CLI journeys prove 1440/390 controls and custody. Template payment choices now have explicit controls. New drafts independently copy card and ACH choices, a 30% deposit and net-15 milestone terms with collection off; later template edits affect only future drafts, and proposal edits leave the template unchanged. tests/platter.test.mjs — “EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries” proves these snapshots plus malformed, stale and unauthorized no-write refusals. tests/site.test.mjs — “FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths” proves payment choices beside 2, 5 and 9-day reminders and a 14-day expiry at 1440 and 390 pixels. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves retained choices and a usable restored template with collection off. Gap: general variables, recipient roles, full template-driven payment execution and multiple-recipient reminder execution remain. Versioned document blocks, brand kits, exact media references and the Client field-role binding now survive template starts and public CLI restore, proved by the named EDIT-001 lifecycle, browser and CLI journeys. |
| `EDIT-003` | Reusable content library | target | partial | `tests/platter.test.mjs` — “EDIT-003 linked draft copies propagate atomically while detached, sent and accepted copies retain exact content”; `tests/site.test.mjs` — “EDIT-003 linked and detached library insertion, frozen sending and scoped usage at desktop and phone widths” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | Delivered: The shared library holds text sections, case studies, bios, testimonials, terms, validated images and videos, and USD pricing tables. Team folders, tags and case-insensitive search ship. Media and tables are saved from placed blocks in a proposal the library editor may edit, with explicit consent to its library audience; validated originals are retained independently. Pricing insertion targets a chosen package and recalculates integer-cent totals. Linked changes create unapproved draft revisions atomically, including negotiated drafts; detached copies, sent revisions and accepted content remain frozen. Manual changes permanently detach the affected copy. Usage lists retain only proposals the reader may already view and show copy mode, frozen state and last-change time. The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `EDIT-004` | Variables from client, deal and CRM records | target | partial | `tests/platter.test.mjs` — “EDIT-004 linked deal variables refuse missing values, freeze the sent revision and refill destination copies”; `tests/site-documents.mjs` — “EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads”; `tests/archive.test.mjs` — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority” | Orbit refill requires its scoped contact-read API and a reference instance; the current Orbit public API exposes deal fields but no contact-read door. Connected-deal reads use the conservative owner or admin floor under the standing scope rule; scoped delegation and the Orbit provider boundary remain unproved. No full CRM qualification is claimed. |
| `EDIT-005` | Word and PDF import and export | target | done | `tests/platter.test.mjs` — “EDIT-005 Word import maps tokens and catalog quote rows, keeps editable blocks and splits Heading 1 library sections”; `tests/site-documents.mjs` — “EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads”; `tests/archive.test.mjs` |  |
| `EDIT-019` | Fixed PDF pages with signing fields | target | done | `tests/platter.test.mjs` — “EDIT-005 fixed PDF originals remain exact with a page-three signature and appended selected unsigned pricing”; `tests/site-documents.mjs` — “EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads”; `tests/archive.test.mjs` |  |
| `EDIT-020` | Word and PDF exports | target | done | `tests/platter.test.mjs` — “EDIT-005 Word and PDF exports retain heading styles, four exact table lines, two images and reading order”; `tests/site-documents.mjs` — “EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads”; `tests/archive.test.mjs` |  |
| `EDIT-006` | Embedded rich media | target | partial | `tests/platter.test.mjs` — “EDIT-001 display media requires consent and live edit scope, stays private until placed and keeps exact bytes through copies and templates”; `tests/site.test.mjs` — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | Delivered: Uploaded images and videos, ordered galleries, canonical YouTube, Vimeo, Loom and Wistia video frames, Calendly booking frames and Google Drive PDF previews ship. Uploaded originals stay with the proposal; external content retains its canonical URL and uploaded poster. The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `EDIT-007` | Mobile client review | target | partial | `src/platter/ui/client.ts`, `src/platter/ui/packages.ts`, `src/platter/ui/shared.ts`, `tests/site.test.mjs`, `tests/mobile-client-journey.mjs` | Named EDIT-007 built-browser journeys at 1440 and 390 pixels complete invitation, mailbox verification, conditional package selection, adding an optional item and raising its quantity, comments and immutable acceptance of the selected total and deposit with keyboard-only client interaction and axe WCAG 2.2 AA scans at every step. Verification, comments and refusal pages preserve the reviewed package and optional items, and submission feedback receives keyboard focus. Package review uses a native fragment target to focus a named selection region containing the chosen package, optional-item quantities and exact USD total/deposit, including with application JavaScript disabled. Named EDIT-007 assertions expose current scope, grouped pricing and selection through browser accessibility APIs, correct an out-of-range quantity by keyboard, and download exact attachment bytes and the selected unsigned PDF before accepting. Gap: Stripe test-card payment (PAY-001/PAY-002) and assistive-technology verification of the complete rich-content/payment journey remain; this slice does not establish full WCAG conformity. |
| `EDIT-008` | Custom domain and branded client experience | target | missing |  | Client links use the installation origin with Platter styling. |
| `EDIT-009` | Conditional content by package | target | done | `src/platter/conditional.ts`; `src/platter/variables.ts`; `tests/platter.test.mjs` — “EDIT-009 conditional sections match selected preview, client, PDF and immutable agreement; revisions, copies and negotiations retain rules”, calling regionalConditions in `tests/conditional-journey.mjs`; `tests/site.test.mjs` — “EDIT-009 desktop and phone configure, preview, select, download and accept conditional package sections” (registered through `tests/site-documents.mjs`, calling regionalBrowser in `tests/conditional-browser.mjs`); `tests/archive.test.mjs` — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority”, calling regionalConditions and restoredRegionalConditions in `tests/conditional-journey.mjs` |  |
| `EDIT-010` | Attachments and vendor documents | target | done | `src/platter/attachments.ts`; `src/platter/attachment-commands.ts`; `tests/platter.test.mjs` — “EDIT-010 / TEAM-004 defaults and arbitrary files freeze with approval, download exact bytes and remain in the signed package after replacement”; `tests/site.test.mjs` — “EDIT-010 desktop and phone upload vendor defaults and MSA, download frozen bytes, replace defaults and accept the original package” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` |  |
| `EDIT-011` | Large-proposal performance budget | target | partial | `tests/editor-budget.mjs` — “Forty-page reference proposal with 4x CPU editor and phone client budgets”; `.github/workflows/verify.yml`; `tests/platter.test.mjs` | Delivered: The cited HTTP quantity-edit journey checks server-confirmed totals, retained document content, approval invalidation and bounds/scope/version refusals. Missing “EDIT-011 complete forty-page 4×-CPU performance journey”: after a successful application build, complete the reference editor-to-phone workflow, including a measured drag drop and repainted order, server-confirmed quantity timing, phone LCP/lazy images, PDF page/image counts and the final report of every timing budget. The judged local executions stopped at the drag-drop wait without a completed report; push Verify skips the separately dispatched budget job. No numerical budget exceedance is inferred. |
| `EDIT-012` | Duplicate a proposal for another client | target | partial | `src/platter/duplicate.ts`; `tests/platter.test.mjs` — “EDIT-012 duplicate accepted content into an independent member-owned draft for another client without changing the source”; `tests/site.test.mjs` — “MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Accepted content becomes a separate preparer-owned draft while the original agreement stays frozen; copy and custody journeys cover files, selected prices and approval behavior. Missing “EDIT-012 complete duplicate a proposal for another client journey”: A populated accepted source with payments, all delivery settings and template-assigned recipient slots is copied to another client and every destination binding and cleared lifecycle authority is reconciled. |
| `EDIT-021` | Duplicate lifecycle and file custody | target | partial | `src/platter/duplicate.ts`; `tests/platter.test.mjs` — “EDIT-012 duplicate accepted content into an independent member-owned draft for another client without changing the source”; `tests/site.test.mjs`; `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Independent draft copies and archived content/settings are retained without changing the source. Missing “EDIT-021 complete duplicate lifecycle and file custody journey”: The complete source-state copy journey covers every draft/sent/terminal/negotiation state and company-policy standard-class execution, then reconciles all inherited lifecycle authority. |
| `EDIT-013` | Documents without pricing | target | missing |  | Every proposal requires two priced options; there is no unpriced document type. |
| `EDIT-014` | Client PDF download before signing | target | partial | `src/platter/documents/client-pdf.ts`; `src/platter/documents/offer-pdf.ts`; `tests/platter.test.mjs` — “EDIT-014 / TEAM-004 exact unsigned revision PDF keeps selected prices and every page marked; disabling refuses download without a write”; `tests/site.test.mjs` — “PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | Delivered: Selected money and current unsigned revision marks reach downloaded bytes; disabling downloads removes the browser action and refuses the route. Missing “EDIT-014 complete client pdf download before signing journey”: A multi-page selected-package download visibly identifies its chosen package on every page while retaining the disabled-download boundary. |
| `EDIT-015` | Locked template sections | target | partial | `tests/platter.test.mjs` — “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”; `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `EDIT-016` | Proposal search and folders | target | done | `tests/platter.test.mjs` — “EDIT-016 body phrase search returns exactly three of 500 proposals including an uploaded PDF with live folder permissions”; `tests/site.test.mjs`; `tests/archive.test.mjs` |  |
| `EDIT-017` | Client page in the client's language | target | partial | `tests/mail.test.mjs` — “EDIT-017 Spanish invitation and mailbox code retain authored mail and consume localized code transport”; `tests/platter.test.mjs` — “EDIT-017 Spanish mailbox journey preserves authority, verification limits, authored content and actual certificate language”; `tests/site.test.mjs` and `tests/site-documents.mjs` — “EDIT-017 owner-selected Spanish invitation, verification, consent and completion preserve authored English through the compiled client”; `tests/archive.test.mjs` — “SEND-006 public CLI retains real invitation text, excludes rehearsal content and preserves its test-send audit without invitation authority” | Owner-selected Spanish and English defaults now cover the single-client mailbox journey with collection off, retaining authored text and actual new acceptance and certificate language without historical inference. Gap: French, German and Portuguese, browser-language fallback, full SIGN-003 consumer disclosures, other email events, payment and provider identity screens and configured multi-recipient flows remain. SEND-003 and SIGN-004 retain their own authority-policy Gaps. |
| `EDIT-018` | Client-page preview before sending | target | partial | `src/platter/preview.ts`; `tests/platter.test.mjs` — “EDIT-018 / EDIT-022 member-only exact-revision previews share selection math and never change business state”; `tests/site.test.mjs` — “EDIT-018 desktop and phone preview exact client content, switch widths and select without sending” (registered through tests/site-documents.mjs); “MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | Delivered: Revision banners, preview selection, package conditions, quantity bounds and the sent-page money comparison have real preview/browser journeys. Missing “EDIT-018 complete client-page preview before sending journey”: A complete three-package, tax/deposit/schedule and two-signer preview journey verifies signer-two fields and the same exact subsequently sent selection. |
| `EDIT-022` | Preview isolation and exact approval link | target | partial | `src/platter/preview.ts`; `tests/platter.test.mjs` — “EDIT-018 / EDIT-022 member-only exact-revision previews share selection math and never change business state”; `tests/site.test.mjs`; `tests/archive.test.mjs` Additional replayed proof: `tests/platter.test.mjs` — “EDIT-018 / EDIT-022 member-only exact-revision previews share selection math and never change business state” (disabled submissions, complete unchanged business history, scoped and session refusals); `tests/mail.test.mjs` — “APPROVE-002 explicit requests deliver exact revision previews by email and Slack, bind noted decisions and remind pending approvers once” (emitted manager URL, revision-bound approval and stale refusal); `tests/approval-preview-fixture.mjs` — managerApprovalPreview (independent manager, subject and server-time audit); `tests/site.test.mjs` — “APPROVE-002 email preview and decision links work under a member session at desktop and phone widths” (registered through `tests/site-documents.mjs`); `tests/archive.test.mjs` — “APPROVE-002 / AUTO-003 / FOLLOW-003 public CLI retains notification business history without credentials, queued messages or restored outbound authority” (exact manager preview audit after public CLI restore, without session or invitation authority) | Delivered: Preview submissions are refused and previewing leaves proposal revisions, approvals and outbound/tracking activity unchanged apart from its own audit. Missing “EDIT-022 complete preview isolation and exact approval link journey”: A pending manager follows the exact approval-request preview, an out-of-scope reader sees no content, and that specific preview audit survives public CLI custody without restoring authority. |
| `CAT-001` | Service and product catalog | target | partial | `src/platter/catalog.ts`, `src/platter/catalog-import.ts`, `tests/platter.test.mjs`, `tests/catalog-journey.mjs`, `tests/site.test.mjs`, `tests/catalog-browser.mjs`, `tests/archive.test.mjs` | Native USD catalog items retain name, description, SKU, unit, price, private cost, default recurrence, taxable flag, tax code and income account under the existing owner, admin and manager version guards. Selected image-free fixed-price CSV records become priced items only after a separate owner-only review bound to the exact records and pricing choices. Insertion requires explicit recurring term and start date and copies independent metadata into drafts, templates and sent revisions; ordinary editor saves preserve it. `tests/platter.test.mjs` — “TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals”, extended by `tests/catalog-journey.mjs`, proves 50 reviewed CSV records, explicit promotion, no-write role and stale refusals, private recurring costs, immutable sent prices and metadata, future defaults, one-off tax calculation and explicit refusal of taxed recurrence. `tests/site.test.mjs` — “CAT-001 reviewed CSV promotion and explicit recurring insertion preserve independent defaults”, using `tests/catalog-browser.mjs`, proves promotion, metadata controls and recurring insertion at 1440, with browser proof at 1440 and 390. `tests/archive.test.mjs` — “PRICE-005 public CLI preserves business tax rates and frozen agreements without restoring signing authority” proves exact restored imported records, promotion provenance, defaults and template copies without duplicate promotion; the named TEAM-001 role archive journey retains sent catalog prices and metadata. No imported metadata is charged automatically. Gap: native image editing and rendering, URL-image acceptance and QuickBooks Online, Xero, HubSpot and Salesforce item synchronization remain. Image acquisition requires a qualified Base image-GET egress door with validated public address pinning, original-host TLS, no redirects and 5-MiB image and 20-MiB batch bounds; the recorded POST-only 64-KiB relay does not qualify. Explicit image failure and apply without images remain. Recurring tax and provider tax execution remain held under PRICE-005. |
| `PRICE-001` | USD pricing tables with line items | target | partial | `src/platter/pricing.ts`; `src/platter/ui/pricing.ts`; `tests/platter.test.mjs` — “PRICE-001 / COLLAB-003 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / PROP-001 / TEAM-004 tables recompute twelve grouped lines, preserve every carrier and refuse malformed prices and quantities”; `tests/pricing-journey.mjs` — “PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals” (pricingJourney called by the browser suite); `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `PRICE-002` | Packages and optional items the client chooses | target | partial | `src/platter/selection.ts`; `src/platter/conditional.ts`; `src/platter/paper-acceptance.ts`; `src/platter/ui/paper.ts`; `src/platter/ui/packages.ts`; `tests/platter.test.mjs` — “PRICE-002 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / COLLAB-003 / PORT-002 arbitrary packages and bounded optional quantities share server totals and immutable selection”; `tests/site.test.mjs` — “MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads” (registered through tests/site-documents.mjs); `tests/packages-journey.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `PRICE-003` | One-off and recurring fees | target | done | `tests/platter.test.mjs` — “PRICE-003 recurring fees keep exact schedules, first-year queue value and immutable selected documents”; `tests/recurring-journey.mjs`; `tests/site-documents.mjs` — “PRICE-003 and PRICE-002 recurring line editing, preview, client selection and frozen agreement use the same amounts”; `tests/recurring-browser.mjs` |  |
| `PRICE-004` | Discounts | target | partial | `tests/platter.test.mjs` — “PRICE-004 scoped discounts preserve exact selections, private margins, templates and public PDF and JSON custody”; “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied”; `tests/pricing-journey.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `PRICE-005` | US sales tax | target | partial | `src/platter/taxes.ts`, `src/platter/selection.ts`, `tests/platter.test.mjs` — “PRICE-005 owner tax follows selected quantities and discounts, freezes rates and refuses unsafe writes”; `tests/site-documents.mjs` — “PRICE-005 native owner-configured tax settings, selected quantities and frozen agreement” via `tests/packages-journey.mjs`; `tests/archive.test.mjs` — “PRICE-005 public CLI preserves business tax rates and frozen agreements without restoring signing authority” | Stripe Tax and AvaTax adapters, AvaTax commit on invoice issuance, recurring tax, exemption-certificate custody and accounting tax-code propagation remain unimplemented. Owner-only configuration is the conservative interim authority floor; scoped delegation is not claimed. The named native journeys prove the one-off path; no live provider, filing, exemption or accounting determination is claimed. |
| `PRICE-006` | Internal cost and margin | target | done | `tests/platter.test.mjs` — “TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs”; `tests/platter.test.mjs` — “TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state”; `tests/platter.test.mjs` — “AUTO-004 signed lifecycle webhooks retry, log, redact and stop on revocation”; `tests/site-documents.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”; `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” | |
| `PRICE-007` | Payment terms and schedules on the proposal | target | partial | `tests/platter.test.mjs`; `tests/site.test.mjs` — “MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads” (registered through tests/site-documents.mjs); `tests/packages-journey.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `PRICE-008` | First-release AUD agreements stay exact | target | done | `migrations/core/0017_currency.sql`; `tests/archive.test.mjs` — “PRICE-002 / EDIT-012 / REPORT-001 / PRICE-008 public CLI restores re-exported first-release AUD bytes and new proposals and acceptances use USD without conversion”; `tests/site.test.mjs` — “PRICE-008 legacy AUD agreement and new USD owner/client screens show exact currency at desktop and phone widths” (registered through tests/site-lifecycle.mjs) |  |
| `COLLAB-001` | Real-time team editing | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence. |
| `COLLAB-002` | Internal comments, mentions and assignments | target | done | `tests/mail.test.mjs` — “COLLAB-002 scoped colleagues comment, receive consented generic email and chat, resolve and assign without exposing internal threads to clients”; `tests/site-documents.mjs` — “COLLAB-002 internal comment, resolution and dated assignment work at desktop and phone widths”; `tests/archive.test.mjs` |  |
| `COLLAB-003` | Version history with compare and restore | target | partial | `src/platter/history.ts`; `src/platter/ui/history.ts`; `tests/platter.test.mjs` — “COLLAB-003 every saved revision has an author/time, comparisons highlight changes, restore creates unapproved revision four”; `tests/site.test.mjs` — “PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals” (registered through tests/site-documents.mjs) | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `APPROVE-001` | Approval rules and routing | target | partial | `tests/platter.test.mjs` — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied” proves saved threshold and legal configuration, edit invalidation, both parallel decision orders, rejection and complete unchanged readback after authority refusals; “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP” retains scoped role coverage. `tests/site-documents.mjs` — “APPROVE-002 email preview and decision links work under a member session at desktop and phone widths”, loaded by `tests/site.test.mjs`, proves the existing saved-rule and decision controls at 1440 pixels with the same screens recorded at 390. `tests/archive.test.mjs` — “PRICE-005 public CLI preserves business tax rates and frozen agreements without restoring signing authority” calls savedApprovalArchive to retain the complete policy, named admin and billing rule, exact plan and decisions without restoring member sessions. | Delivered: Value, discount, margin, terms and template rules select sequential/parallel approval steps and invalidate them after edits. Missing “APPROVE-001 complete approval rules and routing journey”: The complete threshold configuration journey covers both parallel completion orders, a rejection and unauthorized approver/rule changes while retaining the exact saved rule configuration. |
| `APPROVE-002` | Approval requests that reach the approver | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Nook and mobile push, automatic next-step request creation, integrated notification settings and request controls, complete trigger details and a chat-native decision interaction remain. Conservative default adopted  Uncertain delivery is held without automatic retry. Future Nook, MOB-002, COLLAB-002 and SEND-005 carriers inherit these authority and custody obligations. |
| `APPROVE-003` | Who approves, who sends and what needs approval | target | partial | `tests/platter.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”; `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (registered through tests/site-documents.mjs); `tests/archive.test.mjs` | Delivered: Sales and manager flows exercise scoped send/approve decisions and policy-controlled proposal approval. Missing “APPROVE-003 complete who approves, who sends and what needs approval journey”: The full no-rule owner/admin/manager decision matrix and authorized policy-edit history run together, including out-of-team no-change refusals and unruled sending without a fabricated approval. |
| `APPROVE-004` | Approval reevaluation on the exact revision | target | partial | `tests/platter.test.mjs` — “APPROVE-001 gross value and 20% discount require manager then owner; margin, payment-term and template conditions skip only when satisfied”; `tests/site.test.mjs`; `tests/archive.test.mjs` | Delivered: Gross value and discount rules invalidate prior approval after edits; legal/terms conditions and ordered steps are exercised. Missing “APPROVE-004 complete approval reevaluation on the exact revision journey”: The evaluator journey covers maximum optional quantities, currency-preserving facts, first-draft legal comparison and tied/parallel ordering, then proves agent commitment decisions under both company policies. |
| `SEND-001` | Send from the firm's own mailbox | target | partial | `tests/mail.test.mjs` — “SEND-001 / SEND-011 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail”; `tests/site.test.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-011` | Inbound client reply custody | target | partial | `tests/mail.test.mjs` — “SEND-001 / SEND-011 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail”; `tests/site.test.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-002` | Delivery status and bounce handling | target | partial | `src/platter/delivery.ts`; `src/platter/ui/delivery.ts`; `tests/mail.test.mjs` — “SEND-006 / SEND-002 / SEND-012 signed provider delivery, durable sender notice and actionable address correction”; “SEND-002 / SEND-012 SendGrid signed correlation, queued state, uncertainty and logged dismissal”; `tests/site.test.mjs` — “SEND-002 desktop and phone show provider delivery and preserve bounce notice until explicit correction” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-012` | Bounce correction follow-up | target | partial | `src/platter/delivery.ts`; `src/platter/ui/delivery.ts`; `tests/mail.test.mjs` — “SEND-006 / SEND-002 / SEND-012 signed provider delivery, durable sender notice and actionable address correction”; “SEND-002 / SEND-012 SendGrid signed correlation, queued state, uncertainty and logged dismissal”; `tests/site.test.mjs` — “SEND-002 desktop and phone show provider delivery and preserve bounce notice until explicit correction” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “SEND-002 public CLI preserves bounce follow-ups and logged action without provider events or invitation credentials” | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-003` | Recipients, roles and sharing | target | partial | `tests/platter.test.mjs` — “SEND-003 separately verified roles, removed viewers and unfilled template slots through HTTP”; `tests/site.test.mjs`; `tests/archive.test.mjs` | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-004` | Expiry and reopening | target | partial | `src/platter/expiry.ts`; `src/platter/expiry-time.ts`; `tests/platter.test.mjs` — “SEND-004 / SEND-013 / TEAM-004 calendar expiry warns unsigned only, supports same-link reopening and reissue, and never expires accepted agreements”; `tests/site.test.mjs`; `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `SEND-013` | Unsigned-recipient expiry warnings | target | partial | `src/platter/expiry.ts`; `src/platter/expiry-time.ts`; `tests/platter.test.mjs` — “SEND-004 / SEND-013 / TEAM-004 calendar expiry warns unsigned only, supports same-link reopening and reissue, and never expires accepted agreements”; `tests/site.test.mjs`; `tests/archive.test.mjs` | Delivered: Unsigned-recipient warning timing, changed dates and repeat processing are exercised with accepted offers excluded. Missing “SEND-013 complete unsigned-recipient expiry warnings journey”: A complete multi-recipient warning journey spans unsigned and already-signed recipients, date extension and uncertain delivery, then restores warning history/settings without transport authority. |
| `SEND-005` | Completion and activity notifications | target | partial | `tests/mail.test.mjs`, `tests/archive.test.mjs` | Decline and failed-payment events, personal Teams, Nook and push carriers, and settings controls with desktop and phone proof remain. Only explicitly consenting current scoped people receive generic events and protected links; view alerts additionally require current owner opt-in for that revision; preferences bind the exact proposal revision, direct Slack destinations must be verified for that person, and restoration does not activate sending. Existing APPROVE-002 and AUTO-003 consent and custody obligations remain. |
| `SEND-006` | Editable subject, message and shared email templates | target | partial | `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Shared reminder-message defaults and proposal-template choices now ship, with owner/admin management, copied text, member locks and explicit supported-variable filling proved by tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority”. Loading a message is review only and disables the schedule until fresh authorization; recipient first names are sender-supplied and are not copied to other-client drafts. A selected message keeps its copied source version; current locks are rechecked on member edits. Only reminder mail uses these shared-message controls today. Gap: shared/default/locked templates and variable filling for other email events, editable invoice/expiry/withdrawal/completion messages and a complete agreement package remain. |
| `SEND-014` | Private rehearsal email | target | partial | `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Shared reminder-message defaults and proposal-template choices now ship, with owner/admin management, copied text, member locks and explicit supported-variable filling proved by tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority”. Loading a message is review only and disables the schedule until fresh authorization; recipient first names are sender-supplied and are not copied to other-client drafts. A selected message keeps its copied source version; current locks are rechecked on member edits. Only reminder mail uses these shared-message controls today. Gap: shared/default/locked templates and variable filling for other email events, editable invoice/expiry/withdrawal/completion messages and a complete agreement package remain. |
| `SEND-007` | Replace an unsigned signer on a sent proposal | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Gap: The SIGN-004 HTTP and compiled-browser journeys now prove replacement at position 2, preserving earlier signatures and order, refusing duplicate participant mailboxes and retaining the replacement in the certificate. The owner-only configured-recipient authority default remains policy not yet ruled where noted in RULINGS under SIGN-004 and SEND-003. SIGN-006’s government ID and explicitly selected link-only methods and their replacement journeys remain required. The single-recipient mailbox or SMS requirement and the configured-recipient mailbox requirement are retained; these proofs do not establish the full original journey. SEND-007 remains partial. |
| `SEND-008` | Sending and reminders by text message | target | done | `tests/mail.test.mjs` — “SEND-008 explicit SMS consent, signed delivery callbacks, HELP and STOP preserve independent email reminders” (calls `tests/sms-completion-journey.mjs` — completionSmsJourney and `tests/sms-reenable-journey.mjs` — smsReenableJourney and smsDisabledJourney); “SEND-008 quiet hours defer manual SMS and SEND-010 withdrawal atomically cancels queued texts without duplicate transport”; “SEND-008 rotated invitations, lost sender scope and uncertain SMS outcomes cannot replay sending authority”; “SIGN-006 SMS verification limits wrong codes and SIGN-005 certificates retain the actual method and exact signed PDF hash”; “SEND-005 personal Slack and email preferences deliver client open, comment, signature and payment events once through scoped links”; `tests/site.test.mjs` — “SIGN-006 SMS-code verification and SIGN-005 signed downloads work in the compiled client at desktop and phone widths” (calls `tests/sms-installer-journey.mjs` — smsInstallerJourney and `tests/sms-reenable-browser.mjs` — smsReenableBrowser); `tests/archive.test.mjs` — “APPROVE-002 / AUTO-003 / FOLLOW-003 public CLI retains notification business history without credentials, queued messages or restored outbound authority” |  |
| `SEND-009` | Reusable public signing link | target | missing |  | Every proposal has one invited recipient; there is no public link or embeddable form. |
| `SEND-010` | Withdraw a sent proposal | target | partial | `src/platter/withdrawal.ts`; `tests/platter.test.mjs` — “SEND-010 / SEND-015 / FOLLOW-009 withdrawal revokes every current public door, preserves history, notifies optionally and reissues only with approval”; `tests/site.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` | Delivered: Withdrawal revokes live offers, closes questions/follow-ups and cancels pending outbound work; browser and recipient helpers read the revoked state. Missing “SEND-010 complete withdraw a sent proposal journey”: A complete withdrawn-offer journey reconciles every recipient door and unpaid payment link with email/text reminders and all correction/expiry work, without affecting an accepted agreement. |
| `SEND-015` | Withdrawal receipt and approved reissue | target | partial | `src/platter/withdrawal.ts`; `tests/platter.test.mjs` — “SEND-010 / SEND-015 / FOLLOW-009 withdrawal revokes every current public door, preserves history, notifies optionally and reissues only with approval”; `tests/site.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Withdrawal history and optional notices retain the old offer while explicit approval creates a new revision. Missing “SEND-015 complete withdrawal receipt and approved reissue journey”: The receipt/reissue journey reconciles partially signed void history, optional per-recipient notices, exact entered reason in timeline/audit, report totals and every old link after reissue and restore. |
| `TRACK-001` | View tracking and live open alerts | target | partial | `tests/platter.test.mjs` — “TRACK-001 opted-in views retain trusted coarse location, verification and device with quiet-period owner alerts”; `tests/followup-journey.mjs`; `tests/site-lifecycle.mjs` — “TRACK-001 / TRACK-004 owner consent, private alerts, client disclosure and erasure at desktop and phone widths”; `tests/archive.test.mjs` | Delivered: Opted-in records keep trusted coarse location and device facts with quiet-period owner alerts. Missing “TRACK-001 complete view tracking and live open alerts journey”: A two-recipient sender-timeline journey displays both city/region/country/device records at desktop and phone widths and checks the quiet return-visit alert alongside those displayed facts. |
| `TRACK-002` | Section-level reading analytics | target | done | `tests/platter.test.mjs` — “TRACK-002 reading events retain monotonic section times and validated package choices on the exact view”; `tests/tracking-details-browser.mjs` — “TRACK-001 and TRACK-004 client disclosure, first-party measurement and private owner controls work at desktop and phone widths”; `tests/followup-journey.mjs` — followupJourney; `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” |  |
| `TRACK-003` | Forwarded stakeholder identification | target | partial | `tests/platter.test.mjs`, `tests/tracking-details-browser.mjs` | A forwarded viewer explicitly supplies a name and a different mailbox, consents to sharing, receives a bounded single-use code and verifies that mailbox. The owner sees the verified stakeholder and can explicitly record an approver recipient. This minimal SEND-003 door grants no invited-recipient signing authority and sends no new recipient invitation. Gap: Automatic new-device and new-network prompting remains; no fingerprint is stored. Full SEND-003 separate recipient invitations and operational approver delivery and decisions remain. Policy default adopted policy not yet ruled where noted in RULINGS: explicit viewer identity-sharing consent, owner-only stakeholder visibility and conversion, and no automatic outbound invitation or signing authority. |
| `TRACK-004` | Tracking disclosure and privacy limits | target | partial | `tests/platter.test.mjs` — “TRACK-004 disclosure, bounded retention and explicit erasure respect holds and owner authority”; `tests/site-lifecycle.mjs` — “TRACK-001 / TRACK-004 owner consent, private alerts, client disclosure and erasure at desktop and phone widths”; `tests/archive.test.mjs` | Delivered: Disclosure, bounded retention and explicit erasure respect holds and operator authority. Missing “TRACK-004 complete tracking disclosure and privacy limits journey”: A client-network privacy journey inventories outbound hosts during ordinary viewing and confirms no third-party request while checking stored IP minimization and retention. |
| `FOLLOW-001` | Scheduled reminders to unsigned recipients | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Sender-authorized scheduled reminders exist. Multiple unsigned recipients, every creation door, audit/timeline custody and opt-out persistence across revisions still need proof under RL-101; policy adoption certifies no implementation. |
| `FOLLOW-008` | Manual unsigned-recipient reminders | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Sender-authorized scheduled reminders exist. Multiple unsigned recipients, every creation door, audit/timeline custody and opt-out persistence across revisions still need proof under RL-101; policy adoption certifies no implementation. |
| `FOLLOW-002` | Next-action follow-up queue by sales owner | target | partial | `tests/platter.test.mjs` — “FOLLOW-002 / FOLLOW-009 / FOLLOW-010 sales queue orders current reasons and separates notification, logged completion, correction and withdrawal”, calling followupJourney and followupBoundaryJourney in `tests/followup-journey.mjs`: original engaged and unavailable seven-proposal orders, recorded-owner personal midnights immediately before and after in New York and Honolulu for both readers, value then first-send then stable-ID ties, missing legacy send times, separate USD and AUD totals, scoped refusals and lifecycle readback; `tests/platter.test.mjs` — “PRICE-003 recurring fees keep exact schedules, first-year queue value and immutable selected documents”, calling `tests/recurring-journey.mjs`: one-off plus first-year valuation; `tests/site.test.mjs` loads `tests/site-lifecycle.mjs` — “MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting”: compiled production queue, periods, exact ordered IDs and currency readback at 1440, with queue browser proof at 1440 and 390; `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences”: exact retained open and completed actions. | Delivered: The seven-proposal fixture shows exact engaged/unavailable ordering, due periods, reasons and per-currency totals through followupJourney. Missing “FOLLOW-002 complete next-action follow-up queue by sales owner journey”: The queue journey crosses each recorded owner’s personal-zone boundary and resolves equal-date/reason sent-time/proposal-number ties without combining currencies. |
| `FOLLOW-009` | Follow-up lifecycle and action history | target | partial | `src/platter/followup/queue.ts`; `src/platter/followup/commands.ts`; `tests/followup-journey.mjs`; `tests/platter.test.mjs` — “FOLLOW-002 / FOLLOW-009 / FOLLOW-010 sales queue orders current reasons and separates notification, logged completion, correction and withdrawal”; `tests/site.test.mjs` — “MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Notify leaves work open, logged completion preserves separate bounce correction, reason-free dismissal fails, and explicit rescheduling reopens an action. Missing “FOLLOW-009 complete follow-up lifecycle and action history journey”: A complete lifecycle-and-custody journey reconciles creation/revision, acceptance/decline/withdrawal, unanswered questions and exact action/reason/actor/time history after restore without transport authority. |
| `FOLLOW-010` | Follow-up reporting and team visibility | target | partial | `src/platter/followup/queue.ts`; `src/platter/followup/commands.ts`; `tests/followup-journey.mjs`; `tests/platter.test.mjs` — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”; `tests/site.test.mjs` — “MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` | Delivered: Due filters, sorting and totals have populated pipeline and compiled queue journeys. Missing “FOLLOW-010 complete follow-up reporting and team visibility journey”: The same thirty-proposal due fixture is reconciled under current sales-owner and manager/team scopes after ownership and membership changes at both browser widths. |
| `FOLLOW-003` | Expiry and renewal notifications | target | partial | `tests/mail.test.mjs` | Recorded sender notices and dated follow-ups exist. Default-on execution without separate activation, watchers/preferences, template and sender settings, declined-offer proof and actual renewal offers remain unproved; stored thirty-day settings do not execute renewals. RL-102 resolves the policy, without changing partial status. |
| `FOLLOW-004` | Client questions and comments | target | partial | `src/platter/questions.ts`; `src/platter/question-replies.ts`; `src/platter/ui/questions.ts`; `tests/mail.test.mjs` — “FOLLOW-004 verified client questions, native answers and one-use authenticated owner email replies”; `tests/site.test.mjs` — “MOB-001 / FOLLOW-004 invited client asks exact sent sections; owner queue answers and agreement retains threads on desktop and phone” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Section questions, native answers and authenticated one-use email replies retain threads and exact notifications; browser and archive journeys cover those retained conversations. Missing “FOLLOW-004 complete client questions and comments journey”: An agent’s external-class answer completes the same thread/notification workflow under held and all-autonomous company policies within its sponsor’s scope. |
| `FOLLOW-005` | Decline reasons and won or lost outcomes | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | `tests/platter.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval” (Budget decline, HubSpot Closed lost fake, link revocation, follow-up closure, reopen and reapproval, configured reasons, won override, exact consent and stage-only holds); “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership” (scoped reporting); `tests/site.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision” (1440 and 390 screens); `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (exact custody without execution authority) |
| `FOLLOW-006` | Default reminder schedule and expiry from the workspace and templates | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs` | Editable inherited snapshots exist. Full bulk/public-link/payment creation coverage, independent schedule authority, timeline/audit and opt-out-across-revision proof remain; RL-101 resolves execution policy. |
| `FOLLOW-011` | Delivery snapshots across proposal creation | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs` | Editable inherited snapshots exist. Full bulk/public-link/payment creation coverage, independent schedule authority, timeline/audit and opt-out-across-revision proof remain; RL-101 resolves execution policy. |
| `FOLLOW-007` | Unattended CRM synchronization with a scoped grant | target | missing |  | No unattended scoped-grant execution exists. ct must specify its consent, scope and public-door assertions; FOLLOW-005’s exact-revision stage-map consent remains the interim boundary. |
| `NEG-001` | Negotiated revisions after sending | target | done | `src/platter/negotiation.ts`; `tests/platter.test.mjs` — “NEG-001 negotiated offer requires exact approval, preserves the live offer until send, compares changes and accepts revision two”; `tests/site.test.mjs` — “NEG-001 desktop and phone negotiate, approve, send and accept the changed offer with client comparison” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` |  |
| `NEG-002` | Client-suggested text edits | target | done | `src/platter/suggestions.ts`; `tests/platter.test.mjs` — “NEG-002 / TEAM-004 opt-in tracked terms edits accept one/reject one into revision two, preserve offer and require fresh approval”; `tests/site.test.mjs` — “NEG-002 desktop and phone client suggests two terms edits; firm accepts one, rejects one and sends revision two” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` |  |
| `SIGN-003` | ESIGN and UETA electronic signature | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | Typed Client signature blocks retain explicit adoption with the accepted name and consent. Gap: consumer disclosure, withdrawal, drawn/uploaded signatures, initials and additional signer roles remain. |
| `SIGN-004` | Multiple signers, signing order and countersignature | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Policy default adopted under the standing scope rule, policy not yet ruled where noted in RULINGS: only the current owner configures roles, sends or replaces configured recipient invitations and countersigns; each recipient verifies their own mailbox. Additional viewing links require explicit audited consent, including the exact framing origin when embedded. Restoring records restores no invitation or framing authority. Scoped non-owner sending and replacement remain outside this interim boundary, and provider-specific recipient checks remain SIGN-006 work. SIGN-004 stays PARTIAL until ct approves the authority default; no legal or provider qualification is claimed. |
| `SIGN-005` | Signed agreement PDF and certificate of completion | target | partial | New single-client signatures retain their actual verification method and verification time when recorded. Immutable signed PDFs and method-bearing certificates are downloadable through scoped person and verified-client doors, with matching SHA-256. `tests/mail.test.mjs` — “SIGN-006 SMS verification limits wrong codes and SIGN-005 certificates retain the actual method and exact signed PDF hash” proves both parties’ identical bytes, certificate hash, actual SMS and mailbox methods and refusal without verification. The named SIGN-006 compiled browser journey in `tests/site.test.mjs` proves signed downloads at 1440 and 390. The named notification business-history public CLI journey in `tests/archive.test.mjs` retains exact certificate and document bytes and completion references without restoring invitations, outbox rows or completion execution grants. New mailbox-verified single-client completions with collection off atomically queue both parties’ completion mail with durable references to the same immutable PDF and certificate. `tests/mail.test.mjs` — “SIGN-005 completion mail attaches the retained PDFs to both parties once, through installation and connected mailbox transports” proves attachment byte equality with scoped downloads and the certificate digest, concurrent dispatch exclusion, repeated acceptance, stale and unverified refusals, owner credential revocation during mailbox refresh, and uncertainty without replay through Resend, SendGrid, Cloudflare, Gmail and Microsoft network-edge fakes and local capture. The same journey now completes a two-signer client and firm agreement on each transport, compares each party’s downloads and decoded mail attachments with the retained document and certificate, recomputes the hash, refuses wrong-party and out-of-order attempts, and proves repeated decisions and concurrent dispatch send no duplicate. The named SIGN-004 browser journey proves each signer’s completion downloads and retained completion references; the named SEND-006 public CLI journey restores the identical multi-party artifacts and references without an outbox or execution grant. Completion uses the final recipient plan after any unsigned-signer replacement, and sends the firm one copy when it also signs. The signed PDF now lists every retained signature or client approval. New signing facts retain each signer’s reported user agent and only coarse trusted edge location, never caller-supplied location or raw addresses. The same mail journey verifies both signers’ facts and certificate text; the EDIT-017 historical journey preserves absent historical facts. `tests/mail.test.mjs` — “SEND-005 personal Slack and email preferences deliver client open, comment, signature and payment events once through scoped links” now proves that a required deposit releases exact PDF and certificate attachments only after both confirmed provider success and exact client authorization, with unverified or mismatched authorization refused and reconciliation unable to duplicate completion mail. Original signing grants remain local and restoration cannot mint a replacement grant. | Full agreement, vendor and client-upload attachment packaging and live-provider qualification remain. EDIT-010’s current download-only boundary for original attachment bytes is preserved; no new provider disclosure is authorized here. The pinned Managed relay does not support attachments; completion mail on that transport remains held without a send. External-store archiving for configured or payment-gated completions and provider qualification remain with AUTO-002. Missing historical methods are never inferred; historical missing location and user agent remain labelled not recorded. This prerequisite remains PARTIAL. |
| `SIGN-006` | Signer identity options | target | partial | `tests/mail.test.mjs` — “SEND-008 explicit SMS consent, signed delivery callbacks, HELP and STOP preserve independent email reminders”; “SEND-008 quiet hours defer manual SMS and SEND-010 withdrawal atomically cancels queued texts without duplicate transport”; “SEND-008 rotated invitations, lost sender scope and uncertain SMS outcomes cannot replay sending authority”; “SIGN-006 SMS verification limits wrong codes and SIGN-005 certificates retain the actual method and exact signed PDF hash”; `tests/site.test.mjs` — “SIGN-006 SMS-code verification and SIGN-005 signed downloads work in the compiled client at desktop and phone widths”; `tests/archive.test.mjs` — “APPROVE-002 / AUTO-003 / FOLLOW-003 public CLI retains notification business history without credentials, queued messages or restored outbound authority” | Government ID verification through Stripe Identity or Persona, link-only signing with forwarded-device and network escalation, multiple signer roles, sender method-selection controls remain. The named SEND-008 journeys prove owner-only safe re-enablement through current authenticated provider eligibility, new recipient assent, an audited suppression change and a fresh exact invitation binding; ordinary START and replayed receipts cannot reactivate it. The named SMS journey proves the native SIGN-001 code limits and exact verification binding. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps inherited from SEND-008. All original target and acceptance points remain required. The clause remains partial. Native fake-edge proof now includes complete assent facts, all-purpose suppression, daylight-saving rechecks and every SIGN-001 identity-code limit. These proofs establish no live-provider or legal qualification. The recorded real Stripe and Twilio key hold remains unchanged. |
| `SIGN-007` | Fields collected at acceptance | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Client-assigned text, date and checkbox fields enforce required values at acceptance; typed signature blocks adopt the same acceptance name. Values freeze with the agreement and survive the public CLI. Evidence: tests/platter.test.mjs — “EDIT-001 Client-assigned required fields and typed signature blocks validate at signing and freeze exact values with the selected agreement”, tests/site.test.mjs — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” and tests/archive.test.mjs — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority”. Gap: recipient roles beyond Client, file collection, invoice/CRM propagation and certificate listing remain. |
| `SIGN-008` | Acceptance on the client's own paper | target | partial | `src/platter/paper-acceptance.ts`; `src/platter/paper-record.ts`; `tests/platter.test.mjs` — “SIGN-008 / TEAM-004 owner records a client-signed copy as accepted by upload, distinct from e-signature, then exports the deposit”; `tests/site.test.mjs` — “MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads” (registered through tests/site-documents.mjs) | Delivered: A client-signed file is retained as an attested upload with signer/date and a matching deposit invoice, distinct from electronic verification. Missing “SIGN-008 complete acceptance on the client's own paper journey”: The upload-acceptance journey produces and exposes the client-facing deposit request after the attested agreement, beyond owner invoice export. |
| `SIGN-009` | Recipient delegation of signing | target | missing |  | One fixed client signer; no delegation. |
| `SIGN-010` | In-person signing on the firm's device | target | missing |  | Signing happens only from the client's own emailed link. |
| `SIGN-011` | Template recipient roles, field assignment and signing order | target | missing |  | No templates, recipient roles or field assignments; one client recipient per proposal. |
| `SIGN-012` | Recipient-role snapshots across creation | target | missing |  | No templates, recipient roles or field assignments; one client recipient per proposal. |
| `PAY-001` | Stripe card and ACH collection in the proposal | target | partial | `tests/stripe-sandbox.mjs`, `tests/collection-browser.mjs`, `tests/instrument-scan.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs` | USD collection uses Stripe Payment Element only after explicit preparation consent and a verified current signature. Exact one-time amount authorization is audited before confirmation; the provider account, accepted revision, deposit, currency, method and billing-state quote stay bound. Card and bank details stay in Stripe frames. Unknown and prohibited billing states and ACH have no card fee. Collection starts only after signing, so unsigned withdrawal releases no Stripe client secret. Gap: Apple Pay and Google Pay test-wallet payments (Stripe reports no available wallet in the headless test browser; they need a device with a configured wallet) and a browser Financial Connections instant-verification journey remain unproved. Bank verification is proved only by the micro-deposit path driven through Stripe’s test API. PAY-003, PAY-005 and PAY-008 inherit exact account, amount, revision and explicit authorization binding; this one-time authorization grants no future charge. |
| `PAY-002` | Deposit or partial payment at acceptance | target | partial | `tests/collection-browser.mjs`; `tests/stripe-sandbox.mjs`; `tests/platter.test.mjs`; `tests/site.test.mjs` — “deposit collection settings, retained signatures, required and due completion at desktop and phone widths” (registered through tests/site-documents.mjs) | Delivered: Required-payment and due-payment collection helpers distinguish waiting from accepted agreement state after a failed card attempt. Missing “PAY-002 complete deposit or partial payment at acceptance journey”: The due-payment journey reads the exact outstanding deposit after the declined payment and then reconciles its successful collection without changing accepted terms. |
| `PAY-003` | Milestone and recurring payment schedules | target | missing |  | PRICE-007 retains informational schedules; authorized milestone and recurring charge execution remains absent. |
| `PAY-004` | Paid, pending, failed, refunded and disputed states | target | missing |  | No payment states. |
| `PAY-005` | Failed-payment retries and notices | target | missing |  | No retries or notices. |
| `PAY-006` | Refunds and disputes | target | partial | `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Verified Stripe refunds retain reasons, idempotent bounds and uncertain holds. Dispute preparation, exact packet authorization, explicit once-only submission and Stripe receipt remain distinct (RL-4). Missing: accounting credits; full SIGN-005 certificates and attachments, TRACK-001 views and PAY-001/PAY-002 authorization artifacts in the evidence pack; company-policy execution within the agent sponsor’s financial role and grant. Uncertain refunds and submissions require provider reconciliation. |
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
| `CRM-001` | HubSpot two-way deal sync | target | partial | `tests/platter.test.mjs` — “CRM-001 reviewed HubSpot deal drafts retain exact prices and provenance and refuse changed source or authority without writes”, extended by `tests/hubspot-sync-journey.mjs`, covers exact rows, reviewed outbound amounts and custom status and protected-link fields, Closed won, four distinct timeline notes after recorded full payment, current authority, changed destination refusals and uncertainty without replay. `tests/site.test.mjs` loads `tests/site-documents.mjs` — “CRM-001 native reviewed HubSpot deal creates an independent collection-off draft with exact priced rows”, extended by `tests/hubspot-browser.mjs`, covers Settings review and apply, signed card launch to another deal and linked status at 1440 and 390. `tests/archive.test.mjs` — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority”, extended by `tests/hubspot-archive.mjs`, retains exact source, consent and receipt history while excluding reviews, card credentials and execution authority. | Conservative standing-scope default: only current owners and admins read or start connected-deal drafts or authorize one explicitly reviewed outbound snapshot. Broader member and delegated access, ct approval of the expanded authority default and unattended lifecycle synchronization under FOLLOW-007 remain. The modern HubSpot card source and signed backend are present, but installed-app rendering, actual account scopes and live-provider qualification need a HubSpot account, installed app and client credentials not supplied to this run. Timeline activity uses notes; custom app events are not qualified. Added or removed source rows and optional, recurring, discounted or taxed prices are explicitly held for manual preparation. Existing FOLLOW-005 stage-only consent and uncertainty riders remain unchanged; no standing grant is created. |
| `CRM-002` | Salesforce two-way opportunity sync | target | missing |  | No Salesforce connection. |
| `CRM-003` | Orbit two-way deal sync | target | missing |  | No Orbit connection. |
| `CRM-004` | Pipedrive and Zoho CRM sync | target | missing |  | No Pipedrive or Zoho connection. |
| `AUTO-001` | Status-driven automations | target | missing |  | No automations. |
| `AUTO-002` | Completed documents archived to file storage | target | partial | `tests/platter.test.mjs` — “AUTO-002 completed agreements archive exact PDFs once under explicit current Drive authority and reconcile uncertain writes without replay” proves the Google Drive network-edge fake through public configuration and real mailbox-verified single-client completion with collection off, exact immutable PDF and certificate bytes and hashes, configured filenames and client folders, concurrent once-only dispatch, current authority and connection refusals, and read-only reconciliation of uncertain uploads. `tests/site-documents.mjs` — “AUTO-002 Settings authorizes Drive archiving and shows completed and held jobs with safe reconciliation” proves the native Settings controls and completion history. `tests/archive.test.mjs` — “AUTO-002 public CLI retains exact document archive history and artifacts without restoring credentials or execution authority” proves byte-identical restored downloads and historical jobs without credentials, grants, replay or client invitation authority, including after fresh authorization for future completions. | OneDrive, SharePoint, Box, Chest, full agreement attachments, payment-gated completion, configured multi-recipient completion and live-provider qualification remain. Conservative owner and admin authorization default: explicit verified account, destination folder and naming pattern; configuration, connection and authorizing role versions checked before each request; uncertain writes held without automatic replay. Restores confer no credentials or execution authority. SEND-003 and SIGN-004 retain their recorded authority holds. |
| `AUTO-003` | Team chat notifications | target | partial | `tests/mail.test.mjs` | Nook, broader proposal events, channel settings screens and chat-native approval interactions remain. Conservative default adopted  Restored routes require explicit reconnection and new consent. Future Nook and COLLAB-002 event sources inherit these obligations. |
| `AUTO-004` | Public REST API and webhooks | target | partial | `src/platter/api/index.ts`, `src/platter/api/webhooks.ts`, `tests/platter.test.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs` | The ct demotion remains in force pending fresh acceptance of the corrected public status and analytics, negotiated revision events, all ten receiver deliveries and independently expected documented scopes. Exact-candidate Verify and guarded landing receipts remain pending; AUTO-004 must remain partial until ct accepts. |
| `AUTO-005` | Zapier, Make and Crank apps | target | missing |  | No automation-platform apps. |
| `HAND-001` | Accepted-scope handoff to delivery tools | target | missing |  | No delivery handoff. |
| `HAND-002` | Handoff to Gauge with budget and rates | target | missing |  | No Gauge handoff. |
| `RENEW-001` | Bulk proposal creation and sending | target | missing |  | No bulk sending. |
| `RENEW-002` | Renewal proposals from accepted agreements | target | missing |  | No renewals. |
| `REPORT-001` | Proposal pipeline dashboard | target | partial | `src/platter/pipeline.ts`; `src/platter/ui/pipeline.ts`; `tests/platter.test.mjs` — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”; `tests/site.test.mjs`; `tests/archive.test.mjs` | Delivered: Thirty populated proposals reconcile field filters, ordering, counts and currency totals without reassigning the recorded owner. Missing “REPORT-001 complete proposal pipeline dashboard journey”: The complete report-rights journey includes content/revenue specialists once those report capabilities exist, with each role’s exact visible report set. |
| `REPORT-002` | Win rate and sales performance | target | missing |  | No conversion reporting. |
| `REPORT-003` | Content and pricing performance | target | missing |  | No content analytics. |
| `REPORT-004` | Booked, billed and collected revenue | target | partial | `src/platter/reports/recorded-revenue.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | The recorded-revenue pipeline shows booked signed value, booked one-off and first-year values from immutable accepted PRICE-003 fee snapshots, explicitly received payments, confirmed refunds, net received, unconfirmed refunds and exported deposit CSV value, separately by currency and recorded sales owner. Independent inclusive date ranges select bookings by UTC acceptance date and collections by the recorded receipt date. A row remains when either selected booking or selected receipt exists; booking values outside their range are zero. Refunds reduce the selected receipts. Linked receipts without a recorded receipt date appear only without receipt-date bounds; no provider payment date is inferred. Exported deposit CSV value follows the booking period and is never labelled a paid provider invoice. Owner, admin and billing see all; manager and viewer see teams; sales sees own; content editors receive no revenue facts. Agent reads carry standard and follow company policy within the sponsor’s report role and grant; this class and policy path remains unproved. `tests/platter.test.mjs` — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves the $2,500 setup plus $1,200 monthly agreement, $16,900 first-year value for both twelve and twenty-four installments, separate quarters with hand-computed filtered totals, inclusive dates, historical currency isolation, each role, immutable acceptance retries, invalid-filter no-write refusals, matching CSV and once-only scheduled email. `tests/site.test.mjs` — “REPORT-004 booked snapshots and independent receipt periods export and schedule the visible report” proves native date, owner and currency controls, visible values, matching CSV and saved schedule filters, with the changed screen at 1440 and 390. `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves identical restored filtered and all-period rows, totals, CSV and schedule filters. Gap: MRR, provider invoiced and overdue amounts, accounting reconciliation with the QuickBooks fake, and charge and invoice execution remain. The assigned native reporting points do not establish live-provider proof or clear the existing real-key holds. |
| `REPORT-005` | Report export and scheduled delivery | target | partial | `src/platter/reports/schedules.ts`; `src/platter/reports/pipeline-csv.ts`; `src/platter/reports/zone.ts`; `tests/platter.test.mjs` — “FOLLOW-005 / EDIT-016 / REPORT-005 / REPORT-006 / FOLLOW-002 / TEAM-004 pipeline exports to CSV as filtered and emails weekly to two named people with the screen figures”; `tests/site.test.mjs` — “REPORT-005 / REPORT-006 desktop and phone export the filtered pipeline CSV and schedule weekly email in the installation time zone” (registered through tests/site-lifecycle.mjs) | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `REPORT-006` | Scheduled report delivery | target | partial | `src/platter/reports/schedules.ts`; `src/platter/reports/pipeline-csv.ts`; `src/platter/reports/zone.ts`; `tests/platter.test.mjs` — “FOLLOW-005 / EDIT-016 / REPORT-005 / REPORT-006 / FOLLOW-002 / TEAM-004 pipeline exports to CSV as filtered and emails weekly to two named people with the screen figures”; `tests/site.test.mjs` — “REPORT-005 / REPORT-006 desktop and phone export the filtered pipeline CSV and schedule weekly email in the installation time zone” (registered through tests/site-lifecycle.mjs) | Delivered: Filtered pipeline delivery retains exact rows and money for two named recipients, stays at the local hour across DST and skips an inactive person. Missing “REPORT-006 complete scheduled report delivery journey”: The weekly win-rate journey has an implemented win-rate report with matching screen/CSV/mail, then covers downtime/uncertainty and schedule restore without transport. |
| `TEAM-001` | Roles and permissions | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Roles, proposal/team scopes, collaborator shares, personal time zones, provider connections and financial-role operations are delivered. Sharing grants a proposal and never a role (RL-5). Missing: the full SSO-provider, workspace-deletion and content/revenue-report rights matrix. A pending native invitation is rejected after its issuer’s native role promotion even when grant authority remains; preserving valid issuer authority across that change needs the supported Base workflow, without rebinding credential versions. |
| `TEAM-006` | Scoped membership invitations | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Delegated invitations bind an exact role, teams and mailbox to the current issuer’s grant authority, with cancellation, expiry and native-route bypass refusal (RL-5). Missing: a valid pending invitation remains usable when an issuer is promoted but still retains grant authority; the native issuer-version check currently rejects it. Credential versions must not be rebound to work around this gap. |
| `TEAM-007` | Team folder audiences | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Shared template and library folders use live team audiences, explicit consent for widening and current role/proposal scope (RL-5). Missing: company-policy classification and execution of agent access changes within the sponsor’s actual role and grant; the legacy-key path does not prove that workflow. |
| `TEAM-002` | Single sign-on and SCIM provisioning | target | missing |  | No SSO or SCIM. |
| `TEAM-003` | Multiple brands and workspaces | target | partial | `tests/platter.test.mjs` — “TEAM-003 brands isolate draft custody, intersect live roles and scopes, and refuse execution and revoked membership before commit”; `tests/site.test.mjs` loads `tests/site-documents.mjs` — “TEAM-003 owner prepares separate brands and membership through Settings with independent draft kits”; `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” | Delivered: Owner-managed brands and membership for confirmed people, intersected with current roles, teams and proposal scope; separate clients, templates, library, catalog, media and unsent drafts; independent document kit snapshots; default-brand placement without rewriting historical offers or agreements. Secondary brands refuse sending, approval, provider execution and machine access. Conservative owner-only brand administration is the interim standing scope default; scoped delegation and provider boundaries remain unqualified. Separate installations and workspaces, custom domains, per-brand Stripe and accounting connections, operational sending, signing, payments, provider execution and cross-brand transfers remain absent. EDIT-008 hosting, DNS and sending-domain authority and real-key holds remain unchanged. TEAM-001 native invitation issuer-version preservation, SSO, workspace deletion and the remaining full rights matrix remain held. |
| `TEAM-004` | Audit log | target | partial | `src/platter/audit.ts`; `src/platter/auth-audit.ts`; `tests/platter.test.mjs` — “TEAM-004 current person, agent, invitation, signature, native, import and invoice actions have searchable/exportable actors and times”; `tests/site.test.mjs` — “TEAM-004 owner searches audit actions and downloads the same filtered activity at desktop and phone widths” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `TEAM-005` | Security review pack for procurement | target | missing |  | No security page, questionnaire answers, DPA, subprocessor list or audit report. |
| `MIG-001` | PandaDoc move-in | target | missing |  | No PandaDoc import. |
| `MIG-002` | Proposify move-in | target | missing |  | No Proposify import. |
| `MIG-003` | Better Proposals move-in | target | missing |  | No Better Proposals import. |
| `MIG-004` | Qwilr and Ignition move-in | target | missing |  | No Qwilr or Ignition import. |
| `MIG-005` | Open proposals and payment schedules continue | target | missing |  | No in-flight migration. |
| `MIG-006` | Clients, contacts and catalog CSV move-in | target | partial | `src/platter/movein/business-import.ts`, `src/platter/business-records.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | image URLs fetched through Base's egress relay |
| `MIG-007` | Move-in from exported files without API access | target | partial | `tests/platter.test.mjs` — “MIG-007 exported document move-in resumes across sessions, holds ambiguous report matches and guards originals and undo” (three ZIPs across two sign-ins, interrupted upload, content hashes, certificate and signature-page source evidence, exact original downloads, report matching, changed-byte and choice refusals, duplicate conflicts, current owner authority and dependent undo); `tests/site.test.mjs` loads `tests/site-documents.mjs` — “MIG-007 owner uploads exported ZIPs, reviews report ambiguity, downloads read-only originals and undoes the move-in” (compiled upload, review, journal and undo at 1440, browser proof at 1440 and 390); `tests/archive.test.mjs` — “MIG-006 and MIG-007 public CLI archives imported business records, exported documents, original CSV and image bytes with undo custody” (restored exact originals, SHA-256, report, provenance and dependency-safe undo). | The document and report-CSV slice uses the conservative current-owner-only authority floor under the standing scope policy; scoped delegation and provider boundaries remain unqualified. Signature certificates and pages are recognized only as supplied source evidence, not cryptographically validated signatures. Open documents are held read-only: open-document reissue, editable template and library conversion in this combined move-in, native folder creation, catalog and contact integration, provider enrichment and complete qualification for every incumbent export remain. Existing documents are held rather than replaced by a later import. Image acquisition still requires the qualified Base image-GET egress door with validated public address pinning, original-host TLS, no redirects and the required 5-MiB image and 20-MiB batch bounds; the recorded POST-only 64-KiB relay does not qualify. Explicit image failure and apply without images remain in MIG-006. EDIT-013 prerequisites remain unchanged. No live-provider, full migration or DONE claim. |
| `MOB-001` | Team app on a phone | target | partial | `tests/site.test.mjs` — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” (registered through tests/site-documents.mjs); “MOB-001 / FOLLOW-004 invited client asks exact sent sections; owner queue answers and agreement retains threads on desktop and phone” (registered through tests/site-lifecycle.mjs); “MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting” (registered through tests/site-lifecycle.mjs) | The named journey covers this descendant through its called helpers. The prior partial floor is retained pending a fresh ct judgment; this fix round does not promote it. |
| `MOB-002` | iOS and Android apps with push notifications | target | missing |  | No native apps or push. |
| `AI-001` | Drafts from meeting notes, transcripts and email | target | partial | `src/platter/http.ts`, `tests/platter.test.mjs` | Legacy preparation exists only in part. Complete sourced proposal work and seed-wide risk classification/company-policy execution are not proved; the old implementation boundary is recorded in CHANGELOG. |
| `AI-002` | Writing assistant in the editor | target | missing |  | No writing assistant. |
| `AI-003` | MCP server for AI assistants | target | partial | `src/platter/mcp.ts`; `src/platter/send-requests.ts`; `tests/platter.test.mjs` — “AI-003 MCP client searches, drafts, reads engagement and queues exact revisions without authority to approve/send/sign/refund”; `tests/site.test.mjs` — “AI-003 desktop and phone owners review MCP requests, approve/send explicitly, and dismiss stale requests” (registered through tests/site-lifecycle.mjs); `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences” | Delivered: Schemas, search, drafting, status, honest engagement and revision-bound send requests use the public MCP door; the owner queue and archives retain request/resolution history. Missing “AI-003 complete mcp server for ai assistants journey”: The same MCP workflow classifies and executes permitted calls under held and all-autonomous company policies instead of relying on the legacy hard-coded tool-name refusals. |
| `AI-004` | Explainable price suggestions | target | missing |  | No price suggestions. |
| `PRIV-001` | Erasure across contacts, tracking and synced systems | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Only unused client records can be erased; no contacts, tracking data or notice to synced systems. |
| `PORT-002` | Complete product archive | target | partial | `tests/archive.test.mjs` — “FOLLOW-005 / EDIT-002 / MOB-001 / PRICE-002 / PRICE-001 / EDIT-009 / FOLLOW-002 / EDIT-018 / EDIT-012 / SEND-010 / FOLLOW-004 / SEND-004 / EDIT-014 / EDIT-010 / NEG-002 / AI-003 / TEAM-004 / NEG-001 / PORT-001 / PORT-002 public CLI preserves business records and import custody, excludes credentials, and enforces restore fences”; “SEND-006 public CLI retains real invitation text, excludes rehearsal content and preserves its test-send audit without invitation authority”; `src/platter/archive-policy.mjs` | Delivered: Current templates, catalog/library, business records, provider metadata and retained originals have real CLI custody with local authority excluded. Missing “PORT-002 complete complete product archive journey”: A complete product archive journey includes the remaining signed-certificate/payment/report/integration record kinds as their public doors ship and retains their original bytes without exporting authority. |
| `SEC-001` | Provider credential custody | target | partial | `src/platter/connections.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Stripe, QuickBooks, HubSpot, Salesforce, Drive, Slack, Google and Microsoft tokens are sealed with purpose-separated AES-GCM, omitted from API/UI/log fields and excluded from archives. tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens” proves connection authority, plaintext absence and disconnect; tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves metadata restoration requires reconnection. Gap: SSO provider credentials, per-provider least-scope verification, OAuth refresh, visible breakage state and job-stop assertions for future synchronization jobs. |
| `AGENT-001` | Discovery call to priced draft | push-further | partial | `src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs` | Legacy preparation exists only in part. Complete sourced proposal work and seed-wide risk classification/company-policy execution are not proved; the old implementation boundary is recorded in CHANGELOG. |
| `AGENT-002` | Scope and price tested against delivery reality | push-further | missing |  | No delivery cost, capacity or outcome data is read. |
| `AGENT-003` | Client questions chased to resolution | push-further | missing |  | No question tracking or agent. |
| `AGENT-004` | Engagement-driven follow-up | push-further | missing |  | No engagement data or follow-up agent. |
| `AGENT-005` | Payment exceptions closed without duplicate invoices | push-further | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | Legacy preparation exists only in part. Complete sourced proposal work and seed-wide risk classification/company-policy execution are not proved; the old implementation boundary is recorded in CHANGELOG. |
| `AGENT-006` | Out-of-scope delivery turned into a change order | push-further | missing |  | No delivery signals or change orders. |
| `AGENT-007` | Win and loss learning for templates and pricing | push-further | missing |  | No outcome analysis. |
| `AGENT-008` | Renewal preparation from delivered results | push-further | missing |  | No renewal agent. |
| `AGENT-009` | Agent authority ledger and limits | push-further | partial | `src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs` | Legacy preparation exists only in part. Complete sourced proposal work and seed-wide risk classification/company-policy execution are not proved; the old implementation boundary is recorded in CHANGELOG. |
| `SURFACE-001` | Proposal registry and role parity | target | missing |  | The seed-specific MCP registry, computed-class proof and Base policy-matrix conformance are not implemented. |
| `SURFACE-002` | Proposal classes from business facts | target | missing |  | The seed-specific MCP registry, computed-class proof and Base policy-matrix conformance are not implemented. |
| `SURFACE-003` | Exact proposal decisions and custody | target | missing |  | The seed-specific MCP registry, computed-class proof and Base policy-matrix conformance are not implemented. |
| `SURFACE-004` | A seeded service-firm week through MCP | target | missing |  | The seed-specific MCP registry, computed-class proof and Base policy-matrix conformance are not implemented. |
