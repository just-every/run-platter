# Platter claims

Generated from CONTRACT.md by `node scripts/contract-docs.mjs write`.

The homepage (`src/site/landing/`, built 20 Oct 2026 from the owner-approved page-s1) shows the product this contract builds toward (owner, 17 Oct 2026: the homepage may make claims not yet real for core features). Every capability claim it makes is listed here with its clauses and how far the code is: **code** (a code path backs it), **partly** (some of it is in code, named), or **contract, not yet in code**. Status follows the Status table below. The page's people, firms and figures are sample data for one October; brand names are plain text, never logos or partnerships.

| Section | Claim on the page | Clauses | Status | Code |
| --- | --- | --- | --- | --- |
| 01 Hero | Branded proposals from your templates and catalog | EDIT-001, EDIT-002, CAT-001 | partly | `src/platter/ui/proposals.ts` (title, scope, two options); `src/platter/movein/business-import.ts` (imported catalog metadata); templates: contract, not yet in code |
| 01 Hero | Sent from your own mailbox | SEND-001 | partly | OAuth Gmail&#47;Microsoft sending and installation fallback ship (`src/platter/mailboxes.ts`); full reply threads and reminders remain partial |
| 01 Hero | Shows what each client read | TRACK-001, TRACK-002 | contract, not yet in code |  |
| 01 Hero | Collects the signature and deposit together | SIGN-001, SIGN-003, PAY-001, PAY-002 | partly | `src/platter/signing.ts`, `src/platter/collection.ts`, `public/collection.js` (verified signature and explicit Stripe deposit collection; required and due completion); wallet and bank-verification qualification remains |
| 01 Hero | Good / Better / Best packages, add-ons, Austin sales tax, 50% deposit | PRICE-001, PRICE-002, PRICE-005, PRICE-007 | partly | `src/platter/selection.ts`, `src/platter/pricing.ts` (packages, add-ons and percentage deposit; PRICE-001 and PRICE-002 done); sales tax: contract, not yet in code |
| 01 Hero | HubSpot deal won, QuickBooks invoice paid | CRM-001, ACCT-001 | contract, not yet in code |  |
| 01 Hero, 13 | 100% free, open source alternative to PandaDoc, Proposify and Better Proposals; MIT licensed | MIG-001, MIG-002, MIG-003 | code (licence); move-in: contract | `LICENSE` (MIT), `src/site/run.json` |
| 01 Hero, 13 | Run Platter (the one-line start) | SITE-001 | code | `src/site/pages.ts`, `src/site/run.json`, `tests/site.test.mjs` |
| 02 Firms | Sent, read, back and forth, signed, first payment, per proposal | SEND-001, TRACK-001, NEG-001, SIGN-003, PAY-001, PAY-002, PAY-004 | partly | `src/platter/negotiation.ts` (revisions after sending, NEG-001 done); reading: contract; Stripe deposit collection: `src/platter/collection.ts`; full payment states: contract |
| 03 Draft | The agent drafts a priced proposal from a Zoom call, each line cited | AGENT-001, AI-001 | partly | `src/platter/http.ts`, `src/platter/commands.ts` (agents post drafts the owner approves); transcript ingestion: contract |
| 03 Draft | Draft agents only draft; a person sends | ACCESS-001, PROP-001 | code | `src/platter/credentials.ts`, `src/platter/commands.ts` |
| 03 Draft | Lines from the catalog; items not in it left out | CAT-001, PRICE-001 | partly | `src/platter/business-records.ts` (imported catalog); pricing-table insertion: contract |
| 03 Draft | Checked against Gauge: margin against the floor | AGENT-002, PRICE-006, HAND-002 | contract, not yet in code |  |
| 04 Build | Template, content library, brand kit, fields, locked sections | EDIT-001, EDIT-002, EDIT-003, EDIT-004, EDIT-015 | partly | `src/platter/ui/proposals.ts` (fixed styling); templates, library, fields, locks: contract |
| 04 Build | The client sets the guest count; options they can add | PRICE-002, PRICE-001 | code | `src/platter/selection.ts`, `src/platter/ui/packages.ts`, `tests/packages-journey.mjs` (client-editable quantities and optional items; PRICE-001 and PRICE-002 done) |
| 04 Build | Delaware sales tax $0.00 | PRICE-005 | contract, not yet in code |  |
| 04 Build | Reminders, cancelled once signed; expiry | FOLLOW-001, FOLLOW-006, SEND-004 | partly | `src/platter/expiry.ts` (SEND-004 done); reminders: contract |
| 04 Build | "Views of this page are measured." on the client page | TRACK-004 | implemented with owner consent | `src/platter/tracking.ts`, `tests/site-lifecycle.mjs` |
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
| 08 Books | Stripe ACH deposit, fee and payout cleared in QuickBooks Online, balance $0.00 | PAY-001, ACCT-001, ACCT-006 | partly | `src/platter/collection.ts` (Stripe test ACH collection); accounting and payout clearing remain contract |
| 08 Books | One invoice per amount, created on its issue day; net 15 | ACCT-004, ACCT-007, PAY-008 | partly | `src/platter/invoices.ts` (one retained deposit invoice per acceptance, INV-001) |
| 09 Payments | Card declined, the client told why, ACH from the same invoice link | PAY-004, PAY-005 | contract, not yet in code |  |
| 09 Payments | The agent's exception card with evidence; Owen sends | AGENT-005, AGENT-009 | partly | `src/platter/invoices.ts` (no duplicate exports), `src/platter/credentials.ts` |
| 09 Payments | Reconciled: 1 amount, 1 invoice, 2 attempts, 0 mismatches | ACCT-004 | partly | `src/platter/invoices.ts` |
| 11 Change | Out-of-scope request priced as its own change order; the original agreement unchanged | AGENT-006, PROP-002 | partly | `src/platter/commands.ts` (sent revisions are frozen); change orders: contract |
| 11 Change | Asana project made at signing, one task per accepted line | HAND-001 | contract, not yet in code |  |
| 11 Change | Paid by card that afternoon | PAY-001 | partly | `src/platter/collection.ts`, `public/collection.js` (explicit signed USD deposit collection) |
| 12 Move-in | PandaDoc Word templates become editable pages; tokens become fields; rows matched to the catalog | MIG-001, MIG-007, EDIT-005, EDIT-004, CAT-001 | contract, not yet in code | only the client CSV move-in exists (`src/platter/movein/index.ts`, IMPORT-001) |
| 12 Move-in | Catalog CSV with bundles as packages; bulk PDFs kept with their certificates | MIG-001, CAT-001 | partly | `src/platter/movein/business-import.ts` (catalog metadata import) |
| 12 Move-in | Planned move-in support for Proposify, Better Proposals, Qwilr and Ignition | MIG-002, MIG-003, MIG-004 | contract, not yet in code |  |

