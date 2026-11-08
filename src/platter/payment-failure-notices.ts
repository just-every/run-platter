import type { Bindings } from '../auth.server'
import { commit, need, type Actor } from './model'
import { permitted } from './permissions'
import { currentTime } from './expiry-time'
import { providerCredential } from './connections'

const reasons:Record<string,string>={card_declined:'The card was declined.',insufficient_funds:'The payment method has insufficient funds.',expired_card:'The card has expired.',incorrect_cvc:'The card security code was incorrect.',processing_error:'The provider could not process the payment.',payment_failed:'The provider reported a failed payment.'}
export const failureReason=(reason:string)=>reasons[reason]??reasons.payment_failed

// A grant is specific to the accepted deposit, current connection, owner and invitation.
// Reconnection, recipient changes and restore never carry this authority forward.
const eligible=`SELECT g.* FROM p_payment_failure_authority g
 JOIN p_proposals p ON p.id=g.proposal_id AND p.revision=g.revision AND p.status='accepted'
 JOIN p_acceptances a ON a.proposal_id=p.id AND a.revision=p.revision AND a.email=g.recipient
 JOIN p_clients c ON c.id=p.client_id AND c.id=g.client_id AND c.email=g.recipient
 JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision AND f.method='mailbox code' AND f.verified_at IS NOT NULL
 JOIN oa_operators o ON o.id=g.owner_id AND o.version=g.owner_version AND o.email=g.firm_email AND o.role='owner' AND o.status='active'
 JOIN p_connections conn ON conn.id='workspace:stripe' AND conn.account_id=g.account_id AND conn.version=g.connection_version AND conn.status='connected' AND conn.broken_at IS NULL
 JOIN p_connection_secrets secret ON secret.connection_id=conn.id
 JOIN p_shares s ON s.proposal_id=p.id AND s.revision=p.revision AND s.token=g.share_token AND s.slot_id='client' AND COALESCE(s.recipient,c.email)=g.recipient
 JOIN p_collection_intents i ON i.id=g.intent_id AND i.proposal_id=p.id AND i.revision=p.revision AND i.account_id=g.account_id AND i.deposit_cents=a.deposit_cents AND i.currency=a.currency AND i.authorized_at IS NOT NULL
 WHERE i.status!='succeeded' AND a.currency='USD'
 AND COALESCE(json_extract(a.snapshot,'$.recipient_plan'),'[]')='[]'
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)
 AND COALESCE((SELECT sum(cents) FROM p_payment_records r WHERE r.proposal_id=p.id AND r.revision=p.revision),0)<a.deposit_cents`

