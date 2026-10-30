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

// A receiver fake stores writes before simulating a lost acknowledgement.
export function quickbooksFixture() {
 const calls = [], customers = new Map(), invoices = new Map(), requestIds = new Set()
 let hook, timeoutKind, mappingAccount = 'synthetic-platter-9102'
 const token = 'synthetic-platter-9100', company = 'synthetic-platter-9101', item = 'synthetic-platter-9103'
 const outboundService = async request => {
  const url = new URL(request.url)
  if (url.hostname !== 'quickbooks.api.intuit.com') throw Error('Unexpected provider destination')
  if (request.headers.get('authorization') !== 'Bearer ' + token) throw Error('Unexpected QuickBooks credential')
  const body = request.method === 'POST' ? await request.json() : undefined
  calls.push({ method: request.method, url: request.url, body })
  if (hook) await hook(request)
  const kind = url.pathname.split('/').at(-1)
  if (url.pathname.includes('/companyinfo/')) return Response.json({ CompanyInfo: { CompanyName: 'Synthetic accounting company' } })
  if (kind === 'query') {
   const match = url.searchParams.get('query').match(/DisplayName = '((?:\\.|[^'])*)'/)
   const name = match?.[1].replace(/\\(.)/g,'$1')
   return Response.json({ QueryResponse: { Customer: [...customers.values()].filter(c => c.DisplayName === name) } })
  }
  if (url.pathname.includes('/item/')) return Response.json({ Item: { Id: item, Name: 'Reviewed deposit service', Active: true, Type: 'Service', IncomeAccountRef: { value: mappingAccount } } })
  if (url.pathname.includes('/account/')) return Response.json({ Account: { Id: 'synthetic-platter-9102', Name: 'Consulting income', Active: true, AccountType: 'Income' } })
  if (request.method !== 'POST' || !['customer','invoice'].includes(kind)) throw Error('Unexpected QuickBooks operation')
  const requestId = url.searchParams.get('requestid')
  if (!requestId || requestIds.has(requestId)) throw Error('A QuickBooks write was replayed')
  requestIds.add(requestId)
  const collection = kind === 'customer' ? customers : invoices, id = 'synthetic-platter-' + (9200 + customers.size + invoices.size)
  const value = { Id: id, ...body, ...(kind === 'invoice' ? { TotalAmt: body.Line.reduce((sum,line) => sum + line.Amount,0) } : {}) }
  collection.set(id,value)
  if (timeoutKind === kind) return new Response('synthetic-platter-provider-timeout', { status: 504 })
  return Response.json({ [kind === 'customer' ? 'Customer' : 'Invoice']: value })
 }
 return { calls, customers, invoices, token, company, item, incomeAccount: 'synthetic-platter-9102', outboundService, setHook: value => { hook = value }, setTimeout: value => { timeoutKind = value }, setMapping: value => { mappingAccount = value } }
}
