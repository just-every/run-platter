import type { Bindings } from '../auth.server'
import { commit, exact, need, proposal, text, type Actor } from './model'
import { currentTime } from './expiry-time'
import { dispatchMail, queueMail } from './mail'

export async function withdraw(env:Bindings,a:Actor,input:Record<string,unknown>) {
 need(a.role==='owner','Only the owner sends or withdraws proposals',403)
 const db=env.DB,row=await proposal(db,input.id),at=await currentTime(db)
 exact(row,input)
 need(row.status==='sent','Only an unsigned sent proposal can be withdrawn',409)
 const reason=text(input.reason,'the withdrawal reason',1000)
 need(input.notice===undefined||[true,false,'yes','no'].includes(input.notice as any),'Choose whether to notify the recipient')
 const notice=input.notice!==false&&input.notice!=='no'
 const shares=(await db.prepare('SELECT s.*,COALESCE(s.recipient,c.email) AS email FROM p_shares s JOIN p_clients c ON c.id=? WHERE s.proposal_id=?').bind(row.client_id,row.id).all<any>()).results
 const writes=[
  db.prepare('INSERT INTO p_withdrawals(id,proposal_id,revision,actor_id,actor_email,withdrawn_at,reason,notice) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),row.id,row.revision,a.id,a.email,at,reason,notice?1:0),
  ...shares.map(s=>db.prepare('INSERT INTO p_withdrawn_links(token,contact_email) VALUES(?,?)').bind(s.token,a.email)),
  db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(row.id),
  db.prepare("UPDATE p_followups SET closed_at=?,resolution='Proposal withdrawn',updated_at=? WHERE proposal_id=? AND closed_at IS NULL").bind(at,at,row.id),
  db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),
  db.prepare('UPDATE p_question_reply_keys SET used_at=? WHERE question_id IN (SELECT id FROM p_questions WHERE proposal_id=?) AND used_at IS NULL').bind(at,row.id),
  db.prepare("UPDATE p_bounce_notices SET closed_at=?,action='Proposal withdrawn' WHERE proposal_id=? AND closed_at IS NULL").bind(at,row.id),
  db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'proposal.withdraw',row.id,at),
 ]
 if(notice)for(const s of shares)writes.push(queueMail(env,row.id,s.email,'Proposal withdrawn: '+row.title,`The firm has withdrawn this proposal.\nReason: ${reason}\nContact: ${a.email}`,a.id))
 await commit(db,a,writes,true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='sent') AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?)",values:[row.id,row.version,row.id,row.revision]})
 await dispatchMail(env,row.id)
 return {id:row.id,withdrawn:true}
}
