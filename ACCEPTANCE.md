# Platter acceptance

The journeys that prove each clause of [CONTRACT.md](CONTRACT.md), with its status at commit `658ddc0` (17 October 2026). A clause is accepted only when its journey runs through a public door (HTTP route, browser at 1440 and 390 pixels, CLI, MCP server, native app or import or export file) and passes. Fakes are allowed only at paid or network edges; a provider fake proves Platter's side only, and live provider behaviour is proven in the provider's sandbox or test mode. A build round works towards the `partial` and `missing` journeys and changes a status only with the passing journey cited.

## Supported today

- An owner adds a client, prepares two GST-free AUD offer options and a deposit percentage, approves the exact revision, and sends a private proposal link.
- A client verifies their email with a single-use code, chooses one option and accepts with their name and consent; the agreed scope, prices and deposit remain frozen.
- The owner exports the accepted deposit once as a retained Xero invoice CSV and can download that same export again.
- An owner gives an agent a revocable key to prepare or revise drafts; only the owner approves prices, sends offers and exports invoices, with approval authors recorded.
- The owner previews a Client CSV move-in, applies that exact reviewed file, reads its journal, and undoes an unused import.
- The owner erases an unused client and exports/restores business records using RER archives, with an erasure journal preventing an older backup from restoring erased data.
- The static run site shows the picked Platter homepage, `/run` instructions and repository Markdown at `/docs`. The installed `/` remains Base's Lobby; sign-in, setup and app screens share the porcelain theme. Site deployment remains off until the run-site gate.

Not yet supported (target clauses below): USD pricing tables, payment collection, sales tax, statutory e-signature, provider connections and document analytics. A real deployment requires the owner's Cloudflare account and verified mail configuration. This seed round is not an independently reviewed release.

## Published guarantees

### Access and authority

- **HTTP-001 — Authorized domain dispatch** (done). Through HTTP: read state signed out (401), post a mutation from a foreign Origin (403), call a domain command with a revoked agent key (401) and as a member for an owner-only action (403).
- **ACCESS-001 — Revocable agent keys that only draft** (done). Create a key, prepare a draft with it, try to approve and add a client with it (403), revoke it, and read context with it again (401).

### Approval, sending and acceptance

- **PROP-001 — The owner approves the exact revision** (done). Approve a stale revision (409), approve the current one, revise the price, try to send (409), approve the new revision and send; two approval records exist.
- **PROP-002 — Sending freezes the offer** (partial). Send an approved proposal, try to revise it (409), send a fresh invitation and confirm the old link is refused and the offer unchanged.
- **SIGN-001 — Verified-mailbox acceptance** (done). Accept before verifying (401), verify, submit a code again (401), exhaust five wrong attempts and see the right code refused, expire a code and see it refused.
- **SIGN-002 — Immutable acceptance with an integer-cent deposit** (done). Accept with an unknown option (400), accept option two with consent, accept again with another name and option, and read back the first acceptance with total 420000 and deposit 105000 cents.
- **INV-001 — One retained deposit invoice per acceptance** (done). Export an unaccepted proposal (409), export an accepted one twice concurrently and get one invoice, and download its CSV.

### Clients, erasure and archives

- **IMPORT-001 — Reviewed client CSV move-in with undo** (done). Preview `fixtures/clients.csv`, apply a changed file against the reviewed fingerprint (409), apply the reviewed file, read the journal, re-apply, undo, and see an undo refused once a proposal uses an imported client.
- **ERASE-001 — Bounded client erasure** (done). Erase a client with a draft (409), erase with the wrong name (400), erase an unused client, then restore an older archive with the newer erasure journal and find the client absent.
- **PORT-001 — Validated archives and restore** (done). Through the public CLI: export, import into an empty checkout and re-export identical parts, refuse a populated destination (4), refuse a damaged archive (1), and refuse an older archive after an erasure (4).

### Mail and the public site

- **MAIL-001 — Durable proposal mail with honest outcomes** (partial). A Workers journey with a provider fake at the network edge: send, see the row claimed before the call, return accepted, then return a timeout and see the row left uncertain and not resent.
- **SITE-001 — Public run site and documentation** (partial). Build the site, open `/` and follow Run Platter to `/run`, open `/docs` with JavaScript disabled, and open the installed `/` to see the Lobby.

