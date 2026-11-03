import assert from 'node:assert/strict'

export const originalLegal = 'Payment is due within thirty days of delivery.'
export const changedLegal = 'Payment is due within sixty days of delivery.'
export const reevaluationPackages = () => [
 {id:'fixed',label:'Larger base',price:'1200.00',optionalItems:[
  {id:'fixed-extra',label:'Fixed quantity',unitPrice:'10.02',min:1,max:20,quantity:3,editable:false},
 ]},
 {id:'flex',label:'Maximum quantity package',price:'1000.01',discountPercent:'10',optionalItems:[
  {id:'flex-extra',label:'Variable quantity',unitPrice:'100.03',min:1,max:3,quantity:1,editable:true},
  {id:'fixed-cent',label:'Fixed cents',unitPrice:'0.01',min:1,max:10,quantity:2,editable:false},
 ]},
]

const prefix='synthetic-platter-approval-'
export const reevaluationRuleIds={usd:prefix+'usd-below',aud:prefix+'aud-below',a:prefix+'legal-a',z:prefix+'legal-z'}
export const reevaluationProjection = (state, fixture) => ({
 settings:state.approvalSettings,
 proposals:[fixture.usd,fixture.aud].map(id=>{
  const {revision,version,currency,status,options,terms,approval}=state.proposals.find(p=>p.id===id)
  return {id,revision,version,currency,status,options,terms,approval}
 }),
 revisions:state.revisions.filter(r=>[fixture.usd,fixture.aud].includes(r.proposal_id)),
})

