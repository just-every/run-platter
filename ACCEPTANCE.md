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

- **EDIT-001 — Branded drag-and-drop proposal editor** (partial). A browser journey at 1440 and 390 pixels builds a proposal from blank with every block type, reorders by drag and by keyboard, applies a brand kit, reloads and sees the same document, and exports a PDF whose pages carry the same blocks in order; the `EDIT-011` budget journey passes on the same build.
- **EDIT-002 — Proposal templates** (missing). Create a template with a pricing table and variables, start two proposals from it, edit the template, and confirm both proposals are unchanged while a third proposal picks up the edit.
- **EDIT-003 — Reusable content library** (missing). Insert a linked and a detached case study into a draft and a sent proposal, edit the library item, and see only the linked copy in the draft change; the item's usage list names all three.
- **EDIT-004 — Variables from client, deal and CRM records** (missing). Create a proposal from a HubSpot deal fake with a missing contact title, see the send refused naming that variable, fill it, send, change the deal in the fake, and see the sent proposal unchanged.
- **EDIT-005 — Word and PDF import and export** (missing). Upload a 10-page .docx with headings, a table and images and see them as blocks; upload a PDF and place a signature field on page 3; export the proposal as PDF and .docx and open both.
- **EDIT-006 — Embedded rich media** (missing). Add an uploaded video, a Loom link and a gallery, view on a 390-pixel phone and play the video, export the PDF and see stills with links, and try an embed from a host outside the allowlist (refused).
- **EDIT-007 — Mobile client review** (partial). A browser journey at 390 pixels opens an invitation, verifies the mailbox, changes an optional item, comments, signs and pays with a Stripe test card; an axe scan reports no WCAG 2.2 AA violations and a keyboard-only run completes the same journey.
- **EDIT-008 — Custom domain and branded client experience** (missing). Configure a custom hostname and sending domain in a staging account, see the DNS checks pass, send, and open the client link on the custom domain with no Platter branding in page, email or PDF.
- **EDIT-009 — Conditional content by package** (missing). Make a timeline section depend on the Premium package, accept the Standard package and see the section absent from the agreement and PDF, then accept Premium on another copy and see it present.
- **EDIT-010 — Attachments and vendor documents** (missing). Upload a W-9 in settings, send a proposal, and as the client download the W-9; replace the W-9 in settings and see the sent proposal still carry the original.
- **EDIT-011 — Large-proposal performance budget** (missing). A browser journey creates the reference proposal through the public API, applies the 4× throttle, opens it at 1440 pixels and records time to editable, the p95 of 200 keystroke-to-paint intervals (Event Timing API), one drag reorder and one quantity edit, then opens the client page at 390 pixels and records largest contentful paint; the run reports each measured value and fails if any exceeds its budget.
- **EDIT-012 — Duplicate a proposal for another client** (missing). Duplicate an accepted proposal for Acme into a draft for Beta Co: blocks and prices match, variables show Beta's contact, there are no recipients, approvals, views or signatures, sending is refused until approval, and Acme's agreement is byte-identical.
- **EDIT-013 — Documents without pricing** (missing). Upload a two-page NDA PDF, place signature and date fields for two signers, approve and send, and sign as both: the agreement completes with its signed PDF and certificate, no payment step is shown, no invoice exists and the accounting fake receives no call.
- **EDIT-014 — Client PDF download before signing** (missing). As a verified client, choose a package and download the PDF: every page reads "Not signed, revision 2" and shows the chosen package, and the timeline lists the download; turn downloads off on another proposal and see no download action and the PDF route refused (403).
- **EDIT-015 — Locked template sections** (missing). Lock the terms section in a template; as a sales member try to edit it in the editor and through the API (both refused); as an admin unlock it in one proposal and edit it, and see the unlock in the audit log and approval required before sending.
- **EDIT-016 — Proposal search and folders** (missing). Seed 500 proposals; search a phrase that appears only in the body of two proposals and one uploaded PDF and get exactly those three within one second; file proposals in a team folder and see a member outside the team find none of them by search or by folder.
- **EDIT-017 — Client page in the client's language** (missing). Set a recipient to Spanish: the invitation email, client page controls, ESIGN disclosure, verification and signing steps are in Spanish, the string catalogue check finds no untranslated English string on those screens, and the certificate records Spanish.

### Catalogue and pricing

