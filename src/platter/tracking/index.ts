import { sendingActor } from '../mailboxes'
import { createPortability } from '@runeditrun/rer/modules/portability'
import archivePolicy from '../archive-policy.mjs'
import type { Bindings } from '../../auth.server'
import { commit, hash, need, proposal, text, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { queueMail, dispatchMail } from '../mail'
import { offerSelection, selectionItems } from '../selection'
import { requestLocation } from './location'

export async function trackingSettings(db:D1Database,id:string){return await db.prepare('SELECT * FROM p_tracking_settings WHERE proposal_id=?').bind(id).first<any>()??{proposal_id:id,enabled:0,alerts:0,quiet_minutes:30,retention_days:90}}
export async function pruneTracking(db:D1Database,at=Date.now()){
 await db.prepare('DELETE FROM p_tracking_challenges WHERE expires_at<=?').bind(at).run()
 await db.prepare('DELETE FROM p_tracking_stakeholders WHERE verified_at<?-86400000*COALESCE((SELECT retention_days FROM p_tracking_settings s WHERE s.proposal_id=p_tracking_stakeholders.proposal_id),90)').bind(at).run()
 await db.prepare('DELETE FROM p_tracking_views WHERE opened_at<?-86400000*COALESCE((SELECT retention_days FROM p_tracking_settings s WHERE s.proposal_id=p_tracking_views.proposal_id),90)').bind(at).run()
}
export async function trackingCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner manages engagement data',403)
 const row=await proposal(env.DB,p.id),db=env.DB
 if(name==='tracking.recipient'){
  const stakeholder=await db.prepare('SELECT * FROM p_tracking_stakeholders WHERE id=? AND proposal_id=? AND revision=?').bind(text(p.stakeholderId,'a verified stakeholder'),row.id,row.revision).first<any>();need(stakeholder,'Verified stakeholder not found on this revision',404)
  need(p.consent==='yes','Confirm the approver recipient role')
  await commit(db,a,[db.prepare("UPDATE p_tracking_stakeholders SET role='approver' WHERE id=?").bind(stakeholder.id)])
  return {id:row.id}
 }
 if(name==='tracking.erase'){
  need(p.confirm==='ERASE','Confirm engagement erasure')
  const portability=await createPortability({db,policy:archivePolicy});await commit(db,a,[db.prepare('DELETE FROM p_tracking_challenges WHERE proposal_id=?').bind(row.id),db.prepare('DELETE FROM p_tracking_stakeholders WHERE proposal_id=?').bind(row.id),db.prepare('DELETE FROM p_tracking_views WHERE proposal_id=?').bind(row.id),...await portability.invalidateTransfersStatements()])
  return {id:row.id,erased:true}
 }
 need(name==='tracking.settings','Unknown tracking action',404)
 const flag=(v:unknown)=>{need([true,false,'yes','no'].includes(v as any),'Choose whether to enable tracking and alerts');return v===true||v==='yes'?1:0}
 const enabled=flag(p.enabled),alerts=flag(p.alerts),quiet=Number(p.quietMinutes),retention=Number(p.retentionDays)
 need(Number.isInteger(quiet)&&quiet>=1&&quiet<=1440,'Quiet period must be 1 to 1440 minutes')
 need(Number.isInteger(retention)&&retention>=1&&retention<=365,'Retention must be 1 to 365 days')
 need(!alerts||enabled,'Enable tracking before alerts')
 const portability=await createPortability({db,policy:archivePolicy})
 await commit(db,a,[...await portability.invalidateTransfersStatements(),db.prepare('INSERT INTO p_tracking_settings(proposal_id,enabled,alerts,quiet_minutes,retention_days) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET enabled=excluded.enabled,alerts=excluded.alerts,quiet_minutes=excluded.quiet_minutes,retention_days=excluded.retention_days').bind(row.id,enabled,alerts,quiet,retention)])
 await pruneTracking(db,await currentTime(db))
 return {id:row.id}
}
export async function openView(env:Bindings,c:any,request:Request){
 const settings=await trackingSettings(env.DB,c.row.id)
 if(!settings.enabled)return null
 const db=env.DB,at=await currentTime(db);await pruneTracking(db,at)
 const id=crypto.randomUUID(),ua=request.headers.get('user-agent')??'',device=/tablet|ipad/i.test(ua)?'tablet':/mobile|iphone|android/i.test(ua)?'phone':'desktop',location=requestLocation(request)
 await db.batch([db.prepare('INSERT INTO p_tracking_views(id,proposal_id,revision,recipient,verified,device,city,region,country,opened_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,c.row.id,c.row.revision,c.row.clientEmail,c.verified?1:0,device,location.city,location.region,location.country,at),db.prepare('INSERT INTO p_tracking_transport(view_id,share_hash) VALUES(?,?)').bind(id,await hash(c.token))])
 if(settings.alerts){
  // Claim the quiet-period slot before any outbound work; concurrent opens cannot duplicate an alert.
  const claimed=await db.prepare('INSERT INTO p_tracking_alerts(view_id,proposal_id,revision,recipient,alerted_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM p_tracking_alerts WHERE proposal_id=? AND revision=? AND recipient=? AND alerted_at>?)').bind(id,c.row.id,c.row.revision,c.row.clientEmail,at,c.row.id,c.row.revision,c.row.clientEmail,at-settings.quiet_minutes*60000).run()
  if(claimed.meta.changes){
   const sender=await db.prepare("SELECT m.*,o.email FROM p_mail m JOIN oa_operators o ON o.id=m.sender_id WHERE m.proposal_id=? AND m.proposal_revision=? AND m.subject LIKE 'Your proposal:%' AND o.status='active' ORDER BY m.created_at DESC,m.id DESC LIMIT 1").bind(c.row.id,c.row.revision).first<any>()
   let authorized=false;if(sender)try{authorized=Boolean(await sendingActor(env,sender))}catch{}
   if(sender&&authorized){const count=await db.prepare('SELECT COUNT(*) AS n FROM p_tracking_alerts WHERE proposal_id=? AND revision=? AND recipient=?').bind(c.row.id,c.row.revision,c.row.clientEmail).first<any>(),mailId=crypto.randomUUID();await queueMail(env,c.row.id,sender.email,(count.n===1?'Proposal opened: ':'Proposal return visit: ')+c.row.title,`${c.row.clientEmail} opened revision ${c.row.revision}. Mailbox ${c.verified?'verified':'not verified'}; a view is not proof of identity or acceptance.`,null,null,mailId).run();await dispatchMail(env,c.row.id,mailId)}
  }
 }
 return {id,optionId:c.optionId}
}
export async function readingEvent(env:Bindings,c:any,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db);await pruneTracking(db,at)
 const settings=await trackingSettings(db,c.row.id);need(settings.enabled,'Tracking is off',403)
 const id=text(p.viewId,'a view'),view=await db.prepare('SELECT v.* FROM p_tracking_views v JOIN p_tracking_transport t ON t.view_id=v.id WHERE v.id=? AND v.proposal_id=? AND v.revision=? AND t.share_hash=?').bind(id,c.row.id,c.row.revision,await hash(c.token)).first<any>();need(view,'This view is no longer available',404)
 const section=String(p.section??''),milliseconds=Number(p.milliseconds)
 need(['scope','pricing','terms','attachments'].includes(section),'Choose a current proposal section')
 need(Number.isInteger(milliseconds)&&milliseconds>=0&&milliseconds<=Math.max(0,at-view.opened_at)+2000&&milliseconds<=86400000,'Invalid visible reading duration')
 const selection=offerSelection(JSON.parse(c.row.options),c.row.deposit_bps,p.optionId??c.optionId,selectionItems(p)),items=JSON.stringify(selection.items.map((i:any)=>({id:i.id,quantity:i.quantity})))
 await db.batch([db.prepare('INSERT INTO p_tracking_reading(view_id,section,milliseconds) VALUES(?,?,?) ON CONFLICT(view_id,section) DO UPDATE SET milliseconds=MAX(milliseconds,excluded.milliseconds)').bind(id,section,milliseconds),db.prepare('INSERT INTO p_tracking_choices(view_id,option_id,items,observed_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(id,selection.option.id,items,at)])
 return {recorded:true}
}
export async function engagement(env:Bindings,a:Actor,id:string,prune=true){
 need(a.role==='owner','Only the owner reads detailed engagement',403)
 await proposal(env.DB,id);if(prune)await pruneTracking(env.DB,await currentTime(env.DB))
 const views=(await env.DB.prepare('SELECT * FROM p_tracking_views WHERE proposal_id=? ORDER BY opened_at,id').bind(id).all<any>()).results
 const reading=(await env.DB.prepare('SELECT r.* FROM p_tracking_reading r JOIN p_tracking_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.view_id,r.section').bind(id).all<any>()).results
 const choices=(await env.DB.prepare('SELECT r.* FROM p_tracking_choices r JOIN p_tracking_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.observed_at').bind(id).all<any>()).results
 return {stakeholders:(await env.DB.prepare('SELECT * FROM p_tracking_stakeholders WHERE proposal_id=? ORDER BY verified_at,id').bind(id).all<any>()).results,settings:await trackingSettings(env.DB,id),views:views.map(v=>({...v,reading:reading.filter(r=>r.view_id===v.id),choices:choices.filter(r=>r.view_id===v.id).map(r=>({...r,items:JSON.parse(r.items)}))}))}
}
