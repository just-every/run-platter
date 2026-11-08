import { need } from '../model'

export const zohoBase = 'https://www.zohoapis.com/crm/v8/'
export const zohoId = (value: unknown) => {
 const id = String(value ?? '')
 need(/^[1-9]\d{0,24}$/.test(id), 'Use a Zoho record id', 409)
 return id
}
export async function zohoJson(path: string, token: string, method = 'GET', body?: unknown) {
 try {
  const response = await fetch(zohoBase + path, { method, headers: { authorization: 'Zoho-oauthtoken ' + token, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'manual' })
  need(response.ok, 'Zoho did not confirm this request', 409)
  const raw = await response.text(); need(raw.length <= 262144, 'Zoho response was too large', 409)
  return JSON.parse(raw)
 } catch { need(false, 'Zoho did not confirm this request. Review the connection and source records.', 409) }
}
export async function verifyZoho(token: string, selected: string) {
 const result = await zohoJson('org', token), org = result.org
 need(Array.isArray(org) && org.length === 1 && String(org[0].id) === selected, 'Zoho did not confirm the selected organization', 409)
 const current = await zohoJson('users?type=CurrentUser', token)
 need(current.users?.length === 1 && current.users[0].status === 'active', 'Zoho did not confirm an active current user', 409)
}
export async function zohoRecord(module: string, id: string, token: string) {
 const response = await zohoJson(module + '/' + id, token)
 need(response.data?.length === 1 && String(response.data[0].id) === id, 'Zoho did not confirm the selected record', 409)
 return response.data[0]
}
