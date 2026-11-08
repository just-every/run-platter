import type { Bindings } from '../auth.server'
import { providerCredential } from './connections'
import { allocationState } from './payment-allocations'
import { commit, hash, need, text, type Actor } from './model'
import { permitted } from './permissions'
import { addDays, currentTime, localDate } from './expiry-time'
import { installationZone } from './reports/report-state'
import { accountingProvider, invoiceFacts } from './offline-accounting'

export async function prepareOfflineInvoice(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(['owner', 'admin'].includes(actor.role), 'Only owner and admins prepare accounting invoices', 403)
 const proposal = await permitted(env.DB, actor, input.id), db = env.DB
 const schedule = (await allocationState(env, actor)).paymentSchedules.find(x => x.proposalId === proposal.id), row = schedule?.rows.find(x => x.index === Number(input.rowIndex))
 need(schedule && row && schedule.agreementHash === input.agreementHash && row.rowHash === input.rowHash && row.allocatedCents === 0, 'Choose an unallocated frozen installment', 409)
 need(input.consent === true || input.consent === 'yes', 'Confirm permission to read the accounting customer and item')
 const { connection } = await providerCredential(env, 'workspace:quickbooks')
 need(connection.version === Number(input.connectionVersion), 'The connection changed. Reload.', 409)
 const customerId = text(input.customerId, 'a QuickBooks customer id', 100), itemId = text(input.itemId, 'a QuickBooks service item id', 100), remittance = text(input.remittance, 'the invoice remittance instructions', 4000)
 const customer = (await accountingProvider(env, actor, connection.account_id, connection.version, '/customer/' + encodeURIComponent(customerId))).Customer
 const item = (await accountingProvider(env, actor, connection.account_id, connection.version, '/item/' + encodeURIComponent(itemId))).Item
 need(customer?.Id === customerId && customer.Active === true && typeof customer.DisplayName === 'string' && customer.DisplayName.length <= 200 && (!customer.CurrencyRef || customer.CurrencyRef.value === schedule.currency), 'Choose an active customer with the agreement currency', 409)
 need(item?.Id === itemId && item.Active === true && item.Type === 'Service' && typeof item.IncomeAccountRef?.value === 'string' && typeof item.Name === 'string' && item.Name.length <= 200, 'Choose an active service item with an income account', 409)
 const at = await currentTime(db), today = localDate(at, await installationZone(db))
 const review = { proposalId: proposal.id, revision: schedule.revision, rowIndex: row.index, rowHash: row.rowHash, agreementHash: schedule.agreementHash, realmId: connection.account_id, connectionVersion: connection.version, customerName: customer.DisplayName, itemName: item.Name, incomeAccount: item.IncomeAccountRef.value, payload: { CustomerRef: { value: customerId }, CurrencyRef: { value: schedule.currency }, TxnDate: today, DueDate: addDays(today, row.netDays), CustomerMemo: { value: remittance }, Line: [{ Amount: row.amountCents / 100, Description: row.label, DetailType: 'SalesItemLineDetail', SalesItemLineDetail: { ItemRef: { value: itemId }, Qty: 1, UnitPrice: row.amountCents / 100, TaxCodeRef: { value: 'NON' } } }] } }
 const reviewJson = JSON.stringify(review), reviewHash = await hash(reviewJson), id = crypto.randomUUID()
 await commit(db, actor, [db.prepare("INSERT INTO p_offline_invoice_requests(id,proposal_id,revision,row_index,review_json,review_hash,status,prepared_by,prepared_at) VALUES(?,?,?,?,?,?,'prepared',?,?)").bind(id, proposal.id, schedule.revision, row.index, reviewJson, reviewHash, actor.id, at), db.prepare('INSERT INTO p_offline_invoice_issue_authority(request_id) VALUES(?)').bind(id)], false, { sql: "EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:quickbooks' AND account_id=? AND version=? AND status='connected' AND broken_at IS NULL) AND NOT EXISTS(SELECT 1 FROM p_offline_invoices WHERE proposal_id=? AND revision=? AND row_index=?)", values: [connection.account_id, connection.version, proposal.id, schedule.revision, row.index] })
 return { id, proposalId: proposal.id, reviewHash }
}
export async function issueOfflineInvoice(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(['owner', 'admin'].includes(actor.role), 'Only owner and admins issue reviewed accounting invoices', 403)
 const proposal = await permitted(env.DB, actor, input.id), db = env.DB
 need(input.consent === true || input.consent === 'yes', 'Confirm this exact invoice explicitly')
 const request = await db.prepare('SELECT * FROM p_offline_invoice_requests WHERE id=? AND proposal_id=?').bind(text(input.requestId, 'a prepared invoice'), proposal.id).first<any>()
 need(request && request.prepared_by === actor.id && request.review_hash === input.reviewHash, 'Review the exact invoice with your own current account', 409)
 if (request.status !== 'prepared') return { id: request.id, proposalId: proposal.id, status: request.status }
 const review = JSON.parse(request.review_json), at = await currentTime(db), today = localDate(at, await installationZone(db))
 const schedule = (await allocationState(env, actor)).paymentSchedules.find(x => x.proposalId === proposal.id), row = schedule?.rows.find(x => x.index === review.rowIndex)
 need(schedule && row && row.ready && row.allocatedCents === 0 && schedule.agreementHash === review.agreementHash && row.rowHash === review.rowHash && (!row.date || row.date <= today), 'The installment is not ready to invoice, or has changed', 409)
 need(request.prepared_at + 900000 > at && review.payload.TxnDate === today, 'This preview expired. Prepare a fresh invoice.', 409)
 const accepted = await db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first<any>()
 need(accepted && await hash(accepted.snapshot) === review.agreementHash, 'The accepted agreement changed. Reload.', 409)
 const customer = (await accountingProvider(env, actor, review.realmId, review.connectionVersion, '/customer/' + encodeURIComponent(review.payload.CustomerRef.value))).Customer
 const item = (await accountingProvider(env, actor, review.realmId, review.connectionVersion, '/item/' + encodeURIComponent(review.payload.Line[0].SalesItemLineDetail.ItemRef.value))).Item
 need(customer?.Id === review.payload.CustomerRef.value && customer.Active === true && customer.DisplayName === review.customerName && (!customer.CurrencyRef || customer.CurrencyRef.value === schedule.currency) && item?.Id === review.payload.Line[0].SalesItemLineDetail.ItemRef.value && item.Active === true && item.Type === 'Service' && item.Name === review.itemName && item.IncomeAccountRef?.value === review.incomeAccount, 'The accounting customer or item changed. Prepare a fresh review.', 409)
 const payload = JSON.stringify(review.payload)
 await commit(db, actor, [db.prepare("UPDATE p_offline_invoice_requests SET status='reserved' WHERE id=?").bind(request.id)], false, { sql: "EXISTS(SELECT 1 FROM p_offline_invoice_requests r JOIN p_offline_invoice_issue_authority a ON a.request_id=r.id WHERE r.id=? AND r.status='prepared') AND EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:quickbooks' AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL) AND NOT EXISTS(SELECT 1 FROM p_offline_invoices WHERE proposal_id=? AND revision=? AND row_index=?) AND NOT EXISTS(SELECT 1 FROM p_payment_allocations WHERE proposal_id=? AND revision=? AND row_index=?) AND EXISTS(SELECT 1 FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE p.id=? AND a.snapshot=? AND p.status='accepted' AND a.revision=p.revision)", values: [request.id, review.realmId, review.connectionVersion, proposal.id, schedule.revision, row.index, proposal.id, schedule.revision, row.index, proposal.id, accepted.snapshot] })
 try {
  const value = await accountingProvider(env, actor, review.realmId, review.connectionVersion, '/invoice', payload, request.id), invoice = value.Invoice
  need(typeof invoice?.Id === 'string' && invoice.Id.length > 0 && invoice.Id.length <= 100 && typeof invoice.DocNumber === 'string' && invoice.DocNumber.length > 0 && invoice.DocNumber.length <= 100, 'QuickBooks did not confirm an invoice identity', 409)
  const facts = { provider_invoice: invoice.Id, customer_id: review.payload.CustomerRef.value, document_number: invoice.DocNumber, currency: review.payload.CurrencyRef.value, total_cents: row.amountCents }
  const confirmed = invoiceFacts(value, facts)
  need(confirmed.balance === row.amountCents && invoice.TxnDate === review.payload.TxnDate && invoice.DueDate === review.payload.DueDate && invoice.CustomerMemo?.value === review.payload.CustomerMemo.value && invoice.Line?.filter((x: any) => x.DetailType === 'SalesItemLineDetail').length === 1 && invoice.Line.find((x: any) => x.DetailType === 'SalesItemLineDetail').SalesItemLineDetail?.ItemRef?.value === review.payload.Line[0].SalesItemLineDetail.ItemRef.value, 'QuickBooks returned a different issued invoice', 409)
  await db.batch([db.prepare('INSERT INTO p_offline_invoices(id,proposal_id,revision,row_index,agreement_hash,row_hash,realm_id,provider_invoice,customer_id,document_number,currency,total_cents,balance_cents,due_on,remittance,invoice_json,observed_at,linked_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(request.id, proposal.id, schedule.revision, row.index, schedule.agreementHash, row.rowHash, review.realmId, facts.provider_invoice, facts.customer_id, facts.document_number, facts.currency, facts.total_cents, confirmed.balance, invoice.DueDate, review.payload.CustomerMemo.value, JSON.stringify(invoice), Date.now(), actor.id), db.prepare('INSERT INTO p_offline_invoice_authority(invoice_id,connection_version) VALUES(?,?)').bind(request.id, review.connectionVersion), db.prepare("UPDATE p_offline_invoice_requests SET status='confirmed',completed_at=? WHERE id=? AND status='reserved'").bind(Date.now(), request.id)])
  return { id: request.id, proposalId: proposal.id, status: 'confirmed' }
 } catch {
  await db.prepare("UPDATE p_offline_invoice_requests SET status='needs_review',completed_at=? WHERE id=? AND status='reserved'").bind(Date.now(), request.id).run()
  return { id: request.id, proposalId: proposal.id, status: 'needs_review' }
 }
}
