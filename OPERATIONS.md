# Foundation operations

Run all first-party operations from the composed, runnable edition checkout
with `rer`. Without it, start with
`npx -y @runeditrun/rer dev just-every/run-platter` (set up only:
`npx -y @runeditrun/rer setup just-every/run-platter`; without Node:
`curl -fsSL https://runeditrun.com/install.sh | sh -s -- dev just-every/run-platter`). `rer dev` alone launches
a fresh checkout for review. The detailed flags and effects are in
`RUN-LOCALLY.md` and `SEED-COMMAND-CONTRACT.md`.

```sh
rer install
rer setup --owner-email you@example.com
rer dev
```

Use the setup prompt instead of the owner-email flag when entering the real
mailbox. Open the printed `RER_OPEN` link to sign in as the owner. Development
and demo mail is silently suppressed. Stop `dev` with
`rer dev --stop` or Ctrl-C, and stop `preview` with
`rer preview --stop` before build or verification.

```sh
rer verify
rer reset --yes
rer export --output exports/installation.rer
rer import --input exports/installation.rer --yes
rer deploy
rer describe
```

Use `rer describe` to inspect the checkout's actual
capabilities. `rer check --profile first-party` validates the
declared command contract; it does not run application journeys or contact a
provider.

## Local data and recovery

Setup and development use explicit owner identity and real local migrations.
Dev and preview use the same owner and canonical `.wrangler/state`. Local dev
sign-in uses the checkout’s private key; keep `RER_OPEN` private. Private
settings are kept in `.dev.vars` with mode 0600 and are not copied into build output.

Local export creates a private archive with an integrity receipt and explicit
exclusions. The foundation has no product-domain tables or background jobs; an
edition's archive contains the supported domain tables and resources that its
adapter declares. Owner/auth, outbox, bookkeeping, private settings and
transient runtime state are excluded. Import validates and restores atomically
into an empty destination; confirmed reset preserves export archives. Run setup
after restore to establish a fresh owner. Each first-party seed verifies local
export/import/export equivalence across its supported resources. Remote transfer
is available only when the adapter declares complete resource coverage.

Preserve ambiguous state and applied migration history. Never place a remote
credential, owner secret or local resource ID in source. A schema change needs
a forward migration and verified transition/recovery.

## Deployment

`rer deploy --dry-run` validates the real owner-account
deployment declaration and builds locally without provider requests. Real
deployment requires privately supplied `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN`, the declared owner/session/setup secrets, and a real
verified mail sender in `deploy.json`. Follow the owner-account deploy-kit
instructions under `scripts/base-cli/modules/deploy-kit`; account scope,
resource ownership, migrations, receipt and health checks are defined there.
Local validation does not prove hosted acceptance, provider delivery or remote
health.


## Team authority and billing workflows

The Team screen assigns product roles, team membership and collaborator access. Delegated invitations pin the inviter’s current authority and apply the chosen role/teams only after native mailbox verification. An authorized issuer can reissue an unaccepted invitation; every earlier link is refused. Revocation ends the native invitation and product grant together. Acceptance checks whether the issuer can still grant the same role and teams; a time-zone change or added team does not invalidate it. Base still invalidates a pending link when the inviter’s native role version changes, including a promotion that preserves authority; issue a fresh invitation in that case. This remains a TEAM-001 gap, with the native guard retained. Expired or unauthorized invitations ask for a fresh invitation. Pending grants and all authentication capabilities are excluded from archives. Moving library items or shared templates to a wider audience requires explicit consent; the folder selector names its team audience before saving. Collaborator access permits role-allowed edits, but a manager outside the sales owner’s teams cannot send, approve, re-share or unlock.

Owner/admin control approval settings and workspace defaults. New drafts copy reminder/payment defaults and actual expiry settings; reminder execution and payment collection remain unavailable. Shared templates and library folders enforce their current team audience on both reads and writes. Locked native sections require an explicit owner/admin/team-manager proposal unlock; template lock changes require a template-editing role.

Catalog prices are copied into drafts. Price changes do not change existing drafts or sent offers. Internal costs belong only to owner/admin/manager/billing views and the separately authorized internal PDF. Unselected optional items stay outside package totals; accepted totals use the client’s exact frozen quantities. The mailbox-verified GET `/p/<invitation>/data.json` route exposes only public content, pricing and acceptance fields, never private operator state. Revoked invitations return 410.

