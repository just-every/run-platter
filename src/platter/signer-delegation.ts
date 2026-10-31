import type { Bindings } from '../auth.server'
import { commit, email, exact, fail, need, secret, text, type Actor } from './model'
import { permitted } from './permissions'
import { currentTime, expiryFor, expiryOpenSql } from './expiry'
import { signerMethod } from './signer-methods'
import { invitationMail } from './invitation-mail'
import { dispatchMail, queueMail } from './mail'
import { rotateSignerInvitation } from './signer-replacement'
import { recipientPlan } from './recipients'

// Each transition serializes with signing, withdrawal and offer edits. A prior
// signature in another slot is preserved; this slot must still be unsigned.
function openGuard(row:any,share:any,at:number){
 return {sql:`EXISTS(SELECT 1 FROM p_proposals p JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=? AND p.version=? AND p.revision=? AND p.status='sent' AND s.token=? AND s.revision=p.revision AND ${expiryOpenSql('p')}) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures WHERE proposal_id=? AND revision=? AND slot_id=?) AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?) AND NOT EXISTS(SELECT 1 FROM p_negotiations WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=?) AND COALESCE((SELECT method FROM p_signer_methods WHERE proposal_id=?),'mailbox code')='mailbox code'`,values:[row.id,row.version,row.revision,share.token,at,row.id,row.id,row.revision,share.slot_id,row.id,row.revision,row.id,row.id,row.id]}
}
async function supported(env:Bindings,row:any,slotId?:string){
 need(row.status==='sent','Delegation requires an unsigned sent offer',409)
 need(!(await expiryFor(env.DB,row)).expired,'This proposal has expired',409)
 need(!await env.DB.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(row.id).first(),'Delegation currently requires collection off',409)
 need(await signerMethod(env.DB,row.id,row.revision)==='mailbox code','Delegation currently requires mailbox verification',409)
 need(!await env.DB.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(),'Finish the proposed revision before delegating',409)
 const plan=recipientPlan(row)
 if(slotId&&plan.length)need(plan.some(r=>r.id===slotId&&r.role==='signer'),'Only an unsigned client signer may delegate',403)
 const share=await env.DB.prepare('SELECT s.*,COALESCE(s.recipient,c.email) AS email FROM p_shares s JOIN p_clients c ON c.id=? WHERE s.proposal_id=? AND s.revision=?'+(slotId?' AND s.slot_id=?':" AND (s.slot_id='client' OR s.slot_id IN (SELECT json_extract(value,'$.id') FROM json_each(?) WHERE json_extract(value,'$.role')='signer'))")+' AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures sig WHERE sig.proposal_id=s.proposal_id AND sig.revision=s.revision AND sig.slot_id=s.slot_id) ORDER BY s.signing_position,s.slot_id LIMIT 1').bind(row.client_id,row.id,row.revision,slotId??JSON.stringify(plan)).first<any>()
 need(share,'Send a current unsigned signer invitation before configuring delegation',409)
 return share
}
export async function delegationState(db:D1Database,row:any,slotId?:string){
 const authority=await db.prepare("SELECT a.* FROM p_delegation_authority a JOIN oa_operators o ON o.id=a.owner_id WHERE a.proposal_id=? AND a.revision=? AND o.status='active' AND o.role='owner' AND o.version=a.owner_version").bind(row.id,row.revision).first<any>()
 const history=(await db.prepare('SELECT * FROM p_signer_delegations WHERE proposal_id=? ORDER BY delegated_at,id').bind(row.id).all<any>()).results
 const shares=(await db.prepare('SELECT slot_id,delegation_id FROM p_shares WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).all<any>()).results
 const signed=(await db.prepare('SELECT slot_id FROM p_recipient_signatures WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).all<any>()).results
 const plan=recipientPlan(row),eligible=!slotId||(!plan.length||plan.some(r=>r.id===slotId&&r.role==='signer'))&&!signed.some(s=>s.slot_id===slotId)
 const currentIds=shares.filter(s=>s.delegation_id&&!signed.some(sig=>sig.slot_id===s.slot_id)).map(s=>s.delegation_id)
 return {enabled:Boolean(authority)&&eligible,currentId:shares.find(s=>!slotId||s.slot_id===slotId)?.delegation_id??null,currentIds,history:slotId?history.filter(h=>h.slot_id===slotId):history}
}

// Template choices are copied preferences, never invitation authority. Sending
// requires an explicit current-owner consent for this approved revision.
export async function delegationSendStatements(db:D1Database,a:Actor,input:Record<string,unknown>,row:any,at:number){
 if(input.delegationConsent!==true&&input.delegationConsent!=='yes')return []
 need(a.role==='owner','Only the current owner enables signer delegation',403)
 need(input.delivery!=='sms','Delegation currently requires email invitations',409)
 need(!await db.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(row.id).first(),'Delegation currently requires collection off',409)
 need(await signerMethod(db,row.id,row.revision)==='mailbox code','Delegation currently requires mailbox verification',409)
 const owner=await db.prepare("SELECT version FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(a.id).first<any>();need(owner,'The current owner authority changed',409)
 return [db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active'))").bind(a.id,owner.version),db.prepare('INSERT INTO p_delegation_authority(proposal_id,revision,owner_id,authorized_at,owner_version) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,owner_id=excluded.owner_id,authorized_at=excluded.authorized_at,owner_version=excluded.owner_version').bind(row.id,row.revision,a.id,at,owner.version),audit(db,a,'signer.delegation.configure',row.id,at)]
}
export async function delegationCommand(env:Bindings,a:Actor,name:string,input:Record<string,unknown>){
 need(a.role==='owner','Only the current owner manages signer delegation',403)
 const db=env.DB,row=await permitted(db,a,input.id,'send');exact(row,input)
 const fact=name==='signer.delegation.undo'?await db.prepare('SELECT * FROM p_signer_delegations WHERE id=? AND proposal_id=? AND revision=? AND undone_at IS NULL').bind(text(input.delegationId,'a delegation'),row.id,row.revision).first<any>():null
 if(name==='signer.delegation.undo')need(fact,'This delegation is no longer the current unsigned signer',409)
 const share=await supported(env,row,fact?.slot_id),at=await currentTime(db),guard=openGuard(row,share,at)
 if(name==='signer.delegation.configure'){
  need([true,false,'yes','no'].includes(input.enabled as any),'Choose whether delegation is enabled')
  const enabled=input.enabled===true||input.enabled==='yes'
  const owner=await db.prepare("SELECT version FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(a.id).first<any>();need(owner,'The current owner authority changed',409)
  guard.sql+=" AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active')";guard.values.push(a.id,owner.version)
  await commit(db,a,[enabled?db.prepare('INSERT INTO p_delegation_authority(proposal_id,revision,owner_id,authorized_at,owner_version) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,owner_id=excluded.owner_id,authorized_at=excluded.authorized_at,owner_version=excluded.owner_version').bind(row.id,row.revision,a.id,at,owner.version):db.prepare('DELETE FROM p_delegation_authority WHERE proposal_id=?').bind(row.id),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),audit(db,a,'signer.delegation.configure',row.id,at)],false,guard)
  return {id:row.id}
 }
 need(name==='signer.delegation.undo','Unknown delegation command',404)
 need(share.delegation_id===fact.id&&fact.new_recipient===share.email,'This delegation is no longer the current unsigned signer',409)
 need(!recipientPlan(row).some(r=>r.id!==share.slot_id&&r.email===fact.old_recipient),'The former mailbox now belongs to another recipient',409)
 const token=secret(),shareUrl=env.AUTH_ORIGIN+'/p/'+token
 guard.sql+=' AND EXISTS(SELECT 1 FROM p_signer_delegations WHERE id=? AND undone_at IS NULL) AND EXISTS(SELECT 1 FROM p_shares WHERE token=? AND delegation_id=?)';guard.values.push(fact.id,share.token,fact.id)
 await commit(db,a,[...rotateSignerInvitation(db,row,share,token,fact.old_recipient,'mailbox code'),db.prepare('UPDATE p_shares SET verification_required=1,embed_origin=NULL WHERE token=?').bind(token),db.prepare('UPDATE p_signer_delegations SET undone_at=?,undone_by=? WHERE id=?').bind(at,a.email,fact.id),audit(db,a,'signer.delegation.undo',row.id,at),...invitationMail(env,a,{},row,fact.old_recipient,shareUrl,at)],false,guard)
 await dispatchMail(env,row.id)
 return {id:row.id,shareUrl}
}
function audit(db:D1Database,a:{id:string;role:string},action:string,id:string,at:number){return db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,action,id,at)}

export async function delegateSigner(env:Bindings,c:any,input:Record<string,unknown>){
 const db=env.DB,{row,share}=c
 need(c.verified,'Verify your mailbox before delegating',401)
 need(Number(input.revision)===row.revision,'This revision changed. Reload before delegating.',409)
 const current=await supported(env,row,share.slot_id);need(current.token===c.token,'This signer invitation changed',409)
 const owner=await db.prepare("SELECT a.owner_id,o.email FROM p_delegation_authority a JOIN oa_operators o ON o.id=a.owner_id WHERE a.proposal_id=? AND a.revision=? AND o.status='active' AND o.role='owner' AND o.version=a.owner_version").bind(row.id,row.revision).first<any>()
 need(owner,'Delegation is off for this proposal',409)
 const recipient=email(input.recipient),delegateName=text(input.delegateName,'the delegate name',200)
 need(recipient!==row.clientEmail.toLowerCase(),'Choose a different delegate')
 need(!recipientPlan(row).some(r=>r.id!==share.slot_id&&r.email===recipient),'Each recipient needs their own mailbox')
 const at=await currentTime(db),token=secret(),shareUrl=env.AUTH_ORIGIN+'/p/'+token,id=crypto.randomUUID(),guard=openGuard(row,share,at)
 guard.sql+=" AND EXISTS(SELECT 1 FROM p_shares WHERE token=? AND session_hash=? AND session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND session_method='mailbox code') AND EXISTS(SELECT 1 FROM p_delegation_authority a JOIN oa_operators o ON o.id=a.owner_id WHERE a.proposal_id=? AND a.revision=? AND a.owner_id=? AND o.status='active' AND o.role='owner' AND o.version=a.owner_version)"
 guard.values.push(c.token,share.session_hash,at,row.id,row.revision,owner.owner_id)
 const actor:Actor={id:owner.owner_id,email:owner.email,role:'owner'}
 try{await db.batch([db.prepare('INSERT INTO p_guard(ok) VALUES(('+guard.sql+'))').bind(...guard.values),...rotateSignerInvitation(db,row,{...share,email:row.clientEmail},token,recipient,'mailbox code'),db.prepare('UPDATE p_shares SET verification_required=1,embed_origin=NULL,delegation_id=? WHERE token=?').bind(id,token),db.prepare('INSERT INTO p_signer_delegations(id,proposal_id,revision,old_recipient,new_recipient,delegate_name,delegated_at,signing_position,required_method,slot_id) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,row.clientEmail,recipient,delegateName,at,share.signing_position,'mailbox code',share.slot_id),audit(db,{id:row.client_id,role:'client'},'signer.delegate',row.id,at),...invitationMail(env,actor,{},row,recipient,shareUrl,at),queueMail(env,row.id,owner.email,'Signer delegation recorded',row.clientEmail+' delegated signing to '+delegateName+' ('+recipient+'). Review or undo before signing: '+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)),db.prepare('DELETE FROM p_guard')])}catch(error){if(/CHECK constraint|UNIQUE constraint|FOREIGN KEY/.test(String(error)))fail('The proposal or delegation authority changed. Reload before continuing.',409);throw error}
 await dispatchMail(env,row.id)
 return {delegated:true,message:'Signing delegated. Your previous invitation is revoked. The delegate must verify their own mailbox.'}
}
