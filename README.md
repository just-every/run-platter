# Platter

Proposals and quotes for a small Australian agency or studio. Prepare two priced options, approve the exact offer, let a client accept one after email verification, and keep the agreement and a once-only deposit invoice export.

New offers use **USD**. Existing first-release offers and agreements retain their **GST-free AUD** amounts and invoice files without conversion. USD proposals include Stripe deposit collection after signing; current wallet and bank-verification qualification gaps are recorded under PAY-001. Platter does not calculate sales tax. [ACCEPTANCE.md](ACCEPTANCE.md) names the supported jobs.

## Run from a fresh clone

Install Git, then follow the same two steps shown on the site's **Run** page:

```sh
curl -fsSL https://runeditrun.com/install.sh | sh
```

If the installer prints a PATH activation command, run it in this terminal before step two. It makes `rer` available now and in new terminals.

```sh
rer dev just-every/run-platter
```

Already have Node 22 or later? `npx -y @runeditrun/rer dev just-every/run-platter` performs both steps. You do not need to install pnpm yourself.

To start it again later, run `cd run-platter && rer dev` from the folder where you first launched it. If installation or launch is interrupted, use that same command to resume; if you are already inside `run-platter`, run `rer dev`. Follow any repair command printed by the launcher before retrying.

RER installs the pinned dependencies, selects Node 22.20.0, creates local D1, and opens a local owner account. The first run takes a few minutes and needs 15 GiB free. Open the private `RER_OPEN` URL printed in your terminal. Keep that link private. Complete the short setup screen, then open **Proposals** at `/app`.

For a real owner's local install, install rer as above, then run `rer setup just-every/run-platter --owner-email you@example.com` in place of the start command, then `cd run-platter && rer dev`. Review installs use a local owner automatically. To stop the managed server, run `rer dev --stop`.

The run site is live at https://run-platter.com, with the run page at https://run-platter.com/run. Locally, the address printed as `RER_SITE` has the same marketing homepage, `/run` and [the docs](docs/README.md). The installed app’s `/` is the Lobby.

## Send and accept an offer

1. Open **Clients**, add your client's name and email, then return to **Proposals**.
2. Prepare a proposal with its scope, two option labels and prices, and the deposit percentage. Open the proposal from the list.
3. Review both prices and scope, click **Approve this revision**, then **Send approved proposal**. The owner approves the exact revision; saving a draft revision clears prior approval. Sent and accepted offers are frozen.
4. Open **Open client proposal**, preferably in another browser session. Request the email code. Locally, no external email is sent: return to the owner's proposal and read **Local development mail**, then enter the six-digit code on the client page. On a configured deployment the code goes to the client's mailbox.
5. Choose an option, enter the client's full name, confirm acceptance, and click **Accept proposal**. The acceptance shows the agreed total and deposit.
6. Return to the owner's proposal and click **Export invoice CSV**, then **Download deposit invoice CSV**. Repeating export returns the same invoice. Import it into your books once; Platter cannot prevent you importing a downloaded file twice. The CSV uses Xero sales-invoice columns and account code 200. Retained AUD invoices keep GST Free Income; new USD invoices use No Tax because sales tax is not calculated. Confirm these fit your books before importing.

An expired or lost client verification can be replaced with **Send fresh client link** on a sent proposal. It revokes the earlier link and session without changing the offer. Client codes expire after ten minutes, permit five attempts, and have a one-minute resend interval. The invitation itself remains valid until replaced or accepted; treat it as private.

## Prepare with an agent

In **Agent access**, create a key and store the once-shown value securely. It expires after 30 days and can be revoked immediately. Agent keys can read proposal context and prepare drafts, never approve, send, erase, import or export. Browser members can prepare drafts; the owner handles commitment and access.

Use the HTTP command door with an `Authorization: Bearer` header. Keep credentials in your client's private configuration, never in source or shell history:

```text
GET  /api/platter/agent/context
POST /api/platter/agent/command
{"name":"proposal.prepare","input":{"clientId":"...","title":"Brand photography","scope":"Studio shoot and edited photographs","optionOne":"Essentials","priceOne":"2400.00","optionTwo":"Campaign","priceTwo":"4200.00","depositPercent":"25"}}
```