Workspace Stripe/QuickBooks connections require owner/admin rights. Mailbox OAuth connections are bound to one member and may use a different provider-verified sending address. Configure the installation's GOOGLE_MAIL_CLIENT_ID / GOOGLE_MAIL_CLIENT_SECRET or MICROSOFT_MAIL_CLIENT_ID / MICROSOFT_MAIL_CLIENT_SECRET bindings using the owner's registered provider application; keep secrets in private deployment configuration, never source files. Register the exact installation-origin callback /api/platter/mailbox/callback. Google authorization requests openid, email, gmail.send and gmail.settings.basic (to verify send-as aliases); Microsoft requests openid, email, offline_access, User.Read and Mail.Send. The member explicitly authorizes their own connection on Team. State and PKCE bind the callback to that signed-in member and one attempt. Each outbound attempt refreshes, rechecks the verified mailbox and its sending grant, and checks current member/proposal authority. The latest connected mailbox is selected; other members cannot send through it. Provider grant refusal produces a broken connection and visible installation-sender fallback. A timeout after an outbound attempt is held as uncertain with no automatic fallback or resend. Sender address, route, acting member and provider acceptance/uncertainty are recorded on the timeline and audit log. No provider delivery confirmation or native inbox synchronization is claimed. Legacy access-token connections remain limited to the sign-in address and need OAuth reconnection before mailbox sending. Tokens stay encrypted locally and are excluded from exports. Restored connection metadata requires reconnection.

Owner/admin/billing can record received check, wire and ACH credit payments, link an already successful Stripe deposit and explicitly refund it. Linking requires the connected account, exact accepted deposit amount/currency and Stripe charge metadata `platter_proposal_id` / `platter_revision`. Refund requests reserve their amount and use provider idempotency; an uncertain outcome remains held for reconciliation. Do not create a new request to retry the same uncertain refund.

A Stripe dispute must match that verified deposit. Prepare a packet with the response note, download and review its retained PDF, then explicitly authorize its SHA-256, dispute, amount and provider deadline before submitting. Owner, admin and billing users alone can prepare, authorize and submit; agents cannot. The PDF states the acceptance method from the record: mailbox-code verification or an owner-attested upload, without upgrading the latter to a verified signature. It names unavailable certificate, analytics and payment-authorization artifacts and every retained attachment whose contents it omits. Private costing is excluded. Preparation makes no provider call; authorization is audited separately and sends nothing. Submission claims the attempt before reading Stripe, uploads exactly the retained bytes with provider idempotency, and explicitly submits the evidence. A stale amount/deadline/hash or absent authorization refuses locally; a provider change discovered in preflight holds the attempt before upload. Submitted requires Stripe under review; won/lost comes from Stripe. Timeouts remain held for reconciliation: replay, a new request ID or refresh cannot send a second attempt. Refresh can confirm under review without resubmission. Exact packet, authorization, uploaded PDF and hash survive archives without credentials or outbound restore calls. Accounting credits and the full target evidence pack remain unfinished.


Package percentage discounts apply to the base and selected optional items, using one cent-exact server calculation. Base price inputs remain before-discount amounts. Clients and PDFs see the discount and net total; existing sent prices never change. Line/group/fixed discounts and expiry are not yet available.

Approval total thresholds use gross value before discounts and maximum offered optional quantities. Rules can also require review above a discount percentage, below offered margins, for current payment terms (deposit percentage/exact standard terms), edited legal terms, or source templates. Missing costs require review; optional margins use conservative cent rounding. Template scope follows drafts and duplicates. Every edit creates a new revision and invalidates prior approvals. Future discount and payment-term fields must extend these same evaluations and journeys before they ship.


Recorded revenue is available from the proposal screen's Report views link (`/app?view=recorded-revenue`). It uses accepted snapshot values and explicitly recorded receipts/refunds, keeps currencies separate, and distinguishes confirmed refunds from uncertain holds. An exported deposit CSV is labelled as an export, never a provider-issued or paid invoice. Owner/admin/billing see all, managers/viewers see their teams, and sales sees their own proposals. Content editors and agent keys cannot load this view. Owner/admin export its exact filtered CSV and schedule the same view with the ordinary report controls; the saved filter retains `view=recorded-revenue`. Provider accounting reconciliation, overdue balances, recurring revenue and period reporting are unavailable.

Native ownership handoff uses the existing fresh-email-proof account routes: the current owner grants the active successor native `owner` authority through `/auth/operator/role`; after signing in with fresh proof, the successor changes the previous owner's native role. These explicit operations retain all proposals, invalidate the changed person's sessions, and invalidate agent credentials bound to a person who no longer holds native owner authority. Platter does not implement workspace deletion.

Client email replies are off by default for each invitation. With the existing Resend receiving configuration (QUESTION_REPLY_DOMAIN and MAIL_WEBHOOK_KEY), register signed email.received events at /api/platter/client-mail-replies as well as the separate owner-question reply endpoint. A sender may check the invitation composer’s explicit audited consent. Platter appends the client disclosure and supplies a private Reply-To address to Gmail, Microsoft or the installation sender. The exact invited address may submit one plain-text reply while the invitation remains current. A fresh invitation or withdrawal ends it. Signatures are checked before the provider message is fetched; mismatched senders, attachments, oversized bodies, capability-bearing bodies and replays are refused. The text appears only with the proposal’s existing native-member View scope (agent keys receive no reply text); nothing is sent automatically. Archives retain reply text and its proposal/revision/client attribution, never reply capabilities. This conservative reply policy awaits CT approval; ongoing mailbox threads and reminder execution remain unfinished.
