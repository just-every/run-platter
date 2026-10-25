# Proposals and acceptance

Each Platter offer has a scope of work, two USD prices (or the original GST-free AUD prices on a first-release proposal) and a deposit percentage. An owner approves the exact revision before sending it. Sending freezes the offer.

## Prepare an offer

1. Add the client in **Clients**, or use an existing client.
2. Open **Proposals** and find **Prepare a proposal**.
3. Choose the client and enter the **Proposal title** and **Scope of work**.
4. Give each option a label and a **Price in USD** (or **Price in AUD** on a first-release proposal), then enter the **Deposit percentage**.
5. Choose **Prepare proposal**, then open the proposal from **Your proposals**.

For example, a Brand photography offer can have Essentials at $2,400.00 and Campaign at $4,200.00. A 25% deposit is $600.00 for Essentials or $1,050.00 for Campaign. The client accepts one option.

Browser members and [agents](AGENT-ACCESS.md) can prepare or revise drafts. The owner controls approval, sending and invoice export.

## Payment terms and schedules

In the composer, the owner, an admin or a manager of the proposal's team can choose **Include schedule**. Use the deposit percentage or choose a fixed deposit amount in the proposal's currency. A fixed deposit must fit every offered package.

Add milestone labels, their percentages of the balance after the deposit, and a calendar date or named event such as Design approval. Milestone percentages must sum to 100. Choose net 15 or net 30 for milestone and retainer payments. Deposits remain due at acceptance. An optional monthly retainer uses a percentage of the selected package value, a first date and a month count; it is additional to the package price. Dates such as January 31 become February 28 in a shorter month.

Review package and optional-item quantities in the client preview. The same server calculation supplies the client page, unsigned PDF and frozen agreement JSON. A template copies its terms into each new draft; changing that draft's deposit from 30% to 25% leaves the template unchanged. Revision restore, duplication and installation archives retain the terms. Legacy offers without a schedule keep their original percentage-deposit snapshots.

These schedules are informational. Saving or accepting one creates no automatic charge, invoice or message. Existing payment-term rules require an explicit review of a structured schedule, and changing the schedule clears prior approval.

## Approve the revision

Check the client's email, scope, both offered prices and deposit percentage. Choose **Approve this revision** when they are correct. The proposal records who approved it and when.

To change a draft or approved offer, edit **Revise proposal** and choose **Save revision**. Saving clears the previous approval. The owner must approve the revised offer before sending.

## Send the offer

Choose **Send approved proposal**. Sending freezes the scope, options and prices. The **Shared offer** section shows the mail status, and **Open client proposal** opens the private invitation.

On a configured deployment, the client receives mail through your configured sender. **Accepted by provider** means the sender accepted the message; it does not prove delivery to the recipient. An uncertain sending attempt is retained without an automatic retry.

Locally, no external mail is sent. Open **Open client proposal**, preferably in a separate browser session, to try the client flow yourself.

## Verify and accept

1. On the client proposal, choose **Send verification code**.
2. Read the code in the client's mailbox. When trying Platter locally, return to the owner's proposal and read **Local development mail** instead.
3. Enter the six-digit **Email verification code** and choose **Verify email**.
4. Choose one option, enter **Your full name**, and confirm the acceptance checkbox after checking the scope, total and deposit.
5. Choose **Accept proposal**.

The acceptance retains the chosen option, total, deposit, name, email and time. The accepted agreement is permanent and cannot be revised through Platter.

Codes expire after ten minutes, allow five attempts and have a one-minute resend interval. A sent proposal's invitation remains valid until it is replaced or accepted. Keep the invitation private.

## Replace a client link

For a sent proposal, the owner can choose **Send fresh client link**. This revokes the previous link and verification session while keeping the offer frozen. Use it if access is lost or needs replacing, or after [restoring a backup](BACKUP-RESTORE.md). It does not change the offered terms.

## Export the deposit invoice

After acceptance, open the owner's proposal and choose **Export invoice CSV**, then **Download deposit invoice CSV**. Repeating the export returns the same retained invoice; downloading it again does not create another invoice.

The CSV uses Xero sales-invoice columns and account code `200`. Original AUD invoices retain `GST Free Income`; new USD invoices use `No Tax`, since sales tax is not calculated. Confirm these match your books before importing. Import the invoice into your accounting system once: Platter cannot prevent a downloaded file being imported twice.

This export records the deposit invoice. Platter does not collect the deposit, calculate sales tax or sync directly with Xero.

