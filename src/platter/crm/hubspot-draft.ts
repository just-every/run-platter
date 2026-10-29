import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { proposalFields } from '../commands'
import { currentTime } from '../expiry-time'
import { commit, email, hash, need, snapshot, text, type Actor } from '../model'
import { administrators, permitted } from '../permissions'
import { defaultStatements } from '../workspace'
import { copiedContactFields } from '../variables'

const connectionId = 'workspace:hubspot'
const base = 'https://api.hubapi.com/crm/v3/objects/'
const identifier = (value: unknown) => { const id = text(value, 'a HubSpot record id', 100); need(/^[A-Za-z0-9_-]+$/.test(id), 'Use a HubSpot record id'); return id }
const string = (value: unknown, label: string, max = 200) => text(value, label, max)
const optional = (value: unknown, max = 1000) => value == null || value === '' ? '' : text(value, 'plain source text', max)
const canonical = (value: any): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
function associations(deal: any, kind: string) {
 const value = deal.associations?.[kind]
 need(value && Array.isArray(value.results) && value.results.length > 0, 'The deal needs associated ' + kind + ' before review', 409)
 need(!value.paging?.next && value.results.length <= 50, 'Review of incomplete or large associations is unsupported', 409)
 const ids = value.results.map((item: any) => identifier(item.id)).sort()
 need(new Set(ids).size === ids.length, 'The deal has ambiguous associated records', 409)
 return ids as string[]
}
async function sourceRecord(kind: string, id: string, properties: string, token: string) {
 const row = await providerJson(base + kind + '/' + encodeURIComponent(id) + '?properties=' + properties, token)
 need(String(row.id) === id && !row.archived && row.properties && !Array.isArray(row.properties), 'The provider did not confirm the selected record', 409)
 return row
}
async function readDeal(env: Bindings, input: Record<string, unknown>) {
 const { connection, secret } = await providerCredential(env, connectionId)
 need(!connection.broken_at, 'Reconnect HubSpot before reading deals', 409)
 const dealId = identifier(input.dealId)
 const deal = await providerJson(base + 'deals/' + encodeURIComponent(dealId) + '?properties=dealname,description,amount,deal_currency_code&associations=companies,contacts,line_items', secret.token)
 need(String(deal.id) === dealId && !deal.archived && deal.properties, 'The provider did not confirm this deal', 409)
 const companies = associations(deal, 'companies'), contacts = associations(deal, 'contacts'), lineIds = associations(deal, 'line_items')
 const companyRows = await Promise.all(companies.map(id => sourceRecord('companies', id, 'name,address,city,state,zip,country', secret.token)))
 const contactRows = await Promise.all(contacts.map(id => sourceRecord('contacts', id, 'firstname,lastname,email,jobtitle', secret.token)))
 const choices = { dealId, companies: companyRows.map(r => ({ id: String(r.id), name: optional(r.properties.name) })), contacts: contactRows.map(r => ({ id: String(r.id), name: [r.properties.firstname, r.properties.lastname].filter(Boolean).join(' '), email: optional(r.properties.email, 254) })) }
 if (!input.companyId || !input.contactId) return { connection, choices }
 const company = companyRows.find(r => String(r.id) === identifier(input.companyId)), contact = contactRows.find(r => String(r.id) === identifier(input.contactId))
 need(company && contact, 'Select a company and contact associated with this deal', 409)
 const cp = contact.properties, dp = deal.properties
 need(dp.deal_currency_code === 'USD', 'Only explicitly USD deals can start a draft', 409)
 const lines = await Promise.all(lineIds.map(async id => {
  const row = await sourceRecord('line_items', id, 'name,description,quantity,price,amount,discount,hs_discount_percentage,recurringbillingfrequency,hs_recurring_billing_period,hs_line_item_currency_code,hs_tax_rate', secret.token), p = row.properties
  need(!p.hs_line_item_currency_code || p.hs_line_item_currency_code === 'USD', 'Only USD line items can start a draft', 409)
  need([p.discount, p.hs_discount_percentage, p.hs_tax_rate].every(v => v == null || v === '' || Number(v) === 0) && [p.recurringbillingfrequency, p.hs_recurring_billing_period].every(v => v == null || v === '' || v === 'one_time'), 'Discounted, taxed or recurring source items need manual preparation', 409)
  need(typeof p.quantity === 'string' && /^\d{1,7}(\.\d{1,3})?$/.test(p.quantity) && Number(p.quantity) > 0, 'The source quantity is missing or unsupported', 409)
  need(typeof p.price === 'string' && /^\d{1,8}(\.\d{1,2})?$/.test(p.price) && Number(p.price) > 0, 'The source unit price is missing or unsupported', 409)
  return { id, updatedAt: optional(row.updatedAt), name: string(p.name, 'a line item name'), description: optional(p.description), quantity: p.quantity, unitPrice: p.price, amount: optional(p.amount) }
 }))
 const source = {
  provider: 'hubspot', accountId: connection.account_id, dealId, updatedAt: optional(deal.updatedAt),
  name: string(dp.dealname, 'a deal name'), description: optional(dp.description, 10000), currency: 'USD', amount: string(dp.amount, 'the deal amount'),
  company: { id: String(company.id), updatedAt: optional(company.updatedAt), name: string(company.properties.name, 'a company name'), address: ['address', 'city', 'state', 'zip', 'country'].map(k => optional(company.properties[k])).filter(Boolean).join(', ') },
  contact: { id: String(contact.id), updatedAt: optional(contact.updatedAt), firstName: optional(cp.firstname), lastName: optional(cp.lastname), name: string([cp.firstname, cp.lastname].filter(Boolean).join(' '), 'a contact name'), email: email(cp.email), title: optional(cp.jobtitle) }, lines,
 }
 const content = contentFor(source, input.scope || undefined)
 const table = content.options[0].tables![0]
 const cents = (value: string) => { need(/^\d{1,8}(\.\d{1,2})?$/.test(value), 'The source amount is unsupported', 409); const [whole, fraction = ''] = value.split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0')) }
 need(cents(source.amount) === table.subtotalCents && lines.every((line, index) => !line.amount || cents(line.amount) === table.lines[index].lineTotalCents), 'Source totals do not match the exact priced rows; review in HubSpot first', 409)
 return { connection, choices, source, content }
}
function contentFor(source: any, scope: unknown) {
 return proposalFields({ clientId: 'review', title: source.name, scope: scope ?? source.description, depositPercent: 25,
  packages: [{ id: 'one', label: 'Deal scope' }], pricingTables: [{ optionId: 'one', name: 'Deal line items', lines: source.lines.map((line: any) => ({ name: line.name, description: line.description, quantity: line.quantity, unit: 'each', unitPrice: line.unitPrice })) }],
 })
}
function connectionGuard(connection: any) {
 return { sql: "EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id=? AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL)", values: [connectionId, connection.account_id, connection.version] }
}
export async function hubspotDraftCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(administrators.includes(actor.role), 'Only owner and admins start drafts from connected deals', 403)
 const db = env.DB, at = await currentTime(db)
 if (name === 'crm.deal.review') {
  const read = await readDeal(env, input)
  if (!read.source) {
   await commit(db, actor, [], true, connectionGuard(read.connection))
   return { crmReview: true, ...read.choices, draftScope: String(input.scope ?? ''), held: 'Explicitly select the company and contact to review.' }
  }
  const content = read.content!, fields = JSON.stringify(copiedContactFields(read.source.contact, read.source.company.address))
  const client = await db.prepare('SELECT * FROM p_clients WHERE email=?').bind(read.source.contact.email).first<any>()
  need(!client || client.name === read.source.company.name && canonical(JSON.parse(client.variable_fields)) === canonical(JSON.parse(fields)), 'This contact already belongs to different client details; reconcile the client before review', 409)
  const clientJson = client ? canonical(client) : null, sourceJson = canonical(read.source), contentJson = canonical(content), digest = await hash(sourceJson + '\n' + contentJson + '\n' + clientJson), id = crypto.randomUUID()
  await commit(db, actor, [db.prepare('INSERT INTO p_crm_draft_reviews(id,actor_id,actor_role,actor_version,connection_version,account_id,client_json,source_json,content_json,digest,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id, actor.id, actor.role, actor.memberVersion ?? 0, read.connection.version, read.connection.account_id, clientJson, sourceJson, contentJson, digest, at)], true, connectionGuard(read.connection))
  return { crmReview: true, id, digest, existingClient: Boolean(client), source: read.source, content, ...read.choices }
 }
 need(name === 'crm.deal.apply', 'Unknown CRM draft action', 404)
 need(input.consent === true || input.consent === 'yes', 'Confirm the reviewed source and copied draft')
 const review = await db.prepare('SELECT * FROM p_crm_draft_reviews WHERE id=? AND actor_id=?').bind(text(input.id, 'a review'), actor.id).first<any>()
 need(review && !review.applied_proposal_id && review.created_at > at - 900000, 'Review expired or was already applied; read the deal again', 409)
 need(review.digest === input.digest && review.actor_role === actor.role && review.actor_version === (actor.memberVersion ?? 0), 'Reviewed bytes or authority changed; review again', 409)
 const source = JSON.parse(review.source_json), content = JSON.parse(review.content_json)
 const { connection } = await providerCredential(env, connectionId)
 need(connection.version === review.connection_version && connection.account_id === review.account_id, 'The connection changed; review the deal again', 409)
 const fresh = await readDeal(env, { dealId: source.dealId, companyId: source.company.id, contactId: source.contact.id, scope: content.scope })
 need(canonical(fresh.source) === review.source_json, 'The deal changed after review; read it again', 409)
 const client = review.client_json ? JSON.parse(review.client_json) : null
 const id = crypto.randomUUID(), clientId = client?.id ?? crypto.randomUUID(), row = { ...content, id, client_id: clientId, revision: 1, currency: 'USD' }
 const guard = connectionGuard(connection)
 guard.sql += ' AND EXISTS(SELECT 1 FROM p_crm_draft_reviews WHERE id=? AND digest=? AND applied_proposal_id IS NULL)'
 guard.values.push(review.id, review.digest)
 guard.sql += client ? ' AND EXISTS(SELECT 1 FROM p_clients WHERE id=? AND name=? AND email=? AND variable_fields=? AND version=?)' : ' AND NOT EXISTS(SELECT 1 FROM p_clients WHERE email=?)'
 guard.values.push(...(client ? [client.id, client.name, client.email, client.variable_fields, client.version] : [source.contact.email]))
 await commit(db, actor, [
  ...(client ? [] : [db.prepare('INSERT INTO p_clients(id,name,email,variable_fields) VALUES(?,?,?,?)').bind(clientId, source.company.name, source.contact.email, JSON.stringify(copiedContactFields(source.contact, source.company.address)))]),
  db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,document,section_conditions) VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?,'{}')").bind(id, clientId, row.title, row.scope, row.terms, row.deposit_bps, JSON.stringify(row.options), actor.email, at, 'USD', actor.id, actor.email, JSON.stringify(row.document)),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id, JSON.stringify(snapshot(row)), actor.email, at, 'USD'),
  ...await defaultStatements(db, id),
  db.prepare('INSERT INTO p_crm_draft_sources(proposal_id,provider,account_id,connection_version,deal_id,company_id,contact_id,source_json,digest,reviewed_by,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id, 'hubspot', review.account_id, review.connection_version, source.dealId, source.company.id, source.contact.id, review.source_json, review.digest, actor.id, review.created_at),
  db.prepare('UPDATE p_crm_draft_reviews SET applied_proposal_id=? WHERE id=?').bind(id, review.id),
 ], true, guard)
 return { id, revision: 1, version: 1 }
}
export async function crmDraftSources(env: Bindings, actor: Actor, id: unknown) {
 need(administrators.includes(actor.role), 'Only owner and admins inspect CRM source history', 403)
 await permitted(env.DB, actor, id)
 const row = await env.DB.prepare('SELECT * FROM p_crm_draft_sources WHERE proposal_id=?').bind(id).first<any>()
 return row ? { ...row, source: JSON.parse(row.source_json), source_json: undefined } : null
}
