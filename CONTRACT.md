# Platter contract

Target edition: 17 October 2026. Platter is proposal-to-payment software for US service businesses, agencies and consultancies replacing PandaDoc, Proposify or Better Proposals, with the interactive pricing and payment collection buyers look for in Qwilr and Ignition. A firm writes a branded proposal from templates, a content library and a priced catalogue, sends it from its own mailbox, sees who read what, follows up until a decision, negotiates exact revisions, collects an ESIGN-compliant signature and takes the deposit, milestones and recurring fees by card or ACH, with the deal, invoices and payments kept in step with the CRM and accounting system the firm already uses. Amounts are USD, sales tax follows US state rules, and payment and accounting connections are US services.

This is a target contract: the product Platter is being built towards, with each clause marked by how close the current code is. The first release (two GST-free AUD options, owner approval of an exact revision, mailbox-verified acceptance and one retained deposit CSV) is kept as the published clauses below; nothing it guarantees is weakened, and the AUD format is retired for new proposals by `PRICE-001` and `PRICE-008`. This documentation round changes no homepage, interface or runtime behaviour. Source acquisition and command effects follow `SEED-COMMAND-CONTRACT.md`; acceptance journeys are listed in `ACCEPTANCE.md`.

## Product target

| | |
| --- | --- |
| Category | Proposal software |
| Incumbents a buyer switches from | PandaDoc, Proposify, Better Proposals |
| Up-and-comers it must also beat | Qwilr, Ignition |
| First buyer | A US owner or sales lead at a service business, agency or consultancy with 1 to 50 staff, quoting in USD, collecting deposits by card or ACH through their own Stripe account, and running HubSpot, Salesforce or Orbit with QuickBooks Online or Xero |
| What switching means | Their templates, content library, products, contacts and open and signed documents arrive from PandaDoc, Proposify, Better Proposals, Qwilr or Ignition with a list of what did not map; every daily job (write, price, approve, send, track, follow up, negotiate, sign, get paid, hand off, report) has a Platter equivalent; their CRM, accounting, mailbox, file store, chat and delivery tools plug in |

A buyer replacing an incumbent needs the whole job, so the target is the whole job:

- **Write.** A branded drag-and-drop editor with templates, a reusable content library, variables from the CRM, rich media, conditional content, attachments such as the firm's W-9, Word and PDF import and export, a custom domain and a phone-ready client page (`EDIT-001` to `EDIT-010`).
- **Price.** A catalogue, USD pricing tables with quantities and units, packages and optional items the client chooses, one-off and recurring fees, discounts, US sales tax, internal cost and margin, and payment terms with deposits and milestones (`CAT-001`, `PRICE-001` to `PRICE-008`).
- **Work as a team.** Live co-editing, internal comments, version history, approval rules by value, discount, margin and terms, and approval requests that reach the approver (`COLLAB-*`, `APPROVE-*`, `PROP-001`).
- **Send and track.** Sending from Gmail or Microsoft 365, delivery and bounce states, several recipients with roles, expiry, notifications, view and section-level analytics and forwarded stakeholders, with tracking disclosed (`SEND-*`, `TRACK-*`).
- **Follow up and negotiate.** Reminders, an accountable next-action queue, expiry and renewal notices, client questions, decline reasons, negotiated revisions and client-suggested edits (`FOLLOW-*`, `NEG-*`).
- **Sign.** ESIGN and UETA signatures, several signers with order and countersignature, a signed PDF with certificate of completion, SMS and ID verification, fields collected at signing and acceptance on the client's own paper (`SIGN-001` to `SIGN-008`).
- **Get paid.** Stripe card and ACH collection in the proposal, deposits at acceptance, milestone and recurring schedules, payment states, retries, refunds, disputes and offline checks and wires (`PAY-*`), synced to QuickBooks Online, Xero or Pantry with one invoice authority and reconciliation (`ACCT-*`, `INV-001`).
- **Connect.** HubSpot, Salesforce, Orbit, Pipedrive and Zoho CRM sync; status-driven automations; document archiving to Google Drive, OneDrive, SharePoint, Box or Chest; Slack, Teams and Nook; a public API, webhooks, Zapier, Make and Crank; and handoff of the accepted scope to Asana, Trello, monday.com, ClickUp, Jira, Vector or Gauge (`CRM-*`, `AUTO-*`, `HAND-*`).
- **Renew, report and administer.** Bulk sends and renewals, pipeline, win-rate, content and revenue reports, roles, SSO and SCIM, several brands and an audit log (`RENEW-*`, `REPORT-*`, `TEAM-*`).
- **Move in and out, anywhere.** Importers for PandaDoc, Proposify, Better Proposals, Qwilr and Ignition that keep open proposals and payment schedules running, CSV move-in, complete archives and erasure, and phone and native apps (`MIG-*`, `IMPORT-001`, `PORT-*`, `PRIV-001`, `MOB-*`).
- **Agents beyond the category.** Drafts from discovery calls tested against the firm's real delivery costs, capacity and outcomes, questions and payment exceptions chased to resolution, and out-of-scope delivery turned into separately approved change orders (`AI-*`, `AGENT-*`).

### Neighbouring products stay separate

Platter is one product. Where the market sells a neighbouring product separately, Platter connects to it and does not rebuild it; when the neighbour is a Run Edit Run sibling, Platter links to that sibling first and to the US incumbent second.