## Target clauses

### Authoring and branding

- **EDIT-001 — Branded drag-and-drop proposal editor** (partial). A browser journey at 1440 and 390 pixels builds a proposal from blank with every block type, reorders by drag and by keyboard, applies a brand kit, reloads and sees the same document, and exports a PDF whose pages carry the same blocks in order.
- **EDIT-002 — Proposal templates** (missing). Create a template with a pricing table and variables, start two proposals from it, edit the template, and confirm both proposals are unchanged while a third proposal picks up the edit.
- **EDIT-003 — Reusable content library** (missing). Insert a linked and a detached case study into a draft and a sent proposal, edit the library item, and see only the linked copy in the draft change; the item's usage list names all three.
- **EDIT-004 — Variables from client, deal and CRM records** (missing). Create a proposal from a HubSpot deal fake with a missing contact title, see the send refused naming that variable, fill it, send, change the deal in the fake, and see the sent proposal unchanged.
- **EDIT-005 — Word and PDF import and export** (missing). Upload a 10-page .docx with headings, a table and images and see them as blocks; upload a PDF and place a signature field on page 3; export the proposal as PDF and .docx and open both.
- **EDIT-006 — Embedded rich media** (missing). Add an uploaded video, a Loom link and a gallery, view on a 390-pixel phone and play the video, export the PDF and see stills with links, and try an embed from a host outside the allowlist (refused).
- **EDIT-007 — Mobile client review** (partial). A browser journey at 390 pixels opens an invitation, verifies the mailbox, changes an optional item, comments, signs and pays with a Stripe test card; an axe scan reports no WCAG 2.2 AA violations and a keyboard-only run completes the same journey.
- **EDIT-008 — Custom domain and branded client experience** (missing). Configure a custom hostname and sending domain in a staging account, see the DNS checks pass, send, and open the client link on the custom domain with no Platter branding in page, email or PDF.
- **EDIT-009 — Conditional content by package** (missing). Make a timeline section depend on the Premium package, accept the Standard package and see the section absent from the agreement and PDF, then accept Premium on another copy and see it present.
- **EDIT-010 — Attachments and vendor documents** (missing). Upload a W-9 in settings, send a proposal, and as the client download the W-9; replace the W-9 in settings and see the sent proposal still carry the original.

### Catalogue and pricing

- **CAT-001 — Service and product catalogue** (missing). Import 50 items from CSV with a preview, sync items from a QuickBooks Online fake, add two items to a pricing table, change an item's price, and see the sent proposal unchanged and a new draft use the new price.
- **PRICE-001 — USD pricing tables with line items** (partial). Build two tables with 12 lines, quantities and units, and see the server totals match a cent-exact fixture; send malformed quantities and prices (400); reload and see identical totals in the client page and the PDF.
- **PRICE-002 — Packages and optional items the client chooses** (partial). Offer three packages and two optional items with an editable quantity between 1 and 10; as the client choose the middle package, add one item and set quantity 4; the server totals, agreement and PDF all show that selection; quantity 11 is refused.
- **PRICE-003 — One-off and recurring fees** (missing). Add a $2,500 one-off setup and a $1,200 monthly retainer for 12 months; the client page shows one-off $2,500, $1,200 a month and first-year value $16,900; acceptance creates a matching schedule.
- **PRICE-004 — Discounts** (missing). Apply 10% to a group and $500 off the total, see cent-exact totals; set an approval threshold of 15% and see a 20% discount require approval before sending.
- **PRICE-005 — US sales tax** (missing). Quote a taxable and a non-taxable line to clients in Texas and Oregon with a Stripe Tax fake, and see tax only on the Texas taxable line; mark a client exempt with a certificate and see zero tax; sync the invoice and see the tax code in the QuickBooks Online fake.
- **PRICE-006 — Internal cost and margin** (missing). Price a package with costs, see margin per line and total as an owner, then load the client page, PDF, client API response and webhook payload and find no cost or margin; a sales role without cost access sees none either.
- **PRICE-007 — Payment terms and schedules on the proposal** (partial). Set a 30% deposit, two milestones and a monthly retainer on net 15 terms; as the client see the schedule with dates and amounts; accept and read the same frozen schedule back.
- **PRICE-008 — First-release AUD agreements stay exact** (partial). Restore a first-release archive with an accepted AUD proposal into a target build, and see the agreement, deposit and CSV byte-identical and labelled AUD while new proposals are USD.

