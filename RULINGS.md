# Platter rulings

### RL-1 — SEND-001 retained decision

- Date: 2026-10-22
- Ruler: ct
- Governs: SEND-001

OAuth authorization with state and PKCE, sealed refresh grants, current provider sending permission, verified Gmail primary/send-as addresses and Microsoft SMTP mail, one-member binding, and sending through the durable outbox now ship. CT ruling (22 October 2026, eaf743e) implemented for the outbound mailbox slice: the connected address may differ from sign-in; provider refusals visibly break the connection and fall back to the installation sender, while uncertain outbound attempts are held without fallback or retry. tests/mail.test.mjs — “SEND-001 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail” proves both providers, negative identity/scope/binding cases, send-time role checks including a demotion during refresh, client-facing From, timeline/audit attribution, revoked-grant fallback and timeout custody. tests/site.test.mjs — “MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths” proves both OAuth forms, sending, attribution, audit and broken/fallback screens at 1440/390. tests/archive.test.mjs — “TEAM-001 / APPROVE-003 / APPROVE-001 public CLI restores scoped roles, teams, collaborators, policy and exact revision decisions, costs and library items” proves sender-attribution custody and exclusion of OAuth attempts/refresh grants with reconnection required and no restore calls. Direct access-token connections remain an interim identity-only door limited to sign-in addresses; they require OAuth reconnection for mailbox sending. CT reply ruling (22 October 2026, 07:25 UTC) implemented: a sending member explicitly consents per invitation (audited); the client sees a notice before replying, and one plain-text reply whose claimed From is the exact invited address is recorded through a private current-invitation capability and signed Resend receiving event, with no attachments or automatic outgoing action. An emailed reply is a record, never an approval, signature or proposal state change. The claimed From and Resend receiving-server SPF/DKIM results are stored and shown; From is never treated as proven client identity, and missing provider results are labelled unavailable rather than inferred from message headers. Auto-Submitted automatic replies, Precedence bulk/list/junk, list mail and out-of-office messages are discarded without a record or notification and do not consume the capability. Replies are capped at one per invitation; reaching that cap creates one durable owner-only in-app notice, atomically with the reply, without outbound mail. Replies inherit the proposal View scope and stay in archives; reply capabilities do not. Agent keys receive no client reply text. The named SEND-001 mail journey proves Gmail and Microsoft client replies, wrong sender/signature/capability-body refusals, replay refusal, fresh-invitation rotation and withdrawal; the named role browser journey shows both replies at 1440/390 and the named TEAM-001 archive journey retains their text without authority. No SEND-001 acceptance point remains unproved for the current native doors. The ct-approved per-invitation reply cap is one; unlimited replies and native Gmail/Microsoft inbox synchronization are not claimed. FOLLOW-001/FOLLOW-006 retain their own reminder-composer, multi-recipient, complete-inheritance and activation/restore-policy gaps; they do not widen mailbox authority. Future email reminder and reply doors inherit SEND-001’s provider-verified one-member binding, current sending permission, attribution, broken-state fallback and uncertain-attempt hold before shipping. The installation receiving route is not native Gmail/Microsoft inbox synchronization. No live provider acceptance or delivery is claimed; these journeys use network-edge fakes. The single-recipient reminder foundation is proved by tests/mail.test.mjs — “SEND-001 / FOLLOW-001 signed-mailbox scheduled reminders honor recipient quiet hours, caps and terminal decisions without retrying uncertain sends”, “FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap”, and “SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh”. These assert Gmail/Microsoft reminders and native answers from the connected address, installed-sender fallback, DST/quiet-hour delay, before-expiry timing, scheduled caps, every current terminal stop, concurrent claims, manual edited text/calendar limits, and no-call refusals after authority changes during refresh. The named role browser journey shows manual reminder records and verified opt-out at 1440/390; the named role CLI archive journey retains link-free settings/history while excluding execution authority and transport. FOLLOW-001/FOLLOW-006 adopted rollout default pending ct (those clauses remain PARTIAL): existing and restored settings do not activate outbound reminders; a current sending person explicitly and auditably consents per proposal, supplies the recipient IANA zone, and can disable the schedule; restores require fresh authorization. No recipient zone is inferred.

