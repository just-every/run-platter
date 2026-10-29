# Agent access

Platter's company-agent door supports finding proposals and templates, preparing priced drafts, revising them, reading status and requesting a person to send an exact revision. It uses the same native proposal rights as its sponsor. It does not send, approve, sign, refund or change access.

Open **Agent access** to create an owner-bound local preparation key. Save the once-shown key privately. Keys expire after 30 days, require the owner's current native account version and stop immediately when revoked. They never travel in backups. A REST integration key cannot enter this preparation door.

Open **Company policy, Pause and agent audit** (`/agents`) to choose a complete local policy on an independent installation. Until policy is answered, no agent tool runs. A Business-linked installation receives signed company policy and owner/team identities; token email alone never selects an account. The Business subject must map to a current, active native person and its current email. A seed promotion does not grant a Business editor role.

## Connect

Use the installation origin's `/mcp`. The previous `/api/platter/agent/mcp` address is an alias of that same door. Keep Bearer credentials in your client's private configuration, never in URL queries.

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

The older HTTP preparation routes also enter the same shared pipeline. `POST /api/platter/agent/command` accepts `proposal.prepare` or `proposal.revise` and requires an `Idempotency-Key` header. `GET /api/platter/agent/context` returns a safe visible-state snapshot. Use MCP for client/template search and current schemas.

## Limits

The broader target registry in CONTRACT.md remains partial. External sending, payments, signatures, grants, provider connections, automation and the complete proposal-coordinator week are not exposed through this preparation registry. Optional resource, event, prompt and subscription families are undeclared. Multi-sponsor, inactive/excluded sponsor fixtures, mail edges, resource refresh, timed or queued execution, dual-host and native owner administration are not claimed. No provider is reachable from a declared tool. Native signing and provider callbacks retain their own credentials and human consent.
