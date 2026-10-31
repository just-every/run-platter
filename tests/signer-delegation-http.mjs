import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { readFile } from 'node:fs/promises'
import { documentFixture } from './document-fixture.mjs'
import { pdfPages } from './pdf-document.mjs'
const address=n=>['synthetic-platter-'+n,'example.test'].join('@')
export async function delegationFixture(h){
 const client=(await h.state()).clients.find(c=>c.email===address(9901))??await h.cmd('client.save',{name:'Synthetic Platter leadership',email:address(9901)}),offer={clientId:client.id,title:'Synthetic Platter delegation',scope:'synthetic-platter-private-scope',optionOne:'Studio',priceOne:'2500',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
 const p=await h.cmd('proposal.prepare',offer);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const sent=await h.cmd('proposal.send',{id:p.id,version:2})
 const get=async()=>(await h.state()).proposals.find(r=>r.id===p.id)
 const configure=async enabled=>h.cmd('signer.delegation.configure',{id:p.id,version:(await get()).version,enabled})
 return {...p,path:new URL(sent.shareUrl).pathname,get,configure,offer}
}
export async function delegationVerify(h,path){
 let r=await h.send(path+'/action?name=code.request',{});assert.equal(r.status,200,r.text)
 const token=path.split('/').at(-1),s=await h.db.prepare('SELECT s.*,COALESCE(s.recipient,c.email) AS recipient FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE s.token=?').bind(token).first()
 const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND recipient=? AND subject IN ('Your Platter verification code','Su código de verificación de Platter') AND body!='Verification code consumed' ORDER BY rowid DESC LIMIT 1").bind(s.proposal_id,s.recipient??address(9901)).first()
 const code=mail.body.match(/\b\d{6}\b/)[0];r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);return {cookie:r.cookie,code}
}
const input={delegateName:'Synthetic COO',recipient:address(9902),revision:1}
export async function delegationHttp(){
 const h=await harness({assetsDirectory:'public'})
 try{
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const form=new FormData();form.set('kind','w9');form.set('file',new File(['%PDF synthetic-platter-confidential-attachment'],'synthetic-platter-attachment.pdf',{type:'application/pdf'}));const uploadRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form}),upload=await h.mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:uploadRequest.headers,body:await uploadRequest.arrayBuffer()});assert.equal(upload.status,200,await upload.text())
  const p=await delegationFixture(h),original=await p.get(),session=await delegationVerify(h,p.path)
  const capture=async()=>{const result={};for(const table of ['p_proposals','p_shares','p_signer_delegations','p_mail','p_audit'])result[table]=(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results;return result}
  const refused=async(path,data,cookie,status)=>{const before=await capture(),r=await h.send(path,data,cookie);assert.equal(r.status,status,r.text);assert.deepEqual(await capture(),before,'refusal changes no business data or mail');return r}
  const action=p.path+'/action?name=delegate'
  await refused(action,input,session.cookie,409)
  await p.configure(true)
  await refused(action,input,'',401)
  await refused(action,{...input,revision:0},session.cookie,409)
  await refused(action,{...input,recipient:address(9901)},session.cookie,400)
  await h.send('/auth/invite',{email:address(9903),displayName:'Synthetic sales person',role:'member',returnTo:'/app'},h.owner)
  const member=await h.signIn(address(9903)),row=await p.get()
  await refused('/api/platter/command',{name:'signer.delegation.configure',input:{id:p.id,version:row.version,enabled:true}},member,403)
  const before=await p.get(),approvals=(await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results
  assert.equal((await h.send(action,input,session.cookie)).status,200)
  const after=await p.get(),delegate='/p/'+after.shareToken
  for(const key of ['revision','scope','options','approved_at','approved_by','title','deposit_bps','recipient_plan'])assert.deepEqual(after[key],before[key],key+' is frozen')
  assert.deepEqual((await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results,approvals)
  const notices=(await h.db.prepare("SELECT * FROM p_mail WHERE proposal_id=? AND subject='Signer delegation recorded'").bind(p.id).all()).results
  assert.equal(notices.length,1);assert.equal(notices[0].recipient,h.auth.OWNER_EMAIL);assert.ok(notices[0].body.includes(address(9902)))
  for(const suffix of ['', '/data.json','/download.pdf','/certificate.json','/certificate.pdf','/agreement.pdf','/attachments/'+original.attachments[0].id,'/media/synthetic-platter-1']){
   const old=await h.send(p.path+suffix,undefined,session.cookie);assert.equal(old.status,410,suffix);assert.ok(!old.text.includes(original.scope))
   const fresh=await h.send(delegate+suffix,undefined,session.cookie);assert.equal(fresh.status,suffix===''?200:401,suffix+': '+fresh.text);assert.ok(!fresh.text.includes(original.scope));assert.ok(!fresh.text.includes(original.title))
  }
  await refused(p.path+'/action?name=delegate',input,session.cookie,410)
  await refused(delegate+'/action?name=code.verify',{code:session.code},'',401)
  await refused(delegate+'/action?name=accept',{name:'Synthetic COO',optionId:'one',consent:true},session.cookie,401)
  const delegateSession=await delegationVerify(h,delegate)
  assert.ok((await h.send(delegate,undefined,delegateSession.cookie)).text.includes(original.scope))
  assert.equal((await h.send(delegate+'/data.json',undefined,delegateSession.cookie)).value.scope,original.scope)
  const attachment=await h.send(delegate+'/attachments/'+original.attachments[0].id,undefined,delegateSession.cookie);assert.equal(attachment.status,200);assert.equal(attachment.text,'%PDF synthetic-platter-confidential-attachment')
  const undo=await h.cmd('signer.delegation.undo',{id:p.id,version:(await p.get()).version,delegationId:after.delegation.history[0].id}),restored=new URL(undo.shareUrl).pathname
  assert.notEqual(restored,p.path);assert.notEqual(restored,delegate)
  for(const old of [p.path,delegate])assert.equal((await h.send(old+'/data.json',undefined,delegateSession.cookie)).status,410)
  assert.ok(!(await h.send(restored)).text.includes(original.scope));await refused(restored+'/action?name=code.verify',{code:session.code},'',401)
  const freshSession=await delegationVerify(h,restored)
  await h.cmd('signer.delegation.undo',{id:p.id,version:(await p.get()).version,delegationId:after.delegation.history[0].id},h.owner,409)
  await p.configure(false);await refused(restored+'/action?name=delegate',input,freshSession.cookie,409);await p.configure(true)
  assert.equal((await h.send(restored+'/action?name=delegate',input,freshSession.cookie)).status,200)
  const finalPath='/p/'+(await p.get()).shareToken,finalSession=await delegationVerify(h,finalPath)
  assert.equal((await h.send(finalPath+'/action?name=accept',{name:'Synthetic COO',optionId:'one',consent:true},finalSession.cookie)).status,200)
  const certificate=await h.send(finalPath+'/certificate.json',undefined,finalSession.cookie);assert.equal(certificate.status,200,certificate.text)
  assert.equal(certificate.value.delegations.length,2);assert.equal(certificate.value.delegations[0].old_recipient,address(9901));assert.equal(certificate.value.delegations[0].new_recipient,address(9902));assert.ok(certificate.value.delegations.some(r=>r.undone_at>0&&r.undone_by===h.auth.OWNER_EMAIL));assert.equal(certificate.value.signers[0].email,address(9902));assert.equal(certificate.value.revision,1)
  const pdf=await h.mf.dispatchFetch(h.origin+finalPath+'/certificate.pdf',{headers:{cookie:finalSession.cookie}}),pdfText=(await pdfPages(new Uint8Array(await pdf.arrayBuffer()))).join(' ')
  for(const word of ['Synthetic COO',address(9901),address(9902),'Undone at:','Delegated at:'])assert.ok(pdfText.includes(word),word)
  await refused(finalPath+'/action?name=delegate',input,finalSession.cookie,409)
  await h.cmd('signer.delegation.undo',{id:p.id,version:(await p.get()).version,delegationId:(await p.get()).delegation.history.find(r=>!r.undone_at).id},h.owner,409)
  // Both operations consume the same current invitation; only one may win.
  const race=await delegationFixture(h);await race.configure(true);const raceSession=await delegationVerify(h,race.path)
  const raced=await Promise.all([h.send(race.path+'/action?name=delegate',input,raceSession.cookie),h.send(race.path+'/action?name=accept',{name:'Synthetic CEO',optionId:'one',consent:true},raceSession.cookie)])
  assert.equal(raced.filter(r=>r.status===200).length,1,JSON.stringify(raced.map(r=>[r.status,r.text.slice(0,100)])));assert.ok(raced.every(r=>[200,409,410].includes(r.status)))
  const terminal=await delegationFixture(h);await terminal.configure(true);const terminalSession=await delegationVerify(h,terminal.path),terminalRow=await terminal.get()
  await h.cmd('proposal.withdraw',{id:terminal.id,version:terminalRow.version,reason:'Synthetic Platter withdrawal',notice:false})
  await refused(terminal.path+'/action?name=delegate',input,terminalSession.cookie,410)
  const expired=await delegationFixture(h);await expired.configure(true);const expiredSession=await delegationVerify(h,expired.path)
  await h.cmd('expiry.set',{id:expired.id,version:(await expired.get()).version,mode:'date',date:'2000-01-01'})
  await refused(expired.path+'/action?name=delegate',input,expiredSession.cookie,409)
  const changed=await delegationFixture(h);await changed.configure(true);const changedSession=await delegationVerify(h,changed.path)
  await h.cmd('proposal.negotiate',{...changed.offer,id:changed.id,version:(await changed.get()).version,scope:'synthetic-platter-next-offer'})
  await refused(changed.path+'/action?name=delegate',input,changedSession.cookie,409)
  const changedRow=await changed.get();await refused('/api/platter/command',{name:'proposal.send',input:{id:changed.id,version:changedRow.version,delegationConsent:true}},h.owner,409)
  const {recipientFixture,roles,verifyRecipient}=await import('./recipients-http.mjs')
  const configured=await recipientFixture(h,'Synthetic Platter configured delegation refusal',roles(h.auth.OWNER_EMAIL)),configuredCookie=await verifyRecipient(h,configured.links.ceo)
  await refused(configured.links.ceo+'/action?name=delegate',{...input,revision:configured.revision},configuredCookie,409)
  const collection=await h.cmd('proposal.prepare',{...p.offer,title:'Synthetic Platter collection delegation refusal'})
  await h.cmd('payment.collection',{id:collection.id,version:1,completion:'due',paymentMethods:['card']})
  await h.cmd('proposal.approve',{id:collection.id,version:2,revision:1});await h.cmd('proposal.send',{id:collection.id,version:3})
  await refused('/api/platter/command',{name:'signer.delegation.configure',input:{id:collection.id,version:4,enabled:true}},h.owner,409)
  const mediaOffer=await h.cmd('proposal.prepare',{...p.offer,title:'Synthetic Platter delegated media'})
  const imageBytes=await readFile('public/brand/apple-touch-icon.png'),mediaForm=new FormData()
  for(const [key,value]of Object.entries({id:mediaOffer.id,version:'1',consent:'yes'}))mediaForm.set(key,value)
  mediaForm.set('file',new File([imageBytes],'synthetic-platter-9905.png',{type:'image/png'}))
  const mediaRequest=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:mediaForm})
  const uploadMedia=await h.mf.dispatchFetch(mediaRequest.url,{method:'POST',headers:mediaRequest.headers,body:await mediaRequest.arrayBuffer()});assert.equal(uploadMedia.status,200)
  const media=(await uploadMedia.json()).media,document=documentFixture();document.blocks.push({id:'synthetic-platter-image',type:'image',title:'Synthetic Platter image',text:'',assetId:media.id,alt:'Synthetic Platter logo'})
  await h.cmd('proposal.document',{id:mediaOffer.id,version:1,document})
  await h.cmd('proposal.approve',{id:mediaOffer.id,version:2,revision:2});const mediaSent=await h.cmd('proposal.send',{id:mediaOffer.id,version:3}),mediaPath=new URL(mediaSent.shareUrl).pathname
  await h.cmd('signer.delegation.configure',{id:mediaOffer.id,version:4,enabled:true})
  const mediaSession=await delegationVerify(h,mediaPath)
  assert.equal((await h.send(mediaPath+'/action?name=delegate',{...input,revision:2},mediaSession.cookie)).status,200)
  const mediaDelegate='/p/'+(await h.state()).proposals.find(r=>r.id===mediaOffer.id).shareToken
  assert.equal((await h.send(mediaDelegate+'/media/'+media.id)).status,401)
  assert.equal((await h.send(mediaPath+'/media/'+media.id,undefined,mediaSession.cookie)).status,410)
  const mediaVerified=await delegationVerify(h,mediaDelegate),imageResponse=await h.mf.dispatchFetch(h.origin+mediaDelegate+'/media/'+media.id,{headers:{cookie:mediaVerified.cookie}})
  assert.equal(imageResponse.status,200);assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()),imageBytes)
  const unsigned=await h.mf.dispatchFetch(h.origin+mediaDelegate+'/download.pdf?optionId=one',{headers:{cookie:mediaVerified.cookie}})
  assert.equal(unsigned.status,200);assert.ok((await pdfPages(new Uint8Array(await unsigned.arrayBuffer()))).join(' ').includes(p.offer.scope))
  const undoRace=await delegationFixture(h);await undoRace.configure(true);const undoOriginal=await delegationVerify(h,undoRace.path)
  assert.equal((await h.send(undoRace.path+'/action?name=delegate',input,undoOriginal.cookie)).status,200)
  const undoRow=await undoRace.get(),undoPath='/p/'+undoRow.shareToken,undoSession=await delegationVerify(h,undoPath)
  const undoResults=await Promise.all([h.send('/api/platter/command',{name:'signer.delegation.undo',input:{id:undoRace.id,version:undoRow.version,delegationId:undoRow.delegation.currentId}},h.owner),h.send(undoPath+'/action?name=accept',{name:'Synthetic COO',optionId:'one',consent:true},undoSession.cookie)])
  assert.equal(undoResults.filter(r=>r.status===200).length,1);assert.ok(undoResults.every(r=>[200,409,410].includes(r.status)))
  await refused('/api/platter/command',{name:'client.erase',input:{id:p.offer.clientId,confirmName:'Synthetic Platter leadership'}},h.owner,409)
  await configuredDelegationHttp(h)
  await templateDelegationHttp(h,member)
  const revoked=await delegationFixture(h);await revoked.configure(true);const revokedSession=await delegationVerify(h,revoked.path)
  const originalOwner=(await h.state()).actor,successorId=(await h.state(member)).actor.id,freshOwner=await h.signIn(h.auth.OWNER_EMAIL)
  assert.equal((await h.send('/auth/operator/role',{operatorId:successorId,role:'owner'},freshOwner)).status,200)
  const successor=await h.signIn(address(9903))
  assert.equal((await h.send('/auth/operator/role',{operatorId:originalOwner.id,role:'admin'},successor)).status,200)
  await refused(revoked.path+'/action?name=delegate',input,revokedSession.cookie,409)
  assert.equal((await h.send('/auth/operator/role',{operatorId:originalOwner.id,role:'owner'},successor)).status,200)
  // Reinstating a person never resurrects an old delegation grant.
  await refused(revoked.path+'/action?name=delegate',input,revokedSession.cookie,409)
  const reinstated=await h.signIn(h.auth.OWNER_EMAIL),reinstatedRow=(await h.state(reinstated)).proposals.find(r=>r.id===revoked.id)
  await h.cmd('signer.delegation.configure',{id:revoked.id,version:reinstatedRow.version,enabled:true},reinstated)
  assert.equal((await h.send(revoked.path+'/action?name=delegate',input,revokedSession.cookie)).status,200)
  console.log('PROBE SIGN-009 scope: verified recipient delegation, new verification, undo and acceptance -> fresh invitations, exact frozen offer and retained certificate facts')
  console.log('PROBE SIGN-009 authority: disabled, unverified, stale, expired, withdrawn, accepted and signing race -> refused without writes or duplicate notice')
 }finally{await h.close()}
}

