import assert from 'node:assert/strict'

export async function signedDeposit(h,completion='required',methods=['card'],configure){
 const client=(await h.state()).clients.find(c=>c.email==='avery@northstar.example')??await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Brand photography deposit',scope:'One studio shoot and edited photographs.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
 if(configure)await configure(p,completion,methods)
 else await h.cmd('payment.collection',{id:p.id,version:1,completion,paymentMethods:methods})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:1})
 const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
 return signSentDeposit(h,p.id,path,completion,methods)
}

export async function signSentDeposit(h,id,path,completion,methods=['card']){
 assert.equal((await h.send(path+'/payment.json',{method:'card',consent:'yes'})).status,401)
 await h.send(path+'/action?name=code.request',{})
 const mail=(await h.state()).outbox.find(m=>m.proposal_id===id&&m.subject.includes('verification code')),code=mail.body.match(/\b\d{6}\b/)[0]
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
