# Payment terms, received payments and QuickBooks

Open a proposal and choose **Payment terms and schedule**. Set the deposit percentage, invoice net days, dated or event milestones, and monthly amounts. Milestones can be a fixed amount, a percentage of the selected package and extras, or the remaining one-off balance. Monthly amounts are additional to that one-off price. Saving creates a new revision and clears its approval. Templates and duplicates keep independent copies.

The client sees the selected schedule before accepting, and the unsigned PDF contains the same amounts. Acceptance freezes that schedule. This release does not support fixed deposits or collect payment-method authorization.

**Payments and accounting** shows each scheduled amount, issue and due dates, received money, overdue balances, provider events and accounting mismatches. Future amounts stay scheduled. The owner marks an event milestone done; dated and monthly invoices issue on their scheduled day. Net terms start on the issue day.

## Check, wire and ACH credit

The owner, an admin or billing records money already received, with its method, reference, date and scheduled invoice. A repeated receipt cannot create another payment. A receipt without an amount selection can use the sole issued amount; when there is more than one, choose explicitly. Historical unallocated receipts can be matched without recording the money twice.

The owner or an admin publishes client-visible check and wire instructions. This works without a provider connection. They appear on new deposit CSV exports and QuickBooks invoices. A retained CSV stays byte-identical after instructions change.

## QuickBooks Online

The owner or an admin connects the firm's QuickBooks company under **Vendor documents**. The owner separately authorizes accounting synchronization and chooses the invoice item, tax code, income account, clearing account, fee expense account and bank account. Map catalog items with the `accounting.catalog` command; their accounting item and income account are verified before invoicing.

Acceptance creates only the deposit invoice. A milestone and each monthly period receive their own invoice on their issue day. Verified Stripe payments post gross to clearing; offline receipts post to the selected bank account. Confirmed Platter refunds create linked refund credits. QuickBooks paid balances read back into Platter. Reconnecting the original company and replaying reconciliation do not create new invoices.

An amount changed in QuickBooks is flagged for review. An uncertain creation stays held and is never posted again automatically. The owner or an admin can match its provider invoice only after verifying the exact retained customer, number, dates, currency and amount. A revoked or disconnected connection stops synchronization. Archive restore retains invoice and payment records, excludes credentials and execution authority, and requires explicit reconnection and sync authorization.

Reconcile a paid Stripe payout to post its confirmed fees and one net transfer from clearing to bank. Every component must match retained payment or refund evidence. Unsupported adjustments and disputes stay held. This release supports QuickBooks accounting; Stripe invoice authority, Xero and Pantry synchronization are not available.

## Provider events and command access

Configure Stripe's signed webhook endpoint as `/api/platter/payments/events`. Platter verifies the signature and account, keeps one record per event ID, and reads current provider evidence before changing state. ACH stays processing until success; an uncaptured authorization is not paid. Invalid, foreign or uncertain evidence cannot mark an amount paid.

The existing authenticated command endpoint accepts `schedule.save`, `payment.remittance`, `payment.record`, `payment.allocate`, `payment.reconcile`, `accounting.configure`, `accounting.catalog`, `accounting.milestone`, `accounting.sync`, `accounting.match`, `accounting.pause` and `accounting.payout`. These use the same server role checks as the screens. Agent keys cannot perform financial actions.
