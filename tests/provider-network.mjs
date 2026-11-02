// Bridge the worker request implementation to Node's real network transport.
import assert from 'node:assert/strict'
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

// Captures the actual Xero transport boundary without replacing application doors.
export function xeroFixture() {
 const accountId='synthetic-platter-11001', token='synthetic-platter-11002', calls=[], state={ organizations:[accountId], contacts:[], invoices:[], currency:'USD', fail:'', before:undefined, observe:undefined }
 const accounts=[{Code:'200',Name:'Deposit revenue',AccountID:'synthetic-platter-11003',Type:'REVENUE',Status:'ACTIVE'},{Code:'300',Name:'Bank',Type:'BANK',Status:'ACTIVE'}]
 const outboundService=async request=>{
  const url=new URL(request.url)
  if(url.hostname!=='api.xero.com')return new Response(null,{status:204})
  const body=request.method==='GET'?undefined:await request.json(),call={path:url.pathname,method:request.method,tenant:request.headers.get('xero-tenant-id'),body}
  calls.push(call)
  if(request.headers.get('authorization')!=='Bearer '+token)return new Response(null,{status:401})
  if(state.fail==='revoked')return new Response(null,{status:401})
  if(state.observe)await state.observe(call)
  if(state.before)await state.before(call)
  if(url.pathname==='/connections')return Response.json(state.organizations.map(tenantId=>({tenantId,tenantType:'ORGANISATION'})))
  if(!state.organizations.includes(call.tenant))return new Response(null,{status:403})
  const kind=url.pathname.split('/').at(-1)
  if(kind==='Organisation')return Response.json({Organisations:[{OrganisationID:call.tenant,BaseCurrency:state.currency}]})
  if(kind==='Accounts')return Response.json({Accounts:accounts})
  if(kind==='Contacts'&&request.method==='GET')return Response.json({Contacts:state.contacts.filter(c=>!url.searchParams.has('where')||url.searchParams.get('where').includes(c.EmailAddress))})
  if(kind==='Contacts'){
   const contact={...body.Contacts[0],ContactID:'synthetic-platter-'+(11100+state.contacts.length),ContactStatus:'ACTIVE'}
   state.contacts.push(contact)
   if(state.fail==='contact-timeout')throw Error('synthetic transport timeout')
   return Response.json({Contacts:[contact]})
  }
  if(kind==='Invoices'){
   const invoice={...body.Invoices[0],InvoiceID:'synthetic-platter-'+(11200+state.invoices.length),Total:body.Invoices[0].LineItems.reduce((n,r)=>n+r.Quantity*r.UnitAmount,0)}
   state.invoices.push(invoice)
   if(state.fail==='invoice-timeout')throw Error('synthetic transport timeout')
   return Response.json({Invoices:[invoice]})
  }
  return new Response(null,{status:404})
 }
 return {accountId,token,calls,state,accounts,outboundService}
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
  if (kind === 'invoice') assert.ok(body.DocNumber.length <= 21, 'QuickBooks document numbers are bounded')
  const collection = kind === 'customer' ? customers : invoices, id = 'synthetic-platter-' + (9200 + customers.size + invoices.size)
  const value = { Id: id, ...body, ...(kind === 'invoice' ? { TotalAmt: body.Line.reduce((sum,line) => sum + line.Amount,0) } : {}) }
  collection.set(id,value)
  if (timeoutKind === kind) return new Response('synthetic-platter-provider-timeout', { status: 504 })
  return Response.json({ [kind === 'customer' ? 'Customer' : 'Invoice']: value })
 }
 return { calls, customers, invoices, token, company, item, incomeAccount: 'synthetic-platter-9102', outboundService, setHook: value => { hook = value }, setTimeout: value => { timeoutKind = value }, setMapping: value => { mappingAccount = value } }
}

export async function connectQuickbooks(h, fake, version = 0, settingsVersion = 0, cookie = h.owner) {
 await h.cmd('provider.connect', { provider: 'quickbooks', version, realmId: fake.company, token: fake.token, consent: true }, cookie)
 await h.cmd('accounting.configure', { version: settingsVersion, authority: 'quickbooks', accountId: fake.company, connectionVersion: version + 1, consent: true }, cookie)
}
export async function acceptedQuickbooksAgreement(h, title = 'Synthetic deposit agreement', clientId, extra = {}) {
 const client = clientId ? { id: clientId } : await h.cmd('client.save', { name: title + ' client', email: ['synthetic-platter-' + title.toLowerCase().replace(/[^a-z0-9]+/g,'-'), 'example.test'].join('@') })
 const proposal = await h.cmd('proposal.prepare', { clientId: client.id, title, scope: 'Agreed consulting delivery', optionOne: 'Reviewed consulting', priceOne: '1000.03', optionTwo: 'Extended consulting', priceTwo: '2400.00', depositPercent: '25', paymentTerms: { netDays: 30, milestones: [{ label: 'Delivery', percent: 100, event: 'Delivery complete' }], retainer: { percent: 10, startsOn: '2035-04-01', months: 2 } }, ...extra })
 await h.cmd('proposal.approve', { id: proposal.id, version: 1, revision: 1 })
 const share = await h.cmd('proposal.send', { id: proposal.id, version: 2 }), path = new URL(share.shareUrl).pathname
 assert.equal((await h.send(path + '/action?name=code.request', {})).status, 200)
 const code = (await h.state()).outbox.find(m => m.proposal_id === proposal.id && m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verified = await h.send(path + '/action?name=code.verify', { code }); assert.equal(verified.status, 200)
 const input = { name: 'Synthetic accounting signer', optionId: 'one', consent: true }
 assert.equal((await h.send(path + '/action?name=accept', input, verified.cookie)).status, 200)
 return { proposal, client, path, cookie: verified.cookie, input }
}
export const quickbooksReviewInput = (agreement, fake, customerId = 'new') => ({ proposalId: agreement.proposal.id, customerId, itemId: fake.item, incomeAccountId: fake.incomeAccount })
