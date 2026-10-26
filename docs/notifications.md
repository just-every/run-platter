# Internal notifications

Notifications use the existing signed-in command endpoint at `/api/platter/command`. Each request has a `name` and an `input` object. These commands do not grant a new session or create a client invitation. Settings screens and Nook are still pending.

- `provider.connect` accepts the existing Slack connection or the `teams` provider, which verifies the connected Microsoft Graph user. Tokens stay encrypted and never enter notification history or archives.
- `notification.route` requires an owner or admin, `consent: true`, an `event` of `approval`, `signed` or `followup`, a `provider` of `slack` or `teams`, a `kind` of `channel` or `direct`, and the provider `destination` identifier. Direct routes also name an active `operatorId`. Slack verifies that user's email and workspace. Teams currently accepts only a verified one-to-one chat containing the connected user and the named member. Slack channels must be active and joined. Approval routes are always direct.
- `notification.route.remove` takes the route `id` and revokes its outbound consent. Disconnecting or reconnecting a provider invalidates existing routes; create a fresh consented route after connecting again.
- `notification.request` takes a proposal `id`, current `version`, `consent: true` and optional `reminderDays` from 1 to 30 (default 1). It notifies only active approvers who can act now under the current rule plan and live proposal scope. Repeating the request does not resend it. Request email and chat include the exact revision preview and the signed-in proposal decision page. Sequential next steps require another explicit request.
- `notification.requests` takes a proposal `id` and returns its request history, including approver, requester, due time and reminder time, under existing proposal visibility.
- `notification.decide` takes `requestId`, the current proposal `version`, `decision` (`approved` or `rejected`) and a required `note`. Only the named, signed-in approver can decide, and the revision, plan and live scope must still match. Links never approve on GET.
- `notification.defaults` requires an owner or admin and the current settings `version`, `enabled`, `leadDays`, `renewalEnabled` and `renewalDays`. Sender expiry defaults start enabled at 3 days; stored renewal defaults start enabled at 30 days. Renewal execution is not implemented. This does not change signer expiry warnings.
- `notification.expiry` takes the proposal `id`, current `version`, `consent: true`, and optional `enabled` and `leadDays`. Omitted settings copy current workspace defaults. It explicitly activates notices to the recorded active sales owner; it does not activate watchers or renewals. A notice opens a dated follow-up without replacing an existing open manual follow-up. Changed expiry dates move unclaimed notices. Accepted, withdrawn, declined and expired offers receive no sender expiry notice.

The existing scheduled Worker processes notifications. Channel events contain generic event text and a session-protected proposal link; approval details go only to a verified direct recipient. Pending deliveries are claimed before contacting the network. Lost receipts remain uncertain and require reconciliation; the scheduler never blindly retries them. Development captures notification rows locally, and demo outbound calls use the existing demo guard.

Archives preserve requests, settings, route metadata and completed sender notice facts. They exclude provider secrets, queued notification bodies and all activation authority. Restoring history never sends notifications. Historical approval requests are retained for custody; they do not automatically reactivate.

The explicit-consent default and limited channel disclosure await ct approval. The contract remains partial. Future Nook, mobile push, watcher, template and renewal work must extend these same public-door proofs before claiming completion.

## Internal collaboration

Open a proposal and use **Internal collaboration** to comment on its scope, pricing table, terms or any document block. Choose **Mention colleague** to name an active member who can view that proposal. Check the notice consent box to send a generic email and notices through configured chat routes. A named member can open the link under their existing session and choose **Resolve thread**. Members with proposal View access can comment and resolve; this grants no proposal editing, sending or approval authority.

Choose **Assign a section**, its block, assignee and calendar due date, then explicitly authorize the notices. Assignment and comment history retain their block title, author, revision and time. Resolution preserves the thread. Internal threads never enter client pages, client API projections or proposal PDFs. They are not copied into proposal templates or duplicated proposals.

An owner or admin can explicitly authorize an existing verified notification route for collaboration in **Settings**, under **Internal collaboration notices**. First create that route through the documented `notification.route` command. Direct notices match the named recipient; channel notices contain only generic text and a session-protected link. Revoking the original route with `notification.route.remove` or disconnecting its provider stops its collaboration notices too.

The command endpoint also accepts:

- `collaboration.comment`: proposal `id`, current `version`, `blockId` (`scope`, `pricing`, `terms`, or `block:` followed by a current document block id), `text`, optional `recipientId`, and explicit `consent: true` when mentioning a member.
- `collaboration.assign`: proposal `id`, current `version`, `blockId`, `recipientId`, a valid `dueDate` in YYYY-MM-DD form and `consent: true`.
- `collaboration.resolve`: proposal `id`, current `version`, `threadId` and current `threadVersion`.
- `collaboration.route`: an existing verified `routeId` and `consent: true`; owner and admins only.

These commands use existing sessions, live proposal scopes and transaction-time authority. Delivery rechecks current revision, both members and route consent before provider requests. Lost receipts are held without automatic retry. Archives preserve internal threads and event history but exclude queued notices and activation authority; a restore never sends them.
