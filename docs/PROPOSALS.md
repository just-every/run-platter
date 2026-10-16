# Proposals and acceptance

Each Platter offer has a scope of work, two GST-free AUD prices and a deposit percentage. An owner approves the exact revision before sending it. Sending freezes the offer.

## Prepare an offer

1. Add the client in **Clients**, or use an existing client.
2. Open **Proposals** and find **Prepare a proposal**.
3. Choose the client and enter the **Proposal title** and **Scope of work**.
4. Give each option a label and a **Price in dollars**, then enter the **Deposit percentage**.
5. Choose **Prepare proposal**, then open the proposal from **Your proposals**.

For example, a Brand photography offer can have Essentials at $2,400.00 and Campaign at $4,200.00. A 25% deposit is $600.00 for Essentials or $1,050.00 for Campaign. The client accepts one option.

Browser members and [agents](AGENT-ACCESS.md) can prepare or revise drafts. The owner controls approval, sending and invoice export.

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

The CSV uses Xero sales-invoice columns, account code `200` and `GST Free Income`. Confirm these match your books before importing. Import the invoice into your accounting system once: Platter cannot prevent a downloaded file being imported twice.

This export records the deposit invoice. Platter does not collect the deposit, calculate GST or sync directly with Xero.
