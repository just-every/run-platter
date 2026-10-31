import assert from 'node:assert/strict'

export async function signedDeposit(h,completion='required',methods=['card'],configure,approver=h.owner){
 const client=(await h.state()).clients.find(c=>c.email==='avery@northstar.example')??await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Brand photography deposit',scope:'One studio shoot and edited photographs.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
 if(configure)await configure(p,completion,methods)
 else await h.cmd('payment.collection',{id:p.id,version:1,completion,paymentMethods:methods})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:1},approver)
 const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
 return signSentDeposit(h,p.id,path,completion,methods)
}

export async function signSentDeposit(h,id,path,completion,methods=['card']){
 assert.equal((await h.send(path+'/payment.json',{method:'card',consent:'yes'})).status,401)
 await h.send(path+'/action?name=code.request',{})
 const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject LIKE '%verification code' ORDER BY created_at DESC LIMIT 1").bind(id).first(),code=mail.body.match(/\b\d{6}\b/)[0]
 const verify=await h.send(path+'/action?name=code.verify',{code}),cookie=verify.cookie
 assert.equal((await h.send(path+'/payment.json',{method:methods[0],consent:'yes'},cookie)).status,409)
 const accepted=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:'yes'},cookie)
 assert.equal(accepted.status,200,accepted.text)
 assert.match(accepted.text,completion==='required'?/waiting for payment/:/Proposal accepted/)
 return {id,path,cookie}
}

export async function collectionLifecycle(h,confirm){
 for(const completion of ['required','due']){
  const p=await signedDeposit(h,completion)
  const signature=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
  assert.equal(signature.deposit_cents,60000)
  assert.equal((await h.send(p.path+'/payment.json',{method:'ach',consent:'yes'},p.cookie)).status,400)
  const attempts=await Promise.all([h.send(p.path+'/payment.json',{method:'card',consent:'yes',amount:1},p.cookie),h.send(p.path+'/payment.json',{method:'card',consent:'yes',amount:1},p.cookie)])
  assert.ok(attempts.every(r=>[200,409].includes(r.status)))
  const start=attempts.find(r=>r.status===200);assert.ok(start,'One concurrent attempt prepares the deposit: '+attempts.map(r=>r.value.error??r.status).join('; '))
  assert.ok(start.value.clientSecret)
  const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()
  assert.equal(saved.cents,60000)
  assert.equal((await h.send(p.path+'/payment-consent.json',{consent:true,cents:1},p.cookie)).status,400)
  assert.equal((await h.send(p.path+'/payment-consent.json',{consent:true,cents:saved.cents},p.cookie)).status,200)
  await confirm(saved.provider_intent,'decline')
  let result=await h.send(p.path+'/payment-status.json',{},p.cookie)
  assert.equal(result.status,200,result.text);assert.equal(result.value.status,'requires_payment_method');assert.equal(result.value.complete,completion==='due')
  let page=await h.send(p.path,undefined,p.cookie)
  assert.match(page.text,completion==='required'?/Agreement signed — waiting for payment/:/Proposal accepted/)
  assert.match(page.text,/Deposit due/)
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),signature,'a decline never changes the retained signature')
  const retry=await h.send(p.path+'/payment.json',{method:'card',consent:'yes'},p.cookie)
  assert.equal(retry.status,200,retry.text);assert.ok(retry.value.clientSecret===start.value.clientSecret,'A retry reuses the same payment intent')
  if(completion==='required'){
   await confirm(saved.provider_intent,'success')
   result=await h.send(p.path+'/payment-status.json',{},p.cookie)
   assert.equal(result.status,200,result.text);assert.equal(result.value.status,'succeeded');assert.equal(result.value.complete,true)
   assert.ok(!('clientSecret' in result.value))
   page=await h.send(p.path,undefined,p.cookie);assert.match(page.text,/Proposal accepted/);assert.match(page.text,/Deposit paid/)
   await h.send(p.path+'/payment-status.json',{},p.cookie)
   assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_records WHERE proposal_id=?').bind(p.id).first()).n,1)
  }
  assert.equal((await h.db.prepare('SELECT count(*) n FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()).n,1)
  assert.match(saved.authorization,/one-time payment of 600.00 USD/)
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),signature)
 }
}

export async function collectionFees(h){
 await h.send('/auth/invite',{email:'collections-sales@studio.example',displayName:'Collection sales colleague',role:'member',returnTo:'/app'},h.owner)
 const sales=await h.signIn('collections-sales@studio.example')
 await h.cmd('payment.surcharge',{version:0,percent:3,allowedStates:'CA',consent:true},sales,403)
 await h.cmd('workspace.defaults',{version:0,paymentMethods:['card']},sales,403)
 await h.cmd('payment.surcharge',{version:0,percent:3,allowedStates:'CA, NY',prohibitedStates:'NY'},h.owner,400)
 await h.cmd('payment.surcharge',{version:0,percent:3,allowedStates:'CA, NY',prohibitedStates:'NY',consent:true})
 for(const [method,state,expected] of [['card','CA',61800],['card','NY',60000],['ach','CA',60000]]){
  const p=await signedDeposit(h,'due',[method]),start=await h.send(p.path+'/payment.json',{method,billingState:state,consent:'yes'},p.cookie)
  assert.equal(start.status,200)
  assert.equal(start.value.quote.cents,expected)
  assert.equal(start.value.quote.feeCents,expected-60000)
  const page=await h.send(p.path,undefined,p.cookie)
  assert.equal(page.text.includes('<dt>Card fee</dt>'),expected>60000)
 }
}