Delivery events and bounced invitations (`SEND-002`) use the installation's mail
provider. For Resend or SendGrid, configure the provider's signed webhook at
`/api/platter/mail/events` and set the Worker secret `MAIL_WEBHOOK_KEY` to the
Resend signing secret or SendGrid verification public key. Keep the endpoint
identity stable when rotating that key. The installation verifies signatures,
provider message correlation and the exact recipient before retaining an event.
Duplicate callbacks do not create duplicate notices. Provider acceptance is
shown separately from recipient mail-server delivery, which never proves a
person read the message. Cloudflare mail displays “Delivery events unavailable
with this mail transport”; it has no signed HTTP event intake here.

The sending owner sees a durable bounce notice and open address-correction
follow-up in Proposals. Reading the notice leaves the task open. Correcting the
address explicitly sends a fresh invitation, invalidates the old link and
verification session, and keeps the frozen offer and client record unchanged.
Verification codes use the corrected invitation address. The follow-up closes
only when the provider accepts that correction, or the owner logs a dismissal
reason; an uncertain sending result stays open. Business notices and logged
resolutions travel in RER archives; mail bodies, invitation links, delivery
attempts and provider event receipts remain installation-local.

## Client questions

After verifying their mailbox, the invited client can ask about scope, pricing or terms on the sent revision. The owner sees open questions on Proposals and the proposal, answers in the thread, and the client receives a notification. Questions and answers remain with the accepted agreement and portable archive.

The owner can also answer a question by email when Resend receiving is configured. Set `QUESTION_REPLY_DOMAIN` to the installation's Resend receiving domain, set `MAIL_WEBHOOK_KEY` to its signing secret, and direct signed `email.received` events to `/api/platter/question-replies`. Use the existing Resend `MAIL_API_KEY` with access to fetch received messages. Other transports use app answers. **Email me this question** sends a fresh notice to the active owner mailbox and replaces the prior private reply address. Reply from that exact mailbox within seven days, in plain text without attachments. The complete reply is retained as the answer, including quoted text; remove any quoted private reply address. Each private address works once. An app answer also spends outstanding addresses. Provider acceptance of a notification does not prove recipient delivery.


## Client email reply records

When Resend receiving is configured, the sender may opt in to saving one plain-text client email reply per invitation. Direct signed `email.received` events to `/api/platter/client-mail-replies`. The private Reply-To address is one-use and rotates with a fresh invitation. The reply appears in Invitation delivery for people who can view the proposal. It is a record only: it cannot approve, sign or change the proposal. The claimed From address is not proven client identity; Platter shows Resend's receiving-server SPF/DKIM results, or “unavailable” for older/missing results. Sender-controlled Authentication-Results headers are never used as provider results. Automatic replies, bulk/list mail and out-of-office replies are discarded without a record or notice. Reaching the one-reply cap creates one owner-only in-app notice, with no automatic outbound email. Reply text and provenance survive archives; reply authority does not.

## Email reminders and delivery defaults

Open **Email reminders** on a proposal to set its schedule, cap, recipient IANA time zone, subject and message. Check the authorization box when enabling scheduled email, then choose **Save reminder settings**. Review its dates before sending. Relative dates assume sending today in the installation zone the first send will capture; the actual sending day fixes them. A negotiated send starts its period again, while an already-sent deadline keeps its recorded zone. The same panel offers **Send manual email reminder** for the current unsigned recipient, even with the schedule off. Multiple unsigned recipients remain pending.

Owners and admins set **Workspace defaults** and **Reminder quiet hours** in Settings. On Proposals, expand **Reminder and expiry defaults** for a personal or shared template. Reminders, expiry and warning can each follow the workspace at creation or use a template override. Each draft copies the resolved settings and chosen reminder-message text; editing a template, shared message or workspace default never changes existing drafts. A duplicate copies its source’s edited settings without its authorizations, history, recipient first-name input or invitation. Shared-template edits follow the existing template editing roles; sales members can edit their own personal templates.

Owners and admins create and edit **Shared reminder messages** in Settings, choose a workspace default and lock a message against member text edits. A proposal template can choose its own reminder message. In **Email reminders**, select a message, supply the recipient first name when its variables require one, and choose **Use selected reminder message** to load it for review. Loading always turns the schedule off; explicitly authorize it again after reviewing the text. A locked selection refuses member text edits; choosing a different or custom message is allowed. Existing selections retain their copied source text when the shared source is edited. Supported variables are `{client.first_name}`, `{client.company}`, `{proposal.title}`, `{sender.name}` and `{proposal.expires_on}`; the recipient first name is explicit input, never inferred from a mailbox or company. Missing values block sending. Scheduled attempts fill current proposal/expiry values and retain the exact filled copy in the timeline. Shared message controls currently apply to reminder email.

The signed-in, same-origin `POST /api/platter/command` door exposes the same actions. Owner/admin quiet hours use `reminder.policy` with the current policy version, `quietStart` and `quietEnd` (whole hours 0–23, default 20 and 8). Agent keys cannot configure or send reminders.