### RL-2 — SEND-008 retained decision

- Date: 2026-10-26
- Ruler: ct
- Governs: SEND-008

CT ruling, 26 October 2026: APPROVE WITH RIDERS for the SMS product default; status remains partial. Before any proposal text, reminder, completion notice or identity code, retain explicit recipient assent identifying the recipient and normalized US mobile number, the sending firm, the permitted SMS purposes, the disclosure text or immutable disclosure version shown, the assent time and collection method, and the recipient evidence supporting any sender-recorded entry. Bind the operational consent to the exact proposal revision and invitation without retaining invitation credentials in history. SMS consent does not establish electronic-signature consent, approval or Send authority. A changed revision, rotated invitation or changed recipient requires a fresh exact binding supported by applicable consent; historical consent never grants authority by itself. Require a valid supplied recipient IANA time zone, apply FOLLOW-001 quiet hours using the zone’s rules for the dispatch date, and defer texts due during quiet hours. Missing or invalid consent or zone prevents dispatch. Recheck current invitation validity, proposal state, consent, suppression and live proposal-specific Send authority before sender-controlled dispatch, including deferred dispatch. STOP suppresses all SMS purposes to that number across invitations in the installation, and provider-level suppression is also honored. START, a new invitation and sender edits do not reactivate SMS. Restored records retain history but restore no SMS sending or verification authority and replay no queued transport. Uncertain provider outcomes remain held with no automatic retry; provider acceptance is not delivery. SIGN-006 inherits this policy for identity-code texts. This ruling approves policy only and certifies no implementation, carrier acceptance or legal compliance. Gap: Completion texts, sender controls with desktop and phone proof, installer integration, production sender qualification and safe recipient re-enablement remain. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps; none is certified by local fakes or this ruling. Recipient re-enablement requires a separately proven path with new recorded assent, provider eligibility, an explicit audited suppression change and fresh operational authority; START alone is insufficient. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders.

### RL-3 — SIGN-006 retained decision

- Date: 2026-10-26
- Ruler: ct
- Governs: SIGN-006

CT ruling, 26 October 2026: APPROVE WITH RIDERS for the inherited SMS product default; status remains partial. SMS identity codes inherit SEND-008’s recorded recipient consent and exact revision and invitation binding, supplied recipient IANA zone and quiet hours, live sender authority, number-wide STOP, refusal of START reactivation, no restored authority and no automatic retry after uncertainty. Recipient code requests additionally require a current invitation and a still-valid authorized SMS configuration; they confer no staff Send permission. Consent to receive a code is distinct from consent to electronic records and intent to sign. STOP blocks identity-code texts as well as other SMS purposes. Missing consent, an invalid zone, suppression or uncertainty does not silently select another identity method or weaken an SMS requirement. Mailbox code remains the default when no identity choice was made, and the certificate records only the method actually used. This ruling approves policy only and certifies no signer identity, implementation or legal compliance. Gap: Government ID verification through Stripe Identity or Persona, link-only signing with forwarded-device and network escalation, multiple signer roles, sender method-selection controls and safe recipient SMS re-enablement remain. The full SIGN-001 code limits and exact verification binding remain required. Carrier acceptance, A2P 10DLC registration or toll-free verification as applicable, TCPA obligations and CTIA messaging requirements remain provider-proof or legal Gaps inherited from SEND-008. All original target and acceptance points remain required. The clause remains partial. Remaining rider proof includes complete recipient-assent fields and disclosure custody, all-purpose suppression across invitations and provider suppression, SMS daylight-saving deferral rechecks, and every SIGN-001 identity-code limit. The existing local fakes do not prove these additional riders.

### RL-4 — PAY-006 retained decision

- Date: 2026-10-22
- Ruler: ct
- Governs: PAY-006

