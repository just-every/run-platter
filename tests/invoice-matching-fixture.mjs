import assert from 'node:assert/strict'
export const invoiceAccount='synthetic-platter-4700',invoiceToken='synthetic-platter-4701',invoiceCustomer='synthetic-platter-4702',invoiceExternal='synthetic-platter-4703'
export function invoiceFixture(){
 const calls=[],invoice={Id:invoiceExternal,CustomerRef:{value:invoiceCustomer},CurrencyRef:{value:'USD'},TotalAmt:1050,SyncToken:'1',DocNumber:'Synthetic invoice',TxnDate:'2030-06-01'},customer={Id:invoiceCustomer,DisplayName:'Synthetic reviewed customer',Active:true}
 let hook,shape
 const outboundService=async request=>{
  const url=new URL(request.url);calls.push({url:url.href,method:request.method})
  assert.equal(request.method,'GET','matching never writes to QuickBooks');assert.equal(request.headers.get('authorization'),'Bearer '+invoiceToken)
  assert.equal(url.hostname,'quickbooks.api.intuit.com');assert.equal(url.pathname.split('/')[3],invoiceAccount)
  if(hook)await hook(request)
  if(url.pathname.includes('/companyinfo/'))return Response.json({CompanyInfo:{Id:invoiceAccount,CompanyName:'Synthetic company'}})
  if(shape)return Response.json(shape)
  if(url.pathname.includes('/invoice/'))return Response.json({Invoice:{...invoice,PrivateNote:'synthetic-platter-4799',Credentials:invoiceToken}})
  if(url.pathname.includes('/customer/'))return Response.json({Customer:{...customer,Id:invoice.CustomerRef.value,PrimaryEmailAddr:{Address:['private','example.test'].join('@')}}})
  throw Error('Unexpected QuickBooks request')
 }
 return{calls,invoice,customer,outboundService,beforeReply(value){hook=value},response(value){shape=value}}
}
export async function connectInvoice(h,version=0,cookie=h.owner){return h.cmd('provider.connect',{provider:'quickbooks',version,realmId:invoiceAccount,token:invoiceToken,consent:true},cookie)}
export async function acceptedDeposit(h,{clientId,title='Synthetic invoice agreement'}={}){
 const client=clientId?{id:clientId}:await h.cmd('client.save',{name:'Synthetic deposit client',email:['synthetic-platter-4704','example.test'].join('@')})
 const p=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'One ordinary collection-off single-client service.',optionOne:'Selected service',priceOne:'4200',optionTwo:'Other service',priceTwo:'6000',depositPercent:'25'})
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 const path=new URL((await h.cmd('proposal.send',{id:p.id,version:2})).shareUrl).pathname
 await h.send(path+'/action?name=code.request',{})
 const code=(await h.state()).outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verification=await h.send(path+'/action?name=code.verify',{code});assert.equal(verification.status,200)
 const result=await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},verification.cookie);assert.equal(result.status,200,result.text)
 const deposit=await h.cmd('invoice.export',{id:p.id})
 return{p,client,path,cookie:verification.cookie,deposit}
}
export const reviewInvoice=(h,id,cookie=h.owner,connectionVersion=1)=>h.cmd('invoice.match.review',{id,accountId:invoiceAccount,connectionVersion,externalId:invoiceExternal,customerId:invoiceCustomer,consent:true},cookie)
export const inspectInvoice=(h,id,cookie=h.owner,connectionVersion=1)=>h.cmd('invoice.match.inspect',{id,accountId:invoiceAccount,connectionVersion,consent:true},cookie)
