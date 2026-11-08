import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { addDays, currentTime, startOfDate } from '../expiry-time'
import { commit, exact, need, type Actor } from '../model'
import { administrators, permitted, senders } from '../permissions'
import { notificationWrite, routeAvailable } from './dispatch'

function days(value:unknown){const n=Number(value);need(value!==''&&Number.isInteger(n)&&n>=1&&n<=365,'Choose notice lead days from 1 to 365');return n}
function enabled(value:unknown){need([true,false,'yes','no'].includes(value as any),'Choose whether the notice is enabled');return value===true||value==='yes'?1:0}

export async function senderNoticeCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 const db=env.DB
 if(name==='notification.defaults'){
  need(administrators.includes(a.role),'Only owner and admins change workspace notice defaults',403)
  const old=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
  need(Number(p.version)===old.version,'Notice defaults changed. Reload.',409)
  await commit(db,a,[db.prepare('UPDATE p_sender_notice_defaults SET enabled=?,lead_days=?,renewal_enabled=?,renewal_days=?,version=version+1 WHERE singleton=1').bind(enabled(p.enabled),days(p.leadDays),enabled(p.renewalEnabled),days(p.renewalDays))],false,{sql:'EXISTS(SELECT 1 FROM p_sender_notice_defaults WHERE version=?)',values:[old.version]})
  return {saved:true}
 }
 const row=await permitted(db,a,p.id,'send');need(senders.includes(a.role),'Only proposal senders configure notices',403);exact(row,p)
 const defaults=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
 const kind=name==='notification.renewal'?'renewal':'expiry',settingsTable=kind==='renewal'?'p_renewal_notice_settings':'p_sender_notice_settings',authorityTable=kind==='renewal'?'p_renewal_notice_authority':'p_sender_notice_authority'
 const old=await db.prepare('SELECT * FROM '+settingsTable+' WHERE proposal_id=?').bind(row.id).first<any>()
 if(p.settingsVersion!==undefined)need(Number(p.settingsVersion)===(old?.version??0),'Notice settings changed. Reload.',409)
 const mutable=row.status!=='accepted'
 const fallback={enabled:kind==='renewal'?defaults.renewal_enabled:defaults.enabled,lead_days:kind==='renewal'?defaults.renewal_days:defaults.lead_days}
 const action=String(p.action??'authorize');need(['save','authorize','revoke'].includes(action),'Choose a notice action')
 const on=action==='revoke'?(old?.enabled??fallback.enabled):p.enabled===undefined?(old?.enabled??fallback.enabled):enabled(p.enabled)
 const lead=action==='revoke'?(old?.lead_days??fallback.lead_days):p.leadDays===undefined?(old?.lead_days??fallback.lead_days):days(p.leadDays)
 const emailEnabled=action==='revoke'?(old?.email_enabled??1):p.emailEnabled===undefined?(old?.email_enabled??1):enabled(p.emailEnabled)
 const slackRoute=action==='revoke'?(old?.slack_route??null):p.slackRoute===undefined?(old?.slack_route??null):p.slackRoute?String(p.slackRoute):null
 if(action!=='revoke'&&slackRoute){
  const route=await db.prepare("SELECT * FROM p_notification_routes WHERE id=? AND kind='direct' AND provider='slack' AND operator_id=?").bind(slackRoute,row.sales_owner_id).first<any>()
  need(route&&await routeAvailable(env,route),'Choose the recorded sales owner’s verified active personal Slack route',403)
 }
 if(action==='authorize'){
  need(!on||emailEnabled||slackRoute,'Choose email or a personal Slack destination')
  need(p.consent===true||p.consent==='yes','Explicitly authorize notices to the recorded sales owner')
  const owner=await actorById(db,row.sales_owner_id)
  need(owner&&senders.includes(owner.role),'The recorded sales owner must have current sending authority',409)
  await permitted(db,owner,row.id,'send')
 }
 const operator=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(a.id).first<any>()
 const id=crypto.randomUUID(),version=(old?.version??0)+1,at=await currentTime(db)
 const writes=[
  db.prepare('INSERT INTO '+settingsTable+'(proposal_id,enabled,lead_days,version,email_enabled,slack_route) VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET enabled=excluded.enabled,lead_days=excluded.lead_days,version=excluded.version,email_enabled=excluded.email_enabled,slack_route=excluded.slack_route').bind(row.id,on,lead,version,emailEnabled,slackRoute),
  db.prepare('DELETE FROM '+authorityTable+' WHERE proposal_id=?').bind(row.id),
  db.prepare('INSERT INTO p_sender_notice_events(id,proposal_id,revision,settings_version,actor_id,actor_role,actor_version,member_version,owner_id,enabled,lead_days,action,occurred_at,kind,email_enabled,slack_route) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,version,a.id,a.role,operator.version,a.memberVersion??0,row.sales_owner_id,on,lead,action==='authorize'&&on?'authorized':action==='revoke'?'revoked':'saved',at,kind,emailEnabled,slackRoute),
  ...(mutable?[db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)]:[])
 ]
 if(action==='authorize'&&on)writes.push(db.prepare('INSERT INTO '+authorityTable+'(proposal_id,consent_id) VALUES(?,?)').bind(row.id,id))
 await commit(db,a,writes,false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND COALESCE((SELECT version FROM '+settingsTable+' WHERE proposal_id=?),0)=?',values:[row.id,row.version,row.id,old?.version??0]})
 return {id:row.id,enabled:Boolean(on),leadDays:lead,version:row.version+(mutable?1:0)}
}