### Collaboration and approvals

- **COLLAB-001 — Real-time team editing** (partial). A two-browser journey: two members type in the same section and see the same text within one second; one deletes a block the other is editing and the second is offered restore.
- **COLLAB-002 — Internal comments, mentions and assignments** (missing). Comment on a pricing table mentioning a colleague, who gets a notification and resolves it; assign a section; the client page, PDF and client API show no internal comment.
- **COLLAB-003 — Version history with compare and restore** (partial). Make three revisions, compare the first and third and see the changed price and text, restore the first as revision four and see approval required.
- **APPROVE-001 — Approval rules and routing** (partial). Set rules: over $25,000 needs a manager, a discount over 15% needs the owner. A $30,000 proposal with 20% discount needs both in order; editing after the first approval clears both.
- **APPROVE-002 — Approval requests that reach the approver** (missing). Submit a proposal that needs approval, approve it from the Slack fake's action, reject another from email with a note, and see an overdue reminder after the set delay.

### Sending and delivery

- **SEND-001 — Send from the firm's own mailbox** (missing). Connect Gmail and Microsoft 365 fakes, send a proposal from each, reply from the client side, and see each reply on the proposal timeline; revoke the token and see sending fall back with a visible notice.
- **SEND-002 — Delivery status and bounce handling** (partial). Send three proposals through a mail provider fake that reports delivered, deferred then delivered, and hard bounce; see each state, the bounce notification and the follow-up item.
- **SEND-003 — Recipients, roles and sharing** (missing). Add a signer, a CFO approver and a viewer; each opens their own link; the viewer cannot sign; remove the viewer and see their link refused.
- **SEND-004 — Expiry and reopening** (missing). Send with a 7-day expiry, advance the clock and see the client page expired with a reopen request, extend it, and accept.
- **SEND-005 — Completion and activity notifications** (missing). Watch a proposal with Slack and email on; open, comment, sign and pay as the client; see four notifications in each channel fake with links back to the proposal.

### Engagement tracking

- **TRACK-001 — View tracking and live open alerts** (missing). Open the proposal as two recipients on desktop and phone; the sender gets an alert and the timeline lists both views with device class.
- **TRACK-002 — Section-level reading analytics** (missing). Run a scripted client session spending 40 seconds on pricing and 5 on the case study; the analytics show those times within 2 seconds and the toggled options.
- **TRACK-003 — Forwarded stakeholder identification** (missing). Forward a link to a second mailbox, open it there, identify and verify, and see a new stakeholder on the proposal that the sender converts into an approver.
- **TRACK-004 — Tracking disclosure and privacy limits** (missing). Open the client page and see the disclosure; inspect network requests for third-party hosts (none); read a stored view and find no full IP address; set 90-day retention and see older views removed.

### Follow-up and negotiation

- **FOLLOW-001 — Scheduled reminders to unsigned recipients** (missing). Send with reminders at 2 and 5 days and advance the clock: two reminders arrive; on another proposal, accept after the first and see no second; opt out and see none.
- **FOLLOW-002 — Next-action follow-up queue by sales owner** (missing). Send five proposals with different engagement; the owner's queue ranks them, completing one with a logged call closes it, and an unopened proposal's follow-up stays open after its notification.
- **FOLLOW-003 — Expiry and renewal notifications** (missing). Set a 3-day expiry notice and a 30-day renewal notice; advance the clock; see each notice and its follow-up item.
- **FOLLOW-004 — Client questions and comments** (missing). As the client comment on pricing; the sender answers from the app; the client gets the answer; the question leaves the queue; the agreement package lists the thread.
- **FOLLOW-005 — Decline reasons and won or lost outcomes** (missing). Decline as the client with the reason Budget, see the proposal lost and the HubSpot deal fake moved to Closed lost; reopen as a new revision and send.
- **NEG-001 — Negotiated revisions after sending** (missing). Send revision 1, revise the price, approve and send revision 2; the revision 1 link is refused; the client page shows the price change; acceptance records revision 2.
- **NEG-002 — Client-suggested text edits** (missing). Allow suggestions on the terms section, suggest two edits as the client, accept one and reject one, and see revision 2 contain only the accepted edit.

