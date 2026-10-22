import type { Bindings } from '../auth.server'
import { commit, hash, need, fail, type Actor } from './model'
import { sealReplyAddress } from './mail-reply-address'
import { replyDomain, resendReplyAvailable } from './question-reply-mail'
import { authenticatedReply } from './question-replies'

// Consent is per invitation. Only a digest of the private reply address is kept
// here; its encrypted transport copy lives in the excluded outbox.
export async function prepareClientReply(env:Bindings,a:Actor,row:any){
 if(!row.reply_consent||row.reply_to)return row.reply_to
 need(resendReplyAvailable(env),'Email replies are unavailable',409)
 const share=await env.DB.prepare('SELECT token FROM p_shares WHERE proposal_id=? AND revision=?').bind(row.proposal_id,row.proposal_revision).first<any>()
 need(share,'The invitation changed before sending',409)
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),sealed=await sealReplyAddress(env,token+'@'+replyDomain(env)!)
 await commit(env.DB,a,[
  env.DB.prepare('INSERT INTO p_mail_reply_keys(keyhash,mail_id,proposal_id,revision,share_hash,recipient) VALUES(?,?,?,?,?,?)').bind(await hash(token),row.id,row.proposal_id,row.proposal_revision,await hash(share.token),row.recipient),
  env.DB.prepare('UPDATE p_mail SET reply_to=? WHERE id=?').bind(sealed,row.id),
  env.DB.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'mail.reply-enabled',row.proposal_id,Date.now()),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_mail WHERE id=? AND status='sending' AND reply_consent=1 AND reply_to IS NULL) AND EXISTS(SELECT 1 FROM p_shares WHERE proposal_id=? AND token=?)",values:[row.id,row.proposal_id,share.token]})
 return sealed
}

export async function clientMailReplyResponse(request:Request,env:Bindings){
 try{
  const {message,token,email,ignored}=await authenticatedReply(request,env,true)
  if(ignored)return new Response(null,{status:204,headers:{'cache-control':'no-store'}})
  const keyhash=await hash(token),db=env.DB
  const k=await db.prepare("SELECT k.*,p.client_id,p.status,p.revision AS current_revision,s.token AS current_token,m.status AS mail_status FROM p_mail_reply_keys k JOIN p_proposals p ON p.id=k.proposal_id JOIN p_shares s ON s.proposal_id=p.id JOIN p_mail m ON m.id=k.mail_id WHERE k.keyhash=?").bind(keyhash).first<any>()
  need(k&&k.mail_status==='accepted'&&['sent','accepted'].includes(k.status)&&k.current_revision===k.revision&&await hash(k.current_token)===k.share_hash,'This reply address is no longer current',409)
  need(message.from.toLowerCase()===k.recipient.toLowerCase(),'Reply from the invited client mailbox',403)
  const at=Date.now(),id=crypto.randomUUID(),sourceKey=await hash('resend:'+email.id)
  need(!await db.prepare('SELECT id FROM p_mail_replies WHERE source_key=?').bind(sourceKey).first(),'This reply was already recorded',409)
  need(k.used_at===null,'The invitation reply limit has been reached',409)
  // Resend's receiving-server receipt is distinct from sender-controlled headers.
  // Even pass/pass authenticates domains, never the identity of a person.
  const result=(value:unknown)=>typeof value==='string'&&['pass','fail','gray','processing_failed','unknown'].includes(value)?value:'unavailable'
  const spf=result(email.authentication?.spf),dkim=result(email.authentication?.dkim)
  try{await db.batch([
   db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_mail_reply_keys k JOIN p_mail m ON m.id=k.mail_id JOIN p_proposals p ON p.id=k.proposal_id JOIN p_shares s ON s.proposal_id=p.id WHERE k.keyhash=? AND k.used_at IS NULL AND m.status='accepted' AND p.status IN ('sent','accepted') AND p.revision=k.revision AND p.client_id=? AND s.token=? AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)))").bind(keyhash,k.client_id,k.current_token),
   db.prepare('UPDATE p_mail_reply_keys SET used_at=? WHERE keyhash=? AND used_at IS NULL').bind(at,keyhash),
   // The one-reply cap is reached with this record. Tell the owner once, atomically.
   db.prepare('INSERT INTO p_mail_reply_cap_notices(mail_id,proposal_id,revision,created_at) VALUES(?,?,?,?)').bind(k.mail_id,k.proposal_id,k.revision,at),
   db.prepare('INSERT INTO p_mail_replies(id,proposal_id,revision,client_id,client_email,text,received_at,source_key,claimed_from,spf_result,dkim_result) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,k.proposal_id,k.revision,k.client_id,k.recipient,message.text,at,sourceKey,message.from,spf,dkim),
   db.prepare("INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,'email','mail.client-reply',?,?)").bind(id,'email-reply',k.proposal_id,at),
   db.prepare('DELETE FROM p_guard'),
  ])}catch(error){if(/CHECK constraint|UNIQUE constraint/.test(String(error)))fail('This reply is no longer current or was already recorded',409);throw error}
  return Response.json({message:'Reply recorded on the proposal.'},{status:201,headers:{'cache-control':'no-store'}})
 }catch(error){const code=Number((error as any)?.status);return Response.json({error:'Reply refused'},{status:Number.isInteger(code)&&code>=400&&code<=599?code:500,headers:{'cache-control':'no-store'}})}
}
