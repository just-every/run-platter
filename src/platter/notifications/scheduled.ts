import { queueLifecycleNotices } from './lifecycle'
import { queueWatcherEvents } from './watchers'
import { queueExpiryNotices } from './expiry'
import type { Bindings } from '../../auth.server'
import { currentTime } from '../expiry-time'
import { activeRequest, flushNotifications, notificationWrite, routeAvailable } from './dispatch'

export async function runNotifications(env:Bindings){
 const db=env.DB,at=await currentTime(db)
 const due=(await db.prepare('SELECT r.* FROM p_approval_requests r JOIN p_notification_authority a ON a.request_id=r.id WHERE r.reminded_at IS NULL AND r.remind_at<=?').bind(at).all<any>()).results
 for(const r of due){
  if(!await activeRequest(env,r))continue
  const person=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(r.approver_id).first<any>();if(!person)continue
  const body='Approval is overdue for revision '+r.revision+'\n'+env.AUTH_ORIGIN+'/app/preview?id='+encodeURIComponent(r.proposal_id)+'&revision='+r.revision+'\n'+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(r.proposal_id)
  const routes=(await db.prepare("SELECT r.* FROM p_notification_routes r JOIN p_notification_route_authority a ON a.route_id=r.id WHERE r.event='approval' AND r.operator_id=?").bind(r.approver_id).all<any>()).results
  await db.batch([notificationWrite(env,r.id+':overdue',r.proposal_id,'Approval overdue',body,at,person.email,r.id),...routes.map(route=>notificationWrite(env,r.id+':overdue',r.proposal_id,'Approval overdue',body,at,null,r.id,route.id)),db.prepare('UPDATE p_approval_requests SET reminded_at=? WHERE id=? AND reminded_at IS NULL').bind(at,r.id)])
 }
 const routes=(await db.prepare("SELECT r.* FROM p_notification_routes r JOIN p_notification_route_authority a ON a.route_id=r.id WHERE r.event IN ('signed','followup')").all<any>()).results
 for(const route of routes){
  if(!await routeAvailable(env,route))continue
  const events=route.event==='signed'?(await db.prepare('SELECT proposal_id,proposal_id AS id,accepted_at AS occurred_at FROM p_acceptances WHERE accepted_at>=?').bind(route.created_at).all<any>()).results:(await db.prepare('SELECT proposal_id,id,occurred_at FROM p_followup_actions WHERE occurred_at>=?').bind(route.created_at).all<any>()).results
  for(const event of events){
   // Chat receives a generic event and a session-protected link, never proposal contents.
   await notificationWrite(env,route.event+':'+event.id,event.proposal_id,route.event==='signed'?'Proposal signed':'Follow-up updated',env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(event.proposal_id),at,null,null,route.id).run()
  }
 }
 await queueLifecycleNotices(env)
 await queueWatcherEvents(env)
 await queueExpiryNotices(env)
 await flushNotifications(env)
}
