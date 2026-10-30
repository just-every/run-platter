import { need, text } from '../model'

export type QuickBooksAuthority = () => Promise<{ token: string; company: string }>
export const providerId = (value: unknown) => {
 const id = text(value, 'a QuickBooks record id', 100)
 need(/^[A-Za-z0-9_-]+$/.test(id), 'Use a QuickBooks record id')
 return id
}
export async function quickbooks(authorize: QuickBooksAuthority, path: string, body?: unknown, requestId?: string) {
 const { token, company } = await authorize()
 const url = new URL('https://quickbooks.api.intuit.com/v3/company/' + encodeURIComponent(company) + path)
 url.searchParams.set('minorversion', '75')
 if (requestId) url.searchParams.set('requestid', requestId)
 const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: 'Bearer ' + token, accept: 'application/json', 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual', signal: AbortSignal.timeout(30000) })
 need(response.ok, 'QuickBooks refused the request. Review the retained accounting history before any further write.', 409)
 const raw = await response.text()
 need(raw.length <= 262144, 'QuickBooks returned an oversized response', 409)
 let value:any;try{value=JSON.parse(raw)}catch{need(false,'QuickBooks returned an invalid accounting response',409)}
 need(value && typeof value === 'object' && !value.Fault, 'QuickBooks returned an invalid accounting response', 409)
 return value
}
export async function customerMatches(authorize: QuickBooksAuthority, name: string) {
 // The fixed query grammar escapes provider string literals; identifiers never come from input.
 const escaped = name.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
 const value = await quickbooks(authorize, '/query?query=' + encodeURIComponent("select * from Customer where DisplayName = '" + escaped + "' maxresults 100"))
 need(value.QueryResponse && typeof value.QueryResponse === 'object', 'QuickBooks did not confirm customer matching', 409)
 const customers = value.QueryResponse.Customer ?? []
 need(Array.isArray(customers) && customers.length < 100, 'Customer matching needs manual reconciliation in QuickBooks', 409)
 return customers.map((c: any) => { need(c.Active !== false && c.DisplayName === name, 'QuickBooks returned an unexpected customer match', 409); return { id: providerId(c.Id), name: c.DisplayName } }).sort((a: any, b: any) => a.id.localeCompare(b.id))
}
export async function itemMapping(authorize: QuickBooksAuthority, itemId: string, accountId: string) {
 const item = (await quickbooks(authorize, '/item/' + encodeURIComponent(itemId))).Item
 const account = (await quickbooks(authorize, '/account/' + encodeURIComponent(accountId))).Account
 need(item?.Id === itemId && item.Active === true && ['Service','NonInventory'].includes(item.Type) && item.IncomeAccountRef?.value === accountId, 'Choose an active non-inventory item with this income account', 409)
 need(account?.Id === accountId && account.Active === true && account.AccountType === 'Income', 'Choose an active income account', 409)
 return { itemId, itemName: text(item.Name, 'the item name'), accountId, accountName: text(account.Name, 'the income account name') }
}

export function confirmedInvoice(record:any,body:any,totalCents:number) {
 const project=(v:any)=>({customer:v.CustomerRef?.value,date:v.TxnDate,due:v.DueDate,currency:v.CurrencyRef?.value,lines:v.Line?.filter((l:any)=>l.DetailType==='SalesItemLineDetail').map((l:any)=>({amount:l.Amount,item:l.SalesItemLineDetail?.ItemRef?.value,quantity:l.SalesItemLineDetail?.Qty,tax:l.SalesItemLineDetail?.TaxCodeRef?.value})),tax:v.TxnTaxDetail?.TotalTax??0,taxGroup:v.TxnTaxDetail?.TxnTaxCodeRef?.value??null})
 need(record&&Number.isFinite(record.TotalAmt)&&Math.round(record.TotalAmt*100)===totalCents&&JSON.stringify(project(record))===JSON.stringify(project(body)),'QuickBooks did not confirm the exact reviewed invoice lines, tax, dates and amount',409)
 return providerId(record.Id)
}
