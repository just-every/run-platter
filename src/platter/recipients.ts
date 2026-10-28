import { copyCosts } from './internal-pricing'
import { documentOf, fieldSlot } from './documents/blocks'
import type { Bindings } from '../auth.server'
import { commit, email, exact, need, secret, snapshot, text, type Actor } from './model'
import { permitted } from './permissions'
import { currentTime } from './expiry-time'
import { invitationMail } from './invitation-mail'
import { queueMail } from './mail'

export type Recipient = {id:string;name:string;email:string|null;role:'signer'|'approver'|'viewer'|'cc'|'countersigner';group:number}
export function recipientPlan(row:any):Recipient[]{return typeof row.recipient_plan==='string'?JSON.parse(row.recipient_plan):row.recipient_plan??[]}
export const requiredRecipient=(r:Recipient)=>['signer','approver','countersigner'].includes(r.role)
export async function recipientSignatures(db:D1Database,id:string,revision:number){
 return (await db.prepare('SELECT s.*,v.voided_at,v.reason AS void_reason FROM p_recipient_signatures s LEFT JOIN p_void_signatures v ON v.proposal_id=s.proposal_id AND v.revision=s.revision WHERE s.proposal_id=? AND s.revision=? ORDER BY s.signed_at,s.slot_id').bind(id,revision).all<any>()).results
}
export function recipientInput(input:any,a:Actor):Recipient[]{
 need(Array.isArray(input)&&input.length>0,'Add at least one signer')
 const next:Recipient[]=input.map((r:any)=>{
  need(r&&typeof r==='object','Enter a recipient')
  const id=text(r.id??crypto.randomUUID(),'a recipient id',100)
  need(/^[a-zA-Z0-9_-]+$/.test(id),'Use a simple recipient id')
  need(['signer','approver','viewer','cc','countersigner'].includes(r.role),'Choose a recipient role')
  const group=Number(r.group??1);need(Number.isSafeInteger(group)&&group>=1&&group<=10000,'Choose a signing group from 1 to 10000')
  return {id,name:text(r.name,'a recipient name',200),email:r.email?email(r.email):null,role:r.role,group}
 })
 need(new Set(next.map(r=>r.id)).size===next.length,'Recipient ids must be distinct')
 need(new Set(next.filter(r=>r.email).map(r=>r.email)).size===next.filter(r=>r.email).length,'Each recipient needs their own mailbox')
 need(next.some(r=>r.role==='signer'),'Include a client signer')
 for(const r of next.filter(r=>r.role==='countersigner'&&r.email))need(r.email===a.email.toLowerCase(),'The countersigner must be the current owner',403)
 return next
}
export async function recipientCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role==='owner','Only the current owner manages proposal recipients',403)
 const db=env.DB,row=await permitted(db,a,p.id,'send');exact(row,p)
 const plan=recipientPlan(row),at=await currentTime(db)
 if(name==='recipient.share'){
  need(row.status==='sent'&&plan.length,'Send configured recipient roles before creating a shared link',409)
  need(p.shareConsent===true||p.shareConsent==='yes','Authorize this recipient and any framing origin')
  const recipient={id:crypto.randomUUID(),name:text(p.recipientName,'a recipient name',200),email:email(p.recipientEmail),role:'viewer' as const,group:1}
  need(!plan.some(r=>r.email===recipient.email),'This mailbox already has a recipient invitation')
  let origin:string|null=null
  if(p.embedOrigin){
   const written=text(p.embedOrigin,'an exact site origin',2000)
   let url:URL;try{url=new URL(written)}catch{need(false,'Use an exact secure site origin')}
   need((url.protocol==='https:'||written===env.AUTH_ORIGIN)&&url.origin===written&&!url.hostname.includes('*')&&!url.username&&!url.password,'Use an exact secure site origin without a path, credentials or wildcard')
   origin=url.origin
  }
  const token=secret()
  await commit(db,a,[
   db.prepare('INSERT INTO p_shares(proposal_id,revision,token,recipient,slot_id,embed_origin) VALUES(?,?,?,?,?,?)').bind(row.id,row.revision,token,recipient.email,recipient.id,origin),
   db.prepare('UPDATE p_proposals SET recipient_plan=?,version=version+1 WHERE id=?').bind(JSON.stringify([...plan,recipient]),row.id),
  ],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=? AND status='sent')",values:[row.id,row.version,row.revision]})
  return {id:row.id,recipientId:recipient.id,shareUrl:env.AUTH_ORIGIN+'/p/'+token,...(origin?{embedUrl:env.AUTH_ORIGIN+'/p/'+token+'?embed=1'}:{})}
 }
 if(name==='recipient.remove'){
  const id=text(p.recipientId,'a recipient'),removed=plan.find(r=>r.id===id)
  need(removed,'Recipient not found',404)
  need(['draft','approved','sent'].includes(row.status),'This proposal is closed',409)
  need(!requiredRecipient(removed)||row.status!=='sent','Replace a required recipient instead of removing them from a sent offer',409)
  const next=plan.filter(r=>r.id!==id)
  if(row.status!=='sent')return recipientCommand(env,a,'recipient.save',{...p,recipients:next})
  await commit(db,a,[
   db.prepare('INSERT INTO p_replaced_links(token,proposal_id,revision) SELECT token,proposal_id,revision FROM p_shares WHERE proposal_id=? AND slot_id=? ON CONFLICT DO NOTHING').bind(row.id,id),
   db.prepare('DELETE FROM p_shares WHERE proposal_id=? AND slot_id=?').bind(row.id,id),
   db.prepare("UPDATE p_mail SET status='uncertain',held_reason='recipient_removed' WHERE proposal_id=? AND recipient=? AND status='pending'").bind(row.id,removed.email),
   db.prepare('DELETE FROM p_mail_reply_keys WHERE proposal_id=? AND recipient=?').bind(row.id,removed.email),
   db.prepare('UPDATE p_proposals SET recipient_plan=?,version=version+1 WHERE id=?').bind(JSON.stringify(next),row.id),
  ],true,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[row.id,row.version]})
  return {id:row.id}
 }
 need(name==='recipient.save','Unknown recipient action',404)
 need(['draft','approved'].includes(row.status),'Configure recipients before sending',409)
 need(!await db.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(),'Finish the negotiated revision before configuring recipients',409)
 let input:any=p.recipients
 if(typeof input==='string'){try{input=JSON.parse(input)}catch{need(false,'Enter a recipient list')}}
 // The form edits one role slot at a time; the command also accepts a complete plan.
 if(input===undefined){
  const id=p.recipientId?text(p.recipientId,'a recipient id',100):crypto.randomUUID()
  input=[...plan.filter(r=>r.id!==id),{id,name:p.recipientName,email:p.recipientEmail,role:p.recipientRole,group:p.recipientGroup}]
 }
 const next=recipientInput(input,a)
 const revision=row.revision+1,updated={...row,recipient_plan:JSON.stringify(next),revision}
 await commit(db,a,[
  db.prepare("UPDATE p_proposals SET recipient_plan=?,revision=?,version=version+1,status='draft',approved_by=NULL,approved_at=NULL WHERE id=?").bind(JSON.stringify(next),revision,row.id),
  db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(row.id),
  copyCosts(db,row.id,row.revision,row.id,revision),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,JSON.stringify(snapshot(updated)),a.email,at,row.currency),
 ],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[row.id,row.version]})
 return {id:row.id,version:row.version+1,revision}
}

