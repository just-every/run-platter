import { lifecycleNotices } from './lifecycle'
import { watchCommand } from './watchers'
import { senderNoticeCommand } from './expiry'
import type { Bindings } from '../../auth.server'
import { approvalCommand, approvalPlan } from '../approvals'
import { actorById } from '../credentials'
import { providerCredential } from '../connections'
import { currentTime } from '../expiry-time'
import { commit, exact, need, text, type Actor } from '../model'
import { negotiatedView, pendingNegotiation } from '../negotiation'
import { administrators, permitted, senders } from '../permissions'
import { activeRequest, chatJson, flushNotifications, notificationWrite, routeAvailable } from './dispatch'

export async function notificationSettingsState(env:Bindings,a:Actor){
 if(!administrators.includes(a.role))return undefined
 const routes=(await env.DB.prepare('SELECT r.*,o.display_name AS recipient_name,EXISTS(SELECT 1 FROM p_notification_route_authority auth WHERE auth.route_id=r.id) AS consented FROM p_notification_routes r LEFT JOIN oa_operators o ON o.id=r.operator_id ORDER BY r.created_at,r.id').all<any>()).results
 return {routes:await Promise.all(routes.map(async r=>({...r,consented:Boolean(r.consented),available:await routeAvailable(env,r)})))}
}

