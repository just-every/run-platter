import type { Bindings } from '../auth.server'
import { prepareAttachment, downloadAttachment, type AttachmentRef } from './attachments'
import { proposalDocument, fieldSlot } from './documents/blocks'
import { requiredRecipient } from './recipients'
import { collectionPolicy } from './collection-policy'
import { currentTime, expiryOpenSql } from './expiry'
import { clientLocale } from './locales'
import { need, hash, fail, type Actor } from './model'
import { permitted } from './permissions'
import { actorById } from './credentials'

export interface ClientFileRef extends AttachmentRef { fieldId:string }
const assigned=(c:any,block:any)=>c.progress?fieldSlot(block,c.progress.clientSlot)===c.progress.recipient.id:block.recipientRole==='client'&&block.recipientId===c.row.client_id
const limit=25*1024*1024
const ref=(row:any):ClientFileRef=>({id:row.file_id,fieldId:row.field_id,filename:row.filename,mediaType:row.media_type,size:row.size,sha256:row.sha256})

async function supported(env:Bindings,c:any){
 need(c.verified,'Verify your mailbox before collecting files',401)
 need(clientLocale(c.row)==='en'&&c.share.session_method==='mailbox code','Client files require an English mailbox-verified offer',409)
 if(c.progress)need(requiredRecipient(c.progress.recipient),'Only the assigned signing recipient collects files',403)
 need(!(await collectionPolicy(env.DB,c.row.id)).enabled,'Client files require collection to be off',409)
}

/** Upload references retain custody, never the invitation capability itself. */
export async function clientFiles(env:Bindings,c:any):Promise<ClientFileRef[]>{
 if(!c.verified)return []
 const accepted=await env.DB.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(c.row.id).first<any>()
 if(accepted)return JSON.parse(accepted.snapshot).clientFiles??[]
 if(c.progress?.signed){const signed=await env.DB.prepare('SELECT snapshot FROM p_recipient_signatures WHERE proposal_id=? AND revision=? AND slot_id=?').bind(c.row.id,c.row.revision,c.progress.recipient.id).first<any>();return signed?JSON.parse(signed.snapshot).content.clientFiles??[]:[]}
 const rows=(await env.DB.prepare('SELECT f.*,b.filename,b.media_type,b.size,b.sha256 FROM p_client_files f JOIN p_attachment_files b ON b.id=f.file_id WHERE f.proposal_id=? AND f.revision=? AND f.invitation_hash=? ORDER BY f.created_at DESC,f.file_id DESC').bind(c.row.id,c.row.revision,await hash(c.token)).all<any>()).results
 return rows.map(ref).filter((file,index,all)=>all.findIndex(other=>other.fieldId===file.fieldId)===index)
}

export async function uploadClientFile(env:Bindings,c:any,data:FormData){
 await supported(env,c)
 need(c.row.status==='sent'&&!c.expiry.expired&&!c.progress?.signed,'This offer is no longer open for uploads',409)
 if(c.progress)need(c.progress.ready,'Wait for the preceding signing group before uploading',409)
 need(Number(data.get('revision'))===c.row.revision,'This revision changed. Reload before uploading.',409)
 const fieldId=String(data.get('fieldId')??''),block=proposalDocument(c.row.document).blocks.find(b=>b.id===fieldId)
 need(block?.type==='field'&&block.fieldKind==='file'&&assigned(c,block),'Choose a file field assigned to this Client',400)
 const file=data.get('file');need(file instanceof File,'Choose a file')
 need(file.size>0&&file.size<=limit,'Choose a PDF, PNG or JPEG up to 25 MB',413)
 const bytes=new Uint8Array(await file.arrayBuffer()),extension=file.name.split('.').at(-1)?.toLowerCase(),type=file.type.toLowerCase()
 const pdf=extension==='pdf'&&type==='application/pdf'&&/^%PDF-(?:1\.[0-7]|2\.0)/.test(new TextDecoder().decode(bytes.subarray(0,8)))
 const png=extension==='png'&&type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)
 const jpeg=['jpg','jpeg'].includes(extension??'')&&type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217
 need(pdf||png||jpeg,'The filename, media type and file bytes must agree: PDF, PNG or JPEG only',415)
 const {attachment,writes}=await prepareAttachment(env.DB,{filename:file.name,mediaType:type,bytes})
 const at=await currentTime(env.DB)
 try{await env.DB.batch([
  env.DB.prepare(`INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.session_hash=? AND s.session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND s.revision=p.revision AND p.revision=? AND p.version=? AND p.status='sent' AND ${expiryOpenSql('p')} AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=p.id) AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id) AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures WHERE proposal_id=p.id AND revision=p.revision AND slot_id=COALESCE(s.slot_id,''))))`).bind(c.token,c.share.session_hash,at,c.row.revision,c.row.version,at),
  ...writes,
  env.DB.prepare('INSERT INTO p_client_files(proposal_id,revision,invitation_hash,field_id,file_id,created_at) VALUES(?,?,?,?,?,?)').bind(c.row.id,c.row.revision,await hash(c.token),fieldId,attachment.id,at),
  env.DB.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(c.row.id),
  env.DB.prepare('DELETE FROM p_guard'),
 ])}catch(error){if(/CHECK constraint|UNIQUE constraint/.test(String(error)))fail('The offer or verification changed. Reload before uploading.',409);throw error}
 return {...attachment,fieldId}
}

