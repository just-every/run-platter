import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { currentTime } from '../expiry-time'
import { commit, need, text, type Actor } from '../model'
import { permitted } from '../permissions'
import { routeAvailable } from './dispatch'

const sources={view:{table:'p_audit',id:'id',proposal:'subject',filter:"action='proposal.view' AND actor_role IN ('client','invitation')"},comment:{table:'p_questions',id:'id',proposal:'proposal_id',filter:'1'},signed:{table:'p_acceptances',id:'proposal_id',proposal:'proposal_id',filter:'1'},paid:{table:'p_payment_records',id:'id',proposal:'proposal_id',filter:'1'}} as const
async function ownerViewConsent(db:D1Database,id:string,revision:number){
 return await db.prepare("SELECT w.cursors FROM p_watchers w JOIN p_watcher_authority a ON a.watcher_id=w.id AND a.version=w.version JOIN oa_operators o ON o.id=w.operator_id WHERE w.proposal_id=? AND w.revision=? AND o.role='owner' AND o.status='active' AND EXISTS(SELECT 1 FROM json_each(w.events) WHERE value='view')").bind(id,revision).first<{cursors:string}>()
}
export async function watchCommand(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(a.role!=='agent','A person chooses their own notifications',403)
 const db=env.DB,row=await permitted(db,a,p.id),at=await currentTime(db)
 const old=await db.prepare('SELECT * FROM p_watchers WHERE proposal_id=? AND operator_id=?').bind(row.id,a.id).first<any>()
 need(Number(p.version??0)===(old?.version??0),'Notification preferences changed. Reload.',409)
 need(typeof p.email==='boolean','Choose whether to receive email');need(p.consent===true,'Explicitly authorize these personal notifications')
 const events=p.events;need(Array.isArray(events)&&events.length<=4&&events.every(e=>typeof e==='string'&&Object.hasOwn(sources,e))&&new Set(events).size===events.length,'Choose view, comment, signed or paid events')
 if(events.includes('view')&&a.role!=='owner')need(await ownerViewConsent(db,row.id,row.revision),'The owner must opt in to view alerts for this revision first',403)
 const routeId=p.slackRoute?text(p.slackRoute,'a verified direct Slack route'):null
 let route:any
 if(routeId){route=await db.prepare("SELECT * FROM p_notification_routes WHERE id=? AND provider='slack' AND kind='direct' AND operator_id=?").bind(routeId,a.id).first<any>();need(route&&await routeAvailable(env,route),'Choose your verified active direct Slack route',403)}
 const cursors:Record<string,number>={}
 for(const [kind,source] of Object.entries(sources))cursors[kind]=(await db.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM '+source.table).first<any>()).n
 const id=old?.id??crypto.randomUUID(),version=(old?.version??0)+1
 await commit(db,a,[db.prepare('INSERT INTO p_watchers VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id,operator_id) DO UPDATE SET revision=excluded.revision,email_enabled=excluded.email_enabled,slack_route=excluded.slack_route,events=excluded.events,cursors=excluded.cursors,version=excluded.version,updated_at=excluded.updated_at').bind(id,row.id,row.revision,a.id,p.email?1:0,routeId,JSON.stringify(events),JSON.stringify(cursors),version,at),db.prepare('INSERT INTO p_watcher_authority VALUES(?,?,?) ON CONFLICT(watcher_id) DO UPDATE SET version=excluded.version,member_version=excluded.member_version').bind(id,version,a.memberVersion??0),db.prepare("UPDATE p_notification_outbox SET status='withheld' WHERE watcher_id=? AND status='pending'").bind(id),db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),a.id,a.role,'notification.watch',row.id,at)],false,{sql:'COALESCE((SELECT version FROM p_watchers WHERE proposal_id=? AND operator_id=?),0)=? AND EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND revision=?)'+(route?' AND EXISTS(SELECT 1 FROM p_notification_route_authority a JOIN p_notification_routes r ON r.id=a.route_id JOIN p_connections c ON c.id=? AND c.version=r.connection_version AND c.status=\'connected\' WHERE r.id=? AND r.operator_id=?)':''),values:[row.id,a.id,old?.version??0,row.id,row.revision,...(route?['workspace:slack',route.id,a.id]:[])]})
 return {id:row.id,watcherId:id,version}
}
export async function watcherState(env:Bindings,a:Actor,id:unknown){
 await permitted(env.DB,a,id);need(a.role!=='agent','A person reads their own preferences',403)
 return await env.DB.prepare('SELECT w.*,EXISTS(SELECT 1 FROM p_watcher_authority a WHERE a.watcher_id=w.id AND a.version=w.version) AS authorized FROM p_watchers w WHERE proposal_id=? AND operator_id=?').bind(id,a.id).first()
}
export async function activeWatcher(env:Bindings,out:any){
 const w=await env.DB.prepare('SELECT w.*,a.member_version FROM p_watchers w JOIN p_watcher_authority a ON a.watcher_id=w.id AND a.version=w.version WHERE w.id=?').bind(out.watcher_id).first<any>()
 if(!w)return false
 const actor=await actorById(env.DB,w.operator_id);if(!actor||(actor.memberVersion??0)!==w.member_version)return false
 try{const row=await permitted(env.DB,actor,w.proposal_id);if(row.revision!==w.revision)return false}catch{return false}
 const [,watcherId,version,kind]=out.event_key.split(':')
 if(kind==='view'&&!await ownerViewConsent(env.DB,w.proposal_id,w.revision))return false
 if(watcherId!==w.id||Number(version)!==w.version||!JSON.parse(w.events).includes(kind))return false
 return out.route_id?w.slack_route===out.route_id:Boolean(w.email_enabled&&out.recipient===actor.email)
}
export async function queueWatcherEvents(env:Bindings){
 const db=env.DB,at=await currentTime(db),watchers=(await db.prepare('SELECT w.* FROM p_watchers w JOIN p_watcher_authority a ON a.watcher_id=w.id AND a.version=w.version').all<any>()).results
 for(const w of watchers){
  const person=await actorById(db,w.operator_id);if(!person)continue
  const events=JSON.parse(w.events) as (keyof typeof sources)[],cursors=JSON.parse(w.cursors)
  for(const kind of events){
   const ownerConsent=kind==='view'?await ownerViewConsent(db,w.proposal_id,w.revision):null
   if(kind==='view'&&!ownerConsent)continue
   const cursor=kind==='view'?Math.max(cursors.view,JSON.parse(ownerConsent!.cursors).view):cursors[kind]
   const s=sources[kind],rows=(await db.prepare('SELECT '+s.id+' AS event_id FROM '+s.table+' WHERE rowid>? AND '+s.proposal+'=? AND ('+s.filter+')'+(kind==='view'?" AND rowid=(SELECT MIN(rowid) FROM p_audit WHERE subject=? AND action='proposal.view' AND actor_role IN ('client','invitation'))":'')).bind(cursor,w.proposal_id,...(kind==='view'?[w.proposal_id]:[])).all<any>()).results
   for(const event of rows){
    const key='watch:'+w.id+':'+w.version+':'+kind+':'+event.event_id,subject={view:'Proposal opened',comment:'Proposal comment',signed:'Proposal signed',paid:'Proposal payment recorded'}[kind]
    const body=subject+'. Sign in to review: '+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(w.proposal_id)
    const write=(recipient:string|null,route:string|null)=>db.prepare("INSERT INTO p_notification_outbox(id,event_key,proposal_id,recipient,route_id,subject,body,status,created_at,watcher_id) VALUES(?,?,?,?,?,?,?,'pending',?,?) ON CONFLICT DO NOTHING").bind(crypto.randomUUID(),key,w.proposal_id,recipient,route,subject,body,at,w.id)
    const candidate={watcher_id:w.id,event_key:key,recipient:person.email,route_id:null}
    if(!await activeWatcher(env,candidate)&&!await activeWatcher(env,{...candidate,recipient:null,route_id:w.slack_route}))continue
    if(w.email_enabled)await write(person.email,null).run()
    if(w.slack_route)await write(null,w.slack_route).run()
   }
  }
 }
}
