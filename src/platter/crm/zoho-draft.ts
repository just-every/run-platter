import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { email, need, text, type Actor } from '../model'
import { contentFor, reviewedDraftCommand } from './hubspot-draft'

import { zohoId, zohoRecord, verifyZoho } from './zoho-http'

const optional = (value: unknown, max = 1000) => value == null || value === '' ? '' : text(value, 'plain source text', max)
export function sourceDecimal(value: unknown, places = 2) {
 const result = String(value ?? '')
 need(new RegExp('^\\d{1,8}(\\.\\d{1,' + places + '})?$').test(result), 'The source amount or quantity is missing or unsupported', 409)
 return result
}
export const sourceCents = (value: unknown) => {
 const [whole, fraction = ''] = sourceDecimal(value).split('.')
 return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
export async function readZohoDeal(env: Bindings, input: Record<string, unknown>) {
 const { connection, secret } = await providerCredential(env, 'workspace:zoho')
 need(!connection.broken_at, 'Reconnect Zoho before reading deals', 409)
 await verifyZoho(secret.token, connection.account_id)
 const dealId = zohoId(input.dealId), deal = await zohoRecord('Deals', dealId, secret.token)
 const companyId = zohoId(deal.Account_Name?.id), contactId = zohoId(deal.Contact_Name?.id)
 const company = await zohoRecord('Accounts', companyId, secret.token), contact = await zohoRecord('Contacts', contactId, secret.token)
 need(String(contact.Account_Name?.id) === companyId, 'The contact must belong to the deal account', 409)
 const quoteId = zohoId(input.quoteId), quote = await zohoRecord('Quotes', quoteId, secret.token)
 need(String(quote.Deal_Name?.id) === dealId && String(quote.Account_Name?.id) === companyId && String(quote.Contact_Name?.id) === contactId, 'Select a quote belonging to this deal, account and contact', 409)
 const choices = { dealId, quoteId, companies: [{ id: companyId, name: optional(company.Account_Name) }], contacts: [{ id: contactId, name: optional(contact.Full_Name), email: '' }] }
 if (!input.companyId || !input.contactId) return { connection, choices }
 need(zohoId(input.companyId) === companyId && zohoId(input.contactId) === contactId, 'Select the account and contact associated with this deal', 409)
 need(deal.Currency === 'USD' && quote.Currency === 'USD', 'Only explicitly USD deals and quotes can start a draft', 409)
 need(sourceCents(quote.Discount) === 0 && sourceCents(quote.Tax) === 0 && sourceCents(quote.Adjustment) === 0, 'Adjusted, discounted or taxed quotes need manual preparation', 409)
 need(Array.isArray(quote.Product_Details) && quote.Product_Details.length > 0 && quote.Product_Details.length <= 50, 'The quote needs a complete product table', 409)
 const lines = await Promise.all(quote.Product_Details.map(async (line: any) => {
  const productId = zohoId(line.product?.id), product = await zohoRecord('Products', productId, secret.token)
  need(product.Product_Active === true && !product.Recurring_Description && !product.Billing_Frequency, 'Inactive or recurring products need manual preparation', 409)
  need(sourceCents(line.Discount) === 0 && sourceCents(line.Tax) === 0 && Array.isArray(line.line_tax) && line.line_tax.length === 0, 'Taxed or discounted product rows need manual preparation', 409)
  const quantity = sourceDecimal(line.quantity, 3), unitPrice = sourceDecimal(line.list_price)
  need(Number(quantity) > 0 && Number(unitPrice) > 0 && sourceCents(line.total) === sourceCents(line.net_total), 'The product quantity, price or total is unsupported', 409)
  return { id: zohoId(line.id), productId, updatedAt: optional(product.Modified_Time), name: text(product.Product_Name, 'a product name', 200), description: optional(line.product_description), code: optional(product.Product_Code), quantity, unitPrice, amount: sourceDecimal(line.total) }
 }))
 need(new Set(lines.map(line => line.id)).size === lines.length, 'The quote has ambiguous product rows', 409)
 const source = { provider: 'zoho', accountId: connection.account_id, dealId, quoteId, quoteUpdatedAt: optional(quote.Modified_Time), updatedAt: optional(deal.Modified_Time), name: text(deal.Deal_Name, 'a deal name', 200), description: optional(deal.Description, 10000), currency: 'USD', amount: sourceDecimal(deal.Amount),
  company: { id: companyId, updatedAt: optional(company.Modified_Time), name: text(company.Account_Name, 'an account name', 200), address: ['Billing_Street', 'Billing_City', 'Billing_State', 'Billing_Code', 'Billing_Country'].map(k => optional(company[k])).filter(Boolean).join(', ') },
  contact: { id: contactId, updatedAt: optional(contact.Modified_Time), name: text(contact.Full_Name, 'a contact name', 200), firstName: optional(contact.First_Name), lastName: optional(contact.Last_Name), email: email(contact.Email), title: optional(contact.Title) }, lines }
 choices.contacts[0].email = source.contact.email
 const content = contentFor(source, (input.crmScope ?? input.scope) || undefined), table = content.options[0].tables![0]
 need(sourceCents(deal.Amount) === table.subtotalCents && sourceCents(quote.Sub_Total) === table.subtotalCents && sourceCents(quote.Grand_Total) === table.subtotalCents && lines.every((line, index) => sourceCents(line.amount) === table.lines[index].lineTotalCents), 'Deal, quote and product totals must match the exact priced rows', 409)
 return { connection, choices, source, content }
}
export async function zohoDraftCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(['crm.zoho.review', 'crm.zoho.apply'].includes(name), 'Unknown Zoho draft action', 404)
 return reviewedDraftCommand(env, actor, name, input, 'zoho', readZohoDeal)
}
