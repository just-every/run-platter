import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { captureRuntimeLog, databaseText, instrumentNumbers } from './instrument-scan.mjs'
import { paypalFixture, paypalToken, paypalMerchant, paypalWebhook, paypalHeaders } from './paypal-fixture.mjs'

const financial={amount:'300.00',reason:'Synthetic agreed half refund',consent:true}
const connect={provider:'paypal',version:0,token:paypalToken,merchantId:paypalMerchant,webhookId:paypalWebhook,consent:true}
export { connect as paypalConnect }

export async function preparePaypalAgreement(h,configure){
 const email='synthetic-platter-9020'+String.fromCharCode(64)+'example.test'
 const client=(await h.state()).clients.find(c=>c.email===email)??await h.cmd('client.save',{name:'Synthetic PayPal client',email})
 const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic PayPal agreement',scope:'One studio shoot with edited photographs.',optionOne:'Studio essentials',priceOne:'2400.00',optionTwo:'Full campaign',priceTwo:'4200.00',depositPercent:'25'})
 if(configure)await configure(p)
 else await h.cmd('payment.collection',{id:p.id,version:1,completion:'required',provider:'paypal',merchantId:paypalMerchant,connectionVersion:1,paymentMethods:['paypal'],consent:true})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:1})
 const share=await h.cmd('proposal.send',{id:p.id,version:3})
 return {id:p.id,path:new URL(share.shareUrl).pathname,client}
}

export async function verifyPaypalSigner(h,p){
 const asked=await h.send(p.path+'/action?name=code.request',{});assert.equal(asked.status,200,asked.text)
 const mail=(await h.state()).outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code'))
 assert.ok(mail,'Ordinary mailbox receives the verification code')
 const verified=await h.send(p.path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
 assert.equal(verified.status,200,verified.text)
 return {...p,cookie:verified.cookie}
}

export async function signPaypalAgreement(h,p){
 p=await verifyPaypalSigner(h,p)
 const accepted=await h.send(p.path+'/action?name=accept',{name:'Synthetic PayPal signer',optionId:'one',consent:true},p.cookie)
 assert.equal(accepted.status,200,accepted.text)
 assert.match(accepted.text,/waiting for payment/)
 return p
}

const deposit=(h,id)=>h.db.prepare('SELECT * FROM p_paypal_deposits WHERE proposal_id=?').bind(id).first()
const receipts=(h,id)=>h.db.prepare('SELECT * FROM p_payment_records WHERE proposal_id=?').bind(id).all().then(v=>v.results)
const postCalls=(fake,path)=>fake.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname===path)
const rejected=r=>assert.ok(r.status>=400&&r.status<500,'Request refused: '+r.status+' '+r.text)

export function inspectPaypalReservations(h,fake){
 const inspect=async call=>{
  const path=new URL(call.url).pathname
  if(path.includes('verify-webhook-signature')){const event=await h.db.prepare('SELECT * FROM p_paypal_events WHERE id=?').bind(call.body.webhook_event.id).first();assert.equal(event?.status,'verifying','A notification identity is durably claimed before verification I/O');return}
  if(call.method!=='POST')return
  const requestId=call.headers['paypal-request-id']
  assert.ok(requestId,'Every money write carries its durable PayPal request identity')
  let row
  if(path==='/v2/checkout/orders')row=await h.db.prepare('SELECT * FROM p_paypal_deposits WHERE create_request=?').bind(requestId).first()
  else if(path.endsWith('/capture'))row=await h.db.prepare('SELECT * FROM p_paypal_deposits WHERE capture_request=?').bind(requestId).first()
  else if(path.endsWith('/refund'))row=await h.db.prepare('SELECT * FROM p_refunds WHERE id=?').bind(requestId.replace(/^platter-refund-/, '')).first()
  assert.ok(row,'The request identity and reservation exist before a provider request')
  assert.equal(row.cents,path.endsWith('/refund')?30000:60000)
  if(!path.endsWith('/refund')){assert.equal(row.merchant_id,paypalMerchant);assert.equal(row.currency,'USD');assert.equal(row.revision,1)}
 }
 fake.setHook(inspect)
 return inspect
}