export async function configuredDelegationHttp(h){
 const {recipientFixture,roles,verifyRecipient,decision}=await import('./recipients-http.mjs')
 const plan=[...roles(h.auth.OWNER_EMAIL),{id:'viewer',name:'Viewer',role:'viewer',group:1,email:address(9910)},{id:'approver',name:'Client approver',role:'approver',group:1,email:address(9911)}]
 const p=await recipientFixture(h,'Synthetic Platter delegated CFO',plan),get=async()=>(await h.state()).proposals.find(r=>r.id===p.id)
 const sessions={};for(const [id,path]of Object.entries(p.links))sessions[id]=await verifyRecipient(h,path)
 const capture=async()=>{const value={};for(const table of ['p_proposals','p_shares','p_recipient_signatures','p_signer_delegations','p_mail','p_audit'])value[table]=(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results;return value}
 const refuse=async(path,data,cookie,status)=>{const before=await capture(),r=await h.send(path,data,cookie);assert.equal(r.status,status,r.text);assert.deepEqual(await capture(),before,'refused configured delegation changes no record or mail')}
 const input={revision:p.revision,delegateName:'Synthetic finance delegate',recipient:address(9912)}
 await refuse(p.links.cfo+'/action?name=delegate',input,sessions.cfo,409)
 await h.cmd('signer.delegation.configure',{id:p.id,version:(await get()).version,enabled:true})
 for(const id of ['viewer','approver','owner'])await refuse(p.links[id]+'/action?name=delegate',input,sessions[id],403)
 for(const recipient of [plan[0].email,h.auth.OWNER_EMAIL,plan[3].email])await refuse(p.links.cfo+'/action?name=delegate',{...input,recipient},sessions.cfo,400)
 const before=await get(),approvals=(await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results
 assert.equal((await h.send(p.links.cfo+'/action?name=delegate',input,sessions.cfo)).status,200)
 let row=await get(),delegate='/p/'+(await h.db.prepare("SELECT token FROM p_shares WHERE proposal_id=? AND slot_id='cfo'").bind(p.id).first()).token
 for(const suffix of ['', '/data.json','/download.pdf','/certificate.json','/certificate.pdf','/agreement.pdf','/attachments/synthetic-platter-1','/media/synthetic-platter-1']){
  assert.equal((await h.send(p.links.cfo+suffix,undefined,sessions.cfo)).status,410)
  const hidden=await h.send(delegate+suffix,undefined,sessions.cfo);assert.equal(hidden.status,suffix===''?200:401,suffix);assert.ok(!hidden.text.includes(p.offer.scope))
 }
 assert.equal((await h.send(p.links.ceo+'/data.json',undefined,sessions.ceo)).status,200,'another signer keeps their invitation')
 const verified=await verifyRecipient(h,delegate)
 await refuse(delegate+'/action?name=accept',{name:'Synthetic finance delegate',optionId:'one',consent:true},verified,409)
 for(const key of ['revision','scope','options','approved_at','approved_by','title','deposit_bps'])assert.deepEqual(row[key],before[key],key+' unchanged')
 assert.deepEqual(JSON.parse(row.recipient_plan).map(r=>[r.id,r.role,r.group]),plan.map(r=>[r.id,r.role,r.group]))
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_approvals WHERE proposal_id=?').bind(p.id).all()).results,approvals)
 assert.equal((await decision(h,p.links.ceo,sessions.ceo)).status,200)
 assert.equal((await decision(h,p.links.approver,sessions.approver,'one','recipient.approve')).status,200)
 await refuse(p.links.ceo+'/action?name=delegate',input,sessions.ceo,409)
 const retained=(await h.db.prepare('SELECT * FROM p_recipient_signatures WHERE proposal_id=? ORDER BY slot_id').bind(p.id).all()).results
 row=await get();const fact=row.delegation.history[0]
 assert.equal(fact.slot_id,'cfo');assert.equal(fact.signing_position,2)
 const undo=await h.cmd('signer.delegation.undo',{id:p.id,version:row.version,delegationId:fact.id}),undone=new URL(undo.shareUrl).pathname
 assert.notEqual(undone,p.links.cfo);assert.notEqual(undone,delegate)
 assert.equal((await h.send(delegate+'/data.json',undefined,verified)).status,410)
 const original=await verifyRecipient(h,undone)
 assert.equal((await h.send(undone+'/action?name=delegate',input,original)).status,200)
 delegate='/p/'+(await h.db.prepare("SELECT token FROM p_shares WHERE proposal_id=? AND slot_id='cfo'").bind(p.id).first()).token
 const fresh=await verifyRecipient(h,delegate)
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_recipient_signatures WHERE proposal_id=? ORDER BY slot_id').bind(p.id).all()).results,retained,'delegation and undo never rewrite another signature')
 assert.equal((await decision(h,delegate,fresh)).status,200)
 row=await get();await h.cmd('signer.delegation.undo',{id:p.id,version:row.version,delegationId:row.delegation.history.find(r=>!r.undone_at).id},h.owner,409)
 assert.equal((await decision(h,p.links.owner,sessions.owner)).status,200)
 const cert=await h.send(delegate+'/certificate.json',undefined,fresh);assert.equal(cert.status,200,cert.text)
 assert.deepEqual(cert.value.signers.map(s=>[s.slotId,s.email]),[['ceo',plan[0].email],['approver',plan[4].email],['cfo',input.recipient],['owner',h.auth.OWNER_EMAIL]])
 assert.equal(cert.value.delegations.length,2);assert.ok(cert.value.delegations.every(d=>d.slot_id==='cfo'&&d.signing_position===2));assert.ok(cert.value.delegations[0].undone_at)
 const mail=(await h.db.prepare("SELECT recipient FROM p_mail WHERE proposal_id=? AND subject LIKE 'Agreement complete:%'").bind(p.id).all()).results
 assert.deepEqual(mail.map(m=>m.recipient).sort(),[plan[0].email,plan[3].email,plan[4].email,input.recipient,h.auth.OWNER_EMAIL].sort())

 // Parallel client slots may both delegate, and undo resolves the selected slot
 // even while another delegated slot remains active or has signed.
 const parallel=await recipientFixture(h,'Synthetic Platter parallel delegation',roles(h.auth.OWNER_EMAIL).map(r=>r.id==='cfo'?{...r,group:1}:r)),parallelGet=async()=>(await h.state()).proposals.find(r=>r.id===parallel.id)
 await h.cmd('signer.delegation.configure',{id:parallel.id,version:(await parallelGet()).version,enabled:true})
 for(const [i,id]of ['ceo','cfo'].entries()){
  const cookie=await verifyRecipient(h,parallel.links[id]);assert.equal((await h.send(parallel.links[id]+'/action?name=delegate',{revision:parallel.revision,recipient:address(9920+i),delegateName:'Synthetic parallel '+id},cookie)).status,200)
 }
 const active=await parallelGet();assert.equal(active.delegation.currentIds.length,2)
 const cfoFact=active.delegation.history.find(f=>f.slot_id==='cfo'),ceoFact=active.delegation.history.find(f=>f.slot_id==='ceo')
 const undoneCfo=await h.cmd('signer.delegation.undo',{id:parallel.id,version:active.version,delegationId:cfoFact.id})
 const ceoShare=await h.db.prepare("SELECT token FROM p_shares WHERE proposal_id=? AND slot_id='ceo'").bind(parallel.id).first(),ceoPath='/p/'+ceoShare.token
 assert.equal((await decision(h,ceoPath,await verifyRecipient(h,ceoPath))).status,200)
 const parallelRow=await parallelGet();await h.cmd('signer.delegation.undo',{id:parallel.id,version:parallelRow.version,delegationId:ceoFact.id},h.owner,409)
 const cfoPath=new URL(undoneCfo.shareUrl).pathname
 assert.equal((await decision(h,cfoPath,await verifyRecipient(h,cfoPath))).status,200)
 assert.equal((await decision(h,parallel.links.owner,await verifyRecipient(h,parallel.links.owner))).status,200)
 for(const action of ['delegate','undo']){
  const race=await recipientFixture(h,'Synthetic configured '+action+' race',roles(h.auth.OWNER_EMAIL)),raceGet=async()=>(await h.state()).proposals.find(r=>r.id===race.id)
  await h.cmd('signer.delegation.configure',{id:race.id,version:(await raceGet()).version,enabled:true})
  const ceo=await verifyRecipient(h,race.links.ceo);assert.equal((await decision(h,race.links.ceo,ceo)).status,200)
  let cfoPath=race.links.cfo,cfo=await verifyRecipient(h,cfoPath),other
  if(action==='undo'){
   assert.equal((await h.send(cfoPath+'/action?name=delegate',{revision:race.revision,recipient:address(9925),delegateName:'Synthetic race delegate'},cfo)).status,200)
   cfoPath='/p/'+(await h.db.prepare("SELECT token FROM p_shares WHERE proposal_id=? AND slot_id='cfo'").bind(race.id).first()).token;cfo=await verifyRecipient(h,cfoPath)
   const row=await raceGet();other=()=>h.send('/api/platter/command',{name:'signer.delegation.undo',input:{id:race.id,version:row.version,delegationId:row.delegation.history[0].id}},h.owner)
  }else other=()=>h.send(cfoPath+'/action?name=delegate',{revision:race.revision,recipient:address(9925),delegateName:'Synthetic race delegate'},cfo)
  const results=await Promise.all([other(),decision(h,cfoPath,cfo)])
  assert.equal(results.filter(r=>r.status===200).length,1,action+' and signing have one winner');assert.ok(results.every(r=>[200,409,410].includes(r.status)))
  const signatures=(await h.db.prepare('SELECT * FROM p_recipient_signatures WHERE proposal_id=?').bind(race.id).all()).results
  assert.equal(signatures.filter(s=>s.slot_id==='ceo').length,1);assert.ok(signatures.length<=2)
  if(signatures.length===1){cfoPath='/p/'+(await h.db.prepare("SELECT token FROM p_shares WHERE proposal_id=? AND slot_id='cfo'").bind(race.id).first()).token;assert.equal((await decision(h,cfoPath,await verifyRecipient(h,cfoPath))).status,200)}
  assert.equal((await decision(h,race.links.owner,await verifyRecipient(h,race.links.owner))).status,200)
 }
 console.log('PROBE SIGN-009 configured roles: verified CFO delegation and undo, signed CEO, parallel delegates and countersignature -> unchanged groups, prices, approvals, other sessions and certificate slot facts')
}

export async function templateDelegationHttp(h,member){
 const client=await h.cmd('client.save',{name:'Synthetic template client',email:address(9930)})
 const source=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic delegation template',scope:'Synthetic template offer',optionOne:'Studio',priceOne:'2500',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
 let template=await h.cmd('template.save',{id:source.id,version:1,name:'Synthetic delegation template'})
 const start=async()=>h.cmd('template.start',{id:template.id,version:template.version,clientId:client.id})
 const off=await start();let get=async id=>(await h.state()).proposals.find(r=>r.id===id)
 assert.equal((await get(off.id)).delegation.enabled,false)
 template=await h.cmd('template.delegation',{id:template.id,version:template.version,enabled:true})
 const copied=await start();assert.equal((await get(copied.id)).deliveryDefaults.delegationEnabled,true)
 assert.equal((await get(copied.id)).delegation.enabled,false,'a template preference carries no execution authority')
 let before=await h.state();await h.cmd('template.delegation',{id:template.id,version:template.version,enabled:false},member,403);assert.deepEqual(await h.state(),before)
 await h.cmd('template.delegation',{id:template.id,version:template.version-1,enabled:false},h.owner,409);assert.deepEqual(await h.state(),before)
 template=await h.cmd('template.delegation',{id:template.id,version:template.version,enabled:false})
 assert.equal((await get(copied.id)).deliveryDefaults.delegationEnabled,true,'later template settings never change an existing draft')
 assert.ok(!(await get(off.id)).deliveryDefaults.delegationEnabled)
 await h.cmd('proposal.approve',{id:copied.id,version:1,revision:1});const sent=await h.cmd('proposal.send',{id:copied.id,version:2}),path=new URL(sent.shareUrl).pathname,cookie=(await delegationVerify(h,path)).cookie
 assert.equal((await h.send(path+'/action?name=delegate',{revision:1,recipient:address(9931),delegateName:'Synthetic delegate'},cookie)).status,409,'the copied preference needs explicit exact-offer consent')
 const enabled=await start();await h.cmd('proposal.approve',{id:enabled.id,version:1,revision:1})
 const enabledSent=await h.cmd('proposal.send',{id:enabled.id,version:2,delegationConsent:true}),enabledPath=new URL(enabledSent.shareUrl).pathname,session=await delegationVerify(h,enabledPath)
 assert.equal((await h.send(enabledPath+'/action?name=delegate',{revision:1,recipient:address(9931),delegateName:'Synthetic delegate'},session.cookie)).status,200)
 const row=await get(enabled.id),duplicate=await h.cmd('proposal.duplicate',{id:row.id,version:row.version,clientId:client.id})
 assert.equal((await get(duplicate.id)).delegation.enabled,false)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_shares WHERE proposal_id=?').bind(duplicate.id).first()).n,0)
 console.log('PROBE SIGN-009 templates: owner changes template setting, starts independent drafts and explicitly consents at send -> copied preference, stale and non-owner refusals, no copied invitation authority')
}