// The historical consent is portable; this local join is the execution grant.
export const noticeConsentJoin=(kind:'expiry'|'renewal')=>`JOIN ${kind==='renewal'?'p_renewal_notice_authority':'p_sender_notice_authority'} a ON a.proposal_id=p.id
 JOIN p_sender_notice_events c ON c.id=a.consent_id AND c.action='authorized' AND c.kind='${kind}'
 AND c.revision=p.revision AND c.settings_version=s.version AND c.owner_id=p.sales_owner_id
 JOIN oa_operators sender ON sender.id=c.actor_id AND sender.status='active' AND sender.version=c.actor_version
 LEFT JOIN p_members member ON member.operator_id=sender.id`
const consentJoin=noticeConsentJoin('expiry')
export const consentCurrent=`COALESCE(member.version,0)=c.member_version
 AND CASE WHEN sender.role IN ('owner','admin') THEN sender.role ELSE COALESCE(member.role,'sales') END=c.actor_role`

export async function currentSender(db:D1Database,consentId:string,proposalId:string){
 const c=await db.prepare('SELECT actor_id FROM p_sender_notice_events WHERE id=?').bind(consentId).first<any>()
 const sender=c?await actorById(db,c.actor_id):undefined
 if(!sender||!senders.includes(sender.role))return false
 try{await permitted(db,sender,proposalId,'send');return true}catch{return false}
}

export async function activeExpiryNotice(env:Bindings,mail:any){
 const r=await env.DB.prepare(`SELECT n.*,p.sales_owner_id,p.status,e.deadline_at AS current_deadline,s.version,s.enabled,s.email_enabled,s.slack_route,c.id AS consent_id,o.email
 FROM p_sender_notice_runs n JOIN p_proposals p ON p.id=n.proposal_id JOIN p_expiry e ON e.proposal_id=p.id
 JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin}
 JOIN oa_operators o ON o.id=p.sales_owner_id AND o.status='active'
 WHERE n.id=? AND p.revision=n.revision AND ${consentCurrent}
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)
 AND NOT EXISTS(SELECT 1 FROM p_acceptances x WHERE x.proposal_id=p.id)`).bind(mail.event_key).first<any>()
 if(!r||r.status!=='sent'||!r.enabled||r.version!==r.settings_version||r.current_deadline!==r.deadline_at||r.deadline_at<=await currentTime(env.DB)||r.owner_id!==r.sales_owner_id)return false
 const owner=await actorById(env.DB,r.owner_id);if(!owner||!senders.includes(owner.role))return false
 try{await permitted(env.DB,owner,r.proposal_id,'send');return await currentSender(env.DB,r.consent_id,r.proposal_id)&&await noticeChannelAllowed(env,r,owner,mail)}catch{return false}
}

export async function expiryNoticeState(env:Bindings,a:Actor,ids:Set<unknown>){
 if(!senders.includes(a.role))return {}
 const db=env.DB,defaults=await db.prepare('SELECT * FROM p_sender_notice_defaults WHERE singleton=1').first<any>()
 const settings=(await db.prepare('SELECT * FROM p_sender_notice_settings').all<any>()).results.filter(r=>ids.has(r.proposal_id))
 const events=(await db.prepare("SELECT * FROM p_sender_notice_events WHERE kind='expiry' ORDER BY occurred_at,id").all<any>()).results.filter(r=>ids.has(r.proposal_id))
 const grants=(await db.prepare(`SELECT p.id,c.id AS consent_id FROM p_proposals p JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin} WHERE ${consentCurrent} AND s.enabled=1`).all<any>()).results
 const active=[]
 for(const grant of grants.filter(r=>ids.has(r.id))){
  const row=await db.prepare('SELECT sales_owner_id FROM p_proposals WHERE id=?').bind(grant.id).first<any>()
  const owner=await actorById(db,row.sales_owner_id)
  if(!owner||!senders.includes(owner.role))continue
  try{await permitted(db,owner,grant.id,'send');if(await currentSender(db,grant.consent_id,grant.id))active.push(grant.id)}catch{}
 }
 const recipients=(await db.prepare('SELECT p.id AS proposal_id,o.display_name AS name,o.email FROM p_proposals p LEFT JOIN oa_operators o ON o.id=p.sales_owner_id').all<any>()).results.filter(r=>ids.has(r.proposal_id))
 const routes=(await db.prepare("SELECT r.* FROM p_notification_routes r JOIN p_notification_route_authority a ON a.route_id=r.id WHERE r.kind='direct' AND r.provider='slack'").all<any>()).results.filter(r=>r.operator_id===a.id||administrators.includes(a.role))
 return {expiryNoticeRoutes:routes,expiryNoticeDefaults:defaults,expiryNotices:{settings,events,active,recipients}}
}

