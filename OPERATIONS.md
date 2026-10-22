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

The Team screen assigns product roles, team membership and collaborator access. Delegated invitations pin the inviter’s current authority and apply the chosen role/teams only after native mailbox verification. Owner/admin can reissue an unaccepted invitation; old links are revoked. Changes to the inviter’s role or teams invalidate pending grants. Pending grants and all authentication capabilities are excluded from archives.

Owner/admin control approval settings and workspace defaults. New drafts copy reminder/payment defaults and actual expiry settings; reminder execution and payment collection remain unavailable. Shared templates and library folders enforce their current team audience on both reads and writes. Locked native sections require an explicit owner/admin/team-manager proposal unlock; template lock changes require a template-editing role.

Catalog prices are copied into drafts. Price changes do not change existing drafts or sent offers. Internal costs belong only to owner/admin/manager/billing views and the separately authorized internal PDF. Unselected optional items stay outside package totals; accepted totals use the client’s exact frozen quantities. The mailbox-verified GET `/p/<invitation>/data.json` route exposes only public content, pricing and acceptance fields, never private operator state. Revoked invitations return 410.

Workspace Stripe/QuickBooks connections require owner/admin rights. Mailbox connections are bound to the member and currently require an address matching their sign-in address; own-mailbox sending is not yet available. Tokens stay encrypted locally and are excluded from exports. Restored connection metadata requires reconnection.

Owner/admin/billing can record received check, wire and ACH credit payments, link an already successful Stripe deposit and explicitly refund it. Linking requires the connected account, exact accepted deposit amount/currency and Stripe charge metadata `platter_proposal_id` / `platter_revision`. Refund requests reserve their amount and use provider idempotency; an uncertain outcome remains held for reconciliation. Do not create a new request to retry the same uncertain refund.

A Stripe dispute must match that verified deposit. Responses require explicit consent and a current provider deadline. The acceptance-evidence PDF identifies unavailable certificate, attachment, analytics and checkout-authorization artifacts. It never fabricates them or includes private costing. The exact uploaded PDF and its SHA-256 are retained through archives. Replaying the same submission returns its stored result without another Stripe call; uncertain outcomes require provider reconciliation. Accounting credits and complete dispute evidence remain unfinished.
