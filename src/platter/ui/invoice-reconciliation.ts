import { date, escape, field, form, hidden, money, panel, type Feedback } from './shared'

const back = '/app/settings'
const consent = (label: string) => '<label><input type="checkbox" name="consent" value="yes" required>' + escape(label) + '</label>'
export function invoiceReconciliationPanel(state: any, feedback?: Feedback) {
 const accounting = state.invoiceReconciliation
 if (!accounting) return ''
 const connection = state.connections.find((row: any) => row.provider === 'quickbooks' && row.status === 'connected')
 const connectionFields = connection ? hidden('accountId', connection.accountId) + hidden('connectionVersion', connection.version) : ''
 const available = accounting.deposits.filter((row: any) => row.canReview && !row.match)
 let contents = '<p>Match an existing QuickBooks invoice to an exported tax-free USD deposit. Each match retains the accepted revision, explicit customer, verified company and exact reviewed response. Matching never creates an invoice, changes accepted money or marks a payment.</p>'
 if (accounting.lock) contents += '<p>Retained company: <strong>' + escape(accounting.lock.account_id) + '</strong>. Reconnection must use this company.</p>'
 if (connection && available.length) contents += form('invoice.match.review', back, connectionFields + '<p>Verified QuickBooks company: <strong>' + escape(connection.accountId) + '</strong></p>'
  + '<label>Accepted deposit<select name="id" aria-label="Accepted deposit" required><option value="">Choose an exported deposit</option>' + available.map((row: any) => '<option value="' + escape(row.proposal_id) + '">' + escape(row.title) + ' · revision ' + escape(row.revision) + ' · ' + money(row.deposit_cents, row.currency) + '</option>').join('') + '</select></label>'
  + field('QuickBooks customer ID', 'customerId', '', 'required maxlength="100"') + field('Existing QuickBooks invoice ID', 'externalId', '', 'required maxlength="100"')
  + consent('I authorize reading this existing invoice and customer to review a match to the selected accepted deposit.') + '<button>Review existing invoice</button>')
 else contents += '<p>' + (connection ? 'No unmatched supported exported deposits are available.' : 'Connect QuickBooks above before reviewing or inspecting an invoice.') + '</p>'
 const review = feedback?.result?.invoiceReview ? feedback.result : null
 if (review) contents += '<article aria-label="Reviewed invoice match"><h3>Review customer and deposit</h3><dl><dt>Accepted client</dt><dd>' + escape(review.clientName) + '</dd><dt>Local deposit</dt><dd>' + money(review.depositCents, review.currency) + ' · revision ' + escape(review.revision) + ' · ' + escape(review.number) + '</dd><dt>Verified company</dt><dd>' + escape(review.source.accountId) + '</dd><dt>QuickBooks customer</dt><dd>' + escape(review.source.customer.name) + ' · ' + escape(review.source.customer.id) + '</dd><dt>Existing invoice</dt><dd>' + escape(review.source.invoice.number || review.source.invoice.id) + ' · ' + escape(review.source.invoice.id) + ' · ' + money(review.source.invoice.totalCents, review.source.invoice.currency) + '</dd></dl>'
  + form('invoice.match.apply', back, hidden('id', review.id) + hidden('digest', review.digest) + consent('I reviewed this exact accepted deposit and explicitly confirm that this QuickBooks customer and invoice belong to it. Retain this match only.') + '<button>Retain reviewed match</button>') + '</article>'
 contents += '<h3>Retained deposit reconciliation</h3><p>Recorded receipts below are local records. Provider payments and events are not synchronized.</p>'
 contents += accounting.deposits.length ? '<ul class="records" aria-label="Invoice reconciliation">' + accounting.deposits.map((row: any) => {
  const match = row.match, latest = row.inspections.at(-1), mismatches = latest ? JSON.parse(latest.mismatches_json) : []
  const inspected = latest ? JSON.parse(latest.source_json) : null
  return '<li><article><h4>' + escape(row.title) + '</h4><p>Accepted deposit: ' + money(row.deposit_cents, row.currency) + ' · revision ' + escape(row.revision) + '</p><p>Local export: ' + escape(row.number) + '</p>'
   + (match ? '<p>QuickBooks invoice: <strong>' + escape(match.external_id) + '</strong> · company ' + escape(match.account_id) + ' · customer ' + escape(match.customer_id) + '</p><p>Matched ' + date(match.matched_at) + '. Retained amount: ' + money(match.deposit_cents, match.currency) + '.</p><p role="status">' + (mismatches.length ? 'Mismatch: ' + escape(mismatches.join(', ')) + '. Current provider amount: ' + money(inspected.invoice.totalCents, inspected.invoice.currency) + '. Current customer: ' + escape(inspected.invoice.customerId) + '. Accepted money is unchanged.' : latest ? 'Inspected: amount, currency and customer match.' : 'Matched from reviewed response. No later inspection recorded.') + '</p>'
    + (latest ? '<p>Last inspection: ' + date(latest.inspected_at) + '. Retained inspections: ' + row.inspections.length + '.</p>' : '')
    + (connection && connection.accountId === match.account_id ? form('invoice.match.inspect', back, hidden('id', match.id) + connectionFields + consent('I authorize a fresh read of this matched invoice and customer through the current connection.') + '<button class="secondary">Inspect matched invoice</button>') : '<p>Reconnect the retained company and give fresh consent before inspection.</p>') : '<p>No external invoice is matched.</p>')
   + '<p>Recorded receipts: ' + (row.receipts.length ? row.receipts.map((receipt: any) => money(receipt.cents, receipt.currency) + (receipt.received_on ? ' on ' + escape(receipt.received_on) : ' · date not recorded')).join('; ') : 'none') + '.</p></article></li>'
 }).join('') + '</ul>' : '<p>No deposits have been exported.</p>'
 return panel('Invoice reconciliation', contents)
}
