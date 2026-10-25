import { legalText } from './documents/blocks'
import { discountThreshold, percentBps } from './discounts'
import { internalPricing, costReaders } from './internal-pricing'
import { starterTemplates } from './starter-templates'
import type { Bindings } from '../auth.server'
import { commit, exact, hash, need, text, dollars, type Actor } from './model'
import { permitted, administrators, scope } from './permissions'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { currentTime } from './expiry-time'
export async function approvalSettings(db:D1Database){
 const policy=await db.prepare('SELECT * FROM p_approval_policy WHERE singleton=1').first<any>()??{singleton:1,required:1,default_role:'owner',version:0}
 const rules=(await db.prepare('SELECT * FROM p_approval_rules ORDER BY position,id').all<any>()).results.map(r=>({...r,condition:JSON.parse(r.condition),approvers:JSON.parse(r.approvers),templates:JSON.parse(r.templates??'[]')}))
 return {policy,rules}
}
function matches(a:Actor,approver:string){return approver==='person:'+a.id||approver==='role:'+a.role}
export async function approvalPlan(db:D1Database,row:any,a?:Actor){
 const {policy,rules}=await approvalSettings(db),options=typeof row.options==='string'?JSON.parse(row.options):row.options
 const totals=options.map((o:any)=>BigInt(o.pricingGrossCents??o.discount?.grossCents??o.cents)+(o.optionalItems??[]).reduce((sum:bigint,item:any)=>sum+BigInt(item.unitCents)*BigInt(item.editable?item.max:item.quantity),0n)),total=totals.reduce((a:bigint,b:bigint)=>a>b?a:b,0n),first=await db.prepare('SELECT snapshot,prepared_by FROM p_revisions WHERE proposal_id=? AND revision=1').bind(row.id).first<any>(),origin=await db.prepare('SELECT template_id FROM p_template_sources WHERE proposal_id=?').bind(row.id).first<any>()
 let costing:any
 const holds=async(r:any)=>{
  if(r.templates.length&&!r.templates.includes(origin?.template_id))return false
  const c=r.condition
  if(c.kind==='totalOver')return row.currency===c.currency&&total>BigInt(c.cents)
  if(c.kind==='discountOver')return options.some((o:any)=>discountThreshold(o)>c.bps)
  if(c.kind==='termsEdited')return row.revision>1&&Boolean(first)&&legalText(row)!==legalText(JSON.parse(first.snapshot))
  if(c.kind==='paymentTerms')return row.deposit_bps<c.minimumDepositBps||(c.standardTerms!==null&&String(row.terms??'')!==c.standardTerms)
  if(c.kind==='template')return Boolean(origin)
  if(c.kind==='marginBelow'){
   costing??=await internalPricing(db,row,{id:'internal-rule-evaluation',email:'',role:'owner'})
   if(!costing||costing.packages.some((p:any)=>p.marginBps===null||BigInt(p.marginBps)<BigInt(c.bps)))return true
   return costing.lines.filter((l:any)=>l.kind==='optional').some((l:any)=>{const o=options.find((o:any)=>o.id===l.optionId),item=o.optionalItems.find((i:any)=>i.id===l.itemId),net=BigInt(item.unitCents)*BigInt(10000-(o.discount?.bps??0))/10000n-BigInt(o.discount?.fixedCents??0);return l.unitCostCents===null||net<=0n||(net-BigInt(l.unitCostCents))*10000n<BigInt(c.bps)*net})
  }
  return true // Unknown restored rule types require review rather than silently skipping.
 }
 const selected:any[]=[];for(const rule of rules)if(await holds(rule))selected.push(rule)
 const agent=String(row.prepared_by).startsWith('agent:')||String(first?.prepared_by).startsWith('agent:')
 const steps=selected.map(r=>({id:r.id,name:r.name,approvers:r.approvers as string[],any:false}))
 if(!steps.length&&(policy.required||agent))steps.push({id:'default',name:agent&&!policy.required?'Person approval for agent draft':'Default approval',approvers:agent&&!policy.required?['role:owner','role:admin','role:manager']:['role:'+policy.default_role],any:agent&&!policy.required})
 const plan=await hash(JSON.stringify({version:policy.version,steps,revision:row.revision})),history=(await db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=? AND revision=? ORDER BY occurred_at,id').bind(row.id,row.revision).all<any>()).results,decisions=history.filter(d=>d.plan===plan)
 const legacy=policy.version===0&&row.approved_by&&steps.length===1&&steps[0].id==='default'
 let prior=true,rejected=history.some(d=>d.decision==='rejected')
 const access=a?scope(a,'approve'):null,mayApprove=Boolean(a&&access&&await db.prepare('SELECT p.id FROM p_proposals p WHERE p.id=? AND ('+access.sql+')').bind(row.id,...access.values).first())
 const evaluated=steps.map(step=>{
  const approvals=decisions.filter(d=>d.step===step.id&&d.decision==='approved'),done=Boolean(legacy)||(step.any?approvals.length>0:step.approvers.every((_:string,i:number)=>approvals.some(d=>d.approver_index===i)))
  const eligible=mayApprove&&a&&['owner','admin','manager','billing'].includes(a.role)?step.approvers.map((v:string,i:number)=>matches(a,v)?i:-1).filter((i:number)=>i>=0):[]
  const privateName=selected.find(r=>r.id===step.id)?.condition.kind==='marginBelow'&&a&&!costReaders.includes(a.role)
  const result={...step,...(privateName?{name:'Internal approval review'}:{}),done,active:prior&&!done&&!rejected,canApprove:prior&&!done&&!rejected&&eligible.some((i:number)=>!approvals.some(d=>d.approver_index===i)),decisions:decisions.filter(d=>d.step===step.id)}
  prior=prior&&done;return result
 })
 return {policyVersion:policy.version,plan,steps:evaluated,required:steps.length>0,complete:prior&&!rejected,rejected}
}
export async function approvalCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db)
 if(name==='approval.policy'||name==='approval.rule'||name==='approval.rule.delete'){
  need(administrators.includes(a.role),'Only owner and admins change approval settings',403)
  let resource='installation'
  const {policy}=await approvalSettings(db);need(Number(p.version)===policy.version,'Approval settings changed. Reload.',409)
  const writes:D1PreparedStatement[]=[db.prepare("INSERT INTO p_approval_policy(singleton,required,default_role) VALUES(1,1,'owner') ON CONFLICT DO NOTHING")]
  if(name==='approval.policy'){
   need([true,false,'yes','no'].includes(p.required as any),'Choose whether approval is required')
   need(['owner','admin','manager'].includes(String(p.defaultRole)),'Choose an approver role')
   // The contract reserves naming the default approver to the owner.
   need(a.role==='owner'||p.defaultRole===policy.default_role,'Only the owner names the default approver',403)
   writes.push(db.prepare('UPDATE p_approval_policy SET required=?,default_role=?,version=version+1 WHERE singleton=1').bind(p.required===true||p.required==='yes'?1:0,String(p.defaultRole)))
  }else if(name==='approval.rule.delete'){
   resource=text(p.id,'a rule')
   writes.push(db.prepare('DELETE FROM p_approval_rules WHERE id=?').bind(text(p.id,'a rule')),db.prepare('UPDATE p_approval_policy SET version=version+1 WHERE singleton=1'))
  }else{
   let condition:any=p.condition??(p.kind==='termsEdited'||p.kind==='template'?{kind:p.kind}:p.kind==='discountOver'||p.kind==='marginBelow'?{kind:p.kind,bps:percentBps(p.percent,'a rule threshold')}:p.kind==='paymentTerms'?{kind:p.kind,minimumDepositBps:percentBps(p.minimumDepositPercent,'a minimum deposit'),standardTerms:p.standardTerms?String(p.standardTerms):null}:{kind:'totalOver',cents:dollars(p.amount),currency:p.currency}),approvers:any=p.approvers??[p.approverOne,p.approverTwo].filter(Boolean)
   if(typeof condition==='string'){try{condition=JSON.parse(condition)}catch{need(false,'Provide a rule condition')}}
   if(typeof approvers==='string'){try{approvers=JSON.parse(approvers)}catch{need(false,'Provide approvers')}}
   need(condition&&['totalOver','discountOver','marginBelow','paymentTerms','termsEdited','template'].includes(condition.kind),'Choose an available approval condition')
   if(condition.kind==='totalOver')need(Number.isSafeInteger(condition.cents)&&condition.cents>=0&&['USD','AUD'].includes(condition.currency),'Provide a nonnegative total in integer cents and currency')
   if(['discountOver','marginBelow'].includes(condition.kind))need(Number.isSafeInteger(condition.bps)&&condition.bps>=0&&condition.bps<=10000,'Use a percentage threshold from 0 to 100')
   if(condition.kind==='paymentTerms'){condition.minimumDepositBps??=0;condition.standardTerms??=null}
   if(condition.kind==='paymentTerms')need(Number.isSafeInteger(condition.minimumDepositBps)&&condition.minimumDepositBps>=0&&condition.minimumDepositBps<=10000&&(condition.standardTerms===null||typeof condition.standardTerms==='string'&&condition.standardTerms.length<=10000),'Choose current payment terms: a minimum deposit and optional exact standard terms')
   condition=condition.kind==='totalOver'?{kind:condition.kind,cents:condition.cents,currency:condition.currency}:['discountOver','marginBelow'].includes(condition.kind)?{kind:condition.kind,bps:condition.bps}:condition.kind==='paymentTerms'?{kind:condition.kind,minimumDepositBps:condition.minimumDepositBps,standardTerms:condition.standardTerms}:{kind:condition.kind}
   const templates=Array.isArray(p.templates)?[...new Set(p.templates.map(String))]:Object.keys(p).filter(k=>k.startsWith('ruleTemplate:')&&p[k]==='yes').map(k=>k.slice(13));need(templates.length<=100,'Choose at most 100 templates')
   for(const template of templates)need(starterTemplates().some(t=>t.id===template)||await db.prepare('SELECT id FROM p_personal_templates WHERE id=?').bind(template).first(),'Choose an existing template')
   need(Array.isArray(approvers)&&approvers.length>0&&approvers.length<=20&&new Set(approvers).size===approvers.length,'Choose distinct approvers')
   for(const approver of approvers){
    need(typeof approver==='string','Choose an approver')
    if(approver.startsWith('role:'))need(['role:owner','role:admin','role:manager'].includes(approver),'Choose owner, admin or manager')
    else{
     need(approver.startsWith('person:'),'Choose a named person or approver role')
     const person=await db.prepare("SELECT CASE WHEN o.role IN ('owner','admin') THEN o.role ELSE COALESCE(m.role,'sales') END AS role FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'").bind(approver.slice(7)).first<any>()
     need(person&&['owner','admin','manager','billing'].includes(person.role),'Named approvers must be owner, admin, manager or billing')
    }
   }
   const id=p.id?text(p.id,'a rule'):crypto.randomUUID(),position=Number(p.position);resource=id
   need(Number.isSafeInteger(position)&&position>=0&&position<=1000,'Choose the rule sequence')
   writes.push(db.prepare('INSERT INTO p_approval_rules(id,name,position,condition,approvers,templates) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,condition=excluded.condition,approvers=excluded.approvers,templates=excluded.templates').bind(id,text(p.name,'a rule name',100),position,JSON.stringify(condition),JSON.stringify(approvers),JSON.stringify(templates)),db.prepare('UPDATE p_approval_policy SET version=version+1 WHERE singleton=1'))
  }
  await commit(db,a,writes,false,{sql:'COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?',values:[policy.version]});return {saved:true,id:resource}
 }
 const original=await permitted(db,a,p.id,'approve');exact(original,p)
 const row=negotiatedView(original,await pendingNegotiation(db,original.id))
 need(['draft','approved','sent'].includes(row.status)&&row.revision===Number(p.revision),'Approve the current draft revision',409)
 const plan=await approvalPlan(db,row,a),step=p.step===undefined?plan.steps.find(s=>s.canApprove):plan.steps.find(s=>s.id===p.step)
 need(step?.canApprove,'No current approval step names you',403)
 const note=p.note===undefined?'':String(p.note);need(note.length<=2000,'Keep the approval note under 2000 characters')
 const index=step.approvers.findIndex(v=>matches(a,v)&&!step.decisions.some(d=>d.approver_index===step.approvers.indexOf(v)))
 const decision=name==='proposal.reject'?'rejected':'approved'
 const id=crypto.randomUUID(),pending=row.negotiating
 // Serialize decisions with the existing proposal version; only the exact current plan may advance.
 const guard={sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?',values:[original.id,original.version,plan.policyVersion]}
 const complete=decision==='approved'&&plan.steps.every(s=>s.done||s.id===step.id&&(s.any||s.approvers.every((_,i)=>i===index||s.decisions.some(d=>d.decision==='approved'&&d.approver_index===i))))
 const finalize=complete?[pending?db.prepare('UPDATE p_negotiations SET approved_by=?,approved_at=? WHERE proposal_id=? AND revision=?').bind(a.email,at,row.id,row.revision):db.prepare("UPDATE p_proposals SET status=?,approved_by=?,approved_at=? WHERE id=? AND revision=?").bind(original.status==='sent'?'sent':'approved',a.email,at,row.id,row.revision)]:[]
 await commit(db,a,[
  db.prepare('INSERT INTO p_approval_decisions(id,proposal_id,revision,plan,step,actor_id,approver_index,decision,note,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,plan.plan,step.id,a.id,index,decision,note,at),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),
  ...(decision==='approved'?[db.prepare('INSERT INTO p_approvals(id,proposal_id,revision,actor_id,approved_at) VALUES(?,?,?,?,?)').bind(id,row.id,row.revision,a.id,at)]:[]),...finalize,
 ],false,guard)
 return {approved:complete,rejected:decision==='rejected'}
}