CT ruling (22 October 2026, eaf743e): manual, explicitly authorized submission of available facts is approved as the interim, with preparation, authorization, submission and Stripe receipt kept distinct; the full pack submitted to Stripe stays the target.

### RL-5 — TEAM-001 retained decision

- Date: 2026-10-22
- Ruler: ct
- Governs: TEAM-001

CT ruling (22 October 2026, eaf743e) implemented: a share grants one proposal, never role authority.

CT ruling (22 October 2026, eaf743e) implemented: current grant authority, exact native invitation binding, cancellation and expiry, and explicit consent for wider folder/item audiences.

### RL-20 — Verified notification authority

- Date: 2026-10-23
- Ruler: ct
- Governs: APPROVE-002, AUTO-003, COLLAB-002

Explicit owner/admin verified destination consent; generic channel text and protected links; private details only to eligible direct approvers; exact current session/revision/plan decisions; uncertain delivery held; restored routes inactive. This is the existing ct-approved boundary, resolved on main by 436fbd19d74b1de2f0008dc99a5986ca7843bac4. Nook/push, broader events/settings, automatic next-step delivery and chat-native decisions remain engineering and proof work.

### RL-101 — Sender-authorized schedules and supplied recipient zones

- Date: 2026-10-28
- Ruler: ct
- Governs: FOLLOW-001, FOLLOW-006
- Outcome: **adopt with rider** — Adopt inherited editable delivery snapshots with explicit current-sender authorization for each proposal and an explicitly supplied recipient zone; edits, revisions or sender demotion invalidate the previous execution authorization, copies/upgrades/restores start inactive, and recipient opt-out and terminal stops persist independently of revisions.

**Question:** May inherited reminder settings remain inactive until an authorized sender grants per-proposal execution authority with a supplied IANA zone?

**Adopted default:** Current proposal Send authority; explicit auditable per-proposal activation; supplied recipient IANA zone, never inferred; no activation on upgrade/copy/restore; independent inherited settings snapshots.

**Incumbent behavior and why:** PandaDoc carries workspace/template reminders into documents and exposes them at send, including default-on configuration. No common norm establishes a separate per-proposal activation or mandatory supplied IANA zone. Preserve the stricter 22 October ct APPROVE WITH CHANGE: this is sender authorization, not recipient consent; edits/revisions/sender demotion void it, upgrades/restores carry no authority, and audit plus opt-out persistence must be proved. This ruling preserves that decision rather than silently replacing it with PandaDoc defaults.

**Single placement:** FOLLOW-001 owns execution authorization, hours/stops and audit once; FOLLOW-006 states only inheritance/snapshot deltas and cites FOLLOW-001. Delivery-setting changes need no new offer approval but still need current schedule authority.

**Engineering/proof boundary:** Multiple unsigned recipients and creation through bulk/public-link/future payment doors remain required; audit/timeline and opt-out-across-revision riders are not established by policy alone. No inferred timezone or first name, and no old authority is imported from a copied template.

