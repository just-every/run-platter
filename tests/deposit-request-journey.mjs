import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { harness } from './harness.mjs'

// Called by the existing completion-mail sanity journey; no additional test registration.
export async function paperDepositMailJourney() {
 for(const provider of ['local','resend','gmail']) {

  let h,refreshMutation,uncertain=false,hold=false,entered,release
  const sent=[],arrived=new Promise(resolve=>{entered=resolve});let waiting=new Promise(resolve=>{release=resolve})
  h=await harness({cf:false,...(provider==='local'?{}:{origin:'https://platter.example'}),auth:{AUTH_LOCAL:provider==='local'?'true':'false',MAIL_PROVIDER:provider==='local'?'development':'resend',MAIL_API_KEY:'synthetic-platter-8101',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-8102',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-8103'},outboundService:async request=>{
   const url=new URL(request.url)
   if(url.hostname==='oauth2.googleapis.com'){
    if(refreshMutation){const mutation=refreshMutation;refreshMutation=null;await mutation()}
    return Response.json({access_token:'synthetic-platter-8104',refresh_token:'synthetic-platter-8105',scope:'openid email https://www.googleapis.com/auth/gmail.send'})
   }
   if(url.hostname==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-8106',email:h.auth.OWNER_EMAIL,email_verified:true})
   const payload=await request.json()
   let mail=payload
   if(url.hostname==='gmail.googleapis.com'){
    const raw=Buffer.from(payload.raw,'base64url').toString('utf8')
    mail={to:[raw.match(/\r\nTo: ([^\r]+)/)[1]],subject:Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString(),text:Buffer.from(raw.split('\r\n\r\n')[1],'base64').toString()}
   }
   sent.push(mail)
   if(mail.subject.startsWith('Deposit request:')){if(hold){entered();await waiting}if(uncertain)throw Error('Synthetic uncertain deposit response')}
   return Response.json({id:'synthetic-platter-'+(8200+sent.length)})
  }})

  try {

   await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})

   if(provider==='gmail'){
    const start=await h.send('/api/platter/mailbox/authorize',{provider:'gmail',consent:true},h.owner),state=new URL(start.headers.get('location')).searchParams.get('state')
    assert.equal((await h.send('/api/platter/mailbox/callback?'+new URLSearchParams({state,code:'synthetic-platter-8107'}),undefined,h.owner)).status,303)
   }
   const recipient='synthetic-platter-8108'+String.fromCharCode(64)+'example.test'
   const client=await h.cmd('client.save',{name:'Synthetic paper client',email:recipient})
   const paper=async()=>{
    const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic paper agreement',scope:'One-off delivery.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:25})
    await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
    const invitation=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(invitation.shareUrl).pathname
    const signed=Buffer.from('%PDF-1.7 synthetic-platter-8109 signed original'),form=new FormData()
    for(const [key,value]of Object.entries({id:p.id,version:3,optionId:'two',signer:'Synthetic paper signer',signedOn:'2026-01-01',attest:'yes'}))form.set(key,String(value))
    form.set('file',new File([signed],'signed.pdf',{type:'application/pdf'}))
    const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:form})
    const response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(response.status,200,await response.text())
    const accepted=(await h.state()).proposals.find(x=>x.id===p.id)
    return {p:accepted,path,signed,input:{id:p.id,version:accepted.version,...accepted.depositRequestReview,consent:true}}
   }
   const first=await paper();
   const before=sent.length
   await h.cmd('deposit.request',{...first.input,recipient:h.auth.OWNER_EMAIL},h.owner,409)
   assert.equal(sent.length,before)
   hold=provider==='resend'
   const requesting=Promise.all([h.cmd('deposit.request',first.input),h.cmd('deposit.request',first.input)])
   if(hold){await arrived;await h.cmd('deposit.request',first.input);release()}
   const results=await requesting;hold=false;const result=results.find(r=>r.status===(provider==='local'?'local':'accepted'));assert.ok(result);assert.equal(results[0].requestId,results[1].requestId)
   const retained=(await h.state()).proposals.find(x=>x.id===first.p.id).depositRequests[0]
   const messages=provider==='local'?(await h.state()).outbox.filter(m=>m.id===retained.mail_id).map(m=>({to:[m.recipient],subject:m.subject,text:m.body})):sent.filter(m=>m.subject.startsWith('Deposit request:'))
   assert.equal(messages.length,1);assert.deepEqual(messages[0].to,[recipient]);assert.match(messages[0].text,/USD 1050\.00/);assert.ok(messages[0].text.includes(first.path));assert.ok(messages[0].text.includes(result.requestId));assert.match(messages[0].text,/Accepted revision: 1/);assert.match(messages[0].text,/Platter did not verify the signature/)
   assert.equal(retained.status,provider==='local'?'local':'accepted');assert.deepEqual(retained.history.map(e=>e.status),provider==='local'?['local']:['pending','sending','accepted']);assert.equal(retained.deposit_cents,105000);assert.equal(retained.recipient,recipient);assert.equal(retained.revision,1)
   if(provider!=='local'){assert.equal(retained.provider,provider==='gmail'?'gmail':'installation');assert.ok(retained.provider_message_id);const history=await h.db.prepare('SELECT * FROM p_mail_attributions WHERE mail_id=?').bind(retained.mail_id).first();assert.equal(history.outcome,'accepted')}
   const n=sent.length
   await Promise.all([h.cmd('deposit.request',first.input),h.cmd('deposit.request',first.input)]);assert.equal(sent.length,n)
   const original=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+first.p.id+'/'+first.p.acceptance.signedCopy.id,{headers:{cookie:h.owner}})
   assert.equal(original.status,200);assert.equal(createHash('sha256').update(Buffer.from(await original.arrayBuffer())).digest('hex'),createHash('sha256').update(first.signed).digest('hex'))
   assert.deepEqual((await h.state()).proposals.find(x=>x.id===first.p.id).acceptance,first.p.acceptance)
   if(provider==='resend'){
    const second=await paper();uncertain=true
    const result=await h.cmd('deposit.request',second.input);assert.equal(result.status,'uncertain')
    const count=sent.length;uncertain=false
    await Promise.all([h.cmd('deposit.request',second.input),h.cmd('deposit.request',second.input)]);assert.equal(sent.length,count,'an uncertain response never authorizes another send')
    const rows=(await h.db.prepare('SELECT * FROM p_deposit_requests WHERE proposal_id=?').bind(second.p.id).all()).results;assert.equal(rows.length,1);assert.equal(rows[0].status,'uncertain');assert.deepEqual((await h.state()).proposals.find(p=>p.id===second.p.id).depositRequests[0].history.map(e=>e.status),['pending','sending','uncertain'])
    const interrupted=await paper();hold=true
    const reached=new Promise(resolve=>{entered=resolve});waiting=new Promise(resolve=>{release=resolve})
    const inFlight=h.cmd('deposit.request',interrupted.input);await reached
    const beforeRecovery=sent.length
    await h.db.prepare('UPDATE p_deposit_requests SET updated_at=0 WHERE proposal_id=?').bind(interrupted.p.id).run()
    const recovered=await h.cmd('deposit.request',interrupted.input);assert.equal(recovered.status,'uncertain');assert.equal(sent.length,beforeRecovery,'an interrupted send is held without another provider request')
    release();await inFlight;hold=false
    await h.cmd('deposit.request',interrupted.input)
    const heldRequest=(await h.state()).proposals.find(p=>p.id===interrupted.p.id).depositRequests[0]
    assert.equal(heldRequest.status,'uncertain','a late response cannot release the hold');assert.deepEqual(heldRequest.history.map(e=>e.status),['pending','sending','uncertain']);assert.equal(sent.length,beforeRecovery)
    assert.equal((await h.db.prepare('SELECT status FROM p_mail WHERE id=?').bind(heldRequest.mail_id).first()).status,'uncertain')
   }

   if(provider==='gmail'){
    for(const changed of ['invitation','recipient','owner']){
     const next=await paper(),count=sent.length
     refreshMutation=async()=>{
      if(changed==='owner')await h.db.prepare("UPDATE oa_operators SET version=version+1 WHERE role='owner'").run()
      else if(changed==='recipient')await h.db.prepare('UPDATE p_shares SET recipient=? WHERE proposal_id=?').bind(h.auth.OWNER_EMAIL,next.p.id).run()
      else await h.db.prepare('UPDATE p_shares SET token=? WHERE proposal_id=?').bind('a'.repeat(64),next.p.id).run()
     }
     const blocked=await h.cmd('deposit.request',next.input);assert.equal(blocked.status,'withheld');assert.equal(sent.length,count,changed+' changes during refresh prevent provider contact')
     assert.equal((await h.db.prepare('SELECT status FROM p_mail WHERE id=(SELECT mail_id FROM p_deposit_requests WHERE proposal_id=?)').bind(next.p.id).first()).status,'uncertain')
    }
   }
  } finally {release?.();await h.close()}
 }
}
