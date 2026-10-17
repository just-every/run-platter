# Getting started

Run Platter on your own computer first. You need Git, an internet connection for the first install, and 15 GiB of free space. RER selects the project's pinned Node version and installs its dependencies.

## Launch Platter

One line installs the RER launcher, clones the source and launches Platter:

```sh
npx -y @runeditrun/rer dev just-every/run-platter
```

To start it again later, run `cd run-platter && rer dev`.

The first launch can take a few minutes. RER prepares local storage and a local owner account. Open the private **RER_OPEN** link printed in your terminal on this computer. Keep that link private: it signs you in as the owner. If a launch is interrupted, run `rer dev` again to resume.

Complete the first-run setup screen, then open **Proposals**. In your installation this is the `/app` page. To stop the managed app, run:

```sh
rer dev --stop
```

## Add a client

1. Open **Clients** in your installed app.
2. Enter **Client name** and **Client email**.
3. Choose **Add client**.
4. Return to **Proposals** and prepare your first offer using the [proposal guide](PROPOSALS.md).

Have an existing client list? Use the [CSV move-in guide](MOVE-IN.md) to review it before applying it.

## Use your real owner mailbox

For a real owner's local installation, prepare the owner before the first launch, in place of the one line:

```sh
npx -y @runeditrun/rer setup just-every/run-platter --owner-email you@example.com
cd run-platter
rer dev
```

Use your own mailbox in place of the example. You can also use `rer setup` and enter it at the prompt. Local development captures proposal mail inside Platter; it does not send external email. The [proposal guide](PROPOSALS.md) explains how to try client verification locally.

## Host it on your own account

A local launch is enough to try the complete proposal flow. Real hosting needs your own Cloudflare account, D1 database and a configured, verified mail sender. Follow the [README deployment instructions](../README.md#deploy-to-your-account) and [operations reference](../OPERATIONS.md). Test delivery with your own mailbox before inviting clients.

Keep regular [backups](BACKUP-RESTORE.md) of the business records you want to preserve.
