import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { recipientFixture, verifyRecipient, decision } from './recipients-http.mjs'

// Exercise the real recipient, signing, download and transport doors in one journey.
export async function completionRecipients(h, sent, provider, cron) {
 const client=['synthetic-platter-2401','example.test'].join('@')
 const plan=[{id:'client',name:'Client signer',email:client,role:'signer',group:1},{id:'firm',name:'Firm signer',email:h.auth.OWNER_EMAIL,role:'countersigner',group:2}]
 const p=await recipientFixture(h,'Two-party completion attachments',plan),sessions={}
 const messages=()=>sent.filter(m=>m.subject==='Agreement complete: Two-party completion attachments')
 const context={client:{location:'Austin, Texas, US',userAgent:'Synthetic Platter browser 2401'},firm:{location:'Portland, Oregon, US',userAgent:'Synthetic Platter browser 2402'}}
 const sign=async slot=>{
  const cf=slot==='client'?{city:'Austin',region:'Texas',country:'US'}:{city:'Portland',region:'Oregon',country:'US'}
  const response=await h.mf.dispatchFetch(h.origin+p.links[slot]+'/action?name=accept',{method:'POST',cf,headers:{origin:h.origin,cookie:sessions[slot],'content-type':'application/json','user-agent':context[slot].userAgent,'cf-ipcity':'Untrusted location','x-forwarded-for':'192.0.2.124'},body:JSON.stringify({name:slot==='client'?'Client signer':'Firm signer',optionId:'one',consent:true})})
  assert.equal(response.status,200,await response.text())
 }
 for(const [slot,path] of Object.entries(p.links))sessions[slot]=await verifyRecipient(h,path)
 assert.equal((await decision(h,p.links.firm,sessions.firm)).status,409)
 assert.equal((await decision(h,p.links.client,sessions.firm)).status,401)
 assert.equal(messages().length,0,'out-of-order and wrong-party attempts send no completion')
 await sign('client')
 assert.equal(messages().length,0,'the first signature cannot send completion mail')
 assert.equal((await h.send(p.links.client+'/agreement.pdf',undefined,sessions.client)).status,401)
 await sign('firm')
 const download=async(path,cookie)=>{
  const response=await h.mf.dispatchFetch(h.origin+path,{headers:{cookie}})
  assert.equal(response.status,200);return Buffer.from(await response.arrayBuffer())
 }
 const pdf=await download(p.links.client+'/agreement.pdf',sessions.client),certificate=await download(p.links.client+'/certificate.pdf',sessions.client)
 for(const [slot,path] of Object.entries(p.links)){
  assert.deepEqual(await download(path+'/agreement.pdf',sessions[slot]),pdf)
  assert.deepEqual(await download(path+'/certificate.pdf',sessions[slot]),certificate)
  const facts=await h.send(path+'/certificate.json',undefined,sessions[slot]);assert.equal(facts.status,200)
  assert.equal(facts.value.documentSha256,createHash('sha256').update(pdf).digest('hex'))
  assert.deepEqual(facts.value.signers.map(s=>[s.slotId,s.email,s.method]),plan.map(r=>[r.id,r.email,'mailbox code']))
  assert.deepEqual(facts.value.signers.map(s=>[s.location,s.userAgent]),plan.map(r=>[context[r.id].location,context[r.id].userAgent]))
  assert.ok(!JSON.stringify(facts.value).includes('192.0.2.124'));assert.ok(!JSON.stringify(facts.value).includes('Untrusted location'))
 }
 assert.deepEqual(await download('/api/platter/agreement.pdf?id='+p.id,h.owner),pdf)
 assert.deepEqual(await download('/api/platter/certificate.pdf?id='+p.id,h.owner),certificate)
 const {pdfPages}=await import('./pdf-document.mjs'),text=(await pdfPages(certificate)).join(' ')
 for(const facts of Object.values(context)){assert.ok(text.includes(facts.location));assert.ok(text.includes(facts.userAgent))}
 const agreementText=(await pdfPages(pdf)).join(' ')
 for(const signer of plan){assert.ok(agreementText.includes('Signed by: '+signer.name));assert.ok(agreementText.includes(signer.email))}
 assert.equal((await h.send(p.links.firm+'/certificate.json',undefined,sessions.client)).status,401)
 const refs=(await h.db.prepare('SELECT * FROM p_completion_mail WHERE proposal_id=? ORDER BY recipient').bind(p.id).all()).results
 assert.deepEqual(refs.map(r=>r.recipient).sort(),[client,h.auth.OWNER_EMAIL].sort(),'the firm receives one copy when also a signer')
 if(provider==='local'){
  assert.equal(messages().length,0)
  for(const ref of refs)assert.equal((await h.db.prepare('SELECT status FROM p_mail WHERE id=?').bind(ref.mail_id).first()).status,'local')
 }else{
  assert.deepEqual(messages().map(m=>m.to[0]).sort(),[client,h.auth.OWNER_EMAIL].sort())
  for(const m of messages()){
   assert.deepEqual(m.attachments.map(a=>a.filename),['agreement.pdf','certificate.pdf'])
   assert.deepEqual(m.attachments[0].bytes,pdf);assert.deepEqual(m.attachments[1].bytes,certificate)
  }
 }
 await Promise.all([decision(h,p.links.firm,sessions.firm),decision(h,p.links.client,sessions.client),cron(),cron()])
 assert.equal(messages().length,provider==='local'?0:2,'replayed signatures and concurrent workers never duplicate mail')
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_completion_mail WHERE proposal_id=?').bind(p.id).first()).n,2)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_agreement_artifacts WHERE proposal_id=?').bind(p.id).first()).n,1)
}
