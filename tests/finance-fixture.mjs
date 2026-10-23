import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
export const financeOffer={title:'Synthetic scheduled project',scope:'Synthetic delivery scope',optionOne:'Core',priceOne:'10000',optionTwo:'Expanded',priceTwo:'20000',depositPercent:'30'}
export const financeSchedule={netDays:15,milestones:[{id:'design',label:'Design approval',date:null,amount:{kind:'percent',bps:3000}},{id:'delivery',label:'Delivery',date:'2028-03-15',amount:{kind:'balance'}}],recurring:[{id:'support',label:'Monthly support',startOn:'2028-04-01',interval:'monthly',amount:{kind:'percent',bps:1000}}]}
export const financeConfig={authority:'quickbooks',version:0,itemId:'synthetic-platter-6101',taxCode:'NON',incomeAccount:'synthetic-platter-6102',clearingAccount:'synthetic-platter-6103',feeAccount:'synthetic-platter-6104',bankAccount:'synthetic-platter-6105',remittance:'Checks payable to Synthetic Studio; quote the invoice number. Contact the firm for wire instructions.',consent:true}
export function financeFake(){
 const calls=[],invoices=new Map(),customers=new Map(),payments=new Map(),stripe=new Map(),journals=new Map(),requests=new Map()
 let count=6200,uncertain=false
 const outboundService=async request=>{
  const url=new URL(request.url),body=request.method==='POST'?(request.headers.get('content-type')?.includes('application/json')?await request.json():Object.fromEntries(new URLSearchParams(await request.text()))):null;calls.push({method:request.method,url:url.href,body})
  if(url.hostname==='api.stripe.com'){
   if(url.pathname==='/v1/refunds'){const charge=stripe.get(body.charge);assert.ok(charge);const amount=Number(body.amount),id='synthetic-platter-'+(++count);charge.amount_refunded+=amount;return Response.json({id,charge:body.charge,amount,status:'succeeded'})}
   if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-6106'})
   const object=stripe.get(url.pathname.split('/').at(-1));assert.ok(object,'known synthetic Stripe object '+url.pathname);return Response.json(object)
  }
  assert.equal(url.hostname,'quickbooks.api.intuit.com')
  if(url.pathname.includes('/companyinfo/'))return Response.json({CompanyInfo:{CompanyName:'Synthetic Studio'}})
  if(url.pathname.includes('/item/'))return Response.json({Item:{Id:financeConfig.itemId,IncomeAccountRef:{value:financeConfig.incomeAccount}}})
  if(url.pathname.endsWith('/query')){const query=url.searchParams.get('query');return Response.json({QueryResponse:{Customer:[...customers.values()].filter(c=>query.includes(c.DisplayName))}})}
  if(request.method==='GET'&&url.pathname.includes('/invoice/'))return Response.json({Invoice:invoices.get(url.pathname.split('/').at(-1))})
  if(request.method==='POST'){
   const key=url.searchParams.get('requestid');assert.ok(key,'QBO uses provider request id')
   if(requests.has(key))return Response.json(requests.get(key))
   if(uncertain){uncertain=false;throw Error('Synthetic uncertain provider edge')}
   const entity=url.pathname.endsWith('/customer')?'Customer':url.pathname.endsWith('/invoice')?'Invoice':url.pathname.endsWith('/payment')?'Payment':url.pathname.endsWith('/transfer')?'Transfer':'JournalEntry',Id='synthetic-platter-'+(++count)
   const value={Id,...body}
   if(entity==='Invoice'){value.TotalAmt=body.Line.reduce((n,l)=>n+l.Amount,0);value.Balance=value.TotalAmt;invoices.set(Id,value)}
   if(entity==='Customer')customers.set(Id,value)
   if(entity==='Payment'){payments.set(Id,value);for(const line of body.Line??[]){const invoice=invoices.get(line.LinkedTxn[0].TxnId);assert.ok(invoice,'payment links the authority invoice');invoice.Balance=Math.round((invoice.Balance-line.Amount)*100)/100}}
   if(entity==='JournalEntry'||entity==='Transfer')journals.set(Id,value)
   const response={[entity]:value};requests.set(key,response);return Response.json(response)
  }
  throw Error('Unexpected accounting operation '+request.method+' '+url.pathname)
 }
 return {calls,invoices,customers,payments,stripe,journals,outboundService,uncertainNext:()=>{uncertain=true}}
}
export async function financeConnect(h){
 await h.cmd('provider.connect',{provider:'quickbooks',version:0,realmId:'synthetic-platter-6100',token:'synthetic-platter-6107',consent:true})
 await h.cmd('accounting.configure',financeConfig)
}
export async function financeVerify(h,path){
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const code=(await h.state()).outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const response=await h.send(path+'/action?name=code.verify',{code});assert.equal(response.status,200,response.text);return response.cookie
}
export async function financeAccept(h,input={}){
 const client=(await h.state()).clients.find(c=>c.email==='client@synthetic-platter.example')??await h.cmd('client.save',{name:'Synthetic finance client',email:'client@synthetic-platter.example'})
 const p=await h.cmd('proposal.prepare',{...financeOffer,clientId:client.id,paymentSchedule:financeSchedule,...input})
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 const share=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(share.shareUrl).pathname,cookie=await financeVerify(h,path)
 const response=await h.send(path+'/action?name=accept',{name:'Synthetic Client',optionId:'one',consent:true},cookie);assert.equal(response.status,200,response.text)
 return{p,client,path,cookie}
}
export async function stripeEvent(h,event,secret='synthetic-platter-6109',headers={}){
 const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000)),sig=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex')
 const response=await h.mf.dispatchFetch(h.origin+'/api/platter/payments/events',{method:'POST',headers:{'content-type':'application/json','stripe-signature':'t='+timestamp+',v1='+sig,...headers},body:raw})
 return{status:response.status,value:await response.json()}
}