- **CAT-001 — Service and product catalogue** (missing). Import 50 items from CSV with a preview, sync items from a QuickBooks Online fake, add two items to a pricing table, change an item's price, and see the sent proposal unchanged and a new draft use the new price.
- **PRICE-001 — USD pricing tables with line items** (partial). Build two tables with 12 lines, quantities and units, and see the server totals match a cent-exact fixture; send malformed quantities and prices (400); reload and see identical totals in the client page and the PDF.
- **PRICE-002 — Packages and optional items the client chooses** (partial). Offer three packages and two optional items with an editable quantity between 1 and 10; as the client choose the middle package, add one item and set quantity 4; the server totals, agreement and PDF all show that selection; quantity 11 is refused.
- **PRICE-003 — One-off and recurring fees** (missing). Add a $2,500 one-off setup and a $1,200 monthly retainer for 12 months; the client page shows one-off $2,500, $1,200 a month and first-year value $16,900; acceptance creates a matching schedule.
- **PRICE-004 — Discounts** (missing). Apply 10% to a group and $500 off the total, see cent-exact totals; set an approval threshold of 15% and see a 20% discount require approval before sending.
- **PRICE-005 — US sales tax** (missing). With owner-configured rates for Austin, Texas (state 6.25%, city 1% and transit authority 1%, 8.25% in all), quote a $1,000.00 taxable line and a $500.00 non-taxable line to an Austin client and see $82.50 tax as its own line, and the same quote to a Portland, Oregon client with $0.00 tax; give the city rate a new value with a future effective date and see the sent quote unchanged. Run the same two quotes through a Stripe Tax fake and an Avalara AvaTax fake: each fake's request carries the line tax codes and addresses, the returned tax is applied to the cent, and the AvaTax transaction is committed when the invoice is issued. Mark a client exempt with a certificate and see zero tax; sync the invoice and see the tax code in the QuickBooks Online fake.
- **PRICE-006 — Internal cost and margin** (missing). Price a package with costs, see margin per line and total as an owner, then load the client page, PDF, client API response and webhook payload and find no cost or margin; a sales role without cost access sees none either.
- **PRICE-007 — Payment terms and schedules on the proposal** (partial). Set a 30% deposit, two milestones and a monthly retainer on net 15 terms; as the client see the schedule with dates and amounts; accept and read the same frozen schedule back.
- **PRICE-008 — First-release AUD agreements stay exact** (partial). Restore a first-release archive with an accepted AUD proposal into a target build, and see the agreement, deposit and CSV byte-identical and labelled AUD while new proposals are USD.

### Collaboration and approvals

- **COLLAB-001 — Real-time team editing** (partial). A two-browser journey: two members type in the same section and see the same text within one second; one deletes a block the other is editing and the second is offered restore.
- **COLLAB-002 — Internal comments, mentions and assignments** (missing). Comment on a pricing table mentioning a colleague, who gets a notification and resolves it; assign a section; the client page, PDF and client API show no internal comment.
- **COLLAB-003 — Version history with compare and restore** (partial). Make three revisions, compare the first and third and see the changed price and text, restore the first as revision four and see approval required.
- **APPROVE-001 — Approval rules and routing** (partial). Set rules: over $25,000 needs a manager, a discount over 15% needs the owner. A $30,000 proposal with 20% discount needs both in order; editing after the first approval clears both. A parallel rule routes edited legal terms to counsel and finance at once: it completes only when both approve, in either order, and one rejection stops it.
- **APPROVE-002 — Approval requests that reach the approver** (missing). Submit a proposal that needs approval, approve it from the Slack fake's action, reject another from email with a note, and see an overdue reminder after the set delay.

### Sending and delivery

- **SEND-001 — Send from the firm's own mailbox** (missing). Connect Gmail and Microsoft 365 fakes, send a proposal from each, reply from the client side, and see each reply on the proposal timeline; revoke the token and see sending fall back with a visible notice.
- **SEND-002 — Delivery status and bounce handling** (partial). Send three proposals through a mail provider fake that reports delivered, deferred then delivered, and hard bounce; see each state, the bounce notification and the follow-up item.
- **SEND-003 — Recipients, roles and sharing** (missing). Add a signer, a CFO approver and a viewer; each opens their own link; the viewer cannot sign; remove the viewer and see their link refused.
- **SEND-004 — Expiry and reopening** (missing). Send with a 7-day expiry, advance the clock and see the client page expired with a reopen request, extend it, and accept.
- **SEND-005 — Completion and activity notifications** (missing). Watch a proposal with Slack and email on; open, comment, sign and pay as the client; see four notifications in each channel fake with links back to the proposal. A second watcher who turned view notifications off and chose email only gets three emails and no Slack message.
- **SEND-006 — Editable subject, message and shared email templates** (missing). Save a template with subject "Proposal for {client.company}" and a body starting "Hi {client.first_name},"; send with it to Dana at Acme: the mail fake and the timeline both hold the subject "Proposal for Acme" and the body "Hi Dana," exactly. Edit the text of the scheduled second reminder: the first reminder in the mail fake carries the template text and the second carries the edited text. Send with an unfilled variable (refused, naming it); as a member edit a locked template's text (refused).
- **SEND-007 — Replace an unsigned signer on a sent proposal** (missing). Send revision 2 with the client CEO as signer and replace the CEO with the COO: the proposal is still revision 2 with its original approval and no new approval request; the CEO's link is refused; the COO verifies and signs; the certificate lists the replacement with reason and time. On another proposal sign as the CEO, then try to replace the CEO (409).
- **SEND-008 — Sending and reminders by text message** (missing). With a Twilio fake: send a proposal by text and see the message with its link on the timeline with the delivery callback state; reply STOP and see later reminders by text suppressed while email reminders continue; a text reminder due at 6 am in the recipient's time zone waits until quiet hours end.