## Clause status

| Clause | Status |
| --- | --- |
| HTTP-001 | done |
| ACCESS-001 | done |
| PROP-001 | done |
| PROP-002 | done |
| SIGN-001 | done |
| SIGN-002 | done |
| INV-001 | done |
| IMPORT-001 | done |
| ERASE-001 | done |
| PORT-001 | done |
| MAIL-001 | done |
| SITE-001 | done |
| EDIT-001 | done |
| EDIT-002 | partial |
| EDIT-003 | done |
| EDIT-004 | missing |
| EDIT-005 | missing |
| EDIT-006 | done |
| EDIT-007 | partial |
| EDIT-008 | missing |
| EDIT-009 | done |
| EDIT-010 | done |
| EDIT-011 | done |
| EDIT-012 | done |
| EDIT-013 | missing |
| EDIT-014 | done |
| EDIT-015 | done |
| EDIT-016 | done |
| EDIT-017 | missing |
| EDIT-018 | done |
| CAT-001 | partial |
| PRICE-001 | done |
| PRICE-002 | done |
| PRICE-003 | missing |
| PRICE-004 | done |
| PRICE-005 | missing |
| PRICE-006 | partial |
| PRICE-007 | done |
| PRICE-008 | done |
| COLLAB-001 | partial |
| COLLAB-002 | done |
| COLLAB-003 | done |
| APPROVE-001 | done |
| APPROVE-002 | partial |
| APPROVE-003 | done |
| SEND-001 | done |
| SEND-002 | done |
| SEND-003 | partial |
| SEND-004 | done |
| SEND-005 | partial |
| SEND-006 | partial |
| SEND-007 | partial |
| SEND-008 | partial |
| SEND-009 | missing |
| SEND-010 | done |
| TRACK-001 | done |
| TRACK-002 | partial |
| TRACK-003 | partial |
| TRACK-004 | done |
| FOLLOW-001 | partial |
| FOLLOW-002 | done |
| FOLLOW-003 | partial |
| FOLLOW-004 | done |
| FOLLOW-005 | partial |
| FOLLOW-006 | partial |
| FOLLOW-007 | missing |
| NEG-001 | done |
| NEG-002 | done |
| SIGN-003 | partial |
| SIGN-004 | missing |
| SIGN-005 | partial |
| SIGN-006 | partial |
| SIGN-007 | partial |
| SIGN-008 | done |
| SIGN-009 | missing |
| SIGN-010 | missing |
| SIGN-011 | missing |
| PAY-001 | partial |
| PAY-002 | done |
| PAY-003 | missing |
| PAY-004 | missing |
| PAY-005 | missing |
| PAY-006 | partial |
| PAY-007 | partial |
| PAY-008 | missing |
| PAY-009 | missing |
| ACCT-001 | missing |
| ACCT-002 | partial |
| ACCT-003 | missing |
| ACCT-004 | partial |
| ACCT-005 | partial |
| ACCT-006 | missing |
| ACCT-007 | missing |
| CRM-001 | missing |
| CRM-002 | missing |
| CRM-003 | missing |
| CRM-004 | missing |
| AUTO-001 | missing |
| AUTO-002 | missing |
| AUTO-003 | partial |
| AUTO-004 | done |
| AUTO-005 | missing |
| HAND-001 | missing |
| HAND-002 | missing |
| RENEW-001 | missing |
| RENEW-002 | missing |
| REPORT-001 | done |
| REPORT-002 | missing |
| REPORT-003 | missing |
| REPORT-004 | partial |
| REPORT-005 | done |
| TEAM-001 | partial |
| TEAM-002 | missing |
| TEAM-003 | missing |
| TEAM-004 | done |
| TEAM-005 | missing |
| MIG-001 | missing |
| MIG-002 | missing |
| MIG-003 | missing |
| MIG-004 | missing |
| MIG-005 | missing |
| MIG-006 | partial |
| MIG-007 | missing |
| MOB-001 | done |
| MOB-002 | missing |
| AI-001 | partial |
| AI-002 | missing |
| AI-003 | done |
| AI-004 | missing |
| PRIV-001 | partial |
| PORT-002 | done |
| SEC-001 | partial |
| AGENT-001 | partial |
| AGENT-002 | missing |
| AGENT-003 | missing |
| AGENT-004 | missing |
| AGENT-005 | partial |
| AGENT-006 | missing |
| AGENT-007 | missing |
| AGENT-008 | missing |
| AGENT-009 | partial |
