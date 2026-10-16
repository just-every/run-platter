# Agent access

Give an agent access to proposal context and draft preparation. You remain responsible for approving the exact offer, sending it and exporting its invoice.

## Create a key

1. Sign in to your installed Platter app as the owner.
2. Open **Agent access**.
3. Enter a **Key label**, such as Proposal assistant, and choose **Create key**.
4. Copy the once-shown key into your agent client's private configuration.

The key is shown only once, expires after 30 days and can be revoked immediately with **Revoke key**. Use a separate labelled key for each agent you want to manage independently. Keep keys out of source files, shared documents and shell history.

## Connect your agent

Use your installed app's origin, with an `Authorization: Bearer` header containing the key. Send command bodies with `Content-Type: application/json`. These are HTTP endpoints on your installation, not the public run site:

```text
GET /api/platter/agent/context
POST /api/platter/agent/command
```

The context response provides the available proposal and client context. Send a JSON command body to prepare a draft, choosing a real `clientId` from that context:

```json
{
  "name": "proposal.prepare",
  "input": {
    "clientId": "...",
    "title": "Brand photography",
    "scope": "Studio shoot and edited photographs",
    "optionOne": "Essentials",
    "priceOne": "2400.00",
    "optionTwo": "Campaign",
    "priceTwo": "4200.00",
    "depositPercent": "25"
  }
}
```

To revise a draft, use `proposal.revise` with the same fields plus its `id` and current `version` from context. A revision clears prior approval. Sent and accepted offers are frozen.

## Review before sending

Open the prepared proposal in your browser and check its client, scope, prices and deposit. Follow [approve and send](PROPOSALS.md#approve-the-revision) to commit the offer.

Agent keys cannot approve or send proposals, manage access, erase clients, import clients, or export invoices. Browser members can also prepare drafts; owner actions retain the approval author, revision and time.

Keys are bound to the active owner and current account version. They do not travel in [backups](BACKUP-RESTORE.md). After a restore, create new keys for agents that still need access.
