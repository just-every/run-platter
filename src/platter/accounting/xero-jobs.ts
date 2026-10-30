import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { currentTime } from '../expiry-time'
import { commit, hash, need, text, type Actor } from '../model'
import { administrators, permitted } from '../permissions'
import { canonical, xeroRequest, xeroSources } from './xero'

const connectionId = 'workspace:xero'
const version = (a: Actor) => a.memberVersion ?? 0
async function accepted(env: Bindings, id: string) {
 const row = await env.DB.prepare("SELECT a.*,p.client_id FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE a.proposal_id=? AND p.status='accepted'").bind(id).first<any>()
 need(row, 'Select a retained accepted agreement', 409)
 const snap = JSON.parse(row.snapshot)
 need(row.currency === 'USD' && row.deposit_cents > 0 && Number.isSafeInteger(row.deposit_cents) && !snap.selection?.tax && !snap.options?.some((o: any) => o.tax), 'Only positive tax-free USD deposits can be issued in Xero', 409)
 return { row, snap, digest: await hash(canonical(row)) }
}
function guard(config: any, connection: any) {
 return { sql: "EXISTS(SELECT 1 FROM p_invoice_authority WHERE singleton=1 AND authority='xero' AND account_id=? AND version=?) AND EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:xero' AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL)", values: [config.account_id, config.version, connection.account_id, connection.version] }
}
async function current(env: Bindings, a: Actor) {
 need(administrators.includes(a.role), 'Only owner and admins review and issue Xero deposits', 403)
 const config = await env.DB.prepare("SELECT * FROM p_invoice_authority WHERE singleton=1 AND authority='xero'").first<any>()
 need(config, 'The owner must explicitly choose Xero as the invoice authority', 409)
 const { connection, secret } = await providerCredential(env, connectionId)
 need(!connection.broken_at && config.account_id === connection.account_id, 'Review the current Xero organization and authority', 409)
 const authorize = async () => { await commit(env.DB, a, [], false, guard(config, connection)); const fresh = await providerCredential(env, connectionId); need(fresh.connection.version === connection.version && fresh.connection.account_id === config.account_id, 'The Xero connection changed', 409); return { token: fresh.secret.token, accountId: config.account_id } }
 return { config, connection, secret, authorize }
}
export async function xeroState(env: Bindings, a: Actor) {
 if (!administrators.includes(a.role)) return undefined
 const authority = await env.DB.prepare('SELECT * FROM p_invoice_authority WHERE singleton=1').first<any>()
 const jobs = (await env.DB.prepare('SELECT j.*,EXISTS(SELECT 1 FROM p_xero_execution e WHERE e.proposal_id=j.proposal_id) AS executable FROM p_xero_jobs j ORDER BY created_at DESC LIMIT 100').all<any>()).results
 return { authority, locked: Boolean(await env.DB.prepare('SELECT 1 FROM p_xero_jobs LIMIT 1').first()), jobs }
}
export async function xeroCommand(env: Bindings, a: Actor, name: string, p: Record<string, unknown>) {
 const db = env.DB, at = await currentTime(db)
 if (name === 'xero.authority') {
  need(a.role === 'owner', 'Only the owner chooses the invoice authority', 403)
  need(p.consent === true || p.consent === 'yes', 'Explicitly confirm the invoice authority')
  const choice = String(p.authority); need(['xero', 'platter'].includes(choice), 'Choose one invoice authority')
  const old = await db.prepare('SELECT * FROM p_invoice_authority WHERE singleton=1').first<any>()
  need(Number(p.version) === (old?.version ?? 0), 'Invoice authority changed. Reload.', 409)
  need(!await db.prepare('SELECT 1 FROM p_xero_jobs LIMIT 1').first(), 'Invoice authority and organization are locked after the first retained request', 409)
  let accountId = ''
  if (choice === 'xero') { need(!await db.prepare('SELECT 1 FROM p_invoices LIMIT 1').first(), 'Retained deposit exports already use Platter invoice authority. Reconcile them before choosing Xero.', 409); const { connection } = await providerCredential(env, connectionId); need(!connection.broken_at && p.accountId === connection.account_id && Number(p.connectionVersion) === connection.version, 'Review the current verified Xero organization', 409); accountId = connection.account_id }
  const g = { sql: 'COALESCE((SELECT version FROM p_invoice_authority WHERE singleton=1),0)=? AND NOT EXISTS(SELECT 1 FROM p_xero_jobs)', values: [old?.version ?? 0] as any[] }
  if (choice === 'xero') { g.sql += " AND NOT EXISTS(SELECT 1 FROM p_invoices) AND EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:xero' AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL)"; g.values.push(accountId, Number(p.connectionVersion)) }
  await commit(db, a, [db.prepare('INSERT INTO p_invoice_authority VALUES(1,?,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET authority=excluded.authority,account_id=excluded.account_id,version=excluded.version,selected_by=excluded.selected_by,selected_at=excluded.selected_at').bind(choice, accountId, (old?.version ?? 0) + 1, a.id, at)], false, g)
  return { authority: choice }
 }
 const live = await current(env, a)
 if (name === 'xero.review') {
  const id = text(p.id, 'an accepted proposal'); await permitted(db, a, id)
  need(!await db.prepare('SELECT 1 FROM p_xero_jobs WHERE proposal_id=?').bind(id).first(), 'This deposit already has a retained request; inspect its history', 409)
  need(!await db.prepare('SELECT 1 FROM p_invoices WHERE proposal_id=?').bind(id).first(), 'This deposit already has a retained export; reconcile its invoice authority first', 409)
  const acceptance = await accepted(env, id), sources = await xeroSources(live.authorize, acceptance.row.email)
  const choices = { xeroReview: true, proposalId: id, title: acceptance.snap.title, depositCents: acceptance.row.deposit_cents, accountId: live.config.account_id, ...sources }
  if (!p.accountCode || !(p.contactId || p.createContact === true || p.createContact === 'yes')) return choices
  const accounts = sources.accounts.filter((r: any) => r.Code === p.accountCode); need(accounts.length === 1, 'Select one active revenue account from Xero', 409)
  const contact = sources.contacts.length ? sources.contacts.find((r: any) => r.ContactID === p.contactId) : (p.createContact === true || p.createContact === 'yes') ? { Name: acceptance.snap.clientName, EmailAddress: acceptance.row.email } : null
  need(contact && typeof contact.Name === 'string' && contact.Name.length > 0, 'Explicitly confirm the matching contact or creation of a new contact', 409)
  const contactMap = await db.prepare('SELECT * FROM p_xero_contacts WHERE account_id=? AND client_id=?').bind(live.config.account_id, acceptance.row.client_id).first<any>()
  need(!contactMap || contactMap.status === 'complete' && contactMap.contact_id === contact.ContactID, 'The client already has a different or uncertain Xero mapping; reconcile it first', 409)
  const date = new Date(acceptance.row.accepted_at).toISOString().slice(0, 10)
  const invoice = { Type: 'ACCREC', Status: 'AUTHORISED', CurrencyCode: 'USD', Date: date, DueDate: date, LineAmountTypes: 'NoTax', Reference: 'Platter deposit ' + id, InvoiceNumber: 'PL-' + id.replaceAll('-', '').toUpperCase(), LineItems: [{ Description: 'Deposit: ' + acceptance.snap.title, Quantity: 1, UnitAmount: acceptance.row.deposit_cents / 100, AccountCode: accounts[0].Code, TaxType: 'NONE' }] }
  const source = { contact, account: accounts[0], invoice, sources }, sourceJson = canonical(source), digest = await hash(acceptance.digest + '\n' + sourceJson), reviewId = crypto.randomUUID()
  const operator = await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>()
  await commit(db, a, [db.prepare('INSERT INTO p_xero_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(reviewId, id, a.id, a.role, version(a), operator.version, live.connection.version, live.config.version, live.config.account_id, acceptance.digest, sourceJson, digest, at)], false, guard(live.config, live.connection))
  return { ...choices, id: reviewId, digest, source }
 }
 need(name === 'xero.issue', 'Unknown Xero action', 404)
 need(p.consent === true || p.consent === 'yes', 'Confirm the reviewed deposit, contact and income account')
 const review = await db.prepare('SELECT * FROM p_xero_reviews WHERE id=? AND actor_id=?').bind(text(p.id, 'a Xero deposit review'), a.id).first<any>()
 need(review && review.digest === p.digest && review.created_at > at - 900000 && review.actor_role === a.role && review.actor_version === version(a) && review.connection_version === live.connection.version && review.authority_version === live.config.version && review.account_id === live.config.account_id, 'The review expired or its actor, authority or connection changed. Review again.', 409)
 await permitted(db, a, review.proposal_id)
 const acceptance = await accepted(env, review.proposal_id); need(acceptance.digest === review.accepted_digest, 'The accepted deposit changed; review again', 409)
 const source = JSON.parse(review.source_json)
 const reviewedMapping = await db.prepare('SELECT * FROM p_xero_contacts WHERE account_id=? AND client_id=?').bind(review.account_id, acceptance.row.client_id).first<any>()
 need(!reviewedMapping || reviewedMapping.status === 'complete' && reviewedMapping.contact_id === source.contact.ContactID, 'The client contact mapping changed. Review again.', 409)
 const fresh = await xeroSources(live.authorize, acceptance.row.email)
 need(canonical(fresh) === canonical(source.sources), 'Xero contacts or income accounts changed. Review again.', 409)
 const g = guard(live.config, live.connection)
 g.sql += ' AND NOT EXISTS(SELECT 1 FROM p_invoices WHERE proposal_id=?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=?)'; g.values.push(review.proposal_id, a.id, review.operator_version)
 // The unique deposit and client mappings are committed before the first provider write.
 await commit(db, a, [db.prepare('INSERT INTO p_xero_jobs(proposal_id,revision,account_id,connection_version,authority_version,actor_id,actor_role,actor_version,operator_version,accepted_digest,request_json,contact_json,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(review.proposal_id, acceptance.row.revision, review.account_id, review.connection_version, review.authority_version, a.id, a.role, version(a), review.operator_version, review.accepted_digest, canonical(source.invoice), canonical(source.contact), 'claimed', at), db.prepare('INSERT INTO p_xero_execution VALUES(?)').bind(review.proposal_id), db.prepare('DELETE FROM p_xero_reviews WHERE id=?').bind(review.id)], false, g)
 const job = await db.prepare('SELECT * FROM p_xero_jobs WHERE proposal_id=?').bind(review.proposal_id).first<any>()
 const authorize = async () => {
  await live.authorize()
  need(await db.prepare('SELECT 1 FROM p_xero_execution e JOIN oa_operators o ON o.id=? AND o.version=? WHERE e.proposal_id=?').bind(a.id, review.operator_version, job.proposal_id).first(), 'This retained history has no current execution authority', 409)
  need((await accepted(env, job.proposal_id)).digest === job.accepted_digest, 'The accepted deposit changed', 409)
  return live.authorize()
 }
 try {
  let mapping = await db.prepare('SELECT * FROM p_xero_contacts WHERE account_id=? AND client_id=?').bind(job.account_id, acceptance.row.client_id).first<any>()
  need(!mapping || mapping.status === 'complete' && mapping.contact_id === source.contact.ContactID, 'The client contact mapping changed. Review again.', 409)
  if (!mapping) {
   await commit(db, a, [db.prepare('INSERT INTO p_xero_contacts VALUES(?,?,?,?,?)').bind(job.account_id, acceptance.row.client_id, source.contact.ContactID ?? null, source.contact.ContactID ? 'complete' : 'writing', canonical(source.contact))], false, g)
   if (!source.contact.ContactID) {
    const result = await xeroRequest(authorize, 'Contacts', { Contacts: [source.contact] }), contact = result.Contacts?.[0]
    need(result.Contacts?.length === 1 && typeof contact.ContactID === 'string' && contact.Name === source.contact.Name && contact.EmailAddress?.toLowerCase() === source.contact.EmailAddress.toLowerCase() && !contact.HasValidationErrors, 'Xero did not confirm the reviewed contact', 409)
    await db.prepare("UPDATE p_xero_contacts SET contact_id=?,status='complete' WHERE account_id=? AND client_id=?").bind(contact.ContactID, job.account_id, acceptance.row.client_id).run()
   }
   mapping = await db.prepare('SELECT * FROM p_xero_contacts WHERE account_id=? AND client_id=?').bind(job.account_id, acceptance.row.client_id).first<any>()
  }
  need(mapping?.status === 'complete' && (!source.contact.ContactID || mapping.contact_id === source.contact.ContactID), 'The contact mapping is uncertain or changed. No invoice will be replayed.', 409)
  const invoice = { ...source.invoice, Contact: { ContactID: mapping.contact_id } }
  await db.prepare("UPDATE p_xero_jobs SET status='writing',request_json=? WHERE proposal_id=?").bind(canonical(invoice), job.proposal_id).run()
  const result = await xeroRequest(authorize, 'Invoices', { Invoices: [invoice] }), issued = result.Invoices?.[0]
  need(issued?.LineAmountTypes === 'NoTax' && issued.LineItems?.length === 1 && issued.LineItems[0].AccountCode === source.account.Code && issued.LineItems[0].TaxType === 'NONE' && Number(issued.LineItems[0].Quantity) === 1 && Math.round(Number(issued.LineItems[0].UnitAmount) * 100) === acceptance.row.deposit_cents, 'Xero did not confirm the reviewed income account and tax-free deposit line', 409)
  need(result.Invoices?.length === 1 && typeof issued.InvoiceID === 'string' && !issued.HasValidationErrors && issued.Status === 'AUTHORISED' && issued.Type === 'ACCREC' && issued.Contact?.ContactID === mapping.contact_id && issued.CurrencyCode === 'USD' && Math.round(Number(issued.Total) * 100) === acceptance.row.deposit_cents && issued.InvoiceNumber === invoice.InvoiceNumber, 'Xero did not confirm the exact deposit invoice', 409)
  await db.prepare("UPDATE p_xero_jobs SET status='complete',invoice_id=?,completed_at=? WHERE proposal_id=?").bind(issued.InvoiceID, at, job.proposal_id).run()
 } catch {
  await db.prepare("UPDATE p_xero_jobs SET status='held',reason='Xero outcome or authority is uncertain. Reconcile in Xero; this request cannot be replayed.' WHERE proposal_id=?").bind(job.proposal_id).run()
 }
 return { id: job.proposal_id, job: await db.prepare('SELECT * FROM p_xero_jobs WHERE proposal_id=?').bind(job.proposal_id).first() }
}