export async function collectionMethodInheritance(h){
 const all=['card','apple_pay','google_pay','ach']
 await h.cmd('workspace.defaults',{version:0,paymentMethods:all})
 const client=await h.cmd('client.save',{name:'Northstar Design',email:'design@northstar.example'}),offer={clientId:client.id,title:'Design campaign',scope:'Brand design and final artwork.',optionOne:'Core',priceOne:'2400',optionTwo:'Complete',priceTwo:'4200',depositPercent:'25'}
 const source=await h.cmd('proposal.prepare',offer)
 await h.cmd('payment.collection',{id:source.id,version:1,completion:'off',paymentMethods:['card','ach']})
 const template=await h.cmd('template.save',{id:source.id,version:2,name:'Card and ACH campaign'})
 const fromTemplate=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id}),blank=await h.cmd('proposal.prepare',offer)
 let state=await h.state()
 assert.deepEqual(state.proposals.find(p=>p.id===fromTemplate.id).collectionPolicy.methods,['card','ach'])
 assert.deepEqual(state.proposals.find(p=>p.id===blank.id).collectionPolicy.methods,all)
 await h.cmd('payment.collection',{id:fromTemplate.id,version:1,completion:'off',paymentMethods:['card']})
 state=await h.state();assert.deepEqual(state.templates.find(p=>p.id===template.id).deliveryDefaults.paymentMethods,['card','ach'])
 assert.deepEqual(state.proposals.find(p=>p.id===fromTemplate.id).collectionPolicy.methods,['card'])
 return {source,blank}
}