export async function assertPaypalSanitized(h,log){
 const db=await databaseText(h.db)
 assert.ok(db.tables>0&&db.rows>0,'Inspect the complete database')
 assert.deepEqual(instrumentNumbers(db.text),[],'Database retains no payment instrument number')
 assert.deepEqual(instrumentNumbers(log.text()),[],'Runtime logs retain no payment instrument number')
 assert.ok(!db.text.includes(paypalToken),'Provider token remains sealed at rest')
 assert.ok(!log.text().includes(paypalToken),'Runtime log excludes the provider token')
}

async function collect(h,fake,p){
 const start=await h.send(p.path+'/paypal.json',{consent:true,cents:60000},p.cookie);assert.equal(start.status,200,start.text)
 const saved=await deposit(h,p.id);assert.ok(saved.order_id)
 fake.approve(saved.order_id)
 const refreshed=await h.send(p.path+'/paypal-status.json',{},p.cookie);assert.equal(refreshed.status,200,refreshed.text)
 const captured=await h.send(p.path+'/paypal-capture.json',{consent:true,cents:60000},p.cookie);assert.equal(captured.status,200,captured.text)
 return deposit(h,p.id)
}

async function people(h){
 const result={owner:h.owner}
 for(const [index,role] of ['admin','billing','sales'].entries()){
  const email='synthetic-platter-'+(9040+index)+String.fromCharCode(64)+'example.test'
  const invited=await h.send('/auth/invite',{email,displayName:'Synthetic '+role,role:'member',returnTo:'/app'},h.owner);assert.equal(invited.status,202,invited.text)
  const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id
  await h.cmd('member.set',{operatorId:id,version:0,role,teams:[]})
  result[role]=cookie
 }
 return result
}

async function notifications(h,fake,p,saved){
 const resource=fake.captures.get(saved.capture_id),event=fake.event(resource),send=body=>h.send('/api/platter/paypal/events',body,'',paypalHeaders)
 const before=(await receipts(h,p.id)).length
 fake.setVerification('FAILURE')
 rejected(await send(event));assert.equal((await receipts(h,p.id)).length,before)
 fake.setVerification('SUCCESS')
 for(const change of [r=>{r.payee.merchant_id='synthetic-platter-9050'},r=>{r.supplementary_data.related_ids.order_id='synthetic-platter-9051'},r=>{r.amount.value='599.99'},r=>{r.amount.currency_code='EUR'}]){
  const foreign=fake.event(resource);change(foreign.resource)
  rejected(await send(foreign));assert.equal((await receipts(h,p.id)).length,before)
 }
 const applied=await send(event);assert.equal(applied.status,200,applied.text)
 const verifiedCount=postCalls(fake,'/v1/notifications/verify-webhook-signature').length
 for(let replay=0;replay<2;replay++){const response=await send(event);assert.equal(response.status,200,response.text)}
 assert.equal(postCalls(fake,'/v1/notifications/verify-webhook-signature').length,verifiedCount,'Applied notification replay makes no further verification request')
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_paypal_events WHERE id=?').bind(event.id).first()).n,1,'Notifications retain one event identity')
 assert.equal((await receipts(h,p.id)).length,1,'Capture and notification replay retain one receipt')
 const verification=postCalls(fake,'/v1/notifications/verify-webhook-signature').at(-1)
 assert.equal(verification.body.webhook_id,paypalWebhook)
 for(const [header,field] of [['paypal-transmission-id','transmission_id'],['paypal-transmission-time','transmission_time'],['paypal-transmission-sig','transmission_sig'],['paypal-cert-url','cert_url'],['paypal-auth-algo','auth_algo']])assert.equal(verification.body[field],paypalHeaders[header])
 assert.deepEqual(verification.body.webhook_event,event,'Verification receives the actual delivered event')
}

