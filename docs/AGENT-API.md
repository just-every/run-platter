# Agent discovery and activity

The existing agent command endpoint is `/api/platter/agent/command`.
Owner-issued agent keys remain unable to approve, send, sign or refund.
Scoped REST keys use the separate reference at `/api/platter/reference` and
cannot use the agent endpoint.

The owner uses the authenticated command endpoint `/api/platter/command`:

- `agent.pause` takes `id` and a `paused` boolean. Paused credentials return 423
  on their next request. In-flight actions retain their receipts.
- `agent.discovery-consent` takes `id` and an `enabled` boolean. It explicitly
  authorizes this key to retain discovery sources. Disabling consent stops new
  discovery drafts; it does not erase existing business records.
- `discovery.read` takes a proposal `id` and `revision`. Only the owner can read
  the retained source text, citations, unmatched requests and catalog snapshot.

An authorized agent calls `proposal.discovery` with `clientId`, `title`,
`depositPercent`, `sources` and `packages`. Each source has a unique `id`, a
`kind` of `transcript`, `email`, `crm-note` or `winning-proposal`, and `text`.
Include a transcript and an email. Only lines beginning with `Requirement:`,
`Assumption:` or `Exclusion:` enter the draft. Other context stays in the
owner-only source record. Every copied line cites its source identifier and
one-based line number. Review these copied lines before approving any send.

Choose two or three packages, each with `id`, `label` and a distinct list of
`catalogIds`. Every chosen item must match a requirement's literal catalog name
or SKU. Each price comes from the current catalog, with one unit per selected
item; this door does not infer quantities. Unmatched requirements are visibly
flagged in the draft and returned in `unmatched`. The server atomically saves
the draft and source record only while consent and catalog versions still hold.
The original catalog snapshot stays exact after later catalog edits.

The owner reads `/api/platter/agents/ledger`, optionally filtered by `key`.
Successful agent context reads, draft commands, MCP tools and scoped REST
requests record digests, record identifiers, action and time. Draft receipts
link to human approvals of that exact revision. Raw request bodies and tokens
are omitted. External model identity is unknown, represented by null; model
spend is not yet measured or limited. Credentials and pause controls stay local
when archiving; source records and activity history travel with business data.

This is a source-validation door for external agents. It does not transcribe
recordings, fetch provider transcripts, choose packages, retrieve CRM history
or run a language model. Those capabilities remain gaps in AGENT-001 and
AGENT-009.
