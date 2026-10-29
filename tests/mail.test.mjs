import { inboundMailFixture } from './inbound-mail-fixture.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

const offer = {
  title: 'Northstar photography', scope: 'A studio shoot and edited photographs.',
  optionOne: 'Studio', priceOne: '2400', optionTwo: 'Campaign', priceTwo: '4200', depositPercent: '25',
}
const recipient = 'avery@northstar.example'

async function approved(h) {
  const client = (await h.state()).clients.find(c=>c.email===recipient) ?? await h.cmd('client.save', { name: 'Northstar Coffee', email: recipient })
  const proposal = await h.cmd('proposal.prepare', { ...offer, clientId: client.id })
  await h.cmd('proposal.approve', { id: proposal.id, version: 1, revision: 1 })
  return proposal.id
}

async function finishSetup(h) {
  const response = await h.mf.dispatchFetch(h.origin + '/setup', {
    method: 'POST', headers: { host: new URL(h.origin).host, origin: h.origin, cookie: h.owner, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'confirm=yes', redirect: 'manual',
  })
  await response.text()
  assert.equal(response.status, 303)
}

const mailRows = async h => (await h.db.prepare('SELECT * FROM p_mail ORDER BY created_at, id').all()).results

test('EDIT-017 Spanish invitation and mailbox code retain authored mail and consume localized code transport', async()=>{
 const sent=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9701'},outboundService:async request=>{sent.push(await request.json());return Response.json({id:'synthetic-platter-'+(9702+sent.length)})}})
 try{
  const id=await approved(h)
  await h.cmd('proposal.locale',{id,version:2,locale:'es'})
  const invitation=await h.cmd('proposal.send',{id,version:3}),path=new URL(invitation.shareUrl).pathname
  assert.equal(sent[0].subject,'Su propuesta: '+offer.title)
  assert.equal(sent[0].text,'Revise su propuesta y verifique su correo electrónico antes de aceptarla:\n'+invitation.shareUrl)
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  assert.equal(sent[1].subject,'Su código de verificación de Platter')
  const code=sent[1].text.match(/\b\d{6}\b/)[0]
  assert.equal(sent[1].text,'Su código de verificación es '+code+'. Caduca en 10 minutos.\nPropuesta: '+offer.title)
  const verification=await h.send(path+'/action?name=code.verify',{code});assert.equal(verification.status,200,verification.text)
  assert.equal((await h.db.prepare('SELECT body FROM p_mail WHERE proposal_id=? AND subject=?').bind(id,sent[1].subject).first()).body,'Verification code consumed')
  assert.equal((await h.send(path+'/action?name=code.verify',{code})).status,401)
  const second=await approved(h)
  await h.cmd('proposal.locale',{id:second,version:2,locale:'es'})
  const subject='Your proposal: escrito por la empresa',message='Review your proposal and verify your email before accepting:\nTexto propio sin traducción.'
  await h.cmd('proposal.send',{id:second,version:3,mailSubject:subject,mailMessage:message})
  assert.equal(sent.at(-1).subject,subject);assert.ok(sent.at(-1).text.startsWith(message+'\n\n'))
  const history=(await h.state()).proposals.find(p=>p.id===second).invitationMessages[0]
  assert.equal(history.subject,subject);assert.equal(history.message,message)
 }finally{await h.close()}
})

test('SEND-006 invitation, fresh link and negotiated send deliver edited text and retain exact link-free history atomically', async()=>{
 const sent=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'fake-invitation-edge-key'},outboundService:async request=>{
  assert.equal(new URL(request.url).origin,'https://api.resend.com')
  sent.push(await request.json());return Response.json({id:'invitation-'+sent.length})
 }})
 try{
  await finishSetup(h)
  const id=await approved(h),input={id,version:2,mailSubject:'Proposal for Northstar',mailMessage:'Hi Avery,\nPlease review the photography scope.'}
  const before=await h.state()
  await h.cmd('proposal.send',{...input,mailSubject:'Unsafe\r\nHeader'},h.owner,400)
  const missing=await h.cmd('proposal.send',{...input,mailMessage:'Hi {client.first_name}'},h.owner,400)
  assert.match(missing.error,/client.first_name/)
  for(const fields of [{mailSubject:undefined},{mailMessage:undefined},{mailSubject:''},{mailMessage:''},{mailSubject:'x'.repeat(201)},{mailMessage:'x'.repeat(10001)}])await h.cmd('proposal.send',{...input,...fields},h.owner,400)
  await h.cmd('proposal.send',{...input,version:1},h.owner,409)
  assert.deepEqual(await h.state(),before);assert.equal(sent.length,0)
  const first=await h.cmd('proposal.send',input)
  assert.deepEqual(sent[0].to,[recipient]);assert.equal(sent[0].subject,input.mailSubject)
  assert.equal(sent[0].text,input.mailMessage+'\n\n'+first.shareUrl)
  let p=(await h.state()).proposals.find(p=>p.id===id)
  assert.equal(p.revision,1);assert.equal(p.approved_by,h.auth.OWNER_EMAIL)
  const approvedAt=p.approved_at
  const freshInput={id,version:p.version,mailSubject:'Updated invitation',mailMessage:'Avery, use this fresh link.'}
  const fresh=await h.cmd('proposal.send',freshInput)
  assert.equal((await h.send(new URL(first.shareUrl).pathname)).status,404)
  assert.equal(sent[1].text,freshInput.mailMessage+'\n\n'+fresh.shareUrl)
  p=(await h.state()).proposals.find(p=>p.id===id)
  assert.equal(p.revision,1);assert.equal(p.approved_at,approvedAt)
  const client=(await h.state()).clients[0]
  const next=await h.cmd('proposal.negotiate',{...offer,id,version:p.version,clientId:client.id,scope:'An extra studio day.'})
  await h.cmd('proposal.send',{...input,version:next.version},h.owner,409)
  await h.cmd('proposal.approve',{id,version:next.version,revision:next.revision})
  const revisionMail={mailSubject:'Revised scope for Northstar',mailMessage:'Hi Avery, here is the extra studio day.'}
  const revision=await h.cmd('proposal.send',{id,version:next.version+1,...revisionMail})
  assert.equal(sent[2].text,revisionMail.mailMessage+'\n\n'+revision.shareUrl)
  assert.equal((await h.send(new URL(fresh.shareUrl).pathname)).status,404)
  p=(await h.state()).proposals.find(p=>p.id===id)
  const messages=p.invitationMessages
  assert.equal(messages.length,3)
  for(const [i,expected] of [input,freshInput,revisionMail].entries()){
   const row=messages.find(m=>m.subject===expected.mailSubject)
   assert.equal(row.message,expected.mailMessage);assert.equal(row.recipient,recipient)
   assert.equal(row.revision,i===2?next.revision:1);assert.equal(row.actor_id,before.actor.id)
   assert.ok(Number.isSafeInteger(row.queued_at));assert.ok(!JSON.stringify(row).includes('/p/'))
  }
  assert.equal(p.scope,'An extra studio day.')
 }finally{await h.close()}
})

test('FOLLOW-004 verified client questions, native answers and one-use authenticated owner email replies', {timeout:120000}, async()=>{
 const {createHmac,createHash,randomBytes}=await import('node:crypto')
 const keyBytes=Buffer.from(Array.from({length:32},(_,i)=>i)),sent=[],received=new Map(),fetches=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'fake-reply-network-key',MAIL_WEBHOOK_KEY:'whsec_'+keyBytes.toString('base64'),QUESTION_REPLY_DOMAIN:'replies.example.com'},
  outboundService:async request=>{
   const url=new URL(request.url)
   assert.equal(url.origin,'https://api.resend.com','only the configured provider may be contacted')
   if(request.method==='GET'){
    assert.match(url.pathname,/^\/emails\/receiving\/[a-zA-Z0-9_-]+$/)
    assert.equal(request.headers.get('authorization'),'Bearer fake-reply-network-key')
    fetches.push(url.pathname)
    const email=received.get(url.pathname.split('/').at(-1))
    assert.ok(email,'received-message fetch uses the signed provider identity')
    return Response.json(email)
   }
   assert.equal(request.method,'POST');assert.equal(url.pathname,'/emails')
   sent.push(await request.json());return Response.json({id:'provider-'+sent.length})
  },
 })
 const callback=async(message,options={})=>{
  received.set(message.id,message)
  const body=JSON.stringify({type:'email.received',created_at:new Date().toISOString(),data:{email_id:message.id}})
  const eid='reply-'+randomBytes(8).toString('hex'),timestamp=String(Math.floor(Date.now()/1000))
  const signature=createHmac('sha256',keyBytes).update(eid+'.'+timestamp+'.'+body).digest('base64')
  const headers={'content-type':'application/json','svix-id':eid,'svix-timestamp':timestamp,'svix-signature':'v1,'+(options.bad?Buffer.alloc(32).toString('base64'):signature)}
  const deliver=async()=>{const response=await h.mf.dispatchFetch(h.origin+'/api/platter/question-replies',{method:'POST',headers,body});return {status:response.status,text:await response.text()}}
  return {...await deliver(),deliver}
 }
 const inbound=(replyTo,overrides={})=>({id:'received-'+randomBytes(8).toString('hex'),from:'Jordan Venue <OWNER@STUDIO.EXAMPLE>',to:[replyTo],subject:'Re: Client question',text:'Yes, those usage rights are included.',html:null,headers:{},attachments:[],...overrides})
 const keys=async()=>(await h.db.prepare('SELECT * FROM p_question_reply_keys ORDER BY id').all()).results
 const answers=async()=>(await h.db.prepare('SELECT * FROM p_question_answers ORDER BY created_at,id').all()).results
 const queue=async()=>{const r=await h.send('/api/platter/questions',undefined,h.owner);assert.equal(r.status,200,r.text);return r.value.questions}
 try{
  await finishSetup(h)
  const id=await approved(h),{shareUrl}=await h.cmd('proposal.send',{id,version:2}),path=new URL(shareUrl).pathname
  const ask=(section,text,cookie)=>h.send(path+'/action?name=question.create',{revision:1,section,text},cookie)
  assert.equal((await ask('pricing','Does that cover usage rights?')).status,401)
  assert.equal((await h.send('/api/platter/questions')).status,401)
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=sent.at(-1).text.match(/\b\d{6}\b/)?.[0];assert.ok(code)
  const verification=await h.send(path+'/action?name=code.verify',{code});assert.equal(verification.status,200,verification.text)
  const cookie=verification.cookie;assert.ok(cookie)
  assert.equal((await ask('unsupported','Should not create a question',cookie)).status,400)
  assert.equal((await h.send(path+'/action?name=question.create',{revision:0,section:'pricing',text:'Stale offer question'},cookie)).status,409)
  assert.equal((await queue()).length,0,'refused questions have no write')
  assert.equal((await ask('pricing','Does that cover usage rights?',cookie)).status,200)
  const question=(await queue()).find(q=>q.text==='Does that cover usage rights?');assert.ok(question)
  const notice=sent.at(-1),replyTo=notice.reply_to,token=replyTo.split('@')[0]
  assert.deepEqual(notice.to,[h.auth.OWNER_EMAIL]);assert.equal(replyTo.split('@')[1],'replies.example.com')
  const key=(await keys()).find(k=>k.question_id===question.id)
  assert.equal(key.keyhash,createHash('sha256').update(token).digest('hex'))
  assert.ok(!JSON.stringify(await keys()).includes(token),'key custody retains only the capability hash')
  const transport=(await mailRows(h)).find(row=>row.reply_to)
  assert.ok(transport.reply_to&&!transport.reply_to.includes(token),'outbound Reply-To is sealed at rest')
  const before={sent:sent.length,fetches:fetches.length,keys:await keys(),answers:await answers()}
  assert.equal((await callback(inbound(replyTo),{bad:true})).status,401)
  assert.equal(fetches.length,before.fetches,'invalid signature cannot hydrate a provider message')
  assert.deepEqual(await keys(),before.keys);assert.deepEqual(await answers(),before.answers);assert.equal(sent.length,before.sent)
  assert.equal((await callback(inbound(replyTo,{from:'Jordan Venue <intruder@studio.example>'}))).status,403)
  assert.equal((await callback(inbound(randomBytes(32).toString('hex')+'@replies.example.com'))).status,409,'the owner From alone is insufficient')
  assert.equal((await callback(inbound(replyTo,{text:'Quoted private reply address: '+replyTo}))).status,422)
  assert.equal((await callback(inbound(replyTo,{text:null,html:'<p>HTML alone is not an answer</p>'}))).status,422)
  assert.equal((await callback(inbound(replyTo,{attachments:[{id:'attachment-1',filename:'note.txt',content_type:'text/plain',size:1,content_disposition:'attachment',download_url:'https://arbitrary.invalid/file'}]}))).status,422)
  assert.deepEqual(await keys(),before.keys);assert.deepEqual(await answers(),before.answers);assert.equal(sent.length,before.sent)
  const answer='  Yes, those usage rights are included.\n\n> Does that cover usage rights?\n'
  const accepted=await callback(inbound(replyTo,{text:answer}));assert.equal(accepted.status,201,accepted.text)
  assert.equal(sent.length,before.sent+1);assert.deepEqual(sent.at(-1).to,[recipient]);assert.ok(sent.at(-1).text.includes(answer))
  assert.equal((await answers())[0].text,answer,'the complete plaintext, including quoted text, is retained')
  assert.equal((await answers())[0].source,'email');assert.ok((await keys()).find(k=>k.id===key.id).used_at)
  assert.equal((await accepted.deliver()).status,409,'the exact signed webhook replay is refused')
  assert.equal(sent.length,before.sent+1);assert.equal((await answers()).length,1)
  assert.ok(!(await queue()).some(q=>q.id===question.id),'an answered thread leaves the owner open queue')

  assert.equal((await ask('scope','Can we shoot on Tuesday?',cookie)).status,200)
  const appQuestion=(await queue()).find(q=>q.section==='scope'),firstAddress=sent.at(-1).reply_to
  await h.cmd('question.email',{id,questionId:appQuestion.id});const secondAddress=sent.at(-1).reply_to
  assert.notEqual(secondAddress,firstAddress)
  const beforeRefusals=sent.length
  assert.equal((await callback(inbound(firstAddress))).status,409,'re-notice revokes the previous unspent address')
  const secondHash=createHash('sha256').update(secondAddress.split('@')[0]).digest('hex')
  await h.db.prepare('UPDATE p_question_reply_keys SET expires_at=? WHERE keyhash=?').bind(Date.now()-1,secondHash).run()
  assert.equal((await callback(inbound(secondAddress))).status,409,'expired reply authority cannot answer')
  assert.equal(sent.length,beforeRefusals);assert.equal((await answers()).length,1)
  await h.cmd('question.email',{id,questionId:appQuestion.id});const currentAddress=sent.at(-1).reply_to
  const owner=await h.db.prepare('SELECT id,email,version FROM oa_operators WHERE email=?').bind(h.auth.OWNER_EMAIL).first()
  // No HTTP clock or identity bypass exists; change the real authority fixture directly.
  await h.db.prepare('UPDATE oa_operators SET email=?,version=version+1 WHERE id=?').bind('replacement@studio.example',owner.id).run()
  try{assert.equal((await callback(inbound(currentAddress))).status,403,'a changed owner invalidates previously issued authority')}
  finally{await h.db.prepare('UPDATE oa_operators SET email=?,version=? WHERE id=?').bind(owner.email,owner.version,owner.id).run()}
  await h.send('/auth/invite',{email:'question-member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner)
  const member=await h.signIn('question-member@studio.example')
  const scoped=await h.send('/api/platter/questions',undefined,member);assert.equal(scoped.status,200);assert.deepEqual(scoped.value.questions,[],'the sales member sees no foreign question')
  await h.cmd('question.answer',{id,questionId:appQuestion.id,text:'Tuesday works.',requestId:'member-attempt'},member,403)
  const agent=await h.cmd('agent.create',{label:'Question boundary'})
  assert.equal((await h.send('/api/platter/agent/command',{name:'question.answer',input:{id,questionId:appQuestion.id,text:'Unauthorized'}},'',{authorization:'Bearer '+agent.token})).status,403)
  await h.cmd('question.answer',{id,questionId:appQuestion.id,text:'Tuesday works.',requestId:'tuesday-answer'})
  const afterAppAnswer=sent.length
  await h.cmd('question.answer',{id,questionId:appQuestion.id,text:'Tuesday works.',requestId:'tuesday-answer'})
  assert.equal((await answers()).length,2,'a repeated app request does not append another answer')
  assert.equal(sent.length,afterAppAnswer,'a repeated app request does not notify the client twice')
  let current=(await h.state()).proposals.find(p=>p.id===id)
  await h.cmd('expiry.set',{id,version:current.version,mode:'date',date:'2020-01-01'})
  assert.equal((await ask('terms','Can we archive the signed terms?',cookie)).status,200,'expiry leaves the current sent revision open for discussion')
  const history=await h.send(path,undefined,cookie);assert.equal(history.status,200)
  assert.match(history.text,/usage rights are included/);assert.match(history.text,/Tuesday works/)
  current=(await h.state()).proposals.find(p=>p.id===id)
  await h.cmd('proposal.negotiate',{...offer,id,clientId:current.client_id,version:current.version,scope:'Revised studio shoot and edited photographs.'})
  current=(await h.state()).proposals.find(p=>p.id===id)
  await h.cmd('expiry.remove',{id,version:current.version})
  current=(await h.state()).proposals.find(p=>p.id===id)
  await h.cmd('proposal.approve',{id,version:current.version,revision:current.revision})
  current=(await h.state()).proposals.find(p=>p.id===id)
  const replaced=await h.cmd('proposal.send',{id,version:current.version}),agreementPath=new URL(replaced.shareUrl).pathname
  assert.equal((await h.send(path,undefined,cookie)).status,404,'a retired invitation cannot read threads')
  assert.equal((await h.send(agreementPath+'/action?name=code.request',{})).status,200)
  const newCode=sent.at(-1).text.match(/\b\d{6}\b/)[0],newVerification=await h.send(agreementPath+'/action?name=code.verify',{code:newCode})
  assert.equal(newVerification.status,200,newVerification.text)
  assert.ok(!(await h.send(agreementPath,undefined,newVerification.cookie)).text.includes('Does that cover usage rights?'),'unsigned revision shows only its own section questions')
  const acceptedPage=await h.send(agreementPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},newVerification.cookie)
  assert.equal(acceptedPage.status,200,acceptedPage.text)
  const retained=await h.send(agreementPath,undefined,newVerification.cookie);assert.match(retained.text,/usage rights are included/);assert.match(retained.text,/Tuesday works/);assert.match(retained.text,/Can we archive the signed terms/)
  assert.equal((await answers())[0].question_id,question.id,'agreement history keeps the original revision thread identity')
  const publicViews=[JSON.stringify(await h.state()),JSON.stringify(await queue()),retained.text,(await h.send('/api/platter/audit',undefined,h.owner)).text]
  const custody=JSON.stringify({keys:await keys(),mail:await mailRows(h)})
  for(const address of sent.map(mail=>mail.reply_to).filter(Boolean)){
   assert.ok(!custody.includes(address.split('@')[0]),'reply credentials are never stored in plaintext')
   for(const view of publicViews)assert.ok(!view.includes(address.split('@')[0]),'reply credentials never enter public history or state')
  }
 }finally{await h.close()}
})