export async function failureNoticeCommand(env:Bindings,actor:Actor,input:Record<string,unknown>){
 need(actor.role==='owner','Only the owner authorizes deposit failure notices',403)
 const db=env.DB,p=await permitted(db,actor,input.id,'send')
 const version=(await db.prepare('SELECT version FROM p_payment_failure_settings WHERE proposal_id=?').bind(p.id).first<{version:number}>())?.version??0
 need(Number(input.version)===version,'Notice settings changed. Reload before continuing.',409)
 const enabled=input.enabled===true||input.enabled==='yes',at=await currentTime(db)
 const writes=[db.prepare('DELETE FROM p_payment_failure_authority WHERE proposal_id=?').bind(p.id)]
 if(enabled){
  need(input.consent===true||input.consent==='yes','Explicitly authorize notices to the current client and owner')
  const {connection}=await providerCredential(env,'workspace:stripe')
  const row=await db.prepare(`SELECT a.*,i.id AS intent_id,i.account_id,i.authorized_at,s.token,c.id AS client_id,c.email AS client_email,o.version AS owner_version,o.email AS firm_email
   FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id AND p.status='accepted' AND p.revision=a.revision
   JOIN p_clients c ON c.id=p.client_id AND c.email=a.email
   JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision AND f.method='mailbox code' AND f.verified_at IS NOT NULL
   JOIN p_collection_intents i ON i.proposal_id=a.proposal_id AND i.revision=a.revision AND i.authorized_at IS NOT NULL AND i.deposit_cents=a.deposit_cents AND i.currency=a.currency AND i.status!='succeeded'
   JOIN p_shares s ON s.proposal_id=p.id AND s.revision=p.revision AND s.slot_id='client' AND COALESCE(s.recipient,c.email)=a.email
   JOIN oa_operators o ON o.id=? AND o.role='owner' AND o.status='active'
   WHERE a.proposal_id=?`).bind(actor.id,p.id).first<any>()
  need(row&&row.currency==='USD'&&row.account_id===connection.account_id&&!connection.broken_at,'Prepare and authorize the current USD deposit before enabling notices',409)
  const content=JSON.parse(row.snapshot)
  need(content.collectionPolicy?.enabled&&!content.recipient_plan?.length&&!content.selection?.tax&&!content.options?.some((o:any)=>o.tax||o.recurrence||o.tables?.some((t:any)=>t.lines?.some((l:any)=>l.recurrence)))&&!content.payment_terms&&!content.paymentSchedule,'Failure notices currently require an ordinary tax-free single-client deposit',409)
  writes.push(db.prepare(`INSERT INTO p_payment_failure_authority VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),p.id,p.revision,row.intent_id,row.account_id,connection.version,actor.id,row.owner_version,row.firm_email,row.client_id,row.email,row.token,at))
 }
 writes.push(db.prepare(`INSERT INTO p_payment_failure_settings VALUES(?,?,1,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,version=version+1,enabled=excluded.enabled,owner_id=excluded.owner_id,changed_at=excluded.changed_at`).bind(p.id,p.revision,enabled?1:0,actor.id,at),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,actor.role,enabled?'payment.failure-notices.authorize':'payment.failure-notices.revoke',p.id,at))
 if(enabled)writes.push(db.prepare(`INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM (${eligible}) WHERE proposal_id=?))`).bind(p.id))
 await commit(db,actor,writes,true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=?) AND COALESCE((SELECT version FROM p_payment_failure_settings WHERE proposal_id=?),0)=?",values:[p.id,p.version,p.revision,p.id,version]})
 return {id:p.id,version:version+1,enabled}
}

/** Accept only an independently identified failed charge from a bound provider read. */
export async function recordPaymentFailure(env:Bindings,saved:any,intent:any){
 const charge=intent.latest_charge,at=await currentTime(env.DB)
 if(intent.status!=='requires_payment_method'||!saved.authorized_at||!charge||typeof charge!=='object'||typeof charge.id!=='string'||! /^[A-Za-z0-9_-]{1,200}$/.test(charge.id)||charge.status!=='failed'||charge.paid!==false||charge.payment_intent!==saved.provider_intent||charge.amount!==saved.cents||charge.currency!==saved.currency.toLowerCase()||!Number.isSafeInteger(charge.created)||charge.created<Math.floor(saved.authorized_at/1000)||charge.created>Math.floor(at/1000))return
 const db=env.DB,g=await db.prepare(`SELECT * FROM (${eligible}) WHERE intent_id=?`).bind(saved.id).first<any>()
 if(!g||charge.created<Math.floor(g.authorized_at/1000))return
 const error=intent.last_payment_error,code=error?.charge===charge.id?error.decline_code??charge.failure_code:charge.failure_code
 const reason=Object.hasOwn(reasons,code)?code:'payment_failed',id=crypto.randomUUID()
 await db.batch([
  db.prepare(`INSERT INTO p_payment_failures SELECT ?,g.proposal_id,g.revision,g.intent_id,g.account_id,?,g.id,?,?,?, ?,? FROM (${eligible}) g WHERE g.id=? ON CONFLICT DO NOTHING`).bind(id,charge.id,saved.cents,saved.currency,reason,charge.created*1000,at,g.id),
  ...['client','firm'].map(party=>db.prepare(`INSERT INTO p_payment_failure_deliveries SELECT lower(hex(randomblob(16))),f.id,?,?,? FROM p_payment_failures f JOIN (${eligible}) g ON g.id=f.authority_id WHERE f.account_id=? AND f.provider_attempt=? ON CONFLICT DO NOTHING`).bind(party,env.AUTH_LOCAL==='true'&&env.RER_DEMO!=='1'?'local':'pending',at,saved.account_id,charge.id)),
  db.prepare(`INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at,sender_id,provider,proposal_revision)
   SELECT d.mail_id,f.proposal_id,CASE d.party WHEN 'client' THEN g.recipient ELSE g.firm_email END,
   'Deposit payment failed',?,d.status,?,g.owner_id,?,f.revision
   FROM p_payment_failure_deliveries d JOIN p_payment_failures f ON f.id=d.failure_id JOIN (${eligible}) g ON g.id=f.authority_id
   WHERE f.account_id=? AND f.provider_attempt=? AND d.status IN ('local','pending') ON CONFLICT DO NOTHING`).bind(`The one-time deposit payment of ${(saved.cents/100).toFixed(2)} ${saved.currency} failed. ${failureReason(reason)}\nNo automatic retry or future charge is authorized. Contact the firm to arrange payment.`,at,env.MAIL_PROVIDER??null,saved.account_id,charge.id),
 ])
}

export async function failureNoticeAuthority(env:Bindings,row:any){
 const delivery=await env.DB.prepare('SELECT d.*,f.* FROM p_payment_failure_deliveries d JOIN p_payment_failures f ON f.id=d.failure_id WHERE d.mail_id=?').bind(row.id).first<any>()
 if(!delivery)return null
 const g=await env.DB.prepare(`SELECT * FROM (${eligible}) WHERE id=?`).bind(delivery.authority_id).first<any>()
 need(g&&row.proposal_id===g.proposal_id&&row.proposal_revision===g.revision&&row.sender_id===g.owner_id&&row.recipient===(delivery.party==='client'?g.recipient:g.firm_email),'Deposit notice authority changed; hold this delivery for review',403)
 return g
}
export function failureDeliveryStatement(env:Bindings,mailId:string,status:string){
 return env.DB.prepare('UPDATE p_payment_failure_deliveries SET status=?,updated_at=? WHERE mail_id=? AND EXISTS(SELECT 1 FROM p_mail WHERE id=? AND status=?)').bind(status,Date.now(),mailId,mailId,status==='withheld'?'uncertain':status)
}
// A stopped worker cannot establish whether the provider accepted its in-flight mail.
// Retain an uncertain receipt once the bounded send could no longer be running.
export async function holdInterruptedFailureNotices(env:Bindings){
 const at=Date.now(),before=at-20*60*1000
 await env.DB.batch([
  env.DB.prepare(`UPDATE p_mail SET status='uncertain',held_reason='delivery_interrupted'
   WHERE status='sending' AND id IN (SELECT mail_id FROM p_payment_failure_deliveries WHERE status='sending' AND updated_at<?)`).bind(before),
  env.DB.prepare(`UPDATE p_payment_failure_deliveries SET status='uncertain',updated_at=?
   WHERE status='sending' AND updated_at<? AND mail_id IN (SELECT id FROM p_mail WHERE status='uncertain' AND held_reason='delivery_interrupted')`).bind(at,before),
 ])
}
export async function failureHistory(db:D1Database,id:string){
 return (await db.prepare(`SELECT f.provider_attempt AS attempt,f.reason,f.attempted_at AS attemptedAt,f.observed_at AS observedAt,
 (SELECT status FROM p_payment_failure_deliveries d WHERE d.failure_id=f.id AND d.party='client') AS clientStatus,
 (SELECT status FROM p_payment_failure_deliveries d WHERE d.failure_id=f.id AND d.party='firm') AS firmStatus
 FROM p_payment_failures f WHERE f.proposal_id=? ORDER BY f.observed_at,f.id`).bind(id).all<any>()).results.map(row=>({...row,reason:failureReason(row.reason)}))
}
export async function failureNoticeSettings(db:D1Database,actor:Actor){
 if(actor.role!=='owner')return []
 return (await db.prepare(`SELECT p.id,p.title,COALESCE(settings.version,0) AS version,EXISTS(SELECT 1 FROM (${eligible}) g WHERE g.proposal_id=p.id) AS authorized FROM p_proposals p LEFT JOIN p_payment_failure_settings settings ON settings.proposal_id=p.id JOIN p_acceptances a ON a.proposal_id=p.id JOIN p_collection_intents i ON i.proposal_id=p.id AND i.revision=p.revision WHERE p.status='accepted' AND a.currency='USD' AND i.authorized_at IS NOT NULL AND i.status!='succeeded'`).all()).results
}