### Engagement tracking

- **TRACK-001 — View tracking and live open alerts** (missing). Open the proposal as two recipients on desktop and phone; the sender gets an alert and the timeline lists both views with device class. With a 30-minute quiet period, the first recipient's return visit 10 minutes later raises no alert and a visit 45 minutes after that raises one return-visit alert.
- **TRACK-002 — Section-level reading analytics** (missing). Run a scripted client session spending 40 seconds on pricing and 5 on the case study; the analytics show those times within 2 seconds and the toggled options.
- **TRACK-003 — Forwarded stakeholder identification** (missing). Forward a link to a second mailbox, open it there, identify and verify, and see a new stakeholder on the proposal that the sender converts into an approver.
- **TRACK-004 — Tracking disclosure and privacy limits** (missing). Open the client page and see the disclosure; inspect network requests for third-party hosts (none); read a stored view and find no full IP address; set 90-day retention and see older views removed.

### Follow-up and negotiation

- **FOLLOW-001 — Scheduled reminders to unsigned recipients** (missing). Send to a recipient in Pacific time with reminders at 2, 5 and 9 days, quiet hours 8 pm to 8 am and a cap of 2, and advance the clock: two reminders arrive, each between 8 am and 8 pm Pacific (one due at 6 am Pacific arrives at 8 am), and the 9-day reminder is not sent because of the cap; on another proposal, accept after the first reminder and see no second; opt out and see none.
- **FOLLOW-002 — Next-action follow-up queue by sales owner** (missing). With the clock at 10 March, seed seven proposals for one owner: A $8,000 viewed, due 9 March; B $40,000 unopened, due 10 March; C $5,000 bounced, due 10 March; D $12,000 question waiting, due 10 March; E $20,000 viewed, due 10 March; F $30,000 viewed, due 10 March; G $9,000 unopened, due 12 March. The queue reads exactly A, C, D, F, E, B, G. Completing C with a logged call removes it; B's follow-up stays open after its notification is sent; dismissing E without a reason is refused (400).
- **FOLLOW-003 — Expiry and renewal notifications** (missing). Set a 3-day expiry notice and a 30-day renewal notice; advance the clock; see each notice and its follow-up item.
- **FOLLOW-004 — Client questions and comments** (missing). As the client comment on pricing; the sender answers from the app; the client gets the answer; the question leaves the queue; the agreement package lists the thread.
- **FOLLOW-005 — Decline reasons and won or lost outcomes** (missing). Decline as the client with the reason Budget, see the proposal lost and the HubSpot deal fake moved to Closed lost; reopen as a new revision and send.
- **NEG-001 — Negotiated revisions after sending** (missing). Send revision 1, revise the price, approve and send revision 2; the revision 1 link is refused; the client page shows the price change; acceptance records revision 2.
- **NEG-002 — Client-suggested text edits** (missing). Allow suggestions on the terms section, suggest two edits as the client, accept one and reject one, and see revision 2 contain only the accepted edit.

### E-signature