// Public commands supply every rule, edit, decision and refusal. The sole storage
// fixture below provisions a historical AUD draft, since new proposals use USD.
export async function approvalReevaluation(h) {
 const current=async id=>(await h.state()).proposals.find(p=>p.id===id)
 const settings=async()=>(await h.state()).approvalSettings
 const save=async input=>h.cmd('approval.rule',{version:(await settings()).policy.version,...input})
 const client=await h.cmd('client.save',{name:'Synthetic approval client',email:'synthetic-platter-110'+String.fromCharCode(64)+'example.test'})
 const input={clientId:client.id,title:'Independent approval maximum',scope:'Deliver the agreed scope.',terms:originalLegal,depositPercent:'25',packages:reevaluationPackages()}
 const usd=(await h.cmd('proposal.prepare',input)).id
 const seed=(await h.cmd('proposal.prepare',{...input,title:'Historical approval currency',packages:undefined,optionOne:'First',priceOne:'1200',optionTwo:'Second',priceTwo:'1300.12'})).id
 const aud=crypto.randomUUID()
 const columns=(await h.db.prepare('PRAGMA table_info(p_proposals)').all()).results.map(r=>r.name)
 await h.db.batch([
  h.db.prepare('INSERT INTO p_proposals ('+columns.join(',')+') SELECT '+columns.map(c=>c==='id'?'?':c==='currency'?"'AUD'":c).join(',')+' FROM p_proposals WHERE id=?').bind(aud,seed),
  h.db.prepare("INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) SELECT ?,revision,json_set(snapshot,'$.id',?,'$.currency','AUD'),prepared_by,prepared_at,'AUD' FROM p_revisions WHERE proposal_id=?").bind(aud,aud,seed),
 ])
 const initial=(await h.state()).revisions.filter(r=>[usd,aud].includes(r.proposal_id))
 const expectedRules=[]
 // Hand calculation, independent of the evaluator: fixed = 120000 + 1002*3
 // = 123006; flex = 100001 + 10003*3 + 1*2 = 130012 gross cents.
 // The larger base and current quantities both give a different maximum.
 for(const currency of ['USD','AUD'])for(const [boundary,cents] of [['below',130011],['equal',130012],['above',130013]]){
  const rule={id:prefix+currency.toLowerCase()+'-'+boundary,name:currency+' maximum '+boundary,position:30,condition:{kind:'totalOver',cents,currency},approvers:['role:owner'],templates:[]}
  await save(rule);expectedRules.push(rule)
 }
 let row=await current(usd)
 assert.equal(row.currency,'USD')
 assert.deepEqual(row.options.map(o=>o.cents),[120000,90001])
 assert.deepEqual(row.options[1].optionalItems.map(i=>[i.unitCents,i.quantity,i.max,i.editable]),[[10003,1,3,true],[1,2,10,false]])
 assert.deepEqual(row.approval.steps.map(s=>s.id),[reevaluationRuleIds.usd],'only the strict USD boundary below the independently calculated maximum applies')
 assert.deepEqual((await current(aud)).approval.steps.map(s=>s.id),[reevaluationRuleIds.aud],'AUD uses its recorded integer cents, with no conversion or USD rule')
 assert.equal((await current(aud)).currency,'AUD')
 assert.deepEqual((await h.state()).revisions.filter(r=>[usd,aud].includes(r.proposal_id)),initial,'rule changes leave both original snapshots byte-identical')
 await h.cmd('proposal.approve',{id:aud,version:1,revision:1,step:reevaluationRuleIds.aud})
 await h.cmd('proposal.send',{id:aud,version:2})
 const sentBefore=await current(aud)
 // Insert in reverse identity order, then edit a saved rule. Insertion time,
 // name and last edit must never become the equal-position tiebreaker.
 for(const [id,name] of [[reevaluationRuleIds.z,'Earlier inserted legal review'],[reevaluationRuleIds.a,'Later inserted legal review']]){
  const rule={id,name,position:31,condition:{kind:'termsEdited'},approvers:['role:owner'],templates:[]}
  await save(rule);expectedRules.push(rule)
 }
 const aRule=expectedRules.find(r=>r.id===reevaluationRuleIds.a)
 aRule.name='Renamed legal review';await save(aRule)
 const ownRules=(await settings()).rules.filter(r=>r.id.startsWith(prefix))
 const projected=ownRules.map(({id,name,position,condition,approvers,templates})=>({id,name,position,condition,approvers,templates}))
 assert.deepEqual(projected,expectedRules.toSorted((a,b)=>a.position-b.position||(a.id<b.id?-1:1)),'saved configuration retains exact conditions, currencies, identities and sequence')
 row=await current(usd)
 assert.deepEqual(row.approval.steps.map(s=>s.id),[reevaluationRuleIds.usd],'first draft has no edited legal terms')
 await h.cmd('proposal.approve',{id:usd,version:row.version,revision:1})
 const revise=async(terms,scope=input.scope)=>{
  const old=await current(usd)
  await h.cmd('proposal.revise',{...input,id:usd,version:old.version,terms,scope})
  return current(usd)
 }
 row=await revise(changedLegal)
 const order=[reevaluationRuleIds.usd,reevaluationRuleIds.a,reevaluationRuleIds.z]
 assert.equal(row.revision,2)
 assert.deepEqual(row.approval.steps.map(s=>s.id),order)
 assert.ok(row.approval.steps.every(s=>!s.done&&s.decisions.length===0),'revision one decisions cannot authorize revision two')
 const refuse=async fn=>{
  const before=reevaluationProjection(await h.state(),{usd,aud})
  await fn()
  assert.deepEqual(reevaluationProjection(await h.state(),{usd,aud}),before,'refused stale decisions and premature sending change no business facts')
 }
 await refuse(()=>h.cmd('proposal.approve',{id:usd,version:row.version,revision:1},undefined,409))
 await refuse(()=>h.cmd('proposal.send',{id:usd,version:row.version},undefined,409))
 await h.cmd('proposal.approve',{id:usd,version:row.version,revision:2,step:reevaluationRuleIds.usd})
 row=await current(usd)
 assert.equal(row.approval.steps[1].active,true)
 await h.cmd('proposal.approve',{id:usd,version:row.version,revision:2,step:reevaluationRuleIds.a})
 row=await revise(originalLegal)
 assert.equal(row.revision,3)
 assert.deepEqual(row.approval.steps.map(s=>s.id),[reevaluationRuleIds.usd],'returning to original legal text removes legal reviews, even after an edited draft')
 assert.equal(row.approval.steps[0].done,false)
 assert.deepEqual(row.approval.steps[0].decisions,[])
 await refuse(()=>h.cmd('proposal.send',{id:usd,version:row.version},undefined,409))
 await revise(changedLegal)
 row=await revise(changedLegal,'A scope edit with the same changed legal text.')
 assert.equal(row.revision,5)
 assert.deepEqual(row.approval.steps.map(s=>s.id),order,'comparison remains with revision one, even when the preceding draft has identical legal text')
 assert.ok(row.approval.steps.every(s=>!s.done&&s.decisions.length===0))
 aRule.position=33;await save(aRule)
 assert.deepEqual((await current(usd)).approval.steps.map(s=>s.id),[reevaluationRuleIds.usd,reevaluationRuleIds.z,reevaluationRuleIds.a],'saved sequence precedes stable identity')
 aRule.position=31;await save(aRule)
 assert.deepEqual((await current(usd)).approval.steps.map(s=>s.id),order,'restoring a tie restores the stable identity order')
 const sentAfter=await current(aud)
 for(const key of ['revision','currency','options','terms','version','status'])assert.deepEqual(sentAfter[key],sentBefore[key],'rule edits cannot rewrite sent '+key)
 const final=await h.state()
 assert.deepEqual(final.revisions.filter(r=>r.proposal_id===aud),initial.filter(r=>r.proposal_id===aud),'sent AUD snapshot remains unchanged after all edits')
 return {usd,aud,input,order,projection:reevaluationProjection(final,{usd,aud})}
}
