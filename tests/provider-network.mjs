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
