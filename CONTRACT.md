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
| BASE-PUBLIC-002 | Origins | EDIT-008, SEND-003, SEND-009 | not run |
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
| BASE-AGENT-005 | An agent acts as a person in a role, never more | ACCESS-001, FOLLOW-007, AI-003, SURFACE-004 | not run |
| BASE-AGENT-006 | Every action declares its risk class | FOLLOW-007, NEG-002, PAY-006, AI-001, AI-002, AI-003, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002 | not run |
| BASE-AGENT-007 | The company's policy decides, at one chokepoint | ACCESS-001, PROP-001, APPROVE-003, APPROVE-004, FOLLOW-004, FOLLOW-007, NEG-002, SIGN-008, PAY-006, TEAM-007, AI-001, AI-002, AI-003, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-002, SURFACE-003, SURFACE-004 | not run |
| BASE-AGENT-008 | Truthful attribution | ACCESS-001, PROP-001, APPROVE-003, AI-001, AI-002, AI-004, AGENT-001, AGENT-002, AGENT-003, AGENT-004, AGENT-005, AGENT-006, AGENT-007, AGENT-008, SURFACE-003, SURFACE-004 | not run |
| BASE-AGENT-009 | Every agent action is audited with its class and decision | TEAM-004, AGENT-009, SURFACE-004 | not run |
| BASE-AGENT-010 | Agents can follow changes | none | not run |
| BASE-AGENT-011 | Limits are policy, and Pause stops everything | AGENT-009 | not run |
| BASE-AGENT-012 | Writes are idempotent and conflict-safe | AI-003, SURFACE-003 | not run |
| BASE-AGENT-013 | Manifest, docs and the conformance journey | SURFACE-001, SURFACE-004 | not run |

## Published clauses

- `HTTP-001`: *Tier:* Core · *Cites:* BASE-ACCESS-002, BASE-ACCESS-004, BASE-ROLE-001
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

**Requirement.** The proposal, client, import and invoice doors use TEAM-001 rights and APPROVE-003 proposal authority. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#http-001).

**Acceptance.**
1. Read proposal state while signed out: no private record is returned.
2. Attempt a client mutation from a foreign origin: no client is written.
3. Revoke a proposal key and attempt another domain command: no command runs.
4. A member attempts an owner-only invoice export and import: neither changes records.

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

**Requirement.** Sending freezes the approved revision: its scope, options and prices can no longer be edited in place. Anyone who may send the proposal under `APPROVE-003` (the owner, under the default policy) can send a fresh invitation, which rotates the client link and clears any verification session without changing the offer, so it needs no new approval. A change after sending is a new revision under `NEG-001`, never an edit to what the client already holds. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#prop-002).

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

**Requirement.** The Platter archive carries clients, proposals, revisions, approvals, immutable acceptances and deposit invoices. It carries no credentials, sessions, invitation links, verification authority or mail. Sent offers require fresh invitations after restore. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#port-001).

**Acceptance.**
1. Export, restore to an empty installation and re-export: the record and attachment parts are identical.
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

**Requirement.** A shared library holds sections, images, videos, case studies, team bios, testimonials, terms and pricing tables, with folders, tags and search. Owners, admins, managers and content editors create and edit library items, and every member who edits proposals inserts them (`TEAM-001`). A member inserts an item as a linked copy (updated when the library item changes, until the proposal is sent) or as a detached copy. Sent and accepted proposals never change when the library does. Each item shows where it is used and when it last changed. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-003).

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

**Requirement.** Proposals embed images and galleries, uploaded video, YouTube, Vimeo, Loom and Wistia video, a Dial or Calendly booking link and embedded PDFs. Embeds come from an allowlist with a content security policy, render on phones, and show a still and a link in the PDF export. Uploaded media is stored with the proposal and travels in archives (`PORT-002`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#edit-006).

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

**Requirement.** Platter records each verified or unverified view of a client link with time, recipient, approximate location and device class, and alerts the sender on first open and on a return visit after a quiet period the owner sets (30 minutes by default). The proposal shows a view timeline. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-001).

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

**Requirement.** The client page discloses that views are measured.  Engagement data is included in erasure (`PRIV-001`) and in exports. Stored locations are truncated; engagement retention is owner-selected and engagement joins erasure and exports. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#track-004).

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

**Requirement.** The owner, an admin or a billing user (`TEAM-001`) refunds a payment in full or in part with a reason, and the refund syncs to accounting. When a client disputes a card payment, Platter shows the dispute, its deadline and an evidence pack (signed agreement, certificate, views and payment authorization) that the owner, an admin or a billing user submits to Stripe. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#pay-006).

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

**Requirement.** *Cites:* PORT-002, PRICE-006, SEC-001. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#auto-004).

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

**Requirement.** Reports show signed value, one-off and recurring (MRR and first-year value), invoiced, collected and overdue amounts by period and owner, reconciled with payments and accounting (`ACCT-004`). Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#report-004).

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
4. A real pinned-workerd probe fetched a public PNG and rejected a mismatching TLS hostname; provider fakes establish Platter's handling, not hosted provider certification.

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