### E-signature

- **SIGN-003 — ESIGN and UETA electronic signature** (partial). Sign as a client who reads the disclosure and consents, draws a signature and initials three fields; a second client withdraws consent and the firm is told; the signed record reproduces the same document and signature.
- **SIGN-004 — Multiple signers, signing order and countersignature** (missing). Require client CEO then CFO, then the firm's owner; the CFO cannot sign before the CEO; after all three the agreement is complete and each party gets the completion email.
- **SIGN-005 — Signed agreement PDF and certificate of completion** (partial). Complete a two-signer agreement, download the PDF and certificate as each party, recompute the SHA-256 and see it match the certificate, and find both attached to the completion email.
- **SIGN-006 — Signer identity options** (partial). Require SMS for one signer and ID verification for another with Twilio and Stripe Identity fakes; wrong SMS codes are limited as in `SIGN-001`; the certificate names each method.
- **SIGN-007 — Fields collected at acceptance** (missing). Require a PO number and billing address, try to sign without them (refused), fill them, sign, and see them in the agreement, the QuickBooks Online invoice fake and the HubSpot deal fake.
- **SIGN-008 — Acceptance on the client's own paper** (missing). Upload a client-signed PDF for a sent proposal, record signer and date, and see the agreement marked accepted by upload with the file, followed by the deposit request.

### Payments

- **PAY-001 — Stripe card and ACH collection in the proposal** (missing). In Stripe test mode, connect an account, accept and pay a deposit by test card and by test ACH; see the authorization text retained; inspect the database and logs for card or bank numbers (none).
- **PAY-002 — Deposit or partial payment at acceptance** (partial). With payment required, sign and decline the test card: the agreement waits for payment; pay and see it complete. With payment due, sign, fail the payment and see the agreement accepted with the deposit due.
- **PAY-003 — Milestone and recurring payment schedules** (missing). Accept a deposit, two milestones and a monthly retainer; mark milestone one done and see it charged; advance the clock a month and see the retainer charged; update the payment method from the client link.
- **PAY-004 — Paid, pending, failed, refunded and disputed states** (missing). Replay Stripe test events out of order and twice: the state ends correct with one record per event; an ACH payment stays processing until the success event; the agreement shows due, paid and overdue totals.
- **PAY-005 — Failed-payment retries and notices** (missing). Fail a milestone charge; both parties are notified; a retry runs after the set delay; pay by check (`PAY-007`) before the next retry and see it cancelled.
- **PAY-006 — Refunds and disputes** (missing). Refund half of a deposit and see the credit in the QuickBooks Online fake; open a test dispute and submit the evidence pack to the Stripe fake before its deadline.
- **PAY-007 — Check, wire and ACH credit payments** (missing). Record a check with its number against a milestone and see it paid, synced to QuickBooks Online, and removed from the overdue list.

### Accounting sync

- **ACCT-001 — QuickBooks Online invoices and payments** (missing). With a QuickBooks Online sandbox fake: accept a proposal and see one customer and one deposit invoice with the right tax code; pay by Stripe and see the payment applied; pay the next invoice in QuickBooks and see it paid in Platter.
- **ACCT-002 — Xero invoices and payments** (partial). With a Xero API fake: accept, see the contact and deposit invoice; pay by Stripe and see the payment applied; pay the next invoice in Xero and see it paid in Platter.
- **ACCT-003 — Pantry invoices and payments** (missing). Run the `ACCT-001` journey against a Pantry instance and see the same customer, invoices and payments.
- **ACCT-004 — One invoice authority and reconciliation** (partial). Accept, disconnect and reconnect QuickBooks, replay the sync twice and see one invoice per amount; edit the amount in the fake and see a mismatch flagged in reconciliation.
- **ACCT-005 — Invoice and payment export files** (partial). Export the deposit and two milestones in QuickBooks and Xero formats and import them into each sandbox without errors; exporting again returns the same retained files.

### CRM sync

- **CRM-001 — HubSpot two-way deal sync** (missing). With a HubSpot API fake: create a proposal from a deal with two line items, send, view and sign; see the deal's line items, amount, stage Closed won and four timeline events.
- **CRM-002 — Salesforce two-way opportunity sync** (missing). With a Salesforce API fake: create from an opportunity with price-book products, accept, and see opportunity products, amount and stage updated and the activity logged.
- **CRM-003 — Orbit two-way deal sync** (missing). Run the `CRM-001` journey against an Orbit instance.
- **CRM-004 — Pipedrive and Zoho CRM sync** (missing). Run the `CRM-001` journey against Pipedrive and Zoho CRM fakes.