test('client questions are limited per invitation, and a refused question stores nothing and mails no one', {timeout:60000}, async()=>{
 const h=await harness()
 try{
  const invite=async()=>{const id=await approved(h),path=new URL((await h.cmd('proposal.send',{id,version:2})).shareUrl).pathname;assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(id).first()).body.match(/\b\d{6}\b/)[0],r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);return {id,path,cookie:r.cookie}}
  const ask=(c,section,text)=>h.send(c.path+'/action?name=question.create',{revision:1,section,text},c.cookie)
  const recorded=async id=>({questions:(await h.db.prepare('SELECT COUNT(*) AS n FROM p_questions WHERE proposal_id=?').bind(id).first()).n,notices:(await h.db.prepare("SELECT COUNT(*) AS n FROM p_mail WHERE proposal_id=? AND recipient=? AND subject LIKE 'Client question:%'").bind(id,h.auth.OWNER_EMAIL).first()).n})
  const first=await invite();let accepted=0,refused
  for(let i=0;i<50&&!refused;i++){const r=await ask(first,['scope','pricing','terms'][i%3],'Can we start next week?');if(r.status===200)accepted++;else refused=r}
  assert.equal(refused?.status,429,'repeated questions on one invitation are refused')
  assert.ok(accepted>=3,'the client can still ask about every section')
  assert.deepEqual(await recorded(first.id),{questions:accepted,notices:accepted})
  assert.equal((await ask(first,'terms','A different question')).status,429)
  assert.deepEqual(await recorded(first.id),{questions:accepted,notices:accepted},'a refused question stores nothing and queues no owner mail')
  const second=await invite();assert.equal((await ask(second,'scope','Can we start next week?')).status,200,'another invitation keeps its own allowance')
 }finally{await h.close()}
})

test('MAIL-001 local proposal and verification mail are captured without provider contact', async () => {
  let calls = 0
  const h = await harness({ outboundService: () => { calls++; return new Response(null, { status: 502 }) } })
  try {
    const id = await approved(h)
    const { shareUrl } = await h.cmd('proposal.send', { id, version: 2 })
    const path = new URL(shareUrl).pathname
    const sent = (await h.state()).outbox
    assert.equal(sent.length, 1)
    assert.equal(sent[0].status, 'local')
    assert.equal(sent[0].recipient, recipient)
    assert.ok(sent[0].body.includes(shareUrl))
    const requested = await h.send(path + '/action?name=code.request', {})
    assert.equal(requested.status, 200, requested.text)
    const outbox = (await h.state()).outbox
    assert.equal(outbox.length, 2)
    assert.ok(outbox.every(row => row.status === 'local' && row.recipient === recipient && row.proposal_id === id))
    const verification = outbox.find(row => row.id !== sent[0].id)
    const code = verification.body.match(/\b\d{6}\b/)?.[0]
    assert.ok(code, 'captured verification mail contains a usable code')
    const verified = await h.send(path + '/action?name=code.verify', { code })
    assert.equal(verified.status, 200, verified.text)
    assert.ok(verified.cookie)
    const question=await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'Can we schedule the shoot next week?'},verified.cookie)
    assert.equal(question.status,200,question.text)
    const questionNotice=(await mailRows(h)).find(row=>row.body.includes('Can we schedule the shoot next week?'))
    assert.ok(questionNotice);assert.equal(questionNotice.reply_to,null)
    assert.equal(calls, 0, 'local mail never contacts an external sender')
  } finally { await h.close() }
})

test('MAIL-001 Managed relay sends proposal invitations and verification codes through its assigned endpoint', async () => {
  const calls = []
  const relay = 'https://mail.synthetic-platter.example/send'
  const h = await harness({origin: 'https://platter.example',
    auth: {AUTH_LOCAL: 'false', MAIL_PROVIDER: 'rer', MAIL_RELAY_URL: relay, MAIL_API_KEY: 'synthetic-platter-9001'},
    outboundService: async request => {
      assert.equal(request.url, relay)
      assert.equal(request.headers.get('authorization'), 'Bearer synthetic-platter-9001')
      const body = await request.json()
      assert.equal(Object.hasOwn(body, 'from'), false)
      assert.equal(Object.hasOwn(body, 'installationId'), false)
      calls.push(body)
      return Response.json({messageId: '<synthetic-platter-' + (9002 + calls.length) + '@relay.example>'}, {status: 202})
    },
  })
  try {
    await finishSetup(h)
    const id = await approved(h)
    const sent = await h.cmd('proposal.send', {id, version: 2})
    assert.equal(calls[0].to, recipient)
    assert.ok(calls[0].text.includes(sent.shareUrl))
    assert.equal((await h.state()).proposals.find(p => p.id === id).delivery, 'accepted')
    const path = new URL(sent.shareUrl).pathname
    assert.equal((await h.send(path + '/action?name=code.request', {})).status, 200)
    const code = calls[1].text.match(/\b\d{6}\b/)?.[0]
    assert.ok(code)
    assert.equal((await h.send(path + '/action?name=code.verify', {code})).status, 200)
    assert.ok((await mailRows(h)).every(row => row.status === 'accepted'))
  } finally { await h.close() }
})

test('MAIL-001 hosted mail commits and claims before provider acceptance; timeout is uncertain and never resent', { timeout: 60000 }, async () => {
  const calls = []
  let timeoutNext = false
  let releaseTimeout
  const stalled = new Promise(resolve => { releaseTimeout = resolve })
  const h = await harness({
    origin: 'https://platter.example',
    auth: { AUTH_LOCAL: 'false', MAIL_PROVIDER: 'resend', MAIL_API_KEY: 'mail-test-key' },
    // This replaces only outbound HTTP. Auth, commands, D1 transactions,
    // signing, dispatch and the Resend serializer/response parser are real.
    outboundService: async (request, mf) => {
      const body = await request.json()
      const db = await mf.getD1Database('DB')
      const row = await db.prepare(`SELECT m.*, p.status AS proposal_status, p.version AS proposal_version,
        p.revision AS proposal_revision, s.token, s.revision AS share_revision,
        s.code_hash, s.code_generation, s.code_expires, s.code_sent_at
        FROM p_mail m JOIN p_proposals p ON p.id=m.proposal_id
        JOIN p_shares s ON s.proposal_id=p.id WHERE m.id=?`)
        .bind(request.headers.get('idempotency-key')).first()
      const timeout = timeoutNext
      timeoutNext = false
      calls.push({ url: request.url, method: request.method, body, row, timeout })
      // No response reaches the adapter before its real transport deadline.
      if (timeout) await stalled
      return Response.json({ id: 'provider-' + calls.length })
    },
  })
  try {
    await finishSetup(h)
    const id = await approved(h)
    const first = await h.cmd('proposal.send', { id, version: 2 })
    assert.equal(calls.length, 1)
    const submission = calls[0]
    assert.equal(submission.url, 'https://api.resend.com/emails')
    assert.equal(submission.method, 'POST')
    assert.equal(submission.row.status, 'sending', 'durable row is claimed before provider contact')
    assert.equal(submission.row.proposal_status, 'sent')
    assert.equal(submission.row.proposal_version, 3)
    assert.equal(submission.row.share_revision, submission.row.proposal_revision)
    assert.equal(first.shareUrl, h.origin + '/p/' + submission.row.token)
    assert.deepEqual(submission.body.to, [recipient])
    assert.equal(submission.body.text, submission.row.body)
    assert.equal(submission.body.subject, submission.row.subject)
    assert.equal((await mailRows(h)).find(row => row.id === submission.row.id).status, 'accepted')
    assert.equal((await h.state()).proposals.find(p => p.id === id).delivery, 'accepted')
    const acceptedPage = await h.send('/app/proposal?id=' + id, undefined, h.owner)
    assert.equal(acceptedPage.status, 200, acceptedPage.text)
    assert.match(acceptedPage.text, /Accepted by provider/i)
    assert.doesNotMatch(acceptedPage.text, /\bdelivered\b/i)
    assert.deepEqual((await h.state()).outbox, [], 'hosted mail bodies are not exposed as a local outbox')

    // A rejected stale action neither changes the share nor leaves orphan mail.
    await h.cmd('proposal.send', { id, version: 2 }, h.owner, 409)
    assert.equal((await mailRows(h)).length, 1)
    assert.equal((await h.state()).proposals.find(p => p.id === id).shareToken, submission.row.token)
    assert.equal(calls.length, 1)

    const firstPath = new URL(first.shareUrl).pathname
    const verification = await h.send(firstPath + '/action?name=code.request', {})
    assert.equal(verification.status, 200, verification.text)
    assert.equal(calls.length, 2)
    const codeSubmission = calls[1]
    assert.equal(codeSubmission.row.status, 'sending')
    assert.equal(codeSubmission.row.proposal_id, id)
    assert.ok(codeSubmission.row.code_hash, 'verification state is durable before the provider call')
    assert.equal(codeSubmission.row.code_generation, 1)
    assert.ok(codeSubmission.row.code_expires > codeSubmission.row.code_sent_at)
    const code = codeSubmission.body.text.match(/\b\d{6}\b/)?.[0]
    assert.ok(code)
    const verified = await h.send(firstPath + '/action?name=code.verify', { code })
    assert.equal(verified.status, 200, verified.text)
    assert.ok(verified.cookie, 'the emailed code matches the committed verification state')

    timeoutNext = true
    const replacement = await h.cmd('proposal.send', { id, version: 3 })
    assert.equal(calls.length, 3)
    const timedOut = calls[2]
    assert.equal(timedOut.timeout, true)
    assert.equal(timedOut.row.status, 'sending')
    assert.equal(timedOut.row.proposal_version, 4)
    assert.notEqual(replacement.shareUrl, first.shareUrl)
    assert.equal((await mailRows(h)).find(row => row.id === timedOut.row.id).status, 'uncertain')
    assert.equal((await h.state()).proposals.find(p => p.id === id).delivery, 'uncertain')
    const uncertainPage = await h.send('/app/proposal?id=' + id, undefined, h.owner)
    assert.equal(uncertainPage.status, 200, uncertainPage.text)
    assert.match(uncertainPage.text, /Status unknown/i)
    assert.doesNotMatch(uncertainPage.text, /\bdelivered\b/i)

    // Two subsequent public actions dispatch this same proposal again.
    // Only the newly queued rows may cross the network boundary.
    const secondCode = await h.send(new URL(replacement.shareUrl).pathname + '/action?name=code.request', {})
    assert.equal(secondCode.status, 200, secondCode.text)
    assert.equal(calls.length, 4)
    await h.cmd('proposal.send', { id, version: 4 })
    assert.equal(calls.length, 5)
    assert.equal(new Set(calls.map(call => call.row.id)).size, calls.length)
    assert.equal(calls.filter(call => call.row.id === timedOut.row.id).length, 1)
    const persisted = await mailRows(h)
    assert.equal(persisted.length, 5)
    assert.equal(persisted.find(row => row.id === timedOut.row.id).status, 'uncertain')
    assert.ok(persisted.filter(row => row.id !== timedOut.row.id).every(row => row.status === 'accepted'))
  } finally {
    releaseTimeout()
    await h.close()
  }
})

// The fake is only the configured provider's outbound HTTP and signed callback.
// Native sessions, application HTTP, D1, serializers and intake are production.
test('SEND-006 / SEND-002 signed provider delivery, durable sender notice and actionable address correction', { timeout: 120000 }, async () => {
 const { createHmac, randomBytes } = await import('node:crypto')
 const keyBytes=randomBytes(32), webhookKey='whsec_'+keyBytes.toString('base64')
 const calls=[]
 let h
 h=await harness({ origin:'https://platter.example', auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'fake-network-key',MAIL_WEBHOOK_KEY:webhookKey},
  outboundService:async request=>{calls.push(await request.json());return Response.json({id:'provider-'+calls.length})},
 })
 const event=async(id,type,at=Date.now(),options={})=>{
  const body=JSON.stringify({type,created_at:new Date(at).toISOString(),data:{email_id:options.message??'provider-'+id,to:options.to??[recipient]}})
  const eid=options.eventId??'event-'+randomBytes(8).toString('hex'),timestamp=String(Math.floor(Date.now()/1000))
  const signature=createHmac('sha256',keyBytes).update(eid+'.'+timestamp+'.'+body).digest('base64')
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/mail/events',{method:'POST',headers:{'content-type':'application/json','svix-id':eid,'svix-timestamp':timestamp,'svix-signature':options.bad?'v1,invalid':'v1,'+signature},body})
  return {status:response.status,body,eid,timestamp,signature}
 }
 const state=async()=>h.state()
 const page=async id=>(await h.send('/app/proposal?id='+id,undefined,h.owner)).text
 try {
  await finishSetup(h)
  const ids=[]
  for(let i=0;i<3;i++){const id=await approved(h);ids.push(id);await h.cmd('proposal.send',{id,version:2})}
  assert.equal(calls.length,3)
  assert.deepEqual((await state()).proposals.map(p=>p.delivery),['accepted','accepted','accepted'])
  assert.match(await page(ids[0]),/Accepted by provider/)
  const base=Date.now()-10000
  assert.equal((await event(1,'email.delivered',base)).status,200)
  assert.equal((await state()).proposals.find(p=>p.id===ids[0]).delivery,'delivered')
  assert.match(await page(ids[0]),/Delivery reported/)
  assert.equal((await event(2,'email.delivery_delayed',base)).status,200)
  assert.equal((await state()).proposals.find(p=>p.id===ids[1]).delivery,'deferred')
  assert.match(await page(ids[1]),/Delivery delayed/)
  assert.equal((await event(2,'email.delivered',base+1000)).status,200)
  assert.equal((await state()).proposals.find(p=>p.id===ids[1]).delivery,'delivered')
  // Terminal delivery cannot regress on a later-arriving delay or acceptance.
  await event(2,'email.delivery_delayed',base+2000)
  await event(2,'email.sent',base+3000)
  assert.equal((await state()).proposals.find(p=>p.id===ids[1]).delivery,'delivered')
  assert.equal((await event(1,'email.complained',base+2000)).status,200)
  assert.equal((await state()).proposals.find(p=>p.id===ids[0]).delivery,'complained')
  assert.match(await page(ids[0]),/Spam complaint reported/)
  assert.equal((await event(3,'email.bounced',base,{bad:true})).status,400)
  assert.equal((await event(3,'email.bounced',base,{to:['intruder@example.com']})).status,400)
  assert.equal((await event(3,'email.bounced',base,{message:'unrelated-message'})).status,400)
  assert.equal((await event(3,'email.bounced',base,{to:[recipient,'intruder@example.com']})).status,400)
  assert.equal((await state()).bounceNotices.length,0)
  const bounce=await event(3,'email.bounced',base)
  assert.equal(bounce.status,200)
  const replay=await h.mf.dispatchFetch(h.origin+'/api/platter/mail/events',{method:'POST',headers:{'svix-id':bounce.eid,'svix-timestamp':bounce.timestamp,'svix-signature':'v1,'+bounce.signature},body:bounce.body})
  assert.equal(replay.status,200);await replay.text()
  let s=await state(),notice=s.bounceNotices[0]
  assert.equal(s.bounceNotices.length,1);assert.equal(s.proposals.find(p=>p.id===ids[2]).delivery,'bounced')
  assert.equal(notice.closed_at,null);assert.equal(notice.read_at,null);assert.equal(notice.recipient,recipient)
  const inbox=await h.send('/app',undefined,h.owner)
  assert.match(inbox.text,/Bounced invitation to avery@northstar.example/);assert.match(inbox.text,/Open follow-up/)
  await h.cmd('delivery.read',{noticeId:notice.id})
  notice=(await state()).bounceNotices[0];assert.ok(notice.read_at);assert.equal(notice.closed_at,null)
  assert.equal(calls.length,3,'reading or receiving a bounce never sends mail')
  const old=s.proposals.find(p=>p.id===ids[2]),oldPath='/p/'+old.shareToken
  const corrected=await h.cmd('delivery.correct',{noticeId:notice.id,email:'corrected@northstar.example'})
  assert.deepEqual(calls.at(-1).to,['corrected@northstar.example'])
  s=await state();assert.ok(s.bounceNotices[0].closed_at);assert.match(s.bounceNotices[0].action,/corrected@northstar.example/)
  assert.equal(s.clients.find(c=>c.id===old.client_id).email,recipient,'invitation correction does not merge or edit client identity')
  const changed=s.proposals.find(p=>p.id===ids[2]);assert.equal(changed.revision,old.revision);assert.equal(changed.scope,old.scope);assert.deepEqual(changed.options,old.options)
  assert.equal((await h.send(oldPath)).status,404)
  const path=new URL(corrected.shareUrl).pathname
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  assert.deepEqual(calls.at(-1).to,['corrected@northstar.example'],'mailbox verification follows corrected invitation')
  // Repeated callback after all user actions preserves the same workflow.
  const again=await h.mf.dispatchFetch(h.origin+'/api/platter/mail/events',{method:'POST',headers:{'svix-id':bounce.eid,'svix-timestamp':bounce.timestamp,'svix-signature':'v1,'+bounce.signature},body:bounce.body});assert.equal(again.status,200);await again.text()
  assert.equal((await state()).bounceNotices.length,1)
  assert.ok((await state()).bounceNotices[0].closed_at)
  const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  assert.ok(audit.some(r=>r.action==='delivery.correct'))
  // A rehearsal must not release another queued invitation or create a client bounce task.
  const testId=await approved(h),queuedId=crypto.randomUUID(),callsBefore=calls.length
  await h.db.prepare("INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at,sender_id,provider) VALUES(?,?,?,?,?,'pending',?,?,?)").bind(queuedId,testId,recipient,'Your proposal: waiting','A queued client invitation',Date.now(),(await state()).actor.id,'resend').run()
  await h.cmd('proposal.test-mail',{id:testId,version:2,subject:'Proposal for Northstar',message:'Hi Avery, review the scope.'})
  assert.equal(calls.length,callsBefore+1,'SEND-006 sends exactly its own queued message')
  const rehearsal=calls.at(-1)
  assert.deepEqual(rehearsal.to,[h.auth.OWNER_EMAIL])
  assert.equal(rehearsal.subject,'[Test] Proposal for Northstar')
  assert.equal(rehearsal.text,'Hi Avery, review the scope.\n\nPreview this revision (sign-in required):\n'+h.origin+'/app/preview?'+new URLSearchParams({id:testId,revision:'1'}))
  assert.equal((await h.db.prepare('SELECT status FROM p_mail WHERE id=?').bind(queuedId).first()).status,'pending')
  assert.equal((await event(calls.length,'email.bounced',Date.now(),{to:[h.auth.OWNER_EMAIL]})).status,200)
  const afterTest=await state()
  assert.equal(afterTest.bounceNotices.length,1,'a bounced rehearsal never opens a client follow-up')
  assert.ok(afterTest.proposals.find(p=>p.id===testId).deliveries.every(d=>d.recipient===recipient),'rehearsals never appear as client invitation delivery')
 }finally{await h.close()}
})