A person who can send the proposal first supplies its recipient's IANA time zone. They may copy its saved workspace/template day lists and cap by omitting `afterDays`, `beforeDays` and `cap`, or set them explicitly. Obtain `id` and the current proposal `version` from the signed-in state response:

```json
{"name":"reminder.configure","input":{"id":"synthetic-platter-proposal","version":2,"enabled":true,"consent":true,"timeZone":"America/Los_Angeles","afterDays":[2,5,9],"beforeDays":[3],"cap":2,"subject":"Please review your proposal","message":"Let me know if you have questions."}}
```

Configuration changes the proposal's metadata version, without changing its frozen revision or approvals. The delivery settings timeline retains the exact reminder settings and message, actor and time; expiry changes appear there too. Scheduled execution requires this explicit audited consent. Existing and restored settings never activate sending; reauthorize a restored schedule explicitly. Recipient zones are supplied, never inferred. This conservative rollout/restore default awaits product-policy approval. Scheduled email waits for the owner-set quiet hours to end and stops after acceptance, decline, withdrawal, expiry or verified recipient opt-out. Every claimed attempt counts toward the cap, including uncertain attempts, which are never blindly retried.

With a recipient zone configured, send an immediate manual reminder even when the schedule is disabled or its cap is zero:

```json
{"name":"reminder.send","input":{"id":"synthetic-platter-proposal","requestId":"synthetic-platter-7000","subject":"Following up on the start date","message":"Could you review the proposed start date?"}}
```

Reuse a request id only for the identical request. A second manual reminder to the same recipient on the same recipient calendar day returns 429; manual attempts do not consume the scheduled cap and manual email bypasses quiet hours. The current sending member's connected Gmail or Microsoft mailbox sends the reminder or answer, with the same visible broken-connection fallback and uncertain-send hold as an invitation. Sending authority, current invitation and recipient decisions are rechecked immediately before provider I/O. Platter appends the current private client link only to transport mail; the exact retained subject/message and provider status appear in Invitation delivery. Archives keep these facts without transport credentials or active schedules.

After mailbox verification, the client may choose **Stop email reminders** on the proposal. This stops reminder email for that revision without accepting or declining it. Opt-out persists in archives. A new revision is a separate recipient decision.


## Build a document

Open a prepared proposal’s **Document blocks** section. Add cover pages, headings, formatted text, images, video, two-column sections, placed pricing tables, quotes, bios, case studies, terms, Client fields, typed-signature blocks and page breaks. Use the drag handle or **Move up/Move down**, duplicate/delete controls and **Undo** to arrange it. Text supports **bold**, _italic_ and lines beginning with `- ` for lists.

Block changes autosave after a pause. Once document content is present, proposal details and itemised table edits autosave too; quantities show a server-confirmed total. Every save creates a guarded draft revision and clears approval. A conflicting tab cannot overwrite a newer revision: keep your edits, reload to review and then save again. **Save document** and **Save revision** remain explicit retry controls. New blank proposals and the first negotiated draft still require their explicit Prepare actions.

The **Brand kit** sets the firm name, an uploaded logo, readable text/accent/paper colors, serif or sans-serif font and the default cover heading. New covers use that heading. Copies and templates retain these document choices and exact media references; starting for another client rebinds the Client field role and never copies a prior signer’s values.

Use **Upload display media** for PNG/JPEG images (up to 5 MiB and 16 megapixels) and MP4/WebM video (up to 20 MiB). Confirm display consent, then place the upload in a block or choose it as the logo. Video needs an uploaded image poster. Only files actually placed in the source document travel into a copy or template. Ordinary attachments stay download-only. External embeds and galleries are not yet available.

A pricing block places one of the proposal’s saved tables. Its quantities and totals use the same server arithmetic as the offer. Remove or reassign placed blocks before adding or removing tables in that package, then place the new table arrangement. Terms blocks inherit the template’s terms lock: sales members can move them, but an authorized person must unlock them before their content or visibility changes.

Client fields currently support required or optional text, dates and checkboxes for the invited Client role. Each typed-signature block must match the name adopted at acceptance. Required values block acceptance and then remain immutable with the agreement. File collection, additional recipient roles, signed certificates and invoice/CRM propagation remain separate capabilities.

Preview the exact unsent revision before approving. Package and optional-item conditions govern document sections in the preview, client page, selected unsigned PDF and accepted snapshot. Verified clients can ask about a block and can suggest tracked text edits where you explicitly enable them. Accepting a suggestion creates a separate unapproved draft; it never changes the live offer. Unsigned PDFs use US Letter pages, the chosen brand, uploaded images and video stills, two-column text and the same block order, with the revision and “Not signed” on every page.