export async function recipientInvitations(env:Bindings,a:Actor,input:Record<string,unknown>,row:any,at:number){
 const plan=recipientPlan(row)
 if(!plan.length)return null
 need(a.role==='owner','Only the current owner sends configured recipient invitations',403)
 need(plan.some(r=>r.role==='signer'),'Include a client signer before sending',409)
 need(plan.every(r=>!requiredRecipient(r)||r.email),'Fill every required recipient slot before sending: '+plan.filter(r=>requiredRecipient(r)&&!r.email).map(r=>r.name).join(', '),409)
 for(const b of documentOf(row).blocks.filter(b=>b.recipientRole==='slot'))need(plan.some(r=>r.id===b.recipientId&&requiredRecipient(r)),'Assign field '+b.title+' to a required recipient slot',409)
 for(const r of plan.filter(r=>r.role==='countersigner'))need(r.email===a.email.toLowerCase(),'Choose the current owner as countersigner',403)
 const signatures=await recipientSignatures(env.DB,row.id,row.revision)
 need(!signatures.some(s=>!s.voided_at),'Withdraw this partly signed revision before issuing fresh invitations',409)
 const links=plan.filter(r=>r.email).map(r=>({...r,token:secret()}))
 const writes:D1PreparedStatement[]=[
  env.DB.prepare('INSERT INTO p_replaced_links(token,proposal_id,revision) SELECT token,proposal_id,revision FROM p_shares WHERE proposal_id=? ON CONFLICT DO NOTHING').bind(row.id),
  env.DB.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(row.id),
 ]
 for(const r of links){
  const url=env.AUTH_ORIGIN+'/p/'+r.token
  writes.push(env.DB.prepare('INSERT INTO p_shares(proposal_id,revision,token,recipient,slot_id,signing_position) VALUES(?,?,?,?,?,?)').bind(row.id,row.revision,r.token,r.email,r.id,r.group),...invitationMail(env,a,input,row,r.email!,url,at))
 }
 return {writes,links:links.map(({token,...r})=>({...r,shareUrl:env.AUTH_ORIGIN+'/p/'+token}))}
}
export async function recipientProgress(db:D1Database,row:any,slotId:string){
 const plan=recipientPlan(row),recipient=plan.find(r=>r.id===slotId)
 if(!recipient)return null
 const signatures=await recipientSignatures(db,row.id,row.revision)
 const earlier=plan.filter(r=>requiredRecipient(r)&&r.group<recipient.group)
 return {ownFields:JSON.parse(signatures.find(s=>s.slot_id===slotId)?.snapshot??'{}').content?.fieldValues,clientSlot:plan.find(r=>r.role==='signer')?.id,choice:signatures.length?JSON.parse(signatures[0].snapshot).choice:null,recipient,signatures:signatures.map(s=>({slotId:s.slot_id,name:s.name,role:s.role,signedAt:s.signed_at,voidedAt:s.voided_at})),signed:signatures.some(s=>s.slot_id===slotId&&!s.voided_at),ready:!earlier.some(r=>!signatures.some(s=>s.slot_id===r.id&&!s.voided_at))}
}
export function voidSignatureStatement(db:D1Database,id:string,revision:number,at:number,reason:string){
 return db.prepare('INSERT INTO p_void_signatures(proposal_id,revision,voided_at,reason) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM p_recipient_signatures WHERE proposal_id=? AND revision=?) ON CONFLICT DO NOTHING').bind(id,revision,at,reason,id,revision)
}
export function completionMail(env:Bindings,row:any,plan:Recipient[],at:number){
 return plan.filter(r=>r.email).map(r=>queueMail(env,row.id,r.email!,'Agreement complete: '+row.title,'All required recipients have completed revision '+row.revision+'. Open your personal invitation to review the completed agreement.'))
}

export function recipientContent(view:any,progress:any){
 if(!progress||view.status==='accepted')return view
 const doc=documentOf(view)
 return {...view,document:{...doc,blocks:doc.blocks.filter(b=>!['field','signature'].includes(b.type)||fieldSlot(b,progress.clientSlot)===progress.recipient.id)}}
}
