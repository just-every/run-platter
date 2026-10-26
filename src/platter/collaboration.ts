import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { documentOf } from './documents/blocks'
import { currentTime } from './expiry-time'
import { authority, commit, exact, need, text, type Actor } from './model'
import { administrators, permitted, scope } from './permissions'
import { flushNotifications, notificationWrite, routeAvailable } from './notifications/dispatch'

export function collaborationBlocks(row:any){return [{id:'scope',title:'Scope'},{id:'pricing',title:'Pricing table'},{id:'terms',title:'Terms'},...documentOf(row).blocks.map(b=>({id:'block:'+b.id,title:b.title||b.type}))]}
export async function collaborationStates(db:D1Database,a:Actor,ids:Set<string>){
 const states=new Map<string,{people:{id:string;name:string}[];threads:any[]}>()
 if(a.role==='agent')return states
 for(const id of ids)states.set(id,{people:[],threads:[]})
 for(const row of (await db.prepare("SELECT id,display_name,email FROM oa_operators WHERE status='active' ORDER BY display_name,id").all<any>()).results){
  const person=await actorById(db,row.id);if(!person)continue
  const visibility=scope(person,'view')
  for(const proposal of (await db.prepare('SELECT p.id FROM p_proposals p WHERE '+visibility.sql).bind(...visibility.values).all<any>()).results)states.get(proposal.id)?.people.push({id:row.id,name:row.display_name||row.email})
 }
 const threads=(await db.prepare('SELECT t.*,a.display_name AS author_name,r.display_name AS recipient_name FROM p_internal_threads t JOIN oa_operators a ON a.id=t.author_id LEFT JOIN oa_operators r ON r.id=t.recipient_id ORDER BY t.created_at,t.id').all<any>()).results
 for(const thread of threads)states.get(thread.proposal_id)?.threads.push(thread)
 return states
}
export async function activeCollaboration(env:Bindings,out:any){
 const e=await env.DB.prepare('SELECT e.*,t.resolved_at FROM p_collaboration_events e JOIN p_collaboration_authority c ON c.event_id=e.id JOIN p_internal_threads t ON t.id=e.thread_id WHERE e.id=?').bind(out.event_key.slice(7)).first<any>()
 if(!e||e.resolved_at)return false
 const actor=await actorById(env.DB,e.actor_id),person=await actorById(env.DB,e.recipient_id)
 if(!actor||!person)return false
 try{const row=await permitted(env.DB,actor,e.proposal_id);await permitted(env.DB,person,e.proposal_id);return row.revision===e.revision&&(!out.recipient||out.recipient===person.email)&&(!out.route_id||Boolean(await env.DB.prepare('SELECT 1 FROM p_collaboration_routes WHERE route_id=?').bind(out.route_id).first()))}catch{return false}
}
export async function collaborationCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db);need(a.role!=='agent','A member session is required',403)
 if(name==='collaboration.route'){
  need(administrators.includes(a.role),'Only owner and admins authorize chat destinations',403)
  const route=await db.prepare('SELECT * FROM p_notification_routes WHERE id=?').bind(text(p.routeId,'a verified route')).first<any>()
  need(route&&await routeAvailable(env,route),'Choose a connected, consented notification route',409)
  need(p.consent===true||p.consent==='yes','Explicitly consent to internal collaboration notices')
  await commit(db,a,[db.prepare('INSERT INTO p_collaboration_routes(route_id,configured_by,created_at) VALUES(?,?,?) ON CONFLICT(route_id) DO UPDATE SET configured_by=excluded.configured_by,created_at=excluded.created_at').bind(route.id,a.id,at)],false,{sql:'EXISTS(SELECT 1 FROM p_notification_route_authority WHERE route_id=?)',values:[route.id]})
  return {id:route.id}
 }
 const row=await permitted(db,a,p.id);exact(row,p)
 const guard={sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[row.id,row.version] as any[]}
 if(name==='collaboration.resolve'){
  const thread=await db.prepare('SELECT * FROM p_internal_threads WHERE id=? AND proposal_id=?').bind(text(p.threadId,'a thread'),row.id).first<any>()
  need(thread,'Thread not found',404);need(thread.version===Number(p.threadVersion)&&!thread.resolved_at,'This thread changed. Reload before resolving.',409)
  guard.sql+=' AND EXISTS(SELECT 1 FROM p_internal_threads WHERE id=? AND version=? AND resolved_at IS NULL)';guard.values.push(thread.id,thread.version)
  await commit(db,a,[db.prepare('UPDATE p_internal_threads SET resolved_at=?,resolved_by=?,version=version+1 WHERE id=?').bind(at,a.id,thread.id)],false,guard)
  return {id:row.id}
 }
 need(name==='collaboration.comment'||name==='collaboration.assign','Unknown collaboration command',404)
 const blockId=text(p.blockId,'a block'),block=collaborationBlocks(row).find(b=>b.id===blockId);need(block,'Choose a current block')
 const assignment=name==='collaboration.assign',body=assignment?'Section assignment':text(p.text,'an internal comment',10000)
 const recipientId=p.recipientId?text(p.recipientId,'a member'):null
 need(!assignment||recipientId,'Choose an assignee')
 let due:string|null=null
 if(assignment){due=text(p.dueDate,'a due date');need(/^\d{4}-\d{2}-\d{2}$/.test(due)&&Number.isFinite(Date.parse(due+'T12:00:00Z'))&&new Date(due+'T12:00:00Z').toISOString().slice(0,10)===due,'Choose a valid due date')}
 const person=recipientId?await actorById(db,recipientId):null
 if(recipientId){need(person,'Choose an active member');await permitted(db,person,row.id);guard.sql+=' AND ('+person.permission!.sql+')';guard.values.push(...person.permission!.values)}
 const id=crypto.randomUUID(),writes=[db.prepare('INSERT INTO p_internal_threads(id,proposal_id,revision,block_id,block_title,kind,text,author_id,recipient_id,due_date,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,blockId,block.title,assignment?'assignment':'comment',body,a.id,recipientId,due,at)]
 if(person){
  writes.push(authority(db,person))
  need(p.consent===true||p.consent==='yes','Explicitly authorize email and configured chat notices')
  guard.sql+=" AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND email=? AND status='active')";guard.values.push(person.id,person.email)
  const event=crypto.randomUUID(),subject=assignment?'Section assigned':'Internal mention',notice='A member '+(assignment?'assigned you a section.':'mentioned you in an internal comment.')+'\nOpen under your member session: '+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)
  writes.push(db.prepare('INSERT INTO p_collaboration_events(id,thread_id,proposal_id,revision,actor_id,recipient_id,created_at) VALUES(?,?,?,?,?,?,?)').bind(event,id,row.id,row.revision,a.id,person.id,at),db.prepare('INSERT INTO p_collaboration_authority(event_id) VALUES(?)').bind(event),notificationWrite(env,'collab:'+event,row.id,subject,notice,at,person.email))
  const routes=(await db.prepare('SELECT r.* FROM p_notification_routes r JOIN p_collaboration_routes c ON c.route_id=r.id WHERE r.operator_id IS NULL OR r.operator_id=?').bind(person.id).all<any>()).results
  for(const route of routes)writes.push(notificationWrite(env,'collab:'+event,row.id,subject,notice,at,null,null,route.id))
 }
 await commit(db,a,writes,false,guard);await flushNotifications(env)
 return {id:row.id,threadId:id}
}
