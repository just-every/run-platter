import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { harness } from './harness.mjs'
import { pdfPages } from './pdf-document.mjs'

export async function replacementHttp(){
 const h=await harness({assetsDirectory:'public'})
 try{
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const client=await h.cmd('client.save',{name:'Northstar',email:'ceo@northstar.example'})
  const offer={clientId:client.id,title:'Leadership agreement',scope:'Two production days.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
  const prepare=async()=>{const p=await h.cmd('proposal.prepare',offer);await h.cmd('proposal.revise',{...offer,id:p.id,version:1,scope:'Three production days.'});await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});return {id:p.id,...await h.cmd('proposal.send',{id:p.id,version:3})}}
  const verify=async path=>{assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=(SELECT proposal_id FROM p_shares WHERE token=?) AND subject='Your Platter verification code' ORDER BY created_at DESC LIMIT 1").bind(path.split('/').at(-1)).first()).body.match(/\b\d{6}\b/)[0];const r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);return {cookie:r.cookie,code}}
  const p=await prepare(),oldPath=new URL(p.shareUrl).pathname,oldSession=await verify(oldPath)
  const before=(await h.state()).proposals.find(x=>x.id===p.id),approvals=(await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results,decisions=(await h.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(p.id).all()).results
  const input={id:p.id,version:before.version,recipient:'coo@northstar.example',reason:'The COO is our authorized signer.',mailSubject:'Please sign as COO',mailMessage:'Hi COO, review these exact terms.'}
  await h.cmd('signer.replace',{...input,version:1},h.owner,409)
  await h.cmd('signer.replace',{...input,reason:''},h.owner,400)
  await h.cmd('signer.replace',{...input,mailMessage:'Hi {client.first_name}'},h.owner,400)
  await h.send('/auth/invite',{email:'foreign@studio.example',displayName:'Foreign seller',role:'member',returnTo:'/app'},h.owner)
  const foreign=await h.signIn('foreign@studio.example');await h.cmd('signer.replace',input,foreign,403)
  assert.equal((await h.db.prepare('SELECT count(*) n FROM p_signer_replacements').first()).n,0)
  const replaced=await h.cmd('signer.replace',input),path=new URL(replaced.shareUrl).pathname
  const after=(await h.state()).proposals.find(x=>x.id===p.id)
  for(const field of ['scope','options','revision','approved_at','approved_by','title','deposit_bps'])assert.deepEqual(after[field],before[field],field)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results,approvals)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(p.id).all()).results,decisions)
  assert.equal((await h.db.prepare('SELECT signing_position FROM p_shares WHERE proposal_id=?').bind(p.id).first()).signing_position,1);assert.equal(after.signerReplacements[0].signing_position,1);assert.equal(after.signerReplacements[0].actor_email,h.auth.OWNER_EMAIL)
  const message=after.invitationMessages.find(m=>m.recipient===input.recipient);assert.equal(message.subject,input.mailSubject);assert.equal(message.message,input.mailMessage)
  for(const door of ['', '/data.json','/download.pdf','/certificate.json','/certificate.pdf','/agreement.pdf','/attachments/synthetic-platter-1','/media/synthetic-platter-1','/payment.json','/payment-consent.json','/payment-status.json']){const r=await h.send(oldPath+door,undefined,oldSession.cookie);assert.equal(r.status,410,door);assert.ok(!r.text.includes(offer.title))}
  assert.equal((await h.send(oldPath+'/action?name=code.verify',{code:oldSession.code})).status,410)
  assert.equal((await h.send(oldPath+'/action?name=accept',{name:'CEO',optionId:'one',consent:true},oldSession.cookie)).status,410)
  assert.equal((await h.send(path+'/action?name=accept',{name:'COO',optionId:'one',consent:true},oldSession.cookie)).status,401)
  const session=await verify(path);assert.equal((await h.send(path+'/action?name=accept',{name:'COO',optionId:'two',consent:true},session.cookie)).status,200)
  const cert=await h.send(path+'/certificate.json',undefined,session.cookie);assert.equal(cert.status,200,cert.text)
  assert.equal(cert.value.replacements[0].old_recipient,'ceo@northstar.example');assert.equal(cert.value.replacements[0].new_recipient,input.recipient);assert.equal(cert.value.replacements[0].reason,input.reason);assert.ok(cert.value.replacements[0].replaced_at>0);assert.equal(cert.value.signers[0].email,input.recipient)
  const bytes=async url=>{const r=await h.mf.dispatchFetch(h.origin+url,{headers:{cookie:url.startsWith('/api/')?h.owner:session.cookie}});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer())}
  const document=await bytes(path+'/agreement.pdf'),certificate=await bytes(path+'/certificate.pdf')
  assert.deepEqual(await bytes('/api/platter/agreement.pdf?id='+p.id),document)
  assert.deepEqual(await bytes('/api/platter/certificate.pdf?id='+p.id),certificate)
  assert.equal(createHash('sha256').update(document).digest('hex'),cert.value.documentSha256)
  const text=(await pdfPages(certificate)).join(' ');for(const value of [input.recipient,'ceo@northstar.example',input.reason,h.auth.OWNER_EMAIL])assert.ok(text.includes(value),value)
  const accepted=(await h.state()).proposals.find(x=>x.id===p.id),history=(await h.db.prepare('SELECT * FROM p_signer_replacements').all()).results
  await h.cmd('signer.replace',{...input,version:accepted.version,recipient:'other@northstar.example'},h.owner,409)
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_signer_replacements').all()).results,history)
  // Replacement and withdrawal serialize on the same proposal version.
  const race=await prepare(),racePath=new URL(race.shareUrl).pathname,raceRow=(await h.state()).proposals.find(x=>x.id===race.id)
  const results=await Promise.all([h.send('/api/platter/command',{name:'signer.replace',input:{...input,id:race.id,version:raceRow.version}},h.owner),h.send('/api/platter/command',{name:'proposal.withdraw',input:{id:race.id,version:raceRow.version,reason:'Wrong recipient',notice:false}},h.owner)])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
  let current=(await h.state()).proposals.find(x=>x.id===race.id)
  if(current.status==='sent')await h.cmd('proposal.withdraw',{id:race.id,version:current.version,reason:'Wrong recipient',notice:false})
  for(const link of [racePath,...results.filter(r=>r.value.shareUrl).map(r=>new URL(r.value.shareUrl).pathname)])for(const suffix of ['', '/data.json','/download.pdf','/agreement.pdf','/certificate.json'])assert.equal((await h.send(link+suffix)).status,410)
  // A signature racing replacement either wins unchanged, or loses its old authority.
  const signing=await prepare(),signPath=new URL(signing.shareUrl).pathname,signSession=await verify(signPath),signRow=(await h.state()).proposals.find(x=>x.id===signing.id)
  const signingResults=await Promise.all([h.send('/api/platter/command',{name:'signer.replace',input:{...input,id:signing.id,version:signRow.version}},h.owner),h.send(signPath+'/action?name=accept',{name:'CEO',optionId:'one',consent:true},signSession.cookie)])
  assert.equal(signingResults.filter(r=>r.status===200).length,1);assert.ok(signingResults.every(r=>[200,409,410].includes(r.status)))
 }finally{await h.close()}
}
