import { PDFDocument } from 'pdf-lib'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export const privacyOffer = {title:'Synthetic privacy offer',scope:'synthetic-platter-private-scope',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
export async function privacyFixture(h, edge) {
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const upload=async(fields,name,bytes,type)=>{const data=new FormData();for(const [k,v] of Object.entries(fields))data.set(k,String(v));data.set('file',new File([bytes],name,{type}));const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:data});const response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});const body=await response.text();assert.equal(response.status,200,body);assert.match(body,/Document saved/)}
 const pdf=await PDFDocument.create();pdf.addPage().drawText('Synthetic retained original');const retainedFile=Buffer.from(await pdf.save())
 await upload({kind:'w9'},'synthetic-platter-retained.pdf',retainedFile,'application/pdf')
 await h.cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-4607',consent:true})
 const review=await h.cmd('crm.deal.review',edge.selected)
 const first=await h.cmd('crm.deal.apply',{id:review.id,digest:review.digest,consent:'yes'})
 const initial=await h.state(),client=initial.clients.find(c=>c.id===initial.proposals.find(p=>p.id===first.id).client_id)
 const second=await h.cmd('proposal.prepare',{...privacyOffer,clientId:client.id})
 const retained=await h.cmd('proposal.prepare',{...privacyOffer,title:'Synthetic retained agreement',clientId:client.id})
 await upload({id:second.id,version:1},'synthetic-platter-private.txt',Buffer.from('synthetic-platter-private-file'),'text/plain')
 const invites=[]
 for(const proposal of [first,second,retained]){
  const current=(await h.state()).proposals.find(p=>p.id===proposal.id)
  await h.cmd('proposal.approve',{id:proposal.id,version:current.version,revision:current.revision})
  const sent=await h.cmd('proposal.send',{id:proposal.id,version:current.version+1}),path=new URL(sent.shareUrl).pathname
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=(await h.state()).outbox.find(m=>m.proposal_id===proposal.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
  const response=await h.send(path+'/action?name=code.verify',{code});assert.equal(response.status,200,response.text)
  invites.push({id:proposal.id,path,cookie:response.cookie,revision:current.revision,version:current.version+2})
 }
 const signed=invites[2]
 assert.equal((await h.send(signed.path+'/action?name=accept',{name:'Synthetic retained signer',optionId:'one',consent:true},signed.cookie)).status,200)
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'yes',retentionDays:90,quietMinutes:30,consent:'yes'})
 for(const invite of invites.slice(0,2)){
  const viewed=await h.send(invite.path,undefined,invite.cookie);assert.equal(viewed.status,200)
  const question=await h.send(invite.path+'/action?name=question.create',{revision:invite.revision,section:'scope',text:'synthetic-platter-private-question'},invite.cookie);assert.equal(question.status,200,question.text)
  const q=(await h.state()).proposals.find(p=>p.id===invite.id).questions[0]
  await h.cmd('question.answer',{id:invite.id,questionId:q.id,text:'synthetic-platter-private-answer'})
  await h.cmd('collaboration.comment',{id:invite.id,version:invite.version,revision:invite.revision,blockId:'scope',text:'synthetic-platter-private-discussion'})
 }
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_attachment_files').first()).n,2,'both real originals exist before erasure')
 const artifacts={}
 for(const kind of ['agreement.pdf','certificate.pdf','certificate.json']){
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/'+kind+'?id='+signed.id,{headers:{cookie:h.owner}});assert.equal(response.status,200)
  artifacts[kind]=Buffer.from(await response.arrayBuffer())
 }
 return {client,first,second,retained,invites,artifacts,retainedFile,sourceReview:review}
}
export async function privacyInventory(h) {
 const tables=['p_clients','p_proposals','p_revisions','p_acceptances','p_questions','p_question_answers','p_internal_threads','p_views','p_tracking_alerts','p_tracking_reading','p_tracking_choices','p_tracking_attachment_opens','p_tracking_stakeholders','p_shares','p_mail','p_crm_draft_sources','p_crm_draft_reviews','p_privacy_receipts','p_erased_clients','rer_portability_state']
 const result={}
 for(const table of tables) result[table]=(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results
 return result
}
export async function assertPrivacyErased(h,fixture,receipt) {
 const state=await h.state(),client=state.clients.find(c=>c.id===fixture.client.id)
 assert.equal(client.name,'Erased contact');assert.equal(client.variable_fields,'{}');assert.notEqual(client.email,fixture.client.email)
 assert.deepEqual(state.proposals.map(p=>p.id),[fixture.retained.id])
 assert.equal(state.tracking.views.length,0);assert.equal(state.tracking.alerts.length,0)
 for(const table of ['p_questions','p_question_answers','p_internal_threads','p_mail','p_shares','p_crm_draft_reviews','p_tracking_reading','p_tracking_choices','p_tracking_attachment_opens'])assert.equal((await h.db.prepare('SELECT count(*) AS n FROM '+table).first()).n,0,table+' is erased independently of the receipt counts')
 const files=(await h.db.prepare('SELECT * FROM p_attachment_files').all()).results
 assert.deepEqual(files.map(f=>f.sha256),[digest(fixture.retainedFile)],'only the retained original file survives')
 const retained=(await h.state()).proposals.find(p=>p.id===fixture.retained.id),file=retained.attachments[0]
 const download=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+fixture.retained.id+'/'+file.id,{headers:{cookie:h.owner}});assert.equal(download.status,200);assert.equal(digest(Buffer.from(await download.arrayBuffer())),digest(fixture.retainedFile))
 assert.deepEqual(new Set(receipt.erasedProposalIds),new Set([fixture.first.id,fixture.second.id]));assert.equal(receipt.retained.length,1)
 assert.equal(receipt.retained[0].proposalId,fixture.retained.id);assert.match(receipt.retained[0].exception,/business records/)
 assert.deepEqual(receipt.externalRecords.map(r=>[r.provider,r.accountId,r.kind,r.recordId]),[['hubspot','synthetic-platter-portal','contact','synthetic-platter-4601']])
 assert.match(receipt.externalRecords[0].action,/operator|Review and erase/)
 for(const [kind,before] of Object.entries(fixture.artifacts)){
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/'+kind+'?id='+fixture.retained.id,{headers:{cookie:h.owner}});assert.equal(response.status,200)
  assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(before),'retained artifact bytes: '+kind)
 }
 for(const invite of fixture.invites){
  for(const suffix of ['','/data.json','/agreement.pdf'])assert.equal((await h.send(invite.path+suffix,undefined,invite.cookie)).status,404,'erased invitation cannot expose '+suffix)
  assert.equal((await h.send(invite.path+'/action?name=accept',{name:'Replay',optionId:'one',consent:true},invite.cookie)).status,404)
 }
 return state
}