- **SIGN-003 — ESIGN and UETA electronic signature** (partial). Sign as a client who reads the disclosure and consents, draws a signature and initials three fields; a second client withdraws consent and the firm is told; a third client uploads a PNG of their signature and adopts it; the signed record reproduces the same document and each adopted signature.
- **SIGN-004 — Multiple signers, signing order and countersignature** (missing). Require client CEO then CFO, then the firm's owner; the CFO cannot sign before the CEO; after all three the agreement is complete and each party gets the completion email. On another proposal, put two client signers in one parallel group followed by the firm's countersignature: the two sign in either order, the firm cannot countersign before both have signed, and the agreement completes after the countersignature.
- **SIGN-005 — Signed agreement PDF and certificate of completion** (partial). Complete a two-signer agreement, download the PDF and certificate as each party, recompute the SHA-256 and see it match the certificate, and find both attached to the completion email.
- **SIGN-006 — Signer identity options** (partial). Require SMS for one signer and ID verification for another with Twilio and Stripe Identity fakes; wrong SMS codes are limited as in `SIGN-001`; the certificate names each method. On another proposal choose link only: the recipient signs from their link without a code and the certificate reads "email link only"; the same link opened from a second device and network after a forward asks for the mailbox code; a proposal with no choice made still requires the code.
- **SIGN-007 — Fields collected at acceptance** (missing). Require a PO number and billing address, try to sign without them (refused), fill them, sign, and see them in the agreement, the QuickBooks Online invoice fake and the HubSpot deal fake.
- **SIGN-008 — Acceptance on the client's own paper** (missing). Upload a client-signed PDF for a sent proposal, record signer and date, and see the agreement marked accepted by upload with the file, followed by the deposit request.
- **SIGN-009 — Recipient delegation of signing** (missing). With delegation off, try to delegate from the CEO's link (refused); turn it on and delegate to the COO: the CEO's link is refused and the sender is notified; the COO verifies and signs, and the certificate shows the CEO delegated to the COO with the time; on another proposal sign as the CEO and then try to delegate (409).

### Payments

- **PAY-001 — Stripe card and ACH collection in the proposal** (missing). In Stripe test mode, connect an account, accept and pay a deposit by test card, by Apple Pay and Google Pay test wallets, and by test ACH; see the authorization text retained; inspect the database and logs for card or bank numbers (none). Turn on a 3% card fee after confirming it is allowed: the card total shows the fee as its own line, ACH shows none, and a client whose billing state the firm marked as not allowing surcharges sees no fee.
- **PAY-002 — Deposit or partial payment at acceptance** (partial). With payment required, sign and decline the test card: the agreement waits for payment; pay and see it complete. With payment due, sign, fail the payment and see the agreement accepted with the deposit due.
- **PAY-003 — Milestone and recurring payment schedules** (missing). Accept a deposit, a charged milestone, a net-30 milestone and a monthly retainer; mark milestone one done and see it charged; mark the net-30 milestone done and see an invoice issued, not a charge, followed by the `PAY-008` journey; advance the clock a month and see the retainer charged; update the payment method from the client link.
- **PAY-004 — Paid, pending, failed, refunded and disputed states** (missing). Replay Stripe test events out of order and twice: the state ends correct with one record per event; an ACH payment stays processing until the success event; the agreement shows due, paid and overdue totals.
- **PAY-005 — Failed-payment retries and notices** (missing). Fail a milestone charge; both parties are notified; a retry runs after the set delay; pay by check (`PAY-007`) before the next retry and see it cancelled.
- **PAY-006 — Refunds and disputes** (missing). Refund half of a deposit and see the credit in the QuickBooks Online fake; open a test dispute and submit the evidence pack to the Stripe fake before its deadline.
- **PAY-007 — Check, wire and ACH credit payments** (missing). Record a check with its number against a milestone and see it paid, synced to QuickBooks Online, and removed from the overdue list.
- **PAY-008 — Net-terms invoices with a pay link and overdue tracking** (missing). Accept a proposal with a $6,000.00 milestone on net 30 and mark it done on 1 March: the mail fake holds one invoice email with amount $6,000.00, due date 31 March, a PDF and a pay link. On 31 March it is due, not overdue. Advance to 1 April: it is overdue in the agreement's `PAY-004` totals and in the owner's `FOLLOW-002` queue, and an overdue reminder is sent. Pay by Stripe test ACH from the link: it shows processing, then paid after the success event, the follow-up closes, and exactly one invoice exists locally and in the QuickBooks Online fake.
- **PAY-009 — PayPal, Square and Authorize.net collection** (missing). With PayPal, Square and Authorize.net sandbox fakes: connect each in turn, accept and pay a deposit, refund half of it, replay each webhook twice, and see the same payment states and QuickBooks Online fake records as the Stripe journey with one record per event; inspect the database and logs for card numbers (none).

### Accounting sync

