// Opt-in provider-origin event proof. Never part of push Verify; invoke through the fleet key helper.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { harness } from './harness.mjs'
import { financeAccept, stripeEvent } from './finance-fixture.mjs'
const token=process.env.STRIPE_SECRET_KEY
assert.ok(token&&token.split('_')[1]==='test','A dedicated Stripe test credential is required')
const require=createRequire(import.meta.resolve('miniflare')),{fetch:providerFetch,EnvHttpProxyAgent}=require('undici'),agent=new EnvHttpProxyAgent()
const api=async(path,fields)=>{
 const response=await providerFetch('https://api.stripe.com/v1/'+path,{method:fields?'POST':'GET',dispatcher:agent,headers:{authorization:'Bearer '+token,...(fields?{'content-type':'application/x-www-form-urlencoded'}:{})},...(fields?{body:new URLSearchParams(fields).toString()}:{})})
 const value=await response.json()
 if(!response.ok&&!value.error?.payment_intent)throw Error('Stripe sandbox API refused request: HTTP '+response.status+' '+String(value.error?.code??'unknown')+' parameter='+String(value.error?.param??'unspecified'))
 return value.error?.payment_intent??value
}
const events=[],results=[],blocked=[],started=Math.floor(Date.now()/1000)
const h=await harness({assetsDirectory:'public',outboundService:async request=>{
 const url=new URL(request.url);assert.equal(url.hostname,'api.stripe.com','The sandbox runner sends credentials only to Stripe')
 const response=await providerFetch(request.url,{method:request.method,dispatcher:agent,headers:Object.fromEntries(request.headers),...(['GET','HEAD'].includes(request.method)?{}:{body:await request.arrayBuffer()})})
 return new Response(await response.arrayBuffer(),{status:response.status,headers:Object.fromEntries(response.headers)})
}})
try{
 await h.cmd('provider.connect',{provider:'stripe',version:0,token,webhookSecret:'synthetic-platter-6300',consent:true})
 const run=async(method,paymentMethod)=>{
  const {p}=await financeAccept(h,{title:'Synthetic Stripe '+method+' event proof',priceOne:'10',depositPercent:'100',paymentSchedule:null}),amount=(await h.state()).finance.amounts.find(r=>r.proposal_id===p.id)
  const fields={amount:'1000',currency:'usd','payment_method_types[]':method==='ach'?'us_bank_account':'card',payment_method:paymentMethod,confirm:'true','metadata[platter_amount_id]':amount.id,'metadata[platter_proposal_id]':p.id,'metadata[platter_revision]':'1'}
  if(method==='ach'){fields['mandate_data[customer_acceptance][type]']='offline'}
  const intent=await api('payment_intents',fields)
  assert.equal(intent.livemode,false,'The proof must remain in Stripe test mode')
  const eventTypes=method==='ach'?['payment_intent.processing']:method==='decline'?['payment_intent.payment_failed']:['payment_intent.succeeded']
  let found=[]
  for(let attempt=0;attempt<12&&!found.length;attempt++){
   const response=await api('events?limit=100&created[gte]='+started)
   found=response.data.filter(e=>e.data?.object?.id===intent.id&&eventTypes.includes(e.type))
   if(!found.length)await new Promise(resolve=>setTimeout(resolve,5000))
  }
  assert.ok(found.length,'Stripe returned the provider-origin test event')
  for(const event of found){
   const first=await stripeEvent(h,event,'synthetic-platter-6300');assert.equal(first.status,200);assert.equal(first.value.state,'processed')
   const calls=await stripeEvent(h,event,'synthetic-platter-6300');assert.equal(calls.status,200)
   events.push({id:event.id,type:event.type,created:event.created,livemode:event.livemode,source:intent.id})
  }
  const row=(await h.state()).finance.amounts.find(r=>r.id===amount.id)
  if(method==='ach'){assert.equal(row.state,'processing');assert.equal(row.paidCents,0)}
  if(method==='card'){assert.equal(row.state,'paid');assert.equal(row.paidCents,1000)}
  if(method==='decline'){assert.equal(row.state,'failed');assert.equal(row.paidCents,0)}
  results.push({method,state:row.state,paidCents:row.paidCents,eventCount:found.length})
  console.log('Stripe test '+method+': '+row.state+'; provider event replayed twice')
 }
 const methods=[['card','pm_card_visa'],['decline','pm_card_chargeDeclined'],['ach','pm_usBankAccount_success']]
 for(const [method,paymentMethod] of methods)if(!process.argv[3]||process.argv[3]===method){try{await run(method,paymentMethod)}catch(error){blocked.push({method,reason:error.message});console.log('Stripe test '+method+': BLOCKED; '+error.message)}}
 const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provider:'Stripe test mode',blocked,eventOrigin:'Retrieved from Stripe Events API',signatureBoundary:'Replayed locally using a synthetic signing secret; no provider-origin HTTP signature claimed',events,results,recordCount:(await h.db.prepare('SELECT count(*) n FROM p_financial_events').first()).n}
 assert.equal(receipt.recordCount,events.length)
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(receipt,null,2)+'\n',{mode:0o600})
 console.log('Stripe provider-origin event proof: '+results.length+' passed, '+blocked.length+' blocked; '+events.length+' distinct events retained once');if(blocked.length)process.exitCode=2
}finally{await h.close();await agent.close()}
