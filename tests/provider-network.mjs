import assert from 'node:assert/strict'

// Bridge the worker request implementation to Node's real network transport.
export async function forwardProviderRequest(request){
 const body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer()
 const headers=new Headers(request.headers)
 for(const name of ['host','connection','content-length','transfer-encoding','accept-encoding'])headers.delete(name)
 let response
 try{response=await fetch(request.url,{method:request.method,headers,body,redirect:'manual'})}
 catch(error){console.log('Provider transport refusal: '+JSON.stringify({type:error.name,cause:error.cause?.code}));throw error}
 if(!response.ok){const error=(await response.clone().json()).error;console.log('Provider refusal: '+JSON.stringify({status:response.status,type:error?.type,code:error?.code,param:error?.param}))}
 return response
}

export function salesforceFixture() {
 const state = {
  opportunity: { Id: 'synthetic-platter-4700', Name: 'Synthetic Salesforce engagement', Description: 'Deliver independently reviewed campaign work.', Amount: 361.22, CurrencyIsoCode: 'USD', AccountId: 'synthetic-platter-4701', Pricebook2Id: 'synthetic-platter-4702', LastModifiedDate: '2030-01-01T00:00:00Z' },
  account: { Id: 'synthetic-platter-4701', Name: 'Synthetic Salesforce account', BillingStreet: '20 Synthetic Street', BillingCity: 'Austin', LastModifiedDate: '2030-01-01T00:00:00Z' },
  pricebook: { Id: 'synthetic-platter-4702', Name: 'Synthetic USD price book', IsActive: true, LastModifiedDate: '2030-01-01T00:00:00Z' },
  roles: [3, 4].map(n => ({ Id: 'synthetic-platter-47' + (n + 10), OpportunityId: 'synthetic-platter-4700', ContactId: 'synthetic-platter-470' + n, Contact: { Id: 'synthetic-platter-470' + n, AccountId: 'synthetic-platter-4701', FirstName: n === 3 ? 'Taylor' : 'Casey', LastName: 'Reed', Email: ['synthetic-platter-470' + n, 'example.test'].join('@'), Title: 'Director', LastModifiedDate: '2030-01-01T00:00:00Z' } })),
  lines: [
   { Id: 'synthetic-platter-4705', OpportunityId: 'synthetic-platter-4700', PricebookEntryId: 'synthetic-platter-4715', Quantity: 2.5, UnitPrice: 120.5, TotalPrice: 301.25, Description: 'Reviewed strategy', LastModifiedDate: '2030-01-01T00:00:00Z', HasQuantitySchedule: false, HasRevenueSchedule: false, PricebookEntry: { Id: 'synthetic-platter-4715', Pricebook2Id: 'synthetic-platter-4702', Product2Id: 'synthetic-platter-4725', IsActive: true, CurrencyIsoCode: 'USD', UnitPrice: 150, Product2: { Id: 'synthetic-platter-4725', Name: 'Campaign strategy', ProductCode: 'synthetic-platter-4805', IsActive: true, CanUseQuantitySchedule: false, CanUseRevenueSchedule: false } } },
   { Id: 'synthetic-platter-4706', OpportunityId: 'synthetic-platter-4700', PricebookEntryId: 'synthetic-platter-4716', Quantity: 3, UnitPrice: 19.99, TotalPrice: 59.97, HasQuantitySchedule: false, HasRevenueSchedule: false, PricebookEntry: { Id: 'synthetic-platter-4716', Pricebook2Id: 'synthetic-platter-4702', Product2Id: 'synthetic-platter-4726', IsActive: true, CurrencyIsoCode: 'USD', UnitPrice: 19.99, Product2: { Id: 'synthetic-platter-4726', Name: 'Asset licence', ProductCode: 'synthetic-platter-4806', IsActive: true, CanUseQuantitySchedule: false, CanUseRevenueSchedule: false } } },
  ],
  done: true,
 }
 const calls = []
 let beforeReply
 const request = async req => {
  const url = new URL(req.url)
  assert.equal(req.method, 'GET', 'reviewed drafting never writes to Salesforce')
  assert.equal(req.headers.get('authorization'), 'Bearer synthetic-platter-4707')
  calls.push({ host: url.hostname, path: url.pathname, query: url.searchParams.get('q'), fields: url.searchParams.get('fields') })
  if (beforeReply) await beforeReply(req)
  if (url.pathname === '/services/oauth2/userinfo') {
   assert.equal(url.hostname, 'login.salesforce.com')
   return Response.json({ organization_id: 'synthetic-platter-org', user_id: 'synthetic-platter-user', urls: { rest: 'https://synthetic-platter.salesforce.com/services/data/{version}/' } })
  }
  assert.equal(url.hostname, 'synthetic-platter.salesforce.com', 'read only the sealed verified Salesforce instance')
  const prefix = '/services/data/v61.0/'
  if (url.pathname === prefix + 'query') {
   const q = url.searchParams.get('q')
   assert.ok(q.endsWith("WHERE OpportunityId='" + state.opportunity.Id + "' ORDER BY Id"))
   const rows = q.includes(' FROM OpportunityContactRole ') ? state.roles : q.includes(' FROM OpportunityLineItem ') ? state.lines : null
   assert.ok(rows, 'use the actual Salesforce relationship queries')
   return Response.json({ done: state.done, totalSize: rows.length, records: structuredClone(rows) })
  }
  const records = { Opportunity: state.opportunity, Account: state.account, Pricebook2: state.pricebook }
  for (const [kind, row] of Object.entries(records)) if (url.pathname === prefix + 'sobjects/' + kind + '/' + row.Id) {
   assert.ok(url.searchParams.get('fields').split(',').includes('Id'))
   return Response.json(structuredClone(row))
  }
  return new Response(null, { status: 404 })
 }
 return { state, calls, request, beforeReply(fn) { beforeReply = fn }, selected: { opportunityId: state.opportunity.Id, companyId: state.account.Id, contactId: state.roles[0].ContactId } }
}