**Requirement.** The archive includes every Platter record kind: templates, library, catalog, media, signed PDFs/certificates, payment/invoice records, report source data and integration mappings. Connection metadata travels; connection credentials and public invitation authority stay local. Each added record kind joins the same archive obligation. Detailed mapping and custody rules are in [proposal behavior](docs/contract-behavior.md#port-002).

**Acceptance.**
1. Export an installation containing every record kind, restore into an empty installation and re-export identical parts.
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
**Resources.** Proposal, revision, template, library item, catalog item, client, agreement, invoice, payment, follow-up, report, audit and import-job URI templates identify their native records.
**Events.** proposal.changed, approval.decided, proposal.sent, question.changed, signature.recorded, payment.changed, followup.changed, import.completed and policy.adopted.
**Prompts.** Discovery-to-proposal (AI-001, AGENT-001), delivery-fit review (AGENT-002), question resolution (AGENT-003), collection reconciliation (AGENT-005), change order (AGENT-006) and renewal (AGENT-008).
**Not tools, and why.** SITE-001: public documentation and installation fact; EDIT-007: the client’s interactive phone screen; MOB-001: the person’s phone browser; its proposal actions are tools; MOB-002: device-only native clients; server jobs remain tools. Provider-hosted personal checkout and identity screens remain the provider’s interactive screen; preparation/status jobs are tools.
**Limits.** The capacity limits documented in the product reference protect request rate, body and file sizes. Business thresholds, contact limits and provider spend caps are company policy.
**Handoffs.** Listens for CRM deal, Gauge delivery and payment-provider events; emits accepted-scope records to Gauge or the chosen delivery tool, invoice changes to Pantry or the selected accounting authority, and archive requests to Chest or the selected file store.

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

**Requirement.** The proposal ledger adds source records, outputs and model identity to the Base agent audit. Provider spend and its monthly cap are company policy, with Pause inherited from Base.

**Acceptance.**
1. Run each proposal agent: its ledger shows inputs, outputs, model and any policy-required approval.
2. Under the held company policy, sending and refund calls follow external/commitment and money decisions; Pause stops the next run.
3. Exceed the company’s chosen model budget: the run stops with a visible notice.

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

Judged from the code and tests at commit `b2551363bd49d431add363e7ee97bed57938c394` (28 October 2026).

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 1 | 11 | 0 | 12 |
| Target and push further | 12 | 81 | 58 | 151 |
| All | 13 | 92 | 58 | 163 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HTTP-001` | Authorized domain dispatch | published | partial | `tests/platter.test.mjs`, `src/platter/http.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Owner-only invoice/import attempts are refused without record changes. Expected statuses are checked by tests/harness.mjs, outside this clause’s cited evidence; the complete no-write outcome is not asserted here. |
| `ACCESS-001` | Proposal preparation grants | published | partial | `tests/platter.test.mjs`, `src/platter/credentials.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Company-policy decisions under held. No asserting line in the old cited evidence. all-autonomous policies. No asserting line in the old cited evidence. |
| `PROP-001` | Approval binds the exact revision | published | partial | `tests/platter.test.mjs`, `src/platter/commands.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Stale approval. The expected-status assertions for these actions live in the uncited harness. send-after-edit refusal. The expected-status assertions for these actions live in the uncited harness. Every retained approval’s approver. No asserting line in the old cited evidence. role. No asserting line in the old cited evidence. rule. No asserting line in the old cited evidence. time are read together. No asserting line in the old cited evidence. |
| `PROP-002` | Sending freezes the offer | published | partial | `tests/platter.test.mjs`, `src/platter/commands.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Frozen-offer revision refusal. The expected-status assertion is in tests/harness.mjs, outside the cited files. |
| `SIGN-001` | Verified-mailbox acceptance | published | partial | `tests/platter.test.mjs`, `src/platter/signing.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: A previously valid unconsumed code is refused specifically after its expiry. The expiry case reuses an already-exhausted condition and submits an arbitrary code, so it does not isolate expiry. Ten-code invitation ceiling. No asserting line in the old cited evidence. exactly ten-minute lifetime. No asserting line in the old cited evidence. Cookie path and SameSite/HttpOnly flags. Cookie presence alone does not assert these properties. another revision’s denied authority. Cookie presence alone does not assert these properties. |
| `SIGN-002` | Immutable acceptance with an integer-cent deposit | published | partial | `tests/platter.test.mjs`, `src/platter/signing.ts` | All listed acceptance outcomes are traced in DONE-AUDIT. The published conservative demotion is retained pending a fresh ct judgment; this rewrite makes no status promotion. |
| `INV-001` | One retained deposit invoice per acceptance | published | partial | `tests/platter.test.mjs`, `src/platter/invoices.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Unaccepted invoice export is refused. Expected-status assertion is in the uncited harness. |
| `IMPORT-001` | Reviewed client CSV move-in with undo | published | partial | `tests/platter.test.mjs`, `src/platter/movein/index.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Changed-file apply refuses the reviewed fingerprint. Expected-status assertion lives in the uncited harness. Changed imported client prevents undo. The cited journey does not assert this separate changed-client case. |
| `ERASE-001` | Bounded client erasure | published | partial | `tests/platter.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Draft. wrong-name refusals. Expected-status assertions are in the uncited harness. |
| `PORT-001` | Validated archives and restore | published | partial | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: All record. The archive journey asserts many records but never compares the complete re-exported part manifest. attachment parts are identical after export/import/re-export. The archive journey asserts many records but never compares the complete re-exported part manifest. |
| `MAIL-001` | Durable proposal mail with honest outcomes | published | done | `src/platter/mail.ts`, `tests/mail.test.mjs` |  |
| `SITE-001` | Public run site and documentation | published | partial | `tests/site.test.mjs`, `scripts/verification/run.mjs`, `src/site/pages.ts` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Run Platter opens the run page. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. Markdown is readable with JavaScript disabled. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. Installed home is the Lobby. Browser assertions are in tests/site-lifecycle.mjs, while the cited tests/site.test.mjs only imports suites. |
| `EDIT-001` | Branded drag-and-drop proposal editor | target | partial | `tests/site.test.mjs`, `tests/platter.test.mjs`, `tests/archive.test.mjs`, `tests/editor-budget.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every palette block. drag. keyboard reorder. brand. reload. same-order PDF at 1440. Assertions are in imported browser helpers. not the old cited wrapper. The same complete browser flow at 390. Assertions are in imported browser helpers. Performance proof on the same exact build as the editor browser flow. No assertion in the cited files binds the two receipts to the same candidate. |
| `EDIT-002` | Proposal templates | target | partial | `src/platter/templates.ts`, `src/platter/starter-templates.ts`, `src/platter/ui/templates.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Personal templates and all five built-in starters ship with independent drafts, filled client and sender details, USD pricing tables and exact PDF and archive custody. Shared templates, team-limited folders and durable delivery defaults now ship, with editing rights and live audience checks proved by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”; the named role browser and CLI journeys prove 1440/390 controls and custody. Template payment choices now have explicit controls. New drafts independently copy card and ACH choices, a 30% deposit and net-15 milestone terms with collection off; later template edits affect only future drafts, and proposal edits leave the template unchanged. tests/platter.test.mjs — “EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries” proves these snapshots plus malformed, stale and unauthorized no-write refusals. tests/site.test.mjs — “FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths” proves payment choices beside 2, 5 and 9-day reminders and a 14-day expiry at 1440 and 390 pixels. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves retained choices and a usable restored template with collection off. Gap: general variables, recipient roles, full template-driven payment execution and multiple-recipient reminder execution remain. Versioned document blocks, brand kits, exact media references and the Client field-role binding now survive template starts and public CLI restore, proved by the named EDIT-001 lifecycle, browser and CLI journeys. |
| `EDIT-003` | Reusable content library | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Linked draft changes while detached. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. sent. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. accepted copies do not. The linked-propagation assertion is in tests/library-fixture.mjs, outside the old Evidence set. Usage names exactly all three copies. No directly cited asserting line establishes the exact usage list. |
| `EDIT-004` | Variables from client, deal and CRM records | target | missing |  | No variables or merge fields. |
| `EDIT-005` | Word and PDF import and export | target | missing |  | No import or export of documents. |
| `EDIT-019` | Fixed PDF pages with signing fields | target | missing |  | No import or export of documents. |
| `EDIT-020` | Word and PDF exports | target | missing |  | No import or export of documents. |
| `EDIT-006` | Embedded rich media | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Uploaded video. The browser helpers are not in the old Evidence set. gallery render. The browser helpers are not in the old Evidence set. play at 390. The browser helpers are not in the old Evidence set. PDF has still images. The old cited wrappers do not assert every named carrier. links. The old cited wrappers do not assert every named carrier. Outside-allowlist embed refusal. A command status in a helper is not an asserting line in the cited file. |
| `EDIT-007` | Mobile client review | target | partial | `src/platter/ui/client.ts`, `src/platter/ui/packages.ts`, `src/platter/ui/shared.ts`, `tests/site.test.mjs`, `tests/mobile-client-journey.mjs` | Named EDIT-007 built-browser journeys at 1440 and 390 pixels complete invitation, mailbox verification, conditional package selection, adding an optional item and raising its quantity, comments and immutable acceptance of the selected total and deposit with keyboard-only client interaction and axe WCAG 2.2 AA scans at every step. Verification, comments and refusal pages preserve the reviewed package and optional items, and submission feedback receives keyboard focus. Package review uses a native fragment target to focus a named selection region containing the chosen package, optional-item quantities and exact USD total/deposit, including with application JavaScript disabled. Named EDIT-007 assertions expose current scope, grouped pricing and selection through browser accessibility APIs, correct an out-of-range quantity by keyboard, and download exact attachment bytes and the selected unsigned PDF before accepting. Gap: Stripe test-card payment (PAY-001/PAY-002) and assistive-technology verification of the complete rich-content/payment journey remain; this slice does not establish full WCAG conformity. |
| `EDIT-008` | Custom domain and branded client experience | target | missing |  | Client links use the installation origin with Platter styling. |
| `EDIT-009` | Conditional content by package | target | partial | `src/platter/conditional.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Package- and optional-item visibility is asserted through client/PDF/acceptance carriers. Variable-dependent visibility on preview, client, agreement and PDF remains unproved. |
| `EDIT-010` | Attachments and vendor documents | target | done | `src/platter/attachments.ts`, `src/platter/attachment-commands.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-011` | Large-proposal performance budget | target | done | `tests/editor-budget.mjs`, `.github/workflows/verify.yml`, `tests/platter.test.mjs` |  |
| `EDIT-012` | Duplicate a proposal for another client | target | partial | `src/platter/duplicate.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Destination variables. The original full-target combination is not asserted by its old cited files. role slots. The original full-target combination is not asserted by its old cited files. every payment. The original full-target combination is not asserted by its old cited files. delivery setting are copied. The original full-target combination is not asserted by its old cited files. Copy has no payment records. No explicit read of a populated source payment collection establishes this absence. Mandatory. Expected refusal statuses are asserted in the uncited harness; the full role/variable combination is not read back. optional approval copy branches. Expected refusal statuses are asserted in the uncited harness; the full role/variable combination is not read back. |
| `EDIT-021` | Duplicate lifecycle and file custody | target | partial | `src/platter/duplicate.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every lifecycle authority. Individual null fields do not prove an uninspected collection. including payments. Individual null fields do not prove an uninspected collection. is absent. Individual null fields do not prove an uninspected collection. Stale refusal. Old key behavior has a hard-coded refusal, not the required policy matrix. company-policy standard copy behavior. Old key behavior has a hard-coded refusal, not the required policy matrix. Compiled copy form. The browser assertions are outside the old Evidence set. independent source at 1440 and 390. The browser assertions are outside the old Evidence set. |
| `EDIT-013` | Documents without pricing | target | missing |  | Every proposal requires two priced options; there is no unpriced document type. |
| `EDIT-014` | Client PDF download before signing | target | done | `src/platter/documents/client-pdf.ts`, `src/platter/documents/offer-pdf.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-015` | Locked template sections | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Terms editing through both editor and API is refused to sales. The compiled editor assertion is in an uncited imported browser helper. Content editor cannot unlock. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. admin unlock changes audit. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. requires approval. The complete multi-outcome combination lacks asserting lines in the old Evidence files; expected statuses use the uncited harness. |
| `EDIT-016` | Proposal search and folders | target | done | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `EDIT-017` | Client page in the client's language | target | missing |  | The client page and mail are English only. |
| `EDIT-018` | Client-page preview before sending | target | partial | `src/platter/preview.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Desktop/phone compiled banner identifies exact revision. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. recipient. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. The full three-package tax/deposit/schedule/conditional selection equals the sent page. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. Out-of-bounds quantity eleven is refused. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. Only signer two’s assigned fields appear. Existing route assertions cover portions, but the complete named full-target outcome is not asserted in the old Evidence set. |
| `EDIT-022` | Preview isolation and exact approval link | target | partial | `src/platter/preview.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Pending approver follows an exact revision-one approval-request link. The old preview fixture uses owner/member links rather than the named full request flow. A person outside proposal scope sees no preview content. An HTTP status alone is not a no-content assertion. Exact preview audit survives public CLI restore. Archive assertions compare broader data. this point’s specific preview outcome is not isolated in the old Evidence set. |
| `CAT-001` | Service and product catalog | target | partial | `src/platter/catalog.ts`, `src/platter/movein/business-import.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Native USD catalog items now support name/description/SKU/unit/price/private cost, owner/admin/manager versioned editing and reviewed insertion into independent drafts. tests/platter.test.mjs — “TEAM-001 / CAT-001 catalog edits enforce the role matrix; copied prices and private costs stay frozen in proposals” proves no-write role refusals, private cost copying, immutable sent prices, stale-price refusal and new draft pricing. The named role browser and CLI journeys prove 1440/390 controls and exact custody. Imported catalog metadata and image originals remain review-only records; no imported metadata is charged automatically. Gap: recurrence, tax/account metadata, native image editing/rendering and provider item synchronization remain. |
| `PRICE-001` | USD pricing tables with line items | target | partial | `src/platter/pricing.ts`, `src/platter/ui/pricing.ts`, `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every malformed quantity. Expected status assertions are in the uncited harness. price is refused with the named status. Expected status assertions are in the uncited harness. |
| `PRICE-002` | Packages and optional items the client chooses | target | partial | `src/platter/selection.ts`, `src/platter/conditional.ts`, `src/platter/paper-acceptance.ts`, `src/platter/ui/paper.ts`, `src/platter/ui/packages.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Agreement and PDF both retain every field of the same middle-package quantity-four selection. The target requires equality across every carrier, not a single successful read or subset of money fields. |
| `PRICE-003` | One-off and recurring fees | target | done | `tests/platter.test.mjs`, `tests/recurring-journey.mjs`, `tests/site-documents.mjs`, `tests/recurring-browser.mjs` |  |
| `PRICE-004` | Discounts | target | partial | `tests/platter.test.mjs`, `tests/pricing-journey.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Ten percent at group scope plus $500 total discount matches the fixture. The cited discount cases assert different combinations, without the complete named group-plus-total case. |
| `PRICE-005` | US sales tax | target | missing |  | No tax handling beyond a fixed GST-free export. |
| `PRICE-006` | Internal cost and margin | target | partial | `src/platter/internal-pricing.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Version-bound internal unit costs now produce cent-exact line costs and line/package margins. Only owner, admin, manager and billing proposal views carry internalPricing; billing reads but does not edit proposals. Sales, content editor, viewer and agent responses omit it. The separate /api/platter/internal-pricing.pdf export requires those same read rights and proposal scope; public offer PDFs always use the public snapshot and contain no costs. tests/platter.test.mjs — “TEAM-001 / PRICE-006 internal line costs round exactly, follow revisions and templates, and stay out of sales/client data and public PDFs” proves the amounts, role/API/private-PDF boundaries, public-page/PDF exclusion, revisions, negotiation, restoration, duplication and personal templates. The named team browser journey proves manager cost editing and sales exclusion at 1440/390; the role CLI journey restores exact costs and templates. Optional-item and flat-package costs now ship with selected/base totals. tests/platter.test.mjs — “TEAM-001 / PRICE-006 optional and flat-package costs produce exact selected totals while verified client JSON, pages and PDFs exclude private state” proves exact optional quantities, selected total margins, template/catalog carryover, unverified and cross-invitation refusal, and absence of private fields from the new mailbox-verified /p/<invitation>/data.json projection. The named role browser and CLI journeys prove 1440/390 total selectors, selected margins and exact custody. Gap: outbound webhook payload proof remains when AUTO-004 adds that door; no lifecycle webhook is currently sent. AUTO-004 inherits the cost-free public projection before its webhook capability ships. |
| `PRICE-007` | Payment terms and schedules on the proposal | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/packages-journey.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: The exact 30%-deposit/two-milestone/monthly/net-15 schedule is shown. The old evidence tests several schedule selections; the full named combination and both reads are not asserted together. frozen at acceptance. The old evidence tests several schedule selections; the full named combination and both reads are not asserted together. A template’s 30%-deposit/net-15 terms survive an independently edited 25% proposal. The copied payment-term fields are not all asserted in the old Evidence set. |
| `PRICE-008` | First-release AUD agreements stay exact | target | done | `migrations/core/0017_currency.sql`, `tests/archive.test.mjs`, `tests/site.test.mjs` |  |
| `COLLAB-001` | Real-time team editing | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence. |
| `COLLAB-002` | Internal comments, mentions and assignments | target | done | `tests/mail.test.mjs`, `tests/site-documents.mjs`, `tests/archive.test.mjs` |  |
| `COLLAB-003` | Version history with compare and restore | target | done | `src/platter/history.ts`, `src/platter/ui/history.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` |  |
| `APPROVE-001` | Approval rules and routing | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Saved threshold rules are the manager-above-$25,000. The rule-save operation’s expected-status assertions are in the uncited harness. owner-above-15% configuration. The rule-save operation’s expected-status assertions are in the uncited harness. Both parallel completion orders. Each named branch must be asserted in a cited file; command execution alone does not read back every result. rejection. Each named branch must be asserted in a cited file; command execution alone does not read back every result. unnamed billing refusal. Each named branch must be asserted in a cited file; command execution alone does not read back every result. invalid sales-rule save. Each named branch must be asserted in a cited file; command execution alone does not read back every result. |
| `APPROVE-002` | Approval requests that reach the approver | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Nook and mobile push, automatic next-step request creation, integrated notification settings and request controls, complete trigger details and a chat-native decision interaction remain. Conservative default adopted  Uncertain delivery is held without automatic retry. Future Nook, MOB-002, COLLAB-002 and SEND-005 carriers inherit these authority and custody obligations. |
| `APPROVE-003` | Who approves, who sends and what needs approval | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Unruled $3,000 sales send has no approval record. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. Manager approves matching $30,000. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. owning sales sends. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. Every role. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. outside-team refusal changes no record. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. Each owner/admin/manager no-rule default selects exactly the eligible decider. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. Only authorized policy edits persist with actor/time. The cited role journey contains substantial delivery, but does not assert this entire outcome through an assertion in the cited file; expected-status checks live in the uncited harness. |
| `APPROVE-004` | Approval reevaluation on the exact revision | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Sending after edit is refused until the next approval. Expected-status assertion lives in the uncited harness. Highest optional-quantity maximum. Every computed fact is not read back at its decision. currency-preserving threshold facts. Every computed fact is not read back at its decision. First-draft legal comparison. No asserting line in the old cited evidence. sequence/id tie order. No asserting line in the old cited evidence. Parallel order. The exact rejection/readback branches are not all asserted in the old files. rejected-revision refusal. The exact rejection/readback branches are not all asserted in the old files. Company-policy commitment decisions after both agent. No asserting line in the old cited evidence. human revisions. No asserting line in the old cited evidence. |
| `SEND-001` | Send from the firm's own mailbox | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | All listed acceptance outcomes are traced in DONE-AUDIT. The published conservative demotion is retained pending a fresh ct judgment; this rewrite makes no status promotion. |
| `SEND-011` | Inbound client reply custody | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | All listed acceptance outcomes are traced in DONE-AUDIT. The published conservative demotion is retained pending a fresh ct judgment; this rewrite makes no status promotion. |
| `SEND-002` | Delivery status and bounce handling | target | partial | `src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Delivered. The complete listed branch set needs asserting lines, rather than a provider callback status alone. deferred-then-delivered. The complete listed branch set needs asserting lines, rather than a provider callback status alone. hard bounce each display their state. The complete listed branch set needs asserting lines, rather than a provider callback status alone. Both signed-provider correlations. The complete listed branch set needs asserting lines, rather than a provider callback status alone. replay. The complete listed branch set needs asserting lines, rather than a provider callback status alone. terminal regression cases. The complete listed branch set needs asserting lines, rather than a provider callback status alone. Queued/complained/uncertain remain distinct. The complete listed branch set needs asserting lines, rather than a provider callback status alone. Compiled delivery history at 1440 and 390. Browser assertions are outside the cited wrapper file. |
| `SEND-012` | Bounce correction follow-up | target | partial | `src/platter/delivery.ts`, `src/platter/ui/delivery.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Hard bounce creates both sender notice. The complete combination is not established by a cited asserting line for each listed effect. separate follow-up. The complete combination is not established by a cited asserting line for each listed effect. Current sender correction rotates link/session. The complete combination is not established by a cited asserting line for each listed effect. preserves offer/client. The complete combination is not established by a cited asserting line for each listed effect. routes verification to corrected address. The complete combination is not established by a cited asserting line for each listed effect. Provider acceptance closes correction while uncertainty leaves it open. The complete combination is not established by a cited asserting line for each listed effect. Dismissal retains the entered reason. The complete combination is not established by a cited asserting line for each listed effect. Both desktop/phone correction. The complete combination is not established by a cited asserting line for each listed effect. exact open/resolved CLI restore. The complete combination is not established by a cited asserting line for each listed effect. |
| `SEND-003` | Recipients, roles and sharing | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Current main judged SEND-003 done under RL-21. Its role/link/removal assertions are in tests/recipients-http.mjs and its compiled browser assertions in tests/recipients-browser.mjs, neither named in the old Evidence set. The wrapper test titles alone do not prove those outcomes; stakeholder conversion’s no-mail/no-authority assertions are retained. |
| `SEND-004` | Expiry and reopening | target | partial | `src/platter/expiry.ts`, `src/platter/expiry-time.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Accepted never expires. Every independent clock branch must have a readback assertion. reinvite keeps clock. Every independent clock branch must have a readback assertion. negotiation restarts period. Every independent clock branch must have a readback assertion. Expiry settings. The complete outcome is not isolated in the cited archive assertions. reopen requests survive restore without transport authority. The complete outcome is not isolated in the cited archive assertions. |
| `SEND-013` | Unsigned-recipient expiry warnings | target | partial | `src/platter/expiry.ts`, `src/platter/expiry-time.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every unsigned signer receives one warning. The additional recipient assertions live in tests/recipients-http.mjs, outside the old Evidence set. every signed signer receives none. The additional recipient assertions live in tests/recipients-http.mjs, outside the old Evidence set. Extension moves the warning date without stale delivery. No asserting line in the old cited evidence. Repeated processing gives one warning. No asserting line in the old cited evidence. uncertain transport stays held. No asserting line in the old cited evidence. All warning facts/settings restore without sending authority. No asserting line in the old cited evidence. |
| `SEND-005` | Completion and activity notifications | target | partial | `tests/mail.test.mjs`, `tests/archive.test.mjs` | Decline and failed-payment events, personal Teams, Nook and push carriers, and settings controls with desktop and phone proof remain. Only explicitly consenting current scoped people receive generic events and protected links; view alerts additionally require current owner opt-in for that revision; preferences bind the exact proposal revision, direct Slack destinations must be verified for that person, and restoration does not activate sending. Existing APPROVE-002 and AUTO-003 consent and custody obligations remain. |
| `SEND-006` | Editable subject, message and shared email templates | target | partial | `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Shared reminder-message defaults and proposal-template choices now ship, with owner/admin management, copied text, member locks and explicit supported-variable filling proved by tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority”. Loading a message is review only and disables the schedule until fresh authorization; recipient first names are sender-supplied and are not copied to other-client drafts. A selected message keeps its copied source version; current locks are rechecked on member edits. Only reminder mail uses these shared-message controls today. Gap: shared/default/locked templates and variable filling for other email events, editable invoice/expiry/withdrawal/completion messages and a complete agreement package remain. |
| `SEND-014` | Private rehearsal email | target | partial | `src/platter/test-mail.ts`, `src/platter/invitation-mail.ts`, `src/platter/ui/invitation-mail.ts`, `tests/mail.test.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Test-to-self rehearsals retain their session-only preview, isolation and daily quota. Owners also edit subjects and personal messages for real invitations, fresh links and approved negotiated revisions; unresolved variables block the atomic send. The exact subject and personal message, recipient, revision, actor and queue time survive in the proposal timeline and PORT-002 archives; credential-bearing client links remain transport-only. Legacy API sends without custom fields keep their original mail bytes. Shared reminder-message defaults and proposal-template choices now ship, with owner/admin management, copied text, member locks and explicit supported-variable filling proved by tests/mail.test.mjs — “FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority”. Loading a message is review only and disables the schedule until fresh authorization; recipient first names are sender-supplied and are not copied to other-client drafts. A selected message keeps its copied source version; current locks are rechecked on member edits. Only reminder mail uses these shared-message controls today. Gap: shared/default/locked templates and variable filling for other email events, editable invoice/expiry/withdrawal/completion messages and a complete agreement package remain. |
| `SEND-007` | Replace an unsigned signer on a sent proposal | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Gap: The SIGN-004 HTTP and compiled-browser journeys now prove replacement at position 2, preserving earlier signatures and order, refusing duplicate participant mailboxes and retaining the replacement in the certificate. The owner-only configured-recipient authority default remains policy not yet ruled where noted in RULINGS under SIGN-004 and SEND-003. SIGN-006’s government ID and explicitly selected link-only methods and their replacement journeys remain required. The single-recipient mailbox or SMS requirement and the configured-recipient mailbox requirement are retained; these proofs do not establish the full original journey. SEND-007 remains partial. |
| `SEND-008` | Sending and reminders by text message | target | partial | `tests/mail.test.mjs`, `tests/archive.test.mjs` | Completion texts, sender controls with desktop and phone proof, installer integration, production sender qualification and safe recipient re-enablement remain. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps; none is certified by local fakes or this ruling. Recipient re-enablement requires a separately proven path with new recorded assent, provider eligibility, an explicit audited suppression change and fresh operational authority; START alone is insufficient. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders. |
| `SEND-009` | Reusable public signing link | target | missing |  | Every proposal has one invited recipient; there is no public link or embeddable form. |
| `SEND-010` | Withdraw a sent proposal | target | partial | `src/platter/withdrawal.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Each signer/approver/viewer/CC/shared/replaced link refuses all proposal content. The full recipient proof lives in tests/recipients-http.mjs; an HTTP 410 alone cannot assert content absence. Every email/text reminder is cancelled. Each independent channel must be asserted after withdrawal. every unpaid payment link is refused. Each independent channel must be asserted after withdrawal. Questions. sales/correction follow-ups. expiry warnings all stop. Separate lifecycle assertions are required for each named work item. Out-of-scope sender withdrawal leaves no changes. A refusal status alone is insufficient for the no-effect outcome. Accepted agreement withdrawal is refused. Expected-status assertion lives in the uncited harness. |
| `SEND-015` | Withdrawal receipt and approved reissue | target | partial | `src/platter/withdrawal.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Notice per recipient. The full recipient inventory is not asserted in the old cited set. no notice when disabled. The full recipient inventory is not asserted in the old cited set. Partially signed withdrawal retains the first signature as void. The assertion is in tests/recipients-http.mjs, not the old cited files. Timeline/audit actor/time/reason plus report counts/totals. The exact entered reason must be read back in both records. New revision works. Each recipient and previous authority must be checked after reissue. every old link remains refused. Each recipient and previous authority must be checked after reissue. Compiled 1440/390 screens. The old browser wrapper has no asserting line. read-only CLI history without authority. The old browser wrapper has no asserting line. |
| `TRACK-001` | View tracking and live open alerts | target | done | `tests/platter.test.mjs`, `tests/followup-journey.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs` |  |
| `TRACK-002` | Section-level reading analytics | target | partial | `tests/platter.test.mjs`, `tests/tracking-details-browser.mjs` | Opted-in client pages measure the most visible current section while the tab is visible, send same-origin cumulative readings, validate elapsed bounds, retain monotonic times and record valid package and optional-item selections per view. Named HTTP assertions prove 40-second pricing and 5-second scope readings and package choices; the desktop and phone journey proves actual first-party browser measurement. Gap: The committed exact-SHA scripted 40-second pricing and 5-second case-study session with the two-second tolerance, attachment-open attribution, complete toggle history and per-recipient summaries remain. FOLLOW-002 section-specific engagement reasons remain; its required original seven-proposal viewed ordering now passes. Owner-only access and explicit measurement consent await ct approval. |
| `TRACK-003` | Forwarded stakeholder identification | target | partial | `tests/platter.test.mjs`, `tests/tracking-details-browser.mjs` | A forwarded viewer explicitly supplies a name and a different mailbox, consents to sharing, receives a bounded single-use code and verifies that mailbox. The owner sees the verified stakeholder and can explicitly record an approver recipient. This minimal SEND-003 door grants no invited-recipient signing authority and sends no new recipient invitation. Gap: Automatic new-device and new-network prompting remains; no fingerprint is stored. Full SEND-003 separate recipient invitations and operational approver delivery and decisions remain. Policy default adopted policy not yet ruled where noted in RULINGS: explicit viewer identity-sharing consent, owner-only stakeholder visibility and conversion, and no automatic outbound invitation or signing authority. |
| `TRACK-004` | Tracking disclosure and privacy limits | target | partial | `tests/platter.test.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Client network makes no third-party request. A full network-host absence assertion is not in the old cited files; a rendered page alone is insufficient. |
| `FOLLOW-001` | Scheduled reminders to unsigned recipients | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Sender-authorized scheduled reminders exist. Multiple unsigned recipients, every creation door, audit/timeline custody and opt-out persistence across revisions still need proof under RL-101; policy adoption certifies no implementation. |
| `FOLLOW-008` | Manual unsigned-recipient reminders | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Sender-authorized scheduled reminders exist. Multiple unsigned recipients, every creation door, audit/timeline custody and opt-out persistence across revisions still need proof under RL-101; policy adoption certifies no implementation. |
| `FOLLOW-002` | Next-action follow-up queue by sales owner | target | partial | `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Personal-owner time-zone boundaries. The existing queue uses installation time-zone fixtures. All equal-date/reason sent-time/proposal-number. Current stable-id behavior does not establish future proposal-number ties. currency tie outcomes. Current stable-id behavior does not establish future proposal-number ties. |
| `FOLLOW-009` | Follow-up lifecycle and action history | target | partial | `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Notice leaves work open. All listed decisions require separate assertion lines. reason-free dismissal is refused. All listed decisions require separate assertion lines. Every creation/revision action. No asserting line in the old cited evidence. explicit reopening retains the right due date. No asserting line in the old cited evidence. Acceptance. decline. withdrawal. unanswered question lifecycles reconcile. Checking one terminal case does not cover the full named branch set. Every history field. No asserting line in the old cited evidence. authority absence survives restore. No asserting line in the old cited evidence. |
| `FOLLOW-010` | Follow-up reporting and team visibility | target | partial | `src/platter/followup/queue.ts`, `src/platter/followup/commands.ts`, `tests/followup-journey.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: All sales/manager team-scope queues use the current owner. The full role-scope branch set is not asserted in the old evidence. Compiled 1440 and 390 queue screens. Asserting browser helpers are not in the old cited Evidence set. |
| `FOLLOW-003` | Expiry and renewal notifications | target | partial | `tests/mail.test.mjs` | Recorded sender notices and dated follow-ups exist. Default-on execution without separate activation, watchers/preferences, template and sender settings, declined-offer proof and actual renewal offers remain unproved; stored thirty-day settings do not execute renewals. RL-102 resolves the policy, without changing partial status. |
| `FOLLOW-004` | Client questions and comments | target | partial | `src/platter/questions.ts`, `src/platter/question-replies.ts`, `src/platter/ui/questions.ts`, `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Client pricing question. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. app answer. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. exact notification. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. queue removal. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. retained agreement thread. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. Scope/terms. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. every unverified/stale/invalid-section refusal. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. Member queue. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. held-policy agent answer. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. Every signed intake authority. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. expiry. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. replay. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. no-second-notification outcome. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. Compiled owner/client/queue/agreement at both widths. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. Answered/open CLI threads with genuine reply credentials excluded. The full combination must be traced to separate old cited assertions; policy approval does not establish the engineering outcomes. |
| `FOLLOW-005` | Decline reasons and won or lost outcomes | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | `tests/platter.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval” (Budget decline, HubSpot Closed lost fake, link revocation, follow-up closure, reopen and reapproval, configured reasons, won override, exact consent and stage-only holds); “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership” (scoped reporting); `tests/site.test.mjs` — “FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision” (1440 and 390 screens); `tests/archive.test.mjs` — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” (exact custody without execution authority) |
| `FOLLOW-006` | Default reminder schedule and expiry from the workspace and templates | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs` | Editable inherited snapshots exist. Full bulk/public-link/payment creation coverage, independent schedule authority, timeline/audit and opt-out-across-revision proof remain; RL-101 resolves execution policy. |
| `FOLLOW-011` | Delivery snapshots across proposal creation | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/platter.test.mjs` | Editable inherited snapshots exist. Full bulk/public-link/payment creation coverage, independent schedule authority, timeline/audit and opt-out-across-revision proof remain; RL-101 resolves execution policy. |
| `FOLLOW-007` | Unattended CRM synchronization with a scoped grant | target | missing |  | No unattended scoped-grant execution exists. ct must specify its consent, scope and public-door assertions; FOLLOW-005’s exact-revision stage-map consent remains the interim boundary. |
| `NEG-001` | Negotiated revisions after sending | target | done | `src/platter/negotiation.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `NEG-002` | Client-suggested text edits | target | done | `src/platter/suggestions.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` |  |
| `SIGN-003` | ESIGN and UETA electronic signature | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | Typed Client signature blocks retain explicit adoption with the accepted name and consent. Gap: consumer disclosure, withdrawal, drawn/uploaded signatures, initials and additional signer roles remain. |
| `SIGN-004` | Multiple signers, signing order and countersignature | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Policy default adopted under the standing scope rule, policy not yet ruled where noted in RULINGS: only the current owner configures roles, sends or replaces configured recipient invitations and countersigns; each recipient verifies their own mailbox. Additional viewing links require explicit audited consent, including the exact framing origin when embedded. Restoring records restores no invitation or framing authority. Scoped non-owner sending and replacement remain outside this interim boundary, and provider-specific recipient checks remain SIGN-006 work. SIGN-004 stays PARTIAL until ct approves the authority default; no legal or provider qualification is claimed. |
| `SIGN-005` | Signed agreement PDF and certificate of completion | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Two-signer completion, completion-email attachments, full agreement attachment packaging, IP-derived location and user-agent recording remain. Missing historical methods are never inferred; currently unrecorded location and user agent are labelled not recorded. This prerequisite remains PARTIAL. |
| `SIGN-006` | Signer identity options | target | partial | `tests/mail.test.mjs`, `tests/site.test.mjs` | Government ID verification through Stripe Identity or Persona, link-only signing with forwarded-device and network escalation, multiple signer roles, sender method-selection controls and safe recipient SMS re-enablement remain. The full SIGN-001 code limits and exact verification binding remain required. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps inherited from SEND-008. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders. |
| `SIGN-007` | Fields collected at acceptance | target | partial | `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Client-assigned text, date and checkbox fields enforce required values at acceptance; typed signature blocks adopt the same acceptance name. Values freeze with the agreement and survive the public CLI. Evidence: tests/platter.test.mjs — “EDIT-001 Client-assigned required fields and typed signature blocks validate at signing and freeze exact values with the selected agreement”, tests/site.test.mjs — “EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths” and tests/archive.test.mjs — “EDIT-001 public CLI retains displayed media bytes, Client field values, block questions and suggestions without restoring client authority”. Gap: recipient roles beyond Client, file collection, invoice/CRM propagation and certificate listing remain. |
| `SIGN-008` | Acceptance on the client's own paper | target | done | `src/platter/paper-acceptance.ts`, `src/platter/paper-record.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` |  |
| `SIGN-009` | Recipient delegation of signing | target | missing |  | One fixed client signer; no delegation. |
| `SIGN-010` | In-person signing on the firm's device | target | missing |  | Signing happens only from the client's own emailed link. |
| `SIGN-011` | Template recipient roles, field assignment and signing order | target | missing |  | No templates, recipient roles or field assignments; one client recipient per proposal. |
| `SIGN-012` | Recipient-role snapshots across creation | target | missing |  | No templates, recipient roles or field assignments; one client recipient per proposal. |
| `PAY-001` | Stripe card and ACH collection in the proposal | target | partial | `tests/stripe-sandbox.mjs`, `tests/collection-browser.mjs`, `tests/instrument-scan.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs` | USD collection uses Stripe Payment Element only after explicit preparation consent and a verified current signature. Exact one-time amount authorization is audited before confirmation; the provider account, accepted revision, deposit, currency, method and billing-state quote stay bound. Card and bank details stay in Stripe frames. Unknown and prohibited billing states and ACH have no card fee. Collection starts only after signing, so unsigned withdrawal releases no Stripe client secret. Gap: Apple Pay and Google Pay test-wallet payments (Stripe reports no available wallet in the headless test browser; they need a device with a configured wallet) and a browser Financial Connections instant-verification journey remain unproved. Bank verification is proved only by the micro-deposit path driven through Stripe’s test API. PAY-003, PAY-005 and PAY-008 inherit exact account, amount, revision and explicit authorization binding; this one-time authorization grants no future charge. |
| `PAY-002` | Deposit or partial payment at acceptance | target | partial | `tests/collection-browser.mjs`, `tests/stripe-sandbox.mjs`, `tests/platter.test.mjs`, `tests/site.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Due-deposit amount remains outstanding after the declined payment. The cited browser assertion checks accepted state; a separate exact due-money readback is needed. |
| `PAY-003` | Milestone and recurring payment schedules | target | missing |  | PRICE-007 retains informational schedules; authorized milestone and recurring charge execution remains absent. |
| `PAY-004` | Paid, pending, failed, refunded and disputed states | target | missing |  | No payment states. |
| `PAY-005` | Failed-payment retries and notices | target | missing |  | No retries or notices. |
| `PAY-006` | Refunds and disputes | target | partial | `src/platter/payments.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Owner, admin and billing can explicitly refund a verified existing Stripe deposit with a reason. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves Stripe-fake receipt, sales no-call refusal, exact accepted revision/account/currency binding, concurrent bounds, idempotent retries and durable uncertain holds. The compiled role journey proves billing screens at 1440/390 and the role archive journey preserves refunds without credentials. Current financial roles can verify a Stripe dispute against a linked deposit and explicitly submit the exact accepted snapshot, acceptance facts as recorded and a response note before its provider deadline. tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence” proves owner/admin/billing success, other-role no-call refusals, foreign-charge and deadline refusal, consent, idempotency, private-cost exclusion and exact retained PDF hashes. The named role browser and CLI journeys prove 1440/390 responses and restoration of exact evidence bytes without replay. CT ruling (22 October 2026, eaf743e): manual, explicitly authorized submission of available facts is approved as the interim, with preparation, authorization, submission and Stripe receipt kept distinct; the full pack submitted to Stripe stays the target. The bounded correction is proven by tests/platter.test.mjs — “TEAM-001 / PAY-006 dispute responses enforce financial roles, exact deposit binding, deadlines and consent, retaining the exact idempotent Stripe evidence”: retained acceptance-method facts and omitted-file names; exact preview/hash/amount/deadline authorization and its audit record; owner/admin/billing authority and other-role/agent no-call refusals; missing authorization, changed hash/note/retained amount and expired deadline no-call refusals; claim before provider I/O, explicit submit, byte-for-byte upload, concurrent exclusion and timeout replay hold; under-review-only receipt and provider won/lost states. A provider amount/deadline change discovered during the claimed preflight read holds the attempt before any upload. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves prepare, exact PDF review, authorization and submission at 1440/390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves exact packet/authorization/submission/hash custody, excluded credentials and restore/replay without provider calls. Gap: accounting credits, full SIGN-005 certificates/attachments, TRACK-001 view evidence and PAY-001/PAY-002 authorization artifacts; uncertain refunds/submissions require provider reconciliation. |
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
| `AUTO-003` | Team chat notifications | target | partial | `tests/mail.test.mjs` | Nook, broader proposal events, channel settings screens and chat-native approval interactions remain. Conservative default adopted  Restored routes require explicit reconnection and new consent. Future Nook and COLLAB-002 event sources inherit these obligations. |
| `AUTO-004` | Public REST API and webhooks | target | partial | `src/platter/api/index.ts`, `src/platter/api/webhooks.ts`, `tests/platter.test.mjs`, `tests/site-lifecycle.mjs`, `tests/archive.test.mjs` | The ct demotion remains in force pending fresh acceptance of the corrected public status and analytics, negotiated revision events, all ten receiver deliveries and independently expected documented scopes. Exact-candidate Verify and guarded landing receipts remain pending; AUTO-004 must remain partial until ct accepts. |
| `AUTO-005` | Zapier, Make and Crank apps | target | missing |  | No automation-platform apps. |
| `HAND-001` | Accepted-scope handoff to delivery tools | target | missing |  | No delivery handoff. |
| `HAND-002` | Handoff to Gauge with budget and rates | target | missing |  | No Gauge handoff. |
| `RENEW-001` | Bulk proposal creation and sending | target | missing |  | No bulk sending. |
| `RENEW-002` | Renewal proposals from accepted agreements | target | missing |  | No renewals. |
| `REPORT-001` | Proposal pipeline dashboard | target | partial | `src/platter/pipeline.ts`, `src/platter/ui/pipeline.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every role’s full visible report set. The matrix includes unimplemented content/revenue specialist reports. |
| `REPORT-002` | Win rate and sales performance | target | missing |  | No conversion reporting. |
| `REPORT-003` | Content and pricing performance | target | missing |  | No content analytics. |
| `REPORT-004` | Booked, billed and collected revenue | target | partial | `src/platter/reports/recorded-revenue.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | The recorded-revenue pipeline view now shows accepted value, explicitly received payments, confirmed refunds, net received, unconfirmed refunds and exported deposit CSV value, separately by currency. It never labels an export as a paid provider invoice. Owner/admin/billing see all, manager/viewer see teams and sales sees own; content editors and agents receive no revenue facts. tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund” proves hand-computed totals, each role, exact filtered CSV and once-only scheduled email with identical rows and money. The named role browser journey proves sales/manager/billing views and owner CSV/scheduling at 1440/390; the named role CLI archive journey preserves receipts, refunds, filters and identical report rows/totals. Gap: recurring/MRR/first-year figures, provider invoiced/overdue amounts, accepted/payment-period reporting and accounting reconciliation with the QuickBooks fake remain. |
| `REPORT-005` | Report export and scheduled delivery | target | partial | `src/platter/reports/schedules.ts`, `src/platter/reports/pipeline-csv.ts`, `src/platter/reports/zone.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` | All listed acceptance outcomes are traced in DONE-AUDIT. The published conservative demotion is retained pending a fresh ct judgment; this rewrite makes no status promotion. |
| `REPORT-006` | Scheduled report delivery | target | partial | `src/platter/reports/schedules.ts`, `src/platter/reports/pipeline-csv.ts`, `src/platter/reports/zone.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Weekly win-rate report reaches two people with exact screen rows/figures and CSV. REPORT-002 win-rate does not exist; pipeline fallback does not assert it. Once-only run. Every independent branch needs its own assertion. inactive recipients. Every independent branch needs its own assertion. uncertain delivery across downtime. Every independent branch needs its own assertion. Schedules restore without transport. This part’s old Evidence set omits the archive assertion file. |
| `TEAM-001` | Roles and permissions | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read/edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts/sorting/totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, workspace deletion and full content/revenue report capabilities. Base’s native issuer-version check still rejects a pending invitation after a native role promotion even when the issuer retains grant authority (a public /auth/operator/role then /auth/confirm probe returns 400, no session); product time-zone/team additions are preserved, but native-version preservation needs a supported Base change or explicit review of credential rebinding. The native security guard is retained. CT ruling (22 October 2026, eaf743e) implemented: a share grants one proposal, never role authority. Cell (8) is proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”; the named role browser journey covers the out-of-team manager without Send, Approve or Unlock controls at 1440/390. Catalog edit/insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates/team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. CT ruling (22 October 2026, eaf743e) implemented: current grant authority, exact native invitation binding, cancellation and expiry, and explicit consent for wider folder/item audiences. Cell (9) is proved by tests/platter.test.mjs — “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”; cell (10) by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content” and the named role browser journey at 1440/390. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google/Microsoft mailbox connections now ship; the QuickBooks admin/sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Mailbox connections follow SEND-001's ct-approved provider-verified one-member binding: OAuth mailboxes may differ from sign-in, refresh before sending, and attribute the selected sender. Its legacy access-token door remains identity-only. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder/expiry/payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001/FOLLOW-006 work. Native ownership handoff is proved with fresh email-link authority, denied non-owner writes, revoked old-owner sessions/agent keys and retained proposals in tests/platter.test.mjs — “TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace”. tests/platter.test.mjs — “TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership” proves the actual additive migration and scoped old-member reads. The recorded-revenue pipeline view now enforces all current revenue-report role cells, with hand-computed payment/refund totals and matching CSV/scheduled mail. Full content reports and remaining revenue features remain foundations in this seed, not account blockers. Current reminder policy and execution rights are additionally proved by tests/mail.test.mjs — “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap” and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”: only owner/admin change quiet hours, sending follows live proposal/team scope, and role or invitation changes during provider I/O refuse the reminder without a provider send or fallback. The existing delegated-invitation journey now reproduces the native issuer-version blocker through /auth/operator/role and /auth/confirm: an authorized manager promoted to native admin still yields 400 and no session, product role or team on the old invitation. This needs a supported Base change; credential versions are never rebound here. |
| `TEAM-006` | Scoped membership invitations | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read/edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts/sorting/totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, workspace deletion and full content/revenue report capabilities. Base’s native issuer-version check still rejects a pending invitation after a native role promotion even when the issuer retains grant authority (a public /auth/operator/role then /auth/confirm probe returns 400, no session); product time-zone/team additions are preserved, but native-version preservation needs a supported Base change or explicit review of credential rebinding. The native security guard is retained. CT ruling (22 October 2026, eaf743e) implemented: a share grants one proposal, never role authority. Cell (8) is proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”; the named role browser journey covers the out-of-team manager without Send, Approve or Unlock controls at 1440/390. Catalog edit/insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates/team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. CT ruling (22 October 2026, eaf743e) implemented: current grant authority, exact native invitation binding, cancellation and expiry, and explicit consent for wider folder/item audiences. Cell (9) is proved by tests/platter.test.mjs — “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”; cell (10) by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content” and the named role browser journey at 1440/390. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google/Microsoft mailbox connections now ship; the QuickBooks admin/sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Mailbox connections follow SEND-001's ct-approved provider-verified one-member binding: OAuth mailboxes may differ from sign-in, refresh before sending, and attribute the selected sender. Its legacy access-token door remains identity-only. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder/expiry/payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001/FOLLOW-006 work. Native ownership handoff is proved with fresh email-link authority, denied non-owner writes, revoked old-owner sessions/agent keys and retained proposals in tests/platter.test.mjs — “TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace”. tests/platter.test.mjs — “TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership” proves the actual additive migration and scoped old-member reads. The recorded-revenue pipeline view now enforces all current revenue-report role cells, with hand-computed payment/refund totals and matching CSV/scheduled mail. Full content reports and remaining revenue features remain foundations in this seed, not account blockers. Current reminder policy and execution rights are additionally proved by tests/mail.test.mjs — “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap” and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”: only owner/admin change quiet hours, sending follows live proposal/team scope, and role or invitation changes during provider I/O refuse the reminder without a provider send or fallback. The existing delegated-invitation journey now reproduces the native issuer-version blocker through /auth/operator/role and /auth/confirm: an authorized manager promoted to native admin still yields 400 and no session, product role or team on the old invitation. This needs a supported Base change; credential versions are never rebound here. |
| `TEAM-007` | Team folder audiences | target | partial | `src/platter/permissions.ts`, `src/platter/approvals.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs`, `tests/mail.test.mjs` | Product roles, teams, collaborator sharing and personal time zones now ship. Native members default to sales in no team; state, revision history, direct reads, previews, attachments, edits and sends enforce proposal scopes, including transaction-time membership and sharing checks. Current personal-template, pipeline, audit, workspace-default, shared text-library editing and internal-pricing read/edit rights are enforced; scopes and exact no-write refusals are proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”, scoped awaiting-approval counts/sorting/totals by tests/platter.test.mjs — “FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner and status and every field, sort and total exact values without changing ownership”, screens at 1440/390 by tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths”, and custody by tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items”. Gap: the full rights matrix remains unproved and unimplemented for SSO provider connections, workspace deletion and full content/revenue report capabilities. Base’s native issuer-version check still rejects a pending invitation after a native role promotion even when the issuer retains grant authority (a public /auth/operator/role then /auth/confirm probe returns 400, no session); product time-zone/team additions are preserved, but native-version preservation needs a supported Base change or explicit review of credential rebinding. The native security guard is retained. CT ruling (22 October 2026, eaf743e) implemented: a share grants one proposal, never role authority. Cell (8) is proved by tests/platter.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP”; the named role browser journey covers the out-of-team manager without Send, Approve or Unlock controls at 1440/390. Catalog edit/insertion and manual dispute responses now ship, with their named CAT-001 and PAY-006 public-door proofs.  Shared templates/team folders, library folders, native-section template locks and delegated invitations now ship. Their public-door proofs are tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content”, “TEAM-001 / EDIT-015 template locks survive starts, copies and personal templates; proposal unlocks require scope and edited terms require approval”, and “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”, plus the named role browser and CLI journeys. CT ruling (22 October 2026, eaf743e) implemented: current grant authority, exact native invitation binding, cancellation and expiry, and explicit consent for wider folder/item audiences. Cell (9) is proved by tests/platter.test.mjs — “TEAM-001 delegated invitations bind roles and teams to current inviter authority and refuse native-route bypasses”; cell (10) by tests/platter.test.mjs — “TEAM-001 shared templates and library folders enforce role edits and live team audience when listing, starting and replacing content” and the named role browser journey at 1440/390. Verified Stripe, QuickBooks, HubSpot, Salesforce, Google Drive, Slack and own Google/Microsoft mailbox connections now ship; the QuickBooks admin/sales boundary is proved by tests/platter.test.mjs — “TEAM-001 provider connections verify accounts, seal credentials, enforce admin and own-mailbox rights and disconnect without exposing tokens”. Credentials are encrypted and excluded from archives; restored metadata requires reconnection. Mailbox connections follow SEND-001's ct-approved provider-verified one-member binding: OAuth mailboxes may differ from sign-in, refresh before sending, and attribute the selected sender. Its legacy access-token door remains identity-only. Billing refund and received-payment authority are proved by tests/platter.test.mjs — “TEAM-001 billing records received payments and refunds a verified Stripe deposit; sales cannot call Stripe and retries or uncertain outcomes cannot double refund”. Workspace reminder/expiry/payment-default authority and snapshots now ship; reminder execution remains FOLLOW-001/FOLLOW-006 work. Native ownership handoff is proved with fresh email-link authority, denied non-owner writes, revoked old-owner sessions/agent keys and retained proposals in tests/platter.test.mjs — “TEAM-001 / APPROVE-003 native admins remain eligible named approvers and settings audit records identify the actual person or workspace”. tests/platter.test.mjs — “TEAM-001 upgrading a pre-role database keeps former members as sales without inferring historical ownership” proves the actual additive migration and scoped old-member reads. The recorded-revenue pipeline view now enforces all current revenue-report role cells, with hand-computed payment/refund totals and matching CSV/scheduled mail. Full content reports and remaining revenue features remain foundations in this seed, not account blockers. Current reminder policy and execution rights are additionally proved by tests/mail.test.mjs — “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap” and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”: only owner/admin change quiet hours, sending follows live proposal/team scope, and role or invitation changes during provider I/O refuse the reminder without a provider send or fallback. The existing delegated-invitation journey now reproduces the native issuer-version blocker through /auth/operator/role and /auth/confirm: an authorized manager promoted to native admin still yields 400 and no session, product role or team on the old invitation. This needs a supported Base change; credential versions are never rebound here. |
| `TEAM-002` | Single sign-on and SCIM provisioning | target | missing |  | No SSO or SCIM. |
| `TEAM-003` | Multiple brands and workspaces | target | missing |  | One workspace and brand. |
| `TEAM-004` | Audit log | target | partial | `src/platter/audit.ts`, `src/platter/auth-audit.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Compiled admin/owner audit. The old browser Evidence file imports the assertion helpers rather than containing them. unauthorized readers at 1440/390. The old browser Evidence file imports the assertion helpers rather than containing them. |
| `TEAM-005` | Security review pack for procurement | target | missing |  | No security page, questionnaire answers, DPA, subprocessor list or audit report. |
| `MIG-001` | PandaDoc move-in | target | missing |  | No PandaDoc import. |
| `MIG-002` | Proposify move-in | target | missing |  | No Proposify import. |
| `MIG-003` | Better Proposals move-in | target | missing |  | No Better Proposals import. |
| `MIG-004` | Qwilr and Ignition move-in | target | missing |  | No Qwilr or Ignition import. |
| `MIG-005` | Open proposals and payment schedules continue | target | missing |  | No in-flight migration. |
| `MIG-006` | Clients, contacts and catalog CSV move-in | target | partial | `src/platter/movein/business-import.ts`, `src/platter/business-records.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | image URLs fetched through Base's egress relay |
| `MIG-007` | Move-in from exported files without API access | target | missing |  | No document import; only the client CSV kit exists. |
| `MOB-001` | Team app on a phone | target | partial | `tests/site.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Sales template/send/answer/queue. All browser asserting lines are outside the sole old cited wrapper. manager approval. All browser asserting lines are outside the sole old cited wrapper. sales refusal at 390. All browser asserting lines are outside the sole old cited wrapper. |
| `MOB-002` | iOS and Android apps with push notifications | target | missing |  | No native apps or push. |
| `AI-001` | Drafts from meeting notes, transcripts and email | target | partial | `src/platter/http.ts`, `tests/platter.test.mjs` | Legacy preparation exists only in part. Complete sourced proposal work and seed-wide risk classification/company-policy execution are not proved; the old implementation boundary is recorded in CHANGELOG. |
| `AI-002` | Writing assistant in the editor | target | missing |  | No writing assistant. |
| `AI-003` | MCP server for AI assistants | target | partial | `src/platter/mcp.ts`, `src/platter/send-requests.ts`, `tests/platter.test.mjs`, `tests/site.test.mjs`, `tests/archive.test.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: MCP search. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. schema. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. draft/revision/status. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. engagement. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. One retained send request with unchanged business state before execution. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. Held. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. all-autonomous company-policy execution. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. revoked/foreign-origin refusal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. Stale revision. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. dismissal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. exact fulfillment. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. Premature/unauthorized queue refusal. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. absence of credentials. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. Compiled queue at both widths. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. exact credential-free CLI restore. The legacy implementation proves portions but not the new company-policy class decision; its hard-coded name refusals do not establish this target. |
| `AI-004` | Explainable price suggestions | target | missing |  | No price suggestions. |
| `PRIV-001` | Erasure across contacts, tracking and synced systems | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Only unused client records can be erased; no contacts, tracking data or notice to synced systems. |
| `PORT-002` | Complete product archive | target | partial | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` | Carried evidence asserts the outcomes marked asserted in DONE-AUDIT. Unasserted: Every product record/attachment part is identical on re-export. Named subset comparisons do not establish a complete part inventory equality. Every provider/agent/native/verification/mail credential kind is absent from the populated archive. Every named exclusion requires a mechanism assertion; one empty table is insufficient. |
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
