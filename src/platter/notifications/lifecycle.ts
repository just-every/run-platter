import type { Bindings } from '../../auth.server'
import { currentTime } from '../expiry-time'
import { notificationWrite, routeAvailable } from './dispatch'

export const lifecycleNotices:Record<string,string>={
 'proposal.created':'Proposal created',
 'proposal.revised':'Proposal revised',
 'proposal.approved':'Proposal approved',
 'proposal.sent':'Proposal sent',
 'proposal.withdrawn':'Proposal withdrawn',
 'proposal.declined':'Proposal declined',
 'proposal.lost':'Proposal marked lost',
 'proposal.won':'Proposal marked won',
 'proposal.expired':'Proposal expired',
}

export async function queueLifecycleNotices(env:Bindings){
 const db=env.DB,at=await currentTime(db)
 const routes=(await db.prepare("SELECT r.* FROM p_notification_routes r JOIN p_notification_route_authority a ON a.route_id=r.id WHERE r.event!='approval' AND r.lifecycle_events!='[]'").all<any>()).results
 for(const route of routes){
  if(!await routeAvailable(env,route))continue
  const events=(await db.prepare("SELECT e.* FROM p_webhook_events e JOIN p_proposals p ON p.id=e.proposal_id WHERE e.rowid>? AND e.type IN (SELECT value FROM json_each(?)) AND (e.type!='proposal.withdrawn' OR EXISTS(SELECT 1 FROM p_withdrawals w JOIN p_audit a ON a.id=w.id WHERE w.proposal_id=e.proposal_id AND w.revision=e.revision AND w.withdrawn_at=e.occurred_at AND a.action='proposal.withdraw')) ORDER BY e.rowid").bind(route.lifecycle_cursor,route.lifecycle_events).all<any>()).results
  for(const event of events){
   const subject=lifecycleNotices[event.type];if(!subject)continue
   await notificationWrite(env,'lifecycle:'+event.id,event.proposal_id,subject,env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(event.proposal_id),at,null,null,route.id).run()
  }
 }
}
