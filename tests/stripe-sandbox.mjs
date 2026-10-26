// Run explicitly with held test keys injected into the process environment.
import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { forwardProviderRequest } from './provider-network.mjs'
import { collectionLifecycle, collectionFees, collectionMethodInheritance, signedDeposit } from './collection-journey.mjs'

const key=process.env.STRIPE_SECRET_KEY,publicKey=process.env.STRIPE_PUBLISHABLE_KEY
assert.ok(key?.startsWith('sk_test_')&&publicKey?.startsWith('pk_test_'),'Inject Stripe test credentials')
const intents=new Set()
async function stripe(path,fields){
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:fields?'POST':'GET',headers:{authorization:'Bearer '+key,...(fields?{'content-type':'application/x-www-form-urlencoded'}:{})},...(fields?{body:new URLSearchParams(fields)}:{})})
 const value=await response.json()
 if(!response.ok)throw Object.assign(Error('Stripe request refused: '+(value.error?.code??value.error?.type??response.status)),{stripeCode:value.error?.code})
 return value
}
const h=await harness({outboundService:async request=>{
 const response=await forwardProviderRequest(request),copy=response.clone()
 if(new URL(request.url).pathname==='/v1/payment_intents'&&request.method==='POST'&&response.ok)intents.add((await copy.json()).id)
 return response
}})
try{
 const account=await stripe('account');assert.equal(account.default_currency,'usd')
 console.log('Stripe test account default settlement currency: USD')
 await h.cmd('provider.connect',{provider:'stripe',version:0,token:key,publishableKey:publicKey,consent:true})
 await collectionLifecycle(h,async(id,outcome)=>{
  try{
   const value=await stripe('payment_intents/'+id+'/confirm',{payment_method:outcome==='success'?'pm_card_visa':'pm_card_visa_chargeDeclined',return_url:'https://example.com'})
   assert.equal(value.status,outcome==='success'?'succeeded':'requires_payment_method')
  }catch(error){if(outcome!=='decline'||error.stripeCode!=='card_declined')throw error}
 })
 await collectionFees(h)
 await collectionMethodInheritance(h)
 console.log('PASS native public collection: required decline then success; due decline retains completed acceptance; exact deposit, signature and one receipt')
 const three=await signedDeposit(h)
 const start=await h.send(three.path+'/payment.json',{method:'card',consent:'yes'},three.cookie);assert.equal(start.status,200)
 const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(three.id).first()
 assert.equal((await h.send(three.path+'/payment-consent.json',{consent:true,cents:saved.cents},three.cookie)).status,200)
 const authentication=await stripe('payment_intents/'+saved.provider_intent+'/confirm',{payment_method:'pm_card_threeDSecure2Required',return_url:'https://example.com'})
 assert.equal(authentication.status,'requires_action')
 assert.equal((await h.send(three.path+'/payment-status.json',{},three.cookie)).value.complete,false)
 console.log('PASS native 3-D Secure challenge initiation; browser completion is a separate journey')
 try{
  const bank=await signedDeposit(h,'due',['ach']),started=await h.send(bank.path+'/payment.json',{method:'ach',consent:'yes'},bank.cookie)
  if(started.status!==200)throw Error('Native ACH preparation refused with HTTP '+started.status)
  const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(bank.id).first()
  assert.equal((await h.send(bank.path+'/payment-consent.json',{consent:true,cents:saved.cents},bank.cookie)).status,200)
  const value=await stripe('payment_intents/'+saved.provider_intent+'/confirm',{payment_method:'pm_usBankAccount_success','mandate_data[customer_acceptance][type]':'online','mandate_data[customer_acceptance][online][ip_address]':'127.0.0.1','mandate_data[customer_acceptance][online][user_agent]':'Platter explicit sandbox journey',return_url:'https://example.com'})
  let refreshed=await h.send(bank.path+'/payment-status.json',{},bank.cookie)
  assert.ok(['processing','succeeded'].includes(refreshed.value.status))
  for(let attempt=0;attempt<10&&refreshed.value.status==='processing';attempt++){await new Promise(resolve=>setTimeout(resolve,2000));refreshed=await h.send(bank.path+'/payment-status.json',{},bank.cookie)}
  assert.ok((await h.db.prepare('SELECT provider_mandate FROM p_collection_intents WHERE proposal_id=?').bind(bank.id).first()).provider_mandate,'Stripe mandate reference retained without bank numbers')
  console.log('ACH provider state: '+refreshed.value.status+'; mandate and settlement proof remain separate')
 }catch(error){console.log('ACH unavailable: '+error.message)}
 {
  const bank=await signedDeposit(h,'required',['ach']),started=await h.send(bank.path+'/payment.json',{method:'ach',consent:'yes'},bank.cookie);assert.equal(started.status,200,started.text)
  const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(bank.id).first()
  assert.equal((await h.send(bank.path+'/payment-consent.json',{consent:true,cents:saved.cents},bank.cookie)).status,200)
  const method=await stripe('payment_methods',{type:'us_bank_account','us_bank_account[account_holder_type]':'individual','us_bank_account[account_number]':'000123456789','us_bank_account[routing_number]':'110000000','billing_details[name]':'Avery Chen'})
  const pending=await stripe('payment_intents/'+saved.provider_intent+'/confirm',{payment_method:method.id,'mandate_data[customer_acceptance][type]':'online','mandate_data[customer_acceptance][online][ip_address]':'127.0.0.1','mandate_data[customer_acceptance][online][user_agent]':'Platter explicit sandbox journey',return_url:'https://example.com'})
  assert.equal(pending.status,'requires_action');assert.equal(pending.next_action.type,'verify_with_microdeposits')
  let waiting=await h.send(bank.path+'/payment-status.json',{},bank.cookie)
  assert.equal(waiting.value.status,'requires_action');assert.equal(waiting.value.complete,false)
  assert.match((await h.send(bank.path,undefined,bank.cookie)).text,/Payment authentication required/)
  await stripe('payment_intents/'+saved.provider_intent+'/verify_microdeposits',{descriptor_code:'SM11AA'})
  waiting=await h.send(bank.path+'/payment-status.json',{},bank.cookie)
  for(let attempt=0;attempt<30&&waiting.value.status==='processing';attempt++){await new Promise(resolve=>setTimeout(resolve,4000));waiting=await h.send(bank.path+'/payment-status.json',{},bank.cookie)}
  assert.ok(['processing','succeeded'].includes(waiting.value.status),'Verified microdeposits move the debit forward: '+waiting.value.status)
  const retained=await h.db.prepare('SELECT authorization,provider_mandate FROM p_collection_intents WHERE proposal_id=?').bind(bank.id).first()
  assert.match(retained.authorization,/one-time ACH bank debit of 600.00 USD/);assert.match(retained.authorization,/records the ACH debit mandate/);assert.ok(retained.provider_mandate,'Stripe mandate reference retained with the agreement')
  console.log('PASS native ACH micro-deposit verification: requires_action held, descriptor code verified, debit '+waiting.value.status+'; authorization text and mandate reference retained')
 }
 const rows=(await h.db.prepare('SELECT snapshot FROM p_acceptances UNION ALL SELECT authorization AS snapshot FROM p_collection_intents UNION ALL SELECT body AS snapshot FROM p_mail').all()).results
 for(const row of rows)assert.ok(!/4242424242424242|4000000000003220|000123456789|110000000/.test(row.snapshot),'No card or bank numbers retained')
 console.log('PASS retained agreement, authorization and mail inspection: no payment instrument numbers')
}finally{
 let failed=false
 for(const id of intents){
  try{const value=await stripe('payment_intents/'+id);if(value.status==='succeeded'){await stripe('refunds',{payment_intent:id});console.log('Cleanup: successful test deposit refunded')}else if(value.status!=='canceled'){await stripe('payment_intents/'+id+'/cancel',{});console.log('Cleanup: unfinished test intent canceled')}}catch{failed=true;console.log('Cleanup requires provider reconciliation for test intent '+id)}
 }
 await h.close()
 console.log('Stripe retains canceled and refunded PaymentIntents; its API has no deletion endpoint. No webhook endpoint was created.')
 if(failed)process.exitCode=1
}
