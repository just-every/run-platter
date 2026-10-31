# Descriptive action facts

MCP draft tools return `_meta.classification` with `classes: ["standard"]`,
`basis`, the exact saved proposal id, revision and version, and item counts.
The tools cover structured preparation, built-in and saved template starts,
and revisions, including authored scope and terms. Supplied class labels and
instructions in authored text cannot override these facts.

Native JSON responses from `/api/platter/command` and the legacy drafting
endpoint `/api/platter/agent/command` expose the same metadata as JSON in the
`x-platter-action-facts` response header, preserving the native response body.
This covers preparation, template starts, duplication, draft revision and
negotiation, editor autosave, document, quantity and variable edits, revision
restore, and internal cost edits. Priced counts describe the resulting saved
revision: each priced table line counts once, a flat package counts once,
and each offered optional item counts once. Quantity and selection do not
multiply those counts. Template facts retain the version originally copied.
Amounts, private cost keys and authored text are absent from the metadata.

Native scheduling, completion and dismissal of an internal sales follow-up
report one affected proposal and one follow-up item. Their revision and version
refer to the proposal checked by the successful write transaction. They do not
send mail. Follow-up notification, approvals, sending and other unclassified
commands do not receive a standard classification header. Failed commands
return no classification header.

`companyPolicy` separately reports `evaluated: false` and `decision: null`.
Descriptive classification is not a policy decision or permission grant.
Existing authorization and version guards still apply. Machine keys can prepare
and revise drafts; they cannot autosave the human editor, change private costs,
manage follow-ups, approve, send, sign or refund. Revoked keys and restored
credentials confer no execution authority.

Broader class computation, the complete tool registry, company-policy adoption
and execution, and Base policy-matrix conformance remain unfinished. No
all-autonomous or held-policy execution is claimed by this metadata.