- **ACCT-001 — QuickBooks Online invoices and payments** (missing). With a QuickBooks Online sandbox fake: accept a proposal and see one customer and one deposit invoice with the right tax code; pay by Stripe and see the payment applied in full with its fee posted as in `ACCT-006`; pay the next invoice in QuickBooks and see it paid in Platter.
- **ACCT-002 — Xero invoices and payments** (partial). With a Xero API fake: accept, see the contact and deposit invoice; pay by Stripe and see the payment applied; pay the next invoice in Xero and see it paid in Platter.
- **ACCT-003 — Pantry invoices and payments** (missing). Run the `ACCT-001` journey against a Pantry instance and see the same customer, invoices and payments.
- **ACCT-004 — One invoice authority and reconciliation** (partial). Accept, disconnect and reconnect QuickBooks, replay the sync twice and see one invoice per amount; edit the amount in the fake and see a mismatch flagged in reconciliation.
- **ACCT-005 — Invoice and payment export files** (partial). Export the deposit and two milestones in QuickBooks and Xero formats and import them into each sandbox without errors; exporting again returns the same retained files.
- **ACCT-006 — Stripe payouts, fees and clearing in accounting** (missing). In a QuickBooks Online fake and a Xero fake: take card payments of $1,000.00 and $500.00 with fees of $29.30 and $14.80 and one payout of $1,455.90; see both invoices paid in full, $44.10 in the fee expense account, one $1,455.90 transfer to the bank account and the clearing account at $0.00; refund $100.00 and see clearing and the bank match the next payout.

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
- **AUTO-005 — Zapier, Make and Crank apps** (missing). Run a Zap in Zapier's test environment that creates a proposal from a form submission and fires on signed; run a Make scenario in Make's test environment that fires on paid and adds a client; run the same trigger and action against a Crank instance; each trigger fires once per event.
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
- **TEAM-005 — Security review pack for procurement** (missing). Open the security page: every control statement links to a clause whose status is done, and none links to a partial or missing clause; download the subprocessor list and DPA; request the SOC 2 report, accept the NDA and receive the report for the current period; a questionnaire answer naming a control links to the same clause as the page.

### Migration from incumbents

- **MIG-001 — PandaDoc move-in** (missing). With fixtures in PandaDoc's real export shapes, namely two bulk zips (250 and 40 PDFs) with a three-level folder tree, completed documents carrying certificate pages and open documents without, a catalogue CSV with the export columns, a bundle row and a custom-field column, and a template details JSON response with roles and tokens and no body: preview and apply with no API key, and see completed documents as retained agreements whose PDFs and certificates are byte-identical with matching SHA-256, open documents as drafts, folders matching the tree, catalogue items and the bundle package matching the CSV, and a report listing what arrived and each unmapped kind. Then connect a PandaDoc API fake returning the template details response: the template is listed as "convert from PDF" with its roles and tokens; uploading its PDF yields editable blocks with those tokens mapped to variables. Uploading the same zip again adds nothing; undo the import.
- **MIG-002 — Proposify move-in** (missing). Run the `MIG-001` journey against a Proposify API fake; then, with no API, import 30 Proposify PDFs and a documents report CSV and see each PDF matched to its report row with status, value and client, signed ones retained byte-identical, open ones as drafts, and the unmapped list stated.
- **MIG-003 — Better Proposals move-in** (missing). Run the `MIG-001` journey against a Better Proposals API fake, then run the no-API journey of `MIG-002` with Better Proposals PDFs and a contacts CSV.
- **MIG-004 — Qwilr and Ignition move-in** (missing). Run the `MIG-001` journey against a Qwilr API fake and against Qwilr PDF exports with no API, and against an Ignition export fixture including one active billing schedule.
- **MIG-005 — Open proposals and payment schedules continue** (missing). Import an Ignition agreement with an active Stripe subscription fake, adopt it, advance a month and see exactly one charge recorded against the imported agreement. Import a PandaDoc document that was sent but not signed and reissue it: it follows `PROP-001` approval, the client gets a new Platter link, the new proposal links to the imported original, and the original is listed as "void in PandaDoc".
- **MIG-006 — Clients, contacts and catalogue CSV move-in** (partial). Import a CSV of 200 contacts across 60 companies with addresses and exemptions, and 50 catalogue items, preview, apply and undo; import PandaDoc's catalogue CSV layout unchanged and see the same items as `MIG-001`.
- **MIG-007 — Move-in from exported files without API access** (missing). Import three zips in two sessions with an interrupted upload between them and one PDF present in two zips: there is one agreement per document and nothing is duplicated; an ambiguous report row is held for review until the buyer picks its PDF; the report's counts of arrived, held and unmapped items match the fixture; undo removes everything the import wrote.

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

132 clauses: 9 done, 33 partial, 90 missing. Published: 9 done, 3 partial, 0 missing of 12. Target and push further: 0 done, 30 partial, 90 missing of 120.
