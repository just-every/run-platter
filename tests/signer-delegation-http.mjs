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
 const token=path.split('/').at(-1),s=await h.db.prepare('SELECT * FROM p_shares WHERE token=?').bind(token).first()
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
