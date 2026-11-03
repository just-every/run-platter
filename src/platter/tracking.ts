import { createPortability } from '@runeditrun/rer/modules/portability'
import archivePolicy from './archive-policy.mjs'
import { scope, senders } from './permissions'
import type { Bindings } from '../auth.server'
import { need, proposal, text, commit, hash, type Actor } from './model'
import { currentTime } from './expiry-time'

export async function trackingSettings(db:D1Database){
 const settings=await db.prepare('SELECT retention_days,quiet_minutes FROM p_tracking_settings WHERE singleton=1').first<any>()
 const authority=await db.prepare('SELECT alerts FROM p_tracking_authority WHERE singleton=1').first<any>()
 return {...settings,enabled:Boolean(authority),alerts:Boolean(authority?.alerts)}
}
export async function purgeTracking(db:D1Database,at=Date.now()){
 const settings=await trackingSettings(db),cutoff=at-settings.retention_days*86400000
 await db.prepare('DELETE FROM p_tracking_challenges WHERE expires_at<=?').bind(at).run()
 await db.prepare('DELETE FROM p_tracking_stakeholders WHERE verified_at<? AND NOT EXISTS(SELECT 1 FROM p_tracking_holds h WHERE h.proposal_id=p_tracking_stakeholders.proposal_id) AND NOT EXISTS(SELECT 1 FROM p_privacy_holds h JOIN p_proposals p ON p.client_id=h.client_id WHERE p.id=p_tracking_stakeholders.proposal_id)').bind(cutoff).run()
 await db.batch(['p_views','p_tracking_alerts'].map(table=>db.prepare(`DELETE FROM ${table} WHERE ${table==='p_views'?'viewed_at':'alerted_at'}<? AND NOT EXISTS(SELECT 1 FROM p_tracking_holds h WHERE h.proposal_id=${table}.proposal_id) AND NOT EXISTS(SELECT 1 FROM p_privacy_holds h JOIN p_proposals p ON p.client_id=h.client_id WHERE p.id=${table}.proposal_id)`).bind(cutoff)))
}
export async function trackingCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner manages engagement tracking',403)
 const db=env.DB,at=await currentTime(db)
 if(name==='tracking.settings'){
  const days=Number(p.retentionDays),quiet=Number(p.quietMinutes)
  need(Number.isInteger(days)&&days>=1&&days<=365,'Retention must be between 1 and 365 days')
  need(Number.isInteger(quiet)&&quiet>=1&&quiet<=1440,'Quiet period must be between 1 and 1440 minutes')
  need(['yes','no'].includes(String(p.enabled))&&['yes','no'].includes(String(p.alerts)),'Choose tracking and alerts')
  need(p.enabled==='yes'||p.alerts==='no','Enable tracking before alerts')
  need(p.enabled!=='yes'||p.consent==='yes','Explicit consent is required to measure client views')
  await commit(db,a,[db.prepare('UPDATE p_tracking_settings SET retention_days=?,quiet_minutes=? WHERE singleton=1').bind(days,quiet),db.prepare('DELETE FROM p_tracking_authority'),...(p.enabled==='yes'?[db.prepare('INSERT INTO p_tracking_authority VALUES(1,?,?)').bind(p.alerts==='yes'?1:0,at)]:[])])
  await purgeTracking(db,at);return {id:'tracking'}
 }
 const row=await proposal(db,p.id)
 if(name==='tracking.hold'){
  need(p.held==='yes'||p.held==='no','Choose whether to hold engagement data')
  await commit(db,a,[p.held==='yes'?db.prepare('INSERT INTO p_tracking_holds VALUES(?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET reason=excluded.reason,held_at=excluded.held_at').bind(row.id,text(p.reason,'a hold reason',500),at):db.prepare('DELETE FROM p_tracking_holds WHERE proposal_id=?').bind(row.id)])
  return {id:row.id}
 }
 need(name==='tracking.erase','Unknown tracking action',404)
 need(p.confirm==='erase','Confirm engagement erasure')
 need(!await db.prepare('SELECT 1 FROM p_tracking_holds WHERE proposal_id=? UNION ALL SELECT 1 FROM p_privacy_holds h JOIN p_proposals p ON p.client_id=h.client_id WHERE p.id=?').bind(row.id,row.id).first(),'A retention or legal hold prevents engagement erasure',409)
 const portability=await createPortability({db,policy:archivePolicy})
 const fence=[...await portability.redactionStatements(),...await portability.invalidateTransfersStatements()]
 // The hold and archive checkpoint are committed atomically with the erasure.
 await commit(db,a,[db.prepare('INSERT INTO p_guard(ok) VALUES(NOT EXISTS(SELECT 1 FROM p_tracking_holds WHERE proposal_id=?) AND NOT EXISTS(SELECT 1 FROM p_privacy_holds h JOIN p_proposals p ON p.client_id=h.client_id WHERE p.id=?))').bind(row.id,row.id),...fence,...['p_tracking_challenges','p_tracking_stakeholders','p_views','p_tracking_alerts'].map(table=>db.prepare(`DELETE FROM ${table} WHERE proposal_id=?`).bind(row.id))])
 return {id:row.id}
}
function coarse(value:unknown){return typeof value==='string'?value.replace(/[\x00-\x1f]/g,'').slice(0,100):null}
export async function recordView(env:Bindings,c:any,request:Request){
 const db=env.DB,settings=await trackingSettings(db);if(!settings.enabled)return
 const at=await currentTime(db);await purgeTracking(db,at)
 const cf=request.cf as any,ua=request.headers.get('user-agent')??'',device=/ipad|tablet/i.test(ua)||(/android/i.test(ua)&&!/mobile/i.test(ua))?'tablet':/mobile|android|iphone/i.test(ua)?'phone':'desktop'
 const country=coarse(cf?.country),countryName=country&&/^[A-Z]{2}$/.test(country)?new Intl.DisplayNames(['en'],{type:'region'}).of(country)??country:null
 // Only trusted edge location metadata is used. Request addresses and caller headers are never retained.
 const id=crypto.randomUUID(),values=[id,c.row.id,c.row.revision,c.row.clientEmail,c.verified?1:0,at,coarse(cf?.city),coarse(cf?.region),countryName,device]
 const writes=[db.prepare('INSERT INTO p_views(id,proposal_id,revision,recipient,verified,viewed_at,city,region,country,device) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM p_tracking_authority WHERE singleton=1)').bind(...values)]
 if(settings.alerts)writes.push(db.prepare("INSERT INTO p_tracking_alerts SELECT ?,?,?,(SELECT actor_id FROM p_invitation_messages WHERE proposal_id=? AND revision=? AND recipient=? ORDER BY queued_at DESC,rowid DESC LIMIT 1),?,CASE WHEN EXISTS(SELECT 1 FROM p_tracking_alerts WHERE proposal_id=? AND recipient=?) THEN 'return' ELSE 'first' END WHERE EXISTS(SELECT 1 FROM p_tracking_authority WHERE singleton=1 AND alerts=1) AND NOT EXISTS(SELECT 1 FROM p_tracking_alerts WHERE proposal_id=? AND recipient=? AND alerted_at>?)").bind(crypto.randomUUID(),c.row.id,c.row.clientEmail,c.row.id,c.row.revision,c.row.clientEmail,at,c.row.id,c.row.clientEmail,c.row.id,c.row.clientEmail,at-settings.quiet_minutes*60000))
 writes.push(db.prepare('INSERT INTO p_tracking_transport(view_id,share_hash) SELECT ?,? WHERE EXISTS(SELECT 1 FROM p_views WHERE id=?)').bind(id,await hash(c.token),id))
 await db.batch(writes)
 return {id}
}
export async function trackingState(db:D1Database,a:Actor){
 if(a.role!=='owner')return undefined
 await purgeTracking(db,await currentTime(db))
 return {settings:await trackingSettings(db),views:(await db.prepare('SELECT * FROM p_views ORDER BY viewed_at,id').all<any>()).results,alerts:(await db.prepare('SELECT * FROM p_tracking_alerts ORDER BY alerted_at,id').all<any>()).results,holds:(await db.prepare('SELECT * FROM p_tracking_holds').all<any>()).results}
}

/** Generic sender notices never expose recipient or device and location details. */
export async function senderAlerts(db:D1Database,a:Actor){
 if(!senders.includes(a.role))return []
 await purgeTracking(db,await currentTime(db))
 const visibility=scope(a,'send')
 return (await db.prepare(`SELECT t.id,t.proposal_id AS proposalId,t.kind,p.title FROM p_tracking_alerts t JOIN p_proposals p ON p.id=t.proposal_id WHERE t.sender_id=? AND (${visibility.sql}) AND EXISTS(SELECT 1 FROM p_tracking_authority WHERE singleton=1 AND alerts=1) ORDER BY t.alerted_at DESC,t.id DESC LIMIT 100`).bind(a.id,...visibility.values).all<any>()).results
}