// All provider outcomes below are returned by the network edge, never by a browser assertion.
export function depositEdge(){
 const intents=new Map(),mail=[],calls=[]
 const edge={intents,mail,calls,account:'synthetic-platter-account',readHook:null,mailHook:null,uncertain:false,ambiguous:false}
 edge.outboundService=async request=>{
  const url=new URL(request.url);calls.push({path:url.pathname,method:request.method})
  if(url.hostname==='oauth2.googleapis.com'){
   if(edge.oauthHook)await edge.oauthHook()
   return Response.json({access_token:'synthetic-platter-10003',refresh_token:'synthetic-platter-10004',scope:'openid email https://www.googleapis.com/auth/gmail.send'})
  }
  if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-10005',email:edge.ownerEmail,email_verified:true})
  if(url.hostname==='gmail.googleapis.com'){
   const payload=await request.json(),raw=Buffer.from(payload.raw,'base64url').toString('utf8')
   mail.push({subject:Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString(),raw})
   return Response.json({id:'synthetic-platter-gmail-'+mail.length})
  }
  if(url.hostname==='api.resend.com'){
   const message=await request.json();mail.push(message);const messageId='synthetic-platter-mail-'+mail.length
   if(message.subject==='Deposit payment failed'){
    if(edge.mailHook)await edge.mailHook(message)
    if(edge.uncertain)throw Error('Synthetic uncertain mail outcome')
   }
   return Response.json({id:messageId})
  }
  if(url.pathname==='/v1/account')return Response.json({id:edge.account,default_currency:'usd'})
  if(url.pathname==='/v1/payment_intents'&&request.method==='POST'){
   const form=new URLSearchParams(await request.text()),id='synthetic-platter-intent-'+(intents.size+1),intent={id,amount:Number(form.get('amount')),currency:form.get('currency'),status:'requires_payment_method',client_secret:'synthetic-platter-client',payment_method_types:['card'],metadata:{platter_proposal_id:form.get('metadata[platter_proposal_id]'),platter_revision:form.get('metadata[platter_revision]')}}
   intents.set(id,intent);return Response.json(intent)
  }
  assert.equal(url.hostname,'api.stripe.com')
  const id=url.pathname.split('/').at(-1);assert.ok(intents.has(id),'Only an existing deposit is read')
  if(edge.readHook)await edge.readHook(id)
  if(edge.ambiguous)return new Response('Synthetic ambiguous provider result',{status:503})
  return Response.json(intents.get(id))
 }
 edge.fail=(saved,reason='insufficient_funds',attempt='synthetic-platter-attempt-'+saved.id)=>{
  const intent=intents.get(saved.provider_intent);intent.status='requires_payment_method'
  intent.latest_charge={id:attempt,payment_intent:intent.id,amount:intent.amount,currency:intent.currency,status:'failed',paid:false,created:Math.floor((edge.now??Date.now())/1000),failure_code:'card_declined',failure_message:'Synthetic provider private diagnostic'}
  intent.last_payment_error={charge:attempt,decline_code:reason,message:'Synthetic provider private diagnostic'}
  return intent
 }
 return edge
}
export async function preparedNoticeDeposit(h,completion='required',approver=h.owner){
 const p=await signedDeposit(h,completion,['card'],undefined,approver)
 const start=await h.send(p.path+'/payment.json',{method:'card',consent:true},p.cookie);assert.equal(start.status,200,start.text)
 const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()
 assert.equal((await h.send(p.path+'/payment-consent.json',{consent:true,cents:saved.cents},p.cookie)).status,200)
 const authorize=async(enabled=true,cookie=h.owner,status=200)=>{
  const version=(await h.db.prepare('SELECT version FROM p_payment_failure_settings WHERE proposal_id=?').bind(p.id).first())?.version??0
  return h.cmd('payment.failure-notices',{id:p.id,version,enabled,consent:true},cookie,status)
 }
 return {...p,saved,authorize}
}
export async function failureNoticesJourney(h,edge){
 const p=await preparedNoticeDeposit(h,'due'),refresh=()=>h.send(p.path+'/payment-status.json',{},p.cookie)
 const signature=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 const download=async()=>{const r=await h.mf.dispatchFetch(h.origin+p.path+'/agreement.pdf',{headers:{cookie:p.cookie}});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer())}
 const original=await download()
 await p.authorize()
 assert.equal((await refresh()).status,200)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_failures').first()).n,0,'Initial payment-method status is not a failure')
 const intent=edge.fail(p.saved)
 delete intent.latest_charge
 assert.equal((await refresh()).status,200)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_failures').first()).n,0,'A browser or error assertion with no failed charge sends nothing')
 edge.fail(p.saved)
 const charge=intent.latest_charge
 for(const changes of [{amount:1},{currency:'eur'},{payment_intent:'synthetic-platter-other'},{paid:true},{status:'pending'},{created:0}]){
  intent.latest_charge={...charge,...changes};assert.equal((await refresh()).status,200)
  assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_failures').first()).n,0,'Unbound or unconfirmed provider attempts send nothing')
 }
 intent.latest_charge=charge
 edge.ambiguous=true;assert.equal((await refresh()).status,409);edge.ambiguous=false
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_failures').first()).n,0,'An ambiguous provider response never queues a notice')
 const results=await Promise.all([refresh(),refresh(),refresh()]);assert.ok(results.every(r=>r.status===200),results.map(r=>r.text).join('\n'))
 const failures=(await h.db.prepare('SELECT * FROM p_payment_failures WHERE proposal_id=?').bind(p.id).all()).results
 assert.equal(failures.length,1);assert.equal(failures[0].reason,'insufficient_funds');assert.equal(failures[0].cents,60000)
 const messages=(await h.db.prepare("SELECT * FROM p_mail WHERE proposal_id=? AND subject='Deposit payment failed'").bind(p.id).all()).results
 assert.equal(messages.length,2);assert.deepEqual(messages.map(m=>m.recipient).sort(),[h.auth.OWNER_EMAIL,signature.email].sort())
 for(const m of messages){assert.match(m.body,/600.00 USD failed/);assert.match(m.body,/insufficient funds/);assert.doesNotMatch(m.body,/private diagnostic|client_secret|synthetic-platter-client/)}
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),signature)
 assert.deepEqual(await download(),original,'Failure notices preserve exact agreement bytes')
 assert.match((await h.send(p.path,undefined,p.cookie)).text,/insufficient funds/)
 assert.equal((await h.state()).proposals.find(row=>row.id===p.id).collection.failures.length,1)
 await h.send('/auth/invite',{email:h.auth.MAIL_FROM,displayName:'Synthetic collection colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn(h.auth.MAIL_FROM),person=(await h.state(member)).actor
 await h.cmd('proposal.share',{id:p.id,operatorId:person.id})
 const settings=(await h.db.prepare('SELECT * FROM p_payment_failure_settings WHERE proposal_id=?').bind(p.id).first())
 await h.cmd('payment.failure-notices',{id:p.id,version:settings.version,enabled:false},member,403)
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_payment_failure_settings WHERE proposal_id=?').bind(p.id).first(),settings)
 assert.deepEqual((await h.state(member)).proposals.find(row=>row.id===p.id).collection.failures,[],'Other members receive no private failure history')
 const unverified=await h.send(p.path+'/data.json');assert.equal(unverified.status,401);assert.doesNotMatch(unverified.text,/insufficient funds/,'Unverified invitations reveal no failure history')
 edge.fail(p.saved,'Synthetic provider private diagnostic','synthetic-platter-second-attempt')
 assert.equal((await refresh()).status,200)
 assert.equal((await h.db.prepare("SELECT reason FROM p_payment_failures WHERE provider_attempt='synthetic-platter-second-attempt'").first()).reason,'payment_failed')
 assert.doesNotMatch(JSON.stringify((await h.state()).proposals.find(row=>row.id===p.id).collection.failures),/private diagnostic/)
 await p.authorize(false)
 edge.fail(p.saved,'expired_card','synthetic-platter-revoked-attempt');assert.equal((await refresh()).status,200)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_failures WHERE proposal_id=?').bind(p.id).first()).n,2,'Revocation prevents new notices')
 return p
}