export async function queueExpiryNotices(env:Bindings){
 const db=env.DB,at=await currentTime(db),rows=(await db.prepare(`SELECT p.id,p.version,p.revision,p.sales_owner_id,e.deadline_at,e.expires_on,e.time_zone,s.lead_days,s.email_enabled,s.slack_route,s.version AS settings_version,c.id AS consent_id
 FROM p_proposals p JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin}
 WHERE ${consentCurrent} AND p.status='sent' AND s.enabled=1 AND e.deadline_at>? AND NOT EXISTS(SELECT 1 FROM p_acceptances x WHERE x.proposal_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM p_withdrawals w WHERE w.proposal_id=p.id AND w.revision=p.revision)`).bind(at).all<any>()).results
 for(const row of rows){
  const date=addDays(row.expires_on,-row.lead_days);if(startOfDate(date,row.time_zone)>at)continue
  const owner=await actorById(db,row.sales_owner_id);if(!owner||!senders.includes(owner.role)||!await currentSender(db,row.consent_id,row.id))continue
  try{await permitted(db,owner,row.id,'send')}catch{continue}
  const id='expiry:'+row.id+':'+row.revision+':'+row.deadline_at
  if(await db.prepare('SELECT id FROM p_sender_notice_runs WHERE id=?').bind(id).first())continue
  const body='This unaccepted proposal expires on '+row.expires_on+' ('+row.time_zone+'). Follow up by '+date+'.\n'+env.AUTH_ORIGIN+'/app/proposal?id='+encodeURIComponent(row.id)
  const deliveries=await noticeWrites(env,row,owner,id,'Proposal expiry approaching',body,at)
  if(!deliveries.length)continue
  try{await commit(db,owner,[
   db.prepare('INSERT INTO p_sender_notice_runs(id,proposal_id,revision,deadline_at,notice_date,owner_id,settings_version,occurred_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,row.id,row.revision,row.deadline_at,date,owner.id,row.settings_version,at),
   ...deliveries,
   db.prepare("INSERT INTO p_followups(proposal_id,revision,action,due_date,actor_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,action=excluded.action,due_date=excluded.due_date,closed_at=NULL,resolution=NULL,actor_id=excluded.actor_id,updated_at=excluded.updated_at WHERE p_followups.closed_at IS NOT NULL OR p_followups.revision!=excluded.revision").bind(row.id,row.revision,'Review approaching expiry',date,owner.id,at),
   db.prepare("INSERT INTO p_followup_actions(id,proposal_id,revision,kind,action,due_date,actor_id,occurred_at) VALUES(?,?,?,'scheduled',?,?,?,?)").bind(crypto.randomUUID(),row.id,row.revision,'Review approaching expiry',date,owner.id,at)
  ],false,{sql:`EXISTS(SELECT 1 FROM p_proposals p JOIN p_expiry e ON e.proposal_id=p.id JOIN p_sender_notice_settings s ON s.proposal_id=p.id ${consentJoin} WHERE ${consentCurrent} AND p.id=? AND p.version=? AND p.status='sent' AND p.sales_owner_id=? AND e.deadline_at=? AND e.deadline_at>? AND s.enabled=1 AND s.version=? AND c.id=?) AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?)`,values:[row.id,row.version,owner.id,row.deadline_at,at,row.settings_version,row.consent_id,row.id,row.id,row.revision]})}catch(error){if((error as any).status!==409)throw error}
 }
}

/** Personal destinations remain bound to the active recorded sales owner. */
export async function noticeChannelAllowed(env:Bindings,settings:any,owner:Actor,mail:any){
 if(!mail.route_id)return Boolean(settings.email_enabled&&mail.recipient===owner.email)
 if(settings.slack_route!==mail.route_id)return false
 const route=await env.DB.prepare("SELECT * FROM p_notification_routes WHERE id=? AND kind='direct' AND provider='slack' AND operator_id=?").bind(mail.route_id,owner.id).first<any>()
 return Boolean(route&&await routeAvailable(env,route))
}
export async function noticeWrites(env:Bindings,settings:any,owner:Actor,id:string,subject:string,body:string,at:number){
 const writes=[]
 if(settings.email_enabled)writes.push(notificationWrite(env,id,settings.id,subject,body,at,owner.email))
 if(settings.slack_route&&await noticeChannelAllowed(env,settings,owner,{route_id:settings.slack_route}))writes.push(notificationWrite(env,id,settings.id,subject,body,at,null,null,settings.slack_route))
 return writes
}