export async function paypalJourney(){
 const fake=paypalFixture(),log=captureRuntimeLog()
 let h
 try{
  h=await harness({origin:'https://127.0.0.1:9449',assetsDirectory:'public',outboundService:fake.outboundService})
  inspectPaypalReservations(h,fake)
  const roles=await people(h)
  const before=fake.calls.length
  await h.cmd('provider.connect',connect,roles.sales,403);assert.equal(fake.calls.length,before)
  await h.cmd('provider.connect',connect)
  assert.equal(fake.calls.at(-1).url,'https://api-m.paypal.com/v1/identity/openidconnect/userinfo?schema=openid')
  const pending=await preparePaypalAgreement(h)
  rejected(await h.send(pending.path+'/paypal.json',{consent:true,cents:60000}))
  rejected(await h.send(pending.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true}))
  const p=await signPaypalAgreement(h,pending),signature=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
  assert.equal(signature.deposit_cents,60000);assert.equal(signature.currency,'USD')
  const count=fake.calls.length
  rejected(await h.send(p.path+'/paypal.json',{consent:false,cents:60000},p.cookie))
  rejected(await h.send(p.path+'/paypal.json',{consent:true,cents:1},p.cookie));assert.equal(fake.calls.length,count)
  const starts=await Promise.all([h.send(p.path+'/paypal.json',{consent:true,cents:60000},p.cookie),h.send(p.path+'/paypal.json',{consent:true,cents:60000},p.cookie)])
  assert.ok(starts.every(r=>[200,409].includes(r.status)));assert.ok(starts.some(r=>r.status===200))
  assert.equal(postCalls(fake,'/v2/checkout/orders').length,1)
  let saved=await deposit(h,p.id),order=fake.orders.get(saved.order_id)
  const created=postCalls(fake,'/v2/checkout/orders')[0]
  assert.equal(created.body.intent,'CAPTURE');assert.equal(created.body.purchase_units.length,1)
  assert.deepEqual(created.body.purchase_units[0].amount,{currency_code:'USD',value:'600.00'})
  assert.equal(created.body.purchase_units[0].payee.merchant_id,paypalMerchant)
  fake.approve(order.id)
  let response=await h.send(p.path+'/paypal-status.json',{},p.cookie);assert.equal(response.status,200,response.text)
  assert.equal((await receipts(h,p.id)).length,0,'Approval alone collects nothing')
  const capturePath='/v2/checkout/orders/'+order.id+'/capture',captured=await Promise.all([h.send(p.path+'/paypal-capture.json',{consent:true,cents:60000},p.cookie),h.send(p.path+'/paypal-capture.json',{consent:true,cents:60000},p.cookie)])
  assert.ok(captured.every(r=>[200,409].includes(r.status)));assert.ok(captured.some(r=>r.status===200))
  response=await h.send(p.path+'/paypal-capture.json',{consent:true,cents:60000},p.cookie);assert.equal(response.status,200,response.text)
  assert.equal(postCalls(fake,capturePath).length,1,'Concurrent and repeated capture send one money request')
  saved=await deposit(h,p.id);assert.equal(saved.status,'succeeded')
  assert.equal((await receipts(h,p.id)).length,1)
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),signature,'Payment retains the original signature')
  response=await h.send(p.path,undefined,p.cookie);assert.match(response.text,/Proposal accepted/);assert.match(response.text,/Deposit paid/)
  await notifications(h,fake,p,saved)
  const payment=(await receipts(h,p.id))[0],refund={...financial,paymentId:payment.id,requestId:'synthetic-platter-9060'}
  const baseline=fake.calls.length
  await h.cmd('payment.refund',refund,roles.sales,403)
  await h.cmd('payment.refund',{...refund,consent:false},h.owner,400)
  assert.equal(fake.calls.length,baseline,'Unauthorized refunds and absent consent make no provider request')
  for(const [index,role] of ['owner','admin','billing'].entries()){
   let target=payment
   if(index){const other=await signPaypalAgreement(h,await preparePaypalAgreement(h));await collect(h,fake,other);target=(await receipts(h,other.id))[0]}
   const input={...financial,paymentId:target.id,requestId:'synthetic-platter-'+(9060+index)}
   const result=await h.cmd('payment.refund',input,roles[role]);assert.equal(result.status,'succeeded')
   const refundPath='/v2/payments/captures/'+target.provider_charge+'/refund',writes=postCalls(fake,refundPath)
   assert.equal(writes.length,1);assert.deepEqual(writes[0].body.amount,{currency_code:'USD',value:'300.00'})
   await h.cmd('payment.refund',input,roles[role]);assert.equal(postCalls(fake,refundPath).length,1)
  }
  // A lost acknowledgement reserves the financial action permanently. Refresh reads reconcile it.
  for(const kind of ['create','capture','refund']){
   const uncertain=await signPaypalAgreement(h,await preparePaypalAgreement(h))
   if(kind==='refund')await collect(h,fake,uncertain)
   else if(kind==='capture'){
    const start=await h.send(uncertain.path+'/paypal.json',{consent:true,cents:60000},uncertain.cookie);assert.equal(start.status,200,start.text)
    fake.approve((await deposit(h,uncertain.id)).order_id);await h.send(uncertain.path+'/paypal-status.json',{},uncertain.cookie)
   }
   fake.setUncertain(kind)
   let act,path
   if(kind==='refund'){
    const record=(await receipts(h,uncertain.id))[0],input={...financial,paymentId:record.id,requestId:'synthetic-platter-9070'}
    act=()=>h.send('/api/platter/command',{name:'payment.refund',input},h.owner);path='/v2/payments/captures/'+record.provider_charge+'/refund'
   }else{
    const row=await deposit(h,uncertain.id)
    act=()=>h.send(uncertain.path+(kind==='create'?'/paypal.json':'/paypal-capture.json'),{consent:true,cents:60000},uncertain.cookie)
    path=kind==='create'?'/v2/checkout/orders':'/v2/checkout/orders/'+row.order_id+'/capture'
   }
   const n=postCalls(fake,path).length
   await act();await act();assert.equal(postCalls(fake,path).length,n+1,'An uncertain '+kind+' is never retried')
   if(kind!=='refund')await h.send(uncertain.path+'/paypal-status.json',{},uncertain.cookie)
   await act();assert.equal(postCalls(fake,path).length,n+1,'Reconciliation never repeats an uncertain '+kind)
   fake.setUncertain(kind,false)
  }
  await paypalAuthorityJourney(h,fake,roles,p)
  await assertPaypalSanitized(h,log)
 }finally{try{if(h)await h.close()}finally{log.stop()}}
}

