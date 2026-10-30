import type { Bindings } from '../auth.server'
import { currentTime } from './expiry-time'
import { providerCredential } from './connections'
import { need, fail } from './model'

export async function paypalClient(env:Bindings,c:any){
 need(c.verified,'Verify your mailbox before paying',401)
 const accepted=await env.DB.prepare(`SELECT a.* FROM p_acceptances a
 JOIN p_proposals p ON p.id=a.proposal_id AND p.revision=a.revision AND p.status='accepted'
 JOIN p_clients client ON client.id=p.client_id AND client.email=a.email
 JOIN p_shares s ON s.proposal_id=p.id AND s.revision=p.revision
 JOIN p_signature_facts f ON f.proposal_id=p.id AND f.revision=p.revision
 WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND f.method='mailbox code' AND f.verified_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)`)
 .bind(c.token,c.share.session_hash,await currentTime(env.DB)).first<any>()
 need(accepted,'Sign this current mailbox-verified agreement before paying',409)
 const frozen=JSON.parse(accepted.snapshot),policy=frozen.collectionPolicy
 need(policy?.enabled&&policy.provider==='paypal'&&accepted.deposit_cents>0&&accepted.currency==='USD','This agreement has no PayPal USD deposit',409)
 need(!frozen.recipient_plan?.length&&!frozen.payment_terms&&!frozen.paymentSchedule&&!frozen.selection?.tax,'PayPal currently supports tax-free one-off agreements with one client',409)
 return {accepted,policy}
}

// No restored grant or old invitation may authorize a provider request or payment write.
export function paypalGuard(deposit:any,now:number){
 return {sql:`EXISTS(SELECT 1 FROM p_paypal_authority g
 JOIN p_connections connection ON connection.id='workspace:paypal' AND connection.status='connected'
 JOIN p_connection_secrets secret ON secret.connection_id=connection.id
 JOIN oa_operators actor ON actor.id=g.actor_id AND actor.version=g.actor_version AND actor.status='active'
 LEFT JOIN p_members member ON member.operator_id=actor.id
 JOIN p_acceptances a ON a.proposal_id=g.proposal_id
 JOIN p_proposals p ON p.id=a.proposal_id AND p.revision=a.revision AND p.status='accepted'
 JOIN p_clients client ON client.id=p.client_id AND client.email=a.email
 JOIN p_paypal_transport transport ON transport.deposit_id=?
 JOIN p_shares share ON share.token=transport.share_token AND share.session_hash=transport.session_hash AND share.proposal_id=p.id AND share.revision=p.revision AND share.session_expires>?
 WHERE g.proposal_id=? AND a.revision=? AND a.deposit_cents=? AND a.currency='USD'
 AND g.merchant_id=? AND g.connection_version=? AND connection.account_id=g.merchant_id AND connection.version=g.connection_version
 AND CASE WHEN actor.role='owner' THEN 'owner' WHEN actor.role='admin' THEN 'admin' ELSE COALESCE(member.role,'sales') END=g.actor_role
 AND g.actor_role IN ('owner','admin') AND COALESCE(member.version,0)=g.member_version
 AND json_extract(a.snapshot,'$.collectionPolicy.provider')='paypal'
 AND json_extract(a.snapshot,'$.collectionPolicy.merchantId')=g.merchant_id
 AND json_extract(a.snapshot,'$.collectionPolicy.connectionVersion')=g.connection_version
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision))`,values:[deposit.id,now,deposit.proposal_id,deposit.revision,deposit.cents,deposit.merchant_id,deposit.connection_version]}
}
export async function paypalLive(env:Bindings,deposit:any){
 const guard=paypalGuard(deposit,await currentTime(env.DB))
 need(await env.DB.prepare('SELECT 1 WHERE '+guard.sql).bind(...guard.values).first(),'PayPal authority, invitation or merchant connection changed. Reconciliation is required.',409)
 const {connection,secret}=await providerCredential(env,'workspace:paypal')
 need(connection.account_id===deposit.merchant_id&&connection.version===deposit.connection_version,'The PayPal merchant connection changed',409)
 return {secret,guard}
}
export const paypalBinding=(deposit:any)=>({orderId:deposit.order_id??undefined,referenceId:deposit.id,merchantId:deposit.merchant_id,cents:deposit.cents,currency:deposit.currency})
export async function paypalWrite(env:Bindings,deposit:any,writes:D1PreparedStatement[]){
 const {guard}=await paypalLive(env,deposit)
 try{await env.DB.batch([env.DB.prepare('INSERT INTO p_guard(ok) VALUES(('+guard.sql+'))').bind(...guard.values),...writes,env.DB.prepare('DELETE FROM p_guard')])}catch(error){if(/CHECK constraint|UNIQUE constraint|FOREIGN KEY/.test(String(error)))fail('The PayPal request is already claimed or its authority changed',409);throw error}
}
