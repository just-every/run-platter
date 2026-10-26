import { activeWatcher } from './watchers'
import type { Bindings } from '../../auth.server'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import { operatorMail } from '../../mail.server.mjs'
import { capturesMail } from '../mail'
import { providerCredential } from '../connections'
import { actorById } from '../credentials'
import { approvalPlan } from '../approvals'
import { permitted } from '../permissions'
import { negotiatedView, pendingNegotiation } from '../negotiation'
import { need } from '../model'

export async function activeRequest(env:Bindings,r:any) {
 const a=await actorById(env.DB,r.approver_id),requester=await actorById(env.DB,r.requester_id)
 if(!a||!requester)return false
 try{
  const original=await permitted(env.DB,requester,r.proposal_id,'send')
  if(!['draft','approved','sent'].includes(original.status))return false
  const row=negotiatedView(original,await pendingNegotiation(env.DB,original.id))
  if(row.revision!==r.revision)return false
  const plan=await approvalPlan(env.DB,row,a)
  return plan.plan===r.plan&&plan.steps.some(s=>s.id===r.step&&s.canApprove)
 }catch{return false}
}
export async function chatJson(url:string,token:string,body?:unknown) {
 const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual'})
 need(response.ok,'Chat provider refused the request',409)
 const raw=await response.text();need(raw.length<=262144,'Chat provider response too large',409)
 const value=JSON.parse(raw);need(value&&value.ok!==false,'Chat provider refused the request',409);return value
}
export async function routeAvailable(env:Bindings,r:any) {
 return Boolean(await env.DB.prepare("SELECT 1 FROM p_notification_route_authority a JOIN p_connections c ON c.id=? WHERE a.route_id=? AND c.status='connected' AND c.version=? AND c.broken_at IS NULL AND EXISTS(SELECT 1 FROM p_connection_secrets s WHERE s.connection_id=c.id) AND EXISTS(SELECT 1 FROM p_notification_routes r WHERE r.id=a.route_id AND (r.operator_id IS NULL OR EXISTS(SELECT 1 FROM oa_operators o WHERE o.id=r.operator_id AND o.status='active' AND o.email=r.recipient_email)))").bind('workspace:'+r.provider,r.id,r.connection_version).first())
}
export async function flushNotifications(env:Bindings) {
 const db=env.DB,rows=(await db.prepare("SELECT * FROM p_notification_outbox WHERE status='pending' ORDER BY created_at,id LIMIT 100").all<any>()).results
 for(const row of rows){
  const allowed=async()=>{
   if(row.event_key.startsWith('collab:')){const { activeCollaboration }=await import('../collaboration');if(!await activeCollaboration(env,row))return false}
   if(row.watcher_id&&!await activeWatcher(env,row))return false
   if(row.event_key.startsWith('expiry:')){const { activeExpiryNotice }=await import('./expiry');if(!await activeExpiryNotice(env,row))return false}
   if(row.request_id){const r=await db.prepare('SELECT r.* FROM p_approval_requests r JOIN p_notification_authority a ON a.request_id=r.id WHERE r.id=?').bind(row.request_id).first<any>();if(!r||!await activeRequest(env,r))return false;if(row.recipient){const person=await actorById(db,r.approver_id);if(person?.email!==row.recipient)return false}}
   if(row.route_id){const r=await db.prepare('SELECT * FROM p_notification_routes WHERE id=?').bind(row.route_id).first<any>();if(!r||!await routeAvailable(env,r))return false;if(r.kind==='direct'){const person=await actorById(db,r.operator_id);if(!person)return false;try{await permitted(db,person,row.proposal_id)}catch{return false}}}
   return true
  }
  if(!await allowed()){await db.prepare("UPDATE p_notification_outbox SET status='withheld' WHERE id=? AND status='pending'").bind(row.id).run();continue}
  const claimed=await db.prepare("UPDATE p_notification_outbox SET status='sending' WHERE id=? AND status='pending'").bind(row.id).run();if(!claimed.meta.changes)continue
  try{
   if(capturesMail(env)){await db.prepare("UPDATE p_notification_outbox SET status='local' WHERE id=?").bind(row.id).run();continue}
   if(row.route_id){
    const r=await db.prepare('SELECT * FROM p_notification_routes WHERE id=?').bind(row.route_id).first<any>(),{secret}=await providerCredential(env,'workspace:'+r.provider)
    let destination=r.destination
    if(r.provider==='slack'&&r.kind==='direct')destination=(await chatJson('https://slack.com/api/conversations.open',secret.token,{users:r.destination})).channel?.id
    need(destination,'The direct conversation is unavailable',409)
    if(!await allowed()){await db.prepare("UPDATE p_notification_outbox SET status='withheld' WHERE id=?").bind(row.id).run();continue}
    await demoEffect(()=>r.provider==='slack'?chatJson('https://slack.com/api/chat.postMessage',secret.token,{channel:destination,text:row.subject+'\n'+row.body,unfurl_links:false,unfurl_media:false}):chatJson('https://graph.microsoft.com/v1.0/chats/'+encodeURIComponent(destination)+'/messages',secret.token,{body:{contentType:'text',content:row.subject+'\n'+row.body}}),()=>({}))
   }else{
    const mail=operatorMail(env);need(mail,'Configure installation mail before sending notifications',409)
    if(!await allowed()){await db.prepare("UPDATE p_notification_outbox SET status='withheld' WHERE id=?").bind(row.id).run();continue}
    const receipt=await demoEffect(()=>mail.send({from:env.MAIL_FROM!,to:[row.recipient],deliveryId:row.id,subject:row.subject,text:row.body,html:row.body.replace(/[&<>]/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)),headers:{}}),()=>({status:'accepted'}))
    need(receipt.status==='accepted','Mail delivery is uncertain',409)
   }
   await db.prepare("UPDATE p_notification_outbox SET status='sent' WHERE id=?").bind(row.id).run()
  }catch{await db.prepare("UPDATE p_notification_outbox SET status='uncertain' WHERE id=?").bind(row.id).run()}
 }
}
export function notificationWrite(env:Bindings,key:string,id:string,subject:string,body:string,at:number,recipient:string|null=null,request:string|null=null,route:string|null=null){
 return env.DB.prepare("INSERT INTO p_notification_outbox(id,event_key,proposal_id,subject,body,created_at,recipient,request_id,route_id,status) VALUES(?,?,?,?,?,?,?,?,?,'pending') ON CONFLICT DO NOTHING").bind(crypto.randomUUID(),key,id,subject,body,at,recipient,request,route)
}
