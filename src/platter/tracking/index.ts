import type { Bindings } from '../../auth.server'
import { commit, hash, need, proposal, text, type Actor, snapshot } from '../model'
import { currentTime } from '../expiry-time'
import { offerSelection, selectionItems } from '../selection'
import { trackingSettings, purgeTracking } from '../tracking'
import { documentOf } from '../documents/blocks'

export async function stakeholderRecipient(env:Bindings,a:Actor,p:Record<string,unknown>){
 need(a.role==='owner','Only the owner manages engagement data',403)
 const row=await proposal(env.DB,p.id)
 const person=await env.DB.prepare('SELECT * FROM p_tracking_stakeholders WHERE id=? AND proposal_id=? AND revision=?').bind(text(p.stakeholderId,'a verified stakeholder'),row.id,row.revision).first<any>()
 need(person,'Verified stakeholder not found on this revision',404)
 need(p.consent==='yes','Confirm the approver recipient role')
 await commit(env.DB,a,[env.DB.prepare("UPDATE p_tracking_stakeholders SET role='approver' WHERE id=?").bind(person.id)])
 return {id:row.id}
}

/** Section identities come from the frozen revision, never a caller supplied title. */
function sections(content:any){
 return new Map<string,string>([['scope','Scope of work'],['pricing','Pricing'],['terms','Terms'],['attachments','Attachments'],...documentOf(content).blocks.filter(b=>b.type!=='page_break').map(b=>['block:'+b.id,b.title||b.type.replaceAll('_',' ')] as [string,string])])
}
async function authorizedView(env:Bindings,c:any,id:unknown){
 const db=env.DB,at=await currentTime(db);await purgeTracking(db,at)
 need((await trackingSettings(db)).enabled,'Tracking is off',403)
 const view=await db.prepare('SELECT v.* FROM p_views v JOIN p_tracking_transport t ON t.view_id=v.id WHERE v.id=? AND v.proposal_id=? AND v.revision=? AND v.recipient=? AND t.share_hash=?').bind(text(id,'a view'),c.row.id,c.row.revision,c.row.clientEmail,await hash(c.token)).first<any>()
 need(view,'This view is no longer available',404)
 return {view,at}
}
export async function readingEvent(env:Bindings,c:any,p:Record<string,unknown>){
 const db=env.DB,{view,at}=await authorizedView(env,c,p.viewId),id=view.id
 const selection=offerSelection(JSON.parse(c.row.options),c.row.deposit_bps,p.optionId??c.optionId,selectionItems(p)),items=JSON.stringify(selection.items.map((i:any)=>({id:i.id,quantity:i.quantity})).sort((a:any,b:any)=>a.id.localeCompare(b.id)))
 const readings=p.readings??(p.section!==undefined?{[String(p.section)]:p.milliseconds}:{})
 need(readings&&typeof readings==='object'&&!Array.isArray(readings),'Provide section readings')
 const allowed=sections(snapshot(c.row)),writes:D1PreparedStatement[]=[]
 for(const [section,value] of Object.entries(readings)){
  const milliseconds=Number(value)
  need(allowed.has(section),'Choose a current proposal section')
  need(Number.isInteger(milliseconds)&&milliseconds>=0&&milliseconds<=Math.max(0,at-view.viewed_at)+2000&&milliseconds<=86400000,'Invalid visible reading duration')
  writes.push(db.prepare('INSERT INTO p_tracking_reading(view_id,section,milliseconds) VALUES(?,?,?) ON CONFLICT(view_id,section) DO UPDATE SET milliseconds=MAX(milliseconds,excluded.milliseconds)').bind(id,section,milliseconds))
 }
 const sequence=p.choiceSequence===undefined?null:Number(p.choiceSequence)
 need(sequence===null||Number.isSafeInteger(sequence)&&sequence>=1&&sequence<=1000000,'Invalid choice sequence')
 if(sequence!==null){
  const prior=await db.prepare('SELECT option_id,items FROM p_tracking_choices WHERE view_id=? AND sequence=?').bind(id,sequence).first<any>()
  need(!prior||prior.option_id===selection.option.id&&prior.items===items,'This choice sequence is already recorded',409)
 }
 // Explicit browser sequence numbers make retries idempotent and preserve A to B to A.
 // Older clients append only when the last snapshot differs.
 writes.push(db.prepare(`INSERT INTO p_tracking_choices(view_id,sequence,option_id,items,observed_at)
  SELECT ?,COALESCE(?,(SELECT COALESCE(MAX(sequence),0)+1 FROM p_tracking_choices WHERE view_id=?)),?,?,?
  WHERE ? IS NOT NULL OR NOT EXISTS(SELECT 1 FROM p_tracking_choices WHERE view_id=? AND sequence=(SELECT MAX(sequence) FROM p_tracking_choices WHERE view_id=?) AND option_id=? AND items=?)
  ON CONFLICT(view_id,sequence) DO NOTHING`).bind(id,sequence,id,selection.option.id,items,at,sequence,id,id,selection.option.id,items))
 await db.batch(writes)
 return {recorded:true}
}
/** Called only after the authorized attachment bytes have been materialized. */
export async function attachmentOpen(env:Bindings,c:any,viewId:string,file:{id:string;filename:string}){
 const {view,at}=await authorizedView(env,c,viewId)
 await env.DB.prepare('INSERT INTO p_tracking_attachment_opens VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),view.id,file.id,file.filename,at).run()
}
export async function engagement(env:Bindings,a:Actor,id:string,prune=true){
 need(a.role==='owner','Only the owner reads detailed engagement',403)
 await proposal(env.DB,id);if(prune)await purgeTracking(env.DB,await currentTime(env.DB))
 const views=(await env.DB.prepare('SELECT v.*,r.snapshot AS source FROM p_views v JOIN p_revisions r ON r.proposal_id=v.proposal_id AND r.revision=v.revision WHERE v.proposal_id=? ORDER BY v.viewed_at,v.id').bind(id).all<any>()).results
 const reading=(await env.DB.prepare('SELECT r.* FROM p_tracking_reading r JOIN p_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.view_id,r.section').bind(id).all<any>()).results
 const choices=(await env.DB.prepare('SELECT r.* FROM p_tracking_choices r JOIN p_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.view_id,r.sequence').bind(id).all<any>()).results
 const attachments=(await env.DB.prepare('SELECT r.* FROM p_tracking_attachment_opens r JOIN p_views v ON v.id=r.view_id WHERE v.proposal_id=? ORDER BY r.opened_at,r.id').bind(id).all<any>()).results
 const details=views.map(({source,...v})=>{const labels=sections(JSON.parse(source));return {...v,reading:reading.filter(r=>r.view_id===v.id).map(r=>({...r,label:labels.get(r.section)??r.section})),choices:choices.filter(r=>r.view_id===v.id).map(r=>({...r,items:JSON.parse(r.items)})),attachments:attachments.filter(r=>r.view_id===v.id)}})
 const recipients:any[]=[]
 for(const view of details){
  let recipient=recipients.find(r=>r.recipient===view.recipient&&r.revision===view.revision)
  if(!recipient){recipient={recipient:view.recipient,revision:view.revision,viewCount:0,verifiedViews:0,reading:[],choices:[],attachments:[]};recipients.push(recipient)}
  recipient.viewCount++;recipient.verifiedViews+=Number(Boolean(view.verified))
  for(const r of view.reading){let total=recipient.reading.find((x:any)=>x.section===r.section);if(!total){total={section:r.section,label:r.label,milliseconds:0};recipient.reading.push(total)}total.milliseconds+=r.milliseconds}
  recipient.choices.push(...view.choices);recipient.attachments.push(...view.attachments)
 }
 return {stakeholders:(await env.DB.prepare('SELECT * FROM p_tracking_stakeholders WHERE proposal_id=? ORDER BY verified_at,id').bind(id).all<any>()).results,settings:await trackingSettings(env.DB),views:details,recipients}
}
