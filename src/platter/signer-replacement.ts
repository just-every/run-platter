import { clientLocales, retireInvitations } from './locales'
import { recipientPlan } from './recipients'
import type { Bindings } from '../auth.server'
import { commit, email, exact, need, secret, text, type Actor } from './model'
import { permitted, senders } from './permissions'
import { currentTime } from './expiry-time'
import { invitationMail } from './invitation-mail'
import { dispatchMail } from './mail'
import { signerMethod } from './signer-methods'

/** Replace the current unsigned signing position without changing the frozen offer. */
export async function replaceSigner(env:Bindings,a:Actor,input:Record<string,unknown>){
 need(senders.includes(a.role),'Only proposal senders replace a signer',403)
 const db=env.DB,row=await permitted(db,a,input.id,'send');exact(row,input)
 need(row.status==='sent','Only an unsigned sent signer can be replaced',409)
 const plan=recipientPlan(row),slotId=plan.length?text(input.recipientId,'a signer slot'):'client'
 const slot=plan.find(r=>r.id===slotId)
 if(plan.length){need(a.role==='owner','Only the current owner replaces a configured recipient',403);need(slot&&['signer','countersigner'].includes(slot.role),'Choose a signer slot');need(!await db.prepare('SELECT 1 FROM p_recipient_signatures WHERE proposal_id=? AND revision=? AND slot_id=?').bind(row.id,row.revision,slotId).first(),'A signed recipient cannot be replaced',409)}
 const share=await db.prepare('SELECT s.*,COALESCE(s.recipient,c.email) AS email FROM p_shares s JOIN p_clients c ON c.id=? WHERE s.proposal_id=? AND s.revision=? AND s.slot_id=?').bind(row.client_id,row.id,row.revision,slotId).first<any>()
 need(share,'Send a current invitation before replacing a signer',409)
 const recipient=email(input.recipient),reason=text(input.reason,'the replacement reason',1000)
 need(recipient!==share.email.toLowerCase(),'Choose a different signer')
 need(!plan.some(r=>r.id!==slotId&&r.email===recipient),'Each recipient needs their own mailbox')
 if(slot?.role==='countersigner')need(recipient===a.email.toLowerCase()&&a.role==='owner','Only the owner countersigns',403)
 const override=plan.length?await db.prepare('SELECT locale FROM p_recipient_locales WHERE proposal_id=? AND slot_id=?').bind(row.id,slotId).first<{locale:string}>():null
 const chosen=input.locale===undefined||input.locale==='inherit'?override?.locale??row.client_locale??'en':String(input.locale)
 if(input.locale!==undefined&&input.locale!=='inherit'){need(a.role==='owner','Only the owner chooses the client language',403);need(clientLocales.includes(chosen as any)||chosen==='auto','Choose a supported client language')}
 const localeWrite=plan.length?db.prepare('INSERT INTO p_recipient_locales(proposal_id,slot_id,locale) VALUES(?,?,?) ON CONFLICT(proposal_id,slot_id) DO UPDATE SET locale=excluded.locale').bind(row.id,slotId,chosen):db.prepare('INSERT INTO p_client_locales(proposal_id,locale) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET locale=excluded.locale').bind(row.id,chosen)
 const method=plan.length?'mailbox code':await signerMethod(db,row.id,row.revision),at=await currentTime(db),token=secret(),shareUrl=env.AUTH_ORIGIN+'/p/'+token,id=crypto.randomUUID()
 const writes=[
  db.prepare('INSERT INTO p_signer_replacements VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,share.email,recipient,a.id,a.email,at,reason,share.signing_position,method),
  retireInvitations(db,row.id,slotId),localeWrite,
  db.prepare('DELETE FROM p_invitation_languages WHERE token=?').bind(share.token),
  db.prepare("UPDATE p_shares SET token=?,recipient=?,code_hash=NULL,code_expires=NULL,code_attempts=0,code_generation=0,code_sent_at=NULL,session_hash=NULL,session_expires=NULL,code_method=?,session_method=?,session_verified_at=NULL WHERE token=?").bind(token,recipient,method,method,share.token),
  db.prepare('UPDATE p_proposals SET version=version+1,recipient_plan=? WHERE id=?').bind(JSON.stringify(plan.map(r=>r.id===slotId?{...r,email:recipient}:r)),row.id),
  db.prepare('DELETE FROM p_sms_authority WHERE proposal_id=?').bind(row.id),
  db.prepare("UPDATE p_sms_runs SET status='cancelled' WHERE proposal_id=? AND status='queued'").bind(row.id),
  db.prepare('DELETE FROM p_reminder_authority WHERE proposal_id=?').bind(row.id),
  db.prepare("UPDATE p_mail SET status='uncertain',held_reason='recipient_replaced' WHERE proposal_id=? AND recipient=? AND status='pending'").bind(row.id,share.email),
  db.prepare('DELETE FROM p_mail_reply_keys WHERE mail_id IN (SELECT id FROM p_mail WHERE proposal_id=?)').bind(row.id),
  db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(id,a.id,a.role,'signer.replace',row.id,at),
  ...invitationMail(env,a,input,{...row,client_locale:chosen},recipient,shareUrl,at),
 ]
 await commit(db,a,writes,false,{sql:"EXISTS(SELECT 1 FROM p_proposals p JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=? AND p.version=? AND p.revision=? AND p.status='sent' AND s.token=? AND s.revision=p.revision AND s.signing_position=?) AND (?=1 OR COALESCE((SELECT method FROM p_signer_methods WHERE proposal_id=? AND revision=?),'mailbox code')=?) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?) AND NOT EXISTS(SELECT 1 FROM p_negotiations WHERE proposal_id=?)",values:[row.id,row.version,row.revision,share.token,share.signing_position,plan.length?1:0,row.id,row.revision,method,row.id,row.id,row.revision,row.id]})
 await dispatchMail(env,row.id)
 return {id:row.id,shareUrl}
}