`proposal.revise` takes those fields plus `id` and the current `version`. Owner browser actions record the approval author, time and revision. Agent credentials are tied to the active owner and their current account version.

## Move in and preserve data

Open **Import**, paste [fixtures/clients.csv](fixtures/clients.csv), and click **Preview import**. Review the names, emails and conflicts, then **Apply reviewed import**. **View journal** shows retained originals and changes; **Undo import** removes only unchanged clients with no dependent proposals. Larger imports may need **Resume reviewed import** or **Continue undo**. See [Client CSV shape and limits](docs/MOVE-IN.md).

Clients without proposals or import history can be erased in **Clients** by typing their exact name. Accepted business agreements remain retained. Undo an unused import before attempting to erase its records.

Stop the app before an archive operation:

```sh
rer dev --stop
rer export --output ../platter-backup.rer
```

Backups are private files and must stay outside the checkout and served folders. Restore into a fresh clone with empty D1:

```sh
rer import --input ../platter-backup.rer --yes
rer setup --owner-email you@example.com
rer dev
```

Use the same owner email that the backup contains in the setup step above. A review backup may use the `owner@FOLDER.test` address printed by its original `rer dev`; keep that original address when restoring into a differently named checkout. This protects the archived owner and approval authors.

Owner identities, business records, revisions, approvals, acceptances, invoice CSVs and import journals travel. Sign-in sessions, agent keys, client invitations, verification sessions, outbox messages and private provider settings do not. Use **Send fresh client link** for a restored sent proposal. RER refuses a nonempty destination or damaged archive. When restoring an older backup after erasure, supply a newer backup's erasure journal: `rer import --input ../old.rer --journal ../latest.rer --yes`. Such an old restore is refused rather than reviving erased data.

## Deploy to your account

Use your own Cloudflare account, D1 and verified mail sender. A push does not deploy. Keep the generated `proposals/platter` project, `proposals-platter` Worker, and `foundation` D1 identities unchanged.

1. Stop local dev. Supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` privately in the environment. Configure `deploy.json` with your verified `MAIL_FROM` and supported `MAIL_PROVIDER`; its default `auth@example.invalid` must be replaced for real mail. Supply `OWNER_EMAIL`, `SESSION_SECRET`, `SETUP_TOKEN` and `MAIL_API_KEY` through the private environment named by `deploy.json`. Generate fresh random secrets; never commit them.
2. Run `rer deploy --dry-run` to preflight the inputs, build and inspect the plan without uploading. Missing Cloudflare access prints the account inputs and their purposes before building or contacting the provider. With credentials, RER reads target secret bindings but makes no provider writes. Invalid mail configuration also stops before building.
3. Commit your nonsecret configuration, then run `rer deploy`. RER provisions the declared resources on that account, applies all migrations, configures the origin and checks health. [OPERATIONS.md](OPERATIONS.md) covers account permissions and private configuration.
4. Use `rer signin` for the hosted owner's initial entry, then complete setup. Test real mail with your own mailbox before inviting clients. Mail marked **Accepted by provider** means handoff, not delivery. An uncertain provider attempt is retained and is not retried automatically.

The optional product domain is not needed to run or deploy this seed. The run site can be built locally with `rer build --site`. Its homepage links to `/run`; the domain is not registered yet, so use the local commands above. Run-site deployment stays off until its release gate.

## Development

The checkout uses its own pinned `@runeditrun/rer` package and Node 22.20.0. After stopping dev:

```sh
rer verify
```

Verify builds, typechecks, runs eight integration tests through Worker/auth/D1 and archive commands, and checks the hosted build. CI runs runtime, business-flow and archive shards in parallel. Clone/install journeys belong to release tags and the nightly workflow. Build and deploy do not run tests. See [source reuse](docs/SOURCE.md) for the Base starting revision and sibling adaptations. The porcelain theme carries the picked Platter design through the run site, docs, shared setup/sign-in screens and app.
