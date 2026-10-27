# Backup and restore

RER archives preserve Platter's business records so you can restore them into a fresh installation. Stop the running app before exporting or importing so nothing writes during the transfer.

## Make a backup

From your Platter checkout, stop the app and export to a private file outside the checkout:

```sh
rer dev --stop
rer export --output ../platter-backup.rer
```

If you ran preview, stop it with `rer preview --stop` too. Keep the archive in a private, backed-up location outside served folders. It contains client and agreement data. Choose a new filename when keeping another dated copy.

## What travels

Archives preserve owner identities, clients, proposals, revisions, recorded approvals, immutable acceptances, retained invoice CSVs, import journals and erasure history. Workspace and template delivery defaults, independent inheritance choices, shared reminder-message templates and choices, proposal snapshots and link-free delivery-settings/reminder history also travel. Scheduled-reminder authorizations and invitation transport do not; after restoring, a sender must explicitly authorize each schedule again with the recipient’s IANA time zone.

Sign-in sessions, agent keys, client invitations, verification sessions, outbox messages and private provider settings do not travel. Set up private configuration again after restoring. Sent offers need fresh client invitations, and agents need new keys.

## Restore into a fresh clone

Keep the original installation and its archive until you have checked the restored copy. Clone Platter into a new folder, then run these commands from that new checkout before launching it:

```sh
rer import --input ../platter-backup.rer --yes
rer setup --owner-email you@example.com
rer dev
```

Adjust the archive path to its actual location. Use the same owner email stored in the backup. A review installation may have used the `owner@FOLDER.test` address printed by its original `rer dev`; retain that original address even if the new checkout has a different folder name. This preserves the archived owner and approval authors.

Import requires empty local D1 and a valid archive. It refuses a nonempty destination or a damaged archive. Do not start `rer dev` in the fresh clone before importing: launch prepares local data.

Open the restored installation's private **RER_OPEN** link, finish setup as needed and inspect your clients, proposals, approvals, accepted agreements and retained invoices. Configure the private hosting and mail settings again before using a deployment.

## Restore older data after an erasure

When restoring an older backup after a client erasure, always supply a newer backup containing the erasure journal. The pinned runner requires the journal to be a private file inside the destination checkout; `--journal ../latest.rer` is refused before the journal is read.

Keep your original backups outside the checkout. From the fresh, empty destination, make a temporary private copy of the newer backup in the ignored recovery directory:

```sh
mkdir -p .rer/recovery
chmod 700 .rer/recovery
cp ../latest.rer .rer/recovery/latest.rer
chmod 600 .rer/recovery/latest.rer
rer import --input ../old.rer --journal .rer/recovery/latest.rer --yes
```

Adjust the two source paths to your backups' actual locations. If the older backup contains erased data, Platter refuses the whole restore and leaves the destination empty. Do not retry that older backup without its journal. Restore the newer backup instead:

```sh
rer import --input ../latest.rer --yes
rm .rer/recovery/latest.rer
```

Remove the temporary journal only after the restore finishes. Keep the original newer backup with the erasure history whenever you retain older backups, then continue with the owner setup and access checks above. Accepted agreements and invoice amounts remain retained.

## Reconnect access

For each restored sent proposal, open it as the owner and choose **Send fresh client link**. This issues new access while keeping its frozen terms. Create replacement credentials in **Agent access** for agents that still need them. See [proposals](PROPOSALS.md) and [agent access](AGENT-ACCESS.md).

These instructions cover local archives. See the [local command reference](../RUN-LOCALLY.md) for transfer flags and limitations, and the [README](../README.md) for Platter-specific ownership and deployment instructions.