**Sources:**
- [Workspace/template reminder settings inherit into documents and can be reviewed at send.](https://support.pandadoc.com/en/articles/9714663-auto-reminders)

### RL-102 — Internal expiry and renewal notices under current authority

- Date: 2026-10-28
- Ruler: ct
- Governs: FOLLOW-003
- Outcome: **adopt with rider** — Adopt explicitly activated notices to the current recorded active sales owner with current proposal scope and channel authority; upgrades/restores confer no outbound authority, terminal states suppress expiry notices, date changes move the notice, and existing manual follow-ups are never overwritten.

**Question:** May interim internal notices require proposal-specific sender activation and target only its active recorded sales owner?

**Adopted default:** Explicit authorized-sender activation per proposal; recorded active sales owner only; upgrades/restores inactive; existing manual follow-ups preserved.

**Incumbent behavior and why:** PandaDoc advertises template-configured automatic reminders and renewal notices, with personal authorized Slack notifications. No common norm requires separate per-proposal internal-notice consent or excludes configured watchers. Preserve the narrower 23 October ct-approved interim default while retaining target default-on activation, watchers/channels and real renewal execution as unfinished duties.

**Single placement:** FOLLOW-003 owns internal-notice activation/timing once; RENEW-002/SEND-005/FOLLOW-006 cite it for their receiving deltas.

**Engineering/proof boundary:** Target default-on activation without separate per-proposal consent, sender settings, template inheritance, watchers/preferences, declined-offer proof and actual renewal offers remain required. Stored thirty-day settings do not execute renewal and this ruling does not remove default-on from scope.

**Sources:**
- [Document owners/admins configure inherited reminders; authorized Slack notices reach individual users.](https://www.pandadoc.com/recipes/automated-document-reminders/)
- [Workspace/template reminder settings inherit into documents and can be reviewed at send.](https://support.pandadoc.com/en/articles/9714663-auto-reminders)

### RL-21 — Native owner recipient authority

- Date: 2026-10-28
- Ruler: ct
- Governs: SEND-003

Ct approved this authority floor on 28 October 2026 at 08:10 UTC: the native owner holds the authority; no delegated or agent authority is added. The current native owner alone manages recipient roles, explicitly sends invitations or creates additional mailbox-bound viewing links, and authorizes an exact framing origin. Stakeholder conversion, copies and restores never invite anyone automatically or restore invitation authority. No split or deferral applies. Full template-role management remains with SIGN-011, and provider-specific recipient checks remain with SIGN-006.

This records the approved authority clarification without adding acceptance points or granting delegated authority.

### RL-22 — Owner-consented private engagement tracking

- Date: 2026-10-23
- Ruler: ct
- Governs: TRACK-001, TRACK-004

Policy applied from ct's 23 October 2026 ruling: tracking and alerts are off until the owner explicitly opts in; only the owner reads recipient, verification, device and coarse location detail. Current senders receive generic live in-app notices after a fresh access check. Retention defaults to 90 days and the owner can choose 1 through 365 days. Explicit per-proposal erasure and retention honor holds. Only trusted edge city, region and country are stored, never request addresses; measurement pages suppress external embeds. Exports retain business history but exclude tracking authority, and restores require fresh consent. Erasure invalidates older archive checkpoints.

### RL-23 — Explicit library insertion consent and scoped usage

- Date: 2026-10-24 (04:45 UTC)
- Ruler: ct
- Governs: EDIT-003, EDIT-002, EDIT-005, EDIT-006

CT approval (24 October 2026, 04:45 UTC): a current proposal editor must explicitly consent at insertion to recipient display and future linked draft edits; usage grants no access beyond existing proposal visibility; sent and accepted content stays frozen.

### RL-24 — External content consent and owner controls

- Date: 2026-10-24 (08:09 UTC)
- Ruler: ct
- Governs: EDIT-006, EDIT-002, EDIT-003, EDIT-005

CT approval (24 October 2026, 08:09 UTC): owner and admins control the audited external-content setting, off on fresh installs; only those roles change external blocks, and author consent stays in the revision. Viewers opt in on each page load. Before opt-in there are no provider requests, cookies or browser storage; frames use the exact allowlist, a sandbox, no referrer and CSP frame sources. The owner kill switch replaces external content with a plain placeholder naming its provider on the next load.

## FOLLOW-003 — RL-102 internal expiry and renewal notices

Ct adopted the staged notice policy with riders on 28 October 2026: explicit authorized-sender activation per proposal, notices only to its current recorded active sales owner with current proposal scope and channel authority, no activation on upgrade or restore, terminal-state suppression, changed dates moving notices, and preservation of existing manual follow-ups.

This approves the interim policy; it leaves default-on activation, template inheritance, watcher preferences and actual renewal offers unfinished. Sender settings and declined-offer proof are implemented in this round. RENEW-002, SEND-005 and FOLLOW-006 inherit their matching timing, authority and custody duties. No acceptance point is removed or added.
