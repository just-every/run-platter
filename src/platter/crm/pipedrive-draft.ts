import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { email, need, text, type Actor } from '../model'
import { contentFor, reviewedDraftCommand } from './hubspot-draft'

const base = 'https://api.pipedrive.com/v1/'
const identifier = (value: unknown) => {
 const id = String(value ?? '')
 need(/^[1-9]\d{0,14}$/.test(id), 'Use a Pipedrive record id', 409)
 return id
}
const linkedId = (value: any) => identifier(value && typeof value === 'object' ? value.value : value)
const optional = (value: unknown, max = 1000) => value == null || value === '' ? '' : text(value, 'plain source text', max)
function decimal(value: unknown, places: number, label: string) {
 const result = String(value ?? '')
 need(new RegExp('^\\d{1,8}(\\.\\d{1,' + places + '})?$').test(result), 'The source ' + label + ' is missing or unsupported', 409)
 return result
}
const cents = (value: unknown) => {
 const [whole, fraction = ''] = decimal(value, 2, 'amount').split('.')
 return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
async function record(kind: string, id: string, token: string) {
 const response = await providerJson(base + kind + '/' + id, token), row = response.data
 need(response.success === true && row && identifier(row.id) === id && row.active_flag !== false && row.is_deleted !== true && row.deleted !== true && row.status !== 'deleted', 'Pipedrive did not confirm the selected record', 409)
 return row
}
export async function readPipedriveDeal(env: Bindings, input: Record<string, unknown>) {
 const { connection, secret } = await providerCredential(env, 'workspace:pipedrive')
 need(!connection.broken_at, 'Reconnect Pipedrive before reading deals', 409)
 const identity = await providerJson('https://api.pipedrive.com/v1/users/me', secret.token)
 need(identity.success === true && identity.data?.active_flag === true && String(identity.data.company_id) === connection.account_id, 'Pipedrive no longer confirms this company', 409)
 const dealId = identifier(input.dealId), deal = await record('deals', dealId, secret.token)
 const companyId = linkedId(deal.org_id), contactId = linkedId(deal.person_id)
 const company = await record('organizations', companyId, secret.token), contact = await record('persons', contactId, secret.token)
 need(linkedId(contact.org_id) === companyId, 'The selected person must belong to the deal organization', 409)
 const choices = { dealId, companies: [{ id: companyId, name: optional(company.name) }], contacts: [{ id: contactId, name: optional(contact.name), email: '' }] }
 if (!input.companyId || !input.contactId) return { connection, choices }
 need(identifier(input.companyId) === companyId && identifier(input.contactId) === contactId, 'Select the organization and person associated with this deal', 409)
 need(Array.isArray(contact.email) && contact.email.length === 1, 'The person needs one unambiguous email address before review', 409)
 need(deal.currency === 'USD', 'Only explicitly USD deals can start a draft', 409)
 const attached = await providerJson(base + 'deals/' + dealId + '/products?start=0&limit=50', secret.token)
 need(attached.success === true && Array.isArray(attached.data) && attached.data.length > 0 && attached.data.length <= 50 && attached.additional_data?.pagination?.more_items_in_collection === false, 'Incomplete or large product lists need manual preparation', 409)
 const ids = attached.data.map((row: any) => identifier(row.id))
 need(new Set(ids).size === ids.length, 'The deal has ambiguous product rows', 409)
 const lines = await Promise.all(attached.data.map(async (row: any) => {
  const id = identifier(row.id), productId = identifier(row.product_id), product = await record('products', productId, secret.token)
  need(product.active_flag === true, 'The source product must be confirmed active', 409)
  need(row.enabled_flag === true && row.currency === 'USD', 'Only enabled USD products can start a draft', 409)
  need(cents(row.tax) === 0 && cents(row.discount) === 0 && row.billing_frequency === 'one-time' && !row.billing_start_date && !row.billing_frequency_cycles, 'Taxed, discounted or recurring products need manual preparation', 409)
  const quantity = decimal(row.quantity, 3, 'quantity'), unitPrice = decimal(row.item_price, 2, 'unit price')
  need(Number(quantity) > 0 && Number(unitPrice) > 0, 'The source quantity and price must be positive', 409)
  return { id, productId, updatedAt: optional(product.update_time), name: text(row.name, 'a product row name', 200), productName: text(product.name, 'a product name', 200), code: optional(product.code), description: optional(product.description), quantity, unitPrice, amount: decimal(row.sum, 2, 'product total') }
 }))
 const source = {
  provider: 'pipedrive', accountId: connection.account_id, dealId, updatedAt: optional(deal.update_time),
  name: text(deal.title, 'a deal name', 200), description: optional(deal.description, 10000), currency: 'USD', amount: decimal(deal.value, 2, 'deal total'),
  company: { id: companyId, updatedAt: optional(company.update_time), name: text(company.name, 'an organization name', 200), address: optional(company.address) },
  contact: { id: contactId, updatedAt: optional(contact.update_time), firstName: optional(contact.first_name), lastName: optional(contact.last_name), name: text(contact.name, 'a person name', 200), email: email(contact.email[0].value), title: optional(contact.job_title) }, lines,
 }
 choices.contacts[0].email = source.contact.email
 const content = contentFor(source, (input.crmScope ?? input.scope) || undefined), table = content.options[0].tables![0]
 need(cents(source.amount) === table.subtotalCents && lines.every((line: any, index: number) => cents(line.amount) === table.lines[index].lineTotalCents), 'Source totals do not match the exact priced rows; review in Pipedrive first', 409)
 return { connection, choices, source, content }
}
export async function pipedriveDraftCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(['crm.pipedrive.review', 'crm.pipedrive.apply'].includes(name), 'Unknown Pipedrive draft action', 404)
 return reviewedDraftCommand(env, actor, name, input, 'pipedrive', readPipedriveDeal)
}