test('SEND-002 SendGrid signed correlation, queued state, uncertainty and logged dismissal', {timeout:60000}, async()=>{
 const {generateKeyPairSync,sign,randomBytes}=await import('node:crypto')
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'})
 const key=publicKey.export({type:'spki',format:'der'}).toString('base64'),calls=[]
 let refuse=false
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'network-fake-key',MAIL_WEBHOOK_KEY:key},outboundService:async req=>{calls.push(await req.json());return new Response(null,{status:refuse?503:202,headers:{'x-message-id':'provider-'+calls.length}})}})
 try{
  await finishSetup(h)
  const id=await approved(h);await h.cmd('proposal.send',{id,version:2})
  const mailId=calls[0].custom_args.rer_delivery_id
  const timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify([{sg_event_id:'sg-'+randomBytes(6).toString('hex'),sg_message_id:'sg-unique-event-message',event:'bounce',timestamp:Number(timestamp),email:recipient,rer_delivery_id:mailId}])
  const signature=sign('sha256',Buffer.from(timestamp+body),privateKey).toString('base64')
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/mail/events',{method:'POST',headers:{'x-twilio-email-event-webhook-timestamp':timestamp,'x-twilio-email-event-webhook-signature':signature},body})
  assert.equal(response.status,200);await response.text()
  assert.equal((await h.state()).proposals[0].delivery,'bounced')
  assert.equal((await h.state()).bounceNotices.length,1)
  const noticeId=(await h.state()).bounceNotices[0].id
  // Only this sending owner has access to the follow-up action.
  await h.send('/auth/invite',{email:'member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner)
  const member=await h.signIn('member@studio.example')
  assert.deepEqual((await h.state(member)).bounceNotices,[])
  await h.cmd('delivery.dismiss',{noticeId,reason:'Invalid address'},member,403)
  refuse=true
  await h.cmd('delivery.correct',{noticeId,email:'corrected@northstar.example'})
  let notice=(await h.state()).bounceNotices[0]
  assert.equal(notice.closed_at,null,'unconfirmed correction never silently closes work')
  assert.equal((await h.state()).proposals[0].delivery,'uncertain')
  await h.cmd('delivery.dismiss',{noticeId,reason:''},h.owner,400)
  await h.cmd('delivery.dismiss',{noticeId,reason:'Called Avery; will provide a new address next week'})
  notice=(await h.state()).bounceNotices[0]
  assert.ok(notice.closed_at);assert.match(notice.action,/Called Avery/)
  await h.cmd('delivery.correct',{noticeId,email:recipient},h.owner,409)
 }finally{await h.close()}
 for(const provider of ['development','cloudflare']){
  const queued=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:provider}})
  try{await finishSetup(queued);const id=await approved(queued);await queued.cmd('proposal.send',{id,version:2});const page=(await queued.send('/app/proposal?id='+id,undefined,queued.owner)).text
   if(provider==='development'){assert.equal((await queued.state()).proposals[0].delivery,'pending');assert.match(page,/Queued/)}
   else assert.match(page,/Delivery events unavailable with this mail transport/i)
  }finally{await queued.close()}
 }
})

test('APPROVE-003 / TEAM-001 a sales sender owns bounce correction, foreign senders are refused, and every fresh invitation obeys the current approval policy',async()=>{
 const {resendEvents}=await import('./delivery-provider.mjs'),events=resendEvents(),calls=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-201',MAIL_WEBHOOK_KEY:events.key},outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.resend.com');calls.push(await request.json());return Response.json({id:'synthetic-platter-'+(300+calls.length)})}})
 try{
  const team=await h.cmd('team.create',{name:'Delivery team'}),people={}
  for(const role of ['sales','manager']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),person=(await h.state(cookie)).actor;await h.cmd('member.set',{operatorId:person.id,version:0,role,teams:[team.id]});people[role]={cookie,...person}}
  await h.cmd('approval.policy',{version:0,required:true,defaultRole:'manager'})
  const client=await h.cmd('client.save',{name:'Synthetic client',email:recipient}),p=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people.manager.cookie)
  const original=await h.cmd('proposal.send',{id:p.id,version:2},people.sales.cookie)
  const frozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot
  assert.equal((await events.emit(h,'synthetic-platter-301','email.bounced')).status,200)
  const notice=(await h.state(people.sales.cookie)).bounceNotices[0];assert.ok(notice);assert.equal(notice.sender_id,people.sales.id)
  assert.deepEqual((await h.state(people.manager.cookie)).bounceNotices,[])
  const before=(await h.db.prepare('SELECT * FROM p_bounce_notices WHERE id=?').bind(notice.id).first())
  await h.cmd('delivery.correct',{noticeId:notice.id,email:'corrected@synthetic-platter.example'},people.manager.cookie,403)
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_bounce_notices WHERE id=?').bind(notice.id).first(),before);assert.equal(calls.length,1)
  await h.cmd('approval.policy',{version:1,required:true,defaultRole:'admin'})
  await h.cmd('delivery.correct',{noticeId:notice.id,email:'corrected@synthetic-platter.example'},people.sales.cookie,409);assert.equal(calls.length,1)
  await h.cmd('member.set',{operatorId:people.manager.id,version:1,role:'admin',teams:[team.id]})
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:1},people.manager.cookie)
  const corrected=await h.cmd('delivery.correct',{noticeId:notice.id,email:'corrected@synthetic-platter.example'},people.sales.cookie)
  assert.deepEqual(calls[1].to,['corrected@synthetic-platter.example']);assert.equal(calls.length,2)
  assert.equal((await h.send(new URL(original.shareUrl).pathname)).status,404);assert.equal((await h.send(new URL(corrected.shareUrl).pathname)).status,200)
  assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot,frozen)
  assert.ok((await h.state(people.sales.cookie)).bounceNotices[0].closed_at)
 }finally{await h.close()}
})

test('SEND-001 OAuth mailboxes verify ownership and scopes, refresh, attribute sends, and visibly fall back without retrying uncertain mail', async()=>{
 let address='mailbox@synthetic-platter.example',verified=true,aliasVerified=true,hasSmtp=true,hasScope=true,refused=false,timeout=false,demoteDuringRefresh=false
 const inbound=inboundMailFixture(),calls=[],gmail=[],graph=[],installation=[]
 const h=await harness({origin:'https://platter.example',auth:{...inbound.settings,AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-5100',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-5101',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-5102',MICROSOFT_MAIL_CLIENT_ID:'synthetic-platter-5103',MICROSOFT_MAIL_CLIENT_SECRET:'synthetic-platter-5104'},outboundService:async request=>{
  const url=new URL(request.url);calls.push({host:url.hostname,path:url.pathname,method:request.method})
  if(['oauth2.googleapis.com','login.microsoftonline.com'].includes(url.hostname)){
   const body=new URLSearchParams(await request.text())
   if(body.get('grant_type')==='authorization_code'){assert.equal(body.get('redirect_uri'),'https://platter.example/api/platter/mailbox/callback');assert.ok(body.get('code_verifier').length>=43)}
   else {assert.equal(body.get('grant_type'),'refresh_token');assert.equal(body.get('refresh_token'),'synthetic-platter-5105')}
   if(demoteDuringRefresh&&body.get('grant_type')==='refresh_token'){
    demoteDuringRefresh=false
    const member=(await h.state()).teamPeople.find(p=>p.email==='sales@synthetic-platter.example')
    await h.cmd('member.set',{operatorId:member.id,version:member.version,role:'content_editor',teams:[]})
   }
   if(refused)return Response.json({error:'invalid_grant'},{status:400})
   return Response.json({access_token:'synthetic-platter-5106',refresh_token:'synthetic-platter-5105',scope:hasScope?(url.hostname==='oauth2.googleapis.com'?'openid email https://www.googleapis.com/auth/gmail.send':'User.Read Mail.Send'):'openid email',expires_in:3600})
  }
  if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-5107',email:'primary@synthetic-platter.example',email_verified:verified})
  if(url.pathname.endsWith('/settings/sendAs'))return Response.json({sendAs:[{sendAsEmail:address,verificationStatus:aliasVerified?'accepted':'pending'}]})
  if(url.pathname==='/v1.0/me')return Response.json({id:'synthetic-platter-5108',...(hasSmtp?{mail:address}:{}),userPrincipalName:address})
  if(url.pathname.endsWith('/messages/send')){
   const payload=await request.json(),raw=Buffer.from(payload.raw,'base64url').toString('utf8')
   gmail.push(raw);assert.match(raw,/^From: mailbox@synthetic-platter.example\r\n/);assert.match(raw,/\r\nTo: avery@northstar.example\r\n/)
   if(timeout)throw Error('Synthetic provider timeout')
   return Response.json({id:'synthetic-platter-'+(5200+gmail.length)})
  }
  if(url.pathname==='/v1.0/me/sendMail'){const payload=await request.json();graph.push(payload);assert.equal(payload.message.from.emailAddress.address,address);return new Response(null,{status:202})}
  if(url.hostname==='api.resend.com'&&request.method==='GET'){const message=inbound.messages.get(url.pathname.split('/').at(-1));assert.ok(message);return Response.json(message)}
  assert.equal(url.hostname,'api.resend.com');installation.push(await request.json());return Response.json({id:'synthetic-platter-'+(5300+installation.length)})
 }})
 try{
  await finishSetup(h)
  const people={}
  for(const role of ['sales','other','content_editor']){
   const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
   const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id
   await h.cmd('member.set',{operatorId:id,version:0,role:role==='other'?'sales':role,teams:[]})
   people[role]={cookie,id,email}
  }
  const authorize=async(provider,person=people.sales,mailbox=address)=>{
   const r=await h.send('/api/platter/mailbox/authorize',{provider,mailboxEmail:mailbox,consent:true},person.cookie)
   assert.equal(r.status,303,r.text);const url=new URL(r.headers.get('location'));assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(url.searchParams.get('code_challenge'));return '/api/platter/mailbox/callback?'+new URLSearchParams({state:url.searchParams.get('state'),code:'synthetic-platter-5400'})
  }
  const connect=async(provider,expected=303,person=people.sales)=>{
   const callback=await authorize(provider,person),r=await h.send(callback,undefined,person.cookie)
   assert.equal(r.status,expected,r.text);return callback
  }
  assert.equal((await h.send('/api/platter/mailbox/authorize',{provider:'gmail',consent:true},people.content_editor.cookie)).status,403)
  const callback=await authorize('gmail')
  assert.equal((await h.send(callback,undefined,people.other.cookie)).status,403)
  assert.equal((await h.send(callback,undefined,people.sales.cookie)).status,303)
  const beforeReplay=calls.length;assert.equal((await h.send(callback,undefined,people.sales.cookie)).status,403);assert.equal(calls.length,beforeReplay)
  const connection=(await h.state(people.sales.cookie)).connections[0];assert.equal(connection.mailboxEmail,address)
  const secrets=JSON.stringify((await h.db.prepare('SELECT * FROM p_connection_secrets').all()).results);assert.doesNotMatch(secrets,/synthetic-platter-510[256]/)
  const original=(await h.db.prepare('SELECT * FROM p_connections ORDER BY id').all()).results
  verified=false;await connect('gmail',403);verified=true
  aliasVerified=false;await connect('gmail',403);aliasVerified=true
  hasScope=false;await connect('gmail',403);hasScope=true
  address=people.other.email;await connect('gmail',403);address='mailbox@synthetic-platter.example'
  await connect('gmail',403,people.other)
  hasSmtp=false;await connect('microsoft',400);hasSmtp=true
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_connections ORDER BY id').all()).results,original,'all refused connections preserve the existing bindings')
  await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
  const client=await h.cmd('client.save',{name:'Northstar',email:recipient})
  const send=async()=>{
   const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie)
   await h.cmd('proposal.send',{id:p.id,version:1,mailRepliesConsent:true},people.sales.cookie)
   return (await h.state(people.sales.cookie)).proposals.find(r=>r.id===p.id)
  }
  const google=await send();assert.equal(gmail.length,1);assert.equal(installation.length,0)
  assert.deepEqual(google.mailAttributions.map(m=>[m.actor_id,m.route,m.sender_address,m.outcome]),[[people.sales.id,'gmail',address,'accepted']])
  assert.equal(google.deliveries[0].status,'accepted');assert.equal(google.deliveries[0].provider,'gmail')
  const audit=(await h.send('/api/platter/audit?action=mail.accepted&subject='+google.id,undefined,h.owner)).value.rows
  assert.equal(audit[0].actor_id,people.sales.id);assert.equal(audit[0].mail_route,'gmail');assert.equal(audit[0].sender_address,address)
  const timeline=await h.send('/app/proposal?id='+google.id,undefined,people.sales.cookie);assert.match(timeline.text,/mailbox@synthetic-platter.example/);assert.match(timeline.text,/Accepted by provider/)
  await connect('microsoft')
  const microsoft=await send();assert.equal(graph.length,1);assert.equal(microsoft.mailAttributions[0].route,'microsoft');assert.equal(microsoft.mailAttributions[0].sender_address,address);assert.equal(microsoft.mailAttributions[0].outcome,'accepted')
  const googleReply=gmail[0].match(/\r\nReply-To: ([^\r\n]+)/)[1],microsoftReply=graph[0].message.replyTo[0].emailAddress.address
  assert.equal((await inbound.deliver(h,googleReply,recipient,'Wrong signature',{badSignature:true})).status,401)
  assert.equal((await inbound.deliver(h,googleReply,'other@synthetic-platter.example','Wrong sender')).status,403)
  assert.equal((await inbound.deliver(h,googleReply,recipient,'Private address '+googleReply)).status,422)
  assert.equal((await inbound.deliver(h,googleReply,recipient,'Attachment',{message:{attachments:[{id:'synthetic-platter-5900',filename:'file.txt',size:10,content_type:'text/plain'}]}})).status,422)
  assert.equal((await inbound.deliver(h,googleReply,recipient,'x'.repeat(10001))).status,422)
  const beforeReplies=installation.length
  const custody=async()=>Object.fromEntries(await Promise.all(['p_mail_replies','p_mail_reply_keys','p_mail_reply_cap_notices','p_audit','p_mail','p_proposals','p_approvals','p_acceptances'].map(async table=>[table,(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results])))
  const automatic=[{headers:{'AuTo-SuBmItTeD':'auto-replied'}},{headers:{'Auto-Submitted':'auto-generated'}},{headers:{Precedence:'bulk'}},{headers:{precedence:'list'}},{headers:{precedence:'junk'}},{headers:{'X-Autoreply':'yes'}},{headers:{'X-Autorespond':'yes'}},{headers:{'List-Id':'synthetic-platter-5901'}},{subject:'Out of office: proposal'},{subject:'Automatic reply: proposal'},{subject:'Vacation response'},{headers:{'Auto-Submitted':'auto-replied'},text:null,attachments:[{id:'synthetic-platter-5902',filename:'out.txt',size:10,content_type:'text/plain'}]}]
  const untouched=await custody()
  for(const message of automatic)assert.equal((await inbound.deliver(h,googleReply,recipient,'Automatic message',{message})).status,204)
  assert.deepEqual(await custody(),untouched,'automatic and bulk mail leave no record, notice, audit, state change or consumed capability')
  for(const [proposal,replyTo] of [[google,googleReply],[microsoft,microsoftReply]]){
   const businessBefore=await h.db.prepare('SELECT * FROM p_proposals WHERE id=?').bind(proposal.id).first(),decisionsBefore=(await h.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(proposal.id).all()).results
   const receipts=await Promise.all(Array.from({length:proposal.id===microsoft.id?2:1},()=>inbound.deliver(h,replyTo,recipient,'Can we start next Monday?',{message:{headers:{'Auto-Submitted':'no','Authentication-Results':'forged; spf=pass; dkim=pass'},authentication:proposal.id===google.id?{spf:'fail',dkim:'gray'}:null}})))
   assert.deepEqual(receipts.map(r=>r.status).sort(),proposal.id===microsoft.id?[201,409]:[201]);const receipt=receipts.find(r=>r.status===201);assert.equal((await receipt.submit()).status,409)
   const saved=(await h.state(people.sales.cookie)).proposals.find(p=>p.id===proposal.id).mailReplies
   assert.equal(saved.length,1);assert.equal(saved[0].text,'Can we start next Monday?');assert.equal(saved[0].client_email,recipient);assert.equal(saved[0].claimed_from,recipient);assert.equal(saved[0].spf_result,proposal.id===google.id?'fail':'unavailable');assert.equal(saved[0].dkim_result,proposal.id===google.id?'gray':'unavailable')
   assert.deepEqual(await h.db.prepare('SELECT * FROM p_proposals WHERE id=?').bind(proposal.id).first(),businessBefore,'an email never changes the proposal, revision, approval or signature state');assert.deepEqual((await h.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(proposal.id).all()).results,decisionsBefore);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first()).n,0)
   assert.match((await h.send('/app/proposal?id='+proposal.id,undefined,people.sales.cookie)).text,/Can we start next Monday\?/)
   const replyPage=(await h.send('/app/proposal?id='+proposal.id,undefined,people.sales.cookie)).text;assert.match(replyPage,/Claimed From:/);assert.match(replyPage,/From address is not proven client identity/);assert.match(replyPage,/does not approve, sign or change/);assert.match(replyPage,new RegExp('Resend SPF: '+saved[0].spf_result+' · DKIM: '+saved[0].dkim_result))
   assert.ok(!(await h.state(people.other.cookie)).proposals.some(p=>p.id===proposal.id),'reply text inherits proposal scope')
   const audit=(await h.send('/api/platter/audit?action=mail.client-reply&subject='+proposal.id,undefined,h.owner)).value.rows
   assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'email');assert.equal(audit[0].actor_id,'email-reply');assert.match((await h.send('/app/audit?action=mail.client-reply&subject='+proposal.id,undefined,h.owner)).text,/An email sender \(identity unproven\)/)
  }
  const afterHuman=await custody()
  for(const message of automatic)assert.equal((await inbound.deliver(h,googleReply,recipient,'Automatic message',{message})).status,204)
  assert.deepEqual(await custody(),afterHuman,'automatic replies after the cap also generate no notice')
  assert.equal((await inbound.deliver(h,googleReply,'other@synthetic-platter.example','A forged cap hit')).status,403)
  assert.equal((await h.state()).replyCapNotices.filter(n=>n.proposal_id===google.id).length,1)
  const cap=await Promise.all(Array.from({length:4},()=>inbound.deliver(h,googleReply,recipient,'Please also accept this proposal')))
  assert.ok(cap.every(r=>r.status===409));assert.equal((await h.state()).replyCapNotices.filter(n=>n.proposal_id===google.id).length,1)
  assert.deepEqual((await h.state(people.sales.cookie)).replyCapNotices,[],'cap notices belong only to the owner')
  assert.match((await h.send('/app',undefined,h.owner)).text,/Email reply limits/)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mail_replies WHERE proposal_id=?').bind(google.id).first()).n,1)
  assert.equal((await inbound.deliver(h,googleReply,recipient,'One more reply')).status,409);assert.equal((await h.state()).replyCapNotices.filter(n=>n.proposal_id===google.id).length,1,'owner is told only once per invitation')
  const agent=await h.cmd('agent.create',{label:'Reply visibility check'})
  const agentContext=await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+agent.token});assert.equal(agentContext.status,200);assert.doesNotMatch(agentContext.text,/Can we start next Monday/);assert.ok(agentContext.value.proposals.every(p=>p.mailReplies.length===0))
  assert.equal(installation.length,beforeReplies,'incoming replies cause no automatic outgoing mail')
  assert.doesNotMatch(JSON.stringify(await h.state(people.sales.cookie)),new RegExp(googleReply.split('@')[0]))
  const blocked=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie)
  await h.cmd('member.set',{operatorId:people.sales.id,version:1,role:'content_editor',teams:[]})
  const beforeDenied=calls.length;await h.cmd('proposal.send',{id:blocked.id,version:1},people.sales.cookie,403);assert.equal(calls.length,beforeDenied)
  await h.cmd('member.set',{operatorId:people.sales.id,version:2,role:'sales',teams:[]})
  refused=true;const fallback=await send()
  assert.equal(graph.length,1);assert.equal(installation.length,1);assert.equal(fallback.mailAttributions[0].route,'installation');assert.equal(fallback.mailAttributions[0].fallback,1)
  assert.equal((await h.state(people.sales.cookie)).connections.find(c=>c.provider==='microsoft').status,'broken')
  assert.match((await h.send('/app/proposal?id='+fallback.id,undefined,people.sales.cookie)).text,/Mailbox unavailable; sent through the installation sender/)
  const fallbackAudit=(await h.send('/api/platter/audit?action=mail.accepted&subject='+fallback.id,undefined,h.owner)).value.rows[0]
  assert.equal(fallbackAudit.mail_route,'installation');assert.equal(fallbackAudit.sender_address,h.auth.MAIL_FROM)
  refused=false;await connect('gmail');timeout=true
  const uncertain=await send();assert.equal(gmail.length,2);assert.equal(installation.length,1,'uncertain outbound mail never falls back and duplicates a possible send')
  assert.equal(uncertain.mailAttributions[0].outcome,'uncertain');assert.equal(uncertain.mailAttributions[0].route,'gmail')
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
  assert.equal(gmail.length,2);assert.equal(installation.length,1)
  timeout=false;refused=true
  const gmailFallback=await send();assert.equal(gmail.length,2,'a refused Gmail refresh grant sends nothing through Gmail');assert.equal(installation.length,2)
  assert.equal(gmailFallback.mailAttributions[0].route,'installation');assert.equal(gmailFallback.mailAttributions[0].fallback,1);assert.equal((await h.state(people.sales.cookie)).connections.find(c=>c.provider==='gmail').status,'broken')
  assert.match((await h.send('/app/proposal?id='+gmailFallback.id,undefined,people.sales.cookie)).text,/Mailbox unavailable; sent through the installation sender/)
  const gmailFallbackAudit=(await h.send('/api/platter/audit?action=mail.accepted&subject='+gmailFallback.id,undefined,h.owner)).value.rows[0];assert.equal(gmailFallbackAudit.mail_route,'installation');assert.equal(gmailFallbackAudit.sender_address,h.auth.MAIL_FROM)
  refused=false;await connect('gmail');demoteDuringRefresh=true
  const raced=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie),sentBefore=gmail.length
  await h.cmd('proposal.send',{id:raced.id,version:1,mailRepliesConsent:true},people.sales.cookie,403)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mail_reply_keys WHERE proposal_id=?').bind(raced.id).first()).n,0,'authority loss cannot mint a client reply capability')
  assert.equal(gmail.length,sentBefore);assert.equal(installation.length,2,'loss of sending authority never falls back; only the two explicitly asserted provider-refusal fallbacks were sent')
  assert.equal((await h.state()).proposals.find(p=>p.id===raced.id).mailAttributions[0].outcome,'withheld')
  await h.cmd('member.set',{operatorId:people.sales.id,version:4,role:'sales',teams:[]})
  const rotated=await send(),oldReply=gmail.at(-1).match(/\r\nReply-To: ([^\r\n]+)/)[1]
  await h.cmd('proposal.send',{id:rotated.id,version:rotated.version,mailRepliesConsent:true},people.sales.cookie)
  assert.equal((await inbound.deliver(h,oldReply,recipient,'Old invitation')).status,409)
  const current=(await h.state(people.sales.cookie)).proposals.find(p=>p.id===rotated.id),currentReply=gmail.at(-1).match(/\r\nReply-To: ([^\r\n]+)/)[1]
  await h.cmd('proposal.withdraw',{id:current.id,version:current.version,reason:'Client request'},people.sales.cookie)
  assert.equal((await inbound.deliver(h,currentReply,recipient,'Withdrawn invitation')).status,409)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mail_replies WHERE proposal_id=?').bind(current.id).first()).n,0)
  assert.doesNotMatch(JSON.stringify(await h.state(people.sales.cookie)),/synthetic-platter-510[256]/)
 }finally{await h.close()}
})