/** Only selected field references owned by this exact invitation can be frozen. */
export async function acceptedClientFiles(env:Bindings,c:any,document:unknown,input:Record<string,unknown>):Promise<ClientFileRef[]>{
 const blocks=proposalDocument(document).blocks.filter(b=>b.type==='field'&&b.fieldKind==='file'&&(!c.progress||fieldSlot(b,c.progress.clientSlot)===c.progress.recipient.id))
 if(!blocks.length)return []
 await supported(env,c)
 const files:ClientFileRef[]=[]
 for(const block of blocks){
  need(assigned(c,block),'File collection is limited to the assigned Client',409)
  const id=input['field:'+block.id]
  need(!block.required||typeof id==='string'&&id.length>0,'Complete required field: '+block.title)
  if(id===undefined||id==='')continue
  need(typeof id==='string','Choose an uploaded file for '+block.title)
  const row=await env.DB.prepare('SELECT f.*,b.filename,b.media_type,b.size,b.sha256 FROM p_client_files f JOIN p_attachment_files b ON b.id=f.file_id WHERE f.proposal_id=? AND f.revision=? AND f.invitation_hash=? AND f.field_id=? AND f.file_id=?').bind(c.row.id,c.row.revision,await hash(c.token),block.id,id).first<any>()
  need(row,'This file does not belong to the assigned field and invitation',409)
  files.push(ref(row))
 }
 return files
}

/** A restored business reference grants no client transport authority. */
export async function downloadClientFile(env:Bindings,id:string,fileId:string,authority:{actor:Actor}|{client:any}){
 const authorize=async()=>{if('actor' in authority){const live=await actorById(env.DB,authority.actor.id);need(live&&live.role===authority.actor.role&&(live.memberVersion??0)===(authority.actor.memberVersion??0),'Client-file download authority changed',403);await permitted(env.DB,live,id);need(live.role!=='agent','A person downloads client originals',403)}else{const c=authority.client;need(c.verified&&c.row.id===id,'Verify your mailbox before downloading client files',401);need(await env.DB.prepare("SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND s.revision=p.revision AND p.id=? AND p.status IN ('sent','accepted') AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=p.id AND revision=p.revision)").bind(c.token,c.share.session_hash,await currentTime(env.DB),id).first(),'This file invitation is no longer current',401)}}
 await authorize()
 let files:ClientFileRef[]
 if('actor' in authority){await permitted(env.DB,authority.actor,id);need(authority.actor.role!=='agent','A person downloads client originals',403);const a=await env.DB.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(id).first<any>();files=a?JSON.parse(a.snapshot).clientFiles??[]:[]}
 else{const c=authority.client;need(c.verified&&c.row.id===id,'Verify your mailbox before downloading client files',401);files=await clientFiles(env,c)}
 const file=files.find(f=>f.id===fileId);need(file,'Client file not found',404)
 const response=await downloadAttachment(env.DB,file)
 await authorize()
 return response
}