async function paypalAuthorityJourney(h,fake,roles,paid){
 const inspect=inspectPaypalReservations(h,fake)
 const noCapture=async(p,action)=>{
  const before=fake.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/capture')).length
  rejected(await action())
  assert.equal(fake.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/capture')).length,before,'Changed authority prevents capture')
  assert.equal((await receipts(h,p.id)).length,0,'Changed authority creates no receipt')
 }
 const ready=async configure=>{
  const p=await signPaypalAgreement(h,await preparePaypalAgreement(h,configure))
  const started=await h.send(p.path+'/paypal.json',{consent:true,cents:60000},p.cookie);assert.equal(started.status,200,started.text)
  const row=await deposit(h,p.id);fake.approve(row.order_id)
  return {p,row}
 }
 const capture=p=>h.send(p.path+'/paypal-capture.json',{consent:true,cents:60000},p.cookie)
 const drift=await ready()
 fake.orders.get(drift.row.order_id).purchase_units[0].payee.merchant_id='synthetic-platter-9081'
 await noCapture(drift.p,()=>capture(drift.p))

 // Rotating an unsigned invitation revokes its already-verified transport.
 const invitation=await verifyPaypalSigner(h,await preparePaypalAgreement(h)),current=(await h.state()).proposals.find(p=>p.id===invitation.id)
 const replacement=await h.cmd('proposal.send',{id:invitation.id,version:current.version})
 assert.notEqual(new URL(replacement.shareUrl).pathname,invitation.path)
 const before=fake.calls.length
 await noCapture(invitation,()=>h.send(invitation.path+'/paypal.json',{consent:true,cents:60000},invitation.cookie))
 assert.equal(fake.calls.length,before,'An old invitation makes no provider request')

 // A second mailbox verification while an order is read invalidates the retained session.
 const rotated=await ready()
 let refreshedSession=false
 fake.setHook(async call=>{
  await inspect(call)
  if(!refreshedSession&&call.method==='GET'&&new URL(call.url).pathname==='/v2/checkout/orders/'+rotated.row.order_id){
   refreshedSession=true
   const share=await h.db.prepare('SELECT code_sent_at FROM p_shares WHERE token=?').bind(rotated.p.path.split('/').at(-1)).first()
   await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(share.code_sent_at+61001),cron:'*/15 * * * *'})
   await verifyPaypalSigner(h,rotated.p)
  }
 })
 await noCapture(rotated.p,()=>capture(rotated.p));assert.equal(refreshedSession,true)
 fake.setHook(inspect)

 const adminId=(await h.state(roles.admin)).actor.id
 const adminEmail=(await h.state(roles.admin)).actor.email
 let changed=await h.send('/auth/operator/role',{operatorId:adminId,role:'admin'},h.owner);assert.equal(changed.status,200,changed.text)
 roles.admin=await h.signIn(adminEmail)
 const demoted=await ready(p=>h.cmd('payment.collection',{id:p.id,version:1,completion:'required',provider:'paypal',merchantId:paypalMerchant,connectionVersion:1,paymentMethods:['paypal'],consent:true},roles.admin))
 let demotedDuringRead=false
 fake.setHook(async call=>{
  await inspect(call)
  if(!demotedDuringRead&&call.method==='GET'&&new URL(call.url).pathname==='/v2/checkout/orders/'+demoted.row.order_id){
   demotedDuringRead=true
   changed=await h.send('/auth/operator/role',{operatorId:adminId,role:'member'},h.owner);assert.equal(changed.status,200,changed.text)
  }
 })
 await noCapture(demoted.p,()=>capture(demoted.p));assert.equal(demotedDuringRead,true)
 fake.setHook(inspect)

 // Existing public erasure retains clients with signed history and financial evidence.
 const signature=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(paid.id).first(),retained=await receipts(h,paid.id)
 const erasedBefore=fake.calls.length
 await h.cmd('client.erase',{id:paid.client.id,confirmName:'Synthetic PayPal client'},h.owner,409)
 await h.cmd('tracking.erase',{id:paid.id,confirm:'erase'})
 assert.equal(fake.calls.length,erasedBefore,'Erasure does not make a payment request')
 assert.deepEqual(await receipts(h,paid.id),retained,'Engagement erasure preserves financial evidence')
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(paid.id).first(),signature)
 const unused=await h.cmd('client.save',{name:'Synthetic unused PayPal client',email:'synthetic-platter-9082'+String.fromCharCode(64)+'example.test'})
 await h.cmd('client.erase',{id:unused.id,confirmName:'Synthetic unused PayPal client'})
 await h.cmd('proposal.prepare',{clientId:unused.id,title:'Synthetic erased client',scope:'A scope',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'},h.owner,404)
 assert.equal(fake.calls.length,erasedBefore,'An erased client cannot authorize or recreate a deposit')

 const revoked=await ready()
 let disconnected=false
 fake.setHook(async call=>{
  await inspect(call)
  if(!disconnected&&call.method==='GET'&&new URL(call.url).pathname==='/v2/checkout/orders/'+revoked.row.order_id){
   disconnected=true;await h.cmd('provider.disconnect',{provider:'paypal',version:1})
  }
 })
 await noCapture(revoked.p,()=>capture(revoked.p));assert.equal(disconnected,true)
 fake.setHook(inspect)
 const disconnectedCalls=fake.calls.length
 await noCapture(revoked.p,()=>capture(revoked.p))
 assert.equal(fake.calls.length,disconnectedCalls,'A disconnected connection makes no subsequent provider request')
}