test('SEND-001 / FOLLOW-001 signed-mailbox scheduled reminders honor recipient quiet hours, caps and terminal decisions without retrying uncertain sends', {timeout:120000}, async()=>{
 const sent=[],installation=[];let provider='gmail',refused=false
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-6000',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-6001',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-6002',MICROSOFT_MAIL_CLIENT_ID:'synthetic-platter-6003',MICROSOFT_MAIL_CLIENT_SECRET:'synthetic-platter-6004'},outboundService:async request=>{
  const url=new URL(request.url)
  if(['oauth2.googleapis.com','login.microsoftonline.com'].includes(url.hostname))return refused?Response.json({error:'invalid_grant'},{status:400}):Response.json({access_token:'synthetic-platter-6005',refresh_token:'synthetic-platter-6006',scope:url.hostname==='oauth2.googleapis.com'?'openid email https://www.googleapis.com/auth/gmail.send':'User.Read Mail.Send'})
  if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-6007',email:'own-mailbox@synthetic-platter.example',email_verified:true})
  if(url.hostname==='graph.microsoft.com'&&request.method==='GET')return Response.json({id:'synthetic-platter-6008',mail:'own-mailbox@synthetic-platter.example'})
  if(url.hostname==='gmail.googleapis.com'){
   const raw=Buffer.from((await request.json()).raw,'base64url').toString('utf8'),subject=Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString('utf8')
   sent.push({provider:'gmail',subject,from:raw.match(/^From: (.+)\r/m)[1],body:Buffer.from(raw.split('\r\n\r\n')[1],'base64').toString('utf8')})
   if(subject==='Reminder: timeout')throw Error('Synthetic uncertain mailbox response')
   return Response.json({id:'synthetic-platter-'+(6100+sent.length)})
  }
  if(url.hostname==='graph.microsoft.com'){
   const {message}=await request.json();sent.push({provider:'microsoft',subject:message.subject,from:message.from.emailAddress.address,body:message.body.content});return new Response(null,{status:202})
  }
  assert.equal(url.hostname,'api.resend.com');installation.push(await request.json());return Response.json({id:'synthetic-platter-'+(6200+installation.length)})
 }})
 try{
  await finishSetup(h);await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
  const worker=await h.mf.getWorker(),tick=async date=>worker.scheduled({scheduledTime:new Date(date),cron:'*/15 * * * *'})
  const connect=async value=>{provider=value;const auth=await h.send('/api/platter/mailbox/authorize',{provider,consent:true},h.owner);assert.equal(auth.status,303,auth.text);const state=new URL(auth.headers.get('location')).searchParams.get('state');assert.equal((await h.send('/api/platter/mailbox/callback?'+new URLSearchParams({state,code:'synthetic-platter-6009'}),undefined,h.owner)).status,303)}
  await connect('gmail');await tick('2030-03-08T14:00:00Z') // 6 am Pacific before the DST change.
  const client=await h.cmd('client.save',{name:'Reminder recipient',email:recipient}),proposals={}
  for(const name of ['cap','accepted','optout','withdrawn','declined','expired','disabled','timeout','fallback']){
   const p=await h.cmd('proposal.prepare',{...offer,title:name,clientId:client.id})
   await h.cmd('reminder.configure',{id:p.id,version:1,enabled:name!=='disabled',consent:true,timeZone:'America/Los_Angeles',afterDays:[2,5,9],beforeDays:[],cap:name==='cap'?2:3})
   const result=await h.cmd('proposal.send',{id:p.id,version:2});proposals[name]={id:p.id,path:new URL(result.shareUrl).pathname}
  }
  const reminders=()=>sent.filter(m=>m.subject.startsWith('Reminder:'))
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===proposals.cap.id).deliveryPreview.reminders.map(r=>r.slot),['after:2','after:5'],'send preview excludes reminders beyond the cap')
  await tick('2030-03-10T13:00:00Z');assert.equal(reminders().length,0,'a 6 am Pacific due time waits, including across DST')
  await tick('2030-03-10T14:59:00Z');assert.equal(reminders().length,0)
  await Promise.all([tick('2030-03-10T15:00:00Z'),tick('2030-03-10T15:00:00Z')]);assert.equal(reminders().length,8)
  assert.ok(reminders().every(m=>m.provider==='gmail'&&m.from==='own-mailbox@synthetic-platter.example'))
  const first=(await h.state()).proposals.find(p=>p.id===proposals.cap.id).reminderRuns[0];assert.equal(first.queued_at,Date.parse('2030-03-10T15:00:00Z'));assert.equal(first.time_zone,'America/Los_Angeles');assert.equal(first.transport_status,'accepted');assert.doesNotMatch(first.message,/\/p\/[a-f0-9]{64}/)
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===proposals.cap.id).deliveryPreview.reminders.map(r=>r.slot),['after:5'],'only the remaining unclaimed capped date is previewed')
  await tick('2030-03-10T15:15:00Z');assert.equal(reminders().length,8,'a claimed slot and an uncertain send are never resent')
  const verified=async name=>{const path=proposals[name].path;assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(proposals[name].id).first()).body.match(/\b\d{6}\b/)[0];const r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);return r.cookie}
  const acceptedCookie=await verified('accepted');assert.equal((await h.send(proposals.accepted.path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},acceptedCookie)).status,200)
  assert.equal((await h.send(proposals.optout.path+'/action?name=reminder.opt-out',{})).status,401)
  const optoutCookie=await verified('optout');assert.equal((await h.send(proposals.optout.path+'/action?name=reminder.opt-out',{},optoutCookie)).status,200)
  const beforeOptout=(await h.state()).proposals.find(p=>p.id===proposals.optout.id);assert.equal(beforeOptout.status,'sent');await h.cmd('reminder.send',{id:beforeOptout.id,requestId:'synthetic-platter-6010'},h.owner,409)
  const withdraw=(await h.state()).proposals.find(p=>p.id===proposals.withdrawn.id);await h.cmd('proposal.withdraw',{id:withdraw.id,version:withdraw.version,reason:'Stop reminders',notice:false})
  const declinedCookie=await verified('declined');assert.equal((await h.send(proposals.declined.path+'/action?name=decline',{revision:1,reason:'No longer needed'},declinedCookie)).status,410)
  const expiring=(await h.state()).proposals.find(p=>p.id===proposals.expired.id);await h.cmd('expiry.set',{id:expiring.id,version:expiring.version,mode:'date',date:'2030-03-11',warningDays:''})
  // Hold timeout's slot without enabling any blind retry. Disconnecting its mailbox does not replay it.
  assert.equal((await h.state()).proposals.find(p=>p.id===proposals.timeout.id).reminderRuns[0].transport_status,'uncertain')
  const timed=(await h.state()).proposals.find(p=>p.id===proposals.timeout.id);await h.cmd('reminder.configure',{id:timed.id,version:timed.version,enabled:false,timeZone:'America/Los_Angeles'})
  await connect('microsoft');await tick('2030-03-13T15:00:00Z')
  assert.equal(reminders().filter(m=>m.subject==='Reminder: cap').length,2);assert.equal(reminders().findLast(m=>m.subject==='Reminder: cap').provider,'microsoft')
  for(const name of ['accepted','optout','withdrawn','declined','expired','timeout'])assert.equal(reminders().filter(m=>m.subject==='Reminder: '+name).length,1,name+' stops all later reminders')
  assert.equal(reminders().filter(m=>m.subject==='Reminder: disabled').length,0)
  const replyCookie=await verified('cap');assert.equal((await h.send(proposals.cap.path+'/action?name=question.create',{revision:1,section:'scope',text:'Can we bring the start date forward?'},replyCookie)).status,200)
  const ownQuestion=(await h.state()).proposals.find(p=>p.id===proposals.cap.id).questions[0];await h.cmd('question.answer',{id:proposals.cap.id,questionId:ownQuestion.id,text:'Yes, we can start earlier.'})
  const ownReply=sent.findLast(m=>m.subject==='Answer to your question: cap');assert.equal(ownReply.provider,'microsoft');assert.equal(ownReply.from,'own-mailbox@synthetic-platter.example');assert.match(ownReply.body,/Yes, we can start earlier/)
  refused=true;await tick('2030-03-17T15:00:00Z')
  assert.equal(reminders().filter(m=>m.subject==='Reminder: cap').length,2,'scheduled cap excludes the ninth-day reminder')
  assert.deepEqual((await h.state()).proposals.find(p=>p.id===proposals.cap.id).deliveryPreview.reminders,[])
  assert.equal(installation.filter(m=>m.subject==='Reminder: fallback').length,1,'revoked grant falls back once to the installation sender')
  const fallback=(await h.state()).proposals.find(p=>p.id===proposals.fallback.id);assert.equal(fallback.reminderRuns.length,3);assert.ok(fallback.mailAttributions.some(m=>m.route==='installation'&&m.fallback===1))
  refused=false;await connect('gmail')
  const beforeExpiry=await h.cmd('proposal.prepare',{...offer,title:'before-expiry',clientId:client.id})
  await h.cmd('reminder.configure',{id:beforeExpiry.id,version:1,enabled:true,consent:true,timeZone:'America/Los_Angeles',afterDays:[],beforeDays:[3],cap:1,subject:'Expiry follow-up',message:'Review before the deadline.'})
  await h.cmd('expiry.set',{id:beforeExpiry.id,version:2,mode:'date',date:'2030-03-21',warningDays:''});await h.cmd('proposal.send',{id:beforeExpiry.id,version:3})
  await tick('2030-03-17T15:15:00Z');assert.equal(sent.filter(m=>m.subject==='Expiry follow-up').length,1,'before-expiry uses the recipient calendar date of the actual expiry instant')
  await tick('2030-03-18T15:15:00Z');assert.equal(sent.filter(m=>m.subject==='Expiry follow-up').length,1)
  const audit=await h.send('/api/platter/audit?action=reminder.scheduled',undefined,h.owner);assert.equal(audit.value.rows.filter(r=>r.subject===proposals.cap.id).length,2)
 }finally{await h.close()}
})

test('FOLLOW-001 / TEAM-001 manual reminders require live send scope, editable text and a once-per-recipient calendar-day claim independent of the scheduled cap', {timeout:120000}, async()=>{
 const mail=[];const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-6300'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.resend.com');mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(6301+mail.length)})}})
 try{
  await finishSetup(h);const people={}
  for(const role of ['admin','manager','sales','content_editor','viewer','billing','other']){const email=role+'@synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(email),id=(await h.state(cookie)).actor.id;await h.cmd('member.set',{operatorId:id,version:0,role:role==='other'?'sales':role,teams:[]});people[role]={cookie,id}}
  await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
  const worker=await h.mf.getWorker(),tick=async date=>worker.scheduled({scheduledTime:new Date(date),cron:'*/15 * * * *'});await tick('2030-06-01T12:00:00Z')
  const client=await h.cmd('client.save',{name:'Reminder client',email:recipient}),p=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie)
  const initialMail=mail.length
  for(const role of ['manager','content_editor','viewer','billing','other'])await h.cmd('reminder.configure',{id:p.id,version:1,enabled:false,timeZone:'America/Los_Angeles'},people[role].cookie,403)
  assert.equal(mail.length,initialMail);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_reminder_settings').first()).n,0)
  await h.cmd('reminder.configure',{id:p.id,version:1,enabled:true,timeZone:'America/Los_Angeles'},people.sales.cookie,400)
  await h.cmd('reminder.configure',{id:p.id,version:1,enabled:false,timeZone:'America/Los_Angeles',cap:0},people.sales.cookie)
  await h.cmd('proposal.send',{id:p.id,version:2},people.sales.cookie)
  const request={id:p.id,requestId:'synthetic-platter-6400',subject:'A personal follow-up',message:'Could you review the revised schedule?'}
  const before=mail.length
  for(const role of ['manager','content_editor','viewer','billing','other'])await h.cmd('reminder.send',request,people[role].cookie,403)
  await h.cmd('reminder.send',{...request,subject:'Missing {client.company}'},people.sales.cookie,400)
  await h.cmd('reminder.send',{...request,timeZone:'UTC'},people.sales.cookie,400)
  assert.equal(mail.length,before)
  const r=await h.cmd('reminder.send',request,people.sales.cookie);assert.equal(mail.length,before+1);assert.equal(mail.at(-1).subject,request.subject);assert.match(mail.at(-1).text,/Could you review the revised schedule\?/)
  assert.equal((await h.cmd('reminder.send',request,people.sales.cookie)).replayed,true);assert.equal(mail.length,before+1)
  await h.cmd('reminder.send',{...request,message:'Changed request'},people.sales.cookie,409)
  const second=await Promise.all(Array.from({length:4},(_,i)=>h.cmd('reminder.send',{...request,requestId:'synthetic-platter-'+(6410+i)},people.sales.cookie,429)));assert.equal(second.length,4);assert.equal(mail.length,before+1)
  const row=(await h.state(people.sales.cookie)).proposals.find(p2=>p2.id===p.id);assert.equal(row.reminderRuns.length,1);assert.equal(row.reminderRuns[0].kind,'manual');assert.equal(row.reminderRuns[0].message,request.message);assert.equal(row.reminderSettings.enabled,0)
  const policyBefore=(await h.state()).reminderPolicy
  for(const role of ['manager','sales','content_editor','viewer','billing'])await h.cmd('reminder.policy',{version:policyBefore.version,quietStart:21,quietEnd:9},people[role].cookie,403)
  await h.cmd('reminder.policy',{version:policyBefore.version,quietStart:21,quietEnd:9},people.admin.cookie);assert.equal((await h.state()).reminderPolicy.quiet_start,21)
  await tick('2030-06-02T06:59:00Z');await h.cmd('reminder.send',{...request,requestId:'synthetic-platter-6420'},people.sales.cookie,429)
  await tick('2030-06-02T07:00:00Z');await h.cmd('reminder.send',{...request,requestId:'synthetic-platter-6421'},people.sales.cookie);assert.equal(mail.filter(m=>m.subject===request.subject).length,2,'manual email goes at midnight despite quiet hours and schedule off/cap zero')
  await h.cmd('member.set',{operatorId:people.sales.id,version:1,role:'content_editor',teams:[]});const after=mail.length;await h.cmd('reminder.send',{...request,requestId:'synthetic-platter-6422'},people.sales.cookie,403);assert.equal(mail.length,after)
  assert.equal((await h.send('/app/proposal?id='+p.id,undefined,people.sales.cookie)).status,200)
  assert.equal((await h.send('/api/platter/state',undefined,people.other.cookie)).value.proposals.some(p2=>p2.id===p.id),false)
  const east=await h.cmd('team.create',{name:'Reminder team'})
  for(const role of ['sales','manager']){const person=(await h.state()).teamPeople.find(p=>p.id===people[role].id);await h.cmd('member.set',{operatorId:person.id,version:person.version,role,teams:[east.id]})}
  const teamOffer=await h.cmd('proposal.prepare',{...offer,title:'Team reminder',clientId:client.id},people.sales.cookie)
  await h.cmd('reminder.configure',{id:teamOffer.id,version:1,enabled:false,timeZone:'America/Los_Angeles'},people.manager.cookie);await h.cmd('proposal.send',{id:teamOffer.id,version:2},people.sales.cookie)
  await h.cmd('reminder.send',{id:teamOffer.id,requestId:'synthetic-platter-6423',subject:'Manager team follow-up',message:'A scoped reminder'},people.manager.cookie);assert.equal(mail.at(-1).subject,'Manager team follow-up')
  const manager=(await h.state()).teamPeople.find(p=>p.id===people.manager.id);await h.cmd('member.set',{operatorId:manager.id,version:manager.version,role:'manager',teams:[]})
  await h.cmd('reminder.send',{id:teamOffer.id,requestId:'synthetic-platter-6424'},people.manager.cookie,403)
  const stored=(await h.db.prepare('SELECT * FROM p_reminder_runs WHERE id=?').bind(r.reminderId).first());assert.equal(stored.actor_id,people.sales.id);assert.doesNotMatch(stored.message,/\/p\/[a-f0-9]{64}/)
 }finally{await h.close()}
})

