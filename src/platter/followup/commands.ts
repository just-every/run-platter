import type { Bindings } from '../../auth.server'
import { commit, need, proposal, text, type Actor } from '../model'
import { calendarDate, currentTime } from '../expiry-time'
import { queueMail, dispatchMail } from '../mail'
import { state } from '../state'

export async function followupCommand(env:Bindings,a:Actor,name:string,input:Record<string,unknown>) {
 need(a.role==='owner','Only the owner manages sales follow-ups',403)
 const db=env.DB,p=await proposal(db,input.id),at=await currentTime(db)
 need(!await db.prepare('SELECT proposal_id FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()&&p.status!=='withdrawn','This proposal is closed',409)
 const current=(await state(env,a)).followups?.rows.find((r:any)=>r.id===p.id)
 if(name==='followup.notify'){
  need(current,'This follow-up is closed',409)
  const owner=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(p.sales_owner_id).first<{email:string}>()
  need(owner,'Assign an active sales owner first',409)
  await commit(db,a,[queueMail(env,p.id,owner.email,'Sales follow-up: '+p.title,`${current.action}\nDue: ${current.dueDate}\n${current.engagement}`)],true)
  await dispatchMail(env,p.id);return {id:p.id,notificationQueued:true}
 }
 need(['followup.schedule','followup.complete','followup.dismiss'].includes(name),'Unknown follow-up action',404)
 const scheduling=name==='followup.schedule'
 need(scheduling||current,'This follow-up is closed',409)
 const action=text(name==='followup.dismiss'?input.reason:input.action,scheduling?'the next action':name==='followup.dismiss'?'a dismissal reason':'the logged action',1000)
 const dueDate=scheduling?calendarDate(input.dueDate):current!.dueDate
 const kind=scheduling?'scheduled':name==='followup.complete'?'completed':'dismissed'
 const writes=[db.prepare(`INSERT INTO p_followups(proposal_id,revision,action,due_date,closed_at,resolution,actor_id,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,action=excluded.action,due_date=excluded.due_date,closed_at=excluded.closed_at,resolution=excluded.resolution,actor_id=excluded.actor_id,updated_at=excluded.updated_at`).bind(p.id,p.revision,scheduling?action:current!.action,dueDate,scheduling?null:at,scheduling?null:action,a.id,at),db.prepare('INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),p.id,p.revision,kind,action,dueDate,a.id,at)]
 await commit(db,a,writes,true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=?) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?) AND (? OR NOT EXISTS(SELECT 1 FROM p_followups WHERE proposal_id=? AND revision=? AND closed_at IS NOT NULL))",values:[p.id,p.version,p.revision,p.id,p.id,p.revision,scheduling?1:0,p.id,p.revision]})
 return {id:p.id,kind}
}