| Job | Owned by | How Platter meets it |
| --- | --- | --- |
| Sales CRM: contacts, pipelines, sequences, forecasting | [Orbit](https://github.com/just-every/run-orbit) (or HubSpot, Salesforce, Pipedrive) | Two-way deal, contact and line-item sync and timeline events (`CRM-001` to `CRM-004`); Platter keeps only the clients and contacts proposals need |
| General ledger, bank feeds and books | [Pantry](https://github.com/just-every/run-pantry) (or QuickBooks Online, Xero) | Invoices, payments and refunds posted to one chosen invoice authority (`ACCT-001` to `ACCT-005`) |
| Standalone e-signature for any document | [Inkwell](https://github.com/just-every/run-inkwell) (or Docusign eSignature) | Platter signs its own proposals and agreements (`SIGN-*`); other documents go through Inkwell, and client-paper signatures are recorded (`SIGN-008`) |
| Contract lifecycle management and master-agreement redlining | [Locket](https://github.com/just-every/run-locket) (or Ironclad) | Client-suggested text edits on the proposal (`NEG-002`); MSAs and obligations are linked as attachments (`EDIT-010`) |
| Subscription and usage-based billing, dunning beyond the agreed schedule | [Nectar](https://github.com/just-every/run-nectar) (or Stripe Billing, Chargebee) | Platter runs the schedule the client accepted (`PAY-003`); metered or long-running subscription billing hands off through the API (`AUTO-004`) |
| Project delivery, time, staffing and margin | [Gauge](https://github.com/just-every/run-gauge) (or Harvest with Forecast, Kantata, Asana) | Accepted-scope handoff (`HAND-001`, `HAND-002`) and delivery actuals read by `AGENT-002` and `AGENT-006` |
| Meeting booking | [Dial](https://github.com/just-every/run-dial) (or Calendly) | Booking links embedded in proposals (`EDIT-006`) |
| File storage | [Chest](https://github.com/just-every/run-chest) (or Google Drive, SharePoint, Box) | Signed documents filed by `AUTO-002` |
| Team chat | [Nook](https://github.com/just-every/run-nook) (or Slack, Microsoft Teams) | Notifications and approval actions (`AUTO-003`, `APPROVE-002`) |
| Workflow automation across apps | [Crank](https://github.com/just-every/run-crank) (or Zapier, Make) | Triggers, actions, webhooks and API (`AUTO-004`, `AUTO-005`) |
| Workforce identity | [Auth](https://github.com/just-every/run-auth) (or Okta, Microsoft Entra ID) | SAML or OIDC sign-in and SCIM (`TEAM-002`) |
| Trade quotes, construction estimates and accounting engagement letters | [Glove](https://github.com/just-every/run-glove), [Plinth](https://github.com/just-every/run-plinth) and [Blotter](https://github.com/just-every/run-blotter) (or Jobber, Buildertrend, Karbon) | Not rebuilt: those vertical products quote inside their own job records; Platter is the horizontal proposal product for agencies, consultancies and professional services |

### How to read this contract

- **Published clauses** are the `- **ID — Title.**` bullets under [Published guarantees](#published-guarantees). They are what the first release already promised, kept and rewritten as named clauses.
- **Target clauses** are the `#### ID — Title.` headings under [Target clauses](#target-clauses), and **push-further clauses** are those under [Push further](#push-further). They are binding product requirements not yet delivered in full. A build round that delivers one turns it into a published bullet with the same ID; IDs never change.
- **Status** (in [Status](#status) and after each target clause) is `done`, `partial` or `missing`, judged from the code and tests at commit `658ddc0` (17 October 2026). `done` means the behaviour ships and a cited test exercises it; `partial` means some of it ships, or it ships without a test of the whole behaviour; `missing` means there is no implementation. Status is a build-planning judgement, not acceptance.
- **Acceptance** is a journey or test through a public door: an HTTP route, the browser at 1440 and 390 pixels, the CLI, the MCP server, a native app or an import or export file. Fakes are allowed only at a paid or network edge (Stripe, Twilio, mail, CRM, accounting, storage and chat providers); a provider fake proves Platter's side only, never live provider behaviour, which is proven in the provider's sandbox or test mode.

## Published guarantees

These clauses hold today and stay binding as the product grows. Where a target clause extends one, it names it.

### Access and authority

- **HTTP-001 — Authorized domain dispatch.** Every proposal, client, import and invoice handler checks a native Base owner or member session, or a revocable owner-bound agent key, before it reads or writes. Browser mutations require the configured Origin and Host and refuse cross-site requests. Signed-out readers of `/app` are sent to sign-in, and unknown routes return real 404s. **Acceptance evidence:** Through HTTP: read state signed out (401), post a mutation from a foreign Origin (403), call a domain command with a revoked agent key (401) and as a member for an owner-only action (403).
- **ACCESS-001 — Revocable agent keys that only draft.** An owner issues an agent key with a label and a 30-day expiry, stored only as a hash and bound to that owner's current account version. An agent key can read context and prepare or revise drafts, and nothing else: it cannot add clients, approve prices, send offers or export invoices. Revoking the key, or the owner losing the owner role, ends its access at once. Drafts an agent prepares are attributed to the key. **Acceptance evidence:** Create a key, prepare a draft with it, try to approve and add a client with it (403), revoke it, and read context with it again (401).

### Approval, sending and acceptance

- **PROP-001 — The owner approves the exact revision.** Only a person with the owner role approves a proposal, and approval names one exact revision. Saving a new revision clears the approval, so a changed price or scope can never be sent on an earlier approval. Each approval is recorded with its approver, revision and time. `APPROVE-001` adds rules and routing on top of this guarantee; it never removes it. **Acceptance evidence:** Approve a stale revision (409), approve the current one, revise the price, try to send (409), approve the new revision and send; two approval records exist.
- **PROP-002 — Sending freezes the offer.** Sending freezes the approved revision: its scope, options and prices can no longer be edited in place. The owner can send a fresh invitation, which rotates the client link and clears any verification session without changing the offer. A change after sending is a new revision under `NEG-001`, never an edit to what the client already holds. **Acceptance evidence:** Send an approved proposal, try to revise it (409), send a fresh invitation and confirm the old link is refused and the offer unchanged.
- **SIGN-001 — Verified-mailbox acceptance.** A client invitation grants access only to its own frozen offer. Acceptance needs a mailbox verification code: six digits, single use, valid for 10 minutes, at most five attempts, one request a minute and ten codes per invitation. Verification grants acceptance authority only for that invitation and revision, through an HttpOnly, SameSite=Strict cookie scoped to the invitation path. **Acceptance evidence:** Accept before verifying (401), verify, submit a code again (401), exhaust five wrong attempts and see the right code refused, expire a code and see it refused.
- **SIGN-002 — Immutable acceptance with an integer-cent deposit.** Acceptance requires a verified mailbox, a typed full name, one offered option and explicit consent. One D1 transaction retains the exact approved snapshot, signer, consent text and time, and calculates the deposit in integer cents, rounding to the nearest cent. A second acceptance returns the first; nothing in the product edits an accepted agreement. **Acceptance evidence:** Accept with an unknown option (400), accept option two with consent, accept again with another name and option, and read back the first acceptance with total 420000 and deposit 105000 cents.
- **INV-001 — One retained deposit invoice per acceptance.** An owner exports the accepted deposit as an invoice record. A unique proposal-to-invoice binding makes concurrent and repeated exports return one retained invoice with one number, and the export can be downloaded again without creating another. Re-downloading never authorizes posting the same invoice to accounting twice; `ACCT-004` carries this one-invoice rule into live accounting sync. The first release writes a Xero-format CSV; the export rejects proposals that are not accepted. Spreadsheet formula characters in client-controlled cells are neutralised. **Acceptance evidence:** Export an unaccepted proposal (409), export an accepted one twice concurrently and get one invoice, and download its CSV.

### Clients, erasure and archives

- **IMPORT-001 — Reviewed client CSV move-in with undo.** The client CSV kit previews the exact source bytes without writing, and applies only the file whose fingerprint was reviewed. Base import-kit retains the original, its fingerprint, a journal and reversible native writes. Re-applying returns the same job. Undo restores the previous state and refuses when an imported client has changed or has dependent proposals. **Acceptance evidence:** Preview `fixtures/clients.csv`, apply a changed file against the reviewed fingerprint (409), apply the reviewed file, read the journal, re-apply, undo, and see an undo refused once a proposal uses an imported client.
- **ERASE-001 — Bounded client erasure.** An owner erases a client by typing the exact client name. Erasure is limited to clients with no proposals and no import history; agreements remain retained business records. Erasure writes a portability fence, so an older archive cannot restore the erased client and in-flight transfers are invalidated. **Acceptance evidence:** Erase a client with a draft (409), erase with the wrong name (400), erase an unused client, then restore an older archive with the newer erasure journal and find the client absent.
- **PORT-001 — Validated archives and restore.** RER archives preserve clients, proposals, revisions, approvals, immutable acceptances and deposit invoices. Credentials, sessions, client invitation links, verification state and mail do not travel. Restore requires an empty destination and valid integrity, and refuses an older archive without a newer erasure journal. Sent offers need fresh invitations after restore. **Acceptance evidence:** Through the public CLI: export, import into an empty checkout and re-export identical parts, refuse a populated destination (4), refuse a damaged archive (1), and refuse an older archive after an erasure (4).

### Mail and the public site

- **MAIL-001 — Durable proposal mail with honest outcomes.** Local proposal and verification mail is captured without a provider. Hosted mail is queued durably in the same transaction as the action that sends it, claimed before contacting the configured sender, and records an uncertain outcome without a blind retry. Provider acceptance is shown as accepted by the provider, never as delivered; `SEND-002` adds delivery and bounce states. **Acceptance evidence:** A Workers journey with a provider fake at the network edge: send, see the row claimed before the call, return accepted, then return a timeout and see the row left uncertain and not resent.
- **SITE-001 — Public run site and documentation.** The public run site is built with `rer build --site`. Its homepage's Run Platter action opens `/run`, and `/docs` renders the repository's Markdown guides without JavaScript. The installed root stays the shared Lobby. Run-site deployment is guarded by `RUN_SITE_DEPLOY` and stays off until its gate. **Acceptance evidence:** Build the site, open `/` and follow Run Platter to `/run`, open `/docs` with JavaScript disabled, and open the installed `/` to see the Lobby.

## Target clauses

These clauses complete the category job alongside the published guarantees. Each states the behaviour a buyer gets, its acceptance evidence and its current status.

### Authoring and branding

#### EDIT-001 — Branded drag-and-drop proposal editor.

A member builds a proposal from blocks: cover page, heading, rich text, image, video, columns, pricing table (`PRICE-001`), quote or testimonial, team bio, case study, terms, form field (`SIGN-007`), signature block and page break. Blocks are added from a palette, reordered by drag or keyboard, duplicated and deleted with undo. A brand kit sets the logo, colours, fonts and a default cover. One document renders as a responsive web page for the client and as a paginated US Letter PDF (`EDIT-005`) with the same content. Edits autosave under the version guard of `COLLAB-001`, and the editor stays responsive on a 40-page proposal with 30 images.

*Acceptance:* A browser journey at 1440 and 390 pixels builds a proposal from blank with every block type, reorders by drag and by keyboard, applies a brand kit, reloads and sees the same document, and exports a PDF whose pages carry the same blocks in order.

*Status:* partial. Only a title, scope and two-option form with fixed Platter styling; no block editor, layouts or brand kit. (`src/platter/ui/proposals.ts`, `src/platter/commands.ts`)

#### EDIT-002 — Proposal templates.

Admins publish templates (layout, blocks, default pricing tables, terms and variables) that members start proposals from. Platter ships starter templates for US agencies, consultancies, IT managed services, creative studios and professional services. A member can save any proposal as a template. Templates have owners, folders and access rules (`TEAM-001`), and changing a template never changes proposals already created from it.

*Acceptance:* Create a template with a pricing table and variables, start two proposals from it, edit the template, and confirm both proposals are unchanged while a third proposal picks up the edit.

*Status:* missing. No templates.

#### EDIT-003 — Reusable content library.

A shared library holds sections, images, videos, case studies, team bios, testimonials, terms and pricing tables, with folders, tags and search. A member inserts an item as a linked copy (updated when the library item changes, until the proposal is sent) or as a detached copy. Sent and accepted proposals never change when the library does. Each item shows where it is used and when it last changed.

*Acceptance:* Insert a linked and a detached case study into a draft and a sent proposal, edit the library item, and see only the linked copy in the draft change; the item's usage list names all three.

*Status:* missing. No content library.

#### EDIT-004 — Variables from client, deal and CRM records.

Text and pricing can use variables: client company, contact name and title, address, deal name and amount, sender details, dates and custom fields, filled from Platter records or from the linked HubSpot, Salesforce or Orbit deal (`CRM-001` to `CRM-003`). A variable with no value is flagged in the editor, and sending is refused until each one is filled or deliberately cleared. The sent revision freezes the filled values.

*Acceptance:* Create a proposal from a HubSpot deal fake with a missing contact title, see the send refused naming that variable, fill it, send, change the deal in the fake, and see the sent proposal unchanged.

*Status:* missing. No variables or merge fields.

#### EDIT-005 — Word and PDF import and export.

A member uploads a Word (.docx) file and gets editable blocks with headings, lists, tables and images kept. A PDF upload becomes fixed pages that can carry signature and form fields. Any proposal exports to PDF (US Letter or A4) and to Word. The signed agreement PDF is `SIGN-005`.

*Acceptance:* Upload a 10-page .docx with headings, a table and images and see them as blocks; upload a PDF and place a signature field on page 3; export the proposal as PDF and .docx and open both.

*Status:* missing. No import or export of documents.

#### EDIT-006 — Embedded rich media.

Proposals embed images and galleries, uploaded video, YouTube, Vimeo, Loom and Wistia video, a Dial or Calendly booking link and embedded PDFs. Embeds come from an allowlist with a content security policy, render on phones, and show a still and a link in the PDF export. Uploaded media is stored with the proposal and travels in archives (`PORT-002`).

*Acceptance:* Add an uploaded video, a Loom link and a gallery, view on a 390-pixel phone and play the video, export the PDF and see stills with links, and try an embed from a host outside the allowlist (refused).

*Status:* missing. No media blocks.

#### EDIT-007 — Mobile client review.

The client reads, chooses options, comments, signs and pays on a phone as well as on a desktop. The client page meets WCAG 2.2 AA, works with keyboard and screen reader, and needs no app or account.

*Acceptance:* A browser journey at 390 pixels opens an invitation, verifies the mailbox, changes an optional item, comments, signs and pays with a Stripe test card; an axe scan reports no WCAG 2.2 AA violations and a keyboard-only run completes the same journey.

*Status:* partial. The client page has viewport and narrow-screen styling only; there is no mobile journey, no rich blocks and no accessibility audit. (`src/platter/ui/client.ts`, `src/platter/ui/shared.ts`, `tests/platter.test.mjs`)

#### EDIT-008 — Custom domain and branded client experience.

An owner serves client links from their own domain, such as `proposals.example.com`, and sends from their own domain with SPF, DKIM and DMARC alignment checked before use. The client page, emails and PDF carry the firm's brand and no Platter branding.

*Acceptance:* Configure a custom hostname and sending domain in a staging account, see the DNS checks pass, send, and open the client link on the custom domain with no Platter branding in page, email or PDF.

*Status:* missing. Client links use the installation origin with Platter styling.

#### EDIT-009 — Conditional content by package.

A section can be shown only when a package, optional item or variable has a given value, so choosing the Premium package shows its deliverables and timeline. The accepted agreement and PDF contain exactly what the client saw for their selection.

*Acceptance:* Make a timeline section depend on the Premium package, accept the Standard package and see the section absent from the agreement and PDF, then accept Premium on another copy and see it present.

*Status:* missing. No conditional content.

#### EDIT-010 — Attachments and vendor documents.

A proposal carries attachments such as the firm's W-9, certificate of insurance, MSA or case-study PDFs. The firm stores its current W-9 and insurance certificate once and attaches them by default. Attachments are frozen with the sent revision and listed in the signed agreement package.

*Acceptance:* Upload a W-9 in settings, send a proposal, and as the client download the W-9; replace the W-9 in settings and see the sent proposal still carry the original.

*Status:* missing. No attachments.

### Catalogue and pricing

#### CAT-001 — Service and product catalogue.

A catalogue holds services and products with name, description, SKU, unit (hour, day, month, project or each), USD unit price, internal cost, default recurrence, taxable flag and tax code, and income account. It imports from CSV with a reviewed preview (as `IMPORT-001`) and syncs from QuickBooks Online or Xero items and HubSpot or Salesforce products (`ACCT-001`, `ACCT-002`, `CRM-001`, `CRM-002`). Pricing tables add items from it; price changes never alter sent proposals.

*Acceptance:* Import 50 items from CSV with a preview, sync items from a QuickBooks Online fake, add two items to a pricing table, change an item's price, and see the sent proposal unchanged and a new draft use the new price.

*Status:* missing. No catalogue.

#### PRICE-001 — USD pricing tables with line items.

A proposal has any number of pricing tables in USD, each with line items (name, description, quantity, unit, unit price), groups, subtotals and a grand total. All arithmetic is in integer cents with stated rounding, and totals are recomputed on the server. This replaces the first release's two GST-free AUD options for every new proposal; existing records keep their form under `PRICE-008`.

*Acceptance:* Build two tables with 12 lines, quantities and units, and see the server totals match a cent-exact fixture; send malformed quantities and prices (400); reload and see identical totals in the client page and the PDF.

*Status:* partial. Two fixed one-off option totals in AUD; no line items, quantities, units or multiple tables. (`src/platter/model.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs`)

#### PRICE-002 — Packages and optional items the client chooses.

A proposal offers any number of packages (good, better, best) and optional items the client can add or remove. Quantities can be client-editable within a minimum and maximum the firm sets. Totals, tax, deposit and the payment schedule update as the client chooses, and the agreement records exactly the selection signed.

*Acceptance:* Offer three packages and two optional items with an editable quantity between 1 and 10; as the client choose the middle package, add one item and set quantity 4; the server totals, agreement and PDF all show that selection; quantity 11 is refused.

*Status:* partial. Exactly two fixed options; no add-ons, editable quantities or any number of packages. (`src/platter/signing.ts`, `tests/platter.test.mjs`)

#### PRICE-003 — One-off and recurring fees.

Line items can be one-off or recurring (weekly, monthly, quarterly or annual) with a term and start date. The proposal shows one-off total, recurring amount per interval and first-year value separately. Recurring lines drive the payment schedule (`PAY-003`) and renewal date (`RENEW-002`).

*Acceptance:* Add a $2,500 one-off setup and a $1,200 monthly retainer for 12 months; the client page shows one-off $2,500, $1,200 a month and first-year value $16,900; acceptance creates a matching schedule.

*Status:* missing. One-off totals only.

#### PRICE-004 — Discounts.

Discounts apply to a line, a group or the total, as a percentage or a fixed amount, optionally shown to the client and optionally expiring on a date. A discount over the threshold an admin sets routes the proposal for approval (`APPROVE-001`).

*Acceptance:* Apply 10% to a group and $500 off the total, see cent-exact totals; set an approval threshold of 15% and see a 20% discount require approval before sending.

*Status:* missing. No discounts.

#### PRICE-005 — US sales tax.

Each line is taxable or not under a tax code. Tax is calculated from the client's service or billing address, either by owner-configured state, county and city rates or by Stripe Tax or Avalara AvaTax. A tax-exempt client uploads an exemption or resale certificate, which is stored with the agreement. Tax shows as its own line and flows to invoices with the matching tax code (`ACCT-001`, `ACCT-002`). Platter calculates; filing returns stays with the tax service (see Honest boundaries).

*Acceptance:* Quote a taxable and a non-taxable line to clients in Texas and Oregon with a Stripe Tax fake, and see tax only on the Texas taxable line; mark a client exempt with a certificate and see zero tax; sync the invoice and see the tax code in the QuickBooks Online fake.

*Status:* missing. No tax handling beyond a fixed GST-free export.

#### PRICE-006 — Internal cost and margin.

Line items carry internal cost (from the catalogue or entered), and the editor shows margin per line, per package and in total. Cost and margin are visible only to roles allowed to see them and never appear in the client page, PDF, client API or webhooks.

*Acceptance:* Price a package with costs, see margin per line and total as an owner, then load the client page, PDF, client API response and webhook payload and find no cost or margin; a sales role without cost access sees none either.

*Status:* missing. No cost or margin.

#### PRICE-007 — Payment terms and schedules on the proposal.

Payment terms are part of the offer: a deposit as a percentage or fixed amount, milestones by date or by event (such as design approval), net 15 or net 30 invoices, and recurring charges. The client sees the schedule before signing, and the accepted schedule is frozen with the agreement and drives `PAY-002` and `PAY-003`.

*Acceptance:* Set a 30% deposit, two milestones and a monthly retainer on net 15 terms; as the client see the schedule with dates and amounts; accept and read the same frozen schedule back.

*Status:* partial. One deposit percentage only; no fixed deposits, milestones, net terms or schedule. (`src/platter/commands.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs`)

#### PRICE-008 — First-release AUD agreements stay exact.

Amounts carry an explicit currency. When an installation moves to USD pricing, proposals and agreements created under the first release keep their AUD, GST-free form, totals, deposit and invoice CSV exactly, labelled with their currency, and are never converted.

*Acceptance:* Restore a first-release archive with an accepted AUD proposal into a target build, and see the agreement, deposit and CSV byte-identical and labelled AUD while new proposals are USD.

*Status:* partial. Accepted records are immutable and survive archives, but amounts carry no currency field and there is no migration to currency-tagged amounts. (`src/platter/signing.ts`, `tests/archive.test.mjs`)

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

Every saved revision is listed with author and time. A member compares any two revisions, with text, line-item and price changes highlighted, and restores an earlier draft revision as a new revision that needs approval again.

*Acceptance:* Make three revisions, compare the first and third and see the changed price and text, restore the first as revision four and see approval required.

*Status:* partial. Revision snapshots are stored; there is no history view, compare or restore. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

#### APPROVE-001 — Approval rules and routing.

Admins set approval rules by total value, discount, margin, payment terms, edited legal terms or template, and route each to named approvers or a role, in sequence or in parallel. Proposals that match no rule go straight to send if the admin allows it. `PROP-001`'s exact-revision binding applies to every approver.

*Acceptance:* Set rules: over $25,000 needs a manager, a discount over 15% needs the owner. A $30,000 proposal with 20% discount needs both in order; editing after the first approval clears both.

*Status:* partial. Owner approval on every revision; no rules by amount, discount, margin or terms, and no routing to named approvers. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

#### APPROVE-002 — Approval requests that reach the approver.

An approval request reaches the approver by email, Slack, Microsoft Teams, Nook or mobile push, with a summary of what triggered the rule. The approver approves or rejects with a note from the request, including on a phone (`MOB-001`). Overdue requests remind the approver and the requester sees who holds it.

*Acceptance:* Submit a proposal that needs approval, approve it from the Slack fake's action, reject another from email with a note, and see an overdue reminder after the set delay.

*Status:* missing. No approval notifications.

### Sending and delivery

#### SEND-001 — Send from the firm's own mailbox.

A member connects Gmail or Google Workspace (OAuth `gmail.send`) or Microsoft 365 or Outlook (Graph `Mail.Send`) and sends proposals, reminders and replies as themselves. Replies thread back to the proposal. Tokens follow `SEC-001`. Without a connected mailbox, mail goes through the installation's branded sender (`EDIT-008`).

*Acceptance:* Connect Gmail and Microsoft 365 fakes, send a proposal from each, reply from the client side, and see each reply on the proposal timeline; revoke the token and see sending fall back with a visible notice.

*Status:* missing. Mail goes only through the installation's sender.

#### SEND-002 — Delivery status and bounce handling.

Each send shows queued, accepted by provider, delivered, deferred, bounced or complained from signed provider webhooks. A bounce notifies the sender and opens a follow-up (`FOLLOW-002`) to correct the address. Provider acceptance is never shown as delivery.

*Acceptance:* Send three proposals through a mail provider fake that reports delivered, deferred then delivered, and hard bounce; see each state, the bounce notification and the follow-up item.

*Status:* partial. Records only that the provider accepted the message or that the outcome is uncertain; no delivered, bounced, deferred or complained states. (`src/platter/mail.ts`, `src/platter/ui/proposals.ts`)

#### SEND-003 — Recipients, roles and sharing.

A proposal has any number of recipients with a role: signer, client-side approver, viewer or CC. Each recipient has their own link and verification. The firm can also share by link (with verification) or embed the proposal on its site. Removing a recipient revokes their link.

*Acceptance:* Add a signer, a CFO approver and a viewer; each opens their own link; the viewer cannot sign; remove the viewer and see their link refused.

*Status:* missing. One client recipient per proposal.

#### SEND-004 — Expiry and reopening.

A proposal can expire on a date. After expiry the client sees an expired page and can ask the firm to reopen it; the owner extends or reissues. An accepted agreement never expires.

*Acceptance:* Send with a 7-day expiry, advance the clock and see the client page expired with a reopen request, extend it, and accept.

*Status:* missing. Offers never expire.

#### SEND-005 — Completion and activity notifications.

The sender and watchers are notified when a proposal is first viewed, commented on, signed, declined, paid or fails payment, by email, Slack, Microsoft Teams, Nook or push, under per-person preferences.

*Acceptance:* Watch a proposal with Slack and email on; open, comment, sign and pay as the client; see four notifications in each channel fake with links back to the proposal.

*Status:* missing. No notifications to the sender.

### Engagement tracking

#### TRACK-001 — View tracking and live open alerts.

Platter records each verified or unverified view of a client link with time, recipient, approximate location and device class, and alerts the sender on first open and on a return visit after a quiet period. The proposal shows a view timeline.

*Acceptance:* Open the proposal as two recipients on desktop and phone; the sender gets an alert and the timeline lists both views with device class.

*Status:* missing. No view tracking.

#### TRACK-002 — Section-level reading analytics.

For each view, Platter measures time spent on each section and on pricing, which packages and items were toggled, and which attachments were opened, and summarises engagement per recipient.

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

Each proposal has a reminder schedule (for example 2, 5 and 9 days after sending, and 3 days before expiry), sent in the recipient's time zone outside quiet hours. Reminders stop on acceptance, decline, expiry or the recipient's opt-out, and never exceed the cap the owner sets. Every reminder is on the timeline.

*Acceptance:* Send with reminders at 2 and 5 days and advance the clock: two reminders arrive; on another proposal, accept after the first and see no second; opt out and see none.

*Status:* missing. No reminders.

#### FOLLOW-002 — Next-action follow-up queue by sales owner.

Every open proposal has an owner, a next action and a due date. Each sales owner sees a queue of due follow-ups ranked by value and engagement (`TRACK-001`, `TRACK-002`): viewed but not signed, unopened, bounced, questions waiting and expiring soon. A follow-up stays open until the owner completes it, the client acts, or it is dismissed with a reason; a notification alone never closes it.

*Acceptance:* Send five proposals with different engagement; the owner's queue ranks them, completing one with a logged call closes it, and an unopened proposal's follow-up stays open after its notification.

*Status:* missing. No follow-up queue.

#### FOLLOW-003 — Expiry and renewal notifications.

The sender is told before a proposal expires and before an accepted agreement's term ends or renews, with lead times the admin sets, and each notice opens a follow-up (`FOLLOW-002`) and, for renewals, offers `RENEW-002`.

*Acceptance:* Set a 3-day expiry notice and a 30-day renewal notice; advance the clock; see each notice and its follow-up item.

*Status:* missing. No expiry or renewal notices.

#### FOLLOW-004 — Client questions and comments.

A client asks a question or comments on any section from the proposal page. The firm answers in the same thread, by email reply or from the app; the client is notified. Open questions show on the proposal and in the queue until answered, and the thread is kept with the agreement.

*Acceptance:* As the client comment on pricing; the sender answers from the app; the client gets the answer; the question leaves the queue; the agreement package lists the thread.

*Status:* missing. No client comments.

#### FOLLOW-005 — Decline reasons and won or lost outcomes.

A client can decline with a reason. The firm marks a proposal won or lost with a reason from its own list, and can reopen a lost one as a new revision. Outcomes sync to the CRM (`CRM-001` to `CRM-003`) and feed reporting (`REPORT-002`).

*Acceptance:* Decline as the client with the reason Budget, see the proposal lost and the HubSpot deal fake moved to Closed lost; reopen as a new revision and send.

*Status:* missing. No decline or lost state.

#### NEG-001 — Negotiated revisions after sending.

After sending, the firm can make a new revision in answer to the client. The revision follows approval rules again (`APPROVE-001`); sending it retires the earlier client link, and the client sees what changed since the version they saw. Acceptance always binds the exact current revision, and every earlier version stays in history.

*Acceptance:* Send revision 1, revise the price, approve and send revision 2; the revision 1 link is refused; the client page shows the price change; acceptance records revision 2.

*Status:* missing. A sent proposal cannot be revised; only a fresh invitation for the same offer exists.

#### NEG-002 — Client-suggested text edits.

Where the firm allows it, a client suggests edits to text sections (not prices) as tracked suggestions. The firm accepts or rejects each one; accepted suggestions form a new revision under `NEG-001`. Contract lifecycle redlining of master agreements belongs to Locket (see Neighbouring products).

*Acceptance:* Allow suggestions on the terms section, suggest two edits as the client, accept one and reject one, and see revision 2 contain only the accepted edit.

*Status:* missing. No suggestion mode.

### E-signature

#### SIGN-003 — ESIGN and UETA electronic signature.

Signing meets the federal ESIGN Act and state UETA: each signer is shown the electronic records disclosure and consents before signing, can withdraw consent and ask for paper, and adopts a typed, drawn or uploaded signature. Signature, initials and date fields can be placed anywhere. Intent to sign is explicit, and the signed record is retained and reproducible.

*Acceptance:* Sign as a client who reads the disclosure and consents, draws a signature and initials three fields; a second client withdraws consent and the firm is told; the signed record reproduces the same document and signature.

*Status:* partial. A typed name and consent are stored; no ESIGN consumer disclosure, consent withdrawal, drawn signature, initials or signature fields. (`src/platter/signing.ts`, `tests/platter.test.mjs`)

#### SIGN-004 — Multiple signers, signing order and countersignature.

A proposal can require several signers on the client side and a countersignature from the firm, in a set order or in parallel. Each signer verifies separately; the agreement completes when the last required signature lands, and each party is told.

*Acceptance:* Require client CEO then CFO, then the firm's owner; the CFO cannot sign before the CEO; after all three the agreement is complete and each party gets the completion email.

*Status:* missing. One client signer only.

#### SIGN-005 — Signed agreement PDF and certificate of completion.

On completion, Platter produces the signed agreement PDF and a certificate of completion listing each signer, verification method, consent, IP-derived location, user agent, timestamps and the SHA-256 hash of the document. Both parties can download them, they are emailed to each party, and the PDF is archived (`AUTO-002`).

*Acceptance:* Complete a two-signer agreement, download the PDF and certificate as each party, recompute the SHA-256 and see it match the certificate, and find both attached to the completion email.

*Status:* partial. An immutable accepted snapshot with signer and time; no PDF, certificate, document hash or completion email. (`src/platter/signing.ts`, `src/platter/ui/client.ts`, `tests/platter.test.mjs`)

#### SIGN-006 — Signer identity options.

Per proposal, the firm chooses the identity check for each signer: mailbox code (`SIGN-001`), a text-message code to a US mobile number through Twilio, or government ID verification through Stripe Identity or Persona. The method used is recorded in the certificate.

*Acceptance:* Require SMS for one signer and ID verification for another with Twilio and Stripe Identity fakes; wrong SMS codes are limited as in `SIGN-001`; the certificate names each method.

*Status:* partial. Mailbox code only; no SMS code or ID verification. (`src/platter/signing.ts`, `tests/platter.test.mjs`)

#### SIGN-007 — Fields collected at acceptance.

The firm places fields the client fills at acceptance: PO number, billing contact, billing and service address, project start date, checkboxes and custom text. Required fields block signing; values freeze into the agreement and flow to invoices and the CRM.

*Acceptance:* Require a PO number and billing address, try to sign without them (refused), fill them, sign, and see them in the agreement, the QuickBooks Online invoice fake and the HubSpot deal fake.

*Status:* missing. Only name, option and consent are collected.

#### SIGN-008 — Acceptance on the client's own paper.

When a client signs through their own procurement or signing system, the owner uploads the signed copy, records who signed and when, and attests to it. The agreement is marked accepted by upload, distinct from Platter e-signature, and payments and handoff proceed as for any acceptance.

*Acceptance:* Upload a client-signed PDF for a sent proposal, record signer and date, and see the agreement marked accepted by upload with the file, followed by the deposit request.

*Status:* missing. No way to record acceptance signed outside Platter.

### Payments

#### PAY-001 — Stripe card and ACH collection in the proposal.

The owner connects their own Stripe account. The client pays inside the proposal by card, Apple Pay, Google Pay or ACH bank debit, with bank verification through Stripe Financial Connections or micro-deposits. The ACH debit authorization text is shown and stored with the agreement. Card and bank numbers never touch Platter. The owner chooses which methods each proposal offers and whether to pass through a fee where allowed.

*Acceptance:* In Stripe test mode, connect an account, accept and pay a deposit by test card and by test ACH; see the authorization text retained; inspect the database and logs for card or bank numbers (none).

*Status:* missing. No payment collection.

#### PAY-002 — Deposit or partial payment at acceptance.

Accept and pay is one flow: after signing, the client pays the deposit or first payment in the same session. The firm chooses whether acceptance completes only once the payment succeeds or whether signing completes the agreement with the payment due. Agreement and payment states stay separate, so a failed payment never undoes a signature.

*Acceptance:* With payment required, sign and decline the test card: the agreement waits for payment; pay and see it complete. With payment due, sign, fail the payment and see the agreement accepted with the deposit due.

*Status:* partial. The deposit is calculated and exported, never collected. (`src/platter/signing.ts`, `src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### PAY-003 — Milestone and recurring payment schedules.

The accepted schedule (`PRICE-007`) is executed: milestones are charged or invoiced on their date or when the owner marks the event done, and recurring fees are charged on their interval against the payment method the client authorized, or sent as invoices on net terms. The client can update the payment method from a link.

*Acceptance:* Accept a deposit, two milestones and a monthly retainer; mark milestone one done and see it charged; advance the clock a month and see the retainer charged; update the payment method from the client link.

*Status:* missing. No schedules.

#### PAY-004 — Paid, pending, failed, refunded and disputed states.

Each payment shows scheduled, processing, succeeded, failed, refunded, partially refunded or disputed from signed Stripe webhooks, processed once per event ID. ACH payments stay processing until Stripe reports success, typically up to four business days. A payment is paid only on provider evidence, and the owner sees amounts due, paid and overdue per agreement.

*Acceptance:* Replay Stripe test events out of order and twice: the state ends correct with one record per event; an ACH payment stays processing until the success event; the agreement shows due, paid and overdue totals.

*Status:* missing. No payment states.

#### PAY-005 — Failed-payment retries and notices.

When a payment fails, the client and firm are told with the reason; Platter retries on an owner-set schedule only where the client's authorization allows it, and stops a retry once the amount is paid by any route. Each attempt is on the timeline.

*Acceptance:* Fail a milestone charge; both parties are notified; a retry runs after the set delay; pay by check (`PAY-007`) before the next retry and see it cancelled.

*Status:* missing. No retries or notices.

#### PAY-006 — Refunds and disputes.

The owner refunds a payment in full or in part with a reason, and the refund syncs to accounting. When a client disputes a card payment, Platter shows the dispute, its deadline and an evidence pack (signed agreement, certificate, views and payment authorization) that the owner submits to Stripe.

*Acceptance:* Refund half of a deposit and see the credit in the QuickBooks Online fake; open a test dispute and submit the evidence pack to the Stripe fake before its deadline.

*Status:* missing. No refunds or disputes.

#### PAY-007 — Check, wire and ACH credit payments.

US clients often pay by check, wire or ACH credit. Invoices show remittance details, and the owner records an offline payment with method, reference and date. It reconciles against the schedule and accounting like any other payment.

*Acceptance:* Record a check with its number against a milestone and see it paid, synced to QuickBooks Online, and removed from the overdue list.

*Status:* missing. No offline payments.

### Accounting sync

#### ACCT-001 — QuickBooks Online invoices and payments.

The owner connects QuickBooks Online. On acceptance, Platter creates or matches the customer, creates invoices for the deposit and each scheduled amount with items, tax codes and the income accounts set in the catalogue, and records Stripe and offline payments, refunds and fees against them. Invoices paid in QuickBooks Online, including through QuickBooks Payments, are read back as paid.

*Acceptance:* With a QuickBooks Online sandbox fake: accept a proposal and see one customer and one deposit invoice with the right tax code; pay by Stripe and see the payment applied; pay the next invoice in QuickBooks and see it paid in Platter.

*Status:* missing. No QuickBooks connection.

#### ACCT-002 — Xero invoices and payments.

The owner connects a USD Xero organisation. Platter creates or matches the contact, raises invoices for the deposit and schedule with items, tax rates and accounts, and records payments and refunds, with paid status read back from Xero.

*Acceptance:* With a Xero API fake: accept, see the contact and deposit invoice; pay by Stripe and see the payment applied; pay the next invoice in Xero and see it paid in Platter.

*Status:* partial. A Xero-format AUD deposit CSV only; no API sync, USD, schedules or payments. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### ACCT-003 — Pantry invoices and payments.

For firms on [Pantry](https://github.com/just-every/run-pantry), Platter posts customers, invoices and payments the same way as `ACCT-001` and reads back paid status.

*Acceptance:* Run the `ACCT-001` journey against a Pantry instance and see the same customer, invoices and payments.

*Status:* missing. No Pantry connection.

#### ACCT-004 — One invoice authority and reconciliation.

The owner chooses one invoice authority per installation: Platter with Stripe invoices, QuickBooks Online, Xero or Pantry. Each scheduled amount maps to exactly one invoice and one external ID, so retries, reconnects and replays never create a second. A reconciliation view lists each scheduled amount with its invoice, payments, provider events and accounting status, and flags mismatches.

*Acceptance:* Accept, disconnect and reconnect QuickBooks, replay the sync twice and see one invoice per amount; edit the amount in the fake and see a mismatch flagged in reconciliation.

*Status:* partial. A unique local binding prevents duplicate exports; there is no authority choice, provider ID or payment matching. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

#### ACCT-005 — Invoice and payment export files.

Without a live connection, the owner exports invoices, payments and schedules as QuickBooks Online and Xero import files in USD, retained once per invoice as in `INV-001`.

*Acceptance:* Export the deposit and two milestones in QuickBooks and Xero formats and import them into each sandbox without errors; exporting again returns the same retained files.

*Status:* partial. An AUD Xero deposit CSV only; no USD QuickBooks or Xero files and no payment or schedule export. (`src/platter/invoices.ts`, `tests/platter.test.mjs`)

### CRM sync

#### CRM-001 — HubSpot two-way deal sync.

The owner connects HubSpot. A member starts a proposal from a deal (or from a HubSpot CRM card), with company, contacts, deal fields and line items pulled in. Platter writes back status, amount, line items, the proposal link and timeline events (sent, viewed, signed, paid), and moves the deal stage according to rules the admin sets.

*Acceptance:* With a HubSpot API fake: create a proposal from a deal with two line items, send, view and sign; see the deal's line items, amount, stage Closed won and four timeline events.

*Status:* missing. No HubSpot connection.

#### CRM-002 — Salesforce two-way opportunity sync.

The owner connects Salesforce. Proposals start from an opportunity with account, contacts and price-book products, and Platter writes back opportunity line items, amount, stage, the proposal link and activity, under the same rules as `CRM-001`.

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

A documented REST API creates proposals from templates, fills variables, reads status, analytics and payments, and lists agreements, under scoped API keys. Signed webhooks deliver every lifecycle event, with retries and a delivery log.

*Acceptance:* Create a proposal from a template through the API with a scoped key, send it, receive signed webhooks for sent and signed, verify their signatures, and see a key without write scope refused.

*Status:* partial. A session and agent command API only; no documented public API, scoped API keys or signed lifecycle webhooks. (`src/platter/http.ts`, `tests/platter.test.mjs`)

#### AUTO-005 — Zapier, Make and Crank apps.

Published Zapier and Make apps and a [Crank](https://github.com/just-every/run-crank) connector expose Platter's triggers (proposal sent, viewed, signed, paid) and actions (create proposal from template, add client).

*Acceptance:* Run a Zap in Zapier's test environment that creates a proposal from a form submission and fires on signed.

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

A member creates proposals for a list of clients (a CSV, a CRM list or every client with an agreement ending this quarter) from one template, with per-client variables and prices. The owner reviews a sample and the list of exceptions, approves the batch, and Platter sends at a set pace with one result per client.

*Acceptance:* Create 40 proposals from a CSV with three missing variables; the three are held as exceptions; approve the batch and see 37 sent at the set pace, each with its own link and timeline.

*Status:* missing. No bulk sending.

#### RENEW-002 — Renewal proposals from accepted agreements.

Before an agreement's term ends, Platter prepares a renewal from it with the same scope, an optional price increase the owner sets (percentage or amount), and the notice period stated in the agreement. The owner approves it as any revision. Evergreen agreements show their renewal and cancellation terms to the client before signing.

*Acceptance:* Accept a 12-month retainer; 45 days before term end a renewal draft with a 5% increase is waiting for approval; approve, send and accept it, and see a new schedule start when the old one ends.

*Status:* missing. No renewals.

### Reporting

#### REPORT-001 — Proposal pipeline dashboard.

A dashboard shows proposals by status (draft, awaiting approval, sent, viewed, accepted, paid, declined, expired) with value, owner, client, age and next action, filterable and sortable by each.

*Acceptance:* Seed 30 proposals across statuses and owners, filter by owner and status, sort by value, and see the totals match a fixture.

*Status:* partial. A plain proposal list with status; no value, owner, age or filters. (`src/platter/state.ts`, `src/platter/ui/proposals.ts`)

#### REPORT-002 — Win rate and sales performance.

Reports show win rate, time to sign, time to pay, average deal value and lost reasons by owner, template, service, client segment and period.

*Acceptance:* From a fixture of 100 decided proposals, see win rate, median time to sign and lost-reason counts by owner and template match the fixture.

*Status:* missing. No conversion reporting.

#### REPORT-003 — Content and pricing performance.

Reports show which templates, library items, packages and optional items appear in won and lost proposals, how long clients read them (`TRACK-002`), and which packages clients choose.

*Acceptance:* From the same fixture, see package take-up and per-template win rate, and reading time per library item.

*Status:* missing. No content analytics.

#### REPORT-004 — Booked, billed and collected revenue.

Reports show signed value, one-off and recurring (MRR and first-year value), invoiced, collected and overdue amounts by period and owner, reconciled with payments and accounting (`ACCT-004`).

*Acceptance:* Accept and pay a fixture of agreements and see booked, invoiced, collected and overdue totals match payments and the QuickBooks Online fake.

*Status:* missing. No revenue reporting.

#### REPORT-005 — Report export and scheduled delivery.

Any report exports to CSV and can be emailed on a schedule to named people.

*Acceptance:* Schedule the weekly win-rate report to two people and export the pipeline to CSV; the email arrives with the same figures as the screen.

*Status:* missing. No report export.

### Team administration

#### TEAM-001 — Roles and permissions.

Roles are owner, admin, manager, sales, content editor, viewer and billing, each with set rights over proposals (own or team), templates, library, catalogue, approvals, costs and margins, payments and settings. Folders of templates and library items can be limited to teams. Every permission is enforced on the server.

*Acceptance:* A matrix journey sends each action through its public route as each role, and every action outside a role's rights is refused with no write.

*Status:* partial. Owner, member and agent only; no admin, manager, sales, content editor, viewer or billing roles and no content permissions. (`src/platter/model.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs`)

#### TEAM-002 — Single sign-on and SCIM provisioning.

Members sign in through SAML or OIDC from [Auth](https://github.com/just-every/run-auth), Okta, Microsoft Entra ID or Google Workspace, and are created, updated and removed through SCIM with role mapping. Removing a member ends their sessions and keeps their proposals with a new owner.

*Acceptance:* Sign in through an Okta fake with SAML, provision and deprovision through SCIM, and see sessions ended and proposals reassigned.

*Status:* missing. No SSO or SCIM.

#### TEAM-003 — Multiple brands and workspaces.

A firm runs several brands or business units, each with its own brand kit, domain, templates, library, catalogue, Stripe account and accounting connection, with members in one or more.

*Acceptance:* Create two brands with separate Stripe and QuickBooks fakes; a proposal from brand B uses B's brand, domain and Stripe account, and B's members cannot see A's library.

*Status:* missing. One workspace and brand.

#### TEAM-004 — Audit log.

Every action by people, agents and integrations (edits, approvals, sends, views, signatures, payments, refunds, setting and permission changes) is logged with actor, time and subject, searchable by admins and exportable to CSV.

*Acceptance:* Perform one action of each kind and see each in the log with its actor; export it and see the same rows.

*Status:* partial. Approvals and preparers are recorded; there is no complete, searchable or exportable activity log. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

### Migration from incumbents

#### MIG-001 — PandaDoc move-in.

With the buyer's PandaDoc API key, Platter imports templates, content library items, pricing-table products, contacts and documents. Completed documents arrive as retained, read-only agreements with their signed PDF and audit trail; open documents arrive as drafts ready to send from Platter. The import follows `IMPORT-001`'s preview, journal and undo, and lists everything that did not map.

*Acceptance:* Against a PandaDoc API fake with 5 templates, 20 library items, 30 products and 50 documents in every status, preview, apply and see each item mapped or listed as unmapped; undo the import.

*Status:* missing. No PandaDoc import.

#### MIG-002 — Proposify move-in.

Platter imports Proposify templates, content library sections and fee tables, clients and proposals through its API, with signed proposals as read-only agreements and open ones as drafts, under the same preview, journal and undo.

*Acceptance:* Run the `MIG-001` journey against a Proposify API fake.

*Status:* missing. No Proposify import.

#### MIG-003 — Better Proposals move-in.

Platter imports Better Proposals templates, content, contacts and proposals through its API, under the same preview, journal and undo.

*Acceptance:* Run the `MIG-001` journey against a Better Proposals API fake.

*Status:* missing. No Better Proposals import.

#### MIG-004 — Qwilr and Ignition move-in.

Platter imports Qwilr pages, templates and quotes through its API, and Ignition clients, services, proposals and billing schedules from its exports, under the same preview, journal and undo.

*Acceptance:* Run the `MIG-001` journey against a Qwilr API fake and an Ignition export fixture, including one active billing schedule.

*Status:* missing. No Qwilr or Ignition import.

#### MIG-005 — Open proposals and payment schedules continue.

At move-in, proposals sent but not signed in the old tool can be reissued from Platter with a new link, and signed agreements with active Stripe schedules or subscriptions are adopted by their Stripe IDs, so no client is charged twice and no scheduled payment is missed.

*Acceptance:* Import an Ignition agreement with an active Stripe subscription fake, adopt it, advance a month and see exactly one charge recorded against the imported agreement.

*Status:* missing. No in-flight migration.

#### MIG-006 — Clients, contacts and catalogue CSV move-in.

The CSV kit imports companies, contacts with titles and phone numbers, billing and service addresses, tax-exempt status and catalogue items, with the preview, fingerprint, journal and undo of `IMPORT-001`.

*Acceptance:* Import a CSV of 200 contacts across 60 companies with addresses and exemptions, and 50 catalogue items, preview, apply and undo.

*Status:* partial. Client name and email only. (`src/platter/movein/index.ts`, `tests/platter.test.mjs`)

### Mobile

#### MOB-001 — Team app on a phone.

On a phone browser, a member creates a proposal from a template, sends it, answers a client question, approves a request and checks the follow-up queue.

*Acceptance:* A browser journey at 390 pixels completes each of those actions.

*Status:* partial. The team pages have viewport and narrow-screen styling only; there is no phone journey for creating, sending or approving. (`src/platter/ui/shared.ts`)

#### MOB-002 — iOS and Android apps with push notifications.

Native iOS and Android apps give members the follow-up queue, proposal status, client questions, approvals and payments, with push notifications for views, questions, signatures, payments and approval requests.

*Acceptance:* On iOS and Android test devices, sign in, receive a push when the client views and signs, approve a request, and answer a question.

*Status:* missing. No native apps or push.

### AI assistance

#### AI-001 — Drafts from meeting notes, transcripts and email.

A member pastes notes, uploads a transcript or picks an email thread or a recorded Zoom, Google Meet or Microsoft Teams call, and Platter drafts a proposal from the firm's templates, library and catalogue. Each drafted section cites the source line it came from, and nothing is sent without `PROP-001` approval.

*Acceptance:* Draft from a fixture transcript; every section cites a transcript line; prices come only from catalogue items; the draft needs approval before sending.

*Status:* partial. External agents can post structured drafts; there is no ingestion of notes, transcripts or email and no in-product drafting. (`src/platter/http.ts`, `tests/platter.test.mjs`)

#### AI-002 — Writing assistant in the editor.

In the editor a member asks to rewrite, shorten, adjust tone, summarise or translate a block; the suggestion appears as a change to accept or reject, and never edits pricing.

*Acceptance:* Ask to shorten a section, see a suggested change, accept it, and see a request to change a price refused.

*Status:* missing. No writing assistant.

#### AI-003 — MCP server for AI assistants.

An MCP server lets Claude, ChatGPT and other assistants search proposals, read status and engagement, draft from templates and request sending, under scoped, revocable keys. Assistants can request but never approve, send, sign or refund.

*Acceptance:* Connect an MCP client with a scoped key, draft a proposal, read its status, request sending (queued for the owner), and see approve refused.

*Status:* partial. An HTTP agent key limited to preparing and revising drafts; no MCP server or tools for search, status or send requests. (`src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs`)

#### AI-004 — Explainable price suggestions.

For each line item, Platter suggests a price range from the firm's own accepted and lost proposals for the same catalogue item and client segment, with the sample size and examples shown. The member decides; suggestions are never applied silently.

*Acceptance:* From a fixture history, see a suggested range with sample size and three linked examples, and see the price unchanged until the member applies it.

*Status:* missing. No price suggestions.

### Privacy, security and portability

#### PRIV-001 — Erasure across contacts, tracking and synced systems.

An owner handles a US privacy request (CCPA/CPRA or similar): erase a contact's personal data, viewing data and comments from proposals that are not retained agreements, and record which retained agreements keep it as business records. Synced CRMs and file stores are listed with what to erase there.

*Acceptance:* Erase a contact who viewed two drafts and signed one agreement; their views and draft data are gone, the agreement remains with a retention note, and the receipt lists the HubSpot fake record to erase.

*Status:* partial. Only unused client records can be erased; no contacts, tracking data or notice to synced systems. (`src/platter/commands.ts`, `tests/platter.test.mjs`)

#### PORT-002 — Complete product archive.

Archives and restore cover everything in the product: templates, library, catalogue, media, signed PDFs and certificates, payment and invoice records, reports' source data and integration mappings, under `PORT-001`'s rules. Provider credentials never travel.

*Acceptance:* Export an installation with every record kind, restore into an empty one, and re-export identical parts; no provider token appears in the archive.

*Status:* partial. Archives cover clients, proposals, acceptances and CSVs, not templates, library, media, signed PDFs, payments or sync state. (`tests/archive.test.mjs`, `src/platter/archive-policy.mjs`)

#### SEC-001 — Provider credential custody.

OAuth tokens and API keys for Stripe, CRMs, accounting, mail and storage are encrypted at rest, scoped to the least access each connection needs, never shown again after setup, excluded from archives and logs, and revocable from settings, with a visible state when a connection breaks.

*Acceptance:* Connect each provider fake, inspect the database and logs for tokens in clear (none), revoke one connection and see its state change and its jobs stop.

*Status:* missing. No provider connections yet.

## Push further

These clauses take the job past today's up-and-comers. Qwilr drafts from meeting notes and Ignition suggests prices; Platter's agents also test a draft against what delivery actually costs, chase every open question and payment exception to a resolution, and turn scope creep into a change the client approves separately. Each says what the agent does, on which data, and under what human control. Agents act through the same doors as people and hold no authority to approve prices, send, sign, refund or write off (`AGENT-009`, `ACCESS-001`).

#### AGENT-001 — Discovery call to priced draft.

The agent reads discovery call transcripts (Zoom, Google Meet, Microsoft Teams or an uploaded recording), the email thread, CRM deal notes and the firm's past winning proposals, and drafts the scope with two or three priced packages from the catalogue. Every requirement, assumption and exclusion cites its source. The agent flags what the client asked that the firm does not offer. A member edits; only the owner approves (`PROP-001`).

*Acceptance:* From a fixture call and email thread, the draft's every scope line cites a source, every price is a catalogue item, an unmatched request is flagged, and sending is refused until approval.

*Status:* partial. Agents can submit drafts that the owner must approve; there is no transcript ingestion, catalogue matching or citations. (`src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs`)

#### AGENT-002 — Scope and price tested against delivery reality.

Before approval, the agent tests the draft against the firm's actual delivery data: hours and costs on similar past projects from Gauge, Harvest or QuickBooks Online job costing, team capacity in the proposed dates from Gauge or Forecast, and past win rates and margins for similar proposals. It shows an assumptions table (hours per line, blended cost, utilization, contingency), the expected margin range and the capacity conflict, if any. It suggests changes but never changes a price or date itself; the owner accepts or rejects each.

*Acceptance:* With Gauge and QuickBooks fixtures where similar projects overran by 30%, the agent shows the margin falling below the firm's floor, cites the projects, flags a capacity conflict in week 3, and the price stays unchanged until the owner applies a suggestion.

*Status:* missing. No delivery cost, capacity or outcome data is read.

#### AGENT-003 — Client questions chased to resolution.

The agent watches client questions, comments and email replies, drafts precise answers that cite the proposal, library and agreement terms, and prepares a revision when an answer changes scope or price (`NEG-001`). Each question stays open until answered and acknowledged or until the proposal is decided. The sales owner approves every message and revision; contact frequency and stop rules are the owner's.

*Acceptance:* Ask three questions as the client, one of which needs a price change; the agent drafts two answers and a revision; nothing reaches the client until the owner approves; the queue shows each question until it is acknowledged.

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

The agent reads delivery actuals and change requests from Gauge, Asana, Jira, Vector or email, compares them with the accepted inclusions and exclusions, and prepares a separately priced change order linked to the original agreement. The delivery lead confirms the scope difference, the owner approves the price, and the client accepts and pays the change order on its own. The original agreement and its history never change.

*Acceptance:* With a Gauge fixture showing 40 hours on a feature listed as excluded, the agent prepares a change order citing the exclusion and hours; after confirmation and approval the client accepts and pays it; the original agreement is byte-identical.

*Status:* missing. No delivery signals or change orders.

#### AGENT-007 — Win and loss learning for templates and pricing.

After proposals are decided, the agent finds which sections, packages, prices, discounts and timings go with wins and losses, with sample sizes, and proposes edits to templates, the library or catalogue prices as suggestions. An admin accepts or rejects each; nothing in the library changes silently.

*Acceptance:* From a fixture of 200 decided proposals where a three-package layout wins more often, the agent proposes the template change with the sample size, and the template is unchanged until an admin accepts it.

*Status:* missing. No outcome analysis.

#### AGENT-008 — Renewal preparation from delivered results.

Ahead of a renewal (`RENEW-002`), the agent assembles what was delivered (from Gauge or the delivery tool), usage and outcomes, suggests a scope and price for the renewal with the reasoning, and drafts the renewal proposal for approval.

*Acceptance:* For a retainer that used 20% more hours than sold, the agent drafts a renewal with a larger package, cites the hours, and waits for approval.

*Status:* missing. No renewal agent.

#### AGENT-009 — Agent authority ledger and limits.

Every agent action is logged with the data it read, what it produced, the model used and who approved it. Agents can draft, analyse and request, and can never approve prices, send, sign, refund or write off. The owner sets a monthly model budget and can pause any agent at once.

*Acceptance:* Run each agent once; the ledger lists inputs, outputs and approvals for each; an agent's attempt to send or refund is refused; pausing an agent stops its next run; exceeding the budget stops runs with a notice.

*Status:* partial. Agent keys are limited to drafting and are revocable; there is no per-action ledger, source citations, budget or pause control. (`src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs`)

## Honest boundaries

What Platter does not do, and how a US buyer gets it:

- **Moving or holding money.** Platter never holds client funds, operates card or ACH networks, extends credit or stores card or bank numbers. Payments run through the firm's own Stripe account (`PAY-001`); firms that take payment through QuickBooks Payments or another processor take it on the accounting invoice, and Platter reads the paid state back (`ACCT-001`). Card surcharging and fee pass-through are offered only where the firm confirms card-network rules and state law allow them.
- **Filing sales tax.** Platter calculates and shows sales tax and records exemption certificates (`PRICE-005`); registering, filing and remitting returns stays with Stripe Tax, Avalara or the firm's accountant.
- **Notarization and qualified trust services.** Platter provides ESIGN and UETA signatures with SMS and ID verification options (`SIGN-003`, `SIGN-006`). Remote online notarization goes through a notary platform such as Proof, and documents that require wet signatures by law (such as some real-estate and family-law instruments) are out of scope.
- **Legal advice.** Platter records consent, intent and audit evidence; whether a given agreement is enforceable is for the firm's counsel.
- **The full CRM, ledger, signing, CLM, billing and delivery products.** These are separate products with their own buyers (see Neighbouring products). Platter syncs with them and never becomes them.
- **Currencies and tax regimes outside the US.** New proposals are USD with US sales tax. First-release AUD agreements remain exact (`PRICE-008`); other currencies and VAT or GST are outside this target.
- **Live provider proof.** Local journeys use fakes at provider edges. Hosting, mail delivery, Stripe, CRM and accounting connections require the installer's own accounts and are proven in each provider's sandbox before a release claims them.

## Scope mapping

How the approved scope for Platter (category, incumbents, missing items and push-further aim) maps to clauses.

| Approved scope item | Clauses |
| --- | --- |
| Branded drag-and-drop proposal editor with templates, reusable content and service libraries, images, video and PDF/Word import and export | `EDIT-001` to `EDIT-010`, `CAT-001` |
| Interactive USD pricing tables with optional items, packages, quantities, recurring fees, discounts and configurable US sales tax, replacing the two-option GST-free AUD format | `PRICE-001` to `PRICE-008`, `CAT-001` |
| Tracked sending with view and section-level engagement analytics, reminders, expiry, comments and negotiated revisions | `SEND-001` to `SEND-005`, `TRACK-001` to `TRACK-004`, `FOLLOW-001` to `FOLLOW-005`, `NEG-001`, `NEG-002` |
| Legally binding e-signature (ESIGN/UETA) with audit trail and a downloadable signed agreement, plus multi-signer support | `SIGN-001` to `SIGN-008` |
| Stripe card and ACH collection of deposits, milestone and recurring payments at acceptance, synced to QuickBooks Online and Xero | `PAY-001` to `PAY-007`, `ACCT-001` to `ACCT-005`, `INV-001` |
| Two-way HubSpot, Salesforce and Orbit deal sync with line items, plus pipeline and win-rate reporting | `CRM-001` to `CRM-004`, `REPORT-001` to `REPORT-005` |
| Import and migration from each named incumbent and up-and-comer | `MIG-001` to `MIG-006`, `IMPORT-001` |
| Roles, approvals, mobile, follow-up and the integrations the category runs on | `TEAM-*`, `APPROVE-*`, `MOB-*`, `FOLLOW-*`, `AUTO-*`, `HAND-*`, `SEND-001` |
| Push further: drafts from discovery calls tested against delivery costs, capacity and past win and margin outcomes with assumptions visible | `AGENT-001`, `AGENT-002`, `AGENT-007`, `AI-001`, `AI-004` |
| Push further: client questions and payment exceptions chased to resolution | `AGENT-003`, `AGENT-004`, `AGENT-005` |
| Push further: out-of-scope delivery signals turned into separately approved change orders | `AGENT-006`, `HAND-002` |

## Status

Judged from the code and tests at commit `658ddc0d7c9d10ede5801dc92e86ead37e0ed57b` (17 October 2026). Evidence is the test or file that backs the status; Gap says what is missing. No status here is acceptance.

| Clauses | Done | Partial | Missing | Total |
| --- | ---: | ---: | ---: | ---: |
| Published | 9 | 3 | 0 | 12 |
| Target and push further | 0 | 30 | 74 | 104 |
| All | 9 | 33 | 74 | 116 |

| Clause | Title | Kind | Status | Evidence | Gap |
| --- | --- | --- | --- | --- | --- |
| `HTTP-001` | Authorized domain dispatch | published | done | `tests/platter.test.mjs`, `src/platter/http.ts` |  |
| `ACCESS-001` | Revocable agent keys that only draft | published | done | `tests/platter.test.mjs`, `src/platter/credentials.ts` |  |
| `PROP-001` | The owner approves the exact revision | published | done | `tests/platter.test.mjs`, `src/platter/commands.ts` |  |
| `PROP-002` | Sending freezes the offer | published | partial | `tests/platter.test.mjs`, `src/platter/commands.ts` | Freezing is tested; the fresh-invitation rotation is implemented but no test confirms the old link is refused. |
| `SIGN-001` | Verified-mailbox acceptance | published | done | `tests/platter.test.mjs`, `src/platter/signing.ts` |  |
| `SIGN-002` | Immutable acceptance with an integer-cent deposit | published | done | `tests/platter.test.mjs`, `src/platter/signing.ts` |  |
| `INV-001` | One retained deposit invoice per acceptance | published | done | `tests/platter.test.mjs`, `src/platter/invoices.ts` |  |
| `IMPORT-001` | Reviewed client CSV move-in with undo | published | done | `tests/platter.test.mjs`, `src/platter/movein/index.ts` |  |
| `ERASE-001` | Bounded client erasure | published | done | `tests/platter.test.mjs`, `tests/archive.test.mjs` |  |
| `PORT-001` | Validated archives and restore | published | done | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` |  |
| `MAIL-001` | Durable proposal mail with honest outcomes | published | partial | `src/platter/mail.ts`, `tests/platter.test.mjs` | Local capture is exercised by tests; the hosted claim, provider call and uncertain outcome have no test, and provider acceptance is never shown as delivery. |
| `SITE-001` | Public run site and documentation | published | partial | `src/site/landing.ts`, `src/site/docs.ts`, `scripts/verification/run.mjs` | The site is built in CI; no test asserts that the Run Platter action opens /run or that /docs renders without JavaScript. |
| `EDIT-001` | Branded drag-and-drop proposal editor | target | partial | `src/platter/ui/proposals.ts`, `src/platter/commands.ts` | Only a title, scope and two-option form with fixed Platter styling; no block editor, layouts or brand kit. |
| `EDIT-002` | Proposal templates | target | missing |  | No templates. |
| `EDIT-003` | Reusable content library | target | missing |  | No content library. |
| `EDIT-004` | Variables from client, deal and CRM records | target | missing |  | No variables or merge fields. |
| `EDIT-005` | Word and PDF import and export | target | missing |  | No import or export of documents. |
| `EDIT-006` | Embedded rich media | target | missing |  | No media blocks. |
| `EDIT-007` | Mobile client review | target | partial | `src/platter/ui/client.ts`, `src/platter/ui/shared.ts`, `tests/platter.test.mjs` | The client page has viewport and narrow-screen styling only; there is no mobile journey, no rich blocks and no accessibility audit. |
| `EDIT-008` | Custom domain and branded client experience | target | missing |  | Client links use the installation origin with Platter styling. |
| `EDIT-009` | Conditional content by package | target | missing |  | No conditional content. |
| `EDIT-010` | Attachments and vendor documents | target | missing |  | No attachments. |
| `CAT-001` | Service and product catalogue | target | missing |  | No catalogue. |
| `PRICE-001` | USD pricing tables with line items | target | partial | `src/platter/model.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs` | Two fixed one-off option totals in AUD; no line items, quantities, units or multiple tables. |
| `PRICE-002` | Packages and optional items the client chooses | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | Exactly two fixed options; no add-ons, editable quantities or any number of packages. |
| `PRICE-003` | One-off and recurring fees | target | missing |  | One-off totals only. |
| `PRICE-004` | Discounts | target | missing |  | No discounts. |
| `PRICE-005` | US sales tax | target | missing |  | No tax handling beyond a fixed GST-free export. |
| `PRICE-006` | Internal cost and margin | target | missing |  | No cost or margin. |
| `PRICE-007` | Payment terms and schedules on the proposal | target | partial | `src/platter/commands.ts`, `src/platter/signing.ts`, `tests/platter.test.mjs` | One deposit percentage only; no fixed deposits, milestones, net terms or schedule. |
| `PRICE-008` | First-release AUD agreements stay exact | target | partial | `src/platter/signing.ts`, `tests/archive.test.mjs` | Accepted records are immutable and survive archives, but amounts carry no currency field and there is no migration to currency-tagged amounts. |
| `COLLAB-001` | Real-time team editing | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Version-guarded saves refuse conflicting edits with 409; there is no live co-editing or presence. |
| `COLLAB-002` | Internal comments, mentions and assignments | target | missing |  | No internal comments. |
| `COLLAB-003` | Version history with compare and restore | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Revision snapshots are stored; there is no history view, compare or restore. |
| `APPROVE-001` | Approval rules and routing | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Owner approval on every revision; no rules by amount, discount, margin or terms, and no routing to named approvers. |
| `APPROVE-002` | Approval requests that reach the approver | target | missing |  | No approval notifications. |
| `SEND-001` | Send from the firm's own mailbox | target | missing |  | Mail goes only through the installation's sender. |
| `SEND-002` | Delivery status and bounce handling | target | partial | `src/platter/mail.ts`, `src/platter/ui/proposals.ts` | Records only that the provider accepted the message or that the outcome is uncertain; no delivered, bounced, deferred or complained states. |
| `SEND-003` | Recipients, roles and sharing | target | missing |  | One client recipient per proposal. |
| `SEND-004` | Expiry and reopening | target | missing |  | Offers never expire. |
| `SEND-005` | Completion and activity notifications | target | missing |  | No notifications to the sender. |
| `TRACK-001` | View tracking and live open alerts | target | missing |  | No view tracking. |
| `TRACK-002` | Section-level reading analytics | target | missing |  | No reading analytics. |
| `TRACK-003` | Forwarded stakeholder identification | target | missing |  | No forwarding detection. |
| `TRACK-004` | Tracking disclosure and privacy limits | target | missing |  | No tracking, so no disclosure or retention controls. |
| `FOLLOW-001` | Scheduled reminders to unsigned recipients | target | missing |  | No reminders. |
| `FOLLOW-002` | Next-action follow-up queue by sales owner | target | missing |  | No follow-up queue. |
| `FOLLOW-003` | Expiry and renewal notifications | target | missing |  | No expiry or renewal notices. |
| `FOLLOW-004` | Client questions and comments | target | missing |  | No client comments. |
| `FOLLOW-005` | Decline reasons and won or lost outcomes | target | missing |  | No decline or lost state. |
| `NEG-001` | Negotiated revisions after sending | target | missing |  | A sent proposal cannot be revised; only a fresh invitation for the same offer exists. |
| `NEG-002` | Client-suggested text edits | target | missing |  | No suggestion mode. |
| `SIGN-003` | ESIGN and UETA electronic signature | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | A typed name and consent are stored; no ESIGN consumer disclosure, consent withdrawal, drawn signature, initials or signature fields. |
| `SIGN-004` | Multiple signers, signing order and countersignature | target | missing |  | One client signer only. |
| `SIGN-005` | Signed agreement PDF and certificate of completion | target | partial | `src/platter/signing.ts`, `src/platter/ui/client.ts`, `tests/platter.test.mjs` | An immutable accepted snapshot with signer and time; no PDF, certificate, document hash or completion email. |
| `SIGN-006` | Signer identity options | target | partial | `src/platter/signing.ts`, `tests/platter.test.mjs` | Mailbox code only; no SMS code or ID verification. |
| `SIGN-007` | Fields collected at acceptance | target | missing |  | Only name, option and consent are collected. |
| `SIGN-008` | Acceptance on the client's own paper | target | missing |  | No way to record acceptance signed outside Platter. |
| `PAY-001` | Stripe card and ACH collection in the proposal | target | missing |  | No payment collection. |
| `PAY-002` | Deposit or partial payment at acceptance | target | partial | `src/platter/signing.ts`, `src/platter/invoices.ts`, `tests/platter.test.mjs` | The deposit is calculated and exported, never collected. |
| `PAY-003` | Milestone and recurring payment schedules | target | missing |  | No schedules. |
| `PAY-004` | Paid, pending, failed, refunded and disputed states | target | missing |  | No payment states. |
| `PAY-005` | Failed-payment retries and notices | target | missing |  | No retries or notices. |
| `PAY-006` | Refunds and disputes | target | missing |  | No refunds or disputes. |
| `PAY-007` | Check, wire and ACH credit payments | target | missing |  | No offline payments. |
| `ACCT-001` | QuickBooks Online invoices and payments | target | missing |  | No QuickBooks connection. |
| `ACCT-002` | Xero invoices and payments | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | A Xero-format AUD deposit CSV only; no API sync, USD, schedules or payments. |
| `ACCT-003` | Pantry invoices and payments | target | missing |  | No Pantry connection. |
| `ACCT-004` | One invoice authority and reconciliation | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | A unique local binding prevents duplicate exports; there is no authority choice, provider ID or payment matching. |
| `ACCT-005` | Invoice and payment export files | target | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | An AUD Xero deposit CSV only; no USD QuickBooks or Xero files and no payment or schedule export. |
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
| `REPORT-001` | Proposal pipeline dashboard | target | partial | `src/platter/state.ts`, `src/platter/ui/proposals.ts` | A plain proposal list with status; no value, owner, age or filters. |
| `REPORT-002` | Win rate and sales performance | target | missing |  | No conversion reporting. |
| `REPORT-003` | Content and pricing performance | target | missing |  | No content analytics. |
| `REPORT-004` | Booked, billed and collected revenue | target | missing |  | No revenue reporting. |
| `REPORT-005` | Report export and scheduled delivery | target | missing |  | No report export. |
| `TEAM-001` | Roles and permissions | target | partial | `src/platter/model.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs` | Owner, member and agent only; no admin, manager, sales, content editor, viewer or billing roles and no content permissions. |
| `TEAM-002` | Single sign-on and SCIM provisioning | target | missing |  | No SSO or SCIM. |
| `TEAM-003` | Multiple brands and workspaces | target | missing |  | One workspace and brand. |
| `TEAM-004` | Audit log | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Approvals and preparers are recorded; there is no complete, searchable or exportable activity log. |
| `MIG-001` | PandaDoc move-in | target | missing |  | No PandaDoc import. |
| `MIG-002` | Proposify move-in | target | missing |  | No Proposify import. |
| `MIG-003` | Better Proposals move-in | target | missing |  | No Better Proposals import. |
| `MIG-004` | Qwilr and Ignition move-in | target | missing |  | No Qwilr or Ignition import. |
| `MIG-005` | Open proposals and payment schedules continue | target | missing |  | No in-flight migration. |
| `MIG-006` | Clients, contacts and catalogue CSV move-in | target | partial | `src/platter/movein/index.ts`, `tests/platter.test.mjs` | Client name and email only. |
| `MOB-001` | Team app on a phone | target | partial | `src/platter/ui/shared.ts` | The team pages have viewport and narrow-screen styling only; there is no phone journey for creating, sending or approving. |
| `MOB-002` | iOS and Android apps with push notifications | target | missing |  | No native apps or push. |
| `AI-001` | Drafts from meeting notes, transcripts and email | target | partial | `src/platter/http.ts`, `tests/platter.test.mjs` | External agents can post structured drafts; there is no ingestion of notes, transcripts or email and no in-product drafting. |
| `AI-002` | Writing assistant in the editor | target | missing |  | No writing assistant. |
| `AI-003` | MCP server for AI assistants | target | partial | `src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs` | An HTTP agent key limited to preparing and revising drafts; no MCP server or tools for search, status or send requests. |
| `AI-004` | Explainable price suggestions | target | missing |  | No price suggestions. |
| `PRIV-001` | Erasure across contacts, tracking and synced systems | target | partial | `src/platter/commands.ts`, `tests/platter.test.mjs` | Only unused client records can be erased; no contacts, tracking data or notice to synced systems. |
| `PORT-002` | Complete product archive | target | partial | `tests/archive.test.mjs`, `src/platter/archive-policy.mjs` | Archives cover clients, proposals, acceptances and CSVs, not templates, library, media, signed PDFs, payments or sync state. |
| `SEC-001` | Provider credential custody | target | missing |  | No provider connections yet. |
| `AGENT-001` | Discovery call to priced draft | push-further | partial | `src/platter/http.ts`, `src/platter/commands.ts`, `tests/platter.test.mjs` | Agents can submit drafts that the owner must approve; there is no transcript ingestion, catalogue matching or citations. |
| `AGENT-002` | Scope and price tested against delivery reality | push-further | missing |  | No delivery cost, capacity or outcome data is read. |
| `AGENT-003` | Client questions chased to resolution | push-further | missing |  | No question tracking or agent. |
| `AGENT-004` | Engagement-driven follow-up | push-further | missing |  | No engagement data or follow-up agent. |
| `AGENT-005` | Payment exceptions closed without duplicate invoices | push-further | partial | `src/platter/invoices.ts`, `tests/platter.test.mjs` | Duplicate local exports are prevented; there is no provider event matching, exception queue or agent. |
| `AGENT-006` | Out-of-scope delivery turned into a change order | push-further | missing |  | No delivery signals or change orders. |
| `AGENT-007` | Win and loss learning for templates and pricing | push-further | missing |  | No outcome analysis. |
| `AGENT-008` | Renewal preparation from delivered results | push-further | missing |  | No renewal agent. |
| `AGENT-009` | Agent authority ledger and limits | push-further | partial | `src/platter/http.ts`, `src/platter/credentials.ts`, `tests/platter.test.mjs` | Agent keys are limited to drafting and are revocable; there is no per-action ledger, source citations, budget or pause control. |