test('SEND-001 / TEAM-001 reminder sending rechecks opt-out, acceptance, withdrawal, invitation rotation and sender role after mailbox refresh', {timeout:120000}, async()=>{
 let race=null,h;const sent=[]
 h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-6600',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-6601',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-6602'},outboundService:async request=>{
  const url=new URL(request.url)
  if(url.hostname==='oauth2.googleapis.com'){
   const input=new URLSearchParams(await request.text())
   if(input.get('grant_type')==='refresh_token'&&race){const change=race;race=null;await change()}
   return Response.json({access_token:'synthetic-platter-6603',refresh_token:'synthetic-platter-6604',scope:'openid email https://www.googleapis.com/auth/gmail.send'})
  }
  if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-6605',email:'race-mailbox@synthetic-platter.example',email_verified:true})
  if(url.hostname==='gmail.googleapis.com'){const raw=Buffer.from((await request.json()).raw,'base64url').toString('utf8');assert.match(raw,/^From: race-mailbox@synthetic-platter.example\r\n/);sent.push(Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString('utf8'));return Response.json({id:'synthetic-platter-'+(6700+sent.length)})}
  assert.equal(url.hostname,'api.resend.com');return Response.json({id:'synthetic-platter-6606'})
 }})
 try{
  await finishSetup(h);await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
  const address='sender@synthetic-platter.example';await h.send('/auth/invite',{email:address,displayName:'Reminder sender',role:'member',returnTo:'/app'},h.owner);const cookie=await h.signIn(address),person=(await h.state(cookie)).actor
  const start=await h.send('/api/platter/mailbox/authorize',{provider:'gmail',consent:true},cookie),state=new URL(start.headers.get('location')).searchParams.get('state');assert.equal((await h.send('/api/platter/mailbox/callback?'+new URLSearchParams({state,code:'synthetic-platter-6607'}),undefined,cookie)).status,303)
  const client=await h.cmd('client.save',{name:'Race client',email:recipient})
  for(const action of ['optout','accepted','withdrawn','rotated','role']){
   const p=await h.cmd('proposal.prepare',{...offer,title:'Race '+action,clientId:client.id},cookie);await h.cmd('reminder.configure',{id:p.id,version:1,enabled:false,timeZone:'America/Los_Angeles'},cookie)
   const link=await h.cmd('proposal.send',{id:p.id,version:2},cookie),path=new URL(link.shareUrl).pathname
   await h.send(path+'/action?name=code.request',{});const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(p.id).first()).body.match(/\b\d{6}\b/)[0],verified=(await h.send(path+'/action?name=code.verify',{code})).cookie
   if(action==='optout'){
    assert.equal((await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'When can we start?'},verified)).status,200)
    const question=(await h.state(cookie)).proposals.find(r=>r.id===p.id).questions[0];await h.cmd('question.answer',{id:p.id,questionId:question.id,text:'Next Monday.'},cookie);assert.ok(sent.includes('Answer to your question: Race optout'),'a native answer sends through the connected Gmail mailbox')
   }
   race=async()=>{
    const row=(await h.state(cookie)).proposals.find(r=>r.id===p.id)
    if(action==='optout')assert.equal((await h.send(path+'/action?name=reminder.opt-out',{},verified)).status,200)
    if(action==='accepted')assert.equal((await h.send(path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},verified)).status,200)
    if(action==='withdrawn')await h.cmd('proposal.withdraw',{id:p.id,version:row.version,reason:'Stop the queued reminder',notice:false},cookie)
    if(action==='rotated')await h.cmd('proposal.send',{id:p.id,version:row.version},cookie)
    if(action==='role')await h.cmd('member.set',{operatorId:person.id,version:0,role:'content_editor',teams:[]})
   }
   const subject='Refused reminder '+action,before=sent.filter(s=>s.startsWith('Refused reminder')).length
   await h.cmd('reminder.send',{id:p.id,requestId:'synthetic-platter-race-'+action,subject,message:'Must not leave the mailbox'},cookie,403)
   assert.equal(race,null);assert.equal(sent.filter(s=>s.startsWith('Refused reminder')).length,before,action+' is rechecked after provider refresh, with no reminder or fallback')
   const row=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(row.reminderRuns.length,1);assert.equal(row.reminderRuns[0].transport_status,'withheld');assert.ok(row.mailAttributions.some(m=>m.outcome==='withheld'))
  }
 }finally{await h.close()}
})

test('FOLLOW-001 / FOLLOW-006 template and workspace delivery snapshots preview exact dates, send on those dates, remain editable without approval and never copy authority', {timeout:120000}, async()=>{const {remindersHttp}=await import('./reminders-http.mjs');await remindersHttp()})

test('FOLLOW-001 / SEND-006 shared reminder messages fill explicit variables, enforce default and template choices and locks, and preserve exact per-attempt text without copying identity or authority', {timeout:120000}, async()=>{const {reminderMessagesHttp}=await import('./reminders-http.mjs');await reminderMessagesHttp()})


async function notificationFixture(beforeMail=async()=>{}) {
 const messages=[],chats=[];let uncertain=false
 const h=await harness({assetsDirectory:'public',origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-7000'},outboundService:async request=>{
  const url=new URL(request.url)
  if(url.hostname==='api.resend.com'){const message=await request.json();await beforeMail(message);messages.push(message);return Response.json({id:'synthetic-platter-7001'})}
  if(url.pathname==='/api/auth.test')return Response.json({ok:true,team_id:'synthetic-platter-7002'})
  if(url.pathname==='/api/users.info')return Response.json({ok:true,user:{team_id:'synthetic-platter-7002',profile:{email:h.auth.OWNER_EMAIL}}})
  if(url.pathname==='/api/conversations.info')return Response.json({ok:true,channel:{id:'synthetic-platter-7003',is_member:true}})
  if(url.pathname==='/api/conversations.open')return Response.json({ok:true,channel:{id:'synthetic-platter-7004'}})
  if(url.pathname==='/v1.0/me')return Response.json({id:'synthetic-platter-7005'})
  if(url.pathname==='/v1.0/chats/synthetic-platter-7006')return Response.json({chatType:'oneOnOne',members:[{email:h.auth.OWNER_EMAIL},{userId:'synthetic-platter-7005'}]})
  const value=await request.json();chats.push({url:request.url,value});if(uncertain)throw Error('Synthetic lost receipt')
  return Response.json({ok:true,id:'synthetic-platter-7007'})
 }})
 await finishSetup(h)
 const client=await h.cmd('client.save',{name:'Synthetic client',email:recipient})
 const prepare=async title=>h.cmd('proposal.prepare',{...offer,title,clientId:client.id})
 const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
 const connect=async provider=>h.cmd('provider.connect',{provider,version:0,token:'synthetic-platter-7008',consent:true})
 return {...h,messages,chats,prepare,tick,connect,client,uncertain:value=>{uncertain=value}}
}

test('APPROVE-002 explicit requests deliver exact revision previews by email and Slack, bind noted decisions and remind pending approvers once', {timeout:120000},async()=>{
 const h=await notificationFixture()
 try{
  await h.connect('slack');const actor=(await h.state()).actor
  await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:'synthetic-platter-7009',operatorId:actor.id,consent:true})
  const p=await h.prepare('Approval notice'),request={id:p.id,version:1,reminderDays:2,consent:true}
  const result=await h.cmd('notification.request',request),again=await h.cmd('notification.request',request)
  assert.deepEqual(again,result);assert.equal(h.messages.length,1);assert.equal(h.chats.length,1)
  const email=h.messages[0],slack=h.chats[0].value
  assert.deepEqual(email.to,[h.auth.OWNER_EMAIL]);assert.equal(slack.channel,'synthetic-platter-7004')
  assert.match(email.text,/Default approval/);assert.match(slack.text,/Revision 1/)
  const preview=email.text.match(/https:\/\/[^\s]+\/app\/preview[^\s]+/)[0]
  assert.ok(slack.text.includes(preview));assert.equal((await h.send(new URL(preview).pathname+new URL(preview).search)).status,401)
  const opened=await h.send(new URL(preview).pathname+new URL(preview).search,undefined,h.owner);assert.equal(opened.status,200);assert.match(opened.text,/Revision 1/)
  const r=(await h.cmd('notification.requests',{id:p.id})).requests[0]
  assert.equal(r.approver_id,actor.id);assert.equal(r.requester_id,actor.id)
  await h.tick(r.remind_at-1);assert.equal(h.messages.length,1)
  await Promise.all([h.tick(r.remind_at),h.tick(r.remind_at)])
  assert.equal(h.messages.filter(m=>m.subject==='Approval overdue').length,1);assert.equal(h.chats.length,2)
  await h.cmd('notification.decide',{requestId:r.id,version:1,decision:'approved',note:'Reviewed exact revision from Slack'})
  assert.equal((await h.state()).proposals.find(p=>p.id===r.proposal_id).status,'approved')
  const decision=await h.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(p.id).first();assert.equal(decision.note,'Reviewed exact revision from Slack');assert.equal(decision.revision,1)
  const other=await h.prepare('Reject email'),otherRequest=await h.cmd('notification.request',{id:other.id,version:1,consent:true})
  await h.cmd('notification.decide',{requestId:otherRequest.requests[0],version:1,decision:'rejected',note:'Please correct the terms from email'})
  assert.equal((await h.state()).proposals.find(p=>p.id===other.id).approval.rejected,true)
  await h.tick(r.remind_at+5*86400000);assert.equal(h.messages.filter(m=>m.subject==='Approval overdue').length,1)
 }finally{await h.close()}
})

test('APPROVE-002 notification consent, exact plan, active scope and uncertain delivery prevent unauthorized or repeated outbound requests', {timeout:120000},async()=>{
 const h=await notificationFixture()
 try{
  await h.connect('slack');const actor=(await h.state()).actor
  const route=await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:'synthetic-platter-7009',operatorId:actor.id,consent:true})
  const p=await h.prepare('Stale approval')
  await h.cmd('notification.request',{id:p.id,version:1},h.owner,400);assert.equal(h.messages.length,0)
  const result=await h.cmd('notification.request',{id:p.id,version:1,consent:true}),requestId=result.requests[0]
  await h.cmd('proposal.revise',{...offer,clientId:h.client.id,id:p.id,version:1,scope:'Revised scope'})
  await h.cmd('notification.decide',{requestId,version:2,decision:'approved',note:'Stale'},h.owner,409)
  await h.tick(Date.now()+3*86400000);assert.equal(h.messages.length,1,'a changed revision suppresses overdue delivery')
  const q=await h.prepare('Uncertain chat');h.uncertain(true)
  await h.cmd('notification.request',{id:q.id,version:1,consent:true});assert.equal(h.chats.length,2)
  await h.cmd('notification.request',{id:q.id,version:1,consent:true});assert.equal(h.chats.length,2,'a lost provider receipt is never retried')
  assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_notification_outbox WHERE status='uncertain'").first()).n,1)
  await h.cmd('notification.route.remove',{id:route.id});await h.tick(Date.now()+4*86400000);assert.equal(h.chats.length,2,'revoked route consent suppresses chat reminders')
  await h.send('/auth/invite',{email:'stranger@synthetic-platter.example',role:'member',displayName:'Stranger'},h.owner)
  // A real member session has no authority over this owner's draft.
  const cookie=await h.signIn('stranger@synthetic-platter.example')
  await h.cmd('notification.requests',{id:q.id},cookie,403)
  await h.cmd('notification.decide',{requestId,version:2,decision:'approved',note:'Unauthorized'},cookie,403)
  assert.doesNotMatch(JSON.stringify(await h.state()),/synthetic-platter-7008/)
 }finally{await h.close()}
})

test('AUTO-003 signed events reach Slack channels and approval requests reach verified Teams direct chats with session protected links', {timeout:120000},async()=>{
 const h=await notificationFixture()
 try{
  await h.connect('slack');await h.connect('teams');const actor=(await h.state()).actor
  await h.cmd('notification.route',{provider:'slack',event:'signed',kind:'channel',destination:'synthetic-platter-7003',consent:true})
  await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-7006',operatorId:actor.id,consent:true})
  const p=await h.prepare('Signed event'),request=await h.cmd('notification.request',{id:p.id,version:1,consent:true})
  assert.equal(h.chats.length,1);assert.match(h.chats[0].url,/graph.microsoft.com/);assert.match(h.chats[0].value.body.content,/app\/preview/)
  await h.cmd('notification.decide',{requestId:request.requests[0],version:1,decision:'approved',note:'Approved in Teams'})
  const sent=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(sent.shareUrl).pathname
  await h.send(path+'/action?name=code.request',{})
  const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(p.id).first()).body.match(/\b\d{6}\b/)[0]
  const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
  assert.equal((await h.send(path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},verified.cookie)).status,200)
  await Promise.all([h.tick(Date.now()),h.tick(Date.now())])
  const signed=h.chats.filter(c=>c.value.text?.startsWith('Proposal signed'));assert.equal(signed.length,1);assert.equal(signed[0].value.channel,'synthetic-platter-7003')
  const link=signed[0].value.text.match(/https:\/\/[^\s]+/)[0],url=new URL(link)
  assert.equal((await h.send(url.pathname+url.search,undefined,h.owner)).status,200)
  assert.equal((await h.send(url.pathname+url.search)).status,303)
  assert.doesNotMatch(signed[0].value.text,/Synthetic client|Northstar|2400|@/)
  await h.cmd('notification.route',{provider:'slack',event:'followup',kind:'channel',destination:'synthetic-platter-7003',consent:true})
  const follow=await h.prepare('Private follow-up title');await h.cmd('followup.schedule',{id:follow.id,dueDate:'2030-03-01',action:'Private next action'})
  await h.tick(Date.now());const updates=h.chats.filter(c=>c.value.text?.startsWith('Follow-up updated'));assert.equal(updates.length,1);assert.doesNotMatch(updates[0].value.text,/Private/)
  await h.cmd('provider.disconnect',{provider:'slack',version:1})
  assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_notification_outbox WHERE status='sent'").first()).n,4)
 }finally{await h.close()}
})

test('FOLLOW-003 sender expiry notices create dated follow-ups independently of signer warnings and follow extensions, workspace defaults and terminal states', {timeout:120000},async()=>{
 const h=await notificationFixture()
 try{
  await h.tick('2030-03-01T12:00:00Z')
  const defaults=await h.db.prepare('SELECT * FROM p_sender_notice_defaults').first();assert.deepEqual([defaults.enabled,defaults.lead_days,defaults.renewal_enabled,defaults.renewal_days],[1,3,1,30])
  const create=async(title,enabled)=>{
   const p=await h.prepare(title);await h.cmd('expiry.set',{id:p.id,version:1,mode:'days',days:14,warningDays:1})
   await h.cmd('notification.expiry',{id:p.id,version:2,enabled,consent:true})
   await h.cmd('proposal.approve',{id:p.id,version:3,revision:1});const sent=await h.cmd('proposal.send',{id:p.id,version:4})
   return {...p,path:new URL(sent.shareUrl).pathname}
  }
  const normal=await create('Normal'),extended=await create('Extended'),accepted=await create('Accepted'),withdrawn=await create('Withdrawn'),declined=await create('Declined'),manual=await create('Manual')
  await h.cmd('followup.schedule',{id:manual.id,action:'Call about the existing scope',dueDate:'2030-03-20'})
  const manualBefore=await h.db.prepare('SELECT * FROM p_followups WHERE proposal_id=?').bind(manual.id).first()
  await h.cmd('notification.defaults',{version:0,enabled:false,leadDays:3,renewalEnabled:true,renewalDays:30})
  const disabled=await create('Disabled')
  await h.cmd('expiry.set',{id:extended.id,version:5,mode:'date',date:'2030-03-22',warningDays:1})
  await h.send(accepted.path+'/action?name=code.request',{})
  const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(accepted.id).first()).body.match(/\b\d{6}\b/)[0],verified=await h.send(accepted.path+'/action?name=code.verify',{code})
  assert.equal((await h.send(accepted.path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},verified.cookie)).status,200)
  await h.cmd('proposal.withdraw',{id:withdrawn.id,version:5,reason:'Closed',notice:false})
  await h.send(declined.path+'/action?name=code.request',{})
  const declineCode=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(declined.id).first()).body.match(/\b\d{6}\b/)[0]
  const declineSession=await h.send(declined.path+'/action?name=code.verify',{code:declineCode})
  assert.equal((await h.send(declined.path+'/action?name=decline',{revision:1,reason:'Not proceeding'},declineSession.cookie)).status,410)
  const notices=()=>h.messages.filter(m=>m.subject==='Proposal expiry approaching')
  await h.tick('2030-03-11T23:59:59Z');assert.equal(notices().length,0)
  await Promise.all([h.tick('2030-03-12T00:00:00Z'),h.tick('2030-03-12T00:00:00Z')]);assert.equal(notices().length,2);for(const notice of notices())assert.deepEqual(notice.to,[h.auth.OWNER_EMAIL])
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_followups WHERE proposal_id=?').bind(manual.id).first(),manualBefore)
  const followup=(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.find(r=>r.id===normal.id);assert.equal(followup.dueDate,'2030-03-12');assert.equal(followup.action,'Review approaching expiry')
  assert.equal((await h.db.prepare('SELECT deadline_at FROM p_expiry WHERE proposal_id=?').bind(normal.id).first()).deadline_at,Date.parse('2030-03-15T00:00:00Z'))
  await h.tick('2030-03-14T00:00:00Z');assert.equal(h.messages.filter(m=>m.subject.startsWith('Expiry warning:')).length,3,'signer warnings remain independent for enabled and disabled sender notices')
  await h.tick('2030-03-19T00:00:00Z');assert.equal(notices().length,3);assert.match(notices().find(m=>m.text.includes(extended.id)).text,/2030-03-22/)
  const runs=(await h.db.prepare('SELECT * FROM p_sender_notice_runs ORDER BY notice_date').all()).results;assert.deepEqual(runs.map(r=>r.notice_date),['2030-03-12','2030-03-12','2030-03-19'])
  await h.send('/auth/invite',{email:'sales@synthetic-platter.example',role:'member',displayName:'Sales'},h.owner);const cookie=await h.signIn('sales@synthetic-platter.example')
  await h.cmd('notification.defaults',{version:1,enabled:true,leadDays:2,renewalEnabled:true,renewalDays:20},cookie,403)
  await (await import('./sender-notice-journey.mjs')).senderNoticeJourney(notificationFixture)
 }finally{await h.close()}
})

