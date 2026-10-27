import type { Bindings } from '../../auth.server'
import { commit,need,secret,text,type Actor } from '../model'
import { sealCredential,openCredential } from '../connections'
import { recordAudit } from '../audit'
import { eventPayload } from './schema'

function destination(value:unknown){
 const raw=text(value,'an HTTPS webhook URL',2000);let url:URL
 try{url=new URL(raw)}catch{need(false,'Use an HTTPS webhook URL')}
 const host=url.hostname.toLowerCase()
 need(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&(!url.port||url.port==='443')&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)&&!/(^|\.)(localhost|local|internal|test|invalid)$/.test(host),'Use a public HTTPS hostname without credentials or query parameters')
 return url.href
}
export async function webhookCreate(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner configures webhooks',403);need(p.consent===true,'Explicitly authorize lifecycle delivery to this destination')
 const id=crypto.randomUUID(),key=secret(),url=destination(p.url),at=Date.now(),sealed=await sealCredential(env,'webhook:'+id,{key})
 await commit(env.DB,a,[env.DB.prepare('INSERT INTO p_webhooks SELECT ?,id,version,?,?,NULL FROM oa_operators WHERE id=?').bind(id,url,at,a.id),env.DB.prepare('INSERT INTO p_webhook_secrets VALUES(?,?)').bind(id,sealed)],true)
 await recordAudit(env.DB,a,'webhook.create',id)
 return {id,url,secret:key}
}
export async function webhookRevoke(env:Bindings,a:Actor,id:string){
 need(a.role==='owner','Only the owner revokes webhooks',403)
 await commit(env.DB,a,[env.DB.prepare('UPDATE p_webhooks SET revoked_at=? WHERE id=? AND owner_id=?').bind(Date.now(),id,a.id),env.DB.prepare('DELETE FROM p_webhook_secrets WHERE webhook_id=?').bind(id)],true)
 await recordAudit(env.DB,a,'webhook.revoke',id);return {revoked:true}
}
export async function webhookState(env:Bindings){return (await env.DB.prepare('SELECT w.id,w.url,w.created_at AS createdAt,w.revoked_at AS revokedAt,EXISTS(SELECT 1 FROM p_webhook_secrets s WHERE s.webhook_id=w.id) AS connected FROM p_webhooks w ORDER BY w.created_at,w.id').all()).results}
export async function signature(key:string,timestamp:string,body:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(timestamp+'.'+body))),b=>b.toString(16).padStart(2,'0')).join('')}
// The durable event is committed with the state change. Claims prevent simultaneous sends;
// an interrupted request is retried after the lease, with the same event id.
export async function runWebhooks(env:Bindings,at=Date.now()){
 const db=env.DB
 await db.prepare("INSERT OR IGNORE INTO p_webhook_events SELECT 'expired:'||p.id||':'||p.revision||':'||ex.deadline_at,'proposal.expired',p.id,p.revision,'expired',ex.deadline_at FROM p_proposals p JOIN p_expiry ex ON ex.proposal_id=p.id WHERE p.status='sent' AND ex.deadline_at<=? AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)").bind(at).run()
 await db.prepare(`INSERT OR IGNORE INTO p_webhook_deliveries(id,webhook_id,event_id,next_at)
 SELECT lower(hex(randomblob(16))),w.id,e.id,? FROM p_webhooks w JOIN p_webhook_secrets s ON s.webhook_id=w.id JOIN oa_operators o ON o.id=w.owner_id JOIN p_webhook_events e ON e.occurred_at>=w.created_at
 WHERE w.revoked_at IS NULL AND o.role='owner' AND o.status='active' AND o.version=w.owner_version`).bind(at).run()
 const rows=(await db.prepare(`SELECT e.*,d.webhook_id,w.url,s.sealed FROM p_webhook_deliveries d JOIN p_webhook_events e ON e.id=d.event_id JOIN p_webhooks w ON w.id=d.webhook_id JOIN p_webhook_secrets s ON s.webhook_id=w.id JOIN oa_operators o ON o.id=w.owner_id
 WHERE d.status IN ('pending','retry') AND d.next_at<=? AND COALESCE(d.lease_until,0)<=? AND w.revoked_at IS NULL AND o.role='owner' AND o.status='active' AND o.version=w.owner_version ORDER BY d.next_at,d.id LIMIT 20`).bind(at,at).all<any>()).results
 for(const row of rows){
  // Both tables have an id. Resolve the delivery by its unique event and route.
  const delivery=await db.prepare("UPDATE p_webhook_deliveries SET lease_until=?,attempts=attempts+1 WHERE webhook_id=? AND event_id=? AND status IN ('pending','retry') AND next_at<=? AND COALESCE(lease_until,0)<=? AND EXISTS(SELECT 1 FROM p_webhooks live JOIN p_webhook_secrets credential ON credential.webhook_id=live.id JOIN oa_operators owner ON owner.id=live.owner_id WHERE live.id=p_webhook_deliveries.webhook_id AND live.revoked_at IS NULL AND owner.role='owner' AND owner.status='active' AND owner.version=live.owner_version) RETURNING id,attempts").bind(at+60000,row.webhook_id,row.id,at,at).first<any>()
  if(!delivery)continue
  let code:number|null=null,ok=false
  try{
   const {key}=await openCredential(env,'webhook:'+row.webhook_id,row.sealed),body=JSON.stringify(eventPayload(row)),timestamp=String(Math.floor(at/1000))
   const response=await fetch(destination(row.url),{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json','platter-event-id':row.id,'platter-timestamp':timestamp,'platter-signature':'v1='+await signature(key,timestamp,body)},body})
   code=response.status;ok=response.ok;await response.body?.cancel()
  }catch{/* Never retain receiver bodies, transport errors or secret material. */}
  await db.prepare('UPDATE p_webhook_deliveries SET status=?,http_status=?,next_at=?,lease_until=NULL WHERE id=?').bind(ok?'delivered':delivery.attempts>=8?'failed':'retry',code,at+Math.min(86400000,60000*2**(delivery.attempts-1)),delivery.id).run()
 }
}
