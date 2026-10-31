import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { currentTime } from '../expiry-time'
import { commit, hash, need, text, type Actor } from '../model'
import { administrators } from '../permissions'

const connectionId = 'workspace:quickbooks'
const canonical = (value: unknown) => JSON.stringify(value)
const identifier = (value: unknown) => { const id = text(value, 'a QuickBooks record ID', 100); need(/^[A-Za-z0-9_-]+$/.test(id), 'Use a QuickBooks record ID'); return id }
const consent = (value: unknown) => need(value === true || value === 'yes', 'Explicitly authorize this read and reviewed customer match')
const optional = (value: unknown) => value == null ? '' : text(value, 'provider reference text', 200)
function cents(value: unknown) {
 const written = String(value ?? '')
 need(/^\d{1,10}(\.\d{1,2})?$/.test(written), 'The invoice amount is missing or unsupported', 409)
 const [whole, fraction = ''] = written.split('.')
 return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
async function deposit(db: D1Database, id: unknown) {
 const row = await db.prepare(`SELECT i.id AS deposit_id,i.number,i.csv,a.*,p.client_id,c.name AS client_name
  FROM p_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id
  JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id
  WHERE p.id=? AND p.status='accepted' AND p.revision=a.revision
  AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id)`).bind(text(id, 'an accepted proposal')).first<any>()
 need(row, 'Export an accepted deposit with collection off before matching', 409)
 const accepted = JSON.parse(row.snapshot)
 need(row.currency === 'USD' && !accepted.selection?.tax && !(accepted.recipient_plan?.length), 'Only tax-free USD deposits on single-client agreements can be matched', 409)
 need(!await db.prepare('SELECT 1 FROM p_collection_intents WHERE proposal_id=?').bind(row.proposal_id).first(), 'Provider collection agreements cannot use this matching path', 409)
 return { ...row, client_name: accepted.clientName ?? row.client_name, acceptance_digest: await hash(row.snapshot) }
}
function guard(connection: any, row: any) {
 return { sql: `EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id
  WHERE c.id=? AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL)
  AND NOT EXISTS(SELECT 1 FROM p_accounting_company WHERE account_id!=?)
  AND EXISTS(SELECT 1 FROM p_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id
   JOIN p_proposals p ON p.id=a.proposal_id WHERE i.id=? AND p.id=? AND a.revision=? AND p.revision=a.revision
   AND p.status='accepted' AND a.snapshot=? AND a.deposit_cents=? AND a.currency=? AND i.csv=?
   AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM p_collection_intents WHERE proposal_id=p.id))`,
  values: [connectionId, connection.account_id, connection.version, connection.account_id, row.deposit_id, row.proposal_id, row.revision, row.snapshot, row.deposit_cents, row.currency, row.csv] as any[] }
}
async function connectionFor(env: Bindings, input: Record<string, unknown>, account?: string, version?: number) {
 const { connection, secret } = await providerCredential(env, connectionId)
 need(!connection.broken_at, 'Reconnect QuickBooks before inspecting invoices', 409)
 need(connection.account_id === (account ?? input.accountId) && connection.version === Number(version ?? input.connectionVersion), 'The company or connection changed; review with fresh consent', 409)
 const lock = await env.DB.prepare('SELECT account_id FROM p_accounting_company WHERE singleton=1').first<any>()
 need(!lock || lock.account_id === connection.account_id, 'Retained accounting requests lock this installation to its verified company', 409)
 return { connection, secret }
}
async function readSource(env: Bindings, actor: Actor, connection: any, token: string, row: any, externalId: string) {
 const check = () => commit(env.DB, actor, [], true, guard(connection, row))
 await check()
 const base = 'https://quickbooks.api.intuit.com/v3/company/' + encodeURIComponent(connection.account_id)
 const response = await providerJson(base + '/invoice/' + encodeURIComponent(externalId), token)
 await check()
 const invoice = response.Invoice
 need(invoice && !Array.isArray(invoice) && invoice.Id === externalId, 'QuickBooks did not return the exact selected invoice', 409)
 const customerId = identifier(invoice.CustomerRef?.value)
 const currency = text(invoice.CurrencyRef?.value, 'the invoice currency', 3)
 need(/^[A-Z]{3}$/.test(currency), 'The invoice currency is unsupported', 409)
 const customerResponse = await providerJson(base + '/customer/' + encodeURIComponent(customerId), token)
 await check()
 const customer = customerResponse.Customer
 need(customer && !Array.isArray(customer) && customer.Id === customerId && customer.Active !== false, 'QuickBooks did not confirm the invoice customer', 409)
 // Retain the exact reconciliation fields, never the provider's unrelated private data.
 return { accountId: connection.account_id, invoice: { id: externalId, customerId, currency, totalCents: cents(invoice.TotalAmt), syncToken: optional(invoice.SyncToken), number: optional(invoice.DocNumber), date: optional(invoice.TxnDate) }, customer: { id: customerId, name: text(customer.DisplayName, 'the QuickBooks customer name', 200) } }
}
function matches(source: any, row: any, customerId: string) {
 return [source.invoice.totalCents !== row.deposit_cents ? 'amount' : '', source.invoice.currency !== row.currency ? 'currency' : '', source.invoice.customerId !== customerId ? 'customer' : ''].filter(Boolean)
}
export async function invoiceMatchingCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(administrators.includes(actor.role), 'Only owner and admins review invoice matches', 403)
 need(['invoice.match.review', 'invoice.match.apply', 'invoice.match.inspect'].includes(name), 'Unknown invoice matching action', 404)
 consent(input.consent)
 const db = env.DB, at = await currentTime(db)
 if (name === 'invoice.match.review') {
  const row = await deposit(db, input.id), externalId = identifier(input.externalId), customerId = identifier(input.customerId)
  const { connection, secret } = await connectionFor(env, input)
  need(!await db.prepare('SELECT 1 FROM p_invoice_matches WHERE deposit_id=? OR (account_id=? AND external_id=?)').bind(row.deposit_id, connection.account_id, externalId).first(), 'This deposit or external invoice is already matched', 409)
  const source = await readSource(env, actor, connection, secret.token, row, externalId)
  need(matches(source, row, customerId).length === 0, 'The invoice must match the explicit customer, exact deposit amount and currency', 409)
  const sourceJson = canonical(source), id = crypto.randomUUID(), digest = await hash(canonical([row.proposal_id, row.deposit_id, row.revision, row.acceptance_digest, row.deposit_cents, row.currency, connection.account_id, connection.version, customerId, externalId, source]))
  await commit(db, actor, [
   db.prepare("INSERT OR IGNORE INTO p_accounting_company(singleton,provider,account_id,requested_by,requested_at) VALUES(1,'quickbooks',?,?,?)").bind(connection.account_id, actor.id, at),
   db.prepare('INSERT INTO p_invoice_match_reviews(id,proposal_id,deposit_id,revision,actor_id,actor_role,actor_version,account_id,connection_version,customer_id,external_id,deposit_cents,currency,acceptance_digest,source_json,digest,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, row.proposal_id, row.deposit_id, row.revision, actor.id, actor.role, actor.memberVersion ?? 0, connection.account_id, connection.version, customerId, externalId, row.deposit_cents, row.currency, row.acceptance_digest, sourceJson, digest, at),
  ], true, guard(connection, row))
  return { invoiceReview: true, id, digest, proposalId: row.proposal_id, depositId: row.deposit_id, revision: row.revision, clientName: row.client_name, number: row.number, depositCents: row.deposit_cents, currency: row.currency, source }
 }
 if (name === 'invoice.match.apply') {
  const review = await db.prepare('SELECT * FROM p_invoice_match_reviews WHERE id=? AND actor_id=?').bind(text(input.id, 'a review'), actor.id).first<any>()
  need(review && !review.applied_at && review.created_at > at - 900000 && review.digest === input.digest && review.actor_role === actor.role && review.actor_version === (actor.memberVersion ?? 0), 'Review expired, changed or was applied; review again with fresh consent', 409)
  const row = await deposit(db, review.proposal_id)
  need(row.deposit_id === review.deposit_id && row.revision === review.revision && row.acceptance_digest === review.acceptance_digest && row.deposit_cents === review.deposit_cents && row.currency === review.currency, 'The accepted deposit changed; review again', 409)
  const { connection, secret } = await connectionFor(env, input, review.account_id, review.connection_version)
  need(!await db.prepare('SELECT 1 FROM p_invoice_matches WHERE deposit_id=? OR (account_id=? AND external_id=?)').bind(row.deposit_id, review.account_id, review.external_id).first(), 'This deposit or external invoice is already matched', 409)
  const source = await readSource(env, actor, connection, secret.token, row, review.external_id)
  need(canonical(source) === review.source_json && matches(source, row, review.customer_id).length === 0, 'The provider invoice changed after review; read it again', 409)
  const checked = guard(connection, row)
  checked.sql += ' AND EXISTS(SELECT 1 FROM p_invoice_match_reviews WHERE id=? AND digest=? AND applied_at IS NULL)'
  checked.values.push(review.id, review.digest)
  await commit(db, actor, [
   db.prepare("INSERT INTO p_invoice_matches(id,proposal_id,deposit_id,revision,provider,account_id,connection_version,customer_id,external_id,deposit_cents,currency,acceptance_digest,source_json,digest,reviewed_by,reviewed_at,matched_by,matched_at) VALUES(?,?,?,?,'quickbooks',?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(review.id, row.proposal_id, row.deposit_id, row.revision, review.account_id, review.connection_version, review.customer_id, review.external_id, review.deposit_cents, review.currency, review.acceptance_digest, review.source_json, review.digest, actor.id, review.created_at, actor.id, at),
   db.prepare('UPDATE p_invoice_match_reviews SET applied_at=? WHERE id=?').bind(at, review.id),
  ], true, checked)
  return { id: review.id, matched: true }
 }
 const match = await db.prepare('SELECT * FROM p_invoice_matches WHERE id=?').bind(text(input.id, 'a retained match')).first<any>()
 need(match, 'Invoice match not found', 404)
 const row = await deposit(db, match.proposal_id)
 need(row.acceptance_digest === match.acceptance_digest && row.deposit_cents === match.deposit_cents && row.deposit_id === match.deposit_id, 'The retained deposit changed; reconcile locally before inspecting', 409)
 const { connection, secret } = await connectionFor(env, input)
 need(connection.account_id === match.account_id, 'The match belongs to another company', 409)
 const source = await readSource(env, actor, connection, secret.token, row, match.external_id), mismatches = matches(source, match, match.customer_id), sourceJson = canonical(source), digest = await hash(sourceJson), id = crypto.randomUUID()
 await commit(db, actor, [db.prepare('INSERT INTO p_invoice_inspections(id,match_id,connection_version,source_json,digest,mismatches_json,inspected_by,inspected_at,sequence) SELECT ?,?,?,?,?,?,?,?,COALESCE(MAX(sequence),0)+1 FROM p_invoice_inspections WHERE match_id=?').bind(id, match.id, connection.version, sourceJson, digest, JSON.stringify(mismatches), actor.id, at, match.id)], true, guard(connection, row))
 return { id, matchId: match.id, mismatches, source }
}
export async function invoiceReconciliation(env: Bindings, actor: Actor) {
 if (!administrators.includes(actor.role)) return undefined
 const db = env.DB, lock = await db.prepare('SELECT * FROM p_accounting_company WHERE singleton=1').first()
 const deposits = (await db.prepare(`SELECT i.id,i.proposal_id,i.number,a.revision,a.deposit_cents,a.currency,p.title,c.name AS client_name,
  (p.status='accepted' AND p.revision=a.revision AND a.currency='USD'
   AND json_extract(a.snapshot,'$.selection.tax') IS NULL AND COALESCE(json_array_length(a.snapshot,'$.recipient_plan'),0)=0
   AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM p_collection_intents WHERE proposal_id=p.id)) AS canReview
  FROM p_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id JOIN p_proposals p ON p.id=i.proposal_id JOIN p_clients c ON c.id=p.client_id ORDER BY i.exported_at,i.id`).all<any>()).results
 const mappings = (await db.prepare('SELECT * FROM p_invoice_matches ORDER BY matched_at,id').all<any>()).results
 const inspections = (await db.prepare('SELECT * FROM p_invoice_inspections ORDER BY match_id,sequence').all<any>()).results
 const receipts = (await db.prepare('SELECT proposal_id,cents,currency,received_on FROM p_payment_records ORDER BY recorded_at,id').all<any>()).results
 return { lock, deposits: deposits.map(row => ({ ...row, match: mappings.find(m => m.deposit_id === row.id) ?? null, inspections: inspections.filter(i => i.match_id === mappings.find(m => m.deposit_id === row.id)?.id), receipts: receipts.filter(r => r.proposal_id === row.proposal_id) })) }
}
