import type { Bindings } from '../auth.server'
import { commit, exact, hash, need, text, dollars, type Actor } from './model'
import { permitted, administrators } from './permissions'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { currentTime } from './expiry-time'
export async function approvalSettings(db:D1Database){
 const policy=await db.prepare('SELECT * FROM p_approval_policy WHERE singleton=1').first<any>()??{singleton:1,required:1,default_role:'owner',version:0}
 const rules=(await db.prepare('SELECT * FROM p_approval_rules ORDER BY position,id').all<any>()).results.map(r=>({...r,condition:JSON.parse(r.condition),approvers:JSON.parse(r.approvers)}))
 return {policy,rules}
}
function matches(a:Actor,approver:string){return approver==='person:'+a.id||approver==='role:'+a.role}
export async function approvalPlan(db:D1Database,row:any,a?:Actor){
 const {policy,rules}=await approvalSettings(db),options=typeof row.options==='string'?JSON.parse(row.options):row.options
 const total=Math.max(...options.map((o:any)=>o.cents+(o.optionalItems??[]).reduce((sum:number,item:any)=>sum+item.unitCents*(item.editable?item.max:item.quantity),0))),first=await db.prepare('SELECT snapshot,prepared_by FROM p_revisions WHERE proposal_id=? AND revision=1').bind(row.id).first<any>()
 const selected=rules.filter(r=>r.condition.kind==='totalOver'?row.currency===r.condition.currency&&total>r.condition.cents:row.revision>1&&Boolean(first)&&String(row.terms??'')!==String(JSON.parse(first.snapshot).terms??''))
 const agent=String(row.prepared_by).startsWith('agent:')||String(first?.prepared_by).startsWith('agent:')
 const steps=selected.map(r=>({id:r.id,name:r.name,approvers:r.approvers as string[],any:false}))
 if(!steps.length&&(policy.required||agent))steps.push({id:'default',name:agent&&!policy.required?'Person approval for agent draft':'Default approval',approvers:agent&&!policy.required?['role:owner','role:admin','role:manager']:['role:'+policy.default_role],any:agent&&!policy.required})
 const plan=await hash(JSON.stringify({version:policy.version,steps,revision:row.revision})),decisions=(await db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=? AND revision=? AND plan=? ORDER BY occurred_at,id').bind(row.id,row.revision,plan).all<any>()).results
 const legacy=policy.version===0&&row.approved_by&&steps.length===1&&steps[0].id==='default'
 let prior=true,rejected=decisions.some(d=>d.decision==='rejected')
 const evaluated=steps.map(step=>{
  const approvals=decisions.filter(d=>d.step===step.id&&d.decision==='approved'),done=Boolean(legacy)||(step.any?approvals.length>0:step.approvers.every((_:string,i:number)=>approvals.some(d=>d.approver_index===i)))
  const eligible=a?step.approvers.map((v:string,i:number)=>matches(a,v)?i:-1).filter((i:number)=>i>=0):[]
  const result={...step,done,active:prior&&!done&&!rejected,canApprove:prior&&!done&&!rejected&&eligible.some((i:number)=>!approvals.some(d=>d.approver_index===i)),decisions:decisions.filter(d=>d.step===step.id)}
  prior=prior&&done;return result
 })
 return {policyVersion:policy.version,plan,steps:evaluated,required:steps.length>0,complete:prior&&!rejected,rejected}
}
export async function approvalCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db)
 if(name==='approval.policy'||name==='approval.rule'||name==='approval.rule.delete'){
  need(administrators.includes(a.role),'Only owner and admins change approval settings',403)
  const {policy}=await approvalSettings(db);need(Number(p.version)===policy.version,'Approval settings changed. Reload.',409)
  const writes:D1PreparedStatement[]=[db.prepare("INSERT INTO p_approval_policy(singleton,required,default_role) VALUES(1,1,'owner') ON CONFLICT DO NOTHING")]
  if(name==='approval.policy'){
   need([true,false,'yes','no'].includes(p.required as any),'Choose whether approval is required')
   need(['owner','admin','manager'].includes(String(p.defaultRole)),'Choose an approver role')
   // The contract reserves naming the default approver to the owner.
   need(a.role==='owner'||p.defaultRole===policy.default_role,'Only the owner names the default approver',403)
   writes.push(db.prepare('UPDATE p_approval_policy SET required=?,default_role=?,version=version+1 WHERE singleton=1').bind(p.required===true||p.required==='yes'?1:0,String(p.defaultRole)))
  }else if(name==='approval.rule.delete'){
   writes.push(db.prepare('DELETE FROM p_approval_rules WHERE id=?').bind(text(p.id,'a rule')),db.prepare('UPDATE p_approval_policy SET version=version+1 WHERE singleton=1'))
  }else{
   let condition:any=p.condition??(p.kind==='termsEdited'?{kind:'termsEdited'}:{kind:'totalOver',cents:dollars(p.amount),currency:p.currency}),approvers:any=p.approvers??[p.approverOne,p.approverTwo].filter(Boolean)
   if(typeof condition==='string'){try{condition=JSON.parse(condition)}catch{need(false,'Provide a rule condition')}}
   if(typeof approvers==='string'){try{approvers=JSON.parse(approvers)}catch{need(false,'Provide approvers')}}
   need(condition&&['totalOver','termsEdited'].includes(condition.kind),'Choose total value or edited legal terms')
   if(condition.kind==='totalOver')need(Number.isSafeInteger(condition.cents)&&condition.cents>=0&&['USD','AUD'].includes(condition.currency),'Provide a nonnegative total in integer cents and currency')
   condition=condition.kind==='totalOver'?{kind:condition.kind,cents:condition.cents,currency:condition.currency}:{kind:'termsEdited'}
   need(Array.isArray(approvers)&&approvers.length>0&&approvers.length<=20&&new Set(approvers).size===approvers.length,'Choose distinct approvers')
   for(const approver of approvers){
    need(typeof approver==='string','Choose an approver')
    if(approver.startsWith('role:'))need(['role:owner','role:admin','role:manager'].includes(approver),'Choose owner, admin or manager')
    else{
     need(approver.startsWith('person:'),'Choose a named person or approver role')
     const person=await db.prepare("SELECT CASE WHEN o.role='owner' THEN 'owner' ELSE COALESCE(m.role,'sales') END AS role FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'").bind(approver.slice(7)).first<any>()
     need(person&&['owner','admin','manager','billing'].includes(person.role),'Named approvers must be owner, admin, manager or billing')
    }
   }
   const id=p.id?text(p.id,'a rule'):crypto.randomUUID(),position=Number(p.position)
   need(Number.isSafeInteger(position)&&position>=0&&position<=1000,'Choose the rule sequence')
   writes.push(db.prepare('INSERT INTO p_approval_rules(id,name,position,condition,approvers) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,condition=excluded.condition,approvers=excluded.approvers').bind(id,text(p.name,'a rule name',100),position,JSON.stringify(condition),JSON.stringify(approvers)),db.prepare('UPDATE p_approval_policy SET version=version+1 WHERE singleton=1'))
  }
  await commit(db,a,writes,false,{sql:'COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?',values:[policy.version]});return {saved:true}
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
 await commit(db,a,[db.prepare('INSERT INTO p_approval_decisions(id,proposal_id,revision,plan,step,actor_id,approver_index,decision,note,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,plan.plan,step.id,a.id,index,decision,note,at),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),...(decision==='approved'?[db.prepare('INSERT INTO p_approvals(id,proposal_id,revision,actor_id,approved_at) VALUES(?,?,?,?,?)').bind(id,row.id,row.revision,a.id,at)]:[])],false,guard)
 // The final status update is version guarded, so edits or concurrent decisions cannot stamp a newer revision.
 const next=await approvalPlan(db,row,a)
 if(next.complete){await commit(db,a,[pending?db.prepare('UPDATE p_negotiations SET approved_by=?,approved_at=? WHERE proposal_id=? AND revision=?').bind(a.email,at,row.id,row.revision):db.prepare("UPDATE p_proposals SET status=?,approved_by=?,approved_at=? WHERE id=? AND revision=?").bind(original.status==='sent'?'sent':'approved',a.email,at,row.id,row.revision)],false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?',values:[row.id,original.version+1,plan.policyVersion]})}
 return {approved:next.complete,rejected:next.rejected}
}