export async function requestRows(env:Bindings,a:Actor,id:string){
 await permitted(env.DB,a,id)
 return (await env.DB.prepare('SELECT r.*,o.display_name AS approver_name,o.email AS approver_email FROM p_approval_requests r JOIN oa_operators o ON o.id=r.approver_id WHERE r.proposal_id=? AND (r.requester_id=? OR r.approver_id=? OR ?=1) ORDER BY r.requested_at,r.id').bind(id,a.id,a.id,administrators.includes(a.role)?1:0).all<any>()).results
}
export async function notificationCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db)
 if(name==='notification.watch')return watchCommand(env,a,p)
 if(name==='notification.defaults'||name==='notification.expiry')return senderNoticeCommand(env,a,name,p)
 if(name==='notification.route'){
  need(administrators.includes(a.role),'Only owner and admins route chat notifications',403)
  need(p.consent===true||p.consent==='yes','Explicitly authorize this notification destination')
  const provider=String(p.provider),event=String(p.event),kind=String(p.kind)
  need(['slack','teams'].includes(provider)&&['approval','signed','followup'].includes(event),'Choose a supported notification route')
  need(['channel','direct'].includes(kind)&&(provider!=='teams'||kind==='direct'),'Teams currently supports verified direct chats')
  need(event!=='approval'||kind==='direct','Approval requests require a verified direct recipient')
  const lifecycle=p.lifecycleEvents??Object.keys(p).filter(key=>key.startsWith('lifecycle:')&&p[key]==='yes').map(key=>key.slice(10))
  need(Array.isArray(lifecycle)&&lifecycle.length<=9&&lifecycle.every(event=>typeof event==='string'&&Object.hasOwn(lifecycleNotices,event))&&new Set(lifecycle).size===lifecycle.length,'Choose supported additional proposal events')
  need(event!=='approval'||lifecycle.length===0,'Approval routes carry only private approval requests')
  const destination=text(p.destination,'a provider destination',200);need(/^[A-Za-z0-9_:@.\-]+$/.test(destination),'Use a provider destination identifier')
  const {connection,secret}=await providerCredential(env,'workspace:'+provider)
  need(!connection.broken_at,'Reconnect this provider before authorizing a destination',409)
  let operatorId:string|null=null,recipientEmail:string|null=null
  if(kind==='direct'){
   const person=await actorById(db,text(p.operatorId,'a notification recipient'));need(person,'Choose an active person');operatorId=person.id;recipientEmail=person.email
   if(provider==='slack'){const result=await chatJson('https://slack.com/api/users.info?user='+encodeURIComponent(destination),secret.token);need(!result.user?.deleted&&result.user?.team_id===connection.account_id&&result.user?.profile?.email?.toLowerCase()===person.email.toLowerCase(),'The Slack user must match the active member')}
   else {const result=await chatJson('https://graph.microsoft.com/v1.0/chats/'+encodeURIComponent(destination)+'?$expand=members',secret.token);need(result.chatType==='oneOnOne'&&result.members?.some((m:any)=>m.email?.toLowerCase()===person.email.toLowerCase())&&result.members?.some((m:any)=>m.userId===connection.account_id),'The Teams chat must include the connected user and active member')}
  }else {const result=await chatJson('https://slack.com/api/conversations.info?channel='+encodeURIComponent(destination),secret.token);need(result.channel?.id===destination&&result.channel?.is_member===true&&!result.channel?.is_archived,'Connect a joined active Slack channel')}
  const id=crypto.randomUUID(),cursor=(await db.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM p_webhook_events').first<{n:number}>())!.n
  await commit(db,a,[db.prepare('INSERT INTO p_notification_routes(id,event,provider,kind,destination,operator_id,recipient_email,connection_version,configured_by,created_at,lifecycle_events,lifecycle_cursor) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,event,provider,kind,destination,operatorId,recipientEmail,connection.version,a.id,at,JSON.stringify(lifecycle),cursor),db.prepare('INSERT INTO p_notification_route_authority(route_id) VALUES(?)').bind(id)],false,{sql:"EXISTS(SELECT 1 FROM p_connections WHERE id=? AND version=? AND status='connected' AND broken_at IS NULL)"+(operatorId?" AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND email=? AND status='active')":''),values:[connection.id,connection.version,...(operatorId?[operatorId,recipientEmail]:[])]})
  return {id}
 }
 if(name==='notification.route.remove'){
  need(administrators.includes(a.role),'Only owner and admins remove notification routes',403)
  const id=text(p.id,'a notification route');need(await db.prepare('SELECT id FROM p_notification_routes WHERE id=?').bind(id).first(),'Notification route not found',404)
  await commit(db,a,[db.prepare('DELETE FROM p_notification_route_authority WHERE route_id=?').bind(id)]);return {id}
 }
 if(name==='notification.requests')return {requests:await requestRows(env,a,text(p.id,'a proposal'))}
 if(name==='notification.decide'){
  const r=await db.prepare('SELECT * FROM p_approval_requests WHERE id=?').bind(text(p.requestId,'an approval request')).first<any>()
  need(r&&r.approver_id===a.id,'This approval request does not name you',403)
  need(await activeRequest(env,r),'This approval request is no longer current',409)
  need(['approved','rejected'].includes(String(p.decision)),'Approve or reject the revision')
  const row=await permitted(db,a,r.proposal_id,'approve')
  return {id:row.id,...await approvalCommand(env,a,p.decision==='approved'?'proposal.approve':'proposal.reject',{id:row.id,version:p.version,revision:r.revision,step:r.step,note:text(p.note,'a decision note',2000)})}
 }
 need(name==='notification.request','Unknown notification command',404)
 need(senders.includes(a.role),'Only proposal senders request approval',403)
 need(p.consent===true||p.consent==='yes','Explicitly authorize notifying the pending approvers')
 const original=await permitted(db,a,p.id,'send');exact(original,p)
 const row=negotiatedView(original,await pendingNegotiation(db,original.id))
 need(['draft','approved'].includes(row.status)||Boolean(row.negotiating),'Request approval of an unsent revision',409)
 const delay=Number(p.reminderDays??1);need(Number.isInteger(delay)&&delay>=1&&delay<=30,'Choose a reminder delay from 1 to 30 days')
 const plan=await approvalPlan(db,row,a);need(plan.required&&!plan.complete&&!plan.rejected,'No approval is awaiting a request',409)
 const people=(await db.prepare("SELECT id FROM oa_operators WHERE status='active'").all<any>()).results,writes:D1PreparedStatement[]=[],requests:string[]=[]
 for(const person of people){
  const approver=await actorById(db,person.id);if(!approver)continue
  const eligible=await approvalPlan(db,row,approver)
  for(const step of eligible.steps.filter(s=>s.canApprove)){
   const prior=await db.prepare('SELECT id FROM p_approval_requests WHERE proposal_id=? AND revision=? AND plan=? AND step=? AND approver_id=?').bind(row.id,row.revision,plan.plan,step.id,approver.id).first<any>()
   if(prior){requests.push(prior.id);continue}
   const id=crypto.randomUUID(),preview=env.AUTH_ORIGIN+'/app/preview?id='+encodeURIComponent(row.id)+'&revision='+row.revision
   const body='Approval required: '+step.name+'\nRevision '+row.revision+'\nPreview: '+preview+'\nReview and decide: '+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)+'\nA signed-in approver must explicitly approve or reject with a note. Request id: '+id
   requests.push(id)
   writes.push(db.prepare('INSERT INTO p_approval_requests(id,proposal_id,revision,plan,step,approver_id,requester_id,requested_at,remind_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,plan.plan,step.id,approver.id,a.id,at,at+delay*86400000),db.prepare('INSERT INTO p_notification_authority(request_id) VALUES(?)').bind(id),notificationWrite(env,id,row.id,'Approval requested',body,at,approver.email,id))
   const routes=(await db.prepare("SELECT r.* FROM p_notification_routes r JOIN p_notification_route_authority a ON a.route_id=r.id WHERE r.event='approval' AND r.operator_id=?").bind(approver.id).all<any>()).results
   for(const route of routes)writes.push(notificationWrite(env,id,row.id,'Approval requested',body,at,null,id,route.id))
  }
 }
 need(requests.length,'No currently eligible approver can receive this request',409)
 await commit(db,a,writes,false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?',values:[original.id,original.version,plan.policyVersion]})
 await flushNotifications(env)
 return {id:row.id,requests}
}