test('FOLLOW-003 saved settings stay inactive and queued expiry email rechecks revocation, settings, sender demotion and revision authority', {timeout:120000},async()=>{
 let race=null
 const h=await notificationFixture(async message=>{if(message.subject==='Proposal expiry approaching'&&race){const change=race;race=null;await change(message)}})
 try{
  await h.tick('2031-03-01T12:00:00Z')
  const email=['expiry-sender','synthetic-platter.example'].join(String.fromCharCode(64))
  await h.send('/auth/invite',{email,role:'member',displayName:'Expiry sender'},h.owner)
  const cookie=await h.signIn(email),sender=(await h.state(cookie)).actor
  const adminEmail=['expiry-admin','synthetic-platter.example'].join(String.fromCharCode(64))
  await h.send('/auth/invite',{email:adminEmail,role:'member',displayName:'Expiry admin'},h.owner)
  const adminCookie=await h.signIn(adminEmail),admin=(await h.state(adminCookie)).actor
  await h.cmd('member.set',{operatorId:admin.id,version:0,role:'admin',teams:[]})
  const prepare=async(title,person=h.owner)=>{
   const p=await h.cmd('proposal.prepare',{...offer,title,clientId:h.client.id},person)
   await h.cmd('expiry.set',{id:p.id,version:1,mode:'days',days:14,warningDays:1},person)
   return p
  }
  const saved=await prepare('Inactive settings')
  await h.cmd('notification.expiry',{id:saved.id,version:2,action:'save',enabled:true,leadDays:3})
  await h.cmd('proposal.approve',{id:saved.id,version:3,revision:1});await h.cmd('proposal.send',{id:saved.id,version:4})
  for(const path of ['/app/settings','/app/proposal?id='+saved.id]){
   assert.equal((await h.send(path,undefined,h.owner)).status,200)
   assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_sender_notice_authority').first()).n,0)
  }
  const revoked=await prepare('Revoked before queue')
  await h.cmd('notification.expiry',{id:revoked.id,version:2,consent:true})
  await h.cmd('notification.expiry',{id:revoked.id,version:3,action:'revoke'})
  await h.cmd('proposal.approve',{id:revoked.id,version:4,revision:1});await h.cmd('proposal.send',{id:revoked.id,version:5})
  const authorized=[]
  for(const kind of ['revoke','revoke','settings','settings','revision','revision','demotion','demotion','authorizer','authorizer']){
   const person=kind==='demotion'?cookie:h.owner,p=await prepare(kind,person)
   await h.cmd('notification.expiry',{id:p.id,version:2,consent:true},kind==='authorizer'?adminCookie:person)
   await h.cmd('proposal.approve',{id:p.id,version:3,revision:1});await h.cmd('proposal.send',{id:p.id,version:4},person)
   authorized.push({...p,kind,person})
  }
  // The first accepted delivery proves the allowed case. While its receiver is
  // responding, invalidate the remaining already-queued work through public commands.
  let first,demoted=false,adminDemoted=false
  race=async message=>{
   first=authorized.find(p=>message.text.includes(p.id));assert.ok(first)
   for(const p of authorized.filter(p=>p.id!==first.id)){
    if(p.kind==='revoke')await h.cmd('notification.expiry',{id:p.id,version:5,action:'revoke'})
    if(p.kind==='settings')await h.cmd('notification.expiry',{id:p.id,version:5,action:'save',enabled:true,leadDays:2})
    if(p.kind==='revision'){
     const next=await h.cmd('proposal.negotiate',{...offer,id:p.id,version:5,clientId:h.client.id,scope:'Changed scope'})
     await h.cmd('proposal.approve',{id:p.id,version:next.version,revision:next.revision})
     await h.cmd('proposal.send',{id:p.id,version:next.version+1})
    }
    if(p.kind==='authorizer'&&!adminDemoted){await h.cmd('member.set',{operatorId:admin.id,version:1,role:'content_editor',teams:[]});adminDemoted=true}
    if(p.kind==='demotion'&&!demoted){await h.cmd('member.set',{operatorId:sender.id,version:0,role:'content_editor',teams:[]});demoted=true}
   }
  }
  await h.tick('2031-03-12T00:00:00Z')
  assert.equal(h.messages.filter(m=>m.subject==='Proposal expiry approaching').length,1)
  const runs=(await h.db.prepare('SELECT * FROM p_notification_outbox WHERE event_key LIKE ?').bind('expiry:%').all()).results
  assert.equal(runs.length,10);assert.equal(runs.filter(r=>r.status==='sent').length,1);assert.equal(runs.filter(r=>r.status==='withheld').length,9)
  await h.tick('2031-03-12T00:00:00Z')
  assert.equal(h.messages.filter(m=>m.subject==='Proposal expiry approaching').length,1,'held work never replays')
  const history=(await h.state()).expiryNotices.events
  assert.ok(history.some(r=>r.proposal_id===revoked.id&&r.action==='revoked'))
  assert.ok(history.some(r=>r.proposal_id===saved.id&&r.action==='saved'))
  const baseline=await h.state()
  await h.cmd('notification.expiry',{id:saved.id,version:1,consent:true},h.owner,409)
  await h.cmd('notification.expiry',{id:saved.id,version:5,action:'authorize'},h.owner,400)
  assert.deepEqual(await h.state(),baseline,'refused authority changes nothing')
 }finally{await h.close()}
})

test('SEND-008 explicit SMS consent, signed delivery callbacks, HELP and STOP preserve independent email reminders', {timeout:120000}, async()=>{
 const {createHmac}=await import('node:crypto'),sms=[],email=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-8100',TWILIO_ACCOUNT_SID:'synthetic-platter-8101',TWILIO_AUTH_TOKEN:'synthetic-platter-8102',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){
   assert.equal(request.method,'POST');assert.equal(request.headers.get('authorization'),'Basic '+Buffer.from('synthetic-platter-8101:synthetic-platter-8102').toString('base64'))
   const form=Object.fromEntries(new URLSearchParams(await request.text()));sms.push(form);assert.equal(form.From,'+15005550006');return Response.json({sid:'synthetic-platter-'+(8200+sms.length)},{status:201})
  }
  assert.equal(new URL(request.url).hostname,'api.resend.com');email.push(await request.json());return Response.json({id:'synthetic-platter-'+(8300+email.length)})
 }})
 const callback=async(path,fields,bad=false)=>{
  const url=h.origin+'/api/platter/sms/'+path,form=new URLSearchParams({AccountSid:'synthetic-platter-8101',...fields})
  const signature=createHmac('sha1','synthetic-platter-8102').update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64')
  const response=await h.mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':bad?'synthetic-platter-8103':signature},body:form.toString()})
  return {status:response.status,text:await response.text()}
 }
 try{
  await finishSetup(h)
  const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
  await tick('2030-03-08T18:00:00Z')
  const id=await approved(h)
  await h.cmd('reminder.configure',{id,version:2,enabled:true,consent:true,timeZone:'America/Los_Angeles',afterDays:[2,5],beforeDays:[],cap:2})
  const sent=await h.cmd('proposal.send',{id,version:3}),row=(await h.state()).proposals.find(p=>p.id===id)
  const input={id,version:row.version,consent:true,phone:'+12025550123',timeZone:'America/Los_Angeles',evidence:'synthetic-platter-8104'}
  await h.cmd('sms.send',{id,message:'Review your proposal',requestId:'synthetic-platter-8105'},h.owner,409)
  for(const change of [{consent:false},{timeZone:''},{timeZone:'Inferred'},{phone:'+442025550123'},{evidence:''},{version:1}])await h.cmd('sms.configure',{...input,...change},h.owner,change.version?409:400)
  assert.equal(sms.length,0)
  await h.cmd('sms.configure',input)
  const send={id,message:'Review your proposal',requestId:'synthetic-platter-8105'}
  const first=await h.cmd('sms.send',send)
  await h.cmd('sms.send',send)
  assert.equal(sms.length,1);assert.equal(sms[0].To,input.phone);assert.ok(sms[0].Body.includes(sent.shareUrl));assert.match(sms[0].Body,/Reply STOP/)
  await h.cmd('sms.send',{...send,message:'Different text'},h.owner,409)
  const history=async()=>(await h.send('/api/platter/sms?id='+id,undefined,h.owner)).value
  assert.equal((await history()).messages[0].status,'accepted');assert.equal((await history()).consent.evidence,input.evidence)
  assert.ok(!JSON.stringify(await history()).includes(new URL(sent.shareUrl).pathname),'timeline retains no bearer invitation')
  const status={MessageSid:'synthetic-platter-8201',MessageStatus:'delivered',To:input.phone}
  assert.equal((await callback('status',status,true)).status,401);assert.equal((await history()).messages[0].status,'accepted')
  assert.equal((await callback('status',{...status,AccountSid:'synthetic-platter-9999'})).status,403)
  assert.equal((await callback('status',status)).status,204);assert.equal((await history()).messages[0].status,'delivered')
  await callback('status',{...status,MessageStatus:'sent'});assert.equal((await history()).messages[0].status,'delivered','late nonterminal receipt never regresses delivery')
  const inbound={From:input.phone,To:'+15005550006',Body:'HELP'}
  assert.match((await callback('inbound',inbound)).text,/Contact the sender/)
  assert.equal((await callback('inbound',{...inbound,Body:'STOP'},true)).status,401)
  await tick('2030-03-10T17:00:00Z');assert.equal(sms.length,2,'SMS reminder uses the existing schedule')
  const emailsBefore=email.filter(m=>m.subject.startsWith('Reminder:')).length
  assert.equal((await callback('inbound',{...inbound,Body:'stop'})).status,200)
  await callback('inbound',{...inbound,Body:'STOP'});await callback('inbound',{...inbound,Body:'START'})
  await h.cmd('sms.send',{...send,requestId:'synthetic-platter-8106'},h.owner,409)
  await h.cmd('sms.configure',input,h.owner,409)
  await tick('2030-03-13T17:00:00Z');assert.equal(sms.length,2);assert.equal(email.filter(m=>m.subject.startsWith('Reminder:')).length,emailsBefore+1,'STOP does not suppress email')
  assert.equal((await h.send('/api/platter/sms?id='+id)).status,401)
  const audit=await h.send('/api/platter/audit?action=sms.consent',undefined,h.owner);assert.equal(audit.value.rows.filter(r=>r.subject===id).length,1)
  assert.ok(first.smsId)
 }finally{await h.close()}
})

test('SEND-008 quiet hours defer manual SMS and SEND-010 withdrawal atomically cancels queued texts without duplicate transport', {timeout:120000}, async()=>{
 const sms=[],email=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-8400',TWILIO_ACCOUNT_SID:'synthetic-platter-8401',TWILIO_AUTH_TOKEN:'synthetic-platter-8402',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){sms.push(Object.fromEntries(new URLSearchParams(await request.text())));return Response.json({sid:'synthetic-platter-'+(8500+sms.length)},{status:201})}
  email.push(await request.json());return Response.json({id:'synthetic-platter-'+(8600+email.length)})
 }})
 try{
  await finishSetup(h)
  const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
  await tick('2030-03-10T13:00:00Z') // 6 am Pacific, after the DST jump.
  const ids=[]
  for(const phone of ['+12025550124','+12025550125']){
   const id=await approved(h)
   await h.cmd('reminder.configure',{id,version:2,enabled:true,consent:true,timeZone:'America/Los_Angeles',afterDays:[1],beforeDays:[],cap:1})
   const sent=await h.cmd('proposal.send',{id,version:3}),row=(await h.state()).proposals.find(p=>p.id===id)
   await h.cmd('sms.configure',{id,version:row.version,consent:true,phone,timeZone:'America/Los_Angeles',evidence:'synthetic-platter-8403'})
   const input={id,kind:'manual',message:'Please review the proposal',requestId:'synthetic-platter-'+(8700+ids.length)}
   await h.cmd('sms.send',input);await h.cmd('sms.send',input)
   await h.cmd('sms.send',{...input,requestId:'synthetic-platter-'+(8800+ids.length)},h.owner,429)
   ids.push({id,sent})
  }
  assert.equal(sms.length,0)
  const second=(await h.state()).proposals.find(p=>p.id===ids[1].id),mailBefore=email.length
  await h.cmd('proposal.withdraw',{id:second.id,version:second.version,reason:'Sent to the wrong client'})
  assert.equal(email.length,mailBefore+1,'the existing recipient withdrawal notice still sends once')
  const history=await h.send('/api/platter/sms?id='+second.id,undefined,h.owner);assert.equal(history.value.messages[0].status,'cancelled')
  assert.equal((await h.send(new URL(ids[1].sent.shareUrl).pathname)).status,410)
  await tick('2030-03-10T14:59:00Z');assert.equal(sms.length,0)
  await Promise.all([tick('2030-03-10T15:00:00Z'),tick('2030-03-10T15:00:00Z')]);assert.equal(sms.length,1,'8 am release is claimed once under concurrent cron triggers')
  assert.equal(sms[0].To,'+12025550124');assert.ok(sms[0].Body.includes(ids[0].sent.shareUrl))
  await tick('2030-03-11T13:00:00Z');assert.equal(sms.length,1,'scheduled texts due at 6 am wait for quiet hours')
  await tick('2030-03-11T15:00:00Z');assert.equal(sms.length,2,'only the live proposal has a scheduled text after withdrawal');assert.equal(sms[1].To,'+12025550124')
 }finally{await h.close()}
})

test('SEND-008 rotated invitations, lost sender scope and uncertain SMS outcomes cannot replay sending authority', {timeout:120000}, async()=>{
 let attempts=0;const invitationMails=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-8900',TWILIO_ACCOUNT_SID:'synthetic-platter-8901',TWILIO_AUTH_TOKEN:'synthetic-platter-8902',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){attempts++;throw Error('Synthetic uncertain SMS outcome')}
  invitationMails.push(await request.json());return Response.json({id:'synthetic-platter-8903'})
 }})
 try{
  await finishSetup(h)
  const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
  await tick('2030-06-01T16:00:00Z')
  const id=await approved(h);await h.cmd('proposal.send',{id,version:2})
  let row=(await h.state()).proposals.find(p=>p.id===id)
  const consent={id,version:row.version,consent:true,phone:'+12025550126',timeZone:'America/Los_Angeles',evidence:'synthetic-platter-8904'}
  await h.cmd('sms.configure',consent)
  const input={id,message:'Review the proposal',requestId:'synthetic-platter-8905'}
  await h.cmd('sms.send',input);assert.equal(attempts,1)
  await h.cmd('sms.send',input);await tick('2030-06-01T16:15:00Z');assert.equal(attempts,1)
  let history=(await h.send('/api/platter/sms?id='+id,undefined,h.owner)).value
  assert.equal(history.messages[0].status,'held')
  await h.cmd('proposal.send',{id,version:row.version})
  await h.cmd('sms.send',{...input,requestId:'synthetic-platter-8906'},h.owner,409);assert.equal(attempts,1)
  row=(await h.state()).proposals.find(p=>p.id===id);await h.cmd('sms.configure',{...consent,version:row.version})
  // Restore removes this execution-only table. Retained consent cannot activate SMS on its own.
  await h.db.prepare('DELETE FROM p_sms_authority').run()
  await h.cmd('sms.send',{...input,requestId:'synthetic-platter-8907'},h.owner,409);assert.equal(attempts,1)
  history=(await h.send('/api/platter/sms?id='+id,undefined,h.owner)).value;assert.equal(history.messages[0].status,'held')
  const address='sms-sender@synthetic-platter.example';await h.send('/auth/invite',{email:address,role:'member',displayName:'SMS sender'},h.owner)
  const member=await h.signIn(address),person=(await h.state(member)).actor
  await h.cmd('sms.send',{id,message:'Outside scope',requestId:'synthetic-platter-8908'},member,403)
  const client=(await h.state()).clients.find(c=>c.email===recipient),owned=await h.cmd('proposal.prepare',{...offer,clientId:client.id},member)
  await h.cmd('proposal.approve',{id:owned.id,version:1,revision:1});await h.cmd('proposal.send',{id:owned.id,version:2},member)
  const memberRow=(await h.state(member)).proposals.find(p=>p.id===owned.id)
  await h.cmd('sms.configure',{id:owned.id,version:memberRow.version,consent:true,phone:'+12025550130',timeZone:'America/Los_Angeles',evidence:'synthetic-platter-8909'},member)
  await tick('2030-06-02T05:00:00Z')
  await h.cmd('sms.send',{id:owned.id,kind:'manual',message:'Wait for morning',requestId:'synthetic-platter-8910'},member)
  await h.cmd('member.set',{operatorId:person.id,version:0,role:'viewer',teams:[]})
  await h.cmd('sms.send',{id:owned.id,message:'Role changed',requestId:'synthetic-platter-8911'},member,403)
  await tick('2030-06-02T15:00:00Z');assert.equal(attempts,1,'demotion cancels the queued SMS without a provider call')

  const smsId=await approved(h);const smsFirst=await h.cmd('proposal.send',{id:smsId,version:2})
  const smsRow=(await h.state()).proposals.find(p=>p.id===smsId)
  await h.cmd('sms.configure',{...consent,id:smsId,version:smsRow.version})
  await h.cmd('signer.method',{id:smsId,version:smsRow.version,method:'SMS code'})
  await tick('2030-06-03T05:00:00Z')
  await h.cmd('sms.send',{id:smsId,kind:'manual',message:'Wait for the signer',requestId:'synthetic-platter-8912'})
  const replacement=await h.cmd('signer.replace',{id:smsId,version:smsRow.version,recipient:'coo@northstar.example',reason:'COO signs instead'})
  assert.deepEqual(invitationMails.at(-1).to,['coo@northstar.example']);assert.ok(invitationMails.at(-1).text.includes(replacement.shareUrl))
  assert.equal((await h.send(new URL(smsFirst.shareUrl).pathname)).status,410)
  assert.equal((await h.send(new URL(replacement.shareUrl).pathname+'/action?name=code.request',{})).status,409,'replacement retains the SMS requirement and requires new consent')
  assert.equal((await h.db.prepare('SELECT method FROM p_signer_methods WHERE proposal_id=?').bind(smsId).first()).method,'SMS code')
  assert.equal(await h.db.prepare('SELECT 1 FROM p_sms_authority WHERE proposal_id=?').bind(smsId).first(),null)
  assert.equal((await h.db.prepare('SELECT status FROM p_sms_runs WHERE proposal_id=?').bind(smsId).first()).status,'cancelled')
  await tick('2030-06-03T15:00:00Z');assert.equal(attempts,1)

 }finally{await h.close()}
})

