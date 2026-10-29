import assert from 'node:assert/strict'
import { pdfPages } from './pdf-document.mjs'

export const regionalTerms = 'West delivery timeline: planning Monday, delivery Friday.'
export const regionalScope = 'Every client receives the studio photographs and usage licence.'
export const regionalFields = {
 title:'Regional studio agreement',scope:regionalScope,terms:regionalTerms,
 optionOne:'Standard',priceOne:'2400',optionTwo:'Premium',priceTwo:'4200',depositPercent:'25',
 sectionConditions:{terms:'variable:Custom.Region=West'},
}
const showsRegion = (text,region) => {
 assert.equal(text.includes(regionalTerms),region==='West','Only the filled West value shows the conditional timeline')
 assert.ok(text.includes(regionalScope),'Unconditional scope remains visible')
}
async function download(h,path,cookie){
 const response=await h.mf.dispatchFetch(h.origin+path,{headers:{cookie}})
 assert.equal(response.status,200)
 return new Uint8Array(await response.arrayBuffer())
}
async function pdfText(bytes){return (await pdfPages(bytes)).join(' ')}

// Independent, nonempty local values exercise the same condition through public doors.
export async function regionalConditions(h,member=h.owner){
 const records=[]
 for(const [index,region] of ['West','East'].entries()){
  const client=await h.cmd('client.save',{name:region+' studio client',email:['synthetic-platter-'+(9200+index),'example.test'].join('@'),variableFields:{custom:{Region:region}}})
  const p=await h.cmd('proposal.prepare',{...regionalFields,clientId:client.id})
  if(member!==h.owner){
   const people=(await h.state()).teamPeople,person=people.find(p=>p.email===['synthetic-platter-9202','example.test'].join('@'))
   await h.cmd('proposal.share',{id:p.id,operatorId:person.id,shared:true})
  }
  const prepared=(await h.state()).proposals.find(row=>row.id===p.id)
  assert.equal(prepared.document.merge.values['Custom.Region'],region)
  for(const optionId of ['one','two']){
   const preview=await h.send(`/app/preview/client?id=${p.id}&revision=1&optionId=${optionId}`,undefined,member)
   assert.equal(preview.status,200,preview.text);showsRegion(preview.text,region)
  }
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
  const path=new URL((await h.cmd('proposal.send',{id:p.id,version:2})).shareUrl).pathname
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const mail=(await h.state()).outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code'))
  const verified=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
  assert.equal(verified.status,200);const cookie=verified.cookie
  const readSent=async()=>{
   const page=await h.send(path+'?optionId=two',undefined,cookie);assert.equal(page.status,200);showsRegion(page.text,region)
   const data=await h.send(path+'/data.json',undefined,cookie);assert.equal(data.status,200)
   assert.equal(data.value.terms,region==='West'?regionalTerms:'');assert.equal(data.value.scope,regionalScope)
   const text=await pdfText(await download(h,path+'/download.pdf?optionId=two',cookie));showsRegion(text,region)
   return {terms:data.value.terms,scope:data.value.scope,text}
  }
  const sent=await readSent(),draft=await h.cmd('proposal.duplicate',{id:p.id,version:3,clientId:client.id}),opposite=region==='West'?'East':'West'
  await h.cmd('proposal.variables',{id:draft.id,version:1,values:{'Custom.Region':opposite}})
  const draftPreview=await h.send(`/app/preview/client?id=${draft.id}&revision=2&optionId=two`,undefined,h.owner)
  assert.equal(draftPreview.status,200);showsRegion(draftPreview.text,opposite)
  await h.cmd('proposal.variables',{id:p.id,version:3,values:{'Custom.Region':opposite}},h.owner,409)
  assert.deepEqual(await readSent(),sent,'A later draft variable edit cannot rewrite the sent offer')
  const accepted=await h.send(path+'/action?name=accept',{optionId:'two',name:'Synthetic regional signer',consent:true},cookie)
  assert.equal(accepted.status,200,accepted.text);showsRegion(accepted.text,region)
  const snapshot=(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot
  const agreement=JSON.parse(snapshot)
  assert.equal(agreement.terms,region==='West'?regionalTerms:'');assert.equal(agreement.scope,regionalScope)
  assert.equal(Object.hasOwn(agreement,'section_conditions'),false)
  const signed=await download(h,path+'/agreement.pdf',cookie);showsRegion(await pdfText(signed),region)
  await h.cmd('proposal.variables',{id:draft.id,version:2,values:{'Custom.Region':region}})
  const edited=await h.send(`/app/preview/client?id=${draft.id}&revision=3&optionId=two`,undefined,h.owner)
  assert.equal(edited.status,200);showsRegion(edited.text,region)
  const version=(await h.state()).proposals.find(row=>row.id===p.id).version
  await h.cmd('proposal.variables',{id:p.id,version,values:{'Custom.Region':opposite}},h.owner,409)
  assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot,snapshot)
  assert.deepEqual(await download(h,path+'/agreement.pdf',cookie),signed,'Later draft variables leave signed bytes unchanged')
  const completed=await h.send(path+'?optionId=one',undefined,cookie);assert.equal(completed.status,200);showsRegion(completed.text,region)
  records.push({id:p.id,draftId:draft.id,region,path,cookie,snapshot,signed})
 }
 return records
}

export async function restoredRegionalConditions(h,owner,records){
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
 assert.equal(setup.status,303)
 for(const record of records){
  const {id,draftId,region,path,cookie,snapshot,signed}=record
  assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(id).first()).snapshot,snapshot,'Conditional agreement restores exactly')
  const document=await download(h,'/api/platter/agreement.pdf?id='+id,owner)
  assert.deepEqual(document,signed,'Conditional signed PDF restores byte for byte');showsRegion(await pdfText(document),region)
  const preview=await h.send(`/app/preview/client?id=${draftId}&revision=3&optionId=two`,undefined,owner)
  assert.equal(preview.status,200);showsRegion(preview.text,region)
  for(const suffix of ['', '/data.json','/agreement.pdf','/action?name=accept']){
   const result=await h.send(path+suffix,suffix.includes('action')?{optionId:'two',name:'Synthetic replay',consent:true}:undefined,cookie)
   assert.equal(result.status,404,'Restore retains content without restoring client authority')
  }
  assert.equal((await h.send('/api/platter/agreement.pdf?id='+id)).status,401)
  assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(id).first()).snapshot,snapshot,'Refused replay cannot rewrite the agreement')
 }
}
