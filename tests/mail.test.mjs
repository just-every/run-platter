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
  for(const [proposal,replyTo] of [[google,googleReply],[microsoft,microsoftReply]]){
   const receipts=await Promise.all(Array.from({length:proposal.id===microsoft.id?2:1},()=>inbound.deliver(h,replyTo,recipient,'Can we start next Monday?')))
   assert.deepEqual(receipts.map(r=>r.status).sort(),proposal.id===microsoft.id?[201,409]:[201]);const receipt=receipts.find(r=>r.status===201);assert.equal((await receipt.submit()).status,409)
   const saved=(await h.state(people.sales.cookie)).proposals.find(p=>p.id===proposal.id).mailReplies
   assert.equal(saved.length,1);assert.equal(saved[0].text,'Can we start next Monday?');assert.equal(saved[0].client_email,recipient)
   assert.match((await h.send('/app/proposal?id='+proposal.id,undefined,people.sales.cookie)).text,/Can we start next Monday\?/)
   assert.ok(!(await h.state(people.other.cookie)).proposals.some(p=>p.id===proposal.id),'reply text inherits proposal scope')
   const audit=(await h.send('/api/platter/audit?action=mail.client-reply&subject='+proposal.id,undefined,h.owner)).value.rows
   assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'client')
  }
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
  timeout=false;await connect('gmail');demoteDuringRefresh=true
  const raced=await h.cmd('proposal.prepare',{...offer,clientId:client.id},people.sales.cookie),sentBefore=gmail.length
  await h.cmd('proposal.send',{id:raced.id,version:1},people.sales.cookie,403)
  assert.equal(gmail.length,sentBefore);assert.equal(installation.length,1,'loss of sending authority never falls back')
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
