import type { Bindings } from '../../auth.server'
import { commit, hash, need, proposal, text, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { offerSelection, selectionItems } from '../selection'
import { trackingSettings, purgeTracking } from '../tracking'

export async function stakeholderRecipient(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner manages engagement data',403)
 const row=await proposal(env.DB,p.id)
 const person=await env.DB.prepare('SELECT * FROM p_tracking_stakeholders WHERE id=? AND proposal_id=? AND revision=?').bind(text(p.stakeholderId,'a verified stakeholder'),row.id,row.revision).first<any>()
 need(person,'Verified stakeholder not found on this revision',404)
 need(p.consent==='yes','Confirm the approver recipient role')
 await commit(env.DB,a,[env.DB.prepare("UPDATE p_tracking_stakeholders SET role='approver' WHERE id=?").bind(person.id)])
 return {id:row.id}
}

export async function readingEvent(env:Bindings,c:any,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db);await purgeTracking(db,at)
 const settings=await trackingSettings(db);need(settings.enabled,'Tracking is off',403)
 const id=text(p.viewId,'a view'),view=await db.prepare('SELECT v.* FROM p_views v JOIN p_tracking_transport t ON t.view_id=v.id WHERE v.id=? AND v.proposal_id=? AND v.revision=? AND t.share_hash=?').bind(id,c.row.id,c.row.revision,await hash(c.token)).first<any>();need(view,'This view is no longer available',404)
 const section=String(p.section??''),milliseconds=Number(p.milliseconds)
 need(['scope','pricing','terms','attachments'].includes(section),'Choose a current proposal section')
 need(Number.isInteger(milliseconds)&&milliseconds>=0&&milliseconds<=Math.max(0,at-view.viewed_at)+2000&&milliseconds<=86400000,'Invalid visible reading duration')
 const selection=offerSelection(JSON.parse(c.row.options),c.row.deposit_bps,p.optionId??c.optionId,selectionItems(p)),items=JSON.stringify(selection.items.map((i:any)=>({id:i.id,quantity:i.quantity})))
 await db.batch([db.prepare('INSERT INTO p_tracking_reading(view_id,section,milliseconds) VALUES(?,?,?) ON CONFLICT(view_id,section) DO UPDATE SET milliseconds=MAX(milliseconds,excluded.milliseconds)').bind(id,section,milliseconds),db.prepare('INSERT INTO p_tracking_choices(view_id,option_id,items,observed_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(id,selection.option.id,items,at)])
 return {recorded:true}
}
export async function engagement(env:Bindings,a:Actor,id:string,prune=true){
 need(a.role==='owner','Only the owner reads detailed engagement',403)
 await proposal(env.DB,id);if(prune)await purgeTracking(env.DB,await currentTime(env.DB))
 const views=(await env.DB.prepare('SELECT * FROM p_views WHERE proposal_id=? ORDER BY viewed_at,id').bind(id).all<any>()).results
 const reading=(await env.DB.prepare('SELECT r.* FROM p_tracking_reading r JOIN p_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.view_id,r.section').bind(id).all<any>()).results
 const choices=(await env.DB.prepare('SELECT r.* FROM p_tracking_choices r JOIN p_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.observed_at').bind(id).all<any>()).results
 return {stakeholders:(await env.DB.prepare('SELECT * FROM p_tracking_stakeholders WHERE proposal_id=? ORDER BY verified_at,id').bind(id).all<any>()).results,settings:await trackingSettings(env.DB),views:views.map(v=>({...v,reading:reading.filter(r=>r.view_id===v.id),choices:choices.filter(r=>r.view_id===v.id).map(r=>({...r,items:JSON.parse(r.items)}))}))}
}