test('SEND-005 personal Slack and email preferences deliver client open, comment, signature and payment events once through scoped links', {timeout:120000}, async()=>{
 const messages=[],chats=[],intents=new Map();let h
 h=await harness({cf:false,assetsDirectory:'public',origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9000'},outboundService:async request=>{
  const url=new URL(request.url)
  if(url.hostname==='api.resend.com'){messages.push(await request.json());return Response.json({id:'synthetic-platter-'+(9100+messages.length)})}
  if(url.hostname==='slack.com'){
   if(url.pathname==='/api/auth.test')return Response.json({ok:true,team_id:'synthetic-platter-9001'})
   if(url.pathname==='/api/users.info')return Response.json({ok:true,user:{team_id:'synthetic-platter-9001',profile:{email:h.auth.OWNER_EMAIL}}})
   if(url.pathname==='/api/conversations.open')return Response.json({ok:true,channel:{id:'synthetic-platter-9002'}})
   assert.equal(url.pathname,'/api/chat.postMessage');chats.push(await request.json());return Response.json({ok:true})
  }
  assert.equal(url.hostname,'api.stripe.com')
  if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-9003',default_currency:'usd'})
  if(url.pathname==='/v1/payment_intents'&&request.method==='POST'){
   const f=new URLSearchParams(await request.text()),id='synthetic-platter-9004',intent={id,amount:Number(f.get('amount')),currency:f.get('currency'),status:'requires_payment_method',client_secret:'synthetic-platter-9005',payment_method_types:['card'],metadata:{platter_proposal_id:f.get('metadata[platter_proposal_id]'),platter_revision:f.get('metadata[platter_revision]')}};intents.set(id,intent);return Response.json(intent)
  }
  assert.ok(intents.has(url.pathname.split('/').at(-1)));return Response.json(intents.get(url.pathname.split('/').at(-1)))
 }})
 try{
  await finishSetup(h)
  await h.cmd('provider.connect',{provider:'slack',version:0,token:'synthetic-platter-9006',consent:true})
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-9007',publishableKey:'synthetic-platter-9008',consent:true})
  const owner=(await h.state()).actor,route=await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:'synthetic-platter-9009',operatorId:owner.id,consent:true})
  await h.send('/auth/invite',{email:'watcher@synthetic-platter.example',role:'member',displayName:'Second watcher'},h.owner)
  const member=await h.signIn('watcher@synthetic-platter.example'),person=(await h.state(member)).actor
  const client=await h.cmd('client.save',{name:'Northstar Coffee',email:recipient}),p=await h.cmd('proposal.prepare',{...offer,clientId:client.id})
  await h.cmd('payment.collection',{id:p.id,version:1,completion:'required',paymentMethods:['card']})
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:1})
  const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
  const watch={id:p.id,version:0,email:true,slackRoute:route.id,events:['view','comment','signed','paid'],consent:true}
  await h.cmd('notification.watch',watch,member,403)
  await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:true})
  await h.cmd('notification.watch',{...watch,slackRoute:null},member,403)
  await h.cmd('notification.watch',watch)
  await h.cmd('notification.watch',{...watch,slackRoute:route.id},member,403)
  await h.cmd('notification.watch',{...watch,slackRoute:null,events:['comment','signed','paid']},member)
  const preferences=await h.send('/api/platter/watch?id='+p.id,undefined,member)
  assert.equal(preferences.value.watcher.email_enabled,1);assert.equal(preferences.value.watcher.slack_route,null);assert.deepEqual(JSON.parse(preferences.value.watcher.events),['comment','signed','paid'])
  assert.equal((await h.send('/api/platter/watch?id='+p.id)).status,401)
  const tick=async()=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
  const completions=()=>messages.filter(m=>m.subject==='Agreement complete: '+offer.title)
  const notices=()=>messages.filter(m=>['Proposal opened','Proposal comment','Proposal signed','Proposal payment recorded'].includes(m.subject))
  assert.equal((await h.send(path)).status,200);await tick()
  assert.equal(notices().length,1);assert.equal(chats.length,1)
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(p.id).first()).body.match(/\b\d{6}\b/)[0]
  const verification=await h.send(path+'/action?name=code.verify',{code}),cookie=verification.cookie;assert.equal(verification.status,200,verification.text)
  assert.equal((await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'Synthetic private question'},cookie)).status,200);await tick()
  assert.equal((await h.send(path+'/action?name=accept',{optionId:'one',name:'Avery Chen',consent:true},cookie)).status,200);await tick()
  assert.equal(completions().length,0,'required payment gates completion mail after signing')
  assert.equal((await h.send(path+'/certificate.json',undefined,cookie)).status,409,'required payment gates completion downloads')
  const payment=await h.send(path+'/payment.json',{method:'card',consent:true},cookie);assert.equal(payment.status,200,payment.text)
  const saved=await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()
  assert.equal((await h.send(path+'/payment-consent.json',{consent:true,cents:saved.cents+1},cookie)).status,400)
  assert.equal((await h.send(path+'/payment-consent.json',{consent:true,cents:saved.cents})).status,401)
  assert.equal(completions().length,0,'unverified and mismatched payment authorization send nothing')
  const intent=intents.get(saved.provider_intent);intent.status='succeeded';intent.latest_charge={id:'synthetic-platter-9010',paid:true,status:'succeeded',amount:intent.amount,currency:intent.currency}
  const unauthorizedReceipt=await h.send(path+'/payment-status.json',{},cookie);assert.equal(unauthorizedReceipt.status,200,unauthorizedReceipt.text);assert.equal(unauthorizedReceipt.value.complete,false)
  await tick();assert.equal(completions().length,0,'provider success without the client’s exact authorization cannot release completion')
  assert.equal((await h.send(path+'/certificate.json',undefined,cookie)).status,409)
  assert.equal((await h.send(path+'/payment-consent.json',{consent:true,cents:saved.cents},cookie)).status,200)
  const receipt=await h.send(path+'/payment-status.json',{},cookie);assert.equal(receipt.status,200,receipt.text);await tick()
  assert.equal(completions().length,2,'a confirmed and authorized deposit releases completion once')
  const agreementResponse=await h.mf.dispatchFetch(h.origin+path+'/agreement.pdf',{headers:{cookie}}),certificateResponse=await h.mf.dispatchFetch(h.origin+path+'/certificate.pdf',{headers:{cookie}})
  assert.equal(agreementResponse.status,200);assert.equal(certificateResponse.status,200)
  const agreement=Buffer.from(await agreementResponse.arrayBuffer()),certificate=Buffer.from(await certificateResponse.arrayBuffer())
  for(const message of completions()){assert.deepEqual(message.attachments.map(a=>a.filename),['agreement.pdf','certificate.pdf']);assert.deepEqual(Buffer.from(message.attachments[0].content,'base64'),agreement);assert.deepEqual(Buffer.from(message.attachments[1].content,'base64'),certificate)}
  const ownerMail=notices().filter(m=>m.to.includes(h.auth.OWNER_EMAIL)),memberMail=notices().filter(m=>m.to.includes(person.email))
  assert.deepEqual(ownerMail.map(m=>m.subject),['Proposal opened','Proposal comment','Proposal signed','Proposal payment recorded'])
  assert.deepEqual(memberMail.map(m=>m.subject),['Proposal comment','Proposal signed','Proposal payment recorded']);assert.equal(chats.length,4)
  for(const notice of [...notices().map(m=>m.text),...chats.map(m=>m.text)]){assert.ok(notice.includes('/app/proposal?id='+p.id));assert.ok(!notice.includes('/p/'));assert.ok(!notice.includes('Synthetic private question'));assert.ok(!notice.includes('2400'))}
  const link=new URL(ownerMail[0].text.match(/https:\/\/[^\s]+/)[0]);const signedOut=await h.send(link.pathname+link.search);assert.equal(signedOut.status,303);assert.match(signedOut.headers.get('location'),/^\/signin\?/);assert.equal((await h.send(link.pathname+link.search,undefined,h.owner)).status,200)
  await Promise.all([tick(),tick()]);assert.equal(notices().length,7);assert.equal(chats.length,4)
  await h.send(path+'/payment-status.json',{},cookie);await tick();assert.equal(notices().length,7,'reconciliation never creates another paid notification')
  assert.equal(completions().length,2,'payment refresh and concurrent workers cannot repeat completion attachments')
  await h.send(path,undefined,cookie);await tick();assert.equal(notices().length,7,'only the first client view notifies watchers')
 }finally{await h.close()}
})

test('SEND-005 personal notification revocation and lost proposal scope suppress queued and future sends', {timeout:120000},async()=>{
 const h=await notificationFixture()
 try{
  const p=await h.prepare('Scoped watcher'),watch={id:p.id,version:0,email:true,events:['view'],consent:true}
  await h.cmd('notification.watch',{...watch,consent:false},h.owner,400)
  await h.cmd('notification.watch',{...watch,events:['unknown']},h.owner,400)
  await h.cmd('notification.watch',watch)
  await h.cmd('notification.watch',watch,h.owner,409)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const sent=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(sent.shareUrl).pathname
  await h.send('/auth/invite',{email:'watching-sales@synthetic-platter.example',role:'member',displayName:'Watching sales'},h.owner)
  const cookie=await h.signIn('watching-sales@synthetic-platter.example'),person=(await h.state(cookie)).actor
  await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:true})
  await h.cmd('notification.watch',watch,cookie)
  await h.cmd('notification.watch',{...watch,version:1,email:false,events:[]})
  await h.send(path);await h.tick(Date.now());assert.equal(h.messages.filter(m=>m.subject==='Proposal opened').length,0,'owner opt-out suppresses every watcher')
  await h.cmd('notification.watch',{...watch,version:2,email:false})
  await h.tick(Date.now());assert.equal(h.messages.filter(m=>m.subject==='Proposal opened').length,0,'owner opt-in never replays a pre-consent view to another watcher')
  const scoped=await h.prepare('Scope removed before first view')
  await h.cmd('proposal.approve',{id:scoped.id,version:1,revision:1});const scopedSent=await h.cmd('proposal.send',{id:scoped.id,version:2})
  await h.cmd('notification.watch',{...watch,id:scoped.id,email:false})
  await h.cmd('proposal.share',{id:scoped.id,operatorId:person.id,shared:true})
  await h.cmd('notification.watch',{...watch,id:scoped.id},cookie)
  await h.cmd('proposal.share',{id:scoped.id,operatorId:person.id,shared:false})
  await h.send(new URL(scopedSent.shareUrl).pathname);await h.tick(Date.now());assert.equal(h.messages.filter(m=>m.subject==='Proposal opened').length,0,'lost scope suppresses a genuinely new client event')
  assert.equal((await h.send('/api/platter/watch?id='+scoped.id,undefined,cookie)).status,403)
 }finally{await h.close()}
})

test('SIGN-006 SMS verification limits wrong codes and SIGN-005 certificates retain the actual method and exact signed PDF hash', {timeout:120000},async()=>{
 const {createHash}=await import('node:crypto'),texts=[];let acceptedId
 const h=await harness({cf:false,origin:'https://platter.example',assetsDirectory:'public',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9200',TWILIO_ACCOUNT_SID:'synthetic-platter-9201',TWILIO_AUTH_TOKEN:'synthetic-platter-9202',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){texts.push(Object.fromEntries(new URLSearchParams(await request.text())));return Response.json({sid:'synthetic-platter-'+(9300+texts.length)},{status:201})}
  const url=new URL(request.url)
  if(url.hostname==='api.stripe.com'){
   if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-9205'})
   if(url.pathname.startsWith('/v1/charges/'))return Response.json({id:'synthetic-platter-9206',paid:true,status:'succeeded',amount:60000,amount_refunded:0,currency:'usd',metadata:{platter_proposal_id:acceptedId,platter_revision:'1'}})
   return Response.json({id:'synthetic-platter-9207',charge:'synthetic-platter-9206',currency:'usd',amount:60000,status:'needs_response',evidence_details:{due_by:Date.parse('2030-06-02T12:00:00Z')/1000}})
  }
  return Response.json({id:'synthetic-platter-9203'})
 }})
 try{
  await finishSetup(h)
  const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
  await tick('2030-06-01T13:00:00Z')
  const id=await approved(h),sent=await h.cmd('proposal.send',{id,version:2}),path=new URL(sent.shareUrl).pathname,row=(await h.state()).proposals.find(p=>p.id===id)
  acceptedId=id
  await h.cmd('signer.method',{id,version:row.version,method:'SMS code'},h.owner,409)
  await h.cmd('sms.configure',{id,version:row.version,consent:true,phone:'+12025550128',timeZone:'America/Los_Angeles',evidence:'synthetic-platter-9204'})
  await h.cmd('signer.method',{id,version:row.version,method:'SMS code'})
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,429);assert.equal(texts.length,0,'6 am text codes are refused during quiet hours')
  await tick('2030-06-01T15:00:00Z')
  assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true})).status,401)
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);assert.equal(texts.length,1)
  const first=texts[0].Body.match(/\b\d{6}\b/)[0],wrong=first==='000000'?'000001':'000000'
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,429)
  for(let i=0;i<5;i++)assert.equal((await h.send(path+'/action?name=code.verify',{code:wrong})).status,401)
  assert.equal((await h.send(path+'/action?name=code.verify',{code:first})).status,401,'the correct code cannot bypass an exhausted attempt limit')
  await h.cmd('signer.method',{id,version:row.version,method:'mailbox code'},h.owner,409)
  await tick('2030-06-01T15:01:00Z')
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=texts.at(-1).Body.match(/\b\d{6}\b/)[0],verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200,verified.text)
  assert.equal((await h.send(path+'/action?name=code.verify',{code})).status,401,'the code is single use')
  assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},verified.cookie)).status,200)
  assert.equal((await h.db.prepare('SELECT method FROM p_signature_facts WHERE proposal_id=?').bind(id).first()).method,'SMS code')
  assert.equal((await h.send(path+'/certificate.json')).status,401)
  const certificate=await h.send(path+'/certificate.json',undefined,verified.cookie);assert.equal(certificate.status,200,certificate.text)
  assert.equal(certificate.value.signers[0].method,'SMS code');assert.equal(certificate.value.signers[0].verifiedAt,Date.parse('2030-06-01T15:01:00Z'));assert.equal(certificate.value.signers[0].acceptedAt,Date.parse('2030-06-01T15:01:00Z'))
  assert.equal(certificate.value.location,'not recorded');assert.equal(certificate.value.userAgent,'not recorded')
  const download=async(url,cookie)=>{const r=await h.mf.dispatchFetch(h.origin+url,{headers:{cookie},redirect:'manual'});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer())}
  const bytes=await download(path+'/agreement.pdf',verified.cookie),ownerBytes=await download('/api/platter/agreement.pdf?id='+id,h.owner)
  assert.equal(createHash('sha256').update(bytes).digest('hex'),certificate.value.documentSha256);assert.deepEqual(ownerBytes,bytes)
  const pdf=await download(path+'/certificate.pdf',verified.cookie);assert.equal(pdf.subarray(0,4).toString(),'%PDF')
  const {pdfPages}=await import('./pdf-document.mjs'),pages=await pdfPages(bytes);assert.ok(pages.join('\n').includes('SMS code'));assert.ok(!pages.join('\n').includes('Not signed'))
  assert.equal((await h.send('/api/platter/certificate.json?id='+id)).status,401)
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-9208',consent:true})
  const payment=await h.cmd('payment.bind',{id,chargeId:'synthetic-platter-9206',consent:true})
  await h.cmd('dispute.import',{paymentId:payment.id,disputeId:'synthetic-platter-9207'})
  const packet=await h.cmd('dispute.prepare',{disputeId:'synthetic-platter-9207',version:1,note:'Use the actual recorded SMS method'})
  const disputeBytes=await download('/api/platter/disputes/synthetic-platter-9207/evidence.pdf?packet='+packet.id,h.owner),disputeText=(await pdfPages(disputeBytes)).join(' ')
  assert.match(disputeText,/invitation SMS code verified/);assert.doesNotMatch(disputeText,/Verified mailbox|invitation mailbox code/);assert.match(disputeText,/Retained certificate.pdf is omitted/);assert.ok(disputeText.includes(certificate.value.documentSha256))

  const mailbox=await approved(h),mailShare=await h.cmd('proposal.send',{id:mailbox,version:2}),mailPath=new URL(mailShare.shareUrl).pathname
  await h.send(mailPath+'/action?name=code.request',{});assert.equal(texts.length,2,'default proposals still request a mailbox code')
  const mailboxCode=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(mailbox).first()).body.match(/\b\d{6}\b/)[0]
  const mailVerification=await h.send(mailPath+'/action?name=code.verify',{code:mailboxCode});assert.equal(mailVerification.status,200)
  await h.send(mailPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},mailVerification.cookie)
  const mailCertificate=await h.send(mailPath+'/certificate.json',undefined,mailVerification.cookie);assert.equal(mailCertificate.status,200,mailCertificate.text);assert.equal(mailCertificate.value.signers[0].method,'mailbox code')
 }finally{await h.close()}
})

test('SEND-007 unsigned replacement preserves the frozen offer, revokes old authority and retains certificate custody through races', {timeout:120000},async()=>{const {replacementHttp}=await import('./signer-replacement-http.mjs');await replacementHttp()})

