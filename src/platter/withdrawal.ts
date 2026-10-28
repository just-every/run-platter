import { clientLocale } from './locales'
import { voidSignatureStatement } from './recipients'
import { firmOutcomeReason, synchronizeOutcome } from './outcomes'
import type { Bindings } from '../auth.server'
import { commit, exact, need, proposal, text, type Actor } from './model'
import { currentTime } from './expiry-time'
import { dispatchMail, queueMail } from './mail'

export function outcomeStatement(db:D1Database,row:any,actor:{id:string,email:string,role:string},kind:'declined'|'lost'|'won',reason:string,at:number) {
 return db.prepare('INSERT INTO p_outcome_records(proposal_id,revision,kind,actor_id,actor_role,actor_email,occurred_at,reason) VALUES(?,?,?,?,?,?,?,?)').bind(row.id,row.revision,kind,actor.id,actor.role,actor.email,at,reason)
}

/** Both outcome doors use the same link revocation, queue closure and retained history as SEND-010. */
export async function withdrawalStatements(env:Bindings,row:any,actor:{id:string,email:string,role:string},contact:string,reason:string,notice:boolean,at:number,action='proposal.withdraw') {
 const db=env.DB,eventId=crypto.randomUUID()
 const shares=(await db.prepare('SELECT s.*,COALESCE(s.recipient,c.email) AS email FROM p_shares s JOIN p_clients c ON c.id=? WHERE s.proposal_id=?').bind(row.client_id,row.id).all<any>()).results
 const writes=[
  voidSignatureStatement(db,row.id,row.revision,at,reason),
  db.prepare("UPDATE p_sms_runs SET status='cancelled' WHERE proposal_id=? AND status='queued'").bind(row.id),
  db.prepare('DELETE FROM p_sms_authority WHERE proposal_id=?').bind(row.id),
  db.prepare('INSERT INTO p_withdrawals(id,proposal_id,revision,actor_id,actor_email,withdrawn_at,reason,notice) VALUES(?,?,?,?,?,?,?,?)').bind(eventId,row.id,row.revision,actor.id,actor.email,at,reason,notice?1:0),
  db.prepare('INSERT INTO p_withdrawn_links(token,contact_email,client_locale) SELECT token,?,? FROM p_replaced_links WHERE proposal_id=? ON CONFLICT DO NOTHING').bind(contact,clientLocale(row),row.id),
  ...shares.map(s=>db.prepare('INSERT INTO p_withdrawn_links(token,contact_email,client_locale) VALUES(?,?,?)').bind(s.token,contact,clientLocale(row))),
  db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(row.id),
  db.prepare("UPDATE p_followups SET closed_at=?,resolution='Proposal withdrawn',updated_at=? WHERE proposal_id=? AND closed_at IS NULL").bind(at,at,row.id),
  db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),
  db.prepare('UPDATE p_question_reply_keys SET used_at=? WHERE question_id IN (SELECT id FROM p_questions WHERE proposal_id=?) AND used_at IS NULL').bind(at,row.id),
  db.prepare("UPDATE p_bounce_notices SET closed_at=?,action='Proposal withdrawn' WHERE proposal_id=? AND closed_at IS NULL").bind(at,row.id),
  db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(eventId,actor.id,actor.role,action,row.id,at),
 ]
 if(notice)for(const s of shares)writes.push(queueMail(env,row.id,s.email,'Proposal withdrawn: '+row.title,`The firm has withdrawn this proposal.\nReason: ${reason}\nContact: ${contact}`,actor.id))
 return writes
}

export async function withdraw(env:Bindings,a:Actor,input:Record<string,unknown>,lost=false,won=false) {
 need(['owner','admin','manager','sales'].includes(a.role),'Only the owner sends or withdraws proposals',403)
 if(won)need(['owner','admin'].includes(a.role),'Only owner and admins record an explicit won override',403)
 const db=env.DB,row=await proposal(db,input.id),at=await currentTime(db)
 exact(row,input)
 need(row.status==='sent','Only an unsigned sent proposal can be withdrawn',409)
 const configured=lost||won?await firmOutcomeReason(db,input.reason):null,reason=configured?.reason??text(input.reason,'the withdrawal reason',1000)
 need(input.notice===undefined||[true,false,'yes','no'].includes(input.notice as any),'Choose whether to notify the recipient')
 const notice=won?false:lost?input.notice===true||input.notice==='yes':input.notice!==false&&input.notice!=='no'
 const writes=await withdrawalStatements(env,row,a,a.email,reason,notice,at,won?'proposal.win':lost?'proposal.lose':'proposal.withdraw')
 if(lost||won)writes.push(outcomeStatement(db,row,a,won?'won':'lost',reason,at))
 await commit(db,a,writes,true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='sent') AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?)"+(configured?' AND COALESCE((SELECT version FROM p_outcome_settings WHERE singleton=1),0)=?':''),values:[row.id,row.version,row.id,row.revision,...(configured?[configured.settingsVersion]:[])]})
 if(lost||won)await synchronizeOutcome(env,row.id)
 await dispatchMail(env,row.id)
 return {id:row.id,withdrawn:true}
}