### Automation and integrations

- **AUTO-001 — Status-driven automations** (missing). Set a rule on signed that archives the PDF, posts to Slack and creates an Asana project; sign; see three logged successes; break the Slack fake and see a failed step with a manual retry.
- **AUTO-002 — Completed documents archived to file storage** (missing). Connect a Google Drive fake, complete an agreement and see the PDF and certificate in the client's folder with the configured name.
- **AUTO-003 — Team chat notifications** (missing). Route signed events to a Slack channel and approvals to a Teams direct message; sign and request approval; see both with working links.
- **AUTO-004 — Public REST API and webhooks** (partial). Create a proposal from a template through the API with a scoped key, send it, receive signed webhooks for sent and signed, verify their signatures, and see a key without write scope refused.
- **AUTO-005 — Zapier, Make and Crank apps** (missing). Run a Zap in Zapier's test environment that creates a proposal from a form submission and fires on signed.
- **HAND-001 — Accepted-scope handoff to delivery tools** (missing). Accept a proposal with four line items and an Asana fake connected; see one project with four tasks and the agreement link; replay the event and see no second project.
- **HAND-002 — Handoff to Gauge with budget and rates** (missing). Accept a proposal and see a Gauge project with budget hours, rates and milestones matching the agreement.

### Renewals and bulk sending

- **RENEW-001 — Bulk proposal creation and sending** (missing). Create 40 proposals from a CSV with three missing variables; the three are held as exceptions; approve the batch and see 37 sent at the set pace, each with its own link and timeline.
- **RENEW-002 — Renewal proposals from accepted agreements** (missing). Accept a 12-month retainer; 45 days before term end a renewal draft with a 5% increase is waiting for approval; approve, send and accept it, and see a new schedule start when the old one ends.

### Reporting

- **REPORT-001 — Proposal pipeline dashboard** (partial). Seed 30 proposals across statuses and owners, filter by owner and status, sort by value, and see the totals match a fixture.
- **REPORT-002 — Win rate and sales performance** (missing). From a fixture of 100 decided proposals, see win rate, median time to sign and lost-reason counts by owner and template match the fixture.
- **REPORT-003 — Content and pricing performance** (missing). From the same fixture, see package take-up and per-template win rate, and reading time per library item.
- **REPORT-004 — Booked, billed and collected revenue** (missing). Accept and pay a fixture of agreements and see booked, invoiced, collected and overdue totals match payments and the QuickBooks Online fake.
- **REPORT-005 — Report export and scheduled delivery** (missing). Schedule the weekly win-rate report to two people and export the pipeline to CSV; the email arrives with the same figures as the screen.

### Team administration

- **TEAM-001 — Roles and permissions** (partial). A matrix journey sends each action through its public route as each role, and every action outside a role's rights is refused with no write.
- **TEAM-002 — Single sign-on and SCIM provisioning** (missing). Sign in through an Okta fake with SAML, provision and deprovision through SCIM, and see sessions ended and proposals reassigned.
- **TEAM-003 — Multiple brands and workspaces** (missing). Create two brands with separate Stripe and QuickBooks fakes; a proposal from brand B uses B's brand, domain and Stripe account, and B's members cannot see A's library.
- **TEAM-004 — Audit log** (partial). Perform one action of each kind and see each in the log with its actor; export it and see the same rows.

### Migration from incumbents

- **MIG-001 — PandaDoc move-in** (missing). Against a PandaDoc API fake with 5 templates, 20 library items, 30 products and 50 documents in every status, preview, apply and see each item mapped or listed as unmapped; undo the import.
- **MIG-002 — Proposify move-in** (missing). Run the `MIG-001` journey against a Proposify API fake.
- **MIG-003 — Better Proposals move-in** (missing). Run the `MIG-001` journey against a Better Proposals API fake.
- **MIG-004 — Qwilr and Ignition move-in** (missing). Run the `MIG-001` journey against a Qwilr API fake and an Ignition export fixture, including one active billing schedule.
- **MIG-005 — Open proposals and payment schedules continue** (missing). Import an Ignition agreement with an active Stripe subscription fake, adopt it, advance a month and see exactly one charge recorded against the imported agreement.
- **MIG-006 — Clients, contacts and catalogue CSV move-in** (partial). Import a CSV of 200 contacts across 60 companies with addresses and exemptions, and 50 catalogue items, preview, apply and undo.

