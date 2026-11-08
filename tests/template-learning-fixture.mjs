import assert from 'node:assert/strict'

const address=n=>['synthetic-platter-'+n,'example.test'].join(String.fromCharCode(64))
const packages=n=>Array.from({length:n},(_,i)=>({id:['one','two','three'][i],label:['Essentials','Campaign','Partnership'][i],price:String([1000,2000,3000][i])}))
export async function learningFixture(h,{size=200,shared=false}={}){
 const client=await h.cmd('client.save',{name:'Synthetic learning client',email:address(16300)})
 const fields={clientId:client.id,title:'Synthetic package study',scope:'Reviewed studio services',depositPercent:'25',packages:packages(2)}
 const seed=await h.cmd('proposal.prepare',fields),template=await h.cmd('template.save',{id:seed.id,version:1,name:'Synthetic package template',shared,shareConsent:shared})
 const ids=[],signed=[],overrides=[]
 const decide=async(p,win,signature)=>{
  const row=await h.db.prepare('SELECT version,revision FROM p_proposals WHERE id=?').bind(p.id).first()
  await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:row.revision})
  const path=new URL((await h.cmd('proposal.send',{id:p.id,version:row.version+1})).shareUrl).pathname
  if(signature){
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
   const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC LIMIT 1").bind(p.id).first()
   const verified=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]});assert.equal(verified.status,200,verified.text)
   const accepted=await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'two',consent:true},verified.cookie);assert.equal(accepted.status,200,accepted.text);signed.push(p.id)
  }else{await h.cmd(win?'proposal.win':'proposal.lose',{id:p.id,version:row.version+2,reason:'Synthetic recorded decision',notice:false});if(win)overrides.push(p.id)}
 }
 for(let cohort=0;cohort<2;cohort++){
  if(cohort)await h.cmd('template.save',{id:(await h.cmd('proposal.prepare',{...fields,packages:packages(3)})).id,version:1,templateId:template.id,templateVersion:1,name:'Synthetic package template'})
  const count=size/2
  for(let i=0;i<count;i++){
   const p=await h.cmd('template.start',{id:template.id,version:cohort+1,clientId:client.id,title:'Synthetic study '+cohort+' '+i});ids.push(p.id)
   if(i===0){
    // Both older revisions offer the opposite count. Only revision three is decided.
    await h.cmd('proposal.revise',{...fields,id:p.id,version:1,packages:packages(cohort?2:3)})
    await h.cmd('proposal.revise',{...fields,id:p.id,version:2,packages:packages(cohort?3:2)})
   }
   const wins=cohort?Math.round(count*.7):Math.round(count*.3),signedCount=cohort?Math.round(count*.5):Math.round(count*.2)
   await decide(p,i<wins,i<signedCount)
  }
 }
 const input={baseline:{templateId:template.id,version:1,packageCount:2},comparison:{templateId:template.id,version:2,packageCount:3}}
 const undecided=await h.cmd('template.start',{id:template.id,version:2,clientId:client.id})
 const single=await h.cmd('template.start',{id:template.id,version:2,clientId:client.id});await h.cmd('proposal.revise',{...fields,id:single.id,version:1,packages:packages(1)});await decide(single,true,false)
 // An unrelated version with a win must not enter either selected denominator.
 const third=await h.cmd('template.save',{id:seed.id,version:1,templateId:template.id,templateVersion:2,name:'Synthetic current version'})
 const unrelated=await h.cmd('template.start',{id:template.id,version:third.version,clientId:client.id});await decide(unrelated,true,false)
 // A different template with the same version and package count is not selected.
 const otherTemplate=await h.cmd('template.save',{id:seed.id,version:1,name:'Synthetic unrelated template'})
 const foreign=await h.cmd('template.start',{id:otherTemplate.id,version:1,clientId:client.id});await decide(foreign,true,false)
 // A legacy copy of one decision must not count as a second decided proposal.
 const lost=await h.db.prepare("SELECT * FROM p_outcome_records WHERE kind='lost' ORDER BY proposal_id LIMIT 1").first()
 await h.db.prepare('INSERT INTO p_outcomes VALUES(?,?,?,?,?,?,?,?)').bind(lost.proposal_id,lost.revision,lost.kind,lost.actor_id,lost.actor_role,lost.actor_email,lost.occurred_at,lost.reason).run()
 return {input,ids,signed,overrides,undecided:undecided.id,unrelated:unrelated.id,foreign:foreign.id,single:single.id,clientId:client.id,templateId:template.id}
}
export async function learningBusiness(h){
 const tables=['p_personal_templates','p_proposals','p_revisions','p_approvals','p_approval_decisions','p_priced_catalog','p_acceptances']
 return Object.fromEntries(await Promise.all(tables.map(async table=>[table,(await h.db.prepare('SELECT * FROM '+table).all()).results.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])))
}
export async function captureStudy(h,input,cookie=h.owner){
 const response=await h.send('/api/platter/template-learning',input,cookie);assert.equal(response.status,200,response.text);return response.value
}