test('COLLAB-002 scoped colleagues comment, receive consented generic email and chat, resolve and assign without exposing internal threads to clients', {timeout:120000},async()=>{
 const h=await notificationFixture()
 const audit=async()=>{const response=await h.send('/api/platter/audit',undefined,h.owner);assert.equal(response.status,200,response.text);return response.value.rows}
 const business=async()=>{
  const tables=(await h.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'p_*' ORDER BY name").all()).results
  return Object.fromEntries(await Promise.all(tables.map(async({name})=>[name,(await h.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()).results])))
 }
 const collaborate=async(action,input,cookie=h.owner,status=200)=>{
  const before=await audit(),state=await h.state(),rows=await business(),mail=h.messages.length,chat=h.chats.length
  const actor=(await h.state(cookie)).actor,from=Date.now()
  const result=await h.cmd(action,input,cookie,status),to=Date.now(),after=await audit()
  if(status!==200){
   assert.deepEqual(after,before,action+' refusal retains the complete audit log')
   assert.deepEqual(await business(),rows,action+' refusal retains every business table')
   assert.deepEqual(await h.state(),state,action+' refusal retains public business state')
   assert.equal(h.messages.length,mail,action+' refusal sends no email')
   assert.equal(h.chats.length,chat,action+' refusal sends no chat')
  }else{
   const prior=new Set(before.map(row=>row.id)),added=after.filter(row=>!prior.has(row.id)&&row.action===action)
   assert.deepEqual(after.filter(row=>prior.has(row.id)),before,action+' retains prior audit rows')
   assert.equal(added.length,1,action+' writes exactly one audit row')
   const [row]=added
   assert.deepEqual({actor:row.actor_id,role:row.actor_role,action:row.action,subject:row.subject},{actor:actor.id,role:actor.role,action,subject:action==='collaboration.route'?input.routeId:input.id},action+' records the actual actor, role, action and subject')
   assert.ok(Number.isSafeInteger(row.occurred_at)&&row.occurred_at>=from&&row.occurred_at<=to,action+' records server epoch-millisecond time during the HTTP request')
  }
  return result
 }
 try{
  await h.connect('slack');const owner=(await h.state()).actor
  const route=await h.cmd('notification.route',{provider:'slack',event:'followup',kind:'channel',destination:'synthetic-platter-7003',consent:true})
  await collaborate('collaboration.route',{routeId:route.id},h.owner,400)
  await collaborate('collaboration.route',{routeId:route.id,consent:true})
  await h.send('/auth/invite',{email:'colleague@synthetic-platter.example',role:'member',displayName:'Synthetic colleague'},h.owner)
  const colleague=await h.signIn('colleague@synthetic-platter.example'),person=(await h.state(colleague)).actor
  await h.cmd('member.set',{operatorId:person.id,version:0,role:'viewer',teams:[]})
  assert.equal((await h.state(colleague)).actor.role,'viewer')
  await collaborate('collaboration.route',{routeId:route.id,consent:true},colleague,403)
  const p=await h.prepare('Internal collaboration'),input={id:p.id,version:1,blockId:'pricing',text:'synthetic-platter-private-comment',recipientId:person.id,consent:true}
  await collaborate('collaboration.comment',input,h.owner,403)
  await h.cmd('proposal.share',{id:p.id,operatorId:person.id})
  await collaborate('collaboration.comment',{...input,consent:false},h.owner,400)
  const startMail=h.messages.length,startChat=h.chats.length
  const comment=await collaborate('collaboration.comment',input)
  assert.equal(h.messages.length,startMail+1);assert.equal(h.chats.length,startChat+1)
  assert.deepEqual(h.messages.at(-1).to,[person.email]);assert.doesNotMatch(h.messages.at(-1).text,/synthetic-platter-private-comment|Internal collaboration/)
  assert.doesNotMatch(h.chats.at(-1).value.text,/synthetic-platter-private-comment|colleague@/)
  const link=h.messages.at(-1).text.match(/https:\/\/[^\s]+/)[0],url=new URL(link)
  assert.equal((await h.send(url.pathname+url.search)).status,303)
  const thread=(await h.state(colleague)).proposals.find(x=>x.id===p.id).collaboration.threads[0]
  assert.equal(thread.id,comment.threadId);assert.equal(thread.block_id,'pricing');assert.equal(thread.recipient_id,person.id)
  await collaborate('collaboration.resolve',{id:p.id,version:1,threadId:thread.id,threadVersion:1},colleague)
  await collaborate('collaboration.resolve',{id:p.id,version:1,threadId:thread.id,threadVersion:1},colleague,409)
  const assignment=await collaborate('collaboration.assign',{...input,blockId:'scope',dueDate:'2030-03-04'})
  let threads=(await h.state(colleague)).proposals.find(x=>x.id===p.id).collaboration.threads
  assert.ok(threads.find(t=>t.id===thread.id).resolved_at)
  assert.equal(threads.find(t=>t.id===assignment.threadId).due_date,'2030-03-04')
  assert.equal(h.messages.at(-1).subject,'Section assigned');assert.equal(h.chats.at(-1).value.text.split('\n')[0],'Section assigned')
  for(const bad of [{blockId:'missing'},{dueDate:'2030-02-30'},{version:0}])await collaborate('collaboration.assign',{...input,blockId:'scope',dueDate:'2030-03-04',...bad},h.owner,bad.version===0?409:400)
  await h.cmd('proposal.document',{id:p.id,version:1,document:{version:1,blocks:[{id:'synthetic-platter-block',type:'text',title:'Rich section',text:'Public block'}]}})
  const current=(await h.state()).proposals.find(x=>x.id===p.id)
  for(const blockId of ['scope','terms','block:synthetic-platter-block'])await collaborate('collaboration.comment',{id:p.id,version:current.version,blockId,text:'synthetic-platter-rich-private'})
  await h.connect('teams')
  const teams=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-7006',operatorId:owner.id,consent:true})
  await collaborate('collaboration.route',{routeId:teams.id,consent:true})
  await collaborate('collaboration.assign',{id:p.id,version:current.version,blockId:'terms',recipientId:owner.id,dueDate:'2030-03-05',consent:true})
  assert.ok(h.chats.some(c=>c.url.includes('graph.microsoft.com')&&c.value.body.content.startsWith('Section assigned')))
  h.uncertain(true)
  await collaborate('collaboration.comment',{id:p.id,version:current.version,blockId:'pricing',recipientId:person.id,text:'synthetic-platter-uncertain-private',consent:true})
  const attempts=h.chats.length
  await h.tick(Date.now());assert.equal(h.chats.length,attempts,'uncertain collaboration delivery is never retried')
  h.uncertain(false)
  await h.cmd('proposal.approve',{id:p.id,version:current.version,revision:current.revision})
  const sent=await h.cmd('proposal.send',{id:p.id,version:current.version+1}),path=new URL(sent.shareUrl).pathname
  await h.send(path+'/action?name=code.request',{})
  const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(p.id).first()).body.match(/\b\d{6}\b/)[0]
  const verified=await h.send(path+'/action?name=code.verify',{code})
  const client=await h.send(path,undefined,verified.cookie),data=await h.send(path+'/data.json',undefined,verified.cookie)
  for(const response of [client,data]){assert.equal(response.status,200,response.text);assert.doesNotMatch(response.text,/synthetic-platter-private-comment|synthetic-platter-rich-private|p_internal_threads|recipient_id/)}
  const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{cookie:verified.cookie}})
  assert.equal(pdf.status,200);const {pdfPages}=await import('./pdf-document.mjs');const pages=await pdfPages(Buffer.from(await pdf.arrayBuffer()))
  assert.doesNotMatch(JSON.stringify(pages),/synthetic-platter-private-comment|synthetic-platter-rich-private|Section assignment/)
  const accepted=await h.send(path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},verified.cookie);assert.equal(accepted.status,200,accepted.text)
  const agreement=await h.mf.dispatchFetch(h.origin+path+'/agreement.pdf',{headers:{cookie:verified.cookie}})
  assert.equal(agreement.status,200);assert.doesNotMatch(JSON.stringify(await pdfPages(Buffer.from(await agreement.arrayBuffer()))),/synthetic-platter-private-comment|synthetic-platter-rich-private|Section assignment/)
  const acceptedData=await h.send(path+'/data.json',undefined,verified.cookie);assert.equal(acceptedData.status,200);assert.doesNotMatch(acceptedData.text,/synthetic-platter-private-comment|synthetic-platter-rich-private/)
  const draft=await h.prepare('Negotiated collaboration')
  await h.cmd('proposal.approve',{id:draft.id,version:1,revision:1})
  await h.cmd('proposal.send',{id:draft.id,version:2})
  const negotiated=await h.cmd('proposal.negotiate',{...offer,id:draft.id,version:3,clientId:h.client.id,document:{version:1,blocks:[{id:'synthetic-platter-negotiated',type:'text',title:'New negotiated section',text:'Draft content'}]}})
  const draftComment=await collaborate('collaboration.comment',{id:draft.id,version:negotiated.version,blockId:'block:synthetic-platter-negotiated',text:'synthetic-platter-negotiated-private',recipientId:owner.id,consent:true})
  const retained=(await h.state()).proposals.find(x=>x.id===draft.id).collaboration.threads.find(t=>t.id===draftComment.threadId)
  assert.equal(retained.revision,negotiated.revision);assert.equal(retained.block_title,'New negotiated section')
  assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_notification_outbox WHERE event_key LIKE 'collab:%' AND proposal_id=? AND status='sent'").bind(draft.id).first()).n,3,'negotiated-revision mentions retain exact current authority for email and both chat routes')
  const agent=await h.cmd('agent.create',{label:'Synthetic drafting'})
  const agentState=await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+agent.token})
  assert.doesNotMatch(agentState.text,/synthetic-platter-private-comment|synthetic-platter-rich-private/)
  // Removing a share ends the public read and write doors immediately.
  await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:false})
  assert.ok(!(await h.state(colleague)).proposals.some(x=>x.id===p.id))
  assert.equal((await h.send('/app/proposal?id='+p.id,undefined,colleague)).status,403)
  await collaborate('collaboration.resolve',{id:p.id,version:current.version+2,threadId:assignment.threadId,threadVersion:1},colleague,403)
  const actions=(await audit()).filter(row=>row.action.startsWith('collaboration.'))
  assert.deepEqual([...new Set(actions.map(row=>row.action))].sort(),['collaboration.assign','collaboration.comment','collaboration.resolve','collaboration.route'])
 }finally{await h.close()}
})

test('SIGN-005 completion mail attaches the retained PDFs to both parties once, through installation and connected mailbox transports', {timeout:240000}, async()=>{
 const {createHash}=await import('node:crypto')
 for(const provider of ['resend','sendgrid','cloudflare','gmail','microsoft','local']){
  const sent=[];let fail=false,stall=false,revokeDuringRefresh=false,release,entered
  let arrived=new Promise(resolve=>{entered=resolve}),waiting=new Promise(resolve=>{release=resolve})
  const h=await harness({cf:false,assetsDirectory:'public',...(provider==='local'?{}:{origin:'https://platter.example'}),auth:{AUTH_LOCAL:provider==='local'?'true':'false',MAIL_PROVIDER:['gmail','microsoft'].includes(provider)?'resend':provider==='local'?'development':provider,MAIL_ACCOUNT_ID:'0'.repeat(32),MAIL_API_KEY:'synthetic-platter-9801',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-9802',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-9803',MICROSOFT_MAIL_CLIENT_ID:'synthetic-platter-9804',MICROSOFT_MAIL_CLIENT_SECRET:'synthetic-platter-9805'},outboundService:async request=>{
   const url=new URL(request.url)
   if(['oauth2.googleapis.com','login.microsoftonline.com'].includes(url.hostname)){if(revokeDuringRefresh){revokeDuringRefresh=false;await h.db.prepare("UPDATE oa_operators SET version=version+1 WHERE role='owner'").run()}return Response.json({access_token:'synthetic-platter-9806',refresh_token:'synthetic-platter-9807',scope:provider==='gmail'?'openid email https://www.googleapis.com/auth/gmail.send':'User.Read Mail.Send'})}
   if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-9808',email:h.auth.OWNER_EMAIL,email_verified:true})
   if(url.pathname==='/v1.0/me')return Response.json({id:'synthetic-platter-9809',mail:h.auth.OWNER_EMAIL})
   const payload=await request.json();let message
   if(provider==='gmail'){
    const raw=Buffer.from(payload.raw,'base64url').toString('utf8'),boundary=raw.match(/boundary="([^"]+)"/)?.[1]
    message={to:[raw.match(/\r\nTo: ([^\r]+)/)[1]],subject:Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString(),attachments:[]}
    if(boundary){for(const part of raw.split('--'+boundary)){const filename=part.match(/filename="([^"]+)"/)?.[1];if(filename){assert.match(part,/Content-Type: application\/pdf/);message.attachments.push({filename,bytes:Buffer.from(part.split('\r\n\r\n')[1].trim(),'base64')})}}}
    else message.text=Buffer.from(raw.split('\r\n\r\n')[1],'base64').toString()
   }else if(provider==='microsoft')message={to:payload.message.toRecipients.map(r=>r.emailAddress.address),subject:payload.message.subject,text:payload.message.body.content,attachments:(payload.message.attachments??[]).map(a=>{assert.equal(a['@odata.type'],'#microsoft.graph.fileAttachment');assert.equal(a.contentType,'application/pdf');return {filename:a.name,bytes:Buffer.from(a.contentBytes,'base64')}})}
   else message={to:provider==='sendgrid'?payload.personalizations[0].to.map(r=>r.email):payload.to,subject:payload.subject,text:payload.text??payload.content?.find(c=>c.type==='text/plain')?.value,attachments:(payload.attachments??[]).map(a=>{assert.equal(a.content_type??a.type,'application/pdf');return {filename:a.filename,bytes:Buffer.from(a.content,'base64')}})}
   sent.push(message);const providerMessageId='synthetic-platter-'+(9900+sent.length)
   if(message.subject.startsWith('Agreement complete:')){if(stall&&message.to.includes(recipient)){entered();await waiting}if(fail)throw Error('Synthetic uncertain completion response')}
   return provider==='sendgrid'?new Response(null,{status:202}):provider==='microsoft'?new Response(null,{status:202}):provider==='cloudflare'?Response.json({success:true,errors:[],result:{message_id:providerMessageId,queued:message.to,delivered:[],permanent_bounces:[]}}):Response.json({id:providerMessageId})
  }})
  try{
   if(['gmail','microsoft'].includes(provider)){
    const start=await h.send('/api/platter/mailbox/authorize',{provider,consent:true},h.owner),state=new URL(start.headers.get('location')).searchParams.get('state')
    assert.equal((await h.send('/api/platter/mailbox/callback?'+new URLSearchParams({state,code:'synthetic-platter-9810'}),undefined,h.owner)).status,303)
   }
   const id=await approved(h),invitation=await h.cmd('proposal.send',{id,version:2}),path=new URL(invitation.shareUrl).pathname
   const accept={name:'Synthetic signer',optionId:'one',consent:true}
   const before=sent.length
   assert.equal((await h.send(path+'/action?name=accept',accept)).status,401);assert.equal(sent.length,before)
   await h.send(path+'/action?name=code.request',{})
   const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(id).first()).body.match(/\b\d{6}\b/)[0]
   const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200,verified.text)
   const cron=async()=>await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
   stall=provider==='resend'
   const accepted=h.send(path+'/action?name=accept',accept,verified.cookie)
   if(stall){await arrived;await Promise.all([cron(),cron()]);release()}
   assert.equal((await accepted).status,200)
   const completion=sent.filter(m=>m.subject.startsWith('Agreement complete:'))
   const references=(await h.db.prepare('SELECT * FROM p_completion_mail WHERE proposal_id=?').bind(id).all()).results
   assert.equal(references.length,2)
   const download=async(url,cookie)=>{const r=await h.mf.dispatchFetch(h.origin+url,{headers:{cookie}});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer())}
   const pdf=await download(path+'/agreement.pdf',verified.cookie),certificate=await download(path+'/certificate.pdf',verified.cookie),facts=(await h.send(path+'/certificate.json',undefined,verified.cookie)).value
   assert.equal(facts.documentSha256,createHash('sha256').update(pdf).digest('hex'));assert.equal(facts.signers[0].method,'mailbox code');assert.equal(facts.location,'not recorded');assert.equal(facts.userAgent,'not recorded')
   assert.deepEqual(await download('/api/platter/agreement.pdf?id='+id,h.owner),pdf);assert.deepEqual(await download('/api/platter/certificate.pdf?id='+id,h.owner),certificate)
   if(provider==='local'){
    const captured=(await mailRows(h)).filter(m=>references.some(r=>r.mail_id===m.id));assert.equal(captured.length,2);assert.ok(captured.every(m=>m.status==='local'));assert.equal(sent.length,0)
   }else{
    const outcomes=(await h.db.prepare('SELECT m.status FROM p_mail m JOIN p_completion_mail c ON c.mail_id=m.id WHERE c.proposal_id=?').bind(id).all()).results;assert.ok(outcomes.every(m=>m.status==='accepted'),provider+' completion has provider acceptance')
    assert.equal(completion.length,2,provider);assert.deepEqual(completion.map(m=>m.to[0]).sort(),[recipient,h.auth.OWNER_EMAIL].sort())
    for(const message of completion){assert.deepEqual(message.attachments.map(a=>a.filename),['agreement.pdf','certificate.pdf']);assert.deepEqual(message.attachments[0].bytes,pdf);assert.deepEqual(message.attachments[1].bytes,certificate)}
   }
   assert.equal((await h.send(path+'/action?name=accept',accept,verified.cookie)).status,200)
   await Promise.all([cron(),cron()]);assert.equal(sent.filter(m=>m.subject.startsWith('Agreement complete:')).length,completion.length)
   assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_agreement_artifacts WHERE proposal_id=?').bind(id).first()).n,1)
   stall=false
   const {completionRecipients}=await import('./completion-recipients.mjs')
   await completionRecipients(h,sent,provider,cron)
   if(provider==='resend'){
    stall=false;fail=true
    const uncertain=await approved(h),share=await h.cmd('proposal.send',{id:uncertain,version:2}),otherPath=new URL(share.shareUrl).pathname
    await h.send(otherPath+'/action?name=code.request',{});const otherCode=sent.at(-1).text.match(/\b\d{6}\b/)[0],v=await h.send(otherPath+'/action?name=code.verify',{code:otherCode})
    assert.equal((await h.send(otherPath+'/action?name=accept',accept,v.cookie)).status,200)
    const n=sent.length;await cron();assert.equal((await h.send(otherPath+'/action?name=accept',accept,v.cookie)).status,200);assert.equal(sent.length,n,'uncertain completion outcomes never replay')
    assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_mail m JOIN p_completion_mail c ON c.mail_id=m.id WHERE c.proposal_id=? AND m.status='uncertain'").bind(uncertain).first()).n,2)
    fail=false
    const stale=await approved(h),old=await h.cmd('proposal.send',{id:stale,version:2}),oldPath=new URL(old.shareUrl).pathname,row=(await h.state()).proposals.find(p=>p.id===stale)
    await h.cmd('proposal.send',{id:stale,version:row.version})
    const unchanged=sent.length;assert.equal((await h.send(oldPath+'/action?name=accept',accept,v.cookie)).status,404);assert.equal(sent.length,unchanged)
    assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_completion_mail WHERE proposal_id=?').bind(stale).first()).n,0)
   }
   if(provider==='gmail'){
    const revoked=await approved(h),share=await h.cmd('proposal.send',{id:revoked,version:2}),revokedPath=new URL(share.shareUrl).pathname
    await h.send(revokedPath+'/action?name=code.request',{});const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(revoked).first()).body.match(/\b\d{6}\b/)[0],v=await h.send(revokedPath+'/action?name=code.verify',{code})
    const before=sent.length;revokeDuringRefresh=true
    assert.equal((await h.send(revokedPath+'/action?name=accept',accept,v.cookie)).status,200)
    await cron();assert.equal(sent.length,before,'owner credential revocation during refresh withholds both attachments without a provider send')
    assert.equal((await h.db.prepare("SELECT count(*) AS n FROM p_mail m JOIN p_completion_mail c ON c.mail_id=m.id WHERE c.proposal_id=? AND m.held_reason='sender_not_authorized'").bind(revoked).first()).n,2)
   }
  }finally{release();await h.close()}
 }
})
