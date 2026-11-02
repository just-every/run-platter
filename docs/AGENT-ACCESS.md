# Agent access

The door runtime and conformance CLI are pinned to released rer 0.2.93 (Base `2f77cdb6d8dfaa82903c2839600e23b76631a537`).

Platter's company-agent door supports finding proposals and templates, preparing priced drafts, revising them, reading status and requesting a person to send an exact revision. It uses the same native proposal rights as its sponsor. It does not send, approve, sign, refund or change access.

Open **Agent access** to create an owner-bound local preparation key. Save the once-shown key privately. Keys expire after 30 days, require the owner's current native account version and stop immediately when revoked. They never travel in backups. A REST integration key cannot enter this preparation door.

Open **Company policy, Pause and agent audit** (`/agents`) to choose a complete local policy on an independent installation. Until policy is answered, no agent tool runs. A Business-linked installation receives signed company policy and owner/team identities; token email alone never selects an account. The Business subject must map to a current, active native person and its current email. A seed promotion does not grant a Business editor role.

## Connect

Use the installation origin's `/mcp`. The previous `/api/platter/agent/mcp` address retains the compatibility registry, validated draft classification and preparation-only refusals. Company-policy clients use `/mcp`; the two interfaces do not grant sending, signing or payment authority. Keep Bearer credentials in your client's private configuration, never in URL queries.

MCP supports `2026-07-28` and `2025-11-25`. Initialize, discover the server and list the current tool schemas. Use `Content-Type: application/json`, `Accept: application/json, text/event-stream` and the negotiated `MCP-Protocol-Version`. The newer era also requires its protocol metadata and matching `Mcp-Method` and `Mcp-Name` headers. March and June 2025 clients must update. Resources, prompts, events and subscriptions are not declared and return typed capability refusals.

| Tool | Job | Native clauses |
| --- | --- | --- |
| `platter.proposals.search` | Search visible proposals and existing clients | EDIT-016, AI-003 |
| `platter.proposals.read` | Read the current offer, status, version and attribution without invitation authority | HTTP-001, AI-003 |
| `platter.proposals.prepare` | Prepare a priced draft for an existing client | AI-003, AGENT-001 |
| `platter.proposals.revise` | Save a version-bound draft revision and clear earlier approval | AI-003, PROP-001 |
| `platter.templates.search` | Find visible native templates | EDIT-002, AI-003 |
| `platter.templates.start` | Prepare an independent draft from a versioned template | EDIT-002, AI-003 |
| `platter.engagement.read` | Read recorded mail and acceptance status; private view detail remains unavailable | AI-003 |
| `platter.send_requests.create` | Retain an exact revision for the person's review without sending | AI-003 |
| `platter.workspace.snapshot` | Inspect visible proposal and request state | HTTP-001, AI-003 |

These tools compute **standard** from internal preparation and read effects. Every mutation requires a public `idempotency_key`; retry the same arguments with the same key to obtain its receipt. Changed arguments conflict. Revision tools also accept `expected_revision` and still enforce the native version at the transaction. Imported proposal text is untrusted and cannot choose policy or classes. Native records show the agent as preparer for its named sponsor; the person approving or sending remains the decider.

Under an autonomous policy, permitted preparation runs immediately. Under a held standard policy it runs with a retained review. Company approval is independent of Platter's native offer approval. No model is called and no spend is registered by these tools.

## Review and send

Open **Agent access → Agent send requests**. Follow the proposal link, review the exact revision and use the native approval and sending controls. Repeated active requests retain one row; editing makes an old request stale. A person can dismiss it, or mark it fulfilled after the same revision is sent. A request is business history, never a queued agent instruction or permission to send later.

The older HTTP preparation routes retain their existing owner-bound preparation boundary. `POST /api/platter/agent/command` accepts only `proposal.prepare` or `proposal.revise`; `GET /api/platter/agent/context` returns its existing visible-state snapshot. The compatibility MCP endpoint retains its registry resource and validated draft classifications. These legacy interfaces do not claim company-policy conformance. Use `/mcp` for company-policy preparation, client/template search and current schemas.

## Limits

The broader target registry in CONTRACT.md remains partial. External sending, payments, signatures, grants, provider connections, automation and the complete proposal-coordinator week are not exposed through this preparation registry. Optional resource, event, prompt and subscription families are undeclared. Multi-sponsor, inactive/excluded sponsor fixtures, mail edges, resource refresh, timed or queued execution, dual-host and native owner administration are not claimed. No provider is reachable from a declared tool. Native signing and provider callbacks retain their own credentials and human consent.

## Existing compatibility interface

The following existing interface remains supported at its original HTTP and MCP paths. Its classification metadata is separate from the company-policy door described above.


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

## Computed draft facts

Successful MCP `prepare_proposal`, `prepare_from_template` and `revise_proposal`
calls retain the native draft result in the text content and add
`_meta.classification`. Its `classes` contains `standard`; `proposal` identifies
the exact saved revision and resulting version. A template-derived draft also
names the source template ID and version used. Counts come from the saved native
revision after the ordinary input validation and version checks.

The `facts` object counts one `affectedProposalCount`, each priced table line
(or one row for a flat package) in `pricedRowCount`, and every offered optional
item in `optionalItemCount`. `itemCount` sums the latter two counts across all
offered packages. Quantities and client selection do not multiply or remove
these records. Caller-supplied class arguments are refused; class labels or
instructions inside proposal content cannot change the computed facts.

`_meta.companyPolicy` separately reports `evaluated: false` and `decision: null`.
The classification describes the prepared revision and grants no approval,
sending, signing or refund authority. Other action classes and company-policy
execution remain unfinished.