### Mobile

- **MOB-001 — Team app on a phone** (partial). A browser journey at 390 pixels completes each of those actions.
- **MOB-002 — iOS and Android apps with push notifications** (missing). On iOS and Android test devices, sign in, receive a push when the client views and signs, approve a request, and answer a question.

### AI assistance

- **AI-001 — Drafts from meeting notes, transcripts and email** (partial). Draft from a fixture transcript; every section cites a transcript line; prices come only from catalogue items; the draft needs approval before sending.
- **AI-002 — Writing assistant in the editor** (missing). Ask to shorten a section, see a suggested change, accept it, and see a request to change a price refused.
- **AI-003 — MCP server for AI assistants** (partial). Connect an MCP client with a scoped key, draft a proposal, read its status, request sending (queued for the owner), and see approve refused.
- **AI-004 — Explainable price suggestions** (missing). From a fixture history, see a suggested range with sample size and three linked examples, and see the price unchanged until the member applies it.

### Privacy, security and portability

- **PRIV-001 — Erasure across contacts, tracking and synced systems** (partial). Erase a contact who viewed two drafts and signed one agreement; their views and draft data are gone, the agreement remains with a retention note, and the receipt lists the HubSpot fake record to erase.
- **PORT-002 — Complete product archive** (partial). Export an installation with every record kind, restore into an empty one, and re-export identical parts; no provider token appears in the archive.
- **SEC-001 — Provider credential custody** (missing). Connect each provider fake, inspect the database and logs for tokens in clear (none), revoke one connection and see its state change and its jobs stop.

## Push further

### Agents

- **AGENT-001 — Discovery call to priced draft** (partial). From a fixture call and email thread, the draft's every scope line cites a source, every price is a catalogue item, an unmatched request is flagged, and sending is refused until approval.
- **AGENT-002 — Scope and price tested against delivery reality** (missing). With Gauge and QuickBooks fixtures where similar projects overran by 30%, the agent shows the margin falling below the firm's floor, cites the projects, flags a capacity conflict in week 3, and the price stays unchanged until the owner applies a suggestion.
- **AGENT-003 — Client questions chased to resolution** (missing). Ask three questions as the client, one of which needs a price change; the agent drafts two answers and a revision; nothing reaches the client until the owner approves; the queue shows each question until it is acknowledged.
- **AGENT-004 — Engagement-driven follow-up** (missing). Two clients read different sections; the agent drafts two different follow-ups that name those sections; with a cap of two nudges, a third is refused.
- **AGENT-005 — Payment exceptions closed without duplicate invoices** (partial). Seed a duplicate invoice, a failed ACH debit and an unmatched check; the agent opens three exceptions with causes; after the owner approves the fixes, reconciliation shows no mismatch and no second invoice exists.
- **AGENT-006 — Out-of-scope delivery turned into a change order** (missing). With a Gauge fixture showing 40 hours on a feature listed as excluded, the agent prepares a change order citing the exclusion and hours; after confirmation and approval the client accepts and pays it; the original agreement is byte-identical.
- **AGENT-007 — Win and loss learning for templates and pricing** (missing). From a fixture of 200 decided proposals where a three-package layout wins more often, the agent proposes the template change with the sample size, and the template is unchanged until an admin accepts it.
- **AGENT-008 — Renewal preparation from delivered results** (missing). For a retainer that used 20% more hours than sold, the agent drafts a renewal with a larger package, cites the hours, and waits for approval.
- **AGENT-009 — Agent authority ledger and limits** (partial). Run each agent once; the ledger lists inputs, outputs and approvals for each; an agent's attempt to send or refund is refused; pausing an agent stops its next run; exceeding the budget stops runs with a notice.

## Counts

116 clauses: 9 done, 33 partial, 74 missing. Published: 9 done, 3 partial, 0 missing of 12. Target and push further: 0 done, 30 partial, 74 missing of 104.
