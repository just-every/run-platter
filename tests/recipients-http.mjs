import assert from 'node:assert/strict'

const address=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
export const roles=owner=>[
 {id:'ceo',name:'CEO',email:address(1001),role:'signer',group:1},
 {id:'cfo',name:'CFO',email:address(1002),role:'signer',group:2},
 {id:'owner',name:'Owner',email:owner,role:'countersigner',group:3},
]
export async function recipientFixture(h,title,recipients){
 const client=(await h.state()).clients.find(c=>c.email===address(1000))??await h.cmd('client.save',{name:'Synthetic Platter',email:address(1000)})
 const offer={clientId:client.id,title,scope:'Exact leadership agreement.',optionOne:'Studio',priceOne:'2500',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
 const p=await h.cmd('proposal.prepare',offer)
 const saved=await h.cmd('recipient.save',{id:p.id,version:1,recipients})
 await h.cmd('proposal.approve',{id:p.id,version:saved.version,revision:saved.revision})
 const sent=await h.cmd('proposal.send',{id:p.id,version:saved.version+1})
 return {...p,...saved,offer,links:Object.fromEntries(sent.recipients.map(r=>[r.id,new URL(r.shareUrl).pathname]))}
}
export async function verifyRecipient(h,path){
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const share=await h.db.prepare('SELECT proposal_id,recipient FROM p_shares WHERE token=?').bind(path.split('/').at(-1)).first()
 const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND recipient=? AND subject='Your Platter verification code' ORDER BY rowid DESC LIMIT 1").bind(share.proposal_id,share.recipient).first()).body.match(/\b\d{6}\b/)[0]
 const r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text)
 return r.cookie
}
export const decision=(h,path,cookie,optionId='one',name='accept',fields={})=>h.send(path+'/action?name='+name,{name:'Synthetic signer',optionId,consent:true,...fields},cookie)
export async function signingOrderHttp(h){
 const sequential=await recipientFixture(h,'Sequential leadership',roles(h.auth.OWNER_EMAIL))
 const cookies=Object.fromEntries(await Promise.all(Object.entries(sequential.links).map(async([id,path])=>[id,await verifyRecipient(h,path)])))
 assert.equal((await decision(h,sequential.links.cfo,cookies.ceo)).status,401,'another recipient session cannot sign')
 assert.equal((await decision(h,sequential.links.cfo,cookies.cfo)).status,409,'CFO waits for CEO')
 assert.equal((await decision(h,sequential.links.owner,cookies.owner)).status,409,'owner waits for client signers')
 assert.equal((await decision(h,sequential.links.ceo,cookies.ceo)).status,200)
 assert.equal((await h.state()).proposals.find(r=>r.id===sequential.id).status,'sent')
 assert.equal((await decision(h,sequential.links.cfo,cookies.cfo,'two')).status,409,'different package refused')
 assert.equal((await decision(h,sequential.links.cfo,cookies.cfo)).status,200)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_acceptances WHERE proposal_id=?').bind(sequential.id).first()).n,0,'two client signatures do not complete without countersignature')
 assert.equal((await decision(h,sequential.links.owner,cookies.owner)).status,200)
 assert.equal((await h.state()).proposals.find(r=>r.id===sequential.id).status,'accepted')
 const mail=(await h.db.prepare("SELECT recipient FROM p_mail WHERE proposal_id=? AND subject LIKE 'Agreement complete:%'").bind(sequential.id).all()).results
 assert.deepEqual(mail.map(r=>r.recipient).sort(),roles(h.auth.OWNER_EMAIL).map(r=>r.email).sort())
 assert.equal((await decision(h,sequential.links.owner,cookies.owner)).status,200)
 assert.equal((await h.db.prepare("SELECT count(*) n FROM p_mail WHERE proposal_id=? AND subject LIKE 'Agreement complete:%'").bind(sequential.id).first()).n,3,'replay cannot repeat completion')
 const accepted=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(sequential.id).first()
 assert.deepEqual(JSON.parse(accepted.snapshot).signatures.map(s=>s.slotId),['ceo','cfo','owner'])
 for(const first of ['ceo','cfo']){
  const plan=roles(h.auth.OWNER_EMAIL).map(r=>r.id==='cfo'?{...r,group:1}:r)
  const p=await recipientFixture(h,'Parallel leadership '+first,plan),second=first==='ceo'?'cfo':'ceo',sessions={}
  for(const [id,path] of Object.entries(p.links))sessions[id]=await verifyRecipient(h,path)
  assert.equal((await decision(h,p.links[first],sessions[first])).status,200)
  assert.equal((await decision(h,p.links.owner,sessions.owner)).status,409)
  assert.equal((await decision(h,p.links[second],sessions[second])).status,200)
  assert.equal((await h.state()).proposals.find(r=>r.id===p.id).status,'sent')
  assert.equal((await decision(h,p.links.owner,sessions.owner)).status,200)
  assert.equal((await h.state()).proposals.find(r=>r.id===p.id).status,'accepted')
 }
}
export async function recipientRolesHttp(h){
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)

 const plan=[roles(h.auth.OWNER_EMAIL)[0],{id:'finance',name:'CFO approver',email:address(1003),role:'approver',group:1},{id:'viewer',name:'Viewer',email:address(1004),role:'viewer',group:1},{id:'cc',name:'CC',email:address(1005),role:'cc',group:1}]
 const p=await recipientFixture(h,'Recipient roles',plan),sessions={}
 assert.equal(new Set(Object.values(p.links)).size,4)
 for(const [id,path] of Object.entries(p.links)){
  const invitation=await h.send(path);assert.equal(invitation.status,200);assert.ok(!invitation.text.includes(p.offer.title))
  assert.equal((await h.send(path+'/data.json')).status,401)
  sessions[id]=await verifyRecipient(h,path)
  assert.equal((await h.send(path+'/data.json',undefined,sessions[id])).status,200)
 }
 const shareRow=(await h.state()).proposals.find(r=>r.id===p.id),mailBefore=(await h.db.prepare('SELECT count(*) n FROM p_mail').first()).n
 await h.cmd('recipient.share',{id:p.id,version:shareRow.version,recipientName:'Shared viewer',recipientEmail:address(1006),embedOrigin:h.origin},h.owner,400)
 const shared=await h.cmd('recipient.share',{id:p.id,version:shareRow.version,recipientName:'Shared viewer',recipientEmail:address(1006),embedOrigin:h.origin,shareConsent:true})
 const sharedPath=new URL(shared.shareUrl).pathname
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_mail').first()).n,mailBefore,'sharing does not send an automatic invitation')
 const embedded=await h.send(sharedPath+'?embed=1');assert.equal(embedded.status,200);assert.ok(embedded.headers.get('content-security-policy').includes('frame-ancestors '+h.origin));assert.ok(!embedded.text.includes(p.offer.title))
 for(const suffix of ['/data.json','/attachments/synthetic-platter-1','/media/synthetic-platter-1'])assert.equal((await h.send(sharedPath+suffix)).status,401)
 const sharedCookie=await verifyRecipient(h,sharedPath)
 assert.ok((await h.send(sharedPath+'?embed=1',undefined,sharedCookie)).text.includes(p.offer.title))
 assert.equal((await decision(h,sharedPath,sharedCookie)).status,403)
 const sharedState=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('recipient.remove',{id:p.id,version:sharedState.version,recipientId:shared.recipientId})
 assert.equal((await h.send(sharedPath+'?embed=1',undefined,sharedCookie)).status,410)
 for(const id of ['viewer','cc','finance'])assert.equal((await decision(h,p.links[id],sessions[id])).status,403,id+' cannot sign')
 assert.equal((await decision(h,p.links.ceo,sessions.ceo,'one','recipient.approve')).status,403)
 assert.equal((await decision(h,p.links.finance,sessions.finance,'one','recipient.approve')).status,200)
 const before=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('recipient.remove',{id:p.id,version:before.version,recipientId:'ceo'},h.owner,409)
 await h.cmd('recipient.remove',{id:p.id,version:before.version,recipientId:'viewer'})
 for(const door of ['', '/data.json','/download.pdf?optionId=one','/action?name=accept','/payment.json','/media/synthetic-platter-1']){
  const r=await h.send(p.links.viewer+door,door.includes('/action')||door==='/payment.json'?{}:undefined,sessions.viewer)
  assert.equal(r.status,410,door);assert.ok(!r.text.includes(p.offer.title))
 }
 assert.equal((await h.send(p.links.ceo+'/data.json',undefined,sessions.ceo)).status,200)
 assert.equal((await decision(h,p.links.ceo,sessions.ceo)).status,200)
 const source=await h.cmd('proposal.prepare',{...p.offer,title:'Role slot source'})
 const configured=await h.cmd('recipient.save',{id:source.id,version:1,recipients:roles(h.auth.OWNER_EMAIL)})
 const document={version:1,blocks:[
  {id:'ceo-detail',type:'field',title:'CEO purchase order',text:'',recipientRole:'slot',recipientId:'ceo',fieldKind:'text',required:true},
  {id:'cfo-detail',type:'field',title:'CFO reference',text:'',recipientRole:'slot',recipientId:'cfo',fieldKind:'text',required:true},
 ]}
 const fieldRevision=await h.cmd('proposal.document',{id:source.id,version:configured.version,document})
 const template=await h.cmd('template.save',{id:source.id,version:fieldRevision.version,name:'Leadership roles'})
 const started=await h.cmd('template.start',{id:template.id,version:template.version,clientId:p.offer.clientId})
 let row=(await h.state()).proposals.find(r=>r.id===started.id)
 const copied=JSON.parse(row.recipient_plan)
 assert.deepEqual(copied.map(r=>[r.id,r.group,r.email]),[['ceo',1,null],['cfo',2,null],['owner',3,null]])
 await h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision})
 row=(await h.state()).proposals.find(r=>r.id===started.id)
 await h.cmd('proposal.send',{id:row.id,version:row.version},h.owner,409)
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_shares WHERE proposal_id=?').bind(row.id).first()).n,0)
 const beforePreview=await h.state()
 for(const [id,own,other] of [['ceo','CEO purchase order','CFO reference'],['cfo','CFO reference','CEO purchase order']]){
  const preview=await h.send('/app/preview/client?id='+row.id+'&revision='+row.revision+'&recipientId='+id,undefined,h.owner)
  assert.equal(preview.status,200,preview.text);assert.ok(preview.text.includes(own));assert.ok(!preview.text.includes(other))
  assert.match(preview.text,/fieldset disabled/)
  assert.equal((await h.send('/app/preview/client/action?id='+row.id+'&revision='+row.revision+'&recipientId='+id,{},h.owner)).status,403)
 }
 assert.deepEqual(await h.state(),beforePreview,'recipient previews create no revision, decision, invitation, mail or tracking')
 // Saving a template again changes only future drafts, never the started role snapshot.
 await h.cmd('recipient.save',{id:source.id,version:fieldRevision.version,recipients:roles(h.auth.OWNER_EMAIL).map(r=>r.id==='cfo'?{...r,group:1}:r)})
 assert.deepEqual(JSON.parse((await h.state()).proposals.find(r=>r.id===started.id).recipient_plan),copied)
 const filled=await h.cmd('recipient.save',{id:row.id,version:row.version,recipients:roles(h.auth.OWNER_EMAIL)})
 await h.cmd('proposal.approve',{id:row.id,version:filled.version,revision:filled.revision})
 const invitations=await h.cmd('proposal.send',{id:row.id,version:filled.version+1})
 const paths=Object.fromEntries(invitations.recipients.map(r=>[r.id,new URL(r.shareUrl).pathname])),verified={}
 for(const [id,path] of Object.entries(paths))verified[id]=await verifyRecipient(h,path)
 assert.equal((await decision(h,paths.ceo,verified.ceo)).status,400,'missing required own field refuses signing')
 assert.equal((await decision(h,paths.ceo,verified.ceo,'one','accept',{'field:ceo-detail':'synthetic-platter-2001','field:cfo-detail':'forged'})).status,400,'a signer cannot fill another slot')
 assert.equal((await decision(h,paths.ceo,verified.ceo,'one','accept',{'field:ceo-detail':'synthetic-platter-2001'})).status,200)
 assert.equal((await decision(h,paths.cfo,verified.cfo)).status,400)
 assert.equal((await decision(h,paths.cfo,verified.cfo,'one','accept',{'field:cfo-detail':'synthetic-platter-2002'})).status,200)
 assert.equal((await decision(h,paths.owner,verified.owner)).status,200)
 const agreement=(await h.send(paths.ceo+'/data.json',undefined,verified.ceo)).value
 assert.deepEqual(agreement.acceptance.fieldValues,{'ceo-detail':'synthetic-platter-2001','cfo-detail':'synthetic-platter-2002'})
}
export async function recipientWithdrawalHttp(h){
 const p=await recipientFixture(h,'Partly signed withdrawal',[...roles(h.auth.OWNER_EMAIL),{id:'viewer',name:'Viewer',email:address(1004),role:'viewer',group:1}])
 const sharingRow=(await h.state()).proposals.find(r=>r.id===p.id)
 const shared=await h.cmd('recipient.share',{id:p.id,version:sharingRow.version,recipientName:'Shared viewer',recipientEmail:address(1006),embedOrigin:h.origin,shareConsent:true})
 p.links.shared=new URL(shared.shareUrl).pathname
 const cookie=await verifyRecipient(h,p.links.ceo)
 assert.equal((await decision(h,p.links.ceo,cookie)).status,200)
 const before=(await h.db.prepare('SELECT * FROM p_recipient_signatures WHERE proposal_id=?').bind(p.id).all()).results
 const row=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('proposal.withdraw',{id:p.id,version:row.version,reason:'Offer withdrawn',notice:true})
 const mail=(await h.db.prepare("SELECT recipient FROM p_mail WHERE proposal_id=? AND subject LIKE 'Proposal withdrawn:%'").bind(p.id).all()).results
 assert.deepEqual(mail.map(r=>r.recipient).sort(),[...roles(h.auth.OWNER_EMAIL).map(r=>r.email),address(1004),address(1006)].sort())
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_recipient_signatures WHERE proposal_id=?').bind(p.id).all()).results,before)
 assert.ok((await h.db.prepare('SELECT voided_at FROM p_void_signatures WHERE proposal_id=? AND revision=?').bind(p.id,p.revision).first()).voided_at)
 for(const path of Object.values(p.links))for(const door of ['', '/data.json','/download.pdf?optionId=one','/agreement.pdf','/certificate.json','/certificate.pdf','/payment.json','/payment-status.json','/payment-consent.json','/action?name=accept','/action?name=code.request','/action?name=code.verify','/attachments/synthetic-platter-1','/media/synthetic-platter-1']){
  const r=await h.send(path+door,door.includes('/action')||door.includes('/payment')?{code:'123456',consent:true,optionId:'one',name:'Signer'}:undefined,cookie)
  assert.equal(r.status,410,door);for(const content of [p.offer.title,p.offer.scope,p.offer.optionOne,'2500'])assert.ok(!r.text.includes(content),door+' leaks no proposal')
 }
 assert.equal((await h.db.prepare('SELECT count(*) n FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).n,0)
}
export async function recipientExpiryHttp(h){
 const worker=await h.mf.getWorker(),fire=async at=>worker.scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
 await fire('2035-03-01T15:00:00Z')
 const p=await recipientFixture(h,'Multi signer expiry',roles(h.auth.OWNER_EMAIL))
 const sessions={};for(const [id,path] of Object.entries(p.links))sessions[id]=await verifyRecipient(h,path)
 assert.equal((await decision(h,p.links.ceo,sessions.ceo)).status,200)
 let row=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('expiry.set',{id:p.id,version:row.version,mode:'days',days:14,warningDays:1})
 await fire('2035-03-14T15:00:00Z');await fire('2035-03-14T15:00:00Z')
 const mail=(await h.db.prepare("SELECT recipient,body FROM p_mail WHERE proposal_id=? AND subject LIKE 'Expiry warning:%'").bind(p.id).all()).results
 assert.deepEqual(mail.map(r=>r.recipient).sort(),[address(1002),h.auth.OWNER_EMAIL].sort())
 for(const m of mail){const id=m.recipient===address(1002)?'cfo':'owner';assert.ok(m.body.includes(p.links[id]));assert.ok(!m.body.includes(p.links.ceo))}
 await fire('2035-03-15T15:00:00Z')
 for(const [id,path] of Object.entries(p.links))sessions[id]=await verifyRecipient(h,path)
 for(const [id,path] of Object.entries(p.links))assert.match((await h.send(path,undefined,sessions[id])).text,/This proposal has expired/)
 row=(await h.state()).proposals.find(r=>r.id===p.id)
 await h.cmd('expiry.set',{id:p.id,version:row.version,mode:'date',date:'2035-03-22',warningDays:1})
 for(const [id,path] of Object.entries(p.links)){const r=await h.send(path,undefined,sessions[id]);assert.equal(r.status,200);assert.ok(!r.text.includes('This proposal has expired'))}
}
