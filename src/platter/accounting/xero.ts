import { need } from '../model'

export const canonical = (value: any): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)

export type XeroAuthorization = () => Promise<{ token: string; accountId: string }>
export async function xeroRequest(authorize: XeroAuthorization, resource: string, payload?: unknown) {
 const { token, accountId } = await authorize()
 try {
  const response = await fetch('https://api.xero.com/api.xro/2.0/' + resource, {
   method: payload === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(30000),
   headers: { authorization: 'Bearer ' + token, 'xero-tenant-id': accountId, accept: 'application/json', 'content-type': 'application/json' },
   ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  })
  need(response.ok, 'Xero refused the request. Review the connection and retained outcome before continuing.', 409)
  const raw = await response.text(); need(raw.length <= 262144, 'Xero returned an oversized response', 409)
  const value = JSON.parse(raw)
  need(value && typeof value === 'object' && !value.ErrorNumber, 'Xero did not confirm the request', 409)
  return value
 } catch { need(false, 'Xero did not confirm the outcome. No write will be replayed; reconcile in Xero.', 409) }
}
export async function xeroOrganization(token: string, accountId: string) {
 let connections: any
 try {
  const response = await fetch('https://api.xero.com/connections', { headers: { authorization: 'Bearer ' + token, accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(30000) })
  need(response.ok, 'Xero did not confirm the authorized organizations', 409)
  const raw = await response.text(); need(raw.length <= 262144, 'Xero returned an oversized response', 409); connections = JSON.parse(raw)
 } catch { need(false, 'Xero connection verification failed', 409) }
 need(Array.isArray(connections) && connections.filter(c => c.tenantId === accountId && c.tenantType === 'ORGANISATION').length === 1, 'Select an organization authorized by this Xero token', 409)
 const value = await xeroRequest(async () => ({ token, accountId }), 'Organisation')
 need(value.Organisations?.length === 1 && value.Organisations[0].OrganisationID === accountId && value.Organisations[0].BaseCurrency === 'USD', 'Only a verified USD Xero organization is supported', 409)
 return accountId
}
export async function xeroSources(authorize: XeroAuthorization, address: string) {
 const contacts = await xeroRequest(authorize, 'Contacts?where=' + encodeURIComponent('EmailAddress=="' + address.replaceAll('"', '\\"') + '"') + '&page=1')
 const accounts = await xeroRequest(authorize, 'Accounts')
 need(Array.isArray(contacts.Contacts) && contacts.Contacts.length < 100 && contacts.Contacts.every((c: any) => c.EmailAddress?.toLowerCase() === address.toLowerCase() && c.ContactStatus === 'ACTIVE' && typeof c.ContactID === 'string' && typeof c.Name === 'string'), 'Xero contact results are incomplete or unsupported; reconcile the contacts first', 409)
 need(contacts.Contacts.length <= 1, 'More than one Xero contact matches this address. Resolve the ambiguity in Xero before reviewing.', 409)
 need(Array.isArray(accounts.Accounts) && accounts.Accounts.length < 1000, 'Xero income accounts are unavailable', 409)
 return { contacts: contacts.Contacts.map((c: any) => ({ ContactID: c.ContactID, Name: c.Name, EmailAddress: c.EmailAddress })), accounts: accounts.Accounts.filter((a: any) => a.Type === 'REVENUE' && a.Status === 'ACTIVE' && (!a.CurrencyCode || a.CurrencyCode === 'USD')).map((a: any) => ({ Code: a.Code, Name: a.Name, AccountID: a.AccountID })) }
}
