import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson, salesforceInstanceOrigin } from '../connections'
import { proposalFields } from '../commands'
import { email, need, text, type Actor } from '../model'
import { crmDraftCommand } from './hubspot-draft'

const id = (value: unknown) => {
 const result = text(value, 'a Salesforce record id', 100)
 need(/^[A-Za-z0-9_-]+$/.test(result), 'Use a Salesforce record id')
 return result
}
const optional = (value: unknown, max = 1000) => value == null || value === '' ? '' : text(value, 'plain source text', max)
function decimal(value: unknown, quantity = false) {
 const written = String(value ?? '')
 need((quantity ? /^\d{1,7}(\.\d{1,3})?$/ : /^\d{1,8}(\.\d{1,2})?$/).test(written) && Number(written) > 0, 'The source quantity or amount is missing or unsupported', 409)
 return written
}
const cents = (value: string) => { const [whole, fraction = ''] = value.split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0')) }

export async function readOpportunity(env: Bindings, input: Record<string, unknown>) {
 const { connection, secret } = await providerCredential(env, 'workspace:salesforce')
 need(!connection.broken_at && secret.instanceOrigin, 'Reconnect Salesforce with a verified instance before reading opportunities', 409)
 const base = salesforceInstanceOrigin(secret.instanceOrigin) + '/services/data/v61.0/'
 const opportunityId = id(input.opportunityId ?? input.dealId)
 const record = async (kind: string, recordId: string, fields: string) => {
  const row = await providerJson(base + 'sobjects/' + kind + '/' + encodeURIComponent(recordId) + '?fields=' + fields, secret.token)
  need(row.Id === recordId && !row.IsDeleted, 'Salesforce did not confirm the selected record', 409)
  return row
 }
 const query = async (statement: string) => {
  const result = await providerJson(base + 'query?q=' + encodeURIComponent(statement), secret.token)
  need(result.done === true && !result.nextRecordsUrl && Array.isArray(result.records) && result.records.length > 0 && result.records.length <= 50 && result.totalSize === result.records.length, 'Missing, incomplete or large Salesforce associations need manual preparation', 409)
  return result.records as any[]
 }
 const opportunity = await record('Opportunity', opportunityId, 'Id,Name,Description,Amount,CurrencyIsoCode,AccountId,Pricebook2Id,LastModifiedDate')
 const accountId = id(opportunity.AccountId)
 const company = await record('Account', accountId, 'Id,Name,BillingStreet,BillingCity,BillingState,BillingPostalCode,BillingCountry,LastModifiedDate')
 const roles = await query("SELECT Id,OpportunityId,ContactId,Contact.Id,Contact.AccountId,Contact.FirstName,Contact.LastName,Contact.Email,Contact.Title,Contact.LastModifiedDate FROM OpportunityContactRole WHERE OpportunityId='" + opportunityId + "' ORDER BY Id")
 need(roles.every(row => row.OpportunityId === opportunityId && row.Contact && row.ContactId === row.Contact.Id && row.Contact.AccountId === accountId) && new Set(roles.map(row => row.ContactId)).size === roles.length, 'The opportunity has ambiguous or unrelated contacts; reconcile them in Salesforce', 409)
 const choices = { dealId: opportunityId, opportunityId, companies: [{ id: company.Id, name: optional(company.Name) }], contacts: roles.map(row => ({ id: row.ContactId, name: [row.Contact.FirstName, row.Contact.LastName].filter(Boolean).join(' '), email: optional(row.Contact.Email, 254) })) }
 if (!input.companyId || !input.contactId) return { connection, choices }
 need(id(input.companyId) === accountId, 'Select the account belonging to this opportunity', 409)
 const role = roles.find(row => row.ContactId === id(input.contactId))
 need(role, 'Select a contact belonging to this opportunity', 409)
 need(opportunity.CurrencyIsoCode === 'USD', 'Only explicitly USD opportunities can start a draft', 409)
 const pricebookId = id(opportunity.Pricebook2Id)
 const pricebook = await record('Pricebook2', pricebookId, 'Id,Name,IsActive,LastModifiedDate')
 need(pricebook.IsActive === true, 'The opportunity needs an active price book', 409)
 const rows = await query("SELECT Id,OpportunityId,PricebookEntryId,Quantity,UnitPrice,TotalPrice,Description,LastModifiedDate,HasQuantitySchedule,HasRevenueSchedule,PricebookEntry.Id,PricebookEntry.Pricebook2Id,PricebookEntry.Product2Id,PricebookEntry.IsActive,PricebookEntry.CurrencyIsoCode,PricebookEntry.UnitPrice,PricebookEntry.Product2.Id,PricebookEntry.Product2.Name,PricebookEntry.Product2.ProductCode,PricebookEntry.Product2.IsActive,PricebookEntry.Product2.CanUseQuantitySchedule,PricebookEntry.Product2.CanUseRevenueSchedule FROM OpportunityLineItem WHERE OpportunityId='" + opportunityId + "' ORDER BY Id")
 need(new Set(rows.map(row => row.Id)).size === rows.length, 'The opportunity has duplicate product rows', 409)
 const lines = rows.map(row => {
  const entry = row.PricebookEntry, product = entry?.Product2
  need(row.OpportunityId === opportunityId && entry && product && entry.Id === row.PricebookEntryId && entry.Pricebook2Id === pricebookId && product.Id === entry.Product2Id && entry.IsActive === true && product.IsActive === true, 'Missing or inconsistent price-book products need manual preparation', 409)
  need(entry.CurrencyIsoCode === 'USD', 'Only USD price-book products can start a draft', 409)
  need(row.HasQuantitySchedule === false && row.HasRevenueSchedule === false && product.CanUseQuantitySchedule === false && product.CanUseRevenueSchedule === false, 'Scheduled or recurring products need manual preparation', 409)
  return { id: id(row.Id), pricebookEntryId: id(entry.Id), productId: id(product.Id), productCode: optional(product.ProductCode), pricebookUnitPrice: decimal(entry.UnitPrice), updatedAt: optional(row.LastModifiedDate), name: text(product.Name, 'a product name'), description: optional(row.Description), quantity: decimal(row.Quantity, true), unitPrice: decimal(row.UnitPrice), amount: decimal(row.TotalPrice) }
 })
 const contact = role.Contact
 const source = {
  provider: 'salesforce', accountId: connection.account_id, dealId: opportunityId, opportunityId, updatedAt: optional(opportunity.LastModifiedDate),
  name: text(opportunity.Name, 'an opportunity name'), description: optional(opportunity.Description, 10000), currency: 'USD', amount: decimal(opportunity.Amount),
  pricebook: { id: pricebookId, name: optional(pricebook.Name), updatedAt: optional(pricebook.LastModifiedDate) },
  company: { id: accountId, updatedAt: optional(company.LastModifiedDate), name: text(company.Name, 'an account name'), address: ['BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry'].map(key => optional(company[key])).filter(Boolean).join(', ') },
  contact: { id: id(contact.Id), roleId: id(role.Id), updatedAt: optional(contact.LastModifiedDate), firstName: optional(contact.FirstName), lastName: optional(contact.LastName), name: text([contact.FirstName, contact.LastName].filter(Boolean).join(' '), 'a contact name'), email: email(contact.Email), title: optional(contact.Title) }, lines,
 }
 const content = proposalFields({ clientId: 'review', title: source.name, scope: (input.crmScope ?? input.scope) || source.description, depositPercent: 25,
  packages: [{ id: 'one', label: 'Opportunity scope' }], pricingTables: [{ optionId: 'one', name: 'Opportunity products', lines: lines.map(line => ({ name: line.name, description: line.description, quantity: line.quantity, unit: 'each', unitPrice: line.unitPrice })) }],
 })
 const table = content.options[0].tables![0]
 need(cents(source.amount) === table.subtotalCents && lines.every((line, index) => cents(line.amount) === table.lines[index].lineTotalCents), 'Opportunity totals do not match the exact priced rows; review in Salesforce first', 409)
 return { connection, choices, source, content }
}

export function salesforceDraftCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 return crmDraftCommand(env, actor, name, input, 'salesforce', readOpportunity)
}
