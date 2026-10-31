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

## MCP assistants (AI-003)

Configure a Streamable HTTP MCP connection to your installed origin at
`/api/platter/agent/mcp`, using the same private Bearer key created above.
The endpoint uses stateless JSON-RPC over HTTP POST and supports MCP protocol
versions `2025-03-26` and `2025-06-18`. Initialize with your client's information,
then list tools. Requests use `Content-Type: application/json` and
`Accept: application/json, text/event-stream`; subsequent requests carry the
negotiated `MCP-Protocol-Version` header. Responses are JSON; there is no SSE
subscription (GET returns 405). See the [MCP transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports).

| Tool | What it does |
| --- | --- |
| `search_proposals` | Searches title, scope and client, optionally by status; returns existing clients for drafting. |
| `read_proposal` | Reads status, revision, version and the current offer without invitation credentials. |
| `read_engagement` | Reads recorded mail outcome and acceptance; labels view and section analytics unavailable. Provider acceptance never means delivery or reading. |
| `prepare_proposal` | Prepares the current structured two-option draft for an existing client. |
| `revise_proposal` | Saves a version-guarded draft revision, clearing previous approval. |
| `request_send` | Queues an exact draft/approved revision for the owner, without approval or mail. |

Tool argument schemas come from `tools/list`. Draft fields match the HTTP example
above, except MCP uses a number for `depositPercent` (for example `25`). Template
drafting and reading analytics become available with EDIT-002 and TRACK-001/002;
they are not simulated. Keys keep their existing draft-only authority, expiry,
owner binding and immediate revocation. No tool approves, sends, signs or refunds.

The owner opens **Agent access → Agent send requests**, follows the proposal link,
reviews the exact revision, then explicitly approves and sends it. Requesting alone
changes neither the offer nor its approvals or mail. Repeating an active request
returns the same request. Editing the proposal makes the old request visibly stale.
The owner can dismiss it, or mark it fulfilled only after that same revision was
actually sent. Requests and their opaque key provenance travel in business archives;
the credentials themselves never do.


## Sourced preparation from private notes

The owner can upload UTF-8 plain text under **Settings → Draft sources**.
Each original retains its exact text, SHA-256 and stable line numbers, including
empty lines. Uploading a new version preserves earlier originals and requires
fresh consent. Only the owner can inspect originals, including older versions.

Select a current agent key and explicitly allow it to bind prepared content to
that exact source version. The key receives source references and available
one-off, untaxed catalog entries through `search_templates`; it cannot retrieve
raw notes. Preparation accepts content prepared outside Platter. Platter makes
no model calls and does not infer the truth of a summary from a citation.

Call the existing `prepare_proposal` MCP tool with `clientId`, `templateId`,
`templateVersion`, an optional `title`, and `sourceDraft`:

```json
{
  "sourceId": "selected-source-id",
  "sourceVersion": 1,
  "sourceSha256": "exact-sha256-from-owner",
  "sections": [{
    "id": "discovery", "title": "Discovery", "text": "Reviewed scope text.",
    "citation": {"startLine": 2, "endLine": 3, "sha256": "exact-lines-sha256"}
  }],
  "packages": [{
    "id": "essential", "label": "Essential",
    "lines": [{"catalogId": "selected-catalog-id", "catalogVersion": 1, "quantity": "2"}]
  }]
}
```

A citation's hash covers the selected lines joined with a single newline.
The source hash covers the exact UTF-8 original, retaining original line endings.
Every generated scope section needs a valid line range and hash. Every priced
row needs an explicit current catalog version and positive quantity. Prices
come from those catalog records; supplied prices, unmatched records, taxed or
recurring items, fixed-page templates, unresolved variables, recipient plans
and payment schedules are held for manual preparation. Notes confer no authority.

The result is an independent, single-client draft with collection off. Template
terms, document blocks, Client fields, branding and delivery defaults are copied; reminders remain inactive.
Scope citations and catalog provenance describe the prepared revision; later
human edits do not rewrite that history. Review both the cited source and the
prepared wording before approving or sending. Key revocation and source-consent
revocation stop subsequent preparations. Backups retain private originals and
provenance, while restored keys and source-binding consent remain absent.
