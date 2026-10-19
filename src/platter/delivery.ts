import type { Bindings } from '../auth.server'
import { deliveryIntake } from './delivery-intake.mjs'
import { commit, email, need, proposal, secret, text, type Actor } from './model'
import { dispatchMail, proposalMail, queueMail } from './mail'

export async function deliveryWebhook(request: Request, env: Bindings) {
 need(request.method === 'POST', 'Use POST', 405)
 need(['resend','sendgrid'].includes(env.MAIL_PROVIDER ?? '') && env.MAIL_WEBHOOK_KEY, 'Delivery events unavailable with this mail transport', 503)
 const reader = request.body?.getReader(), chunks: Uint8Array[] = []
 let size = 0
 if (reader) try {
  while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; need(size <= 1024 * 1024, 'Event too large', 413); chunks.push(chunk.value) }
 } finally { await reader.cancel() }
 const rawBody = new Uint8Array(size)
 let offset = 0; for (const chunk of chunks) { rawBody.set(chunk, offset); offset += chunk.length }
 try { await deliveryIntake(env).ingestWebhook({ rawBody, headers: request.headers }) }
 catch (error) {
  const code = (error as any).code
  need(false, 'Delivery event refused', code === 'event_storage_failed' ? 503 : code === 'event_identity_conflict' ? 409 : 400)
 }
 return Response.json({ received: true }, { headers: { 'cache-control': 'no-store' } })
}

export async function deliveryState(env: Bindings, actor: Actor) {
 const deliveries = (await env.DB.prepare(`SELECT id,proposal_id,recipient,provider,created_at,status,event_at FROM (
 SELECT m.id,m.proposal_id,m.recipient,m.provider,m.created_at,COALESCE(s.status,m.status) AS status,s.occurred_at AS event_at,
 ROW_NUMBER() OVER(PARTITION BY m.id ORDER BY s.terminal DESC,s.occurred_at DESC) AS rank FROM p_mail m
 LEFT JOIN p_delivery_events e ON e.mail_id=m.id
 LEFT JOIN rer_mail_event_states s ON s.provider=e.provider AND s.tenant_id=? AND s.event_namespace='platter-mail-v1'
 AND s.provider_message_id=e.provider_message_id AND s.recipient=e.recipient
 WHERE m.sender_id IS NOT NULL) WHERE rank=1 ORDER BY created_at DESC,id`).bind(env.AUTH_ORIGIN).all<any>()).results
 const bounceNotices = actor.role === 'owner' ? (await env.DB.prepare(`SELECT n.*,p.title
 FROM p_bounce_notices n JOIN p_proposals p ON p.id=n.proposal_id
 WHERE n.sender_id=? ORDER BY n.created_at,n.id`).bind(actor.id).all<any>()).results : []
 return { deliveries, bounceNotices }
}

export async function deliveryCommand(env: Bindings, actor: Actor, name: string, input: Record<string,unknown>) {
 need(actor.role === 'owner', 'Only the sending owner manages bounce follow-ups', 403)
 const db=env.DB, noticeId=text(input.noticeId,'a notice'), at=Date.now()
 const notice=await db.prepare(`SELECT n.* FROM p_bounce_notices n WHERE n.id=? AND n.sender_id=?`).bind(noticeId,actor.id).first<any>()
 need(notice,'Bounce notification not found',404)
 if(name==='delivery.read') {
  await commit(db,actor,[db.prepare('UPDATE p_bounce_notices SET read_at=COALESCE(read_at,?) WHERE id=?').bind(at,noticeId)],true)
  return {id:notice.proposal_id,read:true}
 }
 need(!notice.closed_at,'This follow-up is already closed',409)
 if(name==='delivery.dismiss') {
  const reason=text(input.reason,'a reason',1000)
  await commit(db,actor,[db.prepare('UPDATE p_bounce_notices SET closed_at=?,action=? WHERE id=?').bind(at,'Dismissed: '+reason,noticeId)],true)
  return {id:notice.proposal_id,dismissed:true}
 }
 need(name==='delivery.correct','Unknown delivery action',404)
 const recipient=email(input.email), old=await proposal(db,notice.proposal_id)
 need(old.status==='sent','Only an unsigned sent offer can have its invitation corrected',409)
 const token=secret(), shareUrl=env.AUTH_ORIGIN+'/p/'+token
 const statement=queueMail(env,old.id,recipient,...proposalMail(old.title,shareUrl),actor.id)
 await commit(db,actor,[
  db.prepare("UPDATE p_proposals SET version=version+1 WHERE id=?").bind(old.id),
  db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(old.id),
  db.prepare('INSERT INTO p_shares(proposal_id,revision,token,recipient) VALUES(?,?,?,?)').bind(old.id,old.revision,token,recipient),
  statement,
  db.prepare("INSERT INTO p_bounce_notice_transport(notice_id,correction_mail_id) VALUES(?,(SELECT id FROM p_mail WHERE proposal_id=? AND sender_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1)) ON CONFLICT(notice_id) DO UPDATE SET correction_mail_id=excluded.correction_mail_id").bind(noticeId,old.id,actor.id),
  db.prepare('UPDATE p_bounce_notices SET action=? WHERE id=?').bind('Corrected invitation address to '+recipient,noticeId),
 ],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='sent') AND EXISTS(SELECT 1 FROM p_bounce_notices WHERE id=? AND sender_id=? AND closed_at IS NULL)",values:[old.id,old.version,noticeId,actor.id]})
 await dispatchMail(env,old.id)
 return {id:old.id,shareUrl}
}
