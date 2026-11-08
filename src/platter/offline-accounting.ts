import type { Bindings } from '../auth.server'
import { providerCredential } from './connections'
import { allocationState, financeRoles, paymentRequestId } from './payment-allocations'
import { commit, hash, need, text, type Actor } from './model'
import { permitted, scope } from './permissions'
import { currentTime, localDate } from './expiry-time'
import { installationZone } from './reports/report-state'

const companyUrl = (realm: string) => 'https://quickbooks.api.intuit.com/v3/company/' + encodeURIComponent(realm)
function cents(value: unknown) {
 need(typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'QuickBooks returned an invalid amount', 409)
 return Math.round(value * 100)
}
export async function accountingProvider(env: Bindings, actor: Actor, realm: string, version: number, path: string, payload?: string, requestId?: string) {
 // Recheck the actual role, proposal scope and current credential before each provider request.
 await commit(env.DB, actor, [], false, { sql: "EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:quickbooks' AND c.status='connected' AND c.broken_at IS NULL AND c.account_id=? AND c.version=?)", values: [realm, version] })
 const { connection, secret } = await providerCredential(env, 'workspace:quickbooks')
 need(connection.version === version && connection.account_id === realm, 'Reconnect and review this invoice again', 409)
 const response = await fetch(companyUrl(realm) + path + (requestId ? '?requestid=' + encodeURIComponent(requestId) : ''), { method: payload ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { authorization: 'Bearer ' + secret.token, accept: 'application/json', ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { body: payload } : {}) })
 need(response.ok, 'QuickBooks refused the request. Review the connection and invoice.', 409)
 const body = await response.text(); need(body.length <= 262144, 'QuickBooks response is too large', 409)
 return JSON.parse(body)
}
export function invoiceFacts(value: any, expected: { provider_invoice: string; customer_id: string; document_number: string; currency: string; total_cents: number }) {
 const invoice = value.Invoice
 need(invoice?.Id === expected.provider_invoice && invoice.CustomerRef?.value === expected.customer_id && invoice.DocNumber === expected.document_number && invoice.CurrencyRef?.value === expected.currency && cents(invoice.TotalAmt) === expected.total_cents, 'QuickBooks invoice does not match the reviewed customer, document, currency and milestone amount', 409)
 const balance = cents(invoice.Balance)
 need(balance <= expected.total_cents && /^\d{4}-\d{2}-\d{2}$/.test(invoice.DueDate) && !Number.isNaN(Date.parse(invoice.DueDate)), 'QuickBooks returned invalid invoice facts', 409)
 return { invoice, balance }
}
export async function offlineAccountingState(env: Bindings, actor: Actor) {
 if (!financeRoles.includes(actor.role)) return { offlineInvoices: [], offlineAccounting: [], offlineInvoiceRequests: [] }
 const visibility = scope(actor, 'view'), today = localDate(await currentTime(env.DB), await installationZone(env.DB))
 const invoices = (await env.DB.prepare(`SELECT i.*,EXISTS(SELECT 1 FROM p_offline_invoice_visibility v WHERE v.invoice_id=i.id) AS clientVisible,EXISTS(SELECT 1 FROM p_offline_invoice_authority a JOIN p_connections c ON c.id='workspace:quickbooks' JOIN p_connection_secrets s ON s.connection_id=c.id WHERE a.invoice_id=i.id AND c.account_id=i.realm_id AND c.version=a.connection_version AND c.status='connected' AND c.broken_at IS NULL) AS authorized FROM p_offline_invoices i JOIN p_proposals p ON p.id=i.proposal_id WHERE (${visibility.sql}) ORDER BY i.id`).bind(...visibility.values).all<any>()).results
 const history = (await env.DB.prepare(`SELECT x.* FROM p_offline_accounting x JOIN p_offline_invoices i ON i.id=x.invoice_id JOIN p_proposals p ON p.id=i.proposal_id WHERE (${visibility.sql}) ORDER BY x.requested_at,x.allocation_id`).bind(...visibility.values).all<any>()).results
 return { offlineInvoices: invoices.map(i => ({ ...i, overdue: i.balance_cents > 0 && i.due_on < today, balanceStatus: i.balance_cents === 0 ? 'paid' : i.due_on < today ? 'overdue' : 'due', needsReview: history.some(x => x.invoice_id === i.id && x.status !== 'confirmed') })), offlineAccounting: history, offlineInvoiceRequests: ['owner','admin'].includes(actor.role)?(await env.DB.prepare(`SELECT r.* FROM p_offline_invoice_requests r JOIN p_proposals p ON p.id=r.proposal_id WHERE (${visibility.sql}) ORDER BY r.prepared_at DESC,r.rowid DESC`).bind(...visibility.values).all<any>()).results:[] }
}
export async function offlineAccountingCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(financeRoles.includes(actor.role), 'Only owner, admins and billing reconcile received payments', 403)
 const proposal = await permitted(env.DB, actor, input.id), db = env.DB
 need(input.consent === true || input.consent === 'yes', 'Confirm this accounting action explicitly')
 if (name === 'payment.invoice-refresh') {
  const invoice = await db.prepare('SELECT i.*,a.connection_version FROM p_offline_invoices i JOIN p_offline_invoice_authority a ON a.invoice_id=i.id WHERE i.id=? AND i.proposal_id=?').bind(text(input.invoiceId,'a retained invoice'),proposal.id).first<any>()
  need(invoice,'This invoice has no current accounting authority',409)
  const confirmed = invoiceFacts(await accountingProvider(env,actor,invoice.realm_id,invoice.connection_version,'/invoice/'+encodeURIComponent(invoice.provider_invoice)),invoice)
  await commit(db,actor,[db.prepare('UPDATE p_offline_invoices SET balance_cents=?,invoice_json=?,observed_at=? WHERE id=?').bind(confirmed.balance,JSON.stringify(confirmed.invoice),Date.now(),invoice.id)],false,{sql:"EXISTS(SELECT 1 FROM p_offline_invoice_authority a JOIN p_connections c ON c.id='workspace:quickbooks' JOIN p_connection_secrets s ON s.connection_id=c.id WHERE a.invoice_id=? AND a.connection_version=? AND c.version=a.connection_version AND c.account_id=? AND c.status='connected' AND c.broken_at IS NULL) AND EXISTS(SELECT 1 FROM p_offline_invoices WHERE id=? AND balance_cents=?) AND NOT EXISTS(SELECT 1 FROM p_offline_accounting WHERE invoice_id=? AND status='reserved')",values:[invoice.id,invoice.connection_version,invoice.realm_id,invoice.id,invoice.balance_cents,invoice.id]})
  return {id:invoice.id,proposalId:proposal.id,balanceCents:confirmed.balance}
 }
 if (name === 'payment.invoice-link') {
  need(['owner', 'admin'].includes(actor.role), 'Only owner and admins bind accounting invoices', 403)
  const schedule = (await allocationState(env, actor)).paymentSchedules.find(x => x.proposalId === proposal.id)
  const row = schedule?.rows.find(x => x.index === Number(input.rowIndex))
  need(schedule && row && row.ready && schedule.agreementHash === input.agreementHash && row.rowHash === input.rowHash && row.allocatedCents === 0, 'Choose an unallocated ready frozen installment', 409)
  const accepted = await db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first<any>()
  need(accepted && await hash(accepted.snapshot) === schedule.agreementHash, 'The agreement changed. Reload.', 409)
  const { connection } = await providerCredential(env, 'workspace:quickbooks')
  need(connection.version === Number(input.connectionVersion), 'The connection changed. Reload.', 409)
  const facts = { provider_invoice: text(input.invoiceId, 'the existing QuickBooks invoice id', 100), customer_id: text(input.customerId, 'the reviewed QuickBooks customer id', 100), document_number: text(input.documentNumber, 'the reviewed invoice number', 100), currency: schedule.currency, total_cents: row.amountCents }
  const { invoice, balance } = invoiceFacts(await accountingProvider(env, actor, connection.account_id, connection.version, '/invoice/' + encodeURIComponent(facts.provider_invoice)), facts)
  need(balance === row.amountCents, 'Bind an unpaid invoice before allocating receipts', 409)
  const remittance = typeof invoice.CustomerMemo?.value === 'string' ? invoice.CustomerMemo.value : ''
  need(remittance.trim().length > 0 && remittance.length <= 4000, 'Add remittance instructions to the QuickBooks invoice before linking it', 409)
  const id = crypto.randomUUID()
  await commit(db, actor, [db.prepare('INSERT INTO p_offline_invoices(id,proposal_id,revision,row_index,agreement_hash,row_hash,realm_id,provider_invoice,customer_id,document_number,currency,total_cents,balance_cents,due_on,remittance,invoice_json,observed_at,linked_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, proposal.id, schedule.revision, row.index, schedule.agreementHash, row.rowHash, connection.account_id, facts.provider_invoice, facts.customer_id, facts.document_number, facts.currency, facts.total_cents, balance, invoice.DueDate, remittance, JSON.stringify(invoice), Date.now(), actor.id), db.prepare('INSERT INTO p_offline_invoice_authority(invoice_id,connection_version) VALUES(?,?)').bind(id, connection.version)], false, { sql: "EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:quickbooks' AND account_id=? AND version=? AND status='connected' AND broken_at IS NULL) AND NOT EXISTS(SELECT 1 FROM p_offline_invoice_requests WHERE proposal_id=? AND revision=? AND row_index=? AND status!='prepared') AND NOT EXISTS(SELECT 1 FROM p_payment_allocations WHERE proposal_id=? AND revision=? AND row_index=?) AND EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=? AND snapshot=?)", values: [connection.account_id, connection.version, proposal.id, schedule.revision, row.index, proposal.id, schedule.revision, row.index, proposal.id, accepted.snapshot] })
  return { id, proposalId: proposal.id }
 }
 need(name === 'payment.accounting-sync', 'Unknown accounting action', 404)
 const allocationId = text(input.allocationId, 'an allocation'), requestId = paymentRequestId(input.requestId), methodId = text(input.methodId, 'the QuickBooks payment method id', 100)
 need(requestId.length <= 50, 'Use a request id of at most 50 characters')
 const allocation = await db.prepare('SELECT x.*,r.method,r.reference,r.received_on FROM p_payment_allocations x JOIN p_payment_records r ON r.id=x.payment_id WHERE x.id=? AND x.proposal_id=?').bind(allocationId, proposal.id).first<any>()
 need(allocation, 'Allocation not found', 404)
 const old = await db.prepare('SELECT * FROM p_offline_accounting WHERE allocation_id=? OR request_id=?').bind(allocationId, requestId).first<any>()
 if (old) { need(old.allocation_id === allocationId && old.request_id === requestId && old.method_id === methodId, 'This allocation already has an accounting request. Review its retained result.', 409); return { id: allocationId, proposalId: proposal.id, status: old.status } }
 const invoice = await db.prepare('SELECT i.*,a.connection_version FROM p_offline_invoices i JOIN p_offline_invoice_authority a ON a.invoice_id=i.id WHERE i.proposal_id=? AND i.revision=? AND i.row_index=? AND i.agreement_hash=? AND i.row_hash=?').bind(proposal.id, allocation.revision, allocation.row_index, allocation.agreement_hash, allocation.row_hash).first<any>()
 need(invoice, 'Link and authorize the existing accounting invoice before syncing', 409)
 need(!await db.prepare("SELECT 1 FROM p_offline_accounting WHERE invoice_id=? AND status!='confirmed'").bind(invoice.id).first(), 'An earlier write needs accounting reconciliation', 409)
 const before = invoiceFacts(await accountingProvider(env, actor, invoice.realm_id, invoice.connection_version, '/invoice/' + encodeURIComponent(invoice.provider_invoice)), invoice)
 need(before.balance === invoice.balance_cents && allocation.cents <= before.balance, 'The provider balance changed. Reconcile it before syncing.', 409)
 const method = (await accountingProvider(env, actor, invoice.realm_id, invoice.connection_version, '/paymentmethod/' + encodeURIComponent(methodId))).PaymentMethod
 need(method?.Id === methodId && method.Active === true && method.Name === ({ check: 'Check', wire: 'Wire', ach_credit: 'ACH Credit' } as Record<string, string>)[allocation.method], 'Choose the matching active QuickBooks payment method', 409)
 const payload = JSON.stringify({ CustomerRef: { value: invoice.customer_id }, CurrencyRef: { value: allocation.currency }, TotalAmt: allocation.cents / 100, TxnDate: allocation.received_on, PaymentMethodRef: { value: methodId }, ...(allocation.reference.length <= 21 ? { PaymentRefNum: allocation.reference } : {}), PrivateNote: allocation.reference, Line: [{ Amount: allocation.cents / 100, LinkedTxn: [{ TxnId: invoice.provider_invoice, TxnType: 'Invoice' }] }] })
 await commit(db, actor, [db.prepare("INSERT INTO p_offline_accounting(allocation_id,invoice_id,request_id,method_id,status,request_json,requested_by,requested_at) VALUES(?,?,?,?,'reserved',?,?,?)").bind(allocationId, invoice.id, requestId, methodId, payload, actor.id, Date.now())], false, { sql: "EXISTS(SELECT 1 FROM p_offline_invoice_authority a JOIN p_connections c ON c.id='workspace:quickbooks' JOIN p_connection_secrets s ON s.connection_id=c.id WHERE a.invoice_id=? AND a.connection_version=? AND c.version=a.connection_version AND c.account_id=? AND c.status='connected' AND c.broken_at IS NULL) AND EXISTS(SELECT 1 FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE p.id=? AND p.status='accepted' AND p.revision=? AND a.revision=?) AND EXISTS(SELECT 1 FROM p_offline_invoices WHERE id=? AND balance_cents=?)", values: [invoice.id, invoice.connection_version, invoice.realm_id, proposal.id, allocation.revision, allocation.revision, invoice.id, before.balance] })
 let response: any = null, providerPayment: string | null = null, status = 'needs_review'
 try {
  response = await accountingProvider(env, actor, invoice.realm_id, invoice.connection_version, '/payment', payload, requestId)
  const payment = response.Payment
  need(typeof payment?.Id === 'string' && payment.Id.length > 0 && payment.Id.length <= 100 && payment.CustomerRef?.value === invoice.customer_id && payment.CurrencyRef?.value === allocation.currency && cents(payment.TotalAmt) === allocation.cents && payment.TxnDate === allocation.received_on && payment.PaymentMethodRef?.value === methodId && payment.Line?.length === 1 && cents(payment.Line[0].Amount) === allocation.cents && payment.Line[0].LinkedTxn?.length === 1 && payment.Line[0].LinkedTxn[0].TxnId === invoice.provider_invoice && payment.Line[0].LinkedTxn[0].TxnType === 'Invoice', 'QuickBooks did not confirm this exact allocated payment', 409)
  providerPayment = payment.Id
  const after = invoiceFacts(await accountingProvider(env, actor, invoice.realm_id, invoice.connection_version, '/invoice/' + encodeURIComponent(invoice.provider_invoice)), invoice)
  need(after.balance === before.balance - allocation.cents, 'QuickBooks did not confirm the expected remaining balance', 409)
  await db.batch([db.prepare('UPDATE p_offline_invoices SET balance_cents=?,invoice_json=?,observed_at=? WHERE id=?').bind(after.balance, JSON.stringify(after.invoice), Date.now(), invoice.id), db.prepare("UPDATE p_offline_accounting SET status='confirmed',provider_payment=?,response_json=?,completed_at=? WHERE allocation_id=? AND status='reserved'").bind(providerPayment, JSON.stringify({ Payment: payment, Invoice: after.invoice }), Date.now(), allocationId)])
  status = 'confirmed'
 } catch {
  await db.prepare("UPDATE p_offline_accounting SET status='needs_review',provider_payment=?,completed_at=? WHERE allocation_id=? AND status='reserved'").bind(providerPayment, Date.now(), allocationId).run()
 }
 return { id: allocationId, proposalId: proposal.id, status }
}
